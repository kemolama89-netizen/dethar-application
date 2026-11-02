package com.dithar.app.prayernotifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AdhanOnDemandTest {
    private fun voice(id: String, path: String) = AdhanVoice(id, id, path, 0, 1000)
    private val builtIn = voice("built-in", "public/audio/adhan/a.mp3")
    private val fallback = voice("fallback", "public/audio/adhan/f.mp3")
    private val downloaded = voice("downloaded", "/data/adhan/d.mp3")

    @Test
    fun `a downloaded file that is gone is left out, an APK asset is never asked about`() {
        val asked = mutableListOf<String>()
        val config = AdhanConfig(true, listOf(builtIn, downloaded), null, null, fallback)
        val result = AdhanPlan.onDevice(config) { asked += it; false }
        assertEquals(listOf(builtIn), result.voices)
        assertEquals(listOf("/data/adhan/d.mp3"), asked)
    }

    @Test
    fun `the fallback plays when no voice is left, so there is always an adhan`() {
        val config = AdhanConfig(false, listOf(downloaded), null, null, fallback)
        assertEquals("fallback", AdhanPlan.pick(AdhanPlan.onDevice(config) { false }, null, null) { 0 }?.id)
    }

    @Test
    fun `voices on the device are left as they are`() {
        val config = AdhanConfig(true, listOf(builtIn, downloaded), null, null, fallback)
        assertEquals(config.voices, AdhanPlan.onDevice(config) { true }.voices)
    }

    @Test
    fun `an older config with no fallback still parses, and a new one keeps it`() {
        val base = """{"rotate":false,"voices":[{"id":"a","assetPath":"public/a.mp3","startMillis":0,"endMillis":10}]"""
        assertNull(PrayerNotificationStore.parseAdhan("$base}")?.fallback)
        val withFallback = """$base,"fallback":{"id":"f","assetPath":"public/f.mp3","startMillis":0,"endMillis":10}}"""
        assertEquals("f", PrayerNotificationStore.parseAdhan(withFallback)?.fallback?.id)
    }

    @Test
    fun `only DITHAR's own adhan recordings can be downloaded`() {
        val base = "https://kemolama89-netizen.github.io/dethar-application/audio/adhan/"
        assertTrue(AdhanDownloadRules.allowedUrl(base + "optimized/x%20y.mp3"))
        assertTrue(AdhanDownloadRules.allowedUrl(base + "optimized/x.m4a"))
        assertFalse(AdhanDownloadRules.allowedUrl("https://example.com/audio/adhan/x.mp3"))
        assertFalse(AdhanDownloadRules.allowedUrl("http://kemolama89-netizen.github.io/dethar-application/audio/adhan/x.mp3"))
        assertFalse(AdhanDownloadRules.allowedUrl(base + "../../x.mp3"))
        assertFalse(AdhanDownloadRules.allowedUrl(base + "x.apk"))
    }

    @Test
    fun `ids can't reach outside the folder`() {
        assertTrue(AdhanDownloadRules.validId("alafasy-fajr-hijaz"))
        assertFalse(AdhanDownloadRules.validId("../secret"))
        assertFalse(AdhanDownloadRules.validId(""))
    }

    @Test
    fun `a file is kept only if its size and checksum both match`() {
        val digest = byteArrayOf(0x0a, 0x1b)
        assertTrue(AdhanDownloadRules.matches(5, digest, 5, "0a1b"))
        assertFalse(AdhanDownloadRules.matches(4, digest, 5, "0a1b"))
        assertFalse(AdhanDownloadRules.matches(5, digest, 5, "ffff"))
    }

    @Test
    fun `each failure keeps its own reason`() {
        assertEquals("source-unavailable", AdhanDownloadRules.failureCode(AdhanDownloadFailure(AdhanDownloadRules.SOURCE_UNAVAILABLE)))
        assertEquals("offline", AdhanDownloadRules.failureCode(java.net.UnknownHostException("github.io")))
        assertEquals("offline", AdhanDownloadRules.failureCode(java.net.SocketTimeoutException("read timed out")))
        assertEquals("no-space", AdhanDownloadRules.failureCode(java.io.IOException("write failed: ENOSPC (No space left on device)")))
        assertEquals("storage", AdhanDownloadRules.failureCode(IllegalStateException("?")))
    }

    @Test
    fun `a download never takes the phone's last free space`() {
        val mb = 1024L * 1024
        assertTrue(AdhanDownloadRules.enoughSpace(40 * mb, 10 * mb))
        assertFalse(AdhanDownloadRules.enoughSpace(25 * mb, 10 * mb))
    }

    @Test
    fun `only audio counts as a saved recording, never its version file or a partial one`() {
        assertTrue(AdhanDownloadRules.isAudio("husary.mp3"))
        assertTrue(AdhanDownloadRules.isAudio("saad-ghamdi.m4a"))
        assertFalse(AdhanDownloadRules.isAudio("husary.mp3.sha256"))
        assertFalse(AdhanDownloadRules.isAudio("husary.mp3.part"))
    }
}
