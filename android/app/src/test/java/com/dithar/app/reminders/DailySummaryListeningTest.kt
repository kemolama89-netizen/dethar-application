package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Audio listening in the end-of-day summary: on its own line, never counted as the user's repetitions. */
class DailySummaryListeningTest {
    private val today = "2026-10-15"
    private fun snapshot(written: Int = 0, audio: DailySummary.Listening? = null, date: String = today) =
        DailySummary.Snapshot(date, DailySummary.Activity(written, 0, emptyList(), 0), emptyList(), "2026-09-01", audio)

    @Test
    fun listeningGetsItsOwnLineWithRealTimeAndSessions() {
        val audio = DailySummary.Listening(plays = 6, sessions = 2, listenedMs = 4 * 60_000L)
        val body = DailySummary.compose(snapshot(written = 10, audio = audio), today, 0, "combined", "ar").body
        val line = body.lines().first { it.startsWith("الاستماع") }
        assertTrue(line.startsWith("الاستماع إلى الأذكار الصوتية: "))
        assertTrue(line.contains("6 تسجيلات كاملة"))
        assertTrue(line.contains("في جلستين"))
        assertTrue(line.contains("مدة الاستماع 4 دقائق"))
        // The user's own recorded repetitions are unchanged by listening.
        assertTrue(body.contains("الأذكار المكتوبة 10 تكرارًا"))
    }

    @Test
    fun unknownLengthsAndMissingSessionsAreNotGuessed() {
        val audio = DailySummary.Listening(plays = 3, sessions = 1, playsWithoutSession = 1, listenedMs = 90_000L, playsWithoutDuration = 1)
        val line = DailySummary.listeningLine(audio, en = true)!!
        assertTrue(line.contains("3 complete recordings"))
        assertFalse(line.contains("session"))
        assertTrue(line.contains("listening time at least 2 minutes"))
    }

    @Test
    fun nothingHeardMeansNoListeningLineAndTheMotivationalModeNeverShowsIt() {
        assertNull(DailySummary.listeningLine(DailySummary.Listening(), en = false))
        val audio = DailySummary.Listening(plays = 2, sessions = 1, listenedMs = 60_000L)
        val body = DailySummary.compose(snapshot(written = 5, audio = audio), today, 0, "motivational", "ar").body
        assertFalse(body.contains("الاستماع"))
    }

    @Test
    fun onlyListeningIsReportedAsListeningNeverAsNoAdhkar() {
        val audio = DailySummary.Listening(plays = 1, sessions = 1, listenedMs = 20_000L)
        for (mode in listOf("combined", "stats", "motivational")) {
            for (language in listOf("en", "ar")) {
                val body = DailySummary.compose(snapshot(audio = audio), today, 0, mode, language).body
                assertFalse("$mode/$language: $body", body.contains("No dhikr was recorded") || body.contains("لم يُسجَّل"))
                assertTrue("$mode/$language: $body", body.contains("listened to adhkar") || body.contains("استمعتَ إلى الأذكار"))
            }
        }
        val combined = DailySummary.compose(snapshot(audio = audio), today, 0, "combined", "en").body
        assertTrue(combined.startsWith("You listened to adhkar in DITHAR today; nothing was read or counted in Written Adhkar or Tasbeeh."))
        assertTrue(combined.contains("Audio Adhkar listening: 1 complete recording · in 1 session · listening time under a minute"))
        // Still never turned into the user's own repetitions.
        assertFalse(combined.contains("Recorded today"))
    }

    @Test
    fun completionsTheAppHasNotTakenInYetAreAddedOnceWithoutGuessingSessions() {
        val audio = DailySummary.Listening(plays = 2, sessions = 1, listenedMs = 60_000L)
        val merged = DailySummary.withPendingListening(audio, listOf(30_000L to "x", null to null))!!
        assertEquals(4, merged.plays)
        assertEquals(90_000L, merged.listenedMs)
        assertEquals(1, merged.playsWithoutDuration)
        assertEquals(2, merged.playsWithoutSession)
        assertFalse(DailySummary.listeningLine(merged, en = true)!!.contains("session"))
        // A snapshot from another day is ignored; pending ones still count for today.
        val body = DailySummary.compose(snapshot(audio = audio, date = "2026-10-14"), today, 0, "stats", "en", listOf(45_000L to null)).body
        assertTrue(body.contains("1 complete recording"))
    }

