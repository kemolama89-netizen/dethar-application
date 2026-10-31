package com.dithar.app.voicerecognition

import android.media.AudioManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** The Tasbeeh screen's "Recognition Sounds" switch: when the recognizer's tones are muted. */
class RecognitionSoundsPolicyTest {
    @Test
    fun switchedOffTheTonesAreMutedWhileListening() {
        assertTrue(RecognitionSoundsPolicy.muteWhileListening(false))
    }

    @Test
    fun switchedOnNothingIsMuted() {
        assertFalse(RecognitionSoundsPolicy.muteWhileListening(true))
    }

    @Test
    fun anOlderWebBundleThatSendsNothingKeepsTheEarlierBehavior() {
        assertTrue(RecognitionSoundsPolicy.muteWhileListening(null))
    }

    @Test
    fun allTheStreamsTheTonesCanUseAreCovered() {
        assertEquals(AudioManager.STREAM_MUSIC, RecognitionSoundsPolicy.STREAM_MUSIC)
        assertEquals(AudioManager.STREAM_SYSTEM, RecognitionSoundsPolicy.STREAM_SYSTEM)
        assertEquals(AudioManager.STREAM_NOTIFICATION, RecognitionSoundsPolicy.STREAM_NOTIFICATION)
        assertEquals(AudioManager.STREAM_NOTIFICATION, RecognitionSoundsPolicy.STREAM_NOTIFICATION)
    }

    @Test
    fun notificationsAndTheRingerAreNeverMuted() {
        for (playing in listOf(true, false)) {
            val streams = RecognitionSoundsPolicy.streamsToMute(playing)
            assertFalse(streams.contains(AudioManager.STREAM_NOTIFICATION))
            assertFalse(streams.contains(AudioManager.STREAM_RING))
            assertTrue(RecognitionSoundsPolicy.STREAMS.containsAll(streams))
        }
        assertFalse(RecognitionSoundsPolicy.STREAMS.contains(AudioManager.STREAM_NOTIFICATION))
    }

    @Test
    fun anotherAppsMediaIsNeverSilenced() {
        assertEquals(listOf(AudioManager.STREAM_SYSTEM), RecognitionSoundsPolicy.streamsToMute(otherMediaPlaying = true))
        assertEquals(listOf(AudioManager.STREAM_SYSTEM, AudioManager.STREAM_MUSIC), RecognitionSoundsPolicy.streamsToMute(otherMediaPlaying = false))
    }

    @Test
    fun aMuteThatWouldChangeTheRingerModeIsNeverKept() {
        assertTrue(RecognitionSoundsPolicy.keepMute(AudioManager.RINGER_MODE_NORMAL, AudioManager.RINGER_MODE_NORMAL))
        assertFalse(RecognitionSoundsPolicy.keepMute(AudioManager.RINGER_MODE_NORMAL, AudioManager.RINGER_MODE_VIBRATE))
        assertFalse(RecognitionSoundsPolicy.keepMute(AudioManager.RINGER_MODE_NORMAL, AudioManager.RINGER_MODE_SILENT))
    }

    @Test
    fun whatWasMutedIsSavedAndRestoredAfterAKill() {
        val saved = RecognitionSoundsPolicy.encode(listOf(3, 1, 5))
        assertEquals(listOf(3, 1, 5), RecognitionSoundsPolicy.decode(saved)) // 5: muted by the previous build — still restored
        // Nothing saved, corrupt or foreign values: nothing (or only the known streams) is touched.
        assertEquals(emptyList<Int>(), RecognitionSoundsPolicy.decode(null))
        assertEquals(emptyList<Int>(), RecognitionSoundsPolicy.decode(""))
        assertEquals(listOf(3), RecognitionSoundsPolicy.decode("3,x,2,3"))
    }
}
