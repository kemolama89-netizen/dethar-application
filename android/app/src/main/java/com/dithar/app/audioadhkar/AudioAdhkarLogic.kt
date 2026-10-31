package com.dithar.app.audioadhkar

import java.util.Calendar
import java.util.TimeZone
import kotlin.random.Random

/**
 * Pure (Android-free) logic for scheduled Evening Audio Adhkar, kept apart
 * from the alarm/service plumbing so it can be unit-tested on the JVM.
 */
object AudioAdhkarSchedule {
    /**
     * The next local wall-clock moment at [hour]:[minute] strictly AFTER
     * [afterMillis] — today if that is still ahead, otherwise tomorrow.
     * Uses the phone's own time zone, so DST/zone changes are respected.
     */
    fun nextOccurrence(afterMillis: Long, hour: Int, minute: Int, zone: TimeZone = TimeZone.getDefault()): Long {
        val cal = Calendar.getInstance(zone).apply {
            timeInMillis = afterMillis
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (cal.timeInMillis <= afterMillis) cal.add(Calendar.DAY_OF_YEAR, 1)
        return cal.timeInMillis
    }

    /**
     * Whether an alarm for [occurrence] may start a playback session.
     * Each scheduled occurrence starts at most one session:
     *  - a stale alarm (the schedule was changed/cancelled since it was set)
     *    no longer matches [scheduledOccurrence];
     *  - a duplicate delivery of the same alarm is <= [lastFiredOccurrence];
     *  - nothing starts while a session is already playing.
     */
    fun shouldFire(occurrence: Long, scheduledOccurrence: Long, lastFiredOccurrence: Long, sessionActive: Boolean): Boolean =
        occurrence > 0 && occurrence == scheduledOccurrence && occurrence > lastFiredOccurrence && !sessionActive

    /** The pre-playback warning comes exactly this long before playback. */
    const val WARNING_LEAD_MILLIS = 60_000L

    /** Playback time, plus the warning time when a warning should be armed for it (null otherwise). */
    data class Plan(val playbackAt: Long, val warningAt: Long?)

    /**
     * Both alarms for the next occurrence after [nowMillis]. The warning
     * is armed only while its moment is still ahead and it hasn't already
     * been shown for this playback ([lastWarnedOccurrence]) — so a start
     * time less than a minute away, or a resync after the warning already
     * showed, never produces an immediate or second warning.
     */
    fun plan(nowMillis: Long, hour: Int, minute: Int, lastWarnedOccurrence: Long, zone: TimeZone = TimeZone.getDefault()): Plan {
        val playbackAt = nextOccurrence(nowMillis, hour, minute, zone)
        val warningAt = playbackAt - WARNING_LEAD_MILLIS
        val armWarning = warningAt > nowMillis && playbackAt > lastWarnedOccurrence
        return Plan(playbackAt, if (armWarning) warningAt else null)
    }

    /**
     * Whether a warning alarm (tagged with the playback [occurrence] it
     * announces) may post its notification: only for the playback still
     * scheduled, only once, only before that playback, and never while a
     * session is already playing.
     */
    fun shouldWarn(occurrence: Long, scheduledOccurrence: Long, lastWarnedOccurrence: Long, sessionActive: Boolean, nowMillis: Long): Boolean =
        occurrence > 0 && occurrence == scheduledOccurrence && occurrence > lastWarnedOccurrence && !sessionActive && nowMillis < occurrence
}

/** A scheduled Audio Adhkar section, each with its own settings, playlist and alarms. */
enum class Section(val key: String, val label: String, val labelEn: String) {
    MORNING("morning", "أذكار الصباح", "Morning Adhkar"),
    EVENING("evening", "أذكار المساء", "Evening Adhkar"),
    MISC("misc", "الأذكار المتنوعة", "Miscellaneous Adhkar"),
    ;

    val isDaily: Boolean get() = this != MISC

    /** Its name in the interface language ("ar" | "en"). */
    fun label(language: String): String = if (language == "en") labelEn else label

    companion object {
        /** Unknown/missing (e.g. an alarm armed before sections existed) → Evening, the only section then. */
        fun of(key: String?): Section = values().firstOrNull { it.key == key } ?: EVENING
    }
}

/** A span of time [start, end) in epoch millis. */
data class Window(val start: Long, val end: Long)

/**
 * No Audio Adhkar around the adhan: each prayer's adhan time starts a
 * 30-minute window ([PAUSE_MILLIS]) in which nothing starts, and anything
 * playing stops. The windows come from the app's own prayer times (JS
 * pushes them); overlapping or touching windows act as one.
 */
object AdhanSuppression {
    const val PAUSE_MILLIS = 30 * 60_000L

    /** Sorted, with overlapping/touching windows merged. */
    fun normalize(windows: List<Window>): List<Window> {
        val merged = mutableListOf<Window>()
        for (w in windows.filter { it.end > it.start }.sortedBy { it.start }) {
            val last = merged.lastOrNull()
            if (last != null && w.start <= last.end) merged[merged.size - 1] = Window(last.start, maxOf(last.end, w.end)) else merged.add(w)
        }
        return merged
    }

    fun isSuppressed(at: Long, windows: List<Window>): Boolean = normalize(windows).any { at >= it.start && at < it.end }

    /** [at] itself when it's free, else the end of the (merged) window covering it. */
    fun clearAt(at: Long, windows: List<Window>): Long = normalize(windows).firstOrNull { at >= it.start && at < it.end }?.end ?: at

    /** The first window that begins strictly after [at] — when a session in progress must stop. */
    fun nextStartAfter(at: Long, windows: List<Window>): Long? = normalize(windows).firstOrNull { it.start > at }?.start
}

/**
 * Daily sessions (Morning, Evening). The user's start time is the
 * occurrence's identity ("nominal"); when it falls inside an adhan window
 * the session starts as soon as that window ends instead — never skipped,
 * never early.
 */
object DailyPlan {
    data class Plan(val occurrence: Long, val playbackAt: Long, val warningAt: Long?)

