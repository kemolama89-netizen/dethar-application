package com.dithar.app

import android.app.Notification
import android.os.Build

/**
 * Reminder notifications (prayer times, the Audio Adhkar one-minute
 * warning, the "paused for prayer / resumed" notes) remove themselves
 * [MILLIS] after they appear — or earlier when they say so, or when the
 * user dismisses them. Only the notification goes: the alarms, the adhan
 * or adhkar playing, and every later schedule are untouched. The ongoing
 * playback notification never expires (Android requires it while
 * playing). Uses Notification.Builder.setTimeoutAfter (Android 8+; on
 * Android 7 notifications stay until dismissed, as before).
 */
object NotificationExpiry {
    const val MILLIS = 5 * 60_000L

    /** How long a notification posted at [nowMillis] stays: [MILLIS], or until [dismissAt] when that is sooner (at least a second). */
    fun timeoutMillis(nowMillis: Long, dismissAt: Long? = null): Long =
        if (dismissAt == null) MILLIS else (dismissAt - nowMillis).coerceIn(1_000L, MILLIS)

    fun apply(builder: Notification.Builder, nowMillis: Long = System.currentTimeMillis(), dismissAt: Long? = null): Notification.Builder {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setTimeoutAfter(timeoutMillis(nowMillis, dismissAt))
        return builder
    }
}
