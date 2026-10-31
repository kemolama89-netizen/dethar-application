# Qur'an text validation — 16 October 2026

This report covers the Qur'an text the DITHAR reader shows. All checks passed. Nothing was changed: the text and metadata files are the same bytes as before.

## Result

- **The dataset is an exact copy of Tanzil.** It is byte-identical to a fresh download from tanzil.net made today, and every verse matches Tanzil's separately downloaded XML edition. 27 of 27 dataset checks passed, with 0 discrepancies.
- **The reader shows the stored text faithfully.** All 604 pages were rendered in Chromium at three phone sizes. On each, all 6,236 verses appeared exactly once, character-identical to the file, each with its correct verse number. No text was outside the page, overlapped, or missing.
- **What this does not cover.** It confirms that DITHAR reproduces Tanzil's verified text exactly. It is not an independent scholarly review of the Tanzil text against a printed Mushaf; that verification is Tanzil's (see their notice in the file). Rendering was checked in desktop Chromium, not on a physical Android device.

## Source

| | |
|---|---|
| Text file | `src/data/quran/tanzil-quran-uthmani.txt` |
| Source | Tanzil Project, **Uthmani** text, **version 1.1**, format "Text with aya numbers" (`https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true`) |
| SHA-256 | `bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8` (1,370,878 bytes) |
| Metadata | `src/data/quran/tanzil-quran-metadata.txt` = Tanzil `quran-data.js` (`https://tanzil.net/res/text/metadata/quran-data.js`), SHA-256 `9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4` |
| Licence | Creative Commons Attribution 3.0; verbatim copies only, credit "Tanzil Project" with a link to tanzil.net, keep the notice. The reader shows the credit and link on every page, and the full notice (read from the file) under "About this text". |
| Font | Amiri Quran 1.003, Arabic subset (SIL Open Font License 1.1), `src/assets/fonts/amiri-quran/` |

## 1. Dataset checks

Method: `scripts/quran-validation/validate_dataset.py`, run today against fresh downloads of the text, the XML edition and the metadata from tanzil.net. The script only reads files.

| # | Check | Result | Detail |
|---:|---|---|---|
| 1 | App text file is byte-identical to a fresh official Tanzil download (Uthmani, txt with aya numbers) | Pass | app bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8 / fresh bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c… |
| 2 | App metadata file is byte-identical to Tanzil's quran-data.js | Pass | 9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4 |
| 3 | SHA-256 equals the hash recorded in src/data/quran/README.md | Pass |  |
| 4 | Valid UTF-8, no BOM | Pass |  |
| 5 | Unix line endings only (no CR) | Pass |  |
| 6 | Only verse lines, the '#' copyright block, and blank lines | Pass | 6236 verse lines, 28 notice lines, 3 blank |
| 7 | Total verses = 6,236 | Pass | 6236 |
| 8 | 114 surahs, numbered 1-114 | Pass |  |
| 9 | Verse order: every verse follows the previous (no gap, no repeat, no reordering) | Pass |  |
| 10 | No verse key appears twice | Pass |  |
| 11 | Each surah's verse count equals Tanzil metadata (all 114) | Pass | [] |
| 12 | Metadata surah start offsets are consistent with the counts | Pass |  |
| 13 | App surah table (src/data/quranSurahs.ts): 114 entries, numbers 1-114 in order | Pass |  |
| 14 | App surah table verse counts equal the text (all 114) | Pass | [] |
| 15 | Surah names: the app's Arabic names match Tanzil's (ignoring hamza/alef forms and tashkeel) | Pass | 0 differ in spelling: [] |
| 16 | Every verse equals Tanzil's separately downloaded XML edition (basmala attribute + text) | Pass | 0 mismatches [] |
| 17 | Surah names in Tanzil XML equal the metadata names | Pass |  |
| 18 | Only Arabic-script characters and single spaces in verse text | Pass | {} |
| 19 | No digits inside verse text (verse numbers are added by the app, not stored in the text) | Pass | [] |
| 20 | No empty verse | Pass | [] |
| 21 | No leading/trailing/double spaces or tabs | Pass | [] |
| 22 | No control, format, private-use, unassigned or replacement characters | Pass | [] |
| 23 | No word begins with a detached diacritic (combining mark) | Pass | [] |
| 24 | No field separator inside verse text (parsing safety) | Pass |  |
| 25 | No identical diacritic repeated twice in a row | Pass | 0 found: [] |
| 26 | Basmala opens verse 1 of all 112 surahs except al-Fatihah (where it is verse 1) and at-Tawbah | Pass | 112 surahs |
| 27 | 27:30 contains the basmala within the verse | Pass |  |

