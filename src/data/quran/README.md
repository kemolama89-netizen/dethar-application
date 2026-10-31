# Qur'an text: source and verification

The Qur'an reader (`src/components/QuranReaderScreen.tsx`) shows the pages
of the 1441H Madinah Mushaf as images (`public/mushaf/hafs-kfqc` — see its
README.md). It uses the Tanzil files here for surah names, verse counts and
juz, and gives each verse's text, from these files, to screen readers. The
text is used in these files exactly as delivered. **Do not edit them.** The Tanzil
licence allows verbatim copies only.

| File | What it is | Source | SHA-256 |
|---|---|---|---|
| `tanzil-quran-uthmani.txt` | The Uthmani Qur'an text, one verse per line (`surah\|ayah\|text`). Tanzil's copyright block is at the end. | Tanzil Project, "Uthmani" text, version 1.1 (download format "Text with aya numbers"), downloaded 2026-10-16 from https://tanzil.net/download | `bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8` |
| `tanzil-quran-metadata.txt` | Tanzil's Qur'an metadata (`quran-data.js`, version 1.0): surahs, verse counts, and the page starts of the Medina Mushaf (604 pages). It is stored with a `.txt` name only so the build treats it as data; the content is unchanged. | https://tanzil.net/res/text/metadata/quran-data.js, downloaded 2026-10-16 | `9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4` |

## Licence and credit (Tanzil)

> Tanzil Quran Text, Copyright (C) 2007-2026 Tanzil Project.
> License: Creative Commons Attribution 3.0.
> Permission is granted to copy and distribute verbatim copies of this
> text, but changing it is not allowed. The source (Tanzil Project) must
> be clearly indicated, with a link to tanzil.net, and this copyright
> notice included.

How the app meets these terms:
- **Verbatim:** the text file above is byte-identical to the download.
- **Credit and link:** the reader shows "Tanzil Project" with a link to
  https://tanzil.net.
- **Notice:** the full copyright notice, read from the file itself, is
  shown in the reader's "About this text" panel.

## Validation (2026-10-16), also run as a test (`src/lib/quranText.test.ts`)

- **Text:** 6,236 verses in 114 surahs, in order, with no gaps, repeats or
  empty verses.
- **Verse counts:** every surah's count is identical in four sources: the
  text itself, Tanzil's metadata, this app's `src/data/quranSurahs.ts`, and
  the Quran.com API (`/api/v4/chapters`).
- **Pages and juz:** Tanzil's page starts are those of the older Medina
  Mushaf print. The reader now uses the 1441H print's pages instead (see
  `public/mushaf/hafs-kfqc/README.md`), which differ on 25 pages. Tanzil's
  page starts are kept as data and still checked here. On 2026-10-16 every page
  (1–604) was fetched from the Quran.com API
  (`/api/v4/verses/by_page/{page}`). All 6,236 verses have the same page
  and the same juz in both sources: no mismatch, no verse missing or
  repeated. The first verse of each page and juz from Quran.com is kept in
  `src/lib/__fixtures__/quran-com-pages.json`, and the test compares it with
  Tanzil's metadata on every run.

## Earlier text rendering

The reader used to typeset this text itself, with bundled fonts
(Scheherazade New and Amiri Quran, both SIL OFL 1.1, in `src/assets/fonts/`).
It now shows the printed pages, so those fonts are no longer loaded by it.

## Quarter-hizb signs (2026-10-20)

`kfqc-hafs-1441-quarter-marks.json` records where each quarter-hizb sign (۞)
is printed on the 1441H pages, in each page's own 345 × 550 units, so the
reader can draw the printed sign in its own colour (a colour masked by the
artwork's own ink — the artwork itself is never changed). It is written by
`scripts/mushaf/find-quarter-marks.py` (with `render-quarter-pages.mjs`),
which template-matches the sign at the start of each quarter's first verse:

- 199 signs found; every quarter that begins mid-surah scores ≥ 0.86 and
  every quarter that begins a surah (41, none printed in the text) ≤ 0.53;
  each box was also checked by eye on a contact sheet of all 199 crops.
- Quarter 106: the print draws the sign before 15:49 (score 0.92) and none
  at Tanzil's 15:50 (0.46), confirming Quran.com's start. The reader opens
  quarters at the print's starts (`PRINT_QUARTER_STARTS` in
  `src/lib/quranMeta.ts`), which equal Quran.com's for all 240 quarters.
