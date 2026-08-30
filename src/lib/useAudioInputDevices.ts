import { useEffect, useState } from "react";
import { isAudioInputEnumerationSupported, listAudioInputDevices } from "./audioInputDevices";
import type { AudioInputDeviceInfo } from "./audioInputDevices";

// Enumerates audio input devices ONLY while `active` is true (i.e. Voice
// Tasbeeh is actually on) — never eagerly on mount, so this never touches
// `navigator.mediaDevices` (or risks a permission-adjacent prompt) before
// the user has already turned Voice Tasbeeh on at least once. Refreshes on
// the browser's own "devicechange" event (a headset connecting/
// disconnecting) so the list stays current for as long as `active`.
export function useAudioInputDevices(active: boolean) {
  const [devices, setDevices] = useState<AudioInputDeviceInfo[]>([]);
  const supported = isAudioInputEnumerationSupported();

  useEffect(() => {
    // Nothing to set up while inactive/unsupported — `effectiveDevices`
    // below already derives `[]` for that case directly at render time,
    // so there is no stale internal `devices` state to clear here.
    if (!active || !supported) return;

    let cancelled = false;
    const refresh = () => {
      listAudioInputDevices().then((list) => {
        if (!cancelled) setDevices(list);
      });
    };
    refresh();

    const mediaDevices = navigator.mediaDevices;
    mediaDevices.addEventListener("devicechange", refresh);
    return () => {
      cancelled = true;
      mediaDevices.removeEventListener("devicechange", refresh);
    };
  }, [active, supported]);

  // Derived rather than reset via an effect: whenever `active`/`supported`
  // flips false, this is immediately `[]` on the very next render, with no
  // extra setState-in-effect round trip.
  const effectiveDevices = active && supported ? devices : [];

  return {
    supported,
    devices: effectiveDevices,
    hasLikelyExternal: effectiveDevices.some((d) => d.likelyExternal),
    hasLikelyBuiltIn: effectiveDevices.some((d) => !d.likelyExternal),
  };
}
