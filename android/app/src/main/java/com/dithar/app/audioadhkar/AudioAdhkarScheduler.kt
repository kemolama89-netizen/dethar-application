package com.dithar.app.audioadhkar

import com.dithar.app.NotificationRoutes
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.dithar.app.MainActivity

/**
 * Arms (or cancels) the Audio Adhkar alarms of every section:
 *  - Morning and Evening: the daily playback alarm (at the user's start
 *    time, or — inside an adhan window — when that window ends), a warning
 *    alarm one minute before it (AudioAdhkarWarningReceiver, notification
 *    only), and a resume alarm for a session that must continue later
 *    (AudioAdhkarResumeReceiver).
 *  - Misc: one alarm for when its next dhikr may play (MiscPlan), and one
 *    at the start of the next adhan pause it would play through, which
 *    tells the user it paused and when it resumes (AudioAdhkarPauseReceiver).
 *
 * Each alarm always uses the same PendingIntent (fixed request code per
 * section and kind + component), so every call REPLACES the previous one —
 * re-registering on each app start or changing a setting can never leave
 * two alarms of one kind armed.
 *
 * Exact alarms: an exact alarm fires on time even in Doze and — on Android
 * 12+ — is what allows the receiver to start the media foreground service
 * while DITHAR is in the background. The alarms that start playback are
 * alarm clocks (AlarmPolicy) so a manufacturer background manager doesn't
 * hold them after DITHAR is swiped from Recents. It needs the user-granted "Alarms &
 * reminders" permission (SCHEDULE_EXACT_ALARM) on Android 12+; without it
 * an inexact alarm is used, which Android may deliver late and which may
 * not be allowed to start playback from the background.
 */
object AudioAdhkarScheduler {
    const val EXTRA_OCCURRENCE = "com.dithar.app.audioadhkar.OCCURRENCE"
    const val EXTRA_SECTION = "com.dithar.app.audioadhkar.SECTION"
    const val EXTRA_PAUSE_END = "com.dithar.app.audioadhkar.PAUSE_END"

    data class Result(val scheduledAt: Long, val warningAt: Long?, val exact: Boolean)

    private enum class Kind(val offset: Int) { PLAYBACK(1), WARNING(3), PAUSE(5), RESUME(7), PROMPT(9) }

    /** Request codes: Evening keeps its original 7301/7303; Morning 731x; Misc 732x. */
    private fun requestCode(section: Section, kind: Kind): Int = when (section) {
        Section.EVENING -> 7300
        Section.MORNING -> 7310
        Section.MISC -> 7320
    } + kind.offset

    fun canScheduleExact(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()
    }

    /** Re-arms every section from the stored settings. */
    fun rescheduleAll(context: Context, afterMillis: Long = System.currentTimeMillis()): Map<Section, Result?> =
        Section.values().associateWith { reschedule(context, it, afterMillis) }

    /** Arms [section]'s next occurrence from the stored settings, or cancels it when disabled/unset/empty. */
    fun reschedule(context: Context, section: Section, afterMillis: Long = System.currentTimeMillis()): Result? {
        val store = AudioAdhkarStore(context)
        val prefs = store.section(section)
        val minutes = prefs.startMinutes
        val windows = store.adhanWindows
        if (!prefs.enabled || minutes < 0 || prefs.playlist.isEmpty()) {
            if (prefs.scheduledOccurrence != 0L) store.appendEvent("${section.key}: cancelled")
            cancel(context, section)
            return null
        }
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        val exact = canScheduleExact(context)
        if (section == Section.MISC) {
            // Misc also makes way around every upcoming Morning/Evening start and resume (MiscDailyGuard).
            val tick = MiscPlan.nextPlay(afterMillis, minutes, prefs.endMinutes, prefs.intervalMinutes, prefs.lastPlayed, windows + MiscDailyGuard.blocks(dailyStarts(store, windows)), dayStarts = prefs.dayStarts, dayTimes = prefs.dayTimes)
            if (tick == null) {
                cancel(context, section)
                return null
            }
            prefs.scheduledOccurrence = tick
            setAlarm(context, alarmManager, tick, pendingIntent(context, section, Kind.PLAYBACK, tick), AlarmPolicy.mode(startsPlayback = true, exact))
            armMiscPause(context, store, alarmManager, afterMillis, exact)
            store.appendEvent("misc: armed tick=$tick exact=$exact mode=${AlarmPolicy.mode(startsPlayback = true, exact)}")
            return Result(tick, null, exact)
        }
        // A session the adhan interrupted keeps its one "Resume Adhkar" prompt (alarms don't survive a reboot).
        prefs.savedProgress?.let { saved ->
            if (!saved.prompted && afterMillis < saved.expiresAt) {
                setAlarm(context, alarmManager, maxOf(saved.promptAt, afterMillis), pendingIntent(context, section, Kind.PROMPT, saved.occurrence), AlarmPolicy.mode(startsPlayback = false, exact))
            }
        }
        // The planned sessions (each inside its day's prayer-time window, only where it fits); before
        // any were pushed, the plain daily start time.
        val slots = prefs.slots
        val plan = if (slots == null) {
            DailyPlan.plan(afterMillis, minutes / 60, minutes % 60, prefs.lastFiredOccurrence, prefs.lastWarnedOccurrence, windows)
        } else {
            DailyPlan.planSlots(afterMillis, slots, prefs.lastFiredOccurrence, prefs.lastWarnedOccurrence, windows)
        }
        if (plan == null) {
            if (prefs.scheduledOccurrence != 0L) store.appendEvent("${section.key}: no session fits in the coming windows")
            cancelStart(context, section)
            return null
        }
        prefs.scheduledOccurrence = plan.occurrence
        setAlarm(context, alarmManager, plan.playbackAt, pendingIntent(context, section, Kind.PLAYBACK, plan.occurrence), AlarmPolicy.mode(startsPlayback = true, exact))
        val warning = pendingIntent(context, section, Kind.WARNING, plan.occurrence)
        if (plan.warningAt != null) {
            setAlarm(context, alarmManager, plan.warningAt, warning, AlarmPolicy.mode(startsPlayback = false, exact))
        } else {
            alarmManager.cancel(warning)
        }
        store.appendEvent("${section.key}: armed playback=${plan.playbackAt} warning=${plan.warningAt ?: "none"} exact=$exact mode=${AlarmPolicy.mode(startsPlayback = true, exact)}")
        return Result(plan.playbackAt, plan.warningAt, exact)
    }

