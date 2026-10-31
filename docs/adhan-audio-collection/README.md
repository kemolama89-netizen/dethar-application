# Adhan audio collection — listening set

Assembled 2026-10-09 for **personal evaluation listening only**. This folder is **not** an app asset folder. Nothing here has been cleared for use in DITHAR. Rights information is recorded per file in `index.csv`. See `docs/adhan-licensing-research.md` for the rights analysis.

## What is here

- **1262 distinct recordings** (3.38 GB). Each one is the best-quality copy found of a distinct audio recording.
- `index.csv` / `index.json`: one row per file. Columns:
  - Identity: performer (English/Arabic), mosque/location, prayer.
  - Technical: duration, format, bitrate, sample rate, SHA-1.
  - Provenance: source, source page, direct download URL.
  - Rights: rights information as found.
  - Review aids: how the file was identified, label conflicts, and every duplicate copy found elsewhere.
- `links-only.csv`: relevant adhan recordings that were **not downloaded**, with their listening links and the reason. Reasons include YouTube (no permitted download), Haram-series items beyond the representative sample, adhan-plus-full-prayer videos, and blocked or failed downloads.
- `excluded-out-of-scope.csv`: adhans found in the same sources but recorded outside Egypt, the Gulf and the two Holy Mosques (Turkey, Maghreb, Levant, Al-Aqsa, South-East Asia…). Listed only, not downloaded into this folder.

## Folders

| Folder | Contents |
|---|---|
| `1-egypt/<voice>/` | Requested classic Egyptian voices. `_other-egypt/` holds other Egyptian muadhins and Cairo recordings |
| `2-gulf/<voice>/` | Requested Gulf voices (Ali Ahmed Mulla is filed under `3-masjid-al-haram-makkah/`). `_other-gulf/` holds other Gulf muadhins and Kuwait/Qatar/UAE/Oman/Saudi recordings |
| `3-masjid-al-haram-makkah/<muadhin>/` | Makkah Haram adhans by muadhin. `_name-in-filename-or-unnamed/` holds the rest |
| `4-masjid-an-nabawi-madinah/<muadhin>/` | Prophet's Mosque adhans by muadhin |
| `5-haram-mosque-unconfirmed/` | Haram-series items whose mosque could not be determined |
| `6-unidentified-region/` | Adhans from in-scope sources whose performer or region could not be identified from labels. Listen and keep or delete |

## How it was built

1. Sources searched:
   - Kiwifu/adhan-mp3 at commit `b9180a2`
   - aladhan.com Download Adhans
   - alfurqan.online / assabile media URLs
   - nandxorandor/Athan (IslamWeb files)
   - 518 GitHub repositories with adhan audio
   - Internet Archive: 459 adhan items, plus the 1,879-item alfirdwsiy2018 Haram/Nabawi series (representative sample of up to 2 per muadhin per mosque, with Fajr preferred)
   - Wikimedia Commons
2. Each file was decoded and **deduplicated**:
   - identical decoded audio (PCM MD5) = the same file;
   - Chromaprint fingerprint match = the same recording re-encoded or trimmed.

   The best-quality copy was kept. The other copies are listed in `duplicate_sources`. Different performances by the same muadhin are kept separately.
3. Video sources (IA series, Commons) are stored as the **audio track extracted without re-encoding** (`.m4a`/`.ogg`/`.opus`).
4. Performer identification comes from **labels only**: filenames, titles, ID3 tags and source inventories. Nothing was identified by ear. Labels across the web are often wrong or copied, and `label_conflict` shows where sources disagree. Check by listening.

## Caveats

- **Rights:** nearly every file is unlicensed or of unverified provenance (broadcast captures, re-uploads, non-commercial IslamWeb material). Inclusion here says nothing about reuse rights.
- **Content:** files were selected as adhan by title. Files flagged `long` may contain dua, iqama or prayer audio. Files flagged `short` may be partial.
- **Disk:** keep this folder out of git (see the `.gitignore` suggestion in the final report).

## Update 2026-10-09: targeted search

Added 5 recordings under `1-egypt/`: Mahmoud Mohamed Ramadan, Mohamed Omran (×2, one Fajr), Mohamed Mahmoud Al-Tablawi and Ali Mahmoud. No downloadable adhan by El-Sayed Warda was found on GitHub or the Internet Archive. YouTube listening links for all five voices are in `links-only.csv` under category `youtube-targeted`.
