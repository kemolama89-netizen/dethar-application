# Home-screen widget — religious accuracy audit (2026-10-30)

> **Superseded** by the whole-app audit, `docs/religious-content-audit-2026-10-30.md`. That audit replaced `src/data/widgetAudit.ts` with `src/data/religiousAudit.ts`, and it corrected three of the decisions below: `hadith:2`, `hadith:92` and `hadith:149` are now excluded because their sources do not name the narrator as specifically as the app does. The widget now offers 104 items in Arabic and 15 in English.

Scope: every item the home-screen widget (`DhikrWidgetProvider`) could show — the published reminder pool filtered by `isWidgetItem` in Arabic or English — plus the DITHAR comments shown under them and the widget's placeholder verse. Wamdat/Lataif (Tafsir al-Saadi) items were already kept off the widget by `widgetFeed.ts`, so no tafsir text is shown there.

## Result

| | Count |
|---|---|
| Items reviewed | 158 |
| Approved (Arabic) | 107 |
| Excluded | 51 |
| English approved (verbatim published translation) | 15 |
| DITHAR comments reviewed / excluded | 115 / 115 |
| Placeholder verse (13:28, Arabic + Saheeh International) | verified |

## Method

- **Qur'an:** Tanzil text (`api.alquran.cloud`, edition `quran-simple`) at the cited surah/ayah; English against Saheeh International (`en.sahih`).
- **Hadith:** the six books in `fawazahmed0/hadith-api` (Arabic + English editions with recorded graders), at the cited number (Muslim by Fu'ad Abd al-Baqi). Cross-checked against `AhmedBaset/hadith-json` (sunnah.com-derived) for al-Adab al-Mufrad, Musnad Ahmad and Riyad as-Salihin.
- Comparison is mechanical: diacritics stripped and only spelling conventions unified (hamza seats, ta marbuta, alif maqsura, السماوات/السموات, رؤوس/رءوس, مائة/مئة). Any different word counts as a mismatch.
- **Approval requires:** verbatim wording at a cited reference; the stated narrator in that narration's chain (before the matn); every other cited reference holding the same narration; the displayed grade given by a named grader (or the book being a Sahih).
- **English** is approved only when verbatim in a published translation of the same cited source; otherwise the item appears in Arabic only.
- **Not reachable:** sunnah.com and dorar.net refuse automated access (HTTP 403). Al-Mustadrak, al-Tabarani, Ibn Hibban, Ibn Khuzaymah, Hilyat al-Awliya, Sahih al-Targhib and the numbered al-Adab al-Mufrad editions could therefore not be opened. Items depending on them are **excluded as unverifiable**, not judged inauthentic.

## How it is enforced

- `src/data/widgetAudit.ts` — an allowlist. An item with no entry, or with `ar: false`, is never offered to the widget. In English, `en: true` is also required.
- `src/lib/widgetFeed.ts` — `widgetAuditApproved` gates `isWidgetItem`. A reviewer's approved edit to an item takes it off the widget, because the edited text was never audited. `WIDGET_COMMENTS_AUDITED = false` keeps every DITHAR comment off the widget.
- No religious text was changed or deleted. Excluded items stay in the app, unchanged, everywhere else (library, reminders, in-app views).
- Backups of every changed file: `backups/widget-religious-audit-2026-10-30/`.

## Approved items

| Item | Verified source | English |
|---|---|---|
| `dua:rabbana-atina` | Qur'an 2:201 (Surah al-Baqarah) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 2:201 |
| `dua:allahumma-inni-asaluka-alhuda` | verbatim in Sahih Muslim 2721 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2721, verbatim (hadith-api eng-muslim edition) |
| `dua:allahumma-ighfir-li-warhamni` | verbatim in Sahih Muslim 2697 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2697, verbatim (hadith-api eng-muslim edition) |
| `dua:allahumma-ihdini-wasaddidni` | verbatim in Sahih Muslim 2725 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2725, verbatim (hadith-api eng-muslim edition) |
| `dua:allahumma-aslih-li-dini` | verbatim in Sahih Muslim 2720 | Abdul Hamid Siddiqui's translation of Sahih Muslim 2720, verbatim (hadith-api eng-muslim edition) |
| `dua:rabbi-ighfir-li-watub-alayya` | verbatim in Sunan Abi Dawud 1516 (Al-Albani: Sahih), Sunan Ibn Majah 3814 (Al-Albani: Sahih); same narration, other wording, in Jami at-Tirmidhi 3434 | not shown (no verbatim published translation) |
| `dua:audhu-bikalimatillah-al-tammat` | verbatim in Sahih Muslim | not shown (no verbatim published translation) |
| `dua:allahumma-inni-audhu-bika-min-al-ajz` | verbatim in Sahih Muslim 2706 | not shown (no verbatim published translation) |
| `dua:allahumma-inni-audhu-bika-min-sharri-samee` | verbatim in Sunan Abi Dawud 1551 (Al-Albani: Sahih), Jami at-Tirmidhi 3492 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan); same narration, other wording, in Sunan an-Nasai 5444 | not shown (no verbatim published translation) |
| `dua:allahumma-inni-audhu-bika-min-sharri-ma-amiltu` | verbatim in Sahih Muslim 2716 | not shown (no verbatim published translation) |
| `dua:allahumma-inni-audhu-bika-min-zawal-nimatik` | verbatim in Sahih Muslim 2739 | not shown (no verbatim published translation) |
| `dua:allahumma-inni-audhu-bika-min-al-bukhl-wal-jubn` | verbatim in Sahih al-Bukhari | not shown (no verbatim published translation) |
| `dua:dua-al-karb` | verbatim in Sahih al-Bukhari, Sahih Muslim | not shown (no verbatim published translation) |
| `dua:la-ilaha-illa-anta-subhanaka` | Qur'an 21:87 (Surah al-Anbiya) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:bismillahi-allahumma-jannibna-al-shaytan` | verbatim in Sahih al-Bukhari; same narration, other wording, in Sahih Muslim | not shown (no verbatim published translation) |
| `dua:rabbi-hab-li-min-ladunka-dhurriyyatan` | Qur'an 3:38 (Surah Al Imran) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbi-ijalni-muqim-al-salah` | Qur'an 14:40 (Surah Ibrahim) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbana-hab-lana-min-azwajina` | Qur'an 25:74 (Surah al-Furqan) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbana-la-tuakhidhna` | Qur'an 2:286 (Surah al-Baqarah) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbana-wala-tahmil-alayna-isran` | Qur'an 2:286 (Surah al-Baqarah) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 2:286 |
| `dua:rabbana-wala-tuhammilna` | Qur'an 2:286 (Surah al-Baqarah) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 2:286 |
| `dua:rabbana-dhalamna-anfusana` | Qur'an 7:23 (Surah al-Araf) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 7:23 |
| `dua:rabbana-hab-lana-min-ladunka-rahmatan` | Qur'an 18:10 (Surah al-Kahf) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbi-ishrah-li-sadri` | Qur'an 20:25-26 (Surah Ta-Ha) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbi-zidni-ilman` | Qur'an 20:114 (Surah Ta-Ha) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 20:114 |
| `dua:rabbi-ighfir-li-waliwalidayya` | Qur'an 14:41 (Surah Ibrahim) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbi-inni-lima-anzalta` | Qur'an 28:24 (Surah al-Qasas) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 28:24 |
| `dua:rabbana-afrigh-alayna-sabran-tawaffana` | Qur'an 7:126 (Surah al-Araf) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 7:126 |
| `dua:rabbana-afrigh-alayna-sabran-thabbit` | Qur'an 2:250 (Surah al-Baqarah) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 2:250 |
| `dua:rabbana-la-tuzigh-qulubana` | Qur'an 3:8 (Surah Al Imran) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbana-taqabbal-minna` | Qur'an 2:127 (Surah al-Baqarah) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 2:127 |
| `dua:rabbana-ighfir-lana-waliikhwanina` | Qur'an 59:10 (Surah al-Hashr) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 59:10 |
| `dua:rabbana-alayka-tawakkalna` | Qur'an 60:4 (Surah al-Mumtahanah) - Tanzil text, verbatim | not shown (no verbatim published translation) |
| `dua:rabbana-atmim-lana-nurana` | Qur'an 66:8 (Surah at-Tahrim) - Tanzil text, verbatim | Saheeh International, verbatim (Tanzil en.sahih), verse 66:8 |
| `dua:allahumma-inni-audhu-bika-min-al-matham-wal-maghram` | verbatim in Sahih al-Bukhari 2397, Sahih Muslim 589 | not shown (no verbatim published translation) |
| `dua:allahumma-ikfini-bihalalika-an-haramik` | verbatim in Jami at-Tirmidhi 3563 (Ahmad Muhammad Shakir: Hasan; Al-Albani: Hasan; Bashar Awad Maarouf: Hasan) | not shown (no verbatim published translation) |
| `dua:inna-lillahi-wa-inna-ilayhi-rajiun` | verbatim in Sahih Muslim | not shown (no verbatim published translation) |
| `dua:before-salam-audhu` | verbatim in Sahih Muslim | not shown (no verbatim published translation) |
| `dua:allahumma-audhu-biridaka-min-sakhatik` | verbatim in Sahih Muslim 486 | not shown (no verbatim published translation) |
| `hadith:2` | verbatim in Jami at-Tirmidhi 2018 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan) | not shown (no verbatim published translation) |
| `hadith:4` | verbatim in Sahih al-Bukhari 10; same narration, other wording, in Sahih Muslim 41 | not shown (no verbatim published translation) |
| `hadith:6` | verbatim in Sahih al-Bukhari 6474 | not shown (no verbatim published translation) |
| `hadith:8` | verbatim in Sahih al-Bukhari 13; same narration, other wording, in Sahih Muslim 45 | not shown (no verbatim published translation) |
| `hadith:9` | verbatim in Sahih al-Bukhari 481; same narration, other wording, in Sahih Muslim 2585 | not shown (no verbatim published translation) |
| `hadith:10` | verbatim in Sahih Muslim 2586; same narration, other wording, in Sahih al-Bukhari 6011 | not shown (no verbatim published translation) |
| `hadith:11` | verbatim in Sahih al-Bukhari 7376; same narration, other wording, in Sahih Muslim 2319 | not shown (no verbatim published translation) |
| `hadith:12` | verbatim in Sahih Muslim 2594 | not shown (no verbatim published translation) |
| `hadith:13` | verbatim in Sahih Muslim 2593 | not shown (no verbatim published translation) |
| `hadith:14` | verbatim in Sahih al-Bukhari 6114, Sahih Muslim 2609 | not shown (no verbatim published translation) |
| `hadith:16` | verbatim in Sahih al-Bukhari 33; same narration, other wording, in Sahih Muslim 59 | not shown (no verbatim published translation) |
| `hadith:17` | verbatim in Sahih Muslim 2588 | not shown (no verbatim published translation) |
| `hadith:18` | verbatim in Sahih Muslim 2865 | not shown (no verbatim published translation) |
| `hadith:28` | verbatim in Jami at-Tirmidhi 3895 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan Sahih) | not shown (no verbatim published translation) |
| `hadith:32` | verbatim in Sahih Muslim 2578 | not shown (no verbatim published translation) |
| `hadith:34` | verbatim in Sahih Muslim 2699 | not shown (no verbatim published translation) |
| `hadith:35` | verbatim in Sahih Muslim 2564 | not shown (no verbatim published translation) |
| `hadith:38` | verbatim in Sahih al-Bukhari 2989, Sahih Muslim 1009 | not shown (no verbatim published translation) |
| `hadith:45` | verbatim in Sahih Muslim 1914; the source line's note (the same report with «غصن» in al-Bukhari) is in Sahih al-Bukhari 652 and 2472 | not shown (no verbatim published translation) |
| `hadith:72` | verbatim in Sahih Muslim 1153; same narration, other wording, in Sahih al-Bukhari 2840 | not shown (no verbatim published translation) |
| `hadith:73` | verbatim in Sahih Muslim 223 | not shown (no verbatim published translation) |
| `hadith:74` | verbatim in Sahih Muslim 2676 | not shown (no verbatim published translation) |
| `hadith:84` | verbatim in Sunan Abi Dawud 4811 (Al-Albani: Sahih); same narration, other wording, in Jami at-Tirmidhi 1954 | not shown (no verbatim published translation) |
| `hadith:86` | verbatim in Sahih Muslim 384 | not shown (no verbatim published translation) |
| `hadith:87` | verbatim in Sahih Muslim 1016; same narration, other wording, in Sahih al-Bukhari 1417 | not shown (no verbatim published translation) |
| `hadith:89` | verbatim in Sahih al-Bukhari 1903 | not shown (no verbatim published translation) |
| `hadith:90` | verbatim in Sahih Muslim 2560; same narration, other wording, in Sahih al-Bukhari 6077 | not shown (no verbatim published translation) |
| `hadith:91` | verbatim in Sahih Muslim 2631 | not shown (no verbatim published translation) |
| `hadith:92` | verbatim in Sahih al-Bukhari 6488 | not shown (no verbatim published translation) |
| `hadith:94` | verbatim in Jami at-Tirmidhi 2910 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan Sahih) | not shown (no verbatim published translation) |
| `hadith:97` | verbatim in Sahih al-Bukhari 2736, Sahih Muslim 2677 | not shown (no verbatim published translation) |
| `hadith:102` | verbatim in Sahih Muslim 634 | not shown (no verbatim published translation) |
| `hadith:103` | verbatim in Sunan Abi Dawud 561 (Al-Albani: Sahih), Jami at-Tirmidhi 223 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih) | not shown (no verbatim published translation) |
| `hadith:105` | verbatim in Sunan Abi Dawud 3116 (Al-Albani: Sahih) | not shown (no verbatim published translation) |
| `hadith:108` | verbatim in Sahih al-Bukhari 2072 | not shown (no verbatim published translation) |
| `hadith:109` | verbatim in Sahih al-Bukhari 1427; same narration, other wording, in Sahih Muslim 1034 | not shown (no verbatim published translation) |
| `hadith:112` | verbatim in Jami at-Tirmidhi 2390 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan Sahih) | not shown (no verbatim published translation) |
| `hadith:114` | verbatim in Jami at-Tirmidhi 1924 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan Sahih); same narration, other wording, in Sunan Abi Dawud 4941 | not shown (no verbatim published translation) |
| `hadith:115` | verbatim in Jami at-Tirmidhi 2317 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan) | not shown (no verbatim published translation) |
| `hadith:116` | verbatim in Sahih Muslim 55 | not shown (no verbatim published translation) |
| `hadith:117` | verbatim in Sahih al-Bukhari 15; same narration, other wording, in Sahih Muslim 44 | not shown (no verbatim published translation) |
| `hadith:118` | verbatim in Sahih Muslim 1563 | not shown (no verbatim published translation) |
| `hadith:120` | verbatim in Sahih Muslim 1054 | not shown (no verbatim published translation) |
| `hadith:137` | verbatim in Sahih Muslim 2618 | not shown (no verbatim published translation) |
| `hadith:138` | verbatim in Sahih al-Bukhari 5027 | not shown (no verbatim published translation) |
| `hadith:140` | verbatim in Sahih al-Bukhari 6117, Sahih Muslim 37 | not shown (no verbatim published translation) |
| `hadith:142` | verbatim in Jami at-Tirmidhi 2139 (Ahmad Muhammad Shakir: Hasan; Al-Albani: Hasan; Bashar Awad Maarouf: Hasan) | not shown (no verbatim published translation) |
| `hadith:145` | verbatim in Sahih al-Bukhari 1240; same narration, other wording, in Sahih Muslim 2162 | not shown (no verbatim published translation) |
| `hadith:148` | verbatim in Jami at-Tirmidhi 3479 (Ahmad Muhammad Shakir: Hasan; Al-Albani: Hasan) | not shown (no verbatim published translation) |
| `hadith:149` | verbatim in Sunan an-Nasai 1282 (Al-Albani: Sahih) | not shown (no verbatim published translation) |
| `hadith:153` | verbatim in Sahih al-Bukhari 1393 | not shown (no verbatim published translation) |
| `hadith:154` | verbatim in Sahih Muslim 49 | not shown (no verbatim published translation) |
| `hadith:157` | verbatim in Sahih al-Bukhari 5645 | not shown (no verbatim published translation) |
| `hadith:168` | verbatim in Sahih al-Bukhari 1773, Sahih Muslim 1349 | not shown (no verbatim published translation) |
| `hadith:169` | verbatim in Sahih al-Bukhari 1521; same narration, other wording, in Sahih Muslim 1350 | not shown (no verbatim published translation) |
| `hadith:171` | verbatim in Sunan Abi Dawud 5128 (Al-Albani: Sahih), Jami at-Tirmidhi, Sunan Ibn Majah | not shown (no verbatim published translation) |
| `hadith:173` | verbatim in Jami at-Tirmidhi 3443 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan Sahih) | not shown (no verbatim published translation) |
| `hadith:174` | verbatim in Sahih Muslim 2160; same narration, other wording, in Sahih al-Bukhari 6231 | not shown (no verbatim published translation) |
| `hadith:184` | verbatim in Jami at-Tirmidhi 2315 (Ahmad Muhammad Shakir: Hasan; Al-Albani: Hasan; Bashar Awad Maarouf: Hasan); same narration, other wording, in Sunan Abi Dawud 4990 | not shown (no verbatim published translation) |
| `hadith:194` | verbatim in Sahih Muslim 2956 | not shown (no verbatim published translation) |
| `hadith:198` | verbatim in Sahih Muslim 671 | not shown (no verbatim published translation) |
| `hadith:199` | verbatim in Sahih Muslim 35; same narration, other wording, in Sahih al-Bukhari 9 | not shown (no verbatim published translation) |
| `virtue:4` | verbatim in Jami at-Tirmidhi 3464 (Ahmad Muhammad Shakir: Sahih; Al-Albani: Sahih; Bashar Awad Maarouf: Hasan Sahih) | not shown (no verbatim published translation) |
| `virtue:5` | verbatim in Sahih al-Bukhari, Sahih Muslim | not shown (no verbatim published translation) |
| `virtue:7` | verbatim in Sahih al-Bukhari, Sahih Muslim | not shown (no verbatim published translation) |
| `virtue:8` | verbatim in Sahih Muslim | not shown (no verbatim published translation) |
| `virtue:12` | verbatim in Jami at-Tirmidhi 3383 (Ahmad Muhammad Shakir: Hasan; Al-Albani: Hasan; Bashar Awad Maarouf: Hasan) | not shown (no verbatim published translation) |
| `virtue:16` | verbatim in Sahih Muslim 601 | not shown (no verbatim published translation) |

