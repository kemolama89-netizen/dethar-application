// DITHAR — Quran reciter registry.
//
// The ONLY list of Quran reciters in the app. Everything else — the
// persisted preference (quranAudioPreferences.ts), the provider
// (QuranReciterContext.tsx), the audio resolver (quranAudio.ts) and the
// Settings > Quran Reciter picker — reads from here, so adding a reciter is
// adding one entry below and nothing else.
//
// This is Quran recitation ONLY. Non-Quran adhkar use their own fixed
// generated audio and never read the selected reciter.
//
// ID RULES (these ids are persisted on users' devices):
//   - An id is permanent. Never rename one, and never reuse one for a
//     different voice or recording style — the style is part of the id
//     because the same reciter's murattal and mujawwad recordings are
//     different audio.
//   - To retire a reciter, set `available: false` instead of deleting the
//     entry: a stored id then still resolves to a known reciter, users who
//     picked it fall back to the default until it returns, and their saved
//     choice is kept rather than overwritten.
//
// AUDIO: every reciter's recitation is bundled with the app (offline, so
// scheduled Evening playback never needs the network) — the original
// EveryAyah.com ayah-by-ayah files, copied unchanged from that reciter's
// `everyAyahFolder` into public/audio/quran/{id}/ (see quranAudioBundle.ts
// for which ayahs are bundled).
//
// BASMALA: every Quranic recitation (Ayat al-Kursi, al-Ikhlas, al-Falaq,
// an-Nas) starts with the basmala, before EVERY repetition — never between
// its ayahs — always in the SAME reciter's own voice, never another
// reciter's or a generated one. Each reciter's `basmala` says where his
// comes from (see QuranBasmala); one with no voice-verified basmala plays
// none rather than a borrowed one.

export type QuranReciterStyle = "murattal" | "mujawwad";

/**
 * Where a reciter's recitation audio comes from. A discriminated union so a
 * new hosting scheme is a new `kind` handled in one place
 * (quranAudio.ts's resolveQuranAudio), never a change to callers.
 */
export type QuranAudioSource =
  /** No audio hosting chosen yet — resolves to "unavailable". */
  | { kind: "unconfigured" }
  /**
   * One file per ayah, named by zero-padded surah + ayah number
   * ("002255.mp3" for 2:255) under `baseUrl`. Relative `baseUrl`s must
   * already include Vite's `import.meta.env.BASE_URL` (the app is served
   * from a GitHub Pages subpath).
   */
  | { kind: "per-ayah"; baseUrl: string; extension: "mp3" }
  /**
   * The original EveryAyah.com per-ayah files
   * (https://everyayah.com/data/{everyAyahFolder}/{SSS}{AAA}.mp3), bundled
   * with the app at public/audio/quran/{reciter id}/{SSS}{AAA}.mp3 — only
   * the ayahs in quranAudioBundle.ts. Plays offline.
   */
  | { kind: "bundled"; everyAyahFolder: string; basmala: QuranBasmala };

/**
 * The reciter's own basmala, played before every repetition of a Quranic
 * recitation (see quranAudio.ts). Every voiced one is bundled as
 * {id}/basmala.mp3 — cut, where noted, without re-encoding.
 *  - "separate": his own recording of it, voice-verified against his
 *    recitation of the surahs played here. `source` = where in his own
 *    EveryAyah folder it comes from: "1:1" — al-Fatiha 1:1 (= the
 *    basmala), unchanged; or "27:30" — the basmala that ends an-Naml 27:30,
 *    cut from `from` seconds (where his «بسم» begins in that continuous take).
 *  - "in-first-ayah": his first-ayah files of al-Ikhlas, al-Falaq and an-Nas
 *    already open with it, so those play as they are (nothing added). His
 *    basmala.mp3 — for Ayat al-Kursi — is the start of his own 112:1, up to
 *    `ayahStartsAt[112]`; `ayahStartsAt` records, per surah, where his ayah
 *    begins after it (each point verified by transcription).
 *  - "none": no recording of it in his own voice could be verified, so no
 *    basmala plays for him (never another reciter's).
 */
export type QuranBasmala =
  | { kind: "separate"; source: "1:1" }
  | { kind: "separate"; source: "27:30"; from: number }
  | { kind: "in-first-ayah"; ayahStartsAt: Readonly<Record<number, number>> }
  | { kind: "none" };

export interface QuranReciter {
  /** Permanent, persisted id — see ID RULES above. */
  id: string;
  name: { ar: string; en: string };
  style: QuranReciterStyle;
  audio: QuranAudioSource;
  /** False = hidden from the picker and never selected; the entry is kept so old stored ids stay recognizable. */
  available: boolean;
}

