package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Resume Adhkar for «تشغيل الكل»: the saved point is the next dhikr and repetition NOT finished — a
 * repetition heard to its end is never replayed, one cut off part-way plays again — and a run resumed
 * from it continues there, reporting its place in the whole list.
 */
class AudioAdhkarPlayAllResumeTest {
    private fun item(id: String, reps: Int) = PlaylistItem(id, id, "", Recitation(listOf("public/audio/adhkar/morning/$id.mp3")), reps)
    private val run = listOf(item("a", 3), item("b", 1), item("c", 2))
    private val ids = run.map { it.dhikrId }

    @Test
    fun aFinishedRepetitionMovesThePointOn_oneCutOffDoesNot() {
        val c = PlaybackCursor(run)
        // Repetition 1 of "a" is playing: not finished, so nothing to save beyond the start.
        val t = c.beginPlayback()
        assertEquals(PlaybackCursor.Point(0, 1, true), c.resumePoint())
        // Heard to its end: the point is repetition 2 (during the silence before it, too).
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(t))
        assertEquals(PlayAllProgress(ids, 0, 2, 7), PlayAllProgress.from(c.resumePoint(), ids, 0, 7))
    }

    @Test
    fun afterADhikrsLastRepetitionThePointIsTheNextDhikr_andTheRunsEndLeavesNone() {
        val c = PlaybackCursor(listOf(item("a", 1), item("b", 1)))
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.complete(c.beginPlayback()))
        assertEquals(PlayAllProgress(listOf("a", "b"), 1, 1, 0), PlayAllProgress.from(c.resumePoint(), listOf("a", "b"), 0, 0))
        c.advance()
        assertEquals(PlaybackCursor.Step.FINISHED, c.complete(c.beginPlayback()))
        assertNull(PlayAllProgress.from(c.resumePoint(), listOf("a", "b"), 0, 0))
    }

    @Test
    fun aResumedRunStartsAtTheSavedDhikrAndRepetition_andSavesItsPlaceInTheWholeList() {
        // Saved: dhikr "c" (index 2), repetition 2. The service plays the run from there (startManualSession: drop + startRepetition).
        val offset = 2
        val c = PlaybackCursor(run.drop(offset), 2)
        assertEquals("c", c.current?.dhikrId)
        assertEquals(2, c.repetition)
        // The point stays in the whole run's terms.
        assertEquals(PlayAllProgress(ids, 2, 2, 1), PlayAllProgress.from(c.resumePoint(), ids, offset, 1))
        assertEquals(PlaybackCursor.Step.FINISHED, c.complete(c.beginPlayback()))
        assertNull(PlayAllProgress.from(c.resumePoint(), ids, offset, 1))
    }

    @Test
    fun aSkipMovesThePointToTheNextDhikr() {
        val c = PlaybackCursor(run)
        c.beginPlayback()
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.skipDhikr())
        assertEquals(PlayAllProgress(ids, 1, 1, 0), PlayAllProgress.from(c.resumePoint(), ids, 0, 0))
    }

    @Test
    fun theSavedPointRoundTrips_andAnImpossibleOneIsIgnored() {
        val p = PlayAllProgress(ids, 1, 1, 42)
        assertEquals(p, PlayAllProgress.parse(p.toJson().toString()))
        assertNull(PlayAllProgress.parse("""{"ids":["a"],"index":3,"repetition":1}"""))
        assertNull(PlayAllProgress.parse("""{"ids":[],"index":0,"repetition":1}"""))
        assertNull(PlayAllProgress.parse("""{"ids":["a"],"index":0,"repetition":0}"""))
        assertNull(PlayAllProgress.parse("not json"))
        assertNull(PlayAllProgress.parse(null))
    }
}
