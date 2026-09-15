import { useEffect, useMemo, useState } from "react";
import type { Language } from "../theme/LanguageContext";
import { getDateTimeInfo } from "./dateTime";
import type { DateTimeInfo } from "./dateTime";

// Ticks `now` once a minute — aligned to the next real minute boundary
// (not a plain setInterval(60_000), which would drift against the wall
// clock over time) — and never more often than that: the only things
// currently displayed from `now` are a "HH:MM" time and a day-granularity
// date, so a per-second re-render would be pure waste. `new Date()` (the
// device's own system clock) is the only time source here — no network/
// NTP call of any kind, ever. The local calendar day rolling over is
// handled by this same minute tick — within a minute of real local
// midnight, `now` (and everything derived from it below, incl. dateKey)
// simply reflects the new day on its own; no separate midnight watcher.
export function useDateTime(language: Language): DateTimeInfo {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId: number | undefined;
    const current = new Date();
    const msToNextMinute = 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds());

    const timeoutId = window.setTimeout(() => {
      setNow(new Date());
      intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    }, msToNextMinute);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, []);

  return useMemo(() => getDateTimeInfo(now, language), [now, language]);
}
