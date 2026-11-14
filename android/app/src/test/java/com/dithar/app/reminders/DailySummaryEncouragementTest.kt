package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The summary's encouragement: chosen from what was really recorded, rotated without repeats
 * while others fit, a grounded message shown with its credit, and none in statistics-only.
 */
class DailySummaryEncouragementTest {
    private val day = "2026-10-21"
    private fun item(id: String, vararg s: String, credit: String? = null) = DailySummaryEncouragement.Item(id, s.toSet(), "text $id", credit)

    private val library = listOf(
        item("any1", "any"), item("any2", "any"), item("any3", "any"),
        item("tas1", "tasbeeh", credit = "مستفاد من: صحيح مسلم 2694"), item("tas2", "tasbeeh"),
        item("me1", "morningEvening"), item("wird1", "wird"), item("pr1", "prayer"),
        item("wk1", "week"), item("lis1", "listening"), item("lis2", "listening"),
        item("emp1", "empty"), item("emp2", "empty", credit = "Drawn from: Qur'an 39:53"),
    )

    private fun history(totals: List<Int>, until: String = day): List<Pair<String, Int>> {
        var d = until
        val days = mutableListOf<String>()
        repeat(totals.size) { d = DailySummary.previousDay(d); days += d }
        return days.reversed().zip(totals)
    }

    private fun snapshot(activity: DailySummary.Activity, totals: List<Int> = emptyList()) =
        DailySummary.Snapshot(day, activity, history(totals), "2026-01-01")

    @Test
    fun situationsComeFromWhatWasRecorded() {
        val s = DailySummaryEncouragement.situations(DailySummary.Activity(written = 3, tasbeeh = 0, wirds = listOf("morning", "evening"), prayerSessions = 1), false)
        assertEquals(listOf("morningEvening", "prayer", "written", "any"), s.toList())
        val one = DailySummaryEncouragement.situations(DailySummary.Activity(tasbeeh = 33, wirds = listOf("evening")), true)
        assertEquals(listOf("week", "wird", "tasbeeh", "any"), one.toList())
    }

    @Test
    fun aWeekNeedsSomethingRecordedOnEachOfTheSevenDaysBeforeAndToday() {
        assertTrue(DailySummaryEncouragement.recordedEveryDay(snapshot(DailySummary.Activity(tasbeeh = 1), List(7) { 5 }), day, 1))
        // A gap, too few days, or nothing today: not a week.
        assertFalse(DailySummaryEncouragement.recordedEveryDay(snapshot(DailySummary.Activity(), listOf(5, 5, 0, 5, 5, 5, 5)), day, 1))
        assertFalse(DailySummaryEncouragement.recordedEveryDay(snapshot(DailySummary.Activity(), List(6) { 5 }), day, 1))
        assertFalse(DailySummaryEncouragement.recordedEveryDay(snapshot(DailySummary.Activity(), List(7) { 5 }), day, 0))
        // Another day's snapshot says nothing about this day.
        assertFalse(DailySummaryEncouragement.recordedEveryDay(snapshot(DailySummary.Activity(), List(7) { 5 }), "2026-10-22", 1))
    }

    @Test
    fun theMostSpecificFittingMessageComesFirstAndNothingOutsideTheDaysSituations() {
        val picked = DailySummaryEncouragement.pick(library, linkedSetOf("tasbeeh", "any"), emptyList(), day)!!
        assertTrue(picked.id.startsWith("tas"))
        assertEquals("lis", DailySummaryEncouragement.pick(library, setOf("listening"), emptyList(), day)!!.id.take(3))
        assertEquals("emp", DailySummaryEncouragement.pick(library, setOf("empty"), emptyList(), day)!!.id.take(3))
        assertNull(DailySummaryEncouragement.pick(library.filter { "empty" !in it.situations }, setOf("empty"), emptyList(), day))
    }

    @Test
    fun rotatesThroughEveryFittingMessageBeforeRepeatingOne() {
        var recent = emptyList<String>()
        val shown = mutableListOf<String>()
        val situations = linkedSetOf("tasbeeh", "any")
        var d = "2026-11-01"
        repeat(5) {
            val p = DailySummaryEncouragement.pick(library, situations, recent, d)!!
            shown += p.id
            recent = DailySummaryEncouragement.remember(recent, p.id)
            d = DailySummary.previousDay(d)
        }
        // 2 tasbeeh then 3 any: all five fitting, none twice.
        assertEquals(5, shown.toSet().size)
        assertEquals(setOf("tas1", "tas2"), shown.take(2).toSet())
        // All used: the one used longest ago comes back.
        assertEquals(shown.first(), DailySummaryEncouragement.pick(library, situations, recent, d)!!.id)
    }

