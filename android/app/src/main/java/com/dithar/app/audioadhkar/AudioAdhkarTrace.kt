package com.dithar.app.audioadhkar

import android.app.ActivityManager
import android.app.AlarmManager
import android.app.ApplicationExitInfo
import android.app.NotificationManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.PowerManager
import android.os.Process
import android.util.Log
import androidx.core.app.NotificationManagerCompat
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The background-playback trace: one timeline of every stage of Audio
 * Adhkar playback — the Activity's lifecycle, alarms and receivers, the
 * playback service's lifecycle, each file's loading/start/completion/error,
 * the silences, the wake lock, audio focus, the screen, a heartbeat while a
 * session plays, and uncaught crashes — so a real device shows WHERE
 * playback stops (the service destroyed? the process killed? an audio
 * error? never started?). Each line carries the process id: a new pid with
 * no "service destroyed" before it means Android killed the process, and
 * the report adds Android's own record of why (ApplicationExitInfo).
 *
 * Kept in a file in the app's private storage (bounded), mirrored to
 * logcat under [TAG]; exported from Settings → Audio Adhkar → diagnostics.
 * Read-only for behaviour: nothing here changes what plays.
 */
object AudioAdhkarTrace {
    const val TAG = "DitharAudioAdhkar"
    private const val FILE_NAME = "audio_adhkar_trace.log"
    private const val MAX_BYTES = 512 * 1024L
    private val lock = Any()
    private val stamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS Z", Locale.US)

    @Volatile
    private var processStarted = false

    @JvmStatic
    fun log(context: Context, stage: String, message: String) {
        val app = context.applicationContext ?: context
        startProcess(app)
        write(app, stage, message)
    }

    private fun write(context: Context, stage: String, message: String) {
        val line = "${synchronized(stamp) { stamp.format(Date()) }} pid=${Process.myPid()} [$stage] $message"
        Log.i(TAG, line)
        synchronized(lock) {
            try {
                val file = file(context)
                file.appendText(line + "\n")
                if (file.length() > MAX_BYTES) {
                    // Keep the newer half.
                    val text = file.readText()
                    file.writeText(text.substring(text.length / 2).substringAfter('\n'))
                }
            } catch (e: Exception) {
                Log.w(TAG, "trace write failed", e)
            }
        }
    }

