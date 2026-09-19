package com.dithar.app.floatingtasbeeh

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import org.json.JSONObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * The Capacitor plugin bridging DITHAR's web UI (Settings screen,
 * floatingTasbeehSync.ts) to the native Floating Tasbeeh layer. This is
 * the ONLY point of contact between JS and native for this feature — it
 * never touches DITHAR's Statistics/Shared Counting Core itself (that's
 * `commitFloatingTasbeehRepetition` in tasbeehCommit.ts, on the JS side);
 * it only ever hands over raw pending taps and lets JS decide when they're
 * safely committed (see `confirmPendingEventsDrained`).
 */
@CapacitorPlugin(name = "FloatingTasbeeh")
class FloatingTasbeehPlugin : Plugin() {
    private val store: FloatingTasbeehStore by lazy { FloatingTasbeehStore(context) }

    /**
     * Registers this bridge instance to fire the "pendingEventsChanged"
     * JS event the instant a floating tap is accepted (see
     * FloatingTasbeehService#notifyPendingEventsChanged) — the event-driven
     * half of Floating Tasbeeh <-> Statistics live sync, so
     * reconcileFloatingTasbeeh.ts can run immediately instead of waiting
     * for the next app-foreground reconciliation. Cleared in
     * [handleOnDestroy] so a torn-down bridge never leaks a stale listener
     * a later, unrelated instance's own `load()` would otherwise have to
     * race against.
     */
    override fun load() {
        super.load()
        FloatingTasbeehService.setPendingEventsListener {
            notifyListeners(EVENT_PENDING_EVENTS_CHANGED, JSObject())
        }
        FloatingTasbeehService.setSelectedDhikrListener { dhikrId ->
            notifyListeners(EVENT_SELECTED_DHIKR_CHANGED, JSObject().put("dhikrId", dhikrId))
        }
        // Cold/fresh start: the floating menu launched this activity with a
        // route extra. Held until JS pulls it via consumeOpenRoute, and
        // removed from the intent so an activity re-create never replays it.
        activity?.intent?.let { intent ->
            pendingRoute = intent.getStringExtra(EXTRA_OPEN_ROUTE)
            intent.removeExtra(EXTRA_OPEN_ROUTE)
        }
    }

