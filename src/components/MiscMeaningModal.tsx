import { X } from "lucide-react";
import type { MiscDuaItem } from "../data/misc-library";
import { miscMeaningLabels } from "../data/misc-library";
import { useLanguage } from "../theme/LanguageContext";

// The "English Meaning" overlay for the Misc library cards — same
// positioning/behavior convention as ContentModal (App.tsx's Home-screen
// "Read more" sheet): absolutely positioned within `.device-screen` (never
// `position: fixed`, which would escape the phone frame on the desktop
// preview), closes on backdrop click, traps nothing else. Uses the
// Written-Adhkar/Misc `--wa-*` token set (not `--color-*`) to match the
// surface it opens from. Shows englishMeaning always, and
// englishTransliteration only when present, per spec section 7: these two
// fields are never shown inline in the card itself, only here.
export function MiscMeaningModal({ item, onClose }: { item: MiscDuaItem | null; onClose: () => void }) {
  const { language } = useLanguage();
  const t = miscMeaningLabels[language];

  if (!item || !item.englishMeaning) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center p-3 sm:items-center"
      style={{ background: "rgba(11, 21, 38, 0.45)" }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.meaningModalTitle}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80%] w-full max-w-sm flex-col overflow-hidden rounded-2xl border"
        style={{
          background: "var(--wa-surface)",
          borderColor: "var(--wa-gold-hairline)",
          borderRadius: "var(--wa-card-radius)",
          boxShadow: "0 20px 50px -20px rgba(var(--color-shadow-rgb), 0.5)",
        }}
      >
        <div className="flex items-start gap-3 border-b p-4" style={{ borderColor: "var(--wa-gold-hairline)" }}>
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="text-[16px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
              {t.meaningModalTitle}
            </h3>
            <p dir="rtl" className="mt-1 line-clamp-2 text-[12px]" style={{ color: "var(--wa-ink-muted)" }}>
              {item.text_ar}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-ink-muted)" }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4" dir="ltr">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
            {t.meaningHeading}
          </p>
          <p className="mt-1 text-[15px] leading-[1.65]" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
            {item.englishMeaning}
          </p>

          {item.englishTransliteration && (
            <>
              <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
                {t.transliterationHeading}
              </p>
              <p className="mt-1 text-[13.5px] italic leading-[1.65]" style={{ color: "var(--wa-ink-muted)" }}>
                {item.englishTransliteration}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
