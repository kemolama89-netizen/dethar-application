package com.dithar.app.reminders

import com.dithar.app.audioadhkar.MiscPlan
import com.dithar.app.audioadhkar.Window
import java.util.Calendar
import java.util.TimeZone
import kotlin.random.Random

/**
 * Pure (Android-free) logic for reminders, the home-screen widget and the
 * end-of-day summary — kept apart from the alarm/notification plumbing so
 * it can be unit-tested on the JVM. The content itself (verified duas,
 * Hadiths, dhikr virtues) is built and pushed by JS (lib/reminderContent.ts);
 * nothing here writes religious text.
 */

/** One reminder as pushed from JS, already in the interface language (except the Arabic text). */
data class ReminderItem(
    val id: String,
    val category: String,
    /** The category's title, e.g. "دعاء" / "Hadith". */
    val title: String,
    /** The Arabic text, never altered. */
    val text: String,
    /** Its English meaning in English mode, else "". */
    val meaning: String,
    /** Where it comes from (and its grade for a Hadith; the poet for poetry), localized. */
    val source: String,
    val theme: String,
    /** DITHAR's short comments, localized; one is shown at a time, in turn. */
    val comments: List<ReminderComment> = emptyList(),
    /** Whether the home-screen widget may show it (JS lib/widgetFeed.ts: short, clear, renders cleanly). */
    val widget: Boolean = true,
    /**
     * What the item is ABOUT when the text alone doesn't say it — a dhikr's
     * virtue («فضله»), localized; "" when none. Shown labelled under the
     * text, so a virtue item is never just a bare phrase with the virtue's
     * source under it. The source line belongs to it.
     */
    val detail: String = "",
    /**
     * The text as the home-screen widget draws it, when that differs: a
     * Qur'anic verse in its brackets ﴿ … ﴾ (JS lib/widgetFeed.ts
     * widgetQuranText); "" = [text]. Notifications and the opened reminder
     * keep [text].
     */
    val widgetText: String = "",
) {
    /** What the widget draws as the main text. */
    val widgetShownText: String get() = widgetText.ifEmpty { text }
}

/** One editorial comment: a stable id (for repetition tracking and Favorites) and its localized text. */
data class ReminderComment(val id: String, val text: String, val widget: Boolean = true)

/**
 * What a tapped reminder notification or widget hands the app: the item's
 * stable id and the shown comment's id, and a snapshot of exactly what was
 * drawn (title, text, meaning, virtue line, source, comment) — so the app
 * opens the very same content, and can still show it as it was if its own
 * library changed in the meantime (lib/reminderOpen.ts). Pure, so the
 * round trip through an Intent's string extras is unit-tested.
 */
data class ReminderOpen(
    val id: String,
    val category: String,
    val title: String,
    val text: String,
    val meaning: String = "",
    val detail: String = "",
    val source: String = "",
    val commentId: String? = null,
    val commentText: String? = null,
) {
    fun toExtras(): Map<String, String> = buildMap {
        put(EXTRA_ID, id)
        put(EXTRA_CATEGORY, category)
        put(EXTRA_TITLE, title)
        put(EXTRA_TEXT, text)
        put(EXTRA_MEANING, meaning)
        put(EXTRA_DETAIL, detail)
        put(EXTRA_SOURCE, source)
        if (commentId != null) put(EXTRA_COMMENT_ID, commentId)
        if (commentId != null && commentText != null) put(EXTRA_COMMENT_TEXT, commentText)
    }

    companion object {
        const val EXTRA_ID = "com.dithar.app.reminders.OPEN_REMINDER"
        const val EXTRA_COMMENT_ID = "com.dithar.app.reminders.OPEN_COMMENT"
        const val EXTRA_CATEGORY = "com.dithar.app.reminders.OPEN_CATEGORY"
        const val EXTRA_TITLE = "com.dithar.app.reminders.OPEN_TITLE"
        const val EXTRA_TEXT = "com.dithar.app.reminders.OPEN_TEXT"
        const val EXTRA_MEANING = "com.dithar.app.reminders.OPEN_MEANING"
        const val EXTRA_DETAIL = "com.dithar.app.reminders.OPEN_DETAIL"
        const val EXTRA_SOURCE = "com.dithar.app.reminders.OPEN_SOURCE"
        const val EXTRA_COMMENT_TEXT = "com.dithar.app.reminders.OPEN_COMMENT_TEXT"
        val EXTRAS = listOf(EXTRA_ID, EXTRA_COMMENT_ID, EXTRA_CATEGORY, EXTRA_TITLE, EXTRA_TEXT, EXTRA_MEANING, EXTRA_DETAIL, EXTRA_SOURCE, EXTRA_COMMENT_TEXT)

        /** The item as drawn, with the comment drawn beside it (if any). */
        fun of(item: ReminderItem, comment: ReminderComment?) = ReminderOpen(
            id = item.id,
            category = item.category,
            title = item.title,
            text = item.text,
            meaning = item.meaning,
            detail = item.detail,
            source = item.source,
            commentId = comment?.id,
            commentText = comment?.text,
        )

        /** Reads it back from an Intent's extras ([get]); null when the Intent opens no reminder. */
        fun fromExtras(get: (String) -> String?): ReminderOpen? {
            val id = get(EXTRA_ID)?.takeIf { it.isNotEmpty() } ?: return null
            return ReminderOpen(
                id = id,
                category = get(EXTRA_CATEGORY).orEmpty(),
                title = get(EXTRA_TITLE).orEmpty(),
                text = get(EXTRA_TEXT).orEmpty(),
                meaning = get(EXTRA_MEANING).orEmpty(),
                detail = get(EXTRA_DETAIL).orEmpty(),
                source = get(EXTRA_SOURCE).orEmpty(),
                commentId = get(EXTRA_COMMENT_ID)?.takeIf { it.isNotEmpty() },
                commentText = get(EXTRA_COMMENT_TEXT)?.takeIf { it.isNotEmpty() },
            )
        }
    }
}

