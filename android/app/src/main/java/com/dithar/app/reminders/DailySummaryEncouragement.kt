package com.dithar.app.reminders

import org.json.JSONArray
import org.json.JSONObject

/**
 * The end-of-day summary's encouragement (src/data/summaryEncouragement.ts, pushed by the app
 * in the interface language): which messages fit the day, from what was really recorded, and
 * which one to show, rotating so the same one doesn't come back while others fit.
 *
 * A grounded message carries its credit («مستفاد من: …» / "Drawn from: …") on its own line;
 * DITHAR's own wording carries none. The texts are used exactly as pushed. Pure, for unit tests.
 */
object DailySummaryEncouragement {
    data class Item(val id: String, val situations: Set<String>, val text: String, val credit: String?)

    const val ANY = "any"
    const val MORNING_EVENING = "morningEvening"
    const val WIRD = "wird"
    const val PRAYER = "prayer"
    const val TASBEEH = "tasbeeh"
    const val WRITTEN = "written"
    const val WEEK = "week"
    const val LISTENING = "listening"
    const val EMPTY = "empty"

    /** Kept in the rotation memory; a message isn't repeated within this many summaries while another fits. */
    const val RECENT_LIMIT = 10

    /** The day's situations, most specific first (any last), from the day's real records. */
    fun situations(activity: DailySummary.Activity, recordedEveryDayThisWeek: Boolean): Set<String> {
        val out = linkedSetOf<String>()
        if (recordedEveryDayThisWeek) out += WEEK
        val morning = "morning" in activity.wirds
        val evening = "evening" in activity.wirds
        if (morning && evening) out += MORNING_EVENING else if (morning || evening) out += WIRD
        if (activity.prayerSessions > 0) out += PRAYER
        if (activity.tasbeeh > 0) out += TASBEEH
        if (activity.written > 0) out += WRITTEN
        out += ANY
        return out
    }

    /**
     * Whether something was recorded on [day] and on each of the 7 days before it, from the
     * snapshot's daily totals (repetitions: written adhkar and Tasbeeh). A day with only a
     * completed wird has total 0, so this can under-state a streak, never over-state it.
     */
    fun recordedEveryDay(snapshot: DailySummary.Snapshot, day: String, dayTotal: Int): Boolean {
        if (snapshot.date != day || dayTotal <= 0) return false
        val history = snapshot.history
        if (history.size < 7) return false
        // The 7 days just before [day], each one present and recorded.
        var expected = DailySummary.previousDay(day)
        for ((date, total) in history.takeLast(7).reversed()) {
            if (date != expected || total <= 0) return false
            expected = DailySummary.previousDay(expected)
        }
        return true
    }

    /**
     * The message for [situations]: one that fits the most specific situation and wasn't used
     * recently; else any fitting one not used recently; else the fitting one used longest ago.
     * Among equals, the day ([day], "YYYY-MM-DD") picks, so a repeated delivery the same day
     * shows the same one. Null when the library has nothing that fits.
     */
    fun pick(items: List<Item>, situations: Set<String>, recent: List<String>, day: String): Item? {
        val fitting = items.filter { it.situations.any { s -> s in situations } }
        if (fitting.isEmpty()) return null
        val recentSet = recent.toSet()
        val specific = situations.filter { it != ANY }
        for (s in specific) {
            val fresh = fitting.filter { s in it.situations && it.id !in recentSet }
            if (fresh.isNotEmpty()) return fresh[index(day, fresh.size)]
        }
        val fresh = fitting.filter { it.id !in recentSet }
        if (fresh.isNotEmpty()) return fresh[index(day, fresh.size)]
        // All used recently: the one used longest ago.
        return fitting.minByOrNull { recent.lastIndexOf(it.id) }
    }

    private fun index(day: String, size: Int): Int {
        var h = 0x811c9dc5.toInt()
        for (c in day) {
            h = h xor c.code
            h *= 0x01000193
        }
        return Math.floorMod(h, size)
    }

    /** The message with its credit on its own line (grounded), as shown. */
    fun text(item: Item): String = if (item.credit.isNullOrBlank()) item.text else "${item.text}\n${item.credit}"

    /** [recent] after showing [id], newest last, at most [RECENT_LIMIT]. */
    fun remember(recent: List<String>, id: String): List<String> = (recent.filter { it != id } + id).takeLast(RECENT_LIMIT)

    /** What was done that day, without numbers (the encouragement-only summary). */
    fun achievements(activity: DailySummary.Activity, en: Boolean, dayEn: String, dayAr: String): String {
        val parts = mutableListOf<String>()
        val morning = "morning" in activity.wirds
        val evening = "evening" in activity.wirds
        when {
            morning && evening -> parts += if (en) "Morning and Evening Adhkar" else "أذكار الصباح والمساء"
            morning -> parts += if (en) "Morning Adhkar" else "أذكار الصباح"
            evening -> parts += if (en) "Evening Adhkar" else "أذكار المساء"
        }
        if (activity.prayerSessions > 0) parts += if (en) "Prayer Adhkar" else "أذكار الصلاة"
        if (activity.tasbeeh > 0) parts += if (en) "Tasbeeh" else "التسبيح"
        if (activity.written > 0) parts += if (en) "written adhkar" else "الأذكار المكتوبة"
        return if (en) "Recorded $dayEn: ${parts.joinToString(" · ")}." else "سجّلتَ $dayAr: ${parts.joinToString(" · ")}."
    }

    /** [{ id, situations: [..], text, credit? }] — an entry missing its id or text is left out. */
    fun parse(array: JSONArray?): List<Item> {
        if (array == null) return emptyList()
        return (0 until array.length()).mapNotNull { i ->
            val o = array.optJSONObject(i) ?: return@mapNotNull null
            val id = o.optString("id").takeIf { it.isNotBlank() } ?: return@mapNotNull null
            val text = o.optString("text").takeIf { it.isNotBlank() } ?: return@mapNotNull null
            val situations = o.optJSONArray("situations")?.let { a -> (0 until a.length()).map { a.optString(it) }.filter { it.isNotBlank() }.toSet() } ?: emptySet()
            if (situations.isEmpty()) return@mapNotNull null
            Item(id, situations, text, o.optString("credit").takeIf { it.isNotBlank() })
        }
    }

    fun toJson(items: List<Item>): JSONArray = JSONArray(
        items.map { JSONObject().put("id", it.id).put("situations", JSONArray(it.situations.toList())).put("text", it.text).apply { it.credit?.let { c -> put("credit", c) } } },
    )
}
