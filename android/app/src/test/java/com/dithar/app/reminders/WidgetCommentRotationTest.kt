package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The widget's comment under an item (DITHAR's dua reflections, every
 * category's comments): stable while a slot is redrawn, never the previous
 * slot's comment again — so two widget updates in a row never repeat one.
 */
class WidgetCommentRotationTest {
    private val reflections = (1..34).map { ReminderComment("dua-reflection:%02d".format(it), "تأمّل $it", widget = true) }
    private fun dua(id: String) = ReminderItem(id, "dua", "dua", "نص", "", "src", "dua", reflections, true)
    private val duas = (1..12).map { dua("dua:$it") }

    /** Draws [slots] widget updates (with [redraws] background redraws each), returning what each update showed. */
    private fun run(slots: LongRange, redraws: Int = 2, preferred: (Long) -> String? = { null }): List<String> {
        var memory = WidgetRotation.CommentMemory(Long.MIN_VALUE, null, null)
        val shown = mutableListOf<String>()
        for (slot in slots) {
            val item = duas[Math.floorMod(slot, duas.size.toLong()).toInt()]
            var first: String? = null
            repeat(1 + redraws) {
                val (keep, avoid) = memory.forSlot(slot)
                val c = WidgetRotation.comment(item, slot, keep ?: preferred(slot), avoid)!!
                if (first == null) first = c.id else assertEquals("slot $slot redraw changed the comment", first, c.id)
                memory = memory.after(slot, c.id)
            }
            shown += first!!
        }
        return shown
    }

    @Test
    fun consecutiveUpdatesNeverRepeatAReflection() {
        val shown = run(0L..300L)
        for (i in 1 until shown.size) assertNotEquals("update $i", shown[i - 1], shown[i])
    }

    @Test
    fun theDeliveredReminderCommentIsShownUnlessItRepeatsThePreviousOne() {
        // The delivered reminder's comment is preferred — but never the one the previous update showed.
        val shown = run(0L..200L, preferred = { slot -> reflections[(slot / 2).toInt() % reflections.size].id })
        for (i in 1 until shown.size) assertNotEquals("update $i", shown[i - 1], shown[i])
        assertEquals(reflections[0].id, shown[0])
    }

    @Test
    fun theSelectionIsStableWithinASlot() {
        var memory = WidgetRotation.CommentMemory(Long.MIN_VALUE, null, null)
        val (keep, avoid) = memory.forSlot(7)
        val first = WidgetRotation.comment(duas[0], 7, keep, avoid)!!
        memory = memory.after(7, first.id)
        // A background refresh hours later, same slot: the same reflection.
        val (keep2, avoid2) = memory.forSlot(7)
        assertEquals(first.id, WidgetRotation.comment(duas[0], 7, keep2, avoid2)!!.id)
        // The next update: a different one, and the memory moves on.
        val (keep3, avoid3) = memory.forSlot(8)
        assertNull(keep3)
        assertEquals(first.id, avoid3)
        assertNotEquals(first.id, WidgetRotation.comment(duas[0], 8, null, avoid3)!!.id)
    }

    @Test
    fun theWidgetUsesTheWholeVariety() {
        val shown = run(0L until reflections.size.toLong() * 3, redraws = 0)
        assertEquals(reflections.size, shown.toSet().size)
    }

    @Test
    fun notificationsRotateThroughEveryReflectionBeforeRepeating() {
        var recent = emptyList<String>()
        val shown = (0 until reflections.size * 2).map { i ->
            val c = ReminderRotation.pickComment(duas[i % duas.size], recent)!!
            recent = ReminderRotation.remember(recent, c.id, ReminderRotation.RECENT_COMMENT_LIMIT)
            c.id
        }
        assertEquals(reflections.size, shown.take(reflections.size).toSet().size)
        for (i in 1 until shown.size) assertNotEquals(shown[i - 1], shown[i])
    }

    @Test
    fun aSingleCommentIsStillShown() {
        val one = ReminderItem("x", "dua", "dua", "نص", "", "src", "dua", reflections.take(1), true)
        assertEquals(reflections[0].id, WidgetRotation.comment(one, 5, null, reflections[0].id)!!.id)
    }
}
