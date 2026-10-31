package com.dithar.app.audioadhkar

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.MediaMetadataRetriever
import android.media.MediaPlayer
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import com.dithar.app.MainActivity
import com.dithar.app.R
import com.dithar.app.prayernotifications.AdhanVoice
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Plays a scheduled Audio Adhkar session in the background — a Morning or
 * Evening session (the playlist pushed from JS: only dhikr that have their
 * own recording, in order, each its written number of times, one after
 * another, optionally continuing from a given dhikr), or one Misc dhikr
 * (the next of its cycle). Runs as a media-playback foreground service with a MediaSession,
 * so the phone shows its standard system media controls (current dhikr +
 * Pause/Play) and DITHAR doesn't need to be open.
 *
 * Repetition rules match the in-app player: a repetition advances only
 * when a playback of the file actually completes, and each playback's
 * completion counts once (PlaybackCursor tokens). Pause/resume keep the
 * same dhikr and repetition and continue from the paused position.
 *
 * One playback = one repetition of a dhikr: its file, or for a Quranic
 * recitation its ayah files back to back (no silence between ayahs): while
 * one ayah plays the next is prepared and handed to it with
 * MediaPlayer.setNextMediaPlayer, so Android starts it gaplessly. With the
 * section's reciter set to random, each Quranic recitation's reciter is
 * drawn once, as the session starts (AudioAdhkarRotation).
 *
 * Every completed playback — including between repetitions of the same
 * dhikr, but not after the session's last one — is followed by 1.5 seconds
 * of silence (SilenceGap); the next repetition/dhikr only becomes current
 * when its playback starts. A native Handler times the gap, under the
 * session's wake lock so it also holds with the screen off.
 *
 * Adhan windows: nothing starts inside one, and a session is stopped as
 * the next one begins (a Handler armed for that moment, re-checked before
 * every dhikr). A stopped Morning/Evening session is SAVED exactly where it
 * stopped — dhikr, repetition, file and position — and never continues by
 * itself: when the adhan pause ends the user gets one "Resume Adhkar"
 * notification (AudioAdhkarResumePromptReceiver), and only that action (or
 * the in-app button) continues it (ACTION_RESUME_SAVED). A Misc dhikr
 * doesn't continue — the next tick plays the next one.
 *
 * The adhan at prayer time (startAdhan, from the prayer-time alarm when
 * auto-adhan is on) is a session of its own here, so it can never overlap
 * an adhkar session: one in progress is stopped as for any adhan window
 * (and continues after it); the adhan then plays exactly its segment of
 * the recording, on the media stream. Adhan sessions aren't adhkar: they
 * are never reported as Audio Adhkar state ("playbackState") but have their
 * own ("adhanState": playing / paused / waiting for the audio), which the
 * Home screen player shows.
 *
 * «استماع» in the app (playNow) is a manual session here too — one dhikr,
 * or, for «تشغيل الكل» (Play All), every dhikr of the section one after
 * another — started by the user — so it keeps playing with the screen off, exactly
 * like a scheduled one: no JS timer, React or WebView is involved once it
 * has started. A manual session may play during an adhan pause (as the
 * in-app player always could), stops when the next adhan begins and never
 * continues after it; a scheduled session or the adhan replaces it.
 *
 * Staying alive with the screen off: the media foreground service keeps
 * the process; a session-level partial wake lock (held while playing,
 * released while paused) keeps the CPU through file preparation and the
 * silences between repetitions. Audio focus: a short interruption (a call,
 * a voice prompt) pauses and resumes by itself; a permanent loss pauses
 * until the user resumes (FocusPolicy). The adhan has its own rules
 * (AdhanFocusPolicy): any interruption makes it wait and come back by
 * itself once the audio is free, within a bounded wait — it never plays
 * over a call or an app still playing. Headphones unplugged → pause.
 * If Android kills the service mid-session, a Morning/Evening session
 * continues from the dhikr it was on (START_STICKY restart, or after a
 * reboot — AudioAdhkarScheduler.recoverInterruptedSession), once, through
 * the resume alarm; Misc, the adhan and manual sessions never replay late.
 *
 * Its state is published to JS (AudioAdhkarPlugin "playbackState"), where
 * it drives the SAME playback state the Audio Adhkar screen already shows.
 */
class AudioAdhkarPlaybackService : Service() {
    private var cursor: PlaybackCursor? = null
    private var sessionSection = Section.EVENING
    /** The daily occurrence this session belongs to (0 for Misc). */
    private var sessionOccurrence = 0L
    /** One id per session (scheduled, «استماع» or resumed) — recorded with each completion, so the app counts sessions. */
    private var sessionId = ""
    /** The current repetition's files, their real lengths (null when unreadable), and where in them it started. */
    private var repetitionDurations: List<Long?> = emptyList()
    /** The current repetition was already accounted for (completed, or its stopped-early listening recorded). */
    private var repetitionAccounted = true
    private var repetitionStartOffset: Long? = null
    /** How many playlist items this session skipped (a resumed session): absolute index = startOffset + cursor.index. */
    private var startOffset = 0
    private val stopForAdhan = Runnable { interruptForAdhan() }
    /** An adhan session: where its segment starts and ends in the file (null for adhkar sessions). */
    private var adhanStartMillis: Long? = null
    private var adhanEndMillis: Long? = null
    private val adhanSession get() = adhanEndMillis != null
    private val stopAtAdhanEnd = Runnable { if (adhanSession) endSession(null) }
    private val sessionLabel get() = if (adhanSession) LABEL_ADHAN else sessionSection.label
    private var player: MediaPlayer? = null
    /** The next file of the current playback, preparing or prepared. */
    private var nextPlayer: MediaPlayer? = null
    /** [nextPlayer] once it is chained to [player] (it starts by itself when [player] completes). */
    private var chainedPlayer: MediaPlayer? = null
    private var prepared = false
    /** Which file of the current playback's files plays now (a Quranic recitation is several). */
    private var currentPart = 0
    /** A resumed session's first playback: start at this file and position instead of the beginning. */
    private var pendingSeek: Pair<Int, Long>? = null
    private var paused = false
    private val handler = Handler(Looper.getMainLooper())
    private val gap = SilenceGap()
    /** Held while a session plays (not while paused): playback, preparation and the silences continue with the screen off. */
    private var sessionWakeLock: PowerManager.WakeLock? = null
    /** A user-started «استماع» session (playNow): see the class comment. */
    private var manualSession = false
    /** A «تشغيل الكل» run (a manual session of several adhkar). */
    private var playAllSession = false
    /** This session's practiced record is written (SessionPractice) — once. */
    private var practiceRecorded = false
    /** A daily session the user resumed ("Resume Adhkar"): like «استماع», it may play inside an adhan pause. */
    private var userResumed = false
    /** Paused by a short audio-focus loss: resumes when the focus comes back. */
    private var pausedForFocus = false
    /** The adhan has been paused since then — waiting for the audio ([pausedForFocus]) or by the user (AdhanFocusPolicy). */
    private var adhanPausedSince: Long? = null
    /**
     * While the adhan is paused: ends it once it has waited too long, and —
     * when it is waiting for the audio — asks for the focus again as soon as
     * no other app plays and no call is in progress.
     */
    private val adhanWaitTick: Runnable = object : Runnable {
        override fun run() {
            val since = adhanPausedSince ?: return
            if (cursor == null || !adhanSession || !paused) return
            val now = System.currentTimeMillis()
            if (AdhanFocusPolicy.gaveUp(since, now, userPaused = !pausedForFocus)) {
                trace("adhan: paused ${(now - since) / 1000}s (${if (pausedForFocus) "waiting for the audio" else "by the user"}) — it ends")
                AudioAdhkarStore(this@AudioAdhkarPlaybackService).appendEvent("adhan: ended after waiting ${(now - since) / 1000}s")
                return endSession(null)
            }
            if (pausedForFocus) {
                val am = getSystemService(AudioManager::class.java)
                val inCall = inCall()
                if (AdhanFocusPolicy.mayRetry(am.isMusicActive, inCall)) {
                    val result = requestFocus()
                    trace("adhan: the audio is free again — focus re-requested → $result")
                    if (AdhanFocusPolicy.startsNow(result, inCall)) {
                        setDucked(false)
                        resumePlayback(requestFocusAgain = false)
                        return
                    }
                }
            }
            handler.postDelayed(this, AdhanFocusPolicy.RETRY_MILLIS)
        }
    }
    private var ducked = false

    /** The adhan started without the focus: ask once more (the foreground state has settled by then), without pausing it. */
    private val adhanFocusFollowUp = Runnable {
        if (cursor != null && adhanSession && !paused) trace("adhan: focus follow-up → ${requestFocus()}")
    }

