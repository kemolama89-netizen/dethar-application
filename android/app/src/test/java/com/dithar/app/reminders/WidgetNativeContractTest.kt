package com.dithar.app.reminders

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The exact strings the app sends to the widget (fixture written and kept in
 * step by src/lib/widgetNativeContract.test.ts) through the native store
 * — ReminderStore.parseItem → itemJson → parseItem, the path every pushed
 * item takes before WidgetRenderer draws `text`, `meaning`, `detail`,
 * `source` and the comments as they are. Checks, for every widget item in
 * both languages, that nothing is lost or altered on the way, and that what
 * is drawn is safe for Arabic: the direction Android infers is right, no
 * joiner/direction control or presentation form can break letter joining,
 * no diacritic or Qur'anic mark is left without its letter, and no
 * punctuation mark can stand alone at a line's start or end.
 *
 * Not covered here (it needs a device): how the launcher's TextView really
 * lays the text out at its real size — see the debug WidgetPreviewActivity probe.
 */
class WidgetNativeContractTest {
    private val fixture: JSONObject by lazy {
        val stream = javaClass.classLoader!!.getResourceAsStream("widget-native-items.json")
        JSONObject(stream.bufferedReader(Charsets.UTF_8).use { it.readText() })
    }

    private fun items(language: String): List<JSONObject> = fixture.getJSONArray(language).let { a -> (0 until a.length()).map { a.getJSONObject(it) } }

    private fun roundTrip(o: JSONObject): ReminderItem = ReminderStore.parseItem(ReminderStore.itemJson(ReminderStore.parseItem(o)))

    /** Every string the widget may draw for this item, by field, as WidgetRenderer receives it. */
    private fun drawn(i: ReminderItem): List<Pair<String, String>> =
        listOf("title" to i.title, "text" to i.text, "widgetText" to i.widgetText, "meaning" to i.meaning, "detail" to i.detail, "source" to i.source) +
            i.comments.filter { it.widget }.map { "comment ${it.id}" to it.text }

    @Test
    fun fixtureCoversEveryWidgetItemInBothLanguages() {
        assertTrue(items("ar").size > 100)
        // Hadiths show in English only with a verified published translation (src/data/religiousAudit.ts).
        assertTrue(items("en").size > 50)
    }

    @Test
    fun theNativeStoreKeepsEveryStringCodePointForCodePoint() {
        for (lang in listOf("ar", "en")) for (o in items(lang)) {
            val item = roundTrip(o)
            val id = o.getString("id")
            assertEquals(id, o.getString("text"), item.text)
            assertEquals(id, o.optString("meaning"), item.meaning)
            assertEquals(id, o.optString("source"), item.source)
            assertEquals(id, o.optString("detail"), item.detail)
            assertEquals(id, o.optString("widgetText"), item.widgetText)
            assertEquals(id, o.optString("title"), item.title)
            assertTrue(id, item.widget)
            val comments = o.optJSONArray("comments") ?: JSONArray()
            val sent = (0 until comments.length()).map { comments.getJSONObject(it) }.filter { it.optString("text").isNotEmpty() && it.optString("id").isNotEmpty() }
            assertEquals(id, sent.map { it.getString("id") to it.getString("text") }, item.comments.map { it.id to it.text })
            assertEquals(id, sent.map { it.optBoolean("widget", true) }, item.comments.map { it.widget })
            // Same code points, not merely equal-looking text.
            assertEquals(id, o.getString("text").codePoints().toArray().toList(), item.text.codePoints().toArray().toList())
        }
    }

    /** Android's FIRSTSTRONG heuristic: the first strongly directional character decides; null when none. */
    private fun firstStrongIsRtl(s: String): Boolean? {
        for (cp in s.codePoints().toArray()) {
            when (Character.getDirectionality(cp)) {
                Character.DIRECTIONALITY_RIGHT_TO_LEFT, Character.DIRECTIONALITY_RIGHT_TO_LEFT_ARABIC -> return true
                Character.DIRECTIONALITY_LEFT_TO_RIGHT -> return false
            }
        }
        return null
    }

    @Test
    fun arabicLinesAreLaidOutRightToLeft() {
        for (o in items("ar")) {
            val item = roundTrip(o)
            // The text is drawn with textDirection="rtl"; the others infer it from their first strong character.
            for ((field, s) in drawn(item)) {
                if (s.isEmpty() || field == "meaning") continue
                assertEquals("${item.id} $field: $s", true, firstStrongIsRtl(s))
            }
        }
        for (o in items("en")) {
            val item = roundTrip(o)
            assertEquals("${item.id} title", false, firstStrongIsRtl(item.title))
            if (item.meaning.isNotEmpty()) assertEquals("${item.id} meaning", false, firstStrongIsRtl(item.meaning))
        }
    }

