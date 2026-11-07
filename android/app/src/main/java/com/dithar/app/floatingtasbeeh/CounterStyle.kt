package com.dithar.app.floatingtasbeeh

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Typeface
import android.view.View
import androidx.core.content.res.ResourcesCompat
import com.dithar.app.R

/**
 * The floating counter's type and drawing helpers. Amiri (the dhikr and its
 * count) and Tajawal (labels) ship in res/font — the same faces the app uses
 * (licences: assets/licenses/fonts) — so the overlay reads as DITHAR over any
 * app. Should a face ever fail to load, the system serif / sans stands in.
 */
object CounterStyle {
    private var amiri: Typeface? = null
    private var amiriBold: Typeface? = null
    private var tajawal: Typeface? = null
    private var tajawalBold: Typeface? = null

    private fun load(context: Context, id: Int, fallback: Typeface): Typeface =
        runCatching { ResourcesCompat.getFont(context, id) }.getOrNull() ?: fallback

    fun amiri(context: Context): Typeface = amiri ?: load(context, R.font.amiri_regular, Typeface.SERIF).also { amiri = it }
    fun amiriBold(context: Context): Typeface =
        amiriBold ?: load(context, R.font.amiri_bold, Typeface.create(Typeface.SERIF, Typeface.BOLD)).also { amiriBold = it }
    fun tajawal(context: Context): Typeface = tajawal ?: load(context, R.font.tajawal_medium, Typeface.SANS_SERIF).also { tajawal = it }
    fun tajawalBold(context: Context): Typeface =
        tajawalBold ?: load(context, R.font.tajawal_bold, Typeface.DEFAULT_BOLD).also { tajawalBold = it }

    fun parse(hex: String): Int = Color.parseColor(hex)
    fun withAlpha(color: Int, alpha: Float): Int = Color.argb((alpha * 255).toInt().coerceIn(0, 255), Color.red(color), Color.green(color), Color.blue(color))
}

@SuppressLint("ViewConstructor") // Built in code only, never inflated from XML.
/** The control icons, drawn as strokes on a 24-unit grid like the design's: the list, minimize, close, and the list's check. */
class CounterIconView(context: Context, private val kind: Kind) : View(context) {
    enum class Kind { LIST, MINIMIZE, CLOSE, CHECK }

    var color: Int = Color.WHITE
        set(value) {
            field = value
            paint.color = value
            invalidate()
        }

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val path = Path()

    init {
        importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        paint.color = color
    }

    override fun onDraw(canvas: Canvas) {
        val unit = width / 24f
        paint.strokeWidth = 1.7f * unit
        path.reset()
        fun line(x1: Float, y1: Float, x2: Float, y2: Float) {
            path.moveTo(x1 * unit, y1 * unit)
            path.lineTo(x2 * unit, y2 * unit)
        }
        when (kind) {
            Kind.LIST -> {
                // Drawn for right-to-left reading: the bullets on the right, as the list sheet reads.
                line(4f, 6f, 16f, 6f); line(4f, 12f, 16f, 12f); line(4f, 18f, 16f, 18f)
                canvas.drawPath(path, paint)
                paint.style = Paint.Style.FILL
                for (y in floatArrayOf(6f, 12f, 18f)) canvas.drawCircle(20f * unit, y * unit, 1.1f * unit, paint)
                paint.style = Paint.Style.STROKE
                return
            }
            Kind.MINIMIZE -> {
                line(14f, 4f, 14f, 10f); line(14f, 10f, 20f, 10f); line(20f, 4f, 14f, 10f)
                line(10f, 20f, 10f, 14f); line(10f, 14f, 4f, 14f); line(4f, 20f, 10f, 14f)
            }
            Kind.CLOSE -> {
                line(6f, 6f, 18f, 18f); line(18f, 6f, 6f, 18f)
            }
            Kind.CHECK -> {
                paint.strokeWidth = 2.2f * unit
                line(5f, 12.5f, 9.5f, 17f); line(9.5f, 17f, 19f, 7.5f)
            }
        }
        canvas.drawPath(path, paint)
    }
}
