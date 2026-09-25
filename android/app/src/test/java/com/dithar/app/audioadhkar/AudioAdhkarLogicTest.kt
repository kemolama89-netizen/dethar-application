package com.dithar.app.audioadhkar

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Calendar
import java.util.TimeZone

class AudioAdhkarLogicTest {
    private val zone = TimeZone.getTimeZone("Asia/Riyadh")

    private fun at(day: Int, hour: Int, minute: Int, second: Int = 0): Long = Calendar.getInstance(zone).apply {
        clear()
        set(2026, Calendar.SEPTEMBER, day, hour, minute, second)
    }.timeInMillis

    @Test
    fun nextOccurrenceIsLaterTodayWhenStillAhead() {
        assertEquals(at(25, 22, 12), AudioAdhkarSchedule.nextOccurrence(at(25, 22, 8), 22, 12, zone))
    }

    @Test
    fun nextOccurrenceIsTomorrowWhenPassedOrExactlyNow() {
        assertEquals(at(26, 22, 12), AudioAdhkarSchedule.nextOccurrence(at(25, 22, 30), 22, 12, zone))
        assertEquals(at(26, 22, 12), AudioAdhkarSchedule.nextOccurrence(at(25, 22, 12), 22, 12, zone))
    }

    @Test
    fun anOccurrenceFiresOnceOnly() {
        val occ = at(25, 22, 12)
        assertTrue(AudioAdhkarSchedule.shouldFire(occ, occ, 0L, sessionActive = false))
        // duplicate delivery after it was consumed
        assertFalse(AudioAdhkarSchedule.shouldFire(occ, occ, occ, sessionActive = false))
    }

    @Test
    fun staleAlarmFromAReplacedScheduleNeverFires() {
        assertFalse(AudioAdhkarSchedule.shouldFire(at(25, 22, 12), at(25, 22, 30), 0L, sessionActive = false))
        assertFalse(AudioAdhkarSchedule.shouldFire(0L, 0L, 0L, sessionActive = false))
    }

    @Test
    fun noSecondSessionWhileOneIsPlaying() {
        val occ = at(25, 22, 12)
        assertFalse(AudioAdhkarSchedule.shouldFire(occ, occ, 0L, sessionActive = true))
    }

    private fun item(id: String, reps: Int) = PlaylistItem(id, id, "", "public/audio/adhkar/evening/$id.mp3", reps)

    @Test
    fun cursorStartsAtFirstDhikrRepetitionOne() {
        val c = PlaybackCursor(listOf(item("morning_003", 1), item("morning_005", 1)))
        assertEquals("morning_003", c.current?.dhikrId)
        assertEquals(1, c.repetition)
    }

