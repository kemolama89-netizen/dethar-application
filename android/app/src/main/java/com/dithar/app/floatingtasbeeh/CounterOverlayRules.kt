package com.dithar.app.floatingtasbeeh

import android.view.WindowManager
import kotlin.math.max
import kotlin.math.min

/**
 * The floating counter's rules, kept free of Android views so they're tested
 * on the JVM (CounterOverlayRulesTest): which touches count in full-screen
 * mode, where the minimized pill may sit, and what its progress shows.
 */
object CounterOverlayRules {

    /** Which mode is showing. CLOSED: the service stops and Floating Tasbeeh is turned off (counts kept). */
    enum class Mode { PILL, FULL, CLOSED }

    /** Everything that can move the overlay between modes. */
    enum class Event {
        /** The service starts: after Settings enables it, after a reboot, or a system restart. */
        START,
        /** The pill is tapped. */
        EXPAND,
        /** تصغير on screen. */
        MINIMIZE,
        /** تصغير in the notification. */
        NOTIFICATION_MINIMIZE,
        /** Full screen left untouched for [IDLE_TO_PILL_MS]. */
        IDLE,
        /** إغلاق on screen. */
        CLOSE,
        /** إيقاف in the notification. */
        NOTIFICATION_STOP,
        /** A dhikr picked in the Adhkar sheet. */
        SELECT_DHIKR,
        /** «ذكر مخصص» or «الإعدادات»: the app opens, so the overlay steps aside. */
        OPEN_APP,
    }

    /**
     * The overlay's whole life as a state machine. It starts as the pill, and
     * only a tap on the pill opens full screen; from full screen there are
     * always several ways back to the pill or out — on screen, in the
     * notification, and by itself after an idle spell — so it never traps anyone.
     */
    fun next(mode: Mode, event: Event): Mode = when (event) {
        Event.START -> Mode.PILL
        Event.EXPAND -> if (mode == Mode.CLOSED) Mode.CLOSED else Mode.FULL
        Event.MINIMIZE, Event.NOTIFICATION_MINIMIZE, Event.IDLE, Event.OPEN_APP -> if (mode == Mode.CLOSED) Mode.CLOSED else Mode.PILL
        Event.CLOSE, Event.NOTIFICATION_STOP -> Mode.CLOSED
        Event.SELECT_DHIKR -> mode
    }

    /** What lifting a finger in full-screen mode does. */
    enum class Release { COUNT, CLOSE_SHEET, NOTHING }

    /**
     * One gesture ends: counts once, closes the Adhkar sheet, or does nothing.
     *  - with the sheet open, a touch on the veil only closes it — never counts;
     *  - a finger that moved past the touch slop was not a tap;
     *  - a touch that began in the controls' zone (from [controlsTop] down)
     *    never counts, so a near-miss on تصغير or إغلاق adds nothing.
     * A second finger during the same gesture doesn't add another count: the
     * gesture ends once, so it counts at most once.
     */
    fun onRelease(downY: Float, controlsTop: Float, movedBeyondSlop: Boolean, sheetOpen: Boolean): Release = when {
        sheetOpen -> Release.CLOSE_SHEET
        movedBeyondSlop -> Release.NOTHING
        downY >= controlsTop -> Release.NOTHING
        else -> Release.COUNT
    }

    /** The share of the target reached, 0..1, or null when there's no target (it's optional). */
    fun progress(count: Int, target: Int): Float? = if (target <= 0) null else min(1f, max(0, count).toFloat() / target)

    /** Full screen with no touch for this long falls back to the pill, so it can never be left covering the phone. */
    const val IDLE_TO_PILL_MS = 3 * 60_000L

    /** The usable screen: its size and the room the status bar and navigation bar take. */
    data class Area(val width: Int, val height: Int, val top: Int, val bottom: Int)

    data class Position(val x: Int, val y: Int)

    /** Where the pill first appears: on the right edge, [inset] in, in the lower third — clear of the back gesture's middle. */
    fun pillInitial(area: Area, width: Int, height: Int, inset: Int): Position =
        pillSettle(Position(area.width, area.top + ((area.height - area.top - area.bottom) * 2) / 3 - height / 2), area, width, height, inset)

    /**
     * Where a dragged pill comes to rest: against whichever side edge is
     * nearer, [inset] in from it, and fully between the status bar and the
     * navigation bar.
     */
    fun pillSettle(position: Position, area: Area, width: Int, height: Int, inset: Int): Position {
        val centre = position.x + width / 2
        val x = if (centre < area.width / 2) inset else max(inset, area.width - width - inset)
        val minY = area.top + inset
        val maxY = max(minY, area.height - area.bottom - height - inset)
        return Position(x, position.y.coerceIn(minY, maxY))
    }

    /** While dragged, the pill follows the finger but never leaves the screen. */
    fun pillDrag(position: Position, area: Area, width: Int, height: Int): Position =
        Position(position.x.coerceIn(0, max(0, area.width - width)), position.y.coerceIn(area.top, max(area.top, area.height - area.bottom - height)))
}

/** The window type every Floating Tasbeeh window uses: the only overlay type apps may add since Android 8. */
fun overlayWindowType(): Int = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