    @Test
    fun recordingsPlayedInPartAddTheirRealTimeButAreNeverCompletePlays() {
        val audio = DailySummary.Listening(plays = 1, sessions = 1, listenedMs = 3 * 60_000L, stoppedEarly = 2)
        val line = DailySummary.listeningLine(audio, en = true)!!
        assertTrue(line.contains("1 complete recording · 2 played in part · in 1 session · listening time 3 minutes"))
    }

    @Test
    fun onlyPartialListeningStillGetsALine() {
        val audio = DailySummary.Listening(plays = 0, sessions = 1, listenedMs = 2 * 60_000L, stoppedEarly = 1)
        val line = DailySummary.listeningLine(audio, en = false)!!
        assertFalse(line.contains("كامل"))
        assertTrue(line.contains("تسجيل استُمع إلى جزء منه"))
        assertTrue(line.contains("مدة الاستماع دقيقتان"))
    }

    @Test
    fun stoppedEarlyListeningStillQueuedNativelyAddsTimeNotPlays() {
        val merged = DailySummary.withPendingListening(null, emptyList(), listOf(40_000L, 0L))!!
        assertEquals(0, merged.plays)
        assertEquals(1, merged.stoppedEarly)
        assertEquals(40_000L, merged.listenedMs)
        val body = DailySummary.compose(null, today, 0, "stats", "en", emptyList(), listOf(40_000L)).body
        assertTrue(body.contains("1 played in part"))
        assertFalse(body.contains("complete recording"))
    }

    @Test
    fun aSessionHeardToItsEndStillQueuedCompletesThatSessionOnce() {
        val snap = DailySummary.Snapshot(today, DailySummary.Activity(0, 0, listOf("morning"), 0), emptyList(), "2026-09-01")
        val body = DailySummary.compose(snap, today, 0, "stats", "en", emptyList(), emptyList(), listOf("morning", "evening", "evening")).body
        // Morning was already done (read); Evening is added once; neither becomes "listening" plays.
        assertFalse(body.contains("complete recording"))
        val single = DailySummary.compose(null, today, 0, "stats", "en", emptyList(), emptyList(), listOf("evening")).body
        assertFalse(single.startsWith("No dhikr was recorded"))
    }

    // ---- the day a summary describes, and what is counted once ----------------

    @Test
    fun aSummaryHeldBackPastMidnightDescribesTheDayItWasFor() {
        assertEquals("2026-10-15", DailySummary.summaryDay("2026-10-16", "2026-10-15"))
        assertEquals("2026-10-16", DailySummary.summaryDay("2026-10-16", "2026-10-16"))
        // Stale (older than yesterday), unknown or in the future: today.
        assertEquals("2026-10-16", DailySummary.summaryDay("2026-10-16", "2026-10-13"))
        assertEquals("2026-10-16", DailySummary.summaryDay("2026-10-16", null))
        assertEquals("2026-10-16", DailySummary.summaryDay("2026-10-16", "2026-10-17"))
        // Month and year boundaries.
        assertEquals("2026-02-28", DailySummary.previousDay("2026-03-01"))
        assertEquals("2025-12-31", DailySummary.previousDay("2026-01-01"))
        assertEquals("2028-02-29", DailySummary.previousDay("2028-03-01"))
    }

