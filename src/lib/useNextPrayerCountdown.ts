import { useEffect, useState } from "react";
import type { PrayerTimesResult } from "./prayerTimes";
import { getNextPrayer, getRemainingTime } from "./nextPrayer";
import type { NextPrayer, RemainingTime } from "./nextPrayer";
import { isPageVisible, subscribePageVisibility, usePageVisible } from "./pageVisibility";

export interface NextPrayerCountdown extends NextPrayer {
  remaining: RemainingTime;
}

// A deliberately SEPARATE, finer-grained clock from src/lib/useDateTime.ts
// — that hook only ticks once a minute, which its own header comment
// explains is correct for ITS job (an HH:MM clock display and a
// day-granularity date key) but is too coarse here: a live countdown must
// flip to the next prayer at the exact instant the current one arrives,
// not up to 59 seconds late, and the last minute of a countdown should
// count down smoothly rather than sitting on stale a stale value. So this
// ticks every second. This is NOT a second, competing "current local
// time" source for the rest of the app — it exists solely to drive this
// one countdown's display/transition; the app's date, timezone, and
// prayer-time CALCULATION all still come from the single Date & Time
// foundation and useCoordinates, exactly as before. One `setInterval`,
// cleared on unmount — no leaks, no duplicate timers across re-renders
// (the effect's own cleanup always runs before any re-subscribe).
//
// While the app is in the background (pageVisibility.ts) it doesn't tick
// at all — nothing is shown — and it catches up at once when shown again.
export function useNextPrayerCountdown(todayTimes: PrayerTimesResult, tomorrowFajr: Date): NextPrayerCountdown {
  const [now, setNow] = useState(() => new Date());
  const visible = usePageVisible();

  // Shown again: catch up at once.
  useEffect(() => subscribePageVisibility(() => isPageVisible() && setNow(new Date())), []);

  useEffect(() => {
    if (!visible) return;
    const intervalId = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, [visible]);

  const next = getNextPrayer(todayTimes, tomorrowFajr, now);
  return { ...next, remaining: getRemainingTime(next.time, now) };
}
