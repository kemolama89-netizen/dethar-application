package com.dithar.app.prayernotifications

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native copy of the upcoming prayer notifications. JS stays the source of
 * truth (it computes them from the app's prayer times and the user's
 * choices and pushes them via PrayerNotificationsPlugin#setSchedule); this
 * copy exists so the alarm, the receiver and the reboot receiver work
 * while the app isn't running.
 */
class PrayerNotificationStore(context: Context) {
    private val appContext: Context = context.applicationContext
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var entries: List<PrayerNotification>
        get() = parse(prefs.getString(KEY_ENTRIES, null))
        set(value) = prefs.edit().putString(KEY_ENTRIES, serialize(value)).apply()

    /** The latest prayer time already posted (or dropped as stale) — never posted again. Written synchronously. */
    var lastPosted: Long
        get() = prefs.getLong(KEY_LAST_POSTED, 0L)
        set(value) {
            prefs.edit().putLong(KEY_LAST_POSTED, value).commit()
        }

    /** The adhan settings per section ("regular", "fajr"); absent = auto-adhan off for it. */
    fun adhanConfig(section: String): AdhanConfig? = parseAdhan(prefs.getString(KEY_ADHAN + section, null))

    fun setAdhanConfig(section: String, raw: JSONObject?) {
        prefs.edit().apply { if (raw == null) remove(KEY_ADHAN + section) else putString(KEY_ADHAN + section, raw.toString()) }.apply()
    }

    /** The voice the last adhan of a section played, when, and which announced-next token it used. */
    fun adhanLast(section: String): Triple<String?, Long, String?> = Triple(
        prefs.getString(KEY_ADHAN_LAST_VOICE + section, null),
        prefs.getLong(KEY_ADHAN_LAST_AT + section, 0L),
        prefs.getString(KEY_ADHAN_LAST_TOKEN + section, null),
    )

    fun recordAdhan(section: String, voiceId: String, at: Long, token: String?) {
        prefs.edit()
            .putString(KEY_ADHAN_LAST_VOICE + section, voiceId)
            .putLong(KEY_ADHAN_LAST_AT + section, at)
            .putString(KEY_ADHAN_LAST_TOKEN + section, token)
            .commit()
    }

    /** A short on-device log (newest last, capped) — shown in Settings so a real-device test can see what fired. */
    fun appendEvent(message: String) {
        com.dithar.app.audioadhkar.AudioAdhkarTrace.log(appContext, "prayer", message)
        val events = recentEvents().toMutableList()
        events.add("${System.currentTimeMillis()}|$message")
        while (events.size > MAX_EVENTS) events.removeAt(0)
        prefs.edit().putString(KEY_EVENTS, JSONArray(events).toString()).commit()
    }

    fun recentEvents(): List<String> = try {
        val array = JSONArray(prefs.getString(KEY_EVENTS, "[]"))
        (0 until array.length()).map { array.getString(it) }
    } catch (_: Exception) {
        emptyList()
    }

    /** When the armed alarm fires (epoch millis), 0 when none. */
    var scheduledAt: Long
        get() = prefs.getLong(KEY_SCHEDULED, 0L)
        set(value) = prefs.edit().putLong(KEY_SCHEDULED, value).apply()

    /** "<at>:<alarm mode>" of the armed alarm — logged only when it changes. */
    var scheduledKey: String
        get() = prefs.getString(KEY_SCHEDULED_KEY, "") ?: ""
        set(value) = prefs.edit().putString(KEY_SCHEDULED_KEY, value).apply()

    companion object {
        private const val PREFS_NAME = "dithar_prayer_notifications"
        private const val KEY_ENTRIES = "entries"
        private const val KEY_LAST_POSTED = "last_posted"
        private const val KEY_SCHEDULED = "scheduled_at"
        private const val KEY_SCHEDULED_KEY = "scheduled_key"
        private const val KEY_ADHAN = "adhan_config_"
        private const val KEY_EVENTS = "events"
        private const val MAX_EVENTS = 40
        private const val KEY_ADHAN_LAST_VOICE = "adhan_last_voice_"
        private const val KEY_ADHAN_LAST_AT = "adhan_last_at_"
        private const val KEY_ADHAN_LAST_TOKEN = "adhan_last_token_"

        fun serialize(entries: List<PrayerNotification>): String = JSONArray(
            entries.map { JSONObject().put("prayer", it.prayer).put("at", it.at).put("title", it.title).put("body", it.body).put("notify", it.notify).put("prayerAt", it.prayerAt) },
        ).toString()

        fun parse(raw: String?): List<PrayerNotification> {
            if (raw.isNullOrEmpty()) return emptyList()
            return try {
                val array = JSONArray(raw)
                (0 until array.length()).map { parseEntry(array.getJSONObject(it)) }
            } catch (_: Exception) {
                emptyList()
            }
        }

        fun parseEntry(obj: JSONObject) = PrayerNotification(
            prayer = obj.getString("prayer"),
            at = obj.getLong("at"),
            title = obj.getString("title"),
            body = obj.getString("body"),
            notify = obj.optBoolean("notify", true),
            prayerAt = obj.optLong("prayerAt", obj.getLong("at")),
        )

        fun parseAdhan(raw: String?): AdhanConfig? {
            if (raw.isNullOrEmpty()) return null
            return try {
                val obj = JSONObject(raw)
                val voices = obj.getJSONArray("voices")
                AdhanConfig(
                    rotate = obj.optBoolean("rotate", false),
                    voices = (0 until voices.length()).map { i ->
                        val v = voices.getJSONObject(i)
                        AdhanVoice(v.getString("id"), v.optString("name"), v.getString("assetPath"), v.getLong("startMillis"), v.getLong("endMillis"), v.optString("muezzin"))
                    }.filter { it.endMillis > it.startMillis },
                    nextVoiceId = obj.optString("nextVoiceId").ifEmpty { null },
                    nextToken = obj.optString("nextToken").ifEmpty { null },
                )
            } catch (_: Exception) {
                null
            }
        }
    }
}
