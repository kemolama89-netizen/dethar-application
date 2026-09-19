package com.dithar.app.floatingtasbeeh

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

/**
 * The popup a long-press on the bubble opens: a SCROLLABLE row for every
 * dhikr in the full Tasbeeh library (real ids/labels pushed from JS — see
 * FloatingTasbeehStore#setDhikrLabels, the single source of truth is
 * src/data/tasbeeh-library.json, never hardcoded Arabic text here), then
 * "ذكر مخصص" (Custom Dhikr) and "الإعدادات" (Settings) as two fixed action
 * rows. Selecting a dhikr keeps the bubble itself visible and simply
 * changes which dhikr it's counting for — this popup never replaces or
 * hides the bubble.
 *
 * Scrollable because the library's length is content-driven (16 items as
 * of writing, and growing over time), not a fixed small set — unlike the
 * old 4-item quick-access design, it can't assume the list always fits on
 * screen.
 *
 * "ذكر مخصص" and "الإعدادات" both just bring DITHAR to the foreground
 * (MainActivity) rather than deep-linking to a specific in-app screen —
 * see FloatingTasbeehService's own doc comment for why that's a
 * deliberate, documented Phase 2 limitation rather than an oversight.
 */
class DhikrMenuPopup(
    private val context: Context,
    private val windowManager: WindowManager,
    private val anchorParams: WindowManager.LayoutParams,
    private val dhikrItems: List<Pair<Int, String>>, // (dhikrId, label) — pushed from JS, full library
    private val customDhikrLabel: String,
    private val settingsLabel: String,
    private val onSelectDhikr: (dhikrId: Int, label: String) -> Unit,
    private val onCustomDhikr: () -> Unit,
    private val onOpenSettings: () -> Unit,
) {
    private var popupView: View? = null
    private var popupParams: WindowManager.LayoutParams? = null
    // The list's natural (unconstrained) size, measured once in show() —
    // reposition() re-clamps against the CURRENT space around the bubble
    // every time it's called, so it needs these, not a one-time height.
    private var naturalWidthPx = 0
    private var naturalHeightPx = 0

    fun show() {
        if (popupView != null) return // already open — long-press can't double-open

        val container = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val pad = (context.resources.displayMetrics.density * 6f).toInt()
            setPadding(pad, pad, pad, pad)
        }

        dhikrItems.forEach { (dhikrId, label) ->
            container.addView(row(label) {
                dismiss()
                onSelectDhikr(dhikrId, label)
            })
        }
        container.addView(divider())
        container.addView(row(customDhikrLabel) {
            dismiss()
            onCustomDhikr()
        })
        container.addView(row(settingsLabel) {
            dismiss()
            onOpenSettings()
        })

        val scrollView = ScrollView(context).apply {
            isVerticalScrollBarEnabled = true
            background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = context.resources.displayMetrics.density * 16f
                setColor(Color.parseColor("#FBF6EC"))
                setStroke((context.resources.displayMetrics.density * 1.5f).toInt(), Color.parseColor("#E4D3A6"))
            }
            addView(container)
        }

        // Cap the popup's height to a fraction of the screen so it can
        // never render off the top/bottom of the display regardless of how
        // long the dhikr library grows — measured against the container's
        // OWN natural (unconstrained) height first, so a short list still
        // just wraps tightly instead of always reserving the max height.
        container.measure(
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
        )
        val maxHeightPx = (context.resources.displayMetrics.heightPixels * 0.6f).toInt()
        naturalWidthPx = container.measuredWidth
        naturalHeightPx = minOf(container.measuredHeight, maxHeightPx)

        val params = WindowManager.LayoutParams(
            naturalWidthPx,
            naturalHeightPx,
            overlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            android.graphics.PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
        }
        // Anchored to the bubble, not centered on screen — reads as
        // belonging to the bubble, the same way the web app's own
        // long-press affordances stay attached to their trigger element
        // rather than opening a full-screen sheet. See placeNextToAnchor.
        placeNextToAnchor(params)

        windowManager.addView(scrollView, params)
        popupView = scrollView
        popupParams = params

        // Tapping anywhere outside the popup dismisses it — a transparent,
        // full-screen "catcher" behind it would be the alternative, but a
        // simple outside-touch listener on the popup's own window keeps
        // this to one added view instead of two. Returning false here
        // still lets ScrollView's own default touch handling (the actual
        // scroll gesture) run afterward — see View#onTouchEvent's listener
        // dispatch order.
        scrollView.setOnTouchListener { _, _ -> false }
    }

    fun dismiss() {
        popupView?.let { runCatching { windowManager.removeView(it) } }
        popupView = null
        popupParams = null
    }

    /**
     * Re-anchors the open menu to the bubble's CURRENT position — called on
     * every drag move (see FloatingTasbeehService's onPositionChanged), so
     * the menu follows the bubble continuously instead of staying where it
     * first opened. [anchorParams] is the bubble's own live LayoutParams
     * object, so it always holds the latest x/y. A no-op when not showing.
     */
    fun reposition() {
        val view = popupView ?: return
        val params = popupParams ?: return
        placeNextToAnchor(params)
        runCatching { windowManager.updateViewLayout(view, params) }
    }

    /**
     * Places the menu directly below the bubble, or above it (clearing the
     * × close button that sits there) when there's more room above, and
     * clamps it to the screen — shrinking its height to the space actually
     * available on that side, so it never covers the bubble itself (which
     * would make the bubble undraggable) or runs off-screen.
     */
    private fun placeNextToAnchor(params: WindowManager.LayoutParams) {
        val metrics = context.resources.displayMetrics
        val density = metrics.density
        val gapPx = (MENU_GAP_DP * density).toInt()
        val closeClearancePx = (CLOSE_BUTTON_CLEARANCE_DP * density).toInt()

        val placement = computeMenuPlacement(
            anchorX = anchorParams.x,
            anchorY = anchorParams.y,
            anchorHeight = anchorParams.height,
            menuWidth = naturalWidthPx,
            menuNaturalHeight = naturalHeightPx,
            screenWidth = metrics.widthPixels,
            screenHeight = metrics.heightPixels,
            gap = gapPx,
            closeClearance = closeClearancePx,
        )
        params.x = placement.x
        params.y = placement.y
        params.height = placement.height
    }

    val isShowing: Boolean get() = popupView != null

    private fun row(label: String, onClick: () -> Unit): TextView = TextView(context).apply {
        text = label
        textSize = 14f
        setTextColor(Color.parseColor("#2B2118"))
        gravity = Gravity.CENTER
        val padH = (context.resources.displayMetrics.density * 18f).toInt()
        val padV = (context.resources.displayMetrics.density * 10f).toInt()
        setPadding(padH, padV, padH, padV)
        setOnClickListener { onClick() }
    }

    private fun divider(): View = View(context).apply {
        setBackgroundColor(Color.parseColor("#E4D3A6"))
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            (context.resources.displayMetrics.density).toInt(),
        )
    }

    companion object {
        private const val MENU_GAP_DP = 6
        // The × close button's own 20dp + 4dp gap above the bubble (see
        // FloatingTasbeehService) — the menu flips above that, not the bubble.
        private const val CLOSE_BUTTON_CLEARANCE_DP = 24

        data class MenuPlacement(val x: Int, val y: Int, val height: Int)

        /**
         * Pure placement math (no Android types, so it's unit-testable):
         * below the bubble when it fits or has at least as much room as
         * above, otherwise above (clearing the close button); height is
         * shrunk to the chosen side's free space; x is clamped on-screen.
         */
        fun computeMenuPlacement(
            anchorX: Int,
            anchorY: Int,
            anchorHeight: Int,
            menuWidth: Int,
            menuNaturalHeight: Int,
            screenWidth: Int,
            screenHeight: Int,
            gap: Int,
            closeClearance: Int,
        ): MenuPlacement {
            val belowTop = anchorY + anchorHeight + gap
            val spaceBelow = screenHeight - belowTop
            val spaceAbove = anchorY - closeClearance - gap

            val x = anchorX.coerceIn(0, (screenWidth - menuWidth).coerceAtLeast(0))
            return if (spaceBelow >= menuNaturalHeight || spaceBelow >= spaceAbove) {
                MenuPlacement(x, belowTop, minOf(menuNaturalHeight, spaceBelow).coerceAtLeast(1))
            } else {
                val height = minOf(menuNaturalHeight, spaceAbove).coerceAtLeast(1)
                MenuPlacement(x, anchorY - closeClearance - gap - height, height)
            }
        }
    }
}

/**
 * TYPE_APPLICATION_OVERLAY (API 26+) is the modern replacement for the
 * legacy TYPE_PHONE/TYPE_SYSTEM_ALERT window types — used consistently by
 * both the bubble itself (see FloatingTasbeehService) and this popup.
 * DITHAR's realistic minSdk is well above 26, so no legacy fallback branch
 * is included.
 */
fun overlayWindowType(): Int = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