object ReminderRotation {
    val CATEGORIES = listOf("dua", "hadith", "virtue", "poetry", "lataif")
    /** How many recent reminders are remembered (persisted, so a restart doesn't reset them). */
    const val RECENT_LIMIT = 300
    const val RECENT_COMMENT_LIMIT = 400

    /** How many of a category's most recent items are held back: three quarters of it (at least one, never all). */
    fun freshnessWindow(categorySize: Int): Int = maxOf(1, minOf(categorySize - 1, categorySize * 3 / 4))

    /**
     * The next reminder: categories take turns (dua → hadith → virtue →
     * poetry → lataif) among the enabled ones that have content; within the
     * category, items never shown (or no longer remembered) first, else
     * those outside the recent window — the ones shown longest ago — so the
     * same text doesn't come back day after day (mirrors
     * lib/contentRotation.ts in the app).
     */
    fun next(pool: List<ReminderItem>, enabled: Set<String>, lastCategory: String?, recent: List<String>, random: (Int) -> Int = { Random.nextInt(it) }): ReminderItem? {
        val categories = CATEGORIES.filter { c -> c in enabled && pool.any { it.category == c } }
        if (categories.isEmpty()) return null
        val category = categories[(categories.indexOf(lastCategory) + 1) % categories.size]
        val candidates = pool.filter { it.category == category }
        val remembered = recent.toSet()
        val heldBack = recent.filter { id -> candidates.any { it.id == id } }.takeLast(freshnessWindow(candidates.size)).toSet()
        val from = candidates.filter { it.id !in remembered }.ifEmpty { candidates.filter { it.id !in heldBack }.ifEmpty { candidates } }
        return from[random(from.size).coerceIn(0, from.size - 1)]
    }

    fun remember(recent: List<String>, id: String, limit: Int = RECENT_LIMIT): List<String> = (recent.filter { it != id } + id).takeLast(limit)

    /** The comment to show with an item: one never shown (in authored order), else the one shown longest ago. */
    fun pickComment(item: ReminderItem, recentComments: List<String>): ReminderComment? =
        item.comments.sortedBy { recentComments.lastIndexOf(it.id) }.firstOrNull()

    /** With reminders off, the widget still changes once a day: a stable pick for the local day. */
    fun dailyPick(pool: List<ReminderItem>, nowMillis: Long, zone: TimeZone = TimeZone.getDefault()): ReminderItem? {
        if (pool.isEmpty()) return null
        val cal = Calendar.getInstance(zone).apply { timeInMillis = nowMillis }
        val day = cal.get(Calendar.YEAR) * 400 + cal.get(Calendar.DAY_OF_YEAR)
        return pool[Math.floorMod(day * 7919, pool.size)]
    }

    /** The day's comment for the daily pick (stable for the day, different from day to day). */
    fun dailyComment(item: ReminderItem, nowMillis: Long, zone: TimeZone = TimeZone.getDefault()): ReminderComment? {
        if (item.comments.isEmpty()) return null
        val cal = Calendar.getInstance(zone).apply { timeInMillis = nowMillis }
        return item.comments[Math.floorMod(cal.get(Calendar.YEAR) * 400 + cal.get(Calendar.DAY_OF_YEAR), item.comments.size)]
    }
}

/**
 * What the home-screen widget offers, in order (pure, so it is unit-tested).
 *
 * The widget shows only items JS marked for it ([ReminderItem.widget]) and
 * changes with the time of day (four slots a day — the same moments its
 * background changes, WidgetBackgrounds). Slot by slot the categories take
 * turns (a dua, then a Hadith, then a verse…), and within a category every
 * item is shown once before any comes back, in a fixed shuffled order — no
 * network, no stored state, the same on every widget.
 *
 * The renderer then tries these candidates in order and shows the first that
 * fits the widget's size in full (WidgetTextFit), so a long text is replaced
 * by the next short one rather than cut.
 */
object WidgetRotation {
    /** Slots a day, starting at these local hours (WidgetBackgrounds' periods). */
    private val SLOT_HOURS = listOf(4, 8, 16, 19)
    private const val DAY_MS = 86_400_000L

    fun pool(pool: List<ReminderItem>): List<ReminderItem> = pool.filter { it.widget }

    /** The current slot number: four per local day; the hours before 04:00 still belong to the previous night. */
    fun slot(nowMillis: Long, zone: TimeZone = TimeZone.getDefault()): Long {
        val local = nowMillis + zone.getOffset(nowMillis)
        val shifted = local - SLOT_HOURS.first() * 3_600_000L
        val day = Math.floorDiv(shifted, DAY_MS)
        val hour = (Math.floorMod(local, DAY_MS) / 3_600_000L).toInt()
        val index = SLOT_HOURS.indexOfLast { hour >= it }.let { if (it < 0) SLOT_HOURS.size - 1 else it }
        return day * SLOT_HOURS.size + index
    }

    /**
     * The slot the widget shows. While reminders are on, the one the last
     * delivered reminder set ([stored]) — so the widget's content changes
     * only when a reminder comes, at the user's interval (and never before
     * a holiday's start, when no reminder comes); otherwise, or before the
     * first reminder, the clock's [slot].
     */
    fun displaySlot(remindersOn: Boolean, stored: Long, nowMillis: Long, zone: TimeZone = TimeZone.getDefault()): Long =
        if (remindersOn && stored >= 0) stored else slot(nowMillis, zone)

