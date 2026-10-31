package com.dithar.app.audioadhkar

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.media.AudioManager
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
import org.json.JSONArray
import org.json.JSONObject

/**
 * Bridge between DITHAR's web UI (lib/audioAdhkarNative.ts) and native
 * scheduled Audio Adhkar (Morning, Evening, Misc): stores the schedules,
 * playlists and adhan windows, arms the alarms, forwards Pause/Resume/Stop to the playback service, and relays
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
        AudioAdhkarPlaybackService.setCompletionListener { notifyListeners(EVENT_COMPLETIONS, JSObject()) }
        AudioAdhkarPlaybackService.setSessionStartListener { notifyListeners(EVENT_SESSION_STARTED, JSObject()) }
        AudioAdhkarPlaybackService.setAdhanStateListener { state ->
            notifyListeners(EVENT_ADHAN_STATE, JSObject().put("state", state ?: JSONObject.NULL))
        }
    }

    override fun handleOnDestroy() {
        AudioAdhkarPlaybackService.setStateListener(null)
        AudioAdhkarPlaybackService.setCompletionListener(null)
        AudioAdhkarPlaybackService.setSessionStartListener(null)
        AudioAdhkarPlaybackService.setAdhanStateListener(null)
        super.handleOnDestroy()
    }

    /**
     * Saves every section's settings and playlist and the adhan windows,
     * then (re)arms — or cancels — each section's alarms. Safe to call
     * repeatedly: it always replaces.
     */
    @PluginMethod
    fun setSchedules(call: PluginCall) {
        val store = AudioAdhkarStore(context)
        val windows = call.getArray("adhanWindows") ?: JSArray()
        store.adhanWindows = (0 until windows.length()).map { i ->
            val w = windows.getJSONArray(i)
            Window(w.getLong(0), w.getLong(1))
        }
        call.getString("language")?.let { store.language = it }
        for (section in Section.values()) {
            val obj = call.getObject(section.key) ?: JSObject()
            val prefs = store.section(section)
            val items = obj.optJSONArray("playlist") ?: JSArray()
            prefs.enabled = obj.optBoolean("enabled", false)
            prefs.startMinutes = obj.optInt("startMinutes", -1)
            prefs.playlist = (0 until items.length()).map { i -> AudioAdhkarStore.parseItem(items.getJSONObject(i)) }
            if (section.isDaily) {
                prefs.reminderSound = ReminderSounds.sanitize(obj.optString("reminderSound", ""), section)
                // Absent (an older app build) → null: the plain daily start time.
                prefs.slots = obj.optJSONArray("slots")?.let { array ->
                    (0 until array.length()).map { i ->
                        val slot = array.getJSONArray(i)
                        DailySlot(slot.getLong(0), slot.getLong(1), slot.getLong(2), slot.optLong(3, 0L))
                    }
                }
            }
            if (section == Section.MISC) {
                prefs.endMinutes = obj.optInt("endMinutes", -1)
                prefs.intervalMinutes = obj.optInt("intervalMinutes", 0)
                prefs.language = if (obj.optString("language") == "en") "en" else "ar"
                // The weekly schedule (absent from an older app build → none).
                prefs.dayStarts = obj.optJSONArray("dayStartMinutes")?.let { array -> WeeklyStart.parse((0 until array.length()).map { array.optInt(it, -1) }) }
                // Misc's own start/end on chosen weekdays (absent from an older app build → the usual times).
                prefs.dayTimes = obj.optJSONObject("dayTimes")?.let { o ->
                    val list = { name: String -> o.optJSONArray(name)?.let { a -> (0 until a.length()).map { a.optInt(it, -1) } } }
                    MiscDayTimes.parse(list("startMinutes"), list("endMinutes"))
                }
                // Fridays and Islamic occasions.
                prefs.occasionsEnabled = obj.optBoolean("occasionsEnabled", true)
                prefs.occasionWindows = obj.optJSONArray("occasions")?.let { array ->
                    (0 until array.length()).map { i -> val w = array.getJSONArray(i); OccasionWindow(w.getLong(0), w.getLong(1), w.getString(2)) }
                } ?: emptyList()
                prefs.occasionPlaylists = obj.optJSONObject("occasionPlaylists")?.let { playlists ->
                    playlists.keys().asSequence().associateWith { k ->
                        val array = playlists.getJSONArray(k)
                        (0 until array.length()).map { i -> AudioAdhkarStore.parseItem(array.getJSONObject(i)) }
                    }
                } ?: emptyMap()
            }
        }
        val results = AudioAdhkarScheduler.rescheduleAll(context)
        val response = JSObject().put("exact", AudioAdhkarScheduler.canScheduleExact(context))
        for ((section, result) in results) {
            response.put(
                section.key,
                JSObject()
                    .put("scheduledAt", result?.scheduledAt ?: JSONObject.NULL)
                    .put("warningAt", result?.warningAt ?: JSONObject.NULL),
            )
        }
        call.resolve(response)
    }

    /**
     * The app's own volume per kind of audio ({ adhan, morning, evening, misc },
     * gains 0–1): stored for every later session and applied at once to one
     * playing now. The phone's media volume is never changed.
     */
    @PluginMethod
    fun setVolumes(call: PluginCall) {
        for (key in VolumePolicy.KEYS) {
            val level = call.getDouble(key) ?: continue
            store.setVolume(key, level.toFloat())
        }
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_APPLY_VOLUME)
        call.resolve()
    }

    /** Repetitions the background player completed that the app hasn't taken in yet. */
    @PluginMethod
    fun getCompletions(call: PluginCall) {
        call.resolve(JSObject().put("completions", JSArray(store.completions())))
    }

    /**
     * Where the current repetition is: { active, positionMs, durationMs | null, loading }.
     * Read-only (it changes nothing); read on the main thread, where the player lives.
     */
    @PluginMethod
    fun getPlaybackProgress(call: PluginCall) {
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            call.resolve(JSObject.fromJSONObject(AudioAdhkarPlaybackService.currentProgress()))
        }
    }

    /** The app took these in (by id): forget them. Safe to repeat. */
    @PluginMethod
    fun acknowledgeCompletions(call: PluginCall) {
        val ids = call.getArray("ids") ?: JSArray()
        store.acknowledgeCompletions((0 until ids.length()).map { ids.getString(it) }.toSet())
        call.resolve()
    }

    /** «الذكر التالي»: skips the rest of the dhikr playing now (never counted) for the next one. */
    @PluginMethod
    fun next(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_NEXT_DHIKR)
        call.resolve()
    }

    @PluginMethod
    fun getPlaybackState(call: PluginCall) {
        call.resolve(
            JSObject()
                .put("state", AudioAdhkarPlaybackService.lastState ?: JSONObject.NULL)
                // Anything playing natively — the adhan included, which has no adhkar state.
                .put("busy", AudioAdhkarPlaybackService.isSessionActive)
                // A call (or ringing): the Settings volume preview never plays over it.
                .put("inCall", CallState.isCall(context.getSystemService(AudioManager::class.java)?.mode ?: AudioManager.MODE_NORMAL)),
        )
    }

    /**
     * «استماع»: plays one dhikr now in the background playback service (so it
     * continues with the screen off). { collection, item } — item as in a
     * playlist; or { collection, items } for «تشغيل الكل» (Play All): the
     * section's items one after another. Resolves { started: false } when
     * refused (e.g. the adhan plays).
     */
    @PluginMethod
    fun playNow(call: PluginCall) {
        val item = call.getObject("item")
        val items = call.getArray("items")
        val section = Section.values().firstOrNull { it.key == call.getString("collection") }
        if ((item == null && items == null) || section == null) {
            call.reject("collection and item are required")
            return
        }
        // «تشغيل الكل» (Play All): every item of the section, one after another.
        val all = items?.let { array -> (0 until array.length()).map { array.getJSONObject(it) } }
        val valid = try {
            (all ?: listOf(item!!)).forEach { AudioAdhkarStore.parseItem(it) }
            all == null || all.isNotEmpty()
        } catch (_: Exception) {
            false
        }
        if (!valid) {
            call.reject("invalid item")
            return
        }
        val started = if (all != null) {
            AudioAdhkarPlaybackService.playAllNow(context, section, JSONArray(all))
        } else {
            AudioAdhkarPlaybackService.playNow(context, section, item!!)
        }
        call.resolve(JSObject().put("started", started))
    }

    /**
     * A Morning/Evening session the adhan interrupted that the user can still
     * resume: { section, index, repetition, count, expiresAt } — or
     * { pending: null }. Read-only.
     */
    @PluginMethod
    fun getPendingResume(call: PluginCall) {
        val now = System.currentTimeMillis()
        val found = Section.values().filter { it.isDaily }.firstNotNullOfOrNull { section ->
            val prefs = store.section(section)
            prefs.savedProgress?.takeIf { ResumePrompt.canResume(it, now, prefs.enabled) }?.let { section to it }
        }
        val pending = found?.let { (section, saved) ->
            JSObject()
                .put("section", section.key)
                .put("index", saved.index)
                .put("repetition", saved.repetition)
                .put("count", store.section(section).playlist.size)
                .put("expiresAt", saved.expiresAt)
        }
        call.resolve(JSObject().put("pending", pending ?: JSONObject.NULL))
    }

    /** The in-app "Resume Adhkar": continues the section's saved session. { started } */
    @PluginMethod
    fun resumeSaved(call: PluginCall) {
        val section = Section.values().firstOrNull { it.key == call.getString("section") && it.isDaily }
        if (section == null) {
            call.reject("section must be morning or evening")
            return
        }
        call.resolve(JSObject().put("started", AudioAdhkarPlaybackService.resumeSaved(context, section)))
    }

    /** Stops a «استماع» session only — never a scheduled one or the adhan. */
    @PluginMethod
    fun stopManual(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_STOP_MANUAL)
        call.resolve()
    }

    /**
     * The Audio Adhkar master switch turned off (after setSchedules cancelled
     * every alarm): stops a scheduled session that is playing — never
     * «استماع» or the adhan — and removes the pending notices (the one-minute
     * warning, tap-to-start, the prayer-pause note).
     */
    @PluginMethod
    fun stopScheduled(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_STOP_SCHEDULED)
        context.getSystemService(android.app.NotificationManager::class.java)?.let { manager ->
            manager.cancel(AudioAdhkarWarningReceiver.NOTIFICATION_ID)
            manager.cancel(AudioAdhkarPlaybackService.TAP_TO_START_NOTIFICATION_ID)
            manager.cancel(AudioAdhkarPauseReceiver.NOTIFICATION_ID)
        }
        // setSchedules (master off) already cancelled every section, which forgets interrupted sessions; be explicit.
        for (section in Section.values().filter { it.isDaily }) AudioAdhkarScheduler.clearSavedProgress(context, section, "master switch off")
        AudioAdhkarTrace.log(context, "app", "master switch off: scheduled playback stopped, notices cleared")
        call.resolve()
    }

    /** Settings: plays a reminder sound once on the notification stream. { played } */
    @PluginMethod
    fun previewReminderSound(call: PluginCall) {
        call.resolve(JSObject().put("played", ReminderSounds.preview(context, call.getString("sound") ?: "")))
    }

    @PluginMethod
    fun stopReminderSoundPreview(call: PluginCall) {
        ReminderSounds.stopPreview()
        call.resolve()
    }

    /** The app's side of the trace (which player «استماع» used, why playback was stopped from the UI …). */
    @PluginMethod
    fun log(call: PluginCall) {
        AudioAdhkarTrace.log(context, "app", call.getString("message") ?: "")
        call.resolve()
    }

    /** The full diagnostics report (device, permissions, battery, exit reasons, trace) as text. */
    @PluginMethod
    fun getDiagnosticsReport(call: PluginCall) {
        call.resolve(JSObject().put("report", AudioAdhkarTrace.report(context)))
    }

    /** Opens Android's share sheet with the report as a .txt file (e-mail, WhatsApp, Drive, Files …). */
    @PluginMethod
    fun shareDiagnostics(call: PluginCall) {
        try {
            val file = java.io.File(context.cacheDir, "dithar-audio-diagnostics.txt")
            file.writeText(AudioAdhkarTrace.report(context))
            val uri = androidx.core.content.FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND)
                .setType("text/plain")
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, "DITHAR audio diagnostics")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            context.startActivity(Intent.createChooser(send, "DITHAR diagnostics").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION))
            call.resolve()
        } catch (e: Exception) {
            call.reject("could not share diagnostics: ${e.message}")
        }
    }

    @PluginMethod
    fun clearDiagnostics(call: PluginCall) {
        AudioAdhkarTrace.clear(context)
        call.resolve()
    }

    /** The adhan playing now (null when none) — the Home screen player shows it like a dhikr. */
    @PluginMethod
    fun getAdhanState(call: PluginCall) {
        call.resolve(JSObject().put("state", AudioAdhkarPlaybackService.lastAdhanState ?: JSONObject.NULL))
    }

    /** Where the adhan is within its segment (read-only; read on the main thread, where the player lives). */
    @PluginMethod
    fun getAdhanProgress(call: PluginCall) {
        android.os.Handler(android.os.Looper.getMainLooper()).post {
            call.resolve(JSObject.fromJSONObject(AudioAdhkarPlaybackService.currentAdhanProgress()))
        }
    }

    /** Pause / resume / stop that act on the adhan only — never on an adhkar session that replaced it meanwhile. */
    @PluginMethod
    fun pauseAdhan(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_PAUSE_ADHAN)
        call.resolve()
    }

    @PluginMethod
    fun resumeAdhan(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_RESUME_ADHAN)
        call.resolve()
    }

    @PluginMethod
    fun stopAdhan(call: PluginCall) {
        AudioAdhkarPlaybackService.command(context, AudioAdhkarPlaybackService.ACTION_STOP_ADHAN)
        call.resolve()
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
                .put("scheduledAt", store.scheduledOccurrence)
                .put("backgroundLaunchManaged", BackgroundLaunchManager.isManaged(Build.MANUFACTURER, Build.BRAND)),
        )
    }

    /**
     * HONOR/Huawei: opens the phone's "App launch" page, where DITHAR can be
     * set to manage manually (auto-launch, secondary launch, run in
     * background) so its alarms aren't held after a swipe from Recents.
     * Falls back to DITHAR's app-info page when that screen isn't there.
     */
    @PluginMethod
    fun openBackgroundLaunchSettings(call: PluginCall) {
        val candidates = listOf(
            ComponentName("com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
            ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
        ).map { Intent().setComponent(it) } +
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
        val opened = candidates.firstOrNull { intent ->
            try {
                context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                true
            } catch (_: Exception) {
                false
            }
        }
        AudioAdhkarTrace.log(context, "app", "background launch settings opened: ${opened?.component?.className ?: opened?.action ?: "none"}")
        call.resolve()
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
        private const val EVENT_COMPLETIONS = "completions"
        private const val EVENT_SESSION_STARTED = "sessionStarted"
        private const val EVENT_ADHAN_STATE = "adhanState"
    }
}
