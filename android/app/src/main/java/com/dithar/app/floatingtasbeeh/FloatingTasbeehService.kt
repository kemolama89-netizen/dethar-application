package com.dithar.app.floatingtasbeeh

import com.dithar.app.NotificationRoutes
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import com.dithar.app.MainActivity
import com.dithar.app.look.AppLook
import com.dithar.app.look.AppLookStore

/**
 * The Foreground Service that hosts the Floating Tasbeeh overlay window.
 * Deliberately thin: it owns the WindowManager/view lifecycle and wires
 * gestures to [FloatingTasbeehStore], which is the ONLY place a tap
 * actually gets persisted. This service never talks to DITHAR's web-side
 * Statistics/Shared Counting Core directly — it can't, since JS only runs
 * inside the Capacitor WebView, which this service does not depend on
 * being alive. Reconciliation happens later, from
 * FloatingTasbeehPlugin#drainPendingEvents, whenever the app is next
 * foregrounded (see floatingTasbeehSync.ts on the JS side).
 *
 * Two modes: full-screen counting (FullScreenCounterView — a tap anywhere above
 * its controls is one count) and the minimized pill (CounterPillView — a tap
 * expands, it never counts). It always starts as the pill. Neither mode can
 * trap anyone: full screen keeps its تصغير / إغلاق controls on screen, never
 * takes focus (Back, Home and the status bar keep working), folds back to the
 * pill after [CounterOverlayRules.IDLE_TO_PILL_MS] untouched, and the
 * notification carries تصغير / إيقاف as well.
 *
 * LIMITATION (documented, not an oversight): "ذكر مخصص" (Custom Dhikr) in
 * the Adhkar sheet just brings MainActivity to the foreground — it does not
 * deep-link to a specific in-app screen. Implementing that would need an
 * intent-extra contract with App.tsx's navigation state.
 */
