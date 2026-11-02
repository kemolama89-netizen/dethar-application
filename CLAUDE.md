# DITHAR (دِثار)
Islamic daily-remembrance companion. Arabic-first (RTL), English supported.
The Android app is the main product; the web build is on GitHub Pages.

## Stack
Vite, React 19, TypeScript, Tailwind 4, Capacitor 8, Kotlin plugins in android/.
This is NOT React Native or Expo. Tests: Vitest + jsdom; Playwright for browser checks.
When docs and code disagree, the code wins (docs/DITHAR_APP_GUIDE.md is partly stale).

## Commands
Typecheck `npx tsc -b` · Lint `npm run lint` · Test `npm test`
Dev server: `bash scripts/dev-server.sh`. Never kill port 5173 as cleanup. Never use `pkill -f`.

## Never without explicit approval
Commit, push, deploy (a push to main deploys), build an APK, run `cap sync`, add a dependency.

## Design identity
One identity; four looks (Classic, Night, Nature, Sunset) in src/theme/looks.ts.
Navy #12213f, gold #c6a15b, ivory #f2e9da. Amiri display, Tajawal body.
Use tokens from src/index.css. The Mushaf opts out of looks. ASSETS/ source files are read-only.
For UI work use /dithar-design-director before implementing.

## Protected
Written and Audio Adhkar, duas and Tasbeeh: never change content, visibility or behaviour.
Audio playback and scheduling, adhan and prayer calculation: change only when asked, then run /dithar-qa.
Qur'an text: never retype or "fix" from memory.

## Religious content
Audit scope: Hadiths, Wamadat/Lataif, Saadi Lataif (`inAuditScope`, src/lib/religiousAudit.ts).
Never write or approve religious text from model knowledge; every claim needs an opened source.
Reflections are credited «مستفاد من», never presented as quotations.
New in-scope items stay hidden until audited. Use /dithar-content-audit. Back up before editing content.

## Done means
Report what passed, failed and was skipped. Tests are not device verification;
judge animation on a physical phone, not the emulator.
