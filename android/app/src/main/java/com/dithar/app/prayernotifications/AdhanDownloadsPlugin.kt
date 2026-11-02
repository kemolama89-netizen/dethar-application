package com.dithar.app.prayernotifications

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Adhan recordings downloaded on demand (src/lib/adhanDownloads.ts). They live
 * in the app's private no-backup folder, which an app update leaves alone and
 * Android never empties by itself (only "Clear storage" or uninstalling does);
 * no backup, because a user can have 100 MB+ of them and they can always be
 * downloaded again.
 *
 * A download goes to a ".part" file and takes its real name only once its size
 * and SHA-256 match, so the prayer alarm can never be handed a partial or wrong
 * file. A ".sha256" file beside it says which version it is, so a later app
 * update can tell whether it is still the recording it expects, without reading
 * every file at each start.
 */
@CapacitorPlugin(name = "DitharAdhanDownloads")
class AdhanDownloadsPlugin : Plugin() {
    private val folder: File get() = File(context.noBackupFilesDir, "adhan").apply { mkdirs() }

    @PluginMethod
    fun list(call: PluginCall) {
        val files = JSArray()
        for (file in folder.listFiles().orEmpty()) {
            when {
                // Left by a process that was killed mid-download: only this process can be writing one.
                file.name.endsWith(PART) -> if (!running.containsKey(file.name.substringBefore('.'))) file.delete()
                AdhanDownloadRules.isAudio(file.name) -> {
                    val entry = JSObject().put("id", file.nameWithoutExtension).put("path", file.absolutePath).put("bytes", file.length())
                    val sum = File(folder, file.name + SUM)
                    if (sum.exists()) entry.put("sha256", sum.readText().trim())
                    files.put(entry)
                }
            }
        }
        call.resolve(JSObject().put("files", files))
    }

    @PluginMethod
    fun download(call: PluginCall) {
        val id = call.getString("id").orEmpty()
        val url = call.getString("url").orEmpty()
        val sha256 = call.getString("sha256").orEmpty()
        val bytes = call.getLong("bytes") ?: 0L
        if (!AdhanDownloadRules.validId(id) || !AdhanDownloadRules.allowedUrl(url) || bytes <= 0L || sha256.isEmpty()) {
            return call.reject("invalid download")
        }
        val cancel = AtomicBoolean(false)
        if (running.putIfAbsent(id, cancel) != null) return call.reject("already downloading")
        executor.execute {
            val target = File(folder, id + AdhanDownloadRules.extensionOf(url))
            val part = File(folder, target.name + PART)
            try {
                if (!AdhanDownloadRules.enoughSpace(folder.usableSpace, bytes)) throw AdhanDownloadFailure(AdhanDownloadRules.NO_SPACE)
                fetch(id, url, part, bytes, sha256, cancel)
                // The version first: if the process dies between these two, no unlabelled file exists.
                File(folder, target.name + SUM).writeText(sha256)
                if (!part.renameTo(target)) throw AdhanDownloadFailure(AdhanDownloadRules.STORAGE)
                call.resolve(JSObject().put("path", target.absolutePath))
            } catch (e: Exception) {
                part.delete()
                call.reject(if (cancel.get()) "cancelled" else AdhanDownloadRules.failureCode(e))
            } finally {
                running.remove(id)
            }
        }
    }

    private fun fetch(id: String, url: String, part: File, bytes: Long, sha256: String, cancel: AtomicBoolean) {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 30_000
        try {
            if (connection.responseCode != HttpURLConnection.HTTP_OK) throw AdhanDownloadFailure(AdhanDownloadRules.SOURCE_UNAVAILABLE)
            val digest = MessageDigest.getInstance("SHA-256")
            var received = 0L
            var lastPercent = -1L
            connection.inputStream.use { input ->
                part.outputStream().use { output ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        if (cancel.get()) throw AdhanDownloadFailure("cancelled")
                        val n = input.read(buffer)
                        if (n < 0) break
                        output.write(buffer, 0, n)
                        digest.update(buffer, 0, n)
                        received += n
                        if (received > bytes) throw AdhanDownloadFailure(AdhanDownloadRules.MISMATCH)
                        val percent = received * 100 / bytes
                        if (percent != lastPercent) {
                            lastPercent = percent
                            notifyListeners("progress", JSObject().put("id", id).put("received", received).put("total", bytes))
                        }
                    }
                }
            }
            if (!AdhanDownloadRules.matches(received, digest.digest(), bytes, sha256)) throw AdhanDownloadFailure(AdhanDownloadRules.MISMATCH)
        } finally {
            connection.disconnect()
        }
    }

    @PluginMethod
    fun cancel(call: PluginCall) {
        running[call.getString("id").orEmpty()]?.set(true)
        call.resolve()
    }

    @PluginMethod
    fun remove(call: PluginCall) {
        val id = call.getString("id").orEmpty()
        if (!AdhanDownloadRules.validId(id)) return call.reject("invalid id")
        folder.listFiles()?.filter { it.name.startsWith("$id.") }?.forEach { it.delete() }
        call.resolve()
    }

    private companion object {
        const val PART = ".part"
        const val SUM = ".sha256"

        // For the whole process: the screen (and this plugin with it) can be recreated while a download runs.
        val executor = Executors.newFixedThreadPool(2)
        val running = ConcurrentHashMap<String, AtomicBoolean>()
    }
}

/** Why a download stopped, as [AdhanDownloadRules]' codes. */
class AdhanDownloadFailure(val code: String) : Exception(code)

/** What may be downloaded and kept (pure, unit-tested — AdhanDownloadRulesTest). */
object AdhanDownloadRules {
    const val OFFLINE = "offline"
    const val SOURCE_UNAVAILABLE = "source-unavailable"
    const val NO_SPACE = "no-space"
    const val MISMATCH = "mismatch"
    const val STORAGE = "storage"

    /** Room kept free beyond the file itself, so a download can't fill the phone. */
    private const val SPACE_MARGIN_BYTES = 20L * 1024 * 1024

    fun enoughSpace(usable: Long, bytes: Long): Boolean = usable >= bytes + SPACE_MARGIN_BYTES

    /** The reason shown to the user: a full disk is told apart from a lost connection. */
    fun failureCode(e: Exception): String = when {
        e is AdhanDownloadFailure -> e.code
        e.message.orEmpty().contains("ENOSPC") || e.message.orEmpty().contains("No space left") -> NO_SPACE
        e is java.io.IOException -> OFFLINE
        else -> STORAGE
    }

    fun isAudio(name: String): Boolean = EXTENSIONS.any { name.lowercase().endsWith(it) }

    private const val HOST_PREFIX = "https://kemolama89-netizen.github.io/dethar-application/audio/adhan/"
    private val ID = Regex("^[a-z0-9-]{1,64}$")
    private val EXTENSIONS = listOf(".mp3", ".m4a")

    fun validId(id: String): Boolean = ID.matches(id)

    /** Only DITHAR's own Adhan recordings, over HTTPS. */
    fun allowedUrl(url: String): Boolean = url.startsWith(HOST_PREFIX) && !url.contains("..") && EXTENSIONS.any { url.lowercase().endsWith(it) }

    fun extensionOf(url: String): String = EXTENSIONS.first { url.lowercase().endsWith(it) }

    fun matches(received: Long, digest: ByteArray, bytes: Long, sha256: String): Boolean =
        received == bytes && digest.joinToString("") { "%02x".format(it) } == sha256.lowercase()
}
