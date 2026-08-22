import { createContext, useContext, useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";

export type Language = "ar" | "en";

interface LanguageContextValue {
  language: Language;
  toggleLanguage: () => void;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Language is a state fully independent of `theme` (see ThemeContext) —
// toggling one never touches the other. Neither persists across reloads;
// that matches the existing (also non-persistent) theme state, so the two
// stay consistent with each other rather than one surviving a refresh and
// the other not.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("ar");
  const dir: "rtl" | "ltr" = language === "ar" ? "rtl" : "ltr";

  // dir/lang are set on <html> (not a wrapping element) because logical CSS
  // properties used throughout the app (border-inline-end for the prayer
  // dividers, default text alignment, flex DOM-order-based mirroring for
  // TopBar/BottomNav) resolve against the document's direction — this is
  // "handled at the application/layout level" rather than by manually
  // reversing individual elements.
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      toggleLanguage: () => setLanguage((l) => (l === "ar" ? "en" : "ar")),
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
