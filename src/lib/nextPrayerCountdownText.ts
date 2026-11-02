// The Home prayer panel's countdown line, in the words people say it:
// «بعد 8 ساعات و49 دقيقة» / "in 8 hours and 49 minutes". Seconds appear only
// in the last minute, so a wait of hours doesn't tick on a quiet screen.
// Text only: the remaining time itself comes from useNextPrayerCountdown.
import type { Language } from "../theme/LanguageContext";

export interface Remaining {
  hours: number;
  minutes: number;
  seconds: number;
}

/** Arabic counted nouns: one, two (accusative after «بعد»), 3–10 (plural), 11 and above (singular). */
function arabicCount(n: number, one: string, two: string, few: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${one}`;
}

function englishCount(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export function nextPrayerCountdownText({ hours, minutes, seconds }: Remaining, language: Language): string {
  if (language === "ar") {
    const parts: string[] = [];
    if (hours > 0) parts.push(arabicCount(hours, "ساعة", "ساعتين", "ساعات"));
    if (minutes > 0) parts.push(arabicCount(minutes, "دقيقة", "دقيقتين", "دقائق"));
    if (parts.length === 0) return seconds > 0 ? `بعد ${arabicCount(seconds, "ثانية", "ثانيتين", "ثوانٍ")}` : "الآن";
    return `بعد ${parts.join(" و")}`;
  }
  const parts: string[] = [];
  if (hours > 0) parts.push(englishCount(hours, "hour"));
  if (minutes > 0) parts.push(englishCount(minutes, "minute"));
  if (parts.length === 0) return seconds > 0 ? `in ${englishCount(seconds, "second")}` : "now";
  return `in ${parts.join(" and ")}`;
}
