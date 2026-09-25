package com.dithar.app.audioadhkar

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native persistence for scheduled Evening Audio Adhkar. JS stays the
 * source of truth for the user's settings and for WHICH recordings exist
 * (the playlist is built from the app's existing audio mapping and pushed
 * here via AudioAdhkarPlugin#setEveningSchedule); this copy exists so the
 * alarm, boot receiver and playback service can work while the app — and
 * its WebView — isn't running.
 */
class AudioAdhkarStore(context: Context) {
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var eveningEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, false)
        set(value) = prefs.edit().putBoolean(KEY_ENABLED, value).apply()

    /** Minutes after local midnight, or -1 when no start time is set. */
    var eveningStartMinutes: Int
        get() = prefs.getInt(KEY_START_MINUTES, -1)
        set(value) = prefs.edit().putInt(KEY_START_MINUTES, value).apply()

    /** The alarm currently armed (epoch millis), 0 when none. */
    var scheduledOccurrence: Long
        get() = prefs.getLong(KEY_SCHEDULED, 0L)
        set(value) = prefs.edit().putLong(KEY_SCHEDULED, value).apply()

    /** The last occurrence already consumed — never starts another session. Written synchronously. */
    var lastFiredOccurrence: Long
        get() = prefs.getLong(KEY_LAST_FIRED, 0L)
        set(value) {
            prefs.edit().putLong(KEY_LAST_FIRED, value).commit()
        }

    /** The playback occurrence whose one-minute warning was already shown. Written synchronously. */
    var lastWarnedOccurrence: Long
        get() = prefs.getLong(KEY_LAST_WARNED, 0L)
        set(value) {
            prefs.edit().putLong(KEY_LAST_WARNED, value).commit()
        }

    /**
     * A short on-device log of what the scheduler/receivers/service did
     * (newest last, capped) — shown in Settings so a real-device test can
     * tell whether an alarm fired, was skipped, or couldn't start playback.
     */
    fun appendEvent(message: String) {
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

    var eveningPlaylist: List<PlaylistItem>
        get() = parsePlaylist(prefs.getString(KEY_PLAYLIST, null))
        set(value) = prefs.edit().putString(KEY_PLAYLIST, serializePlaylist(value)).apply()

    companion object {
        private const val PREFS_NAME = "dithar_audio_adhkar"
        private const val KEY_ENABLED = "evening_enabled"
        private const val KEY_START_MINUTES = "evening_start_minutes"
        private const val KEY_SCHEDULED = "evening_scheduled_occurrence"
        private const val KEY_LAST_FIRED = "evening_last_fired_occurrence"
        private const val KEY_PLAYLIST = "evening_playlist"
        private const val KEY_LAST_WARNED = "evening_last_warned_occurrence"
        private const val KEY_EVENTS = "evening_events"
        private const val MAX_EVENTS = 20

        fun serializePlaylist(items: List<PlaylistItem>): String {
            val array = JSONArray()
            for (item in items) {
                array.put(
                    JSONObject()
                        .put("dhikrId", item.dhikrId)
                        .put("title", item.title)
                        .put("text", item.text)
                        .put("assetPath", item.assetPath)
                        .put("repetitions", item.repetitions),
                )
            }
            return array.toString()
        }

        fun parsePlaylist(raw: String?): List<PlaylistItem> {
            if (raw.isNullOrEmpty()) return emptyList()
            return try {
                val array = JSONArray(raw)
                (0 until array.length()).map { i ->
                    val obj = array.getJSONObject(i)
                    PlaylistItem(
                        dhikrId = obj.getString("dhikrId"),
                        title = obj.getString("title"),
                        text = obj.getString("text"),
                        assetPath = obj.getString("assetPath"),
                        repetitions = obj.getInt("repetitions").coerceAtLeast(1),
                    )
                }
            } catch (_: Exception) {
                emptyList()
            }
        }
    }
}
