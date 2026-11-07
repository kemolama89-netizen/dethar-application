import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { WEEKDAYS, loadHolidayStart, saveHolidayStart } from "../lib/weeklySchedule";
import type { HolidayStart, Weekday } from "../lib/weeklySchedule";
import { weeklyScheduleLabels } from "../data/scheduleLabels";
import { FirstVisitHint } from "./FirstVisitHint";
import { featureGuideLabels } from "../data/featureGuideLabels";

// Settings → الجدول الأسبوعي: the weekly holiday start — days off and one
// start time for them. Saving notifies lib/weeklySchedule.ts's subscribers,
// which re-sync the native audio adhkar, prayer and reminder schedules at
// once (see audioAdhkarSchedules.ts / prayerNotifications.ts /
// remindersSync.ts). Styled like the other Settings sub-views.

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const INPUT_CLASS = "rounded-lg border px-2 py-1 text-[13px]";
const INPUT_STYLE = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };
const SMALL_BUTTON = "rounded-full border px-3 py-1 text-[12px] font-medium";

export function WeeklyScheduleView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = weeklyScheduleLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [holiday, setHoliday] = useState<HolidayStart>(() => loadHolidayStart());

  function updateHoliday(next: HolidayStart) {
    setHoliday(next);
    saveHolidayStart(next);
  }

  function toggleHolidayDay(day: Weekday) {
    updateHoliday({ ...holiday, days: holiday.days.includes(day) ? holiday.days.filter((d) => d !== day) : [...holiday.days, day] });
  }

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

      <FirstVisitHint id="settings-weekly" text={featureGuideLabels[language].hints.weekly} />
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={CARD} data-holiday-start="">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={primaryText}>
              {t.holidayTitle}
            </p>
            <p className="mt-0.5 text-[11.5px]" style={muted}>
              {holiday.enabled ? t.enabled : t.disabled}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={holiday.enabled}
            data-holiday-switch=""
            onClick={() => updateHoliday({ ...holiday, enabled: !holiday.enabled })}
            className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
            style={{
              borderColor: holiday.enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
              background: holiday.enabled ? "var(--color-primary)" : "var(--color-surface)",
              color: holiday.enabled ? "var(--color-gold)" : "var(--color-text-primary)",
            }}
          >
            {holiday.enabled ? t.disable : t.enable}
          </button>
        </div>
        <p className="text-[11.5px] leading-[1.7]" style={muted}>
          {t.holidayIntro}
        </p>
        <div style={{ opacity: holiday.enabled ? 1 : 0.6 }} className="flex flex-col gap-3">
          <div>
            <p className="text-[12.5px]" style={primaryText}>
              {t.holidayDays}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const on = holiday.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    data-holiday-day={day}
                    onClick={() => toggleHolidayDay(day)}
                    className={SMALL_BUTTON}
                    style={{
                      borderColor: on ? "var(--color-gold)" : "var(--color-gold-soft)",
                      background: on ? "var(--color-primary)" : "var(--color-surface)",
                      color: on ? "var(--color-gold)" : "var(--color-text-primary)",
                    }}
                  >
                    {t.weekdays[day]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="holiday-start-time" className="text-[12.5px]" style={primaryText}>
              {t.holidayTime}
            </label>
            <input
              id="holiday-start-time"
              type="time"
              value={holiday.time}
              onChange={(e) => e.target.value && updateHoliday({ ...holiday, time: e.target.value })}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
