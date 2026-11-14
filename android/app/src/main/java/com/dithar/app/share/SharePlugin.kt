package com.dithar.app.share

import android.content.ClipData
import android.content.Intent
import android.util.Base64
import androidx.core.content.FileProvider
import android.net.Uri
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
 *  - shareImages: several PNGs shared together, in their order (the pages
 *    of a Tafsir booklet — components/basair/TafsirBooklet.tsx), through
 *    ACTION_SEND_MULTIPLE. Only the latest set is kept.
 *  - shareFile: one document (a long Tafsir's pages as a PDF —
 *    lib/pdfFromJpegs.ts), by the same FileProvider route.
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

    /** { images: [{ base64, fileName }], title, text? } — every image, in the given order, in one share; [text] goes with them as the caption. */
    @PluginMethod
    fun shareImages(call: PluginCall) {
        val images = call.getArray("images")
        val title = call.getString("title")
        val caption = call.getString("text")
        if (images == null || images.length() == 0 || images.length() > MAX_IMAGES) {
            call.reject("1 to $MAX_IMAGES images are required")
            return
        }
        try {
            val dir = File(context.cacheDir, "shared").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() }
            val uris = ArrayList<Uri>()
            var clip: ClipData? = null
            for (i in 0 until images.length()) {
                val image = images.getJSONObject(i)
                val name = SharedImageName.safe(image.optString("fileName"))
                val data = image.optString("base64")
                if (name == null || data.isEmpty()) {
                    call.reject("image $i needs base64 and fileName")
                    return
                }
                val file = File(dir, name)
                file.writeBytes(Base64.decode(data.substringAfter("base64,"), Base64.DEFAULT))
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
                uris.add(uri)
                // Every URI in the ClipData too, so the read grant reaches each one.
                clip = clip?.apply { addItem(ClipData.Item(uri)) } ?: ClipData.newRawUri(name, uri)
            }
            val send = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                // PNG (the booklet's pages) or JPEG (a long Tafsir's pages).
                type = "image/*"
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                if (!title.isNullOrBlank()) putExtra(Intent.EXTRA_SUBJECT, title)
                if (!caption.isNullOrBlank()) putExtra(Intent.EXTRA_TEXT, caption)
                clipData = clip
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(send, title).apply { addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            activity.startActivity(chooser)
            call.resolve(JSObject().put("shared", true).put("count", uris.size))
        } catch (e: Exception) {
            call.reject("Couldn't share images: ${e.javaClass.simpleName}: ${e.message}")
        }
    }

    /** { base64, fileName (.pdf), title, text? } — one document through the share sheet. */
    @PluginMethod
    fun shareFile(call: PluginCall) {
        val data = call.getString("base64")
        val name = SharedDocumentName.safe(call.getString("fileName"))
        if (data.isNullOrEmpty() || name == null) {
            call.reject("base64 and a .pdf fileName are required")
            return
        }
        val title = call.getString("title")
        val caption = call.getString("text")
        try {
            val dir = File(context.cacheDir, "shared").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() }
            val file = File(dir, name)
            file.writeBytes(Base64.decode(data.substringAfter("base64,"), Base64.DEFAULT))
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                if (!title.isNullOrBlank()) putExtra(Intent.EXTRA_SUBJECT, title)
                if (!caption.isNullOrBlank()) putExtra(Intent.EXTRA_TEXT, caption)
                clipData = ClipData.newRawUri(name, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(send, title).apply { addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            activity.startActivity(chooser)
            call.resolve(JSObject().put("shared", true).put("bytes", file.length()))
        } catch (e: Exception) {
            call.reject("Couldn't share the file: ${e.javaClass.simpleName}: ${e.message}")
        }
    }

    private companion object {
        /** A booklet's pages; well above the longest Tafsir's. */
        const val MAX_IMAGES = 60
    }
}

/** A plain .png or .jpg file name (no path, no odd characters), or null when unusable. */
object SharedImageName {
    fun safe(raw: String?): String? {
        val name = raw?.substringAfterLast('/')?.substringAfterLast('\\')?.trim() ?: return null
        if (name.isEmpty() || name.startsWith(".") || name.length > 80 || !(name.endsWith(".png") || name.endsWith(".jpg"))) return null
        return if (name.all { it.isLetterOrDigit() || it in "-_." }) name else null
    }
}

/** A plain .pdf file name (no path, no odd characters), or null when unusable. */
object SharedDocumentName {
    fun safe(raw: String?): String? {
        val name = raw?.substringAfterLast('/')?.substringAfterLast('\\')?.trim() ?: return null
        if (name.isEmpty() || name.startsWith(".") || name.length > 80 || !name.endsWith(".pdf")) return null
        return if (name.all { it.isLetterOrDigit() || it in "-_." }) name else null
    }
}
