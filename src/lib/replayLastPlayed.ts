// Plays the remembered dhikr again (the Home screen's idle player). Loaded
// only when the button is pressed: it brings the audio data and player.
import { audioAdhkarItems, AUDIO_VARIOUS_ITEMS } from "../data/audio-adhkar";
import { startAudioAdhkar, startAudioVarious } from "./audioAdhkarPlayer";
import type { LastPlayedDhikr } from "./lastPlayedDhikr";

/** False when the dhikr no longer exists or has no recording. */
export function replayLastPlayed(last: LastPlayedDhikr): boolean {
  if (last.collection === "misc") {
    const item = AUDIO_VARIOUS_ITEMS.find((i) => i.id === last.itemId);
    return item ? startAudioVarious(item) : false;
  }
  const item = audioAdhkarItems[last.collection]?.find((i) => i.id === last.itemId);
  return item ? startAudioAdhkar(last.collection, item) : false;
}
