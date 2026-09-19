// Persistence for the two app-wide identity preferences: the interface
// language (Arabic RTL / English LTR) and the men/women identity theme.
// Loaded once, synchronously, as the lazy initial state of
// LanguageProvider/ThemeProvider (so the very first render is already in
// the user's saved language/theme — no flash of the defaults), and written
// only when the user actually changes them. The palette has its own store
// (PaletteContext.tsx); this file deliberately covers only these two.
//
// Every read validates the stored value against the exact allowed set and
// falls back to the default on anything else (missing, corrupt, from an
// older/newer build), and every read/write is wrapped so a blocked or full
// localStorage (private mode, quota) can never throw into the UI — a
// preference that fails to save just doesn't survive the restart.
import type { Language } from "../theme/LanguageContext";
import type { IdentityTheme } from "../theme/ThemeContext";

export const LANGUAGE_STORAGE_KEY = "dithar:appearance:language:v1";
export const THEME_STORAGE_KEY = "dithar:appearance:theme:v1";

export const DEFAULT_LANGUAGE: Language = "ar";
export const DEFAULT_THEME: IdentityTheme = "men";

function readRaw(key: string): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Best-effort only — the in-memory selection already took effect.
  }
}

export function loadLanguagePreference(): Language {
  const raw = readRaw(LANGUAGE_STORAGE_KEY);
  return raw === "ar" || raw === "en" ? raw : DEFAULT_LANGUAGE;
}

export function saveLanguagePreference(language: Language): void {
  writeRaw(LANGUAGE_STORAGE_KEY, language);
}

export function loadThemePreference(): IdentityTheme {
  const raw = readRaw(THEME_STORAGE_KEY);
  return raw === "men" || raw === "women" ? raw : DEFAULT_THEME;
}

export function saveThemePreference(theme: IdentityTheme): void {
  writeRaw(THEME_STORAGE_KEY, theme);
}
