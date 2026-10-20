import { useEffect, useState } from "react";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";
import type { AudioAdhkarProgress } from "./audioAdhkarPlayer";
import { cleanProgress, PROGRESS_POLL_MS } from "./useAudioAdhkarProgress";
import { usePageVisible } from "./pageVisibility";

// Kept out of lib/adhanPlayback.ts so the Home screen's startup bundle (which
// reads the adhan state) doesn't pull in the adhkar player; only the lazily
// loaded now-playing panel (HomeAdhanNowPlaying) uses it.

const ignore = () => {};

/** The adhan's real position in its segment, polled only while it plays and the app is visible (like useAudioAdhkarProgress). */
export function useAdhanProgress(active: boolean, playing: boolean): AudioAdhkarProgress | null {
  const [progress, setProgress] = useState<AudioAdhkarProgress | null>(null);
  const visible = usePageVisible();
  useEffect(() => {
    if (!active || !visible || !isAudioAdhkarNativeAvailable()) return;
    let cancelled = false;
    const read = () =>
      void AudioAdhkarNative.getAdhanProgress()
        .then((p) => {
          if (!cancelled) setProgress(p.active ? cleanProgress({ positionMs: p.positionMs, durationMs: p.durationMs ?? null, loading: p.loading }) : null);
        })
        .catch(ignore);
    read();
    if (!playing) return () => void (cancelled = true);
    const timer = window.setInterval(read, PROGRESS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, playing, visible]);
  return active ? progress : null;
}
