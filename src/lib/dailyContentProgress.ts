// DITHAR — installation-based daily content progress (Lataif/Wamdat &
// Hadith rotation).
//
// Design: "Day 1" is the local calendar day of THIS INSTALL's first-ever
// launch — not the absolute calendar date — so every new user starts at
// item #1 regardless of what today's date happens to be, and each
// following local calendar day advances exactly one item. This sits
// entirely ON TOP OF the existing date/time foundation (dateTime.ts):
// dateKeyToDayNumber already does the real, DST-safe local-day arithmetic;
// this module only persists WHICH local day that was for this install
// (the "anchor") and subtracts. dateTime.ts itself is untouched.
//
// Persisted via localStorage, same convention as
// src/lib/locationSettings.ts — one string, the local dateKey
// ("YYYY-MM-DD") of first launch, written once and never overwritten
// afterward. No network/simulated clock of any kind is involved; the
// anchor is always the real device dateKey the FIRST time this function
// ever ran for this install.
import { dateKeyToDayNumber } from "./dateTime";

const STORAGE_KEY = "dithar:daily-content:install-anchor:v1";

// Pure read — never writes. Returns `null` when no anchor has been
// persisted yet for this install (i.e. this will be its first-ever
// launch) or storage is unavailable.
export function loadInstallationAnchorDateKey(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

// Writes the first-launch anchor. Callers must only call this once, from
// an effect (never during render — see App.tsx's HomeScreen, which
// mirrors the read-in-useState/write-in-useEffect split useCoordinates.ts
// already uses for saveLastActiveLocation), and only when
// loadInstallationAnchorDateKey() has just confirmed no anchor exists yet.
export function saveInstallationAnchorDateKey(dateKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, dateKey);
  } catch {
    // Best-effort only, matching locationSettings.ts's save(). If storage
    // is unavailable, every launch simply re-derives day 1 from whatever
    // `dateKey` it's given (see computeInstallationDayNumber), which
    // degrades to "always item #1" rather than throwing.
  }
}

// Pure arithmetic, no I/O: the 1-based installation day number for
// `currentDateKey` given a persisted `anchorDateKey` — 1 on the anchor's
// own local day, 2 on the next local day, and so on. Uses
// dateKeyToDayNumber (already local-midnight-correct — see dateTime.ts)
// on both sides, so this is exact local calendar-day arithmetic, never a
// raw millisecond/epoch subtraction.
//
// Clamped to a minimum of 1 as a defensive floor only — this only differs
// from the exact difference if the device clock itself moves backward
// after the anchor was recorded (a real device misconfiguration, not a
// normal code path), and it must never go to 0/negative in that case.
export function computeInstallationDayNumber(anchorDateKey: string, currentDateKey: string): number {
  const diff = dateKeyToDayNumber(currentDateKey) - dateKeyToDayNumber(anchorDateKey) + 1;
  return Math.max(1, diff);
}

// Turns a 1-based installation day number into a safe 0-based index into
// a content library of the given length — plain modulo wrap (day 1 ->
// index 0, day `libraryLength + 1` -> index 0 again), so the rotation
// cycles seamlessly forever without ever inventing content past the
// library's real size. `libraryLength` is assumed > 0 (both WAMDAT and
// HADITHS are static, non-empty, build-time-imported datasets).
export function installationDayToIndex(installationDayNumber: number, libraryLength: number): number {
  return (installationDayNumber - 1) % libraryLength;
}

// TEST/DEV-ONLY: clears the persisted first-launch anchor so the next
// read finds none and a future call re-adopts a fresh Day 1 — same
// purpose/lifecycle as locationSettings.ts's resetLocationSettingsForTesting.
export function resetInstallationAnchorForTesting(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort only.
  }
}

// DEV-ONLY console convenience wrapper, same import.meta.env.DEV gating
// (and complete production dead-code elimination) already established by
// locationSettings.ts's __ditharResetLocationForTesting. No user-facing
// UI of any kind; call it from the browser DevTools console while running
// the dev server (`__ditharResetDailyContentForTesting()`), then reload
// the page to see the app behave like a genuine first launch.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __ditharResetDailyContentForTesting?: () => void }).__ditharResetDailyContentForTesting = () => {
    resetInstallationAnchorForTesting();
    console.log("[dithar:dev] Daily content install-anchor cleared. Reload the page to simulate a first launch.");
  };
}
