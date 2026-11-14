import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { quranReciterStyleLabels } from "../data/settings";
import { quranAudioLabels } from "../data/quranAudioLabels";
import { audioAdhkarSettingsLabels } from "../data/audioAdhkarSettingsLabels";
import { getAvailableQuranReciters, getDefaultQuranReciter } from "../data/quranReciters";
import type { QuranReciter } from "../data/quranReciters";
import { OptionRow } from "./OptionRow";
import { QuranReciterControls } from "./QuranReciterControls";
import { getActiveAudio, playUrlQueue, stopAudio, subscribeAudio } from "../lib/audioEngine";
import { getNowPlaying, subscribeAudioAdhkarPlayback } from "../lib/audioAdhkarPlayback";
import { useBackDismiss } from "../lib/backOverlays";
import type { SectionReciterChoice } from "../lib/audioAdhkarScheduleSettings";
import {
  isQuranReciterOnDevice,
  quranAudioDownloadsVersion,
  quranAudioOnDemand,
  quranAudioStorageNotice,
  quranDownloadsOffered,
  quranPreviewUrls,
  refreshQuranAudioDownloads,
  subscribeQuranAudioDownloads,
} from "../lib/quranAudioDownloads";

// Settings → الأذكار الصوتية → الصباح / المساء → قارئ الآيات القرآنية: the section's
// reciter, chosen from every reciter (or a random one per dhikr), each with a
// short sample to listen to and — in the Android app and the web app — Download,
// its progress and Cancel, Retry and Remove (QuranReciterControls,
// lib/quranAudioDownloads.ts). In the Android app al-Husary is built in; a
// chosen reciter not yet downloaded stays the choice, and the screen says who
// plays meanwhile. Same header and OptionRow pattern as the Settings sub-pages.
const sampleKey = (id: string) => `quran-sample:${id}`;

export function QuranReciterPicker({ title, choice, onChoose, onBack }: { title: string; choice: SectionReciterChoice; onChoose: (choice: SectionReciterChoice) => void; onBack: () => void }) {
  const { language, dir } = useLanguage();
  const q = quranAudioLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  useSyncExternalStore(subscribeQuranAudioDownloads, quranAudioDownloadsVersion);
  const reciters = getAvailableQuranReciters();
  const onDemand = quranAudioOnDemand();
  const offered = quranDownloadsOffered();
  // Removing a reciter's files while Audio Adhkar plays could pull them from under the player.
  const adhkarPlaying = useSyncExternalStore(subscribeAudioAdhkarPlayback, () => {
    const now = getNowPlaying();
    return !!now && now.status !== "finished";
  });
  useEffect(() => void refreshQuranAudioDownloads(), []);
  // System Back returns to the section's page.
  useBackDismiss(true, onBack);
  const builtInName = getDefaultQuranReciter().name[language];

  // The sample playing (its key), and one that failed to play.
  const [playingKey, setPlayingKey] = useState<string | null>(() => (getActiveAudio()?.channel === "preview" ? getActiveAudio()!.key : null));
  const [sampleError, setSampleError] = useState<string | null>(null);
  const ownKey = useRef<string | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeAudio((active) => setPlayingKey(active?.channel === "preview" ? active.key : null));
    return () => {
      unsubscribe();
      // Leaving the screen stops our own sample.
      if (ownKey.current && getActiveAudio()?.key === ownKey.current) stopAudio("preview");
    };
  }, []);
  const toggleSample = (reciter: QuranReciter) => {
    const key = sampleKey(reciter.id);
    setSampleError(null);
    if (playingKey === key) {
      stopAudio("preview");
      return;
    }
    ownKey.current = key;
    playUrlQueue("preview", key, quranPreviewUrls(reciter).urls, { onError: () => setSampleError(reciter.id) });
  };

  const muted = { color: "var(--color-text-muted)" };
  const label = (reciter: QuranReciter) => `${reciter.name[language]} — ${quranReciterStyleLabels[reciter.style][language]}`;

  return (
    <div className="flex flex-1 flex-col" data-quran-reciter-picker="">
      <div className="dithar-sticky-header mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={audioAdhkarSettingsLabels[language].back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2">
        {offered && (
          <p className="px-1 text-[11.5px] leading-relaxed" style={muted} data-quran-on-demand-note="">
            {onDemand ? q.onDemandNote(builtInName) : q.webNote}
          </p>
        )}
        {quranAudioStorageNotice() === "unavailable" && (
          <p className="px-1 text-[11.5px] leading-relaxed" role="status" style={muted} data-quran-storage-notice="">
            {q.storageUnavailable}
          </p>
        )}

        <div className="flex flex-col gap-1" data-quran-reciter-option="random">
          <OptionRow label={q.randomOption} selected={choice === "random"} onSelect={() => onChoose("random")} />
          {onDemand && (
            <p className="px-1 text-[11.5px] leading-relaxed" style={muted} data-quran-rotation-on-device="">
              {q.rotationOnDevice}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12.5px] font-semibold" style={muted}>
            {q.listTitle}
          </p>
          <div className="flex flex-col gap-3.5">
            {reciters.map((reciter) => (
              // Each reciter's controls sit close under his row, farther from the next reciter.
              <div key={reciter.id} className="flex flex-col gap-1" data-quran-reciter-option={reciter.id}>
                <OptionRow label={label(reciter)} selected={choice === reciter.id} onSelect={() => onChoose(reciter.id)} />
                {choice === reciter.id && !isQuranReciterOnDevice(reciter.id) && (
                  <p className="flex items-start gap-1.5 px-1 text-[12px] font-semibold leading-relaxed" role="status" style={{ color: "var(--color-primary)" }} data-quran-chosen-pending="">
                    <Info size={14} strokeWidth={2} className="mt-[3px] shrink-0" style={{ color: "var(--color-gold)" }} aria-hidden="true" />
                    {q.chosenPending(builtInName, reciter.name[language])}
                  </p>
                )}
                <QuranReciterControls reciter={reciter} playing={playingKey === sampleKey(reciter.id)} sampleFailed={sampleError === reciter.id} canRemove={!adhkarPlaying} onListen={() => toggleSample(reciter)} />
              </div>
            ))}
          </div>
        </div>

        {offered && adhkarPlaying && (
          <p className="px-1 text-[11.5px] leading-relaxed" style={muted} data-quran-remove-blocked="">
            {q.removeWhilePlaying}
          </p>
        )}
      </div>
    </div>
  );
}
