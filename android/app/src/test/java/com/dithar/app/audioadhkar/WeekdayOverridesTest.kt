package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

/**
 * Weekday-specific times: Misc's own start/end on chosen weekdays
 * (MiscDayTimes), and Morning/Evening slots planned at a weekday's exact
 * time (JS exactDaySlot) — each day plays once, also after a restart or a
 * change of that day's time.
 */
class WeekdayOverridesTest {
    private val zone = TimeZone.getTimeZone("Asia/Kuwait")
    private val minute = 60_000L

    /** October 2026: the 16th is a Friday, the 17th a Saturday, the 18th a Sunday. */
    private fun at(day: Int, hour: Int, min: Int = 0): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, day, hour, min, 0)
    }.timeInMillis

    private fun week(sat: Int = -1, sun: Int = -1) = listOf(sun, -1, -1, -1, -1, -1, sat)

    // Usual Misc window 09:00–21:00 every 60 min; Saturday 12:00–22:00.
    private val saturday = MiscDayTimes(starts = week(sat = 12 * 60), ends = week(sat = 22 * 60))

    private fun next(after: Long, dayTimes: MiscDayTimes? = saturday, dayStarts: List<Int>? = null, lastPlayed: Long = 0L) =
        MiscPlan.nextPlay(after, 9 * 60, 21 * 60, 60, lastPlayed, emptyList(), zone, dayStarts, dayTimes)

    @Test
    fun miscStartsAtItsSaturdayTimeOnSaturdaysOnly() {
        assertEquals(at(16, 9), next(at(16, 0)))   // Friday: the usual 09:00
        assertEquals(at(17, 12), next(at(17, 0)))  // Saturday: 12:00
        assertEquals(at(18, 9), next(at(17, 23)))  // Sunday: back to 09:00
    }

    @Test
    fun miscEndsAtItsSaturdayEnd() {
        assertTrue(MiscPlan.inWindow(at(17, 21, 30), 9 * 60, 21 * 60, zone, null, saturday))  // Saturday runs to 22:00
        assertFalse(MiscPlan.inWindow(at(16, 21, 30), 9 * 60, 21 * 60, zone, null, saturday)) // Friday ends at 21:00
        assertFalse(MiscPlan.inWindow(at(17, 10), 9 * 60, 21 * 60, zone, null, saturday))    // nothing before Saturday's 12:00
    }

    @Test
    fun aDayCanOverrideOnlyItsStartOrOnlyItsEnd() {
        val onlyEnd = MiscDayTimes(starts = week(), ends = week(sat = 23 * 60))
        assertEquals(at(17, 9), next(at(17, 0), onlyEnd))
        assertTrue(MiscPlan.inWindow(at(17, 22, 30), 9 * 60, 21 * 60, zone, null, onlyEnd))
    }

    @Test
    fun aSaturdayWindowMayCrossMidnightIntoSunday() {
        val late = MiscDayTimes(starts = week(sat = 20 * 60), ends = week(sat = 2 * 60))
        assertTrue(MiscPlan.inWindow(at(18, 1, 30), 9 * 60, 21 * 60, zone, null, late))  // Sunday 01:30 belongs to Saturday's window
        assertFalse(MiscPlan.inWindow(at(18, 2, 30), 9 * 60, 21 * 60, zone, null, late))
        assertEquals(at(18, 9), next(at(18, 2, 30), late))                                 // then Sunday's usual 09:00
    }

    @Test
    fun theWeeklyEarliestStartStillAppliesOnTop() {
        val floor = week(sat = 13 * 60) // the weekly schedule: nothing recurring before 13:00 on Saturday
        assertEquals(at(17, 13), next(at(17, 0), dayStarts = floor))
    }

    @Test
    fun theIntervalCarriesOnAndNothingRepeats() {
        // Played at Saturday 12:00 → the next tick is 13:00, never a second one at 12:00.
        assertEquals(at(17, 13), next(at(17, 12, 1), lastPlayed = at(17, 12)))
    }

    @Test
    fun noDayTimesMeansTheUsualWindowEveryDay() {
        assertEquals(at(17, 9), next(at(17, 0), dayTimes = null))
        assertNull(MiscDayTimes.parse(List(7) { -1 }, List(7) { -1 }))
        assertNull(MiscDayTimes.parse(listOf(1, 2), List(7) { -1 })) // malformed (older build) → none
        assertNotNull(MiscDayTimes.parse(week(sat = 600), List(7) { -1 }))
    }

    // ---- Morning: a Saturday at exactly 12:00, the other days at 09:00 -------------------------

    /** A day's slot as JS plans it: the usual window 05:00–11:00; Saturday's own 12:00 widens it (exactDaySlot). */
    private val slots = listOf(
        DailySlot(at(16, 5), at(16, 9), at(16, 11)),
        DailySlot(at(17, 5), at(17, 12), at(17, 12, 50)),
        DailySlot(at(18, 5), at(18, 9), at(18, 11)),
    )

    @Test
    fun saturdaysMorningStartsAtNoonAndTheOtherDaysAtNine() {
        assertEquals(at(16, 9), DailyPlan.planSlots(at(16, 6), slots, 0L, 0L, emptyList())?.playbackAt)
        assertEquals(at(17, 12), DailyPlan.planSlots(at(16, 9, 1), slots, at(16, 9), 0L, emptyList())?.playbackAt)
        assertEquals(at(18, 9), DailyPlan.planSlots(at(17, 12, 1), slots, at(17, 12), 0L, emptyList())?.playbackAt)
    }

    @Test
    fun aRestartRearmsTheSameSessionOnceAndAFiredDayNeverPlaysAgain() {
        // Rebooted on Saturday at 10:00: Saturday's 12:00 is armed (not missed) …
        assertEquals(at(17, 12), DailyPlan.planSlots(at(17, 10), slots, at(16, 9), 0L, emptyList())?.occurrence)
        // … and once it played, another reboot that day arms Sunday, not Saturday again.
        assertEquals(at(18, 9), DailyPlan.planSlots(at(17, 12, 30), slots, at(17, 12), 0L, emptyList())?.occurrence)
    }

    @Test
    fun movingTodaysTimeAfterItPlayedDoesNotPlayItTwice() {
        // Saturday's usual 09:00 already played; the user then sets Saturday to 12:00.
        val moved = listOf(DailySlot(at(17, 5), at(17, 12), at(17, 12, 50)), slots[2])
        assertEquals(at(18, 9), DailyPlan.planSlots(at(17, 10), moved, at(17, 9), 0L, emptyList())?.occurrence)
    }

    @Test
    fun anAdhanPauseStillDefersAWeekdayTime() {
        val pause = listOf(Window(at(17, 11, 50), at(17, 12, 20)))
        assertEquals(at(17, 12, 20), DailyPlan.planSlots(at(17, 10), slots, at(16, 9), 0L, pause)?.playbackAt)
    }
}
