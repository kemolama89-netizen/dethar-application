// @vitest-environment jsdom
// The review list's export: a file download in a browser; inside the
// Android app (where the WebView can't download) the native plugin's share
// sheet, with the same file name, type and text. A failure is reported,
// never silent.
import { beforeEach, describe, expect, it, vi } from "vitest";

const cap = vi.hoisted(() => ({
  native: false,
  shareFile: vi.fn<(options: { fileName: string; mimeType: string; text: string }) => Promise<{ shared: boolean; bytes: number }>>(async () => ({ shared: true, bytes: 3 })),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => cap.native, getPlatform: () => (cap.native ? "android" : "web") },
  registerPlugin: () => ({ shareFile: cap.shareFile }),
}));

import { exportTextFile } from "./contentExport";

beforeEach(() => {
  cap.native = false;
  cap.shareFile.mockClear();
});

describe("content review export", () => {
  it("downloads the file in a browser", async () => {
    const createObjectURL = vi.fn(() => "blob:x");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const clicked: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download);
    });
    expect(await exportTextFile("dithar-content-review.csv", "text/csv", "a,b")).toBe("downloaded");
    expect(clicked).toEqual(["dithar-content-review.csv"]);
    expect(cap.shareFile).not.toHaveBeenCalled();
  });

  it("hands the text to Android's share sheet in the app", async () => {
    cap.native = true;
    expect(await exportTextFile("dithar-content-review.json", "application/json", "{}")).toBe("shared");
    expect(cap.shareFile).toHaveBeenCalledWith({ fileName: "dithar-content-review.json", mimeType: "application/json", text: "{}" });
  });

  it("reports a failure instead of pretending it worked", async () => {
    cap.native = true;
    cap.shareFile.mockRejectedValueOnce(new Error("no activity"));
    expect(await exportTextFile("dithar-content-review.json", "application/json", "{}")).toBe("failed");
  });
});
