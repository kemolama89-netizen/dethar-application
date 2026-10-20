# Mushaf pages: source, licence and verification

The Qur'an reader (`src/components/QuranReaderScreen.tsx`) shows these pages
as they are. **Do not edit them.** To re-import or update them, run
`node scripts/mushaf/import-quran-svg.mjs`; it verifies the archives'
SHA-256 digests before copying anything.

## What they are

| | |
|---|---|
| Edition | Madinah Mushaf (مصحف المدينة النبوية), riwayah of Hafs from Asim, **1441H** print, King Fahd Glorious Qur'an Printing Complex (KFGQPC) |
| Artwork origin | KFGQPC's own master files, *المصحف الرقمي — الملفات المصدرية*, `1441-AI-hafs.zip` (SHA-256 `280c5d71ca16aaeeb3a343be1b92c76fa6df71d0671e202c026fde12402d9eef`) — see `PROVENANCE.md` |
| SVG and verse data | [quran-svg](https://github.com/quran-ws/quran-svg) by Quran.ws, release **v1.1.1**, `mushafs/hafs/kfqc` |
| Archives | `hafs-kfqc-svg.zip` SHA-256 `5d5e29eae66d9353dd8e0e51af4274c7768f81f722414b538dfd7c8de014fc91`; `hafs-kfqc-json.zip` SHA-256 `27dd192cec6b5f919ffd6e7df5216464aa57a671e326fc1a37a9d82dee3f6c13` (both match the digests GitHub records for the release) |
| Files | `svg/001.svg` … `svg/604.svg` (page artwork) and `json/001.json` … `json/604.json` (each verse's polygon on its page), copied byte for byte; digests in `SHA256SUMS`. The release's per-surah split files are not used. |
| Modified | No. |

quran-svg traces the KFGQPC page artwork. In its own words (`PROVENANCE.md`),
the SVG keeps the same type, words, line breaks and fifteen lines as the
master file, but drops the decorative frame, running header and printed
page number. The reader adds back the page number (below the page) and puts
the surah and juz in its header.

## Licences and credit

- **The page artwork** belongs to KFGQPC. The Complex's published usage
  rights (in `LICENSE` and `NOTICE.md`, Arabic and English) let the digital
  Mushaf be used free of charge, inside and outside Saudi Arabia, in
  "websites, software, and other similar intermediates", by individuals,
  businesses and institutions. The only restriction is on printing Qur'an
  copies in the Kingdom, or importing them, for commercial sale. That
  doesn't apply to an app.
- **quran-svg's own work** (the verse polygons and JSON) is CC BY 4.0
  (`CC-BY-4.0.txt`). Quran.ws waives attribution for use inside an app, but
  asks for it when the data itself is republished. Shipping these files in
  an APK makes them extractable, so DITHAR credits it anyway: *Data from
  quran-svg by Quran.ws, licensed under CC BY 4.0. Source:
  https://github.com/quran-ws/quran-svg. Version: v1.1.1. Modified: no.*

How the app meets these terms:
- The reader's footer names the edition and the Complex on every page. Its
  "About this Mushaf" panel names the 1441H print, KFGQPC and quran-svg
  (v1.1.1, CC BY 4.0, unmodified), and links to the quran-svg repository.
- `LICENSE`, `NOTICE.md`, `PROVENANCE.md` and `CC-BY-4.0.txt` ship next to
  the pages.

## Verification (2026-10-17)

- **Edition:** pages 3 and 590 were rendered and read line by line against
  the 1441H print. Page 3 line 8 ends «أَلَآ إِنَّهُمْ», and page 590 begins
  with 84:25 before Surah al-Buruj.
- **Every page:** all 604 pages' first verses are identical to the Mushaf
  Database's 1441H layout. They differ from the older print (Tanzil and
  Quran.com) on exactly 25 pages: 121–123, 145, 532–534, 565, 568, 570, 576,
  584, 586, 588–590 and 592–600.
- **Every verse:** the 6,236 verses each appear on exactly one page, in order.
- Also run as tests on every test run:
  - `src/lib/mushafAssets.test.ts` checks every file against `SHA256SUMS`
    and checks each viewBox;
  - `src/lib/quranText.test.ts` checks each page's verses and the 25
    differing pages;
  - `src/components/QuranReader.ui.test.tsx` checks pages 1, 2, 3, 586, 590
    and 604, and all 604 pages in the reader.

## Size

The 604 SVGs total about 356 MB (the JSON about 2 MB). The pages are traced
glyph outlines and are kept as they are, so they aren't minified. The APK
stores them compressed: about 128 MB (measured 2026-10-17, debug build).
