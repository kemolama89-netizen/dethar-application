import { useCallback, useEffect, useRef, useState } from "react";

// Minimal "Listen" support for the Misc library cards — the browser's own
// built-in Web Speech API (SpeechSynthesis), not a new audio asset/CDN
// dependency. Reads the Arabic dhikr text aloud regardless of the app's
// current UI language (a dhikr is recited in Arabic; there is no separate
// audio file to link to per spec, so this is the lightest-weight way to
// give the four cards a working "Listen" action without inventing a whole
// audio pipeline). `speakingId` tracks at most one active utterance across
// every card sharing this hook instance (see MiscCategoryScreen/
// MiscLibraryScreen, which each own one instance) so only one card ever
// shows the "playing" state at a time.
export function useMiscSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  // Tracks the same value as `speakingId` state, read from inside `toggle`
  // instead of `speakingId` itself — keeps `toggle`'s identity stable
  // (depends only on `supported`, which never changes after mount) so it
  // can be passed straight down to every memoized MiscDuaCard without its
  // reference changing — and therefore without defeating that memoization
  // — every time any card's speaking state changes.
  const speakingIdRef = useRef<string | null>(null);
  useEffect(() => {
    speakingIdRef.current = speakingId;
  }, [speakingId]);

  // Stop any in-flight utterance if the screen unmounts (navigating away
  // mid-playback) — speechSynthesis is a shared, page-global resource, so
  // leaving it speaking after the user has left the screen would be a bug.
  useEffect(() => {
    if (!supported) return;
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  const toggle = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      if (speakingIdRef.current === id) {
        setSpeakingId(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ar-SA";
      utterance.onend = () => setSpeakingId((current) => (current === id ? null : current));
      utterance.onerror = () => setSpeakingId((current) => (current === id ? null : current));
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

  return { speakingId, toggle, supported };
}
