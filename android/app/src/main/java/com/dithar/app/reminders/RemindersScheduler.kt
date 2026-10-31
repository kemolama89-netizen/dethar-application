package com.dithar.app.reminders

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import com.dithar.app.MainActivity
import com.dithar.app.audioadhkar.AdhanSuppression
import com.dithar.app.audioadhkar.AudioAdhkarScheduler
import com.dithar.app.audioadhkar.AudioAdhkarStore
import com.dithar.app.floatingtasbeeh.FloatingTasbeehStore

/**
 * The alarms behind reminders, the widget and the end-of-day summary. One
 * fixed PendingIntent per kind, so re-arming always REPLACES — a resync
 * can never leave two alarms of a kind armed (no duplicate notifications).
 *
 *  - Reminder: an inexact, idle-allowed alarm (a reminder needn't be to
 *    the minute — this lets Android batch it, sparing the battery). With
 *    notifications off it doesn't even wake the phone: the widget only
 *    needs its new content by the time the screen is on.
 *  - Widget refresh: a non-waking alarm at the next time-of-day change, for
 *    the automatic background. While reminders are on, the widget's content
 *    changes only with a delivered reminder (WidgetRotation.displaySlot).
 *  - Summary: exact when "Alarms & reminders" is allowed, else inexact.
 */
object RemindersScheduler {
    private const val REQ_REMINDER = 7401
    private const val REQ_SUMMARY = 7402
    private const val REQ_WIDGET = 7403
    const val ACTION_REMINDER = "com.dithar.app.reminders.REMINDER"
    const val ACTION_SUMMARY = "com.dithar.app.reminders.SUMMARY"
    const val ACTION_WIDGET_REFRESH = "com.dithar.app.reminders.WIDGET_REFRESH"
    const val EXTRA_OPEN_REMINDER = ReminderOpen.EXTRA_ID
    const val EXTRA_OPEN_COMMENT = ReminderOpen.EXTRA_COMMENT_ID

