import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTheme } from "./ThemeContext";
import { applyPaletteAttribute, ensurePaletteStylesheet, loadStoredPalettes, notifyPaletteListeners, saveStoredPalettes } from "./paletteStore";
import type { StoredPalettes } from "./paletteStore";
import type { PaletteId } from "./palettes";

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
// identity remembers its own palette choice independently.
//
// Applies the active palette by setting `data-palette` on
// `document.documentElement` (the same technique LanguageProvider uses for
// `dir`/`lang`); the rules themselves are generated from palettes.ts and
// scoped to `html[data-palette="…"] [data-theme="men|women"]`, so every
// component that reads the --color-* / --wa-* tokens is recolored — the
// whole app, not just the Settings preview. The attribute is set while the
// first render is computed, so a saved palette shows from the first frame.
export function PaletteProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [stored, setStored] = useState<StoredPalettes>(() => {
    const initial = loadStoredPalettes();
    ensurePaletteStylesheet();
    applyPaletteAttribute(initial[theme]);
    return initial;
  });

  const activePalette: PaletteId = stored[theme];

  // Listeners (the native widget's colors) hear about a new palette or a new identity — not the first render.
  const appliedRef = useRef<string | null>(null);
  useEffect(() => {
    applyPaletteAttribute(activePalette);
    const applied = `${theme}:${activePalette}`;
    if (appliedRef.current !== null && appliedRef.current !== applied) notifyPaletteListeners();
    appliedRef.current = applied;
  }, [activePalette, theme]);

  const selectPalette = useCallback(
    (id: PaletteId) => {
      const next: StoredPalettes = { ...stored, [theme]: id };
      saveStoredPalettes(next);
      setStored(next);
    },
    [stored, theme],
  );

  const value = useMemo<PaletteContextValue>(() => ({ activePalette, selectPalette }), [activePalette, selectPalette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within a PaletteProvider");
  return ctx;
}
