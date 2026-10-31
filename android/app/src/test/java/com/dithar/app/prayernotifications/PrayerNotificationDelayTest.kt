package com.dithar.app.prayernotifications

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * A later Adhan time on chosen weekdays: the alert is delivered at [at]
 * but identified by its prayer time ([PrayerNotification.prayerAt]), so a
 * prayer already posted is never posted again when its time changes.
 */
class PrayerNotificationDelayTest {
    private val minute = 60_000L
    private val dhuhr = 720 * minute
    private val asr = 900 * minute

    private fun entry(prayer: String, prayerAt: Long, at: Long = prayerAt) = PrayerNotification(prayer, at, "t", "b", prayerAt = prayerAt)

    @Test
    fun aDelayedAdhanIsArmedAndFiredAtItsLaterTime() {
        val friday = listOf(entry("dhuhr", dhuhr, at = dhuhr + 25 * minute), entry("asr", asr))
        assertEquals(dhuhr + 25 * minute, PrayerNotificationPlan.next(friday, dhuhr, 0L)?.at)
        // Nothing fires at the prayer time itself …
        assertNull(PrayerNotificationPlan.fire(friday, dhuhr, 0L).post)
        // … it fires at 12:25, and is then recorded by its prayer time.
        val firing = PrayerNotificationPlan.fire(friday, dhuhr + 25 * minute, 0L)
        assertEquals("dhuhr", firing.post?.prayer)
        assertEquals(dhuhr, firing.lastPosted)
    }

    @Test
    fun changingTheTimeAfterItPlayedNeverRepeatsIt() {
        // Played at 12:25; the user then moves Friday's Dhuhr Adhan to 12:40.
        val moved = listOf(entry("dhuhr", dhuhr, at = dhuhr + 40 * minute), entry("asr", asr))
        assertEquals("asr", PrayerNotificationPlan.next(moved, dhuhr + 26 * minute, dhuhr)?.prayer)
        assertNull(PrayerNotificationPlan.fire(moved, dhuhr + 40 * minute, dhuhr).post)
    }

    @Test
    fun aRestartRearmsTheDelayedAlertWhenItHasNotPlayedYet() {
        val friday = listOf(entry("dhuhr", dhuhr, at = dhuhr + 25 * minute), entry("asr", asr))
        // Rebooted at 12:10, after the prayer time but before the Adhan: still armed for 12:25.
        assertEquals(dhuhr + 25 * minute, PrayerNotificationPlan.next(friday, dhuhr + 10 * minute, dhuhr - 300 * minute)?.at)
    }

    @Test
    fun anEntryFromAnOlderBuildIsIdentifiedByItsTime() {
        val old = PrayerNotificationStore.parseEntry(JSONObject().put("prayer", "dhuhr").put("at", dhuhr).put("title", "t").put("body", "b"))
        assertEquals(dhuhr, old.prayerAt)
        val roundTrip = PrayerNotificationStore.parse(PrayerNotificationStore.serialize(listOf(entry("dhuhr", dhuhr, at = dhuhr + 25 * minute))))
        assertEquals(dhuhr, roundTrip.single().prayerAt)
        assertEquals(dhuhr + 25 * minute, roundTrip.single().at)
    }
}
