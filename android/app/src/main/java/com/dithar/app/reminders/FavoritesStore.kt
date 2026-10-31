package com.dithar.app.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

/**
 * The widget's side of Favorites: which content ids are favorites (for the
 * heart's state) and the taps not yet merged into the app's Favorites
 * (lib/favoritesSync.ts takes them, then pushes its full list back). Both
 * live in SharedPreferences, so they survive the app being closed and the
 * phone restarting. JS stays the source of truth for the saved entries.
 */
class FavoritesStore(context: Context) {
    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    val keys: Set<String>
        get() = try {
            val a = JSONArray(prefs.getString("keys", "[]"))
            (0 until a.length()).map { a.getString(it) }.toSet()
        } catch (_: Exception) {
            emptySet()
        }

    val pendingOps: List<FavoriteOp>
        get() = try {
            val a = JSONArray(prefs.getString("ops", "[]"))
            (0 until a.length()).map { parseOp(a.getJSONObject(it)) }
        } catch (_: Exception) {
            emptyList()
        }

    fun isFavorite(key: String): Boolean = key in keys

    /** A heart tap: flips the favorite and queues the change for the app. Returns whether it is now a favorite. */
    @Synchronized
    fun toggle(item: ReminderItem, comment: ReminderComment?, now: Long = System.currentTimeMillis()): Boolean {
        val (nextKeys, added) = FavoriteLogic.toggle(keys, item.id)
        val seq = prefs.getLong("next_seq", 1L)
        val ops = pendingOps + FavoriteLogic.op(seq, item, comment, added, now)
        // commit(): a receiver's process may die right after onReceive.
        prefs.edit()
            .putString("keys", JSONArray(nextKeys.toList()).toString())
            .putString("ops", JSONArray(ops.map(::opJson)).toString())
            .putLong("next_seq", seq + 1)
            .commit()
        return added
    }

    /** The app merged every op up to [throughSeq] and pushed its full list of [appKeys]. */
    @Synchronized
    fun acknowledge(appKeys: Set<String>, throughSeq: Long) {
        val remaining = FavoriteLogic.acknowledge(pendingOps, throughSeq)
        prefs.edit()
            .putString("ops", JSONArray(remaining.map(::opJson)).toString())
            .putString("keys", JSONArray(FavoriteLogic.merge(appKeys, remaining).toList()).toString())
            .commit()
    }

    companion object {
        private const val PREFS_NAME = "dithar_favorites"

        fun opJson(op: FavoriteOp): JSONObject = JSONObject()
            .put("seq", op.seq)
            .put("key", op.key)
            .put("add", op.add)
            .put("at", op.at)
            .put("category", op.category)
            .put("title", op.title)
            .put("text", op.text)
            .put("meaning", op.meaning)
            .put("source", op.source)
            .put("commentId", op.commentId ?: JSONObject.NULL)
            .put("commentText", op.commentText ?: JSONObject.NULL)

        fun parseOp(o: JSONObject) = FavoriteOp(
            seq = o.getLong("seq"),
            key = o.getString("key"),
            add = o.getBoolean("add"),
            at = o.optLong("at"),
            category = o.optString("category"),
            title = o.optString("title"),
            text = o.optString("text"),
            meaning = o.optString("meaning"),
            source = o.optString("source"),
            commentId = if (o.isNull("commentId")) null else o.optString("commentId").ifEmpty { null },
            commentText = if (o.isNull("commentText")) null else o.optString("commentText").ifEmpty { null },
        )
    }
}

/**
 * The widget's heart. Not exported: only the widget's own PendingIntent
 * reaches it. It saves (or removes) the item the widget is showing, redraws
 * the widget so the heart's state changes at once, and confirms with a
 * short toast — the tap genuinely persists; it is not a decoration.
 */
class FavoriteToggleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_TOGGLE_FAVORITE) return
        val itemId = intent.getStringExtra(EXTRA_ITEM_ID) ?: return
        val store = ReminderStore(context)
        val item = store.pool.firstOrNull { it.id == itemId } ?: return
        val comment = intent.getStringExtra(EXTRA_COMMENT_ID)?.let { id -> item.comments.firstOrNull { it.id == id } }
        val added = FavoritesStore(context).toggle(item, comment)
        WidgetRenderer.updateAll(context)
        val en = store.language == "en"
        val message = when {
            added && en -> "Saved to Favorites"
            added -> "أُضيف إلى المفضلة"
            en -> "Removed from Favorites"
            else -> "أُزيل من المفضلة"
        }
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }

    companion object {
        const val ACTION_TOGGLE_FAVORITE = "com.dithar.app.reminders.TOGGLE_FAVORITE"
        const val EXTRA_ITEM_ID = "com.dithar.app.reminders.FAVORITE_ITEM"
        const val EXTRA_COMMENT_ID = "com.dithar.app.reminders.FAVORITE_COMMENT"
    }
}
