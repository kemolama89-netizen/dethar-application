package com.dithar.app

import com.dithar.app.look.AppLook
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Battery: what wakes the phone and how often (the 2026-11-07 audit). The floating Tasbeeh's look changes
 * at the next switch — not on a minute timer; the playback service's diagnostics heartbeat is every
 * 2 minutes; and the wake lock and foreground work stay tied to real playback.
 */
class BatteryPolicyTest {
    private val main = File("src/main/java/com/dithar/app")

    @Test
    fun theNextLookSwitchIsComputed_notPolled() {
        assertEquals(150 * 60_000L, AppLook.millisUntilNextChange(3 * 60))
        assertEquals(390 * 60_000L, AppLook.millisUntilNextChange(12 * 60))
        assertEquals(30_000L, AppLook.millisUntilNextChange(18 * 60 + 29, 30))
        assertEquals(11 * 60 * 60_000L, AppLook.millisUntilNextChange(18 * 60 + 30))
        assertEquals(1_000L, AppLook.millisUntilNextChange(5 * 60 + 29, 59))
        val floating = File(main, "floatingtasbeeh/FloatingTasbeehService.kt").readText()
        assertTrue(floating.contains("AppLook.millisUntilNextChange("))
        assertFalse(floating.contains("LOOK_TICK_MS = 60_000L"))
    }

    @Test
    fun theDiagnosticsHeartbeatIsEveryTwoMinutes() {
        val service = File(main, "audioadhkar/AudioAdhkarPlaybackService.kt").readText()
        assertTrue(service.contains("HEARTBEAT_MILLIS = 120_000L"))
    }

    @Test
    fun theWakeLockIsBoundedAndReleasedWhenPlaybackStopsOrPauses() {
        val service = File(main, "audioadhkar/AudioAdhkarPlaybackService.kt").readText()
        // A partial (CPU-only) lock with a timeout — never the screen.
        assertTrue(service.contains("PowerManager.PARTIAL_WAKE_LOCK"))
        assertTrue(service.contains("lock.acquire(SESSION_WAKE_LOCK_MILLIS)"))
        assertFalse(service.contains("FULL_WAKE_LOCK") || service.contains("SCREEN_BRIGHT_WAKE_LOCK") || service.contains("SCREEN_DIM_WAKE_LOCK"))
        // Released when a session ends.
        val end = service.substringAfter("private fun endSession(").substringBefore("\n    }\n")
        assertTrue(end.contains("releaseSessionWakeLock()"))
        // No other part of the app holds a wake lock.
        val holders = main.walkTopDown().filter { it.extension == "kt" && it.readText().contains("newWakeLock(") }.map { it.name }.toList()
        assertEquals(listOf("AudioAdhkarPlaybackService.kt"), holders)
    }

    @Test
    fun nothingRepeatsOnAFixedAlarmInterval() {
        // Every alarm is a one-shot set for its own time (re-armed after it fires) — no repeating alarms.
        val sources = main.walkTopDown().filter { it.extension == "kt" }.map { it.readText() }.joinToString("\n")
        assertFalse(sources.contains("setRepeating(") || sources.contains("setInexactRepeating("))
    }
}
