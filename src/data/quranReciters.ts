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
// PHASE 1: audio hosting has not been chosen yet, so every entry's `audio`
// is `{ kind: "unconfigured" }` and the resolver reports it as
// unavailable. Plugging in real audio later means replacing that one field
// per reciter — the player architecture does not change.

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
  | { kind: "per-ayah"; baseUrl: string; extension: "mp3" };

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
    audio: { kind: "unconfigured" },
    available: true,
  },
  {
    id: "minshawi-murattal",
    name: { ar: "محمد صديق المنشاوي", en: "Mohamed Siddiq al-Minshawi" },
    style: "murattal",
    audio: { kind: "unconfigured" },
    available: true,
  },
  {
    id: "husary-murattal",
    name: { ar: "محمود خليل الحصري", en: "Mahmoud Khalil al-Husary" },
    style: "murattal",
    audio: { kind: "unconfigured" },
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
