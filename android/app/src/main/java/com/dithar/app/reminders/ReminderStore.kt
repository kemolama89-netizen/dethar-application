package com.dithar.app.reminders

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Native copy of the reminder, widget and end-of-day-summary settings and
 * content (JS stays the source of truth — RemindersPlugin receives them), so
 * alarms, the widget and the summary work while the app isn't running.
 */
class ReminderStore(context: Context) {
    private val appContext = context.applicationContext
    private val prefs: SharedPreferences = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private fun putIfChanged(key: String, value: String) {
        if (prefs.getString(key, null) != value) prefs.edit().putString(key, value).apply()
    }

    // ---- reminders --------------------------------------------------------

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", false)
        set(value) = prefs.edit().putBoolean("enabled", value).apply()

    var notifications: Boolean
        get() = prefs.getBoolean("notifications", true)
        set(value) = prefs.edit().putBoolean("notifications", value).apply()

    var categories: Set<String>
        get() = prefs.getStringSet("categories", ReminderRotation.CATEGORIES.toSet()) ?: emptySet()
        set(value) = prefs.edit().putStringSet("categories", value).apply()

    var intervalMinutes: Int
        get() = prefs.getInt("interval_minutes", 180)
        set(value) = prefs.edit().putInt("interval_minutes", value).apply()

    var startMinutes: Int
        get() = prefs.getInt("start_minutes", 9 * 60)
        set(value) = prefs.edit().putInt("start_minutes", value).apply()

    var endMinutes: Int
        get() = prefs.getInt("end_minutes", 21 * 60)
        set(value) = prefs.edit().putInt("end_minutes", value).apply()

    /** Tapping a reminder opens the full-screen reflection. */
    var fullScreen: Boolean
        get() = prefs.getBoolean("full_screen", true)
        set(value) = prefs.edit().putBoolean("full_screen", value).apply()

    var language: String
        get() = if (prefs.getString("language", "ar") == "en") "en" else "ar"
        set(value) = prefs.edit().putString("language", if (value == "en") "en" else "ar").apply()

    /** The weekly schedule (Sunday first, -1 = none), or null. */
    var dayStarts: List<Int>?
        get() = prefs.getString("day_starts", null)?.let { raw ->
            try {
                val a = JSONArray(raw)
                (0 until a.length()).map { a.getInt(it) }.takeIf { it.size == 7 }
            } catch (_: Exception) {
                null
            }
        }
        set(value) {
            if (value == null) prefs.edit().remove("day_starts").apply() else putIfChanged("day_starts", JSONArray(value).toString())
        }

    var pool: List<ReminderItem>
        get() = try {
            val a = JSONArray(prefs.getString("pool", "[]"))
            (0 until a.length()).map { parseItem(a.getJSONObject(it)) }
        } catch (_: Exception) {
            emptyList()
        }
        set(value) = putIfChanged("pool", JSONArray(value.map(::itemJson)).toString())

    /** When the last reminder came (the interval runs from it). Written synchronously. */
    var lastFired: Long
        get() = prefs.getLong("last_fired", 0L)
        set(value) {
            prefs.edit().putLong("last_fired", value).commit()
        }

    /** The widget's comment memory (WidgetRotation.CommentMemory): no comment twice in a row. */
    var widgetComments: WidgetRotation.CommentMemory
        get() = WidgetRotation.CommentMemory(prefs.getLong("widget_comment_slot", Long.MIN_VALUE), prefs.getString("widget_comment", null), prefs.getString("widget_comment_previous", null))
        set(value) {
            prefs.edit().putLong("widget_comment_slot", value.slot).putString("widget_comment", value.shown).putString("widget_comment_previous", value.previous).apply()
        }

    /** The widget's rotation slot, advanced once per delivered reminder (WidgetRotation.advance); -1 before the first. Written synchronously. */
    var widgetSlot: Long
        get() = prefs.getLong("widget_slot", -1L)
        set(value) {
            prefs.edit().putLong("widget_slot", value).commit()
        }

