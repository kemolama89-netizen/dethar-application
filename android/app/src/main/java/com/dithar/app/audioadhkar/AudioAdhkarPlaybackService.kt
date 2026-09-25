package com.dithar.app.audioadhkar

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaMetadata
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
import org.json.JSONObject

/**
 * Plays a scheduled Evening Audio Adhkar session in the background: the
 * playlist pushed from JS (only dhikr that have their own recording, in
 * Evening order), each dhikr its written number of times, one after
 * another. Runs as a media-playback foreground service with a MediaSession,
 * so the phone shows its standard system media controls (current dhikr +
 * Pause/Play) and DITHAR doesn't need to be open.
 *
 * Repetition rules match the in-app player: a repetition advances only
 * when a playback of the file actually completes, and each playback's
 * completion counts once (PlaybackCursor tokens). Pause/resume keep the
 * same dhikr and repetition and continue from the paused position.
 *
 * Every completed playback — including between repetitions of the same
 * dhikr, but not after the session's last one — is followed by 3 seconds
 * of silence (SilenceGap); the next repetition/dhikr only becomes current
 * when its playback starts. A native Handler times the gap, with a
 * partial wake lock so it also holds with the screen off.
 *
 * Its state is published to JS (AudioAdhkarPlugin "playbackState"), where
 * it drives the SAME playback state the Audio Adhkar screen already shows.
 */
