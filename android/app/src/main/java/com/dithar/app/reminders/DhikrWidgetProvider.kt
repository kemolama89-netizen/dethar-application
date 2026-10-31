package com.dithar.app.reminders

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.text.Layout
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.text.style.StyleSpan
import android.util.SizeF
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.dithar.app.R

/**
 * DITHAR's home-screen widget — a real Android HOME-SCREEN widget, separate
 * from system notifications: it shows the current reminder (a verified dua,
 * Hadith, dhikr virtue or attributed poetry) with one short DITHAR comment
 * over a calm full-bleed background tinted with the app's palette, and
 * opens the app (the full-screen reflection when that's on) when tapped.
 * Its heart saves the shown item to Favorites (FavoriteToggleReceiver),
 * without opening the app. It works whether or not reminder NOTIFICATIONS
 * are on, and never wakes the phone on its own (updatePeriodMillis 0): it is
 * redrawn when a reminder arrives, when its settings change, when a heart is
 * tapped, and at each time-of-day change by a non-waking alarm.
 */
class DhikrWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        WidgetRenderer.update(context, appWidgetManager, appWidgetIds)
        RemindersScheduler.armWidgetRefresh(context)
        // A first widget may be what makes reminders worth scheduling (content rotation with notifications off).
        RemindersScheduler.armReminder(context)
    }

    /** Resized: redraw so the text is re-fitted to the new size. */
    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        WidgetRenderer.update(context, appWidgetManager, intArrayOf(appWidgetId))
    }

    override fun onDisabled(context: Context) {
        // The last widget was removed: its refresh alarm (and a widget-only reminder rotation) stop.
        RemindersScheduler.armWidgetRefresh(context)
        RemindersScheduler.armReminder(context)
    }
}

object WidgetRenderer {
    /** Background bitmaps stay small: RemoteViews bitmaps cross processes (and memory) on every update. */
    private const val MAX_BACKGROUND_WIDTH = 540

