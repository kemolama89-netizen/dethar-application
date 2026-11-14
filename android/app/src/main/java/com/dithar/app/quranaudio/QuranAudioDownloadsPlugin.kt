package com.dithar.app.quranaudio

import com.dithar.app.prayernotifications.AdhanDownloadFailure
import com.dithar.app.prayernotifications.AdhanDownloadRules
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
 * Qur'an reciters downloaded on demand (src/lib/quranAudioDownloads.ts): the
 * same design as the Adhan recordings (AdhanDownloadsPlugin), whose rules it
 * shares (AdhanDownloadRules: free space, failure codes, size and checksum).
 *
 * Each reciter's files live in noBackupFilesDir/quran-audio/{reciter}/, which an
 * app update leaves alone and Android never empties by itself. A file goes to a
 * ".part" file and takes its real name only once its size and SHA-256 match, so
 * the Audio Adhkar player can never be handed a partial or wrong file; a
 * ".sha256" beside it says which version it is. JS decides when a reciter is
 * complete (every file of the manifest here), and only then plays him.
 */
@CapacitorPlugin(name = "DitharQuranAudioDownloads")
class QuranAudioDownloadsPlugin : Plugin() {
    private val root: File get() = File(context.noBackupFilesDir, "quran-audio").apply { mkdirs() }

    @PluginMethod
    fun list(call: PluginCall) {
        val files = JSArray()
        for (dir in root.listFiles().orEmpty().filter { it.isDirectory && QuranAudioDownloadRules.validReciter(it.name) }) {
            for (file in dir.listFiles().orEmpty()) {
                when {
                    // Left by a process killed mid-download: only this process can be writing one.
                    file.name.endsWith(PART) -> if (!running.containsKey(dir.name)) file.delete()
                    QuranAudioDownloadRules.validFile(file.name) -> {
                        val entry = JSObject().put("reciter", dir.name).put("file", file.name).put("path", file.absolutePath).put("bytes", file.length())
                        val sum = File(dir, file.name + SUM)
                        if (sum.exists()) entry.put("sha256", sum.readText().trim())
                        files.put(entry)
                    }
                }
            }
        }
        call.resolve(JSObject().put("files", files))
    }

    @PluginMethod
    fun download(call: PluginCall) {
        val reciter = call.getString("reciter").orEmpty()
        val name = call.getString("file").orEmpty()
        val url = call.getString("url").orEmpty()
        val sha256 = call.getString("sha256").orEmpty()
        val bytes = AdhanDownloadRules.byteCount(call.data.opt("bytes"))
        if (!QuranAudioDownloadRules.validReciter(reciter) || !QuranAudioDownloadRules.validFile(name) || !QuranAudioDownloadRules.allowedUrl(url, reciter, name) || bytes <= 0L || sha256.isEmpty()) {
            return call.reject("invalid download")
        }
        // One file at a time per reciter (JS downloads a reciter's files in turn); cancel stops the reciter.
        val cancel = AtomicBoolean(false)
        if (running.putIfAbsent(reciter, cancel) != null) return call.reject("already downloading")
        executor.execute {
            val dir = File(root, reciter).apply { mkdirs() }
            val target = File(dir, name)
            val part = File(dir, name + PART)
            try {
                if (!AdhanDownloadRules.enoughSpace(dir.usableSpace, bytes)) throw AdhanDownloadFailure(AdhanDownloadRules.NO_SPACE)
                fetch(reciter, name, url, part, bytes, sha256, cancel)
                // The version first: if the process dies between these two, no unlabelled file exists.
                File(dir, name + SUM).writeText(sha256)
                if (!part.renameTo(target)) throw AdhanDownloadFailure(AdhanDownloadRules.STORAGE)
                call.resolve(JSObject().put("path", target.absolutePath))
            } catch (e: Exception) {
                part.delete()
                call.reject(if (cancel.get()) "cancelled" else AdhanDownloadRules.failureCode(e))
            } finally {
                running.remove(reciter)
            }
        }
    }

    private fun fetch(reciter: String, name: String, url: String, part: File, bytes: Long, sha256: String, cancel: AtomicBoolean) {
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
                            notifyListeners("progress", JSObject().put("reciter", reciter).put("file", name).put("received", received).put("total", bytes))
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
        running[call.getString("reciter").orEmpty()]?.set(true)
        call.resolve()
    }

    /** One file of a reciter, or (without "file") all of them. */
    @PluginMethod
    fun remove(call: PluginCall) {
        val reciter = call.getString("reciter").orEmpty()
        val name = call.getString("file")
        if (!QuranAudioDownloadRules.validReciter(reciter) || (name != null && !QuranAudioDownloadRules.validFile(name))) return call.reject("invalid id")
        val dir = File(root, reciter)
        if (name == null) {
            dir.deleteRecursively()
        } else {
            File(dir, name).delete()
            File(dir, name + SUM).delete()
        }
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

/** What may be downloaded and kept (pure, unit-tested — QuranAudioDownloadRulesTest). */
object QuranAudioDownloadRules {
    private const val HOST_PREFIX = "https://kemolama89-netizen.github.io/dethar-application/audio/quran/"
    private val RECITER = Regex("^[a-z0-9-]{1,48}$")
    private val FILE = Regex("^([0-9]{6}|basmala)\\.mp3$")

    fun validReciter(id: String): Boolean = RECITER.matches(id)

    fun validFile(name: String): Boolean = FILE.matches(name)

    /** Only DITHAR's own hosted recitations — exactly this reciter's file — over HTTPS. */
    fun allowedUrl(url: String, reciter: String, name: String): Boolean = validReciter(reciter) && validFile(name) && url == "$HOST_PREFIX$reciter/$name"
}