    @Test
    fun theSameDayGivesTheSameMessage() {
        val a = DailySummaryEncouragement.pick(library, setOf("any"), emptyList(), day)
        val b = DailySummaryEncouragement.pick(library, setOf("any"), emptyList(), day)
        assertEquals(a, b)
        assertEquals(10, DailySummaryEncouragement.remember((1..12).map { "x$it" }, "y").size)
    }

    @Test
    fun aGroundedMessageShowsItsCreditOnItsOwnLine_DitharsOwnWordingNone() {
        assertEquals("text tas1\nمستفاد من: صحيح مسلم 2694", DailySummaryEncouragement.text(library[3]))
        assertEquals("text any1", DailySummaryEncouragement.text(library[0]))
    }

    private fun compose(activity: DailySummary.Activity, mode: String, language: String = "ar", totals: List<Int> = emptyList(), recent: List<String> = emptyList()) =
        DailySummary.compose(snapshot(activity, totals), day, 0, mode, language, encouragements = library, recentEncouragements = recent)

    @Test
    fun encouragementOnlySaysWhatWasDoneWithoutNumbersThenTheFittingMessage() {
        val m = compose(DailySummary.Activity(tasbeeh = 99, wirds = listOf("morning")), "motivational")
        val lines = m.body.lines()
        assertEquals("سجّلتَ اليوم: أذكار الصباح · التسبيح.", lines[0])
        assertFalse(m.body, m.body.contains("99"))
        assertEquals("wird1", m.encouragementId)
        val en = compose(DailySummary.Activity(tasbeeh = 99, prayerSessions = 2), "motivational", "en")
        assertEquals("Recorded today: Prayer Adhkar · Tasbeeh.", en.body.lines()[0])
        assertFalse(en.body.contains("99"))
    }

    @Test
    fun combinedKeepsTheCountsAndAddsTheMessage_statisticsOnlyHasNone() {
        val combined = compose(DailySummary.Activity(tasbeeh = 33), "combined", "en")
        assertTrue(combined.body, combined.body.startsWith("Recorded today: Tasbeeh 33"))
        assertNotNull(combined.encouragementId)
        assertTrue(combined.body.contains("text ${combined.encouragementId}"))
        val stats = compose(DailySummary.Activity(tasbeeh = 33), "stats", "en")
        assertNull(stats.encouragementId)
        assertFalse(stats.body.contains("text "))
    }

    @Test
    fun aWeekOfRecordsBringsTheWeekMessage() {
        assertEquals("wk1", compose(DailySummary.Activity(tasbeeh = 1), "motivational", totals = List(7) { 3 }).encouragementId)
        // With a gap, never.
        assertFalse(compose(DailySummary.Activity(tasbeeh = 1), "motivational", totals = listOf(3, 3, 3, 0, 3, 3, 3)).encouragementId == "wk1")
    }

    @Test
    fun anEmptyDayAndAListeningDayGetTheirOwnGentleMessages() {
        val empty = compose(DailySummary.Activity(), "combined", "en")
        assertTrue(empty.body, empty.body.startsWith("You haven't started your wird in DITHAR today yet 🌿"))
        assertTrue(empty.encouragementId!!.startsWith("emp"))
        val listening = DailySummary.compose(
            DailySummary.Snapshot(day, DailySummary.Activity(), emptyList(), "2026-01-01", audio = DailySummary.Listening(plays = 2, listenedMs = 120_000)),
            day, 0, "motivational", "ar", encouragements = library,
        )
        assertTrue(listening.body, listening.body.startsWith("استمعتَ إلى الأذكار في دِثار اليوم."))
        assertTrue(listening.encouragementId!!.startsWith("lis"))
    }

    @Test
    fun unknownRecordsGetNoEncouragementAndNoLibraryKeepsTheFixedLines() {
        val unknown = DailySummary.compose(null, day, 0, "combined", "en", recordsKnown = false, encouragements = library)
        assertNull(unknown.encouragementId)
        val fixed = DailySummary.compose(snapshot(DailySummary.Activity(tasbeeh = 3)), day, 0, "motivational", "en")
        assertNull(fixed.encouragementId)
        assertTrue(fixed.body, fixed.body.endsWith("A little, kept up, goes a long way — see you tomorrow."))
    }

    @Test
    fun theLibraryRoundTripsThroughStorageAndBadEntriesAreLeftOut() {
        val back = DailySummaryEncouragement.parse(DailySummaryEncouragement.toJson(library))
        assertEquals(library, back)
        val bad = org.json.JSONArray("""[{"id":"","text":"x","situations":["any"]},{"id":"a","text":"","situations":["any"]},{"id":"b","text":"y","situations":[]},{"id":"c","text":"z","situations":["any"]}]""")
        assertEquals(listOf("c"), DailySummaryEncouragement.parse(bad).map { it.id })
    }
}