class FloatingTasbeehService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var store: FloatingTasbeehStore

    // Two modes, one shown at a time: full-screen counting (FullScreenCounterView)
    // and the minimized pill (CounterPillView). It always starts as the pill.
    private var fullView: FullScreenCounterView? = null
    private var pillView: CounterPillView? = null
    private var pillParams: WindowManager.LayoutParams? = null
    private var mode = CounterOverlayRules.Mode.CLOSED

    // The calm-counting pacing gate — the SAME concept as TasbeehScreen's
    // own pacingPhase, just expressed as a plain timestamp check instead of
    // React state: a tap before this moment is silently ignored (see
    // handleTap). 0L means "ready right now" — the initial/just-selected
    // state, mirroring TasbeehScreen's own `pacingPhase = "ready"` default
    // on mount and on every dhikr switch (see applySelectedDhikr below).
    private var pacingReadyAtElapsedRealtime = 0L

    private lateinit var lookStore: AppLookStore
    private var lookColors: AppLook.Colors = AppLook.colors(AppLook.DEFAULT_LOOK)

    // Automatic dark mode "by time" can change while the app is closed.
    private val lookTick = Runnable { applyLook() }

    // Full screen left untouched folds back to the pill: it can never stay covering the phone.
    private val idleToPill = Runnable { go(CounterOverlayRules.Event.IDLE) }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        store = FloatingTasbeehStore(this)
        lookStore = AppLookStore(this)
        lookColors = lookStore.currentColors()
        activeInstance = this
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForegroundWithNotification()

        // Guards against a stale system-triggered restart (START_STICKY)
        // resurrecting the overlay after the user already disabled it from
        // Settings while the service was momentarily killed — persisted
        // `enabled` is always the source of truth, never "the service
        // happens to still be running".
        if (!store.isEnabled || !Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        when (intent?.action) {
            // The notification's own actions: a way out that never depends on the overlay itself.
            ACTION_STOP -> {
                go(CounterOverlayRules.Event.NOTIFICATION_STOP)
                return START_NOT_STICKY
            }
            // A restarted service that hasn't shown anything yet starts as the pill instead.
            ACTION_MINIMIZE -> go(if (mode == CounterOverlayRules.Mode.CLOSED) CounterOverlayRules.Event.START else CounterOverlayRules.Event.NOTIFICATION_MINIMIZE)
            else -> if (mode == CounterOverlayRules.Mode.CLOSED) go(CounterOverlayRules.Event.START)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(lookTick)
        mainHandler.removeCallbacks(idleToPill)
        removeFull()
        removePill()
        if (activeInstance === this) activeInstance = null
        super.onDestroy()
    }

    // ---- Modes (CounterOverlayRules.next decides; this only shows the result) ----

    private fun go(event: CounterOverlayRules.Event) {
        val next = CounterOverlayRules.next(mode, event)
        if (next == mode && event != CounterOverlayRules.Event.START) return
        mode = next
        when (next) {
            CounterOverlayRules.Mode.FULL -> showFull()
            CounterOverlayRules.Mode.PILL -> showPill()
            CounterOverlayRules.Mode.CLOSED -> closeOverlay()
        }
    }

    /** Full-screen counting over whatever app is open. */
    private fun showFull() {
        removePill()
        if (fullView == null) {
            val view = FullScreenCounterView(this, fullListener)
            view.showSheetRequested = { openAdhkarSheet() }
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                overlayWindowType(),
                // Never focusable: the phone's own Back, Home and the status bar keep working.
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT,
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                }
            }
            view.setColors(lookColors)
            fullView = view
            windowManager.addView(view, params)
        }
        applyScreen()
        applySelectedDhikr()
        restartIdleTimer()
        applyLook()
    }

    /** The minimized pill. */
    private fun showPill() {
        mainHandler.removeCallbacks(idleToPill)
        removeFull()
        if (pillView == null) {
            val density = resources.displayMetrics.density
            val w = ((CounterPillView.PILL_WIDTH_DP + 2 * CounterPillView.SHADOW_DP) * density).toInt()
            val h = ((CounterPillView.PILL_HEIGHT_DP + 2 * CounterPillView.SHADOW_DP) * density).toInt()
            val params = pillParams ?: WindowManager.LayoutParams(
                w,
                h,
                overlayWindowType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT,
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                val start = CounterOverlayRules.pillInitial(placementArea(), w, h, pillEdgeInsetPx())
                x = start.x
                y = start.y
            }
            pillParams = params
            val view = CounterPillView(this, pillListener)
            view.setColors(lookColors)
            pillView = view
            windowManager.addView(view, params)
        }
        applySelectedDhikr()
        applyLook()
    }

    private fun removeFull() {
        fullView?.let {
            it.stopAnimations()
            runCatching { windowManager.removeView(it) }
        }
        fullView = null
    }

    private fun removePill() {
        pillView?.let { runCatching { windowManager.removeView(it) } }
        pillView = null
    }

    private fun restartIdleTimer() {
        mainHandler.removeCallbacks(idleToPill)
        if (fullView != null) mainHandler.postDelayed(idleToPill, CounterOverlayRules.IDLE_TO_PILL_MS)
    }

    private val fullListener = object : FullScreenCounterView.Listener {
        override fun onCountTap() = handleTap()
        override fun onMinimize() = go(CounterOverlayRules.Event.MINIMIZE)
        override fun onClose() = go(CounterOverlayRules.Event.CLOSE)
        override fun onSelectDhikr(dhikrId: Int) {
            store.selectedDhikrId = dhikrId
            applySelectedDhikr()
            // Lets an already-mounted in-app Tasbeeh screen follow this
            // pick immediately (see selectedDhikrChanged in the plugin).
            notifySelectedDhikrChanged(dhikrId)
        }
        override fun onCustomDhikr() {
            go(CounterOverlayRules.Event.OPEN_APP)
            openApp()
        }
        override fun onOpenSettings() {
            go(CounterOverlayRules.Event.OPEN_APP)
            // Opens the app's existing Settings screen directly — the route
            // extra is read by FloatingTasbeehPlugin (see EXTRA_OPEN_ROUTE).
            openApp(FloatingTasbeehPlugin.ROUTE_SETTINGS)
        }
        override fun onActivity() = restartIdleTimer()
    }

    private val pillListener = object : CounterPillView.Listener {
        override fun onExpand() = go(CounterOverlayRules.Event.EXPAND)
        override fun onDrag(rawDx: Float, rawDy: Float) {
            val params = pillParams ?: return
            val view = pillView ?: return
            val moved = CounterOverlayRules.pillDrag(
                CounterOverlayRules.Position(params.x + rawDx.toInt(), params.y + rawDy.toInt()),
                placementArea(), params.width, params.height,
            )
            params.x = moved.x
            params.y = moved.y
            runCatching { windowManager.updateViewLayout(view, params) }
        }
        override fun onDragEnd() = settlePill()
    }

    /** The pill comes to rest against the nearer side edge, fully on screen. */
    private fun settlePill() {
        val params = pillParams ?: return
        val view = pillView ?: return
        val kept = CounterOverlayRules.pillSettle(CounterOverlayRules.Position(params.x, params.y), placementArea(), params.width, params.height, pillEdgeInsetPx())
        params.x = kept.x
        params.y = kept.y
        runCatching { windowManager.updateViewLayout(view, params) }
    }

    /** The pill sits [CounterPillView.EDGE_INSET_DP] in from the edge; its window already holds the shadow's room. */
    private fun pillEdgeInsetPx(): Int =
        ((CounterPillView.EDGE_INSET_DP - CounterPillView.SHADOW_DP) * resources.displayMetrics.density).toInt().coerceAtLeast(0)

    /** The Adhkar sheet: every dhikr with its own current count, the one being counted marked. */
    private fun openAdhkarSheet() {
        val rows = store.getDhikrLabels().map { (id, label) -> FullScreenCounterView.DhikrRow(id, label, store.getLiveCount(id)) }
        fullView?.showSheet(rows, store.selectedDhikrId)
    }

    /** Tells the full-screen view where the system bars are and how round the screen's corners are. */
    private fun applyScreen() {
        val view = fullView ?: return
        val area = placementArea()
        var corner: Int? = null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            corner = windowManager.currentWindowMetrics.windowInsets.getRoundedCorner(android.view.RoundedCorner.POSITION_TOP_LEFT)?.radius
        }
        view.setScreen(area.top, area.bottom, area.height, corner)
    }

    /** Brings both modes to the look that should show now. */
    private fun applyLook() {
        val colors = lookStore.currentColors()
        if (colors != lookColors) {
            lookColors = colors
            fullView?.setColors(colors)
            pillView?.setColors(colors)
        }
        mainHandler.removeCallbacks(lookTick)
        // Automatic dark mode by time: the colours change at the next switch (05:30 / 18:30) — one wakeup, not one a minute.
        if ((fullView != null || pillView != null) && lookStore.autoDark == "time") {
            val now = java.util.Calendar.getInstance()
            val wait = com.dithar.app.look.AppLook.millisUntilNextChange(now.get(java.util.Calendar.HOUR_OF_DAY) * 60 + now.get(java.util.Calendar.MINUTE), now.get(java.util.Calendar.SECOND))
            mainHandler.postDelayed(lookTick, wait + LOOK_TICK_SLACK_MS)
        }
    }

    /**
     * The screen as the overlay may use it: its size, and the room the status
     * bar (and any display cutout) and the navigation bar take.
     */
    private fun placementArea(): CounterOverlayRules.Area {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val metrics = windowManager.currentWindowMetrics
            val insets = metrics.windowInsets.getInsetsIgnoringVisibility(
                android.view.WindowInsets.Type.systemBars() or android.view.WindowInsets.Type.displayCutout(),
            )
            return CounterOverlayRules.Area(metrics.bounds.width(), metrics.bounds.height(), insets.top, insets.bottom)
        }
        val dm = resources.displayMetrics
        val statusBarId = resources.getIdentifier("status_bar_height", "dimen", "android")
        val statusBar = if (statusBarId > 0) resources.getDimensionPixelSize(statusBarId) else 0
        // Before Android 11 the display metrics already leave the navigation bar out.
        return CounterOverlayRules.Area(dm.widthPixels, dm.heightPixels, statusBar, 0)
    }

    /** The screen turned (or changed size): the pill stays on it, and full screen re-measures. */
    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        applyLook() // the phone's dark mode may be what changed
        applyScreen()
        settlePill()
    }

    /**
     * Closes the floating Tasbeeh and turns it OFF — the exact same persisted
     * state a Settings "Disable" would set (see FloatingTasbeehPlugin#setEnabled),
     * so the Settings screen correctly shows "تفعيل"/"Enable" afterward.
     * Deliberately NEVER touches [FloatingTasbeehStore.selectedDhikrId] or any
     * live-count/`live_count_*` value — closing is not a Reset: enabling it
     * again shows that SAME dhikr and its SAME persisted count.
     */
    private fun closeOverlay() {
        mainHandler.removeCallbacks(idleToPill)
        removeFull()
        removePill()
        store.isEnabled = false
        stopSelf()
    }

    private fun handleTap() {
        // A tap while the Adhkar sheet is open only closes it — never
        // counts — so dismissing it can't accidentally add a dhikr.
        if (fullView?.isSheetOpen == true) {
            fullView?.hideSheet()
            return
        }

        val dhikrId = store.selectedDhikrId
        val now = SystemClock.elapsedRealtime()

        // The SAME per-dhikr calm-counting pacing gate as the main Tasbeeh
        // screen (see tasbeehTiming.ts/TasbeehScreen.tsx's pacingPhase) —
        // a tap before the current dhikr's own pace has elapsed is
        // silently ignored: no count, no haptic, no Statistics record, no
        // warning. Mandatory, no bypass, exactly like the main screen.
        if (now < pacingReadyAtElapsedRealtime) return

        // Single valid tap = +1 once the pacing gate above has let it
        // through — see FloatingTasbeehStore#recordTapIfNotDuplicate's own
        // doc comment for the (much smaller, purely defensive)
        // duplicate-dispatch guard this DOES also apply, and why it is a
        // separate mechanism from the pacing gate.
        val accepted = store.recordTapIfNotDuplicate(dhikrId, now)
        if (accepted) {
            val readyDurationMs = store.getReadyDurationMs(dhikrId)
            fullView?.countAccepted(store.getLiveCount(dhikrId), readyDurationMs)
            pillView?.setCount(store.getLiveCount(dhikrId), store.getTarget(dhikrId))
            triggerHapticFeedback()
            pacingReadyAtElapsedRealtime = now + readyDurationMs
            // Event-driven, not polled: lets JS's reconcileFloatingTasbeeh
            // run immediately, even while this JS runtime is already alive
            // and foregrounded (a floating tap never itself triggers an
            // appStateChange, since the overlay never takes focus away
            // from DITHAR's own WebView) — see
            // FloatingTasbeehPlugin#load's registration of this listener.
            notifyPendingEventsChanged()
        }
    }

    /**
     * A short, light vibration for every ACCEPTED manual tap only — called
     * from nowhere else in this file, so drag, long-press, the × close
     * button, and a rejected (duplicate-dispatch) tap never vibrate. Safe
     * no-op on a device/emulator with no vibrator hardware.
     */
    private fun triggerHapticFeedback() {
        val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(VIBRATOR_SERVICE) as? Vibrator
        }
        if (vibrator?.hasVibrator() != true) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(HAPTIC_TAP_DURATION_MS, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(HAPTIC_TAP_DURATION_MS)
        }
    }

    /**
     * Re-reads the persisted selected dhikr and shows it in whichever mode is
     * up: its name, count and target, and a fresh, immediately-ready pacing
     * state — pacing is per-current-dhikr, never carried over from a
     * different one, mirroring TasbeehScreen's own `useEffect(..., [selectedId])`
     * reset. Shared by a pick in the Adhkar sheet and an in-app selection
     * pushed via the plugin.
     */
    private fun applySelectedDhikr() {
        val dhikrId = store.selectedDhikrId
        val count = store.getLiveCount(dhikrId)
        val target = store.getTarget(dhikrId)
        pacingReadyAtElapsedRealtime = 0L
        fullView?.setDhikr(store.getSelectedDhikrLabel(), count, target)
        fullView?.resetPacing()
        pillView?.setCount(count, target)
    }

    /** Shows [count] for the selected dhikr in whichever mode is up. */
    private fun showCount(count: Int) {
        val target = store.getTarget(store.selectedDhikrId)
        fullView?.setCount(count, target)
        pillView?.setCount(count, target)
    }

    private fun openApp(route: String? = null) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            if (route != null) putExtra(FloatingTasbeehPlugin.EXTRA_OPEN_ROUTE, route)
        }
        startActivity(intent)
    }

    private fun startForegroundWithNotification() {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                LABEL_NOTIFICATION_CHANNEL,
                NotificationManager.IMPORTANCE_MIN, // calm/quiet, per the feature's "low distraction" requirement
            )
            manager.createNotificationChannel(channel)
        }

        // A tap opens the Tasbeeh screen (NotificationRoutes), not just the app.
        val openAppIntent = NotificationRoutes.openIntent(this, NotificationRoutes.TASBEEH)
        // The channel-taking constructor is API 26+; minSdk is 24.
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
        // تصغير / إيقاف from the notification shade: a way out that never depends on the overlay itself.
        fun action(action: String, label: String, requestCode: Int): Notification.Action {
            val pending = PendingIntent.getService(
                this,
                requestCode,
                Intent(this, FloatingTasbeehService::class.java).setAction(action),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
            return Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), label, pending).build()
        }
        val notification: Notification = builder
            .setContentTitle(LABEL_NOTIFICATION_TITLE)
            .setContentText(LABEL_NOTIFICATION_BODY)
            .setSmallIcon(android.R.drawable.ic_menu_myplaces) // TODO: replace with a DITHAR-branded icon asset
            .setContentIntent(openAppIntent)
            .setOngoing(true)
            .addAction(action(ACTION_MINIMIZE, LABEL_ACTION_MINIMIZE, 1))
            .addAction(action(ACTION_STOP, LABEL_ACTION_STOP, 2))
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        /** Just past the switch, so the look is already the new one. */
        private const val LOOK_TICK_SLACK_MS = 1_000L
        private const val HAPTIC_TAP_DURATION_MS = 15L
        const val ACTION_MINIMIZE = "com.dithar.app.floatingtasbeeh.MINIMIZE"
        const val ACTION_STOP = "com.dithar.app.floatingtasbeeh.STOP"
        private const val CHANNEL_ID = "floating_tasbeeh"
        private const val NOTIFICATION_ID = 1001
        private const val LABEL_NOTIFICATION_CHANNEL = "السبحة العائمة"
        private const val LABEL_NOTIFICATION_TITLE = "السبحة العائمة نشطة"
        private const val LABEL_NOTIFICATION_BODY = "يمكنك التصغير أو الإيقاف من هنا متى شئت"
        private const val LABEL_ACTION_MINIMIZE = "تصغير"
        private const val LABEL_ACTION_STOP = "إيقاف"

        // The single running instance, if any — used ONLY by
        // refreshBubbleIfSelected()/refreshBubbleToZero() below (called
        // from FloatingTasbeehPlugin after a manual tap or Reset commits),
        // never for anything the service's own lifecycle depends on.
        // @Volatile: written from onCreate/onDestroy (main thread) and read
        // from refreshBubbleIfSelected/refreshBubbleToZero, which — unlike
        // every OTHER caller of `activeInstance` in this file — run on
        // Capacitor's OWN background plugin-call thread, not this
        // Service's own thread. Without this, the background thread has no
        // guaranteed visibility of a write made on the main thread.
        @Volatile
        private var activeInstance: FloatingTasbeehService? = null

        // Capacitor executes every @PluginMethod call (FloatingTasbeehPlugin's
        // syncLiveCount/resetAllLiveCounts included) on its OWN background
        // thread, never the main/UI thread — see Bridge.callPluginMethod's
        // `taskHandler.post(...)`. Touching a View (a counter view's own
        // setters call invalidate()) from any thread but the one that
        // created its window throws CalledFromWrongThreadException, an
        // uncaught exception on that background thread that crashes the
        // ENTIRE app process — this is the exact crash a Reset (or, more
        // rarely, a manual tap on whatever dhikr the bubble happens to
        // already be showing) was hitting. Every actual view mutation below
        // is therefore posted through this main-thread Handler instead of
        // running inline on the plugin's calling thread.
        private val mainHandler = Handler(Looper.getMainLooper())

        /**
         * Updates the bubble's own displayed number immediately if it's
         * currently showing [dhikrId] — called after a manual tap or a
         * single-dhikr Reset commits on the JS side (see
         * FloatingTasbeehPlugin#syncLiveCount). A safe no-op if the
         * service isn't running or is showing a different dhikr right now
         * (its own next selection/tap already reads the freshly-persisted
         * count then).
         */
        fun refreshBubbleIfSelected(dhikrId: Int, count: Int) {
            val instance = activeInstance ?: return
            mainHandler.post {
                if (instance.store.selectedDhikrId == dhikrId) instance.showCount(count)
            }
        }

        /**
         * Zeroes the bubble's OWN displayed number immediately — called
         * after TasbeehScreen's "Reset All" zeroes every dhikr's live
         * count at once (see FloatingTasbeehPlugin#resetAllLiveCounts).
         * Unlike [refreshBubbleIfSelected], this never needs to check
         * WHICH dhikr is selected: every one of them is now 0.
         */
        fun refreshBubbleToZero() {
            val instance = activeInstance ?: return
            mainHandler.post { instance.showCount(0) }
        }

        /** The app pushed a new look (RemindersPlugin#setAppLook). A safe no-op if the service isn't running. */
        fun refreshLook() {
            val instance = activeInstance ?: return
            mainHandler.post { instance.applyLook() }
        }

        /**
         * Re-applies the persisted selected dhikr to the running bubble —
         * called from FloatingTasbeehPlugin#setSelectedDhikr after an in-app
         * selection, so the bubble's name/size/count follow it. A safe
         * no-op if the service isn't running. Posted to the main thread for
         * the same reason as refreshBubbleIfSelected above.
         */
        fun refreshBubbleSelection() {
            val instance = activeInstance ?: return
            mainHandler.post { instance.applySelectedDhikr() }
        }

        /** The dhikr list (with each dhikr's target) was pushed again: the count's «من …» follows. */
        fun refreshTarget() {
            val instance = activeInstance ?: return
            mainHandler.post { instance.showCount(instance.store.getLiveCount(instance.store.selectedDhikrId)) }
        }

        // Set by FloatingTasbeehPlugin#load, cleared on handleOnDestroy —
        // the same plain callback-slot pattern as pendingEventsListener
        // below: fired when the floating menu picks a dhikr.
        private var selectedDhikrListener: ((Int) -> Unit)? = null

        fun setSelectedDhikrListener(listener: ((Int) -> Unit)?) {
            selectedDhikrListener = listener
        }

        fun notifySelectedDhikrChanged(dhikrId: Int) {
            selectedDhikrListener?.invoke(dhikrId)
        }

        // Set by FloatingTasbeehPlugin#load whenever a Capacitor bridge
        // (i.e. this JS runtime) is actually alive, cleared on
        // handleOnDestroy — see notifyPendingEventsChanged below. A plain
        // callback slot, not tied to activeInstance: the LISTENER'S
        // lifecycle is the JS bridge's, not this Service's, and either one
        // can outlive the other in either direction.
        private var pendingEventsListener: (() -> Unit)? = null

        fun setPendingEventsListener(listener: (() -> Unit)?) {
            pendingEventsListener = listener
        }

        /**
         * Fired the instant a floating tap is ACCEPTED (see handleTap) —
         * the event-driven half of Floating Tasbeeh <-> Statistics sync,
         * so JS's reconcileFloatingTasbeeh can run immediately instead of
         * waiting for the next app-foreground reconciliation (which a
         * floating tap never itself triggers, since the overlay is
         * FLAG_NOT_FOCUSABLE and never takes focus away from DITHAR's own
         * WebView). A safe no-op whenever no bridge is currently
         * listening — the tap is still safely queued in
         * PendingEventQueue regardless, and gets picked up by the next
         * app-start/foreground reconciliation exactly as before this
         * existed.
         */
        fun notifyPendingEventsChanged() {
            pendingEventsListener?.invoke()
        }

        fun start(context: android.content.Context) {
            val intent = Intent(context, FloatingTasbeehService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: android.content.Context) {
            context.stopService(Intent(context, FloatingTasbeehService::class.java))
        }
    }
}