    private const val DAY_MILLIS = 24 * 60 * 60_000L

    fun plan(
        nowMillis: Long,
        hour: Int,
        minute: Int,
        lastFiredOccurrence: Long,
        lastWarnedOccurrence: Long,
        windows: List<Window>,
        zone: TimeZone = TimeZone.getDefault(),
    ): Plan {
        // Today's occurrence may already be past yet still pending — deferred past an adhan window that hasn't ended.
        val candidates = listOf(
            AudioAdhkarSchedule.nextOccurrence(nowMillis - DAY_MILLIS, hour, minute, zone),
            AudioAdhkarSchedule.nextOccurrence(nowMillis, hour, minute, zone),
        ).distinct()
        var chosen: Pair<Long, Long>? = null
        for (nominal in candidates) {
            if (nominal <= lastFiredOccurrence) continue
            val at = AdhanSuppression.clearAt(nominal, windows)
            if (at > nowMillis) {
                chosen = nominal to at
                break
            }
        }
        val (occurrence, playbackAt) = chosen ?: run {
            val next = AudioAdhkarSchedule.nextOccurrence(nowMillis + DAY_MILLIS / 2, hour, minute, zone)
            next to AdhanSuppression.clearAt(next, windows)
        }
        val warningAt = playbackAt - AudioAdhkarSchedule.WARNING_LEAD_MILLIS
        val armWarning = warningAt > nowMillis && occurrence > lastWarnedOccurrence
        return Plan(occurrence, playbackAt, if (armWarning) warningAt else null)
    }

    /**
     * The next session from the planned [slots] (one per day, each inside
     * its prayer-time window — JS plans them, see DailySlot): the first
     * whose window hasn't had a session yet ([lastFiredOccurrence] — a
     * day never plays twice, even when its plan moved since), that is
     * still ahead (after any adhan deferral) and still starts inside its
     * window. Null when none is left. Its heads-up is never armed before
     * the slot's [DailySlot.notBefore] (a weekly holiday's start).
     */
    fun planSlots(
        nowMillis: Long,
        slots: List<DailySlot>,
        lastFiredOccurrence: Long,
        lastWarnedOccurrence: Long,
        windows: List<Window>,
    ): Plan? {
        for (slot in slots.sortedBy { it.start }) {
            if (slot.start <= lastFiredOccurrence || lastFiredOccurrence >= slot.windowStart) continue
            val at = AdhanSuppression.clearAt(slot.start, windows)
            if (at <= nowMillis || at >= slot.windowEnd) continue
            val warningAt = at - AudioAdhkarSchedule.WARNING_LEAD_MILLIS
            val armWarning = warningAt > nowMillis && warningAt >= slot.notBefore && slot.start > lastWarnedOccurrence
            return Plan(slot.start, at, if (armWarning) warningAt else null)
        }
        return null
    }
}

/**
 * One day's planned Morning/Evening session: its prayer-time window
 * [[windowStart], [windowEnd]) and when it starts ([start] — also the
 * occurrence's identity). Nothing of it plays at or after [windowEnd].
 * [notBefore]: on a weekly holiday, its start time — JS already planned
 * [start] no earlier, and the heads-up isn't shown before it either (0 = none).
 */
data class DailySlot(val windowStart: Long, val start: Long, val windowEnd: Long, val notBefore: Long = 0L) {
    companion object {
        /** Whether [occurrence]'s session may still play (start or continue) at [nowMillis]: not past its window's end. Unplanned (legacy) occurrences have no window. */
        fun stillInWindow(occurrence: Long, nowMillis: Long, slots: List<DailySlot>?): Boolean {
            val slot = slots?.firstOrNull { it.start == occurrence } ?: return true
            return nowMillis < slot.windowEnd
        }
    }
}

/**
 * Miscellaneous adhkar: one dhikr at a time, each at least [intervalMinutes]
 * after the previous one started, inside the daily [start, end) window
 * (crossing midnight when end < start; equal start and end is no window).
 * Whatever blocks a dhikr — an adhan pause, another session playing — only
 * delays it: Misc resumes as soon as everything has cleared, with ONE
 * dhikr (never a burst of missed ones), then keeps the interval from there.
 */
object MiscPlan {
    val INTERVALS_MINUTES = listOf(2, 3, 5, 10, 60)

    /**
     * The earliest moment at or after [afterMillis] when the next dhikr may
     * play: not before [lastPlayed] + interval, inside the Misc window, and
     * outside every adhan window. Null when the settings give no window.
     */
    fun nextPlay(
        afterMillis: Long,
        startMinutes: Int,
        endMinutes: Int,
        intervalMinutes: Int,
        lastPlayed: Long,
        windows: List<Window>,
        zone: TimeZone = TimeZone.getDefault(),
        dayStarts: List<Int>? = null,
        dayTimes: MiscDayTimes? = null,
    ): Long? {
        if (startMinutes !in 0 until 1440 || endMinutes !in 0 until 1440 || intervalMinutes <= 0) return null
        // No window on any weekday (equal start and end, and no day of its own that has one): nothing ever plays.
        if ((0..6).none { dayWindow(it, startMinutes, endMinutes, dayStarts, dayTimes) != null }) return null
        val merged = AdhanSuppression.normalize(windows)
        var t = if (lastPlayed > 0) maxOf(afterMillis, lastPlayed + intervalMinutes * 60_000L) else afterMillis
        repeat(64) {
            if (!inWindow(t, startMinutes, endMinutes, zone, dayStarts, dayTimes)) {
                t = nextWindowStart(t, startMinutes, endMinutes, zone, dayStarts, dayTimes) ?: return null
            }
            val blocking = merged.firstOrNull { t >= it.start && t < it.end } ?: return t
            t = blocking.end
        }
        return null
    }