    /** The slot after a reminder is delivered: one step on from [stored] (or from the clock's slot, the first time). */
    fun advance(stored: Long, nowMillis: Long, zone: TimeZone = TimeZone.getDefault()): Long =
        (if (stored >= 0) stored else slot(nowMillis, zone)) + 1

    /** A fixed, well-mixed order for a category's items (independent of the order JS pushed them in). */
    private fun shuffled(items: List<ReminderItem>): List<ReminderItem> = items.sortedBy { mix(it.id.hashCode()) }

    private fun mix(h: Int): Int {
        var x = h * -0x61c88647
        x = x xor (x ushr 15)
        return x * 0x2c1b3c6d
    }

    /** The item for one slot: the categories take turns; within one, each item once before any repeats. */
    fun itemFor(pool: List<ReminderItem>, slot: Long): ReminderItem? {
        val byCategory = ReminderRotation.CATEGORIES.mapNotNull { c -> pool.filter { it.category == c }.takeIf { it.isNotEmpty() } }
            .ifEmpty { if (pool.isEmpty()) emptyList() else listOf(pool) }
        if (byCategory.isEmpty()) return null
        val group = byCategory[Math.floorMod(slot, byCategory.size.toLong()).toInt()]
        val round = Math.floorDiv(slot, byCategory.size.toLong())
        return shuffled(group)[Math.floorMod(round, group.size.toLong()).toInt()]
    }

    /**
     * The candidates to try, best first: [preferred] (the reminder just
     * delivered) when the widget may show it, then this slot's item and the
     * following slots' — at most [limit], no duplicates.
     */
    fun candidates(pool: List<ReminderItem>, slot: Long, preferred: ReminderItem? = null, limit: Int = 24): List<ReminderItem> {
        val eligible = pool(pool)
        val out = LinkedHashSet<ReminderItem>()
        if (preferred != null && preferred.widget && eligible.any { it.id == preferred.id }) out += preferred
        var s = slot
        while (out.size < minOf(limit, eligible.size) && s < slot + limit * 4) {
            itemFor(eligible, s)?.let { out += it }
            s++
        }
        return out.toList()
    }

    /**
     * The widget's comment for an item: the one asked for if the widget may
     * show it, else the slot's turn — never [avoidId] (the comment the
     * previous slot showed) while the item has another, so two widget
     * updates in a row never repeat a comment.
     */
    fun comment(item: ReminderItem, slot: Long, preferredId: String? = null, avoidId: String? = null): ReminderComment? {
        val comments = item.comments.filter { it.widget }
        if (comments.isEmpty()) return null
        comments.firstOrNull { it.id == preferredId && it.id != avoidId }?.let { return it }
        val start = Math.floorMod(slot, comments.size.toLong()).toInt()
        return (comments.indices).map { comments[(start + it) % comments.size] }.firstOrNull { it.id != avoidId } ?: comments[start]
    }

    /** What the widget remembers of its comments: the slot it last drew, that slot's comment, and the one before it. */
    data class CommentMemory(val slot: Long, val shown: String?, val previous: String?) {
        /** The comment to keep while redrawing [slot] (stable within a slot), and the one to avoid (the previous slot's). */
        fun forSlot(slot: Long): Pair<String?, String?> = if (slot == this.slot) shown to previous else null to shown

        /** After drawing [shownNow] in [slot]. */
        fun after(slot: Long, shownNow: String?): CommentMemory =
            if (slot == this.slot) copy(shown = shownNow) else CommentMemory(slot, shownNow, shown)
    }
}

object ReminderPlan {
    /**
     * When the next reminder may come: at least [intervalMinutes] after the
     * last one, inside the daily permitted period (and never before that
     * day's weekly start), never inside an adhan pause — the same rules as
     * the recurring Misc dhikr (MiscPlan), so missed reminders are never
     * replayed in a burst.
     */
    fun nextFire(
        afterMillis: Long,
        startMinutes: Int,
        endMinutes: Int,
        intervalMinutes: Int,
        lastFired: Long,
        adhanWindows: List<Window>,
        dayStarts: List<Int>?,
        zone: TimeZone = TimeZone.getDefault(),
    ): Long? = MiscPlan.nextPlay(afterMillis, startMinutes, endMinutes, intervalMinutes.coerceAtLeast(MIN_INTERVAL_MINUTES), lastFired, adhanWindows, zone, dayStarts)

    /** How early a firing may come and still count (alarms batched by Android). */
    const val DUE_SLACK_MILLIS = 60_000L

    /**
     * Whether a reminder alarm firing at [nowMillis] is really due: the
     * interval since [lastFired] has passed, inside the permitted period and
     * not before the day's start ([dayStarts]: a holiday's start). A firing
     * that isn't (a stale or repeated alarm) delivers nothing — no second
     * notification, no early widget change. Adhan pauses don't count here:
     * a reminder due during one still updates the widget, silently, as before.
     */
    fun isDue(
        nowMillis: Long,
        startMinutes: Int,
        endMinutes: Int,
        intervalMinutes: Int,
        lastFired: Long,
        dayStarts: List<Int>?,
        zone: TimeZone = TimeZone.getDefault(),
    ): Boolean {
        val at = nextFire(nowMillis - DUE_SLACK_MILLIS, startMinutes, endMinutes, intervalMinutes, lastFired, emptyList(), dayStarts, zone) ?: return false
        return at <= nowMillis + DUE_SLACK_MILLIS
    }

    /** Reminders never come more often than hourly, whatever is stored. */
    const val MIN_INTERVAL_MINUTES = 60
}

