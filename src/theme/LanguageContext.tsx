import { createContext, useContext, useState, useMemo, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { loadLanguagePreference, saveLanguagePreference } from "../lib/appearancePreferences";

export type Language = "ar" | "en";

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Language is a state fully independent of `theme` (see ThemeContext) —
// toggling one never touches the other. The chosen language is persisted
// (see appearancePreferences.ts) and restored as the initial state, so an
// app restart comes back in the language the user last picked; a first
// launch, or an unreadable stored value, starts in Arabic as before.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => loadLanguagePreference());
  const dir: "rtl" | "ltr" = language === "ar" ? "rtl" : "ltr";

  // dir/lang are set on <html> (not a wrapping element) because logical CSS
  // properties used throughout the app (border-inline-end for the prayer
  // dividers, default text alignment, flex DOM-order-based mirroring for
  // TopBar/BottomNav) resolve against the document's direction — this is
  // "handled at the application/layout level" rather than by manually
  // reversing individual elements. A layout effect (not a passive one) so a
  // restored English session never paints a frame in index.html's default
  // rtl/ar before its own ltr/en is applied.
  useLayoutEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      toggleLanguage: () => {
        const next: Language = language === "ar" ? "en" : "ar";
        setLanguage(next);
        saveLanguagePreference(next);
      },
      dir,
    }),
    [language, dir],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