    /**
     * The window of the day that falls on [weekday]: [start, end] in minutes
     * (end < start crosses midnight into the next day), or null when that
     * day has none. [dayTimes] (Misc's own per-weekday times) replace the
     * usual start and/or end that day; then [dayStarts] (the weekly
     * schedule) moves its start later — not at all when that is past its end.
     */
    private fun dayWindow(weekday: Int, startMinutes: Int, endMinutes: Int, dayStarts: List<Int>?, dayTimes: MiscDayTimes?): Pair<Int, Int>? {
        val ownStart = dayTimes?.startOn(weekday, startMinutes) ?: startMinutes
        val end = dayTimes?.endOn(weekday, endMinutes) ?: endMinutes
        if (ownStart == end) return null
        val start = WeeklyStart.effective(ownStart, dayStarts, weekday)
        if (end > ownStart && start >= end) return null
        return start to end
    }

    /**
     * Whether [at] lies inside the window that a tick on its day (or the
     * evening before) belongs to. A window belongs to the day it starts on:
     * that day's own times ([dayTimes]) or the usual ones, opening no
     * earlier than that day's weekly start ([dayStarts], Sunday first, -1 = none).
     */
    fun inWindow(at: Long, startMinutes: Int, endMinutes: Int, zone: TimeZone = TimeZone.getDefault(), dayStarts: List<Int>? = null, dayTimes: MiscDayTimes? = null): Boolean {
        for (dayOffset in -1..0) {
            val (start, end) = dayWindow(WeeklyStart.weekdayOf(at, dayOffset, zone), startMinutes, endMinutes, dayStarts, dayTimes) ?: continue
            val s = dayAt(at, dayOffset, start, zone)
            val e = dayAt(at, if (end > start) dayOffset else dayOffset + 1, end, zone)
            if (at >= s && at < e) return true
        }
        return false
    }

    /** The first Misc window start strictly after [at] (a day left without a window is skipped). */
    private fun nextWindowStart(at: Long, startMinutes: Int, endMinutes: Int, zone: TimeZone, dayStarts: List<Int>?, dayTimes: MiscDayTimes?): Long? =
        (0..8).mapNotNull { offset ->
            dayWindow(WeeklyStart.weekdayOf(at, offset, zone), startMinutes, endMinutes, dayStarts, dayTimes)?.let { (start, _) -> dayAt(at, offset, start, zone) }
        }.firstOrNull { it > at }

    private fun dayAt(reference: Long, dayOffset: Int, minutes: Int, zone: TimeZone): Long = Calendar.getInstance(zone).apply {
        timeInMillis = reference
        add(Calendar.DAY_OF_YEAR, dayOffset)
        set(Calendar.HOUR_OF_DAY, minutes / 60)
        set(Calendar.MINUTE, minutes % 60)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis
}

/**
 * Miscellaneous adhkar paused for prayer: the user is told when an adhan
 * window begins inside which Misc would otherwise have played, with the time it ends — overlapping windows are one
 * pause, ending at the latest one's end. Each pause is announced once.
 */
object MiscPausePlan {
    /**
     * The next adhan window (merged) starting after [nowMillis] and after
     * the last one already announced, inside which Misc would have played.
     */
    fun nextPause(
        nowMillis: Long,
        startMinutes: Int,
        endMinutes: Int,
        intervalMinutes: Int,
        windows: List<Window>,
        lastAnnouncedStart: Long,
        lastPlayed: Long = 0L,
        zone: TimeZone = TimeZone.getDefault(),
        dayStarts: List<Int>? = null,
        dayTimes: MiscDayTimes? = null,
    ): Window? = AdhanSuppression.normalize(windows).firstOrNull { w ->
        w.start > nowMillis && w.start > lastAnnouncedStart &&
            // When Misc would next play if there were no adhan pause — inside this one?
            (MiscPlan.nextPlay(w.start, startMinutes, endMinutes, intervalMinutes, lastPlayed, emptyList(), zone, dayStarts, dayTimes)?.let { it < w.end } ?: false)
    }

    /**
     * When to announce [pause]: at its start — but never before its day's
     * earliest start ([dayStarts]: the weekly schedule / holiday start), so
     * a pause that begins before it is announced when Misc would have begun.
     */
    fun noticeAt(pause: Window, dayStarts: List<Int>?, zone: TimeZone = TimeZone.getDefault()): Long {
        val floor = dayStarts?.getOrNull(WeeklyStart.weekdayOf(pause.start, 0, zone)) ?: -1
        if (floor !in 0 until 1440) return pause.start
        val floorAt = Calendar.getInstance(zone).apply {
            timeInMillis = pause.start
            set(Calendar.HOUR_OF_DAY, floor / 60)
            set(Calendar.MINUTE, floor % 60)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        return if (floorAt in (pause.start + 1) until pause.end) floorAt else pause.start
    }
}

/**
 * Misc's own times on chosen weekdays (Sunday = 0 … Saturday = 6): that
 * day's start and/or end replace the usual ones (-1 = the usual one) — e.g.
 * Saturday 12:00–22:00 while the other days keep 09:00–21:00. The weekly
 * schedule's earliest start still applies on top (MiscPlan.dayWindow).
 */
data class MiscDayTimes(val starts: List<Int>, val ends: List<Int>) {
    fun startOn(weekday: Int, usual: Int): Int = starts.getOrNull(weekday)?.takeIf { it in 0 until 1440 } ?: usual
    fun endOn(weekday: Int, usual: Int): Int = ends.getOrNull(weekday)?.takeIf { it in 0 until 1440 } ?: usual

