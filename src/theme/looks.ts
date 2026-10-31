// DITHAR's appearance themes ("looks"): Classic, Night, Nature and Modern
// Sunset (public/reference/Dithar App Theme Showcase.png). One central place
// for their colours, wallpapers and the prayer-times arch scene.
//
// Layers, the look over the identity:
//   1. the identity, men/women (index.css [data-theme]) — logo, wording, base colours;
//   2. the look (this file, html[data-look]) — the page, card and text tones, Nature's
//      and Sunset's primary, the Adhkar screens' reading colours, the Home wallpaper
//      and the arch scene. Classic overrides no colour: it IS the identity's own
//      ivory appearance, with the wallpaper and frosted cards.
// The theme alone sets the colours: there is no manual colour palette any more
// (paletteStore.ts). Every screen that reads the --color-* tokens follows the
// look — except the Mushaf (LOOK_OFF_ATTRIBUTE); the Home screen alone also
// shows the wallpaper and the frosted ("glass") cards.
//
// The user's choice (look, wallpaper, card opacity, automatic dark mode) is
// kept on this device (localStorage); a photo of their own is stored as the
// cropped 720×1280 JPEG (BackgroundCropper), never the original.

export type LookId = "classic" | "night" | "nature" | "sunset";
export const LOOK_IDS: readonly LookId[] = ["classic", "night", "nature", "sunset"];

/** The Home wallpapers: photographs (scripts/prepare-theme-photos.py → public/themes; credits in public/themes/README.md). */
export type WallpaperId = "classic" | "night" | "nature" | "sunset" | "sea" | "mosque" | "flowers";
export const WALLPAPER_IDS: readonly WallpaperId[] = ["classic", "night", "nature", "sunset", "sea", "mosque", "flowers"];
/** "theme": the look's own wallpaper; "custom": the user's photo. */
export type WallpaperChoice = "theme" | WallpaperId | "custom";

/** Off, follow the phone's dark mode, or by the time of day (night from 18:30 to 05:30). */
export type AutoDark = "off" | "device" | "time";

export interface LookSettings {
  look: LookId;
  wallpaper: WallpaperChoice;
  /** The frosted cards' opacity on Home, 0.55 (most see-through) to 1 (solid). */
  cardOpacity: number;
  autoDark: AutoDark;
}

export const DEFAULT_LOOK_SETTINGS: LookSettings = { look: "classic", wallpaper: "theme", cardOpacity: 0.82, autoDark: "off" };
export const CARD_OPACITY_MIN = 0.55;
export const CARD_OPACITY_MAX = 1;

export const LOOK_STORAGE_KEY = "dithar:appearance:look:v1";
export const CUSTOM_WALLPAPER_KEY = "dithar:appearance:custom-wallpaper:v1";

/** Whether a wallpaper is light or dark (its average brightness) — the veil over it keeps the text drawn on it readable. */
export type Tone = "light" | "dark";
export const WALLPAPER_TONE: Readonly<Record<WallpaperId, Tone>> = {
  classic: "light",
  night: "dark",
  nature: "light",
  sunset: "light",
  sea: "light",
  mosque: "dark",
  flowers: "light",
};

/**
 * The Adhkar screens' own colour set (--wa-*: the Written Adhkar reader, the Written/Audio Adhkar
 * category screens and search) for a look. The men's identity reads on a deep page, the women's on a
 * light one — each look keeps that, in its own hues. Night is dark for both, with dark cards and light ink.
 */
export interface ReaderColors {
  page: readonly [string, string];
  surface: string;
  ink: string;
  inkMuted: string;
  onPage: string;
  onPageMuted: string;
  category: readonly [string, string];
  gold?: string;
}