    /** Upcoming Morning/Evening starts (after any adhan deferral) and resumes of the enabled daily sections. */
    private fun dailyStarts(store: AudioAdhkarStore, windows: List<Window>): List<Long> =
        Section.values().filter { it.isDaily }.flatMap { section ->
            val prefs = store.section(section)
            if (!prefs.enabled) {
                emptyList()
            } else {
                listOfNotNull(
                    prefs.scheduledOccurrence.takeIf { it > 0 }?.let { AdhanSuppression.clearAt(it, windows) },
                    prefs.resumeAt.takeIf { it > 0 && prefs.resumeOccurrence > 0 },
                )
            }
        }

    /** The pause notice for the next adhan window Misc would play through — or none. */
    private fun armMiscPause(context: Context, store: AudioAdhkarStore, alarmManager: AlarmManager, afterMillis: Long, exact: Boolean) {
        val prefs = store.section(Section.MISC)
        val pause = MiscPausePlan.nextPause(afterMillis, prefs.startMinutes, prefs.endMinutes, prefs.intervalMinutes, store.adhanWindows, prefs.lastPauseAnnounced, prefs.lastPlayed, dayStarts = prefs.dayStarts, dayTimes = prefs.dayTimes)
        val pending = pendingIntent(context, Section.MISC, Kind.PAUSE, pause?.start ?: 0L, pause?.end ?: 0L)
        if (pause == null) alarmManager.cancel(pending) else setAlarm(context, alarmManager, MiscPausePlan.noticeAt(pause, prefs.dayStarts), pending, AlarmPolicy.mode(startsPlayback = false, exact))
        // A pause already announced whose (merged) window now ends later: say the new resume time.
        AudioAdhkarPauseReceiver.updateShownPause(context, store, afterMillis)
    }

    /**
     * A daily session to continue at [atMillis] from dhikr [index] (stopped
     * by an adhan, or blocked by another section). Replaces any earlier one.
     */
    fun armResume(context: Context, section: Section, occurrence: Long, index: Int, atMillis: Long) {
        val store = AudioAdhkarStore(context)
        val prefs = store.section(section)
        prefs.resumeOccurrence = occurrence
        prefs.resumeIndex = index
        prefs.resumeAt = atMillis
        setAlarm(
            context,
            context.getSystemService(AlarmManager::class.java),
            atMillis,
            pendingIntent(context, section, Kind.RESUME, occurrence),
            AlarmPolicy.mode(startsPlayback = true, canScheduleExact(context)),
        )
        store.appendEvent("${section.key}: resume from #$index armed for $atMillis")
        // Misc makes way around the resumed session too.
        reschedule(context, Section.MISC)
    }

    /**
     * A daily session that was playing when Android cut it off (the service
     * killed, the phone restarted): continue it from the dhikr it was on —
     * through the normal resume alarm, so it starts legitimately from the
     * background, waits out an adhan pause, and never doubles a session.
     * Returns whether it was re-armed.
     */
    fun recoverInterruptedSession(context: Context, nowMillis: Long = System.currentTimeMillis()): Boolean {
        val store = AudioAdhkarStore(context)
        val active = store.activeSession ?: return false
        store.activeSession = null
        val prefs = store.section(active.section)
        if (!active.shouldContinue(nowMillis) || !prefs.enabled || !DailySlot.stillInWindow(active.occurrence, nowMillis, prefs.slots)) {
            store.appendEvent("${active.section.key}: interrupted session not continued")
            return false
        }
        armResume(context, active.section, active.occurrence, active.index, AdhanSuppression.clearAt(nowMillis + RECOVER_DELAY_MILLIS, store.adhanWindows))
        store.appendEvent("${active.section.key}: continuing an interrupted session from #${active.index}")
        return true
    }

