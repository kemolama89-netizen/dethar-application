package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

/** The weekly schedule's per-day start floor for the Misc dhikr, and Friday/occasion selection. */
class AudioAdhkarWeeklyAndOccasionTest {
    private val zone = TimeZone.getTimeZone("Asia/Kuwait")

    /** October 2026: the 11th is a Sunday, the 16th a Friday, the 17th a Saturday. */
    private fun at(day: Int, hour: Int, minute: Int = 0): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, day, hour, minute, 0)
    }.timeInMillis

    private fun days(sun: Int = -1, mon: Int = -1, tue: Int = -1, wed: Int = -1, thu: Int = -1, fri: Int = -1, sat: Int = -1) = listOf(sun, mon, tue, wed, thu, fri, sat)

    @Test
    fun weekdaysAreSundayFirst() {
        assertEquals(0, WeeklyStart.weekdayOf(at(11, 12), 0, zone))
        assertEquals(5, WeeklyStart.weekdayOf(at(16, 12), 0, zone))
        assertEquals(6, WeeklyStart.weekdayOf(at(16, 12), 1, zone))
    }

    @Test
    fun aDaysWeeklyStartIsAFloorNeverEarlier() {
        assertEquals(9 * 60, WeeklyStart.effective(9 * 60, days(sun = 7 * 60), 0)) // wake 07:00, window 09:00 → 09:00
        assertEquals(11 * 60, WeeklyStart.effective(9 * 60, days(fri = 11 * 60), 5)) // day off: 11:00
        assertEquals(9 * 60, WeeklyStart.effective(9 * 60, null, 5))
        assertEquals(9 * 60, WeeklyStart.effective(9 * 60, days(), 5))
    }

    @Test
    fun recurringDhikrDoesNotStartBeforeThatDaysStartTime() {
        val friday = days(fri = 11 * 60)
        // Friday 08:00: the window opens at 09:00, but Friday's start is 11:00.
        assertEquals(at(16, 11), MiscPlan.nextPlay(at(16, 8), 9 * 60, 21 * 60, 5, 0L, emptyList(), zone, friday))
        // Thursday is unrestricted: 09:00.
        assertEquals(at(15, 9), MiscPlan.nextPlay(at(15, 8), 9 * 60, 21 * 60, 5, 0L, emptyList(), zone, friday))
        assertFalse(MiscPlan.inWindow(at(16, 10), 9 * 60, 21 * 60, zone, friday))
        assertTrue(MiscPlan.inWindow(at(16, 11, 1), 9 * 60, 21 * 60, zone, friday))
    }

    @Test
    fun aDayWhoseStartIsAfterTheWindowGetsNoDhikrAndTheNextDayStillDoes() {
        val lateFriday = days(fri = 22 * 60)
        assertEquals(at(17, 9), MiscPlan.nextPlay(at(16, 8), 9 * 60, 21 * 60, 5, 0L, emptyList(), zone, lateFriday))
    }

    @Test
    fun aWindowAcrossMidnightBelongsToTheDayItStarts() {
        // 22:00 → 02:00; Saturday's start 23:00 applies to Saturday night's window only.
        val saturday = days(sat = 23 * 60)
        assertEquals(at(17, 23), MiscPlan.nextPlay(at(17, 21), 22 * 60, 2 * 60, 10, 0L, emptyList(), zone, saturday))
        // Sunday 01:00 is still inside Saturday night's window (from 23:00).
        assertTrue(MiscPlan.inWindow(at(18, 1), 22 * 60, 2 * 60, zone, saturday))
        // Sunday night opens at its own 22:00.
        assertEquals(at(18, 22), MiscPlan.nextPlay(at(18, 3), 22 * 60, 2 * 60, 10, 0L, emptyList(), zone, saturday))
    }

    @Test
    fun theIntervalAndAdhanPausesStillApplyOnRestrictedDays() {
        val friday = days(fri = 11 * 60)
        val dhuhr = Window(at(16, 11, 0), at(16, 11, 30))
        assertEquals(at(16, 11, 30), MiscPlan.nextPlay(at(16, 8), 9 * 60, 21 * 60, 5, 0L, listOf(dhuhr), zone, friday))
        assertEquals(at(16, 12, 5), MiscPlan.nextPlay(at(16, 12, 1), 9 * 60, 21 * 60, 5, at(16, 12), emptyList(), zone, friday))
    }

    @Test
    fun weekdaysFollowTheLocalCalendarAcrossDaylightSaving() {
        val berlin = TimeZone.getTimeZone("Europe/Berlin")
        // DST ends Sunday 2026-10-25 03:00 → 02:00. Sunday's start 10:00 is 10:00 local.
        val cal = Calendar.getInstance(berlin).apply { clear(); set(2026, Calendar.OCTOBER, 25, 6, 0, 0) }
        val expected = Calendar.getInstance(berlin).apply { clear(); set(2026, Calendar.OCTOBER, 25, 10, 0, 0) }.timeInMillis
        assertEquals(expected, MiscPlan.nextPlay(cal.timeInMillis, 9 * 60, 21 * 60, 5, 0L, emptyList(), berlin, days(sun = 10 * 60)))
    }

    @Test
    fun anOlderBuildsMissingOrMalformedWeeklyScheduleMeansNone() {
        assertNull(WeeklyStart.parse(null))
        assertNull(WeeklyStart.parse(listOf(1, 2, 3)))
        assertEquals(7, WeeklyStart.parse(days())!!.size)
    }

    // ---- Fridays and occasions ----------------------------------------------

    @Test
    fun fridayIsDecidedFromTheDevicesWeekdayAndWinsOverEveryOtherOccasion() {
        val arafahOnFriday = listOf(OccasionWindow(at(16, 0), at(17, 0), "arafah"))
        assertEquals(MiscOccasion.FRIDAY, MiscOccasion.keyAt(at(16, 10), true, arafahOnFriday, zone))
        assertEquals(MiscOccasion.FRIDAY, MiscOccasion.keyAt(at(16, 0, 0), true, emptyList(), zone))
        assertEquals(MiscOccasion.FRIDAY, MiscOccasion.keyAt(at(16, 23, 59), true, emptyList(), zone))
    }

    @Test
    fun hijriOccasionsComeFromTheirDayWindowsAndNormalDaysHaveNone() {
        val arafah = listOf(OccasionWindow(at(14, 0), at(15, 0), "arafah"))
        assertEquals("arafah", MiscOccasion.keyAt(at(14, 9), true, arafah, zone))
        assertNull(MiscOccasion.keyAt(at(15, 9), true, arafah, zone)) // the day after: normal rotation again
        assertNull(MiscOccasion.keyAt(at(13, 9), true, arafah, zone))
    }

    @Test
    fun switchedOffNoOccasionAppliesNotEvenFriday() {
        assertNull(MiscOccasion.keyAt(at(16, 10), false, emptyList(), zone))
    }

    @Test
    fun anOccasionCyclesItsOwnListWithoutTouchingTheNormalRotation() {
        assertEquals(0 to 1, MiscOccasion.pick(3, 0))
        assertEquals(2 to 0, MiscOccasion.pick(3, 2))
        assertEquals(1 to 2, MiscOccasion.pick(3, 7))
        assertEquals(0 to 0, MiscOccasion.pick(1, 5)) // Friday: Salawat every time
    }
}
