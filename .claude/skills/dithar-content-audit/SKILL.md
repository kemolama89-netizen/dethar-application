---
name: dithar-content-audit
description: Source-based, exact verification of DITHAR's in-scope religious content, namely Prophetic Hadiths, the Qur'anic Wamadat/Lataif and the Saadi Lataif. Use whenever someone adds, edits, approves, questions or audits a hadith, hadith grade or narrator, a latifa or wamda, a tafsir citation or a translation of these in DITHAR, or asks whether such text is authentic or correct. Never answer those questions from memory.
---

# DITHAR Islamic Content Audit

Attributing words to the Prophet ﷺ, or a meaning to the Qur'an, that the sources do not support is a serious error, and users trust this app not to. So the standard is positive verification: an item is verified only because a source was opened and it matched.

You are not a scholar and this skill does not issue rulings. It checks whether what the app displays matches what its cited sources say.

## What is in scope
Only what `inAuditScope` in `src/lib/religiousAudit.ts` accepts:

| IDs | Content | Location |
|---|---|---|
| `hadith:*`, `startup:*`, `home:featured-quote` | Prophetic Hadiths | `ASSETS/dithar_hadith_library_final.json`, `src/data/widgetContent.ts`, `src/data/startupHadith.ts`, `src/data/content.ts` |
| `lataif:w<n>` | Wamadat/Lataif | `src/data/wamdat.ts` |
| `lataif:q*` | Saadi Lataif | `src/data/quranLataif.ts` |

Confirm this against the current code before starting, since the code is authoritative.

## What is out of scope
Written Adhkar, Audio Adhkar, morning and evening adhkar, all duas, Tasbeeh, and audio playback and scheduling are protected. This holds even when a hadith-based dua shares a file with a hadith. An earlier whole-app audit wrongly hid protected adhkar and duas, which is why the owner narrowed the scope on 2026-10-30.

If asked to audit these, say they are outside the agreed scope, and ask the user to confirm that they want to widen it for this specific audit. Even then, produce a report only: do not change their content, visibility or behaviour unless the user separately approves that specific change.

## Non-negotiable rules
1. **No model knowledge.** Never verify, approve, correct or supply religious text from memory. If you recall a hadith, that tells you only where to look.
2. **Open the source.** Every check names the source opened, and the location within it, for that item.
3. **Previous approval counts for nothing.** Re-run each check. Earlier records only tell you where to look.
4. **Do not get around access blocks.** sunnah.com and dorar.net have refused automated access, and shamela.ws has too. Record that and use the permitted sources. Never spoof a browser.
5. **Unverifiable is not wrong.** It means "Unverified", and the item stays hidden. Do not guess in either direction.
6. **Report first.** Do not change content or audit decisions unless the user approves those specific changes.

## Workflow
1. Export exactly what the app displays for each item, including the final formatting. Do not work from memory of the data.
2. Run the required checks in [references/source-rules.md](references/source-rules.md), one item at a time, recording each result as you go. Work in the session scratchpad, or in a new `docs/` folder if the user asked for a lasting record, so an interrupted audit can resume.
3. Assign one status per item:
   - **Verified:** every required check matches an opened source.
   - **Needs Correction:** the content is supported, but its wording, attribution, reference or translation needs a fix.
   - **Unverified:** the primary evidence could not be opened.
   - **Rejected:** contradicted by the cited source, or demonstrably wrong.
4. Report before changing anything.

## After approval
1. Back up every file you will edit into `backups/<name>-<UTC timestamp>/`, including related test and lib files.
2. Correct only from the opened source, and change nothing else.
3. Have the correction rechecked independently: a fresh check against the source by a separate script or a subagent that did not make the edit. Do not count re-reading your own edit.
4. Update the decision in `src/data/religiousAudit.ts`. The flags are `ar`, `ar+en`, `excluded`, `partial` and `unverified`. An in-scope item with no entry stays hidden, so new content needs an audit before it appears.
5. Run `/dithar-qa`, including `src/lib/religiousAudit.test.tsx`.

## Report format
Start with counts for each status, then give one row per item:

| Item | Status | What was checked | Source and location | Direct URL | Finding |
|---|---|---|---|---|---|

For anything other than Verified, show the app's text and the source's text exactly, side by side. List the sources that could not be opened. Never summarise a batch as verified if some of its items were not individually checked.
