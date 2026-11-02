package com.dithar.app.look

import android.content.Context
import android.content.res.Configuration
import java.util.Calendar

/**
 * The app's appearance theme ("look") as native surfaces need it, for the ones
 * that show without the WebView: the Floating Tasbeeh overlay and the cover
 * shown while a tapped reminder opens.
 *
 * The app pushes only the user's choice (RemindersPlugin#setAppLook); the look
 * shown is resolved here with the same rule as effectiveLook in
 * src/theme/looks.ts, because automatic dark mode can change while the app is
 * closed and the overlay is still on screen. The colours are the Adhkar
 * screens' deep page colours and gold of each look (src/theme/looks.ts,
 * src/index.css); src/lib/appLookNative.test.ts keeps both in step.
 */
object AppLook {
    const val DEFAULT_LOOK = "classic"

    /**
     * [page]: the look's page colour. [deepTop]/[deepBottom]: its deep gradient.
     * [ink]: text on that gradient. [gold]: its accent.
     */
    data class Colors(val page: String, val deepTop: String, val deepBottom: String, val ink: String, val gold: String)

    private val COLORS = mapOf(
        "classic" to Colors(page = "#f2e9da", deepTop = "#0d1f31", deepBottom = "#0a1928", ink = "#f2e6cd", gold = "#c6a15b"),
        "night" to Colors(page = "#0d1733", deepTop = "#101b3c", deepBottom = "#0a1330", ink = "#f3e9d2", gold = "#d6b26c"),
        "nature" to Colors(page = "#e9eddf", deepTop = "#22402e", deepBottom = "#183022", ink = "#f1ead4", gold = "#c6a15b"),
        "sunset" to Colors(page = "#f3e6ef", deepTop = "#3d2756", deepBottom = "#2b1b3f", ink = "#f7eaf2", gold = "#c6a15b"),
    )

    private const val NIGHT_FROM_MINUTES = 18 * 60 + 30
    private const val NIGHT_UNTIL_MINUTES = 5 * 60 + 30

    fun colors(look: String): Colors = COLORS[look] ?: COLORS.getValue(DEFAULT_LOOK)

    /** The look shown: Night when automatic dark mode says so, else the chosen one (effectiveLook in looks.ts). */
    fun effective(look: String, autoDark: String, deviceDark: Boolean, minutesOfDay: Int): String {
        if (autoDark == "device" && deviceDark) return "night"
        if (autoDark == "time" && (minutesOfDay >= NIGHT_FROM_MINUTES || minutesOfDay < NIGHT_UNTIL_MINUTES)) return "night"
        return if (look in COLORS) look else DEFAULT_LOOK
    }
}

/** The user's choice, as last pushed by the app. */
class AppLookStore(private val context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("dithar_app_look", Context.MODE_PRIVATE)

    val autoDark: String get() = prefs.getString(KEY_AUTO_DARK, "off") ?: "off"

    fun save(look: String, autoDark: String) {
        prefs.edit().putString(KEY_LOOK, look).putString(KEY_AUTO_DARK, autoDark).apply()
    }

    /** The colours of the look that should show right now. */
    fun currentColors(): AppLook.Colors {
        val deviceDark = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        val now = Calendar.getInstance()
        val minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
        return AppLook.colors(AppLook.effective(prefs.getString(KEY_LOOK, null) ?: AppLook.DEFAULT_LOOK, autoDark, deviceDark, minutes))
    }

    private companion object {
        const val KEY_LOOK = "look"
        const val KEY_AUTO_DARK = "auto_dark"
    }
}
