# DITHAR (دِثار) — App Guide

*Prepared 2026-10-13 from the source code on branch `feat/automatic-prayer-profiles`, including uncommitted working-tree changes. No application code was changed to produce this document.*

> **Updated 2026-10-14:** ten improvements changed several behaviours described below — the adhan-interruption resume, the Misc «Listen» button, Daily Picks, reminders and a home-screen widget, the end-of-day summary, reminder sounds, Friday/occasion dhikr and the weekly schedule. The affected lines are corrected here; full details, limitations and the device checklist are in [`IMPROVEMENTS_2026-10-14.md`](IMPROVEMENTS_2026-10-14.md).

---

## How to read the status labels

Every feature carries one of these labels. They describe **evidence**, not intent. The fact that code exists is never treated as proof that a feature works.

| Label | Meaning |
|---|---|
| **📱 Device-verified** | Behaviour observed on a real Android phone. The evidence is either the HONOR ALT-NX1 / Android 15 diagnostics trace from 2026-10-11 (`debug-logs/dithar-audio-diagnostics.txt`) or the owner's explicit statement in the 2026-10-13 session that "background Audio Azkar playback currently works". |
| **✅ Test-verified** | Covered by the passing automated suites (88 JS test files / 1 419 tests, 159 native JVM unit tests). The web behaviour of the volume preview was also exercised in a real Chromium browser. **Not** observed on a phone. |
| **⚠️ Unverified on device** | Implemented, and compiled into the latest debug APK, but never observed on a real phone. |
| **🚧 Incomplete** | Partially built, unreachable, or placeholder. |
| **🐞 Known issue** | A bug or a mismatch between documentation and code, found while writing this guide. |

> **Important:** All six improvements made on 2026-10-13 are implemented and test-verified, but **none has been checked on a phone**:
> - Morning/Evening prayer-time windows
> - Launcher icon
> - 5-minute notification expiry
> - Battery changes
> - Reciter and muezzin names in the player
> - Audio Settings with volume preview

---

## 1. App overview

### Purpose
DITHAR (دِثار, "the garment worn closest to the body") is an Islamic daily-remembrance companion:
- Morning, Evening, Prayer and Miscellaneous **azkar**, both written and audio.
- A digital **Tasbeeh** with optional voice counting.
- Accurate **prayer times** with automatic per-country calculation.
- Prayer-time notifications with an automatic **adhan**.
- **Scheduled background playback** of Audio Azkar.
- A daily **Quranic insight** (لطيفة قرآنية) and a daily **Hadith**.
- Usage **statistics**.

### Target users
Arabic-speaking Muslims first. The Gulf is the reference market: Kuwait is the fallback location, and statistics weeks run Saturday to Friday. English is fully supported. The Android app is the main product. The web build (GitHub Pages) has every reading and counting feature, but no background scheduling, notifications or adhan.

### Branding and identity themes
- **Two identity themes**, switched with the top-bar theme button. The choice is saved.
  - **Men** (الهوية الرجالية): navy and gold.
  - **Women** (الهوية النسائية): sage green and gold.

  Each theme has its own approved logo artwork, and each logo has the wordmark («دِثار» / "DETHAR") built into the image. The logo is chosen by **theme × language**: four PNG files in `public/logos/`.
- **Colour palettes** (Settings → المظهر → الألوان), six per theme:
  - Men: Original, Forest, Navy, Olive, Earth, Charcoal.
  - Women: Original, Mauve, Rose, Lavender, Plum, Sand.

  The palette is saved separately for each theme.
- **Android launcher icon:** only the emblem from the approved men's logo, with no wordmark, on a transparent background (changed 2026-10-13). **⚠️ Unverified on device.**

### Languages
- **Arabic** (default, right-to-left) and **English** (left-to-right).
- The top-bar language button switches the whole interface. The choice is saved.
- Azkar, Quran and Hadith text is always shown in Arabic. English adds meaning, transliteration and translations where the data provides them.
- Notification text follows the interface language, and changing the language re-syncs native notifications.

### Navigation
- **Bottom navigation** on every main screen. In Arabic it reads right to left:
  - الإعدادات (Settings)
  - الأذكار المسموعة (Audio Azkar)
  - الرئيسية (Home)
  - الأذكار المكتوبة (Written Azkar)
  - السبحة (Tasbeeh)
- **Back** follows a navigation stack. It goes to the previous screen, and only exits the app from Home. On Android, Back first closes any open dialog or popover. In the browser, a history entry handles this.
- **Top bar:**
  - Language toggle, on the start edge.
  - Theme toggle, on the end edge.
  - On Home only, an **Exit** button with a confirmation dialog (هل تريد الخروج من التطبيق؟). Exiting waits up to 2 seconds for pending schedule syncs. Scheduled azkar, «استماع» playback and alarms keep running after exit.
- **Screens** (`src/App.tsx`):
  - `home`
  - `tasbeeh`
  - `written` → `written-reader`, `written-search`, `misc-library` → `misc-category`
  - `audio` → `audio-list`
  - `settings`, with its own sub-views

---

## 2. Screen-by-screen guide

### 2.1 Home (الرئيسية)
Shown from top to bottom:

1. **Top bar:** language, Exit, and identity theme.
2. **Logo**, chosen by theme and language, and a **featured quote** under it (Sahih al-Bukhari 6407).
3. **Date strip:** Gregorian date, Hijri date (Umm al-Qura calendar via `Intl`; no manual adjustment), and local time. The time updates once a minute and pauses while the app is in the background.
4. **Quranic insight card (لطيفة قرآنية):** a verse, its surah/ayah reference, the insight, and the tafsir source.
   - "اقرأ المزيد" (Read more) opens a full-screen modal.
   - See §7.
5. **🐞 Developer buttons in the real app:** "Previous Tafsir Flash (preview test)" and "Refresh Tafsir Flash (preview test) — n/522".
   - They are English-only.
   - They are **not** limited to development builds, so real users see them.
