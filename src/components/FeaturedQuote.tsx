import { featuredQuote } from "../data/content";
import { useLanguage } from "../theme/LanguageContext";

// Always shows the COMPLETE Featured Hadith — no clamping, no truncation,
// no "Read more", in either language. Arabic keeps its original approved
// size (19px/1.5 leading) untouched. English uses a smaller size (17px/1.4)
// SPECIFICALLY for this text run only — not a global font change, not
// applied to Arabic, not applied anywhere else — because its full
// translation is naturally longer than the tuned Arabic wording and this
// is the least disruptive way found to keep the complete text on-screen
// without touching the logo, cards, prayer panel, or bottom nav (all of
// which were explicitly off-limits for this fix). It's still visibly
// larger than the card body text (15px), preserving its "featured"
// prominence relative to the rest of the page.
export function FeaturedQuote() {
  const { language } = useLanguage();
  const quote = featuredQuote[language];
  const isEnglish = language === "en";

  return (
    <div className="mx-auto max-w-sm px-1 text-center">
      <p
        className={isEnglish ? "text-[17px] font-bold leading-[1.4]" : "text-[19px] font-bold leading-[1.5]"}
        style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
      >
        {quote.text}
      </p>
      <div className="mt-0.5 flex items-center justify-center gap-3">
        <span className="h-px w-8" style={{ background: "var(--color-gold)" }} />
        <span className="text-[14px]" style={{ color: "var(--color-gold)" }}>
          {quote.citation}
        </span>
        <span className="h-px w-8" style={{ background: "var(--color-gold)" }} />
      </div>
    </div>
  );
}
