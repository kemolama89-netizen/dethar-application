# Voice Tasbeeh Validation — Failure Analysis

Source: `debug-logs/dithar-voice-debug-1788629696164.json` (2,479 entries, 16 dhikr targets, full session).

## Overview

| # | Target (truncated) | Expected | Actual |
|---|---|---|---|
| 0 | سبحان الله | 5 | **5** |
| 1 | سبحان الله وبحمده | 5 | 4 |
| 2 | سبحان الله والحمد لله | 5 | 4 |
| 3 | سبحان الله العظيم وبحمده | 5 | 4 |
| 4 | سبحان الله وبحمده، سبحان الله العظيم | 5 | 4 |
| 5 | لا إله إلا الله وحده... قدير (Case A) | 5 | **0** |
| 6 | لا حول ولا قوة إلا بالله | 5 | 4 |
| 7 | الحمد لله | 5 | 4 |
| 8 | اللهم صلي وسلم وبارك على سيدنا محمد | 5 | 4 |
| 9 | أستغفر الله | 5 | **5** |
| 10 | سبحان الله...والله أكبر (Case B) | 5 | **1** |
| 11 | لا إله إلا الله | 5 | 4 |
| 12 | الله أكبر | 5 | **5** |
| 13 | سبحان الله...اللهم ارزقني (7-clause) | 5 | **5** |
| 14 | الحمد لله حمدا كثيرا...مباركا فيه (Case D) | 5 | 3 |
| 15 | الله أكبر كبيرا...بكرة وأصيلا (Case C) | 5 | 1 |

12 of 16 dhikrs fell short. Each one was traced back to raw ASR text plus the matcher's `tokenOutcomes`/`completions` in the debug log. They fall into three genuinely distinct buckets — no duplicate-counting or over-counting was found anywhere in this log.

---

## Bucket 1 — Target-switch truncation (NOT a matcher bug): sessions 1, 2, 4, 6, 8, 11

Category **6 (target-switch issue)**. In every one of these, the transcript shows 4 clean, fully-matched repetitions, and then a **5th repetition genuinely in progress** — `tokenOutcomes` show `match, match, ...` (real progress, not a reject) — that stops mid-word or mid-phrase because the target switch fired 10–276ms after the last ASR update and `refreshRecognitionRef` calls `recognition.abort()` on the old instance. `abort()` discards whatever audio the browser hadn't yet transcribed — it never gets a chance to emit the trailing word(s).

| Session | Target | Last ASR fragment of rep 5 | Words captured before cutoff |
|---|---|---|---|
| 1 | سبحان الله وبحمده | `...سبحان الله وب` | 2 of 3 (final word truncated mid-syllable) |
| 2 | سبحان الله والحمد لله | `...سبحان الله والحمد` | 3 of 4 (missing last "لله") |
| 4 | (2-clause, 6 tokens) | `...سبحان الله وبحمده` | 3 of 6 (second clause never started) |
| 6 | لا حول ولا قوة إلا بالله | `...لا حول ولا قوة الا` | 5 of 6 (missing only "بالله") |
| 8 | اللهم صلي...محمد (7 tokens) | `...اللهم صلي وسلم وبارك` | 4 of 7 |
| 11 | لا إله إلا الله | `...لا إله` | 2 of 4 |

**Root cause:** not the matcher — it never received the completing token(s) at all. **Rejection/non-completion here is correct**, because there is nothing to count yet. The actual defect (if any) is in the target-switch teardown: it uses `abort()`, which is instantaneous and lossy, rather than `stop()`, which lets the engine finish processing already-captured audio before `onend` fires. This is a genuine, general lifecycle issue, but it's **not** a matcher/state-machine defect — it lives entirely in `useVoiceTasbeeh.ts`'s recognizer-swap code, not in `voiceTasbeehMatch.ts`. Flagged separately per the requested classification (category 6) rather than folded into the matcher fix below.

Sessions **3** and **7** also landed on 4, but with **no partial 5th attempt at all** (raw text stops cleanly after rep 4, with a longer 277–470ms gap before switch, and the matcher's own bookkeeping shows nothing after the 4th completion). It isn't possible to distinguish "recognizer briefly closed for end-of-speech finalization and the switch beat it" from "only 4 were actually said" from the log alone — either way, this is **not a matcher bug**: no genuine content is visible that the matcher failed to count.

---

## Bucket 2 — Genuine matcher/state-machine defects (fixable generically): sessions 5, 10

### Case A — session 5 (0/5): adjacent duplicate target token collapsed by ASR
Target tokens: `...لا شريك له له الملك...` — the target itself has **"له" twice in a row**. In all 3 full attempts captured, ASR produced only **one** "له" before jumping straight to "الملك". `replay()` has zero tolerance for a missing required token: match sequence hits `له`(1st)→match, then expects a 2nd `له` but gets `الملك` → **reject**, and every token for the rest of that attempt (والحمد, وهو, على, كل, شيء, قدير) also rejects, since progress is back to 0 and none of them equal the target's first token. Result: 0/5, every single time, identically, across 3 independent attempts.

- **Classification:** matcher/state-machine limitation (category 1), triggered by a real, reproducible ASR pattern — degemination of an immediately-repeated identical word (category 3).
- **Is current rejection correct or a bug?** It's a **bug** in the sense that the matcher has no generic mechanism at all for this — not "fuzzy," just literally absent. The existing code already has two precedents for tolerating specific, structural ASR artifacts (`isCliticSplitMatch` for "و"+word splits, `isAsrTruncatedForm` for trailing truncation); this is a third instance of the same category, not covered.
- **Safe to fix generically?** Yes — the trigger condition (`targetTokens[progress] === targetTokens[progress-1]`) is a property of the **target's own token sequence**, not of any specific dhikr's wording. It applies to any dhikr with an adjacent repeated word, doesn't invent unheard content (the single spoken instance is real), and doesn't fuzzy-match (still exact-token equality).

### Case B — session 10 (1/5): leading "و" dropped from "والله"
Target tokens: `...لا اله الا الله والله اكبر`. Rep 1 succeeded because ASR happened to transcribe "والله" as two separate words "و" + "الله" — already handled correctly by `isCliticSplitMatch`. Reps 2–5 **all** failed at the exact same spot: ASR instead dropped the "و" entirely and produced bare "الله" (sometimes doubled: "الله الله اكبر"), which doesn't equal target's "والله" and isn't a *split* either (there's no separate "و" token to combine). `replay()` rejects it outright, then rejects "اكبر" too (progress already back at 0), and the attempt restarts on the next "سبحان".

