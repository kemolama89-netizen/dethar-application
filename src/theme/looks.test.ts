// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  CARD_OPACITY_MIN,
  DEFAULT_LOOK_SETTINGS,
  LOOKS,
  LOOK_IDS,
  LOOK_STORAGE_KEY,
  WALLPAPER_IDS,
  archSceneUrl,
  absoluteBase,
  archThumbUrl,
  effectiveLook,
  loadLookSettings,
  LOOK_OFF_ATTRIBUTE,
  lookStylesheet,
  readerTokens,
  saveLookSettings,
  shownWallpaper,
  veilAlpha,
  wallpaperThumbUrl,
  wallpaperUrl,
} from "./looks";

beforeEach(() => localStorage.clear());

describe("appearance themes (looks)", () => {
  it("default to Classic with the theme's own wallpaper, and keep a saved choice", () => {
    expect(loadLookSettings()).toEqual(DEFAULT_LOOK_SETTINGS);
    saveLookSettings({ look: "sunset", wallpaper: "sea", cardOpacity: 0.7, autoDark: "time" });
    expect(loadLookSettings()).toEqual({ look: "sunset", wallpaper: "sea", cardOpacity: 0.7, autoDark: "time" });
  });

  it("ignore anything unknown or out of range in storage", () => {
    localStorage.setItem(LOOK_STORAGE_KEY, JSON.stringify({ look: "neon", wallpaper: "moon", cardOpacity: 0.1, autoDark: "always" }));
    expect(loadLookSettings()).toEqual({ ...DEFAULT_LOOK_SETTINGS, cardOpacity: CARD_OPACITY_MIN });
    localStorage.setItem(LOOK_STORAGE_KEY, "{not json");
    expect(loadLookSettings()).toEqual(DEFAULT_LOOK_SETTINGS);
  });

  it("automatic dark mode: Night when the device is dark, or between 18:30 and 05:30; else the chosen look", () => {
    const s = { ...DEFAULT_LOOK_SETTINGS, look: "nature" as const };
    expect(effectiveLook({ ...s, autoDark: "device" }, true)).toBe("night");
    expect(effectiveLook({ ...s, autoDark: "device" }, false)).toBe("nature");
    expect(effectiveLook({ ...s, autoDark: "off" }, true)).toBe("nature");
    const at = (h: number, m: number) => new Date(2026, 9, 31, h, m);
    expect(effectiveLook({ ...s, autoDark: "time" }, false, at(18, 29))).toBe("nature");
    expect(effectiveLook({ ...s, autoDark: "time" }, false, at(18, 30))).toBe("night");
    expect(effectiveLook({ ...s, autoDark: "time" }, false, at(5, 29))).toBe("night");
    expect(effectiveLook({ ...s, autoDark: "time" }, false, at(5, 30))).toBe("nature");
  });

  it("show the look's own wallpaper, a chosen one, or the user's photo — with a stronger veil when its tone doesn't suit the look", () => {
    expect(shownWallpaper(DEFAULT_LOOK_SETTINGS, "night", null)).toEqual({ url: wallpaperUrl("night"), tone: "dark" });
    expect(shownWallpaper({ ...DEFAULT_LOOK_SETTINGS, wallpaper: "sea" }, "night", null)).toEqual({ url: wallpaperUrl("sea"), tone: "light" });
    const photo = { dataUrl: "data:image/jpeg;base64,AAA", tone: "dark" as const };
    expect(shownWallpaper({ ...DEFAULT_LOOK_SETTINGS, wallpaper: "custom" }, "classic", photo)).toEqual({ url: photo.dataUrl, tone: "dark" });
    // A custom choice without a photo falls back to the look's own wallpaper.
    expect(shownWallpaper({ ...DEFAULT_LOOK_SETTINGS, wallpaper: "custom" }, "classic", null).url).toBe(wallpaperUrl("classic"));
    expect(veilAlpha("classic", "light")).toBeLessThan(veilAlpha("classic", "dark"));
    expect(veilAlpha("night", "dark")).toBeLessThan(veilAlpha("night", "light"));
  });

  it("one stylesheet for all four looks; Classic changes no colour (it is the original appearance)", () => {
    const css = lookStylesheet();
    for (const look of LOOK_IDS) expect(css).toContain(`html[data-look="${look}"]:not([data-look-off]) [data-theme] {`);
    const classic = css.slice(css.indexOf('html[data-look="classic"]'), css.indexOf("}", css.indexOf('html[data-look="classic"]')));
    expect(classic).not.toMatch(/^\s*--color-/m); // sets no --color-* property
    expect(classic).toContain("--look-arch-scene");
  });

  // WCAG contrast of the look's text on its page and on its cards.
  const lum = (hex: string) => {
    const c = hex.replace("#", "").match(/../g)!.map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const rgbHex = (rgb: string) => "#" + rgb.split(",").map((v) => Number(v.trim()).toString(16).padStart(2, "0")).join("");

  for (const look of ["night", "nature", "sunset"] as const) {
    it(`${look}: text reads clearly on its page and its (solid) cards`, () => {
      const t = LOOKS[look].tokens;
      expect(contrast(t["--color-text-primary"], t["--color-bg"])).toBeGreaterThanOrEqual(7);
      expect(contrast(t["--color-text-muted"], t["--color-bg"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["--color-text-primary"], rgbHex(LOOKS[look].cardRgb))).toBeGreaterThanOrEqual(7);
    });
  }

  it("every wallpaper, its tile and every arch scene exists in public/themes, small enough for a phone", async () => {
    const fs = await import(/* @vite-ignore */ ["node", "fs"].join(":"));
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd();
    const file = (url: string) => `${cwd}/public${url.replace(/^.*?themes\//, "/themes/")}`;
    for (const url of [...WALLPAPER_IDS.flatMap((id) => [wallpaperUrl(id), wallpaperThumbUrl(id)]), ...LOOK_IDS.flatMap((look) => [archSceneUrl(look), archThumbUrl(look)])]) {
      const size = fs.statSync(file(url)).size;
      expect(size, url).toBeGreaterThan(300);
      expect(size, url).toBeLessThan(120_000);
    }
  });

  it("the page around the phone and its frame follow the look (never an unrelated palette colour)", () => {
    const css = lookStylesheet();
    for (const look of LOOK_IDS) {
      expect(css).toContain(`html[data-look="${look}"]:not([data-look-off]) {\n  background: rgb(${LOOKS[look].veilRgb});`);
      const rule = css.slice(css.indexOf(`html[data-look="${look}"]:not([data-look-off]) [data-theme] {`));
      expect(rule.slice(0, rule.indexOf("}"))).toContain(`--look-bezel: ${LOOKS[look].bezel};`);
      expect(rule.slice(0, rule.indexOf("}"))).toContain(`--look-page-rgb: ${LOOKS[look].veilRgb};`);
    }
  });

  it("Nature and Sunset bring their own primary by themselves (no colour choice is involved any more)", () => {
    const css = lookStylesheet();
    expect(css).toContain(`html[data-look="nature"]:not([data-look-off]) [data-theme] {\n  --color-primary: ${LOOKS.nature.originalPrimary!.primary};`);
    expect(css).toContain(`html[data-look="sunset"]:not([data-look-off]) [data-theme] {\n  --color-primary: ${LOOKS.sunset.originalPrimary!.primary};`);
    expect(css).not.toContain("data-palette");
    expect(LOOKS.classic.originalPrimary).toBeUndefined();
    expect(LOOKS.night.originalPrimary).toBeUndefined();
  });

  for (const look of ["nature", "sunset"] as const) {
    it(`${look}: its own primary reads on the page and the cards, and carries its light text and the gold`, () => {
      const p = LOOKS[look].originalPrimary!;
      const t = LOOKS[look].tokens;
      expect(contrast(p.primary, t["--color-surface"])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.primary, rgbHex(LOOKS[look].cardRgb))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.contrast, p.primary)).toBeGreaterThanOrEqual(7);
      expect(rgbHex(p.contrastRgb)).toBe(p.contrast);
      expect(contrast("#c6a15b", p.primary)).toBeGreaterThanOrEqual(3); // the gold on the primary (the navigation's active item)
    });
  }

  it("never reach the Mushaf: every look rule stops matching while it is open", () => {
    expect(LOOK_OFF_ATTRIBUTE).toBe("data-look-off");
    const selectors = lookStylesheet()
      .split("\n")
      .filter((line) => line.endsWith("{"));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector, selector).toContain(":not([data-look-off])");
  });

  for (const look of ["night", "nature", "sunset"] as const) {
    for (const id of ["men"] as const) {
      it(`${look} (${id}): the Adhkar screens follow the look, and their text stays readable`, () => {
        const r = LOOKS[look].reader![id];
        expect(contrast(r.ink, r.surface)).toBeGreaterThanOrEqual(7);
        expect(contrast(r.inkMuted, r.surface)).toBeGreaterThanOrEqual(4.5);
        for (const stop of r.page) expect(contrast(r.onPage, stop)).toBeGreaterThanOrEqual(7);
        // Titles on the category screens are drawn in the ink directly on the category page.
        for (const stop of r.category) expect(contrast(r.ink, stop)).toBeGreaterThanOrEqual(7);
        expect(lookStylesheet()).toContain(`html[data-look="${look}"]:not([data-look-off]) [data-theme="${id}"] {\n  --wa-page-bg: ${readerTokens(r)["--wa-page-bg"]};`);
      });
    }
  }

  it("Classic alone draws its geometric lattice on Home; Classic leaves the Adhkar screens' original colours", () => {
    const css = lookStylesheet();
    expect(LOOKS.classic.pattern).toContain("data:image/svg+xml");
    expect(LOOKS.classic.reader).toBeUndefined();
    for (const look of ["night", "nature", "sunset"] as const) expect(LOOKS[look].pattern).toBeUndefined();
    expect(css).not.toContain('html[data-look="classic"]:not([data-look-off]) [data-theme="men"]');
  });

  it("hand out absolute image URLs (a relative url() in a CSS variable would resolve against assets/*.css)", () => {
    for (const url of [wallpaperUrl("night"), wallpaperThumbUrl("sea"), archSceneUrl("classic"), archThumbUrl("nature")]) {
      expect(url, url).toMatch(/^(https?:\/\/|\/)/);
      expect(url).not.toMatch(/^\.\//);
    }
    // Production builds' relative base, on GitHub Pages and in the Android WebView:
    expect(absoluteBase("./", "https://kemolama89-netizen.github.io/dethar-application/")).toBe("https://kemolama89-netizen.github.io/dethar-application/");
    expect(absoluteBase("./", "https://kemolama89-netizen.github.io/dethar-application/index.html")).toBe("https://kemolama89-netizen.github.io/dethar-application/");
    expect(absoluteBase("./", "https://localhost/")).toBe("https://localhost/");
    // Already absolute (development): unchanged.
    expect(absoluteBase("/", "http://localhost:5173/")).toBe("/");
    expect(absoluteBase("/dethar-application/", undefined)).toBe("/dethar-application/");
  });
});
