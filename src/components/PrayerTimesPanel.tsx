import { MapPin, Calendar, Bell, Moon, MoonStar, Sunrise, Sun, CloudSun, Sunset } from "lucide-react";
import { labels, prayerTimes } from "../data/content";
import type { PrayerKey } from "../data/content";

const PRAYER_ICONS: Record<PrayerKey, typeof Moon> = {
  fajr: Moon,
  shuruq: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: MoonStar,
};

export function PrayerTimesPanel() {
  return (
    <div
      className="min-w-0 rounded-2xl border px-2.5 py-2 sm:px-4 sm:py-3"
      style={{
        background: "var(--color-primary)",
        color: "var(--color-primary-contrast)",
        borderColor: "var(--color-gold)",
        borderRadius: "var(--card-radius)",
      }}
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[16px] font-bold sm:text-[17px]">{labels.prayerPanelTitle}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[13px] opacity-90 sm:text-[14px]">
          {labels.city}
          <MapPin size={15} style={{ color: "var(--color-gold)" }} />
        </span>
      </div>

      <div className="mt-2 grid grid-cols-6">
        {prayerTimes.map((prayer, index) => {
          const Icon = PRAYER_ICONS[prayer.key];
          const isLast = index === prayerTimes.length - 1;
          return (
            <div
              key={prayer.key}
              className="flex min-w-0 flex-col items-center gap-1 px-0.5"
              style={!isLast ? { borderInlineEnd: "1px solid var(--color-panel-divider)" } : undefined}
            >
              <Icon size={17} strokeWidth={1.6} className="shrink-0" style={{ color: "var(--color-gold)" }} />
              <span
                className="w-full truncate text-center opacity-85"
                style={{ fontSize: "clamp(9.5px, 2.6vw, 12px)" }}
              >
                {prayer.label}
              </span>
              <span
                className="w-full truncate text-center font-bold"
                style={{ direction: "ltr", fontSize: "clamp(10.5px, 2.8vw, 14px)" }}
              >
                {prayer.value}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-2 flex items-center justify-between gap-2 border-t pt-1.5 opacity-90"
        style={{ borderColor: "rgba(246,234,208,0.15)", fontSize: "clamp(11px, 3vw, 14px)" }}
      >
        <button type="button" className="flex min-w-0 items-center gap-1.5">
          <Calendar size={16} className="shrink-0" style={{ color: "var(--color-gold)" }} />
          <span className="truncate">{labels.hijriCalendar}</span>
        </button>
        <button type="button" className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{labels.prayerReminder}</span>
          <Bell size={16} className="shrink-0" style={{ color: "var(--color-gold)" }} />
        </button>
      </div>
    </div>
  );
}
