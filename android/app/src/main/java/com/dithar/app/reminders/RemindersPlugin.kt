package com.dithar.app.reminders

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

/**
 * Bridge between the web UI (lib/remindersNative.ts) and native reminders,
 * the home-screen widget and the end-of-day summary: stores what JS pushes,
 * re-arms the alarms, redraws the widget, and tells JS when the user opened
 * the app from a reminder ("openReminder") so it can show the full-screen
 * reflection.
 */
@CapacitorPlugin(name = "DitharReminders")
class RemindersPlugin : Plugin() {
    /** The reminder (as it was shown) the app was opened with (cold start), until JS takes it. */
    private var launchReminder: ReminderOpen? = null

    override fun load() {
        super.load()
        launchReminder = activity?.intent?.let(::takeReminderExtra)
        markAppOpened()
    }

    override fun handleOnResume() {
        super.handleOnResume()
        markAppOpened()
    }

    /** The end-of-day summary needs to know the app was opened today (DailySummary.recordsKnown). */
    private fun markAppOpened() {
        ReminderStore(context).appOpenedOn = DailySummary.localDate(System.currentTimeMillis())
    }

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        takeReminderExtra(intent)?.let { notifyListeners(EVENT_OPEN, openJson(it), true) }
    }

    /** Reads (and removes, so a recreation doesn't reopen it) the reminder extras. */
    private fun takeReminderExtra(intent: Intent): ReminderOpen? {
        val open = ReminderOpen.fromExtras { intent.getStringExtra(it) }
        for (key in ReminderOpen.EXTRAS) intent.removeExtra(key)
        return open
    }

    /** { id, commentId | null, shown: { category, title, text, meaning, detail, source, commentText | null } } */
    private fun openJson(open: ReminderOpen?): JSObject {
        if (open == null) return JSObject().put("id", JSONObject.NULL).put("commentId", JSONObject.NULL)
        val shown = JSObject()
            .put("category", open.category)
            .put("title", open.title)
            .put("text", open.text)
            .put("meaning", open.meaning)
            .put("detail", open.detail)
            .put("source", open.source)
            .put("commentText", open.commentText ?: JSONObject.NULL)
        return JSObject().put("id", open.id).put("commentId", open.commentId ?: JSONObject.NULL).put("shown", shown)
    }

    /** The reminder the app was launched from, once (openJson; id null when none). */
    @PluginMethod
    fun consumeLaunchReminder(call: PluginCall) {
        val launch = launchReminder
        launchReminder = null
        call.resolve(openJson(launch))
    }

    /**
     * Saves the reminder settings and content pool (and the widget's
     * background settings), then re-arms and redraws. Safe to repeat.
     */
    @PluginMethod
    fun setReminders(call: PluginCall) {
        val store = ReminderStore(context)
        store.enabled = call.getBoolean("enabled", false) == true
        store.notifications = call.getBoolean("notifications", true) == true
        store.categories = (call.getArray("categories") ?: JSArray()).let { a -> (0 until a.length()).map { a.getString(it) }.toSet() }
        store.intervalMinutes = (call.getInt("intervalMinutes") ?: 180).coerceAtLeast(ReminderPlan.MIN_INTERVAL_MINUTES)
        store.startMinutes = call.getInt("startMinutes") ?: (9 * 60)
        store.endMinutes = call.getInt("endMinutes") ?: (21 * 60)
        store.fullScreen = call.getBoolean("fullScreen", true) == true
        store.language = call.getString("language") ?: "ar"
        store.dayStarts = call.getArray("dayStartMinutes")?.let { a -> (0 until a.length()).map { a.optInt(it, -1) }.takeIf { it.size == 7 } }
        store.backgroundMode = call.getString("backgroundMode") ?: "auto"
        store.fixedBackground = call.getString("fixedBackground") ?: "mosque-night"
        store.latitude = call.getDouble("latitude")
        ReminderStore.parseColor(call.getString("widgetAccent"))?.let { store.widgetAccent = it }
        ReminderStore.parseColor(call.getString("widgetTint"))?.let { store.widgetTint = it }
        call.getArray("pool")?.let { a -> store.pool = (0 until a.length()).map { ReminderStore.parseItem(a.getJSONObject(it)) } }
        if (!store.enabled) RemindersScheduler.cancelNotifications(context)
        RemindersScheduler.armReminder(context)
        RemindersScheduler.armWidgetRefresh(context)
        WidgetRenderer.updateAll(context)
        call.resolve(JSObject().put("widgets", RemindersScheduler.widgetCount(context)))
    }

    /** The end-of-day summary's settings and today's activity snapshot (lib/dailySummary.ts). */
    @PluginMethod
    fun setSummary(call: PluginCall) {
        val store = ReminderStore(context)
        store.summaryEnabled = call.getBoolean("enabled", false) == true
        store.summaryMinutes = call.getInt("minutes") ?: (21 * 60 + 30)
        store.summaryMode = call.getString("mode") ?: "combined"
        call.getObject("snapshot")?.let(store::setSummarySnapshotJson)
        RemindersScheduler.armSummary(context)
        call.resolve()
    }

    /** The user's own background photo: a JPEG (base64, already cropped and downscaled), or { clear: true }. */
    @PluginMethod
    fun setCustomBackground(call: PluginCall) {
        val file = ReminderStore(context).customBackgroundFile
        try {
            if (call.getBoolean("clear", false) == true) {
                file.delete()
            } else {
                val data = call.getString("jpegBase64") ?: return call.reject("jpegBase64 required")
                val bytes = Base64.decode(data, Base64.DEFAULT)
                if (bytes.size > MAX_CUSTOM_BYTES) return call.reject("image too large")
                file.writeBytes(bytes)
            }
            WidgetRenderer.updateAll(context)
            call.resolve()
        } catch (e: Exception) {
            call.reject("could not save the background: ${e.message}")
        }
    }

    /** Hearts tapped on the widget that the app hasn't merged yet (oldest first). { ops: [...] } */
    @PluginMethod
    fun getFavoriteOps(call: PluginCall) {
        call.resolve(JSObject().put("ops", JSArray(FavoritesStore(context).pendingOps.map(FavoritesStore::opJson))))
    }

    /**
     * The app's full list of favorite ids, after merging every op up to
     * `ackThrough` — the widget's hearts follow it (any later tap is kept
     * and replayed on top), and the widget is redrawn.
     */
    @PluginMethod
    fun setFavoriteKeys(call: PluginCall) {
        val keys = (call.getArray("keys") ?: JSArray()).let { a -> (0 until a.length()).map { a.getString(it) }.toSet() }
        val ackThrough = call.getLong("ackThrough") ?: 0L
        FavoritesStore(context).acknowledge(keys, ackThrough)
        WidgetRenderer.updateAll(context)
        call.resolve()
    }

    /** How many DITHAR widgets are on the home screen, and whether the launcher can add one from the app. */
    @PluginMethod
    fun getWidgetStatus(call: PluginCall) {
        val manager = AppWidgetManager.getInstance(context)
        val pinSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported
        call.resolve(JSObject().put("count", RemindersScheduler.widgetCount(context)).put("pinSupported", pinSupported))
    }

    /** Asks the launcher to add the widget (Android 8+, where the launcher supports it; the user confirms). */
    @PluginMethod
    fun requestPinWidget(call: PluginCall) {
        val manager = AppWidgetManager.getInstance(context)
        val requested = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.isRequestPinAppWidgetSupported &&
            manager.requestPinAppWidget(ComponentName(context, DhikrWidgetProvider::class.java), null, null)
        call.resolve(JSObject().put("requested", requested))
    }

    companion object {
        private const val EVENT_OPEN = "openReminder"
        private const val MAX_CUSTOM_BYTES = 2 * 1024 * 1024
    }
}
