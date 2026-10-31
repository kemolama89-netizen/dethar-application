# Audio assets: APK size audit (2026-10-16)

This is a read-only audit. Nothing was deleted, moved, re-encoded or synced.
The full per-file inventory is in `docs/audio-asset-inventory-2026-10-16.csv`:
301 rows, one per distinct file. Each row gives the format, codec, duration,
bitrate, size, SHA-256, whether the app references the file and what uses
it, whether it is in `dist/`, the Android assets and the APK, and any
identical copies elsewhere.

## How audio gets into the APK

```
public/audio/**  ──vite build──▶  dist/audio/**  ──copy (cap sync / manual)──▶  android/app/src/main/assets/public/audio/**  ──gradle──▶  APK assets/public/audio/**
android/app/src/main/res/raw/*.ogg  ──gradle──▶  APK res/raw/*.ogg
```

- **The source of truth is `public/audio/` and `res/raw/`.** `dist/`, the
  Android assets folder and `android/app/build/` are generated copies.
  Editing them alone changes nothing lasting, because the next build
  restores them from `public/`.
- **What never ships:** `ASSETS/`, `docs/` and `debug-logs/` are never
  copied. Capacitor's `webDir` is `dist`, and Vite copies only `public/`.
- **Size today:** the APK (debug, 2026-10-16) is **174.9 MB**. Audio is
  **167.2 MB (96%)** in 253 files, stored uncompressed, which is normal for
  MP3. Of that, the adhan is **139.9 MB** (38 files). Next are Adhkar 6.6
  MB, Qur'an 18.8 MB (10 reciters × 16–17 files), Tasbeeh 1.5 MB, reminder
  tones 0.3 MB, plus 0.2 MB of `res/raw` tones.

## What uses which audio

| Feature | Where the paths come from | Files |
|---|---|---|
| Adhan, all prayers (in-app and Android background service via `startAdhan`) | `src/data/adhanRecordings.ts` → `path` (the playback copy in `converted/` or `optimized/` where one exists) | 37 recordings: 16 regular, 11 Fajr (with «الصلاة خير من النوم»), 1 Fajr excerpt |
| Fajr adhan / Fajr phrase only | the same list, `kind` = `fajr` or `fajr-excerpt`, `segments.fajrPhrase` | the 12 Fajr files above |
| Morning/Evening audio Adhkar (in-app and background) | `src/lib/morningEveningAudio.ts` `getMorningEveningAudioAssets()` → `audio/adhkar/{morning,evening,shared}/` | 25 |
| Qur'anic Adhkar | `src/data/quranAudioBundle.ts` (ayahs from the Adhkar's `quranRef`) × `QURAN_RECITERS` → `audio/quran/{reciter}/{SSSAAA}.mp3` and `basmala.mp3` | 169 |
| Various (Tasbeeh) audio Adhkar | `src/data/audio-adhkar.ts` `AUDIO_VARIOUS_RECORDINGS` | 15 |
| Reminder tones (Adhkar warning notifications) | Android: `res/raw/adhkar_reminder_*.ogg` (`AudioAdhkarWarningReceiver.rawName`), used for the notification channel and the preview. Web: `audio/reminders/*.mp3`, browser preview only | 4 + 4 |
| Voice Tasbeeh | **none**: its tones come from Android's speech recognizer | 0 |
| Widgets, prayer notifications, daily summary | **none**: no bundled audio (the adhan comes from the adhan list above) | 0 |

Every path the app can play exists, so no reference is missing. The native
service only plays paths the web app sends it, plus the `res/raw` tones;
there are no hard-coded audio names in Kotlin.

## Git history and the earlier cleanup

- **Earlier cleanup:** `HEAD` has 58 adhan files (225.5 MB). The working
  tree has 38 (139.9 MB), because 21 originals were deleted in an earlier,
  uncommitted cleanup. Their `optimized/` or `converted/` copies hold the
  same audio frames, as recorded in `src/data/adhanRecordings.test.ts`
  ("originals whose optimized/converted copy is identical were removed").
  Those deletions show as `D` in `git status`. **They were not restored.**
  A `git checkout`/`restore` of `public/audio/adhan` would bring back about
  85 MB.
- **Kept on purpose last time:** `taha alfashni.mp3` was kept "because its
  optimized copy is lower quality". **This audit found that isn't so.** Its
  audio stream is bit-identical to `optimized/taha alfashni.mp3`: the same
  MD5 both as a raw stream copy and fully decoded. The only difference is a
  0.69 MB embedded cover image (an mjpeg "video" stream). The original's
  listed 58 kbps against 32 kbps comes from that image counting in the
  file's average bitrate.
