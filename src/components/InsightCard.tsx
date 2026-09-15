import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CardMotif } from "./CardMotif";

export interface InsightCardDetail {
  label: string;
  value: string;
}

interface InsightCardProps {
  variant: "quran" | "hadith";
  icon: ReactNode;
  title: string;
  attribution?: string;
  verse?: string;
  verseReference?: string;
  body: string;
  /** Quranic Insight card only: a single-line citation, shown as-is when
   *  present. Only pass a value that's actually in the current interface
   *  language — omit it when no localized value exists rather than
   *  passing a different language's text (see App.tsx). */
  citation?: string;
  /** Hadith card only: structured takhrij/details rows (Source, Hadith
   *  No., Grade, Grading Source, Narrator). Not rendered by this
   *  component — ContentModal renders them, once the full-content overlay
   *  is open (see App.tsx). Passed here only so its presence/length can
   *  gate the "Show More" button's visibility: `hasDetails || isTruncated`
   *  — i.e. governed by whether there's something to reveal, never by
   *  Hadith text length alone (a short Hadith with full takhrij data must
   *  still show the button). */
  details?: InsightCardDetail[];
  /** Label for the bottom-row button, shown whenever there's a citation to
   *  show (Quran: "Read more"/"اقرأ المزيد") or `details`/overflow exist
   *  (Hadith: "Show More"/"إظهار المزيد"). */
  readMoreLabel?: string;
  /** Opens the shared full-content overlay (ContentModal) for this card —
   *  same dim-backdrop / centered-card / X-close presentation for both the
   *  Quranic Insight and Hadith cards (see App.tsx). */
  onReadMore?: () => void;
  className?: string;
}

// Share buttons were intentionally removed from this card to save vertical
// height on the Home Screen — the underlying share behavior itself isn't
// gone, it's preserved as an exported helper (see src/lib/share.ts) ready
// to be reattached to a future control.
//
// Both cards (Quranic Insight and Hadith) render the same way: a
// 2-line-clamped body, an optional citation line, and — whenever there's
// more to see (the clamp actually overflows, OR `details` exist even if
// the clamp doesn't overflow) — a single button that opens the SAME
// full-content overlay (ContentModal), never an inline expansion. Hadith
// passes `details` (so its button also appears for a short Hadith with
// full takhrij data) and no `citation`; Quranic Insight passes `citation`
// and no `details`. Neither card renders `details`' rows itself — that's
// ContentModal's job once open.
export function InsightCard({
  variant,
  icon,
  title,
  attribution,
  verse,
  verseReference,
  body,
  citation,
  details,
  readMoreLabel,
  onReadMore,
  className = "",
}: InsightCardProps) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const hasDetails = Boolean(details && details.length > 0);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [body]);

  const hasBottomRow = Boolean(citation) || hasDetails || isTruncated;

  return (
    <div
      className={`rounded-2xl border p-1.5 sm:p-2 ${className}`}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-gold-soft)",
        borderRadius: "var(--card-radius)",
        boxShadow: "0 8px 20px -14px rgba(var(--color-shadow-rgb), 0.35)",
      }}
    >
      <div className="flex gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full"
          style={{ background: "var(--color-primary)", color: "var(--color-gold)" }}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-bold" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </h3>

          {attribution && (
            <p className="mt-px text-[13px]" style={{ color: "var(--color-text-muted)" }}>
              {attribution}
            </p>
          )}

          {verse && (
            <p
              className="mt-px text-[15px] leading-[1.25]"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
            >
              {verse}
            </p>
          )}

          {verseReference && (
            <p className="mt-px text-[12.5px]" style={{ color: "var(--color-text-muted)" }}>
              {verseReference}
            </p>
          )}

          <p
            ref={bodyRef}
            className="mt-px line-clamp-2 text-[15px] leading-[1.25]"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            {body}
          </p>

          {hasBottomRow && (
            <div className="mt-px flex items-center justify-between gap-2">
              {citation && (
                <p className="min-w-0 truncate text-[12.5px]" style={{ color: "var(--color-text-muted)" }}>
                  {citation}
                </p>
              )}
              {(hasDetails || isTruncated) && (
                <button
                  type="button"
                  onClick={onReadMore}
                  className="shrink-0 text-[12.5px] font-medium underline underline-offset-2"
                  style={{ color: "var(--color-gold)" }}
                >
                  {readMoreLabel}
                </button>
              )}
            </div>
          )}
        </div>

        {/* The decorative side illustration stays on the collapsed card for
            BOTH variants (this is the card's normal, unchanged visual
            design). It's deliberately absent only from the expanded
            full-content overlay (ContentModal) — a complete Hadith plus
            five metadata rows next to that same image would read as busy —
            never from this collapsed card. */}
        <CardMotif variant={variant} />
      </div>
    </div>
  );
}
