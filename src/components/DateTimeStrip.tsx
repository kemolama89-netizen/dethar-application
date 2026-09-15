import { useDateTime } from "../lib/useDateTime";
import { useLanguage } from "../theme/LanguageContext";

// A compact, unobtrusive date/time line beneath the branding — deliberately
// NOT a card: no border, no background fill, no icon, no shadow, so it
// never competes with the Quranic Insight / Hadith cards immediately below
// it. Two short centered text lines only. Content is fully data-driven
// from the shared Date & Time foundation (src/lib/dateTime.ts +
// useDateTime.ts) — device clock + device timezone only, no network time
// call, no city/location of any kind.
export function DateTimeStrip({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const { gregorianDate, hijriDate, localTime } = useDateTime(language);

  return (
    <div className={`mx-auto max-w-sm px-1 text-center ${className}`}>
      <p className="text-[12.5px] font-medium" style={{ color: "var(--color-text-primary)" }}>
        {gregorianDate.formatted}
      </p>
      <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
        {hijriDate.formatted}
        <span className="mx-1.5" style={{ color: "var(--color-gold)" }} aria-hidden="true">
          •
        </span>
        {localTime}
      </p>
    </div>
  );
}