    private const val RECOVER_DELAY_MILLIS = 5_000L

    /**
     * The adhan interrupted [section]'s session: save exactly where it
     * stopped, and arm ONE prompt for when the adhan pause ends — the
     * session itself never continues on its own (ResumePrompt).
     */
    fun saveForResumePrompt(context: Context, section: Section, saved: SavedProgress) {
        val store = AudioAdhkarStore(context)
        store.section(section).savedProgress = saved
        setAlarm(
            context,
            context.getSystemService(AlarmManager::class.java),
            saved.promptAt,
            pendingIntent(context, section, Kind.PROMPT, saved.occurrence),
            AlarmPolicy.mode(startsPlayback = false, canScheduleExact(context)),
        )
        store.appendEvent("${section.key}: interrupted at #${saved.index} rep ${saved.repetition} part ${saved.part} @${saved.positionMillis}ms — resume prompt at ${saved.promptAt}")
    }

    /** The interrupted session was completed, resumed or replaced: forget it, its prompt alarm and its notification. */
    fun clearSavedProgress(context: Context, section: Section, reason: String) {
        val prefs = AudioAdhkarStore(context).section(section)
        if (prefs.savedProgress != null) AudioAdhkarStore(context).appendEvent("${section.key}: saved session cleared ($reason)")
        prefs.savedProgress = null
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, section, Kind.PROMPT, 0L))
        AudioAdhkarResumePromptReceiver.cancelNotification(context, section)
    }

    fun clearResume(context: Context, section: Section) {
        AudioAdhkarStore(context).section(section).apply {
            resumeOccurrence = 0L
            resumeAt = 0L
        }
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, section, Kind.RESUME, 0L))
    }

    /** See AlarmPolicy: playback starts are alarm clocks, notices exact, everything inexact without the permission. */
    private fun setAlarm(context: Context, alarmManager: AlarmManager, at: Long, pending: PendingIntent, mode: AlarmPolicy.Mode) {
        when (mode) {
            AlarmPolicy.Mode.ALARM_CLOCK -> alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(at, openAppIntent(context)), pending)
            AlarmPolicy.Mode.EXACT -> alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
            AlarmPolicy.Mode.INEXACT -> alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        }
    }

    /** What tapping the system's "next alarm" (status bar / lock screen) opens: Audio Adhkar (NotificationRoutes). */
    private fun openAppIntent(context: Context): PendingIntent = NotificationRoutes.openIntent(context, NotificationRoutes.AUDIO)

    private const val SHOW_APP_REQUEST_CODE = 7330

    /** Cancels [section]'s next start (playback + warning) — a session waiting to continue keeps its resume alarm. */
    private fun cancelStart(context: Context, section: Section) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        alarmManager.cancel(pendingIntent(context, section, Kind.PLAYBACK, 0L))
        alarmManager.cancel(pendingIntent(context, section, Kind.WARNING, 0L))
        AudioAdhkarStore(context).section(section).scheduledOccurrence = 0L
    }

    /** Cancels every alarm of [section]. */
    fun cancel(context: Context, section: Section) {
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        for (kind in Kind.values()) alarmManager.cancel(pendingIntent(context, section, kind, 0L))
        val prefs = AudioAdhkarStore(context).section(section)
        prefs.scheduledOccurrence = 0L
        prefs.resumeOccurrence = 0L
        prefs.resumeAt = 0L
        // Switched off (or the master switch): an interrupted session is no longer offered.
        if (section.isDaily) clearSavedProgress(context, section, "section off")
    }

    /** Tagged with its section and the occurrence it belongs to, so a stale alarm can be recognized. */
    private fun pendingIntent(context: Context, section: Section, kind: Kind, occurrence: Long, pauseEnd: Long = 0L): PendingIntent {
        val receiver = when (kind) {
            Kind.PLAYBACK -> AudioAdhkarAlarmReceiver::class.java
            Kind.WARNING -> AudioAdhkarWarningReceiver::class.java
            Kind.PAUSE -> AudioAdhkarPauseReceiver::class.java
            Kind.RESUME -> AudioAdhkarResumeReceiver::class.java
            Kind.PROMPT -> AudioAdhkarResumePromptReceiver::class.java
        }
        val intent = Intent(context, receiver)
            .putExtra(EXTRA_OCCURRENCE, occurrence)
            .putExtra(EXTRA_SECTION, section.key)
            .putExtra(EXTRA_PAUSE_END, pauseEnd)
        return PendingIntent.getBroadcast(
            context,
            requestCode(section, kind),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }
}