- **Commits that touched audio:** `c4d1e8b`, `e20b8dd`, `37d4460`, `2339eff`,
  `e8e4c69`, `504c90d`, `62752e9`, `4e2cc64`. None of them removed a file
  the app still references.

## Findings

### 1. Required and in use: 250 bundled files + 4 `res/raw` tones (165.4 MB)

- **Adhan, 36 files:** everything in `public/audio/adhan/` except the one
  duplicate below. The `converted/` and `optimized/` copies **are** the
  files that play; there are no other originals left to remove.
- **Qur'an:** all 169 files.
- **Basmala files:** `quran/banna-murattal/basmala.mp3` and
  `quran/mustafaismail-mujawwad/basmala.mp3` are **required**. A plain
  search makes them look unused, but `src/lib/quranAudio.ts` plays them
  before Ayat al-Kursi for these two `in-first-ayah` reciters.
- **Adhkar and Tasbeeh:** all 25 Adhkar and 15 Tasbeeh files.
- **Notification tones:** all 4 `res/raw/*.ogg` files.

### 2. Duplicated copies in generated or build folders (no effect on APK size)

| Path | Size | Notes |
|---|---|---|
| `dist/audio/` | 173 MB (folder) | Rebuilt by every `npm run build` |
| `android/app/src/main/assets/public/audio/` | 167 MB | Git-ignored. The copy the APK is built from. **Must stay populated before a build.** |
| `android/app/build/` (all intermediates) | 1.1 GB | Rebuilt by Gradle. Includes `intermediates/assets/release/mergeReleaseAssets`: 172 MB, a stale copy from 2026-10-10 with 248 audio files |

Clearing these only frees disk space. The APK stays the same, because the
build recreates them.

### 3. Unreferenced files that appear safe to remove: 1.79 MB

| Path | Size | Duration | SHA-256 (first 12) | Why it's safe |
|---|---|---|---|---|
| `public/audio/adhan/taha alfashni.mp3` | 1,613,105 B | 222.4 s | `15a3aa27b8b3` | Unreferenced. Its audio is bit-identical to `optimized/taha alfashni.mp3`, which plays (id `taha-fashni`). |
| `public/audio/audio-azkar/ياحي ياقيوم.mp3` | 173,382 B | 9.8 s | `1a751b224412` | Unreferenced ("matches no dhikr… not used", `audio-adhkar.ts`). Byte-identical to `public/audio/adhkar/shared/morning_014.mp3`, which plays, and to the source in `ASSETS/audio/adhkar/`. |

Each is also copied into `dist/` and the Android assets, which are removed
automatically on the next build and sync.

### 4. Uncertain: needs your confirmation

| Item | Size | Question |
|---|---|---|
| `public/audio/reminders/*.mp3` (4 files) | 0.28 MB | Android plays the `res/raw/*.ogg` copies; these MP3s are only used for previews **in a web browser**. They could stay in `public/` for the web app but be left out of the APK. That needs a build rule (see option B), not a deletion. |
| The 11 adhans above 128 kbps | 33.3 MB possible | Re-encoding is **lossy** and changes files the code describes as "never edited". See option E. |
| `docs/adhan-audio-collection/`, `docs/adhan-audio-evaluation/` (incl. a 74.8 MB `.webm`), `docs/adhan-segment-review/`, `debug-logs/*.mp4` | ~139 MB on disk | Not in the APK. Research and review material: keep or archive, as you prefer. Has no effect on APK size. |
| `ASSETS/audio/adhkar/` (19 files) | 5.7 MB | Not in the APK. These are the named originals behind the renamed playback copies; tests compare against them (`audioAdhkarPlayer.test.ts`). Keep. |

## Cleanup options and estimated APK savings

| Option | What | APK saving | Effect on how the app works |
|---|---|---|---|
| **A** | Delete the 2 unreferenced duplicates (finding 3) from `public/` | **−1.70 MiB (1.79 MB)** | None: their identical copies keep playing |
| **B** | Leave `audio/reminders/*.mp3` out of the APK only, for example by adding `<dir>reminders` to `aaptOptions.ignoreAssetsPattern` in `android/app/build.gradle` (that folder name exists nowhere else in the assets) | **−0.28 MiB (0.29 MB)** | None on Android (it uses `res/raw`); the web app keeps them |
| **C** | Clear the build outputs (`android/app/build/`, `dist/`) | 0 (disk only: about 1.3 GB) | None; rebuilt next time |
| **D** | Archive `docs/` and `debug-logs/` audio outside the repo | 0 (disk and repo only: about 139 MB) | None |
| **E** *(lossy, needs your approval and listening checks)* | Re-encode the 11 adhans above 128 kbps to 128 kbps MP3 (list below) | **≈ −33.3 MB** (−19% of the APK) | Quality: 128 kbps is generally fine for a voice. **Risk:** an MP3 encoder adds a short delay, so every `start`/`end` segment time for those 11 must be re-measured. Conflicts with the "originals never edited" rule. |
| **E′** | The same at 96 kbps for 29 adhans | ≈ −56 MB | More audible loss; the same re-measurement is needed |
| **F** *(design change, not cleanup)* | Ship one or two adhan voices and download the others on demand | up to about −130 MB | Needs network, storage and download code. Also fits the open licensing questions in `docs/adhan-licensing-research.md`. |

