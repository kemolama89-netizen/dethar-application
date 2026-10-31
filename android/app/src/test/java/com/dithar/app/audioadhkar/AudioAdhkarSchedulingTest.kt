package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

/** Morning/Evening/Misc scheduling and the adhan pause — the pure logic (AudioAdhkarLogic.kt). */
class AudioAdhkarSchedulingTest {
    private val zone = TimeZone.getTimeZone("Asia/Riyadh")
    private val minute = 60_000L

    private fun at(day: Int, hour: Int, minute: Int): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, day, hour, minute, 0)
    }.timeInMillis

    /** An adhan at [hour]:[min] on [day] → its 30-minute window. */
    private fun adhan(day: Int, hour: Int, min: Int) = at(day, hour, min).let { Window(it, it + AdhanSuppression.PAUSE_MILLIS) }

    private fun misc(now: Long, start: Int, end: Int, interval: Int, windows: List<Window> = emptyList(), lastPlayed: Long = 0L) =
        MiscPlan.nextPlay(now, start, end, interval, lastPlayed, windows, zone)

    // ---- adhan windows ------------------------------------------------------

    @Test
    fun theWindowStartsAtTheAdhanAndLastsThirtyMinutes() {
        val w = listOf(adhan(10, 12, 0))
        assertFalse(AdhanSuppression.isSuppressed(at(10, 11, 59), w))
        assertTrue(AdhanSuppression.isSuppressed(at(10, 12, 0), w))
        assertTrue(AdhanSuppression.isSuppressed(at(10, 12, 29), w))
        assertFalse(AdhanSuppression.isSuppressed(at(10, 12, 30), w))
        assertEquals(at(10, 12, 30), AdhanSuppression.clearAt(at(10, 12, 10), w))
        assertEquals(at(10, 13, 0), AdhanSuppression.clearAt(at(10, 13, 0), w))
    }

    @Test
    fun overlappingWindowsActAsOne() {
        // Maghrib 18:00 and Isha 18:20: suppressed until 18:50, without a gap.
        val w = listOf(adhan(10, 18, 20), adhan(10, 18, 0))
        assertEquals(listOf(Window(at(10, 18, 0), at(10, 18, 50))), AdhanSuppression.normalize(w))
        assertEquals(at(10, 18, 50), AdhanSuppression.clearAt(at(10, 18, 5), w))
        assertTrue(AdhanSuppression.isSuppressed(at(10, 18, 31), w))
    }

    @Test
    fun aRunningSessionStopsAtTheNextAdhan() {
        val w = listOf(adhan(10, 12, 0), adhan(10, 15, 20))
        assertEquals(at(10, 12, 0), AdhanSuppression.nextStartAfter(at(10, 11, 50), w))
        assertEquals(at(10, 15, 20), AdhanSuppression.nextStartAfter(at(10, 12, 0), w))
        assertNull(AdhanSuppression.nextStartAfter(at(10, 16, 0), w))
    }

    // ---- Morning / Evening ---------------------------------------------------

    @Test
    fun aDailySessionStartsAtItsTimeWithAWarningAMinuteBefore() {
        val plan = DailyPlan.plan(at(10, 4, 0), 5, 0, 0L, 0L, emptyList(), zone)
        assertEquals(at(10, 5, 0), plan.occurrence)
        assertEquals(at(10, 5, 0), plan.playbackAt)
        assertEquals(at(10, 5, 0) - minute, plan.warningAt)
    }

    @Test
    fun aStartInsideAnAdhanWindowWaitsForItsEndNeverSkipped() {
        // Fajr adhan 04:50 → no adhkar until 05:20; Morning set for 05:00.
        val w = listOf(adhan(10, 4, 50))
        val plan = DailyPlan.plan(at(10, 4, 0), 5, 0, 0L, 0L, w, zone)
        assertEquals(at(10, 5, 0), plan.occurrence)
        assertEquals(at(10, 5, 20), plan.playbackAt)
        assertEquals(at(10, 5, 19), plan.warningAt)
    }

    @Test
    fun reopeningTheAppDuringTheDeferralKeepsTodaysSession() {
        val w = listOf(adhan(10, 4, 50))
        val plan = DailyPlan.plan(at(10, 5, 10), 5, 0, 0L, 0L, w, zone)
        assertEquals(at(10, 5, 0), plan.occurrence)
        assertEquals(at(10, 5, 20), plan.playbackAt)
    }

    @Test
    fun aFiredSessionNeverRunsTwiceTheNextOneIsTomorrow() {
        val w = listOf(adhan(10, 4, 50))
        val plan = DailyPlan.plan(at(10, 5, 10), 5, 0, at(10, 5, 0), 0L, w, zone)
        assertEquals(at(11, 5, 0), plan.occurrence)
        assertEquals(at(11, 5, 0), plan.playbackAt)
    }

    @Test
    fun aDeferredStartUsesTheEndOfOverlappingWindows() {
        val w = listOf(adhan(10, 18, 0), adhan(10, 18, 20))
        assertEquals(at(10, 18, 50), DailyPlan.plan(at(10, 17, 0), 18, 10, 0L, 0L, w, zone).playbackAt)
    }

    // ---- Misc ----------------------------------------------------------------

    @Test
    fun miscStartsAtItsWindowStartThenKeepsTheInterval() {
        // 9:00 AM – 9:00 PM every 5 minutes.
        assertEquals(at(10, 9, 0), misc(at(10, 8, 0), 9 * 60, 21 * 60, 5))
        // Inside the window and due: right away.
        assertEquals(at(10, 9, 2), misc(at(10, 9, 2), 9 * 60, 21 * 60, 5))
        // Never sooner than the interval after the last dhikr started.
        assertEquals(at(10, 9, 5), misc(at(10, 9, 2), 9 * 60, 21 * 60, 5, lastPlayed = at(10, 9, 0)))
        for (interval in MiscPlan.INTERVALS_MINUTES + listOf(7, 90)) {
            assertEquals(at(10, 9, 0) + interval * minute, misc(at(10, 9, 0), 9 * 60, 21 * 60, interval, lastPlayed = at(10, 9, 0)))
        }
    }

    @Test
    fun nothingPlaysOutsideTheWindow() {
        assertEquals(at(10, 20, 55), misc(at(10, 20, 50), 9 * 60, 21 * 60, 5, lastPlayed = at(10, 20, 50)))
        // Due at 21:00 — outside: tomorrow's start.
        assertEquals(at(11, 9, 0), misc(at(10, 20, 55), 9 * 60, 21 * 60, 5, lastPlayed = at(10, 20, 55)))
        assertEquals(at(11, 9, 0), misc(at(10, 23, 0), 9 * 60, 21 * 60, 5, lastPlayed = at(10, 20, 55)))
        var last = 0L
        var t = at(10, 8, 0)
        repeat(400) {
            t = misc(t, 9 * 60, 21 * 60, 5, lastPlayed = last)!!
            assertTrue(MiscPlan.inWindow(t, 9 * 60, 21 * 60, zone))
            last = t
        }
    }

    @Test
    fun aWindowCanCrossMidnight() {
        // 22:00 – 02:00 every 10 minutes.
        assertEquals(at(11, 0, 0), misc(at(10, 23, 50), 22 * 60, 2 * 60, 10, lastPlayed = at(10, 23, 50)))
        assertEquals(at(11, 22, 0), misc(at(11, 1, 50), 22 * 60, 2 * 60, 10, lastPlayed = at(11, 1, 55)))
        assertEquals(at(11, 22, 0), misc(at(11, 12, 0), 22 * 60, 2 * 60, 10))
        assertTrue(MiscPlan.inWindow(at(11, 1, 59), 22 * 60, 2 * 60, zone))
        assertFalse(MiscPlan.inWindow(at(11, 2, 0), 22 * 60, 2 * 60, zone))
    }

    @Test
    fun anEmptyWindowOrBadIntervalSchedulesNothing() {
        assertNull(misc(at(10, 8, 0), 9 * 60, 9 * 60, 5))
        assertNull(misc(at(10, 8, 0), 9 * 60, 21 * 60, 0))
        assertNull(misc(at(10, 8, 0), -1, 21 * 60, 5))
    }

    @Test
    fun miscResumesTheMomentTheAdhanPauseEndsWithOneDhikrNotABurst() {
        val dhuhr = listOf(adhan(10, 12, 0)) // pause 12:00–12:30
        // Last dhikr 11:57, every 5 min: 12:02 … 12:27 are inside the pause → the next is exactly 12:30.
        val resume = misc(at(10, 11, 58), 9 * 60, 21 * 60, 5, dhuhr, lastPlayed = at(10, 11, 57))
        assertEquals(at(10, 12, 30), resume)
        // That one played: the next keeps the interval — no make-up of the missed ones.
        assertEquals(at(10, 12, 35), misc(at(10, 12, 30), 9 * 60, 21 * 60, 5, dhuhr, lastPlayed = resume!!))
        // Hourly: last 11:00, adhan 11:50 hides 12:00 → resumes at 12:20, then 13:20.
        val hourly = listOf(adhan(10, 11, 50))
        assertEquals(at(10, 12, 20), misc(at(10, 11, 30), 9 * 60, 21 * 60, 60, hourly, lastPlayed = at(10, 11, 0)))
        assertEquals(at(10, 13, 20), misc(at(10, 12, 20), 9 * 60, 21 * 60, 60, hourly, lastPlayed = at(10, 12, 20)))
    }

    @Test
    fun overlappingPausesResumeOnlyWhenAllHaveEnded() {
        val w = listOf(adhan(10, 18, 0), adhan(10, 18, 20)) // 18:00–18:50 as one
        assertEquals(at(10, 18, 50), misc(at(10, 18, 5), 9 * 60, 21 * 60, 5, w, lastPlayed = at(10, 17, 58)))
    }

    @Test
    fun aMiscDhikrNeverPlaysTwiceForOneMomentAfterItStarted() {
        // Re-arming right after a dhikr started (clock not yet past it) waits the full interval.
        assertEquals(at(10, 9, 10), misc(at(10, 9, 5), 9 * 60, 21 * 60, 5, lastPlayed = at(10, 9, 5)))
    }

    @Test
    fun whenAnotherSessionEndsMiscIsReCheckedAndWaitsOnlyForTheFallbackMeanwhile() {
        val alarm = java.io.File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarAlarmReceiver.kt").readText()
        assertTrue(alarm.contains("AudioAdhkarScheduler.reschedule(context, section, now + Resume.MISC_BUSY_FALLBACK_MILLIS)"))
        val service = java.io.File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPlaybackService.kt").readText()
        val end = service.substringAfter("private fun endSession(").substringBefore("private fun releasePlayer()")
        assertTrue(end.contains("AudioAdhkarScheduler.reschedule(this, Section.MISC, if (dailyEnded) MiscDailyGuard.resumeAfter(now) else now)"))
        assertTrue(alarm.contains("prefs.lastPlayed = now"))
    }

    // ---- resume ---------------------------------------------------------------

    @Test
    fun anInterruptedSessionContinuesOnlyWithinThreeHoursOfItsStart() {
        assertTrue(Resume.stillWanted(at(10, 5, 0), at(10, 5, 30)))
        assertFalse(Resume.stillWanted(at(10, 5, 0), at(10, 8, 0)))
        assertFalse(Resume.stillWanted(0L, at(10, 5, 30)))
    }

    @Test
    fun alarmsArmedBeforeSectionsExistedBelongToEvening() {
        assertEquals(Section.EVENING, Section.of(null))
        assertEquals(Section.MORNING, Section.of("morning"))
        assertEquals(Section.MISC, Section.of("misc"))
        assertFalse(Section.MISC.isDaily)
    }

    // ---- Misc paused for prayer: the notice ------------------------------------

    private fun pause(now: Long, windows: List<Window>, lastAnnounced: Long = 0L, start: Int = 9 * 60, end: Int = 21 * 60, interval: Int = 5, lastPlayed: Long = 0L) =
        MiscPausePlan.nextPause(now, start, end, interval, windows, lastAnnounced, lastPlayed, zone)

    @Test
    fun aPauseIsAnnouncedWhenMiscWouldHavePlayedDuringIt() {
        val dhuhr = adhan(10, 12, 0)
        assertEquals(dhuhr, pause(at(10, 11, 0), listOf(dhuhr)))
    }

    @Test
    fun noNoticeForAnAdhanOutsideTheMiscWindowOrWithNoTickInside() {
        // Fajr 04:50 is outside 9:00–21:00.
        assertNull(pause(at(10, 3, 0), listOf(adhan(10, 4, 50))))
        // Hourly, last dhikr at 12:00: the next is due 13:00, after the 12:05–12:35 pause — nothing paused.
        assertNull(pause(at(10, 12, 1), listOf(adhan(10, 12, 5)), interval = 60, lastPlayed = at(10, 12, 0)))
    }

    @Test
    fun overlappingPausesAreOneNoticeEndingAtTheLatestEnd() {
        val maghrib = adhan(10, 18, 0)
        val isha = adhan(10, 18, 20)
        assertEquals(Window(at(10, 18, 0), at(10, 18, 50)), pause(at(10, 17, 0), listOf(maghrib, isha)))
    }

    @Test
    fun eachPauseIsAnnouncedOnceThenTheNextOne() {
        val w = listOf(adhan(10, 12, 0), adhan(10, 15, 20))
        assertEquals(at(10, 15, 20), pause(at(10, 11, 0), w, lastAnnounced = at(10, 12, 0))!!.start)
        assertNull(pause(at(10, 11, 0), w, lastAnnounced = at(10, 15, 20)))
    }

    @Test
    fun aPauseIsFoundInAWindowThatCrossesMidnight() {
        // Misc 22:00–02:00; an adhan at 00:30 (high latitude Isha) pauses it.
        assertEquals(at(11, 0, 30), pause(at(10, 23, 0), listOf(adhan(11, 0, 30)), start = 22 * 60, end = 2 * 60, interval = 10)!!.start)
    }

    @Test
    fun theNoticeShowsTheExactResumeTimeInThePhonesLocalTime() {
        val end = adhan(10, 12, 0).end // 12:30 Riyadh
        assertEquals("تم إيقاف الأذكار المتنوعة بسبب الصلاة، وسيتم استئنافها الساعة 12:30 بعد انتهاء فترة التوقف.", AudioAdhkarPauseReceiver.pausedText("ar", end, zone))
        assertEquals("Miscellaneous Adhkar paused for prayer. They will resume at 12:30, when the pause ends.", AudioAdhkarPauseReceiver.pausedText("en", end, zone))
        // Another phone zone shows its own local clock for the same instant.
        assertEquals("10:30", AudioAdhkarPauseReceiver.clock(end, TimeZone.getTimeZone("Europe/London")))
        assertEquals("تم استئناف الأذكار المتنوعة", AudioAdhkarPauseReceiver.resumedText("ar"))
    }

    @Test
    fun thePauseNoticeIsGuardedAgainstDuplicatesAndOnlyShownWhileMiscIsOn() {
        val receiver = java.io.File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPauseReceiver.kt").readText()
        assertTrue(receiver.contains("!prefs.enabled || prefs.playlist.isEmpty() ->"))
        assertTrue(receiver.contains("start <= prefs.lastPauseAnnounced ->"))
        assertTrue(receiver.contains("prefs.lastPauseAnnounced = start"))
        assertTrue(receiver.contains("const val NOTIFICATION_ID = 7327")) // one id: replaces, never stacks
        val alarm = java.io.File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarAlarmReceiver.kt").readText()
        assertTrue(alarm.contains("AudioAdhkarPauseReceiver.postResumed(context, store, now)"))
    }
}