/**
 * The widget's automatic background (mirrors lib/reminderBackgrounds.ts):
 * the local time of day, and the season only where it is reliable — a real
 * location outside the tropics, by hemisphere; otherwise spring's palette.
 */
/**
 * What Home's «مختارات اليوم» previews (RemindersPlugin.getWidgetPreview): the widget's
 * own content, never a rotation of its own. With a widget on the home screen, exactly
 * the item (and comment) it drew for the slot it shows — the tap on either opens the
 * same thing. With none, or before it has drawn this slot, the item the same rotation
 * is due to show there (WidgetRotation.candidates' first, with the slot's comment).
 */
object WidgetPreview {
    /** The widget's drawing: what a tap on it opens, and the slot it was drawn for. */
    data class Drawn(val open: ReminderOpen, val slot: Long)

    enum class From(val key: String) { WIDGET("widget"), ROTATION("rotation") }

    fun current(
        pool: List<ReminderItem>,
        slot: Long,
        current: ReminderItem?,
        drawn: Drawn?,
        commentFor: (ReminderItem) -> ReminderComment?,
    ): Pair<ReminderOpen, From>? {
        // Only while it is still this slot's drawing of an item the widget may show (a new pool or language redraws it).
        if (drawn != null && drawn.slot == slot && WidgetRotation.pool(pool).any { it.id == drawn.open.id }) return drawn.open to From.WIDGET
        val item = WidgetRotation.candidates(pool, slot, current).firstOrNull() ?: return null
        return ReminderOpen.of(item, commentFor(item)) to From.ROTATION
    }
}

object WidgetBackgrounds {
    val FIXED = setOf("mosque-night", "arches-dusk", "pattern-navy", "pattern-sage")
    private val PERIOD_STARTS = listOf(4, 8, 16, 19)

    fun period(hour: Int): String = when (hour) {
        in 4 until 8 -> "dawn"
        in 8 until 16 -> "day"
        in 16 until 19 -> "sunset"
        else -> "night"
    }

    fun season(month: Int, latitude: Double?): String? {
        if (latitude == null || latitude.isNaN() || kotlin.math.abs(latitude) < 23.5) return null
        val northern = when (month) {
            3, 4, 5 -> "spring"
            6, 7, 8 -> "summer"
            9, 10, 11 -> "autumn"
            else -> "winter"
        }
        if (latitude > 0) return northern
        return mapOf("spring" to "autumn", "summer" to "winter", "autumn" to "spring", "winter" to "summer").getValue(northern)
    }

    fun autoId(nowMillis: Long, latitude: Double?, zone: TimeZone = TimeZone.getDefault()): String {
        val cal = Calendar.getInstance(zone).apply { timeInMillis = nowMillis }
        return "${period(cal.get(Calendar.HOUR_OF_DAY))}-${season(cal.get(Calendar.MONTH) + 1, latitude) ?: "spring"}"
    }

    fun isKnown(id: String): Boolean = id in FIXED || Regex("^(dawn|day|sunset|night)-(spring|summer|autumn|winter)$").matches(id)

    /** The next moment the automatic background changes (the next period start, local time). */
    fun nextChange(nowMillis: Long, zone: TimeZone = TimeZone.getDefault()): Long = (0..1).flatMap { day ->
        PERIOD_STARTS.map { hour ->
            Calendar.getInstance(zone).apply {
                timeInMillis = nowMillis
                add(Calendar.DAY_OF_YEAR, day)
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }.timeInMillis
        }
    }.first { it > nowMillis }
}

/**
 * The end-of-day summary, composed at delivery time from the snapshot JS
 * pushed (lib/dailySummary.ts) plus Floating Tasbeeh taps still queued
 * natively for today. Its counts are the Statistics screen's own (JS
 * statisticsCounts — the same functions, daily and «منذ البداية»): Tasbeeh
 * includes Audio "Various" recordings heard to the end, as that screen
 * counts them; other listening has its own line. A day is "nothing
 * recorded" only when that is verified ([recordsKnown]): otherwise the
 * message says the day's records couldn't be read, and shows no all-time
 * line from another snapshot beside it — a status line never contradicts
 * the counts shown with it. "Nothing recorded" is phrased so it never claims
 * the user did nothing — and, when there is earlier activity, the all-time
 * line says so.
 */
object DailySummary {
    data class Activity(val written: Int = 0, val tasbeeh: Int = 0, val wirds: List<String> = emptyList(), val prayerSessions: Int = 0) {
        val total: Int get() = written + tasbeeh
        val any: Boolean get() = total > 0 || wirds.isNotEmpty() || prayerSessions > 0
    }

    /**
     * Today's activity as JS pushed it (lib/dailySummary.ts). [floatingThrough] and [audioIds] say
     * what of native's own queues it already holds (the newest Floating Tasbeeh tap taken in; the
     * Audio Adhkar completions taken in): only what is still queued and NOT in it is added
     * ([newPendingTaps], [newPendingCompletions]) — never lost, never counted twice.
     */
    /** Everything recorded so far, as the Statistics screen's «منذ البداية» reports it. */
    data class AllTime(val morningDays: Int = 0, val eveningDays: Int = 0, val prayerSessions: Int = 0, val tasbeeh: Int = 0, val written: Int = 0) {
        val any: Boolean get() = morningDays > 0 || eveningDays > 0 || prayerSessions > 0 || tasbeeh > 0 || written > 0
    }

    data class Snapshot(
        val date: String,
        val today: Activity,
        val history: List<Pair<String, Int>>,
        val trackedSince: String?,
        val audio: Listening? = null,
        val floatingThrough: Long? = null,
        val audioIds: Set<String> = emptySet(),
        val allTime: AllTime? = null,
        /** False when JS couldn't read its statistics (status "unavailable"): its zeros are unknown, not "nothing". */
        val recordsReadable: Boolean = true,
    )

