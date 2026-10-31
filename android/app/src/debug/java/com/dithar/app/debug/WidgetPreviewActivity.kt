package com.dithar.app.debug

import android.app.Activity
import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.SizeF
import android.util.TypedValue
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.dithar.app.R
import com.dithar.app.reminders.DhikrWidgetProvider
import com.dithar.app.reminders.ReminderItem
import com.dithar.app.reminders.ReminderStore
import com.dithar.app.reminders.WidgetRenderer
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * DEBUG BUILDS ONLY — hosts the real home-screen widget (DhikrWidgetProvider,
 * its RemoteViews and WidgetRenderer's fitting) at chosen sizes, without a
 * launcher, to look at it and to measure what is really drawn:
 *
 *   adb shell appwidget grantbind --package com.dithar.app --user 0
 *   # look (screenshot with: adb exec-out screencap -p > w.png)
 *   adb shell am start -n com.dithar.app/.debug.WidgetPreviewActivity \
 *       --es ids "hadith:6" --es sizes "180x80,250x110,320x180" --es lang ar
 *   # measure every widget item at every size (report: files/widget-probe-<lang>.json)
 *   adb shell am start -n com.dithar.app/.debug.WidgetPreviewActivity --es probe 1 --es lang ar
 *
 * The probe renders each item alone, then reads the drawn TextViews: the
 * height its whole text needs against the height the view really got
 * (clipped when less), any ellipsis, and whether the drawn string is
 * exactly the stored one. `ids` / the probe only change the stored pool,
 * language and reminder switch for the preview; they are restored after.
 * The app must have been opened once, so its content pool is on the device.
 */
class WidgetPreviewActivity : Activity() {
    private lateinit var host: AppWidgetHost
    private val handler = Handler(Looper.getMainLooper())
    private val hosted = mutableListOf<Triple<Int, Pair<Float, Float>, AppWidgetHostView>>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val manager = AppWidgetManager.getInstance(this)
        val provider = ComponentName(this, DhikrWidgetProvider::class.java)
        host = AppWidgetHost(this, HOST_ID).also { it.deleteHost(); it.startListening() }
        val info = manager.installedProviders.first { it.provider == provider }
        val sizes = (intent.getStringExtra("sizes") ?: "180x80,250x110,320x180,400x260")
            .split(',').mapNotNull { s -> s.trim().split('x').takeIf { it.size == 2 }?.let { it[0].toFloat() to it[1].toFloat() } }

        val store = ReminderStore(this)
        val savedPool = store.pool
        val savedEnabled = store.enabled
        val savedLanguage = store.language
        intent.getStringExtra("lang")?.let { store.language = it }
        store.enabled = false

        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(40, 44, 52))
            setPadding(dp(12f), dp(28f), dp(12f), dp(12f))
        }
        for ((w, h) in sizes) {
            val id = host.allocateAppWidgetId()
            val options = Bundle().apply {
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, w.toInt())
                putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, w.toInt())
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, h.toInt())
                putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, h.toInt())
                if (Build.VERSION.SDK_INT >= 31) putParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES, arrayListOf(SizeF(w, h)))
            }
            check(manager.bindAppWidgetIdIfAllowed(id, provider, options)) { "run: adb shell appwidget grantbind --package $packageName --user 0" }
            val view = host.createView(this, id, info)
            if (Build.VERSION.SDK_INT >= 31) view.updateAppWidgetSize(Bundle(), listOf(SizeF(w, h)))
            column.addView(TextView(this).apply { text = "${w.toInt()} × ${h.toInt()} dp"; setTextColor(Color.LTGRAY); textSize = 11f })
            column.addView(view, LinearLayout.LayoutParams(dp(w), dp(h)).apply { bottomMargin = dp(14f) })
            hosted += Triple(id, w to h, view)
        }
        setContentView(ScrollView(this).apply { addView(column, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT) })

        val restore = {
            store.pool = savedPool
            store.enabled = savedEnabled
            store.language = savedLanguage
        }
        if (intent.getStringExtra("probe") != null) {
            probe(store, manager, savedPool.filter { it.widget }, restore)
        } else {
            val only = intent.getStringExtra("ids")?.split(',')?.map { it.trim() }?.filter { it.isNotEmpty() }
            if (!only.isNullOrEmpty()) store.pool = savedPool.filter { it.id in only }
            for ((id, _, _) in hosted) WidgetRenderer.update(this, manager, intArrayOf(id))
            restore()
        }
    }

    /** Renders each item alone at every size, then measures what was drawn. */
    private fun probe(store: ReminderStore, manager: AppWidgetManager, items: List<ReminderItem>, restore: () -> Unit) {
        val lang = store.language
        val report = JSONArray()
        fun step(index: Int) {
            if (index >= items.size) {
                restore()
                val out = JSONObject()
                    .put("language", lang)
                    .put("density", resources.displayMetrics.density)
                    .put("fontScale", resources.configuration.fontScale)
                    .put("sdk", Build.VERSION.SDK_INT)
                    .put("stored", JSONArray(items.map { ReminderStore.itemJson(it) }))
                    .put("results", report)
                File(filesDir, "widget-probe-$lang.json").writeText(out.toString())
                Log.i(TAG, "PROBE DONE $lang items=${items.size} rows=${report.length()}")
                return
            }
            val item = items[index]
            store.pool = listOf(item)
            for ((id, _, _) in hosted) WidgetRenderer.update(this, manager, intArrayOf(id))
            // The host applies the RemoteViews on the main thread; measure once laid out.
            handler.postDelayed({
                for ((_, size, view) in hosted) report.put(measure(item, size, view))
                step(index + 1)
            }, 220)
        }
        step(0)
    }

    private fun measure(item: ReminderItem, size: Pair<Float, Float>, view: AppWidgetHostView): JSONObject {
        val row = JSONObject().put("id", item.id).put("size", "${size.first.toInt()}x${size.second.toInt()}")
        val text = view.findViewById<TextView>(R.id.widget_text)
        val title = view.findViewById<TextView>(R.id.widget_title)
        if (text == null) return row.put("error", "not inflated")
        val drawn = text.text?.toString() ?: ""
        row.put("mode", if (drawn == item.widgetShownText) "item" else "note").put("drawnText", drawn)
        row.put("textExact", drawn == item.widgetShownText)
        val fields = JSONObject()
        for ((name, id) in listOf("title" to R.id.widget_title, "text" to R.id.widget_text, "meaning" to R.id.widget_meaning, "detail" to R.id.widget_detail, "source" to R.id.widget_source, "comment" to R.id.widget_comment)) {
            val tv = view.findViewById<TextView>(id) ?: continue
            if (tv.visibility != View.VISIBLE) continue
            val layout = tv.layout
            val needed = (layout?.height ?: 0) + tv.compoundPaddingTop + tv.compoundPaddingBottom
            val ellipsized = layout != null && (0 until layout.lineCount).any { layout.getEllipsisCount(it) > 0 }
            fields.put(
                name,
                JSONObject()
                    .put("lines", layout?.lineCount ?: 0)
                    .put("neededPx", needed)
                    .put("gotPx", tv.height)
                    .put("clipped", needed > tv.height + 1)
                    .put("ellipsized", ellipsized)
                    .put("topPx", tv.top)
                    .put("textSizeSp", tv.textSize / resources.displayMetrics.scaledDensity)
                    .put("typeface", tv.typeface?.toString() ?: "null"),
            )
        }
        row.put("fields", fields)
        // The centred column: content taller than it loses lines at the top and bottom.
        val column = text.parent as? ViewGroup
        if (column != null) {
            var used = 0
            for (i in 0 until column.childCount) {
                val c = column.getChildAt(i)
                if (c.visibility == View.GONE) continue
                val lp = c.layoutParams as? ViewGroup.MarginLayoutParams
                val tv = c as? TextView
                val need = if (tv?.layout != null) tv.layout.height + tv.compoundPaddingTop + tv.compoundPaddingBottom else c.height
                used += need + (lp?.topMargin ?: 0) + (lp?.bottomMargin ?: 0)
            }
            row.put("columnNeededPx", used).put("columnGotPx", column.height).put("columnOverflow", used > column.height + 1)
        }
        row.put("titleText", title?.text?.toString() ?: "")
        return row
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        host.stopListening()
        host.deleteHost()
        super.onDestroy()
    }

    private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics).toInt()

    private companion object {
        const val HOST_ID = 4711
        const val TAG = "DitharWidgetProbe"
    }
}