6. **Hadith card (حديث نبوي):** the Hadith text.
   - "Show More" / عرض التفاصيل opens a modal with source, Hadith number, grade, grading source and narrator, wherever the data has them.
7. **🐞 The same developer buttons for the Hadith:** "Previous Hadith (preview test)" and "Refresh Hadith (preview test) — n/200".
8. **Prayer Times card:** see §5. It contains:
   - The six times.
   - The location.
   - Two switches:
     - **الأذكار الصوتية التلقائية**: the Audio Azkar master switch.
     - **تذكير الصلاة**: the prayer-notifications master switch.
   - **الصلاة القادمة** (next prayer) with a live countdown in hours, minutes and seconds.
9. **Bottom navigation.**

Dialogs that can appear:
- **Location change prompt** («يبدو أنك غيّرت موقعك»): Update location / Not now. See §5.
- The Read-more modals.

### 2.2 Written Azkar (الأذكار المكتوبة)
- **Category cards:**
  - أذكار الصباح (Morning, 22)
  - أذكار المساء (Evening, 22)
  - أذكار الصلاة (Prayer, 14)
  - أذكار وأدعية متفرقة (Miscellaneous library)
- **Search** (`written-search`): searches across Morning, Evening, Prayer and the 89-item Miscellaneous library. Tapping a result opens the reader or category and scrolls straight to that item.
- **Reader** (`written-reader`): a vertical "journey" of cards, each with a numbered rail node.
  - Each card shows the title, the Arabic text, the source, and the Meaning and Transliteration popups. The popup is draggable.
  - Each card has a **tap ring** with two-step completion:
    - Each tap counts one repetition, up to the written target. A dhikr with no stated count has a target of 1.
    - When the target is reached the ring shows ✓.
    - One more tap confirms the dhikr as completed and scrolls to the next.
    - There is no timer and no automatic completion.
  - **Open-ended dhikr** (`unboundedCount`, e.g. الصلاة الإبراهيمية): taps count without limit, and a separate **Finish** button completes it.
  - **Prayer category:** a prayer selector, because some items (for example the three Quls) repeat a different number of times after different prayers, and some items appear only after certain prayers.
  - **End of the session:** a calm closing message, «تقبّل الله ذكرك» / «أتممت وردك». The session is recorded in Statistics.
  - Progress inside the reader is **not** saved when you leave.
- **Miscellaneous library** (`misc-library` → `misc-category`): 20 categories and 89 duas. Examples:
  - أدعية جامعة
  - الاستغفار والتوبة
  - الحفظ والاستعاذة
  - أدعية القرآن (21)
  - الاستخارة

  Every dua card offers **Copy**, **Share**, **Favourite** (saved), and Meaning and Transliteration. (The speech-synthesis «Listen» button was removed on 2026-10-14.)
  - **Daily Picks (مختارات اليوم):** three general-purpose duas from the library, a new set every local day, stable for the whole day (`lib/dailyPicks.ts`).
  - **🚧 The «صحيح مهجور» category has 0 items.** Its tile shows «قريبًا» (coming soon).

### 2.3 Audio Azkar (الأذكار المسموعة)
- **Category screen:** Morning, Evening and Various (المتنوعة), each with its item count.
- **List screen** (`audio-list`): one card per dhikr, with:
  - The text and source.
  - Meaning and Transliteration.
  - **«عدد مرات الاستماع»**: how many times this dhikr has been heard to the end. Saved.
  - A **player bar**: استماع → إيقاف مؤقت / استئناف. While playing it shows «يُشغَّل الآن» and, for a Quranic recitation, the **reciter's name** (⚠️ added 2026-10-13).
- See §3 for how playback and scheduling work.

### 2.4 Tasbeeh (السبحة)
See §6. In short:
- A dhikr selector across 16 items, a tap ring with calm pacing, an optional target, Reset and Reset All.
- Meaning, virtue and source for the selected dhikr.
- A **Voice Tasbeeh** button (التسبيح الصوتي).

### 2.5 Settings (الإعدادات)
The menu rows, in on-screen order:

| Row | Sub-screen | Section |
|---|---|---|
| الإحصائيات | Statistics | §8 |
| المظهر | Appearance → الألوان (colour palettes) | §1 |
| السبحة العائمة | Floating Tasbeeh | §6 |
| إعدادات الصوت | Audio Settings: volumes and preview | §3.6 |
| تنبيهات الصلاة | Prayer Notifications | §4 / §9 |
| الموقع | Location | §5 |
| إعدادات الأذكار الصوتية | Audio Azkar scheduling | §3 |
| صوت الأذان | Adhan audio | §4 |

🚧 A complete **Quran reciter** screen (`QuranReciterSettingsView`, labels «القارئ», «قارئ محدد / التناوب التلقائي») exists in the code but **is not linked from any menu**. Its saved choice still serves as the default reciter for each Audio Azkar section until the user picks one there.

The former **Reminders (التذكيرات)** row was replaced by Audio Settings on 2026-10-13. It never sent any notification, because no notification plugin is installed. Its stored preference was left untouched.

---

## 3. Azkar: audio, reciters, repetition, volume, scheduling, background

### 3.1 Content and which items have audio
| Category | Items | With audio | Audio source |
|---|---|---|---|
| Morning | 22 | 22 | Generated recordings (`public/audio/adhkar/…`). Quranic items (Ayat al-Kursi, the Quls) use the bundled recitation of the chosen reciter. |
| Evening | 22 | 22 | As for Morning. Where the Morning and Evening wording is identical, both use one shared file. |
| Various (المتنوعة) | 15 | 15 | Recordings from Tasbeeh phrases (ElevenLabs), `public/audio/audio-azkar/tasbeeh_XX.mp3` |

All audio ships inside the APK. Nothing streams from the network.

### 3.2 Reciters
- **10 bundled Quran reciters:**
  - Abdul Basit (murattal)
  - Al-Minshawi
  - Al-Husary
  - Alafasy
  - Al-Sudais
  - Al-Muaiqly
  - Al-Dosari
  - Al-Qatami
  - Al-Banna
  - Mustafa Ismail (mujawwad)