    /** What the widget last drew (WidgetPreview.Drawn), for Home's preview; null before it has drawn an item, or once removed. */
    var widgetDrawn: WidgetPreview.Drawn?
        get() = try {
            prefs.getString("widget_drawn", null)?.let { raw ->
                val o = JSONObject(raw)
                val open = ReminderOpen(
                    id = o.getString("id"),
                    category = o.optString("category"),
                    title = o.optString("title"),
                    text = o.optString("text"),
                    meaning = o.optString("meaning"),
                    detail = o.optString("detail"),
                    source = o.optString("source"),
                    commentId = if (o.isNull("commentId")) null else o.optString("commentId"),
                    commentText = if (o.isNull("commentText")) null else o.optString("commentText"),
                )
                WidgetPreview.Drawn(open, o.getLong("slot"))
            }
        } catch (_: Exception) {
            null
        }
        set(value) {
            if (value == null) {
                prefs.edit().remove("widget_drawn").apply()
                return
            }
            val o = value.open
            val json = JSONObject()
                .put("slot", value.slot)
                .put("id", o.id)
                .put("category", o.category)
                .put("title", o.title)
                .put("text", o.text)
                .put("meaning", o.meaning)
                .put("detail", o.detail)
                .put("source", o.source)
                .put("commentId", o.commentId ?: JSONObject.NULL)
                .put("commentText", o.commentText ?: JSONObject.NULL)
            putIfChanged("widget_drawn", json.toString())
        }

    var lastCategory: String?
        get() = prefs.getString("last_category", null)
        set(value) = prefs.edit().putString("last_category", value).apply()

    var recent: List<String>
        get() = try {
            val a = JSONArray(prefs.getString("recent", "[]"))
            (0 until a.length()).map { a.getString(it) }
        } catch (_: Exception) {
            emptyList()
        }
        set(value) = prefs.edit().putString("recent", JSONArray(value).toString()).apply()

    /** The reminder the widget shows (the latest one), or null. */
    var currentId: String?
        get() = prefs.getString("current_id", null)
        set(value) = prefs.edit().putString("current_id", value).apply()

    /** The comment shown with it, or null. */
    var currentCommentId: String?
        get() = prefs.getString("current_comment_id", null)
        set(value) = prefs.edit().putString("current_comment_id", value).apply()

    /** Recently shown comment ids, oldest first (so an item seen again gets a different comment). */
    var recentComments: List<String>
        get() = try {
            val a = JSONArray(prefs.getString("recent_comments", "[]"))
            (0 until a.length()).map { a.getString(it) }
        } catch (_: Exception) {
            emptyList()
        }
        set(value) = prefs.edit().putString("recent_comments", JSONArray(value).toString()).apply()

    // ---- widget colors (the app's palette — theme/palettes.ts) ------------

    /** The title / heart color over the widget's background. */
    var widgetAccent: Int
        get() = prefs.getInt("widget_accent", DEFAULT_ACCENT)
        set(value) = prefs.edit().putInt("widget_accent", value).apply()

    /** The palette's primary, laid lightly over the background (with the readability scrim). */
    var widgetTint: Int
        get() = prefs.getInt("widget_tint", DEFAULT_TINT)
        set(value) = prefs.edit().putInt("widget_tint", value).apply()

    // ---- widget background -----------------------------------------------

    /** "auto" | "fixed" | "custom". */
    var backgroundMode: String
        get() = prefs.getString("background_mode", "auto") ?: "auto"
        set(value) = prefs.edit().putString("background_mode", value).apply()

    var fixedBackground: String
        get() = prefs.getString("fixed_background", "mosque-night") ?: "mosque-night"
        set(value) = prefs.edit().putString("fixed_background", value).apply()

    /** Latitude for the season (null when not reliable — the season is then left out). */
    var latitude: Double?
        get() = if (prefs.contains("latitude")) prefs.getFloat("latitude", 0f).toDouble() else null
        set(value) {
            if (value == null) prefs.edit().remove("latitude").apply() else prefs.edit().putFloat("latitude", value.toFloat()).apply()
        }

    /** The user's own background photo (already cropped and downscaled in the app). */
    val customBackgroundFile: File get() = File(appContext.filesDir, CUSTOM_BACKGROUND_FILE)

    // ---- end-of-day summary ----------------------------------------------

    var summaryEnabled: Boolean
        get() = prefs.getBoolean("summary_enabled", false)
        set(value) = prefs.edit().putBoolean("summary_enabled", value).apply()

    var summaryMinutes: Int
        get() = prefs.getInt("summary_minutes", 21 * 60 + 30)
        set(value) = prefs.edit().putInt("summary_minutes", value).apply()

