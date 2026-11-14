package com.dithar.app.quranaudio

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QuranAudioDownloadRulesTest {
    private val base = "https://kemolama89-netizen.github.io/dethar-application/audio/quran/"

    @Test
    fun `only DITHAR's own hosted file for exactly this reciter and name`() {
        assertTrue(QuranAudioDownloadRules.allowedUrl("${base}minshawi-murattal/002255.mp3", "minshawi-murattal", "002255.mp3"))
        assertTrue(QuranAudioDownloadRules.allowedUrl("${base}minshawi-murattal/basmala.mp3", "minshawi-murattal", "basmala.mp3"))
        // Another reciter's or another file's URL, another host, plain HTTP, a path escape.
        assertFalse(QuranAudioDownloadRules.allowedUrl("${base}husary-murattal/002255.mp3", "minshawi-murattal", "002255.mp3"))
        assertFalse(QuranAudioDownloadRules.allowedUrl("${base}minshawi-murattal/112001.mp3", "minshawi-murattal", "002255.mp3"))
        assertFalse(QuranAudioDownloadRules.allowedUrl("https://everyayah.com/data/Minshawy_Murattal_128kbps/002255.mp3", "minshawi-murattal", "002255.mp3"))
        assertFalse(QuranAudioDownloadRules.allowedUrl("http://kemolama89-netizen.github.io/dethar-application/audio/quran/minshawi-murattal/002255.mp3", "minshawi-murattal", "002255.mp3"))
        assertFalse(QuranAudioDownloadRules.allowedUrl("${base}../adhan/x.mp3", "..", "x.mp3"))
    }

    @Test
    fun `reciter ids and file names that can't leave the reciter's folder`() {
        assertTrue(QuranAudioDownloadRules.validReciter("mustafaismail-mujawwad"))
        assertFalse(QuranAudioDownloadRules.validReciter("../adhan"))
        assertFalse(QuranAudioDownloadRules.validReciter(""))
        assertTrue(QuranAudioDownloadRules.validFile("114006.mp3"))
        assertTrue(QuranAudioDownloadRules.validFile("basmala.mp3"))
        assertFalse(QuranAudioDownloadRules.validFile("114006.mp3.part"))
        assertFalse(QuranAudioDownloadRules.validFile("../x.mp3"))
        assertFalse(QuranAudioDownloadRules.validFile("catalog.json"))
    }
}
