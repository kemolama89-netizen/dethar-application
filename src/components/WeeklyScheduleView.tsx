import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { WEEKDAYS, loadWeeklySchedule, saveWeeklySchedule } from "../lib/weeklySchedule";
import type { WeeklySchedule } from "../lib/weeklySchedule";
import { weeklyScheduleLabels } from "../data/scheduleLabels";

// Settings → الجدول الأسبوعي: one start time per weekday (Sunday first).
// Saving notifies lib/weeklySchedule.ts's subscribers, which re-sync the
// native Misc dhikr and reminder schedules at once (see
// audioAdhkarSchedules.ts / remindersSync.ts). Styled like the other
// Settings sub-views.

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const INPUT_CLASS = "rounded-lg border px-2 py-1 text-[13px]";
const INPUT_STYLE = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };
const SMALL_BUTTON = "rounded-full border px-3 py-1 text-[12px] font-medium";

const WORKDAYS = [0, 1, 2, 3, 4];
const WEEKEND = [5, 6];

export function WeeklyScheduleView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = weeklyScheduleLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => loadWeeklySchedule());

  function update(next: WeeklySchedule) {
    setSchedule(next);
    saveWeeklySchedule(next);
  }

  function setDay(day: number, value: string) {
    update({ ...schedule, days: schedule.days.map((d, i) => (i === day ? value : d)) });
  }

  function applyTo(days: number[], value: string) {
    update({ ...schedule, days: schedule.days.map((d, i) => (days.includes(i) ? value : d)) });
  }

  // The first day with a time — the source for the quick "apply" buttons.
  const firstSet = WEEKDAYS.find((d) => schedule.days[d]);

  return (
    <div className="flex flex-1 flex-col" data-weekly-schedule="">
      <div className="dithar-sticky-header mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", ...primaryText }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={primaryText}>
          {t.pageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={CARD}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={primaryText}>
              {t.pageTitle}
            </p>
            <p className="mt-0.5 text-[11.5px]" style={muted}>
              {schedule.enabled ? t.enabled : t.disabled}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={schedule.enabled}
            data-weekly-switch=""
            onClick={() => update({ ...schedule, enabled: !schedule.enabled })}
            className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
            style={{
              borderColor: schedule.enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
              background: schedule.enabled ? "var(--color-primary)" : "var(--color-surface)",
              color: schedule.enabled ? "var(--color-gold)" : "var(--color-text-primary)",
            }}
          >
            {schedule.enabled ? t.disable : t.enable}
          </button>
        </div>
        <p className="text-[11.5px] leading-[1.7]" style={muted}>
          {t.intro}
        </p>
        <p className="text-[11.5px] leading-[1.6]" style={muted}>
          {t.floorNote}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-2xl border p-4" style={{ ...CARD, opacity: schedule.enabled ? 1 : 0.6 }}>
        {WEEKDAYS.map((day) => {
          const id = `weekly-day-${day}`;
          return (
            <div key={day} className="flex items-center justify-between gap-3" data-weekday={day}>
              <label htmlFor={id} className="text-[13px]" style={primaryText}>
                {t.weekdays[day]}
              </label>
              <div className="flex items-center gap-2">
                {!schedule.days[day] && (
                  <span className="text-[11px]" style={muted}>
                    {t.noRestriction}
                  </span>
                )}
                <input id={id} type="time" value={schedule.days[day]} onChange={(e) => setDay(day, e.target.value)} className={INPUT_CLASS} style={INPUT_STYLE} />
                {schedule.days[day] && (
                  <button type="button" onClick={() => setDay(day, "")} className="text-[11.5px] underline" style={muted}>
                    {t.clear}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {firstSet !== undefined && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={SMALL_BUTTON} style={{ borderColor: "var(--color-gold)", ...primaryText }} onClick={() => applyTo([...WEEKDAYS], schedule.days[firstSet])}>
              {t.copyToAll(t.weekdays[firstSet])}
            </button>
            <button type="button" className={SMALL_BUTTON} style={{ borderColor: "var(--color-gold-soft)", ...primaryText }} onClick={() => applyTo(WORKDAYS, schedule.days[firstSet])}>
              {t.applyToWorkdays}
            </button>
            <button type="button" className={SMALL_BUTTON} style={{ borderColor: "var(--color-gold-soft)", ...primaryText }} onClick={() => applyTo(WEEKEND, schedule.days[firstSet])}>
              {t.applyToWeekend}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
