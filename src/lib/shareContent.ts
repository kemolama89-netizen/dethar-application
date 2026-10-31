// Sharing one item — a dhikr, a Hadith, a dua, a reminder — as text or as an
// image (components/ShareMenu.tsx offers both, plus copy).
//
//  - Inside the Android app, the native DitharShare plugin
//    (android/.../share/SharePlugin.kt) opens Android's own share sheet:
//    WhatsApp, Facebook, Messages and every other app that accepts text or
//    images. Android's WebView has no Web Share API, so this is the only
//    way to reach that sheet from the app.
//  - In a browser, the Web Share API when it exists (files too, when the
//    browser can share them); otherwise text is copied and an image is
//    downloaded.
//
// The text is always the COMPLETE text — never shortened — with its
// reference when there is one, the English meaning in English mode (the
// established meaning, never one invented here), and every labelled text
// shown with it (`sections`: a verse's tafsir, a Hadith's evidence, DITHAR's
// reflection), each with its own source.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { renderShareImage } from "./shareImage";

export interface ShareableContent {
  /** What it is, in the interface language (e.g. «حديث شريف», "Morning Adhkar"). */
  kindLabel?: string;
  /** The Arabic text, exactly as shown — never altered. */
  textAr: string;
  /** Its established English meaning; shared in English mode only. */
  meaningEn?: string;
  /** Its verified source/reference, in the interface language, when there is one. */
  reference?: string;
  /**
   * Everything shown beneath the main text, in order and under its own
   * label — the verse's tafsir or Lataif insight, the supporting Qur'an /
   * Sunnah evidence, DITHAR's reflection (with its "not a narrated text"
   * note) — so a share is never just the bare text.
   */
  sections?: ShareSection[];
  /** Poetry keeps its line breaks. */
  isPoetry?: boolean;
  /**
   * The background the item is being shown on (the full-screen reminder's
   * photo: the user's own, their fixed choice, or the automatic one) — the
   * image is drawn on it exactly as previewed. Text sharing ignores it.
   */
  background?: string;
}

export interface ShareSection {
  /** Its label, in the interface language (e.g. «من التفسير», "DITHAR Reflection"). */
  label: string;
  /** The complete text, exactly as shown. */
  text: string;
  /** Where it comes from, when it has its own source. */
  source?: string;
  /** A short qualifier shown under it (e.g. "An educational reflection by DITHAR…"). */
  note?: string;
}

interface SharePluginApi {
  shareText(options: { text: string; title?: string }): Promise<{ shared: boolean }>;
  shareImage(options: { base64: string; fileName: string; title?: string }): Promise<{ shared: boolean; bytes: number }>;
}

const DitharShare = registerPlugin<SharePluginApi>("DitharShare");

export type ShareOutcome = "shared" | "copied" | "downloaded" | "cancelled" | "failed";

function isAndroidApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

const SIGNATURE = { ar: "— من تطبيق دِثار", en: "— from the DITHAR app" } as const;

/** The full message: Arabic text, meaning (English mode), reference, every labelled section, and DITHAR's name. */
export function composeShareText(content: ShareableContent, language: "ar" | "en"): string {
  const sourceLabel = language === "en" ? "Source" : "المصدر";
  const parts = [content.textAr.trim()];
  if (language === "en" && content.meaningEn?.trim()) parts.push(content.meaningEn.trim());
  if (content.reference?.trim()) parts.push(`${sourceLabel}: ${content.reference.trim()}`);
  for (const section of content.sections ?? []) {
    if (!section.text.trim()) continue;
    const lines = [`${section.label}:`, section.text.trim()];
    if (section.source?.trim()) lines.push(`${sourceLabel}: ${section.source.trim()}`);
    if (section.note?.trim()) lines.push(`(${section.note.trim()})`);
    parts.push(lines.join("\n"));
  }
  parts.push(SIGNATURE[language]);
  return parts.join("\n\n");
}

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

export async function copyShareText(content: ShareableContent, language: "ar" | "en"): Promise<ShareOutcome> {
  try {
    await navigator.clipboard.writeText(composeShareText(content, language));
    return "copied";
  } catch {
    return "failed";
  }
}

export async function shareAsText(content: ShareableContent, language: "ar" | "en"): Promise<ShareOutcome> {
  const text = composeShareText(content, language);
  const title = content.kindLabel;
  if (isAndroidApp()) {
    try {
      await DitharShare.shareText({ text, title });
      return "shared";
    } catch {
      // Fall through to the clipboard: the user still gets the text.
    }
  } else if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
    }
  }
  return copyShareText(content, language);
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const [, b64] = dataUrl.split(",");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: "image/png" });
}

function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function shareAsImage(content: ShareableContent, language: "ar" | "en"): Promise<ShareOutcome> {
  let dataUrl: string;
  try {
    dataUrl = await renderShareImage(content, language);
  } catch {
    return "failed";
  }
  const fileName = `dithar-${Date.now()}.png`;
  const title = content.kindLabel;
  if (isAndroidApp()) {
    try {
      await DitharShare.shareImage({ base64: dataUrl, fileName, title });
      return "shared";
    } catch {
      return "failed";
    }
  }
  const file = dataUrlToFile(dataUrl, fileName);
  if (typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
    }
  }
  download(dataUrl, fileName);
  return "downloaded";
}