    /**
     * Whether what the app recorded on [day] is known. [snapshot] is that day's (null when there
     * is none, or it couldn't be read — [storedUnreadable]). Without one, the day is known to be
     * empty only when the app wasn't opened that day ([appOpenedOn]): every in-app record pushes
     * a snapshot, so opened-but-no-snapshot means the push or the read failed.
     */
    fun recordsKnown(snapshot: Snapshot?, day: String, appOpenedOn: String?, storedUnreadable: Boolean): Boolean = when {
        snapshot != null -> snapshot.recordsReadable
        storedUnreadable -> false
        else -> appOpenedOn != day
    }

    /** Queued Floating Tasbeeh taps ([epochMillis] to times) of [day] that the snapshot doesn't hold yet. */
    fun newPendingTaps(snapshot: Snapshot?, day: String, queued: List<Triple<String, Long, Int>>): Int {
        val through = snapshot?.takeIf { it.date == day }?.floatingThrough
        return queued.filter { (date, at, _) -> date == day && (through == null || at > through) }.sumOf { it.third.coerceAtLeast(0) }
    }

    /** The ids of queued Audio Adhkar completions of [day] that the snapshot doesn't hold yet. */
    fun newPendingCompletions(snapshot: Snapshot?, day: String, queued: List<Pair<String, String>>): Set<String> {
        val taken = snapshot?.takeIf { it.date == day }?.audioIds ?: emptySet()
        return queued.filter { (date, id) -> date == day && id !in taken }.map { it.second }.toSet()
    }

    /**
     * The day a summary that is going out now describes: the day it was due ([dueFor]) when that
     * is today or yesterday — a summary held back past midnight (the phone dozing; an inexact
     * alarm) still describes the day it was for, not the new day's first minutes — else today.
     */
    fun summaryDay(today: String, dueFor: String?): String {
        if (dueFor == null || dueFor > today) return today
        return if (dueFor == today || dueFor == previousDay(today)) dueFor else today
    }

    fun previousDay(day: String): String {
        val (y, m, d) = day.split("-").map { it.toInt() }
        val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(y, m - 1, d)
            add(Calendar.DAY_OF_MONTH, -1)
        }
        return "%04d-%02d-%02d".format(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
    }

    /**
     * Audio Adhkar LISTENING that day (lib/dailySummary.ts SummaryAudio):
     * recordings heard to the end, recordings that stopped part-way, sessions,
     * the measured listening time (completed lengths plus what stopped-early
     * recordings really played) — shown on its own line, never added to the
     * user's repetitions.
     */
    data class Listening(
        val plays: Int = 0,
        val sessions: Int = 0,
        val playsWithoutSession: Int = 0,
        val listenedMs: Long = 0,
        val playsWithoutDuration: Int = 0,
        val titles: List<String> = emptyList(),
        val stoppedEarly: Int = 0,
    )

    /**
     * Adds completions the background player recorded today that the app
     * hasn't taken in yet (it may be closed): they are not in the snapshot,
     * so nothing is counted twice. Their sessions can't be matched against
     * the snapshot's, so the session count is then left out rather than
     * guessed.
     */
    fun withPendingListening(audio: Listening?, pending: List<Pair<Long?, String?>>, pendingStoppedEarlyMs: List<Long> = emptyList()): Listening? {
        if (pending.isEmpty() && pendingStoppedEarlyMs.isEmpty()) return audio
        val base = audio ?: Listening()
        val early = pendingStoppedEarlyMs.filter { it > 0 }
        return base.copy(
            plays = base.plays + pending.size,
            playsWithoutSession = base.playsWithoutSession + pending.size + early.size,
            listenedMs = base.listenedMs + pending.sumOf { it.first ?: 0L } + early.sum(),
            playsWithoutDuration = base.playsWithoutDuration + pending.count { it.first == null },
            stoppedEarly = base.stoppedEarly + early.size,
        )
    }

    /** The listening line, or null when nothing was listened to (or the snapshot is from another day). */
    fun listeningLine(audio: Listening?, en: Boolean): String? {
        if (audio == null || (audio.plays <= 0 && audio.listenedMs <= 0)) return null
        val parts = mutableListOf<String>()
        if (audio.plays > 0) {
            parts += if (en) {
                if (audio.plays == 1) "1 complete recording" else "${audio.plays} complete recordings"
            } else {
                when {
                    audio.plays == 1 -> "تسجيل واحد كامل"
                    audio.plays == 2 -> "تسجيلان كاملان"
                    audio.plays <= 10 -> "${audio.plays} تسجيلات كاملة"
                    else -> "${audio.plays} تسجيلًا كاملًا"
                }
            }
        }
        if (audio.stoppedEarly > 0) {
            parts += if (en) {
                if (audio.stoppedEarly == 1) "1 played in part" else "${audio.stoppedEarly} played in part"
            } else {
                when {
                    audio.stoppedEarly == 1 -> "تسجيل استُمع إلى جزء منه"
                    audio.stoppedEarly == 2 -> "تسجيلان استُمع إلى جزء منهما"
                    else -> "${audio.stoppedEarly} تسجيلات استُمع إلى جزء منها"
                }
            }
        }
        // Sessions only when every play carries one (older plays didn't record it).
        if (audio.sessions > 0 && audio.playsWithoutSession == 0) {
            parts += if (en) {
                if (audio.sessions == 1) "in 1 session" else "in ${audio.sessions} sessions"
            } else {
                when {
                    audio.sessions == 1 -> "في جلسة واحدة"
                    audio.sessions == 2 -> "في جلستين"
                    audio.sessions <= 10 -> "في ${audio.sessions} جلسات"
                    else -> "في ${audio.sessions} جلسة"
                }
            }
        }
        if (audio.listenedMs > 0) {
            val minutes = Math.round(audio.listenedMs / 60_000.0).toInt()
            val partial = audio.playsWithoutDuration > 0
            val amount = if (en) {
                when {
                    minutes < 1 -> "under a minute"
                    minutes == 1 -> "1 minute"
                    else -> "$minutes minutes"
                }
            } else {
                when {
                    minutes < 1 -> "أقل من دقيقة"
                    minutes == 1 -> "دقيقة واحدة"
                    minutes == 2 -> "دقيقتان"
                    minutes <= 10 -> "$minutes دقائق"
                    else -> "$minutes دقيقة"
                }
            }
            parts += if (en) (if (partial) "listening time at least $amount" else "listening time $amount") else (if (partial) "مدة الاستماع لا تقل عن $amount" else "مدة الاستماع $amount")
        }
        // Labelled as the Statistics screen's Audio Adhkar (its "Various" recordings also count there as Tasbeeh).
        val head = if (en) "Audio Adhkar listening: " else "الاستماع إلى الأذكار الصوتية: "
        return head + parts.joinToString(" · ")
    }

