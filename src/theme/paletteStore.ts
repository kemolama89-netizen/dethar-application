// The interface colour in effect — the non-React half of PaletteContext.tsx.
//
// Manual colour selection was removed from Settings → Appearance (2026-10-31):
// the app's colours now come from the identity and the
// appearance theme (theme/looks.ts) alone, so the palette in effect is always
// "original" (the identity's own approved colours). A choice saved by an
// earlier version (localStorage "dithar:appearance:palette:v1") is no longer
// read, so it can't recolour anything — the app, the Mushaf's chrome, the
// share images or the native widget. The palette definitions themselves stay
// in palettes.ts (ORIGINAL_COLORS, widgetColors).
import type { PaletteId } from "./palettes";

/** The only palette now in effect: the identity's own colours. */
export const ACTIVE_PALETTE: PaletteId = "original";

const listeners = new Set<() => void>();

/** Told whenever the colours in effect change — a new identity (the native widget's colors follow it). */
export function subscribePaletteChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyPaletteListeners(): void {
  for (const listener of [...listeners]) listener();
}

export function applyPaletteAttribute(id: PaletteId): void {
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-palette", id);
}
