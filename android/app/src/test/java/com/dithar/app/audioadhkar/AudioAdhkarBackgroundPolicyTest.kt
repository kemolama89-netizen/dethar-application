package com.dithar.app.audioadhkar

import android.media.AudioManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Audio focus and interrupted-session rules of the background player (AudioAdhkarPlaybackService). */
class AudioAdhkarBackgroundPolicyTest {
    @Test
    fun focusConstantsMatchAndroid() {
        assertEquals(AudioManager.AUDIOFOCUS_GAIN, FocusPolicy.GAIN)
        assertEquals(AudioManager.AUDIOFOCUS_LOSS, FocusPolicy.LOSS)
        assertEquals(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT, FocusPolicy.LOSS_TRANSIENT)
        assertEquals(AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK, FocusPolicy.LOSS_TRANSIENT_CAN_DUCK)
        assertEquals(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK, FocusPolicy.GAIN_TRANSIENT_MAY_DUCK)
    }

    @Test
    fun adhkarNeverRequestExclusiveFocusOnlyTheAdhanDoes() {
        // Another app's video/music is ducked, not paused, while adhkar play.
        assertEquals(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK, FocusPolicy.requestFor(adhan = false))
        assertEquals(AudioManager.AUDIOFOCUS_GAIN, FocusPolicy.requestFor(adhan = true))
    }

    @Test
    fun aShortInterruptionPausesAndResumesWhenItEnds() {
        assertEquals(FocusPolicy.Action.PAUSE_UNTIL_GAIN, FocusPolicy.onChange(FocusPolicy.LOSS_TRANSIENT, pausedForFocus = false))
        assertEquals(FocusPolicy.Action.RESUME_AND_RESTORE, FocusPolicy.onChange(FocusPolicy.GAIN, pausedForFocus = true))
    }

    @Test
    fun regainingFocusNeverResumesWhatTheUserPaused() {
        // pausedForFocus is false after a user pause (or a permanent loss): only the volume comes back.
        assertEquals(FocusPolicy.Action.RESTORE, FocusPolicy.onChange(FocusPolicy.GAIN, pausedForFocus = false))
    }

    @Test
    fun aPermanentLossPausesUntilTheUserResumes() {
        assertEquals(FocusPolicy.Action.PAUSE, FocusPolicy.onChange(FocusPolicy.LOSS, pausedForFocus = true))
    }

    @Test
    fun mayDuckLowersTheVolume() {
        assertEquals(FocusPolicy.Action.DUCK, FocusPolicy.onChange(FocusPolicy.LOSS_TRANSIENT_CAN_DUCK, pausedForFocus = false))
        assertTrue(FocusPolicy.DUCK_VOLUME in 0f..0.5f)
        assertNull(FocusPolicy.onChange(0, pausedForFocus = false))
    }

    private val start = 1_790_000_000_000L

    @Test
    fun anInterruptedDailySessionContinuesWithinTheResumeWindow() {
        assertTrue(ActiveSession(Section.MORNING, start, 4).shouldContinue(start + 10 * 60_000L))
        assertTrue(ActiveSession(Section.EVENING, start, 0).shouldContinue(start + Resume.GIVE_UP_MILLIS - 1))
    }

    @Test
    fun anInterruptedSessionIsDroppedOnceTooLate() {
        assertFalse(ActiveSession(Section.MORNING, start, 4).shouldContinue(start + Resume.GIVE_UP_MILLIS))
        assertFalse(ActiveSession(Section.MORNING, start, 4).shouldContinue(start + 24 * 60 * 60_000L))
    }

    @Test
    fun miscAndInvalidPlacesNeverContinue() {
        assertFalse(ActiveSession(Section.MISC, start, 0).shouldContinue(start + 1_000L))
        assertFalse(ActiveSession(Section.MORNING, 0L, 0).shouldContinue(start))
        assertFalse(ActiveSession(Section.MORNING, start, -1).shouldContinue(start + 1_000L))
    }
}
