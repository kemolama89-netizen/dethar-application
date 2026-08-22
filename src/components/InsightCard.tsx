import { useState } from "react";
import type { ReactNode } from "react";
import { Share2, Check } from "lucide-react";
import { CardMotif } from "./CardMotif";

interface InsightCardProps {
  variant: "quran" | "hadith";
  icon: ReactNode;
  title: string;
  attribution?: string;
  body: string;
  citation: string;
  shareLabel: string;
}

export function InsightCard({
  variant,
  icon,
  title,
  attribution,
  body,
  citation,
  shareLabel,
}: InsightCardProps) {
  const [justShared, setJustShared] = useState(false);

  async function handleShare() {
    const shareText = `${body} ${citation}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setJustShared(true);
        setTimeout(() => setJustShared(false), 1800);
      }
    } catch {
      // user cancelled the native share sheet — nothing to do
    }
  }

  return (
    <div
      className="rounded-2xl border p-3 sm:p-4"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-gold-soft)",
        borderRadius: "var(--card-radius)",
        boxShadow: "0 8px 20px -14px rgba(18, 33, 63, 0.35)",
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
            <p className="mt-1 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
              {attribution}
            </p>
          )}

          <p
            className="mt-1.5 text-[15px] leading-[1.45]"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            {body}
          </p>

          <p className="mt-1 text-[12.5px]" style={{ color: "var(--color-text-muted)" }}>
            {citation}
          </p>
        </div>

        <CardMotif variant={variant} />
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="mt-2.5 flex items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors"
        style={{
          borderColor: "var(--color-gold-soft)",
          color: "var(--color-text-primary)",
        }}
      >
        {justShared ? (
          <Check size={16} style={{ color: "var(--color-primary)" }} />
        ) : (
          <Share2 size={16} style={{ color: "var(--color-gold)" }} />
        )}
        <span>{justShared ? "تم النسخ" : shareLabel}</span>
      </button>
    </div>
  );
}
