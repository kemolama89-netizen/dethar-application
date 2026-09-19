package com.dithar.app.floatingtasbeeh

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.LinearInterpolator
import kotlin.math.abs

/**
 * The Floating Tasbeeh bubble itself — a single self-drawn CIRCLE (never a
 * View hierarchy with a background drawable + child views, which risks
 * ever reading as a "card"). Deliberately minimal: a soft ivory/gold glass
 * fill echoing the web app's own Tasbeeh circle (see TasbeehScreen.tsx's
 * `--color-glass-*` tokens), a short excerpt of the selected dhikr's own
 * text (see [label]), and the live count — no icon, no other secondary
 * text. Colors here are a fixed, representative DITHAR palette rather than
 * a live read of the web app's active theme/palette (PaletteContext) —
 * syncing the native bubble to whichever palette/theme is currently
 * selected in-app is a reasonable future enhancement, out of scope for
 * this phase.
 *
 * Touch handling is a single, deliberate state machine — NOT a plain
 * View.OnClickListener — because this view must be BOTH draggable
 * (reposition anywhere on screen, like AssistiveTouch) and tappable, and a
 * naive raw ACTION_DOWN/ACTION_UP diff can misfire a "click" out of what
 * was actually a drag, or fire twice for one gesture. GestureDetector's
 * onSingleTapConfirmed is the correct, standard Android API for exactly
 * this — it is specifically designed to fire ONCE per genuine tap and
 * never during a scroll/drag or a double-tap. Dragging is handled
 * separately via onScroll, updating this view's own WindowManager layout
 * position directly.
 */
