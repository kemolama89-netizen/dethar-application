// Palette definitions for Appearance → Colors — data only, no React.
//
// Deliberately separate from theme identity (men/women, see
// ThemeContext.tsx): a palette only ever recolors the CURRENT identity, it
// never switches identity, and each identity keeps its own structure (the
// men's dark device bezel and dark Written Adhkar page, the women's light
// ones). Every palette is offered to both identities, in an identity-tuned
// variant.
//
// Why this was redesigned (2026-10): the earlier palettes changed only the
// background and primary by a few shades and kept the same gold and the
// same warm surfaces, so most choices looked nearly identical. A second
// pass (2026-10-16) gave each palette its own accent hue as well — gold,
// coral, rose, amber, lime, teal — and a tinted background, since six
// primaries over one shared brown-gold still read as variations of one theme. Each palette
// now sets a coordinated family — primary, accent (the "gold" role),
// tinted background/surface, text, muted text, frame, the Written Adhkar
// reader's page and ink, and the colors the widget / full-screen reflection
// use — and the set is checked in tests for (a) perceptual distinctness
// between palettes and (b) WCAG contrast of every pair the UI draws:
//   text on background/surface ≥ 4.5, muted text on surface ≥ 4.5, primary
//   as text on surface ≥ 4.5, light text on primary ≥ 4.5, the accent on
//   surfaces ≥ 3 (it is used for small labels and icons), the accent on
//   primary ≥ 3 (the bottom navigation's active state), the reader's ink on
//   its page ≥ 4.5.
//
// "original" has no overrides at all for either identity — it IS the
// approved appearance, reproduced by changing nothing.
import type { IdentityTheme } from "./ThemeContext";

export type PaletteId = "original" | "emerald" | "navy" | "burgundy" | "royal" | "teal" | "sand";

export const PALETTE_IDS: readonly PaletteId[] = ["original", "emerald", "navy", "burgundy", "royal", "teal", "sand"];

/** One identity's colors for a palette. */
export interface PaletteColors {
  primary: string;
  /** Text/icons drawn ON the primary color. */
  primaryContrast: string;
  /** The accent (the "gold" role): borders, small labels, active marks on light surfaces. */
  accent: string;
  /** The accent when drawn on the primary color (e.g. the bottom navigation's active pill). */
  accentOnPrimary: string;
  /** The accent on dark imagery: the widget's title, the full-screen reflection's labels. */
  accentOnDark: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  frameBezel: string;
  frameBackdrop: string;
  /** The Written Adhkar reader's full-screen page (a vertical gradient). */
  waPage: readonly [string, string];
  waSurface: string;
  waInk: string;
  waInkMuted: string;
  /** Text drawn directly on waPage. */
  waOnPage: string;
  waOnPageMuted: string;
  waCategoryBg: readonly [string, string];
}

export interface PaletteOption {
  id: PaletteId;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  /** null for "original": no overrides (the identity's own approved colors). */
  colors: Record<IdentityTheme, PaletteColors | null>;
}

/** The approved originals, for previews and the widget (never applied as overrides). */
export const ORIGINAL_COLORS: Record<IdentityTheme, Pick<PaletteColors, "primary" | "accent" | "accentOnDark" | "bg" | "surface" | "text">> = {
  men: { primary: "#12213f", accent: "#c6a15b", accentOnDark: "#e6d5a7", bg: "#f2e9da", surface: "#f8f1e4", text: "#12213f" },
  women: { primary: "#5b6e4e", accent: "#c6a15b", accentOnDark: "#e6d5a7", bg: "#f6f2e9", surface: "#fcfaf3", text: "#3e4a34" },
};

// Men: deep primaries, a dark bezel and a dark reader page with light ink.
// Women: softer primaries, a light bezel and a light reader page with dark ink.
function men(c: Omit<PaletteColors, "waCategoryBg" | "waOnPageMuted"> & { waCategoryBg?: readonly [string, string] }): PaletteColors {
  return { ...c, waOnPageMuted: withAlpha(c.waOnPage, 0.64), waCategoryBg: c.waCategoryBg ?? [mix(c.surface, "#ffffff", 0.4), c.bg] };
}

function women(c: Omit<PaletteColors, "waOnPage" | "waOnPageMuted" | "waCategoryBg" | "frameBezel"> & { frameBezel?: string }): PaletteColors {
  return {
    ...c,
    frameBezel: c.frameBezel ?? c.surface,
    waOnPage: c.waInk,
    waOnPageMuted: c.waInkMuted,
    waCategoryBg: [mix(c.surface, "#ffffff", 0.4), c.bg],
  };
}

