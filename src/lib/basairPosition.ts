// Where Basa'ir was last read, so its entry on the Mushaf's index picks up there.
import { isValidVerse } from "./quranMeta";

const POSITION_KEY = "dithar:basair:position:v1";
// What the retired map kept: which stations were read, and the one selected.
const RETIRED_KEYS = ["dithar:basair:visited:v2", "dithar:basair:selected:v1"];

export function loadBasairPosition(): { surah: number; ayah: number } | null {
  try {
    const value = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null") as { surah?: unknown; ayah?: unknown } | null;
    if (value && typeof value.surah === "number" && typeof value.ayah === "number" && isValidVerse(value.surah, value.ayah)) {
      return { surah: value.surah, ayah: value.ayah };
    }
  } catch {
    // Unavailable storage or an unreadable value: start from the beginning.
  }
  return null;
}

export function saveBasairPosition(at: { surah: number; ayah: number }): void {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ surah: at.surah, ayah: at.ayah }));
    for (const key of RETIRED_KEYS) localStorage.removeItem(key);
  } catch {
    // The position is a convenience: reading goes on without it.
  }
}
