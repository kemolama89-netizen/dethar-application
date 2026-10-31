package com.dithar.app.audioadhkar

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.util.TimeZone
import java.util.UUID

/**
 * Native persistence for scheduled Audio Adhkar (Morning, Evening, Misc). JS stays the
 * source of truth for the user's settings and for WHICH recordings exist
 * (the playlist is built from the app's existing audio mapping and pushed
 * here via AudioAdhkarPlugin#setEveningSchedule); this copy exists so the
 * alarm, boot receiver and playback service can work while the app — and
 * its WebView — isn't running.
 */
class AudioAdhkarStore(context: Context) {
    private val appContext: Context = context.applicationContext
    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /** One section's settings, playlist and alarm bookkeeping (keys "<section>_…"; Evening's predate sections). */
    inner class SectionPrefs(val section: Section) {
        private fun key(name: String) = "${section.key}_$name"

        var enabled: Boolean
            get() = prefs.getBoolean(key("enabled"), false)
            set(value) = prefs.edit().putBoolean(key("enabled"), value).apply()

        /** Minutes after local midnight, or -1 when no start time is set. */
        var startMinutes: Int
            get() = prefs.getInt(key("start_minutes"), -1)
            set(value) = prefs.edit().putInt(key("start_minutes"), value).apply()

        /** Misc only: the window's end, minutes after local midnight (-1 = unset). */
        var endMinutes: Int
            get() = prefs.getInt(key("end_minutes"), -1)
            set(value) = prefs.edit().putInt(key("end_minutes"), value).apply()

        /** Misc only: minutes between two adhkar. */
        var intervalMinutes: Int
            get() = prefs.getInt(key("interval_minutes"), 0)
            set(value) = prefs.edit().putInt(key("interval_minutes"), value).apply()

        /** Misc only: which playlist item the next tick plays. */
        var nextIndex: Int
            get() = prefs.getInt(key("next_index"), 0)
            set(value) {
                prefs.edit().putInt(key("next_index"), value).commit()
            }

        var playlist: List<PlaylistItem>
            get() = parsePlaylist(prefs.getString(key("playlist"), null))
            set(value) = putIfChanged(key("playlist"), serializePlaylist(value))

        /**
         * Daily only: the planned sessions JS pushed ([DailySlot], one per day),
         * or null when none were ever pushed (an app version before the
         * prayer-time windows) — then the plain daily start time applies.
         */
        var slots: List<DailySlot>?
            get() = prefs.getString(key("slots"), null)?.let { raw ->
                try {
                    val array = JSONArray(raw)
                    (0 until array.length()).map { val s = array.getJSONArray(it); DailySlot(s.getLong(0), s.getLong(1), s.getLong(2), s.optLong(3, 0L)) }
                } catch (_: Exception) {
                    null
                }
            }
            set(value) {
                if (value == null) {
                    if (prefs.contains(key("slots"))) prefs.edit().remove(key("slots")).apply()
                } else {
                    putIfChanged(key("slots"), JSONArray(value.map { JSONArray(listOf(it.windowStart, it.start, it.windowEnd, it.notBefore)) }).toString())
                }
            }

        /** The occurrence currently armed (nominal start time / misc tick, epoch millis), 0 when none. */
        var scheduledOccurrence: Long
            get() = prefs.getLong(key("scheduled_occurrence"), 0L)
            set(value) = prefs.edit().putLong(key("scheduled_occurrence"), value).apply()

        /** The last occurrence already consumed — never starts another session. Written synchronously. */
        var lastFiredOccurrence: Long
            get() = prefs.getLong(key("last_fired_occurrence"), 0L)
            set(value) {
                prefs.edit().putLong(key("last_fired_occurrence"), value).commit()
            }

        /** The occurrence whose one-minute warning was already shown. Written synchronously. */
        var lastWarnedOccurrence: Long
            get() = prefs.getLong(key("last_warned_occurrence"), 0L)
            set(value) {
                prefs.edit().putLong(key("last_warned_occurrence"), value).commit()
            }

        /** Daily only: the one-minute reminder's sound (ReminderSounds id, or "off"). */
        var reminderSound: String
            get() = ReminderSounds.sanitize(prefs.getString(key("reminder_sound"), null), section)
            set(value) = prefs.edit().putString(key("reminder_sound"), ReminderSounds.sanitize(value, section)).apply()

        /** Misc only: when its last dhikr started playing (epoch millis, 0 = never) — the next waits the interval from it. */
        var lastPlayed: Long
            get() = prefs.getLong(key("last_played"), 0L)
            set(value) {
                prefs.edit().putLong(key("last_played"), value).commit()
            }

        /** Misc only: the weekly schedule — per weekday (Sunday first) the earliest start minute, -1 = none; null = no schedule. */
        var dayStarts: List<Int>?
            get() = try {
                prefs.getString(key("day_starts"), null)?.let { raw ->
                    val array = JSONArray(raw)
                    WeeklyStart.parse((0 until array.length()).map { array.getInt(it) })
                }
            } catch (_: Exception) {
                null
            }
            set(value) {
                if (value == null) prefs.edit().remove(key("day_starts")).apply() else putIfChanged(key("day_starts"), JSONArray(value).toString())
            }

        /** Misc only: its own start/end on chosen weekdays (MiscDayTimes); null = the usual times every day. */
        var dayTimes: MiscDayTimes?
            get() = try {
                prefs.getString(key("day_times"), null)?.let { raw ->
                    val o = JSONObject(raw)
                    val list = { name: String -> o.getJSONArray(name).let { a -> (0 until a.length()).map { a.getInt(it) } } }
                    MiscDayTimes.parse(list("starts"), list("ends"))
                }
            } catch (_: Exception) {
                null
            }
            set(value) {
                if (value == null) {
                    if (prefs.contains(key("day_times"))) prefs.edit().remove(key("day_times")).apply()
                } else {
                    putIfChanged(key("day_times"), JSONObject().put("starts", JSONArray(value.starts)).put("ends", JSONArray(value.ends)).toString())
                }
            }

        /** Misc only: adapt to Fridays and Islamic occasions (MiscOccasion). On unless the user turned it off. */
        var occasionsEnabled: Boolean
            get() = prefs.getBoolean(key("occasions_enabled"), true)
            set(value) = prefs.edit().putBoolean(key("occasions_enabled"), value).apply()

        /** Misc only: the Hijri occasion days pushed from JS. */
        var occasionWindows: List<OccasionWindow>
            get() = try {
                val array = JSONArray(prefs.getString(key("occasion_windows"), "[]"))
                (0 until array.length()).map { val w = array.getJSONArray(it); OccasionWindow(w.getLong(0), w.getLong(1), w.getString(2)) }
            } catch (_: Exception) {
                emptyList()
            }
            set(value) = putIfChanged(key("occasion_windows"), JSONArray(value.map { JSONArray(listOf(it.start, it.end, it.key)) }).toString())

        /** Misc only: what each occasion plays instead of the normal rotation. */
        var occasionPlaylists: Map<String, List<PlaylistItem>>
            get() = try {
                val obj = JSONObject(prefs.getString(key("occasion_playlists"), "{}") ?: "{}")
                obj.keys().asSequence().associateWith { parsePlaylist(obj.getJSONArray(it).toString()) }
            } catch (_: Exception) {
                emptyMap()
            }
            set(value) = putIfChanged(key("occasion_playlists"), JSONObject().apply { value.forEach { (k, items) -> put(k, JSONArray(serializePlaylist(items))) } }.toString())

        /** Misc only: the next item of occasion [occasion]'s own cycle (the normal rotation keeps its own nextIndex). */
        fun occasionIndex(occasion: String): Int = prefs.getInt(key("occasion_index_$occasion"), 0)

        fun setOccasionIndex(occasion: String, index: Int) {
            prefs.edit().putInt(key("occasion_index_$occasion"), index).commit()
        }

        /** Misc only: the language of its pause/resume notifications ("ar" | "en"). */
        var language: String
            get() = prefs.getString(key("language"), "ar") ?: "ar"
            set(value) = prefs.edit().putString(key("language"), value).apply()

        /** Misc only: the start of the last adhan pause announced (never announced twice). Written synchronously. */
        var lastPauseAnnounced: Long
            get() = prefs.getLong(key("last_pause_announced"), 0L)
            set(value) {
                prefs.edit().putLong(key("last_pause_announced"), value).commit()
            }

        /** Misc only: the end of the pause whose notification is showing (0 = none) — the next tick says "resumed". */
        var pauseShownUntil: Long
            get() = prefs.getLong(key("pause_shown_until"), 0L)
            set(value) {
                prefs.edit().putLong(key("pause_shown_until"), value).commit()
            }

        /** Daily only: a session to continue (see Resume) — its occurrence, 0 when none … */
        var resumeOccurrence: Long
            get() = prefs.getLong(key("resume_occurrence"), 0L)
            set(value) {
                prefs.edit().putLong(key("resume_occurrence"), value).commit()
            }

        /** … when its resume alarm fires (epoch millis, 0 when none) — Misc makes way around it (MiscDailyGuard). */
        var resumeAt: Long
            get() = prefs.getLong(key("resume_at"), 0L)
            set(value) {
                prefs.edit().putLong(key("resume_at"), value).commit()
            }

        /** … from which dhikr. */
        var resumeIndex: Int
            get() = prefs.getInt(key("resume_index"), 0)
            set(value) {
                prefs.edit().putInt(key("resume_index"), value).commit()
            }

        /**
         * Daily only: a session the adhan interrupted, waiting for the user's
         * "Resume Adhkar" (SavedProgress) — null when none. Written synchronously.
         */
        var savedProgress: SavedProgress?
            get() = try {
                prefs.getString(key("saved_progress"), null)?.let {
                    val o = JSONObject(it)
                    SavedProgress(
                        occurrence = o.getLong("occurrence"),
                        index = o.getInt("index"),
                        repetition = o.getInt("repetition"),
                        part = o.optInt("part", 0),
                        positionMillis = o.optLong("positionMillis", 0L),
                        rotationSlot = o.optInt("rotationSlot", -1),
                        promptAt = o.getLong("promptAt"),
                        expiresAt = o.getLong("expiresAt"),
                        prompted = o.optBoolean("prompted", false),
                    )
                }
            } catch (_: Exception) {
                null
            }
            set(value) {
                val edit = prefs.edit()
                if (value == null) {
                    edit.remove(key("saved_progress"))
                } else {
                    edit.putString(
                        key("saved_progress"),
                        JSONObject()
                            .put("occurrence", value.occurrence)
                            .put("index", value.index)
                            .put("repetition", value.repetition)
                            .put("part", value.part)
                            .put("positionMillis", value.positionMillis)
                            .put("rotationSlot", value.rotationSlot)
                            .put("promptAt", value.promptAt)
                            .put("expiresAt", value.expiresAt)
                            .put("prompted", value.prompted)
                            .toString(),
                    )
                }
                edit.commit()
            }
    }

