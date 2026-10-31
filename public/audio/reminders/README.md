# Reminder sounds — provenance and licence

These calm Morning/Evening Adhkar reminder sounds are **synthesized from scratch** by
`scripts/generate-reminder-sounds.py` (sine tones, filtered noise and envelopes, fixed
random seeds). No recording, sample library or third-party asset was used, so they are
original work for DITHAR, dedicated to the public domain under
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), and may be distributed
with the app without restriction.

| id | used for | character |
|---|---|---|
| `birdsong` | Morning (default) | soft dawn air with a few songbird phrases |
| `stream` | Morning | a gentle brook with light water bubbles |
| `crickets` | Evening (default) | crickets over a faint breeze |
| `waves` | Evening | slow sea swells on a quiet shore |

Copies: `public/audio/reminders/<id>.mp3` (in-app preview on the web) and
`android/app/src/main/res/raw/adhkar_reminder_<id>.ogg` (Android notification-channel
sounds). Re-running the script reproduces both.

They are synthesized approximations of natural sounds, not field recordings: listen to
them on a phone before release, and replace any with a properly licensed recording if
preferred (keep the same file names, or add a new id in `src/lib/adhkarReminderSounds.ts`
and `ReminderSounds` in `AudioAdhkarWarningReceiver.kt`).
