package com.dithar.app.floatingtasbeeh

import com.dithar.app.floatingtasbeeh.DhikrMenuPopup.Companion.computeMenuPlacement
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DhikrMenuPlacementTest {
    private fun place(anchorX: Int, anchorY: Int) = computeMenuPlacement(
        anchorX = anchorX, anchorY = anchorY, anchorHeight = 150,
        menuWidth = 500, menuNaturalHeight = 1200,
        screenWidth = 1080, screenHeight = 2400, gap = 16, closeClearance = 66,
    )

    @Test fun `opens directly below the bubble when it fits`() {
        val p = place(100, 200)
        assertEquals(200 + 150 + 16, p.y)
        assertEquals(1200, p.height)
    }

    @Test fun `follows the bubble - a moved anchor yields a moved menu`() {
        val a = place(100, 200)
        val b = place(300, 260)
        assertEquals(a.y + 60, b.y)
        assertEquals(300, b.x)
    }

    @Test fun `flips above with a shrunk height near the bottom, never overlapping the bubble`() {
        val anchorY = 2000
        val p = place(100, anchorY)
        assertTrue(p.y + p.height <= anchorY - 66)
        assertTrue(p.y >= 0)
    }

    @Test fun `mid-screen with no full fit shrinks to the larger side instead of covering the bubble`() {
        val anchorY = 1100
        val p = place(100, anchorY)
        val overlapsBubble = p.y < anchorY + 150 && p.y + p.height > anchorY
        assertTrue(!overlapsBubble)
        assertTrue(p.y >= 0 && p.y + p.height <= 2400)
    }

    @Test fun `x is clamped on-screen`() {
        assertEquals(1080 - 500, place(1000, 200).x)
        assertEquals(0, place(-50, 200).x)
    }
}