Option E: the files, with estimated saving at 128 kbps:

| Saving | Now | File (under `public/audio/adhan/`) |
|---|---|---|
| 6.72 MB | 320 kbps, 11.20 MB | `optimized/Abdul Basit Abdul Samad - Fajr - Abdulbasit_Abdusamad_6_-_Fajr_Egypt_(…) [gh].mp3` |
| 5.69 MB | 320 kbps, 9.48 MB | `optimized/Abdul Basit Abdul Samad - Abdulbasit_Abdusamad_1_-_Egypt_(…) [ia].mp3` |
| 3.76 MB | 256 kbps, 7.52 MB | `Mishary Rashid Alafasy -  azan-saba-2-2014-al-fajr [gh].mp3` |
| 2.88 MB | 256 kbps, 5.77 MB | `Mohamed Siddiq El-Minshawi - menshawi_rast [gh].mp3` |
| 2.83 MB | 256 kbps, 5.66 MB | `optimized/Mohamed Omran - Azan Mohamed Imran 256kbps [ia].mp3` |
| 2.73 MB | 225 kbps, 6.31 MB | `optimized/Mahmoud Mohamed Ramadan - adhan 1397 AH [gh].mp3` |
| 2.47 MB | 256 kbps, 4.95 MB | `Mishary Rashid Alafasy - Fajr - azan-kurd-low-2010-alfajr [gh].mp3` |
| 1.79 MB | 192 kbps, 5.36 MB | `converted/Abu Al-Enein Shuaisha - …_(أبو_العينين_شعيشع_-_القاهرة) [ia].mp3` (already a re-encode of a WMA) |
| 1.77 MB | 192 kbps, 5.31 MB | `Mishary Rashid Alafasy - Mishary_Rashid_Alafasy_2_-_Kuwait_(…) [ia].mp3` |
| 1.47 MB | 224 kbps, 3.42 MB | `optimized/Mahmoud Khalil Al-Husary - …_Cairo_(…) [ia].mp3` |
| 1.20 MB | 204 kbps, 3.20 MB | `Nasser Al-Qatami - Nasser_Al_Qatami_-_HQ_(ناصر_القطامي) [aladha].mp3` |

Things checked and found to save nothing:
- **Stripping tags or cover art without re-encoding:** only `taha alfashni.mp3`
  still has any (option A covers it).
- **Qur'an above 128 kbps:** re-encoding to 128 kbps saves only about 1.8 MB.

## Proposed plan (not carried out; waiting for your approval)

1. **Option A** (−1.70 MiB). Delete exactly:
   - `public/audio/adhan/taha alfashni.mp3`
   - `public/audio/audio-azkar/ياحي ياقيوم.mp3`

   Then update the tests and data that record them:
   - `src/data/adhanRecordings.test.ts`: `originals` 18 → 17, and the comment
   - `src/data/audio-adhkar.test.ts`: the "leaves the unmatched file unused" test
   - `src/data/audio-adhkar.ts`: the comment on line 51
   - `src/data/audioDurations.json`: the `audio/audio-azkar/ياحي ياقيوم.mp3` entry

   Rebuild, then update the Android assets with an **additive** copy (no
   mirror or delete step), and remove only those two paths from
   `android/app/src/main/assets/public/audio/`.
2. **Option B** (−0.28 MiB), if you agree the APK doesn't need the web-only
   preview MP3s: a build rule that leaves `assets/public/audio/reminders/`
   out of the APK.
3. **Option E** (≈ −33 MB): only if you decide the quality trade-off is
   acceptable. Re-encode into `optimized/`, keeping the current files as the
   source, then re-measure segment starts and ends with the existing method,
   run the adhan tests, and listen to each takbeer and Fajr phrase.
4. **Options C and D:** whenever disk space matters; the APK is unaffected.

**Must stay for the app to work:** everything in finding 1, meaning all of
`public/audio/{adhan,adhkar,quran,audio-azkar}` except the 2 files in option
A, and `android/app/src/main/res/raw/*.ogg`. The Android assets folder must
be filled from `dist/` before every Gradle build; that copy is automatic
with `cap sync`, or manual as was done on 2026-10-16.