    fun section(section: Section) = SectionPrefs(section)

    /** Every app resume re-syncs the schedules: an unchanged (often large) value isn't written to disk again. */
    private fun putIfChanged(key: String, value: String) {
        if (prefs.getString(key, null) != value) prefs.edit().putString(key, value).apply()
    }

    /** Adhan windows (each adhan + 30 min) from the app's prayer times, pushed by JS. */
    var adhanWindows: List<Window>
        get() = try {
            val array = JSONArray(prefs.getString(KEY_ADHAN_WINDOWS, "[]"))
            (0 until array.length()).map { val w = array.getJSONArray(it); Window(w.getLong(0), w.getLong(1)) }
        } catch (_: Exception) {
            emptyList()
        }
        set(value) = putIfChanged(KEY_ADHAN_WINDOWS, JSONArray(value.map { JSONArray(listOf(it.start, it.end)) }).toString())

    /**
     * Repetitions the background player completed (audio played to its
     * end), waiting for the app to take them into its counters and
     * statistics: each with a unique id, so taking one in twice is
     * impossible; removed only once the app acknowledges it. Written
     * synchronously — a completion is never lost to a process kill.
     */
    fun appendCompletion(collection: String, dhikrId: String, atMillis: Long, sessionId: String? = null, durationMs: Long? = null, title: String? = null) {
        val all = completions().toMutableList()
        val entry = JSONObject()
            .put("id", "native:${UUID.randomUUID()}")
            .put("collection", collection)
            .put("dhikrId", dhikrId)
            .put("at", atMillis)
            .put("timeZone", TimeZone.getDefault().id)
        // Only what is known: a missing length stays missing (never estimated).
        if (!sessionId.isNullOrEmpty()) entry.put("sessionId", sessionId)
        if (durationMs != null && durationMs > 0) entry.put("durationMs", durationMs)
        if (!title.isNullOrEmpty()) entry.put("title", title)
        all.add(entry)
        while (all.size > MAX_COMPLETIONS) all.removeAt(0)
        prefs.edit().putString(KEY_COMPLETIONS, JSONArray(all).toString()).commit()
    }

