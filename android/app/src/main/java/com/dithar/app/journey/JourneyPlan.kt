package com.dithar.app.journey

import java.util.Calendar
import java.util.TimeZone

/**
 * The Qur'an Journey notice native holds (lib/quranJourneyNotify.ts builds it): the assignment
 * to invite to, from [fromDate] on. Its text is already in the interface language.
 */
data class JourneyNotice(
    val fromDate: String,
    val page: Int,
    val round: Int,
    val insight: String,
    val title: String,
    val body: String,
)

/** When the daily notification fires, and whether a firing posts. Pure, for unit tests. */
object JourneyPlan {
    /**
     * The next time at [minutes] (local) after [now] on a day that is [fromDate] or later and
     * isn't [postedFor] (already posted that day). A time already passed today waits for
     * tomorrow: the notification never comes late.
     */
    fun nextFire(now: Long, minutes: Int, fromDate: String, postedFor: String?, zone: TimeZone = TimeZone.getDefault()): Long {
        val cal = Calendar.getInstance(zone).apply { timeInMillis = now }
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        for (i in 0 until 400) {
            cal.set(Calendar.HOUR_OF_DAY, minutes / 60)
            cal.set(Calendar.MINUTE, minutes % 60)
            val date = localDate(cal.timeInMillis, zone)
            if (cal.timeInMillis > now && date >= fromDate && date != postedFor) return cal.timeInMillis
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        return cal.timeInMillis
    }

    /** Whether an alarm firing at [now] posts: the notice applies today, today hasn't had one, and its time has come. */
    fun shouldPost(now: Long, minutes: Int, fromDate: String, postedFor: String?, zone: TimeZone = TimeZone.getDefault()): Boolean {
        val today = localDate(now, zone)
        val cal = Calendar.getInstance(zone).apply { timeInMillis = now }
        val minuteOfDay = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
        return today >= fromDate && today != postedFor && minuteOfDay >= minutes
    }

    fun localDate(millis: Long, zone: TimeZone = TimeZone.getDefault()): String {
        val cal = Calendar.getInstance(zone).apply { timeInMillis = millis }
        return "%04d-%02d-%02d".format(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
    }
}

/** What a tapped Journey notification carries to the app: the assignment it invited to. */
data class JourneyOpen(val page: Int, val round: Int, val insight: String, val fromDate: String) {
    fun toExtras(): Map<String, String> = mapOf(EXTRA_PAGE to page.toString(), EXTRA_ROUND to round.toString(), EXTRA_INSIGHT to insight, EXTRA_DATE to fromDate)

    companion object {
        const val EXTRA_PAGE = "com.dithar.app.journey.PAGE"
        const val EXTRA_ROUND = "com.dithar.app.journey.ROUND"
        const val EXTRA_INSIGHT = "com.dithar.app.journey.INSIGHT"
        const val EXTRA_DATE = "com.dithar.app.journey.DATE"
        val EXTRAS = listOf(EXTRA_PAGE, EXTRA_ROUND, EXTRA_INSIGHT, EXTRA_DATE)
        private val INSIGHT = Regex("^\\d{1,3}:\\d{1,3}$")

        fun of(notice: JourneyNotice) = JourneyOpen(notice.page, notice.round, notice.insight, notice.fromDate)

        /** Null unless every extra is there and valid (a reminder's or a launcher's intent has none). */
        fun fromExtras(get: (String) -> String?): JourneyOpen? {
            val page = get(EXTRA_PAGE)?.toIntOrNull()?.takeIf { it in 1..604 } ?: return null
            val round = get(EXTRA_ROUND)?.toIntOrNull()?.takeIf { it >= 1 } ?: return null
            val insight = get(EXTRA_INSIGHT)?.takeIf { INSIGHT.matches(it) } ?: return null
            return JourneyOpen(page, round, insight, get(EXTRA_DATE) ?: "")
        }
    }
}
