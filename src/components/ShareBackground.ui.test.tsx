// @vitest-environment jsdom
// Sharing the full-screen reminder as an image passes the background it is
// shown on — the user's photo, their fixed choice, or the automatic one — to
// the image renderer, so the image carries the same background as the
// preview (verified pixel by pixel in a browser on 2026-10-17). Text sharing
// is unchanged.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

const rendered = vi.hoisted(() => [] as { background?: string; textAr: string }[]);
vi.mock("../lib/shareImage", () => ({
  renderShareImage: vi.fn(async (content: { background?: string; textAr: string }) => {
    rendered.push(content);
    return "data:image/png;base64,iVBORw0KGgo=";
  }),
}));

import { LanguageProvider } from "../theme/LanguageContext";
import { SpiritualReminderView } from "./SpiritualReminderView";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  rendered.length = 0;
});

async function shareAsImageFrom(settings: object, custom?: string) {
  localStorage.clear();
  localStorage.setItem("dithar:reminders:v1", JSON.stringify(settings));
  if (custom) localStorage.setItem("dithar:reminders:custom-background:v1", JSON.stringify({ dataUrl: custom, updatedAt: 1 }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<LanguageProvider><SpiritualReminderView itemId="hadith:6" onClose={() => {}} /></LanguageProvider>));
  const preview = container.querySelector<HTMLElement>("[data-spiritual-reminder]")!.style.backgroundImage;
  await act(async () => container.querySelector<HTMLButtonElement>("[data-reminder-share]")!.click());
  await act(async () => document.querySelector<HTMLButtonElement>("[data-share-option='image']")!.click());
  return preview;
}

describe("share as image from the full-screen reminder", () => {
  it("uses the fixed background the user chose, the one the preview shows", async () => {
    const preview = await shareAsImageFrom({ backgroundMode: "fixed", fixedBackground: "pattern-sage" });
    expect(rendered).toHaveLength(1);
    expect(rendered[0].background).toContain("pattern-sage.jpg");
    expect(preview).toContain(rendered[0].background);
  });

  it("uses the user's own photo", async () => {
    const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ";
    const preview = await shareAsImageFrom({ backgroundMode: "custom", fixedBackground: "mosque-night" }, photo);
    expect(rendered[0].background).toBe(photo);
    expect(preview).toContain(photo);
  });

  it("uses the automatic background too", async () => {
    const preview = await shareAsImageFrom({ backgroundMode: "auto", fixedBackground: "mosque-night" });
    expect(rendered[0].background).toMatch(/\/backgrounds\/[a-z-]+\.jpg$/);
    expect(preview).toContain(rendered[0].background);
  });
});
