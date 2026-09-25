package com.dithar.app.audioadhkar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * The scheduled time arrived. Starts ONE Evening playback session for this
 * occurrence (see AudioAdhkarSchedule.shouldFire for what is rejected),
 * then arms the next day's alarm.
 */
class AudioAdhkarAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val occurrence = intent.getLongExtra(AudioAdhkarScheduler.EXTRA_OCCURRENCE, 0L)
        val store = AudioAdhkarStore(context)
        val fire = AudioAdhkarSchedule.shouldFire(
            occurrence = occurrence,
            scheduledOccurrence = store.scheduledOccurrence,
            lastFiredOccurrence = store.lastFiredOccurrence,
            sessionActive = AudioAdhkarPlaybackService.isSessionActive,
        )
        if (occurrence > store.lastFiredOccurrence && occurrence == store.scheduledOccurrence) {
            // Consumed either way — this occurrence can never start a session later.
            store.lastFiredOccurrence = occurrence
        }
        if (fire && store.eveningEnabled) {
            store.appendEvent("playback alarm fired for $occurrence")
            AudioAdhkarPlaybackService.startScheduled(context)
        } else {
            store.appendEvent("playback alarm skipped for $occurrence (scheduled=${store.scheduledOccurrence}, sessionActive=${AudioAdhkarPlaybackService.isSessionActive})")
        }
        // Next day's alarm (strictly after this occurrence, so it can't re-arm the same one).
        AudioAdhkarScheduler.reschedule(context, maxOf(System.currentTimeMillis(), occurrence))
    }
}

// AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED (API 31+):
// re-arm as an exact alarm once the user grants "Alarms & reminders".
private const val ACTION_EXACT_ALARM_PERMISSION_CHANGED = "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED"

/**
 * Alarms don't survive a reboot, an app update/reinstall, or (for their
 * wall-clock target) a time/zone change — re-arm from the stored settings.
 */
class AudioAdhkarRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            ACTION_EXACT_ALARM_PERMISSION_CHANGED,
            -> AudioAdhkarScheduler.reschedule(context)
        }
    }
}
