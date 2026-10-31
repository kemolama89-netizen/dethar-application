package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** The widget never shortens or cuts the religious text: it shrinks, drops the comment, and otherwise reports "doesn't fit". */
class WidgetTextFitTest {
    // A text of `lines` lines at 22sp; smaller sizes need proportionally fewer lines (rounded up).
    private fun content(lines22: Int, comment: Int = 40, source: Int = 30) = { sp: Float, withComment: Boolean ->
        Math.ceil(lines22 * sp / 22.0).toInt() * (sp * 2.2f).toInt() + source + if (withComment) comment else 0
    }

    private fun fit(available: Int, lines22: Int, hasComment: Boolean = true) = WidgetTextFit.choose(available, hasComment, content(lines22))

    @Test
    fun aShortTextKeepsTheLargestSizeAndItsComment() {
        val f = fit(available = 300, lines22 = 2)!!
        assertEquals(WidgetTextFit.TEXT_SIZES_SP.first(), f.textSp)
        assertTrue(f.showComment)
    }

    @Test
    fun aLongerTextShrinksBeforeTheCommentIsDropped() {
        val f = fit(available = 250, lines22 = 4)!!
        assertTrue(f.textSp < WidgetTextFit.TEXT_SIZES_SP.first())
        assertTrue(f.showComment)
    }

    @Test
    fun theCommentGoesBeforeTheTextGetsTooSmall() {
        val f = fit(available = 150, lines22 = 5)!!
        assertFalse(f.showComment)
    }

    @Test
    fun whenEvenTheSmallestSizeCannotHoldItAllThereIsNoFit_neverACutText() {
        assertNull(fit(available = 120, lines22 = 30))
    }

    @Test
    fun nothingIsEverDrawnBelowTheLegibleMinimum() {
        for (available in 60..400 step 10) for (lines in 1..20) {
            fit(available, lines)?.let { assertTrue(it.textSp >= WidgetTextFit.TEXT_SIZES_SP.last()) }
        }
    }

    @Test
    fun withoutACommentItStillPicksTheLargestSizeThatFits() {
        val f = fit(available = 300, lines22 = 3, hasComment = false)
        assertNotNull(f)
        assertEquals(WidgetTextFit.TEXT_SIZES_SP.first(), f!!.textSp)
        assertFalse(f.showComment)
    }

    // A note of n characters needs one line while n * sp <= 300 (a stand-in width); its line is sp * 2 px tall.
    private fun noteLine(note: String, sp: Float): Int? = if (note.length * sp <= 300f) (sp * 2).toInt() else null

    @Test
    fun theLongerNoteIsUsedWhenItFitsOnOneLine() {
        val (note, sp) = WidgetTextFit.chooseNote(listOf("Tap to read it in full", "Tap to read"), 100, ::noteLine)
        assertEquals("Tap to read it in full", note)
        assertTrue(note.length * sp <= 300f)
    }

    @Test
    fun aNarrowWidgetGetsTheShorterNote_neverAWrappedOne() {
        val (note, sp) = WidgetTextFit.chooseNote(listOf("Tap to read it in full", "Tap to read"), 100) { n, s -> if (n.length * s <= 150f) (s * 2).toInt() else null }
        assertEquals("Tap to read", note)
        assertTrue(note.length * sp <= 150f)
    }

    @Test
    fun whenNothingFitsTheShortestNoteAtTheSmallestSize() {
        val (note, sp) = WidgetTextFit.chooseNote(listOf("Tap to read it in full", "Tap to read"), 5, ::noteLine)
        assertEquals("Tap to read", note)
        assertEquals(WidgetTextFit.NOTE_MIN_SP, sp)
    }

    @Test
    fun aTextThatCannotFitIsReplacedByTheReadInFullAction_neverByAPartOfIt() {
        // No size holds it: no fit, so the renderer shows the note instead of any of the text.
        assertNull(fit(available = 40, lines22 = 12))
        assertEquals("اقرأ النص كاملًا", WidgetTextFit.FULL_TEXT_NOTES_AR.first())
        assertEquals("Read the full text", WidgetTextFit.FULL_TEXT_NOTES_EN.first())
        // The note is drawn on one line only: the longest that fits, else the shortest — never a wrapped, clipped line.
        val oneLine = { note: String, sp: Float -> if (note.length * sp <= 300f) (sp * 1.3f).toInt() else null }
        assertEquals("اقرأ النص كاملًا" to 16f, WidgetTextFit.chooseNote(WidgetTextFit.FULL_TEXT_NOTES_AR, 40, oneLine))
        assertEquals("اقرأ كاملًا", WidgetTextFit.chooseNote(WidgetTextFit.FULL_TEXT_NOTES_AR, 40) { n, sp -> if (n.length * sp <= 300f && n.length < 12) (sp * 1.3f).toInt() else null }.first)
    }
}
