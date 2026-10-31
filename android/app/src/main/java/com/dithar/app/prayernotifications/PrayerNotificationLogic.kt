package com.dithar.app.prayernotifications

/** One prayer time, as JS computed it from the app's prayer times. */
data class PrayerNotification(
    /** "fajr" | "dhuhr" | "asr" | "maghrib" | "isha". */
    val prayer: String,
    /** When it is delivered and its adhan plays, epoch millis: the prayer time, or that weekday's later Adhan time. */
    val at: Long,
    val title: String,
    val body: String,
    /**
     * Whether to show its notification. False when it's only here for the
     * adhan (auto-adhan on, that prayer's notification off).
     */
    val notify: Boolean = true,
    /**
     * The prayer time itself — the entry's identity. [at] can move (a later
     * Adhan time on chosen weekdays, changed at any moment); [prayerAt]
     * doesn't, so a prayer already posted is never posted again after its
     * time was changed. An older app build sends none: then it is [at].
     */
    val prayerAt: Long = at,
)

/**
 * Pure (Android-free) logic for prayer notifications, unit-tested on the
 * JVM. One alarm is armed at a time — for the next notification — and each
 * notification is posted at most once ([PrayerNotificationPlan.lastPosted]).
 */
object PrayerNotificationPlan {
    /** A notification delivered later than this after its prayer time is dropped, never posted stale. */
    const val STALE_MILLIS = 60 * 60_000L

    /** An alarm may arrive a little early (inexact delivery); it still counts for a prayer this close. */
    const val EARLY_MILLIS = 60_000L

    /**
     * The next notification to arm the alarm for: the earliest strictly
     * after [after] whose prayer wasn't posted yet ([lastPosted] is the
     * last posted entry's [PrayerNotification.prayerAt]). A later Adhan
     * time stays before the next prayer, so the order by time and by
     * prayer is the same.
     */
    fun next(entries: List<PrayerNotification>, after: Long, lastPosted: Long): PrayerNotification? =
        entries.filter { it.at > after && it.prayerAt > lastPosted }.minByOrNull { it.at }

    /** What a firing alarm does: which notification to post (null for none) and the new [lastPosted]. */
    data class Firing(val post: PrayerNotification?, val lastPosted: Long)

    /**
     * Everything due by [now] that wasn't posted yet is consumed at once;
     * only the most recent is shown, and only if it isn't stale — a late
     * alarm (Doze, the phone was off) never produces a burst of old
     * notifications.
     */
    fun fire(entries: List<PrayerNotification>, now: Long, lastPosted: Long): Firing {
        val due = entries.filter { it.prayerAt > lastPosted && it.at <= now + EARLY_MILLIS }
        val latest = due.maxByOrNull { it.at } ?: return Firing(null, lastPosted)
        return Firing(if (now - latest.at <= STALE_MILLIS) latest else null, latest.prayerAt)
    }

    /**
     * The adhan plays only this close to its prayer time — a late alarm
     * (Doze, the phone was off) never starts an adhan long after the time.
     */
    const val ADHAN_MAX_LATE_MILLIS = 3 * 60_000L

    fun adhanOnTime(entry: PrayerNotification, now: Long): Boolean = now - entry.at <= ADHAN_MAX_LATE_MILLIS

    /** Whether a firing prayer's adhan plays: auto-adhan off for its section, too late, or play. */
    fun adhanDecision(adhanOn: Boolean, entry: PrayerNotification, now: Long): AdhanDecision = when {
        !adhanOn -> AdhanDecision.OFF
        !adhanOnTime(entry, now) -> AdhanDecision.TOO_LATE
        else -> AdhanDecision.PLAY
    }

    /** Fixed notification id per prayer: a new day's Fajr replaces yesterday's, never stacks. */
    fun notificationId(prayer: String): Int = 7410 + PRAYERS.indexOf(prayer).coerceAtLeast(0)

    val PRAYERS = listOf("fajr", "dhuhr", "asr", "maghrib", "isha")
}

enum class AdhanDecision { OFF, TOO_LATE, PLAY }

/** One adhan voice the app can play: a recording in the APK and the segment of it to play. */
data class AdhanVoice(
    val id: String,
    val name: String,
    /** Path inside the APK assets, e.g. "public/audio/adhan/….mp3". */
    val assetPath: String,
    val startMillis: Long,
    val endMillis: Long,
    /** The muezzin heard in this recording — empty when the recording doesn't reliably say who it is. */
    val muezzin: String = "",
)

/**
 * The adhan for one section ("regular" for Dhuhr–Isha, "fajr"), as set in
 * Settings → صوت الأذان: the voices to choose from (the chosen one, or the
 * enabled ones while rotating) and the voice Settings shows as next.
 * [nextToken] identifies that announcement, so it's honoured once only.
 */
data class AdhanConfig(val rotate: Boolean, val voices: List<AdhanVoice>, val nextVoiceId: String?, val nextToken: String?)

/** Which voice plays — the native twin of adhanVoiceRotation.ts. */
object AdhanPlan {
    fun sectionFor(prayer: String): String = if (prayer == "fajr") "fajr" else "regular"

    /**
     * The voice for this adhan. Not rotating, or one voice → the first.
     * Rotating → the voice Settings announced as next, once (its token not
     * yet [consumedToken], and not the one just played), else a random one —
     * never the one played last while there's another.
     */
    fun pick(config: AdhanConfig, lastVoiceId: String?, consumedToken: String?, random: (Int) -> Int): AdhanVoice? {
        val voices = config.voices
        if (voices.isEmpty()) return null
        if (!config.rotate || voices.size == 1) return voices.first()
        if (config.nextToken != null && config.nextToken != consumedToken) {
            voices.firstOrNull { it.id == config.nextVoiceId && it.id != lastVoiceId }?.let { return it }
        }
        val pool = voices.filter { it.id != lastVoiceId }.ifEmpty { voices }
        return pool[random(pool.size).coerceIn(0, pool.size - 1)]
    }
}
