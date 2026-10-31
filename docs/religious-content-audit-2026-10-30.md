# Religious content audit — the whole DITHAR app (2026-10-30)

> **Superseded** by `docs/religious-content-audit-scoped-2026-10-30.md`. The audit is now limited to Prophetic Hadiths, the Quranic Wamadat / Lataif and the Saadi Lataif. Written and Audio Adhkar, duas, Tasbeeh and everything else are restored to their pre-audit state and are not gated. This report is kept as the record of the earlier, wider pass.


Every religious text the app can display was traced to its data file, checked against an authoritative original source, and then approved or excluded. Excluded texts are not deleted: they stay unchanged in their data files and are kept off the screens by `src/data/religiousAudit.ts`. Approval required positive verification against a source. Finding no error was never enough.

This audit supersedes the widget-only audit (`docs/widget-religious-audit-2026-10-30.md`).

## Totals

| | Items | Approved | Excluded |
|---|---|---|---|
| Qur'an reader: verses | 6,236 | 6,236 | 0 |
| Qur'an reader: Mushaf pages (1441H Madinah print) | 604 | 604 | 0 |
| Hadith, duas, adhkar, Lataif, poetry: records | 1065 | 345 | 720 |
| …of which unique texts (the same text in several sections counted once) | 994 | | |
| DITHAR's own reflections and comments | 572 | 0 | 572 |

English translations: **90** approved (89 items plus one dhikr virtue line), each verbatim in a published translation of the same source with a named translator. All other English lines are hidden, and those items are shown in Arabic only.

**Unique items reviewed: 7,802** (6,236 verses, 994 unique hadith/dua/dhikr/Lataif/poetry texts, 572 editorial texts), plus the 604 Mushaf page images.

## Sections and their data sources

