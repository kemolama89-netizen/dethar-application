import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTheme } from "./ThemeContext";
import { ACTIVE_PALETTE, applyPaletteAttribute, notifyPaletteListeners } from "./paletteStore";
import type { PaletteId } from "./palettes";

interface PaletteContextValue {
  /** Always "original": the colours come from the identity and the appearance theme (theme/looks.ts). */
  activePalette: PaletteId;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

// The interface colour. Manual colour selection was removed from Settings
// (see paletteStore.ts): the palette in effect is always the identity's own
// ("original"), and the appearance theme (LookProvider) sets the rest. This
// provider keeps `data-palette="original"` on <html> from the first frame —
// so no palette rule (palettes.ts) can ever match — and tells listeners (the
// native widget's colours) when the identity changes.
export function PaletteProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  useState(() => {
    applyPaletteAttribute(ACTIVE_PALETTE);
    return null;
  });

  // Listeners hear about a new identity — not the first render.
  const appliedRef = useRef<string | null>(null);
  useEffect(() => {
    applyPaletteAttribute(ACTIVE_PALETTE);
    if (appliedRef.current !== null && appliedRef.current !== theme) notifyPaletteListeners();
    appliedRef.current = theme;
  }, [theme]);

  const value = useMemo<PaletteContextValue>(() => ({ activePalette: ACTIVE_PALETTE }), []);
  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within a PaletteProvider");
  return ctx;
}
