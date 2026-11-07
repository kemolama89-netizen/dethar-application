package com.dithar.app.reminders

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import com.dithar.app.audioadhkar.AudioAdhkarScheduler
import org.json.JSONArray
import org.json.JSONObject

/**
 * One time-based content notification (lib/timedContent.ts): a verified hadith at a moment —
 * before Asr, on Friday, the evening before the White Days. [key] ("<kind>:<date>") is posted
 * once, whatever syncs follow; [item] is exactly what the reminder card shows and a tap reopens.
 */
data class TimedEntry(val key: String, val kind: String, val at: Long, val title: String, val item: ReminderItem)

/** Which entries post now, and when the alarm comes next. Pure, for unit tests. */
object TimedContentPlan {
    /** An alarm a little early still posts what it was set for. */
    const val EARLY_MILLIS = 60_000L
    /** Later than this (the phone off, the alarm held back), the moment has passed: never posted late. */
    const val STALE_MILLIS = 2 * 60 * 60_000L
    const val POSTED_LIMIT = 120

    data class Firing(val post: List<TimedEntry>, val done: Set<String>)

    /** Due and not yet posted: the newest per kind is posted; every due key is done (a stale one too, without posting). */
    fun fire(entries: List<TimedEntry>, now: Long, posted: Set<String>): Firing {
        val due = entries.filter { it.key !in posted && it.at <= now + EARLY_MILLIS }
        val post = due.filter { now - it.at <= STALE_MILLIS }.groupBy { it.kind }.map { (_, list) -> list.maxBy { it.at } }.sortedBy { it.at }
        return Firing(post, due.map { it.key }.toSet())
    }

    fun next(entries: List<TimedEntry>, now: Long, posted: Set<String>): Long? =
        entries.filter { it.key !in posted && it.at > now + EARLY_MILLIS }.minOfOrNull { it.at }

    /** The keys kept as posted: those still among the entries, plus the newest others, at most [POSTED_LIMIT]. */
    fun remember(posted: List<String>, done: Set<String>): List<String> = (posted.filter { it !in done } + done.sorted()).takeLast(POSTED_LIMIT)

    /** One notification per kind: a new one replaces the last, never stacks. */
    fun notificationId(kind: String): Int = 7430 + KINDS.indexOf(kind).let { if (it < 0) KINDS.size else it }

    /** Appended only: an existing kind keeps its notification id. */
    private val KINDS = listOf("asr", "friday", "whiteDays", "kahf")

    /** A request code per key, so each posted notification keeps its own content to open. */
    fun requestCode(key: String): Int = 74_000_000 + Math.floorMod(key.hashCode(), 1_000_000)

    fun parse(array: JSONArray?): List<TimedEntry> {
        if (array == null) return emptyList()
        return (0 until array.length()).mapNotNull { i ->
            try {
                val o = array.getJSONObject(i)
                val key = o.getString("key").takeIf { it.isNotBlank() } ?: return@mapNotNull null
                TimedEntry(key, o.getString("kind"), o.getLong("at"), o.optString("title"), ReminderStore.parseItem(o.getJSONObject("item")))
            } catch (_: Exception) {
                null
            }
        }
    }
}

/**
 * The alarm behind the time-based content notifications: one fixed alarm (re-arming replaces
 * it), exact when "Alarms & reminders" is allowed. A tap opens the reminder card on exactly the
 * hadith shown (RemindersScheduler.openIntent → ReminderOpen), with its source and sharing.
 */
object TimedContentScheduler {
    private const val REQ_ALARM = 7404
    const val ACTION_TIMED = "com.dithar.app.reminders.TIMED_CONTENT"
    private const val CHANNEL = "dithar_timed_content"

    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        REQ_ALARM,
        Intent(context, RemindersReceiver::class.java).setAction(ACTION_TIMED),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    /** Saves the entries pushed by the app ([entriesJson]: as JS sent them) and re-arms. Returns the next time, or null. */
    fun replace(context: Context, entriesJson: JSONArray, now: Long = System.currentTimeMillis()): Long? {
        ReminderStore(context).timedEntriesJson = entriesJson.toString()
        return arm(context, now)
    }

    fun arm(context: Context, now: Long = System.currentTimeMillis()): Long? {
        val store = ReminderStore(context)
        val alarm = context.getSystemService(AlarmManager::class.java)
        val p = alarmIntent(context)
        val at = TimedContentPlan.next(store.timedEntries, now, store.timedPosted.toSet())
        if (at == null) {
            alarm.cancel(p)
            return null
        }
        if (AudioAdhkarScheduler.canScheduleExact(context)) {
            alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        } else {
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p)
        }
        return at
    }

    /** The alarm fired: post what is due (each key once), remember it, arm the next. */
    fun deliver(context: Context, now: Long = System.currentTimeMillis()) {
        val store = ReminderStore(context)
        val firing = TimedContentPlan.fire(store.timedEntries, now, store.timedPosted.toSet())
        // Remembered before posting: a crash mid-way can't post a key twice.
        if (firing.done.isNotEmpty()) store.timedPosted = TimedContentPlan.remember(store.timedPosted, firing.done)
        val allowed = NotificationManagerCompat.from(context).areNotificationsEnabled()
        if (allowed) for (entry in firing.post) post(context, store, entry)
        arm(context, now)
    }

    private fun post(context: Context, store: ReminderStore, entry: TimedEntry) {
        val en = store.language == "en"
        val manager = context.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(NotificationChannel(CHANNEL, if (en) "Time-based reminders" else "تنبيهات الأوقات", NotificationManager.IMPORTANCE_DEFAULT))
        }
        val item = entry.item
        val body = listOf(item.text, item.meaning, item.source.takeIf { it.isNotEmpty() }?.let { "— $it" }).filter { !it.isNullOrEmpty() }.joinToString("\n\n")
        @Suppress("DEPRECATION")
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
        builder
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(entry.title)
            .setContentText(item.text)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setContentIntent(RemindersScheduler.openIntent(context, item, TimedContentPlan.requestCode(entry.key)))
            .setAutoCancel(true)
        try {
            manager.notify(TimedContentPlan.notificationId(entry.kind), builder.build())
        } catch (_: SecurityException) {
            // Notifications not allowed (Android 13+): nothing is posted.
        }
    }
}