interface LookColors {
  /** Text drawn on this look's pages is dark (light pages) or light (dark pages). */
  tone: Tone;
  /** Overrides of the identity's tokens; none for Classic. */
  tokens: Record<string, string>;
  /** The frosted card's base colour (RGB channels) and its border. */
  cardRgb: string;
  cardBorder: string;
  /** The veil over the wallpaper (RGB channels): the page colour, so text on the wallpaper stays readable. */
  veilRgb: string;
  /** Swatch for the Settings tile when no image is shown. */
  swatch: string;
  /** The phone frame around the screen (its bezel) — the look's own, so the whole device reads as one theme. */
  bezel: string;
  /** The look's own primary (Nature's forest green, Sunset's deep plum); Classic and Night keep the identity's. */
  originalPrimary?: { primary: string; contrast: string; contrastRgb: string; shadowRgb: string };
  /** A fine geometric lattice drawn over the Home wallpaper (Classic's eight-pointed stars). */
  pattern?: string;
  /** The Adhkar screens' colours per identity (none for Classic: the original reading identity). */
  reader?: Readonly<Record<"men" | "women", ReaderColors>>;
}

// Classic's lattice: an eight-pointed star (two overlapping squares) with a small diamond between the
// stars, in champagne gold at low opacity — a quiet Islamic geometric detail, not a busy pattern.
const STAR_LATTICE_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>" +
  "<g fill='none' stroke='%23b08a46' stroke-width='0.8' stroke-opacity='0.2'>" +
  "<rect x='20' y='20' width='24' height='24'/><rect x='20' y='20' width='24' height='24' transform='rotate(45 32 32)'/>" +
  "<circle cx='32' cy='32' r='5'/><path d='M0 0 L5 5 M64 0 L59 5 M0 64 L5 59 M64 64 L59 59'/></g></svg>";
const STAR_LATTICE = `url("data:image/svg+xml;utf8,${STAR_LATTICE_SVG}")`;

const NIGHT_READER: ReaderColors = {
  page: ["#101b3c", "#0a1330"],
  surface: "#17244d",
  ink: "#f3e9d2",
  inkMuted: "#b3b9cc",
  onPage: "#f3e9d2",
  onPageMuted: "rgba(243, 233, 210, 0.66)",
  category: ["#121d40", "#0d1733"],
  gold: "#d6b26c",
};