Totals: **6,236 verses** in **114 surahs**, 77,881 words, 699,519 characters, 62 distinct characters (61 Arabic-script characters and the space).

Information (not discrepancies):

- **Repeated verses.** 94 verse texts occur more than once. These are the Qur'an's refrains, for example 55:13 (31 times in ar-Rahman), 77:15 (11 times), and the openings 40:1–46:1 (حمٓ). No verse repeats the verse immediately before it.
- **Mark order.** 5,782 verses keep Tanzil's own order of diacritics, which Unicode normalisation (NFC) would reorder. The app never normalises Qur'an text (normalisation is used only in Voice Tasbeeh), and a test checks that the stored text stays un-normalised.
- **Optional signs.** The text has 0 sajda signs (U+06E9) and 0 rub el-hizb signs (U+06DE). Tanzil's download leaves these optional signs out by default; the 15 sajda verses are listed in the metadata instead (7:206, 13:15, 16:50, 17:109, 19:58, 22:18, 22:77, 25:60, 27:26, 32:15, 38:24, 41:38, 53:62, 84:21, 96:19).
- **Basmala.** In this text the basmala begins verse 1 of 112 surahs. It *is* verse 1 of al-Fatihah, at-Tawbah has none, and 27:30 contains it mid-verse. The reader shows the basmala on its own line above verse 1 by splitting the display only: the basmala line plus the rest of the verse equals the stored verse exactly.
- **Font coverage.** The bundled font has a glyph for all 74 characters needed: the 62 in the text plus the app's verse marker ۝ (U+06DD), the no-break space and the Arabic-Indic digits. Missing: none.

## 2. Rendering checks: every page, every verse

Method: `scripts/quran-validation/render_check.mjs` opens the reader from the Home card at page 1 and turns all 604 pages with the Next button. Animations are disabled so positions are final. On every page it:

- compares each verse's displayed text (the basmala line, if any, plus the verse) with the line in the source file;
- checks the verse number shown;
- checks that each verse lies inside the page horizontally;
- checks that the first line starts inside the page body;
- checks that the page doesn't overlap the header or the page controls;
- checks that any overflow can scroll (never hidden);
- checks that the screen has no horizontal scroll.

At the end it checks that every verse appeared exactly once, and that every surah's first and last verses and heading appeared.

| Screen | Verses shown | Missing | Shown twice | Text or number mismatches | Clipping or overlap problems | Surah headings | Font loaded | Pages scrolling inside the frame | Verse numbers starting a line alone | Paragraphs ending on a very short line | Text size (min / median / max px) |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|
| 393x852 | 6,236 | 0 | 0 | 0 | 0 | 114 | yes | 0 | 0 | 0 | 15.5 / 18.5 / 18.5 |
| 360x780 | 6,236 | 0 | 0 | 0 | 0 | 114 | yes | 2 | 0 | 0 | 15 / 17 / 17 |
| 360x640 | 6,236 | 0 | 0 | 0 | 0 | 114 | yes | 419 | 0 | 0 | 15 / 15 / 17 |

At 360×640, a small screen, most pages are taller than the frame at the smallest size used (15 px), so they scroll inside the page frame. Nothing is cut off. The same walk also runs as an automated test in jsdom on every test run: `QuranReader.ui.test.tsx`, "shows every one of the 6,236 verses exactly once…".

## 3. The 114 surahs