    fun updateAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, DhikrWidgetProvider::class.java))
        if (ids.isNotEmpty()) update(context, manager, ids)
    }

    fun update(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val store = ReminderStore(context)
        val favorites = FavoritesStore(context)
        val now = System.currentTimeMillis()
        val pool = store.pool
        // While reminders are on, the slot moves only with a delivered reminder — at the user's interval.
        val slot = WidgetRotation.displaySlot(store.enabled, store.widgetSlot, now)
        // The latest reminder (and its comment) first while reminders are on — when the widget may show it.
        val current = if (store.enabled) pool.firstOrNull { it.id == store.currentId } else null
        val candidates = WidgetRotation.candidates(pool, slot, current)
        val background = loadBackground(context, store, now)
        val style = Style(en = store.language == "en", accent = store.widgetAccent, tint = store.widgetTint)
        // Comments: the same one on every redraw of this slot, never the previous slot's again.
        val memory = store.widgetComments
        val (keep, avoid) = memory.forSlot(slot)
        var drawnComment: String? = null
        for (id in ids) {
            val sizes = widgetSizes(manager.getAppWidgetOptions(id)).map { contentSize(context, it) }
            // One item per widget, chosen so it fits EVERY size the launcher may show (rotation, resizing).
            var chosen: Pair<ReminderItem, ReminderComment?>? = null
            for (item in candidates) {
                val comment = WidgetRotation.comment(item, slot, keep ?: if (item.id == current?.id) store.currentCommentId else null, avoid)
                if (sizes.all { measure(context, it, item, comment, style.en) != null }) {
                    chosen = item to comment
                    break
                }
            }
            // Each size gets its own tap: sizes may differ in whether the comment fits, and a tap must
            // open exactly what THAT size drew (openRequestCode).
            val views = sizes.withIndex().associate { (index, size) ->
                size to build(context, id, index, size, chosen, candidates.firstOrNull(), background, style, favorites)
            }
            manager.updateAppWidget(id, combine(views))
            if (id == ids.first()) drawnComment = chosen?.second?.id
        }
        val next = memory.after(slot, drawnComment)
        if (next != memory) store.widgetComments = next
    }

    private data class Style(val en: Boolean, val accent: Int, val tint: Int)

    /** A widget size in dp; [reported]: the launcher's own size it came from (Android 12+), the key its layout is matched by. */
    data class SizeDp(val width: Float, val height: Float, val reported: SizeF? = null)

    // ---- the widget's sizes ------------------------------------------------

    private const val FALLBACK_WIDTH_DP = 250f // dhikr_widget_info.xml minWidth
    private const val FALLBACK_HEIGHT_DP = 110f

    /**
     * Every size the launcher may draw this widget at: Android 12+ reports
     * them (OPTION_APPWIDGET_SIZES); before that, portrait is
     * (min width × max height) and landscape (max width × min height).
     */
    private fun widgetSizes(options: Bundle?): List<SizeDp> {
        if (Build.VERSION.SDK_INT >= 31) {
            @Suppress("DEPRECATION")
            val reported = options?.getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
            val sizes = reported?.filter { it.width > 0 && it.height > 0 }?.distinct()?.map { SizeDp(it.width, it.height, it) }
            if (!sizes.isNullOrEmpty()) return sizes
        }
        val minW = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)?.takeIf { it > 0 }?.toFloat() ?: FALLBACK_WIDTH_DP
        val minH = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)?.takeIf { it > 0 }?.toFloat() ?: FALLBACK_HEIGHT_DP
        val maxW = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH)?.takeIf { it > 0 }?.toFloat() ?: minW
        val maxH = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)?.takeIf { it > 0 }?.toFloat() ?: minH
        return listOf(SizeDp(minW, maxH), SizeDp(maxW, minH)).distinct()
    }

    /**
     * The room really left for the layout. Launchers differ: some report the
     * size after their own padding, others draw the framework's default
     * widget padding inside the reported size. Planning for the padding a
     * host may add means a launcher that adds it can never clip the text;
     * one that doesn't only gets slightly smaller text.
     */
    private fun contentSize(context: Context, size: SizeDp): SizeDp {
        val pad = AppWidgetHostView.getDefaultPaddingForWidget(context, ComponentName(context, DhikrWidgetProvider::class.java), null)
        val density = context.resources.displayMetrics.density
        return SizeDp(
            (size.width - (pad.left + pad.right) / density).coerceAtLeast(1f),
            (size.height - (pad.top + pad.bottom) / density).coerceAtLeast(1f),
            size.reported,
        )
    }

    /** One RemoteViews per size: Android 12+ picks by size; before, by orientation (portrait first in the list). */
    private fun combine(views: Map<SizeDp, RemoteViews>): RemoteViews {
        if (views.size == 1) return views.values.first()
        // Keys must be the launcher's own sizes; the content sizes are ordered the same way, so map them back by order.
        if (Build.VERSION.SDK_INT >= 31) return RemoteViews(views.mapKeys { (s, _) -> s.reported ?: SizeF(s.width, s.height) })
        val list = views.values.toList()
        return RemoteViews(list[1], list[0])
    }

    // ---- measuring (mirrors res/layout/widget_dhikr.xml) ---------------------
    // Padding 12dp at the sides, 2dp top, 8dp bottom; a 36dp title row; margins
    // above meaning 4dp, detail 4dp, source 6dp, comment 6dp; line spacing x1.2
    // (text), x1.15 (meaning, detail), x1.1 (source, comment); sizes 13sp
    // (detail), 11sp (source), 12sp (comment).
    // Every TextView breaks lines "balanced", never hyphenates, and (API 28+)
    // makes room for the taller Arabic fallback font, exactly as measured here.

    private const val SIDE_PADDING_DP = 12f
    private const val VERTICAL_CHROME_DP = 2f + 8f + 36f
    /**
     * Launchers may round sizes, and some report a size a little larger than
     * the box they really draw. Text that overflows the centred column loses
     * its first AND last lines with no sign of it, so the plan keeps a margin
     * that grows with the widget: at least [SAFETY_DP], else [SAFETY_FRACTION]
     * of the height.
     */
    private const val SAFETY_DP = 4f
    private const val SAFETY_FRACTION = 0.06f
    private const val DETAIL_SP = 13f
    private const val SOURCE_SP = 11f
    private const val COMMENT_SP = 12f

    private fun dp(context: Context, v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, context.resources.displayMetrics)

    private fun sp(context: Context, v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, v, context.resources.displayMetrics)

    private fun layoutHeight(context: Context, text: CharSequence, sizeSp: Float, spacing: Float, widthPx: Int, rtl: Boolean): Int =
        if (text.isEmpty()) 0 else buildLayout(context, text, sizeSp, spacing, widthPx, rtl).height

    // Layout.BREAK_STRATEGY_BALANCED equals LineBreaker's (API 29+) constant; minSdk is 24.
    @SuppressLint("WrongConstant")
    private fun buildLayout(context: Context, text: CharSequence, sizeSp: Float, spacing: Float, widthPx: Int, rtl: Boolean): StaticLayout {
        val paint = TextPaint(TextPaint.ANTI_ALIAS_FLAG).apply { textSize = sp(context, sizeSp) }
        val builder = StaticLayout.Builder.obtain(text, 0, text.length, paint, widthPx)
            .setAlignment(Layout.Alignment.ALIGN_CENTER)
            .setLineSpacing(0f, spacing)
            .setIncludePad(true)
            .setBreakStrategy(Layout.BREAK_STRATEGY_BALANCED)
            .setHyphenationFrequency(Layout.HYPHENATION_FREQUENCY_NONE)
            .setTextDirection(if (rtl) TextDirectionHeuristics.RTL else TextDirectionHeuristics.FIRSTSTRONG_LTR)
        if (Build.VERSION.SDK_INT >= 28) builder.setUseLineSpacingFromFallbacks(true)
        return builder.build()
    }

    private fun textWidth(context: Context, size: SizeDp) = (dp(context, size.width - 2 * SIDE_PADDING_DP)).toInt().coerceAtLeast(1)

    private fun available(context: Context, size: SizeDp) =
        (dp(context, size.height - VERTICAL_CHROME_DP - maxOf(SAFETY_DP, size.height * SAFETY_FRACTION))).toInt()

    /** The comment as shown: always labelled as DITHAR's own words; italic in English only (slanted Arabic breaks its joins). */
    private fun commentText(comment: ReminderComment, en: Boolean): CharSequence {
        val label = if (en) "DITHAR reflection: " else "تأمّل دِثار: "
        return SpannableStringBuilder(label).apply {
            setSpan(StyleSpan(Typeface.BOLD), 0, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            val start = length
            append(comment.text)
            if (en) setSpan(StyleSpan(Typeface.ITALIC), start, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
    }

    /** A dhikr's virtue (ReminderItem.detail), labelled so it reads as what the dhikr is for — "" when none. */
    private fun detailText(item: ReminderItem, en: Boolean): CharSequence {
        if (item.detail.isBlank()) return ""
        val label = if (en) "Its virtue: " else "فضله: "
        return SpannableStringBuilder(label).apply {
            setSpan(StyleSpan(Typeface.BOLD), 0, label.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            append(item.detail)
        }
    }

    /** How [item] fits [size] in full, or null when it can't (WidgetTextFit). */
    private fun measure(context: Context, size: SizeDp, item: ReminderItem, comment: ReminderComment?, en: Boolean): WidgetTextFit.Fit? {
        val width = textWidth(context, size)
        val meaning = if (en) item.meaning else ""
        val detail = detailText(item, en)
        val detailHeight = if (detail.isEmpty()) 0 else layoutHeight(context, detail, DETAIL_SP, 1.15f, width, !en) + dp(context, 4f).toInt()
        val sourceHeight = if (item.source.isEmpty()) 0 else layoutHeight(context, item.source, SOURCE_SP, 1.1f, width, !en) + dp(context, 6f).toInt()
        val commentHeight = if (comment == null) 0 else layoutHeight(context, commentText(comment, en), COMMENT_SP, 1.1f, width, !en) + dp(context, 6f).toInt()
        return WidgetTextFit.choose(available(context, size), comment != null) { textSp, withComment ->
            layoutHeight(context, item.widgetShownText, textSp, 1.2f, width, true) +
                (if (meaning.isEmpty()) 0 else layoutHeight(context, meaning, textSp * WidgetTextFit.MEANING_SCALE, 1.15f, width, false) + dp(context, 4f).toInt()) +
                detailHeight + sourceHeight + if (withComment) commentHeight else 0
        }
    }

    // ---- building one size ---------------------------------------------------

    private fun build(
        context: Context,
        widgetId: Int,
        sizeIndex: Int,
        size: SizeDp,
        chosen: Pair<ReminderItem, ReminderComment?>?,
        firstCandidate: ReminderItem?,
        background: Bitmap?,
        style: Style,
        favorites: FavoritesStore,
    ): RemoteViews {
        val en = style.en
        val views = RemoteViews(context.packageName, R.layout.widget_dhikr)
        // The app's language decides the layout's direction (title and heart mirror in Arabic), whatever the phone's language.
        views.setInt(R.id.widget_root, "setLayoutDirection", if (en) View.LAYOUT_DIRECTION_LTR else View.LAYOUT_DIRECTION_RTL)
        if (background != null) views.setImageViewBitmap(R.id.widget_background, background) else views.setImageViewResource(R.id.widget_background, R.drawable.widget_shape)
        // A light wash of the palette's primary under the scrim: the photo stays visible, the text stays readable.
        views.setInt(R.id.widget_tint, "setBackgroundColor", (style.tint and 0x00FFFFFF) or (TINT_ALPHA shl 24))
        views.setTextColor(R.id.widget_title, style.accent)
        views.setViewVisibility(R.id.widget_meaning, View.GONE)
        views.setViewVisibility(R.id.widget_detail, View.GONE)
        views.setViewVisibility(R.id.widget_source, View.GONE)
        views.setViewVisibility(R.id.widget_comment, View.GONE)
        views.setViewVisibility(R.id.widget_heart, View.GONE)
        val item = chosen?.first
        val fit = chosen?.let { (i, c) -> measure(context, size, i, c, en) }
        when {
            item != null && fit != null -> {
                val comment = chosen.second
                views.setTextViewText(R.id.widget_title, item.title)
                views.setViewVisibility(R.id.widget_title, View.VISIBLE)
                views.setTextViewText(R.id.widget_text, item.widgetShownText)
                views.setTextViewTextSize(R.id.widget_text, TypedValue.COMPLEX_UNIT_SP, fit.textSp)
                views.setInt(R.id.widget_text, "setMaxLines", Int.MAX_VALUE)
                if (en && item.meaning.isNotEmpty()) {
                    views.setTextViewText(R.id.widget_meaning, item.meaning)
                    views.setTextViewTextSize(R.id.widget_meaning, TypedValue.COMPLEX_UNIT_SP, fit.textSp * WidgetTextFit.MEANING_SCALE)
                    views.setViewVisibility(R.id.widget_meaning, View.VISIBLE)
                }
                val detail = detailText(item, en)
                if (detail.isNotEmpty()) {
                    views.setTextViewText(R.id.widget_detail, detail)
                    views.setViewVisibility(R.id.widget_detail, View.VISIBLE)
                }
                if (item.source.isNotEmpty()) {
                    views.setTextViewText(R.id.widget_source, item.source)
                    views.setViewVisibility(R.id.widget_source, View.VISIBLE)
                }
                val shownComment = comment.takeIf { fit.showComment }
                if (shownComment != null) {
                    views.setTextViewText(R.id.widget_comment, commentText(shownComment, en))
                    views.setViewVisibility(R.id.widget_comment, View.VISIBLE)
                }
                val saved = favorites.isFavorite(item.id)
                views.setViewVisibility(R.id.widget_heart, View.VISIBLE)
                views.setImageViewResource(R.id.widget_heart, if (saved) R.drawable.ic_widget_heart_filled else R.drawable.ic_widget_heart_outline)
                views.setInt(R.id.widget_heart, "setColorFilter", style.accent)
                views.setContentDescription(
                    R.id.widget_heart,
                    when {
                        saved && en -> "Remove from Favorites"
                        saved -> "إزالة من المفضلة"
                        en -> "Save to Favorites"
                        else -> "إضافة إلى المفضلة"
                    },
                )
                views.setOnClickPendingIntent(R.id.widget_heart, favoriteIntent(context, widgetId, sizeIndex, item.id, shownComment?.id))
                // Opens this very item in full (with its source and the same comment as drawn here).
                views.setOnClickPendingIntent(R.id.widget_root, RemindersScheduler.openIntent(context, item, openRequestCode(widgetId, sizeIndex), shownComment))
            }
            firstCandidate != null -> {
                // Too small for any text in full: a complete short line that says where the text is — never a cut text.
                views.setTextViewText(R.id.widget_title, firstCandidate.title)
                views.setViewVisibility(R.id.widget_title, View.VISIBLE)
                showNote(context, views, size, if (en) WidgetTextFit.FULL_TEXT_NOTES_EN else WidgetTextFit.FULL_TEXT_NOTES_AR)
                views.setOnClickPendingIntent(R.id.widget_root, RemindersScheduler.openIntent(context, firstCandidate, openRequestCode(widgetId, sizeIndex)))
            }
            else -> {
                // Before the app has pushed any content (first launch pending): nothing to save yet.
                views.setViewVisibility(R.id.widget_title, View.GONE)
                showNote(context, views, size, listOf(context.getString(R.string.widget_placeholder), if (en) "DITHAR" else "دِثار"))
                views.setOnClickPendingIntent(R.id.widget_root, RemindersScheduler.openIntent(context, null, openRequestCode(widgetId, sizeIndex)))
            }
        }
        return views
    }

    /** A short complete line in place of the text (WidgetTextFit.chooseNote): one line only, never a clipped second one. */
    private fun showNote(context: Context, views: RemoteViews, size: SizeDp, notes: List<String>) {
        val width = textWidth(context, size)
        val (note, sp) = WidgetTextFit.chooseNote(notes, available(context, size)) { text, textSp ->
            val layout = buildLayout(context, text, textSp, 1.2f, width, true)
            if (layout.lineCount == 1) layout.height else null
        }
        views.setTextViewText(R.id.widget_text, note)
        views.setTextViewTextSize(R.id.widget_text, TypedValue.COMPLEX_UNIT_SP, sp)
        views.setInt(R.id.widget_text, "setMaxLines", 1)
    }

    /**
     * Distinct per widget AND per size: a PendingIntent is matched by its request code (never its
     * extras), so two widgets — or two sizes of one widget, one with the comment and one without —
     * sharing a code would all open whichever was built last (WidgetTapCode).
     */
    private fun openRequestCode(widgetId: Int, sizeIndex: Int) = WidgetTapCode.of(widgetId, sizeIndex)

    /** The heart's tap: a broadcast to the (non-exported) FavoriteToggleReceiver with the shown item and comment. */
    private fun favoriteIntent(context: Context, widgetId: Int, sizeIndex: Int, itemId: String, commentId: String?): PendingIntent {
        val intent = Intent(context, FavoriteToggleReceiver::class.java)
            .setAction(FavoriteToggleReceiver.ACTION_TOGGLE_FAVORITE)
            .putExtra(FavoriteToggleReceiver.EXTRA_ITEM_ID, itemId)
        if (commentId != null) intent.putExtra(FavoriteToggleReceiver.EXTRA_COMMENT_ID, commentId)
        // Per size as well as per widget: each size saves the comment IT shows (WidgetTapCode).
        return PendingIntent.getBroadcast(context, WidgetTapCode.favorite(widgetId, sizeIndex), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    /** The user's own photo, a fixed background, or the automatic one (time of day + season). */
    private fun loadBackground(context: Context, store: ReminderStore, now: Long): Bitmap? {
        if (store.backgroundMode == "custom") {
            val file = store.customBackgroundFile
            if (file.exists()) decode { BitmapFactory.decodeFile(file.absolutePath, it) }?.let { return it }
        }
        val id = if (store.backgroundMode == "fixed" && WidgetBackgrounds.isKnown(store.fixedBackground)) store.fixedBackground else WidgetBackgrounds.autoId(now, store.latitude)
        return try {
            decode { opts -> context.assets.open("public/backgrounds/$id.jpg").use { BitmapFactory.decodeStream(it, null, opts) } }
        } catch (_: Exception) {
            null
        }
    }

    /** Decodes at a size that fits MAX_BACKGROUND_WIDTH (a power-of-two subsample). */
    private fun decode(read: (BitmapFactory.Options) -> Bitmap?): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        read(bounds)
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= MAX_BACKGROUND_WIDTH) sample *= 2
        return read(BitmapFactory.Options().apply { inSampleSize = sample })
    }

    /** ~22% of the palette's primary over the photo. */
    private const val TINT_ALPHA = 0x38
}

/** The request codes of the widget's taps (pure, unit-tested): one per widget and size, never shared. */
object WidgetTapCode {
    private const val OPEN_BASE = 7404
    private const val FAVORITE_BASE = 7405
    const val MAX_SIZES = 8

    /** The widget's tap that opens the shown item. */
    fun of(widgetId: Int, sizeIndex: Int): Int = code(OPEN_BASE, widgetId, sizeIndex)

    /** The heart's tap (a broadcast; codes of different kinds never clash anyway). */
    fun favorite(widgetId: Int, sizeIndex: Int): Int = code(FAVORITE_BASE, widgetId, sizeIndex)

    private fun code(base: Int, widgetId: Int, sizeIndex: Int) = (base * 1000 + Math.floorMod(widgetId, 1000)) * MAX_SIZES + sizeIndex.coerceIn(0, MAX_SIZES - 1)
}
