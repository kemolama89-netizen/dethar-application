import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useTheme } from "./ThemeContext";
import type { Main1PaletteId, Main2PaletteId } from "./palettes";

export type PaletteId = Main1PaletteId | Main2PaletteId;

const STORAGE_KEY = "dithar:appearance:palette:v1";

interface StoredPalettes {
  men: Main1PaletteId;
  women: Main2PaletteId;
}

const DEFAULT_STORED: StoredPalettes = { men: "original", women: "original" };

function loadStoredPalettes(): StoredPalettes {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return DEFAULT_STORED;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_STORED;
    const p = parsed as Partial<StoredPalettes>;
    return {
      men: typeof p.men === "string" ? (p.men as Main1PaletteId) : "original",
      women: typeof p.women === "string" ? (p.women as Main2PaletteId) : "original",
    };
  } catch {
    return DEFAULT_STORED;
  }
}

function saveStoredPalettes(value: StoredPalettes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Best-effort only — the palette is a visual preference, never load-bearing.
  }
}

interface PaletteContextValue {
  /** The palette id actually in effect for the CURRENT identity (men/women). */
  activePalette: PaletteId;
  /** Sets the palette for whichever identity is currently active — never touches the other identity's stored choice. */
  selectPalette: (id: PaletteId) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

// Deliberately separate from ThemeContext (identity: men/women) — a
// palette only ever recolors the CURRENT identity; selecting one never
// changes, and is never used to change, which identity is active. Each
// identity remembers its own palette choice independently (switching
// identity does not reset or overwrite the other identity's selection).
//
// Applies the active palette by setting `data-palette` on
// `document.documentElement` — the same technique LanguageProvider already
// uses for `dir`/`lang` — rather than adding any new wrapping DOM element,
// so this can be deleted entirely (this file, palettes.ts, its CSS blocks,
// and its one Settings entry point) without touching ThemeContext,
// LanguageContext, or any component's structure.
export function PaletteProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [stored, setStored] = useState<StoredPalettes>(() => loadStoredPalettes());

  const activePalette: PaletteId = theme === "men" ? stored.men : stored.women;

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", activePalette);
  }, [activePalette]);

  const selectPalette = useCallback(
    (id: PaletteId) => {
      setStored((prev) => {
        const next: StoredPalettes =
          theme === "men" ? { ...prev, men: id as Main1PaletteId } : { ...prev, women: id as Main2PaletteId };
        saveStoredPalettes(next);
        return next;
      });
    },
    [theme],
  );

  const value = useMemo<PaletteContextValue>(() => ({ activePalette, selectPalette }), [activePalette, selectPalette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within a PaletteProvider");
  return ctx;
}
