package com.dithar.app.reminders

import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.TimeZone

/** The widget's comment always comes from the item it shows — never from another item. */
class WidgetCommentOwnershipTest {
    private fun item(id: String, n: Int) = ReminderItem(id, "hadith", "Hadith", "نص $id", "", "src", "theme", (1..n).map { ReminderComment("$id:c$it", "comment $it of $id") })

    @Test
    fun theDailyAndTheRotatingCommentBelongToTheShownItem() {
        val pool = listOf(item("a", 3), item("b", 2), item("c", 4))
        val utc = TimeZone.getTimeZone("UTC")
        for (day in 0 until 60) {
            val now = 1_760_000_000_000L + day * 86_400_000L
            val shown = ReminderRotation.dailyPick(pool, now, utc)!!
            val c = ReminderRotation.dailyComment(shown, now, utc)!!
            assertTrue("$day: ${c.id} on ${shown.id}", shown.comments.contains(c))
            val rotating = ReminderRotation.pickComment(shown, listOf("a:c1", "b:c1", "c:c1"))!!
            assertTrue(shown.comments.contains(rotating))
        }
    }

    @Test
    fun anItemWithoutCommentsShowsNone() {
        assertNull(ReminderRotation.dailyComment(item("x", 0), 0L))
        assertNull(ReminderRotation.pickComment(item("x", 0), emptyList()))
    }
}
