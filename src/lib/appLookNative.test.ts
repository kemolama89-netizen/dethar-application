// Native draws the floating Tasbeeh and the reminder cover without the WebView,
// from its own table of each look's colours (AppLook.kt). That table must stay
// the app's own colours, and native's automatic dark mode the app's own rule.
import { describe, expect, it } from "vitest";
import { LOOKS, LOOK_IDS, effectiveLook, DEFAULT_LOOK_SETTINGS } from "../theme/looks";
import kotlin from "../../android/app/src/main/java/com/dithar/app/look/AppLook.kt?raw";
import indexHtml from "../../index.html?raw";

function nativeColors(look: string) {
  const row = new RegExp(`"${look}" to Colors\\(page = "(.+?)", deepTop = "(.+?)", deepBottom = "(.+?)", ink = "(.+?)", gold = "(.+?)"\\)`).exec(kotlin);
  if (!row) throw new Error(`${look} is not in AppLook.kt`);
  const [, page, deepTop, deepBottom, ink, gold] = row;
  return { page, deepTop, deepBottom, ink, gold };
}

// Vitest empties CSS imports, so the stylesheet is read as a file.
const nodeFs = () => import(/* @vite-ignore */ ["node", "fs"].join(":"));
const css: string = (await nodeFs()).readFileSync(new URL("../index.css", import.meta.url), "utf8");

const cssToken = (name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(css)![1].trim();

describe("AppLook.kt", () => {
  it("has the deep page colours, ink and gold of each look that defines its own", () => {
    for (const look of ["night", "nature", "sunset"] as const) {
      const reader = LOOKS[look].reader!.men;
      expect(nativeColors(look)).toMatchObject({ deepTop: reader.page[0], deepBottom: reader.page[1], ink: reader.onPage, gold: reader.gold ?? cssToken("--color-gold") });
    }
  });

  it("has the identity's own for Classic, which overrides no colour", () => {
    const [, top, bottom] = /--wa-page-bg: linear-gradient\(180deg, (#\w+) 0%, (#\w+) 100%\)/.exec(css)!;
    expect(nativeColors("classic")).toMatchObject({ deepTop: top, deepBottom: bottom, ink: cssToken("--wa-on-page"), gold: cssToken("--color-gold") });
  });

  it("has each look's page colour, the one the launch cover uses", () => {
    expect(nativeColors("classic").page).toBe(cssToken("--color-bg"));
    for (const look of ["night", "nature", "sunset"] as const) {
      expect(nativeColors(look).page).toBe(LOOKS[look].tokens["--color-bg"]);
      expect(indexHtml).toContain(`${look}: "${LOOKS[look].tokens["--color-bg"]}"`);
    }
  });

  it("covers every look, and turns to Night at the same minutes as the app", () => {
    for (const look of LOOK_IDS) expect(() => nativeColors(look)).not.toThrow();
    expect(kotlin).toContain("NIGHT_FROM_MINUTES = 18 * 60 + 30");
    expect(kotlin).toContain("NIGHT_UNTIL_MINUTES = 5 * 60 + 30");
    const at = (h: number, m: number) => effectiveLook({ ...DEFAULT_LOOK_SETTINGS, autoDark: "time" }, false, new Date(2026, 0, 1, h, m));
    expect([at(18, 29), at(18, 30), at(5, 29), at(5, 30)]).toEqual(["classic", "night", "night", "classic"]);
  });
});
