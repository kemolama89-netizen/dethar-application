# DITHAR — improvements of 2026-10-14

Ten improvements, built on the existing architecture: the web app (React) stays the source
of truth for settings (`localStorage`) and pushes plans to native Kotlin plugins, which own
timing, notifications, playback and the widget while the app is closed. Nothing was
committed. **None of this has been observed on a physical phone yet** — see the device
checklist at the end.

## 1. Resuming interrupted Morning/Evening Adhkar

- **Before:** a session stopped by an adhan continued **automatically** after the 30-minute
  pause.
- **Now:** the service saves exactly where it stopped. That means the next dhikr and its
  repetition, and inside an unfinished repetition the file part, the position and the
  random-rotation reciter. When the pause ends, **one** notification appears with a
  **Resume Adhkar** action. Nothing plays until the user taps it, or taps the matching
  banner on the Audio Adhkar screen.
- **When the notification goes away:** it is removed when the session is completed,
  resumed, replaced by a new session of the same section, or when the section or the master
  switch is turned off. It also expires on its own at the session's prayer-time window end.
- **What still restarts on its own (unchanged, deliberately):**
  - a scheduled **start** that fell inside an adhan window;
  - a session Android killed, or one cut by a reboot.

  Neither is an interruption by prayer.
- **Files:**
  - `AudioAdhkarLogic.kt`: `SavedProgress`, `ResumePrompt`, `PlaybackCursor.resumePoint`.
  - `AudioAdhkarPlaybackService.kt`: `ACTION_RESUME_SAVED`.
  - `AudioAdhkarResumePromptReceiver.kt`.
  - `AudioAdhkarScheduler.kt`: the `PROMPT` alarm.
  - `ResumeAdhkarBanner.tsx`.
- **Note:** Morning's window (Fajr + 30 min → Dhuhr − 30 min) contains no adhan, so in
  practice only Evening (Maghrib, Isha) or unplanned legacy sessions can be interrupted.

## 2. Microphone-like icon removed

- The written Misc card's **Listen** button (a speaker icon read as a microphone) and its
  space are removed. It used `speechSynthesis`, a silent no-op in Android's WebView.
- `useMiscSpeech.ts` was deleted. Voice Tasbeeh's microphone is untouched.

## 3. English names in Audio Adhkar settings

- The selection checklists show English names in English mode:
  - Morning/Evening: `title_en`.
  - Various: transliteration plus meaning.
- Selections stay saved by stable id (`audioAdhkarOptionLabels.ts`).
- Native notification text (the 1-minute reminder and the resume prompt) now follows the
  interface language.

## 4. Daily Picks

- `lib/dailyPicks.ts` picks three existing written duas per local day. The pool excludes
  situational duas such as eating, travel and in-prayer phrases.
- A fixed seeded order spreads the categories evenly. Consecutive days never share an item.
- The day's ids are saved, so the selection is stable for the whole day, even across an app
  update.

## 5. Reminders, widget and backgrounds

**Content.** Only shipped, reviewed content is used (`lib/reminderContent.ts`):
- the written library's general duas;
- the curated Hadiths, all graded sahih or hasan, except the one marked as disputed;
- Tasbeeh dhikr virtues that carry citations.

**Settings** (Settings → التذكيرات والودجت):
- Reminders are off by default.
- Notifications can be turned off separately, and the widget keeps rotating.
- Each content kind can be turned on or off (at least one stays on).
- Interval: 1–6 hours. A minimum of 1 hour is enforced natively too.
- A permitted daily period, plus the weekly schedule's floor.
- No reminders during adhan pauses.
- A preview list.

**Repetition control:**
- Categories take turns.
- The last 30 items are not repeated.
- One fixed notification id, so reminders never stack.
- A timeout before the next reminder.

**Home-screen widget (new).** `DhikrWidgetProvider`, 4×2 and resizable:
- Shows the current reminder over the chosen background, behind a readability scrim.
- Tapping it opens the app, on the full-screen reflection when that is on.
- `updatePeriodMillis=0`: it never wakes the phone. It is redrawn on a reminder, on a
  settings change, and at time-of-day changes by a non-waking alarm.
