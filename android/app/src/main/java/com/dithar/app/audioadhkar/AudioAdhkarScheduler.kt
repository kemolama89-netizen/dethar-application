package com.dithar.app.audioadhkar

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Arms (or cancels) the Evening Audio Adhkar alarms: the daily playback
 * alarm and, one minute before it, a separate warning alarm that only
 * posts a notification (AudioAdhkarWarningReceiver).
 *
 * Each alarm always uses the same PendingIntent (fixed request code +
 * component), so every call REPLACES the previous one — re-registering on
 * each app start or changing the time can never leave two playback alarms
 * or two warning alarms armed.
 *
 * Exact alarms: an exact alarm fires on time even in Doze and — on Android
 * 12+ — is what allows the receiver to start the media foreground service
 * while DITHAR is in the background. It needs the user-granted "Alarms &
 * reminders" permission (SCHEDULE_EXACT_ALARM) on Android 12+; without it
 * an inexact alarm is used, which Android may deliver late and which may
 * not be allowed to start playback from the background.
 */
object AudioAdhkarScheduler {
    private const val REQUEST_CODE = 7301
    private const val WARNING_REQUEST_CODE = 7303
    const val EXTRA_OCCURRENCE = "com.dithar.app.audioadhkar.OCCURRENCE"

    data class Result(val scheduledAt: Long, val warningAt: Long?, val exact: Boolean)

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
    }

    /** Arms the next occurrence from the stored settings, or cancels when disabled/unset/empty. */
    fun reschedule(context: Context, afterMillis: Long = System.currentTimeMillis()): Result? {
        val store = AudioAdhkarStore(context)
        val minutes = store.eveningStartMinutes
        if (!store.eveningEnabled || minutes < 0 || store.eveningPlaylist.isEmpty()) {
            if (store.scheduledOccurrence != 0L) store.appendEvent("cancelled")
            cancel(context)
            return null
        }
        val plan = AudioAdhkarSchedule.plan(afterMillis, minutes / 60, minutes % 60, store.lastWarnedOccurrence)
        val at = plan.playbackAt
        store.scheduledOccurrence = at
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        val exact = canScheduleExact(context)
        setAlarm(alarmManager, at, pendingIntent(context, at), exact)
        val warning = warningPendingIntent(context, at)
        if (plan.warningAt != null) {
            setAlarm(alarmManager, plan.warningAt, warning, exact)
        } else {
            alarmManager.cancel(warning)
        }
        store.appendEvent("armed playback=$at warning=${plan.warningAt ?: "none"} exact=$exact")
        return Result(at, plan.warningAt, exact)
    }

    private fun setAlarm(alarmManager: AlarmManager, at: Long, pending: PendingIntent, exact: Boolean) {
        if (exact) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        } else {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        }
    }

    /** Cancels both the playback alarm and its warning. */
    fun cancel(context: Context) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        alarmManager.cancel(pendingIntent(context, 0L))
        alarmManager.cancel(warningPendingIntent(context, 0L))
        AudioAdhkarStore(context).scheduledOccurrence = 0L
    }

    /** Tagged with the PLAYBACK occurrence it announces, so a stale warning can be recognized. */
    private fun warningPendingIntent(context: Context, occurrence: Long): PendingIntent {
        val intent = Intent(context, AudioAdhkarWarningReceiver::class.java).putExtra(EXTRA_OCCURRENCE, occurrence)
        return PendingIntent.getBroadcast(
            context,
            WARNING_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun pendingIntent(context: Context, occurrence: Long): PendingIntent {
        val intent = Intent(context, AudioAdhkarAlarmReceiver::class.java).putExtra(EXTRA_OCCURRENCE, occurrence)
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