| Screen / feature | Data source | Items | Approved | English approved |
|---|---|---|---|---|
| Home — header quote | `src/data/content.ts` (`featuredQuote`) | 1 | 0 | 0 |
| Startup overlay | `src/data/startupHadith.ts` | 1 | 1 | 0 |
| Home — Daily Picks | `src/data/misc-library.ts` via `lib/dailyPicks.ts` | 49 | 39 | 15 |
| Written Adhkar — Morning | `src/data/dithar-adhkar-cards.json` → `src/data/written-adhkar.ts` | 22 | 5 | 0 |
| Written Adhkar — Evening | same | 22 | 4 | 0 |
| Written Adhkar — Prayer | same | 14 | 5 | 0 |
| Written Adhkar — Various | `src/data/written-adhkar.ts` | 9 | 7 | 0 |
| Written Adhkar — Search | all four lists above | 67 | 21 | 0 |
| Audio Adhkar — Morning / Evening | `src/data/audio-adhkar.ts` (Written Morning/Evening) | 22 | 5 | 0 |
| Tasbeeh counter, floating Tasbeeh (phrase) | `src/data/tasbeeh-library.json` → `src/data/tasbeeh.ts` | 16 | 13 | 0 |
| Reminders: notifications, Spiritual Reminder view, home-screen widget, Favorites | `lib/reminderContent.ts` ← hadith library, enriched hadiths/duas, imported duas, dua library, dhikr virtues, poems, reminder verses, Wamdat and Saadi Lataif | 956 | 301 | 89 |
| Favorites — library hearts | `src/data/misc-library.ts` | 89 | 62 | 15 |
| Audio Adhkar — Various (+ Islamic occasions) | `src/data/audio-adhkar.ts` ← Tasbeeh library | 15 | 13 | 0 |
| Mushaf (Qur'an reader) | `public/mushaf/hafs-kfqc/` (pages), `src/data/quran/tanzil-quran-uthmani.txt` (verse text) | 6,236 verses / 604 pages | all | — |
| DITHAR reflections and comments (reminders, widget, Favorites) | `widgetContent.ts`, `dhikrReflections.ts`, `duaReflections.ts`, hadith-library reflections | 572 | 0 | 0 |

The Religious Content Review screen (Settings, marked temporary) is a reviewer's tool. It still lists every text, so excluded items can be corrected there. The audit decides what is published.

## Per data file

| Data file | Records | Approved | Excluded | English approved |
|---|---|---|---|---|
| Hadith library (ASSETS/dithar_hadith_library_final.json) | 200 | 104 | 96 | 0 |
| Enriched hadiths (src/data/widgetContent.ts) | 55 | 51 | 4 | 9 |
| Enriched duas (src/data/widgetContent.ts) | 25 | 23 | 2 | 18 |
| Imported duas (src/data/importedDuas.ts) | 30 | 30 | 0 | 20 |
| Misc dua library (src/data/misc-library.ts) | 89 | 62 | 27 | 15 |
| Written adhkar (src/data/written-adhkar.ts, dithar-adhkar-cards.json) | 67 | 21 | 46 | 0 |
| Tasbeeh library (src/data/tasbeeh-library.json) | 16 | 13 | 3 | 1 |
| Startup hadith (src/data/startupHadith.ts) | 1 | 1 | 0 | 0 |
| Home header quote (src/data/content.ts featuredQuote) | 1 | 0 | 1 | 0 |
| Reminder verses (src/data/widgetVerses.ts) | 19 | 19 | 0 | 7 |
| Saadi Lataif (src/data/quranLataif.ts) | 20 | 20 | 0 | 20 |
| Wamdat Lataif (src/data/wamdat.ts) | 522 | 0 | 522 | 0 |
| Poems (src/data/widgetContent.ts) | 20 | 1 | 19 | 0 |

## Sources used (each opened and compared directly, never answered from memory)

| Content | Source |
|---|---|
| Qur'an text | Tanzil Project, Uthmani and Simple texts — https://tanzil.net/download (fresh download compared verse by verse); also `api.alquran.cloud` editions `quran-uthmani` / `quran-simple` |
| Qur'an English | Saheeh International, `api.alquran.cloud` edition `en.sahih` |
| Mushaf pages | quran-svg v1.1.1 release archives — https://github.com/quran-ws/quran-svg/releases/tag/v1.1.1 (SHA-256 matched GitHub's recorded digests; every page compared byte for byte) |
| Hadith (six books), Arabic and English, with graders | fawazahmed0/hadith-api — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ (Arabic and English editions of al-Bukhari, Muslim, Abu Dawud, al-Tirmidhi, al-Nasa'i, Ibn Majah; grades by al-Albani, Zubair Ali Zai, Shu'ayb al-Arna'ut, Ahmad Shakir, Bashar Awwad Ma'ruf; English translators recorded: Muhammad Muhsin Khan (al-Bukhari), Abdul Hamid Siddiqui (Muslim)) |
| Cross-check corpus (sunnah.com-derived) | AhmedBaset/hadith-json — https://github.com/AhmedBaset/hadith-json (narrator lines; Riyad as-Salihin; al-Adab al-Mufrad; part of Musnad Ahmad) |
| Tafsir | spa5k/tafsir_api — https://github.com/spa5k/tafsir_api (al-Sa'di, Ibn Kathir, al-Tabari, al-Zamakhshari's al-Kashshaf, Ibn Ashur's al-Tahrir wa al-Tanwir, Abu Hayyan's al-Bahr al-Muhit), fetched per verse |

**Not reachable:** sunnah.com and dorar.net refuse automated access (HTTP 403). The app's citations of al-Mustadrak, al-Tabarani, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, Hilyat al-Awliya, Sahih al-Targhib, al-Silsila al-Sahiha, the printed al-Adab al-Mufrad numbering, al-Raghib's Mufradat, the books of Ibn al-Qayyim, Ibn Baz's gradings and the poets' diwans could therefore not be opened. Items that depend on them are **excluded as unverifiable**. They are not judged inauthentic.

## Rules applied

- **Wording:** the text must be verbatim at a cited reference. Only diacritics and fixed spelling conventions are set aside: hamza seats, ta marbuta and alif maqsura, السماوات/السموات, رؤوس/رءوس, مائة/مئة, باسم/بسم. A different word, a missing word, a different word order, or a merge of two narrations is a mismatch. Count instructions such as «ثلاث مرات» are checked separately from the dhikr.
- **Qur'an:** verbatim at the cited surah and ayah, letter for letter and in vowelling. The only allowed difference is the imla'i assimilation convention («مِن رَّحْمَةِ» for «مِنْ رَحْمَةِ»). The citation's numbers must match the verse.
- **References:** every cited reference must hold the same narration. Where the wording is verbatim at one and the other cites the same narration in other wording, each pair was read by hand. A reference that names no checkable source is not enough («ثابت في السنة» is an example).
- **Narrator:** the cited narration must name the narrator as specifically as the app does. «عن عبد الله» alone does not establish Ibn Mas'ud, and «عن جابر» alone does not establish Jabir ibn Abdullah.
- **Grades:** every displayed grade or grader must be recorded for the cited narration: al-Albani, Zubair Ali Zai, Shu'ayb al-Arna'ut or Bashar Awwad Ma'ruf in the dataset, or al-Tirmidhi's own verdict in its text. «متفق عليه» needs both Sahihs cited.
- **Tafsir:** the excerpt must be verbatim in the named tafsir at the cited verse. A summary credited to an author is excluded.
- **English:** verbatim in a published translation of the same cited source whose translator is recorded. Unknown-translator editions (the four Sunan) and DITHAR's own renderings are not approved.
- **Editorial:** DITHAR's reflections and comments quote no source and so cannot be verified against one. They are excluded (`EDITORIAL_AUDITED` in `src/lib/religiousAudit.ts`).

## How it is enforced

- `src/data/religiousAudit.ts` is the register, with one entry per text. A text with no entry is never shown, so content added later stays hidden until it is audited.
- `src/lib/religiousAudit.ts` holds the lookups, plus `EDITORIAL_AUDITED` and `AUDIT_ENFORCED`.
- The data modules export the audited lists under their existing names, so every screen, the audio, progress counts and search stay consistent. The full shipped lists stay available as `ALL_WRITTEN_ADHKAR_ITEMS`, `ALL_DHIKR_ITEMS` and `ALL_MISC_DUAS` for the review screen.
- `lib/reminderContent.ts` `reminderPool()` publishes only approved items. It shows English only when verified and evidence only when verified, never shows a comment or reflection, and holds back any item a reviewer has edited until it is re-audited.
- Gated individually: the home quote (`FeaturedQuote`), the startup overlay's English line, Favorites (rows rebuilt from the published item), tapped notifications (`lib/reminderOpen.ts`), widget favorites (`lib/favoritesSync.ts`) and the widget (`lib/widgetFeed.ts`).
- Tests: `src/lib/religiousAudit.test.tsx` checks the audited configuration that users get. Feature tests run with the audit switched off by a test-only setup (`src/test/auditOff.ts`) so they keep testing the features against the full content.
- Backups of every changed file: `backups/religious-audit-2026-10-30/`. Earlier widget-audit backups: `backups/widget-religious-audit-2026-10-30/`.

## Hadith library (ASSETS/dithar_hadith_library_final.json)

### Approved (104)

| Item | Verified source | English |
|---|---|---|
| `hadith:4` | verbatim in Sahih al-Bukhari 10; same narration, other wording, in Sahih Muslim 41 | not shown |
| `hadith:5` | verbatim in Sahih Muslim 47; same narration, other wording, in Sahih al-Bukhari 6018 | not shown |
| `hadith:6` | verbatim in Sahih al-Bukhari 6474 | not shown |
| `hadith:8` | verbatim in Sahih al-Bukhari 13; same narration, other wording, in Sahih Muslim 45 | not shown |
| `hadith:9` | verbatim in Sahih al-Bukhari 481; same narration, other wording, in Sahih Muslim 2585 | not shown |
| `hadith:10` | verbatim in Sahih Muslim 2586; same narration, other wording, in Sahih al-Bukhari 6011 | not shown |
| `hadith:11` | verbatim in Sahih al-Bukhari 7376; same narration, other wording, in Sahih Muslim 2319 | not shown |
| `hadith:12` | verbatim in Sahih Muslim 2594 | not shown |
| `hadith:13` | verbatim in Sahih Muslim 2593 | not shown |
| `hadith:14` | verbatim in Sahih al-Bukhari 6114, Sahih Muslim 2609 | not shown |
| `hadith:15` | verbatim in Sahih Muslim 2607; same narration, other wording, in Sahih al-Bukhari 6094 | not shown |
| `hadith:16` | verbatim in Sahih al-Bukhari 33; same narration, other wording, in Sahih Muslim 59 | not shown |
| `hadith:17` | verbatim in Sahih Muslim 2588 | not shown |
| `hadith:18` | verbatim in Sahih Muslim 2865 | not shown |
| `hadith:19` | verbatim in Sahih Muslim 91 | not shown |
| `hadith:20` | verbatim in Sahih Muslim 2699 | not shown |
| `hadith:28` | verbatim in Jami at-Tirmidhi 3895 | not shown |
| `hadith:31` | verbatim in Sahih Muslim 2999 | not shown |
| `hadith:32` | verbatim in Sahih Muslim 2578 | not shown |
| `hadith:34` | verbatim in Sahih Muslim 2699 | not shown |
| `hadith:35` | verbatim in Sahih Muslim | not shown |
| `hadith:37` | verbatim in Jami at-Tirmidhi 1956 | not shown |
| `hadith:38` | verbatim in Sahih al-Bukhari 2989, Sahih Muslim 1009 | not shown |
| `hadith:42` | verbatim in Sahih al-Bukhari 6056, Sahih Muslim 105 | not shown |
| `hadith:45` | verbatim in Sahih Muslim 1914; the source line's note (the same report with «غصن» in al-Bukhari) is in Sahih al-Bukhari 652 and 2472 | not shown |
| `hadith:46` | verbatim in Sahih Muslim 2589 | not shown |
| `hadith:52` | verbatim in Sunan Abi Dawud 4800 | not shown |
| `hadith:54` | verbatim in Sahih Muslim 2766; same narration, other wording, in Sahih al-Bukhari 3470 | not shown |
| `hadith:61` | verbatim in Sahih al-Bukhari 3062; same narration, other wording, in Sahih Muslim 111 | not shown |
| `hadith:63` | verbatim in Sahih al-Bukhari 3336, Sahih Muslim 2638 | not shown |
| `hadith:64` | verbatim in Sahih al-Bukhari 4729, Sahih Muslim 2785 | not shown |
| `hadith:65` | verbatim in Sahih al-Bukhari 2887 | not shown |
| `hadith:67` | verbatim in Sahih al-Bukhari 2493 | not shown |
| `hadith:68` | verbatim in Sahih al-Bukhari 4686; same narration, other wording, in Sahih Muslim 2583 | not shown |
| `hadith:71` | verbatim in Sahih Muslim 1893 | not shown |
| `hadith:72` | verbatim in Sahih Muslim 1153; same narration, other wording, in Sahih al-Bukhari 2840 | not shown |
| `hadith:73` | verbatim in Sahih Muslim 223 | not shown |
| `hadith:74` | verbatim in Sahih Muslim 2676 | not shown |
| `hadith:76` | verbatim in Sahih Muslim 118 | not shown |
| `hadith:77` | verbatim in Sahih al-Bukhari 110, Sahih Muslim | not shown |
| `hadith:84` | verbatim in Sunan Abi Dawud 4811; same narration, other wording, in Jami at-Tirmidhi 1954 | not shown |
| `hadith:86` | verbatim in Sahih Muslim 384 | not shown |
| `hadith:87` | verbatim in Sahih Muslim 1016; same narration, other wording, in Sahih al-Bukhari 1417 | not shown |
| `hadith:88` | verbatim in Sahih al-Bukhari 16; same narration, other wording, in Sahih Muslim 43 | not shown |
| `hadith:89` | verbatim in Sahih al-Bukhari 1903 | not shown |
| `hadith:90` | verbatim in Sahih Muslim 2560; same narration, other wording, in Sahih al-Bukhari 6077 | not shown |
| `hadith:91` | verbatim in Sahih Muslim 2631 | not shown |
| `hadith:94` | verbatim in Jami at-Tirmidhi 2910 | not shown |
| `hadith:97` | verbatim in Sahih al-Bukhari 2736, Sahih Muslim 2677 | not shown |
| `hadith:99` | verbatim in Sahih Muslim 2266; same narration, other wording, in Sahih al-Bukhari 6993 | not shown |
| `hadith:102` | verbatim in Sahih Muslim 634 | not shown |
| `hadith:103` | verbatim in Sunan Abi Dawud 561, Jami at-Tirmidhi 223 | not shown |
| `hadith:105` | verbatim in Sunan Abi Dawud 3116 | not shown |
| `hadith:107` | verbatim in Sahih al-Bukhari 5997, Sahih Muslim 2318 | not shown |
| `hadith:108` | verbatim in Sahih al-Bukhari 2072 | not shown |
| `hadith:109` | verbatim in Sahih al-Bukhari 1427; same narration, other wording, in Sahih Muslim 1034 | not shown |
| `hadith:112` | verbatim in Jami at-Tirmidhi 2390 | not shown |
| `hadith:114` | verbatim in Jami at-Tirmidhi 1924; same narration, other wording, in Sunan Abi Dawud 4941 | not shown |
| `hadith:115` | verbatim in Jami at-Tirmidhi 2317 | not shown |
| `hadith:116` | verbatim in Sahih Muslim 55 | not shown |
| `hadith:117` | verbatim in Sahih al-Bukhari 15; same narration, other wording, in Sahih Muslim 44 | not shown |
| `hadith:118` | verbatim in Sahih Muslim 1563 | not shown |
| `hadith:119` | verbatim in Sunan Ibn Majah 4245 | not shown |
| `hadith:120` | verbatim in Sahih Muslim 1054 | not shown |
| `hadith:123` | verbatim in Sahih Muslim 2674 | not shown |
| `hadith:127` | verbatim in Sahih al-Bukhari 48, Sahih Muslim 64 | not shown |
| `hadith:128` | verbatim in Sahih Muslim 67 | not shown |
| `hadith:134` | verbatim in Sahih Muslim 1855 | not shown |
| `hadith:137` | verbatim in Sahih Muslim 2618 | not shown |
| `hadith:138` | verbatim in Sahih al-Bukhari 5027 | not shown |
| `hadith:139` | verbatim in Sahih al-Bukhari 61, Sahih Muslim 2811 | not shown |
| `hadith:140` | verbatim in Sahih al-Bukhari 6117, Sahih Muslim 37 | not shown |
| `hadith:141` | verbatim in Sunan Ibn Majah 2144 | not shown |
| `hadith:142` | verbatim in Jami at-Tirmidhi 2139 | not shown |
| `hadith:143` | verbatim in Sahih Muslim 1164 | not shown |
| `hadith:145` | verbatim in Sahih al-Bukhari 1240; same narration, other wording, in Sahih Muslim 2162 | not shown |
| `hadith:147` | verbatim in Sahih Muslim 1006 | not shown |
| `hadith:148` | verbatim in Jami at-Tirmidhi 3479 | not shown |
| `hadith:150` | verbatim in Sahih al-Bukhari 7013, Sahih Muslim 523 | not shown |
| `hadith:151` | verbatim in Sahih Muslim 1718; same narration, other wording, in Sahih al-Bukhari 2697 | not shown |
| `hadith:152` | verbatim in Sahih Muslim 867 | not shown |
| `hadith:153` | verbatim in Sahih al-Bukhari 1393 | not shown |
| `hadith:154` | verbatim in Sahih Muslim 49 | not shown |
| `hadith:156` | verbatim in Sahih al-Bukhari 5641; same narration, other wording, in Sahih Muslim 2573 | not shown |
| `hadith:157` | verbatim in Sahih al-Bukhari 5645 | not shown |
| `hadith:160` | verbatim in Sahih al-Bukhari 5757; same narration, other wording, in Sahih Muslim 2220 | not shown |
| `hadith:163` | verbatim in Sahih al-Bukhari 5090; same narration, other wording, in Sahih Muslim 1466 | not shown |
| `hadith:166` | verbatim in Sahih Muslim 1162 | not shown |
| `hadith:168` | verbatim in Sahih al-Bukhari 1773, Sahih Muslim 1349 | not shown |
| `hadith:169` | verbatim in Sahih al-Bukhari 1521; same narration, other wording, in Sahih Muslim 1350 | not shown |
| `hadith:171` | verbatim in Sunan Abi Dawud 5128, Jami at-Tirmidhi, Sunan Ibn Majah | not shown |
| `hadith:173` | verbatim in Jami at-Tirmidhi 3443 | not shown |
| `hadith:174` | verbatim in Sahih Muslim 2160; same narration, other wording, in Sahih al-Bukhari 6231 | not shown |
| `hadith:176` | verbatim in Sahih al-Bukhari 6696 | not shown |
| `hadith:181` | verbatim in Sahih al-Bukhari 7158; same narration, other wording, in Sahih Muslim 1717 | not shown |
| `hadith:184` | verbatim in Jami at-Tirmidhi 2315; same narration, other wording, in Sunan Abi Dawud 4990 | not shown |
| `hadith:186` | verbatim in Sahih al-Bukhari 7070, Sahih Muslim 98 | not shown |
| `hadith:191` | verbatim in Sahih al-Bukhari 3461 | not shown |
| `hadith:194` | verbatim in Sahih Muslim 2956 | not shown |
| `hadith:195` | verbatim in Jami at-Tirmidhi 500; same narration, other wording, in Sunan Abi Dawud 1052, Sunan an-Nasai any, Sunan Ibn Majah any | not shown |
| `hadith:196` | verbatim in Sahih al-Bukhari 553 | not shown |
| `hadith:197` | verbatim in Sahih Muslim 82 | not shown |
| `hadith:198` | verbatim in Sahih Muslim 671 | not shown |
| `hadith:199` | verbatim in Sahih Muslim 35; same narration, other wording, in Sahih al-Bukhari 9 | not shown |

### Excluded (96)

| Item | Citation shown | Reason |
|---|---|---|
| `hadith:1` | صحيح البخاري، كتاب بدء الوحي (1 (ومسلم 1907)) | Wording differs from Sahih Muslim 1907: source «بالنيه» / app «بالنيات»; source «لامري» / app «لكل امري». |
| `hadith:2` | سنن الترمذي، كتاب البر والصلة (2018) | Narrator not established: al-Tirmidhi 2018 names only «جابر»; no cited narration names «جابر بن عبد الله». |
| `hadith:3` | سنن أبي داود، كتاب الأدب / سنن الترمذي (أبو داود 4799، الترمذي 2002) | Wording differs from Jami at-Tirmidhi 2002: source «» / app «من». |
| `hadith:7` | صحيح البخاري، كتاب الرقاق (6478) | Wording differs from Sahih al-Bukhari 6478: source «يرفع» / app «يرفعه». |
| `hadith:21` | صحيح البخاري، كتاب المظالم / صحيح مسلم (البخاري 2442، مسلم 2580) | Wording differs from Sahih al-Bukhari 2442: source «» / app «بها». |
| `hadith:22` | صحيح البخاري، كتاب الأدب / صحيح مسلم (البخاري 6014، مسلم 2624) | Wording differs from Sahih al-Bukhari 6014: source «يوصيني» / app «»; source «» / app «يوصيني». The exact wording is at Sahih al-Bukhari 6015, Sahih Muslim 2625, Sunan Abi Dawud 5152. |
| `hadith:23` | صحيح البخاري، كتاب الأدب (6016) | Narrator wrong: Bukhari 6016 is narrated by Abu Shurayh, not Abu Hurairah. |
| `hadith:24` | صحيح مسلم، كتاب البر والصلة (2551) | Wording differs from Sahih Muslim 2551: source «والديه» / app «ابويه»; source «ثم لم» / app «فلم». |
| `hadith:25` | سنن النسائي، كتاب الجهاد (3104) | Grading: the displayed grade «صحيح (حسن صحيح)» is not given by any grader recorded for the cited narration (Hasan Sahih, Isnaad Sahih). |
| `hadith:26` | صحيح البخاري، كتاب الجمعة / صحيح مسلم (البخاري 893، مسلم 1829) | Wording differs from Sahih Muslim 1829: source «مسيول» / app «مسوول»; source «مسيول» / app «مسوول». |
| `hadith:27` | سنن أبي داود، كتاب الصلاة (495) | Wording differs from Sunan Abi Dawud 495: source «سنين» / app «». |
| `hadith:29` | صحيح مسلم، كتاب الرضاع (1469) | Text found in Muslim, but the number 1469 could not be confirmed (the dataset files it under 1468; sunnah.com refused automated access). |
| `hadith:30` | سنن الترمذي، كتاب صفة القيامة (2516) | Wording differs from Jami at-Tirmidhi 2516: source «ولو» / app «وان». |
| `hadith:33` | صحيح مسلم، كتاب البر والصلة (الحديث القدسي) (2577) | Wording differs from Sahih Muslim 2577: source «» / app «منكم». |
| `hadith:36` | الأدب المفرد للبخاري، وأصله في صحيح مسلم من حديث حذيفة بنحوه (الأدب المفرد 225) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). |
| `hadith:39` | صحيح مسلم، كتاب السلام (2162) | Wording differs: Muslim 2162 reads «فسمّته», the app «فشمّته». |
| `hadith:40` | صحيح البخاري، كتاب الأدب / صحيح مسلم (البخاري 6064، مسلم 2559) | Wording not found in Sahih al-Bukhari, Sahih Muslim. The exact wording is at Sahih Muslim 2564. |
| `hadith:41` | صحيح البخاري، كتاب الأدب / صحيح مسلم (البخاري 6064، مسلم 2563) | Wording differs from Sahih Muslim 2563: source «تحسسوا ولا» / app «»; source «» / app «ولا تحسسوا». |
| `hadith:43` | صحيح مسلم، كتاب البر والصلة (2592) | Wording differs from Sahih Muslim 2592: source «» / app «كله». The exact wording is at Sunan Abi Dawud 4809. |
| `hadith:44` | المستدرك للحاكم (صححه الحاكم، وصححه الألباني في صحيح الجامع 1077) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:47` | سنن ابن ماجه، كتاب الأحكام (2340) | Narrator wrong: Ibn Majah 2340 is narrated by Ubadah ibn al-Samit (and reports «قضى أن لا ضرر ولا ضرار»), not Abu Sa'id al-Khudri. |
| `hadith:48` | الأدب المفرد للبخاري (353) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. The exact wording is at Jami at-Tirmidhi 1919, Jami at-Tirmidhi 1921. |
| `hadith:49` | صحيح البخاري، كتاب فضائل الصحابة / صحيح مسلم (متفق عليه) | Wording differs from Sahih al-Bukhari 3701: «ان يكون لك» → app «». |
| `hadith:50` | سنن الترمذي، كتاب صفة القيامة (2501) | Grading: the displayed grade «حسن» is not given by any grader recorded for the cited narration (Isnaad Hasan, Sahih, غريب لا نعرفه). |
| `hadith:51` | مسند الإمام أحمد، والتاريخ الكبير للبخاري (أحمد 17649 (وروي أيضاً بمعناه عن محمد بن أبي عميرة)) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:53` | صحيح البخاري، كتاب التوحيد / صحيح مسلم، كتاب الجنة (البخاري 4850، مسلم 2846) | Wording differs from Sahih Muslim 2846: source «فما لي» / app «مالي»; source «وغرتهم قال» / app «فقال». |
| `hadith:55` | صحيح البخاري، كتاب الزكاة / صحيح مسلم (البخاري 1474، مسلم 1040) | Wording differs from Sahih al-Bukhari 1474. |
| `hadith:56` | صحيح البخاري، كتاب الرقاق (حديث قدسي) (6502) | Wording differs from Sahih al-Bukhari 6502: source «افترضت» / app «افترضته»; source «وان» / app «ولين». |
| `hadith:57` | صحيح البخاري، كتاب بدء الخلق / صحيح مسلم، كتاب القدر (البخاري 3208، مسلم 2643) | Wording differs from Sahih Muslim 2643: source «» / app «نطفه»; source «في ذلك» / app «». |
| `hadith:58` | المعجم الكبير للطبراني، ورواه البزار في مسنده (الطبراني 754، البزار (كما في مجمع الزوائد 8/170)) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:59` | سنن الترمذي، كتاب صفة القيامة / سنن النسائي (الترمذي 614) | Wording differs from Jami at-Tirmidhi 614: source «» / app «امرا»; source «غشي ابوابهم» / app «دخل عليهم». The exact wording is at Jami at-Tirmidhi 2259. |
| `hadith:60` | صحيح البخاري، كتاب الأدب (6179) | Narrator wrong: Bukhari 6179 is narrated by Aisha, not Abu Hurairah. |
| `hadith:62` | صحيح البخاري، كتاب أحاديث الأنبياء (3483) | Wording differs from Sahih al-Bukhari 3483: source «» / app «الاولي»; source «تستحي فافعل» / app «تستح فاصنع». |
| `hadith:66` | صحيح البخاري، كتاب الرقاق / صحيح مسلم (البخاري 6507، مسلم 2684) | Wording differs from Sahih al-Bukhari 6507: source «ذاك» / app «ذلك». |
| `hadith:69` | مسند أحمد / سنن الترمذي (الترمذي 1931) | Wording not found in Jami at-Tirmidhi. |
| `hadith:70` | المستدرك للحاكم (صححه الحاكم) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:75` | صحيح البخاري، كتاب الكسوف / صحيح مسلم (البخاري 6485، مسلم 2359) | Wording differs from Sahih al-Bukhari 6485. |
| `hadith:78` | صحيح البخاري، كتاب اللباس / صحيح مسلم (البخاري 5950، مسلم 2109) | Narrator wrong: Muslim 2109 is narrated by Abdullah (via Masruq), not Ibn Abbas. |
| `hadith:79` | صحيح البخاري، كتاب الصلاة / صحيح مسلم (البخاري 450، مسلم 533) | Wording differs from Sahih Muslim 533: «تعالي قال بكير حسبت انه قال» → app «». |
| `hadith:80` | صحيح مسلم، كتاب الزهد والرقائق (2979) | Wording not found in Sahih Muslim. |
| `hadith:81` | سنن الترمذي، كتاب صفة القيامة (2307) | Wording differs from Jami at-Tirmidhi 2307: source «» / app «من». The exact wording is at Jami at-Tirmidhi 2460. |
| `hadith:82` | صحيح مسلم، كتاب الإيمان (101) | Wording not found in Sahih Muslim. The exact wording is at Sahih Muslim 102. |
| `hadith:83` | سنن الترمذي، كتاب الصلاة (413) | Narrator wrong: Tirmidhi 413 is narrated by Abu Hurairah, not Tamim al-Dari. |
| `hadith:85` | سنن أبي داود، كتاب المناسك (2041) | Grading: the displayed grade «حسن صحيح» is not given by any grader recorded for the cited narration (Hasan). |
| `hadith:92` | صحيح البخاري، كتاب الرقاق (6488) | Narrator not established: Bukhari 6488 names only «عبد الله»; no cited narration names Ibn Mas'ud. |
| `hadith:93` | صحيح البخاري، كتاب الدعوات (6410) | Wording differs from Sahih al-Bukhari 6410: source «حدثنا علي بن عبد» / app «ان». The exact wording is at Sahih Muslim 2677, Sunan Abi Dawud 1416, Jami at-Tirmidhi 453. |
| `hadith:95` | سنن الترمذي، كتاب صفة القيامة / سنن ابن ماجه (الترمذي 2499) | Wording differs from Jami at-Tirmidhi 2499: source «ابن» / app «بني». The exact wording is at Sunan Ibn Majah 4251. |
| `hadith:96` | صحيح البخاري، كتاب التوحيد (حديث قدسي) (7405) | Grading: shown as «متفق عليه» but only one Sahih is cited. |
| `hadith:98` | سنن ابن ماجه، كتاب الطهارة (277) | Wording differs from Sunan Ibn Majah 277: source «ولا» / app «ولن». |
| `hadith:100` | صحيح البخاري، كتاب التوحيد / صحيح مسلم (حديث قدسي) (البخاري 7507، مسلم 2758) | Wording differs from Sahih Muslim 2758. |
| `hadith:101` | صحيح مسلم، كتاب الصيد والذبائح (1955) | Wording differs from Sahih Muslim 1955: source «الذبح» / app «الذبحه»; source «فليرح» / app «وليرح». The exact wording is at Jami at-Tirmidhi 1409, Sunan an-Nasai 4405. |
| `hadith:104` | سنن أبي داود، كتاب الأدب (5212) | Wording differs from Sunan Abi Dawud 5212: source «يفترقا» / app «يتفرقا». The exact wording is at Sunan Ibn Majah 3703. |
| `hadith:106` | صحيح البخاري، كتاب الأذان / صحيح مسلم، كتاب الزكاة (البخاري 660، مسلم 1031) | Wording differs from Sahih al-Bukhari 660: source «الامام العادل» / app «امام عادل»; source «ربه» / app «الله». |
| `hadith:110` | صحيح البخاري، كتاب النفقات / صحيح مسلم (البخاري 5353، مسلم 2982) | The two quoted parts are verbatim in Muslim 2982, but the narrator's doubt «وأحسبه قال» between them is removed. |
| `hadith:111` | الأدب المفرد للبخاري (594) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:113` | سنن أبي داود، كتاب الأدب / سنن الترمذي (أبو داود 4777، الترمذي 2493) | Wording differs from Sunan Abi Dawud 4777: source «عز وجل» / app «سبحانه وتعالي»; source «الله» / app «». |
| `hadith:121` | صحيح مسلم، كتاب القدر (2664) | Wording differs from Sahih Muslim 2664: source «» / app «كذا»; source «فان لو تفتح عمل الشيطان» / app «». |
| `hadith:122` | صحيح البخاري، كتاب العلم / صحيح مسلم (البخاري 73، مسلم 816) | Wording differs from Sahih al-Bukhari 73: source «فسلط» / app «فسلطه». |
| `hadith:124` | صحيح مسلم، كتاب الأقضية (1715) | Wording differs from Sahih Muslim 1715: source «فيرضي» / app «يرضي». |
| `hadith:125` | سنن الترمذي، كتاب صفة القيامة (2458) | Wording differs from Jami at-Tirmidhi 2458: source «وتحفظ البطن» / app «والبطن»; source «وتتذكر» / app «ولتذكر». |
| `hadith:126` | صحيح البخاري، كتاب الأدب / صحيح مسلم (البخاري 5973، مسلم 90) | Wording differs from Sahih Muslim 90: source «» / app «الرجل». |
| `hadith:129` | صحيح البخاري، كتاب الجنائز / صحيح مسلم (البخاري 1294، مسلم 103) | Wording differs from Sahih al-Bukhari 1294: source «لطم» / app «ضرب». The exact wording is at Sahih al-Bukhari 1297, Sahih al-Bukhari 1298, Sahih al-Bukhari 3519. |
| `hadith:130` | صحيح مسلم، كتاب التوبة (2755) | Wording differs from Sahih Muslim 2755: source «بجنته» / app «في جنته»; source «جنته» / app «رحمته». |
| `hadith:131` | مسند الإمام أحمد / سنن أبي داود (أحمد 5385، أبو داود 3597) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording differs from Sunan Abi Dawud 3597: source «» / app «في امره»; source «عنه» / app «». |
| `hadith:132` | صحيح البخاري، كتاب الرقاق / صحيح مسلم (البخاري 6465، مسلم 782) | Wording differs from Sahih al-Bukhari 6465: source «» / app «الاعمال»; source «قال» / app «». |
| `hadith:133` | صحيح البخاري، كتاب الرقاق / صحيح مسلم (البخاري 43، مسلم 782) | Wording differs from Sahih Muslim 782. The exact wording is at Sahih al-Bukhari 5861. |
| `hadith:135` | سنن أبي داود، كتاب الجهاد (2751) | Wording differs from Sunan Abi Dawud 2751: «يسعي بذمتهم ادناهم ويجير عليهم اقصاهم» → app «». |
| `hadith:136` | سنن أبي داود، كتاب الخراج والإمارة والفيء (3052) | Narrator wrong: Abu Dawud 3052 is narrated «عن عدة من أبناء أصحاب رسول الله عن آبائهم», not Abdullah ibn Amr. |
| `hadith:144` | صحيح مسلم، كتاب الإيمان (54) | Wording differs from Sahih Muslim 54. |
| `hadith:146` | سنن أبي داود، كتاب الجهاد / سنن النسائي (أبو داود 2497) | Wording differs from Sunan an-Nasai 3138. The exact wording is at Sunan an-Nasai 3138. |
| `hadith:149` | سنن النسائي، كتاب السهو (1282) | Narrator not established: al-Nasa'i 1282 names only «عبد الله»; no cited narration names Ibn Mas'ud. |
| `hadith:155` | صحيح البخاري، كتاب المرضى / صحيح مسلم (البخاري 5671، مسلم 2680) | Wording differs from Sahih al-Bukhari 5671: source «من ضر» / app «لضر». |
| `hadith:158` | صحيح البخاري، كتاب الطب (3474) | Wording differs from Sahih al-Bukhari 3474: source «عذاب» / app «كان عذابا»; source «وان» / app «فجعله». |
| `hadith:159` | صحيح البخاري، كتاب الطب / صحيح مسلم (البخاري 5728، مسلم 2218) | Wording differs from Sahih al-Bukhari 5728. |
| `hadith:161` | صحيح البخاري، كتاب فضائل القرآن / صحيح مسلم (البخاري 5059، مسلم 797) | Wording differs from Sahih Muslim 797: source «مثل» / app «كمثل»; source «مثل» / app «كمثل». |
| `hadith:162` | صحيح مسلم، كتاب الرضاع (1467) | Text found in Muslim, but the number 1467 could not be confirmed (dataset numbering differs; sunnah.com refused automated access). |
| `hadith:164` | سنن أبي داود، كتاب النكاح / سنن الترمذي (أبو داود 2133، الترمذي 1141) | Grading: the displayed grade «حسن صحيح» is not given by any grader recorded for the cited narration (Daif, Sahih). |
| `hadith:165` | صحيح البخاري، كتاب العلم / صحيح مسلم (البخاري 97، مسلم 154) | Wording differs from Sahih al-Bukhari 97: source «يطوها» / app «». |
| `hadith:167` | صحيح البخاري، كتاب الإيمان وكتاب فضل ليلة القدر / صحيح مسلم (البخاري 38 و2014، مسلم 760) | Wording differs from Sahih al-Bukhari 2014. |
| `hadith:170` | مسند الإمام أحمد (14171) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:172` | سنن أبي داود، كتاب الجهاد / سنن الترمذي (أبو داود 2607، الترمذي 1674) | Narrator wrong: Abu Dawud 2607 / Tirmidhi 1674 are «عن عمرو بن شعيب عن أبيه عن جده», not Abu Sa'id and Ibn Umar. |
| `hadith:175` | سنن أبي داود، كتاب العلم (3657) | Narrator wrong: Abu Dawud 3657 is narrated by Abu Hurairah, not Abu Mas'ud; and the shown text is only the tail of the narration. |
| `hadith:177` | صحيح البخاري، كتاب الأيمان والنذور / صحيح مسلم (البخاري 6622، مسلم 1652) | Wording differs from Sahih al-Bukhari 6622: source «فكفر عن يمينك وات» / app «فات»; source «» / app «وكفر عن يمينك». The exact wording is at Sahih al-Bukhari 6722, Sahih al-Bukhari 7147, Sunan an-Nasai 3791. |
| `hadith:178` | صحيح البخاري، كتاب الأيمان والنذور / صحيح مسلم (البخاري 6646، مسلم 1646) | Wording differs from Sahih al-Bukhari 6646: source «من» / app «ومن». |
| `hadith:179` | سنن ابن ماجه، كتاب الصدقات (2430) | Grading: the displayed grade «حسن» is not given by any grader recorded for the cited narration (Daif). |
| `hadith:180` | مسند الإمام أحمد، وأصله في صحيح مسلم من حديث حذيفة بمعناه (أحمد 14571) | Wording not found in Sahih Muslim. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording not found verbatim at the cited reference (Sahih Muslim). The exact wording is at Jami at-Tirmidhi 1970. |
| `hadith:182` | صحيح البخاري، كتاب البيوع (حديث قدسي) (2227) | Wording differs from Sahih al-Bukhari 2227: source «يعط» / app «يعطه». The exact wording is at Sahih al-Bukhari 2270. |
| `hadith:183` | سنن ابن ماجه، كتاب الرهون (2443) | Grading: the displayed grade «حسن» is not given by any grader recorded for the cited narration (Sahih). |
| `hadith:185` | صحيح مسلم، المقدمة (5 (المقدمة)) | Wording not found in Sahih Muslim. |
| `hadith:187` | صحيح البخاري، كتاب العلم / صحيح مسلم (البخاري 100، مسلم 2673) | Wording differs from Sahih Muslim 2673: source «الناس» / app «العباد»; source «يترك» / app «يبق». The exact wording is at Sahih al-Bukhari 100. |
| `hadith:188` | سنن أبي داود، كتاب العلم / سنن الترمذي وابن ماجه (أبو داود 3641، الترمذي 2682) | Wording differs from Jami at-Tirmidhi 2682: source «يبتغي» / app «يلتمس»; source «سلك» / app «سهل». |
| `hadith:189` | سنن أبي داود، كتاب العلم / سنن الترمذي وابن ماجه (أبو داود 3641، الترمذي 2682) | Wording differs from Sunan Abi Dawud 3641: source «ليله البدر» / app «»; source «» / app «وانما». |
| `hadith:190` | سنن أبي داود، كتاب العلم / سنن الترمذي وابن ماجه (أبو داود 3658، الترمذي 2649) | Wording differs from Jami at-Tirmidhi 2649: source «علمه ثم كتمه» / app «فكتمه». The exact wording is at Sunan Ibn Majah 264. |
| `hadith:192` | سنن الترمذي، كتاب العلم / سنن أبي داود وابن ماجه (الترمذي 2656) | Wording differs from Sunan Ibn Majah 232: «منا حديثا فبلغه» → app «مقالتي فوعاها ثم اداها كما سمعها»; «احفظ» → app «اوعي». |
| `hadith:193` | صحيح مسلم، كتاب الوصية (1631) | Wording differs from Sahih Muslim 1631: source «عنه» / app «»; source «ثلاثه الا من» / app «ثلاث». |
| `hadith:200` | صحيح البخاري، كتاب الإيمان / صحيح مسلم (البخاري 50، مسلم 8) | Wording differs from Sahih al-Bukhari 50: source «قال» / app «». The exact wording is at Sahih al-Bukhari 4777. |

