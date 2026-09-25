import { useMemo } from "react";
import { MapPin, Bell, Moon, MoonStar, Sunrise, Sun, CloudSun, Sunset } from "lucide-react";
import { labels, prayerNames, prayerOrder } from "../data/content";
import type { PrayerKey } from "../data/content";
import { useLanguage } from "../theme/LanguageContext";
import { useCoordinates } from "../lib/useCoordinates";
import { addOneLocalDay, calculatePrayerTimes, formatPrayerTime } from "../lib/prayerTimes";
import { resolveCalculationSettings } from "../lib/resolveCalculationSettings";
import { loadCalculationOverrides } from "../lib/calculationSettings";
import { getCountryName } from "../data/cities";
import { useNextPrayerCountdown } from "../lib/useNextPrayerCountdown";
import { usePrayerReminder } from "../lib/usePrayerReminder";

const PRAYER_ICONS: Record<PrayerKey, typeof Moon> = {
  fajr: Moon,
  shuruq: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: MoonStar,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Small track+knob switch — distinct from Settings' own pill-style
// Enable/Disable button (NotificationsView in SettingsScreen.tsx), used
// only here since this card has no room for that button's own text label
// (the row's existing text, e.g. "تذكير الصلاة", already serves as the
// label — `role="switch"`/`aria-checked` communicates state instead of a
// changing text label). Reuses existing color tokens only (--color-gold,
// --color-primary, --color-primary-contrast) — no new palette entries.
function ReminderSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative h-4 w-7 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--color-gold)" : "rgba(var(--color-primary-contrast-rgb), 0.25)" }}
    >
      <span
        className="absolute top-0.5 h-3 w-3 rounded-full transition-transform"
        style={{
          background: "var(--color-primary-contrast)",
          insetInlineStart: "2px",
          transform: checked ? "translateX(calc(var(--rs-dir, 1) * 12px))" : "translateX(0)",
        }}
      />
    </button>
  );
}

