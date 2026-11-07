package com.dithar.app.journey

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

class JourneyPlanTest {
    private val zone = TimeZone.getTimeZone("Asia/Kuwait")

    private fun at(y: Int, m: Int, d: Int, h: Int, min: Int): Long = Calendar.getInstance(zone).apply {
        clear()
        set(y, m - 1, d, h, min, 0)
    }.timeInMillis

    @Test
    fun firesTodayAtTheTimeWhenItIsStillAhead() {
        assertEquals(at(2026, 3, 10, 8, 0), JourneyPlan.nextFire(at(2026, 3, 10, 7, 0), 8 * 60, "2026-03-10", null, zone))
    }

    @Test
    fun aPassedTimeWaitsForTomorrowNeverLate() {
        assertEquals(at(2026, 3, 11, 8, 0), JourneyPlan.nextFire(at(2026, 3, 10, 9, 0), 8 * 60, "2026-03-10", null, zone))
    }

    @Test
    fun aDayAlreadyPostedIsSkipped() {
        assertEquals(at(2026, 3, 11, 20, 0), JourneyPlan.nextFire(at(2026, 3, 10, 7, 0), 20 * 60, "2026-03-10", "2026-03-10", zone))
    }

    @Test
    fun tomorrowsNoticeWaitsForTomorrow() {
        // Today's page was read: the notice applies from tomorrow, so nothing comes today.
        assertEquals(at(2026, 3, 11, 21, 0), JourneyPlan.nextFire(at(2026, 3, 10, 7, 0), 21 * 60, "2026-03-11", null, zone))
    }

    @Test
    fun missedDaysKeepFiringTheSameNoticeDaily() {
        // A notice from three days ago, never read: it still fires today.
        assertEquals(at(2026, 3, 13, 8, 0), JourneyPlan.nextFire(at(2026, 3, 13, 6, 0), 8 * 60, "2026-03-10", "2026-03-12", zone))
        assertTrue(JourneyPlan.shouldPost(at(2026, 3, 13, 8, 0), 8 * 60, "2026-03-10", "2026-03-12", zone))
    }

    @Test
    fun postsOncePerDayOnlyFromItsDateAndTime() {
        assertTrue(JourneyPlan.shouldPost(at(2026, 3, 10, 8, 2), 8 * 60, "2026-03-10", null, zone))
        assertFalse(JourneyPlan.shouldPost(at(2026, 3, 10, 8, 2), 8 * 60, "2026-03-10", "2026-03-10", zone))
        assertFalse(JourneyPlan.shouldPost(at(2026, 3, 10, 7, 59), 8 * 60, "2026-03-10", null, zone))
        assertFalse(JourneyPlan.shouldPost(at(2026, 3, 10, 9, 0), 8 * 60, "2026-03-11", null, zone))
    }

    @Test
    fun crossesTheYearEnd() {
        assertEquals(at(2027, 1, 1, 8, 0), JourneyPlan.nextFire(at(2026, 12, 31, 9, 0), 8 * 60, "2026-12-31", null, zone))
    }

    @Test
    fun aTapCarriesExactlyItsAssignment() {
        val notice = JourneyNotice("2026-03-10", 12, 2, "2:77", "t", "b")
        val extras = JourneyOpen.of(notice).toExtras()
        assertEquals(JourneyOpen(12, 2, "2:77", "2026-03-10"), JourneyOpen.fromExtras { extras[it] })
    }

    @Test
    fun otherIntentsAreNotJourneyTaps() {
        assertNull(JourneyOpen.fromExtras { null })
        val bad = mapOf(JourneyOpen.EXTRA_PAGE to "605", JourneyOpen.EXTRA_ROUND to "1", JourneyOpen.EXTRA_INSIGHT to "2:77")
        assertNull(JourneyOpen.fromExtras { bad[it] })
        val badInsight = mapOf(JourneyOpen.EXTRA_PAGE to "1", JourneyOpen.EXTRA_ROUND to "1", JourneyOpen.EXTRA_INSIGHT to "x")
        assertNull(JourneyOpen.fromExtras { badInsight[it] })
    }
}
