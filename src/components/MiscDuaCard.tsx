import { memo, useState } from "react";
import { BookOpenText, Copy, Heart, Volume2, VolumeX } from "lucide-react";
import type { MiscDuaItem } from "../data/misc-library";
import { miscLibraryLabels, miscMeaningLabels } from "../data/misc-library";
import { useLanguage } from "../theme/LanguageContext";
import { DraggableMeaningCard } from "./MeaningPopover";

// The single reading card shared by the category list and search results —
// per spec section 10: the COMPLETE Arabic text once, a count line (only
// when the source actually establishes one), and a visually secondary
// takhrij/source line — the dua text is the main content, never
// overpowered by its citation. No repetition/completion tracking here
// (this is a read-only reference library, not a daily-wird journey like
// Written Adhkar) — only lightweight, existing-architecture-compatible
// actions: copy, favorite, listen. Strict language separation (per this
// feature's language-rendering fix): the Arabic text and Arabic
// metadata are the ONLY content shown when the app language is Arabic —
// englishMeaning/englishTransliteration never render at all in that mode.
// When the app language is English, the Arabic dhikr stays the primary
// text (never replaced by a translation) and the transliteration renders
// inline directly below it — same convention as Written Adhkar's own
// DhikrCard — so a non-Arabic reader always has pronunciation visible
// without opening anything. Only the full Meaning (when present) stays
// behind the compact Meaning button/popup (see MeaningPopover.tsx),
// exactly as Written Adhkar does.
function MiscDuaCardImpl({
  item,
  isFavorite,
  onToggleFavorite,
  isSpeaking,
  onToggleListen,
  onShowMeaning,
}: {
  item: MiscDuaItem;
  isFavorite: boolean;
  // Takes the id (rather than being pre-bound per-item by the caller) so
  // the parent screens can pass one stable, top-level callback shared by
  // every card — the prerequisite for `memo` below to actually skip
  // re-rendering cards whose own props haven't changed when a sibling
  // card's favorite/listen state toggles.
  onToggleFavorite: (id: string) => void;
  isSpeaking: boolean;
  onToggleListen: (id: string, text: string) => void;
  // Passes the button's own DOM node (not just the item) so the caller can
  // measure its actual on-screen position and anchor the Meaning popover to
  // THIS specific card — same convention as WrittenAdhkarReader's own
  // onShowMeaning.
  onShowMeaning: (item: MiscDuaItem, buttonEl: HTMLButtonElement) => void;
}) {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const t = miscLibraryLabels[language];
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
  // Strict language separation for metadata (per this pass's fix): English
  // mode reads the `_en` counterpart of each field, never the `_ar` value —
  // and since every `_ar` metadata field on a real record has a matching
  // `_en` value (see MISC_ENGLISH_METADATA in misc-library.ts), this never
  // silently falls back to Arabic text inside the English UI.
  const isEn = language === "en";
  const occasion = isEn ? item.occasion_en : item.occasion_ar;
  const count = isEn ? item.count_en : item.count_ar;
  const source = isEn ? item.source_en : item.source_ar;
  const note = isEn ? item.note_en : item.note_ar;

  return (
    <div
      // `dithar-misc-dua-card` — plain marker class (no styling), matching
      // Written Adhkar's own `.dithar-wa-dhikr-card` convention. Lets
      // MiscMeaningPopover's Meaning button reliably find "the specific
      // card this button belongs to" via a direct `.closest()` regardless
      // of how deeply this card ends up nested inside a caller's own list
      // markup (MiscLibraryScreen wraps its search-results/featured cards
      // in intermediate layout divs, unlike MiscCategoryScreen).
      className="dithar-misc-dua-card relative overflow-hidden px-4 py-4"
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

      {language === "en" && item.englishTransliteration && (
        <div className="mt-3" dir="ltr">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
            {mt.transliterationHeading}
          </p>
          <p className="mt-0.5 text-[13px] italic leading-[1.6]" style={{ color: "var(--wa-ink-muted)" }}>
            {item.englishTransliteration}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {occasion && (
            <p className="text-[11px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {t.occasionLabel}: {occasion}
            </p>
          )}
          {count && (
            <p className="text-[11px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {t.countLabel}: {count}
            </p>
          )}
          {source && (
            // No line-clamp here — the English metadata strings (collection
            // name + hadith number + narrator + grading) run noticeably
            // longer than the short Arabic citations this card was
            // originally sized around, and a 2-line clamp silently cut them
            // off mid-sentence (e.g. narrator/grading text after a long
            // 'A'ishah reference). The card has no fixed height, so letting
            // this paragraph wrap fully just grows the card to fit — same
            // typography/spacing, no line ever hidden.
            <p className="mt-1 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {sourceLabel}: {source}
            </p>
          )}
          {note && (
            <p className="mt-1 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {t.noteLabel}: {note}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* English-only, matching Written Adhkar's DhikrCard: a compact
              trigger for the full Meaning (see MiscMeaningPopover below)
              instead of showing that text inline in every card. */}
          {language === "en" && item.englishMeaning && (
            <button
              type="button"
              data-meaning-trigger="true"
              onClick={(e) => onShowMeaning(item, e.currentTarget)}
              aria-label={mt.meaningButtonAria}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-gold)" }}
            >
              <BookOpenText size={15} strokeWidth={1.8} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleListen(item.id, item.text_ar)}
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
            onClick={() => onToggleFavorite(item.id)}
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

// Memoized so toggling one card's favorite/listen state doesn't re-render
// every other card in the list — see the parent screens (MiscCategoryScreen/
// MiscLibraryScreen) for the matching stable-callback half of this fix.
export const MiscDuaCard = memo(MiscDuaCardImpl);

// The Meaning popup opened from a single MiscDuaCard's Meaning button
// above — English mode only. Transliteration stays inline in the card
// itself (see above) and is deliberately NOT repeated here — same split as
// Written Adhkar's own DhikrCard/WrittenMeaningPopover. Thin wrapper around
// the shared DraggableMeaningCard (see MeaningPopover.tsx) — the same
// full-content, freely-draggable popup verified on Written Adhkar's
// Morning/Evening Adhkar, unified here rather than kept as a second,
// different implementation.
export function MiscMeaningPopover({
  item,
  cardEl,
  onClose,
}: {
  item: MiscDuaItem;
  cardEl: HTMLElement;
  onClose: () => void;
}) {
  const mt = miscMeaningLabels.en;

  return (
    <DraggableMeaningCard
      cardEl={cardEl}
      listSelector=".dithar-misc-list"
      onClose={onClose}
      ariaLabel={mt.meaningHeading}
      closeAria={mt.close}
      header={
        <p dir="rtl" className="line-clamp-1 text-[12.5px]" style={{ color: "var(--wa-ink-muted)" }}>
          {item.text_ar}
        </p>
      }
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
        {mt.meaningHeading}
      </p>
      <p className="mt-0.5 text-[13.5px] leading-[1.6]" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
        {item.englishMeaning}
      </p>
    </DraggableMeaningCard>
  );
}
