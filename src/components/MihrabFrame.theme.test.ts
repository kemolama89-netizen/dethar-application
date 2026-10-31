// The prayer-times mihrab follows the active appearance (identity + palette):
// every colour is a theme token (or a darker/lighter mix of one), applied
// through `style` so a theme switch repaints it at once. Checked on the
// sources (jsdom can't lay the frame out); the rendered colours across every
// theme were verified in a real browser.
import { describe, expect, it } from "vitest";

const sources = import.meta.glob<string>(["./MihrabFrame.tsx", "./PrayerTimesPanel.tsx"], { query: "?raw", import: "default", eager: true });
const frame = sources["./MihrabFrame.tsx"];
const panel = sources["./PrayerTimesPanel.tsx"];
const hexes = (src: string) => [...src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());

describe("the mihrab follows the theme", () => {
  it("has no fixed colour of its own — only white/black to lighten or darken a theme token", () => {
    expect(new Set(hexes(frame))).toEqual(new Set(["#ffffff", "#000000"]));
    expect(frame).not.toMatch(/rgba?\(\s*\d/);
  });

  it("its stone is the theme's primary and its metalwork the theme's accent-on-primary", () => {
    expect(frame).toContain('const MIHRAB_STONE = "var(--color-primary)"');
    expect(frame).toContain('const GOLD = "var(--color-gold-on-primary)"');
    for (const name of ["GOLD_HI", "GOLD_MID", "GOLD_LO", "LAMP_GLOW"]) expect(frame).toMatch(new RegExp(`const ${name} = shadeOf\\("--color-gold-on-primary"`));
    for (const name of ["SURROUND", "SURROUND_DEEP", "SHADE"]) expect(frame).toMatch(new RegExp(`const ${name} = shadeOf\\("--color-primary"`));
  });

  it("never paints a theme colour through an SVG attribute (they don't resolve var()) — always through style", () => {
    expect(frame).not.toMatch(/\s(fill|stroke|floodColor)=\{(GOLD_HI|GOLD_MID|GOLD_LO|GOLD|SURROUND_DEEP|SURROUND|SHADE|LAMP_GLOW|MIHRAB_STONE)\}/);
  });

  // Home's panel now shows the appearance theme's scene in an arch (SceneArch, theme/looks.ts) instead
  // of the mihrab: its text is light over the shaded scene in every theme, so its "on primary" colours are
  // set once, as tokens on the panel (HERO_PANEL_VARS), and everything inside follows them.
  it("Home's panel shows the theme's scene arch, its on-scene colours set once as tokens on the panel", () => {
    expect(panel).toContain("<SceneArch />");
    expect(panel).not.toContain("<MihrabFrame");
    expect(panel).toMatch(/const HERO_PANEL_VARS = \{[^}]*"--color-primary-contrast": "#fffaf0"[^}]*"--color-gold-on-primary": "#f3cf86"/s);
    expect(panel).toContain("...HERO_PANEL_VARS,");
  });
});
