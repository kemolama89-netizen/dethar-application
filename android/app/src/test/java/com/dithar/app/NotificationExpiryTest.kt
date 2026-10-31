package com.dithar.app

import com.dithar.app.prayernotifications.PrayerNotificationStore
import org.junit.Assert.assertEquals
import org.junit.Test

class NotificationExpiryTest {
    private val now = 1_791_000_000_000L

    @Test
    fun aReminderGoesAwayFiveMinutesAfterItAppears() {
        assertEquals(5 * 60_000L, NotificationExpiry.MILLIS)
        assertEquals(5 * 60_000L, NotificationExpiry.timeoutMillis(now))
    }

    @Test
    fun soonerWhenItSaysSo_neverLaterThanFiveMinutes_neverInstantly() {
        assertEquals(60_000L, NotificationExpiry.timeoutMillis(now, now + 60_000L))
        assertEquals(5 * 60_000L, NotificationExpiry.timeoutMillis(now, now + 31 * 60_000L)) // the prayer-pause note: 30-min pause → still 5 min
        assertEquals(1_000L, NotificationExpiry.timeoutMillis(now, now - 10_000L))
    }

    @Test
    fun theAdhanVoiceCarriesItsMuezzin_emptyWhenUnknownOrFromAnOlderVersion() {
        val config = PrayerNotificationStore.parseAdhan(
            """{"rotate":true,"voices":[
                {"id":"a","name":"Mishary Alafasy — Kuwait","assetPath":"public/a.mp3","startMillis":0,"endMillis":10,"muezzin":"Mishary Rashid Alafasy"},
                {"id":"b","name":"Al-Masjid an-Nabawi","assetPath":"public/b.mp3","startMillis":0,"endMillis":10,"muezzin":""},
                {"id":"c","name":"old","assetPath":"public/c.mp3","startMillis":0,"endMillis":10}]}""",
        )!!
        assertEquals(listOf("Mishary Rashid Alafasy", "", ""), config.voices.map { it.muezzin })
    }
}
