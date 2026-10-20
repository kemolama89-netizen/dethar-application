import { Pause, Play, Square } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { homeDashboardLabels } from "../data/homeDashboardLabels";
import { NowPlayingPanel, NowPlayingView } from "./AudioAdhkarScreen";
import { audioAdhkarItems, AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import { pauseAudioAdhkar, resumeAudioAdhkar, stopAudioAdhkarPlayback } from "../lib/audioAdhkarPlayer";
import type { AudioAdhkarNowPlaying } from "../lib/audioAdhkarPlayback";
import { pauseAdhan, resumeAdhan, stopAdhan } from "../lib/adhanPlayback";
import { useAdhanProgress } from "../lib/useAdhanProgress";
import type { AdhanNowPlaying } from "../lib/adhanPlayback";

// The Home screen player while a dhikr is playing or paused — loaded only
// then (it brings the audio player module with it), so Home itself stays
// light. Shows the same now-playing panel as Audio Adhkar: the dhikr's
// name, the reciter when the player reports one, real progress and
// "00:18 / 02:45", and a waveform only while it plays.

function titleOf(collection: AudioAdhkarNowPlaying["collection"], itemId: string, language: "ar" | "en"): string | undefined {
  if (collection === "misc") {
    const item = AUDIO_VARIOUS_ITEMS.find((i) => i.id === itemId);
    return item ? (language === "en" && item.text_en ? item.text_en : item.text_ar) : undefined;
  }
  const item = audioAdhkarItems[collection]?.find((i) => i.id === itemId);
  return item ? ((language === "en" ? item.title_en : item.title_ar) ?? item.title_ar) : undefined;
}

export function HomeNowPlaying({ playback }: { playback: AudioAdhkarNowPlaying }) {
  const { language } = useLanguage();
  const t = homeDashboardLabels[language];
  const playing = playback.status === "playing";
  return (
    <div data-home-now-playing={playback.status}>
      <NowPlayingPanel
        title={titleOf(playback.collection, playback.itemId, language)}
        playback={playback}
        large
        trailing={
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => (playing ? pauseAudioAdhkar() : resumeAudioAdhkar())}
              aria-label={playing ? t.pause : t.resume}
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}
              data-home-player-toggle={playing ? "pause" : "resume"}
            >
              {playing ? <Pause size={19} /> : <Play size={19} />}
            </button>
            <button
              type="button"
              onClick={() => stopAudioAdhkarPlayback()}
              aria-label={t.stop}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold-soft)", color: "var(--color-text-primary)" }}
              data-home-player-stop=""
            >
              <Square size={15} />
            </button>
          </span>
        }
      />
    </div>
  );
}

/**
 * The Home screen player while the scheduled adhan plays — the same panel as
 * a dhikr: «الأذان», the muezzin when the recording reliably says who it is,
 * real progress within the adhan's segment and its length. "waiting" means
 * another app or a call took the audio: the adhan is paused and continues by
 * itself (native AdhanFocusPolicy), which the panel says. Pause/resume and
 * stop act on the adhan only; nothing here can start or restart it.
 */
export function HomeAdhanNowPlaying({ adhan }: { adhan: AdhanNowPlaying }) {
  const { language } = useLanguage();
  const t = homeDashboardLabels[language];
  const playing = adhan.status === "playing";
  const progress = useAdhanProgress(true, playing);
  const note = adhan.status === "waiting" ? t.adhanWaiting : adhan.status === "paused" ? t.adhanPaused : null;
  const subtitle = (
    <>
      {adhan.muezzin && (
        <span data-adhan-muezzin="">
          {t.muezzin}: {adhan.muezzin}
        </span>
      )}
      {adhan.muezzin && note ? " · " : null}
      {note && <span data-adhan-note={adhan.status}>{note}</span>}
    </>
  );
  return (
    <div data-home-now-playing={adhan.status} data-home-adhan="">
      <NowPlayingView
        title={t.adhan}
        subtitle={subtitle}
        status={adhan.status}
        progress={progress}
        large
        trailing={
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => (playing ? pauseAdhan() : resumeAdhan())}
              aria-label={playing ? t.pause : t.resume}
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}
              data-home-player-toggle={playing ? "pause" : "resume"}
            >
              {playing ? <Pause size={19} /> : <Play size={19} />}
            </button>
            <button
              type="button"
              onClick={() => stopAdhan()}
              aria-label={t.stop}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold-soft)", color: "var(--color-text-primary)" }}
              data-home-player-stop=""
            >
              <Square size={15} />
            </button>
          </span>
        }
      />
    </div>
  );
}
