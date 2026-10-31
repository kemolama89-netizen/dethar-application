import { Moon } from "lucide-react";
import { useDateTime } from "../lib/useDateTime";
import { useLanguage } from "../theme/LanguageContext";

// The date/time beneath the branding: the Gregorian date as the first line,
// the Hijri date (with a small crescent) and the local time as the second —
// on a soft frosted plate (index.css .dithar-date-plate) so it stays readable
// over the Home wallpaper photograph, while staying lighter than the cards
// below it (no border, no heavy shadow). Content is fully data-driven from
// the shared Date & Time foundation (src/lib/dateTime.ts + useDateTime.ts) —
// device clock + device timezone only, no network time call, no city/location.
export function DateTimeStrip({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const { gregorianDate, hijriDate, localTime } = useDateTime(language);

  return (
    <div className={`flex justify-center px-1 text-center ${className}`}>
      <div className="dithar-date-plate inline-flex max-w-full flex-col items-center rounded-2xl px-4 py-1" data-date-strip="">
        <p className="text-[13.5px] font-bold leading-snug tracking-[0.01em]" style={{ color: "var(--color-text-primary)" }}>
          {gregorianDate.formatted}
        </p>
        <p className="flex items-center gap-1 text-[11.5px] font-medium leading-snug" style={{ color: "var(--color-text-muted)" }}>
          <Moon size={11} strokeWidth={2} className="shrink-0" style={{ color: "var(--look-accent-on-card, var(--color-gold))" }} aria-hidden="true" />
          <span style={{ color: "var(--color-text-primary)", opacity: 0.86 }}>{hijriDate.formatted}</span>
          <span className="mx-1" style={{ color: "var(--color-gold)" }} aria-hidden="true">
            •
          </span>
          <span className="tabular-nums">{localTime}</span>
        </p>
      </div>
    </div>
  );
}
