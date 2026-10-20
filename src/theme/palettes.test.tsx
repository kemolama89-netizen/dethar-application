// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider } from "./LanguageContext";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { PaletteProvider, usePalette } from "./PaletteContext";
import { PALETTE_STORAGE_KEY, loadStoredPalettes } from "./paletteStore";
import { LEGACY_PALETTE_MAP, ORIGINAL_COLORS, PALETTES, PALETTE_IDS, migratePaletteId, paletteStylesheet, paletteTokens, widgetColors } from "./palettes";
import type { PaletteColors } from "./palettes";
import { AppearanceSettings } from "../components/AppearanceSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ---- color math (WCAG 2.x contrast, CIE76 ΔE) ------------------------------

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function lab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function deltaE(a: string, b: string): number {
  const [la, lb] = [lab(a), lab(b)];
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}

const variants: { id: string; theme: "men" | "women"; c: PaletteColors }[] = PALETTES.flatMap((p) =>
  (["men", "women"] as const).flatMap((theme) => (p.colors[theme] ? [{ id: p.id, theme, c: p.colors[theme]! }] : [])),
);

describe("palette definitions", () => {
  it("offer the requested palettes, for both identities, plus the untouched original", () => {
    expect(PALETTE_IDS).toEqual(["original", "emerald", "navy", "burgundy", "royal", "teal", "sand"]);
    for (const p of PALETTES) {
      if (p.id === "original") expect(p.colors).toEqual({ men: null, women: null });
      else expect(p.colors.men && p.colors.women, p.id).toBeTruthy();
    }
  });

  it("keep every text pair the UI draws readable (WCAG AA), in both identities", () => {
    for (const { id, theme, c } of variants) {
      const at = `${id}/${theme}`;
      expect(contrast(c.text, c.bg), `${at} text/bg`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.text, c.surface), `${at} text/surface`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.muted, c.surface), `${at} muted/surface`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.primary, c.surface), `${at} primary as text`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.primaryContrast, c.primary), `${at} on primary`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.waInk, c.waSurface), `${at} reader ink`).toBeGreaterThanOrEqual(4.5);
      expect(Math.min(contrast(c.waOnPage, c.waPage[0]), contrast(c.waOnPage, c.waPage[1])), `${at} reader page`).toBeGreaterThanOrEqual(4.5);
      // Small labels/icons in the accent, and the accent on the primary (bottom nav), are at least 3:1.
      expect(contrast(c.accent, c.surface), `${at} accent/surface`).toBeGreaterThanOrEqual(3);
      expect(contrast(c.accent, c.waSurface), `${at} accent/reader`).toBeGreaterThanOrEqual(3);
      expect(contrast(c.accentOnPrimary, c.primary), `${at} accent on primary`).toBeGreaterThanOrEqual(3);
      // The full-screen reflection's "Next" button: text on the light accent.
      expect(contrast(c.text, c.accentOnDark), `${at} next button`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("are clearly distinct from each other and from the original (ΔE ≥ 20 between primaries)", () => {
    for (const theme of ["men", "women"] as const) {
      const primaries = PALETTES.map((p) => ({ id: p.id, primary: (p.colors[theme] ?? ORIGINAL_COLORS[theme]).primary }));
      for (let i = 0; i < primaries.length; i++) {
        for (let j = i + 1; j < primaries.length; j++) {
          expect(deltaE(primaries[i].primary, primaries[j].primary), `${theme}: ${primaries[i].id} vs ${primaries[j].id}`).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it("don't paint everything one color: accent, primary and surfaces differ", () => {
    for (const { id, theme, c } of variants) {
      expect(deltaE(c.accent, c.primary), `${id}/${theme}`).toBeGreaterThanOrEqual(25);
      expect(c.bg).not.toBe(c.surface);
    }
  });

  it("produce CSS for every palette and identity, scoped like before, covering the app's tokens", () => {
    const css = paletteStylesheet();
    for (const { id, theme } of variants) expect(css).toContain(`html[data-palette="${id}"] [data-theme="${theme}"]`);
    expect(css).not.toContain(`data-palette="original"`);
    const tokens = Object.keys(paletteTokens(variants[0].c, "men"));
    for (const token of ["--color-primary", "--color-surface", "--color-gold", "--color-gold-on-primary", "--color-accent-on-dark", "--wa-page-bg", "--wa-ink", "--color-frame-bezel"]) {
      expect(tokens).toContain(token);
    }
  });

  it("map choices saved by the earlier palette set to their closest new palette", () => {
    expect(migratePaletteId("forest")).toBe("emerald");
    expect(migratePaletteId("plum")).toBe("burgundy");
    expect(migratePaletteId("navy")).toBe("navy");
    expect(migratePaletteId("unknown")).toBe("original");
    expect(migratePaletteId(42)).toBe("original");
    for (const target of Object.values(LEGACY_PALETTE_MAP)) expect(PALETTE_IDS).toContain(target);
  });

  it("give the widget the palette's accent and primary (the original keeps today's widget colors)", () => {
    expect(widgetColors("men", "original")).toEqual({ accent: "#e6d5a7", tint: "#12213f" });
    const berry = PALETTES.find((p) => p.id === "burgundy")!.colors.women!;
    expect(widgetColors("women", "burgundy")).toEqual({ accent: berry.accentOnDark, tint: berry.primary });
  });
});

// ---- applied and persisted --------------------------------------------------

let palette: ReturnType<typeof usePalette> | undefined;
let theme: ReturnType<typeof useTheme> | undefined;
function Probe() {
  palette = usePalette();
  theme = useTheme();
  return null;
}

let container: HTMLDivElement;
let root: Root;

async function mount(children = <Probe />) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <PaletteProvider>{children}</PaletteProvider>
        </ThemeProvider>
      </LanguageProvider>,
    );
  });
}

