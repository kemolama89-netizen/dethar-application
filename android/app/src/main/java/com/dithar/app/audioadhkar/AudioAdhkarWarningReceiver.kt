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
 * One minute before scheduled Evening playback: posts a short notification
 * ("بعد دقيقة ستبدأ أذكار المساء"). It ONLY notifies — it never starts the
 * playback service; playback still starts from AudioAdhkarAlarmReceiver at
 * the configured time. Shown at most once per scheduled playback (see
 * AudioAdhkarSchedule.shouldWarn).
 */
class AudioAdhkarWarningReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val occurrence = intent.getLongExtra(AudioAdhkarScheduler.EXTRA_OCCURRENCE, 0L)
        val store = AudioAdhkarStore(context)
        val warn = store.eveningEnabled && AudioAdhkarSchedule.shouldWarn(
            occurrence = occurrence,
            scheduledOccurrence = store.scheduledOccurrence,
            lastWarnedOccurrence = store.lastWarnedOccurrence,
            sessionActive = AudioAdhkarPlaybackService.isSessionActive,
            nowMillis = System.currentTimeMillis(),
        )
        if (!warn) {
            store.appendEvent("warning skipped for $occurrence")
            return
        }
        store.lastWarnedOccurrence = occurrence
        postWarning(context)
        store.appendEvent("warning shown for $occurrence")
    }

    private fun postWarning(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Default importance: the system's normal, short notification sound.
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, LABEL_CHANNEL, NotificationManager.IMPORTANCE_DEFAULT),
            )
        }
        val openApp = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL_ID) else Notification.Builder(context)
        val notification = builder
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(TITLE)
            .setContentText(BODY)
            .setContentIntent(openApp)
            .setAutoCancel(true)
            .build()
        // A fixed id: a warning can only ever replace the previous one, never stack.
        manager.notify(NOTIFICATION_ID, notification)
    }

    companion object {
        private const val CHANNEL_ID = "dithar_audio_adhkar_warning"
        private const val LABEL_CHANNEL = "تنبيه قبل أذكار المساء"
        private const val NOTIFICATION_ID = 7304
        const val TITLE = "أذكار المساء"
        const val BODY = "بعد دقيقة ستبدأ أذكار المساء"
    }
}
