// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

const detect = vi.hoisted(() => ({ result: { kind: "success" } as unknown, fn: vi.fn() }));
vi.mock("../lib/deviceLocation", () => ({
  detectMyLocation: detect.fn,
  openAppLocationSettings: vi.fn(async () => {}),
}));

import { LocationSettingsView } from "./LocationSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { loadLocationSettings } from "../lib/locationSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  localStorage.clear();
  detect.fn.mockReset();
  detect.fn.mockImplementation(async () => detect.result);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <LocationSettingsView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined;
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};
const status = () => container.querySelector("[data-detect-status]");

describe("Settings → الموقع", () => {
  it("offers both 'تحديد موقعي تلقائيًا' and 'اختيار الموقع يدويًا'", () => {
    expect(button("تحديد موقعي تلقائيًا")).toBeDefined();
    expect(button("اختيار الموقع يدويًا")).toBeDefined();
  });

  it("tapping it runs the automatic location flow and shows the detected location", async () => {
    detect.result = {
      kind: "success",
      record: { source: "device", latitude: 21.4858, longitude: 39.1925, timezone: "Asia/Riyadh", countryCode: "SA" },
    };
    await click(button("تحديد موقعي تلقائيًا")!);
    expect(detect.fn).toHaveBeenCalledTimes(1);
    expect(status()?.textContent).toContain("تم تحديد موقعك بنجاح");
    expect(container.textContent).toContain("عبر تحديد موقع الجهاز");
  });

  it("explains a permanently denied permission instead of failing silently", async () => {
    detect.result = { kind: "blocked" };
    await click(button("تحديد موقعي تلقائيًا")!);
    expect(status()?.getAttribute("data-detect-status")).toBe("blocked");
    expect(status()?.textContent).toContain("إذن الموقع مطلوب");
  });

  it("reports a missing fix (location services off)", async () => {
    detect.result = { kind: "unavailable" };
    await click(button("تحديد موقعي تلقائيًا")!);
    expect(status()?.textContent).toContain("تعذّر تحديد موقعك");
  });

  it("manual selection still works", async () => {
    await click(button("اختيار الموقع يدويًا")!);
    expect(document.activeElement?.tagName).toBe("INPUT");
    const firstCity = container.querySelector(".overflow-y-auto button")!;
    await click(firstCity);
    expect(loadLocationSettings().manualLocation?.source).toBe("manual");
    expect(container.textContent).toContain("مُحدَّد يدويًا");
  });
});
