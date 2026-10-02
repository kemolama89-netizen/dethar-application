import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getAvailableQuranReciters, getDefaultQuranReciter, getQuranReciterById } from "../data/quranReciters";
import type { QuranReciter } from "../data/quranReciters";
import {
  isQuranReciterMode,
  isSelectableQuranReciterId,
  loadQuranReciterMode,
  loadSelectedQuranReciterId,
  saveQuranReciterMode,
  saveSelectedQuranReciterId,
} from "../lib/quranAudioPreferences";
import type { QuranReciterMode } from "../lib/quranAudioPreferences";
import { stopAudio } from "../lib/audioEngine";
import { syncEveningAudioSchedule } from "../lib/eveningAudioSchedule";

interface QuranReciterContextValue {
  selectedReciterId: string;
  selectedReciter: QuranReciter;
  /** Ignores ids that aren't a currently available reciter. */
  setSelectedReciterId: (id: string) => void;
  /** "specific" = always the selected reciter; "rotation" = the reciters in turn (quranReciterSelection.ts). */
  mode: QuranReciterMode;
  setMode: (mode: QuranReciterMode) => void;
  /** The reciters the user can pick from (= the rotation, in order). */
  reciters: QuranReciter[];
}

const QuranReciterContext = createContext<QuranReciterContextValue | null>(null);

// The single source of truth for which reciter Quran audio uses — every
// Quran playback location reads `selectedReciter` from here and passes it to
// quranAudio.ts's resolver at the moment playback starts. Same shape as
// LanguageProvider: restored synchronously from its own persisted key
// (quranAudioPreferences.ts) as the lazy initial state, saved immediately on
// change. Independent of language/theme/palette — changing one never
// touches another.
//
// Changing the reciter or the mode stops any Quran recitation currently
// playing (it was resolved for the previous choice); other audio channels
// are untouched. Either change also re-syncs the scheduled Evening
// playlist, whose Quranic items carry the reciter choice to Android.
export function QuranReciterProvider({ children }: { children: ReactNode }) {
  const [selectedReciterId, setSelectedReciterIdState] = useState<string>(() => loadSelectedQuranReciterId());
  // Mirrors the state so the setter can compare without a side effect
  // inside a state updater, while keeping a stable identity.
  const selectedRef = useRef(selectedReciterId);

  const setSelectedReciterId = useCallback((id: string) => {
    if (!isSelectableQuranReciterId(id) || id === selectedRef.current) return;
    selectedRef.current = id;
    stopAudio("quran");
    setSelectedReciterIdState(id);
    saveSelectedQuranReciterId(id);
    void syncEveningAudioSchedule().catch(() => {});
  }, []);

  const [mode, setModeState] = useState<QuranReciterMode>(() => loadQuranReciterMode());
  const modeRef = useRef(mode);
  const setMode = useCallback((next: QuranReciterMode) => {
    if (!isQuranReciterMode(next) || next === modeRef.current) return;
    modeRef.current = next;
    stopAudio("quran");
    setModeState(next);
    saveQuranReciterMode(next);
    void syncEveningAudioSchedule().catch(() => {});
  }, []);

  const value = useMemo<QuranReciterContextValue>(
    () => ({
      selectedReciterId,
      selectedReciter: getQuranReciterById(selectedReciterId) ?? getDefaultQuranReciter(),
      setSelectedReciterId,
      mode,
      setMode,
      reciters: getAvailableQuranReciters(),
    }),
    [selectedReciterId, setSelectedReciterId, mode, setMode],
  );

  return <QuranReciterContext.Provider value={value}>{children}</QuranReciterContext.Provider>;
}

export function useQuranReciter() {
  const ctx = useContext(QuranReciterContext);
  if (!ctx) throw new Error("useQuranReciter must be used within a QuranReciterProvider");
  return ctx;
}
