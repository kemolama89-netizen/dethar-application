import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { homeDashboardLabels } from "../data/homeDashboardLabels";
import { useLocalDateKey } from "../lib/useLocalDateKey";
import type { MiscCategoryKey } from "../data/misc-library";

// Home's «مختارات اليوم» card: today's first Daily Pick (lib/dailyPicks.ts —
// a verified written-library dua, the same one the Misc library shows) as a
// preview. Tapping it opens THAT dua the way a tapped DITHAR notification
// opens its item (`onOpen` gets its id and the shown text and source; App.tsx
// sends them down the notification path) — never a settings screen; the
// widget's setup stays in Settings. The library is loaded lazily, after
// Home's first paint, so it never weighs on startup; a tap before it
// arrives loads today's pick first, so the same dua opens either way.

/** The dua the card shows — what a tap opens. */
export interface DailyPickTarget {
  id: string;
  category: MiscCategoryKey;
  /** The text and source as the card shows them. */
  text: string;
  source: string;
}

type Pick = DailyPickTarget;

async function loadTodayPick(): Promise<Pick | null> {
  const { getDailyPicks } = await import("../lib/dailyPicks");
  const first = getDailyPicks()[0];
  return first ? { id: first.id, category: first.categories[0], text: first.text_ar, source: first.source_ar ?? "" } : null;
}

function useTodayPick(): Pick | null {
  const [pick, setPick] = useState<Pick | null>(null);
  // A new local day — at midnight with Home open, or back in the app the next morning — reads the day's pick again.
  const day = useLocalDateKey({ atMidnight: true });
  useEffect(() => {
    let cancelled = false;
    void loadTodayPick()
      .then((first) => {
        if (!cancelled && first) setPick(first);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [day]);
  return pick;
}

export function HomeDailyPicksCard({ onOpen, className = "" }: { onOpen: (pick: DailyPickTarget) => void; className?: string }) {
  const { language, dir } = useLanguage();
  const t = homeDashboardLabels[language];
  const pick = useTodayPick();
  const Arrow = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    // The dua's own text stays hidden until it is opened: a full dua can run many lines, and Home never shows part of one.
    <button
      type="button"
      onClick={() => {
        if (pick) onOpen(pick);
        else void loadTodayPick().then((p) => p && onOpen(p));
      }}
      className={`dithar-glass dithar-daily-pick ${className}`}
      aria-label={`${t.dailyPicks} — ${t.dailyPicksAction}`}
      data-home-daily-picks={pick?.id ?? ""}
    >
      <span className="dithar-daily-pick__text">
        <span className="dithar-daily-pick__title">{t.dailyPicks}</span>
        <span className="dithar-daily-pick__hint">{t.dailyPicksHint}</span>
      </span>
      <span className="dithar-daily-pick__action">
        {t.dailyPicksAction}
        <Arrow size={15} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </button>
  );
}