class FloatingBubbleView(
    context: Context,
    private val windowManager: WindowManager,
    private val layoutParams: WindowManager.LayoutParams,
    private val onTap: () -> Unit,
    private val onLongPress: () -> Unit,
    // Fired with the bubble's own new (x, y) window position whenever a
    // drag actually moves it, so a companion overlay (the close button)
    // anchored to the bubble can follow it — purely additive to the
    // existing drag handling below, never itself consulted for whether a
    // gesture IS a drag.
    private val onPositionChanged: (x: Int, y: Int) -> Unit = { _, _ -> },
) : View(context) {

    var count: Int = 0
        set(value) {
            field = value
            invalidate()
        }

    // The currently selected dhikr's own Arabic text (set from
    // FloatingTasbeehService#addBubble/onSelectDhikr — never derived here),
    // so the user can see at a glance which dhikr the bubble is counting
    // without opening the long-press menu. onDraw wraps it onto up to 2
    // lines and shrinks it as needed — see buildLabelLayout() below —
    // falling back to an ellipsis only for the handful of library entries
    // too long to ever fit two lines legibly even at the LARGE bubble size
    // (see FloatingTasbeehService's own BUBBLE_SIZE_LARGE_DP and
    // labelFitsComplete() below, which decides which size a given label
    // needs BEFORE the bubble's window is even created).
    var label: String = ""
        set(value) {
            field = value
            invalidate()
        }

    // The SAME calm-counting pacing visual as the main Tasbeeh screen's own
    // ring (see TasbeehScreen.tsx's pacingPhase/pacingFraction and
    // tasbeehTiming.ts) — only shown while pacing (mirroring
    // `{pacingPhase === "pacing" && (...)}`), never altering the bubble's
    // resting appearance. The actual TAP GATE lives in
    // FloatingTasbeehService (a plain elapsed-time check, independent of
    // this animation's own frame timing) — this is purely the visual sweep
    // for it; [startPacing]/[resetPacing] never themselves decide whether a
    // tap counts.
    private var isPacing = false
    private var pacingFraction = 0f
    private var pacingAnimator: ValueAnimator? = null

    /** Starts the sweep for [durationMs] — called only after an ACCEPTED tap. */
    fun startPacing(durationMs: Long) {
        pacingAnimator?.cancel()
        isPacing = true
        pacingFraction = 0f
        pacingAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = durationMs
            interpolator = LinearInterpolator() // real elapsed time, not eased — matches TasbeehScreen's own requestAnimationFrame-driven fraction
            addUpdateListener {
                pacingFraction = it.animatedValue as Float
                invalidate()
            }
            addListener(
                object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) {
                        isPacing = false
                        invalidate()
                    }
                },
            )
            start()
        }
    }

    /**
     * Cancels any in-progress sweep and returns to the plain "ready"
     * appearance — called on bubble (re)creation and on every dhikr
     * selection change, mirroring TasbeehScreen's own per-Dhikr reset
     * effect ("switching Dhikr always presents a fresh, immediately-ready
     * circle").
     */
    fun resetPacing() {
        pacingAnimator?.cancel()
        pacingAnimator = null
        isPacing = false
        pacingFraction = 0f
        invalidate()
    }

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = context.resources.displayMetrics.density * 2f
        color = Color.parseColor(GOLD)
    }
    // The dimmed "track" behind the pacing sweep — same stroke width as
    // ringPaint, only shown while isPacing (see onDraw), so the bubble's
    // resting appearance (isPacing == false) is completely unchanged.
    private val pacingTrackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = context.resources.displayMetrics.density * 2f
        color = Color.parseColor(PACING_TRACK_COLOR)
    }
    private val countPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor(TEXT_DARK)
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }
    private val labelPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor(TEXT_DARK)
    }

    // A tap is only recognized as a drag once real finger movement exceeds
    // Android's own registered touch-slop for this device — never a fixed
    // guess — so a genuine stationary tap is never misread as a
    // micro-drag on high-density/high-sensitivity screens.
    private val touchSlop = android.view.ViewConfiguration.get(context).scaledTouchSlop
    private var downRawX = 0f
    private var downRawY = 0f
    private var downParamX = 0
    private var downParamY = 0
    private var isDragging = false

    private val gestureDetector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
                onTap()
                return true
            }

            override fun onLongPress(e: MotionEvent) {
                onLongPress()
            }
        },
    )

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        gestureDetector.onTouchEvent(event)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downRawX = event.rawX
                downRawY = event.rawY
                downParamX = layoutParams.x
                downParamY = layoutParams.y
                isDragging = false
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.rawX - downRawX
                val dy = event.rawY - downRawY
                if (isDragging || abs(dx) > touchSlop || abs(dy) > touchSlop) {
                    isDragging = true
                    layoutParams.x = downParamX + dx.toInt()
                    layoutParams.y = downParamY + dy.toInt()
                    windowManager.updateViewLayout(this, layoutParams)
                    onPositionChanged(layoutParams.x, layoutParams.y)
                }
            }
            else -> Unit
        }
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        val radius = (minOf(width, height) / 2f) - ringPaint.strokeWidth

        fillPaint.shader = RadialGradient(
            cx - radius * 0.3f,
            cy - radius * 0.35f,
            radius * 1.6f,
            Color.parseColor(GLASS_HIGHLIGHT),
            Color.parseColor(GLASS_BASE),
            Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(cx, cy, radius, fillPaint)
        if (isPacing) {
            // The dimmed track (the same ring, muted) plus a clockwise
            // sweep arc from 12 o'clock proportional to pacingFraction —
            // the native equivalent of TasbeehScreen's own SVG
            // stroke-dasharray sweep, driven by the identical
            // elapsed-time/readyDurationMs relationship (see
            // FloatingTasbeehService#handleTap and startPacing above).
            canvas.drawCircle(cx, cy, radius, pacingTrackPaint)
            val sweepRect = RectF(cx - radius, cy - radius, cx + radius, cy + radius)
            canvas.drawArc(sweepRect, -90f, 360f * pacingFraction, false, ringPaint)
        } else {
            canvas.drawCircle(cx, cy, radius, ringPaint)
        }

        if (label.isEmpty()) {
            // No selected-dhikr label yet (e.g. a service restart racing
            // the app's own startup, before JS has pushed the library) —
            // fall back to the original single-line, count-only layout
            // rather than showing a stray empty line above the count.
            countPaint.textSize = radius * 0.62f
            val countY = cy - (countPaint.descent() + countPaint.ascent()) / 2f
            canvas.drawText(count.toString(), cx, countY, countPaint)
            return
        }

        countPaint.textSize = radius * COUNT_TEXT_SIZE_FACTOR
        val countHeight = countPaint.descent() - countPaint.ascent()

        // Total vertical budget for the label+count block together, inset
        // from the bubble's own diameter so both lines stay inside the
        // circle (a flat rectangular approximation of the circle's usable
        // width/height — the same approximation the single-line layout
        // already relied on, just extended to two lines).
        val maxWidthPx = (radius * LABEL_MAX_WIDTH_FACTOR).toInt().coerceAtLeast(1)
        val maxLabelHeightPx = (radius * LABEL_MAX_HEIGHT_FACTOR - countHeight).coerceAtLeast(radius * LABEL_MIN_HEIGHT_FACTOR)
        val labelLayout = buildLabelLayout(label, radius, maxWidthPx, maxLabelHeightPx)

        val totalHeight = labelLayout.height + countHeight
        val blockTop = cy - totalHeight / 2f

        canvas.save()
        canvas.translate(cx - maxWidthPx / 2f, blockTop)
        labelLayout.draw(canvas)
        canvas.restore()

        val countBaseline = blockTop + labelLayout.height - countPaint.ascent()
        canvas.drawText(count.toString(), cx, countBaseline, countPaint)
    }

    /**
     * Lays out [text] centered, wrapped to fit [maxWidthPx], searching from
     * a comfortable size down to a minimum readable size for the LARGEST
     * size that still shows the text COMPLETE within 2 lines and within
     * [maxHeightPx] — never truncating while a smaller-but-legible size
     * would still show it whole. Only the handful of library entries too
     * long to ever fit two lines at the minimum size fall back to an
     * ellipsis, rather than overflowing the bubble or silently dropping
     * words.
     */
    private fun buildLabelLayout(text: String, radius: Float, maxWidthPx: Int, maxHeightPx: Float): StaticLayout {
        val maxTextSize = radius * LABEL_MAX_TEXT_SIZE_FACTOR
        val minTextSize = radius * LABEL_MIN_TEXT_SIZE_FACTOR
        val stepPx = radius * LABEL_TEXT_SIZE_STEP_FACTOR

        var size = maxTextSize
        while (size > minTextSize) {
            labelPaint.textSize = size
            val layout = StaticLayout.Builder.obtain(text, 0, text.length, labelPaint, maxWidthPx)
                .setAlignment(Layout.Alignment.ALIGN_CENTER)
                .setIncludePad(false)
                .build()
            if (layout.lineCount <= 2 && layout.height <= maxHeightPx) {
                return layout
            }
            size -= stepPx
        }

        labelPaint.textSize = minTextSize
        return StaticLayout.Builder.obtain(text, 0, text.length, labelPaint, maxWidthPx)
            .setAlignment(Layout.Alignment.ALIGN_CENTER)
            .setIncludePad(false)
            .setMaxLines(2)
            .setEllipsize(TextUtils.TruncateAt.END)
            .setEllipsizedWidth(maxWidthPx)
            .build()
    }

    companion object {
        private const val GLASS_BASE = "#F3ECDC"
        private const val GLASS_HIGHLIGHT = "#FFFDF6"
        private const val GOLD = "#C9A227"
        private const val TEXT_DARK = "#2B2118"
        // The same soft gold/track color DhikrMenuPopup already uses for
        // its own border — reused here, not a new color introduced for
        // this feature.
        private const val PACING_TRACK_COLOR = "#E4D3A6"

        // Shared between buildLabelLayout's own search above and
        // labelFitsComplete below — one set of constants so the two can
        // never silently drift apart from each other.
        private const val LABEL_MAX_TEXT_SIZE_FACTOR = 0.32f
        private const val LABEL_MIN_TEXT_SIZE_FACTOR = 0.14f
        private const val LABEL_TEXT_SIZE_STEP_FACTOR = 0.015f
        private const val LABEL_MAX_WIDTH_FACTOR = 1.7f
        private const val LABEL_MAX_HEIGHT_FACTOR = 1.7f
        private const val LABEL_MIN_HEIGHT_FACTOR = 0.3f
        private const val COUNT_TEXT_SIZE_FACTOR = 0.5f

        /**
         * Whether [label] can be shown COMPLETE — no ellipsis fallback
         * needed — within a circle of [radius] pixels, using the exact
         * same 2-line/shrink-to-fit search buildLabelLayout (used by
         * onDraw) relies on. Called from FloatingTasbeehService BEFORE
         * the bubble's window is even created/resized, to decide whether
         * the normal bubble size is enough for the currently selected
         * dhikr or whether to grow to the large size instead — see
         * FloatingTasbeehService's own BUBBLE_SIZE_LARGE_DP.
         */
        fun labelFitsComplete(label: String, radius: Float): Boolean {
            if (label.isEmpty()) return true
            val paint = TextPaint(Paint.ANTI_ALIAS_FLAG)
            val countPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = radius * COUNT_TEXT_SIZE_FACTOR }
            val countHeight = countPaint.descent() - countPaint.ascent()
            val maxWidthPx = (radius * LABEL_MAX_WIDTH_FACTOR).toInt().coerceAtLeast(1)
            val maxHeightPx = (radius * LABEL_MAX_HEIGHT_FACTOR - countHeight).coerceAtLeast(radius * LABEL_MIN_HEIGHT_FACTOR)

            var size = radius * LABEL_MAX_TEXT_SIZE_FACTOR
            val minSize = radius * LABEL_MIN_TEXT_SIZE_FACTOR
            val step = radius * LABEL_TEXT_SIZE_STEP_FACTOR
            while (size > minSize) {
                paint.textSize = size
                val layout = StaticLayout.Builder.obtain(label, 0, label.length, paint, maxWidthPx)
                    .setAlignment(Layout.Alignment.ALIGN_CENTER)
                    .setIncludePad(false)
                    .build()
                if (layout.lineCount <= 2 && layout.height <= maxHeightPx) return true
                size -= step
            }
            return false
        }
    }
}
