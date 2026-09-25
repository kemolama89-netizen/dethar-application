import { useEffect, useMemo, useState } from "react";
import { AudioLines, BarChart3, Bell, CalendarDays, Circle, ChevronDown, ChevronLeft, ChevronRight, Compass, MapPin, Palette, Trash2, Volume2 } from "lucide-react";
import { isFloatingTasbeehAvailable } from "../lib/floatingTasbeehSync";
import { FloatingTasbeeh } from "../lib/floatingTasbeehBridge";
import { loadNotificationSettings, saveNotificationSettings } from "../lib/notificationSettings";
import { isNotificationsAvailable, requestNotificationPermission, scheduleReminders, cancelReminders } from "../lib/notificationService";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { AppearanceSettings } from "./AppearanceSettings";
import { LocationSettingsView } from "./LocationSettingsView";
import { CalculationSettingsView } from "./CalculationSettingsView";
import { QuranReciterSettingsView } from "./QuranReciterSettingsView";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { audioAdhkarSettingsLabels } from "../data/audioAdhkarSettingsLabels";
import { useLanguage } from "../theme/LanguageContext";
import { useQuranReciter } from "../theme/QuranReciterContext";
import { navLabels } from "../data/content";
import { settingsLabels } from "../data/settings";
import { writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarCategoryKey, WrittenAdhkarItem } from "../data/written-adhkar";
import { dhikrItems } from "../data/tasbeeh";
import { useBackDismiss } from "../lib/backOverlays";
import {
  addDays,
  clearAllStats,
  getEarliestLocalDate,
  getPrayerStats,
  getTasbeehStats,
  resolveCustomRange,
  getWirdDayStats,
  startOfWeek,
  todayLocalDate,
  type DhikrBreakdownEntry,
  type StatSelection,
} from "../lib/stats";

interface SettingsScreenProps {
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToWritten: () => void;
}

type SettingsView = "menu" | "statistics" | "appearance" | "floating-tasbeeh" | "notifications" | "location" | "calculation" | "quran-reciter" | "audio-adhkar";

type PeriodKind = "daily" | "weekly" | "monthly" | "yearly" | "custom" | "all";

const PERIOD_KINDS: PeriodKind[] = ["daily", "weekly", "monthly", "yearly", "custom", "all"];

