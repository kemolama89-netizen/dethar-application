// DITHAR — country → default Asr-convention (madhab) mapping.
//
// Step 8 of the global hybrid prayer-time architecture. resolveCalculationSettings.ts
// (Step 3) always resolved the "no override" madhab tier to a single
// hardcoded "shafi" for every country — explicitly flagged in that file's
// own doc comment as a placeholder: "No per-country madhab table has been
// researched/verified yet... kept as its own named function... so a
// future, properly-audited country→madhab table can populate it later
// without restructuring the resolver's 3-tier ... shape." This is that
// table, alongside countryCalculationMethod.ts's own method table — same
// centralized, documented, country-code-keyed pattern.
//
// IMPORTANT — what "shafi"/"hanafi" actually mean here: adhan.js's own
// Madhab enum (see resolveCalculationSettings.ts's own MadhabId doc
// comment) is a BINARY Asr-shadow-length convention, not a literal claim
// about which of the four Sunni schools a country's population follows
// for every ruling. Shafi'i, Maliki, and Hanbali jurisprudence all use the
// SAME "standard" shadow-factor-1 Asr convention — adhan.js labels that
// option "Shafi" only because of its own naming, not because Maliki- or
// Hanbali-majority regions are somehow being mislabeled. Only Hanafi
// jurisprudence uses the later shadow-factor-2 Asr convention. So this
// table only needs ONE real decision per country: "does the majority here
// use the later (Hanafi) Asr time, or the standard (everyone else) one?"
// — never a full fiqh-school claim.
//
// ACCURACY DISCLAIMER (mirrors countryCalculationMethod.ts's own): these
// are REASONABLE, WIDELY-DOCUMENTED majority conventions, not an official
// religious ruling for any individual or region. Deliberately kept SHORT
// and conservative — only countries where the later (Hanafi) Asr
// convention is the clear, uncontroversial majority are listed. Every
// other country — including every Gulf/Levant/North African/Southeast
// Asian country already in countryCalculationMethod.ts, none of which are
// Hanafi-Asr-majority — correctly falls through to DEFAULT_MADHAB,
// exactly preserving the behavior every country (Kuwait included) already
// had before this table existed.
import type { MadhabId } from "./resolveCalculationSettings";

// ISO 3166-1 alpha-2 country codes — the SAME code space
// countryCalculationMethod.ts's table keys on. Restricted to the
// well-documented Hanafi-Asr-convention-majority belt (Turkey, and South/
// Central Asia) — see this file's own disclaimer above for why the list
// stops here rather than attempting full global coverage.
export const COUNTRY_MADHAB: Readonly<Record<string, MadhabId>> = {
  TR: "hanafi", // Turkey — Hanafi is the overwhelming majority convention
  PK: "hanafi", // Pakistan
  IN: "hanafi", // India — Hanafi is the majority among Indian Muslims
  BD: "hanafi", // Bangladesh
  AF: "hanafi", // Afghanistan
};

// The documented global default for any country not explicitly mapped
// above (or when no country is known at all) — the standard shadow-
// factor-1 Asr convention (Shafi'i, Maliki, and Hanbali jurisprudence all
// agree on this one). Unchanged from resolveCalculationSettings.ts's own
// previous hardcoded "shafi" — so every country not in the short list
// above, Kuwait included, resolves EXACTLY as it did before this table
// existed.
export const DEFAULT_MADHAB: MadhabId = "shafi";

export function getMadhabForCountry(countryCode: string | undefined): MadhabId {
  if (!countryCode) return DEFAULT_MADHAB;
  return COUNTRY_MADHAB[countryCode.toUpperCase()] ?? DEFAULT_MADHAB;
}
