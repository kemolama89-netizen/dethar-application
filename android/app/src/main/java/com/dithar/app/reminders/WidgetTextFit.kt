package com.dithar.app.reminders

/**
 * How the home-screen widget fits its text into the space it really has
 * (DhikrWidgetProvider measures every candidate with Android's own
 * StaticLayout, configured exactly like the widget's TextViews, at each of
 * the widget's real sizes).
 *
 * The religious text is never shortened or cut to make room:
 *  1. the largest text size at which the whole text, its English meaning
 *     (English mode), its source and the DITHAR comment all fit;
 *  2. otherwise the same without the comment (DITHAR's own words go first);
 *  3. otherwise it does not fit — [choose] returns null and the renderer
 *     tries the next item (WidgetRotation.candidates), so the widget shows a
 *     shorter text complete instead of a long one cut off.
 * Below [TEXT_SIZES_SP]'s smallest size, vowelled Arabic stops being legible
 * on a home screen (the diacritics merge), so nothing is drawn smaller.
 * Tapping the widget always opens the item in full in the app.
 */
object WidgetTextFit {
    /** Arabic text sizes tried, largest first (sp). The meaning is drawn at [MEANING_SCALE] of it. */
    val TEXT_SIZES_SP = listOf(22f, 21f, 20f, 19f, 18f, 17f, 16f, 15f, 14f, 13f)
    /** The comment is only kept while the text can stay at least this large. */
    const val MIN_SIZE_WITH_COMMENT_SP = 14f
    const val MEANING_SCALE = 0.75f

    data class Fit(val textSp: Float, val showComment: Boolean)

    /**
     * Shown instead of a text that can't fit the widget whole (longest first;
     * the widget opens the item in full in DITHAR when tapped). Never a part
     * of the text: no excerpt is cut from a verse, Hadith or dhikr.
     */
    val FULL_TEXT_NOTES_AR = listOf("اقرأ النص كاملًا", "اقرأ كاملًا")
    val FULL_TEXT_NOTES_EN = listOf("Read the full text", "Read in full")

    /** Below this a short UI note (not religious text) is still readable. */
    const val NOTE_MIN_SP = 11f
    /** UI note sizes tried, largest first. */
    val NOTE_SIZES_SP = listOf(16f, 15f, 14f, 13f, 12f, NOTE_MIN_SP)

    /**
     * The note shown when no text fits a very small widget: the first of
     * [notes] (longest first) at the largest size where it fits on ONE line
     * within [availablePx]; failing all, the last (shortest) at the smallest
     * size — drawn on one line only, so it can never wrap into a clipped
     * second line. [lineHeight] (note, size) → its height on one line, or
     * null when it needs more than one line at that size.
     */
    fun chooseNote(notes: List<String>, availablePx: Int, lineHeight: (note: String, sp: Float) -> Int?): Pair<String, Float> {
        for (note in notes) for (sp in NOTE_SIZES_SP) {
            val h = lineHeight(note, sp) ?: continue
            if (h <= availablePx) return note to sp
        }
        return notes.last() to NOTE_MIN_SP
    }

    /**
     * [contentHeight] (text size, with comment?) → the height in px of
     * everything below the title row: text, meaning, source, comment and
     * their margins. Null when even the smallest size can't hold it all.
     */
    fun choose(availablePx: Int, hasComment: Boolean, contentHeight: (textSp: Float, withComment: Boolean) -> Int): Fit? {
        if (hasComment) {
            for (sp in TEXT_SIZES_SP) {
                if (sp < MIN_SIZE_WITH_COMMENT_SP) break
                if (contentHeight(sp, true) <= availablePx) return Fit(sp, true)
            }
        }
        for (sp in TEXT_SIZES_SP) {
            if (contentHeight(sp, false) <= availablePx) return Fit(sp, false)
        }
        return null
    }
}
