package com.dithar.app.voicerecognition

/**
 * The Tasbeeh screen's "Recognition Sounds" switch (lib/voiceTasbeehSounds.ts),
 * sent with every startSession as `recognitionSounds`.
 *
 * Where the sounds come from: Android's speech-recognition service (usually
 * the Google app) plays its own tones as listening starts and ends — after
 * a recognized phrase, and on silence / no match. DITHAR plays none of them.
 * Android documents no SpeechRecognizer / RecognizerIntent option to turn
 * them off (undocumented extras such as "android.speech.extra.BEEP_SOUND"
 * are reported ignored by many recognizers), so they can only be quietened
 * by muting the output stream they play on — which also silences whatever
 * else plays on that stream.
 *
 * What "off" does, kept as narrow as possible (2026-10-16 revision):
 *  - STREAM_SYSTEM (system sounds: the tones on recent recognizers, key
 *    clicks) — muted while listening;
 *  - STREAM_MUSIC (media: the tones on older recognizers) — muted only when
 *    no other app is playing media at that moment, so a video or song in
 *    another app is never silenced;
 *  - STREAM_NOTIFICATION is never muted (notifications keep sounding), and
 *    neither is the ringer: a mute that would change the ringer mode (where
 *    the system stream is an alias of the ringer) is undone at once, and Do
 *    Not Disturb is never touched.
 * Consequence (shown under the switch): on a device whose recognizer plays
 * its tones on the notification or ringer stream, or while another app is
 * playing media, the tones can still be heard. A stream the user had
 * already muted is left alone; what was muted is saved so a session cut off
 * by the app being killed is restored at the next start ([decode]).
 *
 *  - off, or not sent (an older web bundle): mute as above while listening;
 *  - on: never mute, and undo a mute an earlier pass of this session applied.
 */
object RecognitionSoundsPolicy {
    // AudioManager's values, mirrored so this stays testable on the JVM.
    const val STREAM_SYSTEM = 1
    const val STREAM_MUSIC = 3
    const val STREAM_NOTIFICATION = 5

    /** Streams this policy mutes. Never the notification stream or the ringer. */
    val STREAMS = listOf(STREAM_SYSTEM, STREAM_MUSIC)

    /**
     * Streams restored after a kill: also the notification stream, which the
     * previous build muted — so an install updated mid-session isn't left muted.
     */
    val RESTORABLE = listOf(STREAM_SYSTEM, STREAM_MUSIC, STREAM_NOTIFICATION)

    /** What "off" mutes for this listening session: system sounds, and media only while no other app plays any. */
    fun streamsToMute(otherMediaPlaying: Boolean): List<Int> = if (otherMediaPlaying) listOf(STREAM_SYSTEM) else listOf(STREAM_SYSTEM, STREAM_MUSIC)

    fun muteWhileListening(recognitionSounds: Boolean?): Boolean = recognitionSounds != true

    /** A mute is kept only if it left the ringer mode as it was. */
    fun keepMute(ringerModeBefore: Int, ringerModeAfter: Int): Boolean = ringerModeBefore == ringerModeAfter

    fun encode(streams: List<Int>): String = streams.joinToString(",")

    /** The streams saved by [encode]; unknown values are ignored. */
    fun decode(saved: String?): List<Int> =
        saved?.split(",")?.mapNotNull { it.trim().toIntOrNull() }?.filter { it in RESTORABLE }?.distinct() ?: emptyList()
}
