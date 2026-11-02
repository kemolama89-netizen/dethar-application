---
name: dithar-qa
description: Regression testing and performance checks for DITHAR. Chooses the right level of verification for a change, runs it, and reports evidence honestly. Use before calling any DITHAR code change done, after touching audio, adhan, prayer times, notifications, widgets, Tasbeeh, the Mushaf, navigation or themes, and whenever the user asks to test, verify, check for regressions, or investigate slowness.
---

# DITHAR QA

The point is an accurate statement of what is known. A precise "this was not tested" is more useful than a confident "all good", because this app wakes people for prayer and plays their adhkar.

## Rules for this repo
- Do not commit, push, deploy, build an APK, run `cap sync` or add a dependency without explicit approval. `npm run build:android:optimized` runs `cap sync`, so it needs approval too.
- Start the dev server with `bash scripts/dev-server.sh`, and leave it running. Never kill port 5173 as cleanup, and never use `pkill -f`.
- Testing does not change religious content. If a test fails because of it, report that rather than editing the content.
- Keep screenshots and temporary scripts in the session scratchpad, not the repo.
- Do not fix failures silently during a QA pass. Report them, and fix them only if that is part of the task.

## Choose the level

| Level | When | Run |
|---|---|---|
| **Quick** | Any code change, while working | `npx tsc -b`, `npm run lint`, and the related tests: `npx vitest run <paths>` |
| **Regression** | Before calling work done | `npx tsc -b`, `npm run lint`, `npm test`, then the browser pass below |
| **Native** | Kotlin or Java changed | `cd android && ./gradlew testDebugUnitTest` (compiles and runs JVM tests, makes no APK) |
| **Device** | Audio, notifications, alarms, widgets, overlays, animation | Give the user the checklist in [references/device-checklist.md](references/device-checklist.md) |

A full `npm test` takes about four minutes (159 files and 2,256 tests on 2026-11-02), so run it in the background rather than repeating it for small edits. Use [references/regression-matrix.md](references/regression-matrix.md) to find what a change can affect.

jsdom prints `Not implemented` and `act(...)` warnings during normal passing runs. Judge a run by its summary line and exit code.

## Browser pass
Drive the running app with Node Playwright, which is already installed with Chromium and WebKit.
- Use a phone viewport of 390×844 and `deviceScaleFactor: 2`, and add 360 and 430 px for layout changes.
- Check Arabic and English, and the look or looks the change touches. Language and look are stored in localStorage: see `LANGUAGE_STORAGE_KEY` in `src/lib/appearancePreferences.ts` and `LOOK_STORAGE_KEY` in `src/theme/looks.ts`.
- The launch intro sits in front of the first screen. Wait for the target element rather than for a fixed time.
- Capture console errors and failed requests as part of the result.
- Native features do not exist on the web build, so a web pass says nothing about background playback, notifications, the adhan or widgets.

## Performance
Measure before changing anything. Do not invent budgets: compare against a recorded baseline, and if none exists, record one and say that it is the first measurement.

Record the conditions with each number: build type, device or viewport, cold or warm start, and tool version. For a decision, use the median of at least three runs.

| Metric | How |
|---|---|
| Web bundle | `npm run build`, then the sizes of `dist/assets` (this writes only to the git-ignored `dist/`) |
| Web startup and Home | Playwright or a DevTools trace on a production build (`npm run preview`) |
| Long lists and interactions | A trace of the real flow, looking for long tasks |
| APK size | Only from an APK the user approved or already has in `apk/` |
| Cold start and Mushaf page turns | Physical phone only |

The `performance` skill is useful for diagnosis, but its budgets and field-data steps assume a public website. DITHAR has no field data, and most of its users run it in a WebView from local files.

The Android emulator is not valid evidence for animation or smoothness. Its software rendering stalls on Mushaf SVG pages, and it has been shutting itself down.

## Report
Use the evidence labels from `docs/DITHAR_APP_GUIDE.md`, so that nothing reads as stronger than it is:

- **📱 Device-verified:** observed on a real phone, by the user or from their logs.
- **✅ Test-verified:** covered by a passing automated suite or a browser run, and not observed on a phone.
- **⚠️ Unverified on device:** implemented, but never observed on a phone.
- **🐞 Known issue:** a bug or a mismatch found along the way.

Then give:

```
Typecheck: pass/fail
Lint: pass/fail, with warning and error counts
Tests: X passed, Y failed of Z, with failing test names
Browser: what was exercised, at which widths, languages and looks
Native: run or skipped, and why
Performance: numbers and conditions, or "not measured"
Skipped: everything not run, and why
Needs a phone: the specific checks left for the user
```

Paste the real failure output for anything that failed. A check that did not run is listed as skipped, never as passing.
