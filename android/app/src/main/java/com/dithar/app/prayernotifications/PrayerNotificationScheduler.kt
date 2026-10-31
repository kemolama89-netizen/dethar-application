package com.dithar.app.prayernotifications

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
import com.dithar.app.NotificationExpiry
import com.dithar.app.audioadhkar.AlarmPolicy
import com.dithar.app.audioadhkar.AudioAdhkarPlaybackService
import com.dithar.app.audioadhkar.NowPlayingText
import com.dithar.app.audioadhkar.AudioAdhkarStore
import kotlin.random.Random

/**
 * Prayer times on Android: ONE alarm (fixed request code, so every call
 * replaces it — never two armed) for the next stored prayer time; when it
 * fires, PrayerNotificationReceiver shows its notification and/or — when
 * the user turned on auto-adhan for that section — starts the adhan, then
 * arms the next. Armed by the same policy as scheduled Audio Adhkar
 * (audioadhkar/AlarmPolicy): a prayer whose adhan plays is an alarm clock
 * (setAlarmClock) — a plain exact alarm was held by HONOR/Huawei's
 * background manager until DITHAR was opened, arriving past
 * ADHAN_MAX_LATE_MILLIS, so that prayer got its notification but no adhan;
 * a notification-only prayer is exact (setExactAndAllowWhileIdle); without
 * "Alarms & reminders" everything is inexact (setAndAllowWhileIdle).
 */
object PrayerNotificationScheduler {
    private const val REQUEST_CODE = 7401

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
    }

    /** Arms the alarm for the next notification, or cancels it when there is none. Returns its time. */
    fun reschedule(context: Context, afterMillis: Long = System.currentTimeMillis()): Long? {
        val store = PrayerNotificationStore(context)
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        val next = PrayerNotificationPlan.next(store.entries, afterMillis, store.lastPosted)
        if (next == null) {
            alarmManager.cancel(pendingIntent(context))
            if (store.scheduledAt != 0L) store.appendEvent("nothing to arm")
            store.scheduledAt = 0L
            return null
        }
        val exact = canScheduleExact(context)
        val withAdhan = store.adhanConfig(AdhanPlan.sectionFor(next.prayer)) != null
        val mode = try {
            setAlarm(context, alarmManager, next.at, AlarmPolicy.mode(startsPlayback = withAdhan, exactAllowed = exact))
        } catch (e: SecurityException) {
            // "Alarms & reminders" revoked between the check and the call: still armed, inexactly.
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.at, pendingIntent(context))
            store.appendEvent("exact alarm refused (${e.javaClass.simpleName}) — armed inexact")
            AlarmPolicy.Mode.INEXACT
        }
        val key = "${next.at}:$mode"
        if (store.scheduledKey != key) store.appendEvent("armed ${next.prayer} ${next.at} mode=$mode adhan=$withAdhan")
        store.scheduledKey = key
        store.scheduledAt = next.at
        return next.at
    }

    /** See AlarmPolicy: a prayer whose adhan plays is an alarm clock, a notification-only one exact, everything inexact without the permission. */
    private fun setAlarm(context: Context, alarmManager: AlarmManager, at: Long, mode: AlarmPolicy.Mode): AlarmPolicy.Mode {
        when (mode) {
            AlarmPolicy.Mode.ALARM_CLOCK -> alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(at, openAppIntent(context)), pendingIntent(context))
            AlarmPolicy.Mode.EXACT -> alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pendingIntent(context))
            AlarmPolicy.Mode.INEXACT -> alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pendingIntent(context))
        }
        return mode
    }

    /** What tapping the system's "next alarm" (status bar / lock screen) opens: DITHAR. */
    private fun openAppIntent(context: Context): PendingIntent = PendingIntent.getActivity(
        context,
        SHOW_APP_REQUEST_CODE,
        Intent(context, MainActivity::class.java),
        PendingIntent.FLAG_IMMUTABLE,
    )

    private const val SHOW_APP_REQUEST_CODE = 7402

    private fun pendingIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        REQUEST_CODE,
        Intent(context, PrayerNotificationReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    const val CHANNEL_ID = "dithar_prayer_times"
    private const val LABEL_CHANNEL = "أوقات الصلاة"
    /** Same notification without its own sound — used when the adhan itself is playing. */
    const val SILENT_CHANNEL_ID = "dithar_prayer_times_with_adhan"
    private const val LABEL_SILENT_CHANNEL = "أوقات الصلاة مع الأذان"

    /** [withAdhan]: the adhan is playing, so the notification makes no sound of its own. */
    fun post(context: Context, notification: PrayerNotification, withAdhan: Boolean = false) {
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = if (withAdhan) SILENT_CHANNEL_ID else CHANNEL_ID
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (withAdhan) {
                manager.createNotificationChannel(
                    NotificationChannel(SILENT_CHANNEL_ID, LABEL_SILENT_CHANNEL, NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null) },
                )
            } else {
                // High importance: shown as a heads-up with the system's normal notification sound.
                manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, LABEL_CHANNEL, NotificationManager.IMPORTANCE_HIGH))
            }
        }
        val openApp = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, channel) else Notification.Builder(context)
        // Gone by itself after 5 minutes (NotificationExpiry) — the adhan and the next alarms are unaffected.
        manager.notify(
            PrayerNotificationPlan.notificationId(notification.prayer),
            NotificationExpiry.apply(builder)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(notification.title)
                .setContentText(notification.body)
                .setWhen(notification.at)
                .setShowWhen(true)
                .setContentIntent(openApp)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .build(),
        )
    }
}

