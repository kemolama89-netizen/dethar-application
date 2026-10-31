# Religious content audit — final scope: Hadiths, Wamadat and Lataif (2026-10-30)

This applies a strictly limited final scope to the audit of 30 October 2026 (`docs/religious-content-audit-2026-10-30.md`). Only three categories are audited and gated: **Prophetic Hadiths**, the **Quranic Wamadat / Lataif**, and the **Lataif that quote Tafsir al-Sa'di**. Written Adhkar, Audio Adhkar, morning and evening adhkar, all duas, Tasbeeh, and audio playback and scheduling are **restored to their exact pre-audit state**: their files are byte-identical to the pre-audit backups, and no audit rule touches them. Previous verification work was reused. Only items with unresolved, conflicting or missing evidence were re-examined.

## What the three categories are in the app

- **Prophetic Hadiths:** the Hadith library (`ASSETS/dithar_hadith_library_final.json`, 200), the enriched hadiths (`src/data/widgetContent.ts`, 55), the startup hadith (`src/data/startupHadith.ts`) and the home header quote (`src/data/content.ts`). They are shown in reminders, the Spiritual Reminder view, the home-screen widget, Favorites, the startup overlay and the home header. Hadith-based **duas, adhkar and dhikr virtues** live in the same libraries, but they are duas and adhkar, so they were left out and are untouched.
- **Quranic Wamadat and Lataif:** these are the **same 522 records** (`src/data/wamdat.ts`; the review screen calls them «اللطائف (ومضات)», and the reflection is shown under the label «لطيفة»). Each has a Qur'an verse and a reflection that cites a tafsir work. Category B covers the verse, surah and ayah, and whether the reflection is supported by its cited tafsir. Category C covers telling quotations apart from reflections (none of the 522 is a verbatim quotation, and none cites al-Sa'di).
- **Lataif quoting Tafsir al-Sa'di:** the 20 records in `src/data/quranLataif.ts`, each with a verbatim excerpt of al-Sa'di shown under «من التفسير».

**Reconciliation with the previous report's 7,802 items:** in scope now are 257 hadiths + 522 Wamadat/Lataif + 20 Saadi Lataif = **799 unique items**. The remaining 7,003 (the Qur'an reader's 6,236 verses, adhkar, duas, Tasbeeh, poems, short verses and DITHAR's own comments) are outside this scope and are no longer gated.

## Results by category

| | A. Prophetic Hadiths | B/C. Wamadat / Lataif (522) | C. Saadi Lataif |
|---|---|---|---|
| Total unique items | 257 | 522 | 20 |
| Previously approved (previous audit) | 156 | 0 | 20 |
| Approved now | 156 | 247 | 17 |
| …of which newly verified | 0 | 247 | 0 |
| Excluded (checked and found wrong) | 86 | 91 | 0 |
| Still requiring verification (not shown) | 15 | 184 | 3 |
| English shown (verified published translation) | 9 | 0 | 17 |

**Hadith exclusions by kind:** wording found in no narration of the six books: 48; the wording is an authentic narration, but under a different number or narration than the one cited: 19; wrong or unestablished narrator: 12; displayed grade not given by any recorded grader: 7.

**Wamadat:** all 522 verses were checked against Tanzil. 521 are verbatim at their surah and ayah, and 1 is misquoted (w16: «قالت» for «قال», 3:40). The surah names match their numbers in all 522; w1 and w2 show «سورة الفاتحة» without ayah numbers. **Reflections:** 247 are supported by the tafsir they cite; 72 take a point from the cited tafsir but add claims or lessons it does not make; 18 are not supported by, or contradict, the cited tafsir; 184 could not be checked (146 cite works that could not be opened, 35 have commentary that could not be located in the cited tafsir, and 3 co-cite unavailable «إعجاز» works).

**Quotation or reflection (Category C for the 522):** none of the 522 reflections is a verbatim quotation of its cited tafsir; the longest verbatim run in any of them is under 90% of its words. A supported reflection is therefore approved as a reflection: the app now credits it «مستفاد من: …» ("Drawn from: …") and never presents it as a quotation, and it is shown in Arabic only, because its English is DITHAR's own and was not verified. The phrases in quotation marks inside the approved reflections were also checked: they are emphasized words or hypothetical contrasts («لم يقل: …»), not quotations credited to the tafsir.

## The 20 Saadi Lataif — resolving the previous report's discrepancy

1. **Reported approved, but never shown.** The previous report counted all 20 as approved. But the app's review workflow starts newly added content as "pending", so none of them was ever published. The same was true of the 51 approved enriched hadiths. Now a hadith or Latifa that passes the audit is published by default (`lib/contentReview.ts`, `auditPublishesByDefault`), and a reviewer can still reject it.
2. **A wrong statement in the widget report.** It said the al-Sa'di Lataif were kept off the widget by `widgetFeed.ts`. Only the Wamadat are: al-Sa'di items were absent only because they were pending.
3. **"Verbatim" was checked against one edition.** The excerpts were re-checked against a second, independent digital edition (`ar-tafsir-as-saadi`). 14 are verbatim in both. 3 are verbatim in the first but missing from the second (nothing contradicts them), so they stay approved. **3 (2:153, 29:45, 65:3)** differ: in the fuller second edition the "excerpt" joins non-adjacent sentences, with no ellipsis, and there are word differences («عما»/«على ما», «الخلق»/«العباد»). They are not shown until they are checked against a printed edition. All 20 verses and the 17 approved verses' Saheeh International English are verbatim.

## Sources and direct URLs

