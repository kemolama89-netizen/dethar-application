// TEMPORARY — the Religious Content Review screen's export
// (components/ContentReviewView.tsx); remove together with it.
//
// In a browser the CSV/JSON is downloaded as a file. Inside the Android
// app the WebView can't download, so the text goes to the native
// DitharContentExport plugin (contentreview/ContentExportPlugin.kt), which
// saves it in the app's cache and opens Android's share sheet — the user
// picks where it goes (Files, Drive, email…). Nothing is uploaded by DITHAR.
import { Capacitor, registerPlugin } from "@capacitor/core";

interface ContentExportPlugin {
  shareFile(options: { fileName: string; mimeType: string; text: string }): Promise<{ shared: boolean; bytes: number }>;
}

const ContentExport = registerPlugin<ContentExportPlugin>("DitharContentExport");

export type ExportOutcome = "downloaded" | "shared" | "failed";

function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

function download(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves/shares one export file: a download in a browser, Android's share sheet in the app. */
export async function exportTextFile(fileName: string, mimeType: string, text: string): Promise<ExportOutcome> {
  if (isAndroidApp()) {
    try {
      await ContentExport.shareFile({ fileName, mimeType, text });
      return "shared";
    } catch {
      return "failed";
    }
  }
  try {
    download(fileName, mimeType, text);
    return "downloaded";
  } catch {
    return "failed";
  }
}