- **Per section (Morning, Evening):** either a specific reciter, or **random rotation**. In random mode each Quranic dhikr gets a random reciter, never the same one twice in a row, and that reciter keeps the whole recitation including its repetitions.
- **Basmala:** each reciter's own basmala plays only on the first repetition. A reciter with no verified basmala recording of his own gets none, never another reciter's.
- **Reciter name in the player** (⚠️ unverified on device):
  - Shown in the in-app player bar, the notification and the phone's media controls, for Quranic recitations only.
  - It updates with each recitation during random rotation.
  - No name is shown for the generated and synthesised recordings, because there is no real reciter to name.

### 3.3 Repetition counts
- Audio follows each dhikr's **written repetition count**. One playback is one repetition. There is a **1.5 s silence** between repetitions and between azkar, but none after the last one.
- A repetition counts only when its audio plays to the end. Each playback can count once at most.
- Completed repetitions feed the per-dhikr «عدد مرات الاستماع» and Statistics → الأذكار المسموعة. Repetitions completed by the background player are collected the next time the app opens or resumes, and each is identified so it is never counted twice.
- **🐞 Open-ended items** (e.g. الصلاة الإبراهيمية):
  - `audioUserRepeat.ts` says the user chooses a count, and that the item "does not play at all" until then.
  - In fact **no screen sets this count**, and the playback code falls back to **1**. These items therefore play once.

### 3.4 In-app listening («استماع»)
- **Android:** playback runs in the native media foreground service. It keeps playing with the screen off and after the app is closed.
- **Web:** HTML audio. Quranic recitations play as one gapless Web Audio stream.
- Only one audio source plays at a time across the whole app.
- Playback started in the app stops when the next adhan's quiet period begins.
- Leaving the list does not stop native playback. Stop it from the notification or with Pause.

### 3.5 Scheduling (Settings → إعدادات الأذكار الصوتية) — Android only

**Master switch** «الأذكار الصوتية التلقائية». It appears in this settings screen and on the Home Prayer Times card.
- Off: nothing is scheduled, a scheduled session that is playing stops, and pending notices are cleared.
- «استماع» and the adhan are never affected.
- Each section's own settings are kept.

**Morning / Evening sections.** Each has:
- An on/off switch.
- A **start time**. It is required; the section reports «لم يُحدَّد وقت البدء» without one.
- A reciter: a specific one, or «تناوب عشوائي بين القرّاء».
- A selection checklist (تحديد الكل / إلغاء تحديد الكل) choosing which azkar play.
- **Prayer-time windows** (⚠️ implemented 2026-10-13, unverified on device):
  - Morning runs from **Fajr + 30 min** to **Dhuhr − 30 min**.
  - Evening runs from **Asr + 30 min** to **midnight** at the location.
- **How a day's session is planned:**
  - The start time is treated as the preferred time.
  - The session is planned only where it can **finish** inside the window. Its length is calculated from the selected azkar, the repetition counts, the measured file lengths (`src/data/audioDurations.json`, 210 files), the silences, and any adhan pause it would have to wait out. In random-rotation mode it uses the longest reciter.
  - If it doesn't fit at the preferred time, it moves to the nearest minute that fits, inside the same window.
  - A day where it cannot fit at all gets no session.
  - Nothing ever starts, or resumes, after the window ends, and nothing carries over to the next day.
  - Plans are made for 30 days ahead. They are recalculated on every launch and resume, on a location change, and when settings change. **If the app is not opened for 30 days, the plans (and the adhan quiet periods) run out.**
- A notification **one minute before** the session starts.
- A session interrupted by an adhan is **saved exactly where it stopped** and is **never resumed automatically**: when the quiet period ends, one «استئناف الأذكار» (Resume Adhkar) notification appears (and a banner on the Audio Adhkar screen); only the user's tap continues it. It expires at the window's end (2026-10-14).
- A session that Android kills, or that is cut by a reboot, continues once from its dhikr through a resume alarm.

**Miscellaneous section:**
- An on/off switch.
- A daily window with start and end times. It may cross midnight.
- An interval: 2, 3, 5, 10 or 60 minutes, or a custom whole number from 1 to 720.
- A selection checklist.
- It plays **one dhikr per tick**, cycling through the selection in order.
- Blocked ticks only delay. It never replays a burst of missed ticks.

**Rules shared by all sections:**
- **Adhan quiet period:** nothing starts from each adhan time for **30 minutes**, and anything playing stops. The adhan times come from the app's own prayer times.
- When Miscellaneous enters a prayer pause it posts «تم إيقاف الأذكار المتنوعة بسبب الصلاة…», and «تم استئناف الأذكار المتنوعة» when it resumes.
- **Morning/Evening take priority:**
  - Miscellaneous pauses **1 minute before** a Morning/Evening session.
  - It resumes **1 minute after** that session actually ends, with the next dhikr only.
- Playback-starting alarms use `setAlarmClock`, which HONOR/Huawei deliver after the app is swiped away. Notification alarms use exact alarms. Without the «المنبّهات والتذكيرات» permission all alarms are inexact.

**The settings screen also shows:**
- The next run time.
- An exact-alarm permission prompt.
- A "notifications off" prompt.
- A **HONOR/Huawei hint** with a button that opens the phone's «تشغيل التطبيقات» (App launch) page.
- A **diagnostics log**: view, share as `.txt`, and clear.

### 3.6 Audio Settings: volume and preview (إعدادات الصوت) — ⚠️ added 2026-10-13
- **Four independent sliders, 0–100 %, step 5:** الأذان, أذكار الصباح, أذكار المساء, الأذكار المتنوعة.
- The level is DITHAR's **own gain**. The phone's media volume is never changed.
- **Saved** in the browser storage and in native storage, so it survives restarts and reboots.
- **Applied to:**
  - Scheduled and background playback.
  - «استماع».
  - The adhan.
  - The in-app adhan preview.
