import { useMemo } from "react";
import { MapPin, Bell, Headphones, Moon, MoonStar, Sunrise, Sun, CloudSun, Sunset } from "lucide-react";
import { labels, prayerNames, prayerOrder } from "../data/content";
import type { PrayerKey } from "../data/content";
import { useLanguage } from "../theme/LanguageContext";
import { useCoordinates } from "../lib/useCoordinates";
import { calculatePrayerDay, formatPrayerTime } from "../lib/prayerTimes";
import { addDays, localDateIn, localDateKey } from "../lib/locationTime";
import { getCountryName } from "../data/cities";
import { settingsLabels } from "../data/settings";
import { useNextPrayerCountdown } from "../lib/useNextPrayerCountdown";
import { usePrayerReminder } from "../lib/usePrayerReminder";
import { useAudioAdhkarMaster } from "../lib/useAudioAdhkarMaster";
import { MIHRAB_STONE, MihrabFrame } from "./MihrabFrame";

// The hero panel is a burgundy-and-gold mihrab in every palette: it scopes the colours its text,
// countdown bar and switches use, so they stay legible on the burgundy stone (light ivory ≥ 4.5:1).
const MIHRAB_PANEL_VARS = {
  "--color-primary": MIHRAB_STONE,
  "--color-primary-contrast": "#fbf1e3",
  "--color-primary-contrast-rgb": "251, 241, 227",
  "--color-gold": "#dcb565",
  "--color-gold-rgb": "220, 181, 101",
  "--color-gold-on-primary": "#efcd80",
} as Record<string, string>;

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
// Enable/Disable button (e.g. FloatingTasbeehView in SettingsScreen.tsx), used
// only here since this card has no room for that button's own text label
// (the row's existing text, e.g. "تذكير الصلاة", already serves as the
// label — `role="switch"`/`aria-checked` communicates state instead of a
// changing text label). Reuses existing color tokens only (--color-gold,
// --color-primary, --color-primary-contrast) — no new palette entries.
function ReminderSwitch({ checked, onChange, label, name }: { checked: boolean; onChange: () => void; label: string; name: string }) {
  return (
    <button
      type="button"
      role="switch"
      data-switch={name}
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
// `date` (the current instant, refreshed every minute) comes from the app's
// existing Date & Time foundation (src/lib/dateTime.ts, via App.tsx) and is
// read in the LOCATION's timezone to get the calendar day to calculate —
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
// `variant="hero"` is Home's prominent panel (it fills the room the player
// and Qur'an cards used to take): the same calculation, countdown and the
// same two switches — only laid out larger, the next prayer framed by a
// mihrab's niche (a decorative motif — no direction is shown), with the
// next prayer's time highlighted. "compact" is the original strip.
export function PrayerTimesPanel({ date, className = "", variant = "compact" }: { date: Date; className?: string; variant?: "compact" | "hero" }) {
  const { language, dir } = useLanguage();
  const t = labels[language];
  const names = prayerNames[language];
  const { coordinates, timezone, countryCode, cityNameAr, cityNameEn, source, detecting } = useCoordinates();
  // The visible "current location" label — sourced from the SAME active
  // location record the calculation below reads (useCoordinates), never
  // a static placeholder string. "City, Country" when both are known
  // (a manual pick, or the Kuwait fallback — see locationSettings.ts's
  // KUWAIT_FALLBACK_LOCATION); country name alone for a device GPS fix
  // (Step 7's country-only reverse-geocode has no city-level data to
  // offer); raw coordinates only for the rare device fix too far from
  // every bundled city (reverseGeocode.ts's MAX_MATCH_DISTANCE_KM) to
  // resolve even a country. Never hardcodes "Kuwait".
  //
  // While this user's location is still being detected for the first time
  // nothing is shown for it (never the Kuwait placeholder); the Kuwait
  // fallback, once detection has failed, is labelled as the default
  // location — never presented as detected.
  const locationLabel = useMemo(() => {
    if (detecting) return settingsLabels[language].locationDetecting;
    const cityName = language === "ar" ? cityNameAr : cityNameEn;
    const countryName = countryCode ? getCountryName(countryCode, language) : undefined;
    const place =
      cityName && countryName && countryName !== cityName
        ? `${cityName}, ${countryName}`
        : (cityName ?? countryName ?? `${coordinates.latitude.toFixed(2)}, ${coordinates.longitude.toFixed(2)}`);
    return source === "fallback" ? `${place} · ${settingsLabels[language].locationSourceFallback}` : place;
  }, [language, cityNameAr, cityNameEn, countryCode, coordinates, source, detecting]);
  // The location's own calendar day — NOT the device's: `date` is only the
  // current instant (it ticks every minute), read in the location's
  // timezone, so the day flips at the location's midnight even when the
  // device sits in another zone.
  const dayKey = localDateKey(localDateIn(date, timezone));
  // One automatic calculation: the location's country picks its profile
  // (calculationProfiles.ts) — no method, madhab or minute override exists.
  // Recomputed only when the location or its calendar day changes.
  const { times, tomorrowFajr } = useMemo(() => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return calculatePrayerDay({ coordinates, timezone, country: countryCode }, { year, month, day });
  }, [dayKey, coordinates, countryCode, timezone]);

  // Yesterday's Isha: where the wait for Fajr began (the countdown bar's start before dawn).
  const yesterdayIsha = useMemo(() => {
    const [year, month, day] = dayKey.split("-").map(Number);
    return calculatePrayerDay({ coordinates, timezone, country: countryCode }, addDays({ year, month, day }, -1)).times.isha;
  }, [dayKey, coordinates, countryCode, timezone]);

  const nextPrayer = useNextPrayerCountdown(times, tomorrowFajr, yesterdayIsha);
  // Nothing is scheduled for the placeholder while the location is still being detected.
  const reminder = usePrayerReminder(times, timezone, language, detecting);
  // Independent of the reminder switch above: every scheduled Audio Adhkar section.
  const audioAdhkar = useAudioAdhkarMaster();

  const countdownText = t.nextPrayerCountdown
    .replace("{h}", pad2(nextPrayer.remaining.hours))
    .replace("{m}", pad2(nextPrayer.remaining.minutes))
    .replace("{s}", pad2(nextPrayer.remaining.seconds));

  const toggles = (
    <>
      {/* The toggles row, right above "الصلاة القادمة": the Audio Adhkar
          master switch at the start edge (right in Arabic) and the prayer
          reminder at the end edge, where it has always been — each switch
          at its outer edge (justify-between). Shown while the location is
          still being detected too. */}
      <div className="flex items-center justify-between gap-2" data-toggles-row="">
        <span className="flex min-w-0 items-center gap-1" data-audio-adhkar-toggle="">
          <ReminderSwitch checked={audioAdhkar.enabled} onChange={audioAdhkar.toggle} label={t.audioAdhkarToggle} name="audio-adhkar" />
          <Headphones size={11} className="shrink-0" style={{ color: "var(--color-gold)" }} aria-hidden="true" />
          <span className="truncate">{t.audioAdhkarToggle}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{t.prayerReminder}</span>
            <Bell size={11} className="shrink-0" style={{ color: "var(--color-gold)" }} />
          </span>
          <ReminderSwitch checked={reminder.enabled} onChange={reminder.toggle} label={t.prayerReminder} name="prayer-notifications" />
        </span>
      </div>

      {reminder.enabled && !reminder.available && (
        <p className="text-end leading-[1.4] opacity-75" style={{ fontSize: "clamp(7px, 1.9vw, 8.5px)" }}>
          {t.prayerReminderUnavailableNote}
        </p>
      )}
    </>
  );

  const progressBar =
    nextPrayer.fraction !== null ? (
      <div
        role="progressbar"
        aria-label={`${t.nextPrayerHeading}: ${names[nextPrayer.key]}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(nextPrayer.fraction * 100)}
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(var(--color-primary-contrast-rgb), 0.18)" }}
      >
        <div className="dithar-countdown-bar h-full rounded-full" style={{ width: `${nextPrayer.fraction * 100}%`, background: "var(--color-gold-on-primary)" }} />
      </div>
    ) : null;

  if (variant === "hero") {
    const NextIcon = PRAYER_ICONS[nextPrayer.key];
    return (
      <div
        className={`relative flex min-w-0 flex-col overflow-hidden border px-[18px] pb-2.5 pt-2 [@media(max-height:820px)]:pb-2 [@media(max-height:820px)]:pt-1.5 ${className}`}
        style={{
          // The panel's own ground, deepened toward the edges like the reference's dark field.
          ...MIHRAB_PANEL_VARS,
          background: "radial-gradient(130% 80% at 50% 30%, transparent 55%, rgba(0,0,0,0.28)), var(--color-primary)",
          color: "var(--color-primary-contrast)",
          borderColor: "#8a6631",
          // Set into the page: a soft burgundy shadow beneath the frame.
          boxShadow: "0 14px 28px -16px rgba(60, 8, 22, 0.65), 0 2px 6px -2px rgba(18, 3, 10, 0.35)",
          borderRadius: "var(--card-radius)",
          ["--rs-dir" as string]: dir === "rtl" ? -1 : 1,
        }}
        data-prayer-panel="hero"
      >
        {/* The whole panel is the mihrab (components/MihrabFrame.tsx) — an architectural motif only:
            it shows no direction (the app doesn't calculate the Qibla). */}
        <MihrabFrame />
        {/* The title and location run across the top, above the arch's crest. */}
        <div className="relative flex items-center gap-2" data-prayer-panel-title="">
          <span className="flex min-w-0 items-center gap-1.5">
            <KaabaMark />
            <span className="truncate text-[14px] font-bold">{t.prayerPanelTitle}</span>
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-end gap-1 text-[10.5px] opacity-90">
            <span className="truncate">{locationLabel}</span>
            <MapPin size={11} className="shrink-0" style={{ color: "var(--color-gold)" }} />
          </span>
        </div>

        {/* The next prayer, under the crown. */}
        <div className="relative mt-1 flex w-full flex-1 flex-col items-center justify-end px-4 pb-1.5 pt-7 [@media(max-height:880px)]:pb-0.5 [@media(max-height:880px)]:pt-4" style={{ containerType: "inline-size" }} data-next-prayer={detecting ? undefined : nextPrayer.key}>
          {detecting ? (
            <span className="relative pb-2 text-[13px] opacity-85">{settingsLabels[language].locationDetecting}</span>
          ) : (
            <>
              <span className="relative flex items-center gap-1 text-[11.5px] opacity-85 [@media(max-height:880px)]:hidden">
                <NextIcon size={13} strokeWidth={1.7} style={{ color: "var(--color-gold)" }} aria-hidden="true" />
                {t.nextPrayerHeading}
              </span>
              <strong className="relative text-[clamp(21px,6.6vw,30px)] leading-tight [@media(max-height:860px)]:text-[clamp(19px,5.8vw,24px)]" style={{ fontFamily: "var(--font-display)" }} data-next-prayer-name="">
                {names[nextPrayer.key]}
              </strong>
              <span
                className="relative whitespace-nowrap font-bold tabular-nums"
                // Never wider than the niche between its pilasters: the size also follows the line's length (cqw: the niche's width).
                style={{ direction: "ltr", fontSize: `min(clamp(12.5px, 3.7vw, 16px), calc(100cqw * 2.2 / ${Math.max(countdownText.length, 1)}))`, color: "var(--color-gold-on-primary)" }}
                data-next-prayer-countdown=""
              >
                {countdownText}
              </span>
              <span className="relative mt-1.5 w-full [@media(max-height:880px)]:mt-1">{progressBar}</span>
            </>
          )}
        </div>

        <div className="relative mt-1.5 grid grid-cols-6 gap-1" data-prayer-times="">
          {prayerOrder.map((key) => {
            const Icon = PRAYER_ICONS[key];
            const isNext = !detecting && key === nextPrayer.key;
            return (
              <div
                key={key}
                className="flex min-w-0 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 [@media(max-height:820px)]:gap-0 [@media(max-height:820px)]:py-0.5"
                style={isNext ? { background: "rgba(var(--color-gold-rgb), 0.18)", boxShadow: "inset 0 0 0 1px var(--color-gold)" } : { background: "rgba(var(--color-primary-contrast-rgb), 0.06)" }}
                data-prayer={key}
                data-next={isNext ? "" : undefined}
              >
                <Icon size={13} strokeWidth={1.6} className="shrink-0" style={{ color: "var(--color-gold)" }} aria-hidden="true" />
                <span className="w-full truncate text-center opacity-90" style={{ fontSize: "clamp(8.5px, 2.4vw, 10.5px)" }}>
                  {names[key]}
                </span>
                <span className="w-full truncate text-center font-bold" style={{ direction: "ltr", fontSize: "clamp(10.5px, 2.9vw, 13px)" }}>
                  {detecting ? "--:--" : formatPrayerTime(times[key], timezone)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="relative mt-1.5 flex flex-col gap-0.5 border-t pt-1.5 opacity-95" style={{ borderColor: "rgba(216,178,106,0.3)", fontSize: "clamp(9.5px, 2.6vw, 11.5px)" }}>
          {toggles}
        </div>
      </div>
    );
  }

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
                {detecting ? "--:--" : formatPrayerTime(times[key], timezone)}
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
        {toggles}

        {!detecting && (
          <div className="flex flex-col gap-1 pb-0.5" data-next-prayer={nextPrayer.key}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate">
                {t.nextPrayerHeading}: <strong className="text-[1.15em]">{names[nextPrayer.key]}</strong>
              </span>
              <span className="shrink-0 font-bold tabular-nums" style={{ direction: "ltr", fontSize: "clamp(11px, 3.2vw, 14px)", color: "var(--color-gold-on-primary)" }}>
                {countdownText}
              </span>
            </div>
            {progressBar}
          </div>
        )}
      </div>
    </div>
  );
}

/** A small Kaaba: the cube with its gold band — beside the panel's title. */
function KaabaMark() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="shrink-0">
      <path d="M10 2.5 17 5.6v8.8L10 17.5 3 14.4V5.6z" fill="rgba(0,0,0,0.55)" stroke="var(--color-gold)" strokeWidth="1" strokeLinejoin="round" />
      <path d="M3 7.6 10 10.7l7-3.1" fill="none" stroke="var(--color-gold)" strokeWidth="1.6" />
      <path d="M10 10.7v6.8" stroke="var(--color-gold)" strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}
