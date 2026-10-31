# Interface sounds

## `page-turn.m4a` — the Qur'an reader's page-turn sound

A real recording of a paper page being turned (not synthesised), trimmed to
the leaf's flip and landing so it matches the reader's page-turn animation
(components/QuranReaderScreen.tsx; played by src/lib/pageTurnSound.ts).

| | |
|---|---|
| Recording | "turning a page" by **planish**, recorded 2007-07-05 |
| Original source | PDSounds.org — http://www.pdsounds.org/sounds/turning_a_page (download: http://www.pdsounds.org/audio/download/304/page_turn.mp3) |
| Copy used | Wikimedia Commons, [File:Turning a page.ogg](https://commons.wikimedia.org/wiki/File:Turning_a_page.ogg) (transferred from PDSounds by Fæ), downloaded 2026-10-20, SHA-1 `874fe04a60cd6eb9f4e187694819e9704863e1d4` (as Commons records it) |
| Licence | **Public domain** (PDSounds publishes only public-domain recordings; Commons: "Public domain", attribution not required). Credited here anyway. |
| Modified | Yes: cut to 1.78–2.58 s of the 3.37 s recording (the flip and the landing), a 120 Hz high-pass (handling rumble), a 40 ms fade-in and a 250 ms fade-out, peak-normalised to −3 dBFS, mono AAC 96 kb/s, 0.80 s. No pitch or time change. |

Recreate it from the Commons file:

```
ffmpeg -i "Turning_a_page.ogg" -ac 1 -ar 44100 turn.wav
ffmpeg -ss 1.78 -t 0.80 -i turn.wav -af "highpass=f=120,afade=t=in:st=0:d=0.04,afade=t=out:st=0.55:d=0.25,volume=12.8dB" -ac 1 -ar 44100 clip.wav
ffmpeg -i clip.wav -c:a aac -b:a 96k -ac 1 page-turn.m4a
```
