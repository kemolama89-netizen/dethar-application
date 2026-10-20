// The user's Hijri-date adjustment (−2 … +2 days) relative to the Umm
// al-Qura calendar the app computes with (Intl's `islamic-umalqura`).
// Islamic months start by local moon sighting or by an official calendar,
// so a country's date can differ from Umm al-Qura by a day (rarely two).
// One value, read by both the Home date strip and the Islamic-occasion
// engine (islamicOccasions.ts), so what the user sees and what the app acts
// on always agree. Default 0 — Umm al-Qura exactly, as before.
const KEY = "dithar:hijri-adjustment:v1";
export const HIJRI_ADJUSTMENT_MIN = -2;
export const HIJRI_ADJUSTMENT_MAX = 2;

export function loadHijriAdjustment(): number {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isInteger(value) && value >= HIJRI_ADJUSTMENT_MIN && value <= HIJRI_ADJUSTMENT_MAX ? value : 0;
  } catch {
    return 0;
  }
}

export function saveHijriAdjustment(days: number): void {
  const value = Math.max(HIJRI_ADJUSTMENT_MIN, Math.min(HIJRI_ADJUSTMENT_MAX, Math.trunc(days)));
  try {
    localStorage.setItem(KEY, String(value));
  } catch {
    // Best effort.
  }
}

/** `date` moved by the adjustment, for Hijri conversion only (a +1 adjustment reads tomorrow's Umm al-Qura date). */
export function adjustForHijri(date: Date, days: number = loadHijriAdjustment()): Date {
  if (days === 0) return date;
  const shifted = new Date(date.getTime());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}