    /**
     * A repetition that stopped before its end (stopped, interrupted, failed,
     * the adhan) after really playing [listenedMs] — queued with the
     * completions so the app takes it in the same restart-safe way, but marked
     * "listening": it adds listening time only, never a repetition.
     */
    fun appendListening(collection: String, dhikrId: String, atMillis: Long, sessionId: String?, listenedMs: Long, title: String?) {
        if (listenedMs <= 0) return
        val all = completions().toMutableList()
        val entry = JSONObject()
            .put("id", "native-listen:${UUID.randomUUID()}")
            .put("kind", "listening")
            .put("collection", collection)
            .put("dhikrId", dhikrId)
            .put("at", atMillis)
            .put("timeZone", TimeZone.getDefault().id)
            .put("listenedMs", listenedMs)
        if (!sessionId.isNullOrEmpty()) entry.put("sessionId", sessionId)
        if (!title.isNullOrEmpty()) entry.put("title", title)
        all.add(entry)
        while (all.size > MAX_COMPLETIONS) all.removeAt(0)
        prefs.edit().putString(KEY_COMPLETIONS, JSONArray(all).toString()).commit()
    }

    /**
     * A whole Morning/Evening session was heard to its end (every dhikr, every
     * repetition — PlaybackService.finishSession). One id per section and
     * scheduled occurrence, so a repeated finish, or an interrupted session
     * that is resumed and then finishes, is queued (and counted) once.
     * Queued with the completions as "session"; never a repetition.
     */
    /** A practiced Morning/Evening session (SessionPractice), once per [key] — the id the app files it under. */
    fun appendSessionComplete(collection: String, key: String, occurrence: Long, atMillis: Long, sessionId: String?) {
        val id = "native-session-complete:$collection:$key"
        val all = completions().toMutableList()
        if (all.any { it.optString("id") == id }) return
        val entry = JSONObject()
            .put("id", id)
            .put("kind", "session")
            .put("collection", collection)
            .put("dhikrId", "")
            .put("occurrence", occurrence)
            .put("at", atMillis)
            .put("timeZone", TimeZone.getDefault().id)
        if (!sessionId.isNullOrEmpty()) entry.put("sessionId", sessionId)
        all.add(entry)
        while (all.size > MAX_COMPLETIONS) all.removeAt(0)
        prefs.edit().putString(KEY_COMPLETIONS, JSONArray(all).toString()).commit()
    }