- On Android, a change applies **immediately** to whatever is playing. While the phone ducks audio (for example during a navigation prompt), the chosen level is reduced proportionally.
- **Preview:**
  - Moving a slider plays a short sample at that level:
    - The adhan: the opening takbir of the selected regular adhan.
    - Morning and Evening: one of that section's recordings.
    - Miscellaneous: the first Various recording.
  - Moving the same slider changes only the sample's volume; it never restarts.
  - Switching sliders replaces the sample, so samples never overlap.
  - The sample stops about **1.2 s** after release, after **2.5 s** without movement, at once when the user leaves the screen or the app goes to the background, and at once when real playback starts.
  - The sample **never starts over real playback**, including a native adhan. In that case the slider adjusts the playing audio directly.
- **Status:** ✅ Test-verified, and the web behaviour was exercised in real Chromium. Android preview is ⚠️ unverified.

### 3.7 Background behaviour (Android)
See §9 for services, permissions and limits.
- **📱 Device-verified:**
  - Scheduled Miscellaneous playback on HONOR / Android 15. The trace shows ticks firing on time, playback starting, completing and ending.
  - Background Audio Azkar playback in general, as stated by the owner.
- **⚠️ Unverified:**
  - Morning/Evening window planning.
  - Volume.
  - Reciter metadata.
  - Live volume during playback.

---

## 4. Adhan

### 4.1 Recordings
- **37 reviewed recordings:**
  - 25 regular (Dhuhr, Asr, Maghrib, Isha).
  - 11 Fajr recordings, containing «الصلاة خير من النوم».
  - 1 Fajr excerpt holding that phrase only.
- Every recording is an untouched original file. Some are lossless "optimised" or "converted" copies of the original.
- **Playable segments were measured from the audio itself.** Playback seeks to a segment's start and stops at its end. Leading noise and any dua after the adhan are excluded.
- **Defaults:**
  - Regular: Mishary Alafasy — Kuwait.
  - Fajr: Mishary Alafasy — Fajr (Hijaz).
- **Review notes in the code:**
  - "Ali Mahmoud" is a degraded recording whose classification as regular is unconfirmed.
  - "Taha Al-Fashni" should be checked by ear.

### 4.2 Settings → صوت الأذان
- **Regular adhan** (Dhuhr, Asr, Maghrib, Isha) and **Fajr adhan**, each configured separately.
- **Voice:** choose a recording.
- **Playback mode:**
  - Regular: الأذان كاملًا (full) or التكبير فقط (takbir only).
  - Fajr: those two, plus «الصلاة خير من النوم» فقط (the phrase only).
- **Preview** (استماع / إيقاف): plays the chosen segment in the app, at the Adhan volume.
- **Muezzin rotation** (تنويع المؤذنين):
  - Choose which voices take part. At least one must stay selected.
  - Each adhan uses a random selected voice, never the same one twice in a row.
  - The screen shows «الأذان القادم: …», and the next adhan honours that announcement once.
- **«تشغيل الأذان عند دخول الوقت»** (play the adhan at prayer time), set separately for regular and Fajr.
  - It plays on the **media** stream, at the Adhan volume level. If the phone's media volume is down, the user won't hear it.

### 4.3 Playback rules (native)
- The adhan plays at prayer time **only if** both conditions hold:
  - The prayer-notifications master switch is on.
  - Auto-adhan is on for that section (regular or Fajr).
- It plays only if the alarm arrives **within 3 minutes** of the prayer time. A late alarm (Doze, phone off) never plays a stale adhan.
- It runs in the same media service as the azkar, so **it never overlaps them**:
  - An azkar session that is playing stops.
  - A Morning/Evening session is offered back by a «Resume Adhkar» notification after the 30-minute quiet period (it no longer continues by itself).
  - «استماع» does not continue.
  - While the adhan plays, «استماع» is refused.
- The prayer notification posted with the adhan uses a **silent** channel, so the two sounds never double.
- **Muezzin name** (⚠️ added 2026-10-13, unverified on device): shown in the playback notification and media controls when the recording's source names the muezzin. The four mosque recordings show no name; their recording label is shown instead.

### 4.4 Ways to silence or stop
There is no single "mute" button. These are the controls that exist:
- **Prayer-notifications master switch** (Home Prayer Times card, or Settings → تنبيهات الصلاة). Off stops an adhan that is playing and schedules nothing. The choices are kept.
- **Auto-adhan** on/off, separately for regular and Fajr.
- **Per-prayer** notification switches.
- **Adhan volume** slider; 0 % plays silently.
- The **Stop / Pause** buttons in the playback notification and in the phone's media controls.
- Unplugging headphones pauses playback.
- Phone calls and other audio-focus losses pause playback. A short interruption resumes on its own.

---

## 5. Prayer times

### 5.1 Location (Settings → الموقع)
- **Sources, in order:**
  1. A **manual** city. It stays until the user changes it.
  2. The **device** location (GPS).
  3. The **Kuwait** fallback.
- **Options:**
  - «تحديد موقعي تلقائيًا» (detect automatically). It asks for location permission, and explains what to do if permission was denied or blocked, with an «فتح إعدادات التطبيق» button.
  - «اختيار الموقع يدويًا» (choose manually): search **52 built-in cities** by city or country.
  - «استخدام الموقع التلقائي» (go back to automatic).
- **Change detection:**
  - Only while Home is open, only when the app returns to the foreground, and **never** while a manual city is set.
  - It compares the device's timezone, plus **one** GPS reading taken at that moment if permission is already granted, against the active location.
  - A move of more than 100 km, or a different timezone, shows «يبدو أنك غيّرت موقعك» with **Update / Not now**.
  - Nothing changes without the user's confirmation.

