package com.dithar.app.reminders

import com.dithar.app.audioadhkar.Window
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

class ReminderLogicTest {
    private val zone = TimeZone.getTimeZone("Asia/Kuwait")
    private fun at(day: Int, hour: Int, minute: Int = 0, month: Int = Calendar.OCTOBER): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, month, day, hour, minute, 0)
    }.timeInMillis

    private fun item(id: String, category: String) = ReminderItem(id, category, category, "نص", "", "مصدر", "dua")
    private val pool = (1..10).map { item("dua:$it", "dua") } + (1..10).map { item("hadith:$it", "hadith") } + (1..5).map { item("virtue:$it", "virtue") }

    // ---- rotation ------------------------------------------------------------

    @Test
    fun categoriesTakeTurns() {
        val first = ReminderRotation.next(pool, ReminderRotation.CATEGORIES.toSet(), null, emptyList()) { 0 }!!
        val second = ReminderRotation.next(pool, ReminderRotation.CATEGORIES.toSet(), first.category, emptyList()) { 0 }!!
        val third = ReminderRotation.next(pool, ReminderRotation.CATEGORIES.toSet(), second.category, emptyList()) { 0 }!!
        // No poetry in this pool: the turn comes back to duas.
        val fourth = ReminderRotation.next(pool, ReminderRotation.CATEGORIES.toSet(), third.category, emptyList()) { 0 }!!
        assertEquals(listOf("dua", "hadith", "virtue", "dua"), listOf(first.category, second.category, third.category, fourth.category))
    }

    @Test
    fun onlyEnabledCategoriesWithContentAreUsed() {
        val onlyHadith = ReminderRotation.next(pool, setOf("hadith"), "hadith", emptyList()) { 0 }!!
        assertEquals("hadith", onlyHadith.category)
        assertNull(ReminderRotation.next(pool, emptySet(), null, emptyList()))
        assertNull(ReminderRotation.next(pool.filter { it.category == "dua" }, setOf("hadith"), null, emptyList()))
    }

    @Test
    fun recentRemindersAreNotRepeatedWhileOthersRemain() {
        var recent = emptyList<String>()
        var last: String? = null
        val seen = mutableListOf<String>()
        repeat(30) {
            val next = ReminderRotation.next(pool, setOf("dua", "hadith", "virtue"), last, recent) { 0 }!!
            seen += next.id
            recent = ReminderRotation.remember(recent, next.id)
            last = next.category
        }
        // Within each category, no text comes back until every one of its texts has been shown.
        for ((prefix, size) in listOf("dua:" to 10, "hadith:" to 10, "virtue:" to 5)) {
            val picks = seen.filter { it.startsWith(prefix) }
            assertEquals(size, picks.take(size).toSet().size)
        }
    }

    @Test
    fun theRecentListIsBounded() {
        var recent = emptyList<String>()
        val total = ReminderRotation.RECENT_LIMIT + 50
        repeat(total) { recent = ReminderRotation.remember(recent, "id$it") }
        assertEquals(ReminderRotation.RECENT_LIMIT, recent.size)
        assertEquals("id${total - 1}", recent.last())
    }

    @Test
    fun withRemindersOffTheWidgetPickIsStableForTheDay() {
        val morning = ReminderRotation.dailyPick(pool, at(14, 6), zone)
        val night = ReminderRotation.dailyPick(pool, at(14, 23), zone)
        val tomorrow = ReminderRotation.dailyPick(pool, at(15, 6), zone)
        assertEquals(morning, night)
        assertTrue(morning != tomorrow)
        assertNull(ReminderRotation.dailyPick(emptyList(), at(14, 6), zone))
    }

    // ---- timing --------------------------------------------------------------

    @Test
    fun remindersStayInsideThePeriodAtTheInterval() {
        assertEquals(at(14, 9), ReminderPlan.nextFire(at(14, 7), 9 * 60, 21 * 60, 180, 0L, emptyList(), null, zone))
        assertEquals(at(14, 12), ReminderPlan.nextFire(at(14, 9, 1), 9 * 60, 21 * 60, 180, at(14, 9), emptyList(), null, zone))
        // After the period: the next day's start — never a burst of missed ones.
        assertEquals(at(15, 9), ReminderPlan.nextFire(at(14, 21, 5), 9 * 60, 21 * 60, 180, at(14, 18), emptyList(), null, zone))
    }

    @Test
    fun neverMoreThanHourlyAndNeverDuringAnAdhanPause() {
        assertEquals(at(14, 10), ReminderPlan.nextFire(at(14, 9, 1), 9 * 60, 21 * 60, 5, at(14, 9), emptyList(), null, zone))
        val dhuhr = Window(at(14, 11, 40), at(14, 12, 10))
        assertEquals(at(14, 12, 10), ReminderPlan.nextFire(at(14, 11, 30), 9 * 60, 21 * 60, 60, at(14, 11), listOf(dhuhr), null, zone))
    }

    @Test
    fun theWeeklyScheduleDelaysADaysFirstReminder() {
        // 16 Oct 2026 is a Friday (weekday 5): nothing before 11:00.
        val friday = listOf(-1, -1, -1, -1, -1, 11 * 60, -1)
        assertEquals(at(16, 11), ReminderPlan.nextFire(at(16, 7), 9 * 60, 21 * 60, 120, 0L, emptyList(), friday, zone))
    }

    // ---- backgrounds ----------------------------------------------------------

    @Test
    fun theAutomaticBackgroundFollowsTheTimeOfDay() {
        assertEquals("dawn-autumn", WidgetBackgrounds.autoId(at(14, 5), 29.4, zone))
        assertEquals("day-autumn", WidgetBackgrounds.autoId(at(14, 12), 29.4, zone))
        assertEquals("sunset-autumn", WidgetBackgrounds.autoId(at(14, 17), 29.4, zone))
        assertEquals("night-autumn", WidgetBackgrounds.autoId(at(14, 22), 29.4, zone))
        assertEquals("night-autumn", WidgetBackgrounds.autoId(at(14, 2), 29.4, zone))
    }

    @Test
    fun theSeasonIsUsedOnlyWhereReliableAndFlipsSouthOfTheEquator() {
        assertEquals("day-spring", WidgetBackgrounds.autoId(at(14, 12), null, zone)) // no reliable location
        assertEquals("day-spring", WidgetBackgrounds.autoId(at(14, 12), 3.1, zone)) // tropics
        assertEquals("day-spring", WidgetBackgrounds.autoId(at(14, 12), -33.9, zone)) // October south = spring
        assertEquals("day-winter", WidgetBackgrounds.autoId(at(14, 12, month = Calendar.JANUARY), 51.5, zone))
        assertEquals("day-summer", WidgetBackgrounds.autoId(at(14, 12, month = Calendar.JANUARY), -33.9, zone))
    }

    @Test
    fun theWidgetRefreshesAtTheNextTimeOfDayChange() {
        assertEquals(at(14, 8), WidgetBackgrounds.nextChange(at(14, 5), zone))
        assertEquals(at(14, 19), WidgetBackgrounds.nextChange(at(14, 16), zone))
        assertEquals(at(15, 4), WidgetBackgrounds.nextChange(at(14, 19, 30), zone))
    }

    @Test
    fun onlyKnownBackgroundIdsAreAccepted() {
        assertTrue(WidgetBackgrounds.isKnown("mosque-night"))
        assertTrue(WidgetBackgrounds.isKnown("sunset-winter"))
        assertFalse(WidgetBackgrounds.isKnown("../../secret"))
    }

    // ---- end-of-day summary ---------------------------------------------------

    private val today = "2026-10-14"
    private fun snapshot(written: Int = 0, tasbeeh: Int = 0, wirds: List<String> = emptyList(), history: List<Int> = List(7) { 0 }, trackedSince: String? = "2026-09-01", date: String = today) =
        DailySummary.Snapshot(date, DailySummary.Activity(written, tasbeeh, wirds, 0), history.mapIndexed { i, t -> "2026-10-%02d".format(7 + i) to t }, trackedSince)

    @Test
    fun aDayWithNothingRecordedGetsAGentleMessageNeverAClaim() {
        val ar = DailySummary.compose(snapshot(), today, 0, "combined", "ar")
        assertTrue(ar.body.contains("لم يُسجَّل"))
        val en = DailySummary.compose(null, today, 0, "combined", "en")
        assertTrue(en.body.startsWith("No dhikr was recorded"))
        assertFalse(en.body.contains("You didn't"))
    }

    @Test
    fun aStaleSnapshotIsTreatedAsNothingRecordedToday() {
        val body = DailySummary.compose(snapshot(written = 40, date = "2026-10-13"), today, 0, "stats", "en").body
        assertEquals("No dhikr was recorded in DITHAR today.", body)
    }

    @Test
    fun theStatisticsAreTheRecordedOnesPlusQueuedFloatingTaps() {
        val body = DailySummary.compose(snapshot(written = 12, tasbeeh = 100, wirds = listOf("morning")), today, 33, "stats", "en").body
        assertTrue(body.contains("Morning Adhkar ✓"))
        assertTrue(body.contains("Tasbeeh 133"))
        assertTrue(body.contains("written adhkar 12 repetitions"))
        assertFalse(body.contains("Evening"))
    }

    @Test
    fun comparisonsOnlyWithEnoughHistory() {
        // A recorded yesterday: compared with it.
        val withYesterday = DailySummary.compose(snapshot(tasbeeh = 50, history = listOf(0, 0, 0, 0, 0, 0, 30)), today, 0, "stats", "en").body
        assertTrue(withYesterday.contains("More than yesterday (30)."))
        // No yesterday, too few tracked days: no comparison at all.
        val newUser = DailySummary.compose(snapshot(tasbeeh = 50, history = List(7) { 0 }, trackedSince = "2026-10-12"), today, 0, "stats", "en").body
        assertFalse(newUser.contains("yesterday", ignoreCase = true))
        assertFalse(newUser.contains("average"))
        // No yesterday, but a tracked week: the recent average.
        val week = DailySummary.compose(snapshot(tasbeeh = 50, history = listOf(40, 20, 0, 60, 0, 40, 0)), today, 0, "stats", "en").body
        assertTrue(week.contains("Your recent daily average: 22."))
    }

    @Test
    fun theContentModeChoosesStatisticsMotivationOrBoth() {
        val s = snapshot(tasbeeh = 10)
        val stats = DailySummary.compose(s, today, 0, "stats", "ar").body
        val motivational = DailySummary.compose(s, today, 0, "motivational", "ar").body
        val combined = DailySummary.compose(s, today, 0, "combined", "ar").body
        assertTrue(stats.contains("التسبيح 10"))
        assertFalse(stats.contains("بارك الله"))
        // Encouragement only: what was done is named (personalised), never counted.
        assertFalse(motivational.contains("التسبيح 10") || motivational.contains("10"))
        assertTrue(motivational.startsWith("سجّلتَ اليوم: التسبيح."))
        assertTrue(combined.contains("التسبيح 10") && combined.contains("بارك الله"))
    }

    @Test
    fun theSummaryIsArmedForTheNextLocalTime() {
        assertEquals(at(14, 21, 30), DailySummary.nextAt(at(14, 20), 21 * 60 + 30, zone))
        assertEquals(at(15, 21, 30), DailySummary.nextAt(at(14, 21, 30), 21 * 60 + 30, zone))
        assertNotNull(DailySummary.localDate(at(14, 1), zone))
        assertEquals("2026-10-14", DailySummary.localDate(at(14, 1), zone))
    }
}