    companion object {
        /** Seven starts and seven ends, or none (an older app build, or no day set). */
        fun parse(starts: List<Int>?, ends: List<Int>?): MiscDayTimes? {
            if (starts?.size != 7 || ends?.size != 7) return null
            if ((starts + ends).none { it in 0 until 1440 }) return null
            return MiscDayTimes(starts, ends)
        }
    }
}

/**
 * The weekly schedule: per weekday (Sunday = 0 … Saturday = 6, as
 * Calendar.DAY_OF_WEEK - 1 and JS Date#getDay), the earliest minute a
 * RECURRING item (the Misc dhikr, reminders) may start that day; -1 = none.
 * Always read against the device's current local time, so a date change,
 * a time-zone change or DST needs no resync.
 */
object WeeklyStart {
    /** A section's start on a weekday: its own, unless that day's weekly start is later. */
    fun effective(startMinutes: Int, dayStarts: List<Int>?, weekday: Int): Int {
        val day = dayStarts?.getOrNull(weekday) ?: -1
        return if (day in 0 until 1440) maxOf(startMinutes, day) else startMinutes
    }

    /** The weekday (Sunday = 0) of the local day [dayOffset] days from [at]. */
    fun weekdayOf(at: Long, dayOffset: Int = 0, zone: TimeZone = TimeZone.getDefault()): Int = Calendar.getInstance(zone).run {
        timeInMillis = at
        add(Calendar.DAY_OF_YEAR, dayOffset)
        get(Calendar.DAY_OF_WEEK) - 1
    }

    /** Seven values or none: anything else (an older app build) means no weekly schedule. */
    fun parse(values: List<Int>?): List<Int>? = values?.takeIf { it.size == 7 }
}

/** One Hijri occasion day pushed from JS: [start, end) local day, and its key. */
data class OccasionWindow(val start: Long, val end: Long, val key: String)

/**
 * Islamic days and occasions for the recurring Misc dhikr (see
 * lib/islamicOccasions.ts for the evidence behind each): on these days a
 * tick plays the occasion's own dhikr instead of the normal rotation —
 * same window, same interval — and the normal rotation continues from
 * where it left off afterwards. Friday is decided here from the device's
 * weekday (it needs no Hijri date and never runs out) and wins over every
 * other occasion; the Hijri ones come as day windows from JS.
 */
object MiscOccasion {
    const val FRIDAY = "friday"

    fun keyAt(at: Long, enabled: Boolean, windows: List<OccasionWindow>, zone: TimeZone = TimeZone.getDefault()): String? {
        if (!enabled) return null
        if (WeeklyStart.weekdayOf(at, 0, zone) == Calendar.FRIDAY - 1) return FRIDAY
        return windows.firstOrNull { at >= it.start && at < it.end }?.key
    }

    /** Which item of an occasion's playlist a tick plays, and the index to store for the next one. */
    fun pick(size: Int, storedIndex: Int): Pair<Int, Int> {
        val index = storedIndex.coerceAtLeast(0) % size
        return index to (index + 1) % size
    }
}

/**
 * A daily session that couldn't run to the end (stopped by an adhan, or
 * blocked because another section was playing) continues from [index]
 * once allowed — within [GIVE_UP_MILLIS] of its start time, never later.
 */
/**
 * Miscellaneous adhkar make way for Morning/Evening: none starts from one
 * minute before a daily session's start (or resume) — every Misc recording
 * is far shorter than a minute, so Misc is silent by then — and none while
 * the session plays (another session playing keeps Misc waiting); it
 * resumes one minute after the session ends, with the next dhikr of its
 * cycle only (MiscPlan never replays missed ticks).
 */
object MiscDailyGuard {
    const val BEFORE_MILLIS = 60_000L
    const val AFTER_MILLIS = 60_000L

    /**
     * Where Misc may not start: around each upcoming daily start/resume —
     * from a minute before it to a minute after, by when the session is
     * playing (and Misc waits for its end through the "busy" rule).
     */
    fun blocks(dailyStarts: List<Long>): List<Window> =
        dailyStarts.filter { it > 0 }.map { Window(it - BEFORE_MILLIS, it + AFTER_MILLIS) }

    /** When Misc may play again after a daily session ended at [endMillis]. */
    fun resumeAfter(endMillis: Long): Long = endMillis + AFTER_MILLIS
}

/**
 * A Morning/Evening session the adhan interrupted, saved exactly where it
 * stopped — never resumed by itself: after the adhan pause ends the user
 * gets ONE notification with a "Resume Adhkar" action (ResumePrompt), and
 * only that action (or the in-app button) continues it from here.
 *
 * [index] is the absolute playlist index of the dhikr that plays next and
 * [repetition] its repetition; when that repetition was already playing,
 * [part] / [positionMillis] say where inside its files it was (a Quranic
 * recitation is several ayah files back to back). [rotationSlot] keeps the
 * reciter a random-rotation recitation had, so a resumed recitation keeps
 * its voice (-1 when not rotating).
 */
data class SavedProgress(
    val occurrence: Long,
    val index: Int,
    val repetition: Int,
    val part: Int,
    val positionMillis: Long,
    val rotationSlot: Int,
    /** When the prompt may be shown: the end of the adhan pause. */
    val promptAt: Long,
    /** After this nothing of the session may continue (its prayer-time window's end). */
    val expiresAt: Long,
    val prompted: Boolean = false,
)

object ResumePrompt {
    /**
     * When an interrupted session stops being resumable: its prayer-time
     * window's end — or, for a session planned before windows existed,
     * Resume.GIVE_UP_MILLIS after its start.
     */
    fun expiresAt(occurrence: Long, slots: List<DailySlot>?): Long =
        slots?.firstOrNull { it.start == occurrence }?.windowEnd ?: (occurrence + Resume.GIVE_UP_MILLIS)

    /**
     * Whether the prompt alarm for [occurrence] may post its notification
     * now: the saved session is still this one, not prompted yet, the
     * section still on, its adhan pause over, nothing of this section
     * playing, and still resumable.
     */
    fun shouldPrompt(saved: SavedProgress?, occurrence: Long, nowMillis: Long, sectionEnabled: Boolean, suppressed: Boolean, sessionActive: Boolean): Boolean =
        saved != null && saved.occurrence == occurrence && !saved.prompted && sectionEnabled && !suppressed && !sessionActive &&
            nowMillis < saved.expiresAt

