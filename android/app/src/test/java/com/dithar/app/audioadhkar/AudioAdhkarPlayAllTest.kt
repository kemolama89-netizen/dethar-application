package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * «تشغيل الكل» (Play All): one manual session over a section's adhkar, played
 * one after another by the same cursor a scheduled session uses.
 */
class AudioAdhkarPlayAllTest {
    private fun item(id: String, reps: Int = 1) = PlaylistItem(id, id, id, Recitation(listOf("public/$id.mp3")), reps)

    @Test
    fun theCursorWalksEveryDhikrAndItsRepetitionsInOrder() {
        val cursor = PlaybackCursor(listOf(item("a", 2), item("b"), item("c")))
        val heard = mutableListOf<String>()
        while (true) {
            cursor.advance()
            val current = cursor.current ?: break
            heard.add("${current.dhikrId}${cursor.repetition}")
            if (cursor.complete(cursor.beginPlayback()) == PlaybackCursor.Step.FINISHED) break
        }
        assertEquals(listOf("a1", "a2", "b1", "c1"), heard)
        assertTrue(cursor.finished)
    }

    private val service = File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPlaybackService.kt").readText()
    private val plugin = File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPlugin.kt").readText()

    @Test
    fun playNowTakesTheWholeSectionAsOneManualSession() {
        val playNow = plugin.substringAfter("fun playNow(call: PluginCall)").substringBefore("@PluginMethod")
        assertTrue(playNow.contains("val items = call.getArray(\"items\")"))
        assertTrue(playNow.contains("AudioAdhkarPlaybackService.playAllNow(context, section, JSONArray(all))"))
        val start = service.substringAfter("ACTION_PLAY_NOW -> {").substringBefore("ACTION_PAUSE ->")
        assertTrue(start.contains("intent.getStringExtra(EXTRA_ITEMS)"))
        val manual = service.substringAfter("private fun startManualSession(section: Section, items: List<PlaylistItem>)").substringBefore("private fun beginPlayback()")
        assertTrue(manual.contains("manualSession = true"))
        assertTrue(manual.contains("cursor = PlaybackCursor(rotation.items)"))
        // Manual playback isn't tied to the schedule: no daily-window or adhan-pause check refuses it.
        assertTrue(!manual.contains("isSuppressed("))
    }

    @Test
    fun theStateTellsTheAppWhereTheRunIs() {
        val state = service.substringAfter("private fun stateJson()").substringBefore("private fun adhanStateJson()")
        assertTrue(state.contains(".put(\"index\", c.index)"))
        assertTrue(state.contains(".put(\"count\", c.items.size)"))
        assertTrue(state.contains(".put(\"manual\", manualSession)"))
    }
}
