import { createContext, useContext, useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import { useLanguage } from "./LanguageContext";
import type { Language } from "./LanguageContext";

export type IdentityTheme = "men" | "women";

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
// Each of the 4 supplied PNGs already has the app's wordmark ("دِثار" /
// "DETHAR") baked into the artwork itself, so selecting the right one by
// theme + language is now the ONLY thing needed to show the correct name
// — there is no separate text label to keep in sync (see LogoHeader.tsx).
const LOGO_BY_THEME_AND_LANGUAGE: Record<IdentityTheme, Record<Language, string>> = {
  men: {
    ar: `${import.meta.env.BASE_URL}logos/dithar_male_ar.png`,
    en: `${import.meta.env.BASE_URL}logos/dithar_male_en.png`,
  },
  women: {
    ar: `${import.meta.env.BASE_URL}logos/dithar_female_ar.png`,
    en: `${import.meta.env.BASE_URL}logos/dithar_female_en.png`,
  },
};

interface ThemeContextValue {
  theme: IdentityTheme;
  toggleTheme: () => void;
  logoSrc: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<IdentityTheme>("men");
  const { language } = useLanguage();

  // Warm the browser cache for the other 3 theme/language combinations
  // right after first paint, so toggling either one swaps instantly
  // instead of triggering a fresh network/decode delay on first switch.
  useEffect(() => {
    (["men", "women"] as const).forEach((t) => {
      (["ar", "en"] as const).forEach((l) => {
        if (t === theme && l === language) return;
        const img = new Image();
        img.src = LOGO_BY_THEME_AND_LANGUAGE[t][l];
      });
    });
  }, [theme, language]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === "men" ? "women" : "men")),
      logoSrc: LOGO_BY_THEME_AND_LANGUAGE[theme][language],
    }),
    [theme, language],
  );

  return (
    <div data-theme={theme}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </div>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