class AudioAdhkarPlaybackService : Service() {
    private var cursor: PlaybackCursor? = null
    private var player: MediaPlayer? = null
    private var prepared = false
    private var paused = false
    private val handler = Handler(Looper.getMainLooper())
    private val gap = SilenceGap()
    private var gapWakeLock: PowerManager.WakeLock? = null
    private val playNextAfterSilence = Runnable {
        if (cursor != null && !paused) playCurrent()
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
        session = MediaSession(this, "DitharAudioAdhkar").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() = resumePlayback()
                override fun onPause() = pausePlayback()
                override fun onStop() = stopSession()
            })
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_SCHEDULED -> startSession()
            ACTION_PAUSE -> pausePlayback()
            ACTION_RESUME -> resumePlayback()
            ACTION_STOP -> stopSession()
            else -> if (cursor == null) stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        cancelSilence()
        releasePlayer()
        abandonFocus()
        session.release()
        if (cursor != null) publish(null)
        cursor = null
        isSessionActive = false
        super.onDestroy()
    }

    // ---- session ----------------------------------------------------------

    private fun startSession() {
        getSystemService(NotificationManager::class.java).cancel(TAP_TO_START_NOTIFICATION_ID)
        if (cursor != null) {
            // Already playing: a second trigger never starts a second session.
            startForegroundCompat(buildNotification())
            return
        }
        val items = AudioAdhkarStore(this).eveningPlaylist
        val newCursor = PlaybackCursor(items)
        cursor = newCursor
        isSessionActive = true
        startForegroundCompat(buildNotification())
        if (newCursor.finished) {
            stopSession()
            return
        }
        session.isActive = true
        AudioAdhkarStore(this).appendEvent("playback started (${items.size} dhikr)")
        requestFocus()
        playCurrent()
    }

    private fun playCurrent() {
        val c = cursor ?: return
        cancelSilence()
        // The pending next repetition/dhikr becomes current only now, as its audio starts.
        c.advance()
        val item = c.current ?: return finishSession()
        releasePlayer()
        val token = c.beginPlayback()
        prepared = false
        try {
            val afd = assets.openFd(item.assetPath)
            player = MediaPlayer().apply {
                setAudioAttributes(audioAttributes)
                setWakeMode(this@AudioAdhkarPlaybackService, PowerManager.PARTIAL_WAKE_LOCK)
                setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
                afd.close()
                setOnPreparedListener { mp ->
                    prepared = true
                    if (!paused) mp.start()
                }
                setOnCompletionListener { onPlaybackCompleted(token) }
                setOnErrorListener { _, what, extra ->
                    Log.w(TAG, "playback error $what/$extra for ${item.assetPath}")
                    stopSession()
                    true
                }
                prepareAsync()
            }
        } catch (e: Exception) {
            Log.w(TAG, "cannot play ${item.assetPath}", e)
            stopSession()
            return
        }
        publish(stateJson())
    }

    private fun onPlaybackCompleted(token: Int) {
        when (cursor?.complete(token)) {
            PlaybackCursor.Step.NEXT_REPETITION, PlaybackCursor.Step.NEXT_DHIKR -> startSilence()
            PlaybackCursor.Step.FINISHED -> finishSession()
            else -> Unit // stale/duplicate completion — ignored
        }
    }

    // ---- silence between playbacks -----------------------------------------

    private fun startSilence() {
        releasePlayer()
        acquireGapWakeLock()
        handler.postDelayed(playNextAfterSilence, gap.start(SystemClock.uptimeMillis()))
    }

    private fun cancelSilence() {
        handler.removeCallbacks(playNextAfterSilence)
        gap.clear()
        releaseGapWakeLock()
    }

    private fun acquireGapWakeLock() {
        val lock = gapWakeLock ?: getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Dithar:AudioAdhkarSilence")
            .apply { setReferenceCounted(false) }
            .also { gapWakeLock = it }
        lock.acquire(SilenceGap.SILENCE_MILLIS + 10_000L)
    }

    private fun releaseGapWakeLock() {
        gapWakeLock?.let { if (it.isHeld) it.release() }
    }

    private fun pausePlayback() {
        if (cursor == null || paused) return
        paused = true
        if (gap.active) {
            // Paused during the silence: freeze the remaining silence.
            handler.removeCallbacks(playNextAfterSilence)
            gap.pause(SystemClock.uptimeMillis())
            releaseGapWakeLock()
        } else if (prepared) {
            player?.pause()
        }
        publish(stateJson())
    }

    private fun resumePlayback() {
        if (cursor == null || !paused) return
        paused = false
        requestFocus()
        val remaining = gap.resume(SystemClock.uptimeMillis())
        if (remaining != null) {
            acquireGapWakeLock()
            handler.postDelayed(playNextAfterSilence, remaining)
        } else if (prepared) {
            player?.start()
        }
        publish(stateJson())
    }

    /** The last dhikr's last repetition ended: report "finished", then end the session. */
    private fun finishSession() {
        val c = cursor
        val last = c?.items?.lastOrNull()
        val finalState = if (c != null && last != null) {
            JSONObject()
                .put("active", false)
                .put("collection", "evening")
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

    private fun endSession(finalState: JSONObject?) {
        cancelSilence()
        releasePlayer()
        abandonFocus()
        cursor = null
        paused = false
        isSessionActive = false
        session.isActive = false
        publish(finalState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun releasePlayer() {
        player?.run {
            setOnCompletionListener(null)
            setOnPreparedListener(null)
            setOnErrorListener(null)
            try {
                reset()
            } catch (_: Exception) {
            }
            release()
        }
        player = null
        prepared = false
    }

    // ---- audio focus ------------------------------------------------------

    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) pausePlayback()
    }

    private fun requestFocus() {
        val am = getSystemService(AudioManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val request = focusRequest ?: AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(audioAttributes)
                .setOnAudioFocusChangeListener(focusListener)
                .build()
                .also { focusRequest = it }
            am.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
        }
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
        val c = cursor ?: return null
        val item = c.current ?: return null
        return JSONObject()
            .put("active", true)
            .put("collection", "evening")
            .put("dhikrId", item.dhikrId)
            .put("title", item.title)
            .put("repetition", c.repetition)
            .put("total", item.repetitions)
            .put("status", if (paused) "paused" else "playing")
            .put("index", c.index)
            .put("count", c.items.size)
    }

    private fun publish(state: JSONObject?) {
        lastState = state
        val item = cursor?.current
        if (item != null) {
            session.setMetadata(
                MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, item.title)
                    .putString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE, item.title)
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, APP_NAME)
                    .putString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE, item.text)
                    .putString(MediaMetadata.METADATA_KEY_ALBUM, LABEL_EVENING)
                    .build(),
            )
            session.setPlaybackState(
                PlaybackState.Builder()
                    .setActions(
                        PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or
                            PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_STOP,
                    )
                    .setState(
                        if (paused) PlaybackState.STATE_PAUSED else PlaybackState.STATE_PLAYING,
                        PlaybackState.PLAYBACK_POSITION_UNKNOWN,
                        1f,
                    )
                    .build(),
            )
            getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, buildNotification())
        }
        stateListener?.invoke(state)
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
        val toggle = if (paused) {
            Notification.Action.Builder(android.R.drawable.ic_media_play, LABEL_RESUME, commandIntent(ACTION_RESUME)).build()
        } else {
            Notification.Action.Builder(android.R.drawable.ic_media_pause, LABEL_PAUSE, commandIntent(ACTION_PAUSE)).build()
        }
        val stop = Notification.Action.Builder(android.R.drawable.ic_menu_close_clear_cancel, LABEL_STOP, commandIntent(ACTION_STOP)).build()

        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
        return builder
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(item?.title ?: APP_NAME)
            .setContentText(item?.text ?: LABEL_EVENING)
            .setSubText(APP_NAME)
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        private const val TAG = "DitharAudioAdhkar"
        private const val CHANNEL_ID = "dithar_audio_adhkar"
        private const val NOTIFICATION_ID = 7302
        private const val APP_NAME = "DITHAR"
        private const val LABEL_CHANNEL = "الأذكار الصوتية"
        private const val LABEL_EVENING = "أذكار المساء"
        private const val LABEL_PAUSE = "إيقاف مؤقت"
        private const val LABEL_RESUME = "استئناف"
        private const val LABEL_STOP = "إيقاف"
        private const val LABEL_TAP_TO_START = "حان موعد أذكار المساء — اضغط لبدء التشغيل"
        private const val TAP_TO_START_NOTIFICATION_ID = 7306

        const val ACTION_START_SCHEDULED = "com.dithar.app.audioadhkar.START_SCHEDULED"
        const val ACTION_PAUSE = "com.dithar.app.audioadhkar.PAUSE"
        const val ACTION_RESUME = "com.dithar.app.audioadhkar.RESUME"
        const val ACTION_STOP = "com.dithar.app.audioadhkar.STOP"

        /** True while a session is playing or paused — the single-session guard. */
        @Volatile
        var isSessionActive = false
            private set

        /** The latest published state (null when no session) — for JS to catch up on app resume. */
        @Volatile
        var lastState: JSONObject? = null
            private set

        private var stateListener: ((JSONObject?) -> Unit)? = null

        fun setStateListener(listener: ((JSONObject?) -> Unit)?) {
            stateListener = listener
        }

        fun startScheduled(context: Context) {
            val intent = Intent(context, AudioAdhkarPlaybackService::class.java).setAction(ACTION_START_SCHEDULED)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
                AudioAdhkarStore(context).appendEvent("playback service start requested")
            } catch (e: Exception) {
                // Android refused a background start (e.g. Android 12+ without an
                // exact alarm, or a battery restriction). Don't fail silently:
                // offer a notification whose tap starts the same session — a
                // user tap is always allowed to start it.
                Log.w(TAG, "could not start scheduled playback", e)
                AudioAdhkarStore(context).appendEvent("playback service start refused: ${e.javaClass.simpleName}")
                postTapToStart(context)
            }
        }

        private fun postTapToStart(context: Context) {
            val manager = context.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, LABEL_CHANNEL, NotificationManager.IMPORTANCE_LOW))
            }
            val start = Intent(context, AudioAdhkarPlaybackService::class.java).setAction(ACTION_START_SCHEDULED)
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
                    .setContentTitle(LABEL_EVENING)
                    .setContentText(LABEL_TAP_TO_START)
                    .setContentIntent(pending)
                    .setAutoCancel(true)
                    .build(),
            )
        }

        /** Pause/resume/stop an existing session; a no-op when none is running. */
        fun command(context: Context, action: String) {
            if (!isSessionActive) return
            context.startService(Intent(context, AudioAdhkarPlaybackService::class.java).setAction(action))
        }
    }
}
