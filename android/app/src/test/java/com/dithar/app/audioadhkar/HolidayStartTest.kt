package com.dithar.app.audioadhkar

import com.dithar.app.prayernotifications.PrayerNotification
import com.dithar.app.prayernotifications.PrayerNotificationPlan
import com.dithar.app.reminders.ReminderPlan
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

/**
 * The weekly holiday start (lib/weeklySchedule.ts) as native applies it:
 * JS merges it into the recurring per-day floor (dayStarts) for Misc and
 * reminders/widget, plans Morning/Evening slots no earlier (marking them
 * with notBefore for the heads-up), and leaves prayer notifications before
 * it out. Everything is planned from what is stored, so a reboot re-arms
 * the same plan without the app being opened.
 */
class HolidayStartTest {
    private val zone = TimeZone.getTimeZone("Asia/Kuwait")
    private val minute = 60_000L

    /** October 2026: the 15th is a Thursday, the 16th a Friday, the 17th a Saturday. */
    private fun at(day: Int, hour: Int, min: Int = 0): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, day, hour, min, 0)
    }.timeInMillis

    /** Friday and Saturday holidays from [minutes]. */
    private fun holidays(minutes: Int) = listOf(-1, -1, -1, -1, -1, minutes, minutes)

    // ---- Misc audio: 09:00–21:00 every 10 minutes ----

    private fun misc(after: Long, dayStarts: List<Int>?, lastPlayed: Long = 0L, windows: List<Window> = emptyList()) =
        MiscPlan.nextPlay(after, 9 * 60, 21 * 60, 10, lastPlayed, windows, zone, dayStarts)

    @Test
    fun miscStartsAtTheHolidayStartOnHolidaysOnly() {
        assertEquals(at(16, 12), misc(at(16, 0), holidays(12 * 60)))
        assertEquals(at(17, 12), misc(at(17, 0), holidays(12 * 60)))
        assertEquals(at(15, 9), misc(at(15, 0), holidays(12 * 60)))  // Thursday: unchanged
        assertEquals(at(15, 9), misc(at(15, 0), null))               // no holiday start at all: as before
    }

    @Test
    fun aChangedHolidayTimeAppliesAtOnce() {
        assertEquals(at(16, 11), misc(at(16, 0), holidays(11 * 60)))
        assertEquals(at(16, 10, 30), misc(at(16, 0), holidays(10 * 60 + 30)))
    }

    @Test
    fun miscKeepsItsOriginalEndTimeAndInterval() {
        val floor = holidays(12 * 60)
        assertEquals(at(16, 20, 50), misc(at(16, 20, 45), floor, lastPlayed = at(16, 20, 40)))
        assertEquals(at(17, 12), misc(at(16, 20, 55), floor, lastPlayed = at(16, 20, 50))) // 21:00 is still the end; next is Saturday's holiday start
        assertEquals(at(16, 12, 10), misc(at(16, 12, 1), floor, lastPlayed = at(16, 12)))   // the usual interval from there
    }

    @Test
    fun aHolidayStartAfterMiscsEndLeavesThatDayWithoutMisc() {
        assertEquals(at(18, 9), misc(at(16, 0), holidays(22 * 60)))  // Fri + Sat skipped, Sunday 09:00
    }

    @Test
    fun theThirtyMinutePrayerPauseStillApplies() {
        val dhuhr = listOf(Window(at(16, 11, 35), at(16, 12, 5)))
        assertEquals(at(16, 12, 5), misc(at(16, 0), holidays(12 * 60), windows = dhuhr))
    }

    @Test
    fun aPrayerPauseOverlappingTheHolidayStartIsAnnouncedAtTheHolidayStartNotBefore() {
        val dhuhr = Window(at(16, 11, 35), at(16, 12, 5))
        val pause = MiscPausePlan.nextPause(at(16, 0), 9 * 60, 21 * 60, 10, listOf(dhuhr), 0L, 0L, zone, holidays(12 * 60))
        assertEquals(dhuhr, pause)
        assertEquals(at(16, 12), MiscPausePlan.noticeAt(dhuhr, holidays(12 * 60), zone))
        // Starting before an 11:00 holiday start's Dhuhr: at the pause's start, as on every other day.
        assertEquals(dhuhr.start, MiscPausePlan.noticeAt(dhuhr, holidays(11 * 60), zone))
        assertEquals(dhuhr.start, MiscPausePlan.noticeAt(dhuhr, null, zone))
        // A pause wholly before the holiday start isn't announced at all (Misc wouldn't have played in it).
        val early = Window(at(16, 9, 0), at(16, 9, 30))
        assertNull(MiscPausePlan.nextPause(at(16, 0), 9 * 60, 21 * 60, 10, listOf(early), 0L, 0L, zone, holidays(12 * 60)))
        // Thursday (no holiday): unchanged.
        val thursday = Window(at(15, 11, 35), at(15, 12, 5))
        assertEquals(thursday.start, MiscPausePlan.noticeAt(thursday, holidays(12 * 60), zone))
    }

    @Test
    fun miscMakesWayForAMorningSessionAtTheSameHolidayStart() {
        // Morning planned at the holiday start too: Misc never starts on top of it.
        val blocked = MiscDailyGuard.blocks(listOf(at(16, 10)))
        assertEquals(at(16, 10, 1), misc(at(16, 0), holidays(10 * 60), windows = blocked))
    }

    // ---- Reminders / widget: 08:00–22:00 every 60 minutes ----

    @Test
    fun reminderAndWidgetFirstFireAtTheHolidayStartThenKeepTheirInterval() {
        val floor = holidays(12 * 60)
        assertEquals(at(16, 12), ReminderPlan.nextFire(at(16, 6), 8 * 60, 22 * 60, 60, at(15, 21), emptyList(), floor, zone))
        assertEquals(at(16, 13), ReminderPlan.nextFire(at(16, 12, 1), 8 * 60, 22 * 60, 60, at(16, 12), emptyList(), floor, zone))
        assertEquals(at(15, 8), ReminderPlan.nextFire(at(15, 6), 8 * 60, 22 * 60, 60, at(14, 21), emptyList(), floor, zone))
    }

    // ---- Morning/Evening slots: the heads-up never comes before the holiday start ----

    private val holidaySlot = DailySlot(windowStart = at(16, 4, 50), start = at(16, 9), windowEnd = at(16, 11, 5), notBefore = at(16, 9))

    @Test
    fun aHolidaySessionAtTheHolidayStartHasNoEarlierHeadsUp() {
        val plan = DailyPlan.planSlots(at(16, 0), listOf(holidaySlot), 0L, 0L, emptyList())!!
        assertEquals(at(16, 9), plan.playbackAt)
        assertNull(plan.warningAt)
    }

    @Test
    fun aHolidaySessionLaterThanTheHolidayStartKeepsItsHeadsUp() {
        val later = holidaySlot.copy(start = at(16, 10))
        assertEquals(at(16, 10) - AudioAdhkarSchedule.WARNING_LEAD_MILLIS, DailyPlan.planSlots(at(16, 0), listOf(later), 0L, 0L, emptyList())!!.warningAt)
    }

    @Test
    fun ordinaryDaysAndOlderSlotsKeepTheirHeadsUp() {
        val thursday = DailySlot(at(15, 4, 50), at(15, 6), at(15, 11, 5))
        assertEquals(at(15, 6) - AudioAdhkarSchedule.WARNING_LEAD_MILLIS, DailyPlan.planSlots(at(15, 0), listOf(thursday), 0L, 0L, emptyList())!!.warningAt)
    }

    @Test
    fun aSlotWithoutTheFourthValueParsesAsBefore() {
        // What an older app build pushed / stored: [windowStart, start, windowEnd].
        val old = JSONArray("[[1,2,3]]").getJSONArray(0)
        val new = JSONArray("[[1,2,3,4]]").getJSONArray(0)
        assertEquals(DailySlot(1, 2, 3), DailySlot(old.getLong(0), old.getLong(1), old.getLong(2), old.optLong(3, 0L)))
        assertEquals(4L, DailySlot(new.getLong(0), new.getLong(1), new.getLong(2), new.optLong(3, 0L)).notBefore)
    }

    // ---- After a reboot: the stored plan is re-armed, nothing replayed ----

    @Test
    fun afterARebootOnAHolidayMorningEverythingIsReArmedFromStoredSettings() {
        val boot = at(16, 7, 30)
        // Misc and reminders: the holiday start, not the moment of boot.
        assertEquals(at(16, 12), misc(boot, holidays(12 * 60), lastPlayed = at(15, 20, 50)))
        assertEquals(at(16, 12), ReminderPlan.nextFire(boot, 8 * 60, 22 * 60, 60, at(15, 21), emptyList(), holidays(12 * 60), zone))
        // Morning: today's planned holiday session, armed once.
        assertEquals(at(16, 9), DailyPlan.planSlots(boot, listOf(holidaySlot), at(15, 6), at(15, 6), emptyList())!!.playbackAt)
        // A session that already played today isn't played again after the reboot.
        assertNull(DailyPlan.planSlots(at(16, 9, 30), listOf(holidaySlot), at(16, 9), at(16, 9), emptyList()))
    }

    @Test
    fun afterARebootThePrayerAlarmIsForTheFirstEligiblePrayer() {
        // JS stored only the holiday's prayers at or after 12:00 (Fajr and Dhuhr left out).
        val stored = listOf(
            PrayerNotification("isha", at(15, 18, 30), "", ""),
            PrayerNotification("asr", at(16, 14, 55), "", ""),
            PrayerNotification("maghrib", at(16, 17, 15), "", ""),
        )
        val next = PrayerNotificationPlan.next(stored, at(16, 3, 0), lastPosted = at(15, 18, 30))
        assertNotNull(next)
        assertEquals("asr", next!!.prayer)
        // A late firing never posts a burst of what was skipped.
        assertEquals("asr", PrayerNotificationPlan.fire(stored, at(16, 14, 56), at(15, 18, 30)).post?.prayer)
    }
}