    /** The first line of every process, and a crash recorder (an uncaught exception's stack lands in the trace). */
    private fun startProcess(context: Context) {
        if (processStarted) return
        synchronized(lock) {
            if (processStarted) return
            processStarted = true
        }
        write(context, "process", "started (importance=${importance()})")
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                val stack = StringWriter().also { error.printStackTrace(PrintWriter(it)) }.toString()
                write(context, "crash", "uncaught on ${thread.name}: $stack")
            } catch (_: Throwable) {
            }
            previous?.uncaughtException(thread, error)
        }
    }

    /** This process's importance now (100 foreground, 125 foreground service, 200 visible, 400 cached …). */
    @JvmStatic
    fun importance(): Int = ActivityManager.RunningAppProcessInfo().also { ActivityManager.getMyMemoryState(it) }.importance

    /** Screen, Doze and power-saving state, for a heartbeat line. */
    fun powerState(context: Context): String {
        val power = context.getSystemService(PowerManager::class.java) ?: return ""
        return "screenOn=${power.isInteractive} doze=${power.isDeviceIdleMode} powerSave=${power.isPowerSaveMode} importance=${importance()}"
    }

    fun clear(context: Context) {
        synchronized(lock) { file(context).delete() }
        log(context, "trace", "cleared")
    }

    private fun file(context: Context) = File(context.applicationContext.filesDir, FILE_NAME)

    /** Everything a device-specific failure needs: device, permissions, battery state, exit reasons, then the trace. */
    fun report(context: Context): String {
        val app = context.applicationContext
        val out = StringBuilder()
        out.appendLine("DITHAR — Audio Adhkar background playback diagnostics")
        out.appendLine("generated: ${synchronized(stamp) { stamp.format(Date()) }}  pid=${Process.myPid()}")
        out.appendLine("device: ${Build.MANUFACTURER} ${Build.MODEL} (${Build.BRAND}), Android ${Build.VERSION.RELEASE} (SDK ${Build.VERSION.SDK_INT})")
        try {
            val info = app.packageManager.getPackageInfo(app.packageName, 0)
            @Suppress("DEPRECATION")
            out.appendLine("app: ${info.versionName} (${if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode else info.versionCode.toLong()}), targetSdk ${app.applicationInfo.targetSdkVersion}")
        } catch (_: PackageManager.NameNotFoundException) {
        }
        out.appendLine()
        out.appendLine("== permissions & battery ==")
        val power = app.getSystemService(PowerManager::class.java)
        val activity = app.getSystemService(ActivityManager::class.java)
        val notifications = app.getSystemService(NotificationManager::class.java)
        out.appendLine("notificationsEnabled=${NotificationManagerCompat.from(app).areNotificationsEnabled()}")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = notifications.getNotificationChannel("dithar_audio_adhkar")
            out.appendLine("playbackChannelImportance=${channel?.importance ?: "not created yet"} (0 = blocked by the user)")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            out.appendLine("exactAlarms=${app.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()}")
        }
        out.appendLine("batteryUnrestricted(ignoringOptimizations)=${power?.isIgnoringBatteryOptimizations(app.packageName)}")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            out.appendLine("backgroundRestricted=${activity?.isBackgroundRestricted} (true = battery 'Restricted': background work is blocked)")
            out.appendLine("standbyBucket=${app.getSystemService(UsageStatsManager::class.java)?.appStandbyBucket} (10 active, 20 working set, 30 frequent, 40 rare, 45 restricted)")
        }
        out.appendLine("manufacturerBackgroundManager=${BackgroundLaunchManager.isManaged(Build.MANUFACTURER, Build.BRAND)} (true = HONOR/Huawei 'App launch' may hold alarms after a swipe from Recents)")
        out.appendLine("alarmMode(playback)=${AlarmPolicy.mode(startsPlayback = true, AudioAdhkarScheduler.canScheduleExact(app))}")
        out.appendLine(powerState(app))
        out.appendLine()
        out.appendLine("== playback now ==")
        out.appendLine("sessionActive=${AudioAdhkarPlaybackService.isSessionActive} manual=${AudioAdhkarPlaybackService.isManualSession} adhan=${AudioAdhkarPlaybackService.isAdhanPlaying}")
        out.appendLine("lastState=${AudioAdhkarPlaybackService.lastState}")
        val store = AudioAdhkarStore(app)
        out.appendLine("savedActiveSession=${store.activeSession}")
        for (section in Section.values()) {
            val prefs = store.section(section)
            out.appendLine("${section.key}: enabled=${prefs.enabled} start=${prefs.startMinutes} playlist=${prefs.playlist.size} scheduled=${format(prefs.scheduledOccurrence)} resume=${format(prefs.resumeOccurrence)}")
        }
        out.appendLine()
        out.appendLine("== why the app's previous processes ended (Android's record) ==")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && activity != null) {
            val exits = try {
                activity.getHistoricalProcessExitReasons(app.packageName, 0, 15)
            } catch (_: Exception) {
                emptyList()
            }
            if (exits.isEmpty()) out.appendLine("(none recorded)")
            for (exit in exits) {
                out.appendLine("${format(exit.timestamp)} pid=${exit.pid} reason=${reasonName(exit.reason)} importance=${exit.importance} status=${exit.status} pss=${exit.pss}kB ${exit.description ?: ""}")
            }
        } else {
            out.appendLine("(needs Android 11+)")
        }
        out.appendLine()
        out.appendLine("== trace (oldest first) ==")
        synchronized(lock) {
            val file = file(app)
            out.append(if (file.exists()) file.readText() else "(empty)\n")
        }
        return out.toString()
    }

    private fun format(millis: Long): String = if (millis <= 0L) "-" else synchronized(stamp) { stamp.format(Date(millis)) }

    private fun reasonName(reason: Int): String = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        when (reason) {
            ApplicationExitInfo.REASON_EXIT_SELF -> "EXIT_SELF"
            ApplicationExitInfo.REASON_SIGNALED -> "SIGNALED"
            ApplicationExitInfo.REASON_LOW_MEMORY -> "LOW_MEMORY"
            ApplicationExitInfo.REASON_CRASH -> "CRASH"
            ApplicationExitInfo.REASON_CRASH_NATIVE -> "CRASH_NATIVE"
            ApplicationExitInfo.REASON_ANR -> "ANR"
            ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "INITIALIZATION_FAILURE"
            ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "PERMISSION_CHANGE"
            ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "EXCESSIVE_RESOURCE_USAGE"
            ApplicationExitInfo.REASON_USER_REQUESTED -> "USER_REQUESTED (Force stop / swiped by the system UI)"
            ApplicationExitInfo.REASON_USER_STOPPED -> "USER_STOPPED"
            ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "DEPENDENCY_DIED"
            ApplicationExitInfo.REASON_OTHER -> "OTHER"
            14 -> "FREEZER"
            15 -> "PACKAGE_STATE_CHANGE"
            16 -> "PACKAGE_UPDATED"
            else -> "UNKNOWN($reason)"
        }
    } else {
        "UNKNOWN($reason)"
    }
}