### 5.2 Calculation
- **Fully automatic by country.** There is no method, madhab or minute-adjustment setting.
- **Profiles (`calculationProfiles.ts`):**

  | Countries | Profile |
  |---|---|
  | EG | Egypt |
  | SA | Umm al-Qura (Isha 120 min in Ramadan) |
  | TR | Diyanet |
  | MY | JAKIM |
  | ID | Kemenag |
  | OM | Oman |
  | JO | Jordan |
  | KW | Kuwait |
  | QA | Qatar |
  | AE | UAE |
  | SG, BN | MUIS |
  | PK, IN, BD, AF | Karachi (Hanafi) |
  | IR | Tehran |
  | US, CA | ISNA |
  | GB | Moonsighting |
  | everything else | Muslim World League |

- If the country isn't known, the country of the location's timezone is used.
- Each profile has a documented **evidence level**: "official-documented", "official-tables-derived", "recognized-convention" or "general-fallback". Eleven official reference timetables are regression-tested (Egypt, Saudi Arabia, Turkey, Malaysia, Indonesia, Oman in five cities, Jordan).
- All calculation is **offline** (adhan-js), in the **location's** timezone and calendar day.

### 5.3 Display
- **Times shown:** الفجر، الشروق، الظهر، العصر، المغرب، العشاء. They are formatted as 24-hour HH:MM in the location's time.
- **Next prayer**, with a live countdown. The countdown pauses while the app is in the background and catches up when it returns.
- Sunrise (Shuruq) has no adhan and no notification.

---

## 6. Tasbeeh and voice recognition

### 6.1 Manual Tasbeeh (السبحة)
- **16 phrases.** One is selected at a time and the choice is saved.
- **Calm pacing:** after each count a ring fills, and the next tap is accepted only when the ring is full. The fill time depends on the phrase's word count:

  | Words | Ring fill |
  |---|---|
  | 1–2 | 0.5 s |
  | 3–4 | 0.75 s |
  | 5–9 | 1.75 s |
  | 10 | 3.25 s |
  | 11–14 | 4.25 s |
  | 15+ | 5.75 s |

  One long phrase gets 1 s less. No timer is ever shown.
- **Saved per phrase:** each phrase keeps its own counter.
- **Target** (العدد المستهدف): optional. Reaching it shows «تم الوصول للهدف».
- **Reset** (إعادة) clears the current phrase. **Reset All** (إعادة الكل) clears every phrase, after a confirmation.
- Resetting **never** affects Statistics.

### 6.2 Voice Tasbeeh (التسبيح الصوتي)
- Toggle the button; the user recites, and each **complete** recitation counts one.
- **Recognition engine:**
  - Browser: the Web Speech API.
  - Android: the phone's own `SpeechRecognizer`, through the `VoiceRecognition` plugin. Android's WebView cannot run browser speech recognition.
  - It needs the **RECORD_AUDIO** permission, and routes through a Bluetooth headset microphone when one is connected.
- **Matching:**
  - Arabic text normalisation, fuzzy word comparison, and tolerance for typical recognition errors (for example «و» split from the next word, or a word cut short).
  - Switching to another phrase never restarts the recogniser.
- **Stops automatically** after **60 s** without recitation. A recogniser that goes silent for 15 s is restarted.
- **Status messages:** «بانتظار إذن الميكروفون…», «تم رفض إذن الميكروفون…», «لم يتم العثور على ميكروفون.», «غير مدعوم», «تعذّر بدء التسبيح الصوتي».
- **Status:**
  - ⚠️ Accuracy varies with the device, its speech engine and the network.
  - An earlier real-device validation (`voice-tasbeeh-validation-report.md`) found 12 of 16 phrases counted short. Most of that came from switching phrase mid-recitation, and from long phrases. Matching was improved afterwards, but **the current accuracy has not been re-measured on a phone**.

### 6.3 Floating Tasbeeh (السبحة العائمة) — Android only
- **What it is:** an always-on-top bubble outside the app.
  - Tap: count one.
  - Drag: move the bubble.
  - Long-press: a menu with 4 quick phrases, «ذكر مخصص», and «الإعدادات», which opens DITHAR's Settings.
- **How to turn it on:** Settings → السبحة العائمة → تفعيل. It needs the «الظهور فوق التطبيقات الأخرى» (display over other apps) permission. On the web the screen shows «قريبًا».
- **How counts are saved:** bubble taps are queued natively and merged into the same counters and Statistics when the app opens or resumes. The queue protects against double counting and lost taps.
- **Restart:** the bubble comes back after a reboot if it was enabled.
- **⚠️ Unverified:** the overlay, the drag, the menu position and behaviour on different manufacturers have no automated tests and no recent device evidence.

---

## 7. Quranic insights and Hadiths

| | Quranic insight (لطيفة قرآنية / ومضات) | Hadith (حديث نبوي) |
|---|---|---|
| Source | `src/data/wamdat.ts`, from `DITHAR_Wamdat_524_Bilingual_Source_Aligned.ts`. **522** entries after cleanup: 2 empty entries removed, 9 truncated Arabic insights restored. | `ASSETS/dithar_hadith_library_final.json`: **200** curated Hadiths, imported verbatim. |
| Shown | Verse, its reference, the insight in Arabic or English, and the tafsir source. The English book title comes from a dictionary of 17 classical works; when a title isn't covered, no source is shown. | The text in Arabic or English, plus details: source, number, grade, grading source, narrator. A detail is hidden when it has no English translation. |
| Daily rule | **One per day of this installation.** Day 1 is the local day of the first launch, so every new user starts at entry #1. It advances at local midnight and loops after the last entry. | The same rule, separately. |
| Extras | 🐞 The "preview test" Previous/Refresh buttons (see §2.1). | 🐞 The same. |

Sharing (`share.ts`) exists in the code, but its buttons were removed from the cards, so it is unreachable for now.

---

## 8. Settings and statistics

### 8.1 Statistics (الإحصائيات)
- **Periods:**
  - يومي (daily), أسبوعي (weekly, Saturday to Friday), شهري (monthly), سنوي (yearly).
  - فترة مخصصة: a custom range with from/to dates.
  - منذ البداية: since the first recorded event.
  - There are previous/next arrows for each period.
