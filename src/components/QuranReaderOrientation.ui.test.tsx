// @vitest-environment jsdom
// The Qur'an reader's Mushaf information (Juz, Hizb, quarter-hizb markers,
// page) and its orientation button — it turns the SCREEN (the platform's
// lock is mocked here), never the page: where the screen can't be turned,
// nothing is rotated and a note suggests turning the phone.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

// `canTurn`: whether this platform turns the screen (the app always does; some browsers do).
const native = vi.hoisted(() => ({ canTurn: false, calls: [] as string[] }));
vi.mock("../lib/orientationNative", () => ({
  lockReaderOrientation: async (o: string) => {
    native.calls.push(o);
    return native.canTurn || o !== "landscape";
  },
}));

import { LanguageProvider } from "../theme/LanguageContext";
import { QuranReaderScreen } from "./QuranReaderScreen";
import { isQuranBookmarked, loadQuranPosition, resetQuranReadingCacheForTesting, toggleQuranBookmark } from "../lib/quranReading";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGE_JSON = import.meta.glob<unknown>("/public/mushaf/hafs-kfqc/json/*.json", { eager: true, import: "default" });
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const mount = async (node: ReactNode) => {
  root = createRoot(container);
  act(() => root.render(<LanguageProvider>{node}</LanguageProvider>));
  await act(async () => void (await new Promise((r) => setTimeout(r, 0))));
};
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const info = () => container.querySelector("[data-quran-current]")!;
/** The orientation button is in the reading settings: opened first, then pressed. */
const pressToggle = async () => {
  click(container.querySelector("[data-quran-open-settings]")!);
  await act(async () => {
    container.querySelector("[data-quran-orientation-toggle]")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
const reader = () => container.querySelector("[data-quran-reader]");

beforeEach(() => {
  localStorage.clear();
  resetQuranReadingCacheForTesting();
  native.canTurn = false;
  native.calls = [];
  vi.stubGlobal("fetch", async (url: string) => {
    const data = PAGE_JSON[`/public/mushaf/hafs-kfqc/json/${String(url).split("/").pop()}`];
    return data ? { ok: true, status: 200, json: async () => data } : { ok: false, status: 404, json: async () => null };
  });
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Mushaf information in the header", () => {
  it("page 1: Juz 1, Hizb 1, and the hizb's beginning marked", async () => {
    await mount(<QuranReaderScreen start={{ surah: 1, ayah: 1 }} onBack={() => {}} />);
    expect(container.querySelector("[data-quran-title]")!.textContent).toContain("سورة الفاتحة");
    expect(info().querySelector("[data-quran-juz]")!.getAttribute("data-quran-juz")).toBe("1");
    expect(info().querySelector("[data-quran-hizb]")!.textContent).toContain("الحزب ١");
    expect(info().querySelector("[data-quran-page-number]")!.textContent).toContain("صفحة ١");
    expect([...info().querySelectorAll("[data-quran-quarter]")].map((q) => q.textContent)).toEqual(["۞ بداية الحزب ١"]);
  });

  it("page 2 (al-Baqarah begins): no quarter marker", async () => {
    await mount(<QuranReaderScreen start={{ surah: 2, ayah: 1 }} onBack={() => {}} />);
    expect(container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page")).toBe("2");
    expect(container.querySelector("[data-quran-title]")!.textContent).toContain("سورة البقرة");
    expect(info().querySelectorAll("[data-quran-quarter]")).toHaveLength(0);
  });

  it("a middle page (264, al-Hijr): Juz 14, Hizb 27, and its ¼ marker", async () => {
    await mount(<QuranReaderScreen start={{ surah: 15, ayah: 49 }} onBack={() => {}} />);
    expect(container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page")).toBe("264");
    expect(container.querySelector("[data-quran-title]")!.textContent).toContain("سورة الحجر");
    expect(info().querySelector("[data-quran-juz]")!.getAttribute("data-quran-juz")).toBe("14");
    expect(info().querySelector("[data-quran-hizb]")!.getAttribute("data-quran-hizb")).toBe("27");
    expect([...info().querySelectorAll("[data-quran-quarter]")].map((q) => q.textContent)).toEqual(["۞ ربع الحزب ٢٧"]);
  });

  it("page 604: Juz 30, Hizb 60, page ٦٠٤", async () => {
    await mount(<QuranReaderScreen start={{ surah: 114, ayah: 1 }} onBack={() => {}} />);
    expect(info().querySelector("[data-quran-juz]")!.getAttribute("data-quran-juz")).toBe("30");
    expect(info().querySelector("[data-quran-hizb]")!.getAttribute("data-quran-hizb")).toBe("60");
    expect(info().querySelector("[data-quran-page-number]")!.textContent).toContain("صفحة ٦٠٤");
  });

  it("the controls take no room from the page — shown or hidden, nothing moves", async () => {
    await mount(<QuranReaderScreen start={{ surah: 2, ayah: 6 }} onBack={() => {}} />);
    const area = container.querySelector<HTMLElement>("[data-quran-area]")!;
    expect(area.style.paddingTop).toBe("");
    expect(area.style.paddingBottom).toBe("");
    expect(reader()!.getAttribute("data-quran-controls")).toBe("hidden");
    click(container.querySelector("[data-quran-swipe]")!);
    expect(reader()!.getAttribute("data-quran-controls")).toBe("shown");
    expect(area.style.paddingTop).toBe("");
  });
});

describe("the orientation button", () => {
  it("where the screen can be turned: landscape, back to portrait, handed back on leaving — page upright, verse and bookmarks kept", async () => {
    native.canTurn = true;
    await mount(<QuranReaderScreen start={{ surah: 15, ayah: 49 }} onBack={() => {}} />);
    act(() => void toggleQuranBookmark(15, 49));
    await pressToggle();
    expect(native.calls).toEqual(["landscape"]);
    expect(reader()!.getAttribute("data-quran-orientation")).toBe("landscape");
    // The page itself is never turned.
    expect(reader()!.getAttribute("style")).toBeNull();
    expect(container.querySelector("[style*='rotate']")).toBeNull();
    expect(container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page")).toBe("264");
    expect(info().getAttribute("data-quran-current")).toBe("15:49");
    expect(isQuranBookmarked(15, 49)).toBe(true);
    // Another surah, from the controls: still landscape.
    click(container.querySelector("[data-quran-next-surah]")!);
    expect(info().getAttribute("data-quran-current")).toBe("16:1");
    expect(reader()!.getAttribute("data-quran-orientation")).toBe("landscape");
    await pressToggle();
    expect(native.calls).toEqual(["landscape", "portrait"]);
    expect(reader()!.getAttribute("data-quran-orientation")).toBe("portrait");
    expect(loadQuranPosition()).toMatchObject({ surah: 16, ayah: 1 });
    click(container.querySelector("[data-quran-open-settings]")!);
    click(container.querySelector("[data-quran-open-index]")!);
    expect(native.calls).toEqual(["landscape", "portrait", "unlocked"]);
  });

  it("the overlay's own orientation button turns the screen too, and back", async () => {
    native.canTurn = true;
    await mount(<QuranReaderScreen start={{ surah: 2, ayah: 255 }} onBack={() => {}} />);
    const quick = () => container.querySelector("[data-quran-quick-orientation]")!;
    expect(quick().getAttribute("data-quran-quick-orientation")).toBe("portrait");
    await act(async () => void quick().dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(native.calls).toEqual(["landscape"]);
    expect(reader()!.getAttribute("data-quran-orientation")).toBe("landscape");
    expect(quick().getAttribute("aria-pressed")).toBe("true");
    await act(async () => void quick().dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(native.calls).toEqual(["landscape", "portrait"]);
    expect(reader()!.getAttribute("data-quran-orientation")).toBe("portrait");
    expect(info().getAttribute("data-quran-current")).toBe("2:255");
  });

  it("where the screen can't be turned (some browsers): nothing is rotated — the page stays as it is, and a note suggests turning the phone", async () => {
    await mount(<QuranReaderScreen start={{ surah: 2, ayah: 255 }} onBack={() => {}} />);
    await pressToggle();
    expect(native.calls).toEqual(["landscape"]);
    expect(reader()!.getAttribute("data-quran-orientation")).toBe("portrait");
    expect(container.querySelector("[style*='rotate']")).toBeNull();
    expect(container.querySelector("[data-quran-rotate-hint]")!.textContent).toContain("أدِر الهاتف");
    expect(container.querySelector("[data-quran-mushaf-page]")!.getAttribute("data-quran-mushaf-page")).toBe("42");
    expect(info().getAttribute("data-quran-current")).toBe("2:255");
  });
});
