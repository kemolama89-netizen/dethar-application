import { createContext, useContext, useState, useMemo, useEffect } from "react";
import type { ReactNode } from "react";

export type IdentityTheme = "men" | "women";

// Optimized (downscaled, still crisp at on-screen size) runtime display
// copies, served from public/logos/ at a stable URL — see
// src/assets/logos/README.md for full provenance. Using a stable
// public/ path (rather than a hashed src/assets import) lets index.html
// preload the default (men) logo with a plain <link rel="preload">, so
// the fetch starts from the initial HTML response instead of waiting on
// the JS bundle to load and execute. The ASSETS/ source files are never
// read by the app and are never modified.
// Prefixed with Vite's `import.meta.env.BASE_URL` (the configured `base`,
// e.g. "/dethar-application/" in production, "/" in dev) rather than a
// bare root-absolute path — GitHub Pages serves this project from a repo
// subpath, and a literal "/logos/..." string resolves against the domain
// root instead, 404ing in production. BASE_URL always ends in "/".
const LOGO_BY_THEME: Record<IdentityTheme, string> = {
  men: `${import.meta.env.BASE_URL}logos/dithar-logo-men.png`,
  women: `${import.meta.env.BASE_URL}logos/dithar-logo-women.png`,
};

interface ThemeContextValue {
  theme: IdentityTheme;
  toggleTheme: () => void;
  logoSrc: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<IdentityTheme>("men");

  // Warm the browser cache for the *other* theme's logo right after first
  // paint, so toggling the theme swaps instantly instead of triggering a
  // fresh network/decode delay on first switch.
  useEffect(() => {
    const other = theme === "men" ? LOGO_BY_THEME.women : LOGO_BY_THEME.men;
    const img = new Image();
    img.src = other;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === "men" ? "women" : "men")),
      logoSrc: LOGO_BY_THEME[theme],
    }),
    [theme],
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
