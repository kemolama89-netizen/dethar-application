package com.dithar.app.floatingtasbeeh

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.dithar.app.look.AppLook
import java.util.Locale
import kotlin.math.hypot

/**
 * Full-screen counting mode ("Veil"): the active look's deep colour drawn over
 * whatever app is open, inside a thin gold frame; the dhikr in Amiri with its
 * count beneath in gold; the target, when there is one, as «33 من 100» with a
 * hairline; and three labelled controls along the bottom — الأذكار, تصغير, إغلاق.
 *
 * A tap anywhere above the controls is one count (CounterOverlayRules.onRelease);
 * what a count actually does — the pacing gate, the duplicate guard, the stored
 * per-dhikr count, the haptic and the sync to the app — stays in
 * FloatingTasbeehService#handleTap, unchanged. This view only reports the tap
 * and shows the result.
 *
 * It can't trap anyone: the controls are always on screen, the status bar and
 * navigation bar stay above it (an app overlay is drawn beneath them), the
 * notification carries تصغير / إيقاف, and the service folds it back to the pill
 * after a few idle minutes.
 */
@SuppressLint("ViewConstructor")
class FullScreenCounterView(
    context: Context,
    private val listener: Listener,
) : FrameLayout(context) {

    interface Listener {
        fun onCountTap()
        fun onMinimize()
        fun onClose()
        fun onSelectDhikr(dhikrId: Int)
        fun onCustomDhikr()
        fun onOpenSettings()
        /** Any touch at all: keeps the idle fallback from firing while someone is here. */
        fun onActivity()
    }

    /** One row of the Adhkar list. */
    data class DhikrRow(val id: Int, val label: String, val count: Int)

    private val density = resources.displayMetrics.density
    private fun dp(value: Float): Int = (value * density).toInt()
    private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop

    private var colors: AppLook.Colors = AppLook.colors(AppLook.DEFAULT_LOOK)
    private var frameRadiusPx = dp(30f).toFloat()
    // The system bars' room as the screen reports it, and the part of it this window actually overlaps.
    private var screenTop = 0
    private var screenBottom = 0
    private var screenHeight = 0
    private var insetTop = 0
    private var insetBottom = 0
    private val location = IntArray(2)

    private val veilPaint = Paint()
    private val framePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val frameRect = RectF()

    private val hint = TextView(context)
    private val dhikrText = TextView(context)
    private val countText = TextView(context)
    private val progress = HairlineProgressView(context)
    private val targetText = TextView(context)
    private val centre = LinearLayout(context)
    private val controls = LinearLayout(context)
    private val adhkarButton = ControlButton(context, CounterIconView.Kind.LIST, LABEL_ADHKAR, LABEL_ADHKAR)
    private val minimizeButton = ControlButton(context, CounterIconView.Kind.MINIMIZE, LABEL_MINIMIZE, LABEL_MINIMIZE)
    private val closeButton = ControlButton(context, CounterIconView.Kind.CLOSE, LABEL_CLOSE, LABEL_CLOSE_DESCRIPTION)
    private var sheet: AdhkarSheet? = null

    private var label = ""
    private var count = 0
    private var target = 0
    private var pacingAnimator: ValueAnimator? = null
    private var bounceAnimator: ValueAnimator? = null

    // The gesture in progress (onTouchEvent).
    private var downX = 0f
    private var downY = 0f
    private var moved = false

    val isSheetOpen: Boolean get() = sheet != null

    init {
        setWillNotDraw(false)
        layoutDirection = LAYOUT_DIRECTION_RTL
        isClickable = true
        isFocusable = false

        hint.apply {
            text = LABEL_HINT
            typeface = CounterStyle.tajawal(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            gravity = Gravity.CENTER
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        addView(hint, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.TOP))

        centre.apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        }
        dhikrText.apply {
            typeface = CounterStyle.amiri(context)
            gravity = Gravity.CENTER
            textDirection = TEXT_DIRECTION_RTL
            setLineSpacing(0f, 1.15f)
        }
        countText.apply {
            typeface = CounterStyle.amiriBold(context)
            setTextSize(TypedValue.COMPLEX_UNIT_DIP, 88f)
            gravity = Gravity.CENTER
            includeFontPadding = false
        }
        targetText.apply {
            typeface = CounterStyle.tajawal(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
            gravity = Gravity.CENTER
        }
        centre.addView(dhikrText, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
        centre.addView(countText, LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply { topMargin = dp(2f) })
        centre.addView(progress, LinearLayout.LayoutParams(dp(140f), dp(2f)).apply { topMargin = dp(10f) })
        centre.addView(targetText, LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply { topMargin = dp(8f) })
        addView(centre, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER).apply {
            leftMargin = dp(28f)
            rightMargin = dp(28f)
        })

        // Right to left: الأذكار, تصغير, إغلاق.
        controls.apply {
            orientation = LinearLayout.HORIZONTAL
            layoutDirection = LAYOUT_DIRECTION_RTL
            gravity = Gravity.CENTER
        }
        adhkarButton.setOnClickListener { listener.onActivity(); showSheetRequested?.invoke() }
        minimizeButton.setOnClickListener { listener.onMinimize() }
        closeButton.setOnClickListener { listener.onClose() }
        for ((i, button) in listOf(adhkarButton, minimizeButton, closeButton).withIndex()) {
            controls.addView(button, LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
                if (i > 0) marginStart = dp(34f)
            })
        }
        addView(controls, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL))

        applyColors()
        applyInsets()
        render()
    }

    /** Asked by الأذكار: the service answers with [showSheet] and the current rows. */
    var showSheetRequested: (() -> Unit)? = null

    fun setColors(value: AppLook.Colors) {
        colors = value
        applyColors()
        sheet?.setColors(value)
    }

    /**
     * The status bar and navigation bar's room on a screen [height] tall, so
     * nothing sits under them, and the screen's own corner radius for the frame.
     */
    fun setScreen(top: Int, bottom: Int, height: Int, cornerRadiusPx: Int?) {
        screenTop = top
        screenBottom = bottom
        screenHeight = height
        frameRadiusPx = ((cornerRadiusPx ?: dp(37f)) - dp(7f)).coerceAtLeast(dp(12f)).toFloat()
        updateInsets()
        invalidate()
    }

    /**
     * Whether an overlay window is laid out under the system bars differs between
     * devices, so the room kept free is measured from where this window really is.
     */
    private fun updateInsets() {
        if (!isAttachedToWindow || height == 0) return
        getLocationOnScreen(location)
        val top = (screenTop - location[1]).coerceAtLeast(0)
        val bottom = (screenBottom - (screenHeight - (location[1] + height))).coerceAtLeast(0)
        if (top == insetTop && bottom == insetBottom) return
        insetTop = top
        insetBottom = bottom
        post { applyInsets() }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        if (changed) updateInsets()
    }

    fun setDhikr(label: String, count: Int, target: Int) {
        this.label = label
        this.count = count
        this.target = target
        render()
    }

    fun setCount(count: Int, target: Int = this.target) {
        this.count = count
        this.target = target
        render()
    }

    /** An accepted tap: the new count, a small lift of the number, then the pacing until the next tap may count. */
    fun countAccepted(count: Int, readyDurationMs: Long) {
        setCount(count)
        bounceAnimator?.cancel()
        bounceAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 180
            addUpdateListener {
                val t = it.animatedValue as Float
                val s = 1f + 0.06f * (if (t < 0.4f) t / 0.4f else (1f - t) / 0.6f)
                countText.scaleX = s
                countText.scaleY = s
            }
            start()
        }
        startPacing(readyDurationMs)
    }

    /** The count rests dimmed until the dhikr's own pace has passed — the same moment a tap may count again. */
    fun startPacing(durationMs: Long) {
        pacingAnimator?.cancel()
        if (durationMs <= 0) {
            countText.alpha = 1f
            return
        }
        countText.alpha = 0.5f
        pacingAnimator = ValueAnimator.ofFloat(0.5f, 1f).apply {
            duration = durationMs
            addUpdateListener { countText.alpha = it.animatedValue as Float }
            start()
        }
    }

    fun resetPacing() {
        pacingAnimator?.cancel()
        pacingAnimator = null
        countText.alpha = 1f
    }

    fun stopAnimations() {
        pacingAnimator?.cancel()
        bounceAnimator?.cancel()
    }

    fun showSheet(rows: List<DhikrRow>, selectedId: Int) {
        hideSheet()
        val next = AdhkarSheet(context, rows, selectedId, object : AdhkarSheet.Listener {
            override fun onSelect(dhikrId: Int) {
                hideSheet()
                listener.onSelectDhikr(dhikrId)
            }
            override fun onCustomDhikr() = listener.onCustomDhikr()
            override fun onSettings() = listener.onOpenSettings()
            override fun onDismiss() = hideSheet()
        }, (resources.displayMetrics.heightPixels * 0.62f).toInt())
        next.setColors(colors)
        next.setPadding(dp(14f), dp(10f), dp(14f), insetBottom + dp(20f))
        sheet = next
        addView(next, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.BOTTOM))
        controls.visibility = INVISIBLE
        centre.visibility = INVISIBLE
        hint.visibility = INVISIBLE
    }

    fun hideSheet() {
        sheet?.let { removeView(it) }
        sheet = null
        controls.visibility = VISIBLE
        centre.visibility = VISIBLE
        hint.visibility = VISIBLE
    }

    private fun render() {
        dhikrText.text = label
        // Long adhkar get a smaller size, and always wrap — never cut.
        dhikrText.setTextSize(TypedValue.COMPLEX_UNIT_SP, when {
            label.length > 70 -> 22f
            label.length > 34 -> 27f
            else -> 34f
        })
        countText.text = String.format(Locale.US, "%d", count)
        val fraction = CounterOverlayRules.progress(count, target)
        progress.visibility = if (fraction == null) GONE else VISIBLE
        targetText.visibility = if (fraction == null) GONE else VISIBLE
        if (fraction != null) {
            progress.fraction = fraction
            targetText.text = String.format(Locale.US, "%d %s %d", count, LABEL_OF, target)
        }
        contentDescription = buildString {
            append(LABEL_HINT).append(". ").append(label).append(": ").append(count)
            if (fraction != null) append(' ').append(LABEL_OF).append(' ').append(target)
        }
    }

    private fun applyColors() {
        val deep = CounterStyle.parse(colors.deepBottom)
        val ink = CounterStyle.parse(colors.ink)
        val gold = CounterStyle.parse(colors.gold)
        veilPaint.color = CounterStyle.withAlpha(deep, VEIL_ALPHA)
        framePaint.color = CounterStyle.withAlpha(gold, 0.6f)
        framePaint.strokeWidth = 1.5f * density
        hint.setTextColor(CounterStyle.withAlpha(ink, 0.85f))
        dhikrText.setTextColor(ink)
        countText.setTextColor(gold)
        targetText.setTextColor(CounterStyle.withAlpha(ink, 0.8f))
        progress.setColors(gold)
        adhkarButton.setColors(ink, CounterStyle.withAlpha(gold, 0.6f))
        minimizeButton.setColors(ink, CounterStyle.withAlpha(gold, 0.6f))
        closeButton.setColors(ink, CounterStyle.withAlpha(ink, 0.3f))
        invalidate()
    }

    private fun applyInsets() {
        (hint.layoutParams as LayoutParams).topMargin = insetTop + dp(40f)
        (controls.layoutParams as LayoutParams).bottomMargin = insetBottom + dp(36f)
        // Centred between the status bar and the controls' row, as drawn.
        (centre.layoutParams as LayoutParams).topMargin = insetTop + dp(24f)
        (centre.layoutParams as LayoutParams).bottomMargin = insetBottom + dp(150f)
        requestLayout()
    }

    override fun dispatchDraw(canvas: Canvas) {
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), veilPaint)
        val inset = 7f * density
        frameRect.set(inset, inset, width - inset, height - inset)
        canvas.drawRoundRect(frameRect, frameRadiusPx, frameRadiusPx, framePaint)
        super.dispatchDraw(canvas)
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ev.actionMasked == MotionEvent.ACTION_DOWN) listener.onActivity()
        return super.dispatchTouchEvent(ev)
    }

    /** The zone that never counts: from a little above the controls down to the bottom edge. */
    private fun controlsTop(): Float = (controls.top - dp(24f)).toFloat()

    @SuppressLint("ClickableViewAccessibility") // A tap reaches performClick below, which TalkBack's double-tap also calls.
    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = event.x
                downY = event.y
                moved = false
            }
            MotionEvent.ACTION_MOVE -> {
                if (!moved && hypot(event.x - downX, event.y - downY) > touchSlop) moved = true
            }
            MotionEvent.ACTION_UP -> {
                when (CounterOverlayRules.onRelease(downY, controlsTop(), moved, isSheetOpen)) {
                    CounterOverlayRules.Release.COUNT -> performClick()
                    CounterOverlayRules.Release.CLOSE_SHEET -> hideSheet()
                    CounterOverlayRules.Release.NOTHING -> Unit
                }
            }
        }
        return true
    }

    override fun performClick(): Boolean {
        super.performClick()
        if (isSheetOpen) hideSheet() else listener.onCountTap()
        return true
    }

    companion object {
        /** Dense enough that the app beneath plainly isn't usable, and gold reads 5:1 even over a white app. */
        const val VEIL_ALPHA = 0.86f
        const val LABEL_HINT = "المس أي مكان للتسبيح"
        const val LABEL_ADHKAR = "الأذكار"
        const val LABEL_MINIMIZE = "تصغير"
        const val LABEL_CLOSE = "إغلاق"
        const val LABEL_CLOSE_DESCRIPTION = "إغلاق التسبيح العائم"
        const val LABEL_OF = "من"
    }
}

