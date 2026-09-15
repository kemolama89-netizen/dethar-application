# Floating Tasbeeh — Current State Report

Date: 2026-09-11
Scope: read-only assessment. No code changed, no APK rebuilt, no tests run as part of producing this report.

## 1. What currently exists

### Frontend (JS/TS) — complete and previously verified passing
- `src/lib/floatingTasbeehBridge.ts` — `registerPlugin("FloatingTasbeeh")` wrapper; typed interface mirroring the native plugin's methods 1:1.
- `src/lib/floatingTasbeehSync.ts` — availability check (native + Android only), pushes the 4 quick-access dhikr (ids `1, 8, 13, 10`) to native, reconciles pending native taps into the JS stats engine on app start and on every foreground (`appStateChange`).
- `src/lib/tasbeehCommit.ts` — the "Shared Counting Core". `commitManualTasbeehRepetition`, `commitFloatingTasbeehRepetition(s)`, and `applyVoiceTasbeehCountIncrement` all funnel through one counters-write path. Floating taps are tagged `source: "floating"` in the stats log.
- `src/lib/stats.ts` — extended with `"floating"` as a first-class `StatSource`, folded into the same aggregate totals as manual/voice taps (`recordFloatingTasbeehRepetition`, `recordFloatingTasbeehRepetitions`).
- `src/components/SettingsScreen.tsx` / `src/data/settings.ts` — a real enable/disable toggle wired to the plugin (permission request, enable/disable), Arabic + English strings.
- `src/App.tsx` — calls `startFloatingTasbeehSync()` once on mount.
- Tests: `src/lib/floatingTasbeehSync.test.ts`, `src/lib/tasbeehCommit.test.ts`, plus updated `src/lib/stats.test.ts` / `src/components/TasbeehScreen.test.tsx`.

