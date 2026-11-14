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
   * True when [reference] names the verse itself (a Tafsir's «سورة … · الآية …»): it is then
   * written as it is, not as «المصدر: …» — the Tafsir's own source keeps that label.
   */
  referenceIsVerse?: boolean;
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
   * A verse of the Qur'an: the image draws [textAr] character for character
   * in the bundled Qur'anic font, closing with this verse's end sign (۝ and
   * its number) — drawn beside the text, never added to it.
   */
  quranVerse?: { ayah: number };
  /**
   * The background the item is being shown on (the full-screen reminder's
   * photo: the user's own, their fixed choice, or the automatic one) — the
   * image is drawn on it exactly as previewed. Text sharing ignores it.
   */
  background?: string;
  /**
   * The image is the portrait Tafsir card (lib/shareImageTafsir.ts): a verse with its Tafsir.
   * Layout only; the text is the same.
   */
  tafsirCard?: boolean;
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
  /**
   * What the Tafsir card draws instead of [text], when the card already shows part of it
   * elsewhere: a Tafsir without the book's quotation of the very verse the card shows
   * beside it. Paragraphs left out whole, never changed; [text] is still what's shared as text.
   */
  imageText?: string;
}

interface SharePluginApi {
  shareText(options: { text: string; title?: string }): Promise<{ shared: boolean }>;
  shareImage(options: { base64: string; fileName: string; title?: string }): Promise<{ shared: boolean; bytes: number }>;
  shareFile(options: { base64: string; fileName: string; title?: string; text?: string }): Promise<{ shared: boolean; bytes: number }>;
  shareImages(options: { images: { base64: string; fileName: string }[]; title?: string; text?: string }): Promise<{ shared: boolean; count: number }>;
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
  if (content.reference?.trim()) parts.push(content.referenceIsVerse ? content.reference.trim() : `${sourceLabel}: ${content.reference.trim()}`);
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
  const type = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? "image/png";
  return new File([bytes], name, { type });
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

/**
 * Several images already drawn (the pages of a Tafsir booklet), shared together in their
 * order — one share, every page. Android: the native ACTION_SEND_MULTIPLE; elsewhere the
 * Web Share API with all the files, else each one downloaded, in order.
 */
export async function shareImageSet(dataUrls: readonly string[], title: string, baseName: string, caption?: string): Promise<ShareOutcome> {
  if (dataUrls.length === 0) return "failed";
  const stamp = Date.now();
  const names = dataUrls.map((d, i) => `${baseName}-${stamp}-${String(i + 1).padStart(2, "0")}.${d.startsWith("data:image/jpeg") ? "jpg" : "png"}`);
  if (isAndroidApp()) {
    try {
      await DitharShare.shareImages({ images: dataUrls.map((base64, i) => ({ base64, fileName: names[i] })), title, ...(caption ? { text: caption } : {}) });
      return "shared";
    } catch {
      return "failed";
    }
  }
  const files = dataUrls.map((d, i) => dataUrlToFile(d, names[i]));
  if (typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files })) {
    try {
      await navigator.share({ files, title, ...(caption ? { text: caption } : {}) });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
    }
  }
  // One at a time: browsers hold back a burst of downloads.
  for (const [i, d] of dataUrls.entries()) {
    download(d, names[i]);
    if (i < dataUrls.length - 1) await new Promise((r) => setTimeout(r, 250));
  }
  return "downloaded";
}

/**
 * One document (a long Tafsir's pages as a PDF), through the share sheet: Android natively;
 * elsewhere the Web Share API with the file, else it is downloaded.
 */
export async function shareDocument(dataUrl: string, fileName: string, title: string, caption?: string): Promise<ShareOutcome> {
  if (isAndroidApp()) {
    try {
      await DitharShare.shareFile({ base64: dataUrl, fileName, title, ...(caption ? { text: caption } : {}) });
      return "shared";
    } catch {
      return "failed";
    }
  }
  const file = dataUrlToFile(dataUrl, fileName);
  if (typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, ...(caption ? { text: caption } : {}) });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
    }
  }
  download(dataUrl, fileName);
  return "downloaded";
}

