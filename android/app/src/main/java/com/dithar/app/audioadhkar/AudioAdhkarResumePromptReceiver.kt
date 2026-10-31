package com.dithar.app.audioadhkar

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.dithar.app.MainActivity

/**
 * The adhan pause that interrupted a Morning/Evening session is over and
 * the session is still incomplete: posts ONE notification with a "Resume
 * Adhkar" action (ResumePrompt.shouldPrompt decides; `prompted` makes it
 * once). Nothing plays until the user taps that action — or the in-app
 * button — which continues the SAVED session from where it stopped
 * (AudioAdhkarPlaybackService.resumeSaved). The notification disappears by
 * itself when the session's prayer-time window ends, and is removed as soon
 * as the session is completed, resumed or replaced.
 */
class AudioAdhkarResumePromptReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val occurrence = intent.getLongExtra(AudioAdhkarScheduler.EXTRA_OCCURRENCE, 0L)
        val section = Section.of(intent.getStringExtra(AudioAdhkarScheduler.EXTRA_SECTION))
        val store = AudioAdhkarStore(context)
        val prefs = store.section(section)
        val saved = prefs.savedProgress
        val now = System.currentTimeMillis()
        val windows = store.adhanWindows
        val suppressed = AdhanSuppression.isSuppressed(now, windows)
        AudioAdhkarTrace.log(context, "alarm", "${section.key} resume prompt alarm for $occurrence (saved=${saved?.occurrence})")
        when {
            saved != null && saved.occurrence == occurrence && suppressed && !saved.prompted && now < saved.expiresAt ->
                // The pause was extended (another adhan right after): ask once it really ends.
                AudioAdhkarScheduler.saveForResumePrompt(context, section, saved.copy(promptAt = AdhanSuppression.clearAt(now, windows)))
            ResumePrompt.shouldPrompt(saved, occurrence, now, prefs.enabled, suppressed, AudioAdhkarPlaybackService.blocksScheduled) -> {
                prefs.savedProgress = saved!!.copy(prompted = true)
                post(context, section, saved, prefs.playlist.size, store.language, now)
                store.appendEvent("${section.key}: resume prompt shown for $occurrence (#${saved.index})")
            }
            else -> store.appendEvent("${section.key}: resume prompt skipped for $occurrence")
        }
    }

    companion object {
        private const val CHANNEL_ID = "dithar_audio_adhkar_resume"
        private const val NOTIFICATION_ID_BASE = 7340

        fun notificationId(section: Section) = NOTIFICATION_ID_BASE + section.ordinal

        fun channelName(language: String) = if (language == "en") "Resume interrupted Adhkar" else "استئناف الأذكار بعد الصلاة"

        fun title(section: Section, language: String) =
            if (language == "en") "${section.labelEn} not finished" else "${section.label} لم تكتمل"

        /** "Paused for prayer at dhikr 7 of 22 …" — [index] is 0-based. */
        fun body(section: Section, index: Int, count: Int, language: String): String {
            val position = index + 1
            return if (language == "en") {
                if (count > 0) "${section.labelEn} paused for prayer at dhikr $position of $count. Tap “Resume Adhkar” to continue where you left off."
                else "${section.labelEn} paused for prayer. Tap “Resume Adhkar” to continue where you left off."
            } else {
                if (count > 0) "توقفت ${section.label} للصلاة عند الذكر $position من $count. اضغط «استئناف الأذكار» للمتابعة من حيث توقفت."
                else "توقفت ${section.label} للصلاة. اضغط «استئناف الأذكار» للمتابعة من حيث توقفت."
            }
        }

        fun actionLabel(language: String) = if (language == "en") "Resume Adhkar" else "استئناف الأذكار"

        private fun post(context: Context, section: Section, saved: SavedProgress, count: Int, language: String, now: Long) {
            val manager = context.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Default importance: one ordinary notification sound — it is the only notice the user gets.
                manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, channelName(language), NotificationManager.IMPORTANCE_DEFAULT))
            }
            val openApp = PendingIntent.getActivity(
                context,
                notificationId(section),
                Intent(context, MainActivity::class.java),
                PendingIntent.FLAG_IMMUTABLE,
            )
            val resume = AudioAdhkarPlaybackService.resumeSavedIntent(context, section)
            @Suppress("DEPRECATION")
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
            val text = body(section, saved.index, count, language)
            builder
                .setSmallIcon(android.R.drawable.ic_media_play)
                .setContentTitle(title(section, language))
                .setContentText(text)
                .setStyle(Notification.BigTextStyle().bigText(text))
                .setContentIntent(openApp)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .addAction(Notification.Action.Builder(android.R.drawable.ic_media_play, actionLabel(language), resume).build())
            // Gone by itself once the session can no longer continue (its prayer-time window's end).
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setTimeoutAfter((saved.expiresAt - now).coerceAtLeast(1_000L))
            manager.notify(notificationId(section), builder.build())
        }

        fun cancelNotification(context: Context, section: Section) {
            context.getSystemService(NotificationManager::class.java)?.cancel(notificationId(section))
        }
    }
}
