package com.dithar.app.reminders

import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** The time-based content notifications: each entry posted once, never late, one per kind on screen. */
class TimedContentPlanTest {
    private val item = ReminderItem(id = "hadith:bukhari-574", category = "hadith", title = "حديث", text = "«من صلى البردين دخل الجنة»", meaning = "", source = "البخاري 574", theme = "hadith", comments = emptyList())
    private fun e(key: String, at: Long, kind: String = key.substringBefore(':')) = TimedEntry(key, kind, at, "t", item)
    private val h = 60 * 60_000L

    @Test
    fun postsWhatIsDueOnceAndRemembersIt() {
        val entries = listOf(e("asr:2026-11-04", 1_000 * h), e("asr:2026-11-05", 1_024 * h), e("friday:2026-11-06", 1_040 * h))
        val first = TimedContentPlan.fire(entries, 1_000 * h, emptySet())
        assertEquals(listOf("asr:2026-11-04"), first.post.map { it.key })
        // The same alarm again (or a sync re-pushing the same entries): nothing twice.
        val again = TimedContentPlan.fire(entries, 1_000 * h + 5_000, first.done)
        assertTrue(again.post.isEmpty())
        assertEquals(1_024 * h, TimedContentPlan.next(entries, 1_000 * h, first.done))
    }

    @Test
    fun aLittleEarlyStillPosts_tooLateNeverDoes() {
        val entries = listOf(e("asr:a", 10 * h))
        assertEquals(1, TimedContentPlan.fire(entries, 10 * h - 30_000, emptySet()).post.size)
        // Phone off for hours: the moment has passed — marked done, not posted.
        val late = TimedContentPlan.fire(entries, 13 * h, emptySet())
        assertTrue(late.post.isEmpty())
        assertEquals(setOf("asr:a"), late.done)
        assertNull(TimedContentPlan.next(entries, 13 * h, late.done))
    }

    @Test
    fun severalDueOfOneKindPostOnlyTheNewest_otherKindsToo() {
        val entries = listOf(e("asr:1", 10 * h), e("asr:2", 11 * h), e("friday:1", 11 * h + 1))
        val f = TimedContentPlan.fire(entries, 11 * h + 60_000, emptySet())
        assertEquals(listOf("asr:2", "friday:1"), f.post.map { it.key })
        assertEquals(setOf("asr:1", "asr:2", "friday:1"), f.done)
    }

    @Test
    fun theFridayHadithAndTheKahfReminderAtTheSameTimeBothPost() {
        val at = 100 * h
        val f = TimedContentPlan.fire(listOf(e("friday:2026-11-06", at), e("kahf:2026-11-06", at)), at, emptySet())
        assertEquals(setOf("friday:2026-11-06", "kahf:2026-11-06"), f.post.map { it.key }.toSet())
    }

    @Test
    fun theMemoryOfPostedKeysIsBounded() {
        val many = (1..200).map { "asr:$it" }
        val kept = TimedContentPlan.remember(many, setOf("friday:x"))
        assertEquals(TimedContentPlan.POSTED_LIMIT, kept.size)
        assertEquals("friday:x", kept.last())
    }

    @Test
    fun oneNotificationPerKind_andEachKeyOpensItsOwnContent() {
        val ids = listOf("asr", "friday", "whiteDays", "kahf").map(TimedContentPlan::notificationId)
        assertEquals(4, ids.toSet().size)
        // Adding the Surah al-Kahf reminder kept every earlier kind's id.
        assertEquals(listOf(7430, 7431, 7432), ids.take(3))
        assertEquals(TimedContentPlan.requestCode("asr:2026-11-04"), TimedContentPlan.requestCode("asr:2026-11-04"))
        assertNotEquals(TimedContentPlan.requestCode("asr:2026-11-04"), TimedContentPlan.requestCode("asr:2026-11-05"))
    }

    @Test
    fun parsesWhatTheAppPushes_leavingOutBrokenEntries() {
        val json = JSONArray(
            """[{"key":"asr:2026-11-04","kind":"asr","at":123,"title":"اقتربت صلاة العصر","item":{"id":"hadith:bukhari-574","category":"hadith","title":"حديث","text":"«من صلى البردين دخل الجنة»","meaning":"","source":"البخاري 574","theme":"hadith","comments":[]}},
               {"key":"","kind":"asr","at":1,"title":"","item":{}},
               {"key":"x","kind":"asr","at":1,"title":"","item":{"id":"y"}}]""",
        )
        val parsed = TimedContentPlan.parse(json)
        assertEquals(listOf("asr:2026-11-04"), parsed.map { it.key })
        assertEquals("hadith:bukhari-574", parsed[0].item.id)
        assertEquals("اقتربت صلاة العصر", parsed[0].title)
    }
}
