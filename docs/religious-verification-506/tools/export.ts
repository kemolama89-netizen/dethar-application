// Exports exactly what the app holds for the 506 audited items (read-only).
import { ENRICHED_HADITHS } from "../../../src/data/widgetContent";
import { STARTUP_HADITH } from "../../../src/data/startupHadith";
import { WAMDAT, getWamdaVerseText, getWamdaVerseReference, getWamdaQuranRef } from "../../../src/data/wamdat";
import { QURAN_LATAIF } from "../../../src/data/quranLataif";
import { HADITHS } from "../../../src/data/hadith";
import { writeFileSync } from "fs";
const out: Record<string, unknown> = {};
for (const h of HADITHS) out["hadith:" + h.id] = { kind: "hadith-library", ...h };
for (const h of ENRICHED_HADITHS) out["hadith:" + h.id] = { kind: "hadith-enriched", ...h };
out["startup:tirmidhi-3377"] = { kind: "hadith-startup", ...STARTUP_HADITH };
for (const w of WAMDAT) out["lataif:w" + w.id] = { kind: "wamada", ...w, verseShown: getWamdaVerseText(w), verseRefShown: getWamdaVerseReference(w), quranRef: getWamdaQuranRef(w) };
for (const q of QURAN_LATAIF) out["lataif:" + q.id] = { kind: "saadi", ...q };
writeFileSync(process.env.OUT as string, JSON.stringify(out, null, 1));
