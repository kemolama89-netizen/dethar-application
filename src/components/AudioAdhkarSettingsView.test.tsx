// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AudioAdhkarSettingsView } from "./AudioAdhkarSettingsView";
import { LanguageProvider } from "../theme/LanguageContext";
import { loadEveningAudioSettings } from "../lib/eveningAudioSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <LanguageProvider>
        <AudioAdhkarSettingsView onBack={() => {}} />
      </LanguageProvider>,
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = (text: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;
const click = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

describe("Settings → إعدادات الأذكار الصوتية → أذكار المساء", () => {
  it("lists only أذكار المساء — no Morning or Various schedule", () => {
    expect(container.textContent).toContain("إعدادات الأذكار الصوتية");
    expect(button("أذكار المساء")).toBeDefined();
    expect(container.textContent).not.toContain("أذكار الصباح");
    expect(container.textContent).not.toContain("متفرقة");
  });

  it("enables, sets the start time, and both persist", async () => {
    await click(button("أذكار المساء"));
    expect(container.textContent).toContain("تفعيل أذكار المساء الصوتية");
    expect(container.textContent).toContain("بداية موعد التشغيل");

    await click(button("تفعيل"));
    expect(loadEveningAudioSettings().eveningAudioEnabled).toBe(true);

    const input = container.querySelector<HTMLInputElement>("#evening-audio-start-time")!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "22:12");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: true, eveningAudioStartTime: "22:12" });

    await click(button("إيقاف"));
    expect(loadEveningAudioSettings()).toEqual({ eveningAudioEnabled: false, eveningAudioStartTime: "22:12" });
  });

  it("shows the recorded Evening playlist and the Android-only note on the web", async () => {
    await click(button("أذكار المساء"));
    const ids = [...container.querySelectorAll("[data-playlist-id]")].map((el) => el.getAttribute("data-playlist-id"));
    expect(ids).toEqual(["morning_003", "morning_005", "morning_016"]);
    expect(container.textContent).toContain("متاحان في تطبيق أندرويد فقط");
  });
});