    fun completions(): List<JSONObject> = try {
        val array = JSONArray(prefs.getString(KEY_COMPLETIONS, "[]"))
        (0 until array.length()).map { array.getJSONObject(it) }
    } catch (_: Exception) {
        emptyList()
    }

    /** The app took these in: forget them. */
    fun acknowledgeCompletions(ids: Set<String>) {
        val rest = completions().filter { it.optString("id") !in ids }
        prefs.edit().putString(KEY_COMPLETIONS, JSONArray(rest).toString()).commit()
    }

    /** The daily session playing right now (its place), or null — see ActiveSession. Written synchronously. */
    var activeSession: ActiveSession?
        get() = try {
            prefs.getString(KEY_ACTIVE_SESSION, null)?.let {
                val o = JSONObject(it)
                ActiveSession(Section.of(o.getString("section")), o.getLong("occurrence"), o.getInt("index"))
            }
        } catch (_: Exception) {
            null
        }
        set(value) {
            val edit = prefs.edit()
            if (value == null) {
                edit.remove(KEY_ACTIVE_SESSION)
            } else {
                edit.putString(KEY_ACTIVE_SESSION, JSONObject().put("section", value.section.key).put("occurrence", value.occurrence).put("index", value.index).toString())
            }
            edit.commit()
        }

    /** Kept for the diagnostics view: the Evening alarm currently armed. */
    val scheduledOccurrence: Long get() = section(Section.EVENING).scheduledOccurrence