    private fun inCall(): Boolean {
        val mode = getSystemService(AudioManager::class.java).mode
        return mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION || mode == AudioManager.MODE_RINGTONE
    }
    private var noisyRegistered = false
    private val noisyReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY) {
                trace("headphones unplugged (becoming noisy) → pause")
                userPause()
            }
        }
    }
    private val playNextAfterSilence = Runnable {
        trace("silence ended (cursor=${cursor != null} paused=$paused)")
        if (cursor != null && !paused) playCurrent()
    }
    /** Diagnostics only: the screen going off/on during a session, next to what playback did. */
    private var screenRegistered = false
    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            trace("${intent.action?.substringAfterLast('.')} ${AudioAdhkarTrace.powerState(context)}")
        }
    }
    /** Diagnostics only: every 30 s while a session is active — where it is, and whether the CPU/process are alive. */
    private val heartbeat = object : Runnable {
        override fun run() {
            val c = cursor ?: return
            val position = try {
                player?.currentPosition ?: -1
            } catch (_: IllegalStateException) {
                -1
            }
            trace(
                "heartbeat ${sessionKind()} #${c.index} rep=${c.repetition} paused=$paused gap=${gap.active} " +
                    "playing=${try { player?.isPlaying } catch (_: IllegalStateException) { null }} pos=${position}ms " +
                    "wakeLock=${sessionWakeLock?.isHeld} ${AudioAdhkarTrace.powerState(this@AudioAdhkarPlaybackService)}",
            )
            handler.postDelayed(this, HEARTBEAT_MILLIS)
        }
    }

    private fun trace(message: String) = AudioAdhkarTrace.log(this, "service", message)

    private fun sessionKind(): String = when {
        cursor == null -> "none"
        adhanSession -> "adhan"
        manualSession -> "manual/${sessionSection.key}"
        else -> "scheduled/${sessionSection.key}@$sessionOccurrence"
    }
    private lateinit var session: MediaSession
    private var focusRequest: AudioFocusRequest? = null

    private val audioAttributes: AudioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_MEDIA)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        trace("created ${AudioAdhkarTrace.powerState(this)}")
        session = MediaSession(this, "DitharAudioAdhkar").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() {
                    trace("system media control: play")
                    resumePlayback()
                }
                override fun onPause() {
                    trace("system media control: pause")
                    userPause()
                }
                override fun onStop() {
                    trace("system media control: stop")
                    stopSession()
                }
                override fun onSkipToNext() {
                    trace("system media control: next dhikr")
                    skipToNextDhikr()
                }
            })
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        trace("onStartCommand action=${intent?.action?.substringAfterLast('.')} flags=$flags startId=$startId current=${sessionKind()}")
        when (intent?.action) {
            ACTION_START_SCHEDULED -> startSession(
                Section.of(intent.getStringExtra(EXTRA_SECTION)),
                intent.getLongExtra(EXTRA_OCCURRENCE, 0L),
                intent.getIntExtra(EXTRA_START_INDEX, 0),
            )
            ACTION_RESUME_SAVED -> resumeSavedSession(Section.of(intent.getStringExtra(EXTRA_SECTION)))
            ACTION_START_ADHAN -> startAdhanSession(
                intent.getStringExtra(EXTRA_ADHAN_PATH) ?: return START_NOT_STICKY,
                intent.getLongExtra(EXTRA_ADHAN_START, 0L),
                intent.getLongExtra(EXTRA_ADHAN_END, 0L),
                intent.getStringExtra(EXTRA_ADHAN_TITLE) ?: LABEL_ADHAN,
                intent.getStringExtra(EXTRA_ADHAN_NAME) ?: "",
                intent.getStringExtra(EXTRA_ADHAN_MUEZZIN) ?: "",
            )
            ACTION_PLAY_NOW -> {
                val items = try {
                    val many = intent.getStringExtra(EXTRA_ITEMS)
                    if (many != null) {
                        val array = JSONArray(many)
                        (0 until array.length()).map { AudioAdhkarStore.parseItem(array.getJSONObject(it)) }
                    } else {
                        listOf(AudioAdhkarStore.parseItem(JSONObject(intent.getStringExtra(EXTRA_ITEM) ?: "")))
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "playNow: bad item", e)
                    trace("playNow: bad item ${e.javaClass.simpleName}: ${e.message}")
                    emptyList()
                }
                startManualSession(Section.of(intent.getStringExtra(EXTRA_SECTION)), items)
            }
            ACTION_PAUSE -> userPause()
            ACTION_NEXT_DHIKR -> skipToNextDhikr()
            ACTION_RESUME -> resumePlayback()
            // From the Home screen's adhan player: the adhan only, never an adhkar session that replaced it meanwhile.
            ACTION_PAUSE_ADHAN -> if (adhanSession) userPause() else if (cursor == null) stopSelf()
            ACTION_RESUME_ADHAN -> if (adhanSession) resumePlayback() else if (cursor == null) stopSelf()
            ACTION_STOP -> stopSession()
            ACTION_APPLY_VOLUME -> if (cursor == null) stopSelf() else applyVolume()
            ACTION_STOP_MANUAL -> if (manualSession) stopSession()
            // The Audio Adhkar master switch turned off: a scheduled session only — «استماع» and the adhan play on.
            ACTION_STOP_SCHEDULED -> if (cursor != null && !manualSession && !adhanSession) stopSession() else if (cursor == null) stopSelf()
            // The prayer notifications master switch turned off: the adhan only — adhkar play on.
            ACTION_STOP_ADHAN -> if (adhanSession) stopSession() else if (cursor == null) stopSelf()
            null -> if (cursor == null) {
                // Restarted by Android (START_STICKY) after it killed the service mid-session:
                // a daily session continues from its dhikr through the resume alarm — never here, never twice.
                AudioAdhkarScheduler.recoverInterruptedSession(this)
                stopSelf()
            }
            else -> if (cursor == null) stopSelf()
        }
        // Sticky only while a daily session plays: that is the one Android may restart (and continue).
        return if (cursor != null && sessionSection.isDaily && !manualSession && !adhanSession) START_STICKY else START_NOT_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        trace("task removed (app swiped from recents) session=${sessionKind()}")
        super.onTaskRemoved(rootIntent)
    }

    override fun onTrimMemory(level: Int) {
        trace("onTrimMemory level=$level session=${sessionKind()}")
        super.onTrimMemory(level)
    }

    @Deprecated("Deprecated in Java")
    override fun onLowMemory() {
        trace("onLowMemory session=${sessionKind()}")
        @Suppress("DEPRECATION")
        super.onLowMemory()
    }

    override fun onDestroy() {
        trace("destroyed session=${sessionKind()} (a session here = ended by Android, not by DITHAR)")
        handler.removeCallbacks(heartbeat)
        unregisterScreen()
        // A session still running here was ended by Android, not by the user: its saved
        // place (AudioAdhkarStore.activeSession) is kept so it can continue.
        handler.removeCallbacks(stopForAdhan)
        handler.removeCallbacks(stopAtAdhanEnd)
        handler.removeCallbacks(adhanWaitTick)
        handler.removeCallbacks(adhanFocusFollowUp)
        cancelSilence()
        // Ending (or destroyed) mid-repetition: what really played is still listening time.
        recordStoppedEarly()
        releasePlayer()
        abandonFocus()
        releaseSessionWakeLock()
        unregisterNoisy()
        session.release()
        if (cursor != null) publish(null)
        cursor = null
        isSessionActive = false
        isManualSession = false
        isAdhanPlaying = false
        // An adhan cut off by Android has ended too (publish above still saw its session).
        if (lastAdhanState != null) {
            lastAdhanState = null
            adhanStateListener?.invoke(null)
        }
        if (instance === this) instance = null
        super.onDestroy()
    }

    // ---- session ----------------------------------------------------------

    /**
     * [resume]: the user's "Resume Adhkar" — continue that saved session from
     * its dhikr/repetition/position (allowed during an adhan pause, as any
     * user-started playback is); otherwise a scheduled start, which replaces
     * any interrupted session of its section still waiting to be resumed.
     */
    private fun startSession(section: Section, occurrence: Long, startIndex: Int, resume: SavedProgress? = null) {
        getSystemService(NotificationManager::class.java).cancel(TAP_TO_START_NOTIFICATION_ID)
        if (cursor != null && manualSession) {
            // A scheduled session replaces a dhikr the user is listening to (as it did in the app).
            AudioAdhkarStore(this).appendEvent("manual: replaced by ${section.key}")
            endSession(null, keepService = true, publishEnd = false)
        }
        if (cursor != null) {
            // Already playing: a second trigger never starts a second session.
            startForegroundCompat(buildNotification())
            return
        }
        val store = AudioAdhkarStore(this)
        val prefs = store.section(section)
        if (section.isDaily) {
            AudioAdhkarScheduler.clearSavedProgress(this, section, if (resume != null) "resumed by the user" else "replaced by a new session")
        }
        val playlist = prefs.playlist
        val occasion = if (section == Section.MISC) MiscOccasion.keyAt(System.currentTimeMillis(), prefs.occasionsEnabled, prefs.occasionWindows) else null
        val occasionList = occasion?.let { prefs.occasionPlaylists[it] }?.takeIf { it.isNotEmpty() }
        val items = if (section == Section.MISC && occasion != null && occasionList != null && playlist.isNotEmpty()) {
            // A Friday / Islamic occasion: its own dhikr, cycling — the normal rotation keeps its place for tomorrow.
            val (index, next) = MiscOccasion.pick(occasionList.size, prefs.occasionIndex(occasion))
            prefs.setOccasionIndex(occasion, next)
            store.appendEvent("misc: $occasion — playing ${occasionList[index].dhikrId}")
            listOf(occasionList[index])
        } else if (section == Section.MISC) {
            // One dhikr per tick, cycling through the list.
            if (playlist.isEmpty()) {
                emptyList()
            } else {
                val index = prefs.nextIndex.coerceAtLeast(0) % playlist.size
                prefs.nextIndex = (index + 1) % playlist.size
                listOf(playlist[index])
            }
        } else {
            val rotation = AudioAdhkarRotation.apply(playlist.drop(startIndex.coerceAtLeast(0)), store.quranLastRotationSlot)
            store.quranLastRotationSlot = rotation.lastSlot
            // A resumed recitation keeps the reciter it was interrupted with.
            val first = rotation.items.firstOrNull()
            val slot = resume?.rotationSlot ?: -1
            if (first != null && slot in first.rotation.indices) {
                listOf(first.copy(recitation = first.rotation[slot])) + rotation.items.drop(1)
            } else {
                rotation.items
            }
        }
        sessionSection = section
        sessionOccurrence = occurrence
        startOffset = if (section == Section.MISC) 0 else startIndex.coerceAtLeast(0)
        val newCursor = PlaybackCursor(items, resume?.repetition ?: 1)
        cursor = newCursor
        userResumed = resume != null
        pendingSeek = resume?.takeIf { it.positionMillis > 0 || it.part > 0 }?.let { it.part to it.positionMillis }
        isSessionActive = true
        startForegroundCompat(buildNotification())
        val now = System.currentTimeMillis()
        val windows = store.adhanWindows
        if (newCursor.finished || (resume == null && AdhanSuppression.isSuppressed(now, windows))) {
            if (!newCursor.finished && section.isDaily) {
                AudioAdhkarScheduler.armResume(this, section, occurrence, startOffset, AdhanSuppression.clearAt(now, windows))
            }
            stopSession()
            return
        }
        AdhanSuppression.nextStartAfter(now, windows)?.let { handler.postDelayed(stopForAdhan, it - now) }
        store.appendEvent("${section.key}: playback ${if (resume != null) "resumed" else "started"} (${items.size} dhikr from #$startOffset rep ${newCursor.repetition})")
        beginPlayback()
    }

    /**
     * "Resume Adhkar" (the prompt's action, or the in-app button): continues
     * the section's saved session — only while it is still resumable, never
     * over the adhan or another scheduled session.
     */
    private fun resumeSavedSession(section: Section) {
        val store = AudioAdhkarStore(this)
        val prefs = store.section(section)
        val saved = prefs.savedProgress
        val now = System.currentTimeMillis()
        val busy = cursor != null && !manualSession
        if (!section.isDaily || busy || !ResumePrompt.canResume(saved, now, prefs.enabled)) {
            store.appendEvent("${section.key}: resume refused (saved=${saved != null} busy=$busy enabled=${prefs.enabled})")
            if (!busy && saved != null && now >= saved.expiresAt) AudioAdhkarScheduler.clearSavedProgress(this, section, "expired")
            if (cursor == null) {
                startForegroundCompat(buildNotification()) // required after startForegroundService, even to stop
                endSession(null)
            }
            return
        }
        startSession(section, saved!!.occurrence, saved.index, saved)
    }

    /**
     * «استماع»: plays [items] now — one dhikr, or the whole section for
     * «تشغيل الكل» — each its repetitions, one after another (the same
     * silence between them as a scheduled session), in this service — so it
     * continues with the screen off. Replaces whatever adhkar session plays;
     * refused while the adhan plays. Not tied to any schedule: it plays
     * whenever the user starts it, also after the section's scheduled time.
     */
    private fun startManualSession(section: Section, items: List<PlaylistItem>) {
        if (items.isEmpty() || adhanSession) {
            if (cursor == null) {
                startForegroundCompat(buildNotification()) // required after startForegroundService, even to stop
                endSession(null)
            } else {
                stateListener?.invoke(null) // the app's optimistic "playing" is withdrawn; the adhan continues
            }
            return
        }
        if (cursor != null) endSession(null, keepService = true, publishEnd = false)
        sessionSection = section
        sessionOccurrence = 0L
        startOffset = 0
        manualSession = true
        playAllSession = items.size > 1
        isManualSession = true
        // Play All, random reciter: one reciter per Quranic dhikr, as in a scheduled session.
        val store = AudioAdhkarStore(this)
        val rotation = AudioAdhkarRotation.apply(items, store.quranLastRotationSlot)
        if (items.any { it.rotation.isNotEmpty() }) store.quranLastRotationSlot = rotation.lastSlot
        cursor = PlaybackCursor(rotation.items)
        isSessionActive = true
        startForegroundCompat(buildNotification())
        val now = System.currentTimeMillis()
        // Allowed inside an adhan pause; stopped as the next adhan begins.
        AdhanSuppression.nextStartAfter(now, store.adhanWindows)?.let { handler.postDelayed(stopForAdhan, it - now) }
        store.appendEvent(
            if (items.size == 1) "manual: playing ${section.key}/${items[0].dhikrId} ×${items[0].repetitions}"
            else "manual: play all ${section.key} — ${items.size} dhikr (${items.joinToString(",") { it.dhikrId }})",
        )
        beginPlayback()
    }

    /** A session's cursor is set: take the media controls, audio focus and wake lock, and play. */
    private fun beginPlayback() {
        trace("session begins: ${sessionKind()} items=${cursor?.items?.map { "${it.dhikrId}×${it.repetitions}" }}")
        sessionId = "native-session:${UUID.randomUUID()}"
        practiceRecorded = false
        // Real playback (adhkar or the adhan) starts: the app stops any volume preview it plays.
        sessionStartListener?.invoke()
        handler.removeCallbacks(heartbeat)
        handler.postDelayed(heartbeat, HEARTBEAT_MILLIS)
        registerScreen()
        session.isActive = true
        registerNoisy()
        acquireSessionWakeLock()
        val focus = requestFocus()
        if (adhanSession && focus != AdhanFocusPolicy.REQUEST_GRANTED && !inCall()) {
            // Refused with no call (Android 15+ background-focus rule, seen on a Motorola): play now and
            // ask again once the service counts as foreground, so ducking and interruptions still work.
            trace("adhan: audio focus $focus at the start with no call — playing anyway")
            handler.postDelayed(adhanFocusFollowUp, ADHAN_FOCUS_FOLLOW_UP_MILLIS)
        }
        if (adhanSession && !AdhanFocusPolicy.startsNow(focus, inCall())) {
            // A call (or an app holding the audio exclusively): the adhan doesn't play over it — it is
            // prepared and waits, starting the moment the focus is granted (or ending if it never is).
            trace("adhan: audio focus ${if (focus == AdhanFocusPolicy.REQUEST_DELAYED) "delayed" else "refused"} at the start — waiting")
            paused = true
            pausedForFocus = true
            startAdhanWait()
        }
        playCurrent()
    }

    /**
     * An adhan window began: stop now. A daily session is saved exactly where
     * it was and offered back ONCE, as a "Resume Adhkar" notification after
     * the pause — it never continues by itself. [keepService]: the adhan
     * itself starts next in this same service, so it isn't torn down in between.
     */
    private fun interruptForAdhan(keepService: Boolean = false) {
        val c = cursor ?: return
        val store = AudioAdhkarStore(this)
        val now = System.currentTimeMillis()
        if (sessionSection.isDaily && !manualSession && !adhanSession) {
            savedProgressNow(c, now, store)?.let { AudioAdhkarScheduler.saveForResumePrompt(this, sessionSection, it) }
        }
        store.appendEvent("${sessionSection.key}: stopped for the adhan")
        endSession(null, keepService)
    }

    /** Where this daily session would continue: the next dhikr/repetition, and inside an unfinished one its file and position. */
    private fun savedProgressNow(c: PlaybackCursor, now: Long, store: AudioAdhkarStore): SavedProgress? {
        val point = c.resumePoint() ?: return null
        val item = c.items.getOrNull(point.index) ?: return null
        val position = if (point.inProgress && prepared) {
            try {
                player?.currentPosition?.toLong() ?: 0L
            } catch (_: IllegalStateException) {
                0L
            }
        } else {
            0L
        }
        val rotationSlot = item.rotation.indexOfFirst { it.assetPaths == item.recitation.assetPaths }
        return SavedProgress(
            occurrence = sessionOccurrence,
            index = startOffset + point.index,
            repetition = point.repetition,
            part = if (point.inProgress) currentPart else 0,
            positionMillis = position.coerceAtLeast(0L),
            rotationSlot = rotationSlot,
            promptAt = ResumePrompt.promptAt(now, store.adhanWindows),
            expiresAt = ResumePrompt.expiresAt(sessionOccurrence, store.section(sessionSection).slots),
        )
    }

    /**
     * Plays the adhan: [startMillis]..[endMillis] of the recording at
     * [assetPath]. Adhkar in progress stops first (and continues after the
     * adhan window); a second adhan while one plays is ignored.
     */
    private fun startAdhanSession(assetPath: String, startMillis: Long, endMillis: Long, title: String, voiceName: String, muezzin: String) {
        getSystemService(NotificationManager::class.java).cancel(TAP_TO_START_NOTIFICATION_ID)
        if (cursor != null) {
            if (adhanSession) {
                startForegroundCompat(buildNotification())
                return
            }
            interruptForAdhan(keepService = true)
        }
        adhanStartMillis = startMillis
        adhanEndMillis = endMillis
        isAdhanPlaying = true
        val newCursor = PlaybackCursor(listOf(PlaylistItem("adhan", title, voiceName, Recitation(listOf(assetPath), reciterName = muezzin), 1)))
        cursor = newCursor
        isSessionActive = true
        startForegroundCompat(buildNotification())
        AudioAdhkarStore(this).appendEvent("adhan: playing $voiceName")
        beginPlayback()
    }

    private fun playCurrent() {
        val c = cursor ?: return
        cancelSilence()
        if (!adhanSession && !manualSession && !userResumed && AdhanSuppression.isSuppressed(System.currentTimeMillis(), AudioAdhkarStore(this).adhanWindows)) {
            // Never start a dhikr inside an adhan window (e.g. the stop Handler was delayed).
            trace("inside an adhan window: stopping")
            c.advance()
            return interruptForAdhan()
        }
        // The pending next repetition/dhikr becomes current only now, as its audio starts.
        c.advance()
        val item = c.current ?: return finishSession()
        trace("dhikr #${c.index} ${item.dhikrId} rep ${c.repetition}/${item.repetitions} files=${item.filesFor(c.repetition).size}")
        acquireSessionWakeLock() // renews its timeout, dhikr by dhikr
        if (sessionSection.isDaily && !manualSession && !adhanSession) {
            // Its place, in case Android ends the service before it finishes (see recoverInterruptedSession).
            AudioAdhkarStore(this).activeSession = ActiveSession(sessionSection, sessionOccurrence, startOffset + c.index)
        }
        // Repetition 1 plays a Quranic recitation's basmala; later ones don't (PlaylistItem.filesFor).
        val files = item.filesFor(c.repetition)
        val seek = pendingSeek?.takeIf { it.first in files.indices }
        pendingSeek = null
        // The files' real lengths (read once per file), for the app's progress bar and the recorded listening time.
        repetitionDurations = files.map(::fileDurationMillis)
        repetitionStartOffset = if (seek != null) {
            RepetitionProgress.startOffset(repetitionDurations, seek.first, seek.second)
        } else {
            RepetitionProgress.startOffset(repetitionDurations, 0, adhanStartMillis ?: item.startMillisFor(c.repetition))
        }
        repetitionAccounted = adhanSession // the adhan is never Audio Adhkar listening
        if (seek != null) {
            // A resumed session: the interrupted repetition continues from its file and position.
            trace("resuming at file ${seek.first + 1}/${files.size} @${seek.second}ms")
            playPart(files, c.beginPlayback(), seek.first, seek.second)
        } else {
            playPart(files, c.beginPlayback(), 0, adhanStartMillis ?: item.startMillisFor(c.repetition))
        }
    }

    /**
     * Plays file [part] of this repetition's [files] (from [startMillis] into
     * it); the last file's completion completes the playback [token].
     */
    private fun playPart(files: List<String>, token: Int, part: Int, startMillis: Long = 0L) {
        releasePlayer()
        val mp = newPlayer(files, token, part) ?: return
        player = mp
        currentPart = part
        mp.setOnPreparedListener { p ->
            val begin = {
                prepared = true
                if (!paused) {
                    p.start()
                    markPracticed()
                    armAdhanEnd()
                    updateSession() // the media controls' position now runs from here
                }
                trace("file ${part + 1}/${files.size} prepared, ${if (paused) "held (paused)" else "playing"}: ${files[part].substringAfterLast('/')} (${p.duration}ms)")
                chainNext(files, token, part + 1)
            }
            if (startMillis > 0) {
                p.setOnSeekCompleteListener { begin() }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) p.seekTo(startMillis, MediaPlayer.SEEK_CLOSEST) else p.seekTo(startMillis.toInt())
            } else {
                begin()
            }
        }
        mp.prepareAsync()
        publish(stateJson())
    }

    /** A player for file [part] of [files], with its completion and error handling — null (and the session stopped) if the file can't be opened. */
    private fun newPlayer(files: List<String>, token: Int, part: Int): MediaPlayer? {
        val assetPath = files[part]
        return try {
            val afd = assets.openFd(assetPath)
            MediaPlayer().apply {
                setAudioAttributes(audioAttributes)
                setWakeMode(this@AudioAdhkarPlaybackService, PowerManager.PARTIAL_WAKE_LOCK)
                gain().let { setVolume(it, it) }
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                afd.close()
                setOnCompletionListener { onPartCompleted(files, token, part) }
                setOnErrorListener { _, what, extra ->
                    Log.w(TAG, "playback error $what/$extra for $assetPath")
                    trace("AUDIO ERROR what=$what extra=$extra file=$assetPath — session stops")
                    failSession()
                    true
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "cannot play $assetPath", e)
            trace("CANNOT OPEN $assetPath: ${e.javaClass.simpleName}: ${e.message} — session stops")
            failSession()
            null
        }
    }

    /** Prepares file [part] while the current one plays, then chains it so Android starts it the instant the current one completes. */
    private fun chainNext(files: List<String>, token: Int, part: Int) {
        if (part >= files.size) return
        val current = player ?: return
        val next = newPlayer(files, token, part) ?: return
        nextPlayer = next
        next.setOnPreparedListener {
            if (player !== current || nextPlayer !== next) return@setOnPreparedListener
            try {
                current.setNextMediaPlayer(next)
                chainedPlayer = next
            } catch (e: IllegalStateException) {
                Log.w(TAG, "cannot chain the next file; it will start on completion", e)
            }
        }
        next.prepareAsync()
    }

    private fun onPartCompleted(files: List<String>, token: Int, part: Int) {
        if (part + 1 >= files.size) {
            onPlaybackCompleted(token)
            return
        }
        val next = chainedPlayer
        if (next != null && next === nextPlayer) {
            // Already started by Android, with no gap: it becomes the current player.
            val finished = player
            player = next
            currentPart = part + 1
            nextPlayer = null
            chainedPlayer = null
            prepared = true
            finished?.let(::releaseQuietly)
            chainNext(files, token, part + 2)
        } else {
            // The next file wasn't ready in time: start it now.
            playPart(files, token, part + 1)
        }
    }

    private fun onPlaybackCompleted(token: Int) {
        val c = cursor
        val item = c?.current
        val step = c?.complete(token)
        trace("playback completed ${item?.dhikrId} token=$token → $step")
        if (step != null && step != PlaybackCursor.Step.IGNORED && item != null && !adhanSession) {
            repetitionAccounted = true
            // One repetition played to its end — counted once (the cursor ignores repeated/stale completions),
            // with its session, title and the real length that played (null when a file's length was unreadable).
            AudioAdhkarStore(this).appendCompletion(
                sessionSection.key,
                item.dhikrId,
                System.currentTimeMillis(),
                sessionId,
                RepetitionProgress.total(repetitionDurations, repetitionStartOffset),
                item.title,
            )
            completionListener?.invoke()
        }
        when (step) {
            PlaybackCursor.Step.NEXT_REPETITION, PlaybackCursor.Step.NEXT_DHIKR -> startSilence()
            PlaybackCursor.Step.FINISHED -> finishSession()
            else -> Unit // stale/duplicate completion — ignored
        }
    }

    // ---- silence between playbacks -----------------------------------------

    private fun startSilence() {
        releasePlayer()
        trace("silence ${SilenceGap.SILENCE_MILLIS}ms (wakeLock=${sessionWakeLock?.isHeld})")
        handler.postDelayed(playNextAfterSilence, gap.start(SystemClock.uptimeMillis()))
    }

    private fun cancelSilence() {
        handler.removeCallbacks(playNextAfterSilence)
        gap.clear()
    }

    /**
     * One wake lock for the whole session (re-acquiring renews its timeout):
     * the CPU stays on while a file prepares, between ayah files and through
     * the silences, with the screen off. Bounded, in case a session never ends.
     */
    private fun acquireSessionWakeLock() {
        val lock = sessionWakeLock ?: getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Dithar:AudioAdhkarSession")
            .apply { setReferenceCounted(false) }
            .also { sessionWakeLock = it }
        if (!lock.isHeld) trace("wake lock acquired")
        lock.acquire(SESSION_WAKE_LOCK_MILLIS)
    }

    private fun releaseSessionWakeLock() {
        sessionWakeLock?.let {
            if (it.isHeld) {
                it.release()
                trace("wake lock released")
            }
        }
    }

    /** An adhan stops at its segment's end: armed for the time left from the current position. */
    private fun armAdhanEnd() {
        val end = adhanEndMillis ?: return
        handler.removeCallbacks(stopAtAdhanEnd)
        val position = try {
            player?.currentPosition?.toLong() ?: 0L
        } catch (_: IllegalStateException) {
            0L
        }
        handler.postDelayed(stopAtAdhanEnd, (end - position).coerceAtLeast(0L))
    }

    private fun pausePlayback() {
        if (cursor == null || paused) return
        trace("paused (forFocus=$pausedForFocus)")
        paused = true
        handler.removeCallbacks(stopAtAdhanEnd)
        if (gap.active) {
            // Paused during the silence: freeze the remaining silence.
            handler.removeCallbacks(playNextAfterSilence)
            gap.pause(SystemClock.uptimeMillis())
        } else if (prepared) {
            player?.pause()
        }
        releaseSessionWakeLock()
        publish(stateJson())
    }

    /** Paused by the user (or headphones unplugged): only the user resumes it — not a returning audio focus. */
    private fun userPause() {
        val wasWaiting = paused && pausedForFocus
        pausedForFocus = false
        pausePlayback()
        if (adhanSession) {
            if (wasWaiting) {
                // It was waiting for the audio: now it is the user's pause (no more retries, no wake lock).
                releaseSessionWakeLock()
                publish(stateJson())
            }
            startAdhanWait()
        }
    }

    /** The adhan lost the audio: paused — never ended — until the audio is free again (AdhanFocusPolicy). */
    private fun waitForAdhanFocus() {
        if (cursor == null || paused) return
        pausedForFocus = true // before pausing, so the published state says "waiting"
        pausePlayback()
        // The wait is short and bounded: keep the CPU so the retries and the end of the wait run with the screen off.
        acquireSessionWakeLock()
        startAdhanWait()
    }

    private fun startAdhanWait() {
        adhanPausedSince = System.currentTimeMillis()
        handler.removeCallbacks(adhanWaitTick)
        handler.postDelayed(adhanWaitTick, AdhanFocusPolicy.RETRY_MILLIS)
    }

    /** [requestFocusAgain] false: the caller has just been granted it. */
    private fun resumePlayback(requestFocusAgain: Boolean = true) {
        if (cursor == null || !paused) return
        trace("resumed")
        paused = false
        pausedForFocus = false
        adhanPausedSince = null
        handler.removeCallbacks(adhanWaitTick)
        acquireSessionWakeLock()
        if (requestFocusAgain) requestFocus()
        val remaining = gap.resume(SystemClock.uptimeMillis())
        if (remaining != null) {
            handler.postDelayed(playNextAfterSilence, remaining)
        } else if (prepared) {
            player?.start()
            markPracticed()
            armAdhanEnd()
        }
        publish(stateJson())
    }

    /**
     * Its audio has started playing: a Morning/Evening session (scheduled or
     * «تشغيل الكل») is practiced today — recorded once (SessionPractice),
     * however it continues: paused, skipped, stopped or heard to its end.
     */
    private fun markPracticed() {
        if (practiceRecorded || !SessionPractice.counts(sessionSection.isDaily, manualSession, playAllSession, adhanSession)) return
        practiceRecorded = true
        val now = System.currentTimeMillis()
        val day = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date(now))
        AudioAdhkarStore(this).appendSessionComplete(sessionSection.key, SessionPractice.key(sessionOccurrence, day), sessionOccurrence, now, sessionId)
        trace("session practiced: ${sessionSection.key}@$sessionOccurrence")
        completionListener?.invoke()
    }

    /**
     * «الذكر التالي»: the repetition playing now is recorded as listening
     * only (what really played — never a repetition), the dhikr's remaining
     * repetitions are skipped, and the next dhikr starts (held if paused);
     * after the last one the session finishes. Never the adhan.
     */
    private fun skipToNextDhikr() {
        val c = cursor ?: return
        if (adhanSession) return
        recordStoppedEarly()
        val step = c.skipDhikr()
        trace("next dhikr requested → $step")
        when (step) {
            PlaybackCursor.Step.NEXT_DHIKR -> {
                releasePlayer()
                playCurrent()
                publish(stateJson())
            }
            PlaybackCursor.Step.FINISHED -> {
                releasePlayer()
                cancelSilence()
                finishSession()
            }
            else -> Unit
        }
    }

    /** The last dhikr's last repetition ended: report "finished", then end the session. */
    private fun finishSession() {
        if (adhanSession) return endSession(null)
        // A completed scheduled session has nothing left to offer back.
        if (sessionSection.isDaily && !manualSession) AudioAdhkarScheduler.clearSavedProgress(this, sessionSection, "completed")
        // Heard to its end: practiced (already recorded as its audio began — this never adds a second record).
        markPracticed()
        val c = cursor
        val last = c?.items?.lastOrNull()
        val finalState = if (c != null && last != null) {
            JSONObject()
                .put("active", false)
                .put("collection", sessionSection.key)
                .put("dhikrId", last.dhikrId)
                .put("title", last.title)
                .put("repetition", last.repetitions)
                .put("total", last.repetitions)
                .put("status", "finished")
                .put("index", c.items.size - 1)
                .put("count", c.items.size)
        } else {
            null
        }
        endSession(finalState)
    }

    private fun stopSession() = endSession(null)

    /**
     * The session ends while a repetition is still part-way (stopped, paused
     * then ended, interrupted, failed, the adhan, replaced, the service
     * destroyed): record how long it really played — the same position the
     * app's progress bar reads — as listening. Once per repetition; nothing
     * when it can't be measured.
     */
    private fun recordStoppedEarly() {
        val item = cursor?.current ?: return
        if (repetitionAccounted || adhanSession) return
        repetitionAccounted = true
        val listened = progressJson().optLong("positionMs", 0L)
        if (listened <= 0L) return
        trace("stopped early: ${item.dhikrId} after ${listened}ms")
        AudioAdhkarStore(this).appendListening(sessionSection.key, item.dhikrId, System.currentTimeMillis(), sessionId, listened, item.title)
        completionListener?.invoke()
    }

    /** A recording couldn't play: the session ends, and the app is told which dhikr failed ("error") so it can say so. */
    private fun failSession() = endSession(stateJson()?.put("active", false)?.put("status", "error"))

    /**
     * [keepService]: another session starts next in this service. [publishEnd]
     * false: that session's own state replaces this one in the app (no "stopped" in between).
     */
    private fun endSession(finalState: JSONObject?, keepService: Boolean = false, publishEnd: Boolean = true) {
        trace("session ends: ${sessionKind()} final=${finalState?.optString("status")} keepService=$keepService from ${Throwable().stackTrace.getOrNull(1)?.methodName}")
        // A Morning/Evening session ending: Misc resumes a minute later (MiscDailyGuard), else at once.
        val dailyEnded = cursor != null && sessionSection.isDaily && !manualSession && !adhanSession
        handler.removeCallbacks(heartbeat)
        unregisterScreen()
        handler.removeCallbacks(stopForAdhan)
        handler.removeCallbacks(stopAtAdhanEnd)
        handler.removeCallbacks(adhanWaitTick)
        handler.removeCallbacks(adhanFocusFollowUp)
        cancelSilence()
        // Ending (or destroyed) mid-repetition: what really played is still listening time.
        recordStoppedEarly()
        releasePlayer()
        abandonFocus()
        releaseSessionWakeLock()
        unregisterNoisy()
        // Ended here (finished, stopped, replaced, interrupted for the adhan): nothing to continue after a kill.
        AudioAdhkarStore(this).activeSession = null
        cursor = null
        pendingSeek = null
        userResumed = false
        paused = false
        pausedForFocus = false
        adhanPausedSince = null
        ducked = false
        manualSession = false
        playAllSession = false
        isManualSession = false
        isSessionActive = false
        session.isActive = false
        adhanStartMillis = null
        adhanEndMillis = null
        isAdhanPlaying = false
        if (publishEnd) publish(finalState) else lastState = null
        // Whatever this session was blocking, Misc may play again (it keeps its interval and window) —
        // a minute after a Morning/Evening session, with the next dhikr of its cycle only.
        val now = System.currentTimeMillis()
        AudioAdhkarScheduler.reschedule(this, Section.MISC, if (dailyEnded) MiscDailyGuard.resumeAfter(now) else now)
        if (keepService) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun releasePlayer() {
        player?.let(::releaseQuietly)
        nextPlayer?.let(::releaseQuietly)
        player = null
        nextPlayer = null
        chainedPlayer = null
        prepared = false
    }

    private fun releaseQuietly(mp: MediaPlayer) {
        mp.run {
            setOnCompletionListener(null)
            setOnPreparedListener(null)
            setOnSeekCompleteListener(null)
            setOnErrorListener(null)
            try {
                reset()
            } catch (_: Exception) {
            }
            release()
        }
    }

    // ---- audio focus ------------------------------------------------------

    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        if (adhanSession) {
            onAdhanFocusChange(change)
            return@OnAudioFocusChangeListener
        }
        trace("audio focus change=$change → ${FocusPolicy.onChange(change, pausedForFocus)}")
        when (FocusPolicy.onChange(change, pausedForFocus)) {
            FocusPolicy.Action.PAUSE_UNTIL_GAIN -> if (cursor != null && !paused) {
                pausePlayback()
                pausedForFocus = true
            }
            FocusPolicy.Action.PAUSE -> userPause()
            FocusPolicy.Action.DUCK -> setDucked(true)
            FocusPolicy.Action.RESTORE -> setDucked(false)
            FocusPolicy.Action.RESUME_AND_RESTORE -> {
                setDucked(false)
                resumePlayback()
            }
            null -> Unit
        }
    }

    private fun onAdhanFocusChange(change: Int) {
        val action = AdhanFocusPolicy.onChange(change, paused && pausedForFocus)
        trace("adhan: audio focus change=$change → $action (paused=$paused forFocus=$pausedForFocus)")
        when (action) {
            // A pause the user chose stays theirs: a focus change neither turns it into a wait nor resumes it.
            AdhanFocusPolicy.Action.WAIT -> if (!paused) waitForAdhanFocus()
            AdhanFocusPolicy.Action.DUCK -> setDucked(true)
            AdhanFocusPolicy.Action.RESTORE -> setDucked(false)
            AdhanFocusPolicy.Action.RESUME -> {
                setDucked(false)
                resumePlayback(requestFocusAgain = false)
            }
            null -> Unit
        }
    }

    /** This session's gain: its own volume level (VolumePolicy), lowered while ducked. */
    private fun gain(): Float = VolumePolicy.gain(AudioAdhkarStore(this).volume(VolumePolicy.keyFor(sessionSection, adhanSession)), ducked)

    private fun setDucked(value: Boolean) {
        ducked = value
        applyVolume()
    }

    /** (Re)applies [gain] to the players — on ducking, and when the user changes the level mid-session. */
    private fun applyVolume() {
        if (cursor == null) return
        val volume = gain()
        for (mp in listOfNotNull(player, nextPlayer)) {
            try {
                mp.setVolume(volume, volume)
            } catch (_: IllegalStateException) {
            }
        }
    }

    private fun registerNoisy() {
        if (noisyRegistered) return
        val filter = IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(noisyReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(noisyReceiver, filter)
        }
        noisyRegistered = true
    }

    private fun unregisterNoisy() {
        if (!noisyRegistered) return
        noisyRegistered = false
        try {
            unregisterReceiver(noisyReceiver)
        } catch (_: IllegalArgumentException) {
        }
    }

    /**
     * Asks for focus as [FocusPolicy.requestFor] says — adhkar never pause another app's media.
     * Returns Android's answer (1 granted, 0 failed, 2 delayed): adhkar play either way, as
     * before; the adhan accepts a delayed grant (e.g. after a call) and waits for it.
     */
    private fun requestFocus(): Int {
        val am = getSystemService(AudioManager::class.java)
        val type = FocusPolicy.requestFor(adhanSession)
        val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // The type differs between the adhan and adhkar: rebuilt per session, the previous one released.
            focusRequest?.let { am.abandonAudioFocusRequest(it) }
            val request = AudioFocusRequest.Builder(type)
                .setAudioAttributes(audioAttributes)
                .setAcceptsDelayedFocusGain(adhanSession)
                .setOnAudioFocusChangeListener(focusListener)
                .build()
                .also { focusRequest = it }
            am.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, type)
        }
        trace("audio focus requested type=$type → $result (1 granted, 0 failed, 2 delayed)")
        return result
    }

    private fun abandonFocus() {
        val am = getSystemService(AudioManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let { am.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            am.abandonAudioFocus(focusListener)
        }
    }

    // ---- state / system media controls -----------------------------------

    private fun stateJson(): JSONObject? {
        if (adhanSession) return null // the adhan isn't an adhkar session
        val c = cursor ?: return null
        val item = c.current ?: return null
        return JSONObject()
            .put("active", true)
            .put("collection", sessionSection.key)
            .put("dhikrId", item.dhikrId)
            .put("title", item.title)
            .put("repetition", c.repetition)
            .put("total", item.repetitions)
            .put("status", if (paused) "paused" else "playing")
            .put("index", c.index)
            .put("count", c.items.size)
            .put("manual", manualSession)
            // Who is heard now (the reciter of this recitation, after random rotation); "" when unknown.
            .put("reciter", item.recitation.reciterName)
    }

    /**
     * The adhan's own state for the app (the Home screen player): null when
     * no adhan plays. "waiting" = interrupted, paused until the audio is
     * free again (AdhanFocusPolicy) — it continues by itself.
     */
    private fun adhanStateJson(): JSONObject? {
        if (!adhanSession) return null
        val item = cursor?.current ?: return null
        return JSONObject()
            .put("active", true)
            .put("status", if (!paused) "playing" else if (pausedForFocus) "waiting" else "paused")
            .put("title", item.title)
            .put("voice", item.text)
            // The muezzin heard in this recording; "" when it isn't reliably known.
            .put("muezzin", item.recitation.reciterName)
    }

    /** Where the adhan is within its segment of the recording (main thread: it reads the MediaPlayer). */
    private fun adhanProgressJson(): JSONObject {
        val start = adhanStartMillis ?: 0L
        val end = adhanEndMillis
        val mp = player
        if (!adhanSession || cursor == null || end == null) {
            return JSONObject().put("active", false).put("positionMs", 0).put("durationMs", JSONObject.NULL).put("loading", false)
        }
        val ready = mp != null && prepared
        val position = if (ready) {
            try {
                mp!!.currentPosition.toLong()
            } catch (_: IllegalStateException) {
                start
            }
        } else {
            start
        }
        val fileEnd = if (ready) {
            try {
                mp!!.duration.toLong().takeIf { it > 0 }
            } catch (_: IllegalStateException) {
                null
            }
        } else {
            null
        }
        val segmentEnd = if (end > start) end else fileEnd
        val duration = segmentEnd?.let { it - start }?.takeIf { it > 0 }
        val elapsed = (position - start).coerceAtLeast(0L)
        return JSONObject()
            .put("active", true)
            .put("positionMs", if (duration != null) elapsed.coerceAtMost(duration) else elapsed)
            .put("durationMs", duration ?: JSONObject.NULL)
            .put("loading", !ready)
    }

    /** A bundled file's length from its metadata (cached; null when unreadable). */
    private fun fileDurationMillis(assetPath: String): Long? {
        durationCache[assetPath]?.let { return it }
        val retriever = MediaMetadataRetriever()
        return try {
            assets.openFd(assetPath).use { afd -> retriever.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length) }
            retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()?.takeIf { it > 0 }?.also { durationCache[assetPath] = it }
        } catch (e: Exception) {
            trace("cannot read the length of $assetPath: ${e.javaClass.simpleName}")
            null
        } finally {
            try {
                retriever.release()
            } catch (_: Exception) {
            }
        }
    }

    /** Where the current repetition is (main thread: it reads the MediaPlayer). */
    private fun progressJson(): JSONObject {
        val mp = player
        val active = cursor?.current != null && !adhanSession
        val positionInPart = if (mp != null && prepared) {
            try {
                mp.currentPosition.toLong()
            } catch (_: IllegalStateException) {
                0L
            }
        } else {
            0L
        }
        val total = RepetitionProgress.total(repetitionDurations, repetitionStartOffset)
        val position = RepetitionProgress.position(repetitionDurations, currentPart, positionInPart, repetitionStartOffset)
        return JSONObject()
            .put("active", active)
            .put("positionMs", if (total != null) position.coerceAtMost(total) else position)
            .put("durationMs", total ?: JSONObject.NULL)
            .put("loading", active && (mp == null || !prepared))
    }

    private fun publish(state: JSONObject?) {
        lastState = state
        if (updateSession()) getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, buildNotification())
        stateListener?.invoke(state)
        // The adhan's own state (null when no adhan plays) — every publish, so its end is reported too.
        val adhan = adhanStateJson()
        if (adhan?.toString() != lastAdhanState?.toString()) {
            lastAdhanState = adhan
            adhanStateListener?.invoke(adhan)
        }
    }

    /** The line under the title — the in-app player's own line (NowPlayingText). */
    private fun nowPlayingSubtitle(c: PlaybackCursor, item: PlaylistItem, en: Boolean): String =
        if (adhanSession) NowPlayingText.adhanSubtitle(item.recitation.reciterName, item.text, en)
        else NowPlayingText.dhikrSubtitle(c.repetition, item.repetitions, item.recitation.reciterName, en)

    /** DITHAR's icon as artwork for the media controls and the lock screen (drawn once). */
    private val artwork: Bitmap? by lazy {
        try {
            val icon = packageManager.getApplicationIcon(packageName)
            Bitmap.createBitmap(ARTWORK_PX, ARTWORK_PX, Bitmap.Config.ARGB_8888).also {
                icon.setBounds(0, 0, ARTWORK_PX, ARTWORK_PX)
                icon.draw(Canvas(it))
            }
        } catch (e: Exception) {
            trace("artwork unavailable: ${e.javaClass.simpleName}")
            null
        }
    }

    /**
     * The track as the phone's media controls (notification shade, lock
     * screen) show it — MediaSession metadata and playback state, the same
     * information as the in-app player: TITLE = the dhikr's title or "أذان
     * الظهر"; ARTIST (the line Android shows under it) = "التكرار 2 من 3 ·
     * القارئ: …" or "المؤذن: …"; ALBUM = the collection; DURATION and the live
     * position = what the in-app progress bar reads; the app's icon as art.
     * Called on every state change and when a file actually starts, so it
     * follows each new dhikr, repetition and recitation. False when nothing plays.
     */
    private fun updateSession(): Boolean {
        val c = cursor ?: return false
        val item = c.current ?: return false
        val en = AudioAdhkarStore(this).language == "en"
        val subtitle = nowPlayingSubtitle(c, item, en)
        val progress = if (adhanSession) adhanProgressJson() else progressJson()
        val duration = progress.optLong("durationMs", -1L)
        val position = progress.optLong("positionMs", 0L).coerceAtLeast(0L)
        val metadata = MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, item.title)
            .putString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE, item.title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, subtitle)
            .putString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE, subtitle)
            .putString(MediaMetadata.METADATA_KEY_DISPLAY_DESCRIPTION, item.text)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, sessionLabel)
        if (duration > 0) metadata.putLong(MediaMetadata.METADATA_KEY_DURATION, duration)
        artwork?.let {
            metadata.putBitmap(MediaMetadata.METADATA_KEY_ART, it)
            metadata.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, it)
            metadata.putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON, it)
        }
        session.setMetadata(metadata.build())
        val running = !paused && prepared && !gap.active
        session.setPlaybackState(
            PlaybackState.Builder()
                .setActions(
                    PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or
                        PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_STOP or
                        // «الذكر التالي» from the lock screen / notification shade, while another dhikr follows.
                        (if (!adhanSession && c.hasNextDhikr) PlaybackState.ACTION_SKIP_TO_NEXT else 0L),
                )
                // Speed 0 while paused, preparing or in the silence between repetitions: the bar holds still.
                .setState(if (paused) PlaybackState.STATE_PAUSED else PlaybackState.STATE_PLAYING, position, if (running) 1f else 0f)
                .build(),
        )
        return true
    }

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, LABEL_CHANNEL, NotificationManager.IMPORTANCE_LOW),
            )
        }
        val item = cursor?.current
        val openApp = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        // Control labels follow the interface language; the dhikr text itself stays Arabic.
        val en = AudioAdhkarStore(this).language == "en"
        val toggle = if (paused) {
            Notification.Action.Builder(android.R.drawable.ic_media_play, if (en) "Resume" else LABEL_RESUME, commandIntent(ACTION_RESUME)).build()
        } else {
            Notification.Action.Builder(android.R.drawable.ic_media_pause, if (en) "Pause" else LABEL_PAUSE, commandIntent(ACTION_PAUSE)).build()
        }
        val stop = Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, if (en) "Stop" else LABEL_STOP, commandIntent(ACTION_STOP)).build()

        val c = cursor

        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
        artwork?.let { builder.setLargeIcon(it) }
        return builder
            // DITHAR's mark (the launcher icon's silhouette), not the system's generic play symbol.
            .setSmallIcon(R.mipmap.ic_launcher_foreground)
            // The same lines as the media controls (updateSession), for Android versions that read the notification's own text.
            .setContentTitle(item?.title ?: APP_NAME)
            .setContentText(if (c != null && item != null) nowPlayingSubtitle(c, item, en) else sessionLabel)
            .setSubText(sessionLabel)
            .setCategory(Notification.CATEGORY_TRANSPORT)
            .setContentIntent(openApp)
            .setOngoing(!paused)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(toggle)
            .addAction(stop)
            .setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0, 1))
            .build()
    }

    private fun commandIntent(action: String): PendingIntent = PendingIntent.getService(
        this,
        action.hashCode(),
        Intent(this, AudioAdhkarPlaybackService::class.java).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun startForegroundCompat(notification: Notification) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: RuntimeException) {
            trace("FOREGROUND START FAILED ${e.javaClass.simpleName}: ${e.message}")
            throw e
        }
    }

    private fun registerScreen() {
        if (screenRegistered) return
        val filter = IntentFilter(Intent.ACTION_SCREEN_OFF).apply { addAction(Intent.ACTION_SCREEN_ON) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
        screenRegistered = true
    }

    private fun unregisterScreen() {
        if (!screenRegistered) return
        screenRegistered = false
        try {
            unregisterReceiver(screenReceiver)
        } catch (_: IllegalArgumentException) {
        }
    }

    companion object {
        private const val TAG = "DitharAudioAdhkar"
        private const val CHANNEL_ID = "dithar_audio_adhkar"
        private const val NOTIFICATION_ID = 7302
        private const val APP_NAME = "DITHAR"
        private const val ARTWORK_PX = 256
        private const val LABEL_CHANNEL = "الأذكار الصوتية"
        private const val LABEL_PAUSE = "إيقاف مؤقت"
        private const val LABEL_RESUME = "استئناف"
        private const val LABEL_STOP = "إيقاف"
        private fun tapToStartLabel(section: Section) = "حان موعد ${section.label} — اضغط لبدء التشغيل"
        private const val LABEL_ADHAN = "الأذان"
        internal const val TAP_TO_START_NOTIFICATION_ID = 7306

        const val ACTION_START_SCHEDULED = "com.dithar.app.audioadhkar.START_SCHEDULED"
        const val ACTION_PAUSE = "com.dithar.app.audioadhkar.PAUSE"
        const val ACTION_NEXT_DHIKR = "com.dithar.app.audioadhkar.NEXT_DHIKR"
        const val ACTION_RESUME = "com.dithar.app.audioadhkar.RESUME"
        const val ACTION_STOP = "com.dithar.app.audioadhkar.STOP"
        const val ACTION_START_ADHAN = "com.dithar.app.audioadhkar.START_ADHAN"
        const val ACTION_PLAY_NOW = "com.dithar.app.audioadhkar.PLAY_NOW"
        const val ACTION_STOP_MANUAL = "com.dithar.app.audioadhkar.STOP_MANUAL"
        const val ACTION_STOP_SCHEDULED = "com.dithar.app.audioadhkar.STOP_SCHEDULED"
        const val ACTION_STOP_ADHAN = "com.dithar.app.audioadhkar.STOP_ADHAN"
        const val ACTION_PAUSE_ADHAN = "com.dithar.app.audioadhkar.PAUSE_ADHAN"
        const val ACTION_RESUME_ADHAN = "com.dithar.app.audioadhkar.RESUME_ADHAN"
        const val ACTION_APPLY_VOLUME = "com.dithar.app.audioadhkar.APPLY_VOLUME"
        const val ACTION_RESUME_SAVED = "com.dithar.app.audioadhkar.RESUME_SAVED"
        private const val EXTRA_ITEM = "com.dithar.app.audioadhkar.ITEM"
        /** Play All: the section's playlist items, as a JSON array. */
        private const val EXTRA_ITEMS = "com.dithar.app.audioadhkar.ITEMS"
        private const val SESSION_WAKE_LOCK_MILLIS = 3 * 60 * 60_000L
        private const val HEARTBEAT_MILLIS = 30_000L
        private const val ADHAN_FOCUS_FOLLOW_UP_MILLIS = 1_500L
        private const val EXTRA_ADHAN_PATH = "com.dithar.app.audioadhkar.ADHAN_PATH"
        private const val EXTRA_ADHAN_START = "com.dithar.app.audioadhkar.ADHAN_START"
        private const val EXTRA_ADHAN_END = "com.dithar.app.audioadhkar.ADHAN_END"
        private const val EXTRA_ADHAN_TITLE = "com.dithar.app.audioadhkar.ADHAN_TITLE"
        private const val EXTRA_ADHAN_NAME = "com.dithar.app.audioadhkar.ADHAN_NAME"
        private const val EXTRA_ADHAN_MUEZZIN = "com.dithar.app.audioadhkar.ADHAN_MUEZZIN"
        private const val EXTRA_SECTION = "com.dithar.app.audioadhkar.SESSION_SECTION"
        private const val EXTRA_OCCURRENCE = "com.dithar.app.audioadhkar.SESSION_OCCURRENCE"
        private const val EXTRA_START_INDEX = "com.dithar.app.audioadhkar.SESSION_START_INDEX"

        /** True while a session is playing or paused — the single-session guard. */
        @Volatile
        var isSessionActive = false
            private set

        /** True while the session is a user-started «استماع» one — scheduled sessions don't wait for it. */
        @Volatile
        var isManualSession = false
            private set

        /** Whether a scheduled section must wait: a session plays that it may not replace. */
        val blocksScheduled: Boolean get() = isSessionActive && !isManualSession

        /** True while the adhan plays (a manual start is refused then). */
        @Volatile
        var isAdhanPlaying = false
            private set

        /** The running service, for read-only progress queries (main thread only). */
        @Volatile
        private var instance: AudioAdhkarPlaybackService? = null

        /** Files' lengths, read once per process. */
        private val durationCache = java.util.concurrent.ConcurrentHashMap<String, Long>()

        /** Where the current repetition is, or an inactive reply when nothing plays. Call on the main thread. */
        fun currentProgress(): JSONObject =
            instance?.progressJson() ?: JSONObject().put("active", false).put("positionMs", 0).put("durationMs", JSONObject.NULL).put("loading", false)

        /** The latest published state (null when no session) — for JS to catch up on app resume. */
        @Volatile
        var lastState: JSONObject? = null
            private set

        private var stateListener: ((JSONObject?) -> Unit)? = null
        private var adhanStateListener: ((JSONObject?) -> Unit)? = null

        /** The adhan's latest state (null when no adhan plays) — for JS to catch up on app resume. */
        @Volatile
        var lastAdhanState: JSONObject? = null
            private set

        /** Told whenever the adhan starts, pauses, waits for the audio, resumes or ends. */
        fun setAdhanStateListener(listener: ((JSONObject?) -> Unit)?) {
            adhanStateListener = listener
        }

        /** Where the adhan is within its segment, or an inactive reply when none plays. Call on the main thread. */
        fun currentAdhanProgress(): JSONObject =
            instance?.adhanProgressJson() ?: JSONObject().put("active", false).put("positionMs", 0).put("durationMs", JSONObject.NULL).put("loading", false)
        private var completionListener: (() -> Unit)? = null
        private var sessionStartListener: (() -> Unit)? = null

        /** Told whenever a session (adhkar, «استماع» or the adhan) begins playing. */
        fun setSessionStartListener(listener: (() -> Unit)?) {
            sessionStartListener = listener
        }

        /** Told whenever a repetition completed, so the app (when open) takes it in at once. */
        fun setCompletionListener(listener: (() -> Unit)?) {
            completionListener = listener
        }

        fun setStateListener(listener: ((JSONObject?) -> Unit)?) {
            stateListener = listener
        }

        fun startScheduled(context: Context, section: Section, occurrence: Long = 0L, startIndex: Int = 0) {
            val intent = Intent(context, AudioAdhkarPlaybackService::class.java)
                .setAction(ACTION_START_SCHEDULED)
                .putExtra(EXTRA_SECTION, section.key)
                .putExtra(EXTRA_OCCURRENCE, occurrence)
                .putExtra(EXTRA_START_INDEX, startIndex)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
                AudioAdhkarStore(context).appendEvent("playback service start requested (${section.key} #$startIndex, importance=${AudioAdhkarTrace.importance()})")
            } catch (e: Exception) {
                // Android refused a background start (e.g. Android 12+ without an
                // exact alarm, or a battery restriction). Don't fail silently:
                // offer a notification whose tap starts the same session — a
                // user tap is always allowed to start it.
                Log.w(TAG, "could not start scheduled playback", e)
                AudioAdhkarStore(context).appendEvent("playback service start refused: ${e.javaClass.simpleName}")
                postTapToStart(context, intent, section)
            }
        }

        private fun postTapToStart(context: Context, start: Intent, section: Section) {
            val manager = context.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, LABEL_CHANNEL, NotificationManager.IMPORTANCE_LOW))
            }
            val pending = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PendingIntent.getForegroundService(context, 7305, start, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            } else {
                PendingIntent.getService(context, 7305, start, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            }
            @Suppress("DEPRECATION")
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
            manager.notify(
                TAP_TO_START_NOTIFICATION_ID,
                builder
                    .setSmallIcon(android.R.drawable.ic_media_play)
                    .setContentTitle(section.label)
                    .setContentText(tapToStartLabel(section))
                    .setContentIntent(pending)
                    .setAutoCancel(true)
                    .build(),
            )
        }

        /**
         * Plays [voice]'s adhan segment now (from the prayer-time alarm). An
         * exact alarm lets a background app start this media foreground
         * service; if Android still refuses, nothing plays (the prayer
         * notification still shows) — an adhan tapped minutes late would be
         * wrong, so there is no tap-to-start fallback.
         */
        /**
         * The prayer-time alarm starts the adhan in this service. Null when the
         * start was accepted; otherwise why Android refused it (e.g.
         * ForegroundServiceStartNotAllowedException: a background start
         * without an exact/alarm-clock alarm's exemption) — the caller then
         * keeps the notification's own sound instead of a silent one.
         */
        fun startAdhan(context: Context, voice: AdhanVoice, title: String): String? {
            val intent = Intent(context, AudioAdhkarPlaybackService::class.java)
                .setAction(ACTION_START_ADHAN)
                .putExtra(EXTRA_ADHAN_PATH, voice.assetPath)
                .putExtra(EXTRA_ADHAN_START, voice.startMillis)
                .putExtra(EXTRA_ADHAN_END, voice.endMillis)
                .putExtra(EXTRA_ADHAN_TITLE, title)
                .putExtra(EXTRA_ADHAN_NAME, voice.name)
                .putExtra(EXTRA_ADHAN_MUEZZIN, voice.muezzin)
            return try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
                null
            } catch (e: Exception) {
                Log.w(TAG, "could not start the adhan", e)
                AudioAdhkarStore(context).appendEvent("adhan: start refused: ${e.javaClass.simpleName}")
                e.javaClass.simpleName
            }
        }

        /**
         * «استماع» from the app (in the foreground, so the start is allowed):
         * [item] as a playlist item JSON (AudioAdhkarStore.parseItem). False when refused.
         */
        fun playNow(context: Context, section: Section, item: JSONObject): Boolean =
            startPlayNow(context, section, "${section.key}/${item.optString("dhikrId")} ×${item.optInt("repetitions")}") { it.putExtra(EXTRA_ITEM, item.toString()) }

        /** «تشغيل الكل» (Play All): [items] (playlist item JSONs) one after another, as one manual session. False when refused. */
        fun playAllNow(context: Context, section: Section, items: JSONArray): Boolean =
            startPlayNow(context, section, "${section.key} play all ×${items.length()}") { it.putExtra(EXTRA_ITEMS, items.toString()) }

        private fun startPlayNow(context: Context, section: Section, what: String, extras: (Intent) -> Intent): Boolean {
            AudioAdhkarTrace.log(context, "service", "playNow requested $what adhanPlaying=$isAdhanPlaying")
            if (isAdhanPlaying) return false
            val intent = extras(
                Intent(context, AudioAdhkarPlaybackService::class.java)
                    .setAction(ACTION_PLAY_NOW)
                    .putExtra(EXTRA_SECTION, section.key),
            )
            return try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
                true
            } catch (e: Exception) {
                Log.w(TAG, "could not start playNow", e)
                AudioAdhkarStore(context).appendEvent("manual: start refused: ${e.javaClass.simpleName}")
                false
            }
        }

        private fun resumeSavedStartIntent(context: Context, section: Section): Intent =
            Intent(context, AudioAdhkarPlaybackService::class.java)
                .setAction(ACTION_RESUME_SAVED)
                .putExtra(EXTRA_SECTION, section.key)

        /**
         * The "Resume Adhkar" notification action: starts this service with
         * the saved session. A tap on a notification action is a user
         * interaction, which Android allows to start a foreground service
         * from the background.
         */
        fun resumeSavedIntent(context: Context, section: Section): PendingIntent {
            val start = resumeSavedStartIntent(context, section)
            val code = RESUME_SAVED_REQUEST_CODE + section.ordinal
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                PendingIntent.getForegroundService(context, code, start, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            } else {
                PendingIntent.getService(context, code, start, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            }
        }

        /** The in-app "Resume Adhkar" (the app is in the foreground, so the start is allowed). False when refused. */
        fun resumeSaved(context: Context, section: Section): Boolean = try {
            val start = resumeSavedStartIntent(context, section)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(start) else context.startService(start)
            true
        } catch (e: Exception) {
            Log.w(TAG, "could not resume the saved session", e)
            AudioAdhkarStore(context).appendEvent("${section.key}: resume start refused: ${e.javaClass.simpleName}")
            false
        }

        private const val RESUME_SAVED_REQUEST_CODE = 7345

        /** Pause/resume/stop an existing session; a no-op when none is running. */
        fun command(context: Context, action: String) {
            AudioAdhkarTrace.log(context, "service", "command ${action.substringAfterLast('.')} from the app (sessionActive=$isSessionActive)")
            if (!isSessionActive) return
            context.startService(Intent(context, AudioAdhkarPlaybackService::class.java).setAction(action))
        }
    }
}
