// The Mushaf pages bundled with the app (public/mushaf/hafs-kfqc — see its
// README.md): all 604 page images and their verse data are present, byte for
// byte as imported from the pinned quran-svg release (SHA256SUMS, written by
// scripts/mushaf/import-quran-svg.mjs), with their licence and notices beside
// them; and each image's viewBox is the one the reader lays its verse shapes in.
import { describe, expect, it } from "vitest";
import { TOTAL_PAGES, mushafViewBox } from "./quranMeta";

const nodeModule = (name: string) => import(/* @vite-ignore */ ["node", name].join(":"));

describe("bundled Mushaf pages", () => {
  it("are the 604 imported pages, unmodified, with the licence and notices", async () => {
    const fs = await nodeModule("fs");
    const { createHash } = await nodeModule("crypto");
    const dir = new URL("../../public/mushaf/hafs-kfqc/", import.meta.url);
    const at = (file: string) => new URL(file, dir);
    for (const notice of ["LICENSE", "NOTICE.md", "PROVENANCE.md", "CC-BY-4.0.txt", "README.md"]) expect(fs.existsSync(at(notice)), notice).toBe(true);
    const sums: string[] = fs.readFileSync(at("SHA256SUMS"), "utf8").trim().split("\n");
    expect(sums).toHaveLength(2 * TOTAL_PAGES);
    for (const line of sums) {
      const [hash, file] = line.split(/\s+/);
      expect(createHash("sha256").update(fs.readFileSync(at(file))).digest("hex"), file).toBe(hash);
    }
    for (let p = 1; p <= TOTAL_PAGES; p++) {
      const head: string = fs.readFileSync(at(`svg/${String(p).padStart(3, "0")}.svg`), "utf8").slice(0, 1000);
      expect(head.match(/viewBox="([^"]+)"/)?.[1], `page ${p}`).toBe(mushafViewBox(p));
    }
  }, 60_000);
});
