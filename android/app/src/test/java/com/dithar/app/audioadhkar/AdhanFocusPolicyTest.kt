package com.dithar.app.audioadhkar

import android.media.AudioManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** The adhan's audio-focus rules (AdhanFocusPolicy): interruptions wait and come back; they never end it at once. */
class AdhanFocusPolicyTest {
    @Test
    fun requestResultsMatchAndroid() {
        assertEquals(AudioManager.AUDIOFOCUS_REQUEST_FAILED, AdhanFocusPolicy.REQUEST_FAILED)
        assertEquals(AudioManager.AUDIOFOCUS_REQUEST_GRANTED, AdhanFocusPolicy.REQUEST_GRANTED)
        assertEquals(AudioManager.AUDIOFOCUS_REQUEST_DELAYED, AdhanFocusPolicy.REQUEST_DELAYED)
    }

    @Test
    fun anyLossMakesTheAdhanWaitInsteadOfAUserPause() {
        // A video starting (a permanent loss) used to pause the adhan for good — now it waits like a short interruption.
        assertEquals(AdhanFocusPolicy.Action.WAIT, AdhanFocusPolicy.onChange(FocusPolicy.LOSS, waiting = false))
        assertEquals(AdhanFocusPolicy.Action.WAIT, AdhanFocusPolicy.onChange(FocusPolicy.LOSS_TRANSIENT, waiting = false))
        assertEquals(AdhanFocusPolicy.Action.DUCK, AdhanFocusPolicy.onChange(FocusPolicy.LOSS_TRANSIENT_CAN_DUCK, waiting = false))
    }

    @Test
    fun theFocusComingBackResumesAWaitingAdhanOnly() {
        assertEquals(AdhanFocusPolicy.Action.RESUME, AdhanFocusPolicy.onChange(FocusPolicy.GAIN, waiting = true))
        assertEquals(AdhanFocusPolicy.Action.RESTORE, AdhanFocusPolicy.onChange(FocusPolicy.GAIN, waiting = false))
        assertNull(AdhanFocusPolicy.onChange(42, waiting = true))
    }

    @Test
    fun aCallMakesItWaitButARefusalWithoutACallStillPlays() {
        assertTrue(AdhanFocusPolicy.startsNow(AdhanFocusPolicy.REQUEST_GRANTED, inCall = false))
        // A call: refused or delayed, it waits — never plays over it.
        assertFalse(AdhanFocusPolicy.startsNow(AdhanFocusPolicy.REQUEST_FAILED, inCall = true))
        assertFalse(AdhanFocusPolicy.startsNow(AdhanFocusPolicy.REQUEST_DELAYED, inCall = true))
        // Motorola: the alarm-started adhan was refused focus with no call (Android 15+ background rule)
        // and waited for a tap on Play — it now starts at once, as adhkar do on the same phone.
        assertTrue(AdhanFocusPolicy.startsNow(AdhanFocusPolicy.REQUEST_FAILED, inCall = false))
        assertTrue(AdhanFocusPolicy.startsNow(AdhanFocusPolicy.REQUEST_DELAYED, inCall = false))
    }

    @Test
    fun itAsksForTheAudioAgainOnlyWhenNothingElsePlaysAndNoCall() {
        assertTrue(AdhanFocusPolicy.mayRetry(otherAudioPlaying = false, inCall = false))
        assertFalse(AdhanFocusPolicy.mayRetry(otherAudioPlaying = true, inCall = false))
        assertFalse(AdhanFocusPolicy.mayRetry(otherAudioPlaying = false, inCall = true))
    }

    @Test
    fun aWaitIsBoundedSoItNeverResumesLateOrLingers() {
        val since = 1_000_000L
        assertFalse(AdhanFocusPolicy.gaveUp(since, since + AdhanFocusPolicy.WAIT_MILLIS - 1, userPaused = false))
        assertTrue(AdhanFocusPolicy.gaveUp(since, since + AdhanFocusPolicy.WAIT_MILLIS, userPaused = false))
        // The user's own pause is given longer, but still ends — a forgotten paused adhan can't block the player.
        assertFalse(AdhanFocusPolicy.gaveUp(since, since + AdhanFocusPolicy.WAIT_MILLIS, userPaused = true))
        assertTrue(AdhanFocusPolicy.gaveUp(since, since + AdhanFocusPolicy.USER_PAUSE_MILLIS, userPaused = true))
        assertTrue(AdhanFocusPolicy.RETRY_MILLIS < AdhanFocusPolicy.WAIT_MILLIS)
    }
}