export const PALETTES: readonly PaletteOption[] = [
  {
    id: "original",
    nameAr: "الأصلي",
    nameEn: "Original",
    descriptionAr: "ألوان دِثار المعتمدة",
    descriptionEn: "DITHAR's approved colors",
    colors: { men: null, women: null },
  },
  {
    id: "emerald",
    nameAr: "زمرّدي وذهبي",
    nameEn: "Emerald & gold",
    descriptionAr: "أخضر زمرّدي حيّ مع ذهبي مشرق",
    descriptionEn: "Vivid emerald with a bright gold",
    colors: {
      men: men({
        primary: "#0b6447", primaryContrast: "#f2faf5", accent: "#a07400", accentOnPrimary: "#f3d37a", accentOnDark: "#f3d37a",
        bg: "#e3f2ea", surface: "#f2faf5", text: "#0c3d2c", muted: "#3f6253", frameBezel: "#073627", frameBackdrop: "#d6e7df",
        waPage: ["#0b4a36", "#073627"], waSurface: "#f8fdf9", waInk: "#0c3d2c", waInkMuted: "#3f6253", waOnPage: "#f3ecd2",
      }),
      women: women({
        primary: "#13805a", primaryContrast: "#f4fbf7", accent: "#9a7000", accentOnPrimary: "#f6dc8c", accentOnDark: "#f6dc8c",
        bg: "#e7f5ed", surface: "#f6fcf8", text: "#15493a", muted: "#47665a", frameBackdrop: "#daebe2",
        waPage: ["#f3faf6", "#e7f5ed"], waSurface: "#ffffff", waInk: "#15493a", waInkMuted: "#47665a",
      }),
    },
  },
  {
    id: "navy",
    nameAr: "كحلي ومرجاني",
    nameEn: "Navy & coral",
    descriptionAr: "أزرق ليلي عميق مع لمسة مرجانية دافئة",
    descriptionEn: "Deep night blue with a warm coral touch",
    colors: {
      men: men({
        primary: "#1c3c94", primaryContrast: "#eef3ff", accent: "#c2410c", accentOnPrimary: "#ffb59a", accentOnDark: "#ffc4ad",
        bg: "#e6edfb", surface: "#f4f7fe", text: "#13265c", muted: "#475478", frameBezel: "#0e1d4f", frameBackdrop: "#d9e1f1",
        waPage: ["#15296b", "#0e1d4f"], waSurface: "#fbfcff", waInk: "#13265c", waInkMuted: "#475478", waOnPage: "#ffe3d6",
      }),
      women: women({
        primary: "#2f56b0", primaryContrast: "#f2f6ff", accent: "#c2410c", accentOnPrimary: "#ffcab5", accentOnDark: "#ffcab5",
        bg: "#eaf0fc", surface: "#f7f9ff", text: "#1d3474", muted: "#4c5a80", frameBackdrop: "#dee5f4",
        waPage: ["#f4f8fe", "#eaf0fc"], waSurface: "#ffffff", waInk: "#1d3474", waInkMuted: "#4c5a80",
      }),
    },
  },
  {
    id: "burgundy",
    nameAr: "توتي ووردي",
    nameEn: "Berry & rose",
    descriptionAr: "توتي عميق مع وردي ذهبي ناعم",
    descriptionEn: "Deep berry with a soft rose gold",
    colors: {
      men: men({
        primary: "#8a1846", primaryContrast: "#fff0f5", accent: "#a5503f", accentOnPrimary: "#f7c3b4", accentOnDark: "#f9cfc2",
        bg: "#fae9ee", surface: "#fef5f7", text: "#5a1030", muted: "#7a4d5c", frameBezel: "#460c24", frameBackdrop: "#f0dce3",
        waPage: ["#5e1131", "#460c24"], waSurface: "#fffafb", waInk: "#5a1030", waInkMuted: "#7a4d5c", waOnPage: "#fbe3e1",
      }),
      women: women({
        primary: "#a32a5c", primaryContrast: "#fff3f7", accent: "#a24e3e", accentOnPrimary: "#fad2c6", accentOnDark: "#fad2c6",
        bg: "#fcedf2", surface: "#fff8fa", text: "#661a3b", muted: "#7d5363", frameBackdrop: "#f3e0e7",
        waPage: ["#fef6f8", "#fcedf2"], waSurface: "#ffffff", waInk: "#661a3b", waInkMuted: "#7d5363",
      }),
    },
  },
  {
    id: "royal",
    nameAr: "بنفسجي وكهرماني",
    nameEn: "Violet & amber",
    descriptionAr: "بنفسجي ملكي مع كهرماني دافئ",
    descriptionEn: "Royal violet with warm amber",
    colors: {
      men: men({
        primary: "#5427a8", primaryContrast: "#f6f0ff", accent: "#a35d00", accentOnPrimary: "#ffcd6e", accentOnDark: "#ffd68a",
        bg: "#efe9fb", surface: "#f8f5fe", text: "#371a70", muted: "#5f5480", frameBezel: "#2a135a", frameBackdrop: "#e4ddf3",
        waPage: ["#3a1b78", "#2a135a"], waSurface: "#fcfbff", waInk: "#371a70", waInkMuted: "#5f5480", waOnPage: "#f6ecd4",
      }),
      women: women({
        primary: "#6e3fc4", primaryContrast: "#f8f3ff", accent: "#9b5a00", accentOnPrimary: "#ffdc94", accentOnDark: "#ffdc94",
        bg: "#f2edfc", surface: "#fbf9ff", text: "#432083", muted: "#645a86", frameBackdrop: "#e8e1f5",
        waPage: ["#f8f6fe", "#f2edfc"], waSurface: "#ffffff", waInk: "#432083", waInkMuted: "#645a86",
      }),
    },
  },
  {
    id: "teal",
    nameAr: "فيروزي وليموني",
    nameEn: "Teal & lime",
    descriptionAr: "فيروزي صافٍ مع أخضر ليموني منعش",
    descriptionEn: "Clear teal with a fresh lime",
    colors: {
      men: men({
        primary: "#006b73", primaryContrast: "#eefbfa", accent: "#5c7a00", accentOnPrimary: "#d5ee7f", accentOnDark: "#dcf08f",
        bg: "#e3f3f1", surface: "#f2faf9", text: "#073f45", muted: "#3d6064", frameBezel: "#003539", frameBackdrop: "#d6e8e7",
        waPage: ["#00474d", "#003539"], waSurface: "#f9fefd", waInk: "#073f45", waInkMuted: "#3d6064", waOnPage: "#eef6dc",
      }),
      women: women({
        primary: "#00767e", primaryContrast: "#f0fcfb", accent: "#567300", accentOnPrimary: "#e0f39b", accentOnDark: "#e0f39b",
        bg: "#e6f6f4", surface: "#f6fcfb", text: "#0b4c52", muted: "#45666a", frameBackdrop: "#d9ecea",
        waPage: ["#f2fafa", "#e6f6f4"], waSurface: "#ffffff", waInk: "#0b4c52", waInkMuted: "#45666a",
      }),
    },
  },
  {
    id: "sand",
    nameAr: "طيني وفيروزي",
    nameEn: "Terracotta & teal",
    descriptionAr: "طيني دافئ على رملي مع لمسة فيروزية",
    descriptionEn: "Warm terracotta on sand, with a teal touch",
    colors: {
      men: men({
        primary: "#9a3f20", primaryContrast: "#fff4ec", accent: "#17696d", accentOnPrimary: "#a6e7e0", accentOnDark: "#b3ece6",
        bg: "#f6e8d8", surface: "#fcf4ea", text: "#5b2412", muted: "#7a5848", frameBezel: "#481c0e", frameBackdrop: "#eddccc",
        waPage: ["#5f2614", "#481c0e"], waSurface: "#fffaf4", waInk: "#5b2412", waInkMuted: "#7a5848", waOnPage: "#f8e8d6",
      }),
      women: women({
        primary: "#b04f2c", primaryContrast: "#fff6ef", accent: "#156569", accentOnPrimary: "#bdeee8", accentOnDark: "#bdeee8",
        bg: "#f8ecdf", surface: "#fef8f1", text: "#62301c", muted: "#7c5c4c", frameBackdrop: "#efe1d3",
        waPage: ["#fcf6ef", "#f8ecdf"], waSurface: "#ffffff", waInk: "#62301c", waInkMuted: "#7c5c4c",
      }),
    },
  },
];

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && (PALETTE_IDS as readonly string[]).includes(value);
}