export const QURAN_RECITERS: readonly QuranReciter[] = [
  {
    id: "abdulbasit-murattal",
    name: { ar: "عبد الباسط عبد الصمد", en: "Abdul Basit Abdus Samad" },
    style: "murattal",
    // EveryAyah has no 128 kbps Murattal for him (64 or 192 only).
    audio: { kind: "bundled", everyAyahFolder: "Abdul_Basit_Murattal_192kbps", basmala: { kind: "separate", source: "1:1" } },
    available: true,
  },
  {
    id: "minshawi-murattal",
    name: { ar: "محمد صديق المنشاوي", en: "Mohamed Siddiq al-Minshawi" },
    style: "murattal",
    audio: { kind: "bundled", everyAyahFolder: "Minshawy_Murattal_128kbps", basmala: { kind: "separate", source: "1:1" } },
    available: true,
  },
  {
    id: "husary-murattal",
    name: { ar: "محمود خليل الحصري", en: "Mahmoud Khalil al-Husary" },
    style: "murattal",
    audio: { kind: "bundled", everyAyahFolder: "Husary_128kbps", basmala: { kind: "separate", source: "1:1" } },
    available: true,
  },
  {
    id: "alafasy-murattal",
    name: { ar: "مشاري راشد العفاسي", en: "Mishary Rashid Alafasy" },
    style: "murattal",
    audio: { kind: "bundled", everyAyahFolder: "Alafasy_128kbps", basmala: { kind: "separate", source: "1:1" } },
    available: true,
  },
  {
    id: "sudais-murattal",
    name: { ar: "عبد الرحمن السديس", en: "Abdul Rahman Al-Sudais" },
    style: "murattal",
    // EveryAyah has no 128 kbps folder for him (64 or 192 only).
    // No recording of the basmala could be voice-verified as his: his
    // folder's 1:1 is a different recording, and neither his 27:30 (nor that
    // An-Naml session) nor his MP3Quran al-Ikhlas match his voice here — so
    // he plays none rather than an unverified one.
    audio: { kind: "bundled", everyAyahFolder: "Abdurrahmaan_As-Sudais_192kbps", basmala: { kind: "none" } },
    available: true,
  },
  {
    id: "muaiqly-murattal",
    name: { ar: "ماهر المعيقلي", en: "Maher Al-Muaiqly" },
    style: "murattal",
    audio: { kind: "bundled", everyAyahFolder: "MaherAlMuaiqly128kbps", basmala: { kind: "separate", source: "27:30", from: 3.739 } },
    available: true,
  },
  {
    id: "dosari-murattal",
    name: { ar: "ياسر الدوسري", en: "Yasser Al-Dosari" },
    style: "murattal",
    audio: { kind: "bundled", everyAyahFolder: "Yasser_Ad-Dussary_128kbps", basmala: { kind: "separate", source: "27:30", from: 5.429 } },
    available: true,
  },
  {
    id: "qatami-murattal",
    name: { ar: "ناصر القطامي", en: "Nasser Al-Qatami" },
    style: "murattal",
    audio: { kind: "bundled", everyAyahFolder: "Nasser_Alqatami_128kbps", basmala: { kind: "separate", source: "27:30", from: 5.204 } },
    available: true,
  },
  {
    id: "banna-murattal",
    name: { ar: "محمود علي البنا", en: "Mahmoud Ali Al-Banna" },
    style: "murattal",
    // EveryAyah's only folder for him (32 kbps, mono 22.05 kHz).
    audio: { kind: "bundled", everyAyahFolder: "mahmoud_ali_al_banna_32kbps", basmala: { kind: "in-first-ayah", ayahStartsAt: { 112: 5.02, 113: 5.26, 114: 5.36 } } },
    available: true,
  },
  {
    id: "mustafaismail-mujawwad",
    name: { ar: "مصطفى إسماعيل", en: "Mustafa Ismail" },
    // EveryAyah's only folder for him (48 kbps, mono), listed as Mujawwad
    // in the quran-audio reciter metadata.
    style: "mujawwad",
    audio: { kind: "bundled", everyAyahFolder: "Mustafa_Ismail_48kbps", basmala: { kind: "in-first-ayah", ayahStartsAt: { 112: 6.58, 113: 7.08, 114: 6.78 } } },
    available: true,
  },
];

export const DEFAULT_QURAN_RECITER_ID = "abdulbasit-murattal";

export function getQuranReciterById(id: string): QuranReciter | undefined {
  return QURAN_RECITERS.find((r) => r.id === id);
}

/** Reciters the user may pick right now (the picker's list). */
export function getAvailableQuranReciters(): QuranReciter[] {
  return QURAN_RECITERS.filter((r) => r.available);
}

/** Always returns a usable reciter: the default one. */
export function getDefaultQuranReciter(): QuranReciter {
  const reciter = getQuranReciterById(DEFAULT_QURAN_RECITER_ID);
  if (!reciter || !reciter.available) {
    // Registry invariant, enforced by quranReciters.test.ts — never reached
    // in a shipped build.
    throw new Error(`Default Quran reciter "${DEFAULT_QURAN_RECITER_ID}" is missing or unavailable`);
  }
  return reciter;
}
