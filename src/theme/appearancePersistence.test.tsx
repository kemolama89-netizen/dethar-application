// @vitest-environment jsdom
//
// C1 — the selected language and men/women theme must survive an app
// restart. "Restart" here is a completely fresh mount of the real providers
// with nothing carried over except what's in localStorage.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { ThemeProvider, useTheme } from "./ThemeContext";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_THEME,
  LANGUAGE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  loadLanguagePreference,
  loadThemePreference,
  saveLanguagePreference,
  saveThemePreference,
} from "../lib/appearancePreferences";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let latestLanguage: ReturnType<typeof useLanguage> | undefined;
let latestTheme: ReturnType<typeof useTheme> | undefined;
function Probe() {
  latestLanguage = useLanguage();
  latestTheme = useTheme();
  return null;
}

let container: HTMLDivElement;
let root: Root;

async function mountApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <ThemeProvider>
          <Probe />
        </ThemeProvider>
      </LanguageProvider>,
    );
  });
}

async function unmountApp() {
  await act(async () => root.unmount());
  document.body.removeChild(container);
  latestLanguage = undefined;
  latestTheme = undefined;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dir = "rtl";
  document.documentElement.lang = "ar";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("appearancePreferences — load/save", () => {
  it("defaults to Arabic + men on a first launch (nothing stored)", () => {
    expect(loadLanguagePreference()).toBe(DEFAULT_LANGUAGE);
    expect(loadThemePreference()).toBe(DEFAULT_THEME);
    expect(DEFAULT_LANGUAGE).toBe("ar");
    expect(DEFAULT_THEME).toBe("men");
  });

  it("round-trips every allowed value", () => {
    for (const language of ["ar", "en"] as const) {
      saveLanguagePreference(language);
      expect(loadLanguagePreference()).toBe(language);
    }
    for (const theme of ["men", "women"] as const) {
      saveThemePreference(theme);
      expect(loadThemePreference()).toBe(theme);
    }
  });

  it("falls back to the defaults for any stored value outside the allowed set", () => {
    for (const bad of ["fr", "", "EN", "null", "{\"a\":1}", "undefined"]) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, bad);
      localStorage.setItem(THEME_STORAGE_KEY, bad);
      expect(loadLanguagePreference()).toBe("ar");
      expect(loadThemePreference()).toBe("men");
    }
  });

  it("never throws when storage is unreadable or unwritable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(loadLanguagePreference()).toBe("ar");
    expect(loadThemePreference()).toBe("men");
    expect(() => saveLanguagePreference("en")).not.toThrow();
    expect(() => saveThemePreference("women")).not.toThrow();
  });
});

describe("LanguageProvider / ThemeProvider — persistence across a restart", () => {
  it("starts in Arabic RTL + men on a first launch, and does not write anything until the user changes something", async () => {
    await mountApp();
    expect(latestLanguage?.language).toBe("ar");
    expect(latestLanguage?.dir).toBe("rtl");
    expect(latestTheme?.theme).toBe("men");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    await unmountApp();
  });

  it("a language change is stored and restored as English LTR after a restart, and can be switched back and restored again", async () => {
    await mountApp();
    await act(async () => latestLanguage!.toggleLanguage());
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    await unmountApp();

    // Simulated restart: the <html> attributes are back at index.html's defaults.
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    await mountApp();
    expect(latestLanguage?.language).toBe("en");
    expect(latestLanguage?.dir).toBe("ltr");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");

    await act(async () => latestLanguage!.toggleLanguage());
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("ar");
    await unmountApp();

    await mountApp();
    expect(latestLanguage?.language).toBe("ar");
    expect(latestLanguage?.dir).toBe("rtl");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    await unmountApp();
  });

  it("a theme change is stored and restored (with the matching logo) after a restart", async () => {
    await mountApp();
    const menLogo = latestTheme!.logoSrc;
    await act(async () => latestTheme!.toggleTheme());
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("women");
    await unmountApp();

    await mountApp();
    expect(latestTheme?.theme).toBe("women");
    expect(latestTheme?.logoSrc).toContain("dithar_female_ar");
    expect(latestTheme?.logoSrc).not.toBe(menLogo);
    await unmountApp();
  });

  it("language and theme are stored independently — changing one never changes the other's stored value", async () => {
    await mountApp();
    await act(async () => latestLanguage!.toggleLanguage());
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    await act(async () => latestTheme!.toggleTheme());
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("women");
    await unmountApp();

    await mountApp();
    expect(latestLanguage?.language).toBe("en");
    expect(latestTheme?.theme).toBe("women");
    expect(latestTheme?.logoSrc).toContain("dithar_female_en");
    await unmountApp();
  });

  it("corrupt stored values start on the defaults instead of breaking the app", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "klingon");
    localStorage.setItem(THEME_STORAGE_KEY, "{not json");
    await mountApp();
    expect(latestLanguage?.language).toBe("ar");
    expect(latestLanguage?.dir).toBe("rtl");
    expect(latestTheme?.theme).toBe("men");
    await unmountApp();
  });

  it("still switches language/theme in the current session when storage refuses writes", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    await mountApp();
    await act(async () => latestLanguage!.toggleLanguage());
    await act(async () => latestTheme!.toggleTheme());
    expect(latestLanguage?.language).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");
    expect(latestTheme?.theme).toBe("women");
    await unmountApp();
  });
});
