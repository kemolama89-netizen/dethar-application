// @vitest-environment jsdom
// Sharing a dhikr: the card's share button opens a sheet offering text,
// image and copy; text goes to the system share sheet with the complete
// text and its reference, falling back to the clipboard.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MiscDuaCard } from "./MiscDuaCard";
import { LanguageProvider } from "../theme/LanguageContext";
import { MISC_DUAS } from "../data/misc-library";
import { backOverlayCount } from "../lib/backOverlays";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const item = MISC_DUAS.find((d) => d.source_ar)!;

beforeEach(async () => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<LanguageProvider><MiscDuaCard item={item} isFavorite={false} onToggleFavorite={() => {}} onShowMeaning={() => {}} /></LanguageProvider>));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "share");
});

const menu = () => document.querySelector("[data-share-menu]");
const openMenu = async () => {
  const share = [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.querySelector(".lucide-share-2"))!;
  await act(async () => share.click());
};

describe("ShareMenu", () => {
  it("offers text, image and copy, and system Back closes it", async () => {
    expect(menu()).toBeNull();
    await openMenu();
    expect([...document.querySelectorAll("[data-share-option]")].map((b) => b.getAttribute("data-share-option"))).toEqual(["text", "image", "copy"]);
    expect(backOverlayCount()).toBe(1);
    await act(async () => document.querySelector<HTMLButtonElement>("[data-share-menu] [aria-label='إغلاق']")!.click());
    expect(menu()).toBeNull();
  });

  it("shares the complete text with its reference through the system share sheet", async () => {
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    await openMenu();
    await act(async () => document.querySelector<HTMLButtonElement>("[data-share-option='text']")!.click());
    const [[payload]] = share.mock.calls as unknown as [[{ text: string }]];
    expect(payload.text).toContain(item.text_ar);
    expect(payload.text).toContain(item.source_ar);
    expect(menu()).toBeNull();
  });

  it("copies the same text when no share sheet exists, and says so", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await openMenu();
    await act(async () => document.querySelector<HTMLButtonElement>("[data-share-option='text']")!.click());
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(item.text_ar));
    expect(document.querySelector("[data-share-status]")!.textContent).toBe("تم نسخ النص");
  });
});
