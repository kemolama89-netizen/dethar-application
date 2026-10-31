package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The end-of-day summary's message, from the Statistics screen's own counts
 * (lib/dailySummary.ts statisticsCounts): today's activity, and — clearly
 * labelled «منذ البداية» / "Since the beginning" — the all-time totals, so a
 * day without activity never reads as "you never record adhkar".
 */
class DailySummaryStatisticsTest {
    private val today = "2026-10-21"
    private val since = DailySummary.AllTime(morningDays = 12, eveningDays = 9, prayerSessions = 30, tasbeeh = 1240, written = 400)

    private fun snapshot(
        today: DailySummary.Activity = DailySummary.Activity(),
        allTime: DailySummary.AllTime? = since,
        date: String = this.today,
    ) = DailySummary.Snapshot(date, today, emptyList(), "2026-09-01", allTime = allTime)

    private fun body(s: DailySummary.Snapshot?, mode: String = "combined", language: String = "en", extraTasbeeh: Int = 0, various: Int = 0, allTime: DailySummary.AllTime? = s?.allTime) =
        DailySummary.compose(s, today, extraTasbeeh, mode, language, pendingVariousPlays = various, allTimeSoFar = allTime).body

    @Test
    fun activityTodayShowsTodaysCountsAndTheAllTimeTotalsSeparately() {
        val b = body(snapshot(DailySummary.Activity(written = 3, tasbeeh = 7, wirds = listOf("morning"), prayerSessions = 2)), mode = "stats")
        val lines = b.lines()
        assertEquals("Recorded today: Morning Adhkar ✓ · Prayer Adhkar ×2 · Tasbeeh 7 · written adhkar 3 repetitions", lines[0])
        assertEquals("Since the beginning: Morning Adhkar on 12 days · Evening Adhkar on 9 days · Prayer Adhkar ×30 · Tasbeeh 1240 · written adhkar 400 repetitions", lines.last())
    }

    @Test
    fun arabicAllTimeLine() {
        val b = body(snapshot(DailySummary.Activity(tasbeeh = 5)), mode = "stats", language = "ar")
        assertTrue(b, b.contains("سجّلت اليوم: التسبيح 5"))
        assertTrue(b, b.contains("منذ البداية: أذكار الصباح في 12 يومًا · أذكار المساء في 9 أيام · أذكار الصلاة ×30 · التسبيح 1240 · الأذكار المكتوبة 400 تكرارًا"))
    }

    @Test
    fun noActivityTodayButEarlierActivitySaysBothClearly() {
        for (mode in listOf("stats", "combined")) {
            val b = body(snapshot(), mode = mode)
            assertTrue("$mode: $b", b.startsWith("No dhikr was recorded in DITHAR today"))
            assertTrue("$mode: $b", b.contains("Since the beginning: "))
            assertFalse("$mode: $b", b.contains("Recorded today"))
        }
        val ar = body(snapshot(), mode = "stats", language = "ar")
        assertTrue(ar, ar.startsWith("لم يُسجَّل أي ذكر في دِثار اليوم."))
        assertTrue(ar, ar.contains("منذ البداية: "))
    }

    @Test
    fun noActivityEverHasNoAllTimeLine() {
        for (allTime in listOf(DailySummary.AllTime(), null)) {
            val b = body(snapshot(allTime = allTime), mode = "stats")
            assertEquals("No dhikr was recorded in DITHAR today.", b)
        }
        assertEquals(
            "No dhikr was recorded in DITHAR today — and that's okay. Tomorrow is a fresh page: begin with a single dhikr after Fajr, and let a little grow.",
            body(snapshot(allTime = DailySummary.AllTime()), mode = "combined").replace("\n", " "),
        )
    }

    @Test
    fun encouragementOnlyNeverShowsNumbers() {
        val b = body(snapshot(DailySummary.Activity(tasbeeh = 5)), mode = "motivational")
        assertFalse(b, b.contains("Since the beginning") || b.contains("1240"))
    }

    @Test
    fun variousRecordingsStillQueuedCountAsTasbeehTodayAndAllTime() {
        val b = body(snapshot(DailySummary.Activity(tasbeeh = 4)), mode = "stats", extraTasbeeh = 2, various = 3)
        assertTrue(b, b.contains("Recorded today: Tasbeeh 9"))
        assertTrue(b, b.contains("Tasbeeh ${1240 + 5}"))
    }

    @Test
    fun aWirdCompletedNativelyAddsItsDayToAllTimeOnce() {
        val withSession = DailySummary.compose(snapshot(), today, 0, "stats", "en", pendingSessions = listOf("evening"), allTimeSoFar = since).body
        assertTrue(withSession, withSession.contains("Evening Adhkar ✓"))
        assertTrue(withSession, withSession.contains("Evening Adhkar on 10 days"))
        // Already in the snapshot: not counted twice.
        val already = DailySummary.compose(snapshot(DailySummary.Activity(wirds = listOf("evening"))), today, 0, "stats", "en", pendingSessions = listOf("evening"), allTimeSoFar = since).body
        assertTrue(already, already.contains("Evening Adhkar on 9 days"))
    }

