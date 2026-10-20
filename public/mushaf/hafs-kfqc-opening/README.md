# Mushaf opening pages (1–2): source and verification

The Qur'an reader shows pages 1 (Al-Fatiha) and 2 (the opening of Al-Baqarah)
from `composed/001.svg` and `composed/002.svg` instead of
`../hafs-kfqc/svg/001.svg` and `002.svg`. **Do not edit them.** To re-create
them, run `scripts/mushaf/opening/build.sh` (it checks the reference's SHA-256
before writing anything).

## What they are

Each page is two layers:

| Layer | Source |
|---|---|
| The ornamental frame: four-sided border, title cartouche, circular medallion | DITHAR's design reference `public/reference/mushaf-opening-design.png` (SHA-256 `a9aa7cbdd36a8361e6b2ac202745c854901ac416fe8ebef7e0a1c6339c3774b2`), a two-page spread: page 1 is its left half (x 0–716), page 2 its right half (x 721–1437; the gutter between is left out). Embedded byte for byte as a lossless PNG and shown at an exact 2× (1432 × 2188), never stretched or cropped further. |
| The Qur'an text: surah title, text (with the Basmala), verse markers | quran-svg's own page artwork, `../hafs-kfqc/svg/001.svg` and `002.svg`, the same 1441H KFGQPC typesetting as every other page (see `../hafs-kfqc/README.md`). Every path copied unchanged and drawn as vectors; only scaled and moved as a whole. |

**The reference's own lettering is never shown.** It is not the Mushaf's text:
in Al-Fatiha verse 6 has no marker; in Al-Baqarah the markers ②–⑤ stand in the
wrong places, verse 5 (أُولَٰئِكَ عَلَىٰ هُدًى…) is missing, and several words are
misspelt. `scripts/mushaf/opening/frame.py` clears the medallion and the
cartouche (their cream area, inside the gold ring, refilled with a smooth fit of
its own background), and nothing else in the reference is changed.

## Placement

- **Text:** the ink of quran-svg's text block is centred on the medallion (an
  ellipse, 836 × 866 px, itself centred on the page) and scaled until it reaches
  90% of it. Both pages share one scale, as in the printed Mushaf. The verse
  shapes are placed with the very same transform (`shapeTransform` in
  `src/data/quran/kfqc-hafs-1441-opening.json`), so tapping a verse selects it
  exactly as on every other page.
- **Title:** quran-svg's surah title is centred in the cartouche, at one scale
  on both pages.

## Licence

- **Qur'an text:** KFGQPC's terms, as for the other pages (see `../hafs-kfqc/NOTICE.md` §2.1).
- **Frame:** DITHAR's own design reference, supplied for this app; its origin
  and licence are not recorded in this repository.

## Checks

`src/lib/mushafOpening.test.ts` checks that:

- the files match `SHA256SUMS`, and the reference matches its recorded digest;
- every path of quran-svg's pages 1–2 is present unchanged, with no other lettering;
- the text is drawn with `shapeTransform`, every verse shape lies inside the
  medallion, and the text is centred in it;
- each page is shown whole, at an exact 2× of the reference.

## The previous opening images

`png/001.png` and `png/002.png` are the 1441H print's own opening pages (PDF
pages 4–5 of KFGQPC's `standard39-2.pdf`, SHA-256
`5c4297de1fb6b654f641eed33242408d89432cbecf8a96ff5d297cb45fea7f07`), made by
`scripts/mushaf/import-opening-pages.py`. Their floral border runs on three
sides only, as printed. They are no longer shown, but are kept, unchanged and
listed in `SHA256SUMS`.