## Excluded items

Reasons: *wording* = not verbatim at the cited source; *reference* = wording belongs to another number or narration; *narrator*; *grade*; *unverifiable* = the cited work could not be opened.

| Item | Source line shown | Reason |
|---|---|---|
| `dua:sayyid-al-istighfar` | صحيح البخاري (6306) — عن شداد بن أوس رضي الله عنه | Wording incomplete: Bukhari 6306 reads «وأبوء لك بذنبي»; the app omits «لك». |
| `dua:allahumma-inni-audhu-bika-min-jahd-al-bala` | صحيح البخاري وصحيح مسلم | Not verbatim: Bukhari and Muslim report that the Prophet sought refuge from these things («كان يتعوذ من…»), not this first-person formula. |
| `dua:allahumma-inni-audhu-bika-min-al-faqr` | سنن أبي داود (1544)، وسنن النسائي (5460، 5462) — عن أبي هريرة رضي الله عنه، صححه الألباني وابن حبان والحاكم | Core verified (Abu Dawud 1544, al-Albani: Sahih) but the displayed gradings by Ibn Hibban and al-Hakim could not be verified. |
| `dua:allahumma-inni-audhu-bika-min-al-hamm` | صحيح البخاري وصحيح مسلم | Attribution wrong: found in Bukhari (6369) but not in Sahih Muslim, yet it is shown as «Bukhari and Muslim». |
| `dua:allahumma-inni-asaluka-min-fadlika-warahmatik` | المعجم الكبير للطبراني (10379)، وحلية الأولياء لأبي نعيم — عن عبد الله بن مسعود رضي الله عنه، صححه الألباني في السلسلة الصحيحة (1543) | Al-Tabarani 10379, Hilyat al-Awliya and al-Silsila al-Sahiha 1543 could not be opened and verified. |
| `dua:ya-muqallib-al-qulub-thabbit-qalbi` | جامع الترمذي (2140) — عن أم سلمة رضي الله عنها، حسنه الترمذي وصححه الألباني | Narrator wrong: Tirmidhi 2140 is narrated by Anas, not Umm Salamah (her narration is Tirmidhi 3522). |
| `dua:allahumma-inni-audhu-bika-an-adilla-aw-udall` | سنن أبي داود (5094)، وجامع الترمذي (3427)، وسنن النسائي، وسنن ابن ماجه، ومسند أحمد — عن أم سلمة رضي الله عنها، حسن صحيح عند الترمذي، وصححه الألباني | Core verified (Abu Dawud 5094, Tirmidhi 3427, al-Nasa'i 5486, Ibn Majah 3884) but the displayed Musnad Ahmad citation could not be verified. |
| `dua:allahumma-aini-ala-dhikrik` | أبو داود (1522)، والنسائي، وابن خزيمة — عن معاذ بن جبل رضي الله عنه، صححه الألباني | Core verified (Abu Dawud 1522; al-Nasa'i 1303) but the displayed Ibn Khuzaymah citation could not be verified. |
| `dua:allahumma-inni-asaluka-fil-al-khayrat` | جامع الترمذي (3233)، وصححه الألباني لغيره في صحيح الترغيب (3192) | Core verified (Tirmidhi 3233, al-Albani: Sahih) but the displayed «Sahih al-Targhib 3192» citation could not be verified. |
| `dua:allahumma-hasibni-hisaban-yasiran` | صحيح البخاري (6536) وصحيح مسلم (2876) — عن عائشة رضي الله عنها | Attribution wrong: Bukhari 6536 and Muslim 2876 do not contain this dua. |
| `hadith:3` | سنن أبي داود، كتاب الأدب / سنن الترمذي (أبو داود 4799، الترمذي 2002) — صحيح | Wording differs from both cited narrations (Tirmidhi 2002 reads «ما شيء أثقل», not «ما من شيء»; Abu Dawud 4799 has different wording). |
| `hadith:22` | صحيح البخاري، كتاب الأدب / صحيح مسلم (البخاري 6014، مسلم 2624) — صحيح متفق عليه | Wording matches Ibn Umar's narration (Bukhari 6015, Muslim 2625), not the cited numbers 6014/2624 (Aisha's narration reads «يوصيني جبريل»/«ليورثنه»). |
| `hadith:23` | صحيح البخاري، كتاب الأدب (6016) — صحيح | Narrator wrong: Bukhari 6016 is narrated by Abu Shurayh, not Abu Hurairah. |
| `hadith:24` | صحيح مسلم، كتاب البر والصلة (2551) — صحيح | Composite wording: «رغم أنفه» is from Muslim 2551b, «أبويه» from 2551a; no single narration reads as shown. |
| `hadith:29` | صحيح مسلم، كتاب الرضاع (1469) — صحيح | Text found in Muslim, but the reference number 1469 could not be confirmed (the dataset places it under 1468; sunnah.com blocked automated checks). |
| `hadith:36` | الأدب المفرد للبخاري، وأصله في صحيح مسلم من حديث حذيفة بنحوه (الأدب المفرد 225) — صحيح | Primary reference (al-Adab al-Mufrad 225) and its al-Albani grading could not be verified; the source available numbers it differently and sunnah.com refused access. |
| `hadith:40` | صحيح البخاري، كتاب الأدب / صحيح مسلم (البخاري 6064، مسلم 2559) — صحيح متفق عليه | Reference mismatch: the wording is Muslim 2564; the cited Bukhari 6064 and Muslim 2559 have different wording. |
| `hadith:43` | صحيح مسلم، كتاب البر والصلة (2592) — صحيح | Wording differs: Muslim 2592 reads «يحرم الخير» without «كله» (that wording is Abu Dawud 4809). |
| `hadith:44` | المستدرك للحاكم (صححه الحاكم، وصححه الألباني في صحيح الجامع 1077) — صحيح لغيره (حسن) | Source (al-Mustadrak) and grading (Sahih al-Jami 1077) could not be opened and verified. |
| `hadith:48` | الأدب المفرد للبخاري (353) — حسن | Al-Adab al-Mufrad 353 reference and grading could not be verified (number not confirmable from available sources). |
| `hadith:50` | سنن الترمذي، كتاب صفة القيامة (2501) — حسن | Displayed grade «حسن» not supported: Tirmidhi 2501 says «غريب», al-Albani and Shakir say Sahih; al-Mundhiri attribution unverifiable. |
| `hadith:51` | مسند الإمام أحمد، والتاريخ الكبير للبخاري (أحمد 17649 (وروي أيضاً بمعناه عن محمد بن أبي عميرة)) — حسن | Musnad Ahmad 17649 / al-Tarikh al-Kabir could not be opened and verified. |
| `hadith:58` | المعجم الكبير للطبراني، ورواه البزار في مسنده (الطبراني 754، البزار (كما في مجمع الزوائد 8/170)) — حسن | Al-Tabarani 754 / al-Bazzar could not be opened and verified. |
| `hadith:62` | صحيح البخاري، كتاب أحاديث الأنبياء (3483) — صحيح | Wording differs from cited Bukhari 3483; the closest is Bukhari 6120 («تستحي»), which is not the cited number. |
| `hadith:70` | المستدرك للحاكم (صححه الحاكم) — صحيح | Al-Mustadrak reference and grading could not be verified. |
| `hadith:75` | صحيح البخاري، كتاب الكسوف / صحيح مسلم (البخاري 6485، مسلم 2359) — صحيح متفق عليه | Composite: «والذي نفسي بيده» is not in Bukhari 6485 or in the cited Muslim 2359 wording. |
| `hadith:79` | صحيح البخاري، كتاب الصلاة / صحيح مسلم (البخاري 450، مسلم 533) — صحيح متفق عليه | Wording edited: the source contains the narrator's doubt «قال بكير حسبت أنه قال»; «مسجدا لله … مثله» as shown is in no single narration. |
| `hadith:81` | سنن الترمذي، كتاب صفة القيامة (2307) — حسن | Wording differs from cited Tirmidhi 2307 («أكثروا ذكر»); the shown wording is Tirmidhi 2460. |
| `hadith:83` | سنن الترمذي، كتاب الصلاة (413) — حسن | Narrator wrong: Tirmidhi 413 is narrated by Abu Hurairah, not Tamim al-Dari. |
| `hadith:98` | سنن ابن ماجه، كتاب الطهارة (277) — حسن | Wording differs: Ibn Majah 277 reads «ولا يحافظ», not «ولن يحافظ». |
| `hadith:104` | سنن أبي داود، كتاب الأدب (5212) — حسن | Wording differs from cited Abu Dawud 5212 («يفترقا»); the shown wording is Ibn Majah 3703. |
| `hadith:111` | الأدب المفرد للبخاري (594) — حسن | Al-Adab al-Mufrad 594 number and gradings could not be verified. |
| `hadith:113` | سنن أبي داود، كتاب الأدب / سنن الترمذي (أبو داود 4777، الترمذي 2493) — حسن | Wording differs from both cited narrations («سبحانه وتعالى», «الحور العين» are not in Abu Dawud 4777 or Tirmidhi 2493). |
| `hadith:122` | صحيح البخاري، كتاب العلم / صحيح مسلم (البخاري 73، مسلم 816) — صحيح متفق عليه | Composite: «فسلطه» is Muslim's wording, «الحكمة» is Bukhari's; no single narration reads as shown. |
| `hadith:130` | صحيح مسلم، كتاب التوبة (2755) — صحيح | Wording differs from Muslim 2755 («بجنته»، «من جنته»). |
| `hadith:132` | صحيح البخاري، كتاب الرقاق / صحيح مسلم (البخاري 6465، مسلم 782) — صحيح متفق عليه | Wording rephrased: the sources record a question and answer («أي الأعمال أحب إلى الله؟ قال: أدومها»), not this sentence. |
| `hadith:133` | صحيح البخاري، كتاب الرقاق / صحيح مسلم (البخاري 43، مسلم 782) — صحيح متفق عليه | Reference mismatch: the shown wording is Bukhari 5861; cited Bukhari 43 and Muslim 782 differ. |
| `hadith:144` | صحيح مسلم، كتاب الإيمان (54) — صحيح | No single narration of Muslim 54 contains «والذي نفسي بيده» together with the full text (54b only says «بمثل حديث»). |
| `hadith:162` | صحيح مسلم، كتاب الرضاع (1467) — صحيح | Text found in Muslim, but the reference number 1467 could not be confirmed (dataset numbering differs; sunnah.com blocked). |
| `hadith:180` | مسند الإمام أحمد، وأصله في صحيح مسلم من حديث حذيفة بمعناه (أحمد 14571) — حسن | Musnad Ahmad 14571 could not be opened and verified. |
| `hadith:183` | سنن ابن ماجه، كتاب الرهون (2443) — حسن | Displayed grade «حسن» not supported: every grader on Ibn Majah 2443 (al-Albani, Abd al-Baqi, Zubair Ali Zai) says Sahih. |
| `hadith:185` | صحيح مسلم، المقدمة (5 (المقدمة)) — صحيح | Muqaddimah of Sahih Muslim (5) could not be opened and verified. |
| `hadith:188` | سنن أبي داود، كتاب العلم / سنن الترمذي وابن ماجه (أبو داود 3641، الترمذي 2682) — حسن صحيح | Wording differs from the cited narrations («يطلب/يبتغي فيه علما سلك الله به»). |
| `hadith:192` | سنن الترمذي، كتاب العلم / سنن أبي داود وابن ماجه (الترمذي 2656) — صحيح | Wording not found: Tirmidhi 2656 has different wording; the closest is Tirmidhi 2658, which also differs. |
| `hadith:193` | صحيح مسلم، كتاب الوصية (1631) — صحيح | Wording differs: Muslim 1631 reads «انقطع عنه عمله إلا من ثلاثة إلا من صدقة». |
| `hadith:200` | صحيح البخاري، كتاب الإيمان / صحيح مسلم (البخاري 50، مسلم 8) — صحيح متفق عليه | Reference mismatch: «الإحسان أن تعبد الله…» as one sentence is Bukhari 4777; cited Bukhari 50 and Muslim 8 record it as question and answer. |
| `virtue:1` | صحيح مسلم؛ رياض الصالحين 1431 | Virtue text is a paraphrase («من قال: سبحان الله، مائة مرة…»), not the wording of Muslim 2698. |
| `virtue:3` | صحيح مسلم؛ رياض الصالحين 1413 | Virtue text omits the narrator's «أو تملأ» from Muslim 223; not verbatim. |
| `virtue:6` | صحيح البخاري وصحيح مسلم؛ رياض الصالحين 1410 | Virtue text is paraphrased («من قالها…») and truncated; not the wording in Bukhari or Muslim. |
| `virtue:11` | صحيح مسلم 2137 | Virtue text is a paraphrase, not the wording of Muslim 2137 («لا يضرك بأيهن بدأت»). |
| `virtue:15` | صحيح البخاري 799 | The virtue in Bukhari 799 is for «ربنا ولك الحمد حمدا كثيرا…», not for «الحمد لله حمدا كثيرا…» as shown. |

## Data issues found outside what the widget displays

- `hadith:103` gradingSourceAr says «حسّنه الترمذي», but Tirmidhi 223 says «غريب». The displayed grade (صحيح; al-Albani: Sahih) is correct, so the item stays approved.
- `hadith:115` gradingSourceAr says «حسّنه الترمذي», but Tirmidhi 2317 says «غريب». The displayed «حسن» is supported by Bashar Awad Ma'ruf's grading.

## Re-admitting an excluded item

Correct the text, reference, narrator or grade against the original source. Then add or flip its entry in `src/data/widgetAudit.ts` with the verified `source`, and regenerate the native fixture (`WRITE_WIDGET_FIXTURE=1 npx vitest run src/lib/widgetNativeContract.test.ts`). Several exclusions only need a citation trimmed or a number corrected; the reason column says which.

