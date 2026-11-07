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
        // …from its first dhikr, or from a Resume Adhkar point (startIndex / startRepetition).
        assertTrue(playNow.contains("AudioAdhkarPlaybackService.playAllNow(context, section, JSONArray(all), call.getInt(\"startIndex\") ?: 0, call.getInt(\"startRepetition\") ?: 1)"))
        val start = service.substringAfter("ACTION_PLAY_NOW -> {").substringBefore("ACTION_PAUSE ->")
        assertTrue(start.contains("intent.getStringExtra(EXTRA_ITEMS)"))
        val manual = service.substringAfter("private fun startManualSession(section: Section, items: List<PlaylistItem>, startIndex: Int = 0, startRepetition: Int = 1)").substringBefore("private fun beginPlayback()")
        assertTrue(manual.contains("manualSession = true"))
        // The whole list, or — resumed — from the saved dhikr and repetition, its place kept in the whole run.
        assertTrue(manual.contains("cursor = PlaybackCursor(rotation.items.drop(manualOffset)"))
        assertTrue(manual.contains("playAllIds = if (playAllSession) items.map { it.dhikrId } else emptyList()"))
        // Manual playback isn't tied to the schedule: no daily-window or adhan-pause check refuses it.
        assertTrue(!manual.contains("isSuppressed("))
    }

    @Test
    fun theStateTellsTheAppWhereTheRunIs() {
        val state = service.substringAfter("private fun stateJson()").substringBefore("private fun adhanStateJson()")
        // In the whole run's terms (a resumed run started part-way: manualOffset; 0 for every other session).
        assertTrue(state.contains(".put(\"index\", manualOffset + c.index)"))
        assertTrue(state.contains(".put(\"count\", manualOffset + c.items.size)"))
        assertTrue(state.contains(".put(\"manual\", manualSession)"))
    }
}