## Enriched hadiths (src/data/widgetContent.ts)

### Approved (51)

| Item | Verified source | English |
|---|---|---|
| `hadith:muslim-38` | verbatim in Sahih Muslim 38 | not shown |
| `hadith:muslim-373` | verbatim in Sahih Muslim 373 | not shown |
| `hadith:muslim-482` | verbatim in Sahih Muslim 482 | not shown |
| `hadith:muslim-798` | verbatim in Sahih Muslim 798 | not shown |
| `hadith:muslim-804` | verbatim in Sahih Muslim 804 | not shown |
| `hadith:muslim-817` | verbatim in Sahih Muslim 817 | not shown |
| `hadith:muslim-2553` | verbatim in Sahih Muslim 2553 | not shown |
| `hadith:muslim-2564` | verbatim in Sahih Muslim 2564 | not shown |
| `hadith:muslim-2566` | verbatim in Sahih Muslim 2566 | not shown |
| `hadith:muslim-2695` | verbatim in Sahih Muslim 2695 | not shown |
| `hadith:muslim-2734` | verbatim in Sahih Muslim 2734 | not shown |
| `hadith:muslim-2749` | verbatim in Sahih Muslim 2749 | not shown |
| `hadith:muslim-2822` | verbatim in Sahih Muslim 2822 | not shown |
| `hadith:muslim-2963` | verbatim in Sahih Muslim 2963 | not shown |
| `hadith:muslim-2965` | verbatim in Sahih Muslim 2965 | not shown |
| `hadith:bukhari-39` | verbatim in Sahih al-Bukhari 39 | not shown |
| `hadith:bukhari-69` | verbatim in Sahih al-Bukhari 69; same narration, other wording, in Sahih Muslim 1734 | not shown |
| `hadith:bukhari-1145` | verbatim in Sahih al-Bukhari 1145; same narration, other wording, in Sahih Muslim 758 | not shown |
| `hadith:bukhari-1283` | verbatim in Sahih al-Bukhari 1283; same narration, other wording, in Sahih Muslim 926 | not shown |
| `hadith:bukhari-1469` | verbatim in Sahih al-Bukhari 1469 | not shown |
| `hadith:bukhari-2320` | verbatim in Sahih al-Bukhari 2320, Sahih Muslim 1553 | not shown |
| `hadith:bukhari-2996` | verbatim in Sahih al-Bukhari 2996 | not shown |
| `hadith:bukhari-5269` | verbatim in Sahih al-Bukhari 5269; same narration, other wording, in Sahih Muslim 127 | not shown |
| `hadith:bukhari-5986` | verbatim in Sahih al-Bukhari 5986, Sahih Muslim 2557 | not shown |
| `hadith:bukhari-5991` | verbatim in Sahih al-Bukhari 5991 | not shown |
| `hadith:bukhari-6116` | verbatim in Sahih al-Bukhari 6116 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6116, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-6309` | verbatim in Sahih al-Bukhari 6309 | not shown |
| `hadith:bukhari-6340` | verbatim in Sahih al-Bukhari 6340; same narration, other wording, in Sahih Muslim 2735 | not shown |
| `hadith:bukhari-6407` | verbatim in Sahih al-Bukhari 6407 | not shown |
| `hadith:bukhari-6412` | verbatim in Sahih al-Bukhari 6412 | not shown |
| `hadith:bukhari-6416` | verbatim in Sahih al-Bukhari 6416 | not shown |
| `hadith:bukhari-6446` | verbatim in Sahih al-Bukhari 6446, Sahih Muslim 1051 | not shown |
| `hadith:tirmidhi-1162` | verbatim in Jami at-Tirmidhi 1162 | not shown |
| `hadith:tirmidhi-1987` | verbatim in Jami at-Tirmidhi 1987 | not shown |
| `hadith:tirmidhi-2346` | verbatim in Jami at-Tirmidhi 2346; same narration, other wording, in Sunan Ibn Majah 4141 | not shown |
| `hadith:tirmidhi-2399` | verbatim in Jami at-Tirmidhi 2399 | not shown |
| `hadith:tirmidhi-2518` | verbatim in Jami at-Tirmidhi 2518 | not shown |
| `hadith:tirmidhi-3372` | verbatim in Jami at-Tirmidhi 3372, Sunan Ibn Majah 3828 | not shown |
| `hadith:tirmidhi-3375` | verbatim in Jami at-Tirmidhi 3375, Sunan Ibn Majah 3793 | not shown |
| `hadith:tirmidhi-3377` | verbatim in Jami at-Tirmidhi 3377 | not shown |
| `hadith:tirmidhi-3556` | verbatim in Jami at-Tirmidhi 3556; same narration, other wording, in Sunan Ibn Majah 3865 | not shown |
| `hadith:ibnmajah-3818` | verbatim in Sunan Ibn Majah 3818 | not shown |
| `hadith:ibnmajah-4032` | verbatim in Sunan Ibn Majah 4032 | not shown |
| `hadith:bukhari-6018` | verbatim in Sahih al-Bukhari 6018 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6018, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-6464` | verbatim in Sahih al-Bukhari 6464 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6464, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-6011` | verbatim in Sahih al-Bukhari 6011 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6011, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-6035` | verbatim in Sahih al-Bukhari 6035 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6035, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-2989` | verbatim in Sahih al-Bukhari 2989 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 2989, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-6012` | verbatim in Sahih al-Bukhari 6012 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6012, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-6064` | verbatim in Sahih al-Bukhari 6064 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6064, verbatim (hadith-api eng-bukhari) |
| `hadith:bukhari-6477` | verbatim in Sahih al-Bukhari 6477 | Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6477, verbatim (hadith-api eng-bukhari) |

### Excluded (4)

| Item | Citation shown | Reason |
|---|---|---|
| `hadith:muslim-2700` | صحيح مسلم، كتاب الذكر والدعاء والتوبة والاستغفار (مسلم 2700) | Text found in Sahih Muslim, but the number 2700 could not be confirmed (the dataset gives these narrations no number). |
| `hadith:muslim-2733` | صحيح مسلم، كتاب الذكر والدعاء والتوبة والاستغفار (مسلم 2733) | Text found in Sahih Muslim, but the number 2733 could not be confirmed (the dataset files it under 2732). |
| `hadith:muslim-2759` | صحيح مسلم، كتاب التوبة (مسلم 2759) | Text found in Sahih Muslim, but the number 2759 could not be confirmed (the dataset gives it no number). |
| `hadith:bukhari-6168` | صحيح البخاري، كتاب الأدب (البخاري 6168، ومسلم 2640) | Narrator not established: Bukhari 6168 names only «عبد الله»; Muslim 2640 is narrated by others. |

## Enriched duas (src/data/widgetContent.ts)

### Approved (23)

| Item | Verified source | English |
|---|---|---|
| `dua:muslim-2722-taqwa` | verbatim in Sahih Muslim 2722 | not shown |
| `dua:muslim-2722-ilm` | verbatim in Sahih Muslim 2722 | not shown |
| `dua:q-3-147` | Qur'an 3:147 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 3:147 |
| `dua:q-3-16` | Qur'an 3:16 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 3:16 |
| `dua:q-3-193` | Qur'an 3:193 — Tanzil text, verbatim | not shown |
| `dua:q-23-118` | Qur'an 23:118 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 23:118 |
| `dua:q-21-89` | Qur'an 21:89 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 21:89 |
| `dua:q-26-83` | Qur'an 26:83 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 26:83 |
| `dua:q-27-19` | Qur'an 27:19 — Tanzil text, verbatim | not shown |
| `dua:q-46-15` | Qur'an 46:15 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 46:15 |
| `dua:q-17-24` | Qur'an 17:24 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 17:24 |
| `dua:q-71-28` | Qur'an 71:28 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 71:28 |
| `dua:q-3-191` | Qur'an 3:191 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 3:191 |
| `dua:q-10-85` | Qur'an 10:85 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 10:85 |
| `dua:q-12-101` | Qur'an 12:101 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 12:101 |
| `dua:q-17-80` | Qur'an 17:80 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 17:80 |
| `dua:q-23-29` | Qur'an 23:29 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 23:29 |
| `dua:q-25-65` | Qur'an 25:65 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 25:65 |
| `dua:q-28-16` | Qur'an 28:16 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 28:16 |
| `dua:q-60-5` | Qur'an 60:5 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 60:5 |
| `dua:q-66-11` | Qur'an 66:11 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 66:11 |
| `dua:muslim-2717` | verbatim in Sahih Muslim 2717 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2717, verbatim (hadith-api eng-muslim) |
| `dua:bukhari-6316` | verbatim in Sahih al-Bukhari 6316 | not shown |

### Excluded (2)

| Item | Citation shown | Reason |
|---|---|---|
| `dua:muslim-2654` | صحيح مسلم (2654)، كتاب القدر — من حديث عبد الله بن عمرو رضي الله عنهما | Number not confirmed: the dataset files this wording under 2655, and the item's own note records the shift. |
| `dua:bukhari-834` | صحيح البخاري (834)، كتاب الأذان — من حديث أبي بكر الصديق رضي الله عنه | Wording differs from Sahih al-Bukhari 834: source «لا» / app «ولا». The exact wording is at Sahih al-Bukhari 6326, Jami at-Tirmidhi 3531, Sunan an-Nasai 1302. |

## Imported duas (src/data/importedDuas.ts)

### Approved (30)

| Item | Verified source | English |
|---|---|---|
| `dua:q-37-100` | Qur'an 37:100 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 37:100 |
| `dua:q-7-47` | Qur'an 7:47 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 7:47 |
| `dua:q-29-30` | Qur'an 29:30 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 29:30 |
| `dua:q-28-21` | Qur'an 28:21 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 28:21 |
| `dua:q-26-169` | Qur'an 26:169 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 26:169 |
| `dua:q-2-128` | Qur'an 2:128 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:128 |
| `dua:q-11-47` | Qur'an 11:47 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 11:47 |
| `dua:q-5-83` | Qur'an 5:83 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 5:83 |
| `dua:q-23-94` | Qur'an 23:94 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 23:94 |
| `dua:q-3-194` | Qur'an 3:194 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 3:194 |
| `dua:q-14-38` | Qur'an 14:38 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 14:38 |
| `dua:q-28-22` | Qur'an 28:22 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 28:22 |
| `dua:q-40-7` | Qur'an 40:7 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 40:7 |
| `dua:q-28-17` | Qur'an 28:17 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 28:17 |
| `dua:q-3-9` | Qur'an 3:9 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 3:9 |
| `dua:q-2-285` | Qur'an 2:285 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:285 |
| `dua:q-5-114` | Qur'an 5:114 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 5:114 |
| `dua:q-40-44` | Qur'an 40:44 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 40:44 |
| `dua:q-12-64` | Qur'an 12:64 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 12:64 |
| `dua:nasai-5475` | verbatim in Sunan an-Nasai 5475 | not shown |
| `dua:nasai-1617` | verbatim in Sunan an-Nasai 1617 | not shown |
| `dua:nasai-5465` | verbatim in Sunan an-Nasai 5465 | not shown |
| `dua:muslim-483` | verbatim in Sahih Muslim 483 | Abdul Hamid Siddiqui's translation of Sahih Muslim 483, verbatim (hadith-api eng-muslim) |
| `dua:tirmidhi-3524` | verbatim in Jami at-Tirmidhi 3524 | not shown |
| `dua:nasai-5519` | verbatim in Sunan an-Nasai 5519 | not shown |
| `dua:tirmidhi-3591` | verbatim in Jami at-Tirmidhi 3591 | not shown |
| `dua:ibnmajah-925` | verbatim in Sunan Ibn Majah 925 | not shown |
| `dua:abudawud-1537` | verbatim in Sunan Abi Dawud 1537 | not shown |
| `dua:abudawud-1554` | verbatim in Sunan Abi Dawud 1554 | not shown |
| `dua:abudawud-1547` | verbatim in Sunan Abi Dawud 1547 | not shown |

## Misc dua library (src/data/misc-library.ts)

### Approved (62)

| Item | Verified source | English |
|---|---|---|
| `dua:rabbana-atina` | Qur'an 2:201 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:201 |
| `dua:allahumma-inni-asaluka-alhuda` | verbatim in Sahih Muslim 2721 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2721, verbatim (hadith-api eng-muslim) |
| `dua:allahumma-ighfir-li-warhamni` | verbatim in Sahih Muslim 2697 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2697, verbatim (hadith-api eng-muslim) |
| `dua:allahumma-ihdini-wasaddidni` | verbatim in Sahih Muslim 2725 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2725, verbatim (hadith-api eng-muslim) |
| `dua:allahumma-aslih-li-dini` | verbatim in Sahih Muslim 2720 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2720, verbatim (hadith-api eng-muslim) |
| `dua:allahumma-inni-asaluka-min-al-khayr-kullih` | verbatim in Sunan Ibn Majah 3846 | not shown |
| `dua:allahumma-iqsim-lana-min-khashyatik` | verbatim in Jami at-Tirmidhi 3502 | not shown |
| `dua:rabbi-aini-wala-tuin-alayya` | verbatim in Jami at-Tirmidhi 3551 | not shown |
| `dua:rabbi-ighfir-li-watub-alayya` | verbatim in Sunan Abi Dawud 1516, Sunan Ibn Majah 3814; same narration, other wording, in Jami at-Tirmidhi 3434 | not shown |
| `dua:audhu-bikalimatillah-al-tammat` | verbatim in Sahih Muslim | not shown |
| `dua:allahumma-inni-audhu-bika-min-al-ajz` | verbatim in Sahih Muslim 2706 | not shown |
| `dua:allahumma-inni-audhu-bika-min-sharri-samee` | verbatim in Sunan Abi Dawud 1551, Jami at-Tirmidhi 3492; same narration, other wording, in Sunan an-Nasai 5444 | not shown |
| `dua:allahumma-inni-audhu-bika-min-sharri-ma-amiltu` | verbatim in Sahih Muslim 2716 | not shown |
| `dua:allahumma-inni-audhu-bika-min-zawal-nimatik` | verbatim in Sahih Muslim 2739 | not shown |
| `dua:allahumma-inni-audhu-bika-min-al-bukhl-wal-jubn` | verbatim in Sahih al-Bukhari | not shown |
| `dua:dua-al-karb` | verbatim in Sahih al-Bukhari, Sahih Muslim | not shown |
| `dua:la-ilaha-illa-anta-subhanaka` | Qur'an 21:87 — Tanzil text, verbatim | not shown |
| `dua:bismillahi-arqik` | verbatim in Sahih Muslim 2186 | not shown |
| `dua:asalu-allah-al-adhim-an-yashfiyak` | verbatim in Sunan Abi Dawud 3106 | not shown |
| `dua:la-bas-tahurun-inshallah` | verbatim in Sahih al-Bukhari | not shown |
| `dua:allahumma-ighfir-li-abi-salama` | verbatim in Sahih Muslim | not shown |
| `dua:inna-lillahi-wa-inna-ilayhi-rajiun` | verbatim in Sahih Muslim | not shown |
| `dua:bismillahi-allahumma-jannibna-al-shaytan` | verbatim in Sahih al-Bukhari, Sahih Muslim | not shown |
| `dua:rabbi-hab-li-min-ladunka-dhurriyyatan` | Qur'an 3:38 — Tanzil text, verbatim | not shown |
| `dua:rabbi-ijalni-muqim-al-salah` | Qur'an 14:40 — Tanzil text, verbatim | not shown |
| `dua:rabbana-hab-lana-min-azwajina` | Qur'an 25:74 — Tanzil text, verbatim | not shown |
| `dua:ayibun-taibun-abidun` | verbatim in Sahih Muslim | not shown |
| `dua:before-sleeping` | verbatim in Sahih al-Bukhari 6324 | not shown |
| `dua:upon-waking` | verbatim in Sahih al-Bukhari 6312 | not shown |
| `dua:after-eating` | verbatim in Jami at-Tirmidhi 3458, Sunan Ibn Majah 3285; same narration, other wording, in Sunan Abi Dawud 4023 | not shown |
| `dua:after-wudu` | verbatim in Sahih Muslim 234 | not shown |
| `dua:entering-mosque` | verbatim in Sahih Muslim 713 | not shown |
| `dua:leaving-mosque` | verbatim in Sahih Muslim 713 | not shown |
| `dua:after-adhan` | verbatim in Sahih al-Bukhari 614 | not shown |
| `dua:sneezing-alhamdulillah` | verbatim in Sahih al-Bukhari 6224 | not shown |
| `dua:yarhamuk-allah` | verbatim in Sahih al-Bukhari 6224 | not shown |
| `dua:yahdikum-allah` | verbatim in Sahih al-Bukhari 6224 | not shown |
| `dua:rabbana-la-tuakhidhna` | Qur'an 2:286 — Tanzil text, verbatim | not shown |
| `dua:rabbana-wala-tahmil-alayna-isran` | Qur'an 2:286 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:286 |
| `dua:rabbana-wala-tuhammilna` | Qur'an 2:286 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:286 |
| `dua:rabbana-dhalamna-anfusana` | Qur'an 7:23 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 7:23 |
| `dua:rabbana-hab-lana-min-ladunka-rahmatan` | Qur'an 18:10 — Tanzil text, verbatim | not shown |
| `dua:rabbi-ishrah-li-sadri` | Qur'an 20:25-26 — Tanzil text, verbatim | not shown |
| `dua:rabbi-zidni-ilman` | Qur'an 20:114 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 20:114 |
| `dua:rabbi-ighfir-li-waliwalidayya` | Qur'an 14:41 — Tanzil text, verbatim | not shown |
| `dua:rabbi-inni-lima-anzalta` | Qur'an 28:24 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 28:24 |
| `dua:rabbana-afrigh-alayna-sabran-tawaffana` | Qur'an 7:126 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 7:126 |
| `dua:rabbana-afrigh-alayna-sabran-thabbit` | Qur'an 2:250 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:250 |
| `dua:rabbana-la-tuzigh-qulubana` | Qur'an 3:8 — Tanzil text, verbatim | not shown |
| `dua:rabbana-taqabbal-minna` | Qur'an 2:127 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:127 |
| `dua:rabbana-ighfir-lana-waliikhwanina` | Qur'an 59:10 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 59:10 |
| `dua:rabbana-alayka-tawakkalna` | Qur'an 60:4 — Tanzil text, verbatim | not shown |
| `dua:rabbana-atmim-lana-nurana` | Qur'an 66:8 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 66:8 |
| `dua:ruku` | verbatim in Sahih Muslim 772 | not shown |
| `dua:sujud` | verbatim in Sahih Muslim 772 | not shown |
| `dua:before-salam-audhu` | verbatim in Sahih Muslim | not shown |
| `dua:allahumma-audhu-biridaka-min-sakhatik` | verbatim in Sahih Muslim 486 | not shown |
| `dua:allahumma-inni-audhu-bika-min-al-matham-wal-maghram` | verbatim in Sahih al-Bukhari 2397, Sahih Muslim 589 | not shown |
| `dua:allahumma-ikfini-bihalalika-an-haramik` | verbatim in Jami at-Tirmidhi 3563 | not shown |
| `dua:dhahaba-al-zama-wabtallat-al-uruq` | verbatim in Sunan Abi Dawud 2357 | not shown |
| `dua:allahumma-innaka-afuwwun-tuhibb-al-afw` | verbatim in Sunan Ibn Majah 3850; same narration, other wording, in Jami at-Tirmidhi 3513 | not shown |
| `dua:talbiyah` | verbatim in Sahih al-Bukhari 1549, Sahih Muslim 1184 | not shown |

### Excluded (27)

| Item | Citation shown | Reason |
|---|---|---|
| `dua:allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah` | سنن أبي داود (5074) واللفظ له، وسنن ابن ماجه (3871) بنحوه، ومسند أحمد (4785) — عن عبد الله بن عمر رضي الله عنهما، صححه ا | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording differs from Sunan Abi Dawud 5074: source «عورتي وقال عثمان» / app «». |
| `dua:allahumma-bi-ilmika-al-ghayb` | سنن النسائي (1305) واللفظ له، ومسند أحمد (18351) — عن عمار بن ياسر رضي الله عنه، صححه الألباني، وحسّن إسناده زبير علي زئ | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). |
| `dua:allahumma-inni-asaluka-al-thabat-fi-al-amr` | المعجم الكبير للطبراني (7135) واللفظ له — عن شداد بن أوس رضي الله عنه، قال الألباني في السلسلة الصحيحة (3228): إسناده صح | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `dua:sayyid-al-istighfar` | صحيح البخاري (6306) — عن شداد بن أوس رضي الله عنه | Wording differs from Sahih al-Bukhari 6306: source «لك» / app «». |
| `dua:allahumma-ighfir-li-khatiati-wajahli` | صحيح البخاري (6398) وصحيح مسلم — عن أبي موسى الأشعري رضي الله عنه | Wording differs from Sahih al-Bukhari 6398: source «كله» / app «»; source «خطاياي وعمدي وجهلي» / app «جدي». |
| `dua:allahumma-inni-audhu-bika-min-jahd-al-bala` | صحيح البخاري وصحيح مسلم | Wording differs from Sahih al-Bukhari 6347. |
| `dua:allahumma-inni-audhu-bika-min-al-faqr` | سنن أبي داود (1544)، وسنن النسائي (5460، 5462) — عن أبي هريرة رضي الله عنه، صححه الألباني وابن حبان والحاكم | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording differs from Sunan an-Nasai 5460: source «واعوذ بك من القله» / app «والقله»; source «» / app «من». The exact wording is at Sunan Abi Dawud 1544. |
| `dua:allahumma-inni-audhu-bika-min-al-hamm` | صحيح البخاري وصحيح مسلم | Wording differs from Sahih al-Bukhari 6369. The exact wording is at Sahih al-Bukhari 6369. |
| `dua:audhu-billahi-min-al-shaytan-al-rajim` | ثابت في السنة | The citation names no checkable reference. The exact wording is at Sahih al-Bukhari 6115, Sahih Muslim 2610, Sahih Muslim 2610. |
| `dua:allahumma-rabb-al-nas-adhhib-al-bas` | صحيح البخاري وصحيح مسلم | Wording differs from Sahih al-Bukhari 5743: «اشفه وانت» → app «اشف انت». |
| `dua:dua-al-janaza` | صحيح مسلم (963) — عن عوف بن مالك رضي الله عنه | Wording differs from Sahih Muslim 963: source «او من» / app «ومن». |
| `dua:dua-al-rukub` | ثابت في السنة، ضمن دعاء الركوب والسفر | The citation names no checkable reference. The exact wording is at Sahih Muslim 1342, Sunan Abi Dawud 2599, Sunan Abi Dawud 2602. |
| `dua:khuruj-min-al-manzil` | أبو داود (5095)، والترمذي (3426)، والنسائي؛ صححه الألباني | Wording differs from Sunan Abi Dawud 5095: source «لا» / app «ولا». |
| `dua:allahumma-inni-audhu-bika-an-adilla-aw-udall` | سنن أبي داود (5094)، وجامع الترمذي (3427)، وسنن النسائي، وسنن ابن ماجه، ومسند أحمد — عن أم سلمة رضي الله عنها، حسن صحيح  | Wording differs from Sunan Abi Dawud 5094. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording not found verbatim at the cited reference (Sunan Abi Dawud 5094, Jami at-Tirmidhi 3427, Sunan an-Nasai, Sunan Ibn Majah). The exact wording is at Sunan Abi Dawud 5094. |
| `dua:before-food` | صحيح البخاري (5376)، صحيح مسلم (2022) — عن عمر بن أبي سلمة رضي الله عنه | Wording not found in Sahih al-Bukhari, Sahih Muslim. The exact wording is at Sahih al-Bukhari 7, Sahih al-Bukhari 141, Sahih al-Bukhari 985. |
| `dua:forgot-tasmiyah` | الترمذي، وحسنه عدد من أهل العلم | Wording not found in Jami at-Tirmidhi. The exact wording is at Sunan Abi Dawud 3767, Sunan Abi Dawud 3768. |
| `dua:kaffarat-al-majlis` | جامع الترمذي (3433) — عن أبي هريرة رضي الله عنه | Wording differs from Jami at-Tirmidhi 3433: source «اشهد ان» / app «». The exact wording is at Sunan Abi Dawud 4857. |
| `dua:when-wind-blows` | صحيح البخاري ومسلم — عن عائشة رضي الله عنها | Wording differs from Sahih Muslim 899. The exact wording is at Sahih Muslim 899. |
| `dua:istiftah` | الأحاديث الصحيحة في الاستفتاح | The citation names no checkable reference. The exact wording is at Sunan Abi Dawud 775, Sunan Abi Dawud 776, Jami at-Tirmidhi 242. |
| `dua:between-sajdatayn` | سنن ابن ماجه (897)، والسنن الكبرى للنسائي — عن حذيفة بن اليمان رضي الله عنه | Narrator not established in the cited narration. |
| `dua:allahumma-aini-ala-dhikrik` | أبو داود (1522)، والنسائي، وابن خزيمة — عن معاذ بن جبل رضي الله عنه، صححه الألباني | Wording differs from Sunan Abi Dawud 1522. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording not found verbatim at the cited reference (Sunan Abi Dawud 1522, Sunan an-Nasai). The exact wording is at Sunan Abi Dawud 1522. |
| `dua:allahumma-inni-asaluka-fil-al-khayrat` | جامع الترمذي (3233)، وصححه الألباني لغيره في صحيح الترغيب (3192) | Grading: grading attributed to «صحيح الترغيب» could not be checked. |
| `dua:allahumma-hasibni-hisaban-yasiran` | صحيح البخاري (6536) وصحيح مسلم (2876) — عن عائشة رضي الله عنها | Wording not found in Sahih al-Bukhari, Sahih Muslim. |
| `dua:dua-al-istikharah` | صحيح البخاري (6382) — عن جابر بن عبد الله رضي الله عنهما | Wording differs from Sahih al-Bukhari 6382: source «» / app «في»; source «رضني» / app «ارضني». |
| `dua:allahumma-inni-asaluka-min-fadlika-warahmatik` | المعجم الكبير للطبراني (10379)، وحلية الأولياء لأبي نعيم — عن عبد الله بن مسعود رضي الله عنه، صححه الألباني في السلسلة ا | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `dua:ya-muqallib-al-qulub-thabbit-qalbi` | جامع الترمذي (2140) — عن أم سلمة رضي الله عنها، حسنه الترمذي وصححه الألباني | Narrator wrong: Tirmidhi 2140 is narrated by Anas, not Umm Salamah. |
| `dua:dhikr-al-safa-wal-marwah` | حديث جابر رضي الله عنه في صفة حج النبي ﷺ، رواه مسلم | Wording differs from Sahih Muslim 1218: «» → app «يحيي ويميت». The exact wording is at Sunan Abi Dawud 1905. |

## Written adhkar (src/data/written-adhkar.ts, dithar-adhkar-cards.json)

### Approved (21)

| Item | Verified source | English |
|---|---|---|
| `written:morning:morning_001` | Qur'an 2:255 — Tanzil text, verbatim | not shown |
| `written:morning:morning_004` | verbatim in Sunan Abi Dawud | not shown |
| `written:morning:morning_017` | verbatim in Sahih Muslim 2692 | not shown |
| `written:morning:morning_020` | verbatim in Sahih Muslim | not shown |
| `written:morning:morning_023` | verbatim in Sahih al-Bukhari; same narration, other wording, in Sahih Muslim any | not shown |
| `written:evening:morning_001` | Qur'an 2:255 — Tanzil text, verbatim | not shown |
| `written:evening:morning_017` | verbatim in Sahih Muslim 2692 | not shown |
| `written:evening:morning_023` | verbatim in Sahih al-Bukhari; same narration, other wording, in Sahih Muslim any | not shown |
| `written:evening:evening_001` | verbatim in Jami at-Tirmidhi | not shown |
| `written:prayer:prayer_001` | verbatim in Sahih Muslim 591 | not shown |
| `written:prayer:prayer_002` | verbatim in Sahih al-Bukhari 844, Sahih Muslim 593 | not shown |
| `written:prayer:prayer_003` | verbatim in Sahih Muslim 594 | not shown |
| `written:prayer:prayer_004d` | verbatim in Sahih Muslim 597 | not shown |
| `written:prayer:prayer_005b` | Qur'an 113 (Tanzil, verbatim); recited after prayer per Abu Dawud 1523 («بالمعوذات دبر كل صلاة», al-Albani: Sahih) | not shown |
| `written:misc:misc-2` | verbatim in Sunan Abi Dawud 5096 | not shown |
| `written:misc:misc-4` | verbatim in Jami at-Tirmidhi; same narration, other wording, in Sunan Abi Dawud any | not shown |
| `written:misc:misc-5` | verbatim in Sahih al-Bukhari 6324 | not shown |
| `written:misc:misc-6` | verbatim in Sahih al-Bukhari 6312 | not shown |
| `written:misc:misc-7` | verbatim in Sahih Muslim 713 | not shown |
| `written:misc:misc-8` | verbatim in Sahih Muslim 713 | not shown |
| `written:misc:misc-9` | verbatim in Sahih al-Bukhari 3293, Sahih Muslim 2691 | not shown |

### Excluded (46)

| Item | Citation shown | Reason |
|---|---|---|
| `written:morning:morning_002` | سنن أبي داود — صححه الألباني | Surah text verified, but the shown grading «صححه الألباني» is wrong: al-Albani grades Abu Dawud 5082 Hasan. |
| `written:morning:morning_002b` | سنن أبي داود — صححه الألباني | Surah text verified, but the shown grading «صححه الألباني» is wrong: al-Albani grades Abu Dawud 5082 Hasan. |
| `written:morning:morning_002c` | سنن أبي داود — صححه الألباني | Qur'an text has a broken word: «وَ النَّاسِ» (a space inside «وَالنَّاسِ», 114:6); the grading «صححه الألباني» is also wrong (Abu Dawud 5082: Hasan). |
| `written:morning:morning_003` | صحيح مسلم | Wording differs from Sahih Muslim 2723: «قال اراه قال فيهن» → app «»; «هذه الليله» → app «هذا اليوم»; «بعدها» → app «بعده». |
| `written:morning:morning_005` | صحيح البخاري | Wording differs from Sahih al-Bukhari 6306: «لك» → app «». |
| `written:morning:morning_006` | سنن أبي داود — حسّنه ابن باز | Grading: grading attributed to «ابن باز» could not be checked. |
| `written:morning:morning_007` | سنن أبي داود — حسنه بعض أهل العلم، وفيه خلاف | Wording differs from Sunan Abi Dawud 5073: «» → app «او باحد من خلقك». |
| `written:morning:morning_008` | سنن أبي داود — حسّنه الألباني | Wording differs from Sunan Abi Dawud 5090: «اللهم اني اعوذ» → app «واعوذ». |
| `written:morning:morning_009` | سنن أبي داود — موقوف على أبي الدرداء بإسناد جيد، وفي حكم المرفوع عند ابن باز | Grading: grading attributed to «ابن باز» could not be checked. |
| `written:morning:morning_010` | سنن ابن ماجه — صححه الألباني | Wording differs from Sunan Ibn Majah 3871: «واحفظني» → app «اللهم احفظني»; «بك» → app «بعظمتك». |
| `written:morning:morning_011` | جامع الترمذي — صححه الألباني | Wording differs from Jami at-Tirmidhi 3392. |
| `written:morning:morning_012` | سنن أبي داود — حسّنه ابن باز | Grading: grading attributed to «ابن باز» could not be checked. |
| `written:morning:morning_013` | جامع الترمذي — إسناده حسن (ابن باز) | Grading: grading attributed to «ابن باز» could not be checked. |
| `written:morning:morning_014` | سنن النسائي الكبرى — حسّنه الألباني | Cites al-Nasa'i's al-Sunan al-Kubra, which could not be opened (the wording is not in his al-Sunan al-Sughra). |
| `written:morning:morning_015` | سنن أبي داود — حسّنه الألباني، وفيه خلاف | Grading: Al-Albani grades it Daif, not Hasan. |
| `written:morning:morning_016` | مسند أحمد — إسناده صحيح (ابن باز) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `written:morning:morning_018` | مسند أحمد، السنن الكبرى للنسائي، صحيح ابن حبان — عن أبي أيوب الأنصاري رضي الله عنه — صحيح (ابن حجر، الألباني) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. The exact wording is at Sahih al-Bukhari 844, Sahih al-Bukhari 1154, Sahih al-Bukhari 1797. |
| `written:evening:morning_002` | سنن أبي داود — صححه الألباني | Surah text verified, but the shown grading «صححه الألباني» is wrong: al-Albani grades Abu Dawud 5082 Hasan. |
| `written:evening:morning_002b` | سنن أبي داود — صححه الألباني | Surah text verified, but the shown grading «صححه الألباني» is wrong: al-Albani grades Abu Dawud 5082 Hasan. |
| `written:evening:morning_002c` | سنن أبي داود — صححه الألباني | Qur'an text has a broken word: «وَ النَّاسِ» (a space inside «وَالنَّاسِ», 114:6); the grading «صححه الألباني» is also wrong (Abu Dawud 5082: Hasan). |
| `written:evening:morning_003` | صحيح مسلم | Wording differs from Sahih Muslim 2723: «قال اراه قال فيهن» → app «». |
| `written:evening:morning_004` | سنن أبي داود — صححه الألباني | Wording differs from Sunan Abi Dawud 5068: «اصبحنا وبك» → app «»; «» → app «وبك اصبحنا». |
| `written:evening:morning_005` | صحيح البخاري | Wording differs from Sahih al-Bukhari 6306: «لك» → app «». |
| `written:evening:morning_006` | سنن أبي داود — حسّنه ابن باز | Wording differs from Sunan Abi Dawud 5078: «اصبحت» → app «امسيت». |
| `written:evening:morning_007` | سنن أبي داود — حسنه بعض أهل العلم، وفيه خلاف | Wording differs from Sunan Abi Dawud 5073: «اصبح» → app «امسي»; «» → app «او باحد من خلقك». |
| `written:evening:morning_008` | سنن أبي داود — حسّنه الألباني | Wording differs from Sunan Abi Dawud 5090: «اللهم اني اعوذ» → app «واعوذ». |
| `written:evening:morning_009` | سنن أبي داود — موقوف على أبي الدرداء بإسناد جيد، وفي حكم المرفوع عند ابن باز | Grading: grading attributed to «ابن باز» could not be checked. |
| `written:evening:morning_010` | سنن ابن ماجه — صححه الألباني | Wording differs from Sunan Ibn Majah 3871: «واحفظني» → app «اللهم احفظني»; «بك» → app «بعظمتك». |
| `written:evening:morning_011` | جامع الترمذي — صححه الألباني | Wording differs from Jami at-Tirmidhi 3392. |
| `written:evening:morning_012` | سنن أبي داود — حسّنه ابن باز | Grading: grading attributed to «ابن باز» could not be checked. |
| `written:evening:morning_013` | جامع الترمذي — إسناده حسن (ابن باز) | Grading: grading attributed to «ابن باز» could not be checked. |
| `written:evening:morning_014` | سنن النسائي الكبرى — حسّنه الألباني | Cites al-Nasa'i's al-Sunan al-Kubra, which could not be opened (the wording is not in his al-Sunan al-Sughra). |
| `written:evening:morning_015` | سنن أبي داود — حسّنه الألباني، وفيه خلاف | Wording differs from Sunan Abi Dawud 5071: «» → app «العالمين اللهم اني»; «ما في» → app «»; «وخير ما بعدها» → app «فتحها ونصرها ونورها وبركتها وهداها». |
| `written:evening:morning_016` | مسند أحمد — إسناده صحيح (ابن باز) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `written:evening:morning_018` | مسند أحمد، السنن الكبرى للنسائي، صحيح ابن حبان — عن أبي أيوب الأنصاري رضي الله عنه — صحيح (ابن حجر، الألباني) | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. The exact wording is at Sahih al-Bukhari 844, Sahih al-Bukhari 1154, Sahih al-Bukhari 1797. |
| `written:prayer:prayer_001b` | صحيح مسلم (591) — عن ثوبان رضي الله عنه | Wording differs: Muslim 591 reads «تباركت ذا الجلال», the app adds «يا». |
| `written:prayer:prayer_004` | صحيح مسلم (597) — عن أبي هريرة رضي الله عنه | Wording not found in Sahih Muslim. The exact wording is at Sahih al-Bukhari 86, Sahih al-Bukhari 115, Sahih al-Bukhari 184. |
| `written:prayer:prayer_004b` | صحيح مسلم (597) — عن أبي هريرة رضي الله عنه | Wording not found in Sahih Muslim. The exact wording is at Sahih al-Bukhari 743, Sahih al-Bukhari 843, Sahih al-Bukhari 1154. |
| `written:prayer:prayer_004c` | صحيح مسلم (597) — عن أبي هريرة رضي الله عنه | Wording not found in Sahih Muslim. The exact wording is at Sahih al-Bukhari 89, Sahih al-Bukhari 371, Sahih al-Bukhari 610. |
| `written:prayer:prayer_006` | رواه النسائي في السنن الكبرى (9928) — عن أبي أمامة رضي الله عنه | «عقب كل صلاة» is joined to the verse with no separation, and the cited al-Sunan al-Kubra (9928) could not be opened. |
| `written:prayer:prayer_005` | أبو داود (1523) — عن عقبة بن عامر رضي الله عنه — صحيح | Surah text verified, but the cited Abu Dawud 1523 («أن أقرأ بالمعوذات دبر كل صلاة») does not name Surat al-Ikhlas. |
| `written:prayer:prayer_005c` | أبو داود (1523) — عن عقبة بن عامر رضي الله عنه — صحيح | Qur'an text has a broken word: «وَ النَّاسِ» (a space inside «وَالنَّاسِ», 114:6). |
| `written:prayer:prayer_007` | جامع الترمذي (3534) — عن عمارة بن شبيب السبائي رضي الله عنه — حسن غريب (الترمذي) | The displayed timing «بعد صلاة المغرب والصبح» is not in Tirmidhi 3534, which says «على إثر المغرب». |
| `written:prayer:prayer_008` | سنن ابن ماجه — حسّنه الألباني | Grading: Al-Albani grades it Sahih, not Hasan. |
| `written:misc:misc-1` | سنن أبي داود والترمذي | Wording differs from Sunan Abi Dawud 5095: «لا» → app «ولا». |
| `written:misc:misc-3` | سنن أبي داود والترمذي | Wording differs from Sunan Abi Dawud 3767. The exact wording is at Sunan Abi Dawud 3767, Sunan Abi Dawud 3768. |

## Tasbeeh library (src/data/tasbeeh-library.json)

### Approved (13)

| Item | Verified source | English |
|---|---|---|
| `tasbeeh:1` | Phrase verbatim in the six books — virtue: excluded (Wording not found verbatim at the cited reference (Sahih Muslim).) | not shown |
| `tasbeeh:2` | Phrase verbatim in the six books — virtue: excluded (Wording not found verbatim at the cited reference (Sahih al-Bukhari 6405).) | not shown |
| `tasbeeh:3` | Phrase verbatim in the six books — virtue: excluded (Wording not found verbatim at the cited reference (Sahih Muslim).) | not shown |
| `tasbeeh:4` | Phrase verbatim in the six books; virtue verbatim in Jami at-Tirmidhi 3464 — virtue: verified | not shown |
| `tasbeeh:5` | Phrase verbatim in the six books; virtue verbatim in Sahih al-Bukhari, Sahih Muslim — virtue: verified | not shown |
| `tasbeeh:6` | Phrase verbatim in the six books — virtue: excluded (Wording not found verbatim at the cited reference (Sahih al-Bukhari, Sahih Muslim).) | not shown |
| `tasbeeh:7` | Phrase verbatim in the six books; virtue verbatim in Sahih al-Bukhari, Sahih Muslim — virtue: verified | not shown |
| `tasbeeh:8` | Phrase verbatim in the six books; virtue verbatim in Sahih Muslim — virtue: verified | Abdul Hamid Siddiqui's translation of Sahih Muslim 223, verbatim (hadith-api eng-muslim) |
| `tasbeeh:10` | Phrase verbatim in the six books — virtue: excluded (Wording not found verbatim at the cited reference (Sahih al-Bukhari 6307, Sahih Muslim 2702).) | not shown |
| `tasbeeh:11` | Phrase verbatim in the six books — virtue: excluded (Wording not found verbatim at the cited reference (Sahih Muslim 2137).) | not shown |
| `tasbeeh:12` | Phrase verbatim in the six books; virtue verbatim in Jami at-Tirmidhi 3383 — virtue: verified | not shown |
| `tasbeeh:15` | Phrase verbatim in the six books — virtue: excluded (Wording differs from Sahih al-Bukhari 799: source «» / app «لله».) | not shown |
| `tasbeeh:16` | Phrase verbatim in the six books; virtue verbatim in Sahih Muslim 601 — virtue: verified | not shown |

### Excluded (3)

| Item | Citation shown | Reason |
|---|---|---|
| `tasbeeh:9` | صحيح مسلم 408 | Misspelled and mis-vowelled («الْلَّهُم صَلِّي وَسَلِم»); not found in any of the six books. |
| `tasbeeh:13` |  | Mis-vowelled Name of Allah: «الْلَّهُ» (sukun on the first lam). |
| `tasbeeh:14` |  | Wording differs from Sunan Abi Dawud 832: «قال قل» → app «». |

## Startup hadith (src/data/startupHadith.ts)

### Approved (1)

| Item | Verified source | English |
|---|---|---|
| `startup:tirmidhi-3377` | verbatim in Jami at-Tirmidhi 3377 | not shown |

## Home header quote (src/data/content.ts featuredQuote)

### Excluded (1)

| Item | Citation shown | Reason |
|---|---|---|
| `home:featured-quote` | رواه البخاري (6407) | Wording differs from Sahih al-Bukhari 6407: source «» / app «ربه». |

## Reminder verses (src/data/widgetVerses.ts)

### Approved (19)

| Item | Verified source | English |
|---|---|---|
| `lataif:verse:hope-mercy-39-53` | Qur'an 39:53 — Tanzil text, verbatim | not shown |
| `lataif:verse:ease-94-6` | Qur'an 94:6 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 94:6 |
| `lataif:verse:remember-2-152` | Qur'an 2:152 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 2:152 |
| `lataif:verse:hearts-13-28` | Qur'an 13:28 — Tanzil text, verbatim | not shown |
| `lataif:verse:gratitude-14-7` | Qur'an 14:7 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 14:7 |
| `lataif:verse:patience-2-153` | Qur'an 2:153 — Tanzil text, verbatim | not shown |
| `lataif:verse:hope-3-139` | Qur'an 3:139 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 3:139 |
| `lataif:verse:patience-11-115` | Qur'an 11:115 — Tanzil text, verbatim | not shown |
| `lataif:verse:repentance-4-110` | Qur'an 4:110 — Tanzil text, verbatim | not shown |
| `lataif:verse:dhikr-33-41` | Qur'an 33:41 — Tanzil text, verbatim | not shown |
| `lataif:verse:blessings-16-18` | Qur'an 16:18 — Tanzil text, verbatim | not shown |
| `lataif:verse:repentance-42-25` | Qur'an 42:25 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 42:25 |
| `lataif:verse:striving-29-69` | Qur'an 29:69 — Tanzil text, verbatim | not shown |
| `lataif:verse:trust-64-11` | Qur'an 64:11 — Tanzil text, verbatim | not shown |
| `lataif:verse:good-deeds-99-7` | Qur'an 99:7 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 99:7 |
| `lataif:verse:ihsan-55-60` | Qur'an 55:60 — Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih) 55:60 |
| `lataif:verse:forgiving-15-49` | Qur'an 15:49 — Tanzil text, verbatim | not shown |
| `lataif:verse:reliance-9-51` | Qur'an 9:51 — Tanzil text, verbatim | not shown |
| `lataif:verse:perseverance-3-200` | Qur'an 3:200 — Tanzil text, verbatim | not shown |

## Saadi Lataif (src/data/quranLataif.ts)

### Approved (20)

| Item | Verified source | English |
|---|---|---|
| `lataif:q33-41` | Qur'an 33:41-42 — Tanzil text, verbatim ; Tafsir al-Sa'di at 33:41, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 33:41-42 |
| `lataif:q2-153` | Qur'an 2:153 — Tanzil text, verbatim ; Tafsir al-Sa'di at 2:153, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 2:153 |
| `lataif:q39-53` | Qur'an 39:53 — Tanzil text, verbatim ; Tafsir al-Sa'di at 39:53, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 39:53 |
| `lataif:q94-5` | Qur'an 94:5-6 — Tanzil text, verbatim ; Tafsir al-Sa'di at 94:5, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 94:5-6 |
| `lataif:q3-134` | Qur'an 3:134 — Tanzil text, verbatim ; Tafsir al-Sa'di at 3:134, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 3:134 |
| `lataif:q41-34` | Qur'an 41:34 — Tanzil text, verbatim ; Tafsir al-Sa'di at 41:34, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 41:34 |
| `lataif:q29-45` | Qur'an 29:45 — Tanzil text, verbatim ; Tafsir al-Sa'di at 29:45, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 29:45 |
| `lataif:q7-205` | Qur'an 7:205 — Tanzil text, verbatim ; Tafsir al-Sa'di at 7:205, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 7:205 |
| `lataif:q65-3` | Qur'an 65:3 — Tanzil text, verbatim ; Tafsir al-Sa'di at 65:3, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 65:3 |
| `lataif:q16-53` | Qur'an 16:53 — Tanzil text, verbatim ; Tafsir al-Sa'di at 16:53, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 16:53 |
| `lataif:q39-10` | Qur'an 39:10 — Tanzil text, verbatim ; Tafsir al-Sa'di at 39:10, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 39:10 |
| `lataif:q16-18` | Qur'an 16:18 — Tanzil text, verbatim ; Tafsir al-Sa'di at 16:18, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 16:18 |
| `lataif:q70-5` | Qur'an 70:5 — Tanzil text, verbatim ; Tafsir al-Sa'di at 70:5, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 70:5 |
| `lataif:q25-63` | Qur'an 25:63 — Tanzil text, verbatim ; Tafsir al-Sa'di at 25:63, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 25:63 |
| `lataif:q14-7` | Qur'an 14:7 — Tanzil text, verbatim ; Tafsir al-Sa'di at 14:7, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 14:7 |
| `lataif:q49-10` | Qur'an 49:10 — Tanzil text, verbatim ; Tafsir al-Sa'di at 49:10, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 49:10 |
| `lataif:q11-115` | Qur'an 11:115 — Tanzil text, verbatim ; Tafsir al-Sa'di at 11:115, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 11:115 |
| `lataif:q4-86` | Qur'an 4:86 — Tanzil text, verbatim ; Tafsir al-Sa'di at 4:86, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 4:86 |
| `lataif:q93-11` | Qur'an 93:11 — Tanzil text, verbatim ; Tafsir al-Sa'di at 93:11, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 93:11 |
| `lataif:q39-9` | Qur'an 39:9 — Tanzil text, verbatim ; Tafsir al-Sa'di at 39:9, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) | Saheeh International, verbatim (Tanzil en.sahih) 39:9 |

## Wamdat Lataif (src/data/wamdat.ts)

All 522 excluded. Each Lataif reflection was compared with the tafsir it credits, verse by verse. **376** cite an available tafsir and are **not verbatim**: the longest verbatim run in any of them is under 90% of its words, and typically 1–6 words. **146** cite works that could not be opened (al-Raghib's Mufradat, Ibn al-Qayyim's Madarij al-Salikin, Bada'i al-Fawa'id, Tariq al-Hijratayn, Zad al-Ma'ad, Ighathat al-Lahfan, al-Fawa'id, and «الإعجاز العلمي/الطبي» works). 519 of their verses are verbatim Qur'an, and a verse may still be quoted as plain Qur'an evidence. Per-item detail is in the CSV.

| Cited work | Status | Entries |
|---|---|---|
| تفسير ابن كثير | not verbatim | 127: w3, w12, w15, w17, w21, w23, w27, w33, w38, w41, w52, w56, w59, w64, w69, w70, w79, w87, w88, w90, w97, w102, w104, w108, w111, w114, w117, w119, w123, w130, w131, w135, w136, w140, w145, w147, w151, w155, w157, w164, w168, w174, w177, w179, w181, w190, w194, w196, w200, w205, w217, w220, w225, w229, w231, w236, w242, w249, w250, w255, w256, w262, w263, w271, w276, w281, w284, w285, w291, w294, w300, w302, w307, w310, w314, w316, w320, w326, w331, w341, w343, w347, w352, w356, w361, w366, w370, w374, w377, w379, w383, w385, w389, w394, w398, w399, w412, w416, w420, w425, w430, w440, w442, w446, w447, w449, w455, w456, w458, w465, w470, w472, w474, w478, w480, w484, w487, w489, w492, w494, w496, w499, w506, w510, w513, w519, w522 |
| جامع البيان - الطبري | not verbatim | 100: w4, w8, w14, w19, w26, w28, w34, w42, w43, w47, w57, w68, w73, w75, w82, w89, w98, w107, w116, w122, w129, w142, w148, w154, w162, w165, w180, w182, w193, w204, w214, w223, w230, w241, w248, w259, w260, w272, w273, w280, w283, w292, w296, w303, w312, w315, w321, w325, w332, w336, w339, w345, w349, w353, w354, w359, w364, w369, w373, w378, w384, w397, w403, w407, w411, w414, w419, w422, w428, w432, w434, w437, w441, w443, w444, w445, w448, w450, w454, w460, w461, w463, w464, w466, w468, w469, w475, w479, w481, w486, w488, w493, w495, w502, w503, w508, w512, w517, w518, w521 |
| الكشاف - الزمخشري | not verbatim | 90: w5, w10, w22, w30, w31, w35, w58, w67, w72, w76, w83, w96, w100, w105, w112, w115, w118, w127, w133, w139, w150, w156, w163, w169, w173, w178, w185, w189, w197, w203, w208, w210, w213, w221, w226, w232, w237, w247, w252, w258, w264, w269, w279, w288, w290, w298, w308, w311, w318, w322, w328, w333, w335, w340, w344, w348, w357, w362, w367, w371, w380, w382, w388, w392, w400, w404, w417, w423, w424, w427, w429, w433, w439, w451, w452, w453, w457, w462, w467, w471, w473, w476, w477, w483, w485, w491, w500, w507, w511, w516 |
| التحرير والتنوير - ابن عاشور | could not be opened | 82: w1, w11, w13, w16, w18, w29, w32, w36, w44, w50, w55, w61, w62, w65, w71, w81, w84, w91, w93, w94, w103, w109, w113, w132, w137, w144, w146, w153, w159, w161, w167, w175, w184, w187, w191, w195, w202, w212, w218, w222, w228, w233, w239, w245, w253, w254, w257, w267, w268, w277, w278, w286, w289, w295, w299, w305, w309, w319, w323, w329, w334, w337, w350, w358, w363, w368, w376, w386, w390, w393, w395, w401, w406, w409, w418, w426, w436, w482, w497, w501, w504, w515 |
| مدارج السالكين - ابن القيم | could not be opened | 38: w2, w20, w25, w45, w54, w66, w80, w86, w99, w101, w106, w110, w121, w126, w128, w138, w152, w158, w170, w171, w192, w201, w209, w211, w216, w227, w240, w251, w265, w266, w270, w275, w287, w293, w301, w304, w306, w313 |
| مفردات ألفاظ القرآن - الراغب الأصفهاني | could not be opened | 26: w37, w143, w317, w324, w327, w330, w338, w342, w346, w351, w355, w360, w365, w372, w375, w381, w387, w391, w396, w402, w408, w410, w413, w415, w421, w431 |
| بدائع الفوائد - الإمام ابن القيم | could not be opened | 16: w9, w24, w53, w125, w149, w172, w207, w235, w274, w282, w297, w459, w490, w498, w514, w523 |
| طريق الهجرتين - ابن القيم | could not be opened | 13: w7, w49, w63, w95, w120, w141, w199, w219, w243, w505, w509, w520, w524 |
| زاد المعاد - ابن القيم | could not be opened | 9: w51, w60, w74, w134, w186, w198, w215, w244, w438 |
| إغاثة اللهفان - ابن القيم | could not be opened | 6: w39, w77, w78, w234, w261, w435 |
| الفوائد - ابن القيم | could not be opened | 6: w48, w92, w176, w224, w238, w246 |
| مفردات ألفاظ القرآن - الراغب الأصفهاني / تفسير ابن كثير | not verbatim | 4: w85, w160, w166, w188 |
| البحر المحيط في التفسير - أبو حيان الأندلسي | not verbatim | 1: w6 |
| تفسير ابن كثير / الإعجاز العلمي في القرآن | not verbatim | 1: w40 |
| تفسير ابن كثير / موسوعات الإعجاز الطبي | not verbatim | 1: w124 |
| الخصائص والبلاغة في الكشاف - الزمخشري | not verbatim | 1: w183 |
| التحرير والتنوير - ابن عاشور / الإعجاز الطبي | not verbatim | 1: w206 |

## Poems (src/data/widgetContent.ts)

### Approved (1)

| Item | Verified source | English |
|---|---|---|
| `poetry:labid-batil` | The verse and its attribution to Labid are verbatim in Sahih al-Bukhari 3841 («أصدق كلمة قالها الشاعر كلمة لبيد»), which is also its evidence. | not shown |

### Excluded (19)

| Item | Citation shown | Reason |
|---|---|---|
| `poetry:zuhayr-khaliqa` | زهير بن أبي سلمى — من معلّقته | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:mutanabbi-azm` | أبو الطيب المتنبي | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:mutanabbi-karim` | أبو الطيب المتنبي | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:busti-ihsan` | أبو الفتح البستي — من نونيّته «عنوان الحكم» | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:busti-nafs` | أبو الفتح البستي — من نونيّته «عنوان الحكم» | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:busiri-nafs` | البوصيري — من «البردة» | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:shawqi-huda` | أحمد شوقي — من الهمزية النبوية | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:shawqi-rahma` | أحمد شوقي — من الهمزية النبوية | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:shawqi-akhlaq` | أحمد شوقي | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:shawqi-salah` | أحمد شوقي — من «نهج البردة» | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:hafiz-umm` | حافظ إبراهيم | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:ibnwardi-asl` | ابن الوردي — من لاميّته | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:shafii-afw` | يُنسب إلى الإمام الشافعي | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:nazila-faraj` | يُنسب إلى الإمام الشافعي، ونسبه ابن كثير إلى إبراهيم بن العباس الصولي | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:atahiya-raqib` | يُنسب إلى أبي العتاهية، وكان الإمام أحمد يُنشده | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:shafii-ayyam` | يُنسب إلى الإمام الشافعي | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:tarafa-ayyam` | طرفة بن العبد — من معلّقته | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:zuhayr-maruf` | زهير بن أبي سلمى — من معلّقته | The attribution to the poet could not be checked against a reliable edition of his diwan. |
| `poetry:mutanabbi-nujum` | أبو الطيب المتنبي | The attribution to the poet could not be checked against a reliable edition of his diwan. |

