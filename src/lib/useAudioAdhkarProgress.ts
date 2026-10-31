import { useEffect, useState } from "react";
import { readAudioAdhkarProgress } from "./audioAdhkarPlayer";
import type { AudioAdhkarProgress } from "./audioAdhkarPlayer";
import { usePageVisible } from "./pageVisibility";

/** How often the position is read while playing; the bar's CSS transition fills the time between reads. */
export const PROGRESS_POLL_MS = 500;

/**
 * The playing repetition's real position (lib/audioAdhkarPlayer.ts
 * readAudioAdhkarProgress), polled only while `playing` and the app is
 * visible — never while paused, stopped or in the background. Read once on
 * pause so the bar settles where playback stopped. `resetKey` (the item and
 * repetition) clears it when the track changes.
 */
/**
 * A reading made safe to show: a duration that is missing, zero, negative
 * or not a finite number (some files report NaN or Infinity until their
 * metadata loads) becomes `null` — "unknown", shown as --:--, never guessed;
 * the position is never negative and never past a known duration.
 */
export function cleanProgress(p: AudioAdhkarProgress | null | undefined): AudioAdhkarProgress | null {
  if (!p) return null;
  const durationMs = typeof p.durationMs === "number" && Number.isFinite(p.durationMs) && p.durationMs > 0 ? Math.round(p.durationMs) : null;
  const raw = typeof p.positionMs === "number" && Number.isFinite(p.positionMs) ? Math.max(0, p.positionMs) : 0;
  return { positionMs: Math.round(durationMs !== null ? Math.min(raw, durationMs) : raw), durationMs, loading: p.loading === true };
}

export function useAudioAdhkarProgress(active: boolean, playing: boolean, resetKey: string): AudioAdhkarProgress | null {
  const [progress, setProgress] = useState<AudioAdhkarProgress | null>(null);
  const visible = usePageVisible();
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    // A new item or repetition: start from nothing rather than the previous track's position.
    setLastKey(resetKey);
    setProgress(null);
  }

  useEffect(() => {
    if (!active || !visible) return;
    let cancelled = false;
    const read = () =>
      void readAudioAdhkarProgress().then((p) => {
        if (!cancelled) setProgress(cleanProgress(p));
      });
    read();
    if (!playing) return () => void (cancelled = true);
    const timer = window.setInterval(read, PROGRESS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, playing, visible, resetKey]);

  return active ? progress : null;
}

/** "mm:ss" (or "h:mm:ss" from an hour), ASCII digits; "--:--" for anything that isn't a real time. */
export function formatPlaybackTime(ms: number | null | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return "--:--";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
