import { createContext } from "react";

/**
 * Opens the Adhkar screen (its two cards: Audio Adhkar and Written Adhkar).
 * Provided once by AppRouter, so every screen's BottomNav reaches it without
 * each screen taking its own navigation callback for it — as QuranNavContext.
 */
export const AdhkarNavContext = createContext<(() => void) | null>(null);
