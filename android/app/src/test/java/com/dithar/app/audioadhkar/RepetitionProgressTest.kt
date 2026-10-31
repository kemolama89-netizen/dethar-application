package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Progress within one repetition, from the files' real lengths — never estimated. */
class RepetitionProgressTest {
    private val ayahs = listOf<Long?>(9_000L, 3_000L, 4_000L)

    @Test
    fun aWholeRepetitionIsAllItsFiles() {
        val start = RepetitionProgress.startOffset(ayahs, 0, 0L)
        assertEquals(16_000L, RepetitionProgress.total(ayahs, start))
        assertEquals(0L, RepetitionProgress.position(ayahs, 0, 0L, start))
        assertEquals(10_500L, RepetitionProgress.position(ayahs, 1, 1_500L, start))
        assertEquals(16_000L, RepetitionProgress.position(ayahs, 2, 4_000L, start))
    }

    @Test
    fun aLaterRepetitionSkippingTheBasmalaCountsOnlyWhatPlays() {
        val start = RepetitionProgress.startOffset(ayahs, 0, 5_000L) // starts 5 s into the first file
        assertEquals(11_000L, RepetitionProgress.total(ayahs, start))
        assertEquals(0L, RepetitionProgress.position(ayahs, 0, 5_000L, start))
        assertEquals(5_000L, RepetitionProgress.position(ayahs, 1, 1_000L, start))
    }

    @Test
    fun aResumedRepetitionStartsWhereItWasInterrupted() {
        val start = RepetitionProgress.startOffset(ayahs, 1, 2_000L)
        assertEquals(11_000L, start)
        assertEquals(5_000L, RepetitionProgress.total(ayahs, start))
        assertEquals(1_000L, RepetitionProgress.position(ayahs, 1, 3_000L, start))
    }

    @Test
    fun anUnknownLengthMeansNoTotal() {
        val withUnknown = listOf<Long?>(9_000L, null)
        val start = RepetitionProgress.startOffset(withUnknown, 0, 0L)
        assertNull(RepetitionProgress.total(withUnknown, start))
        assertNull(RepetitionProgress.total(emptyList(), 0L))
        assertNull(RepetitionProgress.startOffset(withUnknown, 2, 0L))
        assertEquals(3_000L, RepetitionProgress.position(withUnknown, 0, 3_000L, start))
    }
}