/**
 * Choices saved by the earlier palette set, mapped to the closest new one
 * so nobody's saved choice silently falls back to "original".
 */
export const LEGACY_PALETTE_MAP: Readonly<Record<string, PaletteId>> = {
  forest: "emerald",
  olive: "emerald",
  earth: "sand",
  charcoal: "navy",
  mauve: "royal",
  lavender: "royal",
  rose: "burgundy",
  plum: "burgundy",
};

export function migratePaletteId(value: unknown): PaletteId {
  if (isPaletteId(value)) return value;
  if (typeof value === "string" && value in LEGACY_PALETTE_MAP) return LEGACY_PALETTE_MAP[value];
  return "original";
}

export function findPalette(id: PaletteId): PaletteOption {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** primary, accent, background — for the compact preview dots. */
export function paletteSwatches(option: PaletteOption, theme: IdentityTheme): [string, string, string] {
  const c = option.colors[theme] ?? ORIGINAL_COLORS[theme];
  return [c.primary, c.accent, c.bg];
}

// ---- CSS ------------------------------------------------------------------

function rgbChannels(hex: string): string {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ");
}

function withAlpha(hex: string, alpha: number): string {
  return `rgba(${rgbChannels(hex)}, ${alpha})`;
}

/** A hex blend of two colors (t = share of b). */
export function mix(a: string, b: string, t: number): string {
  const ca = rgbChannels(a).split(", ").map(Number);
  const cb = rgbChannels(b).split(", ").map(Number);
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** The CSS custom properties a palette sets (on top of the identity's own block in index.css). */
export function paletteTokens(c: PaletteColors, theme: IdentityTheme): Record<string, string> {
  return {
    "--color-bg": c.bg,
    "--color-surface": c.surface,
    "--color-primary": c.primary,
    "--color-primary-contrast": c.primaryContrast,
    "--color-primary-contrast-rgb": rgbChannels(c.primaryContrast),
    "--color-gold": c.accent,
    "--color-gold-rgb": rgbChannels(c.accent),
    "--color-gold-soft": withAlpha(c.accent, 0.35),
    "--color-gold-on-primary": c.accentOnPrimary,
    "--color-accent-on-dark": c.accentOnDark,
    "--color-panel-divider": withAlpha(c.accent, 0.45),
    "--color-text-primary": c.text,
    "--color-text-muted": c.muted,
    "--color-shadow-rgb": rgbChannels(c.primary),
    "--color-frame-bezel": c.frameBezel,
    "--color-frame-backdrop": c.frameBackdrop,
    "--color-glass-tint": withAlpha(c.surface, theme === "men" ? 0.42 : 0.44),
    "--color-glass-tint-soft": withAlpha(c.surface, theme === "men" ? 0.24 : 0.26),
    "--color-glass-edge": withAlpha(c.primary, 0.5),
    "--color-glass-accent": withAlpha(c.primary, theme === "men" ? 0.08 : 0.07),
    "--reminder-tint-rgb": rgbChannels(c.primary),
    "--wa-page-bg": `linear-gradient(180deg, ${c.waPage[0]} 0%, ${c.waPage[1]} 100%)`,
    "--wa-surface": c.waSurface,
    "--wa-ink": c.waInk,
    "--wa-ink-muted": c.waInkMuted,
    "--wa-on-page": c.waOnPage,
    "--wa-on-page-muted": c.waOnPageMuted,
    "--wa-gold": c.accent,
    "--wa-gold-soft": withAlpha(c.accent, 0.32),
    "--wa-gold-hairline": withAlpha(c.accent, 0.26),
    "--wa-badge-bg": withAlpha(c.accent, theme === "men" ? 0.22 : 0.16),
    "--wa-category-bg": `linear-gradient(180deg, ${c.waCategoryBg[0]} 0%, ${c.waCategoryBg[1]} 100%)`,
  };
}

/** Every palette's rules, scoped exactly like the earlier hand-written CSS: html[data-palette] + the identity wrapper. */
export function paletteStylesheet(): string {
  const rules: string[] = [];
  for (const option of PALETTES) {
    for (const theme of ["men", "women"] as const) {
      const colors = option.colors[theme];
      if (!colors) continue;
      const body = Object.entries(paletteTokens(colors, theme))
        .map(([k, v]) => `  ${k}: ${v};`)
        .join("\n");
      rules.push(`html[data-palette="${option.id}"] [data-theme="${theme}"] {\n${body}\n}`);
    }
  }
  return rules.join("\n\n");
}

/** What the native home-screen widget uses for this palette: the title/heart color and a tint over its background. */
export function widgetColors(theme: IdentityTheme, id: PaletteId): { accent: string; tint: string } {
  const c = findPalette(id).colors[theme];
  return c ? { accent: c.accentOnDark, tint: c.primary } : { accent: ORIGINAL_COLORS[theme].accentOnDark, tint: ORIGINAL_COLORS[theme].primary };
}