    /**
     * When the prompt for a session interrupted at [nowMillis] may show: the
     * end of the adhan pause in progress — or of one starting within
     * [EDGE_MILLIS] (the stop can land a moment before the window opens) —
     * else a plain adhan pause from now.
     */
    fun promptAt(nowMillis: Long, windows: List<Window>): Long {
        val inside = AdhanSuppression.clearAt(nowMillis, windows)
        if (inside > nowMillis) return inside
        val starting = AdhanSuppression.nextStartAfter(nowMillis, windows)?.takeIf { it - nowMillis <= EDGE_MILLIS }
        return starting?.let { AdhanSuppression.clearAt(it, windows) } ?: (nowMillis + AdhanSuppression.PAUSE_MILLIS)
    }

    const val EDGE_MILLIS = 2 * 60_000L

    /** Whether the user's "Resume Adhkar" may start [saved] now. */
    fun canResume(saved: SavedProgress?, nowMillis: Long, sectionEnabled: Boolean): Boolean =
        saved != null && sectionEnabled && nowMillis < saved.expiresAt
}

object Resume {
    const val GIVE_UP_MILLIS = 3 * 60 * 60_000L
    const val BUSY_RETRY_MILLIS = 60_000L

    /**
     * Misc found another session playing: it is re-checked the moment that
     * session ends (the playback service reschedules Misc then); this
     * fallback only covers a session that ends without saying so.
     */
    const val MISC_BUSY_FALLBACK_MILLIS = 10 * 60_000L

    fun stillWanted(occurrence: Long, nowMillis: Long): Boolean = occurrence > 0 && nowMillis - occurrence < GIVE_UP_MILLIS
}

/**
 * Whether the phone is in a call (AudioManager.getMode): ringing, a phone
 * call, a VoIP call, or call screening/redirect — never started over by the
 * Settings volume preview («تجربة الصوت»).
 */
object CallState {
    // AudioManager.MODE_RINGTONE … MODE_COMMUNICATION_REDIRECT (1–6).
    private val CALL_MODES = 1..6

    fun isCall(mode: Int): Boolean = mode in CALL_MODES
}

/**
 * The app's own volume (Settings → إعدادات الصوت): one level per kind of
 * audio — the adhan, and each Audio Adhkar section — applied as the
 * MediaPlayer's gain, so the phone's media volume is never touched. Ducking
 * for another app scales it further.
 */
object VolumePolicy {
    const val ADHAN = "adhan"
    val KEYS = listOf(ADHAN, Section.MORNING.key, Section.EVENING.key, Section.MISC.key)

    /** Which level a session plays at: the adhan's, else its section's («استماع» included). */
    fun keyFor(section: Section, adhan: Boolean): String = if (adhan) ADHAN else section.key

    fun gain(level: Float, ducked: Boolean): Float {
        val base = if (level.isNaN()) 1f else level.coerceIn(0f, 1f)
        return if (ducked) base * FocusPolicy.DUCK_VOLUME else base
    }
}

/**
 * What the player does when another app takes or returns the audio
 * (AudioManager focus changes; the constants' values are mirrored here so
 * this stays testable on the JVM).
 *  - A short interruption (a call, another notification's sound, a voice
 *    prompt) pauses, and playback resumes by itself when it ends — unless
 *    the user paused meanwhile.
 *  - "May duck" lowers the volume while it lasts.
 *  - A permanent loss (another media app started playing) pauses and stays
 *    paused: the user resumes it.
 *
 * What it asks for ([requestFor]): an adhkar session asks only for
 * "transient, may duck" focus, so a video or music already playing in
 * another app is lowered (Android 8+ ducks it automatically) instead of
 * being told to pause, and gets its focus back the moment DITHAR stops. The
 * adhan alone takes focus outright, as before. An app may still choose to
 * pause on a duck request — that is its own policy, not DITHAR's.
 */
object FocusPolicy {
    const val GAIN = 1
    const val GAIN_TRANSIENT_MAY_DUCK = 3
    const val LOSS = -1
    const val LOSS_TRANSIENT = -2
    const val LOSS_TRANSIENT_CAN_DUCK = -3
    const val DUCK_VOLUME = 0.2f

    enum class Action { PAUSE_UNTIL_GAIN, PAUSE, DUCK, RESTORE, RESUME_AND_RESTORE }

    fun onChange(change: Int, pausedForFocus: Boolean): Action? = when (change) {
        LOSS_TRANSIENT -> Action.PAUSE_UNTIL_GAIN
        LOSS -> Action.PAUSE
        LOSS_TRANSIENT_CAN_DUCK -> Action.DUCK
        GAIN -> if (pausedForFocus) Action.RESUME_AND_RESTORE else Action.RESTORE
        else -> null
    }

    /** The focus a session requests: never exclusive for adhkar, so other apps' media isn't paused. */
    fun requestFor(adhan: Boolean): Int = if (adhan) GAIN else GAIN_TRANSIENT_MAY_DUCK
}

/**
 * The adhan's own answer to audio focus (adhkar keep [FocusPolicy]).
 *
 * Before: any permanent loss — another app starting a video, often only for
 * a moment (an autoplaying clip, a story, an ad) — paused the adhan as if
 * the user had paused it, and nothing ever resumed it; a refused focus
 * request was ignored and the adhan played over whatever held the audio.
 *
 * Now an interrupted adhan WAITS: it is paused (never ended) and comes back
 * on its own — when Android returns the focus, or, checked every
 * [RETRY_MILLIS], once no other app is playing and no call is in progress,
 * by asking for the focus again. It never fights an app that is still
 * playing, and never plays during a call. If the audio isn't free again
 * within [WAIT_MILLIS] the adhan ends cleanly instead of resuming late. A
 * start during a call waits the same way.
 *
 * A start that is refused with NO call in progress plays anyway, as adhkar
 * always have. Android 15+ refuses focus (AUDIOFOCUS_REQUEST_FAILED, no
 * exception) to an app it doesn't yet count as foreground; on a Motorola the
 * alarm-started service was refused that way, so the adhan sat "waiting"
 * until the user tapped Play in its notification, while adhkar (which
 * ignore the answer) played. Only a call is a reason not to start.
 *
 * A pause the user chose (notification, Home player, headphones unplugged)
 * is theirs to resume — but an adhan paused for longer than
 * [USER_PAUSE_MILLIS] ends, so a forgotten paused adhan can't hold the
 * player (and block scheduled adhkar or the next adhan) for hours.
 */
object AdhanFocusPolicy {
    const val REQUEST_FAILED = 0
    const val REQUEST_GRANTED = 1
    const val REQUEST_DELAYED = 2

