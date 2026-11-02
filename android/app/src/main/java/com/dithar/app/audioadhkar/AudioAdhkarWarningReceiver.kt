package com.dithar.app.audioadhkar

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import com.dithar.app.MainActivity
import com.dithar.app.NotificationExpiry

/**
 * One minute before a scheduled Morning/Evening session: posts a short
 * notification ("بعد دقيقة ستبدأ أذكار المساء") with the section's calm
 * reminder sound (ReminderSounds). It ONLY notifies — it never starts the
 * playback service; playback still starts from AudioAdhkarAlarmReceiver at
 * the configured time. Shown at most once per scheduled playback (see
 * AudioAdhkarSchedule.shouldWarn).
 */
class AudioAdhkarWarningReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val occurrence = intent.getLongExtra(AudioAdhkarScheduler.EXTRA_OCCURRENCE, 0L)
        val section = Section.of(intent.getStringExtra(AudioAdhkarScheduler.EXTRA_SECTION))
        val store = AudioAdhkarStore(context)
        val prefs = store.section(section)
        // The occurrence is the nominal start; a start deferred past an adhan window is announced a minute before it.
        val playbackAt = AdhanSuppression.clearAt(occurrence, store.adhanWindows)
        val warn = section.isDaily && prefs.enabled && AudioAdhkarSchedule.shouldWarn(
            occurrence = occurrence,
            scheduledOccurrence = prefs.scheduledOccurrence,
            lastWarnedOccurrence = prefs.lastWarnedOccurrence,
            sessionActive = AudioAdhkarPlaybackService.blocksScheduled,
            nowMillis = System.currentTimeMillis() - (playbackAt - occurrence),
        )
        if (!warn) {
            store.appendEvent("${section.key}: warning skipped for $occurrence")
            return
        }
        prefs.lastWarnedOccurrence = occurrence
        postWarning(context, section, prefs.reminderSound, store.language)
        store.appendEvent("${section.key}: warning shown for $occurrence")
    }

    private fun postWarning(context: Context, section: Section, sound: String, language: String) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = ReminderSounds.ensureChannel(context, sound, language)
        val openApp = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, channel) else Notification.Builder(context)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) ReminderSounds.applyLegacySound(context, builder, sound)
        // Gone by itself after 5 minutes at most (NotificationExpiry); the session it announces is unaffected.
        val notification = NotificationExpiry.apply(builder)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(section.label(language))
            .setContentText(body(section, language))
            .setContentIntent(openApp)
            .setAutoCancel(true)
            // One sound per scheduled session, even if the same warning were ever re-posted.
            .setOnlyAlertOnce(true)
            .build()
        // A fixed id: a warning can only ever replace the previous one, never stack.
        manager.notify(NOTIFICATION_ID, notification)
    }

    companion object {
        internal const val NOTIFICATION_ID = 7304

        fun body(section: Section, language: String = "ar") =
            if (language == "en") "${section.labelEn} start in one minute" else "بعد دقيقة ستبدأ ${section.label}"
    }
}

/**
 * The calm sound of the one-minute Morning/Evening reminder (Settings →
 * إعدادات الأذكار الصوتية → صوت التنبيه): soft birdsong or a brook for the
 * morning, a recorded shallow river or sea swells for the evening (res/raw; see
 * public/audio/reminders/README.md), or none.
 *
 * Android fixes a channel's sound when the channel is first created, so
 * each sound has its own channel; "off" is a silent channel. The system
 * then applies the user's notification volume, Do Not Disturb and any
 * per-channel choice they make in Android's settings.
 */
object ReminderSounds {
    val IDS = listOf("birdsong", "stream", "river", "waves")
    const val OFF = "off"
    private const val LEGACY_CHANNEL = "dithar_audio_adhkar_warning"
    // The evening sound the river replaced. A channel keeps the sound it was created with, so the river
    // has a channel of its own; a stored "crickets" is no longer known and sanitizes to the river.
    private const val CRICKETS_CHANNEL = "dithar_adhkar_reminder_crickets"

    fun defaultFor(section: Section): String = if (section == Section.EVENING) "river" else "birdsong"

    /** A stored/pushed value made safe: a known sound id, "off", or the section's default. */
    fun sanitize(value: String?, section: Section): String = when (value) {
        in IDS, OFF -> value!!
        else -> defaultFor(section)
    }

    fun channelId(sound: String): String = if (sound in IDS) "dithar_adhkar_reminder_$sound" else "dithar_adhkar_reminder_silent"

    fun rawName(sound: String): String = "adhkar_reminder_$sound"

    private fun channelName(sound: String, language: String): String {
        val en = language == "en"
        return when (sound) {
            "birdsong" -> if (en) "Adhkar reminder — birdsong" else "تنبيه الأذكار — تغريد الطيور"
            "stream" -> if (en) "Adhkar reminder — gentle stream" else "تنبيه الأذكار — جدول ماء"
            "river" -> if (en) "Adhkar reminder — flowing water" else "تنبيه الأذكار — جريان ماء"
            "waves" -> if (en) "Adhkar reminder — sea waves" else "تنبيه الأذكار — أمواج هادئة"
            else -> if (en) "Adhkar reminder — silent" else "تنبيه الأذكار — بدون صوت"
        }
    }

    fun soundUri(context: Context, sound: String): Uri? {
        if (sound !in IDS) return null
        val id = context.resources.getIdentifier(rawName(sound), "raw", context.packageName)
        return if (id == 0) null else Uri.parse("android.resource://${context.packageName}/$id")
    }

    val attributes: AudioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()

    /** Creates (idempotently) the channel for [sound] and returns its id. */
    fun ensureChannel(context: Context, sound: String, language: String): String {
        val id = channelId(sound)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = context.getSystemService(NotificationManager::class.java)
            // The single system-sound channel this replaced.
            manager.deleteNotificationChannel(LEGACY_CHANNEL)
            manager.deleteNotificationChannel(CRICKETS_CHANNEL)
            val uri = soundUri(context, sound)
            val channel = NotificationChannel(id, channelName(sound, language), NotificationManager.IMPORTANCE_DEFAULT).apply {
                setSound(uri, if (uri != null) attributes else null)
                enableVibration(false)
            }
            manager.createNotificationChannel(channel)
        }
        return id
    }

    /** Android 7: no channels — the sound goes on the notification itself. */
    @Suppress("DEPRECATION")
    fun applyLegacySound(context: Context, builder: Notification.Builder, sound: String) {
        val uri = soundUri(context, sound)
        if (uri != null) builder.setSound(uri, attributes) else builder.setSound(null as Uri?)
    }

    private var preview: MediaPlayer? = null

    /** Settings → preview: plays [sound] once on the notification stream (so it follows the notification volume). */
    fun preview(context: Context, sound: String): Boolean {
        stopPreview()
        val uri = soundUri(context, sound) ?: return false
        return try {
            preview = MediaPlayer().apply {
                setAudioAttributes(attributes)
                setDataSource(context.applicationContext, uri)
                setOnCompletionListener { stopPreview() }
                setOnPreparedListener { it.start() }
                prepareAsync()
            }
            true
        } catch (_: Exception) {
            stopPreview()
            false
        }
    }

    fun stopPreview() {
        preview?.run {
            try {
                stop()
            } catch (_: Exception) {
            }
            release()
        }
        preview = null
    }
}