    /** "combined" | "stats" | "motivational". */
    var summaryMode: String
        get() = prefs.getString("summary_mode", "combined") ?: "combined"
        set(value) = prefs.edit().putString("summary_mode", value).apply()

    /** The local date whose summary was already posted (never twice a day). Written synchronously. */
    var summaryPostedFor: String?
        get() = prefs.getString("summary_posted_for", null)
        set(value) {
            prefs.edit().putString("summary_posted_for", value).commit()
        }

    /** Today's activity as JS last pushed it (lib/dailySummary.ts), or null. */
    val summarySnapshot: DailySummary.Snapshot?
        get() = readSnapshot("summary_snapshot")

    /**
     * The snapshot of [day]: the latest one, or the one before it when the app was opened after
     * midnight before a late summary of the previous day went out — so that summary still has
     * that day's records.
     */
    fun summarySnapshotFor(day: String): DailySummary.Snapshot? =
        summarySnapshot?.takeIf { it.date == day } ?: readSnapshot("summary_snapshot_previous")?.takeIf { it.date == day }

    /** Keeps the previous day's last snapshot when a new day's first one arrives. */
    fun setSummarySnapshotJson(json: JSONObject) {
        val current = prefs.getString("summary_snapshot", null)
        val currentDate = current?.let { runCatching { JSONObject(it).optString("date") }.getOrNull() }
        if (current != null && currentDate != null && currentDate != json.optString("date")) {
            prefs.edit().putString("summary_snapshot_previous", current).apply()
        }
        putIfChanged("summary_snapshot", json.toString())
    }

    // ---- time-based content notifications (TimedContentScheduler) -------------

    /** The entries as the app last pushed them (lib/timedContent.ts). */
    var timedEntriesJson: String?
        get() = prefs.getString("timed_entries", null)
        set(value) = putIfChanged("timed_entries", value ?: "[]")

    val timedEntries: List<TimedEntry>
        get() = timedEntriesJson?.let { raw -> runCatching { TimedContentPlan.parse(JSONArray(raw)) }.getOrNull() } ?: emptyList()

    /** Keys already posted (each entry once), newest last. Written synchronously. */
    var timedPosted: List<String>
        get() = prefs.getString("timed_posted", null)?.let { raw -> runCatching { JSONArray(raw).let { a -> (0 until a.length()).map { a.getString(it) } } }.getOrNull() } ?: emptyList()
        set(value) {
            prefs.edit().putString("timed_posted", JSONArray(value).toString()).commit()
        }

    /** The summary's encouragement library as the app pushed it, in the interface language (DailySummaryEncouragement). */
    var summaryEncouragements: List<DailySummaryEncouragement.Item>
        get() = prefs.getString("summary_encouragements", null)?.let { raw -> runCatching { DailySummaryEncouragement.parse(JSONArray(raw)) }.getOrNull() } ?: emptyList()
        set(value) = putIfChanged("summary_encouragements", DailySummaryEncouragement.toJson(value).toString())

    /** Library ids shown in recent summaries, newest last (rotation). */
    var summaryRecentEncouragements: List<String>
        get() = prefs.getString("summary_recent_encouragements", null)?.let { raw ->
            runCatching { JSONArray(raw).let { a -> (0 until a.length()).map { a.getString(it) } } }.getOrNull()
        } ?: emptyList()
        set(value) = prefs.edit().putString("summary_recent_encouragements", JSONArray(value).toString()).apply()

    /** True when a snapshot is stored but can't be read: the day's records are then unknown. */
    val summarySnapshotUnreadable: Boolean
        get() = prefs.getString("summary_snapshot", null) != null && summarySnapshot == null

    /** The last local day the app was opened (RemindersPlugin): with no snapshot of that day, its records are unknown. */
    var appOpenedOn: String?
        get() = prefs.getString("app_opened_on", null)
        set(value) {
            prefs.edit().putString("app_opened_on", value).apply()
        }

    /** The local day the armed summary alarm is for (RemindersScheduler.armSummary). */
    var summaryDueFor: String?
        get() = prefs.getString("summary_due_for", null)
        set(value) {
            prefs.edit().putString("summary_due_for", value).apply()
        }

