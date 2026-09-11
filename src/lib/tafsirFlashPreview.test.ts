// @vitest-environment jsdom
//
// Regression coverage for the Tafsir Flash preview pointer's core
// requirement (see tafsirFlashPreview.ts's own doc comment): it must
// advance exactly once per REAL reload — never on a re-render, remount,
// or in-app navigation. Each `import("./tafsirFlashPreview")` after
// `vi.resetModules()` simulates one fresh reload (a module is evaluated
// exactly once per real page load, same as in the browser), so this is
// the most faithful way to test that distinction without a real browser.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { tafsirFlashes } from "../data/tafsirFlashes";

const STORAGE_KEY = "dithar:tafsir:previewIndex:v1";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

async function simulateReload() {
  vi.resetModules();
  const mod = await import("./tafsirFlashPreview");
  return mod.getPreviewTafsirFlash();
}

describe("getPreviewTafsirFlash", () => {
  it("returns flash #1 on the very first load", async () => {
    const flash = await simulateReload();
    expect(flash.id).toBe(1);
  });

  it("advances to the next flash on each subsequent reload", async () => {
    expect((await simulateReload()).id).toBe(1);
    expect((await simulateReload()).id).toBe(2);
    expect((await simulateReload()).id).toBe(3);
  });

  it("wraps back to flash #1 after the last flash", async () => {
    localStorage.setItem(STORAGE_KEY, String(tafsirFlashes.length - 1)); // pointing at the last flash (0-based)
    const flash = await simulateReload();
    expect(flash.id).toBe(1);
  });

  it("does NOT advance across multiple calls within the same load", async () => {
    const mod = await import("./tafsirFlashPreview");
    const first = mod.getPreviewTafsirFlash();
    const second = mod.getPreviewTafsirFlash();
    const third = mod.getPreviewTafsirFlash();
    expect(first.id).toBe(second.id);
    expect(second.id).toBe(third.id);
  });

  it("recovers to flash #1 when storage is corrupt", async () => {
    localStorage.setItem(STORAGE_KEY, "not-a-number");
    const flash = await simulateReload();
    expect(flash.id).toBe(1);
  });
});
