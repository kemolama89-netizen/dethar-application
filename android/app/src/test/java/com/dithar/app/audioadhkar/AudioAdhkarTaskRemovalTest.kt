package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.util.TimeZone

/**
 * The real HONOR ALT-NX1 (Android 15) trace, 2026-10-11, Misc every minute:
 *
 *   21:31:33.233 misc playback alarm → playing (lastPlayed = this moment)
 *   21:31:33.792 file 1/1 prepared, playing: tasbeeh_01.mp3 (1724ms)
 *   21:31:35.866 activity onDestroy finishing=true
 *   21:31:36.087 task removed (app swiped from recents)
 *   21:31:36.097 playback completed tasbeeh-1 token=1 → FINISHED
 *   21:31:36.122 session ends … final=finished
 *   21:31:36.251 misc: armed tick=1791743553233 exact=true   (21:32:33.233)
 *   21:33:14.713 activity onCreate                            ← app reopened
 *   21:33:14.849 misc playback alarm … 41s late
 *
 * The swipe didn't end playback: the one-dhikr Misc session finished by
 * itself and the next tick was armed correctly. The phone's background
 * manager then held that (setExactAndAllowWhileIdle) alarm until DITHAR
 * was reopened. These tests pin each step, and that a playback start is
 * now armed as an alarm clock.
 */
class AudioAdhkarTaskRemovalTest {
    private val zone = TimeZone.getTimeZone("Asia/Riyadh") // +03:00, as in the trace
    private val alarmFiredAt = 1_791_743_493_233L // 21:31:33.233
    private val sessionEndedAt = 1_791_743_496_251L // 21:31:36.251
    private val armedTick = 1_791_743_553_233L // 21:32:33.233

    private val javaRoot = File("src/main/java")
    private fun audio(name: String) = File(javaRoot, "com/dithar/app/audioadhkar/$name").readText()

    private fun tasbeeh1() = PlaylistItem("tasbeeh-1", "", "", Recitation(listOf("public/audio/adhkar/various/tasbeeh_01.mp3")), 1)

    @Test
    fun theOneDhikrMiscSessionFinishesByItselfAfterTheSwipe() {
        // A Misc tick plays one dhikr once: its first completion is the session's end, not an interruption.
        val cursor = PlaybackCursor(listOf(tasbeeh1()))
        cursor.advance()
        val token = cursor.beginPlayback()
        // (task removed here — the service only records it)
        assertEquals(PlaybackCursor.Step.FINISHED, cursor.complete(token))
        assertTrue(cursor.finished)
        // A late duplicate completion can't count again.
        assertEquals(PlaybackCursor.Step.IGNORED, cursor.complete(token))
    }

    @Test
    fun theNextTickIsArmedOneIntervalAfterThePreviousPlay() {
        // 09:00–23:00 (the end isn't in the trace; any end after 21:32:33 gives the same tick), every minute.
        val tick = MiscPlan.nextPlay(sessionEndedAt, 9 * 60, 23 * 60, 1, alarmFiredAt, emptyList(), zone)
        assertEquals(armedTick, tick)
    }

    @Test
    fun aTickThatStartsPlaybackIsAnAlarmClockSoTheManufacturerDoesNotHoldIt() {
        assertEquals(AlarmPolicy.Mode.ALARM_CLOCK, AlarmPolicy.mode(startsPlayback = true, exactAllowed = true))
        // Notices (the warning, the prayer-pause note) stay exact; without the permission, everything is inexact.
        assertEquals(AlarmPolicy.Mode.EXACT, AlarmPolicy.mode(startsPlayback = false, exactAllowed = true))
        assertEquals(AlarmPolicy.Mode.INEXACT, AlarmPolicy.mode(startsPlayback = true, exactAllowed = false))
        assertEquals(AlarmPolicy.Mode.INEXACT, AlarmPolicy.mode(startsPlayback = false, exactAllowed = false))
    }

    @Test
    fun theSchedulerArmsEveryPlaybackStartAsAnAlarmClock() {
        val scheduler = audio("AudioAdhkarScheduler.kt")
        val setAlarm = scheduler.substringAfter("private fun setAlarm(").substringBefore("\n    }")
        assertTrue(setAlarm.contains("AlarmPolicy.Mode.ALARM_CLOCK -> alarmManager.setAlarmClock("))
        // Only setAlarm talks to AlarmManager's set* methods.
        assertEquals(1, Regex("""\.setAlarmClock\(""").findAll(scheduler).count())
        assertEquals(1, Regex("""\.setExactAndAllowWhileIdle\(""").findAll(scheduler).count())
        // The Misc tick, the daily playback alarm and the resume alarm start playback; the warning, the pause notice
        // and the "Resume Adhkar" prompt (re-armed after a reboot, and when the adhan interrupts) only notify.
        val calls = Regex("""setAlarm\(\s*context,[\s\S]*?AlarmPolicy\.mode\(startsPlayback = (true|false)""").findAll(scheduler).map { it.value to it.groupValues[1] }.toList()
        assertEquals(7, calls.size)
        assertEquals(listOf("true", "false", "true", "false", "false", "true", "false"), calls.map { it.second })
        assertTrue(calls[0].first.contains("Kind.PLAYBACK, tick"))
        assertTrue(calls[1].first.contains("Kind.PROMPT"))
        assertTrue(calls[2].first.contains("Kind.PLAYBACK, plan.occurrence"))
        assertTrue(calls[3].first.contains("warning"))
        assertTrue(calls[5].first.contains("Kind.RESUME"))
        assertTrue(calls[6].first.contains("Kind.PROMPT"))
    }

    @Test
    fun removingTheTaskNeverStopsTheServiceAndAFinishedMiscSessionReArmsTheNextTick() {
        val service = audio("AudioAdhkarPlaybackService.kt")
        val onTaskRemoved = service.substringAfter("override fun onTaskRemoved(").substringBefore("\n    }")
        assertFalse(Regex("""stop|end|release|cancel|abandon""").containsMatchIn(onTaskRemoved.replace("task removed (app swiped from recents)", "")))
        // The manifest doesn't ask Android to stop the service with the task either.
        assertFalse(File("src/main/AndroidManifest.xml").readText().contains("stopWithTask=\"true\""))
        // Every session end (finished, stopped, interrupted) re-arms Misc.
        val endSession = service.substringAfter("private fun endSession(").substringBefore("\n    }")
        assertTrue(endSession.contains("AudioAdhkarScheduler.reschedule(this, Section.MISC, if (dailyEnded) MiscDailyGuard.resumeAfter(now) else now)"))
    }

    @Test
    fun onlyHonorAndHuaweiGetTheAppLaunchHint() {
        assertTrue(BackgroundLaunchManager.isManaged("HONOR", "HONOR")) // the trace's device
        assertTrue(BackgroundLaunchManager.isManaged("HUAWEI"))
        assertTrue(BackgroundLaunchManager.isManaged("unknown", "honor"))
        assertFalse(BackgroundLaunchManager.isManaged("samsung", "samsung"))
        assertFalse(BackgroundLaunchManager.isManaged(null, null))
    }
}
