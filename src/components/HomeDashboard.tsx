import { useLanguage } from "../theme/LanguageContext";
import { useTodayActivity } from "../lib/useTodayActivity";
import { homeDashboardLabels } from "../data/homeDashboardLabels";

// Home's strip of today's counts: written-adhkar and Tasbeeh repetitions,
// prayer adhkar and, apart from those, audio LISTENING (recordings heard to
// the end), never counted as the user's own repetitions. Every count reads 0
// until something actually happens. The Morning and Evening sessions
// themselves are the lamps in the prayer panel (HomeWirdLamps.tsx), completed
// either by reading the whole list in Written Adhkar or by listening to its
// whole Audio Adhkar session (lib/stats.ts getDailyActivity — wirds / wirdsHow).

function Stat({ label, value, testId, note }: { label: string; value: number; testId: string; note?: string }) {
  return (
    <div className={`dithar-stat${value === 0 ? " is-zero" : ""}`} data-home-stat={testId} aria-label={note ? `${label}: ${value}. ${note}` : undefined} role={note ? "group" : undefined}>
      <span className="dithar-stat__value">{value}</span>
      <span className="dithar-stat__label">{label}</span>
    </div>
  );
}

export function DailyProgressCard({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const t = homeDashboardLabels[language];
  const { activity, audio } = useTodayActivity();
  return (
    <section className={`dithar-glass dithar-counts ${className}`} data-home-progress="" aria-label={t.today}>
      <p className="dithar-counts__heading">{t.today}</p>
      <div className="dithar-counts__row">
        <Stat label={t.written} value={activity.writtenRepetitions} testId="written" />
        <Stat label={t.tasbeeh} value={activity.tasbeehRepetitions} testId="tasbeeh" />
        <Stat label={t.prayer} value={activity.prayerSessions} testId="prayer" />
        <Stat label={t.listening} value={audio.completedPlays} testId="listening" note={t.listeningNote} />
      </div>
    </section>
  );
}
