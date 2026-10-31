package com.dithar.app.screen

import android.view.WindowManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Keeps the screen on while the Qur'an reader is open (lib/screenAwake.ts):
 * FLAG_KEEP_SCREEN_ON on the activity's window, cleared again when the reader
 * closes. It is the window's own flag, not a wake lock: it only holds while
 * DITHAR is on screen, needs no permission, and the phone's normal screen
 * timeout applies again the moment it is cleared (or the app leaves the
 * screen).
 */
@CapacitorPlugin(name = "DitharScreenAwake")
class ScreenAwakePlugin : Plugin() {
    /** { enabled: boolean } */
    @PluginMethod
    fun setKeepAwake(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) == true
        val activity = activity ?: return call.reject("no activity")
        activity.runOnUiThread {
            if (enabled) {
                activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            val on = (activity.window.attributes.flags and WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) != 0
            call.resolve(JSObject().put("enabled", on))
        }
    }
}
