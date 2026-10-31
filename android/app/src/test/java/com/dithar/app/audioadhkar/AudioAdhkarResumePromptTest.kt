package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * An adhan-interrupted Morning/Evening session: saved exactly where it
 * stopped, offered back by ONE "Resume Adhkar" prompt after the adhan pause,
 * and never continued without the user (ResumePrompt, PlaybackCursor.resumePoint).
 */
class AudioAdhkarResumePromptTest {
    private val minute = 60_000L
    private fun item(id: String, reps: Int) = PlaylistItem(id, id, "", Recitation(listOf("public/audio/adhkar/evening/$id.mp3")), reps)

    private fun saved(occurrence: Long = 1_000L, expiresAt: Long = 10_000_000L, prompted: Boolean = false) =
        SavedProgress(occurrence, index = 3, repetition = 2, part = 0, positionMillis = 4_200L, rotationSlot = -1, promptAt = 2_000L, expiresAt = expiresAt, prompted = prompted)

    // ---- where the session continues -------------------------------------

    @Test
    fun resumePointIsTheRepetitionUnderWayWhileItPlays() {
        val c = PlaybackCursor(listOf(item("a", 3), item("b", 1)))
        c.beginPlayback()
        assertEquals(PlaybackCursor.Point(0, 1, inProgress = true), c.resumePoint())
    }

    @Test
    fun aRepetitionHeardToItsEndIsNeverReplayed() {
        val c = PlaybackCursor(listOf(item("a", 3), item("b", 1)))
        c.complete(c.beginPlayback()) // repetition 1 done, in the silence before repetition 2
        assertEquals(PlaybackCursor.Point(0, 2, inProgress = false), c.resumePoint())
    }

    @Test
    fun afterTheLastRepetitionTheNextDhikrIsTheResumePoint() {
        val c = PlaybackCursor(listOf(item("a", 1), item("b", 2)))
        c.complete(c.beginPlayback())
        assertEquals(PlaybackCursor.Point(1, 1, inProgress = false), c.resumePoint())
    }

    @Test
    fun aFinishedSessionHasNothingToResume() {
        val c = PlaybackCursor(listOf(item("a", 1)))
        c.complete(c.beginPlayback())
        assertNull(c.resumePoint())
    }

    @Test
    fun aResumedSessionStartsAtItsSavedRepetitionAndFinishesTheRestOnly() {
        val c = PlaybackCursor(listOf(item("a", 3), item("b", 1)), startRepetition = 2)
        assertEquals(2, c.repetition)
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(c.beginPlayback()))
        c.advance()
        assertEquals(3, c.repetition)
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.complete(c.beginPlayback()))
    }

    @Test
    fun aSavedRepetitionBeyondTheItemsCountIsClamped() {
        assertEquals(3, PlaybackCursor(listOf(item("a", 3)), startRepetition = 9).repetition)
        assertEquals(1, PlaybackCursor(listOf(item("a", 3)), startRepetition = 0).repetition)
    }

    // ---- the one prompt ----------------------------------------------------

    @Test
    fun thePromptShowsOnceAfterThePauseForTheSessionStillSaved() {
        assertTrue(ResumePrompt.shouldPrompt(saved(), 1_000L, 3_000L, sectionEnabled = true, suppressed = false, sessionActive = false))
        // Already shown: never a second notification.
        assertFalse(ResumePrompt.shouldPrompt(saved(prompted = true), 1_000L, 3_000L, sectionEnabled = true, suppressed = false, sessionActive = false))
    }

    @Test
    fun noPromptForAStaleReplacedOrSwitchedOffSession() {
        assertFalse(ResumePrompt.shouldPrompt(null, 1_000L, 3_000L, true, false, false))
        assertFalse(ResumePrompt.shouldPrompt(saved(occurrence = 999L), 1_000L, 3_000L, true, false, false))
        assertFalse(ResumePrompt.shouldPrompt(saved(), 1_000L, 3_000L, sectionEnabled = false, suppressed = false, sessionActive = false))
    }

    @Test
    fun noPromptDuringAnAdhanPauseWhileSomethingPlaysOrAfterTheWindow() {
        assertFalse(ResumePrompt.shouldPrompt(saved(), 1_000L, 3_000L, true, suppressed = true, sessionActive = false))
        assertFalse(ResumePrompt.shouldPrompt(saved(), 1_000L, 3_000L, true, suppressed = false, sessionActive = true))
        assertFalse(ResumePrompt.shouldPrompt(saved(expiresAt = 3_000L), 1_000L, 3_000L, true, false, false))
    }

    @Test
    fun resumingNeedsASavedSessionStillInsideItsWindowAndTheSectionOn() {
        assertTrue(ResumePrompt.canResume(saved(), 5_000L, sectionEnabled = true))
        assertFalse(ResumePrompt.canResume(saved(expiresAt = 5_000L), 5_000L, sectionEnabled = true))
        assertFalse(ResumePrompt.canResume(saved(), 5_000L, sectionEnabled = false))
        assertFalse(ResumePrompt.canResume(null, 5_000L, sectionEnabled = true))
    }

    @Test
    fun aSessionExpiresAtItsPrayerTimeWindowsEndOrThreeHoursAfterAnUnplannedStart() {
        val slots = listOf(DailySlot(windowStart = 100L, start = 1_000L, windowEnd = 50_000L))
        assertEquals(50_000L, ResumePrompt.expiresAt(1_000L, slots))
        assertEquals(1_000L + Resume.GIVE_UP_MILLIS, ResumePrompt.expiresAt(1_000L, null))
        assertEquals(1_000L + Resume.GIVE_UP_MILLIS, ResumePrompt.expiresAt(1_000L, listOf(DailySlot(0L, 7L, 9L))))
    }

    @Test
    fun thePromptComesWhenTheAdhanPauseEnds() {
        val maghrib = Window(100 * minute, 130 * minute)
        // Stopped inside the pause: its end.
        assertEquals(130 * minute, ResumePrompt.promptAt(100 * minute, listOf(maghrib)))
        // Stopped a moment before the window opens: that window's end, never "right away".
        assertEquals(130 * minute, ResumePrompt.promptAt(100 * minute - 500L, listOf(maghrib)))
        // Merged pauses (Isha right after): the end of both.
        assertEquals(160 * minute, ResumePrompt.promptAt(100 * minute, listOf(maghrib, Window(125 * minute, 160 * minute))))
        // No window known (e.g. adhan times not pushed yet): a plain adhan pause from now.
        assertEquals(10 * minute + AdhanSuppression.PAUSE_MILLIS, ResumePrompt.promptAt(10 * minute, emptyList()))
    }
}
