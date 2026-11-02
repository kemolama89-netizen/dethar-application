# Qur'an and Tafsir upgrade with Itqan (2026-11-02)

Itqan (https://itqan.dev, GitHub `Itqan-community`) describes itself as an open-source association and community. Its CMS (https://cms.itqan.dev) distributes publishers' Qur'anic resources with stated licences. Its public API (`https://api.cms.itqan.dev`, `/packages/`) was used without an account.

## Resources assessed

| Resource | Itqan asset | Publisher | Licence on Itqan | Verified | Decision |
|---|---|---|---|---|---|
| Tafsir al-Sa'di, by verse | 6 | Tafsir Center | CC BY-ND | Below | **Used**, verbatim |
| Unicode Uthmanic font and text, Hafs v2.0 | 138 | KFGQPC | CC BY-NC-ND | Below | **Used**, verbatim, text mode and Tafsir verse |
| Madinah Mushaf Hafs 1441 vectors | 148 | KFGQPC | CC BY-NC-ND | SHA-256 equals the app's existing master | Confirms the current pages; nothing replaced |
| Uthmanic "Smart" font, Hafs v8 | 137 | KFGQPC | CC BY-NC-ND | Text is private-use glyph codes; its read.me says it isn't for full pages | Not used |
| Madinah Mushaf Hafs 1421 | 147 | KFGQPC | CC BY-NC-ND | Older print than the app's | Not used |
| mushaf-imad-flutter | | Itqan | MIT | Flutter, with PNG page images | Not compatible |
| Recitations | | | | Out of scope | Not assessed |

## Tafsir al-Sa'di: results for all 6,236 verses

| Check | Against | Result |
|---|---|---|
| Rows, order | Tanzil's verse list | 6,236, identical keys and order |
| Approved and publishable | The file's own columns | All approved (مرحلة الاعتماد), all publishable |
| Qur'an column's consonants | Tanzil, same verse | 6,236 match |
| Verse number in heading or comment marker | The row's verse | 6,236 carry their own number |
| Heading's consonants | Tanzil, same verse | 8 differ (below), all others among single-verse headings match |
| Text unchanged | Manifest hashes, per surah | Enforced by test |
| Parse joins back exactly | The row's text | Enforced by test, 6,236 verses |
| On-screen text equals source | Rendered page, sample of 2:255, 2:256, 2:286, 3:1 | Match |
| Second copy, independent | spa5k/tafsir_api `ar-tafsir-as-saadi` | 5,972 of 6,235 rows overlap at 90% or more. Its numbering is offset in places, and its edition differs, so this is supporting evidence only |

**Not checked:** this confirms the file matches itself, Tanzil's verses and a second copy. Nobody compared it against the printed Dar Ibn al-Jawzi book. Itqan's "approved" column is the publisher's own statement.

### Source issues to report to Itqan or Tafsir Center (kept unchanged in the app)

| Verse | Issue |
|---|---|
| 6:165 | Note opens with `¬` and never closes |
| 75:40 | Second note opens with `¬` and never closes |
| 89:7 | `¥` with no opening `¬` in the heading |
| 13:25 | Also contains verse 26's heading and comment, which 13:26 repeats |
| 33:51 | A note has `(?/ 182)`, a reference number missing in the source |
| 4:61 | Heading has an extra `{` before `صدودا` |

### Headings that differ from the verse's consonants

| Verse | Why |
|---|---|
| 2:29, 19:69, 89:15 | Prints only part of the verse |
| 6:82, 59:5 | Joins a phrase quoted from the previous verse |
| 2:245, 7:69 | The heading has س where Tanzil's Uthmani spelling has ص (one letter, computed from the texts) |
| 21:88 | The heading has one more ن than Tanzil's spelling (computed from the texts) |

These reasons come from comparing the letters. Whether each is an edition's spelling convention is for a person to judge against the printed book.

## KFGQPC text and font

- All 6,236 verses have Tanzil's consonants, setting aside Tanzil's heading basmala.
- All 604 pages hold exactly the verses of the app's 1441H printed pages.
- This compares consonants, not every vowel and mark. The two editions encode Uthmani marks differently.

## Basa'ir

Basa'ir reads Itqan's edition for all 114 surahs through `src/lib/saadiTafsir.ts`, the same source as the Mushaf. Its earlier surah 88 source (Quranpedia, Mu'assasat al-Risala edition), with that edition's grouped verse ranges, was retired along with the map; a copy is kept in `backups/`.