// A compact information strip, not a padded card — the icon sits inline
// beside the prayer name (one line) rather than stacked above it, so each
// column is only two lines tall (name+icon, then time) instead of three.
// Same six prayers/order/values/dividers/colors, just laid out tighter.
// Fixed, width-first vertical spacing — not tied to viewport height. The
// label/value font sizes below use vw-based clamp(), which is width-based
// and fine to keep.
//
// `date` (which LOCAL calendar day to calculate for) comes from the app's
// existing Date & Time foundation (src/lib/dateTime.ts, via App.tsx) —
// this component never creates its own "now" for THAT purpose (the live
// countdown below has its own, deliberately finer-grained ticker — see
// useNextPrayerCountdown.ts's own comment for why that's not a competing
// source of truth). Coordinates AND the timezone to format results in are
// a separate, paired concern (see useCoordinates.ts: device geolocation
// with a Kuwait City fallback, each with its own matching timezone) —
// deliberately NOT the Date & Time foundation's own device-clock
// timezone, since that reflects the device's clock setting, not
// necessarily the location Prayer Times is actually calculating for.
//
// `times` (today's calculated prayer times) is computed ONCE here and
// passed down to every consumer below (the grid, the reminder scheduler,
// the countdown) — the single source of truth for "what are today's
// prayer times", never recomputed independently by any of them.
export function PrayerTimesPanel({ date, className = "" }: { date: Date; className?: string }) {
  const { language, dir } = useLanguage();
  const t = labels[language];
  const names = prayerNames[language];
  const { coordinates, timezone, countryCode, cityNameAr, cityNameEn } = useCoordinates();
  // The visible "current location" label — sourced from the SAME active
  // location record the calculation below reads (useCoordinates), never
  // a static placeholder string. "City, Country" when both are known
  // (a manual pick, or the Kuwait fallback — see locationSettings.ts's
  // KUWAIT_FALLBACK_LOCATION); country name alone for a device GPS fix
  // (Step 7's country-only reverse-geocode has no city-level data to
  // offer); raw coordinates only for the rare device fix too far from
  // every bundled city (reverseGeocode.ts's MAX_MATCH_DISTANCE_KM) to
  // resolve even a country. Never hardcodes "Kuwait".
  const locationLabel = useMemo(() => {
    const cityName = language === "ar" ? cityNameAr : cityNameEn;
    const countryName = countryCode ? getCountryName(countryCode, language) : undefined;
    if (cityName && countryName && countryName !== cityName) return `${cityName}, ${countryName}`;
    if (cityName) return cityName;
    if (countryName) return countryName;
    return `${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}`;
  }, [language, cityNameAr, cityNameEn, countryCode, coordinates]);
  // Step 6: the user's explicit method/madhab overrides (Settings >
  // Calculation Method), read once per mount — same "full remount on
  // screen switch" convention useLocationChangeDetector.ts's own doc
  // comment documents (App.tsx wraps each screen in `key={screen}`), so
  // navigating away to Settings and back always picks up a just-changed
  // override without this needing its own storage-change subscription.
  const overrides = useMemo(() => loadCalculationOverrides(), []);
  // resolveCalculationSettings (Step 3) turns location + overrides into a
  // ready-to-use CalculationParameters: an explicit override wins, else
  // the active location's own country resolves a country-appropriate
  // default (see countryCalculationMethod.ts), else Muslim World League.
  // For the Kuwait fallback location (countryCode "KW") this resolves to
  // the exact same CalculationMethod.Kuwait()+Shafi'i params this file
  // used to hardcode directly — see resolveCalculationSettings.test.ts's
  // own "Kuwait preservation" coverage — so today's default Kuwait
  // behavior is unchanged; only a location whose country genuinely isn't
  // Kuwait (a manually-selected city, or a country-resolved device fix)
  // or an explicit override now changes which method is used.
  const times = useMemo(
    () => calculatePrayerTimes(date, coordinates, resolveCalculationSettings({ coordinates, country: countryCode }, overrides)),
    [date, coordinates, countryCode, overrides],
  );
  // Only Fajr is ever needed from tomorrow (the after-Isha wraparound
  // case — see nextPrayer.ts), but calculatePrayerTimes computing the
  // other five too is cheap (plain trigonometry, no I/O) and keeps this
  // one call site simple rather than adding a Fajr-only variant.
  const tomorrowFajr = useMemo(
    () =>
      calculatePrayerTimes(addOneLocalDay(date), coordinates, resolveCalculationSettings({ coordinates, country: countryCode }, overrides))
        .fajr,
    [date, coordinates, countryCode, overrides],
  );

  const nextPrayer = useNextPrayerCountdown(times, tomorrowFajr);
  const reminder = usePrayerReminder(times, timezone, language);

  const countdownText = t.nextPrayerCountdown
    .replace("{h}", pad2(nextPrayer.remaining.hours))
    .replace("{m}", pad2(nextPrayer.remaining.minutes))
    .replace("{s}", pad2(nextPrayer.remaining.seconds));

  return (
    <div
      className={`min-w-0 rounded-2xl border px-2 py-0.5 sm:px-3 sm:py-1 ${className}`}
      style={{
        background: "var(--color-primary)",
        color: "var(--color-primary-contrast)",
        borderColor: "var(--color-gold)",
        borderRadius: "var(--card-radius)",
        // ReminderSwitch's knob translates by a positive offset that must
        // flip direction in RTL (translateX is always physical-left,
        // never direction-aware on its own).
        ["--rs-dir" as string]: dir === "rtl" ? -1 : 1,
      }}
    >
      <div className="flex items-center gap-2 px-1">
        {/* Equal-width invisible spacer on the other side balances the
            city/pin block, so the title sits at the row's true visual
            center instead of merely at its RTL/LTR "start" edge. */}
        <span className="flex-1" aria-hidden="true" />
        <span className="shrink-0 text-[12px] font-bold sm:text-[14px]">{t.prayerPanelTitle}</span>
        <span className="flex min-w-0 flex-1 shrink-0 items-center justify-end gap-1 text-[9px] opacity-90 sm:text-[11px]">
          <span className="truncate">{locationLabel}</span>
          <MapPin size={11} className="shrink-0" style={{ color: "var(--color-gold)" }} />
        </span>
      </div>

      <div className="mt-0.5 grid grid-cols-6">
        {prayerOrder.map((key, index) => {
          const Icon = PRAYER_ICONS[key];
          const isLast = index === prayerOrder.length - 1;
          return (
            <div
              key={key}
              className="flex min-w-0 flex-col items-center gap-0.5 px-0.5"
              style={!isLast ? { borderInlineEnd: "1px solid var(--color-panel-divider)" } : undefined}
            >
              <span className="flex min-w-0 items-center gap-0.5">
                <Icon size={9} strokeWidth={1.6} className="shrink-0" style={{ color: "var(--color-gold)" }} />
                <span className="truncate opacity-85" style={{ fontSize: "clamp(7px, 1.9vw, 8.5px)" }}>
                  {names[key]}
                </span>
              </span>
              <span
                className="w-full truncate text-center font-bold"
                style={{ direction: "ltr", fontSize: "clamp(8.5px, 2.1vw, 10.5px)" }}
              >
                {formatPrayerTime(times[key], timezone)}
              </span>
            </div>
          );
        })}
      </div>

      {/* The Hijri date is already shown in the Date & Time section above
          the Prayer Times card, so the redundant "Hijri Calendar" label
          that used to sit here was removed. */}
      <div
        className="mt-0.5 flex flex-col gap-0.5 border-t pt-px opacity-90"
        style={{ borderColor: "rgba(var(--color-primary-contrast-rgb), 0.15)", fontSize: "clamp(8px, 2.2vw, 10.5px)" }}
      >
        <div className="flex items-center justify-end gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{t.prayerReminder}</span>
            <Bell size={11} className="shrink-0" style={{ color: "var(--color-gold)" }} />
          </span>
          <ReminderSwitch checked={reminder.enabled} onChange={reminder.toggle} label={t.prayerReminder} />
        </div>

        {reminder.enabled && !reminder.available && (
          <p className="text-end leading-[1.4] opacity-75" style={{ fontSize: "clamp(7px, 1.9vw, 8.5px)" }}>
            {t.prayerReminderUnavailableNote}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate">
            {t.nextPrayerHeading}: {names[nextPrayer.key]}
          </span>
          <span className="shrink-0" style={{ direction: "ltr" }}>
            {countdownText}
          </span>
        </div>
      </div>
    </div>
  );
}
