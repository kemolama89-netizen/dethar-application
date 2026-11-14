// @vitest-environment jsdom
// Sharing a booklet's pages: every image, in order, in one share.
import { afterEach, describe, expect, it, vi } from "vitest";

const nativeShare = vi.fn(async (_o: { images: { base64: string; fileName: string }[]; title?: string }) => ({ shared: true, count: _o.images.length }));
let android = false;
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => android, getPlatform: () => (android ? "android" : "web") },
  registerPlugin: () => ({ shareImages: (o: { images: { base64: string; fileName: string }[]; title?: string }) => nativeShare(o) }),
}));

const { shareImageSet } = await import("./shareContent");
const PNG = "data:image/png;base64,iVBORw0KGgo=";

afterEach(() => {
  android = false;
  nativeShare.mockClear();
  vi.unstubAllGlobals();
});

describe("shareImageSet", () => {
  it("on Android, hands every page to the native share at once, numbered in order", async () => {
    android = true;
    expect(await shareImageSet([PNG, PNG, PNG], "تفسير السعدي", "dithar-tafsir-2-255")).toBe("shared");
    expect(nativeShare).toHaveBeenCalledTimes(1);
    const names = nativeShare.mock.calls[0][0].images.map((i) => i.fileName);
    expect(names).toHaveLength(3);
    expect(names.map((n) => n.slice(-6))).toEqual(["01.png", "02.png", "03.png"]);
    expect(names.every((n) => /^[A-Za-z0-9._-]+$/.test(n) && n.length <= 80)).toBe(true);
  });

  it("sends the caption with the images", async () => {
    android = true;
    await shareImageSet([PNG], "t", "x", "سورة البقرة · الآية ٢٥٥ — تفسير السعدي (٩ صفحات) — من تطبيق دِثار");
    expect(nativeShare.mock.calls[0][0]).toMatchObject({ text: "سورة البقرة · الآية ٢٥٥ — تفسير السعدي (٩ صفحات) — من تطبيق دِثار" });
  });

  it("on the web, shares all the files together when it can", async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal("navigator", { ...navigator, canShare: () => true, share });
    expect(await shareImageSet([PNG, PNG], "t", "dithar-tafsir-3-57")).toBe("shared");
    const files = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files;
    expect(files.map((f) => f.name.slice(-6))).toEqual(["01.png", "02.png"]);
  });

  it("shares nothing when there are no pages", async () => {
    expect(await shareImageSet([], "t", "x")).toBe("failed");
  });
});