| | Source |
|---|---|
| Qur'an text | Tanzil — https://tanzil.net/download ; https://api.alquran.cloud/v1/quran/quran-simple |
| Qur'an English | Saheeh International — https://api.alquran.cloud/v1/quran/en.sahih |
| Hadith (six books), with graders | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ (per item: `…/ara-<book>/<record>.json`, listed in the CSV) |
| Narrator cross-check | https://github.com/AhmedBaset/hadith-json |
| Tafsir (al-Sa'di, Ibn Kathir, al-Tabari, al-Kashshaf, al-Tahrir wa al-Tanwir, al-Bahr al-Muhit) | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/<edition>/<surah>/<ayah>.json (per item in the CSV) |

The sunnah.com and quran.com links in the CSV are for the reader. sunnah.com, dorar.net and shamela.ws refused automated access, so the checks were made against the datasets above. islamweb.net could be reached, but its search returned a server error. Every item's verified source and direct URLs, or its reason, are in `docs/religious-content-audit-scoped-2026-10-30.csv`.

## A. Prophetic Hadiths

### Approved (156)

| Item | Verified source | Direct URL |
|---|---|---|
| `hadith:4` | verbatim in Sahih al-Bukhari 10; same narration, other wording, in Sahih Muslim 41 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/10.json · https://sunnah.com/bukhari:10 |
| `hadith:5` | verbatim in Sahih Muslim 47; same narration, other wording, in Sahih al-Bukhari 6018 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/173.json · https://sunnah.com/muslim:47 |
| `hadith:6` | verbatim in Sahih al-Bukhari 6474 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6474.json · https://sunnah.com/bukhari:6474 |
| `hadith:8` | verbatim in Sahih al-Bukhari 13; same narration, other wording, in Sahih Muslim 45 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/13.json · https://sunnah.com/bukhari:13 |
| `hadith:9` | verbatim in Sahih al-Bukhari 481; same narration, other wording, in Sahih Muslim 2585 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/481.json · https://sunnah.com/bukhari:481 |
| `hadith:10` | verbatim in Sahih Muslim 2586; same narration, other wording, in Sahih al-Bukhari 6011 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6586.json · https://sunnah.com/muslim:2586 |
| `hadith:11` | verbatim in Sahih al-Bukhari 7376; same narration, other wording, in Sahih Muslim 2319 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7376.json · https://sunnah.com/bukhari:7376 |
| `hadith:12` | verbatim in Sahih Muslim 2594 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6602.json · https://sunnah.com/muslim:2594 |
| `hadith:13` | verbatim in Sahih Muslim 2593 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6601.json · https://sunnah.com/muslim:2593 |
| `hadith:14` | verbatim in Sahih al-Bukhari 6114, Sahih Muslim 2609 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6114.json · https://sunnah.com/bukhari:6114 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6643.json · https://sunnah.com/muslim:2609 |
| `hadith:15` | verbatim in Sahih Muslim 2607; same narration, other wording, in Sahih al-Bukhari 6094 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6639.json · https://sunnah.com/muslim:2607 |
| `hadith:16` | verbatim in Sahih al-Bukhari 33; same narration, other wording, in Sahih Muslim 59 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/33.json · https://sunnah.com/bukhari:33 |
| `hadith:17` | verbatim in Sahih Muslim 2588 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6592.json · https://sunnah.com/muslim:2588 |
| `hadith:18` | verbatim in Sahih Muslim 2865 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7210.json · https://sunnah.com/muslim:2865 |
| `hadith:19` | verbatim in Sahih Muslim 91 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/265.json · https://sunnah.com/muslim:91 |
| `hadith:20` | verbatim in Sahih Muslim 2699 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://sunnah.com/muslim:2699 |
| `hadith:28` | verbatim in Jami at-Tirmidhi 3895 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3895.json · https://sunnah.com/tirmidhi:3895 |
| `hadith:31` | verbatim in Sahih Muslim 2999 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7500.json · https://sunnah.com/muslim:2999 |
| `hadith:32` | verbatim in Sahih Muslim 2578 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6576.json · https://sunnah.com/muslim:2578 |
| `hadith:34` | verbatim in Sahih Muslim 2699 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://sunnah.com/muslim:2699 |
| `hadith:35` | verbatim in Sahih Muslim | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6541.json · https://sunnah.com/muslim:2564 |
| `hadith:37` | verbatim in Jami at-Tirmidhi 1956 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1956.json · https://sunnah.com/tirmidhi:1956 |
| `hadith:38` | verbatim in Sahih al-Bukhari 2989, Sahih Muslim 1009 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json · https://sunnah.com/bukhari:2989 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2335.json · https://sunnah.com/muslim:1009 |
| `hadith:42` | verbatim in Sahih al-Bukhari 6056, Sahih Muslim 105 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6056.json · https://sunnah.com/bukhari:6056 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/291.json · https://sunnah.com/muslim:105 |
| `hadith:45` | verbatim in Sahih Muslim 1914; the source line's note (the same report with «غصن» in al-Bukhari) is in Sahih al-Bukhari 652 and 2472 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6671.json · https://sunnah.com/muslim:1914 |
| `hadith:46` | verbatim in Sahih Muslim 2589 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6593.json · https://sunnah.com/muslim:2589 |
| `hadith:52` | verbatim in Sunan Abi Dawud 4800 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4800.json · https://sunnah.com/abudawud:4800 |
| `hadith:54` | verbatim in Sahih Muslim 2766; same narration, other wording, in Sahih al-Bukhari 3470 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7008.json · https://sunnah.com/muslim:2766 |
| `hadith:61` | verbatim in Sahih al-Bukhari 3062; same narration, other wording, in Sahih Muslim 111 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3062.json · https://sunnah.com/bukhari:3062 |
| `hadith:63` | verbatim in Sahih al-Bukhari 3336, Sahih Muslim 2638 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3336.json · https://sunnah.com/bukhari:3336 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6708.json · https://sunnah.com/muslim:2638 |
| `hadith:64` | verbatim in Sahih al-Bukhari 4729, Sahih Muslim 2785 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4729.json · https://sunnah.com/bukhari:4729 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7045.json · https://sunnah.com/muslim:2785 |
| `hadith:65` | verbatim in Sahih al-Bukhari 2887 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2887.json · https://sunnah.com/bukhari:2887 |
| `hadith:67` | verbatim in Sahih al-Bukhari 2493 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2493.json · https://sunnah.com/bukhari:2493 |
| `hadith:68` | verbatim in Sahih al-Bukhari 4686; same narration, other wording, in Sahih Muslim 2583 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4686.json · https://sunnah.com/bukhari:4686 |
| `hadith:71` | verbatim in Sahih Muslim 1893 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4899.json · https://sunnah.com/muslim:1893 |
| `hadith:72` | verbatim in Sahih Muslim 1153; same narration, other wording, in Sahih al-Bukhari 2840 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2713.json · https://sunnah.com/muslim:1153 |
| `hadith:73` | verbatim in Sahih Muslim 223 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/534.json · https://sunnah.com/muslim:223 |
| `hadith:74` | verbatim in Sahih Muslim 2676 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6808.json · https://sunnah.com/muslim:2676 |
| `hadith:76` | verbatim in Sahih Muslim 118 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/313.json · https://sunnah.com/muslim:118 |
| `hadith:77` | verbatim in Sahih al-Bukhari 110, Sahih Muslim | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/110.json · https://sunnah.com/bukhari:110 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4.json |
| `hadith:84` | verbatim in Sunan Abi Dawud 4811; same narration, other wording, in Jami at-Tirmidhi 1954 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4811.json · https://sunnah.com/abudawud:4811 |
| `hadith:86` | verbatim in Sahih Muslim 384 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/849.json · https://sunnah.com/muslim:384 |
| `hadith:87` | verbatim in Sahih Muslim 1016; same narration, other wording, in Sahih al-Bukhari 1417 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2350.json · https://sunnah.com/muslim:1016 |
| `hadith:88` | verbatim in Sahih al-Bukhari 16; same narration, other wording, in Sahih Muslim 43 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/16.json · https://sunnah.com/bukhari:16 |
| `hadith:89` | verbatim in Sahih al-Bukhari 1903 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1903.json · https://sunnah.com/bukhari:1903 |
| `hadith:90` | verbatim in Sahih Muslim 2560; same narration, other wording, in Sahih al-Bukhari 6077 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6532.json · https://sunnah.com/muslim:2560 |
| `hadith:91` | verbatim in Sahih Muslim 2631 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6695.json · https://sunnah.com/muslim:2631 |
| `hadith:94` | verbatim in Jami at-Tirmidhi 2910 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2910.json · https://sunnah.com/tirmidhi:2910 |
| `hadith:97` | verbatim in Sahih al-Bukhari 2736, Sahih Muslim 2677 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2736.json · https://sunnah.com/bukhari:2736 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6810.json · https://sunnah.com/muslim:2677 |
| `hadith:99` | verbatim in Sahih Muslim 2266; same narration, other wording, in Sahih al-Bukhari 6993 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5919.json · https://sunnah.com/muslim:2266 |
| `hadith:102` | verbatim in Sahih Muslim 634 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1436.json · https://sunnah.com/muslim:634 |
| `hadith:103` | verbatim in Sunan Abi Dawud 561, Jami at-Tirmidhi 223 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/561.json · https://sunnah.com/abudawud:561 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/223.json · https://sunnah.com/tirmidhi:223 |
| `hadith:105` | verbatim in Sunan Abi Dawud 3116 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/3116.json · https://sunnah.com/abudawud:3116 |
| `hadith:107` | verbatim in Sahih al-Bukhari 5997, Sahih Muslim 2318 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5997.json · https://sunnah.com/bukhari:5997 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6028.json · https://sunnah.com/muslim:2318 |
| `hadith:108` | verbatim in Sahih al-Bukhari 2072 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2072.json · https://sunnah.com/bukhari:2072 |
| `hadith:109` | verbatim in Sahih al-Bukhari 1427; same narration, other wording, in Sahih Muslim 1034 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1427.json · https://sunnah.com/bukhari:1427 |
| `hadith:112` | verbatim in Jami at-Tirmidhi 2390 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2390.json · https://sunnah.com/tirmidhi:2390 |
| `hadith:114` | verbatim in Jami at-Tirmidhi 1924; same narration, other wording, in Sunan Abi Dawud 4941 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1924.json · https://sunnah.com/tirmidhi:1924 |
| `hadith:115` | verbatim in Jami at-Tirmidhi 2317 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2317.json · https://sunnah.com/tirmidhi:2317 |
| `hadith:116` | verbatim in Sahih Muslim 55 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/196.json · https://sunnah.com/muslim:55 |
| `hadith:117` | verbatim in Sahih al-Bukhari 15; same narration, other wording, in Sahih Muslim 44 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/15.json · https://sunnah.com/bukhari:15 |
| `hadith:118` | verbatim in Sahih Muslim 1563 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4000.json · https://sunnah.com/muslim:1563 |
| `hadith:119` | verbatim in Sunan Ibn Majah 4245 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4245.json · https://sunnah.com/ibnmajah:4245 |
| `hadith:120` | verbatim in Sahih Muslim 1054 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2426.json · https://sunnah.com/muslim:1054 |
| `hadith:123` | verbatim in Sahih Muslim 2674 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6804.json · https://sunnah.com/muslim:2674 |
| `hadith:127` | verbatim in Sahih al-Bukhari 48, Sahih Muslim 64 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/48.json · https://sunnah.com/bukhari:48 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/221.json · https://sunnah.com/muslim:64 |
| `hadith:128` | verbatim in Sahih Muslim 67 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/227.json · https://sunnah.com/muslim:67 |
| `hadith:134` | verbatim in Sahih Muslim 1855 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4805.json · https://sunnah.com/muslim:1855 |
| `hadith:137` | verbatim in Sahih Muslim 2618 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6673.json · https://sunnah.com/muslim:2618 |
| `hadith:138` | verbatim in Sahih al-Bukhari 5027 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5027.json · https://sunnah.com/bukhari:5027 |
| `hadith:139` | verbatim in Sahih al-Bukhari 61, Sahih Muslim 2811 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/61.json · https://sunnah.com/bukhari:61 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7098.json · https://sunnah.com/muslim:2811 |
| `hadith:140` | verbatim in Sahih al-Bukhari 6117, Sahih Muslim 37 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6117.json · https://sunnah.com/bukhari:6117 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/158.json · https://sunnah.com/muslim:37 |
| `hadith:141` | verbatim in Sunan Ibn Majah 2144 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/2144.json · https://sunnah.com/ibnmajah:2144 |
| `hadith:142` | verbatim in Jami at-Tirmidhi 2139 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2139.json · https://sunnah.com/tirmidhi:2139 |
| `hadith:143` | verbatim in Sahih Muslim 1164 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2758.json · https://sunnah.com/muslim:1164 |
| `hadith:145` | verbatim in Sahih al-Bukhari 1240; same narration, other wording, in Sahih Muslim 2162 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1240.json · https://sunnah.com/bukhari:1240 |
| `hadith:147` | verbatim in Sahih Muslim 1006 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2329.json · https://sunnah.com/muslim:1006 |
| `hadith:148` | verbatim in Jami at-Tirmidhi 3479 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3479.json · https://sunnah.com/tirmidhi:3479 |
| `hadith:150` | verbatim in Sahih al-Bukhari 7013, Sahih Muslim 523 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7013.json · https://sunnah.com/bukhari:7013 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1168.json · https://sunnah.com/muslim:523 |
| `hadith:151` | verbatim in Sahih Muslim 1718; same narration, other wording, in Sahih al-Bukhari 2697 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4492.json · https://sunnah.com/muslim:1718 |
| `hadith:152` | verbatim in Sahih Muslim 867 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2005.json · https://sunnah.com/muslim:867 |
| `hadith:153` | verbatim in Sahih al-Bukhari 1393 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1393.json · https://sunnah.com/bukhari:1393 |
| `hadith:154` | verbatim in Sahih Muslim 49 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/177.json · https://sunnah.com/muslim:49 |
| `hadith:156` | verbatim in Sahih al-Bukhari 5641; same narration, other wording, in Sahih Muslim 2573 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5641.json · https://sunnah.com/bukhari:5641 |
| `hadith:157` | verbatim in Sahih al-Bukhari 5645 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5645.json · https://sunnah.com/bukhari:5645 |
| `hadith:160` | verbatim in Sahih al-Bukhari 5757; same narration, other wording, in Sahih Muslim 2220 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5757.json · https://sunnah.com/bukhari:5757 |
| `hadith:163` | verbatim in Sahih al-Bukhari 5090; same narration, other wording, in Sahih Muslim 1466 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5090.json · https://sunnah.com/bukhari:5090 |
| `hadith:166` | verbatim in Sahih Muslim 1162 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2747.json · https://sunnah.com/muslim:1162 |
| `hadith:168` | verbatim in Sahih al-Bukhari 1773, Sahih Muslim 1349 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1773.json · https://sunnah.com/bukhari:1773 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3289.json · https://sunnah.com/muslim:1349 |
| `hadith:169` | verbatim in Sahih al-Bukhari 1521; same narration, other wording, in Sahih Muslim 1350 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1521.json · https://sunnah.com/bukhari:1521 |
| `hadith:171` | verbatim in Sunan Abi Dawud 5128, Jami at-Tirmidhi, Sunan Ibn Majah | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/5128.json · https://sunnah.com/abudawud:5128 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2369.json · https://sunnah.com/tirmidhi:2369 |
| `hadith:173` | verbatim in Jami at-Tirmidhi 3443 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3443.json · https://sunnah.com/tirmidhi:3443 |
| `hadith:174` | verbatim in Sahih Muslim 2160; same narration, other wording, in Sahih al-Bukhari 6231 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5646.json · https://sunnah.com/muslim:2160 |
| `hadith:176` | verbatim in Sahih al-Bukhari 6696 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6696.json · https://sunnah.com/bukhari:6696 |
| `hadith:181` | verbatim in Sahih al-Bukhari 7158; same narration, other wording, in Sahih Muslim 1717 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7158.json · https://sunnah.com/bukhari:7158 |
| `hadith:184` | verbatim in Jami at-Tirmidhi 2315; same narration, other wording, in Sunan Abi Dawud 4990 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2315.json · https://sunnah.com/tirmidhi:2315 |
| `hadith:186` | verbatim in Sahih al-Bukhari 7070, Sahih Muslim 98 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7070.json · https://sunnah.com/bukhari:7070 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/280.json · https://sunnah.com/muslim:98 |
| `hadith:191` | verbatim in Sahih al-Bukhari 3461 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3461.json · https://sunnah.com/bukhari:3461 |
| `hadith:194` | verbatim in Sahih Muslim 2956 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7417.json · https://sunnah.com/muslim:2956 |
| `hadith:195` | verbatim in Jami at-Tirmidhi 500; same narration, other wording, in Sunan Abi Dawud 1052, Sunan an-Nasai any, Sunan Ibn Majah any | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/500.json · https://sunnah.com/tirmidhi:500 |
| `hadith:196` | verbatim in Sahih al-Bukhari 553 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/553.json · https://sunnah.com/bukhari:553 |
| `hadith:197` | verbatim in Sahih Muslim 82 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/246.json · https://sunnah.com/muslim:82 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/247.json |
| `hadith:198` | verbatim in Sahih Muslim 671 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1528.json · https://sunnah.com/muslim:671 |
| `hadith:199` | verbatim in Sahih Muslim 35; same narration, other wording, in Sahih al-Bukhari 9 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/153.json · https://sunnah.com/muslim:35 |
| `hadith:muslim-38` | verbatim in Sahih Muslim 38 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/159.json · https://sunnah.com/muslim:38 |
| `hadith:muslim-373` | verbatim in Sahih Muslim 373 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/826.json · https://sunnah.com/muslim:373 |
| `hadith:muslim-482` | verbatim in Sahih Muslim 482 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1083.json · https://sunnah.com/muslim:482 |
| `hadith:muslim-798` | verbatim in Sahih Muslim 798 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1862.json · https://sunnah.com/muslim:798 |
| `hadith:muslim-804` | verbatim in Sahih Muslim 804 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1874.json · https://sunnah.com/muslim:804 |
| `hadith:muslim-817` | verbatim in Sahih Muslim 817 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1897.json · https://sunnah.com/muslim:817 |
| `hadith:muslim-2553` | verbatim in Sahih Muslim 2553 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6516.json · https://sunnah.com/muslim:2553 |
| `hadith:muslim-2564` | verbatim in Sahih Muslim 2564 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6543.json · https://sunnah.com/muslim:2564 |
| `hadith:muslim-2566` | verbatim in Sahih Muslim 2566 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6548.json · https://sunnah.com/muslim:2566 |
| `hadith:muslim-2695` | verbatim in Sahih Muslim 2695 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6847.json · https://sunnah.com/muslim:2695 |
| `hadith:muslim-2734` | verbatim in Sahih Muslim 2734 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6932.json · https://sunnah.com/muslim:2734 |
| `hadith:muslim-2749` | verbatim in Sahih Muslim 2749 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6965.json · https://sunnah.com/muslim:2749 |
| `hadith:muslim-2822` | verbatim in Sahih Muslim 2822 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7130.json · https://sunnah.com/muslim:2822 |
| `hadith:muslim-2963` | verbatim in Sahih Muslim 2963 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7430.json · https://sunnah.com/muslim:2963 |
| `hadith:muslim-2965` | verbatim in Sahih Muslim 2965 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7432.json · https://sunnah.com/muslim:2965 |
| `hadith:bukhari-39` | verbatim in Sahih al-Bukhari 39 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/39.json · https://sunnah.com/bukhari:39 |
| `hadith:bukhari-69` | verbatim in Sahih al-Bukhari 69; same narration, other wording, in Sahih Muslim 1734 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/69.json · https://sunnah.com/bukhari:69 |
| `hadith:bukhari-1145` | verbatim in Sahih al-Bukhari 1145; same narration, other wording, in Sahih Muslim 758 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1145.json · https://sunnah.com/bukhari:1145 |
| `hadith:bukhari-1283` | verbatim in Sahih al-Bukhari 1283; same narration, other wording, in Sahih Muslim 926 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1283.json · https://sunnah.com/bukhari:1283 |
| `hadith:bukhari-1469` | verbatim in Sahih al-Bukhari 1469 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1469.json · https://sunnah.com/bukhari:1469 |
| `hadith:bukhari-2320` | verbatim in Sahih al-Bukhari 2320, Sahih Muslim 1553 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2320.json · https://sunnah.com/bukhari:2320 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3973.json · https://sunnah.com/muslim:1553 |
| `hadith:bukhari-2996` | verbatim in Sahih al-Bukhari 2996 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2996.json · https://sunnah.com/bukhari:2996 |
| `hadith:bukhari-5269` | verbatim in Sahih al-Bukhari 5269; same narration, other wording, in Sahih Muslim 127 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5269.json · https://sunnah.com/bukhari:5269 |
| `hadith:bukhari-5986` | verbatim in Sahih al-Bukhari 5986, Sahih Muslim 2557 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5986.json · https://sunnah.com/bukhari:5986 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6524.json · https://sunnah.com/muslim:2557 |
| `hadith:bukhari-5991` | verbatim in Sahih al-Bukhari 5991 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5991.json · https://sunnah.com/bukhari:5991 |
| `hadith:bukhari-6116` | verbatim in Sahih al-Bukhari 6116 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6116, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6116.json · https://sunnah.com/bukhari:6116 |
| `hadith:bukhari-6309` | verbatim in Sahih al-Bukhari 6309 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6309.json · https://sunnah.com/bukhari:6309 |
| `hadith:bukhari-6340` | verbatim in Sahih al-Bukhari 6340; same narration, other wording, in Sahih Muslim 2735 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6340.json · https://sunnah.com/bukhari:6340 |
| `hadith:bukhari-6407` | verbatim in Sahih al-Bukhari 6407 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6407.json · https://sunnah.com/bukhari:6407 |
| `hadith:bukhari-6412` | verbatim in Sahih al-Bukhari 6412 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6412.json · https://sunnah.com/bukhari:6412 |
| `hadith:bukhari-6416` | verbatim in Sahih al-Bukhari 6416 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6416.json · https://sunnah.com/bukhari:6416 |
| `hadith:bukhari-6446` | verbatim in Sahih al-Bukhari 6446, Sahih Muslim 1051 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6446.json · https://sunnah.com/bukhari:6446 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2420.json · https://sunnah.com/muslim:1051 |
| `hadith:tirmidhi-1162` | verbatim in Jami at-Tirmidhi 1162 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1162.json · https://sunnah.com/tirmidhi:1162 |
| `hadith:tirmidhi-1987` | verbatim in Jami at-Tirmidhi 1987 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1987.json · https://sunnah.com/tirmidhi:1987 |
| `hadith:tirmidhi-2346` | verbatim in Jami at-Tirmidhi 2346; same narration, other wording, in Sunan Ibn Majah 4141 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2346.json · https://sunnah.com/tirmidhi:2346 |
| `hadith:tirmidhi-2399` | verbatim in Jami at-Tirmidhi 2399 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2399.json · https://sunnah.com/tirmidhi:2399 |
| `hadith:tirmidhi-2518` | verbatim in Jami at-Tirmidhi 2518 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2518.json · https://sunnah.com/tirmidhi:2518 |
| `hadith:tirmidhi-3372` | verbatim in Jami at-Tirmidhi 3372, Sunan Ibn Majah 3828 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3372.json · https://sunnah.com/tirmidhi:3372 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3828.json · https://sunnah.com/ibnmajah:3828 |
| `hadith:tirmidhi-3375` | verbatim in Jami at-Tirmidhi 3375, Sunan Ibn Majah 3793 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3375.json · https://sunnah.com/tirmidhi:3375 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3793.json · https://sunnah.com/ibnmajah:3793 |
| `hadith:tirmidhi-3377` | verbatim in Jami at-Tirmidhi 3377 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json · https://sunnah.com/tirmidhi:3377 |
| `hadith:tirmidhi-3556` | verbatim in Jami at-Tirmidhi 3556; same narration, other wording, in Sunan Ibn Majah 3865 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3556.json · https://sunnah.com/tirmidhi:3556 |
| `hadith:ibnmajah-3818` | verbatim in Sunan Ibn Majah 3818 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3818.json · https://sunnah.com/ibnmajah:3818 |
| `hadith:ibnmajah-4032` | verbatim in Sunan Ibn Majah 4032 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4032.json · https://sunnah.com/ibnmajah:4032 |
| `hadith:bukhari-6018` | verbatim in Sahih al-Bukhari 6018 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6018, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6018.json · https://sunnah.com/bukhari:6018 |
| `hadith:bukhari-6464` | verbatim in Sahih al-Bukhari 6464 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6464, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6464.json · https://sunnah.com/bukhari:6464 |
| `hadith:bukhari-6011` | verbatim in Sahih al-Bukhari 6011 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6011, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6011.json · https://sunnah.com/bukhari:6011 |
| `hadith:bukhari-6035` | verbatim in Sahih al-Bukhari 6035 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6035, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6035.json · https://sunnah.com/bukhari:6035 |
| `hadith:bukhari-2989` | verbatim in Sahih al-Bukhari 2989 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 2989, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json · https://sunnah.com/bukhari:2989 |
| `hadith:bukhari-6012` | verbatim in Sahih al-Bukhari 6012 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6012, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6012.json · https://sunnah.com/bukhari:6012 |
| `hadith:bukhari-6064` | verbatim in Sahih al-Bukhari 6064 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6064, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6064.json · https://sunnah.com/bukhari:6064 |
| `hadith:bukhari-6477` | verbatim in Sahih al-Bukhari 6477 — English: Muhammad Muhsin Khan's translation of Sahih al-Bukhari 6477, verbatim (hadith-api eng-bukhari) | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6477.json · https://sunnah.com/bukhari:6477 |
| `startup:tirmidhi-3377` | verbatim in Jami at-Tirmidhi 3377 | https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json · https://sunnah.com/tirmidhi:3377 |

### Excluded (86)

| Item | Kind | Reason |
|---|---|---|
| `hadith:1` | wording | Wording differs from Sahih Muslim 1907: source «بالنيه» / app «بالنيات»; source «لامري» / app «لكل امري». |
| `hadith:2` | narrator | Narrator not established: al-Tirmidhi 2018 names only «جابر»; no cited narration names «جابر بن عبد الله». |
| `hadith:3` | wording | Wording differs from Jami at-Tirmidhi 2002: source «» / app «من». |
| `hadith:7` | wording | Wording differs from Sahih al-Bukhari 6478: source «يرفع» / app «يرفعه». |
| `hadith:21` | wording | Wording differs from Sahih al-Bukhari 2442: source «» / app «بها». |
| `hadith:22` | reference | Wording differs from Sahih al-Bukhari 6014: source «يوصيني» / app «»; source «» / app «يوصيني». The exact wording is at Sahih al-Bukhari 6015, Sahih Muslim 2625, Sunan Abi Dawud 5152. |
| `hadith:23` | narrator | Narrator wrong: Bukhari 6016 is narrated by Abu Shurayh, not Abu Hurairah. |
| `hadith:24` | wording | Wording differs from Sahih Muslim 2551: source «والديه» / app «ابويه»; source «ثم لم» / app «فلم». |
| `hadith:25` | grade | Grading: the displayed grade «صحيح (حسن صحيح)» is not given by any grader recorded for the cited narration (Hasan Sahih, Isnaad Sahih). |
| `hadith:26` | wording | Wording differs from Sahih Muslim 1829: source «مسيول» / app «مسوول»; source «مسيول» / app «مسوول». |
| `hadith:27` | wording | Wording differs from Sunan Abi Dawud 495: source «سنين» / app «». |
| `hadith:30` | wording | Wording differs from Jami at-Tirmidhi 2516: source «ولو» / app «وان». |
| `hadith:33` | wording | Wording differs from Sahih Muslim 2577: source «» / app «منكم». |
| `hadith:40` | reference | Wording not found in Sahih al-Bukhari, Sahih Muslim. The exact wording is at Sahih Muslim 2564. |
| `hadith:41` | wording | Wording differs from Sahih Muslim 2563: source «تحسسوا ولا» / app «»; source «» / app «ولا تحسسوا». |
| `hadith:43` | reference | Wording differs from Sahih Muslim 2592: source «» / app «كله». The exact wording is at Sunan Abi Dawud 4809. |
| `hadith:47` | narrator | Narrator wrong: Ibn Majah 2340 is narrated by Ubadah ibn al-Samit (and reports «قضى أن لا ضرر ولا ضرار»), not Abu Sa'id al-Khudri. |
| `hadith:49` | wording | Wording differs from Sahih al-Bukhari 3701: «ان يكون لك» → app «». |
| `hadith:50` | grade | Grading: the displayed grade «حسن» is not given by any grader recorded for the cited narration (Isnaad Hasan, Sahih, غريب لا نعرفه). |
| `hadith:53` | wording | Wording differs from Sahih Muslim 2846: source «فما لي» / app «مالي»; source «وغرتهم قال» / app «فقال». |
| `hadith:55` | wording | Wording differs from Sahih al-Bukhari 1474. |
| `hadith:56` | wording | Wording differs from Sahih al-Bukhari 6502: source «افترضت» / app «افترضته»; source «وان» / app «ولين». |
| `hadith:57` | wording | Wording differs from Sahih Muslim 2643: source «» / app «نطفه»; source «في ذلك» / app «». |
| `hadith:59` | reference | Wording differs from Jami at-Tirmidhi 614: source «» / app «امرا»; source «غشي ابوابهم» / app «دخل عليهم». The exact wording is at Jami at-Tirmidhi 2259. |
| `hadith:60` | narrator | Narrator wrong: Bukhari 6179 is narrated by Aisha, not Abu Hurairah. |
| `hadith:62` | wording | Wording differs from Sahih al-Bukhari 3483: source «» / app «الاولي»; source «تستحي فافعل» / app «تستح فاصنع». |
| `hadith:66` | wording | Wording differs from Sahih al-Bukhari 6507: source «ذاك» / app «ذلك». |
| `hadith:69` | wording | Wording not found in Jami at-Tirmidhi. |
| `hadith:75` | wording | Wording differs from Sahih al-Bukhari 6485. |
| `hadith:78` | narrator | Narrator wrong: Muslim 2109 is narrated by Abdullah (via Masruq), not Ibn Abbas. |
| `hadith:79` | wording | Wording differs from Sahih Muslim 533: «تعالي قال بكير حسبت انه قال» → app «». |
| `hadith:80` | wording | Wording not found in Sahih Muslim. |
| `hadith:81` | reference | Wording differs from Jami at-Tirmidhi 2307: source «» / app «من». The exact wording is at Jami at-Tirmidhi 2460. |
| `hadith:82` | reference | Wording not found in Sahih Muslim. The exact wording is at Sahih Muslim 102. |
| `hadith:83` | narrator | Narrator wrong: Tirmidhi 413 is narrated by Abu Hurairah, not Tamim al-Dari. |
| `hadith:85` | grade | Grading: the displayed grade «حسن صحيح» is not given by any grader recorded for the cited narration (Hasan). |
| `hadith:92` | narrator | Narrator not established: Bukhari 6488 names only «عبد الله»; no cited narration names Ibn Mas'ud. |
| `hadith:93` | reference | Wording differs from Sahih al-Bukhari 6410: source «حدثنا علي بن عبد» / app «ان». The exact wording is at Sahih Muslim 2677, Sunan Abi Dawud 1416, Jami at-Tirmidhi 453. |
| `hadith:95` | reference | Wording differs from Jami at-Tirmidhi 2499: source «ابن» / app «بني». The exact wording is at Sunan Ibn Majah 4251. |
| `hadith:96` | grade | Grading: shown as «متفق عليه» but only one Sahih is cited. |
| `hadith:98` | wording | Wording differs from Sunan Ibn Majah 277: source «ولا» / app «ولن». |
| `hadith:100` | wording | Wording differs from Sahih Muslim 2758. |
| `hadith:101` | reference | Wording differs from Sahih Muslim 1955: source «الذبح» / app «الذبحه»; source «فليرح» / app «وليرح». The exact wording is at Jami at-Tirmidhi 1409, Sunan an-Nasai 4405. |
| `hadith:104` | reference | Wording differs from Sunan Abi Dawud 5212: source «يفترقا» / app «يتفرقا». The exact wording is at Sunan Ibn Majah 3703. |
| `hadith:106` | wording | Wording differs from Sahih al-Bukhari 660: source «الامام العادل» / app «امام عادل»; source «ربه» / app «الله». |
| `hadith:110` | wording | The two quoted parts are verbatim in Muslim 2982, but the narrator's doubt «وأحسبه قال» between them is removed. |
| `hadith:113` | wording | Wording differs from Sunan Abi Dawud 4777: source «عز وجل» / app «سبحانه وتعالي»; source «الله» / app «». |
| `hadith:121` | wording | Wording differs from Sahih Muslim 2664: source «» / app «كذا»; source «فان لو تفتح عمل الشيطان» / app «». |
| `hadith:122` | wording | Wording differs from Sahih al-Bukhari 73: source «فسلط» / app «فسلطه». |
| `hadith:124` | wording | Wording differs from Sahih Muslim 1715: source «فيرضي» / app «يرضي». |
| `hadith:125` | wording | Wording differs from Jami at-Tirmidhi 2458: source «وتحفظ البطن» / app «والبطن»; source «وتتذكر» / app «ولتذكر». |
| `hadith:126` | wording | Wording differs from Sahih Muslim 90: source «» / app «الرجل». |
| `hadith:129` | reference | Wording differs from Sahih al-Bukhari 1294: source «لطم» / app «ضرب». The exact wording is at Sahih al-Bukhari 1297, Sahih al-Bukhari 1298, Sahih al-Bukhari 3519. |
| `hadith:130` | wording | Wording differs from Sahih Muslim 2755: source «بجنته» / app «في جنته»; source «جنته» / app «رحمته». |
| `hadith:132` | wording | Wording differs from Sahih al-Bukhari 6465: source «» / app «الاعمال»; source «قال» / app «». |
| `hadith:133` | reference | Wording differs from Sahih Muslim 782. The exact wording is at Sahih al-Bukhari 5861. |
| `hadith:135` | wording | Wording differs from Sunan Abi Dawud 2751: «يسعي بذمتهم ادناهم ويجير عليهم اقصاهم» → app «». |
| `hadith:136` | narrator | Narrator wrong: Abu Dawud 3052 is narrated «عن عدة من أبناء أصحاب رسول الله عن آبائهم», not Abdullah ibn Amr. |
| `hadith:144` | wording | Wording differs from Sahih Muslim 54. |
| `hadith:146` | reference | Wording differs from Sunan an-Nasai 3138. The exact wording is at Sunan an-Nasai 3138. |
| `hadith:149` | narrator | Narrator not established: al-Nasa'i 1282 names only «عبد الله»; no cited narration names Ibn Mas'ud. |
| `hadith:155` | wording | Wording differs from Sahih al-Bukhari 5671: source «من ضر» / app «لضر». |
| `hadith:158` | wording | Wording differs from Sahih al-Bukhari 3474: source «عذاب» / app «كان عذابا»; source «وان» / app «فجعله». |
| `hadith:159` | wording | Wording differs from Sahih al-Bukhari 5728. |
| `hadith:161` | wording | Wording differs from Sahih Muslim 797: source «مثل» / app «كمثل»; source «مثل» / app «كمثل». |
| `hadith:164` | grade | Grading: the displayed grade «حسن صحيح» is not given by any grader recorded for the cited narration (Daif, Sahih). |
| `hadith:165` | wording | Wording differs from Sahih al-Bukhari 97: source «يطوها» / app «». |
| `hadith:167` | wording | Wording differs from Sahih al-Bukhari 2014. |
| `hadith:172` | narrator | Narrator wrong: Abu Dawud 2607 / Tirmidhi 1674 are «عن عمرو بن شعيب عن أبيه عن جده», not Abu Sa'id and Ibn Umar. |
| `hadith:175` | narrator | Narrator wrong: Abu Dawud 3657 is narrated by Abu Hurairah, not Abu Mas'ud; and the shown text is only the tail of the narration. |
| `hadith:177` | reference | Wording differs from Sahih al-Bukhari 6622: source «فكفر عن يمينك وات» / app «فات»; source «» / app «وكفر عن يمينك». The exact wording is at Sahih al-Bukhari 6722, Sahih al-Bukhari 7147, Sunan an-Nasai 3791. |
| `hadith:178` | wording | Wording differs from Sahih al-Bukhari 6646: source «من» / app «ومن». |
| `hadith:179` | grade | Grading: the displayed grade «حسن» is not given by any grader recorded for the cited narration (Daif). |
| `hadith:180` | reference | Wording not found in Sahih Muslim. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording not found verbatim at the cited reference (Sahih Muslim). The exact wording is at Jami at-Tirmidhi 1970. |
| `hadith:182` | reference | Wording differs from Sahih al-Bukhari 2227: source «يعط» / app «يعطه». The exact wording is at Sahih al-Bukhari 2270. |
| `hadith:183` | grade | Grading: the displayed grade «حسن» is not given by any grader recorded for the cited narration (Sahih). |
| `hadith:185` | wording | Wording not found in Sahih Muslim. |
| `hadith:187` | reference | Wording differs from Sahih Muslim 2673: source «الناس» / app «العباد»; source «يترك» / app «يبق». The exact wording is at Sahih al-Bukhari 100. |
| `hadith:188` | wording | Wording differs from Jami at-Tirmidhi 2682: source «يبتغي» / app «يلتمس»; source «سلك» / app «سهل». |
| `hadith:189` | wording | Wording differs from Sunan Abi Dawud 3641: source «ليله البدر» / app «»; source «» / app «وانما». |
| `hadith:190` | reference | Wording differs from Jami at-Tirmidhi 2649: source «علمه ثم كتمه» / app «فكتمه». The exact wording is at Sunan Ibn Majah 264. |
| `hadith:192` | wording | Wording differs from Sunan Ibn Majah 232: «منا حديثا فبلغه» → app «مقالتي فوعاها ثم اداها كما سمعها»; «احفظ» → app «اوعي». |
| `hadith:193` | wording | Wording differs from Sahih Muslim 1631: source «عنه» / app «»; source «ثلاثه الا من» / app «ثلاث». |
| `hadith:200` | reference | Wording differs from Sahih al-Bukhari 50: source «قال» / app «». The exact wording is at Sahih al-Bukhari 4777. |
| `hadith:bukhari-6168` | narrator | Narrator not established: Bukhari 6168 names only «عبد الله»; Muslim 2640 is narrated by others. |
| `home:featured-quote` | wording | Wording differs from Sahih al-Bukhari 6407: source «» / app «ربه». |

### Still requiring verification (15)

| Item | Kind | Reason |
|---|---|---|
| `hadith:29` | requires-verification | Text found in Muslim, but the number 1469 could not be confirmed (the dataset files it under 1468; sunnah.com refused automated access). |
| `hadith:36` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). |
| `hadith:39` | requires-verification | Muslim 2162 reads «فسمّته» where the app has «فشمّته» — both are attested forms of the word; which one the printed edition has could not be confirmed (sunnah.com refused access). |
| `hadith:44` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:48` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. The exact wording is at Jami at-Tirmidhi 1919, Jami at-Tirmidhi 1921. |
| `hadith:51` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:58` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:70` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:111` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:131` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). Wording differs from Sunan Abi Dawud 3597: source «» / app «في امره»; source «عنه» / app «». |
| `hadith:162` | requires-verification | Text found in Muslim, but the number 1467 could not be confirmed (dataset numbering differs; sunnah.com refused automated access). |
| `hadith:170` | requires-verification | Cites a work outside the six books that could not be opened (e.g. Musnad Ahmad, al-Tabarani, al-Hakim, Ibn Hibban, Ibn Khuzaymah, al-Sunan al-Kubra, al-Adab al-Mufrad). The citation names no checkable reference. |
| `hadith:muslim-2700` | requires-verification | Text found in Sahih Muslim, but the number 2700 could not be confirmed (the dataset gives these narrations no number). |
| `hadith:muslim-2733` | requires-verification | Text found in Sahih Muslim, but the number 2733 could not be confirmed (the dataset files it under 2732). |
| `hadith:muslim-2759` | requires-verification | Text found in Sahih Muslim, but the number 2759 could not be confirmed (the dataset gives it no number). |

## B/C. Wamadat / Lataif

### Approved (247)

| Item | Verified source | Direct URL |
|---|---|---|
| `lataif:w3` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/186.json · https://quran.com/2/186 |
| `lataif:w4` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/268.json · https://quran.com/2/268 |
| `lataif:w6` | Verse verbatim (Tanzil); reflection supported by البحر المحيط في التفسير - أبو حيان الأندلسي | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-bahr-al-muhit/2/274.json · https://quran.com/2/274 |
| `lataif:w8` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/155.json · https://quran.com/2/155 |
| `lataif:w11` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/207.json · https://quran.com/2/207 |
| `lataif:w12` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/276.json · https://quran.com/2/276 |
| `lataif:w14` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/278.json · https://quran.com/2/278 |
| `lataif:w21` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/18.json · https://quran.com/3/18 |
| `lataif:w30` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/4/147.json · https://quran.com/4/147 |
| `lataif:w32` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/100.json · https://quran.com/5/100 |
| `lataif:w33` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/8.json · https://quran.com/5/8 |
| `lataif:w34` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/28.json · https://quran.com/5/28 |
| `lataif:w35` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/5/101.json · https://quran.com/5/101 |
| `lataif:w36` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/6/11.json · https://quran.com/6/11 |
| `lataif:w38` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/6/17.json · https://quran.com/6/17 |
| `lataif:w47` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/8/11.json · https://quran.com/8/11 |
| `lataif:w58` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/9/109.json · https://quran.com/9/109 |
| `lataif:w59` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/9/128.json · https://quran.com/9/128 |
| `lataif:w64` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/10/11.json · https://quran.com/10/11 |
| `lataif:w65` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/10/12.json · https://quran.com/10/12 |
| `lataif:w67` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/10/88.json · https://quran.com/10/88 |
| `lataif:w68` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/10/91.json · https://quran.com/10/91 |
| `lataif:w76` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/12/86.json · https://quran.com/12/86 |
| `lataif:w79` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/12/18.json · https://quran.com/12/18 |
| `lataif:w90` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/13/11.json · https://quran.com/13/11 |
| `lataif:w96` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/14/26.json · https://quran.com/14/26 |
| `lataif:w97` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/14/42.json · https://quran.com/14/42 |
| `lataif:w102` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/15/87.json · https://quran.com/15/87 |
| `lataif:w103` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/16/1.json · https://quran.com/16/1 |
| `lataif:w105` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/16/112.json · https://quran.com/16/112 |
| `lataif:w108` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/11.json · https://quran.com/17/11 |
| `lataif:w109` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/17/18.json · https://quran.com/17/18 |
| `lataif:w111` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/20.json · https://quran.com/17/20 |
| `lataif:w113` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/17/24.json · https://quran.com/17/24 |
| `lataif:w114` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/27.json · https://quran.com/17/27 |
| `lataif:w115` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/17/29.json · https://quran.com/17/29 |
| `lataif:w116` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/17/30.json · https://quran.com/17/30 |
| `lataif:w118` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/17/53.json · https://quran.com/17/53 |
| `lataif:w119` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/78.json · https://quran.com/17/78 |
| `lataif:w123` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/18/10.json · https://quran.com/18/10 |
| `lataif:w131` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/18/82.json · https://quran.com/18/82 |
| `lataif:w133` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/19/29.json · https://quran.com/19/29 |
| `lataif:w139` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/4/143.json · https://quran.com/4/143 |
| `lataif:w140` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/4/148.json · https://quran.com/4/148 |
| `lataif:w150` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/5/6.json · https://quran.com/5/6 |
| `lataif:w151` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/7.json · https://quran.com/5/7 |
| `lataif:w155` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/23.json · https://quran.com/5/23 |
| `lataif:w159` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/32.json · https://quran.com/5/32 |
| `lataif:w162` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/41.json · https://quran.com/5/41 |
| `lataif:w165` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/45.json · https://quran.com/5/45 |
| `lataif:w167` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/48.json · https://quran.com/5/48 |
| `lataif:w168` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/50.json · https://quran.com/5/50 |
| `lataif:w169` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/5/52.json · https://quran.com/5/52 |
| `lataif:w173` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/7/117.json · https://quran.com/7/117 |
| `lataif:w175` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/7/175.json · https://quran.com/7/175 |
| `lataif:w178` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/7/187.json · https://quran.com/7/187 |
| `lataif:w179` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/8/5.json · https://quran.com/8/5 |
| `lataif:w181` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/8/33.json · https://quran.com/8/33 |
| `lataif:w182` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/8/30.json · https://quran.com/8/30 |
| `lataif:w184` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/8/61.json · https://quran.com/8/61 |
| `lataif:w185` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/9/109.json · https://quran.com/9/109 |
| `lataif:w189` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/13/12.json · https://quran.com/13/12 |
| `lataif:w191` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/15/21.json · https://quran.com/15/21 |
| `lataif:w194` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/16/78.json · https://quran.com/16/78 |
| `lataif:w195` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/16/58.json · https://quran.com/16/58 |
| `lataif:w196` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/16/90.json · https://quran.com/16/90 |
| `lataif:w200` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/13.json · https://quran.com/17/13 |
| `lataif:w202` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/17/37.json · https://quran.com/17/37 |
| `lataif:w203` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/17/53.json · https://quran.com/17/53 |
| `lataif:w210` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/19/29.json · https://quran.com/19/29 |
| `lataif:w212` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/20/1.json · https://quran.com/20/1 |
| `lataif:w221` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/21/18.json · https://quran.com/21/18 |
| `lataif:w222` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/21/37.json · https://quran.com/21/37 |
| `lataif:w225` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/21/87.json · https://quran.com/21/87 |
| `lataif:w226` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/22/1.json · https://quran.com/22/1 |
| `lataif:w231` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/23/99.json · https://quran.com/23/99 |
| `lataif:w233` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/23/115.json · https://quran.com/23/115 |
| `lataif:w237` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/24/39.json · https://quran.com/24/39 |
| `lataif:w239` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/25/20.json · https://quran.com/25/20 |
| `lataif:w242` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/26/78.json · https://quran.com/26/78 |
| `lataif:w245` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/27/40.json · https://quran.com/27/40 |
| `lataif:w248` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/28/11.json · https://quran.com/28/11 |
| `lataif:w249` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/28/44.json · https://quran.com/28/44 |
| `lataif:w252` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/28/79.json · https://quran.com/28/79 |
| `lataif:w253` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/28/81.json · https://quran.com/28/81 |
| `lataif:w255` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/42/30.json · https://quran.com/42/30 |
| `lataif:w256` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/42/5.json · https://quran.com/42/5 |
| `lataif:w257` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/43/67.json · https://quran.com/43/67 |
| `lataif:w258` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/43/33.json · https://quran.com/43/33 |
| `lataif:w259` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/44/29.json · https://quran.com/44/29 |
| `lataif:w267` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/48/1.json · https://quran.com/48/1 |
| `lataif:w268` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/49/6.json · https://quran.com/49/6 |
| `lataif:w269` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/49/12.json · https://quran.com/49/12 |
| `lataif:w272` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/50/15.json · https://quran.com/50/15 |
| `lataif:w276` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/52/17.json · https://quran.com/52/17 |
| `lataif:w278` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/53/17.json · https://quran.com/53/17 |
| `lataif:w285` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/57/16.json · https://quran.com/57/16 |
| `lataif:w286` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/58/1.json · https://quran.com/58/1 |
| `lataif:w289` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/61/2.json · https://quran.com/61/2 |
| `lataif:w290` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/62/5.json · https://quran.com/62/5 |
| `lataif:w292` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/63/4.json · https://quran.com/63/4 |
| `lataif:w294` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/65/2.json · https://quran.com/65/2 |
| `lataif:w298` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/67/13.json · https://quran.com/67/13 |
| `lataif:w299` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/68/4.json · https://quran.com/68/4 |
| `lataif:w300` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/69/19.json · https://quran.com/69/19 |
| `lataif:w302` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/71/10.json · https://quran.com/71/10 |
| `lataif:w303` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/72/16.json · https://quran.com/72/16 |
| `lataif:w305` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/74/38.json · https://quran.com/74/38 |
| `lataif:w307` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/76/8.json · https://quran.com/76/8 |
| `lataif:w308` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/77/30.json · https://quran.com/77/30 |
| `lataif:w314` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/83/14.json · https://quran.com/83/14 |
| `lataif:w315` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/46.json · https://quran.com/2/46 |
| `lataif:w316` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/49.json · https://quran.com/2/49 |
| `lataif:w319` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/59.json · https://quran.com/2/59 |
| `lataif:w321` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/68.json · https://quran.com/2/68 |
| `lataif:w323` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/74.json · https://quran.com/2/74 |
| `lataif:w325` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/81.json · https://quran.com/2/81 |
| `lataif:w326` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/87.json · https://quran.com/2/87 |
| `lataif:w328` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/2/96.json · https://quran.com/2/96 |
| `lataif:w331` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/124.json · https://quran.com/2/124 |
| `lataif:w332` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/125.json · https://quran.com/2/125 |
| `lataif:w334` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/142.json · https://quran.com/2/142 |
| `lataif:w336` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/6.json · https://quran.com/2/6 |
| `lataif:w337` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/20.json · https://quran.com/2/20 |
| `lataif:w341` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/42.json · https://quran.com/2/42 |
| `lataif:w343` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/7.json · https://quran.com/3/7 |
| `lataif:w344` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/3/7.json · https://quran.com/3/7 |
| `lataif:w345` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/3/11.json · https://quran.com/3/11 |
| `lataif:w347` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/19.json · https://quran.com/3/19 |
| `lataif:w349` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/3/35.json · https://quran.com/3/35 |
| `lataif:w352` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/67.json · https://quran.com/3/67 |
| `lataif:w353` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/3/59.json · https://quran.com/3/59 |
| `lataif:w354` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/4/2.json · https://quran.com/4/2 |
| `lataif:w356` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/4/3.json · https://quran.com/4/3 |
| `lataif:w357` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/4/4.json · https://quran.com/4/4 |
| `lataif:w358` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/4/6.json · https://quran.com/4/6 |
| `lataif:w359` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/4/6.json · https://quran.com/4/6 |
| `lataif:w362` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/4/12.json · https://quran.com/4/12 |
| `lataif:w363` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/1.json · https://quran.com/5/1 |
| `lataif:w364` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/2.json · https://quran.com/5/2 |
| `lataif:w366` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/3.json · https://quran.com/5/3 |
| `lataif:w367` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/5/3.json · https://quran.com/5/3 |
| `lataif:w368` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/3.json · https://quran.com/5/3 |
| `lataif:w369` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/4.json · https://quran.com/5/4 |
| `lataif:w370` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/6/1.json · https://quran.com/6/1 |
| `lataif:w371` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/6/9.json · https://quran.com/6/9 |
| `lataif:w373` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/6/6.json · https://quran.com/6/6 |
| `lataif:w378` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/7/179.json · https://quran.com/7/179 |
| `lataif:w380` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/8/9.json · https://quran.com/8/9 |
| `lataif:w382` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/8/16.json · https://quran.com/8/16 |
| `lataif:w383` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/8/30.json · https://quran.com/8/30 |
| `lataif:w384` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/8/67.json · https://quran.com/8/67 |
| `lataif:w385` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/9/2.json · https://quran.com/9/2 |
| `lataif:w388` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/9/16.json · https://quran.com/9/16 |
| `lataif:w389` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/9/37.json · https://quran.com/9/37 |
| `lataif:w390` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/9/38.json · https://quran.com/9/38 |
| `lataif:w392` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/10/35.json · https://quran.com/10/35 |
| `lataif:w394` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/11/5.json · https://quran.com/11/5 |
| `lataif:w395` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/11/15.json · https://quran.com/11/15 |
| `lataif:w397` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/11/38.json · https://quran.com/11/38 |
| `lataif:w398` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/11/40.json · https://quran.com/11/40 |
| `lataif:w399` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/12/30.json · https://quran.com/12/30 |
| `lataif:w400` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/12/31.json · https://quran.com/12/31 |
| `lataif:w403` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/12/49.json · https://quran.com/12/49 |
| `lataif:w404` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/12/80.json · https://quran.com/12/80 |
| `lataif:w406` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/14/18.json · https://quran.com/14/18 |
| `lataif:w407` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/14/49.json · https://quran.com/14/49 |
| `lataif:w409` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/15/94.json · https://quran.com/15/94 |
| `lataif:w411` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/16/46.json · https://quran.com/16/46 |
| `lataif:w412` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/5.json · https://quran.com/17/5 |
| `lataif:w414` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/18/6.json · https://quran.com/18/6 |
| `lataif:w416` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/19/83.json · https://quran.com/19/83 |
| `lataif:w417` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/20/10.json · https://quran.com/20/10 |
| `lataif:w418` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/20/72.json · https://quran.com/20/72 |
| `lataif:w419` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/21/3.json · https://quran.com/21/3 |
| `lataif:w420` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/21/96.json · https://quran.com/21/96 |
| `lataif:w422` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/22/29.json · https://quran.com/22/29 |
| `lataif:w424` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/23/108.json · https://quran.com/23/108 |
| `lataif:w425` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/24/40.json · https://quran.com/24/40 |
| `lataif:w428` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/25/68.json · https://quran.com/25/68 |
| `lataif:w430` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/26/128.json · https://quran.com/26/128 |
| `lataif:w432` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/27/28.json · https://quran.com/27/28 |
| `lataif:w436` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/30/18.json · https://quran.com/30/18 |
| `lataif:w437` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/31/18.json · https://quran.com/31/18 |
| `lataif:w439` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/33/10.json · https://quran.com/33/10 |
| `lataif:w440` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/33/59.json · https://quran.com/33/59 |
| `lataif:w441` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/34/13.json · https://quran.com/34/13 |
| `lataif:w442` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/35/12.json · https://quran.com/35/12 |
| `lataif:w443` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/36/39.json · https://quran.com/36/39 |
| `lataif:w444` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/37/53.json · https://quran.com/37/53 |
| `lataif:w445` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/38/31.json · https://quran.com/38/31 |
| `lataif:w446` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/39/75.json · https://quran.com/39/75 |
| `lataif:w449` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/42/34.json · https://quran.com/42/34 |
| `lataif:w450` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/43/13.json · https://quran.com/43/13 |
| `lataif:w451` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/44/47.json · https://quran.com/44/47 |
| `lataif:w452` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/45/28.json · https://quran.com/45/28 |
| `lataif:w453` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/46/24.json · https://quran.com/46/24 |
| `lataif:w456` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/49/11.json · https://quran.com/49/11 |
| `lataif:w457` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/51/1.json · https://quran.com/51/1 |
| `lataif:w458` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/52/5.json · https://quran.com/52/5 |
| `lataif:w460` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/54/12.json · https://quran.com/54/12 |
| `lataif:w463` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/57/13.json · https://quran.com/57/13 |
| `lataif:w464` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/58/2.json · https://quran.com/58/2 |
| `lataif:w465` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/59/5.json · https://quran.com/59/5 |
| `lataif:w466` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/60/8.json · https://quran.com/60/8 |
| `lataif:w467` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/61/4.json · https://quran.com/61/4 |
| `lataif:w469` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/65/4.json · https://quran.com/65/4 |
| `lataif:w471` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/67/3.json · https://quran.com/67/3 |
| `lataif:w472` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/68/42.json · https://quran.com/68/42 |
| `lataif:w474` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/70/4.json · https://quran.com/70/4 |
| `lataif:w475` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/71/22.json · https://quran.com/71/22 |
| `lataif:w477` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/73/12.json · https://quran.com/73/12 |
| `lataif:w478` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/74/30.json · https://quran.com/74/30 |
| `lataif:w479` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/75/7.json · https://quran.com/75/7 |
| `lataif:w481` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/77/11.json · https://quran.com/77/11 |
| `lataif:w482` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/78/12.json · https://quran.com/78/12 |
| `lataif:w484` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/80/33.json · https://quran.com/80/33 |
| `lataif:w485` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/81/15.json · https://quran.com/81/15 |
| `lataif:w486` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/82/3.json · https://quran.com/82/3 |
| `lataif:w487` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/83/7.json · https://quran.com/83/7 |
| `lataif:w488` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/84/2.json · https://quran.com/84/2 |
| `lataif:w489` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/85/1.json · https://quran.com/85/1 |
| `lataif:w491` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/87/4.json · https://quran.com/87/4 |
| `lataif:w492` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/88/4.json · https://quran.com/88/4 |
| `lataif:w493` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/89/1.json · https://quran.com/89/1 |
| `lataif:w494` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/90/1.json · https://quran.com/90/1 |
| `lataif:w495` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/91/11.json · https://quran.com/91/11 |
| `lataif:w496` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/92/11.json · https://quran.com/92/11 |
| `lataif:w497` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/93/2.json · https://quran.com/93/2 |
| `lataif:w499` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/95/5.json · https://quran.com/95/5 |
| `lataif:w500` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/96/15.json · https://quran.com/96/15 |
| `lataif:w501` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/97/1.json · https://quran.com/97/1 |
| `lataif:w502` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/98/1.json · https://quran.com/98/1 |
| `lataif:w504` | Verse verbatim (Tanzil); reflection supported by التحرير والتنوير - ابن عاشور | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/100/1.json · https://quran.com/100/1 |
| `lataif:w506` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/100/10.json · https://quran.com/100/10 |
| `lataif:w507` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/101/5.json · https://quran.com/101/5 |
| `lataif:w508` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/102/1.json · https://quran.com/102/1 |
| `lataif:w510` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/104/1.json · https://quran.com/104/1 |
| `lataif:w511` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/104/4.json · https://quran.com/104/4 |
| `lataif:w512` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/105/5.json · https://quran.com/105/5 |
| `lataif:w513` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/106/1.json · https://quran.com/106/1 |
| `lataif:w516` | Verse verbatim (Tanzil); reflection supported by الكشاف - الزمخشري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/109/6.json · https://quran.com/109/6 |
| `lataif:w517` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/110/2.json · https://quran.com/110/2 |
| `lataif:w518` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/111/1.json · https://quran.com/111/1 |
| `lataif:w519` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/111/5.json · https://quran.com/111/5 |
| `lataif:w521` | Verse verbatim (Tanzil); reflection supported by جامع البيان - الطبري | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/113/1.json · https://quran.com/113/1 |
| `lataif:w522` | Verse verbatim (Tanzil); reflection supported by تفسير ابن كثير | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/113/3.json · https://quran.com/113/3 |

### Excluded (91)

| Item | Kind | Reason |
|---|---|---|
| `lataif:w13` | partly | adds that compulsion breeds hypocrisy |
| `lataif:w16` | verse | The verse is misquoted: «قالت» for «قال» (3:40, Zakariyya speaking). |
| `lataif:w17` | unsupported | the lesson that the mihrab brings provision is not drawn in the source |
| `lataif:w18` | partly | adds a lesson on rulers clinging to power |
| `lataif:w19` | partly | adds a lesson for parents |
| `lataif:w22` | partly | extends the metaphor into an upbringing analogy not in the source |
| `lataif:w23` | partly | adds 'principles over persons' lesson |
| `lataif:w26` | unsupported | al-Tabari reads the verse narrowly (concession to marry slave women), not as the general principle stated |
| `lataif:w27` | unsupported | Ibn Kathir reads it as about guardians of orphans' wealth, not as the stated lesson |
| `lataif:w29` | partly | generalizes to leaving bad environments or work |
| `lataif:w31` | unsupported | al-Kashshaf explains فطوعت as 'made it easy for him', not a long struggle |
| `lataif:w41` | partly | adds that Iblis blamed fate |
| `lataif:w42` | partly | adds inner contemplation as a condition |
| `lataif:w43` | partly | extends the consolation to every reformer |
| `lataif:w44` | partly | adds advice on avoiding petty quarrels |
| `lataif:w50` | partly | adds 'intelligence and insight beyond thinkers' |
| `lataif:w52` | partly | adds 'the peak of victory' lesson |
| `lataif:w55` | partly | adds children and 'death of resolve' |
| `lataif:w56` | partly | its main claims (من أموالهم as a concession to stinginess) are not in Ibn Kathir |
| `lataif:w57` | partly | generalizes to all wavering believers |
| `lataif:w61` | partly | adds the 'ease of application' rationale |
| `lataif:w69` | partly | adds the claim about driving out bad habits |
| `lataif:w70` | partly | adds that على denotes obligation |
| `lataif:w71` | partly | the 'term of endearment' point is not in the source |
| `lataif:w72` | partly | adds 'every crisis is followed by blessings' |
| `lataif:w73` | partly | frames it as 'ancient secularism' with an added lesson |
| `lataif:w75` | partly | adds the comfort and glad-tidings lesson |
| `lataif:w81` | partly | adds the general lesson against self-reliance |
| `lataif:w82` | partly | adds 'delay as preparation for rank' |
| `lataif:w84` | partly | adds a physiological claim |
| `lataif:w88` | partly | adds the claim about human 'innate poverty' |
| `lataif:w89` | unsupported | the 'reflection' is the verse text itself, credited to al-Tabari |
| `lataif:w93` | partly | adds a proverb not in the source |
| `lataif:w100` | unsupported | the 'he did not say I am the Punisher' point is not in al-Kashshaf |
| `lataif:w107` | partly | al-Tabari explains أمة as 'teacher of good', not 'one man equal to a nation' |
| `lataif:w112` | partly | adds the 'role reversal' reading of عندك |
| `lataif:w122` | partly | extends the consolation to every reformer and parent |
| `lataif:w129` | partly | the lesson on student etiquette is not in al-Tabari |
| `lataif:w130` | partly | adds the general lesson that painful decrees protect |
| `lataif:w132` | unsupported | the lesson on courage is not in Ibn Ashur's passage |
| `lataif:w145` | partly | adds the lesson on social stability |
| `lataif:w146` | partly | extends it to economic and social security |
| `lataif:w147` | partly | adds a duty to boycott |
| `lataif:w148` | partly | adds 'no need for man-made laws' |
| `lataif:w156` | partly | the 'insolence' reading is not stated in al-Kashshaf |
| `lataif:w161` | unsupported | Ibn Ashur explains mentioning the female thief because the Arabs exempted women, not because men are bolder |
| `lataif:w163` | partly | adds the 'corrupt media' framing |
| `lataif:w164` | partly | adds the lesson on diluted fatwas |
| `lataif:w174` | unsupported | Ibn Kathir explains نتقنا as رفعناه, contradicting the reflection's contrast |
| `lataif:w177` | partly | the 'call Him by the fitting name' practice is not in the passage |
| `lataif:w180` | partly | adds physiological claims |
| `lataif:w183` | partly | adds the claim tying the wording to the army's state |
| `lataif:w187` | partly | adds the general lesson against self-reliance |
| `lataif:w190` | partly | adds the claim about earlier scriptures being lost |
| `lataif:w193` | partly | adds a modern geological explanation |
| `lataif:w197` | unsupported | al-Kashshaf applies the simile to breaking oaths, not to relapsing after obedience |
| `lataif:w204` | partly | adds the claim about the believer's rank |
| `lataif:w205` | partly | Ibn Kathir explains قيما as 'straight' only, not 'reforming others' |
| `lataif:w213` | partly | al-Kashshaf records this sense of الإيناس only as a second view (قيل), and the reflection adds the remark about prophethood |
| `lataif:w214` | partly | adds a rationale not in the source |
| `lataif:w217` | partly | adds a lesson for educators |
| `lataif:w218` | unsupported | Ibn Ashur explains Musa's fear differently from 'ordinary human fear' |
| `lataif:w223` | partly | adds 'weighs passing thoughts and smiles' |
| `lataif:w229` | partly | adds the 'living conscience' lesson |
| `lataif:w230` | partly | adds anatomical 'scientific' claims not in al-Tabari |
| `lataif:w232` | unsupported | the reflection explains فاتخذتموهم سخريا (23:110), outside the cited verses 23:108–109 |
| `lataif:w236` | partly | adds the claim about the Qur'an's use of 'men' |
| `lataif:w247` | partly | gives a meaning of فارغا other than al-Kashshaf's |
| `lataif:w250` | partly | adds a lesson for parents and educators |
| `lataif:w254` | unsupported | Ibn Ashur reads سنريهم آياتنا as conquests and signs, not modern scientific discoveries |
| `lataif:w260` | partly | adds the call to increase worship that night |
| `lataif:w263` | partly | extends it to every reformer |
| `lataif:w264` | partly | adds 'breaking the lock through sincerity' |
| `lataif:w273` | partly | adds the claim about provision being kept from people's hands |
| `lataif:w277` | unsupported | the claim that reward rests on effort, not results, is not in Ibn Ashur's commentary on the verse |
| `lataif:w281` | partly | extends it to human dealings |
| `lataif:w283` | partly | adds a lesson on life's difficulties |
| `lataif:w284` | unsupported | credits Ibn Kathir with modern astronomy he does not mention |
| `lataif:w288` | unsupported | al-Kashshaf reads the fitna as being afflicted by the disbelievers, not 'our conduct turning them away' |
| `lataif:w295` | partly | generalizes a divorce-context verse to loss and illness |
| `lataif:w309` | partly | adds the 'biological clock' lesson |
| `lataif:w312` | partly | adds a metaphor and a lesson on hope not in al-Tabari |
| `lataif:w333` | unsupported | al-Kashshaf glosses صبغة الله as 'purification by Allah', not fitrah |
| `lataif:w335` | partly | al-Kashshaf gives two meanings, but the reflection asserts one and rejects the other |
| `lataif:w401` | partly | adds the political rationale |
| `lataif:w427` | partly | adds 'self-generated light', which al-Kashshaf does not say |
| `lataif:w433` | unsupported | al-Kashshaf reads فارغا as her reason having left her from fright, not as an emptiness except for her son |
| `lataif:w468` | partly | adds the hadith-based detail of forfeited places in Paradise |
| `lataif:w473` | partly | al-Kashshaf says the chain coils around the body, not that it goes through it |
| `lataif:w483` | partly | al-Kashshaf says they draw the souls out, not that they do so gently and only for believers |
| `lataif:w515` | partly | Ibn Ashur argues الأبتر is about lacking good, not offspring, yet the reflection still says 'no descendants' |

### Still requiring verification (184)

| Item | Kind | Reason |
|---|---|---|
| `lataif:w1` | requires-verification | The cited work (Ibn Ashur, al-Tahrir wa al-Tanwir) has no text for al-Fatiha 1:5 in the available edition, so the reflection could not be checked; the verse itself is verbatim (1:2–5). |
| `lataif:w2` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w5` | requires-verification | the word نكسوها does not occur in the available al-Kashshaf text for 2:259 |
| `lataif:w7` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w9` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w10` | requires-verification | The cited work (الكشاف - الزمخشري) could not be opened. |
| `lataif:w15` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w20` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w24` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w25` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w28` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w37` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w39` | requires-verification | The cited work (إغاثة اللهفان - ابن القيم) could not be opened. |
| `lataif:w40` | requires-verification | also cites a «الإعجاز العلمي» work, which could not be opened |
| `lataif:w45` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w48` | requires-verification | The cited work (الفوائد - ابن القيم) could not be opened. |
| `lataif:w49` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w51` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w53` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w54` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w60` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w62` | requires-verification | The cited work (التحرير والتنوير - ابن عاشور) could not be opened. |
| `lataif:w63` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w66` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w74` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w77` | requires-verification | The cited work (إغاثة اللهفان - ابن القيم) could not be opened. |
| `lataif:w78` | requires-verification | The cited work (إغاثة اللهفان - ابن القيم) could not be opened. |
| `lataif:w80` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w83` | requires-verification | The cited work (الكشاف - الزمخشري) could not be opened. |
| `lataif:w85` | requires-verification | supported by Ibn Kathir, but it also cites al-Raghib's Mufradat, which could not be opened |
| `lataif:w86` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w87` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w91` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w92` | requires-verification | The cited work (الفوائد - ابن القيم) could not be opened. |
| `lataif:w94` | requires-verification | Ibn Ashur defers this point to Surat al-An'am |
| `lataif:w95` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w98` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w99` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w101` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w104` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w106` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w110` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w117` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w120` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w121` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w124` | requires-verification | also cites a «الإعجاز» work, which could not be opened |
| `lataif:w125` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w126` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w127` | requires-verification | The cited work (الكشاف - الزمخشري) could not be opened. |
| `lataif:w128` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w134` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w135` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w136` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w137` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w138` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w141` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w142` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w143` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w144` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w149` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w152` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w153` | requires-verification | The cited work (التحرير والتنوير - ابن عاشور) could not be opened. |
| `lataif:w154` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w157` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w158` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w160` | requires-verification | also cites al-Raghib's Mufradat, which could not be opened |
| `lataif:w166` | requires-verification | supported by Ibn Kathir, but it also cites al-Raghib's Mufradat, which could not be opened |
| `lataif:w170` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w171` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w172` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w176` | requires-verification | The cited work (الفوائد - ابن القيم) could not be opened. |
| `lataif:w186` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w188` | requires-verification | also cites al-Raghib's Mufradat, which could not be opened |
| `lataif:w192` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w198` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w199` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w201` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w206` | requires-verification | also cites a «الإعجاز الطبي» work, which could not be opened |
| `lataif:w207` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w208` | requires-verification | The cited work (الكشاف - الزمخشري) could not be opened. |
| `lataif:w209` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w211` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w215` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w216` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w219` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w220` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w224` | requires-verification | The cited work (الفوائد - ابن القيم) could not be opened. |
| `lataif:w227` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w228` | requires-verification | The cited work (التحرير والتنوير - ابن عاشور) could not be opened. |
| `lataif:w234` | requires-verification | The cited work (إغاثة اللهفان - ابن القيم) could not be opened. |
| `lataif:w235` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w238` | requires-verification | The cited work (الفوائد - ابن القيم) could not be opened. |
| `lataif:w240` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w241` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w243` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w244` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w246` | requires-verification | The cited work (الفوائد - ابن القيم) could not be opened. |
| `lataif:w251` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w261` | requires-verification | The cited work (إغاثة اللهفان - ابن القيم) could not be opened. |
| `lataif:w262` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w265` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w266` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w270` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w271` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w274` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w275` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w279` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w280` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w282` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w287` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w291` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w293` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w296` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w297` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w301` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w304` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w306` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w310` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w311` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w313` | requires-verification | The cited work (مدارج السالكين - ابن القيم) could not be opened. |
| `lataif:w317` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w318` | requires-verification | The cited work (الكشاف - الزمخشري) could not be opened. |
| `lataif:w320` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w322` | requires-verification | The cited work (الكشاف - الزمخشري) could not be opened. |
| `lataif:w324` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w327` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w329` | requires-verification | The cited work (التحرير والتنوير - ابن عاشور) could not be opened. |
| `lataif:w330` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w338` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w339` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w340` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w342` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w346` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w348` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w350` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w351` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w355` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w360` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w361` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w365` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w372` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w374` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w375` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w376` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w377` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w379` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w381` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w386` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w387` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w391` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w393` | requires-verification | The cited work (التحرير والتنوير - ابن عاشور) could not be opened. |
| `lataif:w396` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w402` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w408` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w410` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w413` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w415` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w421` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w423` | requires-verification | no gloss of the term was found in the cited tafsir |
| `lataif:w426` | requires-verification | The cited work (التحرير والتنوير - ابن عاشور) could not be opened. |
| `lataif:w429` | requires-verification | no gloss of the term was found in the cited tafsir |
| `lataif:w431` | requires-verification | The cited work (مفردات ألفاظ القرآن - الراغب الأصفهاني) could not be opened. |
| `lataif:w434` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w435` | requires-verification | The cited work (إغاثة اللهفان - ابن القيم) could not be opened. |
| `lataif:w438` | requires-verification | The cited work (زاد المعاد - ابن القيم) could not be opened. |
| `lataif:w447` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w448` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w454` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w455` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w459` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w461` | requires-verification | The cited work (جامع البيان - الطبري) could not be opened. |
| `lataif:w462` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w470` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w476` | requires-verification | The cited work (الكشاف - الزمخشري) could not be opened. |
| `lataif:w480` | requires-verification | The cited work (تفسير ابن كثير) could not be opened. |
| `lataif:w490` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w498` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w503` | requires-verification | the relevant commentary could not be located in the cited tafsir |
| `lataif:w505` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w509` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w514` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w520` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |
| `lataif:w523` | requires-verification | The cited work (بدائع الفوائد - الإمام ابن القيم) could not be opened. |
| `lataif:w524` | requires-verification | The cited work (طريق الهجرتين - ابن القيم) could not be opened. |

## C. Saadi Lataif

### Approved (17)

| Item | Verified source | Direct URL |
|---|---|---|
| `lataif:q33-41` | Qur'an 33:41-42 — Tanzil text, verbatim ; Tafsir al-Sa'di at 33:41, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 33:41-42 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/33/41.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/33/41.json · https://quran.com/33/41 |
| `lataif:q39-53` | Qur'an 39:53 — Tanzil text, verbatim ; Tafsir al-Sa'di at 39:53, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 39:53 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/39/53.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/39/53.json · https://quran.com/39/53 |
| `lataif:q94-5` | Qur'an 94:5-6 — Tanzil text, verbatim ; Tafsir al-Sa'di at 94:5, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 94:5-6 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/94/5.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/94/5.json · https://quran.com/94/5 |
| `lataif:q3-134` | Qur'an 3:134 — Tanzil text, verbatim ; Tafsir al-Sa'di at 3:134, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 3:134 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/3/134.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/3/134.json · https://quran.com/3/134 |
| `lataif:q41-34` | Qur'an 41:34 — Tanzil text, verbatim ; Tafsir al-Sa'di at 41:34, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 41:34 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/41/34.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/41/34.json · https://quran.com/41/34 |
| `lataif:q7-205` | Qur'an 7:205 — Tanzil text, verbatim ; Tafsir al-Sa'di at 7:205, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 7:205 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/7/205.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/7/205.json · https://quran.com/7/205 |
| `lataif:q16-53` | Qur'an 16:53 — Tanzil text, verbatim ; Tafsir al-Sa'di at 16:53, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 16:53 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/16/53.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/16/53.json · https://quran.com/16/53 |
| `lataif:q39-10` | Qur'an 39:10 — Tanzil text, verbatim ; Tafsir al-Sa'di at 39:10, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 39:10 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/39/10.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/39/10.json · https://quran.com/39/10 |
| `lataif:q16-18` | Qur'an 16:18 — Tanzil text, verbatim ; Tafsir al-Sa'di at 16:18, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 16:18 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/16/18.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/16/18.json · https://quran.com/16/18 |
| `lataif:q70-5` | Qur'an 70:5 — Tanzil text, verbatim ; Tafsir al-Sa'di at 70:5, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 70:5 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/70/5.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/70/5.json · https://quran.com/70/5 |
| `lataif:q25-63` | Qur'an 25:63 — Tanzil text, verbatim ; Tafsir al-Sa'di at 25:63, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 25:63 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/25/63.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/25/63.json · https://quran.com/25/63 |
| `lataif:q14-7` | Qur'an 14:7 — Tanzil text, verbatim ; Tafsir al-Sa'di at 14:7, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 14:7 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/14/7.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/14/7.json · https://quran.com/14/7 |
| `lataif:q49-10` | Qur'an 49:10 — Tanzil text, verbatim ; Tafsir al-Sa'di at 49:10, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 49:10 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/49/10.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/49/10.json · https://quran.com/49/10 |
| `lataif:q11-115` | Qur'an 11:115 — Tanzil text, verbatim ; Tafsir al-Sa'di at 11:115, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 11:115 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/11/115.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/11/115.json · https://quran.com/11/115 |
| `lataif:q4-86` | Qur'an 4:86 — Tanzil text, verbatim ; Tafsir al-Sa'di at 4:86, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 4:86 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/4/86.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/4/86.json · https://quran.com/4/86 |
| `lataif:q93-11` | Qur'an 93:11 — Tanzil text, verbatim ; Tafsir al-Sa'di at 93:11, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 93:11 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/93/11.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/93/11.json · https://quran.com/93/11 |
| `lataif:q39-9` | Qur'an 39:9 — Tanzil text, verbatim ; Tafsir al-Sa'di at 39:9, verbatim (spa5k/tafsir_api ar-tafseer-al-saddi) — English: Saheeh International, verbatim (Tanzil en.sahih) 39:9 | https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/39/9.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/39/9.json · https://quran.com/39/9 |

### Still requiring verification (3)

| Item | Kind | Reason |
|---|---|---|
| `lataif:q2-153` | requires-verification | Verbatim in one digital edition of Tafsir al-Sa'di, but a second edition shows the excerpt joins non-adjacent sentences, with word differences («عما»/«على ما», «الخلق»/«العباد»); it must be checked against a printed edition. |
| `lataif:q29-45` | requires-verification | Verbatim in one digital edition of Tafsir al-Sa'di, but a second edition shows the excerpt joins non-adjacent sentences, with word differences («عما»/«على ما», «الخلق»/«العباد»); it must be checked against a printed edition. |
| `lataif:q65-3` | requires-verification | Verbatim in one digital edition of Tafsir al-Sa'di, but a second edition shows the excerpt joins non-adjacent sentences, with word differences («عما»/«على ما», «الخلق»/«العباد»); it must be checked against a printed edition. |

## How it is enforced

- `src/data/religiousAudit.ts` is the register, holding the 799 in-scope items only. Flags: `ar`, `ar+en`, `excluded`, `unverified`. An in-scope item with no entry is never shown.
- `src/lib/religiousAudit.ts` defines `inAuditScope`. Everything outside the three categories passes untouched.
- `lib/reminderContent.ts` `reminderPool()` publishes in-scope items only when verified, with English only when verified. A Wamadat reflection is credited «مستفاد من». An approved reviewer edit to an in-scope item withholds it until it is re-audited, because the edited text was never verified.
- `lib/widgetFeed.ts`: unverified hadiths and Lataif never reach the widget, in either language. The widget also refuses an English line it cannot draw safely, which keeps 6 verified Bukhari hadiths whose published English contains «ﷺ» off the English widget only.
- Also gated, for in-scope items only: Favorites (saved snapshots), a tapped old notification (`lib/reminderOpen.ts`), widget favorites (`lib/favoritesSync.ts`), the startup overlay's English line, and the home header quote.
- Random selection: the widget, notifications and the full-screen view all draw from `reminderPool()`, and tests check that no unverified in-scope item can be selected there, through Favorites, from a tapped notification or from a widget favorite.

## Protected content — unchanged

These files are byte-identical to the pre-audit backups (`backups/religious-audit-2026-10-30/`): `src/data/written-adhkar.ts`, `src/data/misc-library.ts`, `src/data/tasbeeh.ts`, `src/data/audio-adhkar.ts`, `src/components/WrittenAdhkarReader.tsx`, `src/components/TasbeehScreen.tsx`, `src/components/WrittenAdhkarSearchScreen.tsx`, `src/components/HomeDailyPicksCard.tsx`, `src/lib/dailyPicks.ts`, `src/lib/floatingTasbeehSync.ts`, `src/lib/islamicOccasions.ts`. The audio and adhkar data files (`dithar-adhkar-cards.json`, `tasbeeh-library.json`, `importedDuas.ts`, `duaReflections.ts`, `dhikrReflections.ts`) and the playback and scheduling code (`audioAdhkarPlayer.ts`, `morningEveningAudio.ts`, `audioAdhkarSchedules.ts`, `AudioAdhkarScreen.tsx`) were never edited, and none of them references the audit. In the reminder pool, every published dua, dhikr virtue, poem and short verse is identical to before; a test checks this.

## Still open

The items marked "still requiring verification" above are **not** verified and are not shown: 15 hadiths, 184 Wamadat reflections and 3 Saadi excerpts. Closing them needs the printed sources: al-Mustadrak, al-Tabarani, Musnad Ahmad, the printed al-Adab al-Mufrad, Sahih Muslim's printed numbering, al-Raghib's Mufradat, the works of Ibn al-Qayyim, and a printed Tafsir al-Sa'di. This audit is complete for every item that could be checked, but not for these.

