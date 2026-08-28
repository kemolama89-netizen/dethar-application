import { useState } from "react";
import { Copy, Heart, Volume2, VolumeX, Languages } from "lucide-react";
import type { MiscDuaItem } from "../data/misc-library";
import { miscLibraryLabels as t, miscMeaningLabels } from "../data/misc-library";
import { useLanguage } from "../theme/LanguageContext";

// The single reading card shared by the category list and search results —
// per spec section 10: the COMPLETE Arabic text once, a count line (only
// when the source actually establishes one), and a visually secondary
// takhrij/source line — the dua text is the main content, never
// overpowered by its citation. No repetition/completion tracking here
// (this is a read-only reference library, not a daily-wird journey like
// Written Adhkar) — only lightweight, existing-architecture-compatible
// actions: copy, favorite, listen, and (when the record has an English
// layer) a button revealing the meaning in a separate sheet — see
// MiscMeaningModal. The Arabic text stays the ONLY thing shown inline;
// englishMeaning/englishTransliteration never render inside this card
// itself, only through that dedicated button+modal (spec section 7).
export function MiscDuaCard({
  item,
  isFavorite,
  onToggleFavorite,
  isSpeaking,
  onToggleListen,
  onShowMeaning,
}: {
  item: MiscDuaItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isSpeaking: boolean;
  onToggleListen: () => void;
  onShowMeaning: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const mt = miscMeaningLabels[language];

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.text_ar);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard access can fail (permissions, insecure context) — copying
      // is a convenience only, never load-bearing for reading the dua.
    }
  }

  const sourceLabel = item.isQuranic ? t.sourceLabelQuran : t.sourceLabelHadith;

  return (
    <div
      className="relative overflow-hidden px-4 py-4"
      style={{
        background: "var(--wa-surface)",
        borderRadius: "var(--wa-card-radius)",
        boxShadow: "0 8px 20px -16px rgba(var(--color-shadow-rgb), 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
      }}
    >
      <p
        dir="rtl"
        className="text-[16px] font-bold leading-[1.9]"
        style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
      >
        {item.text_ar}
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {item.occasion_ar && (
            <p className="text-[11px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {t.occasionLabel}: {item.occasion_ar}
            </p>
          )}
          {item.count_ar && (
            <p className="text-[11px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {t.countLabel}: {item.count_ar}
            </p>
          )}
          {item.source_ar && (
            <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {sourceLabel}: {item.source_ar}
            </p>
          )}
          {item.note_ar && (
            <p className="mt-1 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {t.noteLabel}: {item.note_ar}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleListen}
            aria-pressed={isSpeaking}
            aria-label={isSpeaking ? mt.stopListenAria : mt.listenAria}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{
              boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)",
              color: isSpeaking ? "var(--wa-gold)" : "var(--wa-ink-muted)",
            }}
          >
            {isSpeaking ? <VolumeX size={15} strokeWidth={1.8} /> : <Volume2 size={15} strokeWidth={1.8} />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={t.copyAria}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-ink-muted)" }}
          >
            <Copy size={15} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t.unfavoriteAria : t.favoriteAria}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{
              boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)",
              color: isFavorite ? "var(--wa-gold)" : "var(--wa-ink-muted)",
            }}
          >
            <Heart size={15} strokeWidth={1.8} fill={isFavorite ? "var(--wa-gold)" : "none"} />
          </button>
        </div>
      </div>

      {/* Separate, dedicated action — never inline text — per spec section
          7/9: only rendered when this record actually has an English
          layer; a record left pending/without Master coverage shows no
          button at all rather than an invented or empty meaning. */}
      {item.englishMeaning && (
        <button
          type="button"
          onClick={onShowMeaning}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[11.5px] font-semibold"
          style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-gold)" }}
        >
          <Languages size={14} strokeWidth={1.8} />
          {mt.meaningButton}
        </button>
      )}

      {copied && (
        <span
          className="absolute end-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "var(--wa-badge-bg)", color: "var(--wa-gold)" }}
        >
          {t.copiedToast}
        </span>
      )}
    </div>
  );
}