    /**
     * A short on-device log of what the scheduler/receivers/service did
     * (newest last, capped) — shown in Settings so a real-device test can
     * tell whether an alarm fired, was skipped, or couldn't start playback.
     */
    fun appendEvent(message: String) {
        AudioAdhkarTrace.log(appContext, "event", message)
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

    /** The interface language ("ar" | "en") for every Audio Adhkar notification; pushed with the schedules. */
    var language: String
        // Before it was pushed on its own, only Misc's notifications had a language.
        get() = prefs.getString(KEY_LANGUAGE, null)?.let { if (it == "en") "en" else "ar" } ?: section(Section.MISC).language
        set(value) = prefs.edit().putString(KEY_LANGUAGE, if (value == "en") "en" else "ar").apply()

    /** The app's own volume for [key] (VolumePolicy.KEYS), 0–1 — full until the user sets one. */
    fun volume(key: String): Float = prefs.getFloat("volume_$key", 1f).coerceIn(0f, 1f)

    fun setVolume(key: String, level: Float) {
        prefs.edit().putFloat("volume_$key", level.coerceIn(0f, 1f)).apply()
    }

    /** The reciter slot the last random-rotation recitation used (see AudioAdhkarRotation), -1 when none. */
    var quranLastRotationSlot: Int
        get() = prefs.getInt(KEY_QURAN_ROTATION, -1)
        set(value) = prefs.edit().putInt(KEY_QURAN_ROTATION, value).apply()

    companion object {
        private const val PREFS_NAME = "dithar_audio_adhkar"
        private const val KEY_ADHAN_WINDOWS = "adhan_windows"
        private const val KEY_EVENTS = "evening_events"
        private const val KEY_QURAN_ROTATION = "quran_rotation_index"
        private const val KEY_COMPLETIONS = "pending_completions"
        private const val KEY_ACTIVE_SESSION = "active_session"
        private const val KEY_LANGUAGE = "language"
        private const val MAX_COMPLETIONS = 5000
        private const val MAX_EVENTS = 40

        fun serializePlaylist(items: List<PlaylistItem>): String {
            val array = JSONArray()
            for (item in items) {
                array.put(
                    JSONObject()
                        .put("dhikrId", item.dhikrId)
                        .put("title", item.title)
                        .put("text", item.text)
                        .also { putRecitation(it, item.recitation) }
                        .put("rotation", JSONArray(item.rotation.map { putRecitation(JSONObject(), it) }))
                        .put("repetitions", item.repetitions),
                )
            }
            return array.toString()
        }

        fun parsePlaylist(raw: String?): List<PlaylistItem> {
            if (raw.isNullOrEmpty()) return emptyList()
            return try {
                val array = JSONArray(raw)
                (0 until array.length()).map { i -> parseItem(array.getJSONObject(i)) }
            } catch (_: Exception) {
                emptyList()
            }
        }

        /**
         * One playlist item as sent by JS (AudioAdhkarPlugin) or stored here.
         * A playlist saved before multi-file items had a single "assetPath".
         */
        fun parseItem(obj: JSONObject): PlaylistItem {
            val rotation = obj.optJSONArray("rotation")?.let { array ->
                (0 until array.length()).map { parseRecitation(array.getJSONObject(it)) }
            }
                // A playlist saved before per-repetition files: plain file lists.
                ?: obj.optJSONArray("rotationAssetPaths")?.let { array ->
                    (0 until array.length()).map { Recitation(strings(array.getJSONArray(it))) }
                }
                ?: emptyList()
            return PlaylistItem(
                dhikrId = obj.getString("dhikrId"),
                title = obj.getString("title"),
                text = obj.getString("text"),
                recitation = parseRecitation(obj),
                repetitions = obj.getInt("repetitions").coerceAtLeast(1),
                rotation = rotation,
            )
        }

        private fun parseRecitation(obj: JSONObject): Recitation {
            val paths = obj.optJSONArray("assetPaths")?.let(::strings) ?: listOf(obj.getString("assetPath"))
            require(paths.isNotEmpty()) { "playlist item without audio" }
            val repeat = obj.optJSONArray("repeatAssetPaths")?.let(::strings)?.takeIf { it.isNotEmpty() } ?: paths
            return Recitation(paths, repeat, obj.optLong("repeatStartMillis", 0L).coerceAtLeast(0L), obj.optString("reciterName"))
        }

        private fun putRecitation(obj: JSONObject, recitation: Recitation): JSONObject = obj
            .put("assetPaths", JSONArray(recitation.assetPaths))
            .put("repeatAssetPaths", JSONArray(recitation.repeatAssetPaths))
            .put("repeatStartMillis", recitation.repeatStartMillis)
            .put("reciterName", recitation.reciterName)

        private fun strings(array: JSONArray): List<String> = (0 until array.length()).map { array.getString(it) }
    }
}
