package com.dithar.app.reminders

import com.dithar.app.audioadhkar.Window
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

/**
 * The widget's content keeps the reminder interval chosen in Settings →
 * Notifications & Widgets: it moves on only when a reminder is delivered
 * (ReminderPlan.isDue + WidgetRotation.advance/displaySlot), never on the
 * clock's background refreshes — so never before a holiday's start either,
 * and a repeated alarm delivers nothing twice.
 */
class WidgetIntervalSyncTest {
    private val zone = TimeZone.getTimeZone("Asia/Kuwait")

    /** October 2026: the 15th is a Thursday, the 16th a Friday. */
    private fun at(day: Int, hour: Int, minute: Int = 0): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.OCTOBER, day, hour, minute, 0)
    }.timeInMillis

    private val start = 8 * 60
    private val end = 22 * 60
    private val fridayNoon = listOf(-1, -1, -1, -1, -1, 12 * 60, -1)

    /** What the store holds between alarms. */
    private class State(var lastFired: Long, var widgetSlot: Long)

    /**
     * Runs the reminder alarm from [from] to [until] as RemindersScheduler
     * does (next fire → due? → advance the widget), returning each delivery.
     */
    private fun run(state: State, from: Long, until: Long, interval: Int, dayStarts: List<Int>? = null): List<Long> {
        val fired = mutableListOf<Long>()
        var now = from
        while (true) {
            val next = ReminderPlan.nextFire(now, start, end, interval, state.lastFired, emptyList(), dayStarts, zone) ?: break
            if (next >= until) break
            assertTrue(ReminderPlan.isDue(next, start, end, interval, state.lastFired, dayStarts, zone))
            state.lastFired = next
            state.widgetSlot = WidgetRotation.advance(state.widgetSlot, next, zone)
            fired += next
            now = next
        }
        return fired
    }

    @Test
    fun widgetContentChangesExactlyAtTheChosenInterval() {
        val state = State(lastFired = at(14, 21), widgetSlot = -1)
        val fired = run(state, at(15, 0), at(15, 23, 59), interval = 180)
        assertEquals(listOf(at(15, 8), at(15, 11), at(15, 14), at(15, 17), at(15, 20)), fired)
        // One widget step per reminder: the widget's slot and the notifications stay in step.
        assertEquals(WidgetRotation.slot(at(15, 8), zone) + fired.size, state.widgetSlot)
    }

    @Test
    fun anotherIntervalIsFollowedTheSameWay() {
        val state = State(lastFired = at(14, 21), widgetSlot = 10)
        val fired = run(state, at(15, 0), at(15, 12, 30), interval = 60)
        assertEquals(listOf(at(15, 8), at(15, 9), at(15, 10), at(15, 11), at(15, 12)), fired)
        assertEquals(15L, state.widgetSlot)
    }

    @Test
    fun theClocksBackgroundRefreshesDoNotChangeTheContentBetweenReminders() {
        // Reminder at 14:00, next at 17:00: the 16:00 background refresh redraws the same slot.
        val stored = 42L
        for (refresh in listOf(at(15, 14, 1), at(15, 16), at(15, 16, 59))) {
            assertEquals(stored, WidgetRotation.displaySlot(true, stored, refresh, zone))
        }
        val pool = (1..6).map { ReminderItem("dua:$it", "dua", "dua", "نص", "", "src", "t", emptyList(), true) }
        assertEquals(WidgetRotation.itemFor(pool, WidgetRotation.displaySlot(true, stored, at(15, 14, 1), zone)), WidgetRotation.itemFor(pool, WidgetRotation.displaySlot(true, stored, at(15, 16, 30), zone)))
    }

    @Test
    fun withRemindersOffTheWidgetKeepsItsClockRotationAsBefore() {
        assertEquals(WidgetRotation.slot(at(15, 9), zone), WidgetRotation.displaySlot(false, 42L, at(15, 9), zone))
        assertEquals(WidgetRotation.slot(at(15, 9), zone), WidgetRotation.displaySlot(true, -1L, at(15, 9), zone))
    }

    @Test
    fun onAHolidayNothingChangesBeforeTheStartThenTheIntervalResumes() {
        val state = State(lastFired = at(15, 20), widgetSlot = 100)
        val fired = run(state, at(15, 20, 1), at(16, 23, 59), interval = 180, dayStarts = fridayNoon)
        assertEquals(listOf(at(16, 12), at(16, 15), at(16, 18), at(16, 21)), fired)
        // The morning's background refreshes (04:00, 08:00) keep Thursday's last content.
        assertEquals(100L, WidgetRotation.displaySlot(true, 100L, at(16, 8), zone))
        assertEquals(104L, state.widgetSlot)
        // An alarm that still fires before noon (armed before the holiday was set) delivers nothing.
        assertFalse(ReminderPlan.isDue(at(16, 8), start, end, 180, at(15, 20), fridayNoon, zone))
        assertFalse(ReminderPlan.isDue(at(16, 11, 58), start, end, 180, at(15, 20), fridayNoon, zone))
        assertTrue(ReminderPlan.isDue(at(16, 12), start, end, 180, at(15, 20), fridayNoon, zone))
        // A changed holiday start applies at once.
        assertTrue(ReminderPlan.isDue(at(16, 11), start, end, 180, at(15, 20), listOf(-1, -1, -1, -1, -1, 11 * 60, -1), zone))
    }

    @Test
    fun aRepeatedOrEarlyAlarmDeliversNothingTwice() {
        val last = at(15, 11)
        assertFalse(ReminderPlan.isDue(last, start, end, 180, last, null, zone))             // the same alarm again
        assertFalse(ReminderPlan.isDue(at(15, 12), start, end, 180, last, null, zone))       // a stale alarm mid-interval
        assertFalse(ReminderPlan.isDue(at(15, 13, 58), start, end, 180, last, null, zone))
        assertTrue(ReminderPlan.isDue(at(15, 13, 59), start, end, 180, last, null, zone))  // Android batching: up to a minute early
        assertTrue(ReminderPlan.isDue(at(15, 15, 30), start, end, 180, last, null, zone))    // late (Doze) still delivers — once
        assertFalse(ReminderPlan.isDue(at(15, 23), start, end, 180, last, null, zone))       // outside the permitted period
    }

    @Test
    fun aReminderDueDuringAnAdhanPauseStillCountsAsBefore() {
        // nextFire defers past the pause; a late firing inside one still updates the widget (silently).
        val pause = listOf(Window(at(15, 13, 50), at(15, 14, 20)))
        assertEquals(at(15, 14, 20), ReminderPlan.nextFire(at(15, 13), start, end, 180, at(15, 11), pause, null, zone))
        assertTrue(ReminderPlan.isDue(at(15, 14), start, end, 180, at(15, 11), null, zone))
    }
}
