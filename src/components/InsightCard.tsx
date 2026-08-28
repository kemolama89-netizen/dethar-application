import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CardMotif } from "./CardMotif";

interface InsightCardProps {
  variant: "quran" | "hadith";
  icon: ReactNode;
  title: string;
  attribution?: string;
  body: string;
  citation: string;
  readMoreLabel: string;
  onReadMore: () => void;
  className?: string;
}

// Share buttons were intentionally removed from this card to save vertical
// height on the Home Screen — the underlying share behavior itself isn't
// gone, it's preserved as an exported helper (see src/lib/share.ts) ready
// to be reattached to a future control.
//
// The body text is clamped to 2 lines (`line-clamp-2`) so the card's
// height is predictable regardless of content length — a longer English
// translation never grows the card, it just clips further, same as a
// short Arabic sentence would. Whether the "Read more" button appears is
// determined by actually measuring overflow (scrollHeight > clientHeight)
// after render, not by guessing from character count, so it only shows up
// when the clamp genuinely cut something off. It sits inline with the
// citation (not on its own line) specifically so showing it never adds
// any height to the card — no spacing changes were needed anywhere.
export function InsightCard({
  variant,
  icon,
  title,
  attribution,
  body,
  citation,
  readMoreLabel,
  onReadMore,
  className = "",
}: InsightCardProps) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setIsTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [body]);

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

          <p
            ref={bodyRef}
            className="mt-px line-clamp-2 text-[15px] leading-[1.25]"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            {body}
          </p>

          <div className="mt-px flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[12.5px]" style={{ color: "var(--color-text-muted)" }}>
              {citation}
            </p>

            {isTruncated && (
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
        </div>

        <CardMotif variant={variant} />
      </div>
    </div>
  );
}
