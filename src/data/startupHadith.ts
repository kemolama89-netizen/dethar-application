// The Hadith of DITHAR's launch intro (components/StartupHadithOverlay.tsx):
// Jami' at-Tirmidhi 3377 — https://sunnah.com/tirmidhi/48/8 — on remembrance
// of Allah as the best of deeds.
//
// The wording is the verified entry in data/widgetContent.ts (checked letter
// for letter against the Arabic text of Jami' at-Tirmidhi). It is repeated
// here as plain constants ONLY so the launch intro doesn't pull the whole
// content library into the startup bundle; startupHadith.test.ts fails if a
// single field ever differs from that entry. It is the Prophet's ﷺ words
// only: in the same report Mu'adh ibn Jabal then adds his own statement
// («ما شيء أنجى من عذاب الله من ذكر الله»); that is a Companion's saying and
// is deliberately NOT shown here, so the two are never merged. Tirmidhi's own
// grading remark is not reproduced either; the grading shown is Ahmad
// Shakir's and al-Albani's (sahih), as listed with the narration.

/** Its id in the Religious Content Review (lib/contentReview.ts). */
export const STARTUP_HADITH_REVIEW_ID = "startup:tirmidhi-3377";

/** The id of the verified entry it mirrors (data/widgetContent.ts ENRICHED_HADITHS). */
export const STARTUP_HADITH_ENTRY_ID = "tirmidhi-3377";

const textAr = "عن أبي الدرداء رضي الله عنه قال: قال النبي صلى الله عليه وسلم: «ألا أنبئكم بخير أعمالكم، وأزكاها عند مليككم، وأرفعها في درجاتكم، وخير لكم من إنفاق الذهب والورق، وخير لكم من أن تلقوا عدوكم فتضربوا أعناقهم ويضربوا أعناقكم؟» قالوا: بلى، قال: «ذكر الله تعالى»";

export const STARTUP_HADITH = {
  textAr,
  /** The Prophet's ﷺ words only, for the intro — the question and the answer, unaltered. */
  quoteAr: textAr.slice(textAr.indexOf("«")),
  meaningEn: "\"Shall I not tell you of the best of your deeds, the purest of them with your Master, the highest of them in raising your ranks, better for you than spending gold and silver, and better for you than meeting your enemy and striking their necks while they strike yours?\" They said: \"Certainly.\" He said: \"The remembrance of Allah, Most High.\"",
  narratorAr: "أبو الدرداء رضي الله عنه",
  sourceAr: "سنن الترمذي، أبواب الدعوات",
  sourceEn: "Jami' at-Tirmidhi, Chapters on Supplication",
  referenceAr: "الترمذي 3377",
  referenceEn: "Jami' at-Tirmidhi 3377",
  gradeAr: "صحيح",
  gradeEn: "Sahih",
  gradingSourceAr: "أحمد شاكر، والألباني",
  url: "https://sunnah.com/tirmidhi/48/8",
  translationSource: "DITHAR rendering, compared line by line with the published translation in the checked dataset (not verbatim)",
  note: "Shown without Mu'adh ibn Jabal's own closing statement, which is part of the same report but is not the Prophet's ﷺ words.",
} as const;
