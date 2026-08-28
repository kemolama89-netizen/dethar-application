import { useCallback, useEffect, useState } from "react";

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
      if (speakingId === id) {
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
    [speakingId, supported],
  );

  return { speakingId, toggle, supported };
}
