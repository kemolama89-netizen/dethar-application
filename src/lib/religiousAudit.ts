// Reads the religious-content audit (data/religiousAudit.ts). The audit covers
// three categories only — Prophetic Hadiths, the Quranic Wamadat / Lataif and
// the Lataif quoting Tafsir al-Sa'di; everything else (Written and Audio
// Adhkar, duas, Tasbeeh, poetry, short verses…) is outside it and never gated
// here. Pure lookups over a fixed table, safe for data modules to call.
import { RELIGIOUS_AUDIT } from "../data/religiousAudit";
import type { Language } from "../theme/LanguageContext";

/**
 * The audit applies (always, in the app). A reviewer's approved edit changes
 * an audited text, so while this holds an edited in-scope item waits for a
 * new audit.
 */
export const AUDIT_ENFORCED = true;

const SCOPE = /^(hadith:|lataif:w\d+$|lataif:q|startup:|home:featured-quote$)/;

/** A Hadith, Wamadat or Saadi Latifa — the only content the audit decides on. */
export function inAuditScope(id: string): boolean {
  return SCOPE.test(id);
}

/** Shown in Arabic: always outside the audit's scope; inside it, only when verified. */
export function auditShowsArabic(id: string): boolean {
  if (!inAuditScope(id)) return true;
  const flags = RELIGIOUS_AUDIT[id];
  return flags === "ar" || flags === "ar+en";
}

/** Its English shown: always outside the scope; inside it, only a verified published translation. */
export function auditShowsEnglish(id: string): boolean {
  if (!inAuditScope(id)) return true;
  return RELIGIOUS_AUDIT[id] === "ar+en";
}

/** A reminder item (lib/reminderContent.ts) passed the audit in [language]. */
export function reminderAuditApproved(id: string, language: Language): boolean {
  return language === "en" ? auditShowsArabic(id) && auditShowsEnglish(id) : auditShowsArabic(id);
}

/** A verified item in scope is published by default (lib/contentReview.ts); a reviewer can still reject it. */
export function auditPublishesByDefault(id: string): boolean {
  return inAuditScope(id) && auditShowsArabic(id);
}
