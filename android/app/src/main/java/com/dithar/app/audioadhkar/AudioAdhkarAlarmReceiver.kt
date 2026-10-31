package com.dithar.app.audioadhkar

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * A scheduled time arrived. Each occurrence starts at most ONE playback
 * (see AudioAdhkarSchedule.shouldFire for what is rejected), then the
 * section's next alarm is armed.
 *
 *  - Morning/Evening: starts the day's session. Inside an adhan window, or
 *    while another section is playing, it doesn't start now — it continues
 *    later from the first dhikr (AudioAdhkarResumeReceiver).
 *  - Misc: plays the next dhikr of the cycle. If it can't play now (an
 *    adhan window, another session playing) it waits: it plays as soon as
 *    that clears — one dhikr, never a burst — and the interval continues
 *    from there.
 */
class AudioAdhkarAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val occurrence = intent.getLongExtra(AudioAdhkarScheduler.EXTRA_OCCURRENCE, 0L)
        val section = Section.of(intent.getStringExtra(AudioAdhkarScheduler.EXTRA_SECTION))
        val store = AudioAdhkarStore(context)
        val prefs = store.section(section)
        val now = System.currentTimeMillis()
        // A dhikr the user is listening to doesn't hold a schedule back: the scheduled session replaces it.
        val busy = AudioAdhkarPlaybackService.blocksScheduled
        AudioAdhkarTrace.log(context, "alarm", "${section.key} playback alarm for $occurrence, ${(now - occurrence) / 1000}s late, busy=$busy ${AudioAdhkarTrace.powerState(context)}")
        val current = occurrence > prefs.lastFiredOccurrence && occurrence == prefs.scheduledOccurrence
        if (current) {
            // Consumed either way — this occurrence can never fire again.
            prefs.lastFiredOccurrence = occurrence
        }
        val windows = store.adhanWindows
        when {
            !current || !prefs.enabled ->
                store.appendEvent("${section.key}: alarm skipped for $occurrence (scheduled=${prefs.scheduledOccurrence})")
            section == Section.MISC && busy -> {
                // Re-checked when that session ends (the service reschedules Misc); this is only a fallback.
                store.appendEvent("misc: waiting — another session is playing")
                AudioAdhkarScheduler.reschedule(context, section, now + Resume.MISC_BUSY_FALLBACK_MILLIS)
                return
            }
            section == Section.MISC && AdhanSuppression.isSuppressed(now, windows) ->
                store.appendEvent("misc: waiting for the adhan pause to end")
            section == Section.MISC -> {
                store.appendEvent("misc: playing")
                prefs.lastPlayed = now
                AudioAdhkarPauseReceiver.postResumed(context, store, now)
                AudioAdhkarPlaybackService.startScheduled(context, section)
            }
            // Delivered so late that its prayer-time window is over: never started after it.
            !DailySlot.stillInWindow(occurrence, now, prefs.slots) ->
                store.appendEvent("${section.key}: alarm for $occurrence arrived after its window ended — not played")
            AdhanSuppression.isSuppressed(now, windows) ->
                AudioAdhkarScheduler.armResume(context, section, occurrence, 0, AdhanSuppression.clearAt(now, windows))
            busy -> AudioAdhkarScheduler.armResume(context, section, occurrence, 0, now + Resume.BUSY_RETRY_MILLIS)
            else -> {
                store.appendEvent("${section.key}: playback alarm fired for $occurrence")
                AudioAdhkarPlaybackService.startScheduled(context, section, occurrence, 0)
            }
        }
        // The next alarm (strictly after this occurrence, so it can't re-arm the same one).
        AudioAdhkarScheduler.reschedule(context, section, maxOf(now, occurrence))
    }
}

/**
 * Starts a daily session whose START was held back (its alarm fell inside
 * an adhan window, or another section's session was playing), or continues
 * one Android cut off (service killed, reboot) — from the dhikr recorded,
 * within Resume.GIVE_UP_MILLIS of its start time; never twice, never while
 * something else plays (it retries a minute later instead). A session the
 * adhan INTERRUPTED never comes here: it waits for the user's "Resume
 * Adhkar" (AudioAdhkarResumePromptReceiver).
 */
class AudioAdhkarResumeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val occurrence = intent.getLongExtra(AudioAdhkarScheduler.EXTRA_OCCURRENCE, 0L)
        val section = Section.of(intent.getStringExtra(AudioAdhkarScheduler.EXTRA_SECTION))
        val store = AudioAdhkarStore(context)
        val prefs = store.section(section)
        val now = System.currentTimeMillis()
        val windows = store.adhanWindows
        AudioAdhkarTrace.log(context, "alarm", "${section.key} resume alarm for $occurrence from #${prefs.resumeIndex}")
        when {
            !section.isDaily || occurrence == 0L || occurrence != prefs.resumeOccurrence || !prefs.enabled || !Resume.stillWanted(occurrence, now) ||
                // Never continued past the end of its prayer-time window.
                !DailySlot.stillInWindow(occurrence, now, prefs.slots) -> {
                store.appendEvent("${section.key}: resume dropped for $occurrence")
                AudioAdhkarScheduler.clearResume(context, section)
            }
            AdhanSuppression.isSuppressed(now, windows) ->
                AudioAdhkarScheduler.armResume(context, section, occurrence, prefs.resumeIndex, AdhanSuppression.clearAt(now, windows))
            AudioAdhkarPlaybackService.blocksScheduled ->
                AudioAdhkarScheduler.armResume(context, section, occurrence, prefs.resumeIndex, now + Resume.BUSY_RETRY_MILLIS)
            else -> {
                val index = prefs.resumeIndex
                AudioAdhkarScheduler.clearResume(context, section)
                store.appendEvent("${section.key}: resuming from #$index")
                AudioAdhkarPlaybackService.startScheduled(context, section, occurrence, index)
            }
        }
    }
}

// AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED (API 31+):
// re-arm as an exact alarm once the user grants "Alarms & reminders".
private const val ACTION_EXACT_ALARM_PERMISSION_CHANGED = "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED"

/**
 * Alarms don't survive a reboot, an app update/reinstall, or (for their
 * wall-clock target) a time/zone change — re-arm every section from the
 * stored settings.
 */
class AudioAdhkarRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        AudioAdhkarTrace.log(context, "alarm", "re-arm after ${intent.action?.substringAfterLast('.')}")
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            ACTION_EXACT_ALARM_PERMISSION_CHANGED,
            -> {
                // A session cut off by a restart continues from where it was (Morning/Evening only).
                if (intent.action == Intent.ACTION_BOOT_COMPLETED) AudioAdhkarScheduler.recoverInterruptedSession(context)
                AudioAdhkarScheduler.rescheduleAll(context)
            }
        }
    }
}
