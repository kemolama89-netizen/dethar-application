// Palette definitions for the Appearance → Colors system — data only, no
// React. Deliberately separate from theme identity (men/women, see
// ThemeContext.tsx): a palette only ever recolors the CURRENT identity, it
// never switches identity itself. The actual CSS variable overrides these
// palettes apply live in src/index.css under
// `html[data-palette="<id>"] [data-theme="<men|women>"]`; the hex values
// here are ONLY for the compact preview swatches in Settings and must stay
// in sync with the primary/gold/background values used there.
//
// "original" exists for both groups and intentionally has no CSS overrides
// at all — it IS the current approved appearance, reproduced by changing
// nothing.
export interface PaletteOption {
  id: string;
  nameAr: string;
  nameEn: string;
  /** 2-3 representative colors for the compact preview dots (primary, accent, background). */
  swatches: [string, string, string];
}

export type Main1PaletteId = "original" | "forest" | "navy" | "olive" | "earth" | "charcoal";
export type Main2PaletteId = "original" | "mauve" | "rose" | "lavender" | "plum" | "sand";

export const MAIN1_PALETTES: PaletteOption[] = [
  { id: "original", nameAr: "الأصلي", nameEn: "Original", swatches: ["#12213f", "#c6a15b", "#f2e9da"] },
  { id: "forest", nameAr: "الغابة", nameEn: "Forest", swatches: ["#223c2c", "#c6a15b", "#f1efe2"] },
  { id: "navy", nameAr: "الكحلي", nameEn: "Navy", swatches: ["#23415f", "#c6a15b", "#eef1f4"] },
  { id: "olive", nameAr: "الزيتوني", nameEn: "Olive", swatches: ["#3a3a26", "#a9835d", "#f2ede1"] },
  { id: "earth", nameAr: "الترابي", nameEn: "Earth", swatches: ["#5a4433", "#c6a15b", "#f2e8dc"] },
  { id: "charcoal", nameAr: "الفحمي", nameEn: "Charcoal", swatches: ["#3a3a3a", "#c6a15b", "#f0efec"] },
];

export const MAIN2_PALETTES: PaletteOption[] = [
  { id: "original", nameAr: "الأصلي", nameEn: "Original", swatches: ["#5b6e4e", "#c6a15b", "#f6f2e9"] },
  { id: "mauve", nameAr: "الموف", nameEn: "Mauve", swatches: ["#6d5560", "#c6a15b", "#f5f0ee"] },
  { id: "rose", nameAr: "الوردي", nameEn: "Rose", swatches: ["#8c6560", "#c6a15b", "#f6efe9"] },
  { id: "lavender", nameAr: "الخزامى", nameEn: "Lavender", swatches: ["#615a72", "#c6a15b", "#f2f0f2"] },
  { id: "plum", nameAr: "النبيتي", nameEn: "Plum", swatches: ["#563b4b", "#c6a15b", "#f3ede9"] },
  { id: "sand", nameAr: "الرملي", nameEn: "Sand", swatches: ["#8a7355", "#c6a15b", "#f6f0ec"] },
];