/**
 * The armed prayer time arrived (once per prayer, never stale): start its
 * adhan when auto-adhan is on for its section and the alarm is on time, and
 * show its notification when that prayer's notification is on — silent if
 * the adhan plays. Then arm the next.
 */
class PrayerNotificationReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val store = PrayerNotificationStore(context)
        val now = System.currentTimeMillis()
        val firing = PrayerNotificationPlan.fire(store.entries, now, store.lastPosted)
        store.lastPosted = firing.lastPosted
        val post = firing.post
        if (post == null) {
            store.appendEvent("alarm fired: nothing due or too late (lastPosted=${firing.lastPosted})")
        } else {
            val config = store.adhanConfig(AdhanPlan.sectionFor(post.prayer))
            val outcome = when (PrayerNotificationPlan.adhanDecision(config != null, post, now)) {
                AdhanDecision.OFF -> "off"
                AdhanDecision.TOO_LATE -> "skipped: ${(now - post.at) / 1000}s late (max ${PrayerNotificationPlan.ADHAN_MAX_LATE_MILLIS / 1000}s)"
                AdhanDecision.PLAY -> startAdhan(context, store, post, config!!)
            }
            val adhan = outcome == STARTED
            // Silent only when the adhan really started: a refused or skipped adhan keeps the notification's own sound.
            if (post.notify) PrayerNotificationScheduler.post(context, post, withAdhan = adhan)
            store.appendEvent("fired ${post.prayer} ${post.at} late=${(now - post.at) / 1000}s notified=${post.notify} adhan=$outcome")
        }
        PrayerNotificationScheduler.reschedule(context, now)
    }

    /** Starts this prayer's adhan; [STARTED], or why it didn't (recorded in the diagnostics). */
    private fun startAdhan(context: Context, store: PrayerNotificationStore, entry: PrayerNotification, config: AdhanConfig): String {
        val section = AdhanPlan.sectionFor(entry.prayer)
        val (lastVoice, _, consumedToken) = store.adhanLast(section)
        val voice = AdhanPlan.pick(config, lastVoice, consumedToken) { Random.nextInt(it) } ?: return "no voice"
        // The media controls' title: "أذان الظهر" / "Dhuhr Adhan" (not the notification's "صلاة الظهر — 12:05").
        val en = AudioAdhkarStore(context).language == "en"
        val refused = AudioAdhkarPlaybackService.startAdhan(context, voice, NowPlayingText.adhanTitle(entry.prayer, en))
        if (refused != null) return "start refused: $refused"
        val usedToken = if (voice.id == config.nextVoiceId) config.nextToken else consumedToken
        store.recordAdhan(section, voice.id, entry.at, usedToken)
        return STARTED
    }

    private companion object {
        const val STARTED = "started"
    }
}

// AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED (API 31+).
private const val ACTION_EXACT_ALARM_PERMISSION_CHANGED = "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED"

/** Alarms don't survive a reboot or an app update, and a time change moves wall-clock targets: re-arm. */
class PrayerNotificationRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            ACTION_EXACT_ALARM_PERMISSION_CHANGED,
            -> {
                PrayerNotificationStore(context).appendEvent("re-arm after ${intent.action?.substringAfterLast('.')}")
                PrayerNotificationScheduler.reschedule(context)
            }
        }
    }
}
