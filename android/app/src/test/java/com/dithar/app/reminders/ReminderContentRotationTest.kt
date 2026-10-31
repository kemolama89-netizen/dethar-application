package com.dithar.app.reminders

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

/** Comments, poetry, repetition prevention and the widget's favorite heart (pure logic). */
class ReminderContentRotationTest {
    private val zone = TimeZone.getTimeZone("Asia/Kuwait")
    private fun at(day: Int, hour: Int) = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, day, hour, 0, 0)
    }.timeInMillis

    private fun comments(prefix: String, n: Int) = (1..n).map { ReminderComment("$prefix:c$it", "تأمل $it") }
    private fun item(id: String, category: String, commentCount: Int = 3) =
        ReminderItem(id, category, category, "نص", "", "مصدر", "dua", comments(id, commentCount))

    // ---- items -----------------------------------------------------------------

    @Test
    fun poetryTakesItsTurnAfterTheOtherCategories() {
        val pool = listOf(item("dua:1", "dua"), item("hadith:1", "hadith"), item("virtue:1", "virtue"), item("poetry:1", "poetry"))
        val order = generateSequence(ReminderRotation.next(pool, ReminderRotation.CATEGORIES.toSet(), null, emptyList()) { 0 }) { prev ->
            ReminderRotation.next(pool, ReminderRotation.CATEGORIES.toSet(), prev.category, emptyList()) { 0 }
        }.take(5).map { it.category }.toList()
        assertEquals(listOf("dua", "hadith", "virtue", "poetry", "dua"), order)
        // Poetry can be switched off like any other category.
        assertNull(ReminderRotation.next(pool.filter { it.category == "poetry" }, setOf("dua"), null, emptyList()))
    }

    @Test
    fun aLargeCategoryShowsEveryItemBeforeRepeating() {
        val pool = (1..120).map { item("hadith:$it", "hadith") }
        var recent = emptyList<String>()
        val seen = mutableListOf<String>()
        repeat(120) { i ->
            val next = ReminderRotation.next(pool, setOf("hadith"), "hadith", recent) { n -> (i * 31) % n }!!
            seen += next.id
            recent = ReminderRotation.remember(recent, next.id)
        }
        assertEquals(120, seen.toSet().size)
        // After the full round, nothing from the recent three quarters comes back.
        val next = ReminderRotation.next(pool, setOf("hadith"), "hadith", recent) { 0 }!!
        assertFalse(next.id in recent.takeLast(ReminderRotation.freshnessWindow(120)))
    }

    @Test
    fun aTinyCategoryNeverRepeatsImmediately() {
        val pool = listOf(item("poetry:a", "poetry"), item("poetry:b", "poetry"))
        assertEquals("poetry:a", ReminderRotation.next(pool, setOf("poetry"), null, listOf("poetry:a", "poetry:b")) { 0 }!!.id)
        assertEquals("poetry:b", ReminderRotation.next(pool, setOf("poetry"), null, listOf("poetry:b", "poetry:a")) { 0 }!!.id)
    }

    // ---- comments --------------------------------------------------------------

    @Test
    fun commentsRotateThroughEveryOneBeforeReusingTheOldest() {
        val virtue = item("virtue:8", "virtue", 3)
        var recent = emptyList<String>()
        val shown = (1..6).map {
            val c = ReminderRotation.pickComment(virtue, recent)!!
            recent = ReminderRotation.remember(recent, c.id, ReminderRotation.RECENT_COMMENT_LIMIT)
            c.id
        }
        assertEquals(listOf("virtue:8:c1", "virtue:8:c2", "virtue:8:c3", "virtue:8:c1", "virtue:8:c2", "virtue:8:c3"), shown)
        assertNull(ReminderRotation.pickComment(item("x", "dua", 0), emptyList()))
    }

    @Test
    fun theDailyCommentIsStableForADayAndChangesTheNext() {
        val dua = item("dua:1", "dua", 4)
        assertEquals(ReminderRotation.dailyComment(dua, at(14, 6), zone), ReminderRotation.dailyComment(dua, at(14, 22), zone))
        assertNotEquals(ReminderRotation.dailyComment(dua, at(14, 6), zone), ReminderRotation.dailyComment(dua, at(15, 6), zone))
    }

    @Test
    fun itemsKeepTheirCommentsThroughStorage() {
        val original = item("hadith:muslim-2564", "hadith", 2)
        val parsed = ReminderStore.parseItem(JSONObject(ReminderStore.itemJson(original).toString()))
        assertEquals(original, parsed)
        // An item pushed by an older app version (no comments) still parses.
        val legacy = JSONObject().put("id", "dua:1").put("category", "dua").put("text", "نص")
        assertTrue(ReminderStore.parseItem(legacy).comments.isEmpty())
    }

    @Test
    fun onlyValidPaletteColorsAreAccepted() {
        assertEquals(0xFF0F4D3A.toInt(), ReminderStore.parseColor("#0f4d3a"))
        assertNull(ReminderStore.parseColor("red"))
        assertNull(ReminderStore.parseColor("#12345"))
        assertNull(ReminderStore.parseColor(null))
    }

    // ---- the widget's favorite heart ---------------------------------------------

    @Test
    fun aHeartTapSavesAndASecondTapRemoves() {
        val (afterAdd, added) = FavoriteLogic.toggle(emptySet(), "hadith:1")
        assertTrue(added)
        assertEquals(setOf("hadith:1"), afterAdd)
        val (afterRemove, stillSaved) = FavoriteLogic.toggle(afterAdd, "hadith:1")
        assertFalse(stillSaved)
        assertTrue(afterRemove.isEmpty())
    }

    @Test
    fun aTapRecordsWhatTheWidgetShowed() {
        val poem = item("poetry:x", "poetry", 2)
        val op = FavoriteLogic.op(5, poem, poem.comments[1], true, 1234L)
        assertEquals(5L, op.seq)
        assertEquals("poetry:x", op.key)
        assertEquals("نص", op.text)
        assertEquals("poetry:x:c2", op.commentId)
        assertEquals(op, FavoritesStore.parseOp(JSONObject(FavoritesStore.opJson(op).toString())))
    }

    @Test
    fun theAppsListWinsAndUnmergedTapsAreReplayedOnTop() {
        val dua = item("dua:1", "dua")
        val pending = listOf(
            FavoriteLogic.op(3, dua, null, true, 1L),
            FavoriteLogic.op(4, item("dua:2", "dua"), null, false, 2L),
        )
        // The app merged up to seq 3 and pushed its list (which already includes dua:2).
        val remaining = FavoriteLogic.acknowledge(pending, 3)
        assertEquals(listOf(4L), remaining.map { it.seq })
        assertEquals(setOf("dua:1"), FavoriteLogic.merge(setOf("dua:1", "dua:2"), remaining))
        // Nothing pending: exactly the app's list.
        assertEquals(setOf("hadith:9"), FavoriteLogic.merge(setOf("hadith:9"), emptyList()))
    }

    @Test
    fun repeatedTapsNeverDuplicateAFavorite() {
        var keys = emptySet<String>()
        repeat(5) { keys = FavoriteLogic.toggle(keys, "virtue:8").first }
        assertEquals(setOf("virtue:8"), keys)
    }
}
