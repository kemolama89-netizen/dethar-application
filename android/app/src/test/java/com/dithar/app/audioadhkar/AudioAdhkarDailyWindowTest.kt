package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Morning/Evening sessions planned inside their prayer-time windows (JS
 * plans one slot per day; native — DailyPlan.planSlots — arms them), the
 * window-end guard, and the per-category volume.
 */
class AudioAdhkarDailyWindowTest {
    private val minute = 60_000L
    private val day = 24 * 60 * minute
    private val base = 1_791_000_000_000L

    /** Day [d]'s slot: window 05:30–11:30 (relative), start [startMin] minutes into the day. */
    private fun slot(d: Int, startMin: Long = 7 * 60) = DailySlot(base + d * day + 330 * minute, base + d * day + startMin * minute, base + d * day + 690 * minute)

    private val slots = listOf(slot(0), slot(1), slot(2))

    @Test
    fun armsTheFirstSlotStillAhead_withItsWarningAMinuteBefore() {
        val plan = DailyPlan.planSlots(base, slots, 0L, 0L, emptyList())!!
        assertEquals(slots[0].start, plan.occurrence)
        assertEquals(slots[0].start, plan.playbackAt)
        assertEquals(slots[0].start - minute, plan.warningAt)
        // Today's start passed: tomorrow's.
        assertEquals(slots[1].start, DailyPlan.planSlots(slots[0].start + 1, slots, 0L, 0L, emptyList())!!.occurrence)
    }

    @Test
    fun aDayThatAlreadyPlayedNeverPlaysAgain_evenWhenItsPlanMovedLater() {
        // Played at 07:00; the selection then changed and today's plan moved to 09:00.
        val moved = listOf(slot(0, 9 * 60), slot(1))
        val plan = DailyPlan.planSlots(slots[0].start + minute, moved, slots[0].start, slots[0].start, emptyList())!!
        assertEquals(moved[1].start, plan.occurrence)
    }

    @Test
    fun aStartInsideAnAdhanPauseWaitsForItsEnd_butNeverPastTheWindow() {
        val pause = Window(slots[0].start - 10 * minute, slots[0].start + 20 * minute)
        val plan = DailyPlan.planSlots(base, slots, 0L, 0L, listOf(pause))!!
        assertEquals(slots[0].start, plan.occurrence)
        assertEquals(pause.end, plan.playbackAt)
        assertEquals(pause.end - minute, plan.warningAt)
        // A pause running to the window's end: that day is skipped, never carried over late.
        val toTheEnd = Window(slots[0].start - minute, slots[0].windowEnd + minute)
        assertEquals(slots[1].start, DailyPlan.planSlots(base, slots, 0L, 0L, listOf(toTheEnd))!!.occurrence)
    }

    @Test
    fun noWarningWhenItWasShownOrItsMomentPassed_andNothingWhenNoSlotIsLeft() {
        assertNull(DailyPlan.planSlots(base, slots, 0L, slots[0].start, emptyList())!!.warningAt)
        assertNull(DailyPlan.planSlots(slots[0].start - 30_000L, slots, 0L, 0L, emptyList())!!.warningAt)
        assertNull(DailyPlan.planSlots(slots[2].start + 1, slots, 0L, 0L, emptyList()))
        assertNull(DailyPlan.planSlots(base, emptyList(), 0L, 0L, emptyList()))
    }

    @Test
    fun nothingStartsOrContinuesAfterItsWindowEnds() {
        val s = slots[0]
        assertTrue(DailySlot.stillInWindow(s.start, s.windowEnd - 1, slots))
        assertFalse(DailySlot.stillInWindow(s.start, s.windowEnd, slots))
        assertFalse(DailySlot.stillInWindow(s.start, s.windowEnd + day, slots))
        // An occurrence from before the windows existed (legacy start time) has no window to enforce.
        assertTrue(DailySlot.stillInWindow(12345L, s.windowEnd + day, slots))
        assertTrue(DailySlot.stillInWindow(s.start, s.windowEnd + day, null))
    }

    @Test
    fun eachKindOfAudioHasItsOwnVolume_duckingScalesIt() {
        assertEquals("adhan", VolumePolicy.keyFor(Section.MISC, adhan = true))
        assertEquals("morning", VolumePolicy.keyFor(Section.MORNING, adhan = false))
        assertEquals("evening", VolumePolicy.keyFor(Section.EVENING, adhan = false))
        assertEquals("misc", VolumePolicy.keyFor(Section.MISC, adhan = false))
        assertEquals(listOf("adhan", "morning", "evening", "misc"), VolumePolicy.KEYS)
        assertEquals(1f, VolumePolicy.gain(1f, ducked = false), 0f)
        assertEquals(0.4f, VolumePolicy.gain(0.4f, ducked = false), 1e-6f)
        assertEquals(0.4f * FocusPolicy.DUCK_VOLUME, VolumePolicy.gain(0.4f, ducked = true), 1e-6f)
        assertEquals(1f, VolumePolicy.gain(3f, ducked = false), 0f)
        assertEquals(0f, VolumePolicy.gain(-1f, ducked = false), 0f)
        assertEquals(1f, VolumePolicy.gain(Float.NaN, ducked = false), 0f)
    }

    @Test
    fun theReciterNameTravelsWithEachRecitation_andIsEmptyWhenUnknown() {
        val raw = """[{"dhikrId":"k","title":"t","text":"x","assetPaths":["public/a.mp3"],"repetitions":2,"reciterName":"ماهر المعيقلي",
            "rotation":[{"assetPaths":["public/b.mp3"],"reciterName":"ياسر الدوسري"},{"assetPaths":["public/c.mp3"]}]}]"""
        val item = AudioAdhkarStore.parsePlaylist(raw).single()
        assertEquals("ماهر المعيقلي", item.recitation.reciterName)
        assertEquals(listOf("ياسر الدوسري", ""), item.rotation.map { it.reciterName })
        // Survives storage, and random rotation keeps each choice's own name.
        val stored = AudioAdhkarStore.parsePlaylist(AudioAdhkarStore.serializePlaylist(listOf(item))).single()
        assertEquals(item, stored)
        assertEquals("ياسر الدوسري", AudioAdhkarRotation.apply(listOf(stored), -1) { 0 }.items.single().recitation.reciterName)
        // A playlist stored by an older version has no name: none is shown.
        assertEquals("", AudioAdhkarStore.parsePlaylist("""[{"dhikrId":"k","title":"t","text":"x","assetPath":"public/a.mp3","repetitions":1}]""").single().recitation.reciterName)
    }
}
