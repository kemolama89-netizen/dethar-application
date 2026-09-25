import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { settingsLabels, calculationMethodLabels, madhabLabels } from "../data/settings";
import { SUPPORTED_CALCULATION_METHODS } from "../lib/calculationMethods";
import type { CalculationMethodId } from "../lib/calculationMethods";
import type { MadhabId, CalculationOverrides } from "../lib/resolveCalculationSettings";
import { loadCalculationOverrides, saveCalculationMethodOverride, saveMadhabOverride } from "../lib/calculationSettings";
import { resolveActiveLocationRecord } from "../lib/locationSettings";
import { getCalculationMethodForCountry } from "../lib/countryCalculationMethod";

const MADHAB_IDS: MadhabId[] = ["shafi", "hanafi"];

// One selectable row — reused for both the Method and Madhab sections,
// same visual language (gold border + check icon) LocationSettingsView's
// own city rows already use, so this reads as part of the same Settings
// architecture rather than a new pattern. Also used by
// QuranReciterSettingsView.
export function OptionRow({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-center gap-3 rounded-2xl border px-4 py-2.5 text-start"
      style={{
        borderColor: selected ? "var(--color-gold)" : "var(--color-gold-soft)",
        background: "var(--color-surface)",
        boxShadow: selected ? "inset 0 0 0 1px var(--color-gold)" : undefined,
      }}
    >
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </span>
      {selected && <Check size={16} strokeWidth={2.5} className="shrink-0" style={{ color: "var(--color-gold)" }} />}
    </button>
  );
}

// Settings > Calculation Method — Step 6 of the global hybrid prayer-time
// architecture. Reads/writes exclusively through calculationSettings.ts
// (never a parallel storage key, never locationSettings.ts — this screen
// must never touch location resolution, GPS behavior, manual-city
// selection, or the Step 5 location-change detector; it only READS the
// active location's own already-persisted country code, via
// resolveActiveLocationRecord()'s synchronous, side-effect-free snapshot,
// purely to show what "Automatic" currently resolves to).
//
// Method and madhab are two independent sections, each with its own
// "Automatic" option alongside the explicit choices — selecting a method
// never touches the madhab override, and vice versa (see
// resolveCalculationSettings.ts's own two independent hierarchies, which
// this screen is just a UI over).
export function CalculationSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const [overrides, setOverrides] = useState<CalculationOverrides>(() => loadCalculationOverrides());
  // Snapshot at mount, same as LocationSettingsView's own `active` state —
  // only used to display what "Automatic" resolves to right now; never
  // re-requests or mutates location in any way.
  const [countryCode] = useState<string | undefined>(() => resolveActiveLocationRecord().countryCode);

  const automaticMethod = getCalculationMethodForCountry(countryCode);
  const automaticMethodLabel = calculationMethodLabels[automaticMethod][language];

  function selectMethod(method: CalculationMethodId | null) {
    saveCalculationMethodOverride(method);
    setOverrides((prev) => ({ ...prev, method: method ?? undefined }));
  }

  function selectMadhab(madhab: MadhabId | null) {
    saveMadhabOverride(madhab);
    setOverrides((prev) => ({ ...prev, madhab: madhab ?? undefined }));
  }

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
          {t.calculationPageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2">
        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {t.calculationMethodSectionTitle}
          </p>
          <OptionRow
            label={`${t.calculationAutomaticLabel} — ${t.calculationAutomaticResolvedHint(automaticMethodLabel)}`}
            selected={overrides.method === undefined}
            onSelect={() => selectMethod(null)}
          />
          {SUPPORTED_CALCULATION_METHODS.map((methodId) => (
            <OptionRow
              key={methodId}
              label={calculationMethodLabels[methodId][language]}
              selected={overrides.method === methodId}
              onSelect={() => selectMethod(methodId)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {t.calculationMadhabSectionTitle}
          </p>
          <OptionRow
            label={t.calculationAutomaticLabel}
            selected={overrides.madhab === undefined}
            onSelect={() => selectMadhab(null)}
          />
          {MADHAB_IDS.map((madhabId) => (
            <OptionRow
              key={madhabId}
              label={madhabLabels[madhabId][language]}
              selected={overrides.madhab === madhabId}
              onSelect={() => selectMadhab(madhabId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
