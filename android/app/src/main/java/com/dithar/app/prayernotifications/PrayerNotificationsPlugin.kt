package com.dithar.app.prayernotifications

import android.Manifest
import android.app.usage.UsageStatsManager
import android.os.PowerManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.dithar.app.audioadhkar.AudioAdhkarPlaybackService
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import org.json.JSONObject

/**
 * Bridge between DITHAR's web UI (lib/prayerNotifications.ts) and native
 * prayer-time notifications: stores the upcoming notifications JS computed
 * and (re)arms the alarm for the next one.
 */
@CapacitorPlugin(
    name = "PrayerNotifications",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class PrayerNotificationsPlugin : Plugin() {
    /**
     * Replaces every stored prayer time with [entries] (empty = none) and
     * the adhan settings per section (null = auto-adhan off), then re-arms.
     * Idempotent.
     */
    @PluginMethod
    fun setSchedule(call: PluginCall) {
        val items = call.getArray("entries") ?: JSArray()
        val store = PrayerNotificationStore(context)
        store.entries = (0 until items.length()).map { PrayerNotificationStore.parseEntry(items.getJSONObject(it)) }
        val adhan = call.getObject("adhan") ?: JSObject()
        for (section in listOf("regular", "fajr")) store.setAdhanConfig(section, adhan.optJSONObject(section))
        val nextAt = PrayerNotificationScheduler.reschedule(context)
        call.resolve(status().put("nextAt", nextAt ?: JSONObject.NULL))
    }

    /** The prayer notifications master switch turned off (after setSchedule cleared everything): stops the adhan if it is playing now. */
    @PluginMethod
    fun stopAdhan(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_STOP_ADHAN)
        PrayerNotificationStore(context).appendEvent("master switch off: adhan stopped if playing")
        call.resolve()
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val nextAt = PrayerNotificationStore(context).scheduledAt
        call.resolve(status().put("nextAt", if (nextAt > 0) nextAt else JSONObject.NULL))
    }

    private fun status(): JSObject {
        val store = PrayerNotificationStore(context)
        val last = JSObject()
        for (section in listOf("regular", "fajr")) {
            val (voice, at, _) = store.adhanLast(section)
            last.put(section, if (voice == null) JSONObject.NULL else JSObject().put("voiceId", voice).put("at", at))
        }
        val power = context.getSystemService(PowerManager::class.java)
        val bucket = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) context.getSystemService(UsageStatsManager::class.java)?.appStandbyBucket ?: -1 else -1
        return JSObject()
            .put("exact", PrayerNotificationScheduler.canScheduleExact(context))
            .put("notifications", NotificationManagerCompat.from(context).areNotificationsEnabled())
            .put("adhanLast", last)
            .put("ignoringBatteryOptimizations", power?.isIgnoringBatteryOptimizations(context.packageName) ?: false)
            .put("standbyBucket", bucket)
            .put("events", JSArray(store.recentEvents()))
    }

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

    /** Android 12+: DITHAR's "Alarms & reminders" page. */
    @PluginMethod
    fun openExactAlarmSettings(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                context.startActivity(
                    Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            } catch (_: Exception) {
            }
        }
        call.resolve()
    }
}
