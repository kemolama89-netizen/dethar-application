package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * A Morning/Evening session is PRACTICED once any of its audio plays
 * (SessionPractice), separately from its repetitions, which count only when
 * heard to their end; «الذكر التالي» (PlaybackCursor.skipDhikr) never marks
 * a skipped repetition as heard.
 */
class SessionPracticeTest {
    private fun item(id: String, reps: Int) = PlaylistItem(id, id, id, Recitation(listOf("$id.mp3")), reps)
    private fun cursor(vararg reps: Int) = PlaybackCursor(reps.mapIndexed { i, r -> item("d$i", r) })

    @Test
    fun scheduledSessionsAndPlayAllRunsOfMorningEveningCount() {
        assertTrue(SessionPractice.counts(isDaily = true, manual = false, playAll = false, adhan = false))
        assertTrue(SessionPractice.counts(isDaily = true, manual = true, playAll = true, adhan = false))
    }

    @Test
    fun aSingleListenMiscAndTheAdhanNeverCount() {
        assertFalse(SessionPractice.counts(isDaily = true, manual = true, playAll = false, adhan = false))
        assertFalse(SessionPractice.counts(isDaily = false, manual = false, playAll = false, adhan = false))
        assertFalse(SessionPractice.counts(isDaily = false, manual = true, playAll = true, adhan = false))
        assertFalse(SessionPractice.counts(isDaily = true, manual = false, playAll = false, adhan = true))
    }

    @Test
    fun oneRecordPerSession() {
        // A scheduled session (and its resume) by its occurrence — the id the app already knows.
        assertEquals("1790000000000", SessionPractice.key(1_790_000_000_000L, "2026-10-21"))
        // A Play All run by its day: playing it again that day is the same record.
        assertEquals("day:2026-10-21", SessionPractice.key(0L, "2026-10-21"))
        assertEquals(SessionPractice.key(0L, "2026-10-21"), SessionPractice.key(0L, "2026-10-21"))
    }

    @Test
    fun partialListeningThenSkipNeverCountsTheRepetition() {
        val c = cursor(100, 3)
        val token = c.beginPlayback() // repetition 1 of 100 playing
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.skipDhikr())
        // Its "completed" arriving late is ignored: never counted.
        assertEquals(PlaybackCursor.Step.IGNORED, c.complete(token))
        assertTrue(c.advance())
        assertEquals(1, c.index)
        assertEquals(1, c.repetition)
    }

    @Test
    fun oneRepetitionHeardThenSkipped() {
        val c = cursor(100, 3)
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(c.beginPlayback())) // the one counted
        // In the silence before repetition 2: Next goes to the next dhikr, not to repetition 2.
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.skipDhikr())
        c.advance()
        assertEquals(1 to 1, c.index to c.repetition)
    }

    @Test
    fun skippingInTheSilenceAfterADhikrPlaysTheOneThatWasComing() {
        val c = cursor(1, 2, 2)
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.complete(c.beginPlayback()))
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.skipDhikr())
        c.advance()
        assertEquals(1, c.index) // the next dhikr — never one further
    }

    @Test
    fun theLastDhikrFinishesTheSession() {
        val c = cursor(2, 5)
        c.beginPlayback()
        c.skipDhikr()
        c.advance()
        assertFalse(c.hasNextDhikr)
        c.beginPlayback()
        assertEquals(PlaybackCursor.Step.FINISHED, c.skipDhikr())
        assertTrue(c.finished)
        assertNull(c.resumePoint())
        assertEquals(PlaybackCursor.Step.IGNORED, c.skipDhikr())
    }

    @Test
    fun fullCompletionIsUnchanged() {
        val c = cursor(2, 1)
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(c.beginPlayback()))
        c.advance()
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.complete(c.beginPlayback()))
        c.advance()
        assertEquals(PlaybackCursor.Step.FINISHED, c.complete(c.beginPlayback()))
    }

    @Test
    fun pauseAndResumeKeepThePlaceAndAfterASkipTheResumePointIsTheNextDhikr() {
        val c = cursor(3, 3)
        c.beginPlayback()
        // Pausing doesn't move the cursor; resuming continues the same repetition.
        assertEquals(PlaybackCursor.Point(0, 1, true), c.resumePoint())
        c.skipDhikr()
        assertEquals(PlaybackCursor.Point(1, 1, false), c.resumePoint())
    }
}
