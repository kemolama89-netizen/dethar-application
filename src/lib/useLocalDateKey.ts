// The device's local calendar day ("YYYY-MM-DD", lib/dailyPicks.ts
// localDateKey) as React state, for content that changes once a day.
//
// It is read again whenever the app comes back to the front (the process
// often lives for days — the media service, Floating Tasbeeh — so a screen
// mounted yesterday is still mounted this morning), and, with `atMidnight`,
// also at local midnight while the page is visible. It changes only when
// the day does: a re-render per day, not per minute (unlike useDateTime).
import { useEffect, useState } from "react";
import { localDateKey } from "./dailyPicks";
import { isPageVisible, subscribePageVisibility } from "./pageVisibility";

/** Milliseconds until the next local midnight (DST-safe: built from the calendar, not +24 h). */
export function msUntilNextLocalDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function useLocalDateKey({ atMidnight = false }: { atMidnight?: boolean } = {}): string {
  const [key, setKey] = useState(() => localDateKey(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => setKey(localDateKey(new Date()));
    const arm = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      if (!atMidnight || !isPageVisible()) return;
      // A second past midnight, so the new date is certain even with a slightly early timer.
      timer = setTimeout(() => {
        refresh();
        arm();
      }, msUntilNextLocalDay(new Date()) + 1000);
    };
    arm();
    const unsubscribe = subscribePageVisibility(() => {
      if (isPageVisible()) refresh();
      arm();
    });
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      unsubscribe();
    };
  }, [atMidnight]);
  return key;
}
