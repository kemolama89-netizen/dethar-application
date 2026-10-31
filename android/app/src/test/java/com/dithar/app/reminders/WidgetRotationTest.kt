package com.dithar.app.reminders

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

class WidgetRotationTest {
    private val zone = TimeZone.getTimeZone("Africa/Cairo")

    private fun item(id: String, category: String, widget: Boolean = true, comments: List<ReminderComment> = emptyList()) =
        ReminderItem(id, category, category, "نص $id", "", "src", "theme", comments, widget)

    private fun at(day: Int, hour: Int, minute: Int = 0): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, day, hour, minute)
    }.timeInMillis

    private val pool = (1..5).map { item("dua:$it", "dua") } + (1..7).map { item("hadith:$it", "hadith") } + (1..3).map { item("virtue:$it", "virtue") } +
        listOf(item("lataif:w1", "lataif", widget = false))

    @Test
    fun fourSlotsADay_andTheSmallHoursBelongToThePreviousNight() {
        val s = WidgetRotation.slot(at(14, 5), zone)
        assertEquals(s, WidgetRotation.slot(at(14, 7, 59), zone))
        assertEquals(s + 1, WidgetRotation.slot(at(14, 8), zone))
        assertEquals(s + 2, WidgetRotation.slot(at(14, 16), zone))
        assertEquals(s + 3, WidgetRotation.slot(at(14, 19), zone))
        assertEquals(s + 3, WidgetRotation.slot(at(15, 2), zone))
        assertEquals(s + 4, WidgetRotation.slot(at(15, 4), zone))
    }

    @Test
    fun onlyItemsMarkedForTheWidgetAreOffered() {
        for (slot in 0L until 200L) assertFalse(WidgetRotation.candidates(pool, slot).any { it.id == "lataif:w1" })
    }

    @Test
    fun categoriesTakeTurnsSlotBySlot() {
        val cats = (0L until 6L).map { WidgetRotation.itemFor(WidgetRotation.pool(pool), 300 + it)!!.category }
        assertEquals(cats.take(3).toSet().size, 3)
        assertEquals(cats.take(3), cats.drop(3))
    }

    @Test
    fun withinACategoryEveryItemShowsOnceBeforeAnyRepeats() {
        val eligible = WidgetRotation.pool(pool)
        val hadithSlots = (0L until 300L).map { WidgetRotation.itemFor(eligible, it)!! }.filter { it.category == "hadith" }
        assertEquals(7, hadithSlots.take(7).map { it.id }.toSet().size)
        assertEquals(hadithSlots.take(7), hadithSlots.drop(7).take(7))
    }

    @Test
    fun theDeliveredReminderComesFirst_unlessTheWidgetMayNotShowIt() {
        val current = pool.first { it.id == "hadith:4" }
        assertEquals("hadith:4", WidgetRotation.candidates(pool, 10, current).first().id)
        val notForWidget = pool.first { it.id == "lataif:w1" }
        assertNotEquals("lataif:w1", WidgetRotation.candidates(pool, 10, notForWidget).first().id)
    }

    @Test
    fun candidatesAreDistinct_andFallBackAcrossCategories() {
        val c = WidgetRotation.candidates(pool, 42, limit = 10)
        assertEquals(c.size, c.map { it.id }.toSet().size)
        assertTrue(c.map { it.category }.toSet().size > 1)
    }

    @Test
    fun anEmptyPoolOffersNothing() {
        assertTrue(WidgetRotation.candidates(emptyList(), 1).isEmpty())
        assertNull(WidgetRotation.itemFor(emptyList(), 1))
    }

    @Test
    fun theCommentBelongsToTheItem_andOnlyWidgetCommentsAreUsed() {
        val withComments = item("dua:c", "dua", comments = listOf(ReminderComment("a", "one"), ReminderComment("b", "long", widget = false), ReminderComment("c", "three")))
        for (slot in 0L until 20L) {
            val c = WidgetRotation.comment(withComments, slot)!!
            assertTrue(c.id == "a" || c.id == "c")
        }
        assertEquals("c", WidgetRotation.comment(withComments, 0, preferredId = "c")!!.id)
        assertNotEquals("b", WidgetRotation.comment(withComments, 0, preferredId = "b")!!.id)
        assertNull(WidgetRotation.comment(item("x", "dua"), 0))
    }
}
