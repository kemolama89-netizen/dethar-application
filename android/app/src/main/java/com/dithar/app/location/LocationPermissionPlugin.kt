package com.dithar.app.location

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Location PERMISSION only — never fetches a location itself. The actual
 * fix still comes from the app's existing flow (the WebView's
 * navigator.geolocation in useCoordinates.ts / deviceLocation.ts). This
 * exists so Settings → الموقع → "تحديد موقعي تلقائيًا" can tell the three
 * Android states apart and recover from a denial:
 *
 *   "granted"   fine or coarse location is granted
 *   "prompt"    Android will show its permission dialog
 *   "blocked"   Android will NOT show the dialog again ("Don't ask again",
 *               or denied twice on Android 11+) — only the app's system
 *               settings page can grant it now
 */
@CapacitorPlugin(
    name = "LocationPermission",
    permissions = [
        Permission(
            alias = LocationPermissionPlugin.ALIAS,
            strings = [Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION],
        ),
    ],
)
class LocationPermissionPlugin : Plugin() {
    @PluginMethod
    fun getStatus(call: PluginCall) {
        call.resolve(JSObject().put("status", status()))
    }

    /** Shows Android's dialog when it still can; never loops — one request per call. */
    @PluginMethod
    fun request(call: PluginCall) {
        if (status() != STATUS_PROMPT) {
            call.resolve(JSObject().put("status", status()))
            return
        }
        prefs().edit().putBoolean(KEY_REQUESTED, true).apply()
        requestPermissionForAlias(ALIAS, call, "onRequestResult")
    }

    @PermissionCallback
    private fun onRequestResult(call: PluginCall) {
        call.resolve(JSObject().put("status", status()))
    }

    /** Opens DITHAR's page in Android Settings (Permissions → Location). */
    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            context.startActivity(intent)
        } catch (_: Exception) {
        }
        call.resolve()
    }

    private fun status(): String {
        val granted = PERMISSIONS.any { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }
        // Once granted, a later revocation in Android Settings starts fresh (Android shows the dialog again).
        if (granted) prefs().edit().remove(KEY_REQUESTED).apply()
        val activity = activity
        val canShowRationale = activity != null && PERMISSIONS.any { ActivityCompat.shouldShowRequestPermissionRationale(activity, it) }
        return resolveStatus(granted, canShowRationale, prefs().getBoolean(KEY_REQUESTED, false))
    }

    private fun prefs() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        const val ALIAS = "location"
        const val STATUS_GRANTED = "granted"
        const val STATUS_PROMPT = "prompt"
        const val STATUS_BLOCKED = "blocked"
        private const val PREFS_NAME = "dithar_location_permission"
        private const val KEY_REQUESTED = "requested_by_settings"
        private val PERMISSIONS = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)

        /**
         * Android only says "you may ask again" (rationale) after a single
         * denial. With no rationale, the dialog is either still unasked or
         * permanently refused — told apart by whether this plugin already
         * asked once. (A permanent refusal from the first-launch prompt
         * therefore costs exactly one no-dialog request before it reads
         * "blocked" — never a loop.)
         */
        fun resolveStatus(granted: Boolean, canShowRationale: Boolean, requestedBefore: Boolean): String = when {
            granted -> STATUS_GRANTED
            canShowRationale -> STATUS_PROMPT
            requestedBefore -> STATUS_BLOCKED
            else -> STATUS_PROMPT
        }
    }
}
