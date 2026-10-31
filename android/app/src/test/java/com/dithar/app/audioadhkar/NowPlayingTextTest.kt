package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Test

/** The phone's media controls show the same lines as the in-app player (NowPlayingText). */
class NowPlayingTextTest {
    @Test
    fun dhikrLineIsTheInAppPlayersLine() {
        // components/AudioAdhkarScreen.tsx: `التكرار ${n} من ${total}`, then « · القارئ: …» when the reciter is known.
        assertEquals("التكرار 2 من 3", NowPlayingText.dhikrSubtitle(2, 3, "", en = false))
        assertEquals("التكرار 1 من 1 · القارئ: مشاري العفاسي", NowPlayingText.dhikrSubtitle(1, 1, "مشاري العفاسي", en = false))
        assertEquals("Repetition 2 of 3 · Reciter: Mishary Alafasy", NowPlayingText.dhikrSubtitle(2, 3, "Mishary Alafasy", en = true))
        // No fixed count: the repetition alone.
        assertEquals("التكرار 4", NowPlayingText.dhikrSubtitle(4, null, "", en = false))
        assertEquals("Repetition 4", NowPlayingText.dhikrSubtitle(4, 0, " ", en = true))
    }

    @Test
    fun adhanTitleNamesThePrayer() {
        assertEquals("أذان الظهر", NowPlayingText.adhanTitle("dhuhr", en = false))
        assertEquals("أذان الفجر", NowPlayingText.adhanTitle("fajr", en = false))
        assertEquals("Isha Adhan", NowPlayingText.adhanTitle("isha", en = true))
        assertEquals("الأذان", NowPlayingText.adhanTitle("unknown", en = false))
    }

    @Test
    fun adhanLineIsTheMuezzinWhenKnownNeverGuessed() {
        assertEquals("المؤذن: ناصر القطامي", NowPlayingText.adhanSubtitle("ناصر القطامي", "Nasser Al-Qatami (HQ)", en = false))
        assertEquals("Muezzin: Nasser Al-Qatami", NowPlayingText.adhanSubtitle("Nasser Al-Qatami", "x", en = true))
        // Unknown muezzin: the recording's own name, as chosen in Settings.
        assertEquals("المسجد النبوي 3", NowPlayingText.adhanSubtitle("", "المسجد النبوي 3", en = false))
    }
}
