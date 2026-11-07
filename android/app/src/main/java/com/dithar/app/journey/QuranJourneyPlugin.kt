package com.dithar.app.journey

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.dithar.app.audioadhkar.AudioAdhkarScheduler
import com.dithar.app.reminders.ReminderOpenCover
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import org.json.JSONObject

/**
 * Bridge between the web UI (lib/quranJourneyNative.ts) and the Qur'an Journey's daily
 * notification: stores the notice JS computed and re-arms; tells JS when the app was opened
 * from the notification ("openJourney" / consumeLaunchJourney) so it opens that insight
 * directly, under a cover in the page colour until it has painted (journeyViewShown).
 */
@CapacitorPlugin(
    name = "DitharJourney",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])],
)
class QuranJourneyPlugin : Plugin() {
    private var launchOpen: JourneyOpen? = null
    private var openCover: ReminderOpenCover? = null

    override fun load() {
        super.load()
        openCover = activity?.let { ReminderOpenCover(it) }
        launchOpen = activity?.intent?.let(::takeExtras)
        if (launchOpen != null) openCover?.show(ReminderOpenCover.COLD_START_MAX_MS)
    }

    override fun handleOnDestroy() {
        openCover?.hide()
        super.handleOnDestroy()
    }

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        takeExtras(intent)?.let {
            openCover?.show(ReminderOpenCover.RUNNING_MAX_MS)
            notifyListeners(EVENT_OPEN, openJson(it), true)
        }
    }

    /** Reads and removes the extras, so a recreation doesn't open it again. */
    private fun takeExtras(intent: Intent): JourneyOpen? {
        val open = JourneyOpen.fromExtras { intent.getStringExtra(it) }
        for (key in JourneyOpen.EXTRAS) intent.removeExtra(key)
        return open
    }

    private fun openJson(open: JourneyOpen?): JSObject {
        if (open == null) return JSObject().put("page", JSONObject.NULL)
        return JSObject().put("page", open.page).put("round", open.round).put("insight", open.insight).put("fromDate", open.fromDate)
    }

    @PluginMethod
    fun consumeLaunchJourney(call: PluginCall) {
        val open = launchOpen
        launchOpen = null
        call.resolve(openJson(open))
    }

    @PluginMethod
    fun journeyViewShown(call: PluginCall) {
        activity?.runOnUiThread { openCover?.hide() }
        call.resolve()
    }

    /** { enabled, minutes, language, notice? } — saved, then re-armed. Safe to repeat. */
    @PluginMethod
    fun setJourneyNotice(call: PluginCall) {
        val store = JourneyStore(context)
        store.enabled = call.getBoolean("enabled", false) == true
        store.minutes = call.getInt("minutes") ?: (8 * 60)
        store.language = call.getString("language") ?: store.language
        val notice = call.getObject("notice")?.let(JourneyStore::parseNotice)
        store.notice = notice
        val today = JourneyPlan.localDate(System.currentTimeMillis())
        // Off, nothing to invite to, or today's page read (the notice is tomorrow's): today's notification goes.
        if (!store.enabled || notice == null || notice.fromDate > today) JourneyScheduler.cancelPosted(context)
        val at = JourneyScheduler.arm(context)
        call.resolve(JSObject().put("nextAt", at ?: JSONObject.NULL))
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val at = JourneyStore(context).scheduledAt
        call.resolve(
            JSObject()
                .put("notifications", NotificationManagerCompat.from(context).areNotificationsEnabled())
                .put("exact", AudioAdhkarScheduler.canScheduleExact(context))
                .put("nextAt", if (at > 0) at else JSONObject.NULL),
        )
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

    companion object {
        private const val EVENT_OPEN = "openJourney"
    }
}
