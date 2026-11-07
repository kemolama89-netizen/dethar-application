package com.dithar.app.floatingtasbeeh

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import com.dithar.app.look.AppLook
import java.util.Locale
import kotlin.math.hypot

/**
 * The minimized counter: a slim pill in the look's deep colours with a gold
 * ring and the live count (and a gold hairline toward the target, when there
 * is one). It replaces the old round bubble.
 *
 * A tap opens full-screen counting again — it never counts. A drag moves it;
 * on release the service settles it against the nearer side edge
 * (CounterOverlayRules.pillSettle), in from the edge so it stays clear of the
 * system back gesture.
 *
 * Its window is larger than the pill by [SHADOW_DP] on every side, room for
 * its shadow; a touch out there isn't the pill's.
 */
@SuppressLint("ViewConstructor")
class CounterPillView(context: Context, private val listener: Listener) : View(context) {

    interface Listener {
        fun onExpand()
        fun onDrag(rawDx: Float, rawDy: Float)
        fun onDragEnd()
    }

    private val density = resources.displayMetrics.density
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

    private var colors: AppLook.Colors = AppLook.colors(AppLook.DEFAULT_LOOK)
    private var count = 0
    private var target = 0

    private val body = Paint(Paint.ANTI_ALIAS_FLAG)
    private val shadow = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val outline = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val numberPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER }
    private val track = Paint(Paint.ANTI_ALIAS_FLAG)
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rect = RectF()

    private var downRawX = 0f
    private var downRawY = 0f
    private var lastRawX = 0f
    private var lastRawY = 0f
    private var dragging = false

    init {
        // The soft shadow is drawn with a shadow layer, which needs software drawing; the view is small.
        setLayerType(LAYER_TYPE_SOFTWARE, null)
        isClickable = true
        isFocusable = true
        numberPaint.typeface = CounterStyle.amiriBold(context)
        numberPaint.textSize = 27f * density
        applyColors()
        describe()
    }

    fun setColors(value: AppLook.Colors) {
        colors = value
        applyColors()
    }

    fun setCount(count: Int, target: Int) {
        this.count = count
        this.target = target
        describe()
        invalidate()
    }

    private fun describe() {
        contentDescription = buildString {
            append(LABEL_EXPAND).append(": ").append(count)
            if (target > 0) append(' ').append(FullScreenCounterView.LABEL_OF).append(' ').append(target)
        }
    }

    private fun applyColors() {
        val gold = CounterStyle.parse(colors.gold)
        val ink = CounterStyle.parse(colors.ink)
        shadow.color = CounterStyle.parse(colors.deepBottom)
        shadow.setShadowLayer(11f * density, 0f, 4f * density, CounterStyle.withAlpha(android.graphics.Color.BLACK, 0.34f))
        ring.color = gold
        ring.strokeWidth = 2f * density
        outline.color = CounterStyle.withAlpha(ink, 0.35f)
        outline.strokeWidth = 1f * density
        numberPaint.color = gold
        track.color = CounterStyle.withAlpha(gold, 0.3f)
        fill.color = gold
        body.shader = null
        invalidate()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val pad = SHADOW_DP * density
        body.shader = LinearGradient(0f, pad, 0f, h - pad, CounterStyle.parse(colors.deepTop), CounterStyle.parse(colors.deepBottom), Shader.TileMode.CLAMP)
    }

    override fun onDraw(canvas: Canvas) {
        if (body.shader == null) onSizeChanged(width, height, width, height)
        val pad = SHADOW_DP * density
        rect.set(pad, pad, width - pad, height - pad)
        val r = rect.width() / 2f
        canvas.drawRoundRect(rect, r, r, shadow)
        canvas.drawRoundRect(rect, r, r, body)
        // An ivory outline just outside the gold ring: the pill stays visible over dark apps too.
        val o = outline.strokeWidth / 2f
        canvas.drawRoundRect(rect.left + o, rect.top + o, rect.right - o, rect.bottom - o, r, r, outline)
        val g = outline.strokeWidth + ring.strokeWidth / 2f
        canvas.drawRoundRect(rect.left + g, rect.top + g, rect.right - g, rect.bottom - g, r - g, r - g, ring)

        val fraction = CounterOverlayRules.progress(count, target)
        val cx = rect.centerX()
        val number = String.format(Locale.US, "%d", count)
        // Wide counts shrink to fit inside the ring.
        val maxWidth = rect.width() - 14f * density
        numberPaint.textSize = 27f * density
        while (numberPaint.measureText(number) > maxWidth && numberPaint.textSize > 12f * density) numberPaint.textSize -= density
        val metrics = numberPaint.fontMetrics
        val numberCentreY = if (fraction == null) rect.centerY() else rect.centerY() - 6f * density
        canvas.drawText(number, cx, numberCentreY - (metrics.ascent + metrics.descent) / 2f, numberPaint)
        if (fraction != null) {
            val barW = 24f * density
            val barH = 2f * density
            val top = numberCentreY + 18f * density
            canvas.drawRoundRect(cx - barW / 2f, top, cx + barW / 2f, top + barH, barH, barH, track)
            canvas.drawRoundRect(cx + barW / 2f - barW * fraction, top, cx + barW / 2f, top + barH, barH, barH, fill)
        }
    }

    @SuppressLint("ClickableViewAccessibility") // A tap reaches performClick below, which TalkBack also uses.
    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downRawX = event.rawX; downRawY = event.rawY
                lastRawX = event.rawX; lastRawY = event.rawY
                dragging = false
            }
            MotionEvent.ACTION_MOVE -> {
                if (!dragging && hypot(event.rawX - downRawX, event.rawY - downRawY) > touchSlop) dragging = true
                if (dragging) {
                    listener.onDrag(event.rawX - lastRawX, event.rawY - lastRawY)
                    lastRawX = event.rawX; lastRawY = event.rawY
                }
            }
            MotionEvent.ACTION_UP -> if (dragging) listener.onDragEnd() else performClick()
            MotionEvent.ACTION_CANCEL -> if (dragging) listener.onDragEnd()
        }
        return true
    }

    override fun performClick(): Boolean {
        super.performClick()
        listener.onExpand()
        return true
    }

    companion object {
        const val PILL_WIDTH_DP = 56
        const val PILL_HEIGHT_DP = 96
        const val SHADOW_DP = 9
        const val EDGE_INSET_DP = 10
        const val LABEL_EXPAND = "توسيع التسبيح"
    }
}