    private fun readSnapshot(key: String): DailySummary.Snapshot? = try {
        prefs.getString(key, null)?.let(::parseSnapshot)
    } catch (_: Exception) {
        null
    }

    companion object {
        private const val PREFS_NAME = "dithar_reminders"
        const val CUSTOM_BACKGROUND_FILE = "widget_background.jpg"
        /** The original look: the warm gold title over the navy-tinted scrim. */
        const val DEFAULT_ACCENT = 0xFFE6D5A7.toInt()
        const val DEFAULT_TINT = 0xFF12213F.toInt()

        fun parseItem(o: JSONObject) = ReminderItem(
            id = o.getString("id"),
            category = o.getString("category"),
            title = o.optString("title"),
            text = o.getString("text"),
            meaning = o.optString("meaning"),
            source = o.optString("source"),
            theme = o.optString("theme"),
            comments = o.optJSONArray("comments")?.let { a ->
                (0 until a.length()).mapNotNull { i -> a.optJSONObject(i)?.let { c -> ReminderComment(c.optString("id"), c.optString("text"), c.optBoolean("widget", true)).takeIf { it.id.isNotEmpty() && it.text.isNotEmpty() } } }
            } ?: emptyList(),
            widget = o.optBoolean("widget", true),
            detail = o.optString("detail"),
            widgetText = o.optString("widgetText"),
        )

        fun itemJson(i: ReminderItem): JSONObject = JSONObject()
            .put("id", i.id)
            .put("category", i.category)
            .put("title", i.title)
            .put("text", i.text)
            .put("meaning", i.meaning)
            .put("source", i.source)
            .put("theme", i.theme)
            .put("comments", JSONArray(i.comments.map { JSONObject().put("id", it.id).put("text", it.text).put("widget", it.widget) }))
            .put("widget", i.widget)
            .put("detail", i.detail)
            .put("widgetText", i.widgetText)

        /** "#rrggbb" → an opaque ARGB color, or null. */
        fun parseColor(value: String?): Int? {
            if (value == null || !Regex("^#[0-9a-fA-F]{6}$").matches(value)) return null
            return (0xFF000000.toInt()) or value.substring(1).toInt(16)
        }

        fun parseSnapshot(raw: String): DailySummary.Snapshot {
            val o = JSONObject(raw)
            val t = o.getJSONObject("today")
            val wirds = t.optJSONArray("wirds")?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()
            val history = o.optJSONArray("history")?.let { a -> (0 until a.length()).map { val h = a.getJSONObject(it); h.getString("date") to h.optInt("total", 0) } } ?: emptyList()
            val audio = o.optJSONObject("audio")?.let { a ->
                DailySummary.Listening(
                    plays = a.optInt("completedPlays", 0),
                    sessions = a.optInt("sessions", 0),
                    playsWithoutSession = a.optInt("playsWithoutSession", 0),
                    listenedMs = a.optLong("listenedMs", 0L),
                    playsWithoutDuration = a.optInt("playsWithoutDuration", 0),
                    titles = a.optJSONArray("titles")?.let { arr -> (0 until arr.length()).map { arr.getString(it) } } ?: emptyList(),
                    stoppedEarly = a.optInt("stoppedEarlyPlays", 0),
                )
            }
            val taken = o.optJSONObject("taken")
            val allTime = o.optJSONObject("allTime")?.let { a ->
                DailySummary.AllTime(a.optInt("morningDays", 0), a.optInt("eveningDays", 0), a.optInt("prayerSessions", 0), a.optInt("tasbeeh", 0), a.optInt("written", 0))
            }
            return DailySummary.Snapshot(
                date = o.getString("date"),
                today = DailySummary.Activity(t.optInt("writtenRepetitions", 0), t.optInt("tasbeehRepetitions", 0), wirds, t.optInt("prayerSessions", 0)),
                history = history,
                trackedSince = if (o.isNull("trackedSince")) null else o.optString("trackedSince").ifEmpty { null },
                audio = audio,
                floatingThrough = taken?.takeIf { it.has("floatingThrough") && !it.isNull("floatingThrough") }?.optLong("floatingThrough"),
                audioIds = taken?.optJSONArray("audioIds")?.let { a -> (0 until a.length()).map { a.getString(it) }.toSet() } ?: emptySet(),
                allTime = allTime,
                recordsReadable = o.optString("status") != "unavailable",
            )
        }
    }
}
