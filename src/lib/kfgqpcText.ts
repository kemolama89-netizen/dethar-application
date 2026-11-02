// The King Fahd Complex's Unicode Uthmanic text (src/data/quran/kfgqpc-hafs-text.json,
// imported verbatim by scripts/mushaf/import-kfgqpc-text.py from Itqan's package, its
// consonants and page starts verified there against Tanzil and the reader's 1441H
// pages). One chunk, loaded when first needed; it ships with the app.
//
// IMPORTANT: each verse ends in the Complex's verse-number glyph, which uses Arabic
// presentation-form code points. In any other font they would show as wrong letters,
// so this text is only ever drawn once this font has loaded (whenKfgqpcFontReady), and
// the glyph is kept apart from the words so it is never read aloud or copied.
export const KFGQPC_FONT = "KFGQPC Hafs";

export type KfgqpcVerse = { surah: number; ayah: number; page: number; words: string; mark: string };

let loaded: Promise<KfgqpcVerse[] | null> | null = null;

export function splitVerseMark(text: string): { words: string; mark: string } {
  const at = text.lastIndexOf(" ");
  const cut = at === -1 ? text.lastIndexOf(" ") : at;
  return { words: text.slice(0, cut), mark: text.slice(cut + 1) };
}

export function loadKfgqpcText(): Promise<KfgqpcVerse[] | null> {
  if (!loaded) {
    loaded = import("../data/quran/kfgqpc-hafs-text.json").then(
      (m) => (m.default as unknown as [number, number, number, string][]).map(([surah, ayah, page, text]) => ({ surah, ayah, page, ...splitVerseMark(text) })),
      () => {
        loaded = null;
        return null;
      },
    );
  }
  return loaded;
}

/** Resolves true once the font can draw, false if it can't (then the caller shows no text from this file). */
export async function whenKfgqpcFontReady(): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts) return true;
  try {
    const faces = await document.fonts.load(`24px "${KFGQPC_FONT}"`, "ب");
    return faces.length > 0;
  } catch {
    return false;
  }
}