- **Cards:**

  | Card | What it shows |
  |---|---|
  | أذكار الصباح / أذكار المساء | Days completed |
  | أذكار الصلاة | Sessions completed |
  | السبحة | Total, including Voice Tasbeeh and Floating Tasbeeh |
  | الأذكار المسموعة | Repetitions heard to the end, in the app and in the background |

  Each card expands into a per-dhikr breakdown of repetition counts.
- **Delete statistics history** (حذف سجل الإحصائيات): asks for confirmation. It does not touch the Tasbeeh counters.
- **Storage:** a local event log in localStorage. Nothing is sent to a server. Each event records the device's local date and timezone **at the time it happened**, so a day stays a day even after travel. Damaged entries are repaired, and a backup copy of the original is kept first.

### 8.2 Where preferences are saved
Every user choice persists across restarts in browser localStorage:
- Language, theme and palettes.
- Tasbeeh selection, counters, targets and the "target reached" state.
- Miscellaneous library favourites.
- Location.
- Prayer notifications and adhan choices, including rotation.
- Audio Azkar schedules, selections, reciters, the random-rotation state and the master switch.
- Volumes.
- Per-dhikr "times heard".
- Statistics.
- The installation's first-launch date.

Settings needed while the app is closed are **mirrored** into Android SharedPreferences: schedules, playlists, adhan windows, volumes, adhan voices and prayer entries.

---

## 9. Notifications and Android background services

### 9.1 Notifications
| Notification | Channel / importance | When | Expires |
|---|---|---|---|
| Prayer time «صلاة {prayer} — {time}» | `dithar_prayer_times`, HIGH (heads-up, sound). Silent channel when the adhan plays. | At each enabled prayer, if the alarm arrives within 60 min | **5 min** ⚠️ |
| Azkar 1-minute warning «بعد دقيقة ستبدأ …» | `dithar_audio_adhkar_warning`, DEFAULT | 1 min before Morning/Evening | **5 min** ⚠️ |
| Miscellaneous paused / resumed | `dithar_audio_adhkar_pause`, LOW | At an adhan pause, and at the next dhikr after it | pause end + 1 min, at most **5 min**; "resumed" ≈ 2 min ⚠️ |
| Playback (current dhikr or adhan, Pause/Resume/Stop, media style) | `dithar_audio_adhkar`, LOW, ongoing while playing | During any playback | Never; required by Android while playing |
| Tap-to-start «حان موعد … — اضغط لبدء التشغيل» | `dithar_audio_adhkar` | Only if Android refused to start playback in the background | Until tapped or dismissed |
| Floating Tasbeeh service | its own foreground notification | While the bubble is enabled | Never |

- The **5-minute expiry** (2026-10-13) removes only the notification. Alarms, playback and future schedules are untouched.
- The expiry uses `setTimeoutAfter` and needs Android 8+. On Android 7, notifications stay until dismissed.
- Prayer notifications use a fixed ID per prayer, so a new day's Fajr replaces yesterday's instead of stacking.

### 9.2 Services and receivers (`AndroidManifest.xml`)
- **`AudioAdhkarPlaybackService`:** a media-playback foreground service with a MediaSession.
  - Plays every azkar session, «استماع» and the adhan.
  - Holds a partial wake lock while playing (released when paused; 3-hour cap).
  - Handles audio focus and pauses when headphones are unplugged.
  - Is restarted by Android (`START_STICKY`) only during a scheduled Morning/Evening session.
- **Alarm receivers:** start, resume, warning and pause notices for each section. One fixed request code per kind, so a new alarm always replaces the old one.
- **`PrayerNotificationReceiver`:** one exact alarm, always for the next prayer.
- **Reschedule receivers** (Audio Azkar and prayer): reboot, app update, time or timezone change, and a change to the exact-alarm permission. They re-arm everything from stored data. After a reboot, an interrupted Morning/Evening session continues once.
- **`FloatingTasbeehService`** (`specialUse`) and its boot receiver.
- **`VoiceRecognitionPlugin`:** uses the phone's own speech-recognition service.

### 9.3 Permissions
| Permission | Used for |
|---|---|
| POST_NOTIFICATIONS (Android 13+, requested at runtime) | All notifications and playback controls |
| SCHEDULE_EXACT_ALARM («المنبّهات والتذكيرات», granted by the user in settings) | On-time playback and notifications. Without it alarms are inexact and Android may block background playback. |
| FOREGROUND_SERVICE, _MEDIA_PLAYBACK, _SPECIAL_USE | The playback service and Floating Tasbeeh |
| WAKE_LOCK | Keeping playback and silences going with the screen off |
| RECEIVE_BOOT_COMPLETED | Re-arming after a reboot |
| ACCESS_FINE / COARSE_LOCATION (runtime) | Automatic location |
| RECORD_AUDIO, MODIFY_AUDIO_SETTINGS (runtime) | Voice Tasbeeh and Bluetooth microphone routing |
| SYSTEM_ALERT_WINDOW (user-granted) | Floating Tasbeeh bubble |
| VIBRATE, INTERNET | Haptics; the WebView |

### 9.4 Restrictions and known limitations
- **HONOR/Huawei «تشغيل التطبيقات» (App launch):**
  - It can hold alarms back after the app is swiped from Recents.
  - The app uses `setAlarmClock` for every alarm that starts playback, and shows a hint plus a shortcut to set DITHAR to «إدارة يدوية» with auto-launch, secondary launch and background running enabled.
  - Battery «Restricted» mode blocks background work entirely.
