// Islamic days and occasions for the RECURRING Miscellaneous audio dhikr
// (the one that plays a dhikr every few minutes inside its window). On
// these days it plays only the dhikr below — its own window and interval
// unchanged — and goes back to the user's normal rotation (where it left
// off) the next day. Morning/Evening Adhkar are never changed.
//
// Only occasions where the chosen dhikr is supported by reliable evidence,
// and only dhikr the app already has recordings for:
//
//   friday       الصلاة على النبي ﷺ (tasbeeh-9)
//                «إنَّ من أفضلِ أيامِكم يومَ الجمعةِ … فأكثِروا عليَّ من الصلاةِ فيه»
//                — Abu Dawud 1047, al-Nasa'i 1374, Ibn Majah 1085 (sahih per al-Albani).
//   arafah       «لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير» (tasbeeh-6)
//                «خيرُ الدعاءِ دعاءُ يومِ عرفةَ، وخيرُ ما قلتُ أنا والنبيُّون من قبلي: لا إله إلا الله…»
//                — al-Tirmidhi 3585 (hasan per al-Albani).
//   dhulhijjah   1–8 Dhul-Hijjah: tahlil, takbir, tahmid (tasbeeh-11, -12, -8)
//                The virtue of good deeds in the ten days — al-Bukhari 969;
//                Ibn 'Umar and Abu Hurayrah's takbir in the ten days —
//                al-Bukhari, Kitab al-'Idayn (mu'allaq); Qur'an 22:28;
//                «فأكثِروا فيهنَّ من التهليلِ والتكبيرِ والتحميدِ» — Ahmad 5446
//                (isnad graded sahih by Ahmad Shakir).
//   eid          1 Shawwal and 10 Dhul-Hijjah, and the days of tashreeq
//                (11–13): dhikr with takbir (tasbeeh-16 — Muslim 601;
//                tasbeeh-11 — Muslim 2137) — Qur'an 2:185 and 2:203;
//                «أيامُ التشريقِ أيامُ أكلٍ وشربٍ وذكرٍ لله» — Muslim 1141.
//                (For Eid al-Fitr the takbir is emphasized until the prayer;
//                both phrases remain general dhikr praised all day.)
//
// Ramadan is deliberately NOT here: no specific recurring dhikr formula for
// the days of Ramadan is established that the app has a recording for (the
// Laylat al-Qadr dua has none), so the normal rotation stays.
//
// Friday wins over every other occasion (the requirement is unconditional),
// then Arafah, Eid/tashreeq, and the first days of Dhul-Hijjah. Friday is
// decided natively from the device's own weekday — it needs no Hijri date
// and never runs out. The Hijri occasions come from Intl's Umm al-Qura
// calendar, moved by the user's adjustment (hijriAdjustment.ts) for regions
// that start months by local sighting; they are pushed as 30 days of local
// day windows. When the runtime has no Umm al-Qura calendar, no Hijri
// occasion is assumed (the normal rotation plays) — only Friday applies.
import { AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import type { NativePlaylistItem } from "./audioAdhkarNative";
import { nativeVariousItem } from "./audioAdhkarNativeItems";
import { loadHijriAdjustment } from "./hijriAdjustment";

export type OccasionKey = "friday" | "arafah" | "eid" | "dhulhijjah";
export const OCCASION_KEYS: readonly OccasionKey[] = ["friday", "arafah", "eid", "dhulhijjah"];

/** The dhikr each occasion plays (Audio "Various" ids), in rotation order. */
export const OCCASION_DHIKR: Readonly<Record<OccasionKey, readonly string[]>> = {
  friday: ["tasbeeh-9"],
  arafah: ["tasbeeh-6"],
  eid: ["tasbeeh-16", "tasbeeh-11"],
  dhulhijjah: ["tasbeeh-11", "tasbeeh-12", "tasbeeh-8"],
};

export interface OccasionSettings {
  /** Adapt the Misc dhikr to Fridays and occasions (on by default). */
  enabled: boolean;
}

const KEY = "dithar:islamic-occasions:v1";

export function loadOccasionSettings(): OccasionSettings {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return { enabled: !(parsed && typeof parsed === "object" && (parsed as OccasionSettings).enabled === false) };
  } catch {
    return { enabled: true };
  }
}

export function saveOccasionSettings(settings: OccasionSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled: settings.enabled }));
  } catch {
    // Best effort.
  }
}

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

/** Whether this runtime can convert to the Umm al-Qura calendar at all. */
export function hasUmmAlQura(): boolean {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura").resolvedOptions().calendar === "islamic-umalqura";
  } catch {
    return false;
  }
}

/** The Umm al-Qura date of the device-local day `date` falls on, moved by `adjustment` days; null when unavailable. */
export function hijriDateOf(date: Date, adjustment: number = loadHijriAdjustment()): HijriDate | null {
  if (!hasUmmAlQura()) return null;
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate() + adjustment, 12);
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(noon);
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value?.replace(/\D/g, ""));
  const year = num("year");
  const month = num("month");
  const day = num("day");
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30) return null;
  return { year, month, day };
}

/** The Hijri occasion of a Hijri date (Friday aside), or null. */
export function hijriOccasion(h: HijriDate | null): Exclude<OccasionKey, "friday"> | null {
  if (!h) return null;
  if (h.month === 12 && h.day === 9) return "arafah";
  if ((h.month === 10 && h.day === 1) || (h.month === 12 && h.day >= 10 && h.day <= 13)) return "eid";
  if (h.month === 12 && h.day >= 1 && h.day <= 8) return "dhulhijjah";
  return null;
}

/** The occasion the device-local day of `date` is (Friday first), or null for a normal day. */
export function occasionFor(date: Date, adjustment: number = loadHijriAdjustment()): OccasionKey | null {
  if (date.getDay() === 5) return "friday";
  return hijriOccasion(hijriDateOf(date, adjustment));
}

export interface OccasionPush {
  occasionsEnabled: boolean;
  /** [local day start, next local midnight, key] — Hijri occasions only (native decides Friday itself). */
  occasions: (readonly [number, number, OccasionKey])[];
  occasionPlaylists: Record<OccasionKey, NativePlaylistItem[]>;
}

/** What native needs to adapt the Misc dhikr for the next `days` local days. */
export function buildOccasionPush(now: Date = new Date(), days = 30, settings = loadOccasionSettings(), adjustment = loadHijriAdjustment()): OccasionPush {
  const occasionPlaylists = {} as Record<OccasionKey, NativePlaylistItem[]>;
  for (const key of OCCASION_KEYS) {
    occasionPlaylists[key] = OCCASION_DHIKR[key].flatMap((id) => {
      const item = AUDIO_VARIOUS_ITEMS.find((i) => i.id === id);
      const native = item ? nativeVariousItem(item) : null;
      return native ? [native] : [];
    });
  }
  const occasions: (readonly [number, number, OccasionKey])[] = [];
  if (settings.enabled) {
    for (let offset = 0; offset < days; offset++) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + 1);
      const key = hijriOccasion(hijriDateOf(start, adjustment));
      if (key) occasions.push([start.getTime(), end.getTime(), key] as const);
    }
  }
  return { occasionsEnabled: settings.enabled, occasions, occasionPlaylists };
}
