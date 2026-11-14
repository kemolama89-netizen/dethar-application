import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { quranJourneyLabels } from "../data/quranJourneyLabels";
import { surahMeta } from "../lib/quranMeta";
import { JOURNEY_PAGES, emptyJourney, journeyStats, loadJourney, subscribeJourney } from "../lib/quranJourney";
import type { StatSelection } from "../lib/stats";

const HISTORY_SHOWN = 10;

// A past day's leaf (Basa'ir's own, components/basair/TafsirReadingView.tsx): loaded only when one is opened.
const JourneyHistoryView = lazy(() => import("./basair/TafsirReadingView").then((m) => ({ default: m.JourneyHistoryView })));

/** "YYYY-MM-DD" as day/month/year, in the Statistics screen's Latin digits. */
const shortDate = (d: string) => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}/${d.slice(0, 4)}`;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate text-[12.5px]" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </span>
      <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: "var(--color-gold)" }}>
        {value}
      </span>
    </li>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <p className="mt-4 mb-2 border-t pt-3 text-[12.5px] font-bold" style={{ color: "var(--color-text-primary)", borderColor: "var(--color-gold-soft)" }}>
      {children}
    </p>
  );
}

/**
 * The Qur'an Journey in Statistics (lib/quranJourney.ts): the same card as the Adhkar and
 * Tasbeeh ones beside it, read from the journey's own record, which their reset leaves alone.
 * Its headline is the round in progress; the insights read follow the selected period.
 */
export function QuranJourneyStatCard({ selection, expanded, onToggle }: { selection: StatSelection; expanded: boolean; onToggle: () => void }) {
  const { language, dir } = useLanguage();
  const t = quranJourneyLabels[language];
  const RowCue = dir === "rtl" ? ChevronLeft : ChevronRight;
  // The history entry open in its leaf (an index into stats.history, newest first), or null.
  const [opened, setOpened] = useState<number | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => subscribeJourney(() => setVersion((v) => v + 1)), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => journeyStats(loadJourney() ?? emptyJourney(), selection), [selection, version]);
  const [showAll, setShowAll] = useState(false);
  const round = stats.round;
  const explored = round?.explored ?? 0;
  const surahName = (s: number) => (language === "en" ? (surahMeta(s)?.nameTranslit ?? "") : (surahMeta(s)?.nameAr ?? ""));
  const history = showAll ? stats.history : stats.history.slice(0, HISTORY_SHOWN);

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }} data-journey-stats="">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start">
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
            {round ? t.titleRound(round.n) : t.title}
          </p>
          <p className="mt-0.5 text-[18px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-gold)" }} data-journey-headline="">
            {t.headline(explored, JOURNEY_PAGES)}
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
          {!round ? (
            <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }} data-journey-empty="">
              {t.notStarted}
            </p>
          ) : (
            <>
              {/* The round's share of the 604 pages: a thin line, then its percentage. */}
              <div className="flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{ background: "var(--color-gold-soft)" }}
                  role="progressbar"
                  aria-label={t.completion}
                  aria-valuemin={0}
                  aria-valuemax={JOURNEY_PAGES}
                  aria-valuenow={explored}
                >
                  <div className="h-full rounded-full" style={{ width: `${(explored / JOURNEY_PAGES) * 100}%`, background: "var(--color-gold)" }} />
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold" style={{ color: "var(--color-gold)" }} data-journey-percent="">
                  {t.percent(round.percent.toLocaleString("en-US", { maximumFractionDigits: 1 }))}
                </span>
              </div>
              {round.completedOn && (
                <p className="mt-2 text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }} data-journey-complete="">
                  {t.roundComplete}
                </p>
              )}
              <ul className="mt-3 flex flex-col gap-2">
                <Row label={t.viewedInPeriod} value={stats.viewedInSelection.toLocaleString("en-US")} />
                <Row label={t.viewedTotal} value={stats.totalViews.toLocaleString("en-US")} />
                <Row label={t.roundStarted} value={shortDate(round.startedOn)} />
              </ul>

              <Heading>{t.rounds}</Heading>
              <ul className="flex flex-col gap-2" data-journey-rounds="">
                {[...stats.rounds].reverse().map((r) => (
                  <Row
                    key={r.n}
                    label={`${t.roundRow(r.n)} · ${shortDate(r.startedOn)}${r.completedOn ? ` – ${shortDate(r.completedOn)}` : ""}`}
                    value={r.completedOn ? t.roundDone : t.roundPages(r.explored, JOURNEY_PAGES)}
                  />
                ))}
              </ul>

              <Heading>{t.years}</Heading>
              <ul className="flex flex-col gap-2" data-journey-years="">
                {stats.years.map((y) => (
                  <Row key={y.year} label={String(y.year)} value={t.pagesCount(y.explored)} />
                ))}
              </ul>

              <Heading>{t.history}</Heading>
              <ul className="flex flex-col" data-journey-history="">
                {history.map((h, i) => {
                  const [s, a] = h.insight.split(":").map(Number);
                  return (
                    <li key={`${h.round}:${h.page}`}>
                      <button
                        type="button"
                        onClick={() => setOpened(i)}
                        aria-label={t.historyOpen(h.page, shortDate(h.localDate))}
                        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-start text-[12.5px]"
                        data-journey-history-row={`${h.round}:${h.page}`}
                      >
                        <span className="min-w-0 truncate" style={{ color: "var(--color-text-primary)" }}>
                          <span className="font-semibold" style={{ color: "var(--color-gold)" }}>
                            {t.historyPage(h.page)}
                          </span>
                          {` · ${surahName(s)} ${a}`}
                        </span>
                        <span className="flex shrink-0 items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                          {shortDate(h.localDate)}
                          <RowCue size={15} strokeWidth={2} aria-hidden="true" style={{ color: "var(--color-gold)" }} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {stats.history.length > HISTORY_SHOWN && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-2 min-h-11 text-[12px] font-semibold" style={{ color: "var(--color-gold)" }} data-journey-show-all="">
                  {showAll ? t.showLess : t.showAll(stats.history.length)}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {opened !== null && stats.history[opened] && (
        <Suspense fallback={<div className="fixed inset-0 z-[86]" style={{ background: "var(--color-bg)" }} aria-hidden="true" data-journey-loading="" />}>
          <JourneyHistoryView entries={stats.history} index={opened} onClose={() => setOpened(null)} />
        </Suspense>
      )}
    </div>
  );
}