async function unmount() {
  await act(async () => root.unmount());
  container.remove();
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-palette");
  document.getElementById("dithar-palettes")?.remove();
});
afterEach(async () => {
  if (container?.isConnected) await unmount();
});

describe("the selected palette", () => {
  it("is applied to the whole document (not just the preview) and its CSS is installed", async () => {
    await mount();
    expect(document.documentElement.getAttribute("data-palette")).toBe("original");
    expect(document.getElementById("dithar-palettes")?.textContent).toContain('html[data-palette="emerald"]');
    await act(async () => palette!.selectPalette("emerald"));
    expect(document.documentElement.getAttribute("data-palette")).toBe("emerald");
  });

  it("survives a restart, per identity, and switching identity applies that identity's own choice", async () => {
    await mount();
    await act(async () => palette!.selectPalette("teal"));
    await act(async () => theme!.toggleTheme()); // → women
    await act(async () => palette!.selectPalette("royal"));
    await unmount();

    expect(loadStoredPalettes()).toEqual({ men: "teal", women: "royal" });
    await mount(); // a fresh launch: the women identity was saved last
    expect(palette!.activePalette).toBe("royal");
    expect(document.documentElement.getAttribute("data-palette")).toBe("royal");
    await act(async () => theme!.toggleTheme()); // → men
    expect(document.documentElement.getAttribute("data-palette")).toBe("teal");
  });

  it("restores a choice saved by the earlier palette set as its closest new palette", async () => {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify({ men: "forest", women: "mauve" }));
    await mount();
    expect(palette!.activePalette).toBe("emerald");
  });

  it("can be chosen in Settings → Appearance → Colors, with the current identity's swatches", async () => {
    await mount(
      <>
        <Probe />
        <AppearanceSettings onBack={() => {}} />
      </>,
    );
    const colorsRow = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("الألوان"))!;
    await act(async () => colorsRow.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    const options = container.querySelectorAll("[data-palette-option]");
    expect(options).toHaveLength(PALETTES.length);
    const burgundy = container.querySelector<HTMLButtonElement>("[data-palette-option='burgundy']")!;
    await act(async () => burgundy.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(burgundy.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.getAttribute("data-palette")).toBe("burgundy");
    expect(loadStoredPalettes().men).toBe("burgundy");
  });
});
