// Spacing around Arabic punctuation, for text shown in reminders and the
// home-screen widget (lib/remindersSync.ts nativeReminderItem). A space BEFORE a comma or a
// closing mark («وَبِحَمْدِهِ ، سُبْحَانَ») is a typing slip, but on a phone it
// lets the line break before the mark, so a line starts with a bare «،» and
// the sentence reads as interrupted. Only whitespace is touched: no letter,
// diacritic or punctuation mark is added, removed or moved — the wording of a
// verse or Hadith stays exactly as written. Line breaks (poetry) are kept.

/** Whitespace (not a line break) right before a mark that closes or follows a phrase. */
// The Qur'an's ornate brackets ﴿ ﴾ keep their spaces: that is how the shipped verses are written.
const SPACE_BEFORE_MARK = /[ \t ]+(?=[،؛:.؟!»)\]])/g;
/** Whitespace right after a mark that opens a phrase. */
const SPACE_AFTER_OPENER = /([«([])[ \t ]+/g;
/** Runs of spaces inside a line. */
const SPACE_RUN = /[ \t]{2,}/g;

export function tidyArabicSpacing(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(SPACE_BEFORE_MARK, "").replace(SPACE_AFTER_OPENER, "$1").replace(SPACE_RUN, " ").trim())
    .join("\n");
}

/**
 * For the home-screen widget only: a mark standing alone between spaces — a
 * dash or slash in a source line («صحيح البخاري / صحيح مسلم … — صحيح»), the
 * Qur'an's ornate brackets «﴿ … ﴾» — would let Android break the line right
 * before or after it, leaving it alone at the start or end of a line. The
 * space that would allow that becomes a no-break space (drawn the same), so
 * the mark stays on the line of the word it belongs to. Nothing else changes.
 */
export function bindDetachedMarks(text: string): string {
  return text
    .replace(/[ \t]+([—–\-/])(?=[ \t])/g, "\u00A0$1")
    .replace(/﴿[ \t]+/g, "﴿\u00A0")
    .replace(/[ \t]+﴾/g, "\u00A0﴾");
}
