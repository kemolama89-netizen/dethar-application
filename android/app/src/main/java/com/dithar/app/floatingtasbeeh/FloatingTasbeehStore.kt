package com.dithar.app.floatingtasbeeh

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * The single persistence surface for the native half of Floating Tasbeeh.
 * Everything here lives in one SharedPreferences file — `enabled`, the
 * currently `selectedDhikr`, a live counter mirror (for the bubble's own
 * displayed number, so it can show an up-to-date count immediately without
 * waiting on the next JS reconciliation), and the offline
 * [PendingEventQueue] (see its own doc comment for why a cursor-based
 * queue exists at all).
 *
 * This class NEVER interprets `dhikrId` beyond an integer key, and never
 * touches DITHAR's web-side Statistics event log directly — that stays
 * entirely on the JS side (stats.ts / tasbeehCommit.ts), reached only via
 * [FloatingTasbeehPlugin.drainPendingEvents]. This mirrors the Shared
 * Counting Core boundary from the Floating Tasbeeh plan: native code
 * writes raw, timestamped taps; JS is the only place that turns them into
 * real Statistics events.
 */
class FloatingTasbeehStore(context: Context) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ---- enabled / selected dhikr / dhikr labels ---------------------------

    var isEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    var selectedDhikrId: Int
        get() = prefs.getInt(KEY_SELECTED_DHIKR, DEFAULT_DHIKR_ID)
        set(value) = prefs.edit().putInt(KEY_SELECTED_DHIKR, value).apply()

    /**
     * The FULL Tasbeeh dhikr library the long-press popup's scrollable list
     * shows, pushed from JS (the single source of truth —
     * src/data/tasbeeh-library.json) via FloatingTasbeehPlugin#setDhikrList,
     * so wording (and the set of available dhikr) never requires a native
     * code change. Stored as parallel id/label/duration arrays rather than
     * JSON for simplicity — reading/writing ~16-30 items this way is
     * negligible cost next to a SharedPreferences commit either way.
     * `readyDurationMs` is the SAME per-dhikr calm-counting pacing duration
     * JS computes via computeTasbeehReadyDurationMs (tasbeehTiming.ts) for
     * the main Tasbeeh screen — see [getReadyDurationMs].
     */
    fun setDhikrLabels(items: List<Triple<Int, String, Long>>) {
        val editor = prefs.edit()
        editor.putInt(KEY_DHIKR_COUNT, items.size)
        items.forEachIndexed { index, (id, label, readyDurationMs) ->
            editor.putInt("$KEY_DHIKR_ID_PREFIX$index", id)
            editor.putString("$KEY_DHIKR_LABEL_PREFIX$index", label)
            editor.putLong("$KEY_DHIKR_DURATION_PREFIX$index", readyDurationMs)
        }
        editor.apply()
    }

    fun getDhikrLabels(): List<Pair<Int, String>> {
        val count = prefs.getInt(KEY_DHIKR_COUNT, 0)
        return (0 until count).mapNotNull { index ->
            val id = prefs.getInt("$KEY_DHIKR_ID_PREFIX$index", -1)
            val label = prefs.getString("$KEY_DHIKR_LABEL_PREFIX$index", null)
            if (id >= 0 && label != null) id to label else null
        }
    }

    /**
     * The currently selected dhikr's own label text, for the bubble's own
     * display (see FloatingBubbleView#label) — looked up from the same
     * library JS pushed via [setDhikrLabels], never a separately-persisted
     * copy that could drift from it. Empty if the list hasn't been pushed
     * yet (e.g. a service restart racing the app's own startup) or the
     * selected id is no longer in it.
     */
    fun getSelectedDhikrLabel(): String = getDhikrLabels().firstOrNull { it.first == selectedDhikrId }?.second ?: ""

    /**
     * [dhikrId]'s own calm-counting pacing duration — the exact value JS
     * pushed via [setDhikrLabels], itself computed by the SAME
     * computeTasbeehReadyDurationMs the main Tasbeeh screen uses, never a
     * native re-derivation of the word-count tiering logic. Falls back to
     * [DEFAULT_READY_DURATION_MS] (matching tasbeehTiming.ts's own
     * FALLBACK_READY_DURATION_MS) if the list hasn't been pushed yet or
     * this id isn't in it.
     */
    fun getReadyDurationMs(dhikrId: Int): Long {
        val count = prefs.getInt(KEY_DHIKR_COUNT, 0)
        for (index in 0 until count) {
            if (prefs.getInt("$KEY_DHIKR_ID_PREFIX$index", -1) == dhikrId) {
                return prefs.getLong("$KEY_DHIKR_DURATION_PREFIX$index", DEFAULT_READY_DURATION_MS)
            }
        }
        return DEFAULT_READY_DURATION_MS
    }

    // ---- live counter mirror (bubble's own displayed number) --------------

    fun getLiveCount(dhikrId: Int): Int = prefs.getInt("$KEY_LIVE_COUNT_PREFIX$dhikrId", 0)

    /**
     * Public (not private, unlike before) so a Floating Voice Tasbeeh
     * repetition — committed on the JS side through the exact same Shared
     * Counting Core a tap uses (see FloatingTasbeehPlugin#syncLiveCount) —
     * can update this SAME mirror a manual tap does, rather than voice
     * counting through a second, parallel counter.
     */
    fun setLiveCount(dhikrId: Int, count: Int) {
        prefs.edit().putInt("$KEY_LIVE_COUNT_PREFIX$dhikrId", count).apply()
    }

    /**
     * Zeroes the live-count mirror for EVERY dhikr at once — called only
     * from TasbeehScreen's "Reset All" (see FloatingTasbeehPlugin#resetAllLiveCounts),
     * which resets every counter to zero in one action rather than one
     * dhikr at a time.
     */
    fun resetAllLiveCounts() {
        val editor = prefs.edit()
        for (key in prefs.all.keys) {
            if (key.startsWith(KEY_LIVE_COUNT_PREFIX)) editor.remove(key)
        }
        editor.apply()
    }

    // ---- tap recording + duplicate-dispatch guard --------------------------

    /**
     * Minimum real-world gap between two ACCEPTED taps, in milliseconds.
     * This is a SEPARATE, much smaller layer from the per-dhikr
     * calm-counting pacing gate (FloatingTasbeehService's own
     * pacingReadyAtElapsedRealtime, using [getReadyDurationMs]) that now
     * sits ABOVE this one: that gate decides whether a tap counts AT ALL
     * for a given dhikr's own pace; this one exists purely to guard
     * against the OS/gesture layer accidentally dispatching two touch
     * events for the ONE SAME physical tap — a real-world hazard for a
     * custom-drawn, draggable overlay view doing its own raw touch
     * handling (see FloatingBubbleView). 80ms is far below any realistic
     * deliberate double-tap cadence (typically 150ms+) and below even the
     * shortest real pacing duration (500ms), so it never interferes with
     * that gate — it only ever catches a duplicate dispatch of a tap the
     * pacing gate has ALREADY let through.
     */
    private val minAcceptedTapIntervalMs = 80L

    private var lastAcceptedTapElapsedRealtime = -DUPLICATE_GUARD_SENTINEL

    /**
     * Called once per tap the gesture layer already confirmed as a genuine
     * single tap (see FloatingBubbleView's GestureDetector wiring, which is
     * the FIRST and primary line of defense — GestureDetector#onSingleTapConfirmed
     * is specifically designed to fire once per real tap and never during a
     * drag). This is the second, defense-in-depth layer: reject only an
     * implausibly-fast repeat that can't be a deliberate second tap.
     *
     * Returns true if the tap was accepted and committed, false if it was
     * rejected as a likely duplicate dispatch of the same physical touch.
     */
    fun recordTapIfNotDuplicate(dhikrId: Int, elapsedRealtimeMs: Long = SystemClock.elapsedRealtime()): Boolean {
        if (elapsedRealtimeMs - lastAcceptedTapElapsedRealtime < minAcceptedTapIntervalMs) {
            return false
        }
        lastAcceptedTapElapsedRealtime = elapsedRealtimeMs

        setLiveCount(dhikrId, getLiveCount(dhikrId) + 1)

        val now = java.util.Date()
        val tz = TimeZone.getDefault()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = tz }
        val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.US).apply { timeZone = tz }
        val queue = loadQueue()
        queue.enqueue(
            PendingTasbeehEvent(
                dhikrId = dhikrId,
                times = 1,
                epochMillis = now.time,
                localDate = dateFormat.format(now),
                localTime = timeFormat.format(now),
                timeZone = tz.id,
            ),
        )
        saveQueue(queue)
        return true
    }

    // ---- pending event queue -----------------------------------------------

    private fun loadQueue(): PendingEventQueue = PendingEventQueue.parse(prefs.getString(KEY_PENDING_QUEUE, null))

    private fun saveQueue(queue: PendingEventQueue) {
        prefs.edit().putString(KEY_PENDING_QUEUE, queue.serialize()).apply()
    }

    fun peekPendingEvents(): List<PendingTasbeehEvent> = loadQueue().snapshot()

    /**
     * Drains exactly the events the caller (FloatingTasbeehPlugin, on
     * behalf of JS reconciliation) has already successfully committed to
     * DITHAR's Statistics log. `count` must match what [peekPendingEvents]
     * returned in the same reconciliation pass — this two-step
     * peek-then-confirm shape (rather than a single destructive
     * "drain everything") is what lets JS commit first and only ask native
     * to forget those events after that succeeds, so a crash between the
     * two never loses an event (it just gets redelivered and re-committed
     * — safe, since JS's own commit path is the ONLY place a Statistics
     * event is created, and re-running it for an already-queued-but-not-
     * yet-confirmed-drained event is the intended safe outcome, not a
     * double count of an ALREADY-CONFIRMED one).
     */
    fun confirmDrained(count: Int) {
        val queue = loadQueue()
        if (count <= 0 || count > queue.size) return
        prefs.edit().putString(KEY_PENDING_QUEUE, queue.encodeAfterDraining(count)).apply()
    }

    companion object {
        private const val PREFS_NAME = "dithar_floating_tasbeeh"
        private const val KEY_ENABLED = "enabled"
        private const val KEY_SELECTED_DHIKR = "selected_dhikr_id"
        private const val KEY_DHIKR_COUNT = "dhikr_count"
        private const val KEY_DHIKR_ID_PREFIX = "dhikr_id_"
        private const val KEY_DHIKR_LABEL_PREFIX = "dhikr_label_"
        private const val KEY_DHIKR_DURATION_PREFIX = "dhikr_duration_"
        private const val KEY_LIVE_COUNT_PREFIX = "live_count_"
        private const val KEY_PENDING_QUEUE = "pending_queue_v1"
        private const val DEFAULT_DHIKR_ID = 1 // "سُبْحَانَ اللَّهِ" — tasbeeh-library.json id 1
        // Matches tasbeehTiming.ts's own FALLBACK_READY_DURATION_MS.
        private const val DEFAULT_READY_DURATION_MS = 1000L
        private const val DUPLICATE_GUARD_SENTINEL = 1_000_000_000L // effectively "never happened yet"
    }
}
