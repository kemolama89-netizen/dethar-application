package com.dithar.app.floatingtasbeeh

import com.dithar.app.floatingtasbeeh.CounterOverlayRules.Area
import com.dithar.app.floatingtasbeeh.CounterOverlayRules.Position
import com.dithar.app.floatingtasbeeh.CounterOverlayRules.Release
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CounterOverlayRulesTest {
    private val controlsTop = 2000f

    @Test fun `a tap above the controls counts once`() {
        assertEquals(Release.COUNT, CounterOverlayRules.onRelease(downY = 900f, controlsTop = controlsTop, movedBeyondSlop = false, sheetOpen = false))
    }

    @Test fun `a tap in the controls zone never counts, even just above the buttons`() {
        assertEquals(Release.NOTHING, CounterOverlayRules.onRelease(downY = controlsTop, controlsTop = controlsTop, movedBeyondSlop = false, sheetOpen = false))
        assertEquals(Release.NOTHING, CounterOverlayRules.onRelease(downY = 2300f, controlsTop = controlsTop, movedBeyondSlop = false, sheetOpen = false))
    }

    @Test fun `a drag is not a tap`() {
        assertEquals(Release.NOTHING, CounterOverlayRules.onRelease(downY = 900f, controlsTop = controlsTop, movedBeyondSlop = true, sheetOpen = false))
    }

    @Test fun `with the Adhkar sheet open a touch closes it and never counts`() {
        assertEquals(Release.CLOSE_SHEET, CounterOverlayRules.onRelease(downY = 300f, controlsTop = controlsTop, movedBeyondSlop = false, sheetOpen = true))
        assertEquals(Release.CLOSE_SHEET, CounterOverlayRules.onRelease(downY = 300f, controlsTop = controlsTop, movedBeyondSlop = true, sheetOpen = true))
    }

    @Test fun `progress follows the target and disappears without one`() {
        assertNull(CounterOverlayRules.progress(33, 0))
        assertEquals(0.33f, CounterOverlayRules.progress(33, 100)!!, 0.0001f)
        assertEquals(1f, CounterOverlayRules.progress(150, 100)!!, 0.0001f)
        assertEquals(0f, CounterOverlayRules.progress(-3, 100)!!, 0.0001f)
    }

    @Test fun `full screen falls back to the pill after three idle minutes`() {
        assertEquals(180_000L, CounterOverlayRules.IDLE_TO_PILL_MS)
    }

    // ---- Modes: it never traps anyone ----

    private fun run(vararg events: CounterOverlayRules.Event): CounterOverlayRules.Mode =
        events.fold(CounterOverlayRules.Mode.CLOSED) { mode, event -> CounterOverlayRules.next(mode, event) }

    @Test fun `it always starts as the pill, never full screen`() {
        for (mode in CounterOverlayRules.Mode.values()) assertEquals(CounterOverlayRules.Mode.PILL, CounterOverlayRules.next(mode, CounterOverlayRules.Event.START))
    }

    @Test fun `only a tap on the pill opens full screen`() {
        assertEquals(CounterOverlayRules.Mode.FULL, run(CounterOverlayRules.Event.START, CounterOverlayRules.Event.EXPAND))
        val others = CounterOverlayRules.Event.values().filter { it != CounterOverlayRules.Event.EXPAND }
        for (mode in CounterOverlayRules.Mode.values()) for (event in others) {
            if (mode != CounterOverlayRules.Mode.FULL) assertTrue("$mode + $event", CounterOverlayRules.next(mode, event) != CounterOverlayRules.Mode.FULL)
        }
    }

    @Test fun `from full screen every way out works - on screen, in the notification, and by itself`() {
        val full = CounterOverlayRules.Mode.FULL
        for (event in listOf(CounterOverlayRules.Event.MINIMIZE, CounterOverlayRules.Event.NOTIFICATION_MINIMIZE, CounterOverlayRules.Event.IDLE, CounterOverlayRules.Event.OPEN_APP)) {
            assertEquals("$event", CounterOverlayRules.Mode.PILL, CounterOverlayRules.next(full, event))
        }
        for (event in listOf(CounterOverlayRules.Event.CLOSE, CounterOverlayRules.Event.NOTIFICATION_STOP)) {
            assertEquals("$event", CounterOverlayRules.Mode.CLOSED, CounterOverlayRules.next(full, event))
        }
    }

    @Test fun `picking a dhikr keeps the mode`() {
        assertEquals(CounterOverlayRules.Mode.FULL, CounterOverlayRules.next(CounterOverlayRules.Mode.FULL, CounterOverlayRules.Event.SELECT_DHIKR))
        assertEquals(CounterOverlayRules.Mode.PILL, CounterOverlayRules.next(CounterOverlayRules.Mode.PILL, CounterOverlayRules.Event.SELECT_DHIKR))
    }

    @Test fun `once closed, nothing but a new start brings it back`() {
        for (event in CounterOverlayRules.Event.values().filter { it != CounterOverlayRules.Event.START }) {
            assertEquals("$event", CounterOverlayRules.Mode.CLOSED, CounterOverlayRules.next(CounterOverlayRules.Mode.CLOSED, event))
        }
    }

    @Test fun `a full round trip - pill, full screen, minimize, expand, close`() {
        assertEquals(
            CounterOverlayRules.Mode.CLOSED,
            run(CounterOverlayRules.Event.START, CounterOverlayRules.Event.EXPAND, CounterOverlayRules.Event.MINIMIZE, CounterOverlayRules.Event.EXPAND, CounterOverlayRules.Event.CLOSE),
        )
    }

    // A 1080 x 2400 phone, 96 px status bar, 132 px navigation bar; pill window 160 x 250.
    private val area = Area(1080, 2400, 96, 132)
    private val w = 160
    private val h = 250
    private val inset = 3

    @Test fun `the pill starts on the right edge in the lower third, clear of the bars`() {
        val p = CounterOverlayRules.pillInitial(area, w, h, inset)
        assertEquals(1080 - w - inset, p.x)
        val centreY = p.y + h / 2
        val usable = 2400 - 96 - 132
        assertTrue(centreY > 96 + usable / 2)
        assertTrue(p.y + h <= 2400 - 132 - inset)
    }

    @Test fun `a released pill settles against the nearer side edge`() {
        assertEquals(inset, CounterOverlayRules.pillSettle(Position(200, 900), area, w, h, inset).x)
        assertEquals(1080 - w - inset, CounterOverlayRules.pillSettle(Position(700, 900), area, w, h, inset).x)
    }

    @Test fun `a released pill stays between the status bar and the navigation bar`() {
        assertEquals(96 + inset, CounterOverlayRules.pillSettle(Position(0, -400), area, w, h, inset).y)
        assertEquals(2400 - 132 - h - inset, CounterOverlayRules.pillSettle(Position(0, 99_999), area, w, h, inset).y)
    }

    @Test fun `a dragged pill never leaves the screen`() {
        val p = CounterOverlayRules.pillDrag(Position(-500, 99_999), area, w, h)
        assertEquals(0, p.x)
        assertEquals(2400 - 132 - h, p.y)
    }

    @Test fun `a screen too small for the pill still gives a valid place`() {
        val tiny = Area(100, 200, 50, 50)
        val p = CounterOverlayRules.pillSettle(Position(0, 0), tiny, w, h, inset)
        assertEquals(tiny.top + inset, p.y)
    }
}
