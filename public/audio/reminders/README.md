# Reminder sounds — provenance and licence

These calm Morning/Evening Adhkar reminder sounds, apart from `river`, are **synthesized from scratch** by
`scripts/generate-reminder-sounds.py` (sine tones, filtered noise and envelopes, fixed
random seeds). No recording, sample library or third-party asset was used, so they are
original work for DITHAR, dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), and may be distributed
with the app without restriction.

| id | used for | character |
|---|---|---|
| `birdsong` | Morning (default) | soft dawn air with a few songbird phrases |
| `stream` | Morning | a gentle brook with light water bubbles |
| `river` | Evening (default) | a real recording of a small river over a stony bed, 6 s |
| `waves` | Evening | slow sea swells on a quiet shore |

Copies: `public/audio/reminders/<id>.mp3` (in-app preview on the web) and
`android/app/src/main/res/raw/adhkar_reminder_<id>.ogg` (Android notification-channel
sounds). Re-running the script reproduces both.

Apart from `river` they are synthesized approximations of natural sounds, not field recordings: listen to
them on a phone before release, and replace any with a properly licensed recording if
preferred (keep the same file names, or add a new id in `src/lib/adhkarReminderSounds.ts`
and `ReminderSounds` in `AudioAdhkarWarningReceiver.kt`).

## `river`: a field recording

A 6-second excerpt of "Shallow small river with stony riverbed" by stephan, public domain:
https://commons.wikimedia.org/wiki/File:Shallow_small_river_with_stony_riverbed.ogg (downloaded
2026-11-01). It starts 11.7 s into the original, reduced to mono, with its volume set (gain 1.01)
and a 1 s fade in and 1.8 s fade out. Nothing else was changed. It is not produced by the script.
