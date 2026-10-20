// The backgrounds of the full-screen spiritual reminder and the home-screen
// widget (public/backgrounds/, painted procedurally — CC0, see its README).
//
// Automatic mode follows the local time of day — dawn, daytime, sunset,
// night — and the season, but the season only where it is reliable: a
// location the user set or the device reported (not the Kuwait fallback),
// outside the tropics, with the hemisphere taken into account. Otherwise
// the time of day alone decides (with the spring palette). The same rule is
// mirrored natively for the widget (WidgetBackgrounds.autoId in
// ReminderLogic.kt) — keep them in step.
export type DayPeriod = "dawn" | "day" | "sunset" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";

export const DAY_PERIODS: readonly DayPeriod[] = ["dawn", "day", "sunset", "night"];
export const SEASONS: readonly Season[] = ["spring", "summer", "autumn", "winter"];
export const ISLAMIC_BACKGROUNDS = ["mosque-night", "arches-dusk", "pattern-navy", "pattern-sage"] as const;

export interface BackgroundOption {
  id: string;
  kind: "nature" | "islamic";
}

export const BACKGROUNDS: readonly BackgroundOption[] = [
  ...DAY_PERIODS.flatMap((p) => SEASONS.map((s) => ({ id: `${p}-${s}`, kind: "nature" as const }))),
  ...ISLAMIC_BACKGROUNDS.map((id) => ({ id, kind: "islamic" as const })),
];

export function isBackgroundId(id: unknown): id is string {
  return typeof id === "string" && BACKGROUNDS.some((b) => b.id === id);
}

export function backgroundUrl(id: string): string {
  return `${import.meta.env.BASE_URL}backgrounds/${id}.jpg`;
}

/** Dawn 04:00–08:00, daytime until 16:00, sunset until 19:00, night otherwise (local time). */
export function dayPeriodAt(date: Date): DayPeriod {
  const h = date.getHours();
  if (h >= 4 && h < 8) return "dawn";
  if (h >= 8 && h < 16) return "day";
  if (h >= 16 && h < 19) return "sunset";
  return "night";
}

/**
 * The meteorological season, or null when it isn't reliable: no trustworthy
 * latitude, or within the tropics (|lat| < 23.5°) where the four seasons
 * don't describe the year.
 */
export function seasonAt(date: Date, latitude: number | null): Season | null {
  if (latitude === null || !Number.isFinite(latitude) || Math.abs(latitude) < 23.5) return null;
  const northern = [3, 4, 5].includes(date.getMonth() + 1)
    ? "spring"
    : [6, 7, 8].includes(date.getMonth() + 1)
      ? "summer"
      : [9, 10, 11].includes(date.getMonth() + 1)
        ? "autumn"
        : "winter";
  if (latitude > 0) return northern;
  const flip: Record<Season, Season> = { spring: "autumn", summer: "winter", autumn: "spring", winter: "summer" };
  return flip[northern];
}

export function autoBackgroundId(date: Date, latitude: number | null): string {
  return `${dayPeriodAt(date)}-${seasonAt(date, latitude) ?? "spring"}`;
}