### Native Android — complete, not verified end-to-end on device in this session
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/FloatingTasbeehService.kt` — foreground service; owns the `WindowManager` overlay window and bubble lifecycle; `START_STICKY`/`START_NOT_STICKY` gated on persisted `enabled` + live overlay-permission check.
- `.../FloatingBubbleView.kt` — self-drawn circular view; `GestureDetector.onSingleTapConfirmed` for tap (fires once per real tap, never during a drag); `onLongPress` for the menu; manual drag via touch-slop + raw touch tracking.
- `.../DhikrMenuPopup.kt` — long-press popup: 4 quick dhikr rows (labels pushed from JS) + "ذكر مخصص" (Custom Dhikr) + "الإعدادات" (Settings) — both of the latter just foreground `MainActivity`.
- `.../FloatingTasbeehStore.kt` — single `SharedPreferences` surface: enabled flag, selected dhikr, live-count mirror for the bubble's own number, and an 80ms defensive duplicate-dispatch guard (explicitly documented as distinct from the in-app calm-counting pacing).
- `.../PendingEventQueue.kt` + `PendingTasbeehEvent` — pure-Kotlin (no `android.*` imports) offline queue with a monotonic cursor and a peek/confirm-drain protocol, so a crash mid-reconciliation can't double-count or lose taps. Has its own JVM unit test, `PendingEventQueueTest.kt` (10 tests).
- `.../FloatingTasbeehPlugin.kt` — the Capacitor bridge exposing exactly the methods `floatingTasbeehBridge.ts` expects (`isSupported`, `isOverlayPermissionGranted`, `requestOverlayPermission`, `isEnabled`, `setEnabled`, `getSelectedDhikr`, `setSelectedDhikr`, `setDhikrList`, `getPendingEvents`, `confirmPendingEventsDrained`).
- `.../BootCompletedReceiver.kt` — restarts the service after reboot, gated on `enabled` + overlay permission still granted.
- `android/app/src/main/AndroidManifest.xml` — declares the service (`foregroundServiceType="specialUse"`, not exported), the boot receiver, and permissions `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`.
- `android/app/src/main/java/com/dithar/app/MainActivity.java` — registers `FloatingTasbeehPlugin`, otherwise a stock `BridgeActivity`.

## 2. What is working

- The design cleanly separates concerns: native never touches JS stats directly; JS never touches native `SharedPreferences` directly. The only seam is the `FloatingTasbeeh` Capacitor plugin.
- Floating taps route through the exact same `tasbeehCommit.ts` → `stats.ts` path as manual and Voice Tasbeeh taps — there is no separate/competing counter.
- The offline queue's peek-then-confirm-drain shape is specifically built so a process kill between "committed to JS stats" and "removed from native queue" replays safely instead of double-counting or losing a tap.
- Tap-vs-drag disambiguation uses `GestureDetector.onSingleTapConfirmed` (the standard Android API for this), not a naive click listener — this is what prevents a drag from misfiring as a tap.
- Floating Tasbeeh has zero coupling to `SpeechRecognition`/Voice Tasbeeh code paths, so voice-recognition echo/duplicate issues cannot leak into floating counts and vice versa.
- Lifecycle safety is deliberate: `START_STICKY` restart and the boot receiver are both re-gated on persisted `enabled` (not "the service happened to survive"), so a stale restart can't resurrect a bubble the user disabled.
- Overlay permission is handled via `Settings.canDrawOverlays()` re-checked on return from the system settings screen, rather than trusting unreliable OEM `ActivityResult` codes.
- Automated test coverage exists and was passing as of the last check in this session: all JS/TS tests (226 tests across 8 files) and the native `PendingEventQueueTest.kt` (10 tests, pure JVM, no emulator needed).

## 3. What is broken

**Confirmed root cause — stale packaged web assets (see §4).** This is a build/sync staleness issue, not a design flaw:
- `android/app/src/main/assets/public/index.html` (what's actually inside the previously-installed APK) has every asset URL prefixed `/dethar-application/...` — GitHub Pages' base path.
- The working tree's `vite.config.ts` already has the fix (`base: './'` for build) and the current `dist/index.html` already has correct relative paths. But `android/app/src/main/assets/public/` was never re-synced (`npx cap copy`/`sync` not re-run) after that edit, so the previously-built/installed APK still shipped the broken absolute-path HTML.

**Not confirmed broken, but unverified:**
- `FloatingTasbeehService`, `FloatingBubbleView`, and `DhikrMenuPopup` have no instrumented/Robolectric tests — only the pure-Kotlin queue is unit-tested. Overlay behavior, drag, and popup positioning have not been exercised by any automated test in this repo.
- `TYPE_APPLICATION_OVERLAY` + `FLAG_NOT_FOCUSABLE` and per-OEM overlay-permission dialog behavior (Samsung/Xiaomi/etc. are known to diverge from stock Android here) are a common source of device-specific bugs that static code reading cannot rule out.
- "ذكر مخصص" (Custom Dhikr) and "الإعدادات" (Settings) in the long-press popup don't deep-link to a specific screen — they just foreground `MainActivity`. This is explicitly documented in the code as a known Phase 2 limitation, not an oversight.

## 4. Why the APK previously showed a white screen

Root cause, verified by diffing tracked files:

```
git diff HEAD -- vite.config.ts
-  base: command === 'build' || isPreview ? '/dethar-application/' : '/',
+  base: command === 'build' || isPreview ? './' : '/',
```

- The **old** config baked GitHub Pages' base path (`/dethar-application/`) into every built asset URL. That's correct for GitHub Pages, but wrong for a Capacitor Android WebView, whose local origin root is `/`, not `/dethar-application/`.
- The APK that was built and installed packaged `android/app/src/main/assets/public/index.html` with the old absolute paths (`/dethar-application/assets/index-....js`, etc.). Inside the app's WebView, every one of those requests resolved against the wrong root and 404'd — no JS ever ran, hence a blank/white screen.
- The **fix is already present in the working tree**: `vite.config.ts` now uses `base: './'` for build, and the current `dist/index.html` correctly uses relative paths (`./assets/...`). However, `android/app/src/main/assets/public/index.html` still contains the old absolute-path version, because the native assets folder is a copy that only updates when `npx cap copy`/`sync` is explicitly re-run — that command has not been run since the `vite.config.ts`/`index.html` fix was made.
- In short: **the fix exists but has not been synced into the native project or rebuilt into an APK.** This is a one-command staleness problem, not a deeper native or plugin bug.

## 5. What should be kept

Everything listed in §1. The current architecture already satisfies the target behaviors:

| Target behavior | Status |
|---|---|
| Real Android floating bubble/overlay above other apps | ✅ `TYPE_APPLICATION_OVERLAY` foreground service |
| Single tap = exactly one dhikr count | ✅ `onSingleTapConfirmed` + 80ms defensive dedup guard |
| Long press = dhikr selection menu | ✅ `DhikrMenuPopup` |
| Selected dhikr persists | ✅ `SharedPreferences` via `FloatingTasbeehStore` |
| Same counting/statistics core as main app | ✅ `tasbeehCommit.ts` shared by manual/voice/floating |
| No duplicate counts from SpeechRecognition/echoes/lifecycle | ✅ fully decoupled from voice recognition code; native-side dedup guard is separate and documented |
| Works while app is backgrounded | ✅ Foreground Service independent of WebView; offline queue for reconciliation |
| Overlay permission handled correctly | ✅ `Settings.canDrawOverlays` + `ACTION_MANAGE_OVERLAY_PERMISSION`, re-checked on return |
| Survives lifecycle/background transitions safely | ✅ `START_STICKY` re-gated on persisted state; boot receiver re-gated the same way; crash-safe peek/confirm-drain queue |
| Lightweight, reliable UI | ✅ single self-drawn `View`, no layout inflation, no dependency on WebView being alive |

There is no technical justification found for discarding this implementation.

## 6. What should be removed / rebuilt

**Nothing in the Floating Tasbeeh feature code itself needs to be removed or rebuilt.** The only required action is operational, not a code change:
1. Re-sync native assets (`npx cap copy android` or `npx cap sync android`) so `android/app/src/main/assets/public/` picks up the already-fixed `dist/` output.
2. Rebuild the APK and reinstall to confirm the white screen is resolved.

Unrelated repo-hygiene items noticed (flagged only — not part of this feature and not touched):
- `dithar-floating-tasbeeh-white-screen-fix.apk` (~6.5 MB) and `dithar-floating-tasbeeh.zip` (~6.1 MB) are untracked build artifacts sitting at the repo root.
- Several root-level analysis files (`voice-tasbeeh-*.txt/.md`, `AUDIT_WRITTEN_ADHKAR_*`) are leftovers unrelated to Floating Tasbeeh.

## 7. Recommended architecture (i.e., confirmation of the existing one)

No redesign is recommended. The existing architecture is the recommended one:

```
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│   JS / Web (Capacitor)      │        │   Native Android                  │
│                              │        │                                    │
│  App.tsx                    │        │  MainActivity (registers plugin)  │
│   └─ startFloatingTasbeehSync│        │                                    │
│                              │        │  FloatingTasbeehPlugin.kt         │
│  floatingTasbeehSync.ts     │◄──────►│   (Capacitor bridge — ONLY seam)  │
│   - pushFloatingDhikrList    │  JS↔Kt │                                    │
│   - reconcileFloatingTasbeeh │  calls │  FloatingTasbeehStore.kt           │
│                              │        │   (SharedPreferences: enabled,    │
│  floatingTasbeehBridge.ts   │        │    selectedDhikr, liveCount,       │
│   (typed plugin interface)  │        │    PendingEventQueue)              │
│                              │        │                                    │
│  tasbeehCommit.ts           │        │  FloatingTasbeehService.kt         │
│   (Shared Counting Core —   │        │   (foreground service, owns        │
│    manual + voice + floating│        │    WindowManager overlay window)   │
│    all commit here)         │        │                                    │
│                              │        │  FloatingBubbleView.kt             │
│  stats.ts                   │        │   (self-drawn circle, gesture      │
│   (source: "floating" tag)  │        │    detector: tap vs drag vs        │
│                              │        │    long-press)                     │
│                              │        │                                    │
│                              │        │  DhikrMenuPopup.kt                 │
│                              │        │   (long-press quick-dhikr menu)    │
│                              │        │                                    │
│                              │        │  BootCompletedReceiver.kt          │
│                              │        │   (restarts service after reboot) │
└─────────────────────────────┘        └──────────────────────────────────┘
```

Key architectural invariants worth preserving in any future change:
- Native never writes directly to the JS stats/counters store; JS never writes directly to native `SharedPreferences`. The plugin is the only crossing point.
- Native only ever records raw, timestamped taps (`PendingTasbeehEvent`); JS is the only place a tap becomes a real Statistics event (via `tasbeehCommit.ts`).
- The peek/confirm-drain protocol (never a single destructive "drain everything") is what makes reconciliation crash-safe.
- `enabled` state is persisted and re-checked on every service start/restart — never inferred from "the service happens to still be running."

## 8. Exact files involved

**Frontend:**
- `src/lib/floatingTasbeehBridge.ts`
- `src/lib/floatingTasbeehSync.ts`
- `src/lib/tasbeehCommit.ts`
- `src/lib/stats.ts`
- `src/components/SettingsScreen.tsx`
- `src/data/settings.ts`
- `src/App.tsx`

**Frontend tests:**
- `src/lib/floatingTasbeehSync.test.ts`
- `src/lib/tasbeehCommit.test.ts`
- `src/lib/stats.test.ts`
- `src/components/TasbeehScreen.test.tsx`

**Native (Android):**
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/FloatingTasbeehService.kt`
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/FloatingBubbleView.kt`
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/DhikrMenuPopup.kt`
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/FloatingTasbeehStore.kt`
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/PendingEventQueue.kt`
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/FloatingTasbeehPlugin.kt`
- `android/app/src/main/java/com/dithar/app/floatingtasbeeh/BootCompletedReceiver.kt`
- `android/app/src/main/java/com/dithar/app/MainActivity.java`
- `android/app/src/main/AndroidManifest.xml`

**Native test:**
- `android/app/src/test/java/com/dithar/app/floatingtasbeeh/PendingEventQueueTest.kt`

**Build/config (site of the white-screen bug and its fix):**
- `vite.config.ts` (fix already present, uncommitted)
- `index.html` (fix already present, uncommitted)
- `android/app/src/main/assets/public/index.html` (stale — generated copy, needs `npx cap copy`/`sync`, not hand-edited)
- `capacitor.config.ts`

## 9. Important risks / dependencies

- **Uncommitted fix**: the `vite.config.ts`/`index.html` base-path fix currently exists only in the working tree, not in a commit. It could be lost by an accidental `git checkout`/`reset`/`clean`.
- **Stale native assets**: `android/app/src/main/assets/public/` is a generated copy of `dist/`. Any future `dist/` change (this fix included) requires an explicit `npx cap copy`/`sync` step before rebuilding the APK, or the installed app silently keeps running old web code.
- **No device-level verification yet**: no instrumented UI test exists for the service/bubble/popup; overlay-permission flows are known to vary by OEM (Samsung, Xiaomi, etc.), so a physical/emulator verification pass is recommended after the assets are re-synced, before considering this closed.
- **`FOREGROUND_SERVICE_SPECIAL_USE`**: Play Store review requires a clear justification string for this service type (one is already present in the manifest's `PROPERTY_SPECIAL_USE_FGS_SUBTYPE`), but Google's policy interpretation of "special use" foreground services has shifted before and should be re-checked at release time.
- **`appId` placeholder**: `capacitor.config.ts` notes `com.dithar.app` is a placeholder bundle id, not yet confirmed for a real Play Store listing — irrelevant to functionality, but relevant before any real release build.
- **Two large untracked binaries** (`dithar-floating-tasbeeh-white-screen-fix.apk`, `dithar-floating-tasbeeh.zip`) sit at repo root; unrelated to this feature's logic but worth cleaning up before any commit that runs `git add`.
