package com.dithar.app.orientation

import android.content.pm.ActivityInfo
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * The Qur'an reader's orientation button (lib/orientationNative.ts): turns
 * the screen to landscape or back to portrait without the phone being
 * rotated, and hands orientation back to the system when the reader closes.
 * MainActivity handles orientation changes itself (AndroidManifest
 * configChanges), so the WebView — and the reader's page and position —
 * stays as it is.
 */
@CapacitorPlugin(name = "DitharOrientation")
class OrientationPlugin : Plugin() {
    /** { orientation: "landscape" | "portrait" | "unlocked" } */
    @PluginMethod
    fun lock(call: PluginCall) {
        val requested = OrientationRequest.of(call.getString("orientation"))
            ?: return call.reject("orientation must be landscape, portrait or unlocked")
        val activity = activity ?: return call.reject("no activity")
        activity.runOnUiThread {
            activity.requestedOrientation = requested
            call.resolve(JSObject().put("orientation", call.getString("orientation")))
        }
    }
}

/** The JS names → Android's requested orientations (pure, unit-tested). */
object OrientationRequest {
    fun of(name: String?): Int? = when (name) {
        // Either landscape side, by the sensor: the phone can be turned whichever way is comfortable.
        "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        "portrait" -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        "unlocked" -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        else -> null
    }
}
