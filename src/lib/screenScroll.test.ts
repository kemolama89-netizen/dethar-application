// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { scrollIntoScreen } from "./screenScroll";

const rect = (top: number, height: number) => ({ top, height, bottom: top + height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON() {} }) as DOMRect;

describe("scrollIntoScreen", () => {
  it("scrolls only the screen's own scroll area, never the frame's backdrop", () => {
    const backdrop = document.createElement("div");
    const screen = document.createElement("div");
    screen.className = "device-screen";
    const target = document.createElement("div");
    screen.appendChild(target);
    backdrop.appendChild(screen);
    document.body.appendChild(backdrop);
    screen.getBoundingClientRect = () => rect(28, 700);
    target.getBoundingClientRect = () => rect(428, 40);
    screen.scrollTop = 0;
    let ancestorScrolled = false;
    target.scrollIntoView = () => {
      ancestorScrolled = true;
    };
    scrollIntoScreen(target, "start");
    expect(screen.scrollTop).toBe(400);
    expect(backdrop.scrollTop).toBe(0);
    expect(ancestorScrolled).toBe(false);
    backdrop.remove();
  });

  it("falls back to scrollIntoView outside a frame, and ignores a missing element", () => {
    const el = document.createElement("div");
    let called = false;
    el.scrollIntoView = () => {
      called = true;
    };
    scrollIntoScreen(el);
    expect(called).toBe(true);
    expect(() => scrollIntoScreen(null)).not.toThrow();
  });
});
