# Tafsir al-Sa'di: source, licence and verification

**Do not edit these files.** To re-import, run `scripts/tafsir/import-itqan-saadi.py`.

| | |
|---|---|
| Book | تيسير الكريم الرحمن في تفسير كلام المنان, Sheikh Abd al-Rahman ibn Nasir al-Sa'di |
| Edition | Dar Ibn al-Jawzi, edited by Saad ibn Fawwaz al-Sumayl, with the editor's notes, divided by verse |
| Publisher | Tafsir Center (مركز تفسير), through Itqan CMS, asset 6, package `tafsir-alsaadi` 1.0.0, open access |
| Licence | CC BY-ND, as stated by Itqan (https://cms.itqan.dev/gallery/asset/6). No derivatives: nothing here is changed |
| File | `tf-ab-saadi_ar.csv`, SHA-256 `619759cf37bd69b94a54bb3595cbcb9910200785b581299a69a52ba498f2db89` |
| Copied | Each verse's content cell, character for character, into its surah's file. The project, workflow-stage and editor-name columns are left out, and the empty notes column |

The source marks the editor's notes inside the text as `¬ … ¥` and the book's quoted Qur'an and verse markers with `{ }`. These stay in the data. `src/lib/saadiTafsir.ts` only divides them for layout, and a test proves every verse joins back to its exact characters.

## Verification (2026-11-02, see `docs/quran-tafsir-itqan-2026-11-02.md`)

- 6,236 rows, one per verse, in Tanzil's exact order. Every row is at the approved stage (مرحلة الاعتماد) and marked publishable.
- Every row's Qur'an column has the same consonants as Tanzil's verse at that surah and verse.
- Every row carries its own verse number, in its heading or its comment marker. So the mapping is the book's own, not inferred.

## In the source, kept as they are

- **No comment:** 1:3 has its comment without a number. 2:50, 2:52, 2:53, 3:63, 3:70, 3:71, 4:61, 16:64 and 28:1 say the Sheikh didn't comment. The app shows what the book says, with nothing in its place.
- **Verses together:** 2:6's heading prints verses 6 and 7 together. The app says so.
- **Comment repeated:** 13:25's text also holds verse 26's comment, which 13:26 has as well. The app says so.
- **Note markers:** 6:165 and 75:40 have an opening `¬` with no closing `¥`, and 89:7 has a `¥` with no `¬`. They're never drawn. A note with no close runs to the end of the verse's text.
- **Headings:** 8 headings differ in consonants from the verse because they print part of it, join a phrase from the previous verse, or spell it another way: 2:29, 2:245, 6:82, 7:69, 19:69, 21:88, 59:5, 89:15. These are the book's words. The verse itself is always shown from the Complex's text above them.
