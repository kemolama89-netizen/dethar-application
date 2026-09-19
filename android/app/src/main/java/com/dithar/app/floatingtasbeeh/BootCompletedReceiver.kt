package com.dithar.app.floatingtasbeeh

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Settings

/**
 * Restarts Floating Tasbeeh after a device reboot — but ONLY if the user
 * had it enabled before the reboot AND the overlay permission is still
 * granted. A Foreground Service never auto-restarts itself after a reboot
 * on its own; this receiver is the standard, documented way to do that.
 * Android 12+ additionally restricts BOOT_COMPLETED delivery to apps that
 * have been run at least once since install/update — a device that never
 * launched DITHAR after installing it won't receive this at all, which is
 * the correct, expected behavior (nothing to restore for an app that was
 * never actually used).
 */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val store = FloatingTasbeehStore(context)
        if (store.isEnabled && Settings.canDrawOverlays(context)) {
            FloatingTasbeehService.start(context)
        }
    }
}
