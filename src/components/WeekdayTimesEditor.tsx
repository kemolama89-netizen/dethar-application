import { useLanguage } from "../theme/LanguageContext";
import { weeklyScheduleLabels } from "../data/scheduleLabels";
import { WEEKDAYS } from "../lib/weeklySchedule";

const INPUT_CLASS = "rounded-lg border px-2 py-1 text-[13px]";
const INPUT_STYLE = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };

export interface WeekdayTimesColumn {
  /** Shown before each input (e.g. "From" / "To"); none for a single column. */
  label?: string;
  /** "HH:mm" per weekday, Sunday first ("" = the usual time that day). */
  values: string[];
}

/**
 * Optional times on chosen weekdays — one or two per day (Misc: start and
 * end; the Adhan: one) — in a collapsible list, open while any day is set.
 * An empty day keeps the usual time; "Clear" empties every time of that day.
 */
export function WeekdayTimesEditor({
  id,
  summary,
  hint,
  usual,
  clear,
  columns,
  onChange,
}: {
  id: string;
  summary: string;
  hint: string;
  usual: string;
  clear: string;
  columns: WeekdayTimesColumn[];
  /** The new values of every column, after a change on one day. */
  onChange: (columns: string[][]) => void;
}) {
  const { language } = useLanguage();
  const days = weeklyScheduleLabels[language].weekdays;
  const set = (day: number, column: number | "all", value: string) =>
    onChange(columns.map((c, ci) => c.values.map((v, d) => (d === day && (column === "all" || column === ci) ? value : v))));
  return (
    <details className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-gold-soft)" }} data-weekday-times={id} open={columns.some((c) => c.values.some(Boolean))}>
      <summary className="cursor-pointer text-[13px] font-medium" style={primaryText}>
        {summary}
      </summary>
      <p className="mt-2 text-[11.5px] leading-[1.6]" style={muted}>
        {hint}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {WEEKDAYS.map((day) => {
          const set_ = columns.some((c) => c.values[day]);
          return (
            <div key={day} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1" data-weekday-row={day}>
              <span className="text-[12.5px]" style={primaryText}>
                {days[day]}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {!set_ && (
                  <span className="text-[11px]" style={muted}>
                    {usual}
                  </span>
                )}
                {columns.map((c, ci) => (
                  <label key={ci} className="flex items-center gap-1 text-[11.5px]" style={muted}>
                    {c.label}
                    <input
                      id={`${id}-day-${day}-${ci}`}
                      type="time"
                      aria-label={`${days[day]}${c.label ? ` — ${c.label}` : ""}`}
                      value={c.values[day]}
                      onChange={(e) => set(day, ci, e.target.value)}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </label>
                ))}
                {set_ && (
                  <button type="button" onClick={() => set(day, "all", "")} className="text-[11px] underline" style={muted}>
                    {clear}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
