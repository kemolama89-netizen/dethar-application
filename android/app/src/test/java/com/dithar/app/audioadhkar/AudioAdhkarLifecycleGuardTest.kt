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
        // Prayer notifications cancel only their own, separate alarm (prayernotifications/).
        assertEquals(setOf("com/dithar/app/audioadhkar/AudioAdhkarScheduler.kt", "com/dithar/app/prayernotifications/PrayerNotificationScheduler.kt"), alarmCancels)
    }

    @Test
    fun theSchedulerCancelsOnlyWhenDisabledUnsetOrEmpty() {
        val reschedule = audio("AudioAdhkarScheduler.kt").substringAfter("fun reschedule(").substringBefore("fun armResume(")
        assertTrue(reschedule.contains("if (!prefs.enabled || minutes < 0 || prefs.playlist.isEmpty())"))
        // Disabled/unset/empty, or a Misc window with no tick left (invalid window) — nothing else cancels.
        assertEquals(2, Regex("""\bcancel\(context, section\)""").findAll(reschedule).count())
    }

    @Test
    fun activityAndPluginTeardownNeverTouchTheSchedule() {
        val plugin = audio("AudioAdhkarPlugin.kt")
        val onDestroy = plugin.substringAfter("override fun handleOnDestroy()").substringBefore("@PluginMethod")
        assertFalse(onDestroy.contains("Scheduler"))
        // Swiping the app from Recents never ends playback: the service's onTaskRemoved only records it (diagnostics).
        for ((path, text) in sources().filter { (_, text) -> "onTaskRemoved" in text && "AudioAdhkar" in text }) {
            val body = text.substringAfter("override fun onTaskRemoved(").substringBefore("\n    }")
            assertFalse(path, Regex("""stop|end|cancel|release""", RegexOption.IGNORE_CASE).containsMatchIn(body.replace("task removed (app swiped from recents)", "")))
        }
    }

    @Test
    fun receiversAndServiceNeverNeedTheWebViewOrActivity() {
        for (file in listOf("AudioAdhkarAlarmReceiver.kt", "AudioAdhkarWarningReceiver.kt", "AudioAdhkarPlaybackService.kt", "AudioAdhkarScheduler.kt", "AudioAdhkarStore.kt", "AudioAdhkarLogic.kt")) {
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
        for (line in listOf(
            "Kind.PLAYBACK -> AudioAdhkarAlarmReceiver::class.java",
            "Kind.WARNING -> AudioAdhkarWarningReceiver::class.java",
            "Kind.PAUSE -> AudioAdhkarPauseReceiver::class.java",
            "Kind.RESUME -> AudioAdhkarResumeReceiver::class.java",
        )) {
            assertTrue(line, scheduler.contains(line))
        }
        // Fixed request codes per section and kind; Evening keeps its original 7301 (playback) / 7303 (warning).
        assertTrue(scheduler.contains("Section.EVENING -> 7300"))
        assertTrue(scheduler.contains("PLAYBACK(1), WARNING(3), PAUSE(5), RESUME(7)"))
        assertEquals(1, Regex("""FLAG_UPDATE_CURRENT or PendingIntent\.FLAG_IMMUTABLE""").findAll(scheduler).count())
    }

    @Test
    fun manifestDeclaresReceiversServiceAndRebootRestore() {
        for (name in listOf(".audioadhkar.AudioAdhkarAlarmReceiver", ".audioadhkar.AudioAdhkarWarningReceiver", ".audioadhkar.AudioAdhkarResumeReceiver", ".audioadhkar.AudioAdhkarPauseReceiver", ".audioadhkar.AudioAdhkarRescheduleReceiver")) {
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
        assertTrue(service.substringBefore("private fun postTapToStart").contains("postTapToStart(context, intent, section)"))
    }

    @Test
    fun anAdhanWindowStopsASessionAndNothingStartsInsideOne() {
        val service = audio("AudioAdhkarPlaybackService.kt")
        val start = service.substringAfter("private fun startSession(").substringBefore("private fun interruptForAdhan(")
        assertTrue(start.contains("AdhanSuppression.isSuppressed(now, windows)"))
        assertTrue(start.contains("AdhanSuppression.nextStartAfter(now, windows)?.let { handler.postDelayed(stopForAdhan, it - now) }"))
        val play = service.substringAfter("private fun playCurrent()").substringBefore("private fun playPart(")
        assertTrue(play.contains("AdhanSuppression.isSuppressed(System.currentTimeMillis()"))
        val end = service.substringAfter("private fun endSession(").substringBefore("private fun releasePlayer()")
        assertTrue(end.contains("handler.removeCallbacks(stopForAdhan)"))
        val alarm = audio("AudioAdhkarAlarmReceiver.kt").substringAfter("class AudioAdhkarAlarmReceiver").substringBefore("class AudioAdhkarResumeReceiver")
        assertTrue(alarm.contains("section == Section.MISC && busy ->"))
        assertTrue(alarm.contains("section == Section.MISC && AdhanSuppression.isSuppressed(now, windows) ->"))
    }

    @Test
    fun rebootAndTimeChangesReArmEverySection() {
        val reschedule = audio("AudioAdhkarAlarmReceiver.kt").substringAfter("class AudioAdhkarRescheduleReceiver")
        assertTrue(reschedule.contains("Intent.ACTION_BOOT_COMPLETED,"))
        assertTrue(reschedule.contains("AudioAdhkarScheduler.rescheduleAll(context)"))
        // …and a session a reboot cut off continues from its dhikr (daily only, within the resume window).
        assertTrue(reschedule.contains("if (intent.action == Intent.ACTION_BOOT_COMPLETED) AudioAdhkarScheduler.recoverInterruptedSession(context)"))
    }

    @Test
    fun theServiceInsertsTheSilenceNativelyAfterEveryNonFinalPlayback() {
        val service = audio("AudioAdhkarPlaybackService.kt")
        val completed = service.substringAfter("private fun onPlaybackCompleted(").substringBefore("// ---- silence")
        // After a non-final playback: the «تشغيل الكل» resume point is saved (Resume Adhkar), then the silence.
        val nonFinal = completed.substringAfter("PlaybackCursor.Step.NEXT_REPETITION, PlaybackCursor.Step.NEXT_DHIKR -> {").substringBefore("}")
        assertTrue(nonFinal.contains("savePlayAllProgress()"))
        assertTrue(nonFinal.contains("startSilence()"))
        assertTrue(nonFinal.indexOf("savePlayAllProgress()") < nonFinal.indexOf("startSilence()"))
        assertTrue(completed.contains("PlaybackCursor.Step.FINISHED -> finishSession()"))
        val silence = service.substringAfter("private fun startSilence()").substringBefore("private fun cancelSilence()")
        assertTrue(silence.contains("handler.postDelayed(playNextAfterSilence"))
        // The silence runs under the session's wake lock, held from the session's start until it is paused or ends —
        // not dropped as the silence ends (the next file still has to prepare with the screen off).
        val cancel = service.substringAfter("private fun cancelSilence()").substringBefore("\n    }")
        assertFalse(cancel.contains("release"))
        assertTrue(service.substringAfter("private fun beginPlayback()").substringBefore("\n    }").contains("acquireSessionWakeLock()"))
    }

    @Test
    fun exitingTheAppNeverStopsAnyScheduleOrBackgroundComponent() {
        // Exit = Capacitor App.exitApp() → Activity.finish(): no native code reacts to it by cancelling.
        val main = File(javaRoot, "com/dithar/app/MainActivity.java").readText()
        // MainActivity's lifecycle overrides only record themselves in the diagnostics trace.
        assertFalse(main.contains("cancel(") || main.contains("stopService") || main.contains("Scheduler") || main.contains("AudioAdhkarPlaybackService"))
        val onDestroy = main.substringAfter("public void onDestroy()").substringBefore("\n    }")
        assertTrue(onDestroy.lines().map { it.trim() }.filter { it.isNotEmpty() && it != "{" }.all { it.startsWith("trace(") || it == "super.onDestroy();" })
        for ((path, text) in sources()) {
            val onDestroy = text.substringAfter("override fun handleOnDestroy()", "").substringBefore("\n    }")
            assertFalse(path, onDestroy.contains("Scheduler") || onDestroy.contains("AlarmManager"))
        }
        // The receivers that keep schedules alive are declared statically (not registered by the Activity).
        for (name in listOf(".prayernotifications.PrayerNotificationReceiver", ".prayernotifications.PrayerNotificationRescheduleReceiver", ".audioadhkar.AudioAdhkarAlarmReceiver", ".audioadhkar.AudioAdhkarRescheduleReceiver")) {
            assertTrue(name, manifest.contains("android:name=\"$name\""))
        }
        // The only receivers registered at run time are the playing service's own "headphones unplugged" one
        // and its diagnostics-only screen on/off one (Android delivers both only to registered receivers);
        // no schedule depends on them.
        for ((path, text) in sources().filter { (_, text) -> "AudioAdhkar" in text || "PrayerNotification" in text }) {
            val registered = Regex("""registerReceiver\((\w+)""").findAll(text).map { it.groupValues[1] }.toSet()
            assertTrue(path, registered.isEmpty() || (path.endsWith("AudioAdhkarPlaybackService.kt") && registered == setOf("noisyReceiver", "screenReceiver")))
        }
    }
}
