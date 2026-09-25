package com.dithar.app.audioadhkar

import java.util.Calendar
import java.util.TimeZone

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

data class PlaylistItem(
    val dhikrId: String,
    val title: String,
    val text: String,
    /** Path inside the APK's assets, e.g. "public/audio/adhkar/evening/morning_003.mp3". */
    val assetPath: String,
    val repetitions: Int,
)

/**
 * Where a playback session is: which dhikr, which repetition. Each single
 * playback of a file gets a token; only the CURRENT token's completion can
 * count, and only once — a duplicate or late "completed" is ignored.
 *
 * A completion only RECORDS what comes next; [advance] applies it when the
 * next playback actually starts (after the silence between playbacks), so
 * the repetition/dhikr shown never moves ahead of the audio.
 */
class PlaybackCursor(val items: List<PlaylistItem>) {
    var index = 0
        private set
    var repetition = 1
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
        const val SILENCE_MILLIS = 3_000L
    }
}
