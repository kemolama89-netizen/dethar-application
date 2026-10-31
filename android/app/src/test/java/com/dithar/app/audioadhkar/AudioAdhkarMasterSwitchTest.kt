package com.dithar.app.audioadhkar

import com.dithar.app.prayernotifications.PrayerNotificationPlan
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * The two master switches' native side. Scheduling is gated in JS (every
 * section sent disabled; an empty prayer schedule), which native already
 * turns into cancelled alarms that a reboot doesn't re-arm. What native
 * adds: stopping what plays NOW — each switch only its own kind.
 * (No emulator/Robolectric here: source guards, as in AudioAdhkarLifecycleGuardTest.)
 */
class AudioAdhkarMasterSwitchTest {
    private val javaRoot = File("src/main/java/com/dithar/app")
    private fun source(path: String) = File(javaRoot, path).readText()
    private val service = source("audioadhkar/AudioAdhkarPlaybackService.kt")

    private fun line(text: String, marker: String) = text.lines().single { marker in it }
    private fun method(text: String, name: String) = text.substringAfter("fun $name(").substringBefore("\n    }")

    @Test
    fun audioAdhkarOffStopsOnlyAScheduledSession() {
        val stop = line(service, "ACTION_STOP_SCHEDULED ->")
        assertTrue(stop.contains("if (cursor != null && !manualSession && !adhanSession) stopSession()"))
    }

    @Test
    fun prayerNotificationsOffStopsOnlyTheAdhan() {
        val stop = line(service, "ACTION_STOP_ADHAN ->")
        assertTrue(stop.contains("if (adhanSession) stopSession()"))
        assertFalse(stop.contains("manualSession"))
    }

    @Test
    fun audioAdhkarOffClearsItsPendingNoticesAndNeverTouchesTheAdhan() {
        val plugin = method(source("audioadhkar/AudioAdhkarPlugin.kt"), "stopScheduled")
        assertTrue(plugin.contains("command(context, AudioAdhkarPlaybackService.ACTION_STOP_SCHEDULED)"))
        for (notice in listOf("AudioAdhkarWarningReceiver.NOTIFICATION_ID", "AudioAdhkarPlaybackService.TAP_TO_START_NOTIFICATION_ID", "AudioAdhkarPauseReceiver.NOTIFICATION_ID")) {
            assertTrue(notice, plugin.contains("manager.cancel($notice)"))
        }
        assertFalse(plugin.contains("ADHAN"))
        assertFalse(plugin.contains("Prayer"))
    }

    @Test
    fun prayerOffStopsTheAdhanAndNeverTouchesAudioAdhkarSchedules() {
        val plugin = method(source("prayernotifications/PrayerNotificationsPlugin.kt"), "stopAdhan")
        assertTrue(plugin.contains("command(context, AudioAdhkarPlaybackService.ACTION_STOP_ADHAN)"))
        assertFalse(plugin.contains("AudioAdhkarScheduler"))
        assertFalse(plugin.contains("STOP_SCHEDULED"))
    }

    @Test
    fun anEmptiedPrayerScheduleArmsNothingEvenAfterAReboot() {
        // The reschedule receiver (boot, update, time change) re-arms from the stored entries: none → no alarm.
        assertNull(PrayerNotificationPlan.next(emptyList(), System.currentTimeMillis(), 0L))
    }

    @Test
    fun aDisabledSectionIsNeitherRearmedAfterABootNorContinued() {
        val scheduler = source("audioadhkar/AudioAdhkarScheduler.kt")
        assertTrue(scheduler.contains("if (!prefs.enabled || minutes < 0 || prefs.playlist.isEmpty())"))
        val recover = method(scheduler, "recoverInterruptedSession")
        assertTrue(recover.contains("val prefs = store.section(active.section)"))
        assertTrue(recover.contains("!prefs.enabled"))
        // Alarms already delivered check it too.
        assertTrue(source("audioadhkar/AudioAdhkarAlarmReceiver.kt").contains("!current || !prefs.enabled ->"))
    }
}