- Settings explain clearly that the widget is separate from notifications. "Add widget"
  uses `requestPinAppWidget` where the launcher supports it.

**Backgrounds.** 20 procedurally painted images (CC0, `public/backgrounds/README.md`):
- 16 automatic: dawn, day, sunset and night × four seasons.
- 4 Islamic-inspired.
- Automatic mode uses the season only when the location is real (not the Kuwait fallback)
  and outside the tropics, with the hemisphere taken into account.
- The user can also pick a fixed background, or their own photo.
- A photo is cropped and repositioned in-app (`BackgroundCropper`) and stored as a
  720×1280 JPEG. On Android it is also written to private storage for the widget.

## 6. Full-screen spiritual experience

- `SpiritualReminderView`: a full-bleed background with the Arabic text directly on it,
  then:
  - the meaning, in English mode;
  - the source;
  - verified evidence under «من القرآن الكريم» / «من السنة». It is read from shipped data:
    Tasbeeh virtues and Wamdat verse text, never typed in.
  - DITHAR's reflection under «تأمّل», marked as an educational reflection and not a
    narrated text.
- It shows for 30 seconds, and the timer can be paused. A Next button moves to another
  item.
- Reflections are written for:
  - Alhamdulillah
  - SubhanAllah
  - Astaghfirullah
  - Allahu Akbar
  - Salawat
  - Tahlil
  - Hawqala
  - Dua

  Each has a matched background. Hadiths use the library's own labelled «ومضة دِثار».
- **Android restriction (deliberate):** the experience opens when the user taps a reminder
  or the widget, or from the preview. It is **not** launched over the lock screen or from
  the background:
  - Android 10+ blocks background activity starts.
  - `USE_FULL_SCREEN_INTENT` is restricted on Android 14+ (Play policy) to calling and alarm
    apps.

  No such permission was added.

## 7. End-of-day summary

- Settings → ملخص نهاية اليوم:
  - on/off (off by default);
  - a delivery time;
  - content: statistics, encouragement or both.
- **What it counts:** only what the user recorded, via `stats.getDailyActivity`: written
  repetitions, completed wirds, and Tasbeeh (manual, voice and Floating). **Audio playback
  is never counted.**
- JS pushes a snapshot natively (launch, resume, leaving the app, 2 s after a recording).
  Native adds Floating Tasbeeh taps still queued for today.
- A missing or stale snapshot reads as "nothing recorded", phrased gently and never as
  blame.
- **Comparisons appear only with enough history:** a recorded yesterday, or ≥ 4 tracked
  days in the past week. Logic: `DailySummary` in `ReminderLogic.kt`.

## 8. Calm reminder sounds

- The existing one-minute reminder now plays a natural sound:
  - Morning: birdsong (default) or a stream.
  - Evening: crickets with a breeze (default) or waves.
  - Or off.
- Users can choose and preview per section.
- Each sound has its own notification channel, because Android fixes a channel's sound.
  So the phone's notification volume, Do Not Disturb and channel settings apply.
- "One per session" is guaranteed by the existing `shouldWarn` check, a fixed notification
  id and `setOnlyAlertOnce`.
- **The sounds are synthesized** by `scripts/generate-reminder-sounds.py` (CC0, original),
  not recordings. Listen to them on a phone, and swap in licensed recordings if preferred.

## 9. Fridays and Islamic occasions for the recurring Misc dhikr

- On these days a Misc tick plays only the day's dhikr. The window and interval are
  unchanged, and the normal rotation continues from where it left off afterwards.

  | Day | What plays | Evidence |
  |---|---|---|
  | **Friday** | Salawat only (`tasbeeh-9`) | Abu Dawud 1047 |
  | Arafah | The tahlil formula (`tasbeeh-6`) | al-Tirmidhi 3585 |
  | Eid and tashreeq | Takbir dhikr | Qur'an 2:185, 2:203; Muslim 1141 |
  | 1–8 Dhul-Hijjah | Tahlil, takbir and tahmid | al-Bukhari 969 + mu'allaq; Qur'an 22:28 |

