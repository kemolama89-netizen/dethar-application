// DITHAR — which reciter plays a Quranic recitation.
//
// The ONE place that turns the user's Quran reciter settings
// (quranAudioPreferences.ts) into a reciter for playback:
//
//   "specific"  → always the selected reciter.
//   "rotation"  → the available reciters in registry order (quranReciters.ts),
//                 one per Quranic recitation: each recitation started takes
//                 the next reciter, wrapping around. The position is
//                 persisted, so the order continues across launches.
//
// A recitation is chosen ONCE, when it starts (takeQuranReciterForPlayback),
// and that reciter is kept for all of its ayahs and repetitions — resume
// and the pause between repetitions never re-pick. Anything that only
// needs to know whether/what would play (availability, labels) uses
// peekQuranReciterForPlayback, which never advances the rotation.
//
// Scheduled (background) Evening playback can't run this JS, so the
// Android service applies the same rotation itself — see
// audioAdhkarSchedules.ts and AudioAdhkarRotation (AudioAdhkarLogic.kt).
//
// Only a reciter who plays on this device is ever returned
// (quranAudioDownloads.ts): in the Android app, a reciter not downloaded is
// replaced by the built-in one (the selection itself is kept), and the
// rotation goes through the reciters on the device.
import { getDefaultQuranReciter, getQuranReciterById } from "../data/quranReciters";
import type { QuranReciter } from "../data/quranReciters";
import {
  loadQuranReciterMode,
  loadQuranRotationIndex,
  loadSelectedQuranReciterId,
  saveQuranRotationIndex,
} from "./quranAudioPreferences";
import { getPlayableQuranReciters, playableQuranReciter } from "./quranAudioDownloads";

/** The rotation's reciters, in order: the available ones on this device. */
export function getQuranRotationReciters(): QuranReciter[] {
  return getPlayableQuranReciters();
}

function selectedReciter(): QuranReciter {
  return playableQuranReciter(getQuranReciterById(loadSelectedQuranReciterId()) ?? getDefaultQuranReciter());
}

function rotationSlot(): { reciters: QuranReciter[]; index: number } | null {
  const reciters = getQuranRotationReciters();
  if (reciters.length === 0) return null;
  return { reciters, index: loadQuranRotationIndex() % reciters.length };
}

/** The reciter the next Quranic recitation would use — without advancing the rotation. */
export function peekQuranReciterForPlayback(): QuranReciter {
  if (loadQuranReciterMode() !== "rotation") return selectedReciter();
  const slot = rotationSlot();
  return slot ? slot.reciters[slot.index] : selectedReciter();
}

/** The reciter for a Quranic recitation that is starting now; in rotation mode, advances to the next reciter. */
export function takeQuranReciterForPlayback(): QuranReciter {
  if (loadQuranReciterMode() !== "rotation") return selectedReciter();
  const slot = rotationSlot();
  if (!slot) return selectedReciter();
  saveQuranRotationIndex((slot.index + 1) % slot.reciters.length);
  return slot.reciters[slot.index];
}
