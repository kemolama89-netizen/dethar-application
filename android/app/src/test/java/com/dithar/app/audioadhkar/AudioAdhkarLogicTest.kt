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

    private fun item(id: String, reps: Int) = PlaylistItem(id, id, "", Recitation(listOf("public/audio/adhkar/evening/$id.mp3")), reps)

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

    /** Same rules as the in-app player (REPETITION_PAUSE_MS in audioAdhkarPlayback.ts). */
    @Test
    fun aMultiRepeatDhikrPausesBetweenItsRepetitionsButNotAfterTheLast() {
        val c = PlaybackCursor(listOf(item("a", 3)))
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(c.beginPlayback())) // → silence
        c.advance()
        assertEquals(PlaybackCursor.Step.NEXT_REPETITION, c.complete(c.beginPlayback())) // → silence
        c.advance()
        assertEquals(PlaybackCursor.Step.FINISHED, c.complete(c.beginPlayback())) // final: no silence
    }

    @Test
    fun aSingleRepeatDhikrHasNoRepetitionPause() {
        val c = PlaybackCursor(listOf(item("a", 1)))
        assertEquals(PlaybackCursor.Step.FINISHED, c.complete(c.beginPlayback()))
        assertFalse(c.advance())
    }

    @Test
    fun theSilenceIsOneAndAHalfSeconds() {
        assertEquals(1_500L, SilenceGap.SILENCE_MILLIS)
        val gap = SilenceGap()
        assertEquals(1_500L, gap.start(now = 10_000L))
        assertTrue(gap.active)
        gap.clear()
        assertFalse(gap.active)
    }

    /**
     * A whole scheduled session, driven exactly as AudioAdhkarPlaybackService
     * drives it: each playback completes once (a Quranic recitation's ayah
     * files are ONE playback), NEXT_REPETITION and NEXT_DHIKR are followed by
     * the SilenceGap (the service's `NEXT_REPETITION, NEXT_DHIKR ->
     * startSilence()`), FINISHED ends the session with no silence.
     */
    private fun sessionTimeline(items: List<PlaylistItem>): List<String> {
        val cursor = PlaybackCursor(items)
        val gap = SilenceGap()
        val timeline = mutableListOf<String>()
        var now = 0L
        while (true) {
            cursor.advance()
            val item = cursor.current ?: break
            val files = item.filesFor(cursor.repetition)
            timeline += "play ${item.dhikrId}#${cursor.repetition} (${files.size} file${if (files.size > 1) "s, back to back" else ""})"
            when (cursor.complete(cursor.beginPlayback())) {
                PlaybackCursor.Step.NEXT_REPETITION, PlaybackCursor.Step.NEXT_DHIKR -> {
                    val silence = gap.start(now)
                    timeline += "silence $silence ms"
                    now += silence
                    gap.clear()
                }
                PlaybackCursor.Step.FINISHED -> break
                PlaybackCursor.Step.IGNORED -> error("a playback completed twice")
            }
        }
        return timeline
    }

    @Test
    fun scheduledQueueSeparatesRepetitionsAndDifferentAdhkarBy1500msAndNothingAfterTheLast() {
        val ikhlas = PlaylistItem("morning_002", "", "", Recitation(ikhlas("husary-murattal")), 2)
        val timeline = sessionTimeline(listOf(item("morning_003", 2), ikhlas, item("evening_001", 1)))
        assertEquals(
            listOf(
                "play morning_003#1 (1 file)",
                "silence 1500 ms", // repeat 1 → repeat 2
                "play morning_003#2 (1 file)",
                "silence 1500 ms", // Dhikr A → Dhikr B
                "play morning_002#1 (4 files, back to back)", // ayahs 112:1-4: no silence between them
                "silence 1500 ms",
                "play morning_002#2 (4 files, back to back)",
                "silence 1500 ms",
                "play evening_001#1 (1 file)", // final item: nothing after it
            ),
            timeline,
        )
    }

    @Test
    fun pausingDuringTheSilenceFreezesItsRemainingTime() {
        val gap = SilenceGap()
        gap.start(now = 10_000L)
        gap.pause(now = 10_600L) // 0.6 s of silence elapsed
        assertEquals(900L, gap.remainingMillis)
        assertEquals(900L, gap.resume(now = 60_000L)) // a long pause doesn't eat into it
        assertNull(gap.resume(now = 60_001L)) // already running
    }

    @Test
    fun resumeWithoutAPausedSilenceIsANoOp() {
        assertNull(SilenceGap().resume(now = 1L))
    }

    @Test
    fun playlistRoundTripsThroughStorage() {
        val items = listOf(
            PlaylistItem("morning_003", "أمسينا وأمسى الملك لله", "نص", Recitation(listOf("public/audio/adhkar/evening/morning_003.mp3")), 1),
            PlaylistItem("morning_002", "سورة الإخلاص", "نص", withBasmala("husary-murattal"), 3, rotation = RECITERS.map(::withBasmala)),
            PlaylistItem("morning_002b", "سورة الفلق", "نص", Recitation(ikhlas("banna-murattal"), ikhlas("banna-murattal"), 5_020L), 3),
        )
        assertEquals(items, AudioAdhkarStore.parsePlaylist(AudioAdhkarStore.serializePlaylist(items)))
        assertEquals(emptyList<PlaylistItem>(), AudioAdhkarStore.parsePlaylist("not json"))
    }

    @Test
    fun aPlaylistSavedBeforeMultiFileItemsStillLoads() {
        val old = """[{"dhikrId":"morning_003","title":"t","text":"x","assetPath":"public/audio/adhkar/evening/morning_003.mp3","repetitions":1}]"""
        assertEquals(
            listOf(PlaylistItem("morning_003", "t", "x", Recitation(listOf("public/audio/adhkar/evening/morning_003.mp3")), 1)),
            AudioAdhkarStore.parsePlaylist(old),
        )
    }

    // ---- Quran reciter rotation ---------------------------------------------

    private val RECITERS = listOf("abdulbasit-murattal", "minshawi-murattal", "husary-murattal", "alafasy-murattal", "sudais-murattal")
    private fun ikhlas(reciter: String) = (1..4).map { "public/audio/quran/$reciter/11200$it.mp3" }
    private fun kursi(reciter: String) = listOf("public/audio/quran/$reciter/002255.mp3")
    private fun basmala(reciter: String) = "public/audio/quran/$reciter/basmala.mp3"
    /** A recitation as JS sends it: the reciter's own basmala, then the ayahs — the same files every repetition. */
    private fun withBasmala(reciter: String) = Recitation(listOf(basmala(reciter)) + ikhlas(reciter))

    private fun rotating(id: String, files: (String) -> List<String>) =
        PlaylistItem(id, id, "", Recitation(files(RECITERS[0])), 1, rotation = RECITERS.map { Recitation(files(it)) })

    @Test
    fun rotationGivesEachQuranicRecitationTheNextReciterAndPersistsThePosition() {
        val playlist = listOf(rotating("morning_001", ::kursi), item("morning_003", 1), rotating("morning_002", ::ikhlas))
        val first = AudioAdhkarRotation.apply(playlist, startIndex = 3)
        assertEquals(kursi("alafasy-murattal"), first.items[0].recitation.assetPaths)
        assertEquals(playlist[1], first.items[1]) // non-Quran items are untouched
        assertEquals(ikhlas("sudais-murattal"), first.items[2].recitation.assetPaths)
        assertEquals(0, first.nextIndex) // wraps around
        val next = AudioAdhkarRotation.apply(playlist, first.nextIndex)
        assertEquals(kursi("abdulbasit-murattal"), next.items[0].recitation.assetPaths)
        assertEquals(ikhlas("minshawi-murattal"), next.items[2].recitation.assetPaths)
    }

    @Test
    fun rotationKeepsAllAyahsOfOneRecitationWithOneReciter() {
        val applied = AudioAdhkarRotation.apply(listOf(rotating("morning_002", ::ikhlas)), startIndex = 2)
        assertEquals(ikhlas("husary-murattal"), applied.items.single().recitation.assetPaths)
    }

    @Test
    fun withoutRotationThePlaylistAndPositionAreUnchanged() {
        val playlist = listOf(PlaylistItem("morning_002", "t", "", Recitation(ikhlas("husary-murattal")), 3), item("morning_003", 1))
        val applied = AudioAdhkarRotation.apply(playlist, startIndex = 4)
        assertEquals(playlist, applied.items)
        assertEquals(4, applied.nextIndex)
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

    // ---- basmala: once, at the start, in the reciter's own voice --------------

    @Test
    fun theBasmalaPlaysBeforeEveryRepetitionNeverBetweenAyahs() {
        val item = PlaylistItem("morning_002", "", "", withBasmala("husary-murattal"), 3)
        for (repetition in 1..3) {
            assertEquals(listOf(basmala("husary-murattal")) + ikhlas("husary-murattal"), item.filesFor(repetition))
            assertEquals(0L, item.startMillisFor(repetition))
        }
        assertEquals(
            listOf(
                "play morning_002#1 (5 files, back to back)", // his basmala → 112:1 → … → 112:4
                "silence 1500 ms",
                "play morning_002#2 (5 files, back to back)", // his basmala again
                "silence 1500 ms",
                "play morning_002#3 (5 files, back to back)",
            ),
            sessionTimeline(listOf(item)),
        )
    }

    @Test
    fun ayatAlKursiStartsWithTheReciterBasmala() {
        val item = PlaylistItem("morning_001", "", "", Recitation(listOf(basmala("banna-murattal")) + kursi("banna-murattal")), 1)
        assertEquals(listOf(basmala("banna-murattal"), "public/audio/quran/banna-murattal/002255.mp3"), item.filesFor(1))
    }

    @Test
    fun aBasmalaInsideTheFirstAyahFilePlaysEveryRepetitionWithNothingAdded() {
        val item = PlaylistItem("morning_002", "", "", Recitation(ikhlas("banna-murattal")), 3)
        for (repetition in 1..3) {
            assertEquals(ikhlas("banna-murattal"), item.filesFor(repetition)) // his own basmala, from the file
            assertEquals(0L, item.startMillisFor(repetition)) // from its start, every time
        }
    }

    @Test
    fun laterRepetitionFilesAndOffsetAreHonouredWhenGiven() {
        val item = PlaylistItem("x", "", "", Recitation(listOf("a", "b"), listOf("b"), 1_000L), 2)
        assertEquals(listOf("a", "b"), item.filesFor(1))
        assertEquals(listOf("b"), item.filesFor(2))
        assertEquals(1_000L, item.startMillisFor(2))
    }

    @Test
    fun rotationGivesEachRecitationItsOwnReciterBasmala() {
        val playlist = listOf(PlaylistItem("morning_002", "", "", withBasmala(RECITERS[0]), 1, rotation = RECITERS.map(::withBasmala)))
        for ((i, reciter) in RECITERS.withIndex()) {
            val files = AudioAdhkarRotation.apply(playlist, startIndex = i).items.single().filesFor(1)
            assertEquals(basmala(reciter), files.first())
            assertTrue(files.all { "/$reciter/" in it }) // never another reciter's voice
        }
    }

    @Test
    fun aPlaylistSavedWithPlainRotationListsStillLoads() {
        val old = """[{"dhikrId":"morning_002","title":"t","text":"x","assetPaths":["a1","a2"],"rotationAssetPaths":[["a1","a2"],["b1","b2"]],"repetitions":3}]"""
        val item = AudioAdhkarStore.parsePlaylist(old).single()
        assertEquals(Recitation(listOf("a1", "a2")), item.recitation)
        assertEquals(listOf(Recitation(listOf("a1", "a2")), Recitation(listOf("b1", "b2"))), item.rotation)
    }
}