All 114 names in the app match Tanzil's, ignoring hamza and alef forms and diacritics. Every verse count is identical in the text, in Tanzil's metadata and in the app's own table. The page numbers come from Tanzil's metadata (Medina Mushaf, 604 pages).

| # | Name in the app | Name in Tanzil | Verses in the text | Verses in Tanzil metadata | Verses in the app table | Type | Starts on page |
|---:|---|---|---:|---:|---:|---|---:|
| 1 | الفاتحة | الفاتحة | 7 | 7 | 7 | Meccan | 1 |
| 2 | البقرة | البقرة | 286 | 286 | 286 | Medinan | 2 |
| 3 | آل عمران | آل عمران | 200 | 200 | 200 | Medinan | 50 |
| 4 | النساء | النساء | 176 | 176 | 176 | Medinan | 77 |
| 5 | المائدة | المائدة | 120 | 120 | 120 | Medinan | 106 |
| 6 | الأنعام | الأنعام | 165 | 165 | 165 | Meccan | 128 |
| 7 | الأعراف | الأعراف | 206 | 206 | 206 | Meccan | 151 |
| 8 | الأنفال | الأنفال | 75 | 75 | 75 | Medinan | 177 |
| 9 | التوبة | التوبة | 129 | 129 | 129 | Medinan | 187 |
| 10 | يونس | يونس | 109 | 109 | 109 | Meccan | 208 |
| 11 | هود | هود | 123 | 123 | 123 | Meccan | 221 |
| 12 | يوسف | يوسف | 111 | 111 | 111 | Meccan | 235 |
| 13 | الرعد | الرعد | 43 | 43 | 43 | Medinan | 249 |
| 14 | إبراهيم | ابراهيم | 52 | 52 | 52 | Meccan | 255 |
| 15 | الحجر | الحجر | 99 | 99 | 99 | Meccan | 262 |
| 16 | النحل | النحل | 128 | 128 | 128 | Meccan | 267 |
| 17 | الإسراء | الإسراء | 111 | 111 | 111 | Meccan | 282 |
| 18 | الكهف | الكهف | 110 | 110 | 110 | Meccan | 293 |
| 19 | مريم | مريم | 98 | 98 | 98 | Meccan | 305 |
| 20 | طه | طه | 135 | 135 | 135 | Meccan | 312 |
| 21 | الأنبياء | الأنبياء | 112 | 112 | 112 | Meccan | 322 |
| 22 | الحج | الحج | 78 | 78 | 78 | Medinan | 332 |
| 23 | المؤمنون | المؤمنون | 118 | 118 | 118 | Meccan | 342 |
| 24 | النور | النور | 64 | 64 | 64 | Medinan | 350 |
| 25 | الفرقان | الفرقان | 77 | 77 | 77 | Meccan | 359 |
| 26 | الشعراء | الشعراء | 227 | 227 | 227 | Meccan | 367 |
| 27 | النمل | النمل | 93 | 93 | 93 | Meccan | 377 |
| 28 | القصص | القصص | 88 | 88 | 88 | Meccan | 385 |
| 29 | العنكبوت | العنكبوت | 69 | 69 | 69 | Meccan | 396 |
| 30 | الروم | الروم | 60 | 60 | 60 | Meccan | 404 |
| 31 | لقمان | لقمان | 34 | 34 | 34 | Meccan | 411 |
| 32 | السجدة | السجدة | 30 | 30 | 30 | Meccan | 415 |
| 33 | الأحزاب | الأحزاب | 73 | 73 | 73 | Medinan | 418 |
| 34 | سبأ | سبإ | 54 | 54 | 54 | Meccan | 428 |
| 35 | فاطر | فاطر | 45 | 45 | 45 | Meccan | 434 |
| 36 | يس | يس | 83 | 83 | 83 | Meccan | 440 |
| 37 | الصافات | الصافات | 182 | 182 | 182 | Meccan | 446 |
| 38 | ص | ص | 88 | 88 | 88 | Meccan | 453 |
| 39 | الزمر | الزمر | 75 | 75 | 75 | Meccan | 458 |
| 40 | غافر | غافر | 85 | 85 | 85 | Meccan | 467 |
| 41 | فصلت | فصلت | 54 | 54 | 54 | Meccan | 477 |
| 42 | الشورى | الشورى | 53 | 53 | 53 | Meccan | 483 |
| 43 | الزخرف | الزخرف | 89 | 89 | 89 | Meccan | 489 |
| 44 | الدخان | الدخان | 59 | 59 | 59 | Meccan | 496 |
| 45 | الجاثية | الجاثية | 37 | 37 | 37 | Meccan | 499 |
| 46 | الأحقاف | الأحقاف | 35 | 35 | 35 | Meccan | 502 |
| 47 | محمد | محمد | 38 | 38 | 38 | Medinan | 507 |
| 48 | الفتح | الفتح | 29 | 29 | 29 | Medinan | 511 |
| 49 | الحجرات | الحجرات | 18 | 18 | 18 | Medinan | 515 |
| 50 | ق | ق | 45 | 45 | 45 | Meccan | 518 |
| 51 | الذاريات | الذاريات | 60 | 60 | 60 | Meccan | 520 |
| 52 | الطور | الطور | 49 | 49 | 49 | Meccan | 523 |
| 53 | النجم | النجم | 62 | 62 | 62 | Meccan | 526 |
| 54 | القمر | القمر | 55 | 55 | 55 | Meccan | 528 |
| 55 | الرحمن | الرحمن | 78 | 78 | 78 | Medinan | 531 |
| 56 | الواقعة | الواقعة | 96 | 96 | 96 | Meccan | 534 |
| 57 | الحديد | الحديد | 29 | 29 | 29 | Medinan | 537 |
| 58 | المجادلة | المجادلة | 22 | 22 | 22 | Medinan | 542 |
| 59 | الحشر | الحشر | 24 | 24 | 24 | Medinan | 545 |
| 60 | الممتحنة | الممتحنة | 13 | 13 | 13 | Medinan | 549 |
| 61 | الصف | الصف | 14 | 14 | 14 | Medinan | 551 |
| 62 | الجمعة | الجمعة | 11 | 11 | 11 | Medinan | 553 |
| 63 | المنافقون | المنافقون | 11 | 11 | 11 | Medinan | 554 |
| 64 | التغابن | التغابن | 18 | 18 | 18 | Medinan | 556 |
| 65 | الطلاق | الطلاق | 12 | 12 | 12 | Medinan | 558 |
| 66 | التحريم | التحريم | 12 | 12 | 12 | Medinan | 560 |
| 67 | الملك | الملك | 30 | 30 | 30 | Meccan | 562 |
| 68 | القلم | القلم | 52 | 52 | 52 | Meccan | 564 |
| 69 | الحاقة | الحاقة | 52 | 52 | 52 | Meccan | 566 |
| 70 | المعارج | المعارج | 44 | 44 | 44 | Meccan | 568 |
| 71 | نوح | نوح | 28 | 28 | 28 | Meccan | 570 |
| 72 | الجن | الجن | 28 | 28 | 28 | Meccan | 572 |
| 73 | المزمل | المزمل | 20 | 20 | 20 | Meccan | 574 |
| 74 | المدثر | المدثر | 56 | 56 | 56 | Meccan | 575 |
| 75 | القيامة | القيامة | 40 | 40 | 40 | Meccan | 577 |
| 76 | الإنسان | الانسان | 31 | 31 | 31 | Medinan | 578 |
| 77 | المرسلات | المرسلات | 50 | 50 | 50 | Meccan | 580 |
| 78 | النبأ | النبإ | 40 | 40 | 40 | Meccan | 582 |
| 79 | النازعات | النازعات | 46 | 46 | 46 | Meccan | 583 |
| 80 | عبس | عبس | 42 | 42 | 42 | Meccan | 585 |
| 81 | التكوير | التكوير | 29 | 29 | 29 | Meccan | 586 |
| 82 | الانفطار | الإنفطار | 19 | 19 | 19 | Meccan | 587 |
| 83 | المطففين | المطففين | 36 | 36 | 36 | Meccan | 587 |
| 84 | الانشقاق | الإنشقاق | 25 | 25 | 25 | Meccan | 589 |
| 85 | البروج | البروج | 22 | 22 | 22 | Meccan | 590 |
| 86 | الطارق | الطارق | 17 | 17 | 17 | Meccan | 591 |
| 87 | الأعلى | الأعلى | 19 | 19 | 19 | Meccan | 591 |
| 88 | الغاشية | الغاشية | 26 | 26 | 26 | Meccan | 592 |
| 89 | الفجر | الفجر | 30 | 30 | 30 | Meccan | 593 |
| 90 | البلد | البلد | 20 | 20 | 20 | Meccan | 594 |
| 91 | الشمس | الشمس | 15 | 15 | 15 | Meccan | 595 |
| 92 | الليل | الليل | 21 | 21 | 21 | Meccan | 595 |
| 93 | الضحى | الضحى | 11 | 11 | 11 | Meccan | 596 |
| 94 | الشرح | الشرح | 8 | 8 | 8 | Meccan | 596 |
| 95 | التين | التين | 8 | 8 | 8 | Meccan | 597 |
| 96 | العلق | العلق | 19 | 19 | 19 | Meccan | 597 |
| 97 | القدر | القدر | 5 | 5 | 5 | Meccan | 598 |
| 98 | البينة | البينة | 8 | 8 | 8 | Medinan | 598 |
| 99 | الزلزلة | الزلزلة | 8 | 8 | 8 | Medinan | 599 |
| 100 | العاديات | العاديات | 11 | 11 | 11 | Meccan | 599 |
| 101 | القارعة | القارعة | 11 | 11 | 11 | Meccan | 600 |
| 102 | التكاثر | التكاثر | 8 | 8 | 8 | Meccan | 600 |
| 103 | العصر | العصر | 3 | 3 | 3 | Meccan | 601 |
| 104 | الهمزة | الهمزة | 9 | 9 | 9 | Meccan | 601 |
| 105 | الفيل | الفيل | 5 | 5 | 5 | Meccan | 601 |
| 106 | قريش | قريش | 4 | 4 | 4 | Meccan | 602 |
| 107 | الماعون | الماعون | 7 | 7 | 7 | Meccan | 602 |
| 108 | الكوثر | الكوثر | 3 | 3 | 3 | Meccan | 602 |
| 109 | الكافرون | الكافرون | 6 | 6 | 6 | Meccan | 603 |
| 110 | النصر | النصر | 3 | 3 | 3 | Medinan | 603 |
| 111 | المسد | المسد | 5 | 5 | 5 | Meccan | 603 |
| 112 | الإخلاص | الإخلاص | 4 | 4 | 4 | Meccan | 604 |
| 113 | الفلق | الفلق | 5 | 5 | 5 | Meccan | 604 |
| 114 | الناس | الناس | 6 | 6 | 6 | Meccan | 604 |