    /** [encouragementId]: the library message used (DailySummaryEncouragement), to rotate; null when none. */
    data class Message(val title: String, val body: String, val encouragementId: String? = null)

    private fun days(n: Int, en: Boolean): String = if (en) {
        if (n == 1) "1 day" else "$n days"
    } else {
        when {
            n == 1 -> "يوم واحد"
            n == 2 -> "يومان"
            n <= 10 -> "$n أيام"
            else -> "$n يومًا"
        }
    }

    /** The «منذ البداية» line — clearly all-time, never mixed with the day's own counts; null when nothing was ever recorded. */
    fun allTimeLine(allTime: AllTime?, en: Boolean): String? {
        if (allTime == null || !allTime.any) return null
        val parts = mutableListOf<String>()
        if (allTime.morningDays > 0) parts += if (en) "Morning Adhkar on ${days(allTime.morningDays, true)}" else "أذكار الصباح في ${days(allTime.morningDays, false)}"
        if (allTime.eveningDays > 0) parts += if (en) "Evening Adhkar on ${days(allTime.eveningDays, true)}" else "أذكار المساء في ${days(allTime.eveningDays, false)}"
        if (allTime.prayerSessions > 0) parts += if (en) "Prayer Adhkar ×${allTime.prayerSessions}" else "أذكار الصلاة ×${allTime.prayerSessions}"
        if (allTime.tasbeeh > 0) parts += if (en) "Tasbeeh ${allTime.tasbeeh}" else "التسبيح ${allTime.tasbeeh}"
        if (allTime.written > 0) parts += if (en) "written adhkar ${allTime.written} repetitions" else "الأذكار المكتوبة ${allTime.written} تكرارًا"
        return (if (en) "Since the beginning: " else "منذ البداية: ") + parts.joinToString(" · ")
    }

    /** Enough history for a comparison: a recorded yesterday, or ≥ 4 tracked days in the past week. */
    data class Comparison(val yesterday: Int?, val average: Int?)

    fun comparison(snapshot: Snapshot, today: String): Comparison? {
        if (snapshot.date != today) return null
        val tracked = snapshot.history.filter { (date, _) -> snapshot.trackedSince != null && date >= snapshot.trackedSince }
        val yesterday = snapshot.history.lastOrNull()?.second?.takeIf { it > 0 }
        val average = if (tracked.size >= 4) tracked.sumOf { it.second } / tracked.size else null
        if (yesterday == null && (average == null || average == 0)) return null
        return Comparison(yesterday, average?.takeIf { it > 0 })
    }