    @Test
    fun aLateSummarySaysYesterdayAndKeepsThatDaysRecords() {
        val snap = DailySummary.Snapshot("2026-10-15", DailySummary.Activity(12, 33, listOf("evening"), 1), listOf("2026-10-14" to 20), "2026-09-01")
        val ar = DailySummary.compose(snap, "2026-10-15", 0, "combined", "ar", ofYesterday = true)
        assertEquals("ملخص أذكار الأمس", ar.title)
        assertTrue(ar.body.contains("سجّلت أمس: "))
        assertTrue(ar.body.contains("الأذكار المكتوبة 12 تكرارًا"))
        assertTrue(ar.body.contains("التسبيح 33"))
        assertFalse(ar.body.contains("اليوم:"))
        val en = DailySummary.compose(snap, "2026-10-15", 0, "stats", "en", ofYesterday = true)
        assertEquals("Yesterday's Adhkar summary", en.title)
        assertTrue(en.body.contains("Recorded yesterday: "))
        assertTrue(en.body.contains("More than the day before (20)."))
    }

    @Test
    fun recordedAdhkarAreNeverReportedAsNone() {
        val written = DailySummary.compose(snapshot(written = 3), today, 0, "combined", "ar").body
        assertFalse(written.contains("لم يُسجَّل"))
        assertTrue(written.contains("الأذكار المكتوبة 3 تكرارًا"))
        // Only Floating Tasbeeh taps still queued natively (the app not opened since).
        val floating = DailySummary.compose(null, today, 7, "stats", "en").body
        assertTrue(floating.contains("Tasbeeh 7"))
        // Nothing at all: says nothing was RECORDED (never that the user did nothing).
        assertEquals("No dhikr was recorded in DITHAR today.", DailySummary.compose(null, today, 0, "stats", "en").body)
    }

    @Test
    fun queuedTapsAreCountedOnlyWhenTheSnapshotDoesNotHoldThem() {
        val snap = DailySummary.Snapshot(today, DailySummary.Activity(0, 5, emptyList(), 0), emptyList(), null, floatingThrough = 1_000L)
        val queued = listOf(
            Triple(today, 900L, 2), // already in the snapshot (taken in, not yet removed from the queue)
            Triple(today, 1_000L, 3), // the newest one taken in
            Triple(today, 1_500L, 4), // tapped after: not in it yet
            Triple("2026-10-14", 2_000L, 9), // another day
        )
        assertEquals(4, DailySummary.newPendingTaps(snap, today, queued))
        // No snapshot of that day: every queued tap of the day counts, once.
        assertEquals(9, DailySummary.newPendingTaps(null, today, queued))
        assertEquals(9, DailySummary.newPendingTaps(snap.copy(date = "2026-10-14"), today, queued))
    }

    @Test
    fun queuedCompletionsAreCountedOnlyWhenTheSnapshotDoesNotHoldThem() {
        val snap = DailySummary.Snapshot(today, DailySummary.Activity(), emptyList(), null, audioIds = setOf("a", "b"))
        val queued = listOf(today to "a", today to "c", "2026-10-14" to "d")
        assertEquals(setOf("c"), DailySummary.newPendingCompletions(snap, today, queued))
        assertEquals(setOf("a", "c"), DailySummary.newPendingCompletions(null, today, queued))
    }

    @Test
    fun theSnapshotsTakenInPartIsReadBack() {
        val json = """{"date":"$today","today":{"writtenRepetitions":2,"tasbeehRepetitions":1,"wirds":["morning"],"prayerSessions":0},"history":[],"trackedSince":null,"audio":null,"taken":{"floatingThrough":12345,"audioIds":["x","y"]}}"""
        val snap = ReminderStore.parseSnapshot(json)
        assertEquals(12345L, snap.floatingThrough)
        assertEquals(setOf("x", "y"), snap.audioIds)
        val none = ReminderStore.parseSnapshot("""{"date":"$today","today":{},"history":[],"trackedSince":null,"taken":{"floatingThrough":null,"audioIds":[]}}""")
        assertNull(none.floatingThrough)
        // An older app's snapshot (no "taken"): nothing assumed taken.
        val old = ReminderStore.parseSnapshot("""{"date":"$today","today":{},"history":[],"trackedSince":null}""")
        assertNull(old.floatingThrough)
        assertTrue(old.audioIds.isEmpty())
    }
}
