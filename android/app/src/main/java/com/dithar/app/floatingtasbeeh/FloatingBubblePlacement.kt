package com.dithar.app.floatingtasbeeh

import kotlin.math.roundToInt

/**
 * Where the floating bubble may be (pure, unit-tested — FloatingBubblePlacementTest):
 * where it first appears, and the limits a drag keeps it within.
 *
 *  - It first appears centred across the screen, a little BELOW its middle
 *    (at [START_HEIGHT_FRACTION] of the usable height), where a thumb rests.
 *  - A drag moves it freely, but never off the screen and never over the
 *    status bar or the navigation bar (the system's own controls), and
 *    always with room above it for its × close button.
 *
 * All values are window pixels; [Area] is the screen and the room the
 * system bars (and any display cutout) take at its top and bottom.
 */
object FloatingBubblePlacement {
    const val START_HEIGHT_FRACTION = 0.62f

    data class Area(val width: Int, val height: Int, val top: Int = 0, val bottom: Int = 0)

    data class Position(val x: Int, val y: Int)

    /** Where a bubble of [size] first appears; [closeRoom] is the close button's height plus its gap. */
    fun initial(area: Area, size: Int, closeRoom: Int): Position {
        val usableTop = area.top + closeRoom
        val usableBottom = area.height - area.bottom
        val centreY = usableTop + (usableBottom - usableTop) * START_HEIGHT_FRACTION
        return clamp(Position((area.width - size) / 2, (centreY - size / 2f).roundToInt()), area, size, closeRoom)
    }

    /** [position] moved just enough to keep the whole bubble (and its close button) on screen, clear of the system bars. */
    fun clamp(position: Position, area: Area, size: Int, closeRoom: Int): Position {
        val maxX = (area.width - size).coerceAtLeast(0)
        val minY = area.top + closeRoom
        val maxY = (area.height - area.bottom - size).coerceAtLeast(minY)
        return Position(position.x.coerceIn(0, maxX), position.y.coerceIn(minY, maxY))
    }
}
