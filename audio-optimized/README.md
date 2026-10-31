# Optional optimized audio (opt-in, not the default)

Smaller playback copies of some of DITHAR's recordings, for an optional
smaller Android build. **The originals in `public/audio/` are untouched and
remain what every normal build plays.**

| | |
|---|---|
| Copies | 20 recordings: 18 Adhan, 2 spoken adhkar (`src/data/audioOptimized.json` lists them) |
| Format | Ogg Opus, 48 kHz, saved as `.ogg` (Android stores `.ogg` uncompressed in the APK, which `assets.openFd` needs; Android 5+ MediaPlayer and Chrome/WebView play it) |
| Settings | real stereo: `libopus 128 kb/s VBR, compression 10, application audio`; mono content (mono files, or stereo whose channels are identical — side channel below −40 dB): the same at `72 kb/s`, mono |
| Saving | 96.8 MB → 48.1 MB of audio (−48.7 MB) |
| Made by | `python3 -P scripts/audio/optimize-audio.py` (all measurements in `report.json`) |

## Why only these 20

The originals are already lossy (mostly MP3), so re-encoding adds a second
generation of coding loss. A copy was only considered where the original
clearly carries more bitrate than its content needs — high-bitrate stereo
(192–320 kb/s) or mono content stored as stereo / at a high bitrate — and
only kept if it is at most 70 % of the original's size. That leaves the Quran
recitations (≈128 kb/s, would barely shrink), the reminder and UI sounds, and
anything no code references as they are.

Of 59 candidates, 20 passed every check below and are listed; 39 (spoken
adhkar at 72 kb/s) did not pass the noise-to-mask check, so they keep their
originals and no copy of them is kept.

## Checks each listed copy passed

Against its original, both decoded by FFmpeg at 48 kHz (`report.json`):
- aligned to the sample (0-sample offset) — every Adhan segment timestamp in
  `src/data/adhanRecordings.ts` applies unchanged;
- same length (0 ms difference);
- bandwidth kept; loudness-weighted spectral difference 0.23–0.94 dB;
- approximate noise-to-mask ratio −2.0 to −10.1 dB on average (Adhan −3.7 to −10.1).

In Chromium (the WebView's engine), against how it decodes the original:
0-sample offset, same duration (two copies run 26 ms longer at the very end:
Chromium trims those MP3 originals' end padding), metadata ready in 5–21 ms
(no start-up delay), an `<audio>` seek to each Adhan's segment start lands
exactly and plays on.

**Not done:** a listening test (not possible in the environment these were
made in) and playback on an Android device (the emulator would not boot).
These objective numbers are proxies, not a listening verdict — so the copies
are **not** the default. `listening-test.html` is a blind A/B page for that test.

## Using it, and rolling back

```
npm run build:android:optimized      # web build playing the copies, copies swapped into dist/, cap sync
cd android && ./gradlew clean assembleDebug
```

`scripts/audio/apply-optimized-audio.mjs` changes only `dist/` and refuses to
run unless every copy matches the SHA-256 it was verified with. Rolling back
is the normal build: `npm run build && npx cap sync android` — the app then
plays the originals again (nothing else refers to the copies). Measure APK
sizes from a **clean** Gradle build: incremental packaging keeps removed
files' bytes in the APK as unused space.

## Downloading audio on demand instead (analysis, not implemented)

Of ≈ 175 MB of audio, the Adhan recordings are ≈ 145 MB, yet only the voices
a user picks are ever played — the defaults are two (`alafasy-kuwait`,
`alafasy-fajr-hijaz`, ≈ 9 MB). Keeping those (and the Audio Adhkar, Quran
ayah files and sounds the schedules play offline) in the APK and downloading
other Adhan voices when chosen would save ≈ 130 MB. It needs: a host for the
files (the web build already serves `public/audio` on GitHub Pages, but using
it as a download source is a product decision), `@capacitor/filesystem` (not
installed), download/verify/resume logic, native playback from app storage
(native plays from APK assets today), and the rule that a prayer only uses a
voice already on the device, so an Adhan never depends on the network. Google
Play's Asset Delivery (asset packs in an App Bundle) is the platform route
for the same split.
