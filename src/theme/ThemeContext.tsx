import { createContext, useContext, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useLanguage } from "./LanguageContext";
import type { Language } from "./LanguageContext";

/** DITHAR has a single identity: the men's logo, wording and base colours. */
export type IdentityTheme = "men";

// Optimized (downscaled, still crisp at on-screen size) runtime display
// copies, served from public/logos/ at a stable URL — see
// src/assets/logos/README.md for full provenance. Using a stable
// public/ path (rather than a hashed src/assets import) lets index.html
// preload the default (men + ar) logo with a plain <link rel="preload">,
// so the fetch starts from the initial HTML response instead of waiting
// on the JS bundle to load and execute. The ASSETS/ source files are
// never read by the app and are never modified.
// Prefixed with Vite's `import.meta.env.BASE_URL` (the configured `base`,
// e.g. "/dethar-application/" in production, "/" in dev) rather than a
// bare root-absolute path — GitHub Pages serves this project from a repo
// subpath, and a literal "/logos/..." string resolves against the domain
// root instead, 404ing in production. BASE_URL always ends in "/".
//
// Each supplied PNG already has the app's wordmark ("دِثار" / "DETHAR")
// baked into the artwork itself, so selecting the right one by language is
// the ONLY thing needed to show the correct name — there is no separate
// text label to keep in sync (see LogoHeader.tsx).
const LOGO_BY_LANGUAGE: Record<Language, string> = {
  ar: `${import.meta.env.BASE_URL}logos/dithar_male_ar.png`,
  en: `${import.meta.env.BASE_URL}logos/dithar_male_en.png`,
};

const THEME: IdentityTheme = "men";

interface ThemeContextValue {
  theme: IdentityTheme;
  logoSrc: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();

  // Warm the browser cache for the other language's logo right after first
  // paint, so switching language swaps it instantly.
  useEffect(() => {
    (["ar", "en"] as const).forEach((l) => {
      if (l === language) return;
      const img = new Image();
      img.src = LOGO_BY_LANGUAGE[l];
    });
  }, [language]);

  const value = useMemo<ThemeContextValue>(() => ({ theme: THEME, logoSrc: LOGO_BY_LANGUAGE[language] }), [language]);

  return (
    <div data-theme={THEME}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </div>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