export const LOOKS: Readonly<Record<LookId, LookColors>> = {
  classic: {
    tone: "light",
    tokens: {},
    cardRgb: "255, 251, 243",
    cardBorder: "rgba(198, 161, 91, 0.42)",
    veilRgb: "246, 239, 226",
    swatch: "#f5ecdc",
    bezel: "var(--color-frame-bezel)",
    pattern: STAR_LATTICE,
  },
  night: {
    tone: "dark",
    tokens: {
      "--color-bg": "#0d1733",
      "--color-surface": "#16224a",
      // On the night page the primary is the gold itself (a navy primary would vanish), with dark text on it.
      "--color-primary": "var(--color-gold)",
      "--color-primary-contrast": "#101a36",
      "--color-primary-contrast-rgb": "16, 26, 54",
      "--color-gold-on-primary": "#101a36",
      "--color-text-primary": "#f3e9d2",
      "--color-text-muted": "#aeb4c8",
      "--color-panel-divider": "rgba(198, 161, 91, 0.4)",
      "--color-shadow-rgb": "2, 6, 20",
      "--color-frame-bezel": "#050a18",
      "--color-frame-backdrop": "#0a1128",
      "--color-glass-tint": "rgba(30, 44, 90, 0.5)",
      "--color-glass-tint-soft": "rgba(30, 44, 90, 0.3)",
      "--color-glass-highlight": "rgba(255, 255, 255, 0.25)",
      "color-scheme": "dark",
    },
    cardRgb: "18, 29, 64",
    cardBorder: "rgba(214, 178, 108, 0.45)",
    veilRgb: "11, 18, 44",
    swatch: "#101a3a",
    bezel: "#050a18",
    reader: { men: NIGHT_READER, women: NIGHT_READER },
  },
  nature: {
    tone: "light",
    tokens: {
      "--color-bg": "#e9eddf",
      "--color-surface": "#f6f7ef",
      "--color-text-primary": "#2f3d2a",
      "--color-text-muted": "#58654e",
      "--color-frame-backdrop": "#dde4d0",
    },
    cardRgb: "248, 249, 240",
    cardBorder: "rgba(176, 152, 96, 0.45)",
    veilRgb: "233, 237, 223",
    swatch: "#c9d3b2",
    bezel: "#15241a",
    originalPrimary: { primary: "#24553a", contrast: "#f4f1e2", contrastRgb: "244, 241, 226", shadowRgb: "28, 52, 36" },
    reader: {
      men: { page: ["#22402e", "#183022"], surface: "#fbfaf2", ink: "#22331f", inkMuted: "#56634c", onPage: "#f1ead4", onPageMuted: "rgba(241, 234, 212, 0.7)", category: ["#f2f4e9", "#e7ecdc"] },
      women: { page: ["#f2f5ea", "#e6ecdb"], surface: "#fdfdf7", ink: "#2f3d2a", inkMuted: "#56634c", onPage: "#2f3d2a", onPageMuted: "#56634c", category: ["#f2f4e9", "#e7ecdc"] },
    },
  },
  sunset: {
    tone: "light",
    tokens: {
      "--color-bg": "#f3e6ef",
      "--color-surface": "#fbf4f8",
      "--color-text-primary": "#3b2f4f",
      "--color-text-muted": "#65577a",
      "--color-frame-backdrop": "#eadbea",
    },
    cardRgb: "253, 245, 249",
    cardBorder: "rgba(201, 160, 120, 0.45)",
    veilRgb: "243, 230, 239",
    swatch: "#d9b3d6",
    bezel: "#241733",
    originalPrimary: { primary: "#4a2c69", contrast: "#fbf1f6", contrastRgb: "251, 241, 246", shadowRgb: "58, 32, 82" },
    reader: {
      men: { page: ["#3d2756", "#2b1b3f"], surface: "#fffafc", ink: "#33264a", inkMuted: "#65577a", onPage: "#f7eaf2", onPageMuted: "rgba(247, 234, 242, 0.7)", category: ["#fbf4f8", "#f2e5ee"] },
      women: { page: ["#faf1f6", "#f1e4ee"], surface: "#fffbfd", ink: "#3b2f4f", inkMuted: "#65577a", onPage: "#3b2f4f", onPageMuted: "#65577a", category: ["#fbf4f8", "#f2e5ee"] },
    },
  },
};

const base = () => (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
export const wallpaperUrl = (id: WallpaperId) => `${base()}themes/wall-${id}.jpg`;
export const wallpaperThumbUrl = (id: WallpaperId) => `${base()}themes/thumb-${id}.jpg`;
export const archSceneUrl = (look: LookId) => `${base()}themes/arch-${look}.jpg`;
/** The look's tile in Settings: its arch scene (so the four looks read apart from the wallpaper tiles). */
export const archThumbUrl = (look: LookId) => `${base()}themes/thumb-arch-${look}.jpg`;

// ---- stored choice -----------------------------------------------------------

const isLook = (v: unknown): v is LookId => typeof v === "string" && (LOOK_IDS as readonly string[]).includes(v);
const isWallpaper = (v: unknown): v is WallpaperChoice => v === "theme" || v === "custom" || (typeof v === "string" && (WALLPAPER_IDS as readonly string[]).includes(v));

export function loadLookSettings(): LookSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LOOK_STORAGE_KEY) : null;
    const v = raw ? (JSON.parse(raw) as Partial<LookSettings>) : null;
    if (!v || typeof v !== "object") return DEFAULT_LOOK_SETTINGS;
    const opacity = typeof v.cardOpacity === "number" && Number.isFinite(v.cardOpacity) ? Math.min(CARD_OPACITY_MAX, Math.max(CARD_OPACITY_MIN, v.cardOpacity)) : DEFAULT_LOOK_SETTINGS.cardOpacity;
    return {
      look: isLook(v.look) ? v.look : DEFAULT_LOOK_SETTINGS.look,
      wallpaper: isWallpaper(v.wallpaper) ? v.wallpaper : DEFAULT_LOOK_SETTINGS.wallpaper,
      cardOpacity: opacity,
      autoDark: v.autoDark === "device" || v.autoDark === "time" ? v.autoDark : "off",
    };
  } catch {
    return DEFAULT_LOOK_SETTINGS;
  }
}