## DITHAR's own reflections and comments (572, all excluded)

The hadith library's «ومضة دِثار» reflections (195 reachable as reminder comments, 200 in the file), the dua and dhikr category comments, the 34 dua reflections, the 8 dhikr-theme reflections, and the comments on enriched hadiths/duas, reminder verses, Lataif and poems. None quotes or cites a source, so none can be verified against one, and all are kept off. They stay unchanged in their files. Setting `EDITORIAL_AUDITED` to `true` restores them everywhere.

## Could not be verified (excluded, not judged inauthentic)


199 records, plus the 146 Wamdat entries above whose cited works could not be opened:

- `hadith:29` — Text found in Muslim, but the number 1469 could not be confirmed (the dataset files it under 1468; sunnah.com refused automated access).
- `hadith:36` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad).
- `hadith:44` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `hadith:48` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. The exact wording is at Jami at-Tirmidhi 1919, Jami at-Tirmidhi 1921.
- `hadith:51` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `hadith:58` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `hadith:70` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `hadith:111` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `hadith:131` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording differs from Sunan Abi Dawud 3597: source «» / app «في امره»; source «عنه» / app «».
- `hadith:162` — Text found in Muslim, but the number 1467 could not be confirmed (dataset numbering differs; sunnah.com refused automated access).
- `hadith:170` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `hadith:muslim-2700` — Text found in Sahih Muslim, but the number 2700 could not be confirmed (the dataset gives these narrations no number).
- `hadith:muslim-2733` — Text found in Sahih Muslim, but the number 2733 could not be confirmed (the dataset files it under 2732).
- `hadith:muslim-2759` — Text found in Sahih Muslim, but the number 2759 could not be confirmed (the dataset gives it no number).
- `dua:allahumma-inni-asaluka-al-afiyah-fi-al-dunya-wal-akhirah` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording differs from Sunan Abi Dawud 5074: source «عورتي وقال عثمان» / app «».
- `dua:allahumma-bi-ilmika-al-ghayb` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad).
- `dua:allahumma-inni-asaluka-al-thabat-fi-al-amr` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `dua:allahumma-inni-audhu-bika-min-al-faqr` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording differs from Sunan an-Nasai 5460: source «واعوذ بك من القله» / app «والقله»; source «» / app «من». The exact wording is at Sunan Abi Dawud 1544.
- `dua:allahumma-inni-asaluka-fil-al-khayrat` — Grading: grading attributed to «صحيح الترغيب» could not be checked.
- `dua:allahumma-inni-asaluka-min-fadlika-warahmatik` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `written:morning:morning_006` — Grading: grading attributed to «ابن باز» could not be checked.
- `written:morning:morning_009` — Grading: grading attributed to «ابن باز» could not be checked.
- `written:morning:morning_012` — Grading: grading attributed to «ابن باز» could not be checked.
- `written:morning:morning_013` — Grading: grading attributed to «ابن باز» could not be checked.
- `written:morning:morning_014` — Cites al-Nasa'i's al-Sunan al-Kubra, which could not be opened (the wording is not in his al-Sunan al-Sughra).
- `written:morning:morning_016` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `written:morning:morning_018` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. The exact wording is at Sahih al-Bukhari 844, Sahih al-Bukhari 1154, Sahih al-Bukhari 1797.
- `written:evening:morning_009` — Grading: grading attributed to «ابن باز» could not be checked.
- `written:evening:morning_012` — Grading: grading attributed to «ابن باز» could not be checked.
- `written:evening:morning_013` — Grading: grading attributed to «ابن باز» could not be checked.
- `written:evening:morning_014` — Cites al-Nasa'i's al-Sunan al-Kubra, which could not be opened (the wording is not in his al-Sunan al-Sughra).
- `written:evening:morning_016` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference.
- `written:evening:morning_018` — Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. The exact wording is at Sahih al-Bukhari 844, Sahih al-Bukhari 1154, Sahih al-Bukhari 1797.
- `written:prayer:prayer_006` — «عقب كل صلاة» is joined to the verse with no separation, and the cited al-Sunan al-Kubra (9928) could not be opened.
- `lataif:w1` — The cited work (التحرير والتنوير - ابن عاشور) could not be opened to check the reflection; the verse itself is not verified.
- `lataif:w2` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is not verified.
- `lataif:w7` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w9` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w10` — The cited work (الكشاف - الزمخشري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w15` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w20` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w24` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w25` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w28` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w37` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w39` — The cited work (إغاثة اللهفان - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w45` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w48` — The cited work (الفوائد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w49` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w51` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w53` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w54` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w60` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w62` — The cited work (التحرير والتنوير - ابن عاشور) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w63` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w66` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w74` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w77` — The cited work (إغاثة اللهفان - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w78` — The cited work (إغاثة اللهفان - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w80` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w83` — The cited work (الكشاف - الزمخشري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w86` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w92` — The cited work (الفوائد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w95` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w98` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w99` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w101` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w104` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w106` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w110` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w117` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w120` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w121` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w125` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w126` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w127` — The cited work (الكشاف - الزمخشري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w128` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w134` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w135` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w136` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w138` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w141` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w142` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w143` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w149` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w152` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w153` — The cited work (التحرير والتنوير - ابن عاشور) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w154` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w158` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w170` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w171` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w172` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w176` — The cited work (الفوائد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w186` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w192` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w198` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w199` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w201` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w207` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w208` — The cited work (الكشاف - الزمخشري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w209` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w211` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w215` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w216` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w219` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w224` — The cited work (الفوائد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w227` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w228` — The cited work (التحرير والتنوير - ابن عاشور) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w234` — The cited work (إغاثة اللهفان - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w235` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w238` — The cited work (الفوائد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w240` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w241` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w243` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w244` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w246` — The cited work (الفوائد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w251` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w261` — The cited work (إغاثة اللهفان - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w265` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w266` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w270` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w274` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w275` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w280` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w282` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w287` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w291` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w293` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w296` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w297` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w301` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w304` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w306` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w313` — The cited work (مدارج السالكين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w317` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w318` — The cited work (الكشاف - الزمخشري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w322` — The cited work (الكشاف - الزمخشري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w324` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w327` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w329` — The cited work (التحرير والتنوير - ابن عاشور) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w330` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w338` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w342` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w346` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w351` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w355` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w360` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w365` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w372` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w374` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w375` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w379` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w381` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w387` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w391` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w393` — The cited work (التحرير والتنوير - ابن عاشور) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w396` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w402` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w408` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w410` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w413` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w415` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w421` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w426` — The cited work (التحرير والتنوير - ابن عاشور) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w431` — The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w434` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w435` — The cited work (إغاثة اللهفان - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w438` — The cited work (زاد المعاد - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w459` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w461` — The cited work (جامع البيان - الطبري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w476` — The cited work (الكشاف - الزمخشري) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w480` — The cited work (تفسير ابن كثير) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w490` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w498` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w505` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w509` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w514` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w520` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w523` — The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `lataif:w524` — The cited work (طريق الهجرتين - ابن القيم) could not be opened to check the reflection; the verse itself is verified.
- `poetry:zuhayr-khaliqa` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:mutanabbi-azm` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:mutanabbi-karim` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:busti-ihsan` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:busti-nafs` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:busiri-nafs` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:shawqi-huda` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:shawqi-rahma` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:shawqi-akhlaq` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:shawqi-salah` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:hafiz-umm` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:ibnwardi-asl` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:shafii-afw` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:nazila-faraj` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:atahiya-raqib` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:shafii-ayyam` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:tarafa-ayyam` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:zuhayr-maruf` — The attribution to the poet could not be checked against a reliable edition of his diwan.
- `poetry:mutanabbi-nujum` — The attribution to the poet could not be checked against a reliable edition of his diwan.

## Data issues outside what users see

- `hadith:103` `gradingSourceAr` says «حسّنه الترمذي», but al-Tirmidhi 223 says «غريب». Only the displayed grade (صحيح; al-Albani: Sahih) is shown, and it is correct.
- `hadith:115` `gradingSourceAr` says «حسّنه الترمذي», but al-Tirmidhi 2317 says «غريب». The displayed «حسن» is supported by Bashar Awwad Ma'ruf.
- The muslim-numbering of `fawazahmed0/hadith-api` is shifted in places (around 715 and 1467–1469, and 2700/2733/2759). Items whose number could only be confirmed there were excluded rather than guessed.

## Re-admitting an excluded item

1. Correct the text, reference, narrator or grade against the original source in its data file. The reason column says what is wrong; many need one word, a number or a citation trimmed.
2. Re-check it the same way, then set its entry in `src/data/religiousAudit.ts`.
3. Run the tests and regenerate the widget fixture (`WRITE_WIDGET_FIXTURE=1 npx vitest run src/lib/widgetNativeContract.test.ts`).

Full per-item record (decision, verified source, English source, reason, text, citation): `docs/religious-content-audit-2026-10-30.csv`.

