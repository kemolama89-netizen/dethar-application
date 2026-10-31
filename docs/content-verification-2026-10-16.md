# Religious content: verification report (2026-10-16)

This is an independent re-check of every religious text added in the
October 2026 content update. It covers `src/data/widgetContent.ts`,
`src/data/quranLataif.ts` and `src/data/startupHadith.ts`. A script
fetched the sources listed below and compared each item with them
mechanically.

**What this report is not:** it is **not** a scholarly verification. The
script confirms that the wording, references and gradings match the source
texts it could reach. It does not judge meaning, context or chains of
narration, and a qualified person still has to do that before anything is
approved. Every item below stays **Pending Review** in the app's Religious
Content Review screen, apart from the startup Hadith (see the last section).

## Sources the check could reach

| Content | Source used | Notes |
|---|---|---|
| Hadith Arabic text and gradings | fawazahmed0/hadith-api (jsDelivr): Arabic editions of Bukhari, Muslim, Tirmidhi, Ibn Majah | Gives the in-book reference and graders such as al-Albani, Ahmad Shakir and Shu'ayb al-Arna'ut. |
| Qur'an Arabic | Tanzil «quran-simple» (via fawazahmed0/quran-api), plus Quran.com «imlaei» text | Two independent copies. |
| Qur'an English | Saheeh International (Quran.com API, translation 20) | The translation the app credits. |
| Tafsir | Tafsir al-Sa'di (Quran.com API, tafsir 91) | The tafsir the app credits. |
| Poetry | Arabic Wikisource (search API) | Confirms that the words are quoted there. **It does not prove who wrote them.** |

**Could not be reached from this environment:** sunnah.com (HTTP 403),
api.sunnah.com (403) and dorar.net (403). So no item was checked against
sunnah.com itself. The sunnah.com links were checked against the in-book
references in the dataset, which uses sunnah.com's numbering.

## Results

### Hadiths: 47 items

- **Wording: 47 of 47 found.** The Prophet's ﷺ words, the part inside
  «», appear in the cited narration.
  - Bukhari (18), Tirmidhi (9) and Ibn Majah (2) were found at their own
    numbers.
  - Muslim (18) was found by searching the whole edition, because the
    dataset's file numbers aren't Muslim's standard numbers.
  - `muslim-373` has no «»; its core phrase «كان النبي ﷺ يذكر الله على كل
    أحيانه» is in Muslim, in-book 3/147.
- **Links (in-book reference):** 44 of 47 match the dataset exactly.
  - **Needs human confirmation:** `muslim-2700`, `muslim-2733` and
    `muslim-2759`. The dataset gives these narrations no in-book number,
    so their sunnah.com links were worked out from the neighbouring
    entries. The review screen already warns about them.
- **Standard Muslim numbers** (for example "Muslim 2654"): this dataset
  has no standard (Fu'ad 'Abd al-Baqi) numbers, so they **could not be
  re-checked**. Confirm them against a printed edition or sunnah.com.
- **Gradings:**
  - Bukhari and Muslim: these collections are sahih by convention.
  - Tirmidhi and Ibn Majah: every grading the app claims for al-Albani,
    Ahmad Shakir and Shu'ayb al-Arna'ut matches the dataset. **No item has
    a da'if or weaker grade from any listed grader.**
  - At-Tirmidhi's own remarks (حسن صحيح / حسن غريب) were found at the end
    of his text and match.
  - **One correction made:** `tirmidhi-2346` said "at-Tirmidhi" without
    his words. It now reads "at-Tirmidhi (hasan gharib); al-Albani (hasan)".
- **Narrator: 47 of 47** stored Companions appear in their narration.
  Where the words aren't identical, the narration uses a different
  grammatical form or a shorter name:
  - أبي هريرة for أبو هريرة;
  - the family name or tribe left out of the chain (عمر for عمر بن الخطاب,
    أبي موسى for أبو موسى الأشعري, أنس, ابن مسعود, أبي ذر);
  - «للحسن بن علي», where the name follows a joined preposition.

  No narration is credited to the wrong Companion. `tirmidhi-1987` also
  has a second chain through Mu'adh ibn Jabal; the app names Abu Dharr,
  the first narrator in the text.
- **English:** these are DITHAR's own renderings, compared with a
  published translation but **not verbatim** (`reviewed: false`). **All
  47 need human review.**

### Supplications: 13 items

- **Sunnah (3):** `muslim-2654`, `muslim-2722-taqwa`, `muslim-2722-ilm`.
  - The wording was found in Muslim, and the in-book references 46/29 and
    48/99 match.
  - The English is a DITHAR rendering, so it needs human review.