- Without exact-alarm permission, playback may start late or be refused. The tap-to-start notification is the fallback.
- **The prayer schedule and the adhan quiet periods cover 30 days.** The Morning/Evening plans also cover 30 days. Opening the app refreshes them.
- **Scheduling, notifications and the adhan are Android-only.** The web and iOS builds show «متاحة في تطبيق أندرويد فقط».
- Battery changes made 2026-10-13 (clocks pause in the background, idle WebAudio is suspended, unchanged playlists aren't rewritten on every resume) were **not measured**. There is no data on actual battery impact.

---

## 10. Current implementation status

### 📱 Device-verified (HONOR ALT-NX1, Android 15)
- Scheduled Miscellaneous playback from exact or alarm-clock alarms, with the app in the background. Trace from 2026-10-11.
- Background Audio Azkar playback in general, per the owner's statement. It was treated as a regression constraint for all later changes.
- The exact-alarm permission flow re-arming alarms when granted. Same trace.

### ✅ Test-verified, ⚠️ not observed on a device
- Morning/Evening prayer-time windows and the session-length planning (19 + 7 tests).
- Native slot planning, the window-end guard, metadata parsing and volume policy (JVM tests).
- 5-minute notification expiry (JVM tests of the timeout calculation).
- Reciter and muezzin names (JS and JVM tests).
- Audio Settings volumes and persistence. The preview was also run in real Chromium.
- Pausing the clocks in the background and suspending idle WebAudio.
- Prayer-time calculation against 11 official reference timetables.
- The adhan voice choice, rotation and segment data.
- Statistics, Tasbeeh pacing and counters, the Written reader, search, location detection, and navigation (unit and component tests).

### ⚠️ Implemented, unverified on device
- The transparent emblem launcher icon. Some HONOR launchers add their own background plate.
- Applying the volume live during playback, and the preview on Android.
- The automatic adhan at prayer time with rotation, and its interaction with azkar sessions.
- Floating Tasbeeh overlay behaviour.
- Current Voice Tasbeeh accuracy on Android.
- The 2026-10-14 improvements (resume prompt, reminders and widget, summary, reminder sounds, occasions, weekly schedule) — see `IMPROVEMENTS_2026-10-14.md`.

### 🚧 Incomplete
- The Quran reciter settings screen exists but is unreachable.
- The share helper exists but has no button.
- «صحيح مهجور» (Rare authentic) has 0 items and shows «قريبًا».
- The Floating Tasbeeh «ذكر مخصص» menu row only opens the app; there is no custom-dhikr flow.
- `notificationService.ts` / `notificationSettings.ts` (the old dhikr reminders) remain as unused code. No notification plugin is installed.

### 🐞 Known issues found while writing this guide
1. **The Home "preview test" buttons** for the Quranic insight and the Hadith are visible to real users. They are English-only, show developer counters ("n/522"), and are not limited to development builds.
2. **Open-ended audio azkar always play once.** No screen sets the user's count, and this contradicts the comment in `audioUserRepeat.ts`.
3. ~~Miscellaneous library "Listen" relies on `speechSynthesis`.~~ Removed 2026-10-14.
4. **Stale code comments** mention a "Reminders" feature and a "single Evening section". Documentation only; no behaviour impact.

### Planned or suggested next steps (not implemented)
- Remove or hide the Home preview-test buttons.
- Add a repeat-count picker for open-ended azkar.
- Link the Quran reciter screen, or remove it.
- ~~Hide «Listen» when text-to-speech is unsupported.~~ Removed 2026-10-14.
- On the HONOR phone, verify the checklist in the 2026-10-13 report: windows, volume and preview, names, notification expiry, icon, battery.

---

## 11. Recommended onboarding tutorial (first launch)

1. **Choose language and identity.** Language button (عربي / English) and theme button (men's or women's identity). Optionally Settings → المظهر → الألوان.
2. **Set the location.** Settings → الموقع → «تحديد موقعي تلقائيًا» and allow location, or «اختيار الموقع يدويًا». Check that the Home Prayer Times card shows your city.
3. **Allow notifications** when Android asks. Turn on «تذكير الصلاة» on the Prayer Times card, then choose prayers in Settings → تنبيهات الصلاة.
4. **Allow «المنبّهات والتذكيرات»** from the in-app prompt («السماح»).
5. **On HONOR/Huawei:** follow the hint in إعدادات الأذكار الصوتية → «فتح الإعدادات», and set DITHAR to manual launch management.
6. **Pick the adhan.** Settings → صوت الأذان: choose the regular and Fajr voices and modes, preview them, optionally turn on rotation, and turn on «تشغيل الأذان عند دخول الوقت».
7. **Schedule audio azkar.** Settings → إعدادات الأذكار الصوتية:
   - Turn on Morning and/or Evening, set a preferred start time and a reciter, and review the selection.
   - Optionally set up Miscellaneous with a window and interval.
   - Check «التشغيل القادم».
8. **Set volumes.** Settings → إعدادات الصوت: drag each slider to hear its sample.
9. **Read the azkar.** Written Azkar → Morning: tap the ring for each repetition, then confirm.
10. **Use the Tasbeeh.** Choose a phrase, tap the ring, set a target, and try التسبيح الصوتي.
11. **Explore Home daily:** the Quranic insight and Hadith of the day, with Read more.
12. **Review progress** in Settings → الإحصائيات.

---

## 12. Guided tour: screen by screen, with Arabic narration

| # | Screen / element (highlight) | Arabic narration |
|---|---|---|
| 1 | Home, the whole screen | «مرحبًا بك في دِثار… رفيقك اليومي في الذكر والصلاة.» |
| 2 | Top bar: language and theme | «من هنا تختار لغة التطبيق، والهوية التي تناسبك.» |
| 3 | Date strip | «التاريخ الهجري والميلادي والوقت، أمامك دائمًا.» |
| 4 | Quranic insight card | «كل يوم لطيفة قرآنية جديدة… اضغط «اقرأ المزيد» للتأمل فيها كاملة.» |
| 5 | Hadith card | «وحديث نبوي يومي، مع مصدره ودرجته.» |
| 6 | Prayer Times card | «مواقيت الصلاة لموقعك، تُحسب تلقائيًا وفق المعتمد في بلدك.» |
| 7 | Next prayer and countdown | «الصلاة القادمة، والوقت المتبقي لها لحظة بلحظة.» |
| 8 | The two switches | «فعّل تنبيهات الصلاة، والأذكار الصوتية التلقائية، بلمسة واحدة.» |
| 9 | Bottom navigation | «تنقّل بين الأقسام من هنا.» |
| 10 | Written Azkar → categories | «أذكار الصباح والمساء والصلاة، ومكتبة الأدعية.» |
| 11 | Reader: tap ring | «اضغط الدائرة مع كل تكرار… وعند اكتمال العدد، اضغط مرة أخرى للتأكيد.» |
| 12 | Search | «ابحث عن أي ذكر أو دعاء بكلمة واحدة.» |
| 13 | Miscellaneous library | «أدعية مصنّفة لكل حال… احفظ ما تحب في المفضلة.» |
| 14 | Audio Azkar → list | «استمع إلى الأذكار بأصوات مختارة، وتابع عدد مرات استماعك.» |
| 15 | Player bar showing the reciter's name | «وأثناء التلاوة يظهر اسم القارئ.» |
| 16 | Tasbeeh: ring | «سبّح بهدوء… الدائرة تمنحك وقتًا لنطق الذكر كاملًا.» |
| 17 | Target, Reset | «حدّد هدفك، وأعد العدّ متى شئت.» |
| 18 | Voice Tasbeeh | «أو سبّح بصوتك… ويعدّ التطبيق عنك.» |
| 19 | Settings menu | «كل إعداداتك في مكان واحد.» |
| 20 | Audio Azkar settings | «جدول أذكار الصباح والمساء… تُشغَّل تلقائيًا بين الفجر والظهر، وبين العصر ومنتصف الليل.» |
| 21 | Adhan audio | «اختر صوت المؤذن للأذان العادي وللفجر، أو نوّع بينهم.» |
| 22 | Audio Settings | «اضبط مستوى صوت كل نوع، واستمع لمعاينة فورية.» |
| 23 | Prayer notifications | «اختر الصلوات التي تريد التنبيه لها.» |
| 24 | Location | «حدّد موقعك تلقائيًا أو اختر مدينتك.» |
| 25 | Statistics | «تابع وردك يومًا بيوم… وشهرًا بشهر.» |
| 26 | Floating Tasbeeh (Android) | «سبحة عائمة فوق التطبيقات… تسبّح من أي مكان.» |
| 27 | End of the tour | «تقبّل الله منك… ابدأ وردك الآن.» |

---

## 13. Screenshots needed for a professional visual tutorial

Capture each item on a real Android phone (ideally the HONOR) in **Arabic**. Capture the starred (★) items in **both** identity themes, and capture a few in **English** for the international listing. Hide or remove the "preview test" buttons first (§10, issue 1).

**Home and core**
1. ★ Home, full screen
2. Quranic insight "Read more" modal
3. Hadith details modal
4. ★ Prayer Times card, with switches and countdown
5. Location-change prompt
6. Exit confirmation dialog

**Written Azkar**

7. ★ Written Azkar categories
8. Reader, mid-session (one completed, one active card)
9. Reader, ring showing ✓ before confirmation
10. Prayer category with the prayer selector
11. End-of-session message
12. Search with results
13. Miscellaneous library grid
14. Miscellaneous category, with a dua card's actions

**Audio Azkar**

15. Audio Azkar categories
16. ★ Audio list while playing, with the reciter's name
17. Android notification during azkar playback
18. Lock-screen media controls
19. Android notification during the adhan, with the muezzin's name

**Tasbeeh**

20. ★ Tasbeeh screen with a target
21. Target reached
22. Voice Tasbeeh listening state
23. Floating bubble over another app
24. Floating bubble long-press menu

**Settings**

25. ★ Settings menu
26. Statistics: daily and monthly, with a breakdown expanded
27. Appearance → colours
28. Audio Settings sliders
29. Prayer Notifications
30. Adhan audio, regular section
31. Adhan audio, Fajr section with rotation on
32. Audio Azkar Settings main screen
33. Morning section, showing the window explanation and next run
34. Miscellaneous section with a custom interval
35. HONOR background-launch hint
36. Location: automatic and manual search

**System**

37. Exact-alarm permission prompt
38. 1-minute warning notification
39. Prayer-time notification
40. Launcher icon on the home screen

---

## 14. Feature summary for a presentation

**DITHAR — دِثار: your daily companion for remembrance and prayer**

- 📖 **Written Azkar:** Morning (22), Evening (22) and Prayer (14) azkar, a guided tap-to-count reader, plus 89 categorised duas with meaning, transliteration, search and favourites.
- 🎧 **Audio Azkar:** every Morning and Evening dhikr recorded, with Quranic azkar recited by 10 renowned reciters (one chosen, or a random rotation). The reciter's name shows while playing.
- ⏰ **Smart scheduling (Android):** Morning between Fajr and Dhuhr, Evening between Asr and midnight. Each session is timed to finish inside its window, pauses for the adhan and resumes afterwards, and plays in the background with the screen off.
- 🕌 **Adhan:** 37 reviewed recordings, a separate Fajr adhan, full, takbir-only or «الصلاة خير من النوم» modes, and muezzin rotation without repeats.
- 🧭 **Accurate prayer times:** automatic by country (15 national profiles plus the Muslim World League fallback), tested against official timetables, fully offline, with GPS or 52 built-in cities.
- 📿 **Tasbeeh:** calm, paced counting, targets, voice counting, and a floating bubble over other apps.
- ✨ **Daily inspiration:** 522 Quranic insights and 200 authenticated Hadiths, one of each per day.
- 📊 **Statistics:** daily, weekly, monthly, yearly and custom ranges, kept privately on the device.
- 🎚️ **Audio control:** separate volume and live preview for the adhan and each azkar section, without touching the phone's volume.
- 🎨 **Identity:** men's and women's themes with six palettes each, in Arabic and English.
- 🔒 **Private by design:** no account, no server; all data stays on the device.
