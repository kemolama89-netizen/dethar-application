# Regression matrix

Find the area you changed, run its related tests, and add the listed checks. Test paths may move, so search for them if a path is missing.

| Area | Related tests | Also check |
|---|---|---|
| Navigation and Back | `src/App.navigation.test.tsx`, `src/lib/backOverlays.test.tsx`, `src/lib/appExit.test.ts` | Back closes overlays first; exit only from Home |
| Launch and startup | `src/App.reminderOpen.test.tsx`, `src/App.reminderDirectOpen.test.tsx` | No white flash; logo, then Hadith |
| Prayer times | `src/lib/prayerTimes.test.ts`, `src/lib/calculationProfiles*.test.ts`, `src/data/timezoneCountries.test.ts` | A correct time matters more than any visual change |
| Adhan | `src/lib/adhan*.test.ts`, `src/data/adhan*.test.ts` | Phone: plays on time, can be silenced |
| Prayer notifications | `src/lib/prayerNotifications.test.ts`, `src/lib/prayerReminderSettings.test.ts`, `android/app/src/test/.../prayernotifications` | Phone: fires with the app closed |
| Audio Adhkar | `src/lib/audioAdhkar*.test.ts`, `src/lib/audioEngine.test.ts`, `android/app/src/test/.../audioadhkar` | Phone: background playback, adhan interruption and resume |
| Written Adhkar | `src/data/misc-library.test.ts`, `src/data/importedDuas.test.ts` | Counts, order and text unchanged; two-step completion intact |
| Tasbeeh and Floating Tasbeeh | `src/components/TasbeehScreen.test.tsx`, `android/app/src/test/.../floatingtasbeeh`, `android/app/src/test/.../voicerecognition` | Phone: bubble placement, voice counting |
| Qur'an reader and Mushaf | `src/components/QuranReader*.ui.test.tsx`, `src/components/QuranBrackets.ui.test.tsx`, `src/data/quranContentRefs.test.ts` | `scripts/quran-validation/`; phone: page turns |
| Daily content, reminders, widgets | `src/lib/reminderContent.test.ts`, `src/data/widgetContent.test.ts`, `src/data/widgetVerses.test.ts`, `src/components/HomeDailyPicksCard.test.tsx`, `android/app/src/test/.../reminders` | Phone: widget text and open behaviour |
| Religious audit gating | `src/lib/religiousAudit.test.tsx`, `src/data/hadith.test.ts`, `src/data/wamdat.test.ts` | No unaudited in-scope item becomes visible; protected items are never gated |
| Themes and appearance | `src/theme/looks.test.ts`, `src/theme/appearancePersistence.test.tsx`, `src/lib/appLookNative.test.ts`, `android/app/src/test/.../look` | All four looks; Mushaf stays out of looks; saved choice survives restart |
| Language and RTL | `src/App.navigation.test.tsx` and the screen's own tests | Both languages at each width; notification text follows the language |
| Assets and audio files | `src/lib/audioAssets.test.ts` | Production paths work under the GitHub Pages base path, using `npm run preview` |

Changes to shared components or `src/index.css` can affect every screen, so treat them as Regression level.