- **Qur'anic (10):** the Arabic matches **both** Qur'an texts, letter for
  letter with every vowel mark. The only difference is that pause marks
  (ۚ ۖ ۗ) are left out.
  - **Four English meanings had drifted from Saheeh International**, the
    translation they credit. **They are now Saheeh's exact words:**

    | Item | Was | Now (Saheeh International) |
    |---|---|---|
    | `q-26-83` | "grant me **wisdom (ḥukm)**" | "grant me **authority**" |
    | `q-3-193` | "cause us to die **with** the righteous" | "… **among** the righteous" |
    | `q-46-15` | "righteousness of which You approve" | "… of which You **will** approve" |
    | `q-3-147` | punctuation, and "(committed)" | "… and the excess [committed] … and plant firmly our feet and …" |

### Quranic Lataif: 13 items

- **Verse:** 13 of 13 match both Qur'an texts with every vowel mark (pause
  marks left out). Ten are full verses; `q29-45`, `q65-3` and `q39-10` are
  correctly marked as excerpts.
- **Tafsir al-Sa'di: 13 of 13 are verbatim excerpts** of the tafsir for
  the stated verse.
- **English (Saheeh International):** 13 of 13 match. `q94-5` leaves out
  the translator's gloss "[i.e., relief]".
- **Kept apart:** the verse, the tafsir and DITHAR's reflections are stored
  separately and labelled separately.

### Poetry: 17 items

- **Wording:** all 17 are quoted on Arabic Wikisource. `shawqi-huda` only
  matched once the vowel mark in «وُلد» was dropped from the search.
- **Attribution:** 13 are marked "established" and 4 are marked
  uncertain. The 4 uncertain ones are shown with «يُنسب إلى…» /
  "attributed to…":
  - `shafii-afw`: attributed to al-Shafi'i
  - `shafii-ayyam`: attributed to al-Shafi'i
  - `nazila-faraj`: **disputed**; attributed to al-Shafi'i, while Ibn
    Kathir gives it to Ibrahim ibn al-'Abbas al-Suli
  - `atahiya-raqib`: attributed to Abu al-'Atahiya; Imam Ahmad is reported
    to have recited it
- **Needs human review:** a Wikisource match shows that the words are
  quoted, not who wrote them. The "established" labels rest on well-known
  sources such as the poets' diwans, and Bukhari 3841 for Labid. The
  check doesn't prove them.
- **English:** DITHAR's renderings of the meaning, so they need human
  review.

### DITHAR editorial reflections: 256 items

- 180 are attached to individual items and 76 to groups (dua categories
  and dhikr themes).
- These are DITHAR's own words, so there is no source to check against.
- They are labelled «تأمّل دِثار» / "DITHAR reflection" and never shown as
  Qur'an, Hadith or tafsir.
- **All need human review** for accuracy and tone.

## The startup Hadith (Jami' at-Tirmidhi 3377)

- **Wording:** the overlay shows only the Prophet's ﷺ words, from «ألا
  أنبئكم بخير أعمالكم…» to «ذكر الله تعالى». It matches the Arabic text of
  Tirmidhi 3377.
- **Link:** in-book 48/8 matches `https://sunnah.com/tirmidhi/48/8`.
- **Grading:** sahih per Ahmad Shakir and al-Albani, both listed with the
  narration.
- **Nothing merged:** Mu'adh ibn Jabal's own statement «ما شيء أنجى من
  عذاب الله من ذكر الله» is in the same report and is **not** shown.
- **Not checked:** sunnah.com itself (it blocked the check).
- **Status:** it is set to **Approved** by default because the app owner
  asked for this narration. It can be set back to Pending in the review
  screen.

## Summary

