package com.dithar.app

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.dithar.app.floatingtasbeeh.FloatingTasbeehPlugin

/**
 * What tapping a DITHAR notification opens: the app, ON the screen the notification is about — never
 * just Home. The route travels as the existing open-route extra (FloatingTasbeehPlugin.EXTRA_OPEN_ROUTE),
 * held natively until the app pulls it and cleared as it is taken (cold start, background and
 * foreground alike — src/lib/notificationRoutes.ts), so it is never lost during start-up nor replayed.
 *
 * Reminders, timed content, the widget and the Qur'an Journey carry their own exact item instead
 * (ReminderOpen, JourneyOpen); these routes are for the notifications that point at a screen.
 */
object NotificationRoutes {
    /** End-of-day summary → Statistics. */
    const val STATISTICS = "statistics"
    /** Prayer-time notifications and the adhan → the prayer times (Home's prayer panel). */
    const val PRAYER = "prayer"
    /** Floating Tasbeeh's own notification → the Tasbeeh screen. */
    const val TASBEEH = "tasbeeh"
    /** Audio Adhkar in general (and an adhan-interrupted session's "Resume Adhkar", whose banner is there). */
    const val AUDIO = "audio"

    /** One Audio Adhkar section's list ("morning", "evening", "misc"): where its playback, Play All and its resume are. */
    fun audio(section: String): String = "$AUDIO:$section"

    /** Every route the app understands (the app ignores anything else — only the app's own screens). */
    fun isKnown(route: String): Boolean =
        route in setOf(STATISTICS, PRAYER, TASBEEH, AUDIO, "settings") || route in setOf("morning", "evening", "misc").map(::audio)

    /**
     * The tap of a notification about [route]. One request code per route, with UPDATE_CURRENT: two
     * notifications about different screens can never share — and so overwrite — each other's target.
     */
    fun openIntent(context: Context, route: String): PendingIntent {
        val intent = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra(FloatingTasbeehPlugin.EXTRA_OPEN_ROUTE, route)
        return PendingIntent.getActivity(context, requestCode(route), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun requestCode(route: String): Int = 76_000_000 + Math.floorMod(route.hashCode(), 1_000_000)
}