    /**
     * Warm start: MainActivity is singleTask, so the floating menu's
     * startActivity lands here (foreground or background) instead of
     * re-creating it. Records the route and pings JS, which pulls it via
     * consumeOpenRoute — see floatingTasbeehSync.ts's
     * startFloatingOpenRouteRequests.
     */
    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        val route = intent.getStringExtra(EXTRA_OPEN_ROUTE) ?: return
        intent.removeExtra(EXTRA_OPEN_ROUTE)
        pendingRoute = route
        notifyListeners(EVENT_OPEN_ROUTE_REQUESTED, JSObject())
    }

    @Volatile
    private var pendingRoute: String? = null

    /** Returns AND clears the pending route (null if none) — never replays. */
    @PluginMethod
    fun consumeOpenRoute(call: PluginCall) {
        val route = pendingRoute
        pendingRoute = null
        call.resolve(JSObject().apply { put("route", route ?: JSONObject.NULL) })
    }

    override fun handleOnDestroy() {
        FloatingTasbeehService.setPendingEventsListener(null)
        FloatingTasbeehService.setSelectedDhikrListener(null)
        super.handleOnDestroy()
    }

    @PluginMethod
    fun isSupported(call: PluginCall) {
        // API 26+ is required for TYPE_APPLICATION_OVERLAY (see
        // DhikrMenuPopup's overlayWindowType() doc comment); DITHAR's
        // realistic minSdk already exceeds this, but this call lets JS
        // avoid ever offering the toggle on a device/OS combination where
        // it genuinely can't work.
        val result = JSObject()
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        call.resolve(result)
    }

    @PluginMethod
    fun isOverlayPermissionGranted(call: PluginCall) {
        val result = JSObject()
        result.put("granted", Settings.canDrawOverlays(context))
        call.resolve(result)
    }

    @PluginMethod
    fun requestOverlayPermission(call: PluginCall) {
        if (Settings.canDrawOverlays(context)) {
            call.resolve(grantedResult(true))
            return
        }
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${context.packageName}"),
        )
        startActivityForResult(call, intent, "overlayPermissionResult")
    }

    @ActivityCallback
    private fun overlayPermissionResult(call: PluginCall?, result: androidx.activity.result.ActivityResult?) {
        // The system Settings screen for this permission does not
        // reliably return a meaningful result code across OEMs — the
        // correct, standard approach is to just re-check
        // Settings.canDrawOverlays() once control returns to the app,
        // regardless of resultCode.
        call?.resolve(grantedResult(Settings.canDrawOverlays(context)))
    }

    private fun grantedResult(granted: Boolean): JSObject = JSObject().apply { put("granted", granted) }

    @PluginMethod
    fun isEnabled(call: PluginCall) {
        val result = JSObject()
        result.put("enabled", store.isEnabled)
        call.resolve(result)
    }

    @PluginMethod
    fun setEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        store.isEnabled = enabled
        if (enabled && Settings.canDrawOverlays(context)) {
            FloatingTasbeehService.start(context)
        } else {
            FloatingTasbeehService.stop(context)
        }
        call.resolve()
    }

    /**
     * Pushes an updated live count for [dhikrId] — called after a manual
     * tap or a Reset commits through the Shared Counting Core (see
     * tasbeehCommit.ts, TasbeehScreen.tsx's handleReset) — into the SAME
     * live-count mirror a floating tap itself updates (see
     * FloatingTasbeehStore#getLiveCount), and refreshes the bubble's own
     * displayed number right away if it's currently showing this dhikr,
     * rather than waiting for some unrelated later redraw.
     */
    @PluginMethod
    fun syncLiveCount(call: PluginCall) {
        val dhikrId = call.getInt("dhikrId")
        val count = call.getInt("count")
        if (dhikrId == null || count == null) {
            call.reject("dhikrId and count are required")
            return
        }
        store.setLiveCount(dhikrId, count)
        FloatingTasbeehService.refreshBubbleIfSelected(dhikrId, count)
        call.resolve()
    }

    /**
     * Zeroes the live-count mirror for EVERY dhikr — called only from
     * TasbeehScreen's "Reset All" (see FloatingTasbeehStore#resetAllLiveCounts),
     * which resets every counter to zero in one action.
     */
    @PluginMethod
    fun resetAllLiveCounts(call: PluginCall) {
        store.resetAllLiveCounts()
        FloatingTasbeehService.refreshBubbleToZero()
        call.resolve()
    }

    @PluginMethod
    fun getSelectedDhikr(call: PluginCall) {
        val result = JSObject()
        result.put("dhikrId", store.selectedDhikrId)
        call.resolve(result)
    }

    @PluginMethod
    fun setSelectedDhikr(call: PluginCall) {
        val dhikrId = call.getInt("dhikrId")
        if (dhikrId == null) {
            call.reject("dhikrId is required")
            return
        }
        store.selectedDhikrId = dhikrId
        // The bubble (if showing) follows an in-app selection right away.
        FloatingTasbeehService.refreshBubbleSelection()
        call.resolve()
    }

    /**
     * Pushes the FULL Tasbeeh dhikr library (id + localized label +
     * calm-counting pacing duration) the long-press popup's scrollable
     * list shows AND the bubble's own tap-pacing gate uses — called from
     * JS whenever the app starts or the interface language changes, so
     * native code never hardcodes dhikr wording, a subset of the library,
     * or its own copy of the pacing-duration logic (the single source of
     * truth stays src/data/tasbeeh-library.json + tasbeehTiming.ts).
     */
    @PluginMethod
    fun setDhikrList(call: PluginCall) {
        val items = call.getArray("items") ?: JSArray()
        val parsed = mutableListOf<Triple<Int, String, Long>>()
        for (i in 0 until items.length()) {
            val obj = items.getJSONObject(i)
            parsed.add(Triple(obj.getInt("id"), obj.getString("label"), obj.getLong("readyDurationMs")))
        }
        store.setDhikrLabels(parsed)
        call.resolve()
    }

    /**
     * Returns every pending Floating Tasbeeh tap not yet committed to
     * DITHAR's Statistics log. Read-only — does NOT remove anything (see
     * confirmPendingEventsDrained). Called from floatingTasbeehSync.ts on
     * every app foreground.
     */
    @PluginMethod
    fun getPendingEvents(call: PluginCall) {
        val events = store.peekPendingEvents()
        val array = JSArray()
        for (event in events) {
            val obj = JSObject()
            obj.put("dhikrId", event.dhikrId)
            obj.put("times", event.times)
            obj.put("ts", event.epochMillis)
            obj.put("localDate", event.localDate)
            obj.put("localTime", event.localTime)
            obj.put("timeZone", event.timeZone)
            array.put(obj)
        }
        val result = JSObject()
        result.put("events", array)
        call.resolve(result)
    }

    /**
     * Tells native it is now safe to forget exactly the first `count`
     * pending events — called ONLY after floatingTasbeehSync.ts has
     * successfully committed them via commitFloatingTasbeehRepetition. See
     * FloatingTasbeehStore#confirmDrained's own doc comment for why this
     * two-step peek/confirm shape (rather than one destructive
     * "drain everything" call) is what makes reconciliation crash-safe.
     */
    @PluginMethod
    fun confirmPendingEventsDrained(call: PluginCall) {
        val count = call.getInt("count")
        if (count == null) {
            call.reject("count is required")
            return
        }
        store.confirmDrained(count)
        call.resolve()
    }

    companion object {
        private const val EVENT_PENDING_EVENTS_CHANGED = "pendingEventsChanged"
        private const val EVENT_SELECTED_DHIKR_CHANGED = "selectedDhikrChanged"
        private const val EVENT_OPEN_ROUTE_REQUESTED = "openRouteRequested"
        const val EXTRA_OPEN_ROUTE = "com.dithar.app.OPEN_ROUTE"
        const val ROUTE_SETTINGS = "settings"
    }
}
