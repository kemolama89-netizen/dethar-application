package com.dithar.app.floatingtasbeeh

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Regression coverage for the offline pending-event queue that backs
 * "no lost/duplicated increments" for Floating Tasbeeh (see
 * PendingEventQueue's own doc comment). Pure JVM tests — no Android SDK,
 * no emulator, no Robolectric needed, since the class under test has zero
 * `android.*` dependencies.
 */
class PendingEventQueueTest {

    private fun sampleEvent(dhikrId: Int = 1, times: Int = 1) =
        PendingTasbeehEvent(
            dhikrId = dhikrId,
            times = times,
            epochMillis = 1_700_000_000_000L,
            localDate = "2026-09-07",
            localTime = "12:00:00",
            timeZone = "Asia/Kuwait",
        )

    @Test
    fun `a fresh queue is empty`() {
        val queue = PendingEventQueue.empty()
        assertTrue(queue.isEmpty)
        assertEquals(0, queue.size)
    }

    @Test
    fun `enqueue never drops or coalesces events`() {
        val queue = PendingEventQueue.empty()
        queue.enqueue(sampleEvent(dhikrId = 1))
        queue.enqueue(sampleEvent(dhikrId = 1))
        queue.enqueue(sampleEvent(dhikrId = 2))
        assertEquals(3, queue.size)
        assertEquals(listOf(1, 1, 2), queue.snapshot().map { it.dhikrId })
    }

    @Test
    fun `round-trips through serialize and parse with identical content and order`() {
        val queue = PendingEventQueue.empty()
        queue.enqueue(sampleEvent(dhikrId = 5, times = 3))
        queue.enqueue(sampleEvent(dhikrId = 9, times = 1))
        val serialized = queue.serialize()

        val reloaded = PendingEventQueue.parse(serialized)
        assertEquals(2, reloaded.size)
        assertEquals(listOf(5, 9), reloaded.snapshot().map { it.dhikrId })
        assertEquals(listOf(3, 1), reloaded.snapshot().map { it.times })
    }

    @Test
    fun `parse of null or empty input starts clean rather than throwing`() {
        assertTrue(PendingEventQueue.parse(null).isEmpty)
        assertTrue(PendingEventQueue.parse("").isEmpty)
    }

    @Test
    fun `parse of corrupt JSON starts clean rather than throwing`() {
        assertTrue(PendingEventQueue.parse("{not json").isEmpty)
        assertTrue(PendingEventQueue.parse("[]").isEmpty) // wrong shape (array, not the {nextEventId, events} object)
    }

    @Test
    fun `draining removes exactly the oldest N events and leaves the rest untouched`() {
        val queue = PendingEventQueue.empty()
        queue.enqueue(sampleEvent(dhikrId = 1))
        queue.enqueue(sampleEvent(dhikrId = 2))
        queue.enqueue(sampleEvent(dhikrId = 3))

        val afterDrainRaw = queue.encodeAfterDraining(2)
        val reloaded = PendingEventQueue.parse(afterDrainRaw)
        assertEquals(1, reloaded.size)
        assertEquals(3, reloaded.snapshot()[0].dhikrId)
    }

    @Test
    fun `draining the full queue leaves it empty and serializable back to an empty queue`() {
        val queue = PendingEventQueue.empty()
        queue.enqueue(sampleEvent())
        queue.enqueue(sampleEvent())

        val afterDrainRaw = queue.encodeAfterDraining(2)
        assertTrue(PendingEventQueue.parse(afterDrainRaw).isEmpty)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `draining more events than exist is rejected rather than silently clamped`() {
        val queue = PendingEventQueue.empty()
        queue.enqueue(sampleEvent())
        queue.encodeAfterDraining(2)
    }

    @Test
    fun `event ids keep incrementing across a serialize-parse-enqueue cycle, never reused`() {
        var queue = PendingEventQueue.empty()
        queue.enqueue(sampleEvent(dhikrId = 1))
        queue.enqueue(sampleEvent(dhikrId = 2))
        val afterDrainRaw = queue.encodeAfterDraining(2) // queue is now empty, but 2 ids were already consumed

        queue = PendingEventQueue.parse(afterDrainRaw)
        queue.enqueue(sampleEvent(dhikrId = 3))
        // Re-serialize and inspect the raw id to prove it did not restart at 0
        // (which would risk an id collision with an already-drained event
        // from a prior reconciliation pass keeping a stale reference to it).
        val raw = queue.serialize()
        assertTrue(raw.contains("\"id\":2"))
    }

    @Test
    fun `preserves multi-repetition batches (times greater than 1) exactly`() {
        val queue = PendingEventQueue.empty()
        queue.enqueue(sampleEvent(dhikrId = 4, times = 7))
        val reloaded = PendingEventQueue.parse(queue.serialize())
        assertEquals(7, reloaded.snapshot()[0].times)
    }
}
