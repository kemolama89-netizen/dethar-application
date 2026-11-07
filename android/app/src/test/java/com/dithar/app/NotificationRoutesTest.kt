package com.dithar.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Every DITHAR notification opens what it is about: a screen route (NotificationRoutes) or its exact
 * item (ReminderOpen, JourneyOpen) — none opens just the app.
 */
class NotificationRoutesTest {
    private val main = File("src/main/java/com/dithar/app")

    @Test
    fun theRoutesAreTheOnesTheAppUnderstands() {
        assertEquals("audio:morning", NotificationRoutes.audio("morning"))
        for (r in listOf("statistics", "prayer", "tasbeeh", "audio", "settings", "audio:morning", "audio:evening", "audio:misc")) assertTrue(r, NotificationRoutes.isKnown(r))
        for (r in listOf("", "home", "audio:quran")) assertFalse(r, NotificationRoutes.isKnown(r))
    }

    @Test
    fun eachRouteHasItsOwnRequestCode_soNoNotificationOverwritesAnothersTarget() {
        val routes = listOf("statistics", "prayer", "tasbeeh", "audio", "audio:morning", "audio:evening", "audio:misc")
        assertEquals(routes.size, routes.map(NotificationRoutes::requestCode).toSet().size)
        assertEquals(NotificationRoutes.requestCode("prayer"), NotificationRoutes.requestCode("prayer"))
    }

    @Test
    fun noNotificationOpensJustTheApp() {
        val sources = main.walkTopDown().filter { it.extension == "kt" }.toList()
        assertTrue(sources.isNotEmpty())
        // A bare launch of MainActivity in a PendingIntent: only the item-carrying taps build their own intent.
        val allowed = setOf("NotificationRoutes.kt", "RemindersScheduler.kt", "JourneyScheduler.kt", "FloatingTasbeehService.kt")
        for (f in sources) {
            val text = f.readText()
            if (f.name in allowed) continue
            assertFalse("${f.name} opens MainActivity without a target", Regex("""PendingIntent\.getActivity\(\s*\w+,\s*\w+,\s*Intent\(\w+, MainActivity::class\.java\)""").containsMatchIn(text))
        }
        // The notifications that point at a screen use a route.
        val routed = mapOf(
            "reminders/RemindersScheduler.kt" to "NotificationRoutes.openIntent(context, NotificationRoutes.STATISTICS)",
            "prayernotifications/PrayerNotificationScheduler.kt" to "NotificationRoutes.openIntent(context, NotificationRoutes.PRAYER)",
            "audioadhkar/AudioAdhkarPlaybackService.kt" to "NotificationRoutes.audio(sessionSection.key)",
            "audioadhkar/AudioAdhkarWarningReceiver.kt" to "NotificationRoutes.audio(section.key)",
            "audioadhkar/AudioAdhkarPauseReceiver.kt" to "NotificationRoutes.audio(Section.MISC.key)",
            "audioadhkar/AudioAdhkarResumePromptReceiver.kt" to "NotificationRoutes.openIntent(context, NotificationRoutes.AUDIO)",
            "audioadhkar/AudioAdhkarScheduler.kt" to "NotificationRoutes.openIntent(context, NotificationRoutes.AUDIO)",
            "floatingtasbeeh/FloatingTasbeehService.kt" to "NotificationRoutes.openIntent(this, NotificationRoutes.TASBEEH)",
        )
        for ((path, call) in routed) assertTrue("$path: $call", File(main, path).readText().contains(call))
        // The adhan's own media notification opens the prayer times.
        assertTrue(File(main, "audioadhkar/AudioAdhkarPlaybackService.kt").readText().contains("if (adhanSession) NotificationRoutes.PRAYER"))
    }
}
