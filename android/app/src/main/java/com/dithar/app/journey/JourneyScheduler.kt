package com.dithar.app.journey

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.dithar.app.MainActivity
import com.dithar.app.audioadhkar.AudioAdhkarScheduler

/**
 * The Qur'an Journey's daily notification: one fixed alarm (re-arming always replaces it),
 * exact when "Alarms & reminders" is allowed, else inexact. At most one notification a day,
 * one fixed id (a new one replaces the last, never stacks). Posting counts nothing: the page
 * is explored only when the app records the insight viewed.
 */
object JourneyScheduler {
    private const val REQ_ALARM = 7501
    private const val REQ_OPEN = 7502
    private const val NOTIFICATION_ID = 7510
    private const val CHANNEL = "dithar_quran_journey"
    const val ACTION_DAILY = "com.dithar.app.journey.DAILY"

    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        REQ_ALARM,
        Intent(context, JourneyReceiver::class.java).setAction(ACTION_DAILY),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    /** Arms the next notification from the stored setting and notice; cancels when off or nothing to post. Returns when, or null. */
    fun arm(context: Context, now: Long = System.currentTimeMillis()): Long? {
        val store = JourneyStore(context)
        val alarm = context.getSystemService(AlarmManager::class.java)
        val p = alarmIntent(context)
        val notice = store.notice
        if (!store.enabled || notice == null) {
            alarm.cancel(p)
            store.scheduledAt = 0L
            return null
        }
        val at = JourneyPlan.nextFire(now, store.minutes, notice.fromDate, store.postedFor)
        store.scheduledAt = at
        if (AudioAdhkarScheduler.canScheduleExact(context)) {
            alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        } else {
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        }
        return at
    }

    /** The alarm fired: post (once today, when the notice applies), then arm the next day. */
    fun deliver(context: Context, now: Long = System.currentTimeMillis()) {
        val store = JourneyStore(context)
        val notice = store.notice
        if (store.enabled && notice != null && JourneyPlan.shouldPost(now, store.minutes, notice.fromDate, store.postedFor)) {
            store.postedFor = JourneyPlan.localDate(now)
            post(context, notice)
        }
        arm(context, now)
    }

    /** Opens the app on exactly this notice's assignment (App.tsx JourneyOpenHost). */
    private fun openIntent(context: Context, notice: JourneyNotice): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        for ((key, value) in JourneyOpen.of(notice).toExtras()) intent.putExtra(key, value)
        return PendingIntent.getActivity(context, REQ_OPEN, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun post(context: Context, notice: JourneyNotice) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val en = JourneyStore(context).language == "en"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(NotificationChannel(CHANNEL, if (en) "Qur'an Journey" else "رحلة القرآن", NotificationManager.IMPORTANCE_DEFAULT))
        }
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
        builder
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle(notice.title)
            .setContentText(notice.body)
            .setStyle(Notification.BigTextStyle().bigText(notice.body))
            .setContentIntent(openIntent(context, notice))
            .setAutoCancel(true)
        try {
            manager.notify(NOTIFICATION_ID, builder.build())
        } catch (_: SecurityException) {
            // Notifications not allowed (Android 13+): nothing is posted.
        }
    }

    /** Today's notification no longer applies (its page was read, or the notification turned off). */
    fun cancelPosted(context: Context) {
        context.getSystemService(NotificationManager::class.java).cancel(NOTIFICATION_ID)
    }
}

/** The daily alarm. Not exported: only AlarmManager reaches it. */
class JourneyReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == JourneyScheduler.ACTION_DAILY) JourneyScheduler.deliver(context)
    }
}

/** Alarms don't survive a reboot, an app update or a time/zone change: re-arm from what is stored. */
class JourneyRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        JourneyScheduler.arm(context)
    }
}
