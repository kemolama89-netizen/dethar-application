package com.dithar.app.floatingtasbeeh

import org.json.JSONArray
import org.json.JSONObject

/**
 * A single Floating Tasbeeh repetition, timestamped at the moment the
 * physical tap was accepted (never re-derived later, at reconciliation
 * time) — same rationale as DITHAR's web-side Statistics log (see
 * stats.ts): a repetition must stay attributed to the calendar day/time it
 * actually happened on the device.
 */
data class PendingTasbeehEvent(
    val dhikrId: Int,
    val times: Int,
    val epochMillis: Long,
    val localDate: String, // "YYYY-MM-DD"
    val localTime: String, // "HH:MM:SS"
    val timeZone: String, // IANA name
)

/**
 * The Floating Tasbeeh offline event queue and its reconciliation cursor —
 * deliberately PURE Kotlin with no `android.*` imports (only the
 * `org.json` API, which both the real Android framework and this file's
 * own JVM unit tests provide identically), so this one file is the part of
 * the native Floating Tasbeeh layer that can be compiled and unit-tested
 * without the Android SDK.
 *
 * DESIGN — why a cursor at all: the native side never tries to replicate
 * DITHAR's Statistics event-log logic (that stays entirely in
 * stats.ts/tasbeehCommit.ts on the web side — see the Floating Tasbeeh
 * shared-counting-core plan). It only ever appends small, raw, timestamped
 * tuples here. The JS side drains and commits them through
 * commitFloatingTasbeehRepetition on next app foreground. If that
 * reconciliation is interrupted between "committed to Statistics" and
 * "removed from this queue," a naive re-drain would double-count the
 * already-committed events. `nextEventId` is a monotonically increasing id
 * assigned at ENQUEUE time (not at drain time), and `encodeAfterDraining`
 * lets the caller persist "everything from here on" in one atomic
 * SharedPreferences write, so a crash mid-reconciliation can only ever
 * replay events that were never actually removed — never re-deliver ones
 * already dropped.
 */
class PendingEventQueue private constructor(
    private val events: MutableList<IdentifiedEvent>,
    private var nextEventId: Long,
) {
    private data class IdentifiedEvent(val id: Long, val event: PendingTasbeehEvent)

    /** Appends one committed tap. Never drops/coalesces — every accepted tap must survive. */
    fun enqueue(event: PendingTasbeehEvent) {
        events.add(IdentifiedEvent(nextEventId, event))
        nextEventId += 1
    }

    val isEmpty: Boolean get() = events.isEmpty()
    val size: Int get() = events.size

    /** A read-only snapshot of every currently-pending event, oldest first. */
    fun snapshot(): List<PendingTasbeehEvent> = events.map { it.event }

    /**
     * Removes exactly the first [count] pending events (the ones a caller
     * just successfully committed to Statistics) and returns the queue's
     * new serialized form, ready for a single atomic
     * SharedPreferences.Editor#putString/#apply call. Never partially
     * applied from this class's own state — call [serialize] again to
     * persist, this method only returns the string to write.
     */
    fun encodeAfterDraining(count: Int): String {
        require(count in 0..events.size) { "count out of range" }
        repeat(count) { events.removeAt(0) }
        return serialize()
    }

    fun serialize(): String {
        val arr = JSONArray()
        for (item in events) {
            val obj = JSONObject()
            obj.put("id", item.id)
            obj.put("dhikrId", item.event.dhikrId)
            obj.put("times", item.event.times)
            obj.put("ts", item.event.epochMillis)
            obj.put("localDate", item.event.localDate)
            obj.put("localTime", item.event.localTime)
            obj.put("timeZone", item.event.timeZone)
            arr.put(obj)
        }
        val root = JSONObject()
        root.put("nextEventId", nextEventId)
        root.put("events", arr)
        return root.toString()
    }

    companion object {
        /** A brand-new, empty queue — used the first time Floating Tasbeeh is enabled. */
        fun empty(): PendingEventQueue = PendingEventQueue(mutableListOf(), 0L)

        /**
         * Parses a previously-serialized queue. Corrupt/missing data (a
         * fresh install, a manually-cleared preference, an unexpected
         * shape) never throws — it starts clean, exactly like stats.ts's
         * own `load()` treats corrupt localStorage JSON: a lost pending
         * queue is a dropped batch of unsynced taps, never a crash.
         */
        fun parse(raw: String?): PendingEventQueue {
            if (raw.isNullOrEmpty()) return empty()
            return try {
                val root = JSONObject(raw)
                val nextId = root.optLong("nextEventId", 0L)
                val arr = root.optJSONArray("events") ?: JSONArray()
                val list = mutableListOf<IdentifiedEvent>()
                for (i in 0 until arr.length()) {
                    val obj = arr.getJSONObject(i)
                    list.add(
                        IdentifiedEvent(
                            id = obj.optLong("id", i.toLong()),
                            event = PendingTasbeehEvent(
                                dhikrId = obj.getInt("dhikrId"),
                                times = obj.getInt("times"),
                                epochMillis = obj.optLong("ts", 0L),
                                localDate = obj.optString("localDate", ""),
                                localTime = obj.optString("localTime", ""),
                                timeZone = obj.optString("timeZone", ""),
                            ),
                        ),
                    )
                }
                PendingEventQueue(list, maxOf(nextId, (list.maxOfOrNull { it.id } ?: -1L) + 1))
            } catch (_: Exception) {
                empty()
            }
        }
    }
}
