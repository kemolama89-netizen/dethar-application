package com.dithar.app.voicerecognition

import android.media.AudioDeviceInfo

/**
 * Pure decision logic for whether Voice Tasbeeh should attempt to route
 * speech recognition through a connected Bluetooth headset's microphone
 * (Bluetooth SCO — the profile that actually carries a headset's own mic
 * signal; A2DP is output/playback-only and never carries mic input),
 * separated out from VoiceRecognitionPlugin's own AudioManager/
 * BroadcastReceiver plumbing so it is unit-testable without Robolectric or
 * a real device — `AudioDeviceInfo.TYPE_*` are plain compile-time int
 * constants, safe to reference without touching the live audio stack (see
 * BluetoothMicRoutingTest).
 *
 * IMPORTANT — see VoiceRecognitionPlugin.kt's own doc comment on this: this
 * only decides whether a Bluetooth SCO input device is CURRENTLY AVAILABLE
 * to route to. Whether requesting that route (AudioManager.startBluetoothSco)
 * actually makes Android's SpeechRecognizer-bound RecognitionService use it
 * is a separate, unverified question — there is no public API that
 * guarantees it.
 */
object BluetoothMicRouting {
    /** True if any of the given INPUT device types includes a connected
     *  Bluetooth SCO (headset-profile) microphone. */
    fun hasBluetoothScoInput(inputDeviceTypes: List<Int>): Boolean = inputDeviceTypes.contains(AudioDeviceInfo.TYPE_BLUETOOTH_SCO)
}