Cross-check: session 13 contains the exact same "والله أكبر" clause and got a clean 5/5 — but its matcher log shows ASR consistently used the **split** "و"+"الله" form there, which already works. This confirms the two ASR output shapes for the same phonetic content are independent, and only the *dropped* shape is unhandled.

- **Classification:** matcher/state-machine limitation (category 1) exposed by a real ASR pattern — leading-clitic loss (category 2/3, the mirror-image of the trailing-truncation case already tolerated).
- **Safe to fix generically?** Yes, same reasoning as Case A: the condition (`targetTokens[progress]` starts with "و", spoken word equals it with that leading char stripped) is driven by target-token shape, applies to every dhikr containing a و-prefixed word (والحمد, ولا, وبحمده, والله, etc.), and is exact-match, not fuzzy.

---

## Bucket 3 — Correct rejections, unfixable without fuzzy matching: sessions 14, 15

### Case C — session 15 (1/5): repeated genuine misrecognition of "بكرة"
Rep 1 completed correctly. Every later attempt substitutes a **different, unrelated word** for "بكرة" — "بخة", "بقيلة", "ينسينا", "وقوته" — none of which are truncations, omissions, or clitic artifacts; they're just wrong ASR output for that one word in this recording. `replay()` correctly rejects each one.
- **Is rejection correct?** Yes, unambiguously — accepting any of these would require actual fuzzy/phonetic matching, which is explicitly out of scope.
- **Can the matcher recover if a later revision gets it right?** Yes — confirmed architecturally: `resolvedPrefix` only advances on a real completion, so a rejected attempt doesn't poison anything; the very next "سبحان" restarts cleanly and would complete normally if ASR ever produced "بكرة" correctly. It just never did within this session before the target switched.

### Case D — session 14 (3/5): one substitution + one target-switch truncation
Rep 1: "مباركا" was misrecognized as "وأمورك" → correctly rejected (same category as Case C, genuinely different word, no state poisoning — confirmed the very next "الحمد" cleanly restarted and matched). Reps 2–4 completed correctly (3 completions, matching the observed total). Rep 5: cut short by the target switch before "فيه" arrived (Bucket 1 pattern).
- **Is current behavior correct?** Yes on both counts — the substitution-rejection is correct, and no state was poisoned by the earlier wrong recognition (verified directly in the log: `resolvedPrefixBefore=[]` at the point rep 2 starts fresh).

---

## Proposed general fix (matcher/state-machine only — Bucket 2, cases A & B)

Both defects are the **same class of gap**: `replay()` in `voiceTasbeehMatch.ts` already tolerates two specific, deterministic ASR degradation patterns (clitic split, trailing truncation) but has no equivalent for two sibling patterns that surfaced in this run. Proposed addition, as two new structural (not fuzzy, not per-dhikr) rules alongside the existing `isCliticSplitMatch`/`isAsrTruncatedForm`:

1. **Adjacent-duplicate collapse** — if `targetTokens[progress] === targetTokens[progress - 1]` (the target itself repeats a token) and the spoken word instead exact-matches `targetTokens[progress + 1]`, treat the single spoken instance as satisfying the duplicate slot and advance progress by 2.
2. **Leading-wa-clitic loss** — if `targetTokens[progress]` starts with "و" and the spoken word exact-matches `targetTokens[progress]` with that leading character stripped, treat it as a match (the drop-analog of the already-accepted split case).

Both conditions are derived purely from the **target's own token content**, evaluated with plain string equality — no fuzzy/edit-distance logic, no dhikr-specific literals, no invented words (in both cases the real spoken word was heard, just missing a leading/duplicate character the ASR engine dropped). They live entirely inside the existing pure, stateless `replay()` function, so:
- target-switch isolation, exactly-once protection, rapid-repetition handling, and revision/replay correctness are all untouched (nothing here changes `matchProgress` persistence, `resolvedPrefix` locking, or the fallback-replay/duplicate-completion-guard mechanics).
- it generalizes to *every* dhikr with a repeated-adjacent token or a و-prefixed token, not just the two that happened to expose it in this run.

This fix has **not** been implemented — pending sign-off before touching code. Separately, Bucket 1 (target-switch abort-vs-stop) is a real, likely higher-impact issue (it explains 6 of the 12 shortfalls), but it's a recognition-lifecycle change, not a matcher change — a separate decision/pass, not folded into this proposal.
