package com.dithar.app.contentreview

import android.content.ClipData
import android.content.Intent
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

/**
 * TEMPORARY — part of the Religious Content Review screen
 * (components/ContentReviewView.tsx); remove together with it.
 *
 * The WebView can't download a file the way a browser does, so the review
 * list's CSV/JSON export is written here to the app's own cache
 * (cache/exports/, covered by res/xml/file_paths.xml's cache-path) and
 * handed to Android's share sheet: the user chooses where it goes (save to
 * Files or Drive, email, a messaging app…). Nothing is uploaded by DITHAR.
 */
@CapacitorPlugin(name = "DitharContentExport")
class ContentExportPlugin : Plugin() {
    @PluginMethod
    fun shareFile(call: PluginCall) {
        val name = ExportFileName.safe(call.getString("fileName"))
        val mime = call.getString("mimeType") ?: "text/plain"
        val text = call.getString("text")
        if (name == null || text == null) {
            call.reject("fileName and text are required")
            return
        }
        try {
            val dir = File(context.cacheDir, "exports").apply { mkdirs() }
            // Only the latest export is kept.
            dir.listFiles()?.forEach { it.delete() }
            val file = File(dir, name)
            file.writeText(text, Charsets.UTF_8)
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val send = Intent(Intent.ACTION_SEND).apply {
                type = mime
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, name)
                clipData = ClipData.newRawUri(name, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(send, name).apply { addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            activity.startActivity(chooser)
            call.resolve(JSObject().put("shared", true).put("bytes", file.length()))
        } catch (e: Exception) {
            call.reject("Couldn't export: ${e.javaClass.simpleName}: ${e.message}")
        }
    }
}

/** A plain file name for the export (no path, no odd characters), or null when unusable. */
object ExportFileName {
    fun safe(raw: String?): String? {
        val name = raw?.substringAfterLast('/')?.substringAfterLast('\\')?.trim() ?: return null
        if (name.isEmpty() || name.startsWith(".") || name.length > 100) return null
        return if (name.all { it.isLetterOrDigit() || it in "-_." }) name else null
    }
}
