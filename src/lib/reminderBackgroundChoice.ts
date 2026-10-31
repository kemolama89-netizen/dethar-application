// Which background a reminder is shown on (the full-screen reflection):
// the user's own photo or fixed choice when they set one; otherwise one
// matched to the dhikr's theme (data/dhikrReflections.ts), else the
// automatic time-of-day + season background.
import type { ReminderItem } from "./reminderContent";
import { suggestedBackground } from "./reminderContent";
import { loadCustomBackground, loadReminderSettings } from "./reminderSettings";
import { autoBackgroundId, backgroundUrl } from "./reminderBackgrounds";
import { resolveKnownLocationRecord } from "./locationSettings";

/** The background for an item: the user's photo or fixed choice, else one matched to the dhikr, else time of day + season. */
export function reminderBackgroundFor(item: ReminderItem, now: Date = new Date()): string {
  const settings = loadReminderSettings();
  if (settings.backgroundMode === "custom") {
    const custom = loadCustomBackground();
    if (custom) return custom.dataUrl;
  }
  if (settings.backgroundMode === "fixed") return backgroundUrl(settings.fixedBackground);
  const suggested = suggestedBackground(item);
  if (suggested !== "auto") return backgroundUrl(suggested);
  const known = resolveKnownLocationRecord();
  return backgroundUrl(autoBackgroundId(now, known && known.source !== "fallback" ? known.latitude : null));
}
