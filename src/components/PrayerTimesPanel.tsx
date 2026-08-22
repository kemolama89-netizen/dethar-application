import { MapPin, Calendar, Bell, Moon, MoonStar, Sunrise, Sun, CloudSun, Sunset } from "lucide-react";
import { labels, prayerNames, prayerTimes } from "../data/content";
import type { PrayerKey } from "../data/content";
import { useLanguage } from "../theme/LanguageContext";

const PRAYER_ICONS: Record<PrayerKey, typeof Moon> = {
  fajr: Moon,
  shuruq: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: MoonStar,
};

// A compact information strip, not a padded card — the icon sits inline
// beside the prayer name (one line) rather than stacked above it, so each
// column is only two lines tall (name+icon, then time) instead of three.
// Same six prayers/order/values/dividers/colors, just laid out tighter.
// Fixed, width-first vertical spacing — not tied to viewport height. The
// label/value font sizes below use vw-based clamp(), which is width-based
// and fine to keep.
export function PrayerTimesPanel({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const t = labels[language];
  const names = prayerNames[language];

  return (
    <div
      className={`min-w-0 rounded-2xl border px-2 py-0.5 sm:px-3 sm:py-1 ${className}`}
      style={{
        background: "var(--color-primary)",
        color: "var(--color-primary-contrast)",
        borderColor: "var(--color-gold)",
        borderRadius: "var(--card-radius)",
      }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[12px] font-bold sm:text-[14px]">{t.prayerPanelTitle}</span>
        <span className="flex shrink-0 items-center gap-1 text-[9px] opacity-90 sm:text-[11px]">
          {t.city}
          <MapPin size={11} style={{ color: "var(--color-gold)" }} />
        </span>
      </div>

      <div className="mt-0.5 grid grid-cols-6">
        {prayerTimes.map((prayer, index) => {
          const Icon = PRAYER_ICONS[prayer.key];
          const isLast = index === prayerTimes.length - 1;
          return (
            <div
              key={prayer.key}
              className="flex min-w-0 flex-col items-center gap-0.5 px-0.5"
              style={!isLast ? { borderInlineEnd: "1px solid var(--color-panel-divider)" } : undefined}
            >
              <span className="flex min-w-0 items-center gap-0.5">
                <Icon size={9} strokeWidth={1.6} className="shrink-0" style={{ color: "var(--color-gold)" }} />
                <span className="truncate opacity-85" style={{ fontSize: "clamp(7px, 1.9vw, 8.5px)" }}>
                  {names[prayer.key]}
                </span>
              </span>
              <span
                className="w-full truncate text-center font-bold"
                style={{ direction: "ltr", fontSize: "clamp(8.5px, 2.1vw, 10.5px)" }}
              >
                {prayer.value}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-0.5 flex items-center justify-between gap-2 border-t pt-px opacity-90"
        style={{ borderColor: "rgba(246,234,208,0.15)", fontSize: "clamp(8px, 2.2vw, 10.5px)" }}
      >
        <button type="button" className="flex min-w-0 items-center gap-1">
          <Calendar size={11} className="shrink-0" style={{ color: "var(--color-gold)" }} />
          <span className="truncate">{t.hijriCalendar}</span>
        </button>
        <button type="button" className="flex min-w-0 items-center gap-1">
          <span className="truncate">{t.prayerReminder}</span>
          <Bell size={11} className="shrink-0" style={{ color: "var(--color-gold)" }} />
        </button>
      </div>
    </div>
  );
}