export function saveLookSettings(value: LookSettings): void {
  try {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // A visual preference only.
  }
}

export interface CustomWallpaper {
  dataUrl: string;
  tone: Tone;
}

export function loadCustomWallpaper(): CustomWallpaper | null {
  try {
    const raw = localStorage.getItem(CUSTOM_WALLPAPER_KEY);
    const v = raw ? (JSON.parse(raw) as CustomWallpaper) : null;
    return v && typeof v.dataUrl === "string" && v.dataUrl.startsWith("data:image/") ? { dataUrl: v.dataUrl, tone: v.tone === "dark" ? "dark" : "light" } : null;
  } catch {
    return null;
  }
}

/** Saves the user's photo; false when the device has no room for it. */
export function saveCustomWallpaper(value: CustomWallpaper | null): boolean {
  try {
    if (value) localStorage.setItem(CUSTOM_WALLPAPER_KEY, JSON.stringify(value));
    else localStorage.removeItem(CUSTOM_WALLPAPER_KEY);
    return true;
  } catch {
    return false;
  }
}

// ---- what is shown -------------------------------------------------------------

/** The look actually shown: Night when automatic dark mode says so, else the chosen look. */
export function effectiveLook(settings: LookSettings, deviceDark: boolean, now: Date = new Date()): LookId {
  if (settings.autoDark === "device" && deviceDark) return "night";
  if (settings.autoDark === "time") {
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes >= 18 * 60 + 30 || minutes < 5 * 60 + 30) return "night";
  }
  return settings.look;
}

/** The wallpaper image shown on Home, and its tone. */
export function shownWallpaper(settings: LookSettings, look: LookId, custom: CustomWallpaper | null): { url: string; tone: Tone } {
  if (settings.wallpaper === "custom" && custom) return { url: custom.dataUrl, tone: custom.tone };
  // Automatic dark mode at night shows the night wallpaper with it, unless the user chose a wallpaper of their own.
  const id: WallpaperId = settings.wallpaper === "theme" || settings.wallpaper === "custom" ? look : settings.wallpaper;
  return { url: wallpaperUrl(id), tone: WALLPAPER_TONE[id] };
}

/** The veil's strength over the wallpaper: light when the wallpaper suits the look's text, stronger when it doesn't. */
export const veilAlpha = (look: LookId, wallpaperTone: Tone) => (LOOKS[look].tone === wallpaperTone ? 0.22 : 0.62);

/** The CSS custom properties of a look, on top of the identity's. */
export function lookTokens(look: LookId): Record<string, string> {
  const c = LOOKS[look];
  return {
    ...c.tokens,
    "--look-card-rgb": c.cardRgb,
    "--look-card-border": c.cardBorder,
    "--look-veil-rgb": c.veilRgb,
    // Gold for small marks drawn on the card colour (darker on light cards, lighter on the night card).
    "--look-accent-on-card": c.tone === "dark" ? "#e3c27e" : "#a9823f",
    // A deep panel and the gold on it (the Adhkar screen's Audio card): the primary on light looks; on
    // Night (whose primary is the gold) a deep navy, so its gold drawing stays visible.
    "--look-deep-surface": c.tone === "dark" ? "#1c2b5e" : "var(--color-primary)",
    "--look-on-deep": c.tone === "dark" ? "#e9c983" : "var(--color-gold-on-primary)",
    "--look-arch-scene": `url("${archSceneUrl(look)}")`,
    // The phone frame and the space around it follow the look (never an unrelated flat colour):
    // .device-backdrop shows the wallpaper itself, blurred under this veil colour.
    "--look-bezel": c.bezel,
    "--look-page-rgb": c.veilRgb,
    "--look-pattern": c.pattern ?? "none",
  };
}

