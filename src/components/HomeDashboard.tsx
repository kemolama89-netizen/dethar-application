import { useEffect, useState } from "react";
import { Check, Headphones } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { getDailyActivity, getDailyAudioActivity, subscribeStatsChanges, todayLocalDate } from "../lib/stats";
import type { DailyActivity, DailyAudioActivity } from "../lib/stats";
import { isPageVisible, subscribePageVisibility } from "../lib/pageVisibility";
import { homeDashboardLabels } from "../data/homeDashboardLabels";

// The Home Screen dashboard that replaced the Quranic Insight and Hadith
// cards (their content lives on in the widget, reminders and the
// full-screen reflection — lib/reminderContent.ts):
//
//  - Completed Adhkar sessions today (the ring: 0, 1 or 2 of the Morning
//    and Evening sessions), each completed either by reading the whole list
//    in Written Adhkar or by listening to its whole Audio Adhkar session
//    (lib/stats.ts getDailyActivity — wirds / wirdsHow);
//  - today's written-adhkar and Tasbeeh repetitions and prayer adhkar, and,
//    apart from those, audio LISTENING (recordings heard to the end), never
//    counted as the user's own repetitions.
//
// The shortcuts row that used to follow was removed: every one of its
// destinations is already in the bottom navigation.
//
// Encouraging, never competitive: an empty day reads as an invitation.

/** Today's recorded activity, kept current as anything is recorded (and across midnight on the next change). */
function useTodayActivity(): { activity: DailyActivity; audio: DailyAudioActivity } {
  const read = () => {
    const today = todayLocalDate();
    return { activity: getDailyActivity(today), audio: getDailyAudioActivity(today) };
  };
  const [state, setState] = useState(read);
  useEffect(() => subscribeStatsChanges(() => setState(read())), []);
  // Back in the app (possibly on a new day): read again.
  useEffect(() => subscribePageVisibility(() => isPageVisible() && setState(read())), []);
  return state;
}

function WirdRing({ done, label }: { done: number; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" role="img" aria-label={label} className="h-14 w-14 shrink-0 [@media(min-height:880px)]:h-16 [@media(min-height:880px)]:w-16" data-home-sessions-ring={done}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-gold-soft)" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(done / 2) * c} ${c}`}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="33" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--color-text-primary)" style={{ direction: "ltr" }}>
        {done}/2
      </text>
    </svg>
  );
}

function Stat({ label, value, testId }: { label: string; value: string | number; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-xl px-1 py-1" style={{ background: "var(--color-bg)" }} data-home-stat={testId}>
      <span className="text-[14px] font-bold tabular-nums" style={{ color: "var(--color-text-primary)", direction: "ltr" }}>
        {value}
      </span>
      <span className="line-clamp-2 w-full text-center text-[9.5px] leading-tight [word-break:keep-all]" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

export function DailyProgressCard({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const t = homeDashboardLabels[language];
  const { activity, audio } = useTodayActivity();
  const wirds = activity.wirds.length;
  // Listening in part (a recording stopped early) is a record of today too.
  const nothingYet = activity.total === 0 && wirds === 0 && activity.prayerSessions === 0 && audio.completedPlays === 0 && audio.stoppedEarlyPlays === 0 && audio.listenedMs === 0;
  return (
    <section
      className={`rounded-2xl border px-3 py-2 [@media(min-height:880px)]:py-2.5 ${className}`}
      style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", borderRadius: "var(--card-radius)" }}
      data-home-progress=""
      aria-label={t.today}
    >
      <p className="text-[12px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
        {t.today}
      </p>
      <div className="mt-1 flex items-center gap-3" data-home-sessions="">
        <WirdRing done={wirds} label={`${t.sessionsTitle}: ${t.sessionsCount(wirds)}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-snug [@media(min-height:800px)]:text-[14px]" style={{ color: "var(--color-text-primary)" }}>
            {t.sessionsTitle} <bdi className="whitespace-nowrap tabular-nums" style={{ color: "var(--color-primary)" }} data-home-wirds={wirds}>{t.sessionsCount(wirds)}</bdi>
          </p>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {(["morning", "evening"] as const).map((w) => {
              const isDone = activity.wirds.includes(w);
              const how = activity.wirdsHow[w].map((h) => t.how[h]).join(" + ");
              return (
                <span key={w} className="flex items-center gap-0.5" data-home-wird={w} data-done={isDone ? "" : undefined} data-how={activity.wirdsHow[w].join(" ")} style={{ color: isDone ? "var(--color-primary)" : undefined, fontWeight: isDone ? 700 : 400 }}>
                  {isDone ? <Check size={11} strokeWidth={2.5} /> : <span aria-hidden="true">○</span>}
                  {w === "morning" ? t.morning : t.evening}
                  {isDone && how && <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>({how})</span>}
                </span>
              );
            })}
          </div>
          <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
            {t.sessionsHint}
          </p>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        <Stat label={t.written} value={activity.writtenRepetitions} testId="written" />
        <Stat label={t.tasbeeh} value={activity.tasbeehRepetitions} testId="tasbeeh" />
        <Stat label={t.prayer} value={activity.prayerSessions} testId="prayer" />
        <Stat label={t.listening} value={audio.completedPlays === 0 ? "—" : audio.completedPlays} testId="listening" />
      </div>
      <p className="mt-1 flex items-center justify-center gap-1 text-center text-[10px] [@media(max-height:879px)]:hidden" style={{ color: "var(--color-text-muted)" }}>
        {nothingYet ? (
          t.emptyNudge
        ) : (
          <>
            <Headphones size={10} aria-hidden="true" /> {t.listeningNote}
          </>
        )}
      </p>
    </section>
  );
}
