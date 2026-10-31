package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * A PendingIntent is matched by its request code, never its extras: two
 * taps sharing a code open whichever was built last. Each widget and each
 * of its sizes (which may differ in whether the comment fits) therefore
 * has its own code, so a tap opens — and a heart saves — exactly what that
 * size drew.
 */
class WidgetTapCodeTest {
    @Test fun `every widget and size has its own open code`() {
        val codes = (0 until 50).flatMap { widget -> (0 until WidgetTapCode.MAX_SIZES).map { WidgetTapCode.of(widget, it) } }
        assertEquals(codes.size, codes.toSet().size)
    }

    @Test fun `heart codes never clash with each other or with the open codes`() {
        val open = (0 until 50).flatMap { w -> (0 until WidgetTapCode.MAX_SIZES).map { WidgetTapCode.of(w, it) } }
        val heart = (0 until 50).flatMap { w -> (0 until WidgetTapCode.MAX_SIZES).map { WidgetTapCode.favorite(w, it) } }
        assertEquals(heart.size, heart.toSet().size)
        assertEquals(0, open.toSet().intersect(heart.toSet()).size)
    }

    @Test fun `never the notification's or the summary's code`() {
        val all = (0 until 1000).flatMap { w -> (0 until WidgetTapCode.MAX_SIZES).flatMap { listOf(WidgetTapCode.of(w, it), WidgetTapCode.favorite(w, it)) } }
        for (reserved in listOf(7401, 7402, 7403, 0)) assertEquals(false, reserved in all)
    }
}
