package com.dithar.app.audioadhkar

import com.dithar.app.NotificationRoutes
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.dithar.app.MainActivity
import com.dithar.app.NotificationExpiry
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * An adhan pause began that Miscellaneous adhkar would otherwise have
 * played through: tells the user they paused for the prayer and when they
 * resume — the end of the (merged) pause, in the phone's local time. Once
 * per pause (MiscPausePlan / lastPauseAnnounced), only while Misc is on
 * and has adhkar to play; then arms the next pause notice. The next Misc
 * dhikr that actually plays replaces it with a short "resumed" note
 * ([postResumed], from AudioAdhkarAlarmReceiver).
 */
class AudioAdhkarPauseReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val start = intent.getLongExtra(AudioAdhkarScheduler.EXTRA_OCCURRENCE, 0L)
        val store = AudioAdhkarStore(context)
        val prefs = store.section(Section.MISC)
        val now = System.currentTimeMillis()
        // The pause as it stands now (overlapping windows merged; the schedule may have been refreshed since).
        val pause = AdhanSuppression.normalize(store.adhanWindows).firstOrNull { now >= it.start && now < it.end && it.start <= start + 60_000L }
        when {
            !prefs.enabled || prefs.playlist.isEmpty() -> store.appendEvent("misc: pause notice skipped (off)")
            start <= prefs.lastPauseAnnounced -> store.appendEvent("misc: pause notice skipped (already shown for $start)")
            pause == null -> store.appendEvent("misc: pause notice skipped (no pause now)")
            else -> {
                prefs.lastPauseAnnounced = start
                prefs.pauseShownUntil = pause.end
                post(context, pausedText(prefs.language, pause.end), pause.end)
                store.appendEvent("misc: paused for prayer until ${pause.end}")
            }
        }
        AudioAdhkarScheduler.reschedule(context, Section.MISC, maxOf(now, start))
    }

    companion object {
        private const val CHANNEL_ID = "dithar_audio_adhkar_pause"
        private const val LABEL_CHANNEL = "إيقاف الأذكار للصلاة"
        internal const val NOTIFICATION_ID = 7327
        private const val RESUMED_SHOWN_MILLIS = 60_000L

        /** "HH:mm" in the phone's own time zone (Latin digits, as the app shows times). */
        fun clock(at: Long, zone: TimeZone = TimeZone.getDefault()): String =
            SimpleDateFormat("HH:mm", Locale.US).apply { timeZone = zone }.format(Date(at))

        fun pausedText(language: String, resumeAt: Long, zone: TimeZone = TimeZone.getDefault()): String {
            val time = clock(resumeAt, zone)
            return if (language == "en") {
                "Miscellaneous Adhkar paused for prayer. They will resume at $time, when the pause ends."
            } else {
                "تم إيقاف الأذكار المتنوعة بسبب الصلاة، وسيتم استئنافها الساعة $time بعد انتهاء فترة التوقف."
            }
        }

        fun resumedText(language: String): String =
            if (language == "en") "Miscellaneous Adhkar resumed" else "تم استئناف الأذكار المتنوعة"

        /**
         * A pause already announced whose merged window now ends later (the
         * adhan times were refreshed and another pause overlaps it): re-post
         * the same notification with the new resume time.
         */
        fun updateShownPause(context: Context, store: AudioAdhkarStore, nowMillis: Long) {
            val prefs = store.section(Section.MISC)
            val shownUntil = prefs.pauseShownUntil
            if (shownUntil <= nowMillis) return
            val pause = AdhanSuppression.normalize(store.adhanWindows).firstOrNull { nowMillis >= it.start && nowMillis < it.end } ?: return
            if (pause.end > shownUntil) {
                prefs.pauseShownUntil = pause.end
                post(context, pausedText(prefs.language, pause.end), pause.end)
                store.appendEvent("misc: pause extended until ${pause.end}")
            }
        }

        /** The next Misc dhikr is playing after a pause the user was told about: replace that note with "resumed". */
        fun postResumed(context: Context, store: AudioAdhkarStore, nowMillis: Long) {
            val prefs = store.section(Section.MISC)
            if (prefs.pauseShownUntil == 0L || nowMillis < prefs.pauseShownUntil) return
            prefs.pauseShownUntil = 0L
            post(context, resumedText(prefs.language), nowMillis + RESUMED_SHOWN_MILLIS)
        }

        /** One fixed id: a new pause/resume note always replaces the previous one, never stacks. Silent — it arrives with the adhan. */
        private fun post(context: Context, text: String, dismissAt: Long) {
            val manager = context.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, LABEL_CHANNEL, NotificationManager.IMPORTANCE_LOW))
            }
            // A tap opens the Various adhkar it is about (NotificationRoutes).
            val openApp = NotificationRoutes.openIntent(context, NotificationRoutes.audio(Section.MISC.key))
            @Suppress("DEPRECATION")
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
            builder
                .setSmallIcon(android.R.drawable.ic_media_pause)
                .setContentTitle(Section.MISC.label)
                .setContentText(text)
                .setStyle(Notification.BigTextStyle().bigText(text))
                .setContentIntent(openApp)
                .setAutoCancel(true)
            // Gone a minute after [dismissAt], and never later than 5 minutes after it appears (NotificationExpiry).
            NotificationExpiry.apply(builder, dismissAt = dismissAt + 60_000L)
            manager.notify(NOTIFICATION_ID, builder.build())
        }
    }
}