    const val RETRY_MILLIS = 4_000L
    const val WAIT_MILLIS = 120_000L
    const val USER_PAUSE_MILLIS = 10 * 60_000L

    enum class Action { WAIT, DUCK, RESTORE, RESUME }

    fun onChange(change: Int, waiting: Boolean): Action? = when (change) {
        FocusPolicy.LOSS, FocusPolicy.LOSS_TRANSIENT -> Action.WAIT
        FocusPolicy.LOSS_TRANSIENT_CAN_DUCK -> Action.DUCK
        FocusPolicy.GAIN -> if (waiting) Action.RESUME else Action.RESTORE
        else -> null
    }

    /**
     * A focus request's result: play now, or wait for the focus. Granted plays; during a call
     * (delayed, or refused while one is in progress) it waits; refused/delayed with no call —
     * Android's background-focus rule or an OEM audio policy, not another sound — plays anyway.
     */
    fun startsNow(requestResult: Int, inCall: Boolean): Boolean = requestResult == REQUEST_GRANTED || !inCall

    /** Whether to ask for the focus again: only while nothing else plays and no call is in progress. */
    fun mayRetry(otherAudioPlaying: Boolean, inCall: Boolean): Boolean = !otherAudioPlaying && !inCall

    /** Whether a wait that began at [since] is over: the adhan then ends rather than resume late. */
    fun gaveUp(since: Long, now: Long, userPaused: Boolean): Boolean =
        now - since >= if (userPaused) USER_PAUSE_MILLIS else WAIT_MILLIS
}

/**
 * A Morning/Evening session's place, saved as each dhikr starts so a
 * session Android cut off (the service killed, the phone restarted) can
 * continue from the same dhikr — once, within Resume.GIVE_UP_MILLIS of its
 * start time, and only for scheduled daily sessions (a Misc dhikr or the
 * adhan is never replayed late).
 */
/**
 * How each alarm is armed. An alarm that starts playback (a session's
 * start, a Misc tick, a resume) is an alarm clock (AlarmManager.setAlarmClock):
 * the highest-priority alarm, which manufacturer background managers (HONOR,
 * Huawei …) deliver on time after DITHAR was swiped from Recents — they
 * held a plain exact alarm until the app was reopened (a real HONOR trace:
 * a Misc tick due 21:32:33 arrived at 21:33:14, the moment DITHAR opened).
 * Notification-only alarms (the warning, the prayer-pause notice) stay
 * exact. Without the "Alarms & reminders" permission, everything is inexact.
 */
object AlarmPolicy {
    enum class Mode { ALARM_CLOCK, EXACT, INEXACT }

    fun mode(startsPlayback: Boolean, exactAllowed: Boolean): Mode = when {
        !exactAllowed -> Mode.INEXACT
        startsPlayback -> Mode.ALARM_CLOCK
        else -> Mode.EXACT
    }
}

/**
 * Phones whose own background manager ("App launch" on HONOR/Huawei) can
 * hold DITHAR's alarms after it is swiped from Recents, regardless of
 * Android's battery-optimization exemption: the settings show a hint there.
 */
object BackgroundLaunchManager {
    private val managed = setOf("honor", "huawei")

    fun isManaged(manufacturer: String?, brand: String? = null): Boolean =
        listOfNotNull(manufacturer, brand).any { it.trim().lowercase() in managed }
}

data class ActiveSession(val section: Section, val occurrence: Long, val index: Int) {
    /** Whether to continue it now, and from which dhikr. */
    fun shouldContinue(nowMillis: Long): Boolean = section.isDaily && occurrence > 0 && index >= 0 && Resume.stillWanted(occurrence, nowMillis)
}

/** What one dhikr plays, as paths inside the APK's assets. Always bundled: no network. */
data class Recitation(
    /**
     * The files the FIRST repetition plays, back to back — e.g.
     * ["public/audio/adhkar/evening/morning_003.mp3"], or a Quranic
     * recitation: the reciter's own basmala (when it opens a surah), then
     * its ayah files in order.
     */
    val assetPaths: List<String>,
    /** The files later repetitions play — no basmala a second time. */
    val repeatAssetPaths: List<String> = assetPaths,
    /** Later repetitions start this far into their first file (past a basmala inside it). */
    val repeatStartMillis: Long = 0L,
    /**
     * Who is heard: the Quran reciter of a Quranic recitation, the muezzin of
     * an adhan. Empty when that isn't reliably known (e.g. generated audio) —
     * then no name is shown.
     */
    val reciterName: String = "",
)

data class PlaylistItem(
    val dhikrId: String,
    val title: String,
    val text: String,
    val recitation: Recitation,
    val repetitions: Int,
    /**
     * Quranic dhikr with the section reciter set to random: each reciter's
     * [Recitation] (his own basmala and ayahs), in rotation order
     * ([AudioAdhkarRotation] picks one at random per recitation). Empty otherwise.
     */
    val rotation: List<Recitation> = emptyList(),
) {
    /** The files repetition [repetition] (1-based) plays. */
    fun filesFor(repetition: Int): List<String> = if (repetition > 1) recitation.repeatAssetPaths else recitation.assetPaths

    /** Where in its first file repetition [repetition] starts. */
    fun startMillisFor(repetition: Int): Long = if (repetition > 1) recitation.repeatStartMillis else 0L
}

/**
 * Random reciter rotation for the Quranic dhikr of a scheduled session
 * (the section's reciter set to "random" in Audio Adhkar settings): each
 * Quranic recitation gets a random reciter from its [PlaylistItem.rotation]
 * choices — never the one the previous recitation had while there's
 * another — and the last one is persisted, so the next session doesn't
 * open with it either. Applied once when the session starts, so a
 * recitation keeps one reciter for all of its ayahs and repetitions.
 * Every item's choices list the reciters in the same order, so a slot
 * identifies a reciter.
 */
object AudioAdhkarRotation {
    /** The playlist this session plays, and the last reciter slot used (to persist for the next one). */
    data class Applied(val items: List<PlaylistItem>, val lastSlot: Int)