/** A gold hairline that fills from the right (Arabic reading order) as the target is approached. */
private class HairlineProgressView(context: Context) : View(context) {
    var fraction = 0f
        set(value) {
            field = value.coerceIn(0f, 1f)
            invalidate()
        }
    private val track = Paint(Paint.ANTI_ALIAS_FLAG)
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    fun setColors(gold: Int) {
        track.color = CounterStyle.withAlpha(gold, 0.3f)
        fill.color = gold
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        val r = height / 2f
        canvas.drawRoundRect(0f, 0f, width.toFloat(), height.toFloat(), r, r, track)
        canvas.drawRoundRect(width * (1f - fraction), 0f, width.toFloat(), height.toFloat(), r, r, fill)
    }
}

@SuppressLint("ViewConstructor") // Built in code only, never inflated from XML.
/** A labelled round control: a 54dp gold-ringed disc with its icon, and its name under it. */
private class ControlButton(context: Context, kind: CounterIconView.Kind, label: String, description: String) : LinearLayout(context) {
    private val density = resources.displayMetrics.density
    private val disc = FrameLayout(context)
    private val icon = CounterIconView(context, kind)
    private val text = TextView(context)

    init {
        orientation = VERTICAL
        gravity = Gravity.CENTER_HORIZONTAL
        isClickable = true
        isFocusable = true
        contentDescription = description
        val size = (54 * density).toInt()
        val iconSize = ((if (kind == CounterIconView.Kind.CLOSE) 20 else 22) * density).toInt()
        disc.addView(icon, FrameLayout.LayoutParams(iconSize, iconSize, Gravity.CENTER))
        addView(disc, LayoutParams(size, size))
        text.apply {
            this.text = label
            typeface = CounterStyle.tajawal(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            gravity = Gravity.CENTER
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        }
        addView(text, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply { topMargin = (7 * density).toInt() })
    }

    fun setColors(ink: Int, ring: Int) {
        icon.color = ink
        text.setTextColor(CounterStyle.withAlpha(ink, 0.85f))
        disc.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(CounterStyle.withAlpha(ink, 0.08f))
            setStroke((1 * density).toInt().coerceAtLeast(1), ring)
        }
    }
}

