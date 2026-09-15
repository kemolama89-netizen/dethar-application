import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Search } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { settingsLabels } from "../data/settings";
import { CITIES } from "../data/cities";
import type { CityRecord } from "../data/cities";
import { resolveActiveLocationRecord, saveManualLocation } from "../lib/locationSettings";
import type { ActiveLocationRecord } from "../lib/locationSettings";

function cityToRecord(city: CityRecord): ActiveLocationRecord {
  return {
    source: "manual",
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
    countryCode: city.countryCode,
    cityNameAr: city.nameAr,
    cityNameEn: city.nameEn,
  };
}

// Settings > Location — Step 4's manual-city fallback UI. Reads/writes
// exclusively through locationSettings.ts (never a parallel storage key)
// and deliberately does NOT use the useCoordinates() hook: that hook's
// job is to actively REQUEST device geolocation, which this screen must
// never do just by being opened (the request belongs to Home/
// PrayerTimesPanel only). Instead this keeps its own local, reactive copy
// of "what's currently active", seeded from resolveActiveLocationRecord()
// (a synchronous, side-effect-free read of persisted state) and updated
// immediately on every action here — so selecting a city or resetting to
// automatic reflects on screen right away, not just after navigating
// away and back. Navigating back to Home re-mounts PrayerTimesPanel from
// scratch (see App.tsx's screen-switch routing, which renders exactly
// one screen at a time), which re-reads this same persisted state fresh
// — no further plumbing needed for the change to actually take effect.
export function LocationSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const [active, setActive] = useState<ActiveLocationRecord>(() => resolveActiveLocationRecord());
  const [query, setQuery] = useState("");

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((city) => {
      const haystack = language === "ar" ? `${city.nameAr} ${city.countryNameAr}` : `${city.nameEn} ${city.countryNameEn}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [query, language]);

  function selectCity(city: CityRecord) {
    const record = cityToRecord(city);
    saveManualLocation(record);
    setActive(record);
  }

  function useAutomaticLocation() {
    saveManualLocation(null);
    setActive(resolveActiveLocationRecord());
  }

  const activeCityName = language === "ar" ? active.cityNameAr : active.cityNameEn;
  const sourceLabel =
    active.source === "manual" ? t.locationSourceManual : active.source === "device" ? t.locationSourceDevice : t.locationSourceFallback;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.locationPageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl border p-4" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}>
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
          >
            <MapPin size={18} strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {t.locationCurrentLabel}
            </span>
            <span className="block truncate text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {activeCityName ?? `${active.latitude.toFixed(2)}, ${active.longitude.toFixed(2)}`}
            </span>
          </span>
        </div>
        <p className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
          {sourceLabel}
        </p>

        {active.source === "manual" && (
          <button
            type="button"
            onClick={useAutomaticLocation}
            className="mt-1 self-start text-[12.5px] font-medium underline underline-offset-2"
            style={{ color: "var(--color-gold)" }}
          >
            {t.locationUseAutomatic}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}>
        <Search size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.locationSearchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-2">
        {filteredCities.length === 0 && (
          <p className="mt-4 text-center text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            {t.locationNoResults}
          </p>
        )}
        {filteredCities.map((city) => {
          const selected = active.source === "manual" && active.cityNameEn === city.nameEn && active.countryCode === city.countryCode;
          return (
            <button
              key={city.id}
              type="button"
              onClick={() => selectCity(city)}
              aria-pressed={selected}
              className="flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-start"
              style={{
                borderColor: selected ? "var(--color-gold)" : "var(--color-gold-soft)",
                background: "var(--color-surface)",
                boxShadow: selected ? "inset 0 0 0 1px var(--color-gold)" : undefined,
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {language === "ar" ? city.nameAr : city.nameEn}
                </span>
                <span className="block truncate text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  {language === "ar" ? city.countryNameAr : city.countryNameEn}
                </span>
              </span>
              {selected && <Check size={16} strokeWidth={2.5} className="shrink-0" style={{ color: "var(--color-gold)" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
