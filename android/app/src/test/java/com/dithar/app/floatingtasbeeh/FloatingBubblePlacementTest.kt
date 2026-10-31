package com.dithar.app.floatingtasbeeh

import com.dithar.app.floatingtasbeeh.FloatingBubblePlacement.Area
import com.dithar.app.floatingtasbeeh.FloatingBubblePlacement.Position
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FloatingBubblePlacementTest {
    // A 1080 × 2400 phone: 96 px status bar, 132 px navigation bar; a 64dp bubble at 2.75x ≈ 176 px.
    private val area = Area(width = 1080, height = 2400, top = 96, bottom = 132)
    private val size = 176
    private val closeRoom = 66

    @Test fun `first appears centred across the screen, below its middle`() {
        val p = FloatingBubblePlacement.initial(area, size, closeRoom)
        assertEquals((1080 - size) / 2, p.x)
        val centreY = p.y + size / 2
        assertTrue("below the middle: $centreY", centreY > 2400 / 2)
        assertTrue("not at the very bottom: $centreY", centreY < 2400 - 132 - size)
    }

    @Test fun `a drag inside the screen goes exactly where the finger is`() {
        assertEquals(Position(300, 900), FloatingBubblePlacement.clamp(Position(300, 900), area, size, closeRoom))
    }

    @Test fun `never leaves the screen at either side`() {
        assertEquals(0, FloatingBubblePlacement.clamp(Position(-500, 900), area, size, closeRoom).x)
        assertEquals(1080 - size, FloatingBubblePlacement.clamp(Position(5000, 900), area, size, closeRoom).x)
    }

    @Test fun `never covers the status bar, and keeps room for its close button`() {
        assertEquals(96 + closeRoom, FloatingBubblePlacement.clamp(Position(300, -200), area, size, closeRoom).y)
    }

    @Test fun `never covers the navigation bar`() {
        assertEquals(2400 - 132 - size, FloatingBubblePlacement.clamp(Position(300, 99_999), area, size, closeRoom).y)
    }

    @Test fun `a screen too short for the bubble keeps it below the status bar rather than off screen`() {
        val tiny = Area(width = 400, height = 300, top = 96, bottom = 132)
        val p = FloatingBubblePlacement.clamp(Position(0, 0), tiny, size, closeRoom)
        assertEquals(96 + closeRoom, p.y)
    }

    @Test fun `landscape - the start position and limits follow the turned screen`() {
        val land = Area(width = 2400, height = 1080, top = 96, bottom = 0)
        val p = FloatingBubblePlacement.initial(land, size, closeRoom)
        assertEquals((2400 - size) / 2, p.x)
        assertTrue(p.y + size <= 1080)
        assertTrue(p.y >= 96 + closeRoom)
    }
}
