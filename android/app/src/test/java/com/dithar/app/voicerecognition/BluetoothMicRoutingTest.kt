package com.dithar.app.voicerecognition

import android.media.AudioDeviceInfo
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pure JVM tests — no Android SDK runtime, no Robolectric, since
 * AudioDeviceInfo.TYPE_* are plain int constants (see BluetoothMicRouting's
 * own doc comment for why this is safe with the unmocked android.jar used
 * elsewhere in this project's unit tests).
 */
class BluetoothMicRoutingTest {

    @Test
    fun `no input devices means no bluetooth mic`() {
        assertFalse(BluetoothMicRouting.hasBluetoothScoInput(emptyList()))
    }

    @Test
    fun `phone builtin mic only means no bluetooth mic`() {
        assertFalse(BluetoothMicRouting.hasBluetoothScoInput(listOf(AudioDeviceInfo.TYPE_BUILTIN_MIC)))
    }

    @Test
    fun `a connected bluetooth SCO device is detected among other inputs`() {
        assertTrue(
            BluetoothMicRouting.hasBluetoothScoInput(
                listOf(AudioDeviceInfo.TYPE_BUILTIN_MIC, AudioDeviceInfo.TYPE_BLUETOOTH_SCO),
            ),
        )
    }

    @Test
    fun `bluetooth A2DP alone (playback-only, no mic) is not treated as a usable mic input`() {
        assertFalse(BluetoothMicRouting.hasBluetoothScoInput(listOf(AudioDeviceInfo.TYPE_BLUETOOTH_A2DP)))
    }

    @Test
    fun `wired headset is not mistaken for a bluetooth mic`() {
        assertFalse(BluetoothMicRouting.hasBluetoothScoInput(listOf(AudioDeviceInfo.TYPE_WIRED_HEADSET)))
    }
}
