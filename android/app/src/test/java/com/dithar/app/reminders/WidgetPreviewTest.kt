package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Home's «مختارات اليوم» preview: always the widget's own item, never a rotation of its own. */
class WidgetPreviewTest {
    private fun item(id: String, category: String, widget: Boolean = true, comments: List<ReminderComment> = emptyList()) =
        ReminderItem(id, category, category, "نص $id", "", "src", "theme", comments, widget)

    private val pool = (1..5).map { item("dua:$it", "dua", comments = listOf(ReminderComment("c:$it", "تعليق $it"))) } +
        (1..7).map { item("hadith:$it", "hadith") } + listOf(item("lataif:w1", "lataif", widget = false))

    private val noComment: (ReminderItem) -> ReminderComment? = { null }

    @Test
    fun theWidgetsOwnDrawingForThisSlot_comesFirst_withTheCommentItDrew() {
        val drawn = WidgetPreview.Drawn(ReminderOpen.of(pool[3], pool[3].comments.first()), slot = 40)
        val (open, from) = WidgetPreview.current(pool, 40, null, drawn, noComment)!!
        assertEquals(WidgetPreview.From.WIDGET, from)
        assertEquals("dua:4", open.id)
        assertEquals("c:4", open.commentId)
        assertEquals(drawn.open, open)
    }

    @Test
    fun withoutADrawingForThisSlot_itIsTheItemTheRotationIsDueToShow() {
        for (slot in 0L until 60L) {
            val stale = WidgetPreview.Drawn(ReminderOpen.of(pool[0], null), slot = slot - 1)
            val (open, from) = WidgetPreview.current(pool, slot, null, stale, noComment)!!
            assertEquals(WidgetPreview.From.ROTATION, from)
            assertEquals(WidgetRotation.candidates(pool, slot).first().id, open.id)
        }
    }

    @Test
    fun theReminderJustDelivered_leadsAsItDoesOnTheWidget() {
        val current = pool.first { it.id == "hadith:5" }
        val (open, _) = WidgetPreview.current(pool, 7, current, null, noComment)!!
        assertEquals("hadith:5", open.id)
    }

    @Test
    fun anItemTheWidgetMayNotShow_isNeverPreviewed() {
        val drawn = WidgetPreview.Drawn(ReminderOpen.of(pool.last(), null), slot = 3)
        val (open, from) = WidgetPreview.current(pool, 3, pool.last(), drawn, noComment)!!
        assertEquals(WidgetPreview.From.ROTATION, from)
        assertEquals(WidgetRotation.candidates(pool, 3).first().id, open.id)
        for (slot in 0L until 100L) assert(WidgetPreview.current(pool, slot, null, null, noComment)!!.first.id != "lataif:w1")
    }

    @Test
    fun aDrawingOfAnItemNoLongerInThePool_isNotShown() {
        val gone = WidgetPreview.Drawn(ReminderOpen.of(item("dua:99", "dua"), null), slot = 9)
        assertEquals(WidgetPreview.From.ROTATION, WidgetPreview.current(pool, 9, null, gone, noComment)!!.second)
    }

    @Test
    fun theRotationsCommentIsTheOneItsSlotGives() {
        val (open, _) = WidgetPreview.current(pool, 0, null, null) { it.comments.firstOrNull() }!!
        val due = WidgetRotation.candidates(pool, 0).first()
        assertEquals(due.comments.firstOrNull()?.id, open.commentId)
    }

    @Test
    fun nothingToPreview_beforeTheAppHasPushedContent() {
        assertNull(WidgetPreview.current(emptyList(), 5, null, null, noComment))
    }
}
