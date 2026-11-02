# KFGQPC Uthmanic Hafs font

`uthmanic_hafs_v20.ttf` is the King Fahd Glorious Qur'an Printing Complex's Unicode Uthmanic font for developers, version 2.0, update 13.0, byte for byte (SHA-256 `d560bbbc7a90a4f4d416d206a5ac48bd8a1ad00273d64d232f16ca54941bd041`). Its own notes are in `read.me`. **Do not subset, convert or edit it.**

Source: Itqan CMS, asset 138, package `unicode-uthmanic-font-hafs-narration` 1.0.0 (https://cms.itqan.dev/gallery/asset/138). Itqan lists its licence as **CC BY-NC-ND**, so it may not be used commercially. If DITHAR ever earns money, check this first.

`src/data/quran/kfgqpc-hafs-text.json` holds the same package's `aya_text` for each verse, as `[surah, ayah, page, text]`, unchanged. Each verse ends in this font's verse-number glyph, which uses Arabic presentation-form code points. **In any other font it displays as wrong letters**, so `src/components/quran/kfgqpc-font.css` forces this font and `src/lib/kfgqpcText.ts` won't draw the text until the font has loaded.

The Complex notes that its "Smart" font (asset 137) is for verse-level display, not whole Mushaf pages. That one isn't used here. Text mode shows a page's verses without the printed line breaks, and the printed pages remain the default.
