// The "Transliteration" / "Meaning" section headings shown under an Arabic
// dhikr in English mode — shared by every reading card that needs them
// (Miscellaneous Adhkar's MiscDuaCard, and Morning/Evening/Prayer's
// DhikrCard in WrittenAdhkarReader) so this pair of strings has exactly one
// definition, never two independently-maintained copies.
//
// Deliberately its OWN tiny, dependency-free module rather than living
// inside misc-library.ts (where it originated): misc-library.ts is a large
// module (the full 89-record Misc dataset plus its own module-level image
// preload side effect), and a module with side effects can't be
// tree-shaken — so importing even one small export from it pulls that
// entire module into whichever chunk imports it. Written Adhkar reusing
// this pair of labels must not drag the unrelated Misc dataset into its
// own load path (see this task's performance findings).
export const dhikrLanguageLabels = {
  ar: {
    transliterationHeading: "النطق بالحروف اللاتينية",
    meaningHeading: "المعنى",
    meaningButtonAria: "عرض المعنى بالإنجليزي",
    shareAria: "مشاركة الذكر",
    shareCopiedToast: "تم نسخ الذكر",
    close: "إغلاق",
  },
  en: {
    transliterationHeading: "Transliteration",
    meaningHeading: "Meaning",
    meaningButtonAria: "Meaning",
    shareAria: "Share",
    shareCopiedToast: "Copied to clipboard",
    close: "Close",
  },
};
