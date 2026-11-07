package com.dithar.app.journey

import android.content.Context
import org.json.JSONObject

/** Native copy of the Journey notification's setting and notice (JS stays the source of truth), so the alarm works while the app isn't running. */
class JourneyStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("dithar_quran_journey", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) = prefs.edit().putBoolean("enabled", value).apply()

    var minutes: Int
        get() = prefs.getInt("minutes", 8 * 60)
        set(value) = prefs.edit().putInt("minutes", value.coerceIn(0, 24 * 60 - 1)).apply()

    /** The interface language, for the channel's name. */
    var language: String
        get() = prefs.getString("language", "ar") ?: "ar"
        set(value) = prefs.edit().putString("language", value).apply()

    /** The local day a notification was last posted for. */
    var postedFor: String?
        get() = prefs.getString("posted_for", null)
        set(value) = prefs.edit().putString("posted_for", value).apply()

    var notice: JourneyNotice?
        get() = prefs.getString("notice", null)?.let { raw ->
            try {
                parseNotice(JSONObject(raw))
            } catch (_: Exception) {
                null
            }
        }
        set(value) {
            prefs.edit().apply { if (value == null) remove("notice") else putString("notice", toJson(value).toString()) }.apply()
        }

    var scheduledAt: Long
        get() = prefs.getLong("scheduled_at", 0L)
        set(value) = prefs.edit().putLong("scheduled_at", value).apply()

    companion object {
        private val DATE = Regex("^\\d{4}-\\d{2}-\\d{2}$")
        private val INSIGHT = Regex("^\\d{1,3}:\\d{1,3}$")

        /** Null when anything is missing or invalid: no notification rather than a wrong one. */
        fun parseNotice(o: JSONObject): JourneyNotice? {
            val fromDate = o.optString("fromDate").takeIf { DATE.matches(it) } ?: return null
            val page = o.optInt("page", 0).takeIf { it in 1..604 } ?: return null
            val round = o.optInt("round", 0).takeIf { it >= 1 } ?: return null
            val insight = o.optString("insight").takeIf { INSIGHT.matches(it) } ?: return null
            val title = o.optString("title").takeIf { it.isNotBlank() } ?: return null
            val body = o.optString("body").takeIf { it.isNotBlank() } ?: return null
            return JourneyNotice(fromDate, page, round, insight, title, body)
        }

        fun toJson(n: JourneyNotice): JSONObject = JSONObject()
            .put("fromDate", n.fromDate).put("page", n.page).put("round", n.round)
            .put("insight", n.insight).put("title", n.title).put("body", n.body)
    }
}