    @Test
    fun nothingCanBreakArabicLetterJoining() {
        // Joiners and direction controls, and Arabic presentation forms (except the ornate Qur'anic brackets ﴾ ﴿).
        val fragile = Regex("[\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFB50-\\uFD3D\\uFD40-\\uFDFF\\uFE70-\\uFEFF]")
        for (lang in listOf("ar", "en")) for (o in items(lang)) {
            val item = roundTrip(o)
            for ((field, s) in drawn(item)) assertFalse("${item.id} $field: $s", fragile.containsMatchIn(s))
        }
    }

    @Test
    fun noDiacriticOrQuranicMarkIsLeftWithoutItsLetter() {
        for (lang in listOf("ar", "en")) for (o in items(lang)) {
            val item = roundTrip(o)
            for ((field, s) in drawn(item)) {
                val cps = s.codePoints().toArray()
                for ((k, cp) in cps.withIndex()) {
                    if (Character.getType(cp) != Character.NON_SPACING_MARK.toInt()) continue
                    val before = if (k == 0) null else cps[k - 1]
                    val detached = before == null || Character.isWhitespace(before) || before == 0x00A0 || before == '\n'.code
                    assertFalse("${item.id} $field: mark U+${Integer.toHexString(cp)} at $k in «$s»", detached)
                }
            }
        }
    }

    @Test
    fun noPunctuationMarkCanStandAloneAtALineStartOrEnd() {
        // Line breaks are allowed at spaces, tabs and newlines (never at a no-break space).
        val lone = Regex("^[\\u060C\\u061B\\u061F:.!?,;»«)(\\]\\[—–\\-/*\\u06D4]+$")
        for (lang in listOf("ar", "en")) for (o in items(lang)) {
            val item = roundTrip(o)
            for ((field, s) in drawn(item)) {
                for (token in s.split(' ', '\t', '\n').filter { it.isNotEmpty() }) {
                    assertFalse("${item.id} $field: lone «$token» in «$s»", lone.matches(token))
                }
                assertFalse("${item.id} $field: space before a closing mark in «$s»", Regex("[ \\t][\\u060C\\u061B\\u061F:.!»)]").containsMatchIn(s))
            }
        }
    }

    @Test
    fun theWidgetDrawsEveryQuranicVerseInTheQuranicBracketsWithItsWordingUnchanged() {
        // The Qur'an's own duas and the Lataif verses: drawn in ﴿ … ﴾, letter for letter the same verse.
        val stripped = { s: String -> s.replace(Regex("\\uFD3F\\u00A0|\\u00A0\\uFD3E|[{}]"), "") }
        var quranic = 0
        var partial = 0
        for (lang in listOf("ar", "en")) for (o in items(lang)) {
            val item = roundTrip(o)
            // The Lataif verses, and the duas titled «دعاء من القرآن» / "Dua from the Qur'an".
            val whole = item.category == "lataif" || item.title == "دعاء من القرآن" || item.title == "Dua from the Qur'an"
            // Translations, sources, the virtue line and DITHAR's comments: never bracketed.
            for (other in listOf(item.meaning, item.source, item.detail) + item.comments.map { it.text }) {
                assertFalse("${item.id}: «$other»", Regex("\uFD3F\u00A0|\u00A0\uFD3E").containsMatchIn(other))
            }
            if (!whole) {
                // Any other text keeps its own wording; only a Qur'anic portion or quotation inside it is in
                // ﴿ … ﴾ (the istirjaʿ dua's «إنا لله وإنا إليه راجعون», Hadith 94's «الم»), never braces.
                assertFalse(item.id, Regex("[{}]").containsMatchIn(item.widgetShownText))
                assertEquals(item.id, stripped(item.text), stripped(item.widgetShownText))
                if (item.id == "dua:inna-lillahi-wa-inna-ilayhi-rajiun") {
                    assertTrue(item.widgetShownText, item.widgetShownText.startsWith("\uFD3F\u00A0إنا لله وإنا إليه راجعون\u00A0\uFD3E، اللهم"))
                    partial++
                }
                continue
            }
            quranic++
            val drawn = item.widgetShownText
            assertTrue("${item.id}: «$drawn»", drawn.startsWith("\uFD3F\u00A0") && drawn.trimEnd('.', '\u06D4').endsWith("\u00A0\uFD3E"))
            assertEquals(item.id, stripped(item.text), stripped(drawn))
        }
        assertTrue(quranic >= 74) // 21 Qur'anic duas + 16 Lataif verses, in each language
        assertEquals(2, partial)
    }
}
