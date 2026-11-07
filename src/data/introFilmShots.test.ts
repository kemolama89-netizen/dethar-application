// The introduction's camera stays restrained: small angles and travel, no roll, a new shot for each
// scene, mirrored for right-to-left reading.
import { describe, expect, it } from "vitest";
import { shotPoses, shotVars } from "./introFilmShots";
import { SCENES } from "./introFilmTimeline";

const order = SCENES.map((s) => s.id);

describe("the introduction's camera shots", () => {
  it("keeps every angle within 4°, travel within 6% and scale near 1 — no roll anywhere", () => {
    for (const id of order) {
      for (const p of shotPoses(id)) {
        expect(Math.abs(p.ry)).toBeLessThanOrEqual(4);
        expect(Math.abs(p.rx)).toBeLessThanOrEqual(4);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(6);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(6);
        expect(p.s).toBeGreaterThanOrEqual(0.94);
        expect(p.s).toBeLessThanOrEqual(1.08);
      }
      for (const v of Object.values(shotVars(id, "rtl"))) expect(v).not.toMatch(/rotateZ|rotate\(/);
    }
  });

  it("films each scene differently from the one before it", () => {
    for (let i = 1; i < order.length; i++) {
      const a = shotVars(order[i - 1], "ltr");
      const b = shotVars(order[i], "ltr");
      expect(`${b["--shot-from"]}${b["--shot-to"]}`).not.toBe(`${a["--shot-from"]}${a["--shot-to"]}`);
    }
  });

  it("pans toward the reading's end: mirrored between Arabic and English", () => {
    const x = (dir: "rtl" | "ltr") => Number(shotVars("floating", dir)["--shot-to"].match(/translate3d\((-?[\d.]+)%/)![1]);
    expect(x("ltr")).toBeGreaterThan(0);
    expect(x("rtl")).toBeLessThan(0);
  });
});