    /**
     * The summary of [today] — the day it describes (summaryDay; [ofYesterday] when it goes out
     * after that day's midnight, so it says "yesterday", never "today").
     */
    fun compose(
        snapshot: Snapshot?,
        today: String,
        extraTasbeeh: Int,
        mode: String,
        language: String,
        pendingListening: List<Pair<Long?, String?>> = emptyList(),
        pendingStoppedEarlyMs: List<Long> = emptyList(),
        pendingSessions: List<String> = emptyList(),
        ofYesterday: Boolean = false,
        // Audio "Various" recordings heard to the end, still queued natively: Tasbeeh on the Statistics screen once taken in.
        pendingVariousPlays: Int = 0,
        // The «منذ البداية» counts to show ([snapshot]'s, else an earlier snapshot's); null = unknown.
        allTimeSoFar: AllTime? = snapshot?.allTime,
        // Whether the app's records of the day are known (recordsKnown); false = never "nothing recorded".
        recordsKnown: Boolean = snapshot?.recordsReadable ?: true,
        // The encouragement library the app pushed (src/data/summaryEncouragement.ts), in the interface language; empty = the fixed lines below.
        encouragements: List<DailySummaryEncouragement.Item> = emptyList(),
        // Library ids used recently, newest last: not repeated while others fit.
        recentEncouragements: List<String> = emptyList(),
    ): Message {
        val en = language == "en"
        val known = recordsKnown && snapshot?.recordsReadable != false
        val base = if (known && snapshot?.date == today) snapshot.today else Activity()
        // A Morning/Evening session heard to its end (still queued natively) completes that session too — once.
        val wirds = (base.wirds + pendingSessions.filter { it == "morning" || it == "evening" }).distinct()
        val addedTasbeeh = extraTasbeeh.coerceAtLeast(0) + pendingVariousPlays.coerceAtLeast(0)
        val activity = base.copy(tasbeeh = base.tasbeeh + addedTasbeeh, wirds = wirds)
        // What is still queued natively belongs to the all-time counts too (never less than the day's own).
        val allTime = allTimeSoFar?.takeIf { known }?.let { a ->
            a.copy(
                tasbeeh = a.tasbeeh + addedTasbeeh,
                morningDays = a.morningDays + if ("morning" in wirds && "morning" !in base.wirds) 1 else 0,
                eveningDays = a.eveningDays + if ("evening" in wirds && "evening" !in base.wirds) 1 else 0,
            )
        }
        val allTimeText = allTimeLine(allTime, en)
        val title = when {
            ofYesterday && en -> "Yesterday's Adhkar summary"
            ofYesterday -> "ملخص أذكار الأمس"
            en -> "Today's Adhkar summary"
            else -> "ملخص أذكار اليوم"
        }
        val dayEn = if (ofYesterday) "yesterday" else "today"
        val dayAr = if (ofYesterday) "أمس" else "اليوم"
        val listening = listeningLine(withPendingListening(if (known && snapshot?.date == today) snapshot.audio else null, pendingListening, pendingStoppedEarlyMs), en)
        if (!known && !activity.any && listening == null) {
            val body = if (en) {
                "DITHAR couldn't read ${dayEn}'s records, so this summary can't say what was recorded. Open the app to update it."
            } else {
                "تعذّرت على دِثار قراءة سجلّ $dayAr، فلا يمكن لهذا الملخص أن يذكر ما سُجّل. افتح التطبيق لتحديثه."
            }
            return Message(title, body)
        }
        // Only what native queued is known: said so, so its counts never read as the whole day.
        val partialNote = if (known) null else if (en) "Only what was recorded outside the app is shown — open DITHAR to include the rest." else "يظهر هنا ما سُجّل خارج التطبيق فقط — افتح دِثار ليُضاف الباقي."
        if (!activity.any && listening != null) {
            // Only listening: the Audio Adhkar were heard — said as it is, never "no adhkar". Listening
            // is still not turned into the user's own repetitions; it has its own line.
            val note = if (en) "You listened to adhkar in DITHAR $dayEn; nothing was read or counted in Written Adhkar or Tasbeeh." else "استمعتَ إلى الأذكار في دِثار $dayAr، ولم تُسجَّل قراءةٌ في الأذكار المكتوبة ولا تسبيحٌ في السبحة."
            val picked = if (mode == "stats") null else DailySummaryEncouragement.pick(encouragements, setOf(DailySummaryEncouragement.LISTENING), recentEncouragements, today)
            val encouragement = picked?.let(DailySummaryEncouragement::text) ?: if (en) {
                "May Allah accept your listening. Saying a dhikr along with it — even once — is counted as your own."
            } else {
                "تقبّل الله استماعك. وإن ردّدتَ معه ذكرًا ولو مرة، سُجّل لك ذكرًا منك."
            }
            val body = when (mode) {
                "stats" -> listOfNotNull(note, listening, partialNote, allTimeText).joinToString("\n")
                "motivational" -> if (en) "You listened to adhkar in DITHAR $dayEn.\n$encouragement" else "استمعتَ إلى الأذكار في دِثار $dayAr.\n$encouragement"
                else -> listOfNotNull(note, listening, partialNote, allTimeText, encouragement).joinToString("\n")
            }
            return Message(title, body, picked?.id)
        }
        if (!activity.any) {
            // Nothing that day — and, when there is, what was recorded before, so it never reads as "never".
            // Gentle, never guilt: the library's "empty" messages, else the fixed line.
            val picked = if (mode == "stats") null else DailySummaryEncouragement.pick(encouragements, setOf(DailySummaryEncouragement.EMPTY), recentEncouragements, today)
            val fresh = picked?.let(DailySummaryEncouragement::text)
                ?: if (en) "Tomorrow is a fresh page: begin with a single dhikr after Fajr, and let a little grow." else "غدًا صفحةٌ جديدة: ابدأ بذكرٍ واحد بعد الفجر، ودَع القليل يكبر."
            val body = when {
                mode == "stats" -> listOfNotNull(if (en) "No dhikr was recorded in DITHAR $dayEn." else "لم يُسجَّل أي ذكر في دِثار $dayAr.", allTimeText).joinToString("\n")
                mode == "motivational" && en -> "No dhikr was recorded in DITHAR $dayEn — and that's okay.\n$fresh"
                mode == "motivational" -> "لم يُسجَّل في دِثار ذكرٌ $dayAr، ولا بأس.\n$fresh"
                en -> listOfNotNull("No dhikr was recorded in DITHAR $dayEn — and that's okay.", allTimeText, fresh).joinToString("\n")
                else -> listOfNotNull("لم يُسجَّل في دِثار ذكرٌ $dayAr، ولا بأس.", allTimeText, fresh).joinToString("\n")
            }
            return Message(title, body, picked?.id)
        }
        val parts = mutableListOf<String>()
        if ("morning" in activity.wirds) parts += if (en) "Morning Adhkar ✓" else "أذكار الصباح ✓"
        if ("evening" in activity.wirds) parts += if (en) "Evening Adhkar ✓" else "أذكار المساء ✓"
        if (activity.prayerSessions > 0) parts += if (en) "Prayer Adhkar ×${activity.prayerSessions}" else "أذكار الصلاة ×${activity.prayerSessions}"
        if (activity.tasbeeh > 0) parts += if (en) "Tasbeeh ${activity.tasbeeh}" else "التسبيح ${activity.tasbeeh}"
        if (activity.written > 0) parts += if (en) "written adhkar ${activity.written} repetitions" else "الأذكار المكتوبة ${activity.written} تكرارًا"
        val stats = (if (en) "Recorded $dayEn: " else "سجّلت $dayAr: ") + parts.joinToString(" · ")
        val comparisonText = snapshot?.takeIf { known }?.let { comparison(it, today) }?.let { c ->
            when {
                activity.total == 0 -> null
                // Compared with the day before the day described ("yesterday", or the day before it).
                c.yesterday != null && ofYesterday -> when {
                    activity.total > c.yesterday -> if (en) "More than the day before (${c.yesterday})." else "أكثر من اليوم الذي قبله (${c.yesterday})."
                    activity.total < c.yesterday -> if (en) "The day before: ${c.yesterday}." else "اليوم الذي قبله: ${c.yesterday}."
                    else -> if (en) "The same as the day before." else "مثل اليوم الذي قبله."
                }
                c.yesterday != null -> when {
                    activity.total > c.yesterday -> if (en) "More than yesterday (${c.yesterday})." else "أكثر من أمس (${c.yesterday})."
                    activity.total < c.yesterday -> if (en) "Yesterday: ${c.yesterday}." else "أمس: ${c.yesterday}."
                    else -> if (en) "The same as yesterday." else "مثل أمس."
                }
                c.average != null -> if (en) "Your recent daily average: ${c.average}." else "متوسط أيامك الأخيرة: ${c.average}."
                else -> null
            }
        }
        // What was really done that day decides which messages fit (DailySummaryEncouragement.situations).
        val picked = if (mode == "stats") {
            null
        } else {
            val week = known && snapshot != null && DailySummaryEncouragement.recordedEveryDay(snapshot, today, activity.total)
            DailySummaryEncouragement.pick(encouragements, DailySummaryEncouragement.situations(activity, week), recentEncouragements, today)
        }
        val motivation = picked?.let(DailySummaryEncouragement::text) ?: if (en) {
            "May Allah bless your day and accept your remembrance. A little, kept up, goes a long way — see you tomorrow."
        } else {
            "بارك الله في يومك وتقبّل ذكرك. القليل الدائم يصنع الكثير — نلقاك غدًا على الذكر."
        }
        val body = when (mode) {
            "stats" -> listOfNotNull(stats, comparisonText, listening, partialNote, allTimeText).joinToString("\n")
            // What was done, without numbers, then the encouragement that fits it.
            "motivational" -> listOf(DailySummaryEncouragement.achievements(activity, en, dayEn, dayAr), motivation).joinToString("\n")
            else -> listOfNotNull(stats, comparisonText, listening, partialNote, allTimeText, motivation).joinToString("\n")
        }
        return Message(title, body, picked?.id)
    }

