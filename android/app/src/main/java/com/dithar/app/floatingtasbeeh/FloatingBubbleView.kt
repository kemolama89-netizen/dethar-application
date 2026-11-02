package com.dithar.app.floatingtasbeeh

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.SweepGradient
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import com.dithar.app.look.AppLook
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin

/**
 * The Floating Tasbeeh bubble itself — a single self-drawn CIRCLE (never a
 * View hierarchy with a background drawable + child views, which risks
 * ever reading as a "card"): a deep disc in the active look's own colours
 * (AppLook, pushed from the app and kept current by FloatingTasbeehService),
 * inside a burnished gold ring, with a faint eight-pointed star behind the
 * selected dhikr's own text (see [label]) and the live count.
 *
 * Its window is larger than the disc by [HALO_DP] on every side: that room
 * holds the soft shadow and the ripple of an accepted tap. A touch starting
 * out there is not the bubble's (see onTouchEvent).
 *
 * Feedback, all of it display only (FloatingTasbeehService decides what counts):
 *  - a finger down presses the disc in at once, before the gesture is known;
 *  - an accepted tap ([countAccepted]) bounces it, sends a gold ripple out and
 *    rolls the number over;
 *  - while pacing the ring is a sweep, and the moment it completes the ring
 *    glows once: ready for the next;
 *  - a drag lifts it onto a deeper shadow.
 * ValueAnimator follows the system's animation scale, so "remove animations"
 * reduces each of these to its end state.
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
    // Where a dragged position may go (FloatingBubblePlacement.clamp): the
    // bubble follows the finger freely, but stays on screen and clear of the
    // status and navigation bars.
    private val keepInBounds: (x: Int, y: Int) -> FloatingBubblePlacement.Position = { x, y -> FloatingBubblePlacement.Position(x, y) },
) : View(context) {

    private val density = context.resources.displayMetrics.density

    /** The active look's colours. */
    var colors: AppLook.Colors = AppLook.colors(AppLook.DEFAULT_LOOK)
        set(value) {
            if (field == value) return
            field = value
            applyColors()
            rebuildShaders()
            invalidate()
        }

    var count: Int = 0
        set(value) {
            field = value
            // A number set from outside (a reset, a new selection, a tap in
            // the app) shows at once; only an accepted tap rolls it over.
            rollingFrom = null
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
                    private var cancelled = false

                    override fun onAnimationCancel(animation: Animator) {
                        cancelled = true
                    }

                    override fun onAnimationEnd(animation: Animator) {
                        isPacing = false
                        if (!cancelled) playReadyGlow()
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

    /** An accepted tap: shows [newCount] with the bounce, the ripple and the number rolling over. */
    fun countAccepted(newCount: Int) {
        val previous = count
        count = newCount
        rollingFrom = previous
        tapProgress = 0f
        tapAnimator?.cancel()
        tapAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = TAP_ANIMATION_MS
            interpolator = LinearInterpolator() // each effect below eases its own part of the time
            addUpdateListener {
                tapProgress = it.animatedValue as Float
                invalidate()
            }
            addListener(
                object : AnimatorListenerAdapter() {
                    override fun onAnimationEnd(animation: Animator) {
                        tapProgress = 1f
                        rollingFrom = null
                        invalidate()
                    }
                },
            )
            start()
        }
    }

    private var tapProgress = 1f
    private var tapAnimator: ValueAnimator? = null
    private var rollingFrom: Int? = null

    private var pressAmount = 0f
    private var pressAnimator: ValueAnimator? = null

    private fun animatePress(to: Float, durationMs: Long) {
        pressAnimator?.cancel()
        pressAnimator = ValueAnimator.ofFloat(pressAmount, to).apply {
            duration = durationMs
            interpolator = DecelerateInterpolator()
            addUpdateListener {
                pressAmount = it.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    private var readyGlow = 0f
    private var readyAnimator: ValueAnimator? = null

    private fun playReadyGlow() {
        readyAnimator?.cancel()
        readyAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = READY_GLOW_MS
            addUpdateListener {
                readyGlow = sin((it.animatedValue as Float) * PI.toFloat())
                invalidate()
            }
            start()
        }
    }

    /** Stops every animation (the window is going away). */
    fun stopAnimations() {
        tapAnimator?.cancel()
        pressAnimator?.cancel()
        readyAnimator?.cancel()
    }

    private val ringWidth = density * 2f
    private val haloPx = HALO_DP * density

    private val shadowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val sheenPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val flashPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ripplePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = ringWidth
    }
    private val sweepPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = ringWidth * 1.3f
        strokeCap = Paint.Cap.ROUND
    }
    private val sweepHeadPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    // The dimmed "track" behind the pacing sweep, only shown while isPacing.
    private val pacingTrackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = ringWidth
    }
    private val hairlinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = density * 0.75f
    }
    private val starPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = density * 0.8f
    }
    private val countPaint = countPaint()
    private val labelPaint = TextPaint(Paint.ANTI_ALIAS_FLAG)
    private val starPath = Path()
    private val discClip = Path()
    private val sweepRect = RectF()

    init {
        applyColors()
    }

    private fun applyColors() {
        val gold = Color.parseColor(colors.gold)
        val ink = Color.parseColor(colors.ink)
        pacingTrackPaint.color = withAlpha(gold, 0.26f)
        sweepPaint.color = mix(gold, Color.WHITE, 0.3f)
        sweepHeadPaint.color = mix(gold, Color.WHITE, 0.55f)
        hairlinePaint.color = withAlpha(gold, 0.34f)
        starPaint.color = withAlpha(gold, 0.17f)
        ripplePaint.color = mix(gold, Color.WHITE, 0.2f)
        countPaint.color = ink
        labelPaint.color = withAlpha(ink, 0.88f)
    }

    private fun discRadius(): Float = (minOf(width, height) / 2f) - haloPx - ringWidth

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        rebuildShaders()
    }

    /** The shaders only change with the size and the look, so onDraw allocates none. */
    private fun rebuildShaders() {
        if (width == 0 || height == 0) return
        val cx = width / 2f
        val cy = height / 2f
        val r = discRadius()
        if (r <= 0f) return
        val gold = Color.parseColor(colors.gold)
        val outer = r + haloPx
        val shadowCentre = cy + density * 1.5f
        shadowPaint.shader = RadialGradient(
            cx,
            shadowCentre,
            outer,
            intArrayOf(Color.argb(115, 0, 0, 0), Color.argb(115, 0, 0, 0), Color.TRANSPARENT),
            floatArrayOf(0f, (r * 0.92f / outer).coerceIn(0f, 0.99f), 1f),
            Shader.TileMode.CLAMP,
        )
        bodyPaint.shader = LinearGradient(0f, cy - r, 0f, cy + r, Color.parseColor(colors.deepTop), Color.parseColor(colors.deepBottom), Shader.TileMode.CLAMP)
        sheenPaint.shader = RadialGradient(cx - r * 0.25f, cy - r * 0.75f, r * 1.15f, Color.argb(46, 255, 255, 255), Color.TRANSPARENT, Shader.TileMode.CLAMP)
        flashPaint.shader = RadialGradient(cx, cy, r, withAlpha(gold, 0.5f), withAlpha(gold, 0.08f), Shader.TileMode.CLAMP)
        // Burnished: the gold lightens and deepens around the ring, as a metal rim catches the light.
        val light = mix(gold, Color.WHITE, 0.5f)
        val deep = mix(gold, Color.BLACK, 0.28f)
        ringPaint.shader = SweepGradient(cx, cy, intArrayOf(gold, light, gold, deep, gold, light, gold), null)

        // Two overlapping squares: the eight-pointed star of the Classic look's lattice.
        val s = r * 0.62f
        starPath.reset()
        for (angle in floatArrayOf(0f, PI.toFloat() / 4f)) {
            for (corner in 0 until 4) {
                val a = angle + corner * PI.toFloat() / 2f + PI.toFloat() / 4f
                val x = cx + s * kotlin.math.cos(a)
                val y = cy + s * sin(a)
                if (corner == 0) starPath.moveTo(x, y) else starPath.lineTo(x, y)
            }
            starPath.close()
        }
        discClip.reset()
        discClip.addCircle(cx, cy, r, Path.Direction.CW)
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
    private var lifted = false

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
        // The window's outer room holds only the shadow and the ripple: a
        // touch beginning there never counts, drags or opens the menu.
        if (event.actionMasked == MotionEvent.ACTION_DOWN &&
            hypot(event.x - width / 2f, event.y - height / 2f) > discRadius() + ringWidth + density * TOUCH_MARGIN_DP
        ) {
            return false
        }

        gestureDetector.onTouchEvent(event)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downRawX = event.rawX
                downRawY = event.rawY
                downParamX = layoutParams.x
                downParamY = layoutParams.y
                isDragging = false
                animatePress(1f, PRESS_IN_MS)
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = event.rawX - downRawX
                val dy = event.rawY - downRawY
                if (isDragging || abs(dx) > touchSlop || abs(dy) > touchSlop) {
                    isDragging = true
                    if (!lifted) {
                        lifted = true
                        animatePress(0f, PRESS_OUT_MS)
                    }
                    val next = keepInBounds(downParamX + dx.toInt(), downParamY + dy.toInt())
                    // Held against an edge (or a sub-pixel move): nothing to redraw.
                    if (next.x != layoutParams.x || next.y != layoutParams.y) {
                        layoutParams.x = next.x
                        layoutParams.y = next.y
                        windowManager.updateViewLayout(this, layoutParams)
                        onPositionChanged(layoutParams.x, layoutParams.y)
                    }
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                lifted = false
                animatePress(0f, PRESS_OUT_MS)
            }
            else -> Unit
        }
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val cx = width / 2f
        val cy = height / 2f
        val radius = discRadius()
        if (radius <= 0f) return

        // Behind the disc: its shadow (deeper while dragged), then the ripple.
        shadowPaint.alpha = if (lifted) 255 else 190
        canvas.drawCircle(cx, cy, radius + haloPx, shadowPaint)
        val tapping = tapProgress < 1f
        if (tapping) {
            val out = 1f - (1f - tapProgress) * (1f - tapProgress)
            ripplePaint.strokeWidth = density * (2.4f - 1.6f * out)
            ripplePaint.alpha = ((1f - tapProgress) * 210f).toInt()
            canvas.drawCircle(cx, cy, radius + ringWidth + (haloPx - ringWidth - density) * out, ripplePaint)
        }

        // The disc: pressed in by a finger, bounced by an accepted tap.
        val bump = if (tapping) sin(min(tapProgress / BUMP_PORTION, 1f) * PI.toFloat()) else 0f
        val scale = 1f - PRESS_DEPTH * pressAmount + BUMP_HEIGHT * bump
        canvas.save()
        canvas.scale(scale, scale, cx, cy)
        canvas.drawCircle(cx, cy, radius, bodyPaint)
        if (tapping) {
            flashPaint.alpha = ((1f - tapProgress) * (1f - tapProgress) * 255f).toInt()
            canvas.drawCircle(cx, cy, radius, flashPaint)
        }
        canvas.drawCircle(cx, cy, radius, sheenPaint)
        canvas.drawPath(starPath, starPaint)
        canvas.drawCircle(cx, cy, radius - density * 3f, hairlinePaint)

        if (isPacing) {
            // The dimmed track plus a clockwise sweep from 12 o'clock
            // proportional to pacingFraction — the native equivalent of
            // TasbeehScreen's own SVG stroke-dasharray sweep, driven by the
            // identical elapsed-time/readyDurationMs relationship (see
            // FloatingTasbeehService#handleTap and startPacing above).
            canvas.drawCircle(cx, cy, radius, pacingTrackPaint)
            sweepRect.set(cx - radius, cy - radius, cx + radius, cy + radius)
            canvas.drawArc(sweepRect, -90f, 360f * pacingFraction, false, sweepPaint)
            val head = (pacingFraction * 2f - 0.5f) * PI.toFloat()
            canvas.drawCircle(cx + radius * kotlin.math.cos(head), cy + radius * sin(head), ringWidth * 1.15f, sweepHeadPaint)
        } else {
            ringPaint.strokeWidth = ringWidth * (1f + 0.6f * readyGlow)
            canvas.drawCircle(cx, cy, radius, ringPaint)
        }

        if (label.isEmpty()) {
            // No selected-dhikr label yet (e.g. a service restart racing
            // the app's own startup, before JS has pushed the library) —
            // fall back to the original single-line, count-only layout
            // rather than showing a stray empty line above the count.
            fitCountSize(radius * 0.72f, radius)
            val countY = cy - (countPaint.descent() + countPaint.ascent()) / 2f
            drawCount(canvas, cx, countY)
        } else {
            countPaint.textSize = radius * COUNT_TEXT_SIZE_FACTOR
            val countHeight = countPaint.descent() - countPaint.ascent()

            // Total vertical budget for the label+count block together, inset
            // from the bubble's own diameter so both lines stay inside the
            // circle (a flat rectangular approximation of the circle's usable
            // width/height).
            val maxWidthPx = (radius * LABEL_MAX_WIDTH_FACTOR).toInt().coerceAtLeast(1)
            val maxLabelHeightPx = (radius * LABEL_MAX_HEIGHT_FACTOR - countHeight).coerceAtLeast(radius * LABEL_MIN_HEIGHT_FACTOR)
            val labelLayout = buildLabelLayout(label, radius, maxWidthPx, maxLabelHeightPx)

            val totalHeight = labelLayout.height + countHeight
            val blockTop = cy - totalHeight / 2f

            canvas.save()
            canvas.translate(cx - maxWidthPx / 2f, blockTop)
            labelLayout.draw(canvas)
            canvas.restore()

            fitCountSize(radius * COUNT_TEXT_SIZE_FACTOR, radius)
            drawCount(canvas, cx, blockTop + labelLayout.height - countPaint.ascent())
        }
        canvas.restore()
    }

    /** A long count shrinks rather than crossing the ring. */
    private fun fitCountSize(size: Float, radius: Float) {
        countPaint.textSize = size
        val width = countPaint.measureText(count.toString())
        val room = radius * COUNT_MAX_WIDTH_FACTOR
        if (width > room) countPaint.textSize = size * room / width
    }

    /** The number; during an accepted tap the old one rises away as the new one rises into its place. */
    private fun drawCount(canvas: Canvas, cx: Float, baseline: Float) {
        val from = rollingFrom
        val text = count.toString()
        if (from == null || tapProgress >= ROLL_PORTION) {
            countPaint.alpha = 255
            canvas.drawText(text, cx, baseline, countPaint)
            return
        }
        val linear = tapProgress / ROLL_PORTION
        val eased = 1f - (1f - linear) * (1f - linear)
        // A short way, so the old number fades before it could reach the dhikr's text above it.
        val travel = (countPaint.descent() - countPaint.ascent()) * 0.32f
        canvas.save()
        canvas.clipPath(discClip) // the number alone: the dhikr's text is never clipped
        countPaint.alpha = ((1f - eased) * 255f).toInt()
        canvas.drawText(from.toString(), cx, baseline - travel * eased, countPaint)
        countPaint.alpha = (eased * 255f).toInt()
        canvas.drawText(text, cx, baseline + travel * (1f - eased), countPaint)
        canvas.restore()
        countPaint.alpha = 255
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
        /** The room around the disc, inside the window, for its shadow and ripple. */
        const val HALO_DP = 10

        private const val TOUCH_MARGIN_DP = 4f

        private const val TAP_ANIMATION_MS = 460L
        private const val PRESS_IN_MS = 90L
        private const val PRESS_OUT_MS = 180L
        private const val READY_GLOW_MS = 340L
        private const val PRESS_DEPTH = 0.05f
        private const val BUMP_HEIGHT = 0.07f
        private const val BUMP_PORTION = 0.55f
        private const val ROLL_PORTION = 0.5f

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
        private const val COUNT_MAX_WIDTH_FACTOR = 1.5f

        private fun countPaint() = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
        }

        fun withAlpha(color: Int, alpha: Float): Int = Color.argb((alpha * 255f).toInt(), Color.red(color), Color.green(color), Color.blue(color))

        /** [color] moved [amount] (0..1) of the way to [other]. */
        fun mix(color: Int, other: Int, amount: Float): Int {
            fun channel(a: Int, b: Int) = (a + (b - a) * amount).toInt()
            return Color.rgb(channel(Color.red(color), Color.red(other)), channel(Color.green(color), Color.green(other)), channel(Color.blue(color), Color.blue(other)))
        }

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
            val countPaint = countPaint().apply { textSize = radius * COUNT_TEXT_SIZE_FACTOR }
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