    private fun pending(context: Context, action: String, code: Int): PendingIntent = PendingIntent.getBroadcast(
        context,
        code,
        Intent(context, RemindersReceiver::class.java).setAction(action),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    fun widgetCount(context: Context): Int =
        AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, DhikrWidgetProvider::class.java)).size

    fun rescheduleAll(context: Context, now: Long = System.currentTimeMillis()) {
        armReminder(context, now)
        armSummary(context, now)
        armWidgetRefresh(context, now)
    }

    fun armReminder(context: Context, now: Long = System.currentTimeMillis()) {
        val store = ReminderStore(context)
        val alarm = context.getSystemService(AlarmManager::class.java)
        val p = pending(context, ACTION_REMINDER, REQ_REMINDER)
        val hasContent = store.pool.any { it.category in store.categories }
        val wanted = store.enabled && hasContent && (store.notifications || widgetCount(context) > 0)
        val at = if (wanted) {
            ReminderPlan.nextFire(now, store.startMinutes, store.endMinutes, store.intervalMinutes, store.lastFired, AudioAdhkarStore(context).adhanWindows, store.dayStarts)
        } else {
            null
        }
        if (at == null) {
            alarm.cancel(p)
            return
        }
        val type = if (store.notifications) AlarmManager.RTC_WAKEUP else AlarmManager.RTC
        alarm.setAndAllowWhileIdle(type, at, p)
    }

    fun armSummary(context: Context, now: Long = System.currentTimeMillis()) {
        val store = ReminderStore(context)
        val alarm = context.getSystemService(AlarmManager::class.java)
        val p = pending(context, ACTION_SUMMARY, REQ_SUMMARY)
        if (!store.summaryEnabled) {
            alarm.cancel(p)
            return
        }
        val at = DailySummary.nextAt(now, store.summaryMinutes)
        store.summaryDueFor = DailySummary.localDate(at)
        if (AudioAdhkarScheduler.canScheduleExact(context)) {
            alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        } else {
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        }
    }

    fun armWidgetRefresh(context: Context, now: Long = System.currentTimeMillis()) {
        val alarm = context.getSystemService(AlarmManager::class.java)
        val p = pending(context, ACTION_WIDGET_REFRESH, REQ_WIDGET)
        if (widgetCount(context) == 0) {
            alarm.cancel(p)
            return
        }
        // Non-waking: nobody sees a widget with the screen off; it updates when the phone wakes.
        alarm.set(AlarmManager.RTC, WidgetBackgrounds.nextChange(now), p)
    }

    // ---- delivery ---------------------------------------------------------

    /** A reminder is due: pick the next one, show it on the widget, notify (unless off or during an adhan pause), arm the next. */
    fun deliverReminder(context: Context, now: Long = System.currentTimeMillis()) {
        val store = ReminderStore(context)
        if (!store.enabled) return armReminder(context, now)
        // Not due (a stale or repeated alarm, or before a holiday's start): nothing is shown or posted — just re-armed.
        if (!ReminderPlan.isDue(now, store.startMinutes, store.endMinutes, store.intervalMinutes, store.lastFired, store.dayStarts)) return armReminder(context, now)
        val item = ReminderRotation.next(store.pool, store.categories, store.lastCategory, store.recent)
        store.lastFired = now
        if (item != null) {
            // A comment not shown recently, so an item seen again reads differently.
            val comment = ReminderRotation.pickComment(item, store.recentComments)
            store.currentId = item.id
            store.currentCommentId = comment?.id
            store.lastCategory = item.category
            store.recent = ReminderRotation.remember(store.recent, item.id)
            if (comment != null) store.recentComments = ReminderRotation.remember(store.recentComments, comment.id, ReminderRotation.RECENT_COMMENT_LIMIT)
            // The widget's own rotation moves on with this reminder, so its content keeps the reminders' interval.
            store.widgetSlot = WidgetRotation.advance(store.widgetSlot, now)
            WidgetRenderer.updateAll(context)
            val duringAdhan = AdhanSuppression.isSuppressed(now, AudioAdhkarStore(context).adhanWindows)
            if (store.notifications && !duringAdhan) postReminder(context, store, item, comment, now)
        }
        armReminder(context, now)
    }

    private fun channel(context: Context, id: String, name: String, importance: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel(id, name, importance))
        }
    }

    /**
     * What tapping a reminder (notification or widget) opens: the app, on
     * EXACTLY the item that was shown — its id and comment id, plus a
     * snapshot of the very text, source and comment that were drawn
     * (ReminderOpen), so the app can open the same content even if its
     * library changed since (an app update) — never another item, never a
     * random or positional pick. [item] null (the summary, the widget's
     * placeholder): just the app.
     */
    fun openIntent(context: Context, item: ReminderItem?, requestCode: Int, comment: ReminderComment? = null): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (item != null) for ((key, value) in ReminderOpen.of(item, comment).toExtras()) intent.putExtra(key, value)
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun postReminder(context: Context, store: ReminderStore, item: ReminderItem, comment: ReminderComment?, now: Long) {
        val en = store.language == "en"
        channel(context, REMINDER_CHANNEL, if (en) "Reminders: duas, hadiths and dhikr" else "تذكيرات الأدعية والأحاديث والأذكار", NotificationManager.IMPORTANCE_DEFAULT)
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, REMINDER_CHANNEL) else Notification.Builder(context)
        val commentLine = comment?.let { (if (en) "DITHAR reflection: " else "تأمّل دِثار: ") + it.text }
        val body = listOf(item.text, item.meaning, item.source.takeIf { it.isNotEmpty() }?.let { "— $it" }, commentLine).filter { !it.isNullOrEmpty() }.joinToString("\n\n")
        builder
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(item.title)
            .setContentText(item.text)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setContentIntent(openIntent(context, item, REQ_REMINDER, comment))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
        // Gone before the next reminder could arrive (never two on screen), and within the hour at most.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setTimeoutAfter(minOf(store.intervalMinutes.toLong(), 60L) * 60_000L)
        }
        // One fixed id: a new reminder replaces the previous one, never stacks.
        context.getSystemService(NotificationManager::class.java).notify(REMINDER_NOTIFICATION_ID, builder.build())
    }

    /**
     * The summary is due: compose it from that day's snapshot (+ Floating Tasbeeh taps and Audio
     * Adhkar completions still queued natively that the snapshot doesn't hold), post once per day,
     * arm the next. A summary held back past midnight still describes the day it was for.
     */
    fun deliverSummary(context: Context, now: Long = System.currentTimeMillis()) {
        val store = ReminderStore(context)
        val today = DailySummary.localDate(now)
        val day = DailySummary.summaryDay(today, store.summaryDueFor)
        if (store.summaryEnabled && store.summaryPostedFor != day) {
            store.summaryPostedFor = day
            val snapshot = store.summarySnapshotFor(day)
            val floatingToday = try {
                DailySummary.newPendingTaps(snapshot, day, FloatingTasbeehStore(context).peekPendingEvents().map { Triple(it.localDate, it.epochMillis, it.times) })
            } catch (_: Exception) {
                0
            }
            // Audio still queued natively for that day that the app hasn't taken in yet: completions as
            // (length, title); recordings that stopped part-way as the time they really played.
            val queued = try {
                val all = AudioAdhkarStore(context).completions()
                val fresh = DailySummary.newPendingCompletions(snapshot, day, all.map { DailySummary.localDate(it.optLong("at")) to it.optString("id") })
                all.filter { DailySummary.localDate(it.optLong("at")) == day && it.optString("id") in fresh }
            } catch (_: Exception) {
                emptyList()
            }
            val pendingListening = queued
                .filter { it.optString("kind").isEmpty() }
                .map { (if (it.has("durationMs")) it.optLong("durationMs").takeIf { ms -> ms > 0 } else null) to it.optString("title").ifEmpty { null } }
            val pendingStoppedEarly = queued.filter { it.optString("kind") == "listening" }.map { it.optLong("listenedMs", 0L) }
            // Morning/Evening sessions heard to their end that the app hasn't taken in yet.
            val pendingSessions = queued.filter { it.optString("kind") == "session" }.map { it.optString("collection") }
            // Audio "Various" recordings heard to the end: Tasbeeh, as the Statistics screen counts them.
            val pendingVarious = queued.count { it.optString("kind").isEmpty() && it.optString("collection") == "misc" }
            // All-time counts: that day's snapshot, else the newest earlier one (nothing was recorded in the app since).
            val allTime = (snapshot ?: store.summarySnapshot?.takeIf { it.date < day })?.allTime
            val known = DailySummary.recordsKnown(snapshot, day, store.appOpenedOn, store.summarySnapshotUnreadable)
            val message = DailySummary.compose(snapshot, day, floatingToday, store.summaryMode, store.language, pendingListening, pendingStoppedEarly, pendingSessions, ofYesterday = day != today, pendingVariousPlays = pendingVarious, allTimeSoFar = allTime, recordsKnown = known)
            val en = store.language == "en"
            channel(context, SUMMARY_CHANNEL, if (en) "End-of-day summary" else "ملخص نهاية اليوم", NotificationManager.IMPORTANCE_DEFAULT)
            @Suppress("DEPRECATION")
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, SUMMARY_CHANNEL) else Notification.Builder(context)
            builder
                .setSmallIcon(android.R.drawable.ic_menu_agenda)
                .setContentTitle(message.title)
                .setContentText(message.body.lineSequence().first())
                .setStyle(Notification.BigTextStyle().bigText(message.body))
                .setContentIntent(openIntent(context, null, REQ_SUMMARY))
                .setAutoCancel(true)
            context.getSystemService(NotificationManager::class.java).notify(SUMMARY_NOTIFICATION_ID, builder.build())
        }
        armSummary(context, now + 60_000L)
    }

    fun cancelNotifications(context: Context) {
        context.getSystemService(NotificationManager::class.java).cancel(REMINDER_NOTIFICATION_ID)
    }

    private const val REMINDER_CHANNEL = "dithar_reminders"
    private const val SUMMARY_CHANNEL = "dithar_daily_summary"
    private const val REMINDER_NOTIFICATION_ID = 7410
    private const val SUMMARY_NOTIFICATION_ID = 7411
}

/** Reminder, summary and widget-refresh alarms. Not exported: only AlarmManager reaches it. */
class RemindersReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            RemindersScheduler.ACTION_REMINDER -> RemindersScheduler.deliverReminder(context)
            RemindersScheduler.ACTION_SUMMARY -> RemindersScheduler.deliverSummary(context)
            RemindersScheduler.ACTION_WIDGET_REFRESH -> {
                WidgetRenderer.updateAll(context)
                RemindersScheduler.armWidgetRefresh(context)
            }
        }
    }
}

/** Alarms don't survive a reboot, an app update, or a time/zone change: re-arm from the stored settings, and redraw the widget. */
class RemindersRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        RemindersScheduler.rescheduleAll(context)
        WidgetRenderer.updateAll(context)
    }
}