    /** The next local [minutes]-after-midnight strictly after [afterMillis]. */
    fun nextAt(afterMillis: Long, minutes: Int, zone: TimeZone = TimeZone.getDefault()): Long {
        val cal = Calendar.getInstance(zone).apply {
            timeInMillis = afterMillis
            set(Calendar.HOUR_OF_DAY, minutes / 60)
            set(Calendar.MINUTE, minutes % 60)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (cal.timeInMillis <= afterMillis) cal.add(Calendar.DAY_OF_YEAR, 1)
        return cal.timeInMillis
    }

    fun localDate(millis: Long, zone: TimeZone = TimeZone.getDefault()): String {
        val cal = Calendar.getInstance(zone).apply { timeInMillis = millis }
        return "%04d-%02d-%02d".format(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
    }
}

/**
 * A heart tapped on the home-screen widget, queued natively until the app
 * merges it into its Favorites (lib/favoritesSync.ts). It carries a snapshot
 * of what was shown — the Arabic text, title, source, meaning and the
 * comment — so the favorite is saved faithfully even if the app's content
 * changed in between.
 */
data class FavoriteOp(
    val seq: Long,
    val key: String,
    val add: Boolean,
    val at: Long,
    val category: String = "",
    val title: String = "",
    val text: String = "",
    val meaning: String = "",
    val source: String = "",
    val commentId: String? = null,
    val commentText: String? = null,
)

/**
 * Pure rules for the widget's favorite heart (kept apart from storage so
 * they can be unit-tested): one entry per content id — tapping again
 * removes it — and the app's own list, once pushed, wins for everything
 * the app has already seen.
 */
object FavoriteLogic {
    /** The keys after a tap, and whether the item is now a favorite. */
    fun toggle(keys: Set<String>, key: String): Pair<Set<String>, Boolean> =
        if (key in keys) (keys - key) to false else (keys + key) to true

    /** The op recorded for a tap; `seq` orders it after every earlier one. */
    fun op(seq: Long, item: ReminderItem, comment: ReminderComment?, add: Boolean, now: Long) = FavoriteOp(
        seq = seq,
        key = item.id,
        add = add,
        at = now,
        category = item.category,
        title = item.title,
        text = item.text,
        meaning = item.meaning,
        source = item.source,
        commentId = comment?.id,
        commentText = comment?.text,
    )

    /** Ops the app has merged (seq ≤ throughSeq) are dropped; later ones stay queued. */
    fun acknowledge(ops: List<FavoriteOp>, throughSeq: Long): List<FavoriteOp> = ops.filter { it.seq > throughSeq }

    /**
     * The widget's view of the favorites after the app pushed its list: the
     * app's keys, with any taps the app hasn't merged yet replayed on top
     * (in order), so a tap made between the app's read and its push is
     * never lost or undone.
     */
    fun merge(appKeys: Set<String>, pending: List<FavoriteOp>): Set<String> =
        pending.sortedBy { it.seq }.fold(appKeys) { keys, op -> if (op.add) keys + op.key else keys - op.key }
}