## 4. Character inventory

| Code point | Name | Occurrences |
|---|---|---:|
| U+0020 | SPACE | 71,645 |
| U+0621 | ARABIC LETTER HAMZA | 2,782 |
| U+0623 | ARABIC LETTER ALEF WITH HAMZA ABOVE | 8,900 |
| U+0624 | ARABIC LETTER WAW WITH HAMZA ABOVE | 706 |
| U+0625 | ARABIC LETTER ALEF WITH HAMZA BELOW | 5,088 |
| U+0626 | ARABIC LETTER YEH WITH HAMZA ABOVE | 921 |
| U+0627 | ARABIC LETTER ALEF | 25,184 |
| U+0628 | ARABIC LETTER BEH | 11,603 |
| U+0629 | ARABIC LETTER TEH MARBUTA | 2,344 |
| U+062A | ARABIC LETTER TEH | 10,520 |
| U+062B | ARABIC LETTER THEH | 1,414 |
| U+062C | ARABIC LETTER JEEM | 3,317 |
| U+062D | ARABIC LETTER HAH | 4,364 |
| U+062E | ARABIC LETTER KHAH | 2,497 |
| U+062F | ARABIC LETTER DAL | 5,991 |
| U+0630 | ARABIC LETTER THAL | 4,932 |
| U+0631 | ARABIC LETTER REH | 12,627 |
| U+0632 | ARABIC LETTER ZAIN | 1,599 |
| U+0633 | ARABIC LETTER SEEN | 6,122 |
| U+0634 | ARABIC LETTER SHEEN | 2,124 |
| U+0635 | ARABIC LETTER SAD | 2,074 |
| U+0636 | ARABIC LETTER DAD | 1,686 |
| U+0637 | ARABIC LETTER TAH | 1,273 |
| U+0638 | ARABIC LETTER ZAH | 853 |
| U+0639 | ARABIC LETTER AIN | 9,405 |
| U+063A | ARABIC LETTER GHAIN | 1,221 |
| U+0640 | ARABIC TATWEEL | 812 |
| U+0641 | ARABIC LETTER FEH | 8,747 |
| U+0642 | ARABIC LETTER QAF | 7,034 |
| U+0643 | ARABIC LETTER KAF | 10,497 |
| U+0644 | ARABIC LETTER LAM | 38,550 |
| U+0645 | ARABIC LETTER MEEM | 27,071 |
| U+0646 | ARABIC LETTER NOON | 27,380 |
| U+0647 | ARABIC LETTER HEH | 14,962 |
| U+0648 | ARABIC LETTER WAW | 24,970 |
| U+0649 | ARABIC LETTER ALEF MAKSURA | 6,603 |
| U+064A | ARABIC LETTER YEH | 18,334 |
| U+064B | ARABIC FATHATAN | 3,741 |
| U+064C | ARABIC DAMMATAN | 2,519 |
| U+064D | ARABIC KASRATAN | 2,633 |
| U+064E | ARABIC FATHA | 123,396 |
| U+064F | ARABIC DAMMA | 37,320 |
| U+0650 | ARABIC KASRA | 46,642 |
| U+0651 | ARABIC SHADDA | 23,016 |
| U+0652 | ARABIC SUKUN | 37,372 |
| U+0653 | ARABIC MADDAH ABOVE | 5,376 |
| U+0654 | ARABIC HAMZA ABOVE | 773 |
| U+0670 | ARABIC LETTER SUPERSCRIPT ALEF | 9,838 |
| U+0671 | ARABIC LETTER ALEF WASLA | 13,819 |
| U+06DC | ARABIC SMALL HIGH SEEN | 2 |
| U+06DF | ARABIC SMALL HIGH ROUNDED ZERO | 3,988 |
| U+06E0 | ARABIC SMALL HIGH UPRIGHT RECTANGULAR ZERO | 66 |
| U+06E2 | ARABIC SMALL HIGH MEEM ISOLATED FORM | 510 |
| U+06E3 | ARABIC SMALL LOW SEEN | 1 |
| U+06E5 | ARABIC SMALL WAW | 1,257 |
| U+06E6 | ARABIC SMALL YEH | 957 |
| U+06E7 | ARABIC SMALL HIGH YEH | 38 |
| U+06E8 | ARABIC SMALL HIGH NOON | 1 |
| U+06EA | ARABIC EMPTY CENTRE LOW STOP | 1 |
| U+06EB | ARABIC EMPTY CENTRE HIGH STOP | 1 |
| U+06EC | ARABIC ROUNDED HIGH STOP WITH FILLED CENTRE | 1 |
| U+06ED | ARABIC SMALL LOW MEEM | 99 |

## Automated tests kept in the project

- `src/lib/quranText.test.ts`:
  - the SHA-256 of both files;
  - 114 surahs and 6,236 verses, with counts checked against the metadata and the app's table;
  - a round trip of all 6,236 lines;
  - allowed characters only: no digits, control characters or stray spaces, and no normalisation;
  - the notice; page and juz boundaries; the basmala display split for all 112 surahs.
- `src/components/QuranReader.ui.test.tsx`: all 604 pages are rendered and every verse is checked once, exactly as stored, with its verse number.
