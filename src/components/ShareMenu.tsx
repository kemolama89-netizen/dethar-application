import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Copy, Image as ImageIcon, Share2, Type, X } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { useBackDismiss } from "../lib/backOverlays";
import { copyShareText, shareAsImage, shareAsText } from "../lib/shareContent";
import type { ShareableContent, ShareOutcome } from "../lib/shareContent";

// The share button of a dhikr, dua, Hadith or reminder opens this small
// sheet: «مشاركة كنص» / «مشاركة كصورة» go to the system share sheet
// (lib/shareContent.ts — WhatsApp, Facebook and every compatible app), and
// «نسخ النص» copies the same complete text. Rendered in a portal on
// <body> so it sits above any screen or overlay (the full-screen reminder
// included); system Back closes it first.

const shareMenuLabels = {
  ar: {
    title: "مشاركة",
    asText: "مشاركة كنص",
    asImage: "مشاركة كصورة",
    copy: "نسخ النص",
    close: "إغلاق",
    preparing: "جارٍ إنشاء الصورة…",
    copied: "تم نسخ النص",
    downloaded: "تم حفظ الصورة",
    failed: "تعذّرت المشاركة",
  },
  en: {
    title: "Share",
    asText: "Share as text",
    asImage: "Share as image",
    copy: "Copy text",
    close: "Close",
    preparing: "Creating the image…",
    copied: "Text copied",
    downloaded: "Image saved",
    failed: "Couldn't share",
  },
} as const;

export function ShareMenu({ content, open, onClose }: { content: ShareableContent; open: boolean; onClose: () => void }) {
  const { language, dir } = useLanguage();
  const t = shareMenuLabels[language];
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // Every way out (an option done, ✕, the backdrop, system Back) goes through here, so it reopens clean.
  const close = () => {
    setBusy(false);
    setStatus(null);
    onClose();
  };
  useBackDismiss(open, close);

  if (!open || typeof document === "undefined") return null;

  async function run(action: () => Promise<ShareOutcome>, preparing?: string) {
    if (busy) return;
    setBusy(true);
    setStatus(preparing ?? null);
    const outcome = await action();
    setBusy(false);
    if (outcome === "shared" || outcome === "cancelled") {
      close();
      return;
    }
    setStatus(outcome === "copied" ? t.copied : outcome === "downloaded" ? t.downloaded : t.failed);
    if (outcome !== "failed") window.setTimeout(close, 1200);
  }

  const option = (icon: ReactNode, label: string, onClick: () => void, key: string) => (
    <button
      type="button"
      key={key}
      onClick={onClick}
      disabled={busy}
      data-share-option={key}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start text-[15px] font-semibold disabled:opacity-50"
      style={{ background: "var(--color-bg)", color: "var(--color-text-primary)", boxShadow: "inset 0 0 0 1px var(--color-gold-soft)" }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
        {icon}
      </span>
      {label}
    </button>
  );

  // The portal leaves the app's [data-theme] wrapper (ThemeContext): carry the active theme along so the palette's colours apply.
  const theme = document.querySelector("[data-theme]")?.getAttribute("data-theme") ?? undefined;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center" dir={dir} data-theme={theme} data-share-menu="" role="presentation">
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={busy ? undefined : close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className="relative w-full max-w-[28rem] rounded-t-[28px] px-4 pt-3"
        style={{ background: "var(--color-surface)", paddingBottom: "max(1rem, env(safe-area-inset-bottom))", boxShadow: "0 -12px 30px -12px rgba(0,0,0,0.35)" }}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full" style={{ background: "var(--color-gold-soft)" }} aria-hidden="true" />
        <div className="mb-3 flex items-center gap-2">
          <Share2 size={17} style={{ color: "var(--color-gold)" }} />
          <h2 className="flex-1 text-[16px] font-bold" style={{ color: "var(--color-text-primary)" }}>
            {t.title}
          </h2>
          <button type="button" onClick={close} disabled={busy} aria-label={t.close} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ color: "var(--color-text-muted)" }}>
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {option(<Type size={17} />, t.asText, () => void run(() => shareAsText(content, language)), "text")}
          {option(<ImageIcon size={17} />, t.asImage, () => void run(() => shareAsImage(content, language), t.preparing), "image")}
          {option(<Copy size={17} />, t.copy, () => void run(() => copyShareText(content, language)), "copy")}
        </div>
        <p className="mt-2 min-h-[1.25rem] text-center text-[12.5px]" style={{ color: "var(--color-text-muted)" }} role="status" aria-live="polite" data-share-status="">
          {status}
        </p>
      </div>
    </div>,
    document.body,
  );
}