| Status | Items |
|---|---|
| Wording and references match the sources the check could reach | 47 Hadiths, 13 supplications, 13 Lataif (verse and tafsir), 17 poems (wording only), the startup Hadith |
| Corrected in this pass (still Pending) | `q-3-147`, `q-3-193`, `q-26-83`, `q-46-15` (English to Saheeh's exact words); `tirmidhi-2346` (grading wording) |
| Needs human confirmation of a reference | `muslim-2700`, `muslim-2733`, `muslim-2759` (links); every Muslim item's standard number |
| Needs human review whatever the check found | every English rendering of Hadiths, Sunnah duas and poems; the 13 "established" poem attributions; the 4 uncertain attributions; all 256 DITHAR reflections; final scholarly approval of every item |
| Missing references | none found: every item has a source, a reference and a link |

## Addendum: content added later on 2026-10-16

Eight new items, all **Pending Review**. None reaches widgets or reminders
until approved in the review screen. Each item was copied from the fetched
source text, not typed from memory, and then re-checked by the same script.

**Hadiths (5), all Sahih al-Bukhari**

| Item | In-book (sunnah.com) | Topic |
|---|---|---|
| `bukhari-6018` | 78/49 | neighbor, guest, guarding the tongue |
| `bukhari-6464` | 81/53 | the most beloved deeds are the most constant |
| `bukhari-6011` | 78/42 | the believers as one body |
| `bukhari-6035` | 78/65 | the best are the best in character *(part of a longer narration)* |
| `bukhari-2989` | 56/198 | charity due from every joint |

- **Wording, narrator and grading:** the Arabic is the Prophet's ﷺ words
  from the dataset's narration, with vowel marks removed as in the existing
  entries. The narrator is confirmed in the chain, and no listed grader rates
  any of them weak.
- **English:** Muhsin Khan's published translation, **verbatim**. Only the
  dataset's missing closing quotation mark and a missing space after the
  narrator were fixed. For `bukhari-6035`, only the part matching the
  Arabic excerpt is used.

**Quranic Lataif (3)**

| Item | Verse | Tafsir excerpt |
|---|---|---|
| `q25-63` | al-Furqan 25:63 | al-Sa'di on 25:63 |
| `q14-7` | Ibrahim 14:7 | al-Sa'di on 14:7 |
| `q49-10` | al-Hujurat 49:10 | al-Sa'di on 49:10 |

- **Verse:** Tanzil text, with only the pause marks removed. It is identical
  to Quran.com's text.
- **Tafsir:** a verbatim substring of Tafsir al-Sa'di for the same verse.
- **English:** Saheeh International, with macrons simplified as in the
  existing entries.

**Each new item has two DITHAR comments.** They are DITHAR's own words,
labelled as editorial and making no religious claims of their own, and need
human review like all comments.

**Considered and not added, to avoid duplicates:**
- *Already in the Hadith library:* Bukhari 13, Bukhari 6114, Muslim 2999 and
  Muslim 2588.
- *Verse already a Wamdat latifa:* 2:186, 13:28, 2:152 and 3:159.

**Not added this time:**
- *Poetry:* attribution could not be verified to the required standard from
  the reachable sources.
- *Supplications:* the sources began rate-limiting (HTTP 403/503) before
  more could be fetched.

## Addendum 2: second batch (2026-10-16)

Ten more items, all **Pending Review**. Each was copied from the fetched
source and re-checked by the script.

**Hadiths (3), all Sahih al-Bukhari, with Muhsin Khan's published English verbatim**

| Item | In-book | Topic | Note |
|---|---|---|---|
| `bukhari-6012` | 78/43 | planting as charity | Checked against the dataset's GitHub copy, because jsDelivr was rate-limiting. |
| `bukhari-6064` | 78/94 | suspicion, envy and brotherhood | Chosen over 6065, whose wording overlaps it. |
| `bukhari-6477` | 81/66 | the weight of a careless word | **Reviewer note:** the dataset's Arabic ends «أبعد مما بين المشرق», and its English matches. Confirm the ending against a printed edition before approving. |

**Quranic Lataif (4)**

| Item | Verse | Tafsir |
|---|---|---|
| `q11-115` | Hud 11:115 | al-Sa'di |
| `q4-86` | an-Nisa 4:86 | al-Sa'di |
| `q93-11` | ad-Duha 93:11 | al-Sa'di |
| `q39-9` | az-Zumar 39:9 | al-Sa'di *(excerpt: «قل هل يستوي…»)* |

All four: the verse matches Tanzil and Quran.com, the English matches
Saheeh International, and the tafsir is a verbatim substring of al-Sa'di.

**Poetry (3)**

| Item | Line | Wikisource page | Attribution |
|---|---|---|---|
| `tarafa-ayyam` | «ستبدي لك الأيام ما كنت جاهلا …» | «معلقة طرفة بن العبد» | Tarafa ibn al-'Abd |
| `zuhayr-maruf` | «ومن يجعل المعروف من دون عرضه …» | «معلقة زهير بن أبي سلمى» | Zuhayr ibn Abi Sulma |
| `mutanabbi-nujum` | «إذا غامرت في شرف مروم …» | «إذا غامرت في شرف مروم» | al-Mutanabbi |

- **Attribution:** the line is on the poem's own Wikisource page, and that
  page names the poet. Tarafa's and Zuhayr's lines are from their
  Mu'allaqat, whose authorship is long established.
- **English:** a DITHAR rendering of the meaning, labelled as such, as with
  all poetry in the app.

**Considered and not added, because they duplicate existing content:**
- *Qur'anic duas already in the app's duas library:* 25:74, 59:10, 2:250,
  66:8 and 20:114. So no new duas were added.
- *Hadiths already in the library, the Tasbeeh library or this update:*
  Bukhari 6406, 6136, 6016, 6019, 2442, 6138, 10 and 6474.
- *Verses already Wamdat Lataif:* 7:23, 18:10, 16:90 and 3:200.
