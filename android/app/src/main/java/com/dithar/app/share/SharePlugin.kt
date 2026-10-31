package com.dithar.app.share

import android.content.ClipData
import android.content.Intent
import android.util.Base64
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

/**
 * Sharing a Hadith, dhikr, dua or reminder through Android's own share
 * sheet (lib/shareContent.ts) — WhatsApp, Facebook, Messages, email, any app
 * that accepts text or images. Android's WebView has no Web Share API, so
 * the web layer hands the content here.
 *
 *  - shareText: the complete text (with its reference), as plain text.
 *  - shareImage: a PNG the web layer already drew (Arabic shaped by the
 *    WebView's own text engine), written to cache/shared/ — covered by
 *    res/xml/file_paths.xml's cache-path — and offered through a
 *    FileProvider URI with a read grant. Only the latest image is kept.
 *
 * Nothing is uploaded by DITHAR: the user picks the destination.
 */
@CapacitorPlugin(name = "DitharShare")
class SharePlugin : Plugin() {
    @PluginMethod
    fun shareText(call: PluginCall) {
        val text = call.getString("text")
        if (text.isNullOrBlank()) {
            call.reject("text is required")
            return
        }
        val title = call.getString("title")
        try {
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
                if (!title.isNullOrBlank()) putExtra(Intent.EXTRA_SUBJECT, title)
            }
            activity.startActivity(Intent.createChooser(send, title))
            call.resolve(JSObject().put("shared", true))
        } catch (e: Exception) {
            call.reject("Couldn't share: ${e.javaClass.simpleName}: ${e.message}")
        }
    }

    @PluginMethod
    fun shareImage(call: PluginCall) {
        val data = call.getString("base64")
        val name = SharedImageName.safe(call.getString("fileName"))
        if (data.isNullOrEmpty() || name == null) {
            call.reject("base64 and fileName are required")
            return
        }
        val title = call.getString("title")
        try {
            val bytes = Base64.decode(data.substringAfter("base64,"), Base64.DEFAULT)
            val dir = File(context.cacheDir, "shared").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() }
            val file = File(dir, name)
            file.writeBytes(bytes)
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                if (!title.isNullOrBlank()) putExtra(Intent.EXTRA_SUBJECT, title)
                clipData = ClipData.newRawUri(name, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(send, title).apply { addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            activity.startActivity(chooser)
            call.resolve(JSObject().put("shared", true).put("bytes", file.length()))
        } catch (e: Exception) {
            call.reject("Couldn't share image: ${e.javaClass.simpleName}: ${e.message}")
        }
    }
}

/** A plain .png file name (no path, no odd characters), or null when unusable. */
object SharedImageName {
    fun safe(raw: String?): String? {
        val name = raw?.substringAfterLast('/')?.substringAfterLast('\\')?.trim() ?: return null
        if (name.isEmpty() || name.startsWith(".") || name.length > 80 || !name.endsWith(".png")) return null
        return if (name.all { it.isLetterOrDigit() || it in "-_." }) name else null
    }
}
