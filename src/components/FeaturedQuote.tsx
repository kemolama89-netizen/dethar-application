import { featuredQuote } from "../data/content";

export function FeaturedQuote() {
  return (
    <div className="mx-auto max-w-sm px-1 text-center">
      <p
        className="text-[19px] font-bold leading-[1.5]"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
      >
        {featuredQuote.text}
      </p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className="h-px w-8" style={{ background: "var(--color-gold)" }} />
        <span className="text-[14px]" style={{ color: "var(--color-gold)" }}>
          {featuredQuote.citation}
        </span>
        <span className="h-px w-8" style={{ background: "var(--color-gold)" }} />
      </div>
    </div>
  );
}
