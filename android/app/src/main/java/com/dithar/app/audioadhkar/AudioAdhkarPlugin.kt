package com.dithar.app.audioadhkar

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.app.usage.UsageStatsManager
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationManagerCompat
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import org.json.JSONObject

/**
 * Bridge between DITHAR's web UI (lib/audioAdhkarNative.ts) and native
 * scheduled Evening Audio Adhkar: stores the schedule + playlist, arms the
 * alarm, forwards Pause/Resume/Stop to the playback service, and relays
 * the service's playback state back to JS ("playbackState").
 */
@CapacitorPlugin(
    name = "AudioAdhkar",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class AudioAdhkarPlugin : Plugin() {
    private val store by lazy { AudioAdhkarStore(context) }

    override fun load() {
        super.load()
        AudioAdhkarPlaybackService.setStateListener { state ->
            notifyListeners(EVENT_PLAYBACK_STATE, JSObject().put("state", state ?: JSONObject.NULL))
        }
    }

    override fun handleOnDestroy() {
        AudioAdhkarPlaybackService.setStateListener(null)
        super.handleOnDestroy()
    }

    /**
     * Saves the Evening schedule and playlist, then (re)arms — or cancels —
     * the single daily alarm. Safe to call repeatedly: it always replaces.
     */
    @PluginMethod
    fun setEveningSchedule(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        val startMinutes = call.getInt("startMinutes") ?: -1
        val items = call.getArray("playlist") ?: JSArray()
        val playlist = (0 until items.length()).map { i ->
            val obj = items.getJSONObject(i)
            PlaylistItem(
                dhikrId = obj.getString("dhikrId"),
                title = obj.getString("title"),
                text = obj.getString("text"),
                assetPath = obj.getString("assetPath"),
                repetitions = obj.getInt("repetitions").coerceAtLeast(1),
            )
        }
        store.eveningEnabled = enabled
        store.eveningStartMinutes = startMinutes
        store.eveningPlaylist = playlist
        val result = AudioAdhkarScheduler.reschedule(context)
        call.resolve(
            JSObject()
                .put("scheduledAt", result?.scheduledAt ?: JSONObject.NULL)
                .put("warningAt", result?.warningAt ?: JSONObject.NULL)
                .put("exact", result?.exact ?: AudioAdhkarScheduler.canScheduleExact(context)),
        )
    }

    @PluginMethod
    fun getPlaybackState(call: PluginCall) {
        call.resolve(JSObject().put("state", AudioAdhkarPlaybackService.lastState ?: JSONObject.NULL))
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_PAUSE)
        call.resolve()
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_RESUME)
        call.resolve()
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_STOP)
        call.resolve()
    }

    /**
     * What a real-device test needs to see: the recent scheduler/receiver/
     * service events and the permission/battery states that decide whether
     * Android lets them run while DITHAR is closed. Read-only.
     */
    @PluginMethod
    fun getDiagnostics(call: PluginCall) {
        val power = context.getSystemService(PowerManager::class.java)
        val bucket = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            context.getSystemService(UsageStatsManager::class.java)?.appStandbyBucket ?: -1
        } else {
            -1
        }
        call.resolve(
            JSObject()
                .put("events", JSArray(store.recentEvents()))
                .put("exactAlarms", AudioAdhkarScheduler.canScheduleExact(context))
                .put("notifications", NotificationManagerCompat.from(context).areNotificationsEnabled())
                .put("ignoringBatteryOptimizations", power?.isIgnoringBatteryOptimizations(context.packageName) ?: false)
                .put("standbyBucket", bucket)
                .put("scheduledAt", store.scheduledOccurrence),
        )
    }

    /** Opens DITHAR's notification settings page (e.g. after notifications were turned off). */
    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        } else {
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
        }
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Exception) {
        }
        call.resolve()
    }

    @PluginMethod
    fun canScheduleExactAlarms(call: PluginCall) {
        call.resolve(JSObject().put("granted", AudioAdhkarScheduler.canScheduleExact(context)))
    }

    /** Opens Android's "Alarms & reminders" permission page for DITHAR (Android 12+). */
    @PluginMethod
    fun openExactAlarmSettings(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(intent)
            } catch (_: Exception) {
            }
        }
        call.resolve()
    }

    companion object {
        private const val EVENT_PLAYBACK_STATE = "playbackState"
    }
}