    @Test
    fun aStaleSnapshotIsNothingTodayButItsAllTimeStillShows() {
        val old = snapshot(DailySummary.Activity(tasbeeh = 50), date = "2026-10-18")
        val b = DailySummary.compose(null, today, 0, "stats", "en", allTimeSoFar = old.allTime).body
        assertTrue(b, b.startsWith("No dhikr was recorded in DITHAR today."))
        assertTrue(b, b.contains("Tasbeeh 1240"))
    }

    @Test
    fun listeningIsLabelledAsTheScreensAudioAdhkar() {
        val audio = DailySummary.Listening(plays = 2, listenedMs = 120_000L)
        assertEquals("Audio Adhkar listening: 2 complete recordings · listening time 2 minutes", DailySummary.listeningLine(audio, en = true))
    }

    @Test
    fun theSnapshotCarriesAllTimeAndOlderSnapshotsWithoutItStillParse() {
        val withAllTime = """{"date":"2026-10-21","today":{"writtenRepetitions":3,"tasbeehRepetitions":7,"wirds":["morning"],"prayerSessions":2},"allTime":{"morningDays":12,"eveningDays":9,"prayerSessions":30,"tasbeeh":1240,"written":400},"history":[],"trackedSince":"2026-09-01"}"""
        val parsed = ReminderStore.parseSnapshot(withAllTime)
        assertEquals(since, parsed.allTime)
        assertEquals(DailySummary.Activity(3, 7, listOf("morning"), 2), parsed.today)
        val older = ReminderStore.parseSnapshot("""{"date":"2026-10-21","today":{"tasbeehRepetitions":1},"trackedSince":null}""")
        assertNull(older.allTime)
        assertNotNull(older.today)
    }

    // ---- a day is "nothing recorded" only when that is verified -------------------

    @Test
    fun recordsAreKnownFromTheDaysSnapshotOrFromTheAppNotBeingOpened() {
        assertTrue(DailySummary.recordsKnown(snapshot(), today, appOpenedOn = today, storedUnreadable = false))
        assertFalse(DailySummary.recordsKnown(snapshot().copy(recordsReadable = false), today, appOpenedOn = null, storedUnreadable = false))
        // No snapshot of the day: empty only when the app wasn't opened that day.
        assertTrue(DailySummary.recordsKnown(null, today, appOpenedOn = "2026-10-18", storedUnreadable = false))
        assertTrue(DailySummary.recordsKnown(null, today, appOpenedOn = null, storedUnreadable = false))
        assertFalse(DailySummary.recordsKnown(null, today, appOpenedOn = today, storedUnreadable = false))
        assertFalse(DailySummary.recordsKnown(null, today, appOpenedOn = "2026-10-18", storedUnreadable = true))
    }

    @Test
    fun unknownRecordsAreNeverReportedAsNothingNorShownBesideOtherDaysCounts() {
        for (mode in listOf("stats", "combined", "motivational")) {
            for (language in listOf("en", "ar")) {
                // Opened today but no snapshot of today arrived: the older snapshot's all-time counts are not shown.
                val b = DailySummary.compose(null, today, 0, mode, language, allTimeSoFar = since, recordsKnown = false).body
                assertFalse("$mode/$language: $b", b.contains("No dhikr was recorded") || b.contains("لم يُسجَّل"))
                assertFalse("$mode/$language: $b", b.contains("Since the beginning") || b.contains("منذ البداية"))
                assertTrue("$mode/$language: $b", b.contains("couldn't read") || b.contains("تعذّرت"))
            }
        }
    }

    @Test
    fun aSnapshotMarkedUnavailableIsUnknownNotZero() {
        val unreadable = snapshot().copy(recordsReadable = false)
        val b = body(unreadable, mode = "stats")
        assertEquals("DITHAR couldn't read today's records, so this summary can't say what was recorded. Open the app to update it.", b)
        val parsed = ReminderStore.parseSnapshot("""{"date":"2026-10-21","status":"unavailable","today":{"tasbeehRepetitions":0},"trackedSince":null}""")
        assertFalse(parsed.recordsReadable)
        assertTrue(ReminderStore.parseSnapshot("""{"date":"2026-10-21","status":"ok","today":{}}""").recordsReadable)
    }

    @Test
    fun whatNativeQueuedIsStillShownWhenTheAppsRecordsAreUnknown_saidToBePartial() {
        val b = DailySummary.compose(null, today, 7, "stats", "en", allTimeSoFar = since, recordsKnown = false).body
        assertTrue(b, b.startsWith("Recorded today: Tasbeeh 7"))
        assertTrue(b, b.contains("Only what was recorded outside the app is shown"))
        assertFalse(b, b.contains("Since the beginning"))
    }

    @Test
    fun aVerifiedEmptyDayAndARecordedDayAreUnchanged() {
        assertTrue(body(snapshot(), mode = "stats").startsWith("No dhikr was recorded in DITHAR today."))
        val recorded = body(snapshot(DailySummary.Activity(tasbeeh = 5)), mode = "stats")
        assertTrue(recorded, recorded.startsWith("Recorded today: Tasbeeh 5"))
        assertFalse(recorded, recorded.contains("outside the app"))
    }
}
