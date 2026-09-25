package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Static guards for "the schedule survives Exit / Activity destruction /
 * Recents removal" and "receivers + service run without the UI". There is
 * no emulator or Robolectric in this project, so these check the source
 * and manifest the APK is built from (Gradle runs unit tests with the
 * app module as working directory).
 */
class AudioAdhkarLifecycleGuardTest {
    private val javaRoot = File("src/main/java")
    private val audioDir = File(javaRoot, "com/dithar/app/audioadhkar")
    private val manifest = File("src/main/AndroidManifest.xml").readText()

    private fun sources(): Map<String, String> =
        javaRoot.walkTopDown().filter { it.isFile && (it.extension == "kt" || it.extension == "java") }
            .associate { it.relativeTo(javaRoot).path to it.readText() }

    private fun audio(name: String) = File(audioDir, name).readText()

    @Test
    fun onlyTheSchedulerEverCancelsTheEveningAlarms() {
        // Exit (Capacitor App.exitApp → Activity.finish()), plugin/Activity
        // destruction and task removal have no path to a cancel.
        val cancelCallers = sources().filter { (_, text) -> "AudioAdhkarScheduler.cancel(" in text }.keys
        assertEquals(emptySet<String>(), cancelCallers)
        val alarmCancels = sources().filter { (_, text) -> Regex("""alarmManager\.cancel\(|AlarmManager::class.java\)\.cancel\(""").containsMatchIn(text) }.keys
        assertEquals(setOf("com/dithar/app/audioadhkar/AudioAdhkarScheduler.kt"), alarmCancels)
    }

    @Test
    fun theSchedulerCancelsOnlyWhenDisabledUnsetOrEmpty() {
        val reschedule = audio("AudioAdhkarScheduler.kt").substringAfter("fun reschedule(").substringBefore("fun setAlarm(")
        assertTrue(reschedule.contains("if (!store.eveningEnabled || minutes < 0 || store.eveningPlaylist.isEmpty())"))
        assertEquals(1, Regex("""\bcancel\(context\)""").findAll(reschedule).count())
    }

    @Test
    fun activityAndPluginTeardownNeverTouchTheSchedule() {
        val plugin = audio("AudioAdhkarPlugin.kt")
        val onDestroy = plugin.substringAfter("override fun handleOnDestroy()").substringBefore("@PluginMethod")
        assertFalse(onDestroy.contains("Scheduler"))
        assertFalse(sources().values.any { "onTaskRemoved" in it && "AudioAdhkar" in it })
    }

    @Test
    fun receiversAndServiceNeverNeedTheWebViewOrActivity() {
        for (file in listOf("AudioAdhkarAlarmReceiver.kt", "AudioAdhkarWarningReceiver.kt", "AudioAdhkarPlaybackService.kt", "AudioAdhkarScheduler.kt", "AudioAdhkarStore.kt")) {
            val text = audio(file)
            assertFalse("$file imports Capacitor", text.contains("com.getcapacitor"))
            assertFalse("$file needs the WebView", text.contains("import android.webkit"))
            assertFalse("$file needs the Capacitor bridge", Regex("""\bbridge\.|getBridge\(""").containsMatchIn(text))
        }
    }

    @Test
    fun theWarningReceiverNeverStartsPlayback() {
        val warning = audio("AudioAdhkarWarningReceiver.kt")
        assertFalse(warning.contains("startScheduled"))
        assertFalse(warning.contains("AudioAdhkarPlaybackService::class"))
        assertFalse(warning.contains("startForegroundService"))
    }

    @Test
    fun alarmsTargetTheirReceiversExplicitlyWithFixedRequestCodes() {
        val scheduler = audio("AudioAdhkarScheduler.kt")
        assertTrue(scheduler.contains("Intent(context, AudioAdhkarAlarmReceiver::class.java)"))
        assertTrue(scheduler.contains("Intent(context, AudioAdhkarWarningReceiver::class.java)"))
        assertTrue(scheduler.contains("private const val REQUEST_CODE = 7301"))
        assertTrue(scheduler.contains("private const val WARNING_REQUEST_CODE = 7303"))
        assertEquals(2, Regex("""FLAG_UPDATE_CURRENT or PendingIntent\.FLAG_IMMUTABLE""").findAll(scheduler).count())
    }

    @Test
    fun manifestDeclaresReceiversServiceAndRebootRestore() {
        for (name in listOf(".audioadhkar.AudioAdhkarAlarmReceiver", ".audioadhkar.AudioAdhkarWarningReceiver", ".audioadhkar.AudioAdhkarRescheduleReceiver")) {
            assertTrue(name, manifest.contains("android:name=\"$name\""))
        }
        val service = manifest.substringAfter("android:name=\".audioadhkar.AudioAdhkarPlaybackService\"").substringBefore("/>")
        assertTrue(service.contains("android:foregroundServiceType=\"mediaPlayback\""))
        for (action in listOf("BOOT_COMPLETED", "MY_PACKAGE_REPLACED", "TIME_SET", "TIMEZONE_CHANGED")) {
            assertTrue(action, manifest.contains("android.intent.action.$action"))
        }
        for (permission in listOf("FOREGROUND_SERVICE", "FOREGROUND_SERVICE_MEDIA_PLAYBACK", "SCHEDULE_EXACT_ALARM", "POST_NOTIFICATIONS", "RECEIVE_BOOT_COMPLETED", "WAKE_LOCK")) {
            assertEquals(permission, 1, Regex("""android\.permission\.$permission"""").findAll(manifest).count())
        }
    }

    @Test
    fun aRefusedBackgroundStartIsNeverSilent() {
        val service = audio("AudioAdhkarPlaybackService.kt").substringAfter("fun startScheduled(")
        assertTrue(service.substringBefore("private fun postTapToStart").contains("postTapToStart(context)"))
    }

    @Test
    fun theServiceInsertsTheSilenceNativelyAfterEveryNonFinalPlayback() {
        val service = audio("AudioAdhkarPlaybackService.kt")
        val completed = service.substringAfter("private fun onPlaybackCompleted(").substringBefore("// ---- silence")
        assertTrue(completed.contains("PlaybackCursor.Step.NEXT_REPETITION, PlaybackCursor.Step.NEXT_DHIKR -> startSilence()"))
        assertTrue(completed.contains("PlaybackCursor.Step.FINISHED -> finishSession()"))
        val silence = service.substringAfter("private fun startSilence()").substringBefore("private fun cancelSilence()")
        assertTrue(silence.contains("handler.postDelayed(playNextAfterSilence"))
        assertTrue(silence.contains("acquireGapWakeLock()"))
    }
}
