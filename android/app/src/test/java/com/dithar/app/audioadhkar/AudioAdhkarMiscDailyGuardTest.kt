package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.util.Calendar
import java.util.TimeZone

/**
 * Miscellaneous adhkar make way for Morning/Evening (MiscDailyGuard): no
 * Misc dhikr starts from 1 minute before a daily session's start or resume,
 * none while it plays, and Misc resumes 1 minute after it ends — with the
 * next dhikr of its cycle only, never the missed ones in a burst.
 * Evening at 17:15, Misc 09:00–21:00 every 5 minutes, Riyadh time.
 */
class AudioAdhkarMiscDailyGuardTest {
    private val zone = TimeZone.getTimeZone("Asia/Riyadh")
    private val second = 1_000L

    private fun at(hour: Int, minute: Int, sec: Int = 0): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, 10, hour, minute, sec)
    }.timeInMillis

    private val evening = at(17, 15)

    /** Misc's next play as the scheduler plans it: adhan windows plus the daily blocks. */
    private fun misc(after: Long, lastPlayed: Long, dailyStarts: List<Long> = listOf(evening), adhan: List<Window> = emptyList()) =
        MiscPlan.nextPlay(after, 9 * 60, 21 * 60, 5, lastPlayed, adhan + MiscDailyGuard.blocks(dailyStarts), zone)

    private fun source(name: String) = File("src/main/java/com/dithar/app/audioadhkar/$name").readText()

    // ---- 1 minute before ------------------------------------------------------

    @Test
    fun miscStopsOneMinuteBeforeTheSession() {
        // Last dhikr 17:09 → due 17:14, inside the minute before 17:15 → not played there.
        val next = misc(at(17, 9, 30), lastPlayed = at(17, 9))!!
        assertFalse(next in (evening - MiscDailyGuard.BEFORE_MILLIS) until evening)
        assertEquals(evening + MiscDailyGuard.AFTER_MILLIS, next) // 17:16: the session plays by then → Misc waits for its end
        // A tick due just before that minute still plays (17:13:59).
        assertEquals(at(17, 13, 59), misc(at(17, 9), lastPlayed = at(17, 8, 59)))
    }

    @Test
    fun noMiscStartsAnywhereInTheMinuteBeforeAStart() {
        for (s in 0 until 10 * 60 step 7) {
            val last = at(17, 5) + s * second
            val next = misc(last, lastPlayed = last)!!
            assertFalse("last=$s s", next >= evening - MiscDailyGuard.BEFORE_MILLIS && next < evening + MiscDailyGuard.AFTER_MILLIS)
        }
    }

    // ---- throughout the session ---------------------------------------------------

    @Test
    fun miscWaitsThroughoutTheSession() {
        // Any Misc alarm while the session plays finds it busy and waits — re-checked when it ends.
        val alarm = source("AudioAdhkarAlarmReceiver.kt")
        assertTrue(alarm.contains("section == Section.MISC && busy ->"))
        assertTrue(alarm.contains("AudioAdhkarScheduler.reschedule(context, section, now + Resume.MISC_BUSY_FALLBACK_MILLIS)"))
        // A paused session is still a session.
        assertTrue(source("AudioAdhkarPlaybackService.kt").contains("val blocksScheduled: Boolean get() = isSessionActive && !isManualSession"))
    }

    // ---- 1 minute after ------------------------------------------------------------

    @Test
    fun miscResumesOneMinuteAfterTheSessionActuallyFinishes() {
        // The session ran 17:15 → 17:42:20; Misc last played 17:09.
        val ended = at(17, 42, 20)
        assertEquals(at(17, 43, 20), MiscDailyGuard.resumeAfter(ended))
        assertEquals(at(17, 43, 20), misc(MiscDailyGuard.resumeAfter(ended), lastPlayed = at(17, 9)))
    }

    @Test
    fun aShortSessionStillKeepsMiscsOwnInterval() {
        // Ended 17:16:10, last Misc 17:13 → one minute later is 17:17:10, but the interval says 17:18.
        assertEquals(at(17, 18), misc(MiscDailyGuard.resumeAfter(at(17, 16, 10)), lastPlayed = at(17, 13), dailyStarts = emptyList()))
    }

    @Test
    fun onlyAMorningOrEveningEndingDelaysMisc() {
        val service = source("AudioAdhkarPlaybackService.kt")
        assertTrue(service.contains("val dailyEnded = cursor != null && sessionSection.isDaily && !manualSession && !adhanSession"))
        assertTrue(service.contains("AudioAdhkarScheduler.reschedule(this, Section.MISC, if (dailyEnded) MiscDailyGuard.resumeAfter(now) else now)"))
    }

    // ---- missed items --------------------------------------------------------------

    @Test
    fun missedTicksAreNotReplayedOnlyTheNextDhikrPlays() {
        // 17:14 … 17:39 were missed during the session: after it, ONE dhikr at 17:43:20, then the interval from it.
        val resumed = misc(MiscDailyGuard.resumeAfter(at(17, 42, 20)), lastPlayed = at(17, 9))!!
        assertEquals(at(17, 48, 20), misc(resumed, lastPlayed = resumed, dailyStarts = emptyList()))
        // The cycle position only moves when a Misc dhikr really starts — a waiting tick doesn't skip one.
        val service = source("AudioAdhkarPlaybackService.kt")
        assertEquals(1, Regex("""prefs\.nextIndex = """).findAll(service).count())
        val busyBranch = source("AudioAdhkarAlarmReceiver.kt").substringAfter("section == Section.MISC && busy ->").substringBefore("section == Section.MISC && AdhanSuppression")
        assertFalse(busyBranch.contains("lastPlayed"))
        assertFalse(busyBranch.contains("nextIndex"))
    }

    // ---- resumes, interruptions, adhan --------------------------------------------

    @Test
    fun aSessionResumingAfterTheAdhanPauseGetsTheSameMinuteBefore() {
        // Maghrib 17:20 interrupts Evening; it resumes at 17:50 (the pause's end). Misc's own next
        // play would also be 17:50 — now it is held back past the resume, so the two never collide.
        val maghrib = at(17, 20).let { Window(it, it + AdhanSuppression.PAUSE_MILLIS) }
        val resumeAt = maghrib.end
        val next = misc(at(17, 20), lastPlayed = at(17, 12), dailyStarts = listOf(resumeAt), adhan = listOf(maghrib))!!
        assertEquals(resumeAt + MiscDailyGuard.AFTER_MILLIS, next)
    }

    @Test
    fun resumeTimesAreRememberedAndMiscIsReArmedAroundThem() {
        val scheduler = source("AudioAdhkarScheduler.kt")
        val armResume = scheduler.substringAfter("fun armResume(").substringBefore("\n    }")
        assertTrue(armResume.contains("prefs.resumeAt = atMillis"))
        assertTrue(armResume.contains("reschedule(context, Section.MISC)"))
        // Misc's plan includes every enabled daily section's next start (after any adhan deferral) and pending resume.
        assertTrue(scheduler.contains("windows + MiscDailyGuard.blocks(dailyStarts(store, windows))"))
        assertTrue(scheduler.contains("prefs.scheduledOccurrence.takeIf { it > 0 }?.let { AdhanSuppression.clearAt(it, windows) }"))
        assertTrue(scheduler.contains("prefs.resumeAt.takeIf { it > 0 && prefs.resumeOccurrence > 0 }"))
        // A cleared or cancelled resume no longer holds Misc back.
        assertTrue(scheduler.substringAfter("fun clearResume(").substringBefore("\n    }").contains("resumeAt = 0L"))
        assertTrue(scheduler.substringAfter("fun cancel(").substringBefore("\n    }").contains("prefs.resumeAt = 0L"))
    }

    @Test
    fun aDisabledOrAbsentSessionHoldsNothingBack() {
        assertEquals(emptyList<Window>(), MiscDailyGuard.blocks(listOf(0L, -1L)))
        // Without a daily start, 17:14 plays as usual.
        assertEquals(at(17, 14), misc(at(17, 9, 30), lastPlayed = at(17, 9), dailyStarts = emptyList()))
    }
}