    fun apply(items: List<PlaylistItem>, lastSlot: Int, random: (Int) -> Int = { Random.nextInt(it) }): Applied {
        var last = lastSlot
        val resolved = items.map { item ->
            val choices = item.rotation.filter { it.assetPaths.isNotEmpty() }
            if (choices.isEmpty()) {
                item
            } else {
                val slot = pick(choices.size, last, random)
                last = slot
                item.copy(recitation = choices[slot])
            }
        }
        return Applied(resolved, last)
    }

    /** A random slot in [0, size), never [last] while size > 1. */
    fun pick(size: Int, last: Int, random: (Int) -> Int): Int {
        if (size <= 1) return 0
        if (last !in 0 until size) return random(size).coerceIn(0, size - 1)
        val r = random(size - 1).coerceIn(0, size - 2)
        return if (r >= last) r + 1 else r
    }
}

/**
 * Where a playback session is: which dhikr, which repetition. Each single
 * playback of a file gets a token; only the CURRENT token's completion can
 * count, and only once — a duplicate or late "completed" is ignored.
 *
 * A completion only RECORDS what comes next; [advance] applies it when the
 * next playback actually starts (after the silence between playbacks), so
 * the repetition/dhikr shown never moves ahead of the audio.
 */
class PlaybackCursor(val items: List<PlaylistItem>, startRepetition: Int = 1) {
    var index = 0
        private set
    /** A resumed session may start partway through its first dhikr's repetitions. */
    var repetition = startRepetition.coerceIn(1, items.firstOrNull()?.repetitions ?: 1)
        private set
    var finished = items.isEmpty()
        private set

    private var token = 0
    private var liveToken = -1
    private var pending: Step? = null

    val current: PlaylistItem? get() = if (finished) null else items[index]

    /** Call when a playback of [current] starts; pass the token to [complete]. */
    fun beginPlayback(): Int {
        token += 1
        liveToken = token
        return token
    }

    enum class Step { NEXT_REPETITION, NEXT_DHIKR, FINISHED, IGNORED }

    fun complete(playbackToken: Int): Step {
        if (finished || pending != null || playbackToken != liveToken) return Step.IGNORED
        liveToken = -1
        val item = items[index]
        val step = when {
            repetition < item.repetitions -> Step.NEXT_REPETITION
            index + 1 < items.size -> Step.NEXT_DHIKR
            else -> Step.FINISHED
        }
        if (step == Step.FINISHED) finished = true else pending = step
        return step
    }

    /**
     * Where this session would continue if stopped now: the dhikr (index
     * into [items]) and repetition that plays next, and whether that
     * repetition is already under way (so its playback position matters).
     * During the silence after a completed repetition that is the NEXT one
     * — a repetition already heard to its end is never replayed. Null once
     * the session has nothing left.
     */
    data class Point(val index: Int, val repetition: Int, val inProgress: Boolean)

    fun resumePoint(): Point? = when {
        finished -> null
        pending == Step.NEXT_REPETITION -> Point(index, repetition + 1, false)
        pending == Step.NEXT_DHIKR -> Point(index + 1, 1, false)
        else -> Point(index, repetition, liveToken != -1)
    }

    /**
     * «الذكر التالي»: leaves the dhikr shown now — its playing repetition is
     * abandoned (its completion will be ignored, so it is never counted) and
     * its remaining repetitions are skipped, never marked completed — for
     * the next one, which starts at [advance]. [Step.FINISHED] when it was
     * the last; [Step.IGNORED] when nothing is left.
     */
    fun skipDhikr(): Step {
        if (finished) return Step.IGNORED
        liveToken = -1
        // In the silence after the shown dhikr's last repetition, the next dhikr is already pending: that one plays.
        if (pending == Step.NEXT_DHIKR || index + 1 < items.size) {
            pending = Step.NEXT_DHIKR
            return Step.NEXT_DHIKR
        }
        pending = null
        finished = true
        return Step.FINISHED
    }

    /** Whether a dhikr follows the one shown now (the "Next" control is offered). */
    val hasNextDhikr: Boolean get() = !finished && index + 1 < items.size

    /** Moves to the pending next repetition/dhikr. Call as the next playback starts; false if nothing is pending. */
    fun advance(): Boolean {
        when (pending) {
            Step.NEXT_REPETITION -> repetition += 1
            Step.NEXT_DHIKR -> {
                index += 1
                repetition = 1
            }
            else -> return false
        }
        pending = null
        return true
    }
}

/**
 * The silence between two playbacks (every repetition and every dhikr;
 * never after the last playback of the session). Pausing during it
 * freezes the remaining time; resuming continues it.
 */
class SilenceGap(private val lengthMillis: Long = SILENCE_MILLIS) {
    /** Remaining silence while a gap is in progress (running or paused), else null. */
    var remainingMillis: Long? = null
        private set
    private var runningSince: Long? = null

    val active: Boolean get() = remainingMillis != null

