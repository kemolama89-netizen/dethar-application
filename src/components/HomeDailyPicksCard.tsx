import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { homeDashboardLabels } from "../data/homeDashboardLabels";
import { isPageVisible, subscribePageVisibility } from "../lib/pageVisibility";
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
  useEffect(() => {
    let cancelled = false;
    const read = () =>
      void loadTodayPick()
        .then((first) => {
          if (!cancelled && first) setPick(first);
        })
        .catch(() => {});
    read();
    // Back in the app (possibly on a new day): the day's pick again.
    const unsubscribe = subscribePageVisibility(() => isPageVisible() && read());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  return pick;
}

export function HomeDailyPicksCard({ onOpen, className = "" }: { onOpen: (pick: DailyPickTarget) => void; className?: string }) {
  const { language, dir } = useLanguage();
  const t = homeDashboardLabels[language];
  const pick = useTodayPick();
  const Arrow = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={() => {
        if (pick) onOpen(pick);
        else void loadTodayPick().then((p) => p && onOpen(p));
      }}
      className={`flex w-full items-center gap-3 border px-3 py-2 text-start ${className}`}
      style={{
        borderColor: "var(--color-gold-soft)",
        background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface) 60%, rgba(var(--color-gold-rgb), 0.12) 100%)",
        borderRadius: "var(--card-radius)",
      }}
      aria-label={`${t.dailyPicks} — ${t.dailyPicksAction}`}
      data-home-daily-picks={pick?.id ?? ""}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(var(--color-gold-rgb), 0.16)", color: "var(--color-primary)" }} aria-hidden="true">
        <Sparkles size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
          {t.dailyPicks}
        </span>
        {pick ? (
          <span dir="rtl" lang="ar" className="line-clamp-1 text-[14.5px] font-bold leading-snug" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }} data-home-daily-pick="">
            {pick.text}
          </span>
        ) : (
          <span className="line-clamp-1 text-[12px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
            {t.dailyPicksHint}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }} data-home-daily-picks-action="">
        {t.dailyPicksAction}
        <Arrow size={14} aria-hidden="true" />
      </span>
    </button>
  );
}