/**
 * The Adhkar sheet: every dhikr in the library with its own current count, the
 * one being counted marked in gold, then «ذكر مخصص» and «الإعدادات». It takes
 * its own touches, so nothing on it ever counts; a tap on the veil above it
 * closes it (CounterOverlayRules.onRelease).
 */
@SuppressLint("ViewConstructor")
private class AdhkarSheet(
    context: Context,
    private val rows: List<FullScreenCounterView.DhikrRow>,
    private val selectedId: Int,
    private val listener: Listener,
    private val maxListHeight: Int,
) : LinearLayout(context) {

    interface Listener {
        fun onSelect(dhikrId: Int)
        fun onCustomDhikr()
        fun onSettings()
        fun onDismiss()
    }

    private val density = resources.displayMetrics.density
    private fun dp(value: Float): Int = (value * density).toInt()
    private val topLine = Paint(Paint.ANTI_ALIAS_FLAG)
    private var colors: AppLook.Colors = AppLook.colors(AppLook.DEFAULT_LOOK)

    init {
        orientation = VERTICAL
        layoutDirection = LAYOUT_DIRECTION_RTL
        isClickable = true
        setWillNotDraw(false)
    }

    fun setColors(value: AppLook.Colors) {
        colors = value
        build()
    }

    private fun build() {
        removeAllViews()
        val ink = CounterStyle.parse(colors.ink)
        val gold = CounterStyle.parse(colors.gold)
        val muted = CounterStyle.withAlpha(ink, 0.68f)
        val sheetColor = CounterStyle.parse(colors.deepTop)
        background = GradientDrawable().apply {
            setColor(sheetColor)
            val r = dp(28f).toFloat()
            cornerRadii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f)
        }
        topLine.color = CounterStyle.withAlpha(gold, 0.7f)

        addView(View(context).apply {
            background = GradientDrawable().apply { setColor(CounterStyle.withAlpha(gold, 0.45f)); cornerRadius = dp(2f).toFloat() }
        }, LayoutParams(dp(40f), dp(4f)).apply { gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = dp(10f) })

        // Title and its note on the right; the sheet's own close on the left.
        val header = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(6f), 0, dp(6f), dp(8f))
        }
        val titles = LinearLayout(context).apply { orientation = VERTICAL }
        titles.addView(TextView(context).apply {
            text = FullScreenCounterView.LABEL_ADHKAR
            typeface = CounterStyle.tajawalBold(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            setTextColor(ink)
        })
        titles.addView(TextView(context).apply {
            text = LABEL_COUNTS_NOTE
            typeface = CounterStyle.tajawal(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setTextColor(muted)
        })
        header.addView(titles, LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f))
        header.addView(FrameLayout(context).apply {
            isClickable = true
            isFocusable = true
            contentDescription = LABEL_CLOSE_LIST
            addView(CounterIconView(context, CounterIconView.Kind.CLOSE).apply { color = muted }, FrameLayout.LayoutParams(dp(18f), dp(18f), Gravity.CENTER))
            setOnClickListener { listener.onDismiss() }
        }, LayoutParams(dp(44f), dp(44f)))
        addView(header, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

        val list = LinearLayout(context).apply { orientation = VERTICAL }
        for (row in rows) list.addView(rowView(row, row.id == selectedId, ink, gold, muted), LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(4f) })
        val scroll = object : ScrollView(context) {
            override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
                super.onMeasure(widthMeasureSpec, MeasureSpec.makeMeasureSpec(maxListHeight, MeasureSpec.AT_MOST))
            }
        }.apply { isVerticalScrollBarEnabled = true; addView(list) }
        addView(scroll, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))

        addView(View(context).apply { setBackgroundColor(CounterStyle.withAlpha(gold, 0.25f)) }, LayoutParams(LayoutParams.MATCH_PARENT, 1.coerceAtLeast(dp(1f))).apply {
            topMargin = dp(10f); bottomMargin = dp(10f); leftMargin = dp(6f); rightMargin = dp(6f)
        })
        val footer = LinearLayout(context).apply { orientation = HORIZONTAL }
        footer.addView(footerButton(LABEL_CUSTOM_DHIKR, ink) { listener.onCustomDhikr() }, LayoutParams(0, dp(46f), 1f).apply { marginEnd = dp(8f) })
        footer.addView(footerButton(LABEL_SETTINGS, ink) { listener.onSettings() }, LayoutParams(0, dp(46f), 1f))
        addView(footer, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT))
    }

    private fun rowView(row: FullScreenCounterView.DhikrRow, selected: Boolean, ink: Int, gold: Int, muted: Int): View = LinearLayout(context).apply {
        orientation = HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
        minimumHeight = dp(56f)
        setPadding(dp(14f), dp(6f), dp(14f), dp(6f))
        isClickable = true
        isFocusable = true
        contentDescription = "${row.label}: ${row.count}"
        if (selected) {
            isSelected = true
            background = GradientDrawable().apply {
                cornerRadius = dp(16f).toFloat()
                setColor(CounterStyle.withAlpha(gold, 0.14f))
                setStroke(dp(1f).coerceAtLeast(1), CounterStyle.withAlpha(gold, 0.55f))
            }
            addView(CounterIconView(context, CounterIconView.Kind.CHECK).apply { color = gold }, LayoutParams(dp(16f), dp(16f)).apply { marginEnd = dp(10f) })
        }
        addView(TextView(context).apply {
            text = row.label
            typeface = CounterStyle.amiri(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, if (row.label.length > 40) 18f else 20f)
            setTextColor(ink)
            textDirection = TEXT_DIRECTION_RTL
            ellipsize = null
            setLineSpacing(0f, 1.1f)
        }, LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f))
        addView(TextView(context).apply {
            text = String.format(Locale.US, "%d", row.count)
            typeface = if (selected) CounterStyle.tajawalBold(context) else CounterStyle.tajawal(context)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setTextColor(if (selected) gold else muted)
        }, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply { marginStart = dp(12f) })
        setOnClickListener { listener.onSelect(row.id) }
    }

    private fun footerButton(label: String, ink: Int, onClick: () -> Unit): View = TextView(context).apply {
        text = label
        typeface = CounterStyle.tajawal(context)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        setTextColor(ink)
        gravity = Gravity.CENTER
        maxLines = 1
        ellipsize = TextUtils.TruncateAt.END
        isClickable = true
        isFocusable = true
        background = GradientDrawable().apply {
            cornerRadius = dp(23f).toFloat()
            setColor(CounterStyle.withAlpha(ink, 0.07f))
            setStroke(dp(1f).coerceAtLeast(1), CounterStyle.withAlpha(ink, 0.22f))
        }
        setOnClickListener { onClick() }
    }

    override fun dispatchDraw(canvas: Canvas) {
        super.dispatchDraw(canvas)
        // The gold hairline along the sheet's top edge.
        val inset = dp(22f).toFloat()
        canvas.drawRect(inset, 0f, width - inset, density, topLine)
    }

    // The sheet's touches are its own: nothing on it counts, and it never lets one through to the veil.
    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean = true

    companion object {
        const val LABEL_COUNTS_NOTE = "الرقم بجانب كل ذكر هو عدده الحالي"
        const val LABEL_CLOSE_LIST = "إغلاق القائمة"
        const val LABEL_CUSTOM_DHIKR = "ذكر مخصص"
        const val LABEL_SETTINGS = "الإعدادات"
    }
}