// "YYYY-MM-DD" -> local-midnight Date, for display formatting only (never
// for period bucketing — that logic lives entirely in src/lib/stats.ts).
function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(dateStr: string, language: "ar" | "en"): string {
  return parseDateStr(dateStr).toLocaleDateString(language === "ar" ? "ar-u-nu-latn" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonthYear(year: number, month: number, language: "ar" | "en"): string {
  return new Date(year, month - 1, 1).toLocaleDateString(language === "ar" ? "ar-u-nu-latn" : "en-US", {
    month: "long",
    year: "numeric",
  });
}

interface BreakdownRow {
  id: string;
  label: string;
  total: number;
}

function writtenLabel(item: WrittenAdhkarItem, language: "ar" | "en"): string {
  if (language === "ar") return item.title_ar ?? item.text_ar;
  return item.title_en ?? item.text_en;
}

function toWrittenRows(category: WrittenAdhkarCategoryKey, entries: DhikrBreakdownEntry[], language: "ar" | "en"): BreakdownRow[] {
  const items = writtenAdhkarItems[category];
  return entries
    .map((e) => {
      const item = items.find((i) => i.id === e.dhikrId);
      return { id: e.dhikrId, label: item ? writtenLabel(item, language) : e.dhikrId, total: e.total };
    })
    .sort((a, b) => b.total - a.total);
}

function toTasbeehRows(entries: DhikrBreakdownEntry[], language: "ar" | "en"): BreakdownRow[] {
  return entries
    .map((e) => {
      const item = dhikrItems.find((d) => String(d.id) === e.dhikrId);
      return { id: e.dhikrId, label: item ? (language === "ar" ? item.dhikr_ar : item.dhikr_en) : e.dhikrId, total: e.total };
    })
    .sort((a, b) => b.total - a.total);
}

// One collapsible summary row — collapsed state IS the "clean summary"
// (title + headline number) the spec asks for at the top of the page;
// expanding it in place reveals the per-Dhikr breakdown, so the same card
// serves both roles without a second nested screen.
function StatCategoryCard({
  title,
  headline,
  expanded,
  onToggle,
  rows,
  emptyLabel,
}: {
  title: string;
  headline: string;
  expanded: boolean;
  onToggle: () => void;
  rows: BreakdownRow[];
  emptyLabel: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {title}
          </p>
          <p className="mt-0.5 text-[18px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }}>
            {headline}
          </p>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className="shrink-0 transition-transform duration-200"
          style={{ color: "var(--color-text-muted)", transform: expanded ? "rotate(180deg)" : undefined }}
        />
      </button>

      {expanded && (
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--color-gold-soft)" }}>
          {rows.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              {emptyLabel}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[12.5px]" style={{ color: "var(--color-text-primary)" }}>
                    {row.label}
                  </span>
                  <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: "var(--color-gold)" }}>
                    {`× ${row.total.toLocaleString("en-US")}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Prev/next stepper shared by the weekly/monthly/yearly anchor controls —
// a centered label with two small arrow buttons, matching the app's
// restrained icon-button language (same treatment as BackHeader's own
// circular back button) rather than a native, hard-to-restyle input.
function PeriodStepper({
  label,
  onPrev,
  onNext,
  nextDisabled,
  prevLabel,
  nextLabel,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
}) {
  const { dir } = useLanguage();
  // In RTL, "forward in time" (next) still reads as the LEFT arrow visually
  // consistent with how BackHeader/SettingsScreen already mirror chevrons —
  // "previous" points toward the start-of-reading edge, "next" away from it.
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onPrev}
        aria-label={prevLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold-soft)", color: "var(--color-text-primary)" }}
      >
        <PrevIcon size={16} strokeWidth={1.8} />
      </button>
      <p className="min-w-0 flex-1 truncate text-center text-[13.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        aria-label={nextLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{
          boxShadow: "inset 0 0 0 1.5px var(--color-gold-soft)",
          color: nextDisabled ? "var(--color-text-muted)" : "var(--color-text-primary)",
          opacity: nextDisabled ? 0.45 : 1,
        }}
      >
        <NextIcon size={16} strokeWidth={1.8} />
      </button>
    </div>
  );
}

// Styled wrapper around a native `<input type="date">` — kept native (not a
// bespoke calendar widget) for reliable cross-platform mobile date-picking,
// but boxed in the app's own card/gold-hairline language so it still reads
// as part of DITHAR rather than a bare browser control.
function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"
      style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
    >
      <CalendarDays size={15} strokeWidth={1.8} style={{ color: "var(--color-gold)" }} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </span>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="min-w-0 bg-transparent text-[12.5px] font-semibold"
          style={{ color: "var(--color-text-primary)", colorScheme: "light" }}
        />
      </span>
    </label>
  );
}

function StatisticsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const [periodKind, setPeriodKind] = useState<PeriodKind>("daily");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  // System Back cancels the confirmation, like the backdrop (see lib/backOverlays.ts).
  useBackDismiss(confirmingReset, () => setConfirmingReset(false));
  // Bumped once after the user confirms "حذف سجل الإحصائيات" — it exists
  // purely to force the data-reading useMemos below (earliest/morning/
  // evening/prayer/tasbeeh) to recompute, since clearAllStats() mutates
  // src/lib/stats.ts's own module-level store, which none of those memos'
  // OTHER dependencies (selection, language) would otherwise notice changed.
  const [refreshKey, setRefreshKey] = useState(0);
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const today = todayLocalDate();
  // `refreshKey` is intentionally not read inside the callback — it exists
  // solely to invalidate this memo after handleConfirmReset() mutates
  // stats.ts's own module-level store, which this memo has no other way of
  // observing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const earliest = useMemo(() => getEarliestLocalDate(), [refreshKey]);
  const [todayYear, todayMonth] = useMemo(() => today.split("-").map(Number), [today]);

  const [dailyDate, setDailyDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [monthYear, setMonthYear] = useState(() => ({ year: todayYear, month: todayMonth }));
  const [yearValue, setYearValue] = useState(todayYear);
  const [customFrom, setCustomFrom] = useState(earliest ?? today);
  const [customTo, setCustomTo] = useState(today);

  const periodLabel: Record<PeriodKind, string> = {
    daily: t.periodDaily,
    weekly: t.periodWeekly,
    monthly: t.periodMonthly,
    yearly: t.periodYearly,
    custom: t.periodCustom,
    all: t.periodAllTime,
  };

  const selection: StatSelection = useMemo(() => {
    switch (periodKind) {
      case "daily":
        return { kind: "daily", date: dailyDate };
      case "weekly":
        return { kind: "weekly", weekStart };
      case "monthly":
        return { kind: "monthly", year: monthYear.year, month: monthYear.month };
      case "yearly":
        return { kind: "yearly", year: yearValue };
      case "custom":
        return { kind: "custom", ...resolveCustomRange(customFrom, customTo, today) };
      case "all":
        return { kind: "all" };
    }
  }, [periodKind, dailyDate, weekStart, monthYear, yearValue, customFrom, customTo, today]);

  // Same reasoning as `earliest` above: `refreshKey` forces these four to
  // recompute after a Statistics reset even when `selection` itself hasn't
  // changed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const morning = useMemo(() => getWirdDayStats("morning", selection), [selection, refreshKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const evening = useMemo(() => getWirdDayStats("evening", selection), [selection, refreshKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prayer = useMemo(() => getPrayerStats(selection), [selection, refreshKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tasbeeh = useMemo(() => getTasbeehStats(selection), [selection, refreshKey]);

  const morningRows = useMemo(() => toWrittenRows("morning", morning.perDhikr, language), [morning, language]);
  const eveningRows = useMemo(() => toWrittenRows("evening", evening.perDhikr, language), [evening, language]);
  const prayerRows = useMemo(() => toWrittenRows("prayer", prayer.perDhikr, language), [prayer, language]);
  const tasbeehRows = useMemo(() => toTasbeehRows(tasbeeh.perDhikr, language), [tasbeeh, language]);

  function toggle(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  // The user's explicit, confirmed choice to delete their recorded
  // Statistics history and start collecting it again from zero. Never
  // touches src/lib/tasbeehCounters.ts (the separate, persistent Tasbih
  // counter store) — clearAllStats() only ever removes stats.ts's own
  // localStorage key, so current Tasbih counters, language/theme, and
  // every other piece of local data are structurally untouched.
  function handleConfirmReset() {
    clearAllStats();
    // Return every anchor to what a fresh mount would compute today —
    // "منذ البداية" and the Daily/Custom pickers should read as a clean
    // slate starting from now, not still pointing at a now-nonexistent
    // old date range.
    setDailyDate(today);
    setWeekStart(startOfWeek(today));
    setMonthYear({ year: todayYear, month: todayMonth });
    setYearValue(todayYear);
    setCustomFrom(today);
    setCustomTo(today);
    setExpandedKey(null);
    setConfirmingReset(false);
    setRefreshKey((k) => k + 1);
  }

  const isCurrentOrFutureWeek = weekStart >= startOfWeek(today);
  const isCurrentOrFutureMonth = monthYear.year > todayYear || (monthYear.year === todayYear && monthYear.month >= todayMonth);
  const isCurrentOrFutureYear = yearValue >= todayYear;

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
          {t.statisticsPageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {PERIOD_KINDS.map((p) => {
          const active = p === periodKind;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodKind(p)}
              aria-pressed={active}
              className="rounded-full border px-1.5 py-1.5 text-center font-medium"
              style={{
                fontSize: "clamp(9.5px, 2.6vw, 11px)",
                borderColor: active ? "var(--color-gold)" : "var(--color-gold-soft)",
                background: active ? "var(--color-primary)" : "var(--color-surface)",
                color: active ? "var(--color-gold)" : "var(--color-text-primary)",
              }}
            >
              {periodLabel[p]}
            </button>
          );
        })}
      </div>

      {/* Per-kind anchor selector — how the user picks WHICH day / week /
          month / year / range is being reported, per spec 4B. Hidden for
          "since the beginning", which has no anchor to pick. */}
      {periodKind !== "all" && (
        <div className="mt-2.5 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}>
          {periodKind === "daily" && (
            <DateField label={t.chooseDate} value={dailyDate} max={today} onChange={setDailyDate} />
          )}
          {periodKind === "weekly" && (
            <PeriodStepper
              label={t.weekOf(formatDisplayDate(weekStart, language), formatDisplayDate(addDays(weekStart, 6), language))}
              onPrev={() => setWeekStart((prev) => addDays(prev, -7))}
              onNext={() => setWeekStart((prev) => addDays(prev, 7))}
              nextDisabled={isCurrentOrFutureWeek}
              prevLabel={t.previousPeriod}
              nextLabel={t.nextPeriod}
            />
          )}
          {periodKind === "monthly" && (
            <PeriodStepper
              label={formatMonthYear(monthYear.year, monthYear.month, language)}
              onPrev={() =>
                setMonthYear((prev) => (prev.month === 1 ? { year: prev.year - 1, month: 12 } : { year: prev.year, month: prev.month - 1 }))
              }
              onNext={() =>
                setMonthYear((prev) => (prev.month === 12 ? { year: prev.year + 1, month: 1 } : { year: prev.year, month: prev.month + 1 }))
              }
              nextDisabled={isCurrentOrFutureMonth}
              prevLabel={t.previousPeriod}
              nextLabel={t.nextPeriod}
            />
          )}
          {periodKind === "yearly" && (
            <PeriodStepper
              label={String(yearValue)}
              onPrev={() => setYearValue((y) => y - 1)}
              onNext={() => setYearValue((y) => y + 1)}
              nextDisabled={isCurrentOrFutureYear}
              prevLabel={t.previousPeriod}
              nextLabel={t.nextPeriod}
            />
          )}
          {periodKind === "custom" && (
            <div className="flex items-center gap-2">
              {/* Both fields are bounded only by "not in the future" — never by
                  each other or by the earliest recorded date — so any past
                  date stays selectable in either field, in any order (see
                  resolveCustomRange in stats.ts). */}
              <DateField label={t.fromDate} value={customFrom} max={today} onChange={setCustomFrom} />
              <DateField label={t.toDate} value={customTo} max={today} onChange={setCustomTo} />
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2.5 pb-2">
        <StatCategoryCard
          title={t.morningTitle}
          headline={t.daysCompleted(morning.daysCompleted)}
          expanded={expandedKey === "morning"}
          onToggle={() => toggle("morning")}
          rows={morningRows}
          emptyLabel={t.noDataYet}
        />
        <StatCategoryCard
          title={t.eveningTitle}
          headline={t.daysCompleted(evening.daysCompleted)}
          expanded={expandedKey === "evening"}
          onToggle={() => toggle("evening")}
          rows={eveningRows}
          emptyLabel={t.noDataYet}
        />
        <StatCategoryCard
          title={t.prayerTitle}
          headline={t.sessionsCompleted(prayer.sessionsCompleted)}
          expanded={expandedKey === "prayer"}
          onToggle={() => toggle("prayer")}
          rows={prayerRows}
          emptyLabel={t.noDataYet}
        />
        <StatCategoryCard
          title={t.tasbeehTitle}
          headline={t.totalRepetitions(tasbeeh.total)}
          expanded={expandedKey === "tasbeeh"}
          onToggle={() => toggle("tasbeeh")}
          rows={tasbeehRows}
          emptyLabel={t.noDataYet}
        />

        {/* Deliberately separated (its own quiet, secondary row, not a 5th
            StatCategoryCard) and worded specifically as Statistics HISTORY
            deletion — distinct from Tasbih Reset / Repeat-Restart, which
            live entirely elsewhere and are untouched by this. */}
        <button
          type="button"
          onClick={() => setConfirmingReset(true)}
          className="mt-1 flex items-center justify-center gap-1.5 py-1.5 text-[11.5px] font-medium"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Trash2 size={13} strokeWidth={1.8} />
          {t.resetStatisticsRow}
        </button>
      </div>

      {confirmingReset && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center p-4"
          style={{ background: "rgba(11, 21, 38, 0.45)" }}
          role="presentation"
          onClick={() => setConfirmingReset(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={t.resetConfirmTitle}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border p-5"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-gold-soft)",
              borderRadius: "var(--card-radius)",
              boxShadow: "0 20px 50px -20px rgba(var(--color-shadow-rgb), 0.5)",
            }}
          >
            <h3 className="text-[16px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              {t.resetConfirmTitle}
            </h3>
            <p className="mt-2 text-[13px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
              {t.resetConfirmBody}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmReset}
                className="w-full rounded-full py-2.5 text-[13.5px] font-bold"
                style={{ background: "#8a3b3b", color: "#fbf2ee" }}
              >
                {t.resetConfirmConfirm}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="w-full rounded-full py-2.5 text-[13.5px] font-semibold"
                style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold-soft)", color: "var(--color-text-primary)" }}
              >
                {t.resetConfirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Floating Tasbeeh's Settings entry. On the native Android build (see
// isFloatingTasbeehAvailable) this is a REAL enable/disable toggle wired to
// FloatingTasbeehPlugin — Phase 2's native bridge. On every other platform
// (iOS, plain web/browser, this app's own dev server) there is no bridge
// to wire to at all, so it falls back to Phase 1's truthful "coming soon"
// status card rather than presenting a toggle that would silently do
// nothing. Same header/back-button pattern as StatisticsView above.
function FloatingTasbeehView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  // Computed once — the platform doesn't change during the component's
  // lifetime.
  const [available] = useState(() => isFloatingTasbeehAvailable());
  const [loading, setLoading] = useState(available);
  const [enabled, setEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    Promise.all([FloatingTasbeeh.isEnabled(), FloatingTasbeeh.isOverlayPermissionGranted()]).then(
      ([enabledResult, permissionResult]) => {
        if (cancelled) return;
        setEnabled(enabledResult.enabled);
        setPermissionGranted(permissionResult.granted);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [available]);

  async function handleToggle() {
    if (!available || loading) return;
    if (enabled) {
      await FloatingTasbeeh.setEnabled({ enabled: false });
      setEnabled(false);
      return;
    }
    let granted = permissionGranted;
    if (!granted) {
      granted = (await FloatingTasbeeh.requestOverlayPermission()).granted;
      setPermissionGranted(granted);
    }
    // The user declined the system permission dialog — stay off rather
    // than calling setEnabled(true) into a state where the overlay can't
    // actually be drawn.
    if (!granted) return;
    await FloatingTasbeeh.setEnabled({ enabled: true });
    setEnabled(true);
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
          {t.floatingTasbeehPageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      {!available ? (
        <div
          className="mt-4 flex flex-col items-center gap-3 rounded-2xl border px-5 py-8 text-center"
          style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
          >
            <Circle size={24} strokeWidth={1.8} />
          </span>
          <p className="text-[13px] font-bold" style={{ color: "var(--color-gold)" }}>
            {t.floatingTasbeehComingSoonTitle}
          </p>
          <p className="max-w-[260px] text-[12.5px] leading-[1.7]" style={{ color: "var(--color-text-muted)" }}>
            {t.floatingTasbeehComingSoonBody}
          </p>
        </div>
      ) : (
        <div
          className="mt-4 flex flex-col gap-3 rounded-2xl border p-4"
          style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {t.floatingTasbeehRow}
              </p>
              <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                {enabled ? t.floatingTasbeehEnabledStatus : t.floatingTasbeehDisabledStatus}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={loading}
              aria-pressed={enabled}
              aria-label={enabled ? t.floatingTasbeehDisableLabel : t.floatingTasbeehEnableLabel}
              className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
              style={{
                borderColor: enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
                background: enabled ? "var(--color-primary)" : "var(--color-surface)",
                color: enabled ? "var(--color-gold)" : "var(--color-text-primary)",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {enabled ? t.floatingTasbeehDisableLabel : t.floatingTasbeehEnableLabel}
            </button>
          </div>

          {!permissionGranted && !enabled && (
            <p className="text-[11.5px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
              {t.floatingTasbeehPermissionNeeded}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Reminders' Settings entry. Entirely separate from Tasbeeh/Floating
// Tasbeeh state — this only ever reads/writes notificationSettings.ts and
// calls notificationService.ts, neither of which either counting system
// touches. The enable/time preference itself is real and persists
// regardless of platform (see notificationSettings.ts); only the actual
// OS-level scheduling (notificationService.ts) is a no-op until a native
// notification plugin exists — see isNotificationsAvailable's own doc
// comment for what flips that on with no code change needed here.
function NotificationsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = settingsLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const [settings, setSettings] = useState(() => loadNotificationSettings());
  const [available] = useState(() => isNotificationsAvailable());

  function reminderContent() {
    return { title: t.notificationsReminderTitle, body: t.notificationsReminderBody };
  }

  // Called once per explicit tap on this toggle — never automatically,
  // never in a loop — so a permission the user already answered is never
  // re-prompted.
  async function handleToggle() {
    const enabling = !settings.enabled;
    if (enabling) {
      await requestNotificationPermission();
    }
    const updated = { ...settings, enabled: enabling };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (enabling && updated.times.length > 0) {
      await scheduleReminders(
        "dhikr",
        updated.times.map((time) => ({ time, content: reminderContent() })),
      );
    } else {
      await cancelReminders("dhikr");
    }
  }

  async function handleTimeChange(value: string) {
    const updated = { ...settings, times: value ? [value] : [] };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (settings.enabled) {
      if (updated.times.length > 0) {
        await scheduleReminders(
          "dhikr",
          updated.times.map((time) => ({ time, content: reminderContent() })),
        );
      } else {
        await cancelReminders("dhikr");
      }
    }
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
          {t.notificationsPageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t.notificationsRow}
            </p>
            <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {settings.enabled ? t.notificationsEnabledStatus : t.notificationsDisabledStatus}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleToggle()}
            aria-pressed={settings.enabled}
            aria-label={settings.enabled ? t.notificationsDisableLabel : t.notificationsEnableLabel}
            className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
            style={{
              borderColor: settings.enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
              background: settings.enabled ? "var(--color-primary)" : "var(--color-surface)",
              color: settings.enabled ? "var(--color-gold)" : "var(--color-text-primary)",
            }}
          >
            {settings.enabled ? t.notificationsDisableLabel : t.notificationsEnableLabel}
          </button>
        </div>

        {settings.enabled && (
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="notification-reminder-time" className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>
              {t.notificationsTimeLabel}
            </label>
            <input
              id="notification-reminder-time"
              type="time"
              value={settings.times[0] ?? ""}
              onChange={(e) => void handleTimeChange(e.target.value)}
              className="rounded-lg border px-2 py-1 text-[13px]"
              style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
            />
          </div>
        )}

        {!available && (
          <p className="text-[11.5px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
            {t.notificationsUnavailableNote}
          </p>
        )}
      </div>
    </div>
  );
}

// Settings is otherwise empty today — Statistics is its first (and only)
// section, reached as a sub-view rather than a new main navigation item,
// per spec. BottomNav's own "settings" nav item is what lands here; this
// screen keeps that item active and lets the other four keys navigate away
// exactly like every other screen already does.
export function SettingsScreen({ onNavigateHome, onNavigateToTasbeeh, onNavigateToWritten }: SettingsScreenProps) {
  const { language, dir } = useLanguage();
  const nav = navLabels[language];
  const t = settingsLabels[language];
  const [view, setView] = useState<SettingsView>("menu");
  const { selectedReciter } = useQuranReciter();
  const ForwardIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <DeviceFrame>
      <AppShell>
        <TopBar />
        {view === "statistics" ? (
          <StatisticsView onBack={() => setView("menu")} />
        ) : view === "appearance" ? (
          <AppearanceSettings onBack={() => setView("menu")} />
        ) : view === "floating-tasbeeh" ? (
          <FloatingTasbeehView onBack={() => setView("menu")} />
        ) : view === "notifications" ? (
          <NotificationsView onBack={() => setView("menu")} />
        ) : view === "location" ? (
          <LocationSettingsView onBack={() => setView("menu")} />
        ) : view === "calculation" ? (
          <CalculationSettingsView onBack={() => setView("menu")} />
        ) : view === "quran-reciter" ? (
          <QuranReciterSettingsView onBack={() => setView("menu")} />
        ) : view === "audio-adhkar" ? (
          <AudioAdhkarSettingsView onBack={() => setView("menu")} />
        ) : (
          <div className="flex flex-1 flex-col">
            <h1 className="mt-2 text-center text-[20px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
              {nav.settings}
            </h1>

            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setView("statistics")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <BarChart3 size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.statisticsRow}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {t.statisticsRowHint}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>

              <button
                type="button"
                onClick={() => setView("appearance")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <Palette size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.appearanceRow}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {t.appearanceRowHint}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>

              <button
                type="button"
                onClick={() => setView("floating-tasbeeh")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <Circle size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.floatingTasbeehRow}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {t.floatingTasbeehRowHint}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>

              <button
                type="button"
                onClick={() => setView("notifications")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <Bell size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.notificationsRow}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {t.notificationsRowHint}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>

              <button
                type="button"
                onClick={() => setView("location")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <MapPin size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.locationRow}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {t.locationRowHint}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>

              <button
                type="button"
                onClick={() => setView("calculation")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <Compass size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.calculationRow}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {t.calculationRowHint}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>

              <button
                type="button"
                onClick={() => setView("quran-reciter")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <AudioLines size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.quranReciterRow}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {selectedReciter.name[language]}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>

              <button
                type="button"
                onClick={() => setView("audio-adhkar")}
                className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}
                >
                  <Volume2 size={18} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {audioAdhkarSettingsLabels[language].row}
                  </span>
                  <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                    {audioAdhkarSettingsLabels[language].rowHint}
                  </span>
                </span>
                <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
              </button>
            </div>
          </div>
        )}

        <BottomNav
          className="mt-2"
          activeKey="settings"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "written") onNavigateToWritten();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
