package com.dithar.app.reminders

import android.app.Activity
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import com.dithar.app.look.AppLookStore

/**
 * What is on screen between a tap on a reminder (notification or widget) and
 * the reminder's own view: a plain, opaque cover in the look's page colour.
 *
 * JS can't prevent the flash by itself. When the app is brought back the
 * WebView shows its last frame (Home, or wherever the user was) until its JS
 * resumes and React has painted the reminder, and on a cold start the launch
 * logo shows first. So native covers the WebView synchronously, in the
 * activity's own launch or onNewIntent, before the activity draws, and the app
 * takes the cover away once the reminder has painted (reminderViewShown).
 *
 * A timer guarantees it can never stay up if that signal is lost. Main thread only.
 */
internal class ReminderOpenCover(private val activity: Activity) {
    private val handler = Handler(Looper.getMainLooper())
    private val expire = Runnable { hide() }
    private var view: View? = null

    fun show(maxMs: Long) {
        if (activity.isFinishing) return
        if (view == null) {
            val cover = View(activity).apply {
                setBackgroundColor(Color.parseColor(AppLookStore(activity).currentColors().page))
                isClickable = true // nothing beneath it can be tapped unseen
            }
            activity.addContentView(cover, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            view = cover
        }
        handler.removeCallbacks(expire)
        handler.postDelayed(expire, maxMs)
    }

    fun hide() {
        handler.removeCallbacks(expire)
        val cover = view ?: return
        view = null
        (cover.parent as? ViewGroup)?.removeView(cover)
    }

    companion object {
        /** The bundle, the content library and the view all load first on a cold start. */
        const val COLD_START_MAX_MS = 8_000L
        const val RUNNING_MAX_MS = 3_000L
    }
}