    @Test
    fun cursorAdvancesRepetitionsThenDhikrThenFinishes() {
        val c = PlaybackCursor(listOf(item("a", 2), item("b", 1)))
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(c.beginPlayback()))
        assertTrue(c.advance())
        assertEquals(2, c.repetition)
        assertEquals(PlaybackCursor.Step.NEXT_DHIKR, c.complete(c.beginPlayback()))
        assertTrue(c.advance())
        assertEquals("b", c.current?.dhikrId)
        assertEquals(1, c.repetition)
        assertEquals(PlaybackCursor.Step.FINISHED, c.complete(c.beginPlayback()))
        assertNull(c.current)
        assertFalse(c.advance())
    }

    @Test
    fun theCounterMovesOnlyWhenTheNextPlaybackStarts() {
        val c = PlaybackCursor(listOf(item("a", 3), item("b", 1)))
        c.complete(c.beginPlayback())
        // during the 3-second silence: still repetition 1 of "a"
        assertEquals(1, c.repetition)
        assertEquals("a", c.current?.dhikrId)
        c.advance()
        assertEquals(2, c.repetition)
    }

    @Test
    fun duplicateOrStaleCompletionIsIgnored() {
        val c = PlaybackCursor(listOf(item("a", 3)))
        val first = c.beginPlayback()
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(first))
        // duplicate "ended" during the silence
        assertEquals(PlaybackCursor.Step.IGNORED, c.complete(first))
        c.advance()
        val second = c.beginPlayback()
        assertEquals(PlaybackCursor.Step.IGNORED, c.complete(first))
        assertEquals(2, c.repetition)
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(second))
        assertEquals(PlaybackCursor.Step.IGNORED, c.complete(second))
        c.advance()
        assertEquals(3, c.repetition)
        assertFalse(c.advance()) // nothing pending — can't skip ahead
        assertEquals(3, c.repetition)
    }

    /** Plays a whole session: each completion that isn't FINISHED is followed by one silence. */
    @Test
    fun aSilenceFollowsEveryPlaybackExceptTheLast() {
        val c = PlaybackCursor(listOf(item("a", 3), item("b", 1), item("c", 2)))
        val timeline = mutableListOf<String>()
        while (true) {
            c.advance()
            val playing = "${c.current!!.dhikrId}${c.repetition}"
            timeline += playing
            val step = c.complete(c.beginPlayback())
            if (step == PlaybackCursor.Step.FINISHED) break
            timeline += "silence"
        }
        assertEquals(
            listOf("a1", "silence", "a2", "silence", "a3", "silence", "b1", "silence", "c1", "silence", "c2"),
            timeline,
        )
    }

    @Test
    fun theSilenceIsThreeSeconds() {
        assertEquals(3_000L, SilenceGap.SILENCE_MILLIS)
        val gap = SilenceGap()
        assertEquals(3_000L, gap.start(now = 10_000L))
        assertTrue(gap.active)
        gap.clear()
        assertFalse(gap.active)
    }

    @Test
    fun pausingDuringTheSilenceFreezesItsRemainingTime() {
        val gap = SilenceGap()
        gap.start(now = 10_000L)
        gap.pause(now = 11_200L) // 1.2 s of silence elapsed
        assertEquals(1_800L, gap.remainingMillis)
        assertEquals(1_800L, gap.resume(now = 60_000L)) // a long pause doesn't eat into it
        assertNull(gap.resume(now = 60_001L)) // already running
    }

    @Test
    fun resumeWithoutAPausedSilenceIsANoOp() {
        assertNull(SilenceGap().resume(now = 1L))
    }

    @Test
    fun playlistRoundTripsThroughStorage() {
        val items = listOf(PlaylistItem("morning_003", "أمسينا وأمسى الملك لله", "نص", "public/audio/adhkar/evening/morning_003.mp3", 1))
        assertEquals(items, AudioAdhkarStore.parsePlaylist(AudioAdhkarStore.serializePlaylist(items)))
        assertEquals(emptyList<PlaylistItem>(), AudioAdhkarStore.parsePlaylist("not json"))
    }

    // ---- one-minute pre-playback warning ----------------------------------

    @Test
    fun warningIsExactlyOneMinuteBeforePlaybackAndSeparate() {
        val plan = AudioAdhkarSchedule.plan(at(25, 22, 0), 22, 30, lastWarnedOccurrence = 0L, zone = zone)
        assertEquals(at(25, 22, 30), plan.playbackAt)
        assertEquals(at(25, 22, 29), plan.warningAt)
        assertEquals(60_000L, plan.playbackAt - plan.warningAt!!)
    }

    @Test
    fun startTimeLessThanAMinuteAwayGetsNoWarningButKeepsPlayback() {
        val plan = AudioAdhkarSchedule.plan(at(25, 22, 29, 30), 22, 30, lastWarnedOccurrence = 0L, zone = zone)
        assertEquals(at(25, 22, 30), plan.playbackAt)
        assertNull(plan.warningAt)
    }

    @Test
    fun reopeningTheAppAfterTheWarningTimeKeepsPlaybackWithoutASecondWarning() {
        // between 22:29 and 22:30, warning not yet recorded (e.g. it was missed) — still never re-armed in the past
        val plan = AudioAdhkarSchedule.plan(at(25, 22, 29, 10), 22, 30, lastWarnedOccurrence = 0L, zone = zone)
        assertEquals(at(25, 22, 30), plan.playbackAt)
        assertNull(plan.warningAt)
    }

    @Test
    fun resyncAfterTheWarningWasShownNeverArmsItAgain() {
        val occ = at(25, 22, 30)
        // e.g. a clock nudge puts "now" back before the warning time: already warned for this playback
        val plan = AudioAdhkarSchedule.plan(at(25, 22, 28), 22, 30, lastWarnedOccurrence = occ, zone = zone)
        assertEquals(occ, plan.playbackAt)
        assertNull(plan.warningAt)
    }

    @Test
    fun repeatedResyncsProduceTheSameSingleWarning() {
        val a = AudioAdhkarSchedule.plan(at(25, 22, 0), 22, 30, 0L, zone)
        val b = AudioAdhkarSchedule.plan(at(25, 22, 5), 22, 30, 0L, zone)
        assertEquals(a, b)
    }

    @Test
    fun changingTheStartTimeMovesTheWarningWithIt() {
        val old = AudioAdhkarSchedule.plan(at(25, 22, 0), 22, 30, 0L, zone)
        val new = AudioAdhkarSchedule.plan(at(25, 22, 0), 22, 45, 0L, zone)
        assertEquals(at(25, 22, 44), new.warningAt)
        // the old warning's tag no longer matches the scheduled playback → it can't show
        assertFalse(AudioAdhkarSchedule.shouldWarn(old.playbackAt, new.playbackAt, 0L, sessionActive = false, nowMillis = old.warningAt!!))
    }

    @Test
    fun nextDaysWarningIsArmedAfterTodaysPlayback() {
        val plan = AudioAdhkarSchedule.plan(at(25, 22, 30), 22, 30, lastWarnedOccurrence = at(25, 22, 30), zone = zone)
        assertEquals(at(26, 22, 30), plan.playbackAt)
        assertEquals(at(26, 22, 29), plan.warningAt)
    }

    @Test
    fun aWarningShowsOnceOnlyAndOnlyBeforeItsPlayback() {
        val occ = at(25, 22, 30)
        val warnAt = at(25, 22, 29)
        assertTrue(AudioAdhkarSchedule.shouldWarn(occ, occ, 0L, sessionActive = false, nowMillis = warnAt))
        assertFalse(AudioAdhkarSchedule.shouldWarn(occ, occ, occ, sessionActive = false, nowMillis = warnAt)) // duplicate delivery
        assertFalse(AudioAdhkarSchedule.shouldWarn(occ, occ, 0L, sessionActive = false, nowMillis = occ)) // late: playback time reached
        assertFalse(AudioAdhkarSchedule.shouldWarn(occ, occ, 0L, sessionActive = true, nowMillis = warnAt)) // already playing
        assertFalse(AudioAdhkarSchedule.shouldWarn(occ, 0L, 0L, sessionActive = false, nowMillis = warnAt)) // disabled/cancelled
    }

    @Test
    fun theWarningNeverConsumesThePlaybackOccurrence() {
        // Showing the warning records only lastWarnedOccurrence; playback's own guard is independent.
        val occ = at(25, 22, 30)
        assertTrue(AudioAdhkarSchedule.shouldFire(occ, occ, lastFiredOccurrence = 0L, sessionActive = false))
    }
}
