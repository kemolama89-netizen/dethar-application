// The saved palette choice (one per identity) and the generated palette
// stylesheet — the non-React half of PaletteContext.tsx.
import type { IdentityTheme } from "./ThemeContext";
import { migratePaletteId, paletteStylesheet } from "./palettes";
import type { PaletteId } from "./palettes";

export const PALETTE_STORAGE_KEY = "dithar:appearance:palette:v1";

export type StoredPalettes = Record<IdentityTheme, PaletteId>;

const DEFAULT_STORED: StoredPalettes = { men: "original", women: "original" };

const listeners = new Set<() => void>();

/** Told whenever the palette in effect changes — a new choice or a new identity (the native widget's colors follow it). */
export function subscribePaletteChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyPaletteListeners(): void {
  for (const listener of [...listeners]) listener();
}

/** Each identity's saved palette; choices from the earlier palette set are mapped to their closest new palette. */
export function loadStoredPalettes(): StoredPalettes {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PALETTE_STORAGE_KEY) : null;
    if (!raw) return DEFAULT_STORED;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_STORED;
    const p = parsed as Partial<Record<IdentityTheme, unknown>>;
    return { men: migratePaletteId(p.men), women: migratePaletteId(p.women) };
  } catch {
    return DEFAULT_STORED;
  }
}

export function saveStoredPalettes(value: StoredPalettes): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Best-effort only — the palette is a visual preference, never load-bearing.
  }
}

const STYLE_ELEMENT_ID = "dithar-palettes";

/** The palettes' CSS rules (generated from palettes.ts), added to <head> once. */
export function ensurePaletteStylesheet(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = paletteStylesheet();
  document.head.appendChild(style);
}

export function applyPaletteAttribute(id: PaletteId): void {
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-palette", id);
}