- **Ramadan is intentionally unchanged:** no recorded dhikr specific to its days has
  reliable evidence.
- **Friday:**
  - It wins over every other occasion.
  - It is computed natively from the device's weekday, so it never runs out.
- **Hijri occasions:**
  - They come from Intl's Umm al-Qura calendar, pushed as 30 days of local-day windows.
  - A user **Hijri adjustment** (−2…+2) handles regional sighting. It also applies to the
    Home date strip, so both agree.
  - With no Umm al-Qura calendar on the device, only Friday applies.
- Morning and Evening are never changed.

## 10. Weekly schedule

- Settings → الجدول الأسبوعي: one start time per weekday, Sunday → Saturday.
- **It is a floor:** nothing recurring starts before that day's time. On each day the later
  of the section's own start and the day's time applies. This covers:
  - the Misc dhikr;
  - reminders and widget reminders.
- Morning and Evening get optional **per-day start times** on their own pages, still inside
  their prayer-time windows.
- Prayer times and the adhan are never affected.
- Native recomputes each day from the device's local calendar, so date changes, time-zone
  changes and DST need no resync. Settings changes resync at once, and reboots or time
  changes re-arm from storage.

## Permissions and battery

- **No new permission was requested.** The widget, the alarms and the notifications use the
  existing permissions: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` (optional) and
  `RECEIVE_BOOT_COMPLETED`.
- **Reminders** use inexact, idle-allowed alarms. With notifications off they don't wake the
  phone at all.
- **The widget** never wakes the phone, and its background bitmaps are subsampled to
  ≤ 540 px wide.
- **The summary** is exact only when "Alarms & reminders" is granted.

## Web build

These are Android-only:
- the reminder notifications;
- the widget;
- the summary notification;
- the reminder sounds as notifications;
- the resume prompt.

On the web build, the pages still save settings, preview sounds, preview the full-screen
experience and show today's summary. They say plainly that the rest needs the Android app.

## Device test checklist (not yet done)

1. **Evening interrupted by Maghrib.** Playback stops. After 30 minutes, exactly one "Resume
   Adhkar" notification appears. Tapping it continues mid-dhikr at the same repetition and
   position, with the same reciter in random mode. Check that the notification disappears
   on completion and when the next day's session starts.
2. **Pause/resume notices.** Misc pause and resume notices are unchanged. Floating Tasbeeh,
   prayer notifications and the adhan are unaffected.
3. **Reminder sounds.**
   - The one-minute reminder plays the chosen sound once.
   - It is silent with "off".
   - It follows the notification volume and DND.
   - Changing the sound takes effect at the next reminder.
4. **Friday.** Misc plays only Salawat, then the normal rotation returns on Saturday. Repeat
   with a Hijri adjustment on a Dhul-Hijjah day.
5. **Weekly schedule.**
   - Misc and reminders don't start before each day's time.
   - Per-day Morning times move only that day.
   - Check after a reboot and after a time-zone change.
6. **Widget.**
   - Add it from the launcher and with "Add widget".
   - Content rotates with reminders, including with notifications off.
   - The background changes at dawn, day, sunset and night.
   - A custom photo shows and survives a restart.
   - Tapping opens the full-screen view.
7. **End-of-day summary.**
   - It arrives once, at the set time.
   - The numbers match Statistics, with audio excluded.
   - On a day with no activity, the gentle message appears.
8. **Battery.** Check over a full day with reminders every hour, using Android's battery
   usage screen.

## Re-generating assets

```
python3 scripts/generate-reminder-sounds.py   # res/raw/*.ogg + public/audio/reminders/*.mp3
python3 scripts/generate-backgrounds.py       # public/backgrounds/*.jpg
npm run build && npx cap copy android         # bundle into the APK
```
