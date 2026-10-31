import { createContext } from "react";

/**
 * Opens the Qur'an reader (at the saved reading position). Provided once by
 * AppRouter, so every screen's BottomNav reaches the Mushaf without each
 * screen taking its own navigation callback for it.
 */
export const QuranNavContext = createContext<(() => void) | null>(null);