    /** Starts a full gap; returns the delay until the next playback. */
    fun start(now: Long): Long {
        remainingMillis = lengthMillis
        runningSince = now
        return lengthMillis
    }

    fun pause(now: Long) {
        val since = runningSince ?: return
        remainingMillis = ((remainingMillis ?: 0L) - (now - since)).coerceAtLeast(0L)
        runningSince = null
    }

    /** Continues a paused gap; returns the remaining delay, or null when no gap is paused. */
    fun resume(now: Long): Long? {
        if (runningSince != null) return null
        val remaining = remainingMillis ?: return null
        runningSince = now
        return remaining
    }

    fun clear() {
        remainingMillis = null
        runningSince = null
    }

    companion object {
        const val SILENCE_MILLIS = 1_500L
    }
}

/**
 * Where playback is within one repetition (one or several files back to
 * back — a Quranic recitation is several ayah files), from the files' real
 * lengths and the playing file's position. Pure, so it is unit-tested.
 *
 * [startOffsetMillis] is where this repetition started playing: a later
 * repetition may skip an in-file basmala, and a resumed session continues
 * mid-file. Progress and the recorded length count only what plays from
 * there — never the part skipped, and never estimated: with any file's
 * length unknown, the total is null.
 */
object RepetitionProgress {
    /** The offset into the repetition where playback started: the files before [part], plus [positionInPart]. */
    fun startOffset(durations: List<Long?>, part: Int, positionInPart: Long): Long? {
        var sum = 0L
        for (i in 0 until part.coerceAtMost(durations.size)) sum += durations[i] ?: return null
        return sum + positionInPart.coerceAtLeast(0L)
    }

    /** The length this repetition plays (all files, minus the skipped start), or null when a length is unknown. */
    fun total(durations: List<Long?>, startOffsetMillis: Long?): Long? {
        if (startOffsetMillis == null || durations.isEmpty()) return null
        var sum = 0L
        for (d in durations) sum += d ?: return null
        return (sum - startOffsetMillis).coerceAtLeast(0L)
    }

    /** How much of it has played: the finished files, plus the playing file's position, minus the skipped start. */
    fun position(durations: List<Long?>, currentPart: Int, positionInPart: Long, startOffsetMillis: Long?): Long {
        val before = startOffset(durations, currentPart, positionInPart) ?: return 0L
        return (before - (startOffsetMillis ?: 0L)).coerceAtLeast(0L)
    }
}

/**
 * When a Morning/Evening Adhkar session is PRACTICED that day (the
 * statistics' Morning/Evening days, the end-of-day summary's ✓): as soon as
 * any of its audio has played — one repetition of one dhikr, or part of
 * one, then skipped or stopped, is enough; it needn't reach its end. Kept
 * apart from repetitions, which still count only when heard to their end.
 * A scheduled (or resumed) session and a «تشغيل الكل» run count — never
 * «استماع» of a single dhikr, the adhan, or the Misc section.
 *
 * One record per session ([key]): a scheduled session by its occurrence
 * (resuming it is the same session), a Play All run by its local day —
 * pausing, resuming, skipping or playing it again never adds another. The
 * app files each record once (stats.ts recordListenedSessions, by id), and
 * the statistics count DAYS, Morning and Evening apart.
 */
object SessionPractice {
    fun counts(isDaily: Boolean, manual: Boolean, playAll: Boolean, adhan: Boolean): Boolean = isDaily && !adhan && (!manual || playAll)

    fun key(occurrence: Long, localDate: String): String = if (occurrence > 0) "$occurrence" else "day:$localDate"
}

/**
 * What the phone's media controls (notification shade, lock screen) show for
 * the track playing — the same lines as the in-app player
 * (components/AudioAdhkarScreen.tsx NowPlayingPanel, HomeAdhanNowPlaying):
 * the title, then the line under it — for a dhikr "التكرار 2 من 3" and,
 * when a recitation's reciter is known, "· القارئ: …"; for the adhan the
 * muezzin. Android shows MediaMetadata TITLE and ARTIST there (DISPLAY_SUBTITLE
 * is not shown), so these become TITLE and ARTIST.
 */
object NowPlayingText {
    /** The prayer names the app uses (data/content.ts prayerNames). */
    private val PRAYER_AR = mapOf("fajr" to "الفجر", "dhuhr" to "الظهر", "asr" to "العصر", "maghrib" to "المغرب", "isha" to "العشاء")
    private val PRAYER_EN = mapOf("fajr" to "Fajr", "dhuhr" to "Dhuhr", "asr" to "Asr", "maghrib" to "Maghrib", "isha" to "Isha")

    /** "التكرار 2 من 3 · القارئ: مشاري العفاسي" — the in-app player's line, word for word. */
    fun dhikrSubtitle(repetition: Int, total: Int?, reciter: String, en: Boolean): String {
        val count = when {
            total != null && total > 0 -> if (en) "Repetition $repetition of $total" else "التكرار $repetition من $total"
            else -> if (en) "Repetition $repetition" else "التكرار $repetition"
        }
        return if (reciter.isBlank()) count else "$count · ${if (en) "Reciter" else "القارئ"}: $reciter"
    }

    /** "أذان الظهر" / "Dhuhr Adhan"; just "الأذان" / "Adhan" for an unknown prayer key. */
    fun adhanTitle(prayer: String, en: Boolean): String {
        val name = (if (en) PRAYER_EN else PRAYER_AR)[prayer]
        return when {
            name == null -> if (en) "Adhan" else "الأذان"
            en -> "$name Adhan"
            else -> "أذان $name"
        }
    }

    /** "المؤذن: …" when the recording reliably says who it is; otherwise the recording's own name (never a guessed muezzin). */
    fun adhanSubtitle(muezzin: String, recordingName: String, en: Boolean): String =
        if (muezzin.isNotBlank()) "${if (en) "Muezzin" else "المؤذن"}: $muezzin" else recordingName
}
