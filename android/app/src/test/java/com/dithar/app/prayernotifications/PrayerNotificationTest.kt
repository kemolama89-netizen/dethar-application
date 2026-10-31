package com.dithar.app.prayernotifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class PrayerNotificationTest {
    private val minute = 60_000L
    private fun entry(prayer: String, at: Long) = PrayerNotification(prayer, at, "title $prayer", "body $prayer")

    // Two days of the five prayers, times in minutes from 0.
    private val entries = listOf(
        entry("fajr", 300 * minute), entry("dhuhr", 700 * minute), entry("asr", 900 * minute),
        entry("maghrib", 1080 * minute), entry("isha", 1170 * minute),
        entry("fajr", 1740 * minute), entry("dhuhr", 2140 * minute),
    )

    @Test
    fun theAlarmIsArmedForTheNextPrayerOnly() {
        assertEquals(entries[0], PrayerNotificationPlan.next(entries, 0L, 0L))
        assertEquals(entries[1], PrayerNotificationPlan.next(entries, 300 * minute, 0L))
        assertEquals(entries[5], PrayerNotificationPlan.next(entries, 1200 * minute, 0L))
        assertNull(PrayerNotificationPlan.next(entries, 3000 * minute, 0L))
    }

    @Test
    fun aDisabledPrayerIsSimplyAbsentSoItIsNeverArmed() {
        // JS leaves Asr out when it's switched off.
        val withoutAsr = entries.filter { it.prayer != "asr" }
        assertEquals("maghrib", PrayerNotificationPlan.next(withoutAsr, 700 * minute, 0L)!!.prayer)
    }

    @Test
    fun anOnTimeAlarmPostsItsPrayerOnce() {
        val first = PrayerNotificationPlan.fire(entries, 700 * minute, 300 * minute)
        assertEquals(entries[1], first.post)
        assertEquals(700 * minute, first.lastPosted)
        // A duplicate delivery of the same alarm posts nothing.
        val again = PrayerNotificationPlan.fire(entries, 700 * minute + 5_000, first.lastPosted)
        assertNull(again.post)
        // Re-arming after it never re-arms the same prayer.
        assertEquals(entries[2], PrayerNotificationPlan.next(entries, 700 * minute - 10_000, first.lastPosted))
    }

    @Test
    fun aSlightlyEarlyAlarmStillCountsForItsPrayer() {
        assertEquals(entries[1], PrayerNotificationPlan.fire(entries, 700 * minute - 30_000, 300 * minute).post)
    }

    @Test
    fun aLateAlarmShowsOnlyTheLatestPrayerAndNeverABurst() {
        // The phone slept through Dhuhr and Asr; at 15:10 only Asr shows, both are consumed.
        val late = PrayerNotificationPlan.fire(entries, 910 * minute, 300 * minute)
        assertEquals("asr", late.post!!.prayer)
        assertEquals(900 * minute, late.lastPosted)
    }

    @Test
    fun aNotificationOverAnHourLateIsDroppedNotShownStale() {
        val stale = PrayerNotificationPlan.fire(entries, 900 * minute + 61 * minute, 700 * minute)
        assertNull(stale.post)
        assertEquals(900 * minute, stale.lastPosted)
    }

    @Test
    fun eachPrayerHasItsOwnFixedNotificationId() {
        val ids = PrayerNotificationPlan.PRAYERS.map(PrayerNotificationPlan::notificationId)
        assertEquals(5, ids.toSet().size)
        assertEquals(PrayerNotificationPlan.notificationId("fajr"), PrayerNotificationPlan.notificationId("fajr"))
    }

    @Test
    fun entriesRoundTripThroughStorage() {
        assertEquals(entries, PrayerNotificationStore.parse(PrayerNotificationStore.serialize(entries)))
        assertEquals(emptyList<PrayerNotification>(), PrayerNotificationStore.parse("{broken"))
    }

    // ---- source guards (no emulator in this project) ----------------------

    private val manifest = File("src/main/AndroidManifest.xml").readText()
    private val scheduler = File("src/main/java/com/dithar/app/prayernotifications/PrayerNotificationScheduler.kt").readText()

    @Test
    fun receiversAreDeclaredAndRebootUpdatesAndTimeChangesReArm() {
        assertTrue(manifest.contains("android:name=\".prayernotifications.PrayerNotificationReceiver\""))
        val reschedule = manifest.substringAfter("android:name=\".prayernotifications.PrayerNotificationRescheduleReceiver\"").substringBefore("</receiver>")
        for (action in listOf("BOOT_COMPLETED", "MY_PACKAGE_REPLACED", "TIME_SET", "TIMEZONE_CHANGED", "SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED")) {
            assertTrue(action, reschedule.contains(action))
        }
        assertTrue(reschedule.contains("android:exported=\"false\""))
        val receiver = scheduler.substringAfter("class PrayerNotificationRescheduleReceiver")
        assertTrue(receiver.contains("PrayerNotificationScheduler.reschedule(context)"))
    }

    @Test
    fun oneFixedAlarmSlotSoReschedulingReplacesNeverAdds() {
        assertTrue(scheduler.contains("private const val REQUEST_CODE = 7401"))
        assertEquals(1, Regex("""PendingIntent\.getBroadcast\(""").findAll(scheduler).count())
        assertTrue(scheduler.contains("setExactAndAllowWhileIdle"))
    }

    // ---- why some prayers got only a notification ------------------------------

    @Test
    fun aPrayerWhoseAdhanPlaysIsArmedAsAnAlarmClock() {
        // HONOR/Huawei held a plain exact alarm until DITHAR was opened (a real trace: 41 s late, at onCreate);
        // past ADHAN_MAX_LATE_MILLIS that prayer got its notification but no adhan. An alarm clock is delivered on time.
        val reschedule = scheduler.substringAfter("fun reschedule(").substringBefore("private fun setAlarm(")
        assertTrue(reschedule.contains("val withAdhan = store.adhanConfig(AdhanPlan.sectionFor(next.prayer)) != null"))
        assertTrue(reschedule.contains("AlarmPolicy.mode(startsPlayback = withAdhan, exactAllowed = exact)"))
        val setAlarm = scheduler.substringAfter("private fun setAlarm(").substringBefore("private fun openAppIntent(")
        assertTrue(setAlarm.contains("AlarmPolicy.Mode.ALARM_CLOCK -> alarmManager.setAlarmClock("))
        assertTrue(setAlarm.contains("AlarmPolicy.Mode.EXACT -> alarmManager.setExactAndAllowWhileIdle("))
        assertTrue(setAlarm.contains("AlarmPolicy.Mode.INEXACT -> alarmManager.setAndAllowWhileIdle("))
        // The armed mode is in the diagnostics.
        assertTrue(reschedule.contains("mode=\$mode adhan=\$withAdhan"))
    }

    @Test
    fun theAdhanDecisionSaysWhyItDoesntPlay() {
        val e = entry("isha", 1170 * minute)
        assertEquals(AdhanDecision.OFF, PrayerNotificationPlan.adhanDecision(false, e, 1170 * minute))
        assertEquals(AdhanDecision.PLAY, PrayerNotificationPlan.adhanDecision(true, e, 1170 * minute))
        assertEquals(AdhanDecision.PLAY, PrayerNotificationPlan.adhanDecision(true, e, 1173 * minute))
        assertEquals(AdhanDecision.TOO_LATE, PrayerNotificationPlan.adhanDecision(true, e, 1173 * minute + 1))
    }

    @Test
    fun aRefusedAdhanStartKeepsTheNotificationsSoundAndIsRecorded() {
        val receiver = scheduler.substringAfter("class PrayerNotificationReceiver")
        // Silent only when the service start was accepted — before, a refused start still silenced the notification.
        assertTrue(receiver.contains("val refused = AudioAdhkarPlaybackService.startAdhan("))
        assertTrue(receiver.contains("if (refused != null) return \"start refused: \$refused\""))
        assertTrue(receiver.contains("val adhan = outcome == STARTED"))
        assertTrue(receiver.contains("adhan=\$outcome"))
        val service = File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPlaybackService.kt").readText()
        val start = service.substringAfter("fun startAdhan(context: Context, voice: AdhanVoice, title: String): String? {").substringBefore("fun playNow(")
        assertTrue(start.contains("null\n            } catch (e: Exception) {"))
        assertTrue(start.contains("e.javaClass.simpleName\n            }"))
    }

    // ---- auto-adhan ----------------------------------------------------------

    private fun voice(id: String) = AdhanVoice(id, id, "public/audio/adhan/$id.mp3", 1_000L, 200_000L)
    private val voices = listOf(voice("a"), voice("b"), voice("c"))

    @Test
    fun withoutRotationTheChosenVoiceAlwaysPlays() {
        val config = AdhanConfig(rotate = false, voices = listOf(voice("b")), nextVoiceId = null, nextToken = null)
        repeat(3) { assertEquals("b", AdhanPlan.pick(config, "b", null) { 0 }!!.id) }
    }

    @Test
    fun rotationPlaysTheAnnouncedNextVoiceOnceThenRandomWithoutRepeats() {
        val config = AdhanConfig(rotate = true, voices = voices, nextVoiceId = "b", nextToken = "a>b")
        // The voice Settings shows as next is what the next adhan plays.
        assertEquals("b", AdhanPlan.pick(config, lastVoiceId = "a", consumedToken = null) { 0 }!!.id)
        // Once used (token consumed), later adhans are random — never the one just played.
        val rng = java.util.Random(3)
        var last = "b"
        val played = mutableListOf<String>()
        repeat(60) {
            val v = AdhanPlan.pick(config, last, consumedToken = "a>b") { rng.nextInt(it) }!!.id
            assertTrue("repeat at $it", v != last)
            played.add(v)
            last = v
        }
        assertEquals(setOf("a", "b", "c"), played.toSet())
    }

    @Test
    fun anAnnouncedVoiceThatJustPlayedIsNotRepeated() {
        val config = AdhanConfig(rotate = true, voices = voices, nextVoiceId = "c", nextToken = "x>c")
        assertTrue(AdhanPlan.pick(config, lastVoiceId = "c", consumedToken = null) { 0 }!!.id != "c")
    }

    @Test
    fun noVoicesMeansNoAdhan() {
        assertNull(AdhanPlan.pick(AdhanConfig(true, emptyList(), null, null), null, null) { 0 })
    }

    @Test
    fun fajrHasItsOwnSectionAndTheOthersShareRegular() {
        assertEquals("fajr", AdhanPlan.sectionFor("fajr"))
        for (p in listOf("dhuhr", "asr", "maghrib", "isha")) assertEquals("regular", AdhanPlan.sectionFor(p))
    }

    @Test
    fun theAdhanOnlyStartsWithinThreeMinutesOfItsTime() {
        val e = entry("dhuhr", 700 * minute)
        assertTrue(PrayerNotificationPlan.adhanOnTime(e, 700 * minute))
        assertTrue(PrayerNotificationPlan.adhanOnTime(e, 703 * minute))
        assertTrue(!PrayerNotificationPlan.adhanOnTime(e, 703 * minute + 1))
    }

    @Test
    fun adhanSettingsAndTheNotifyFlagRoundTrip() {
        val raw = """{"rotate":true,"nextVoiceId":"b","nextToken":"a>b","voices":[{"id":"a","name":"A","assetPath":"public/audio/adhan/a.mp3","startMillis":200,"endMillis":90000},{"id":"bad","name":"","assetPath":"x","startMillis":5,"endMillis":5}]}"""
        val config = PrayerNotificationStore.parseAdhan(raw)!!
        assertEquals(listOf("a"), config.voices.map { it.id }) // an empty segment is dropped
        assertEquals(200L, config.voices[0].startMillis)
        assertEquals("a>b", config.nextToken)
        assertNull(PrayerNotificationStore.parseAdhan("{broken"))
        val silent = entry("asr", 900 * minute).copy(notify = false)
        assertEquals(listOf(silent), PrayerNotificationStore.parse(PrayerNotificationStore.serialize(listOf(silent))))
    }

    @Test
    fun theReceiverStartsTheAdhanOnlyWhenOnAndOnTimeAndThenNotifiesSilently() {
        val receiver = scheduler.substringAfter("class PrayerNotificationReceiver")
        assertTrue(receiver.contains("when (PrayerNotificationPlan.adhanDecision(config != null, post, now))"))
        assertTrue(receiver.contains("AdhanDecision.PLAY -> startAdhan(context, store, post, config!!)"))
        assertTrue(receiver.contains("if (post.notify) PrayerNotificationScheduler.post(context, post, withAdhan = adhan)"))
        assertTrue(receiver.contains("AdhanDecision.OFF -> \"off\"")) // auto-adhan off → nothing plays
        assertTrue(scheduler.contains("setSound(null, null)")) // the notification is silent while the adhan plays
        assertTrue(!scheduler.contains("MediaPlayer")) // the adhan plays in the media service, not here
    }

    @Test
    fun theAdhanSessionNeverOverlapsAdhkarAndAdhkarResumeAfterTheWindow() {
        val service = File("src/main/java/com/dithar/app/audioadhkar/AudioAdhkarPlaybackService.kt").readText()
        val start = service.substringAfter("private fun startAdhanSession(").substringBefore("private fun playCurrent()")
        assertTrue(start.contains("interruptForAdhan(keepService = true)")) // adhkar stop (progress saved) before the adhan
        assertTrue(start.contains("if (adhanSession) {")) // a second adhan never starts while one plays
        val interrupt = service.substringAfter("private fun interruptForAdhan(").substringBefore("private fun startAdhanSession(")
        // A daily session is saved and offered back by ONE "Resume Adhkar" prompt — never resumed automatically.
        assertTrue(interrupt.contains("AudioAdhkarScheduler.saveForResumePrompt("))
        assertFalse(interrupt.contains("AudioAdhkarScheduler.armResume("))
        val play = service.substringAfter("private fun playCurrent()").substringBefore("private fun playPart(")
        // The adhan itself isn't paused by the adhan window; nor is a dhikr the user started («استماع», or "Resume Adhkar").
        assertTrue(play.contains("!adhanSession && !manualSession && !userResumed && AdhanSuppression.isSuppressed("))
        assertTrue(interrupt.contains("sessionSection.isDaily && !manualSession")) // a «استماع» dhikr is never offered back
        assertTrue(service.contains("setUsage(AudioAttributes.USAGE_MEDIA)")) // option (a): media volume
    }
}