/**
 * Set on <html> while the Mushaf is open: no look rule matches then (every one is `:not([data-look-off])`)
 * and the wallpaper isn't drawn, so the Qur'an reader shows exactly its own appearance — the identity's
 * colours and the chosen interface colour, as before the appearance themes existed.
 */
export const LOOK_OFF_ATTRIBUTE = "data-look-off";

export function setLookSuspended(suspended: boolean): void {
  if (typeof document !== "undefined") document.documentElement.toggleAttribute(LOOK_OFF_ATTRIBUTE, suspended);
}

/** `html[data-look="…"]`, matching only while the look is in effect (not on the Mushaf). */
const onLook = (look: LookId) => `html[data-look="${look}"]:not([${LOOK_OFF_ATTRIBUTE}])`;

/** A look's own primary (none for Classic and Night). */
export function lookOriginalPrimaryTokens(look: LookId): Record<string, string> {
  const p = LOOKS[look].originalPrimary;
  if (!p) return {};
  return {
    "--color-primary": p.primary,
    "--color-primary-contrast": p.contrast,
    "--color-primary-contrast-rgb": p.contrastRgb,
    "--color-shadow-rgb": p.shadowRgb,
  };
}

/** The --wa-* tokens of a look's reading colours. */
export function readerTokens(r: ReaderColors): Record<string, string> {
  const tokens: Record<string, string> = {
    "--wa-page-bg": `linear-gradient(180deg, ${r.page[0]} 0%, ${r.page[1]} 100%)`,
    "--wa-surface": r.surface,
    "--wa-ink": r.ink,
    "--wa-ink-muted": r.inkMuted,
    "--wa-on-page": r.onPage,
    "--wa-on-page-muted": r.onPageMuted,
    "--wa-category-bg": `linear-gradient(180deg, ${r.category[0]} 0%, ${r.category[1]} 100%)`,
  };
  if (r.gold) {
    tokens["--wa-gold"] = r.gold;
    const rgb = r.gold.match(/\w\w/g)!.map((h) => parseInt(h, 16)).join(", ");
    tokens["--wa-gold-soft"] = `rgba(${rgb}, 0.32)`;
    tokens["--wa-gold-hairline"] = `rgba(${rgb}, 0.3)`;
    tokens["--wa-badge-bg"] = `rgba(${rgb}, 0.2)`;
  }
  return tokens;
}

const block = (selector: string, tokens: Record<string, string>) =>
  `${selector} {\n${Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}`;

/**
 * Every look's rules (more specific than the identity's [data-theme] rules, so the look's tones win).
 * Also: the page behind the app (<html>, seen around the phone frame) in the look's own colour, Nature's and
 * Sunset's own primary, and the Adhkar screens' reading colours.
 */
export function lookStylesheet(): string {
  return LOOK_IDS.map((look) => {
    const rules = [block(`${onLook(look)} [data-theme]`, lookTokens(look)), `${onLook(look)} {\n  background: rgb(${LOOKS[look].veilRgb});\n}`];
    const primary = lookOriginalPrimaryTokens(look);
    if (Object.keys(primary).length) rules.push(block(`${onLook(look)} [data-theme]`, primary));
    const reader = LOOKS[look].reader;
    if (reader) for (const id of ["men", "women"] as const) rules.push(block(`${onLook(look)} [data-theme="${id}"]`, readerTokens(reader[id])));
    return rules.join("\n");
  }).join("\n\n");
}

/** Average brightness of an image (0..255) → its tone; used for a user's photo. */
export function toneOfImage(dataUrl: string): Promise<Tone> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 40;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("light");
        ctx.drawImage(img, 0, 0, 24, 40);
        const d = ctx.getImageData(0, 0, 24, 40).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        resolve(sum / (d.length / 4) < 128 ? "dark" : "light");
      } catch {
        resolve("light");
      }
    };
    img.onerror = () => resolve("light");
    img.src = dataUrl;
  });
}
