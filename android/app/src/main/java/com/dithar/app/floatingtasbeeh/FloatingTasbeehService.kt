package com.dithar.app.floatingtasbeeh

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
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
import android.view.View
import android.view.WindowManager
import android.widget.TextView
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
 * LIMITATION (documented, not an oversight): "ذكر مخصص" (Custom Dhikr) and
 * "الإعدادات" (Settings) in the long-press popup both just bring MainActivity
 * to the foreground — they do not deep-link to a specific in-app screen.
 * Implementing that would need an intent-extra contract with App.tsx's
 * navigation state, which is out of scope for this native-focused phase.
 */
class FloatingTasbeehService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var store: FloatingTasbeehStore
    private var bubbleView: FloatingBubbleView? = null
    private var bubbleParams: WindowManager.LayoutParams? = null
    private var popup: DhikrMenuPopup? = null
    private var closeButtonView: TextView? = null
    private var closeButtonParams: WindowManager.LayoutParams? = null

    // The calm-counting pacing gate — the SAME concept as TasbeehScreen's
    // own pacingPhase, just expressed as a plain timestamp check instead of
    // React state: a tap before this moment is silently ignored (see
    // handleTap). 0L means "ready right now" — the initial/just-selected
    // state, mirroring TasbeehScreen's own `pacingPhase = "ready"` default
    // on mount and on every dhikr switch (see onSelectDhikr below).
    private var pacingReadyAtElapsedRealtime = 0L

    private lateinit var lookStore: AppLookStore
    private var lookColors: AppLook.Colors = AppLook.colors(AppLook.DEFAULT_LOOK)

    // Automatic dark mode "by time" can change while the app is closed.
    private val lookTick = Runnable { applyLook() }

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
        // resurrecting the bubble after the user already disabled it from
        // Settings while the service was momentarily killed — persisted
        // `enabled` is always the source of truth, never "the service
        // happens to still be running".
        if (!store.isEnabled || !Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (bubbleView == null) {
            addBubble()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        mainHandler.removeCallbacks(lookTick)
        removePopupIfShowing()
        bubbleView?.resetPacing()
        bubbleView?.stopAnimations()
        bubbleView?.let { runCatching { windowManager.removeView(it) } }
        bubbleView = null
        closeButtonView?.let { runCatching { windowManager.removeView(it) } }
        closeButtonView = null
        if (activeInstance === this) activeInstance = null
        super.onDestroy()
    }

    private fun addBubble() {
        val density = resources.displayMetrics.density
        val label = store.getSelectedDhikrLabel()
        val sizePx = windowSizePx(bubbleSizeDpFor(label))

        val params = WindowManager.LayoutParams(
            sizePx,
            sizePx,
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            // Centred, a little below the middle of the screen (FloatingBubblePlacement).
            val start = FloatingBubblePlacement.initial(placementArea(), sizePx, closeRoomPx())
            x = start.x
            y = start.y
        }
        bubbleParams = params

        val view = FloatingBubbleView(
            context = this,
            windowManager = windowManager,
            layoutParams = params,
            onTap = ::handleTap,
            onLongPress = ::handleLongPress,
            onPositionChanged = ::onBubbleMoved,
            keepInBounds = { x, y -> FloatingBubblePlacement.clamp(FloatingBubblePlacement.Position(x, y), placementArea(), params.width, closeRoomPx()) },
        )
        view.colors = lookColors
        view.count = store.getLiveCount(store.selectedDhikrId)
        view.label = label
        // A fresh bubble always starts immediately ready — no carried-over
        // pacing from whatever the service was doing before it last
        // stopped, mirroring TasbeehScreen's own mount behavior.
        pacingReadyAtElapsedRealtime = 0L
        bubbleView = view
        windowManager.addView(view, params)

        addCloseButton(params)
        applyLook()
    }

    /** The bubble's window: the disc plus the room around it for its shadow and ripple. */
    private fun windowSizePx(discSizeDp: Int): Int =
        ((discSizeDp + 2 * FloatingBubbleView.HALO_DP) * resources.displayMetrics.density).toInt()

    /** Brings the bubble and its close button to the look that should show now. */
    private fun applyLook() {
        val colors = lookStore.currentColors()
        if (colors != lookColors) {
            lookColors = colors
            bubbleView?.colors = colors
            closeButtonView?.let { styleCloseButton(it) }
        }
        mainHandler.removeCallbacks(lookTick)
        if (bubbleView != null && lookStore.autoDark == "time") mainHandler.postDelayed(lookTick, LOOK_TICK_MS)
    }

    /**
     * Picks the SMALL bubble size unless [label] needs the LARGE one to
     * show complete (no ellipsis) — see FloatingBubbleView#labelFitsComplete,
     * which runs the exact same 2-line/shrink-to-fit search onDraw itself
     * uses, so this decision and what actually gets drawn can never
     * disagree with each other.
     */
    private fun bubbleSizeDpFor(label: String): Int {
        val density = resources.displayMetrics.density
        val smallRadiusPx = (BUBBLE_SIZE_SMALL_DP * density) / 2f
        return if (FloatingBubbleView.labelFitsComplete(label, smallRadiusPx)) {
            BUBBLE_SIZE_SMALL_DP
        } else {
            BUBBLE_SIZE_LARGE_DP
        }
    }

    /**
     * Grows or shrinks the ALREADY-SHOWING bubble's window to fit [label]
     * — called after the user selects a different dhikr (see
     * handleLongPress's onSelectDhikr below), since a shorter/longer
     * dhikr may need a different size than whatever the bubble was
     * created with. A no-op when the currently needed size already
     * matches (the common case — most selections don't cross the
     * small/large threshold), so an ordinary selection never triggers a
     * pointless relayout.
     */
    private fun resizeBubbleForLabel(label: String) {
        val params = bubbleParams ?: return
        val view = bubbleView ?: return
        val newSizePx = windowSizePx(bubbleSizeDpFor(label))
        if (params.width == newSizePx) return
        params.width = newSizePx
        params.height = newSizePx
        // A larger bubble still fits where it is: moved in from an edge if it would now cross one.
        val kept = FloatingBubblePlacement.clamp(FloatingBubblePlacement.Position(params.x, params.y), placementArea(), newSizePx, closeRoomPx())
        params.x = kept.x
        params.y = kept.y
        runCatching { windowManager.updateViewLayout(view, params) }
        // The bubble's own footprint just changed — the close button's
        // anchor offset (half the bubble's width) must be recomputed too.
        updateCloseButtonPosition(params.x, params.y)
    }

    /**
     * The room the close button needs above the bubble's window, px: its
     * height and gap, less the window's own empty room above the disc.
     */
    private fun closeRoomPx(): Int {
        val density = resources.displayMetrics.density
        return ((CLOSE_BUTTON_SIZE_DP + CLOSE_BUTTON_GAP_DP - FloatingBubbleView.HALO_DP) * density).toInt()
    }

    /**
     * The screen as the bubble may use it: its size, and the room the status
     * bar (and any display cutout) and the navigation bar take — the bubble
     * never covers them (FloatingBubblePlacement).
     */
    private fun placementArea(): FloatingBubblePlacement.Area {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val metrics = windowManager.currentWindowMetrics
            val insets = metrics.windowInsets.getInsetsIgnoringVisibility(
                android.view.WindowInsets.Type.systemBars() or android.view.WindowInsets.Type.displayCutout(),
            )
            return FloatingBubblePlacement.Area(metrics.bounds.width(), metrics.bounds.height(), insets.top, insets.bottom)
        }
        val dm = resources.displayMetrics
        val statusBarId = resources.getIdentifier("status_bar_height", "dimen", "android")
        val statusBar = if (statusBarId > 0) resources.getDimensionPixelSize(statusBarId) else 0
        // Before Android 11 the display metrics already leave the navigation bar out.
        return FloatingBubblePlacement.Area(dm.widthPixels, dm.heightPixels, statusBar, 0)
    }

    /** The screen turned (or changed size): the bubble stays fully on it. */
    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        applyLook() // the phone's dark mode may be what changed
        val params = bubbleParams ?: return
        val view = bubbleView ?: return
        val kept = FloatingBubblePlacement.clamp(FloatingBubblePlacement.Position(params.x, params.y), placementArea(), params.width, closeRoomPx())
        if (kept.x == params.x && kept.y == params.y) return
        params.x = kept.x
        params.y = kept.y
        runCatching { windowManager.updateViewLayout(view, params) }
        onBubbleMoved(params.x, params.y)
    }

    /**
     * The small "×" hide/close affordance anchored just above the bubble —
     * a plain click target (never draggable, never ambiguous with the
     * bubble's own tap/long-press/drag gestures, which it shares no touch
     * handling with) that only removes the overlay for THIS running
     * instance (see [closeBubble]). It never touches
     * [FloatingTasbeehStore.isEnabled] — the Settings toggle is the only
     * thing that persists on/off.
     */
    private fun addCloseButton(anchorBubbleParams: WindowManager.LayoutParams) {
        val view = TextView(this).apply {
            text = "×"
            textSize = 14f
            gravity = Gravity.CENTER
            setOnClickListener { closeBubble() }
        }
        styleCloseButton(view)

        val density = resources.displayMetrics.density
        val sizePx = (CLOSE_BUTTON_SIZE_DP * density).toInt()
        val params = WindowManager.LayoutParams(
            sizePx,
            sizePx,
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply { gravity = Gravity.TOP or Gravity.START }
        positionCloseButton(params, anchorBubbleParams.x, anchorBubbleParams.y)

        closeButtonView = view
        closeButtonParams = params
        windowManager.addView(view, params)
    }

    /** The close button in the active look: the bubble's deep colour, ink and gold. */
    private fun styleCloseButton(view: TextView) {
        view.setTextColor(Color.parseColor(lookColors.ink))
        view.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor(lookColors.deepBottom))
            setStroke((resources.displayMetrics.density * 1.2f).toInt(), Color.parseColor(lookColors.gold))
        }
    }

    /**
     * Fired on every drag move: keeps the close button AND the open dhikr
     * menu (if any) attached to the bubble, continuously — not only after
     * the finger lifts.
     */
    private fun onBubbleMoved(bubbleX: Int, bubbleY: Int) {
        updateCloseButtonPosition(bubbleX, bubbleY)
        popup?.reposition()
    }

    /** Keeps the close button anchored just above the bubble as it's dragged. */
    private fun updateCloseButtonPosition(bubbleX: Int, bubbleY: Int) {
        val params = closeButtonParams ?: return
        val view = closeButtonView ?: return
        positionCloseButton(params, bubbleX, bubbleY)
        runCatching { windowManager.updateViewLayout(view, params) }
    }

    private fun positionCloseButton(params: WindowManager.LayoutParams, bubbleX: Int, bubbleY: Int) {
        val density = resources.displayMetrics.density
        // Reads the bubble's CURRENT (possibly LARGE-sized) window width
        // rather than a fixed constant, so the close button stays
        // correctly centered above the bubble regardless of which size it
        // was created or resized to — see bubbleSizeDpFor/resizeBubbleForLabel.
        val bubbleSizePx = bubbleParams?.width ?: (BUBBLE_SIZE_SMALL_DP * density).toInt()
        val closeSizePx = (CLOSE_BUTTON_SIZE_DP * density).toInt()
        val gapPx = (CLOSE_BUTTON_GAP_DP * density).toInt()
        val haloPx = (FloatingBubbleView.HALO_DP * density).toInt()
        params.x = bubbleX + (bubbleSizePx - closeSizePx) / 2
        // Just above the disc itself, inside the top of the window's empty room.
        params.y = bubbleY + haloPx - closeSizePx - gapPx
    }

    /**
     * Hides the floating bubble (and its close button) and turns Floating
     * Tasbeeh OFF — the exact same persisted state a Settings "Disable"
     * would set (see FloatingTasbeehPlugin#setEnabled), so the Settings
     * screen correctly shows "تفعيل"/"Enable" afterward instead of
     * silently drifting out of sync with what's actually on screen.
     * Deliberately NEVER touches [FloatingTasbeehStore.selectedDhikrId] or
     * any live-count/`live_count_*` value — × is a hide/stop action, not a
     * Reset: pressing "تفعيل" in Settings afterward calls
     * FloatingTasbeehPlugin#setEnabled(true), which starts this service
     * fresh via [addBubble] — reading that SAME still-selected dhikr and
     * its SAME still-persisted counter back out, unresetted.
     */
    private fun closeBubble() {
        store.isEnabled = false
        stopSelf()
    }

    private fun handleTap() {
        // A tap while the dhikr menu is open only closes the menu — never
        // counts — so dismissing it can't accidentally add a dhikr.
        if (popup?.isShowing == true) {
            removePopupIfShowing()
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
            bubbleView?.countAccepted(store.getLiveCount(dhikrId))
            triggerHapticFeedback()
            val readyDurationMs = store.getReadyDurationMs(dhikrId)
            pacingReadyAtElapsedRealtime = now + readyDurationMs
            bubbleView?.startPacing(readyDurationMs)
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

    private fun handleLongPress() {
        val params = bubbleParams ?: return
        if (popup?.isShowing == true) return

        popup = DhikrMenuPopup(
            context = this,
            windowManager = windowManager,
            anchorParams = params,
            dhikrItems = store.getDhikrLabels(),
            selectedDhikrId = store.selectedDhikrId,
            colors = lookColors,
            customDhikrLabel = LABEL_CUSTOM_DHIKR,
            settingsLabel = LABEL_SETTINGS,
            onSelectDhikr = { dhikrId, _ ->
                store.selectedDhikrId = dhikrId
                applySelectedDhikrToBubble()
                // Lets an already-mounted in-app Tasbeeh screen follow this
                // pick immediately (see selectedDhikrChanged in the plugin).
                notifySelectedDhikrChanged(dhikrId)
            },
            onCustomDhikr = { openApp() },
            // Opens the app's existing Settings screen directly — the route
            // extra is read by FloatingTasbeehPlugin (see EXTRA_OPEN_ROUTE).
            onOpenSettings = { openApp(FloatingTasbeehPlugin.ROUTE_SETTINGS) },
        ).also { it.show() }
    }

    /**
     * Re-reads the persisted selected dhikr and reflects it on the bubble:
     * its count, its name (and the size that name needs), and a fresh,
     * immediately-ready pacing state — pacing is per-current-dhikr, never
     * carried over from a different one's in-progress ring, mirroring
     * TasbeehScreen's own `useEffect(..., [selectedId])` reset. Shared by a
     * floating-menu pick and an in-app selection pushed via the plugin.
     */
    private fun applySelectedDhikrToBubble() {
        val dhikrId = store.selectedDhikrId
        val label = store.getSelectedDhikrLabel()
        bubbleView?.count = store.getLiveCount(dhikrId)
        bubbleView?.label = label
        resizeBubbleForLabel(label)
        pacingReadyAtElapsedRealtime = 0L
        bubbleView?.resetPacing()
    }

    private fun removePopupIfShowing() {
        popup?.dismiss()
        popup = null
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

        val openAppIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        // The channel-taking constructor is API 26+; minSdk is 24.
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL_ID) else Notification.Builder(this)
        val notification: Notification = builder
            .setContentTitle(LABEL_NOTIFICATION_TITLE)
            .setContentText(LABEL_NOTIFICATION_BODY)
            .setSmallIcon(android.R.drawable.ic_menu_myplaces) // TODO: replace with a DITHAR-branded icon asset
            .setContentIntent(openAppIntent)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        // The normal size for the majority of the library's short dhikr — a
        // little larger than the original 56dp, for comfortable repeated thumb taps.
        private const val LOOK_TICK_MS = 60_000L
        private const val BUBBLE_SIZE_SMALL_DP = 64
        // A moderate, capped increase — never grows further/continuously
        // beyond this — for the handful of long dhikr whose text can't
        // show complete at the small size (see labelFitsComplete/
        // bubbleSizeDpFor). Roughly 2x the small bubble's AREA, still a
        // clearly "bubble-sized" overlay, not a card.
        private const val BUBBLE_SIZE_LARGE_DP = 88
        private const val CLOSE_BUTTON_SIZE_DP = 20
        private const val CLOSE_BUTTON_GAP_DP = 4
        private const val HAPTIC_TAP_DURATION_MS = 15L
        private const val CHANNEL_ID = "floating_tasbeeh"
        private const val NOTIFICATION_ID = 1001
        private const val LABEL_NOTIFICATION_CHANNEL = "السبحة العائمة"
        private const val LABEL_NOTIFICATION_TITLE = "السبحة العائمة نشطة"
        private const val LABEL_NOTIFICATION_BODY = "اضغط لإيقاف السبحة العائمة من الإعدادات"
        private const val LABEL_CUSTOM_DHIKR = "ذكر مخصص"
        private const val LABEL_SETTINGS = "الإعدادات"

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
        // `taskHandler.post(...)`. Touching a View (bubbleView.count's own
        // setter calls invalidate()) from any thread but the one that
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
                if (instance.store.selectedDhikrId == dhikrId) {
                    instance.bubbleView?.count = count
                }
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
            mainHandler.post {
                instance.bubbleView?.count = 0
            }
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
            mainHandler.post { instance.applySelectedDhikrToBubble() }
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
