import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { backOverlayCount, dismissTopBackOverlay, subscribeBackOverlays } from "./backOverlays";

// Back-navigation for AppRouter's existing in-memory screen switcher — no
// router library. `navigate` is a drop-in replacement for the plain
// `setScreen` the switcher used before; on top of it this hook keeps a
// stack of the screens the user actually walked through, so the system Back
// action returns to the PREVIOUS screen instead of leaving the app.
//
// Stack rules (see navigate): entering a screen that is already in the
// stack rewinds the stack to it instead of pushing a duplicate, so the
// stack is bounded by the number of distinct screens, the on-screen "back"
// buttons (which just call navigate(parent)) pop it exactly like the system
// Back does, and navigating Home always resets it to [home].
//
// Android (Capacitor): registering a `backButton` listener replaces
// Capacitor's default (which finishes the app when the WebView has no
// history — always the case here). The handler pops the stack, and only on
// the root screen exits, which is exactly what Back did there before.
//
// Browser: History API. While the stack is deeper than the root OR an
// overlay is open (see backOverlays.ts), ONE guard entry sits on top of the
// history. Back consumes it (popstate) and we dismiss the topmost overlay,
// else pop our stack, and put a fresh guard back if one is still wanted — so
// Back walks down the stack and only leaves the page from the root screen
// with nothing open. When the guard stops being wanted (back at the root by
// an on-screen button, the last overlay closed by its own controls) it's
// removed with history.back(); the popstate that triggers is swallowed.
//
// Overlays come first on BOTH platforms: Back closes an open dialog/popover
// before it navigates or exits.
export function useScreenNavigation<S extends string>(root: S) {
  const [screen, setScreen] = useState<S>(root);
  const stackRef = useRef<S[]>([root]);
  const guardActiveRef = useRef(false);
  const swallowPopsRef = useRef(0);
  const native = Capacitor.isNativePlatform();

  // `overlays` defaults to the live count; the popstate handler passes the
  // count it expects AFTER the overlay it just dismissed has unmounted (that
  // unmount arrives a render later, via the subscription below, and simply
  // re-runs this with the real number — it's idempotent).
  const syncGuard = useCallback(
    (overlays: number = backOverlayCount()) => {
      if (native || typeof window === "undefined") return;
      const wanted = stackRef.current.length > 1 || overlays > 0;
      if (wanted && !guardActiveRef.current) {
        window.history.pushState({ ditharBackGuard: true }, "");
        guardActiveRef.current = true;
      } else if (!wanted && guardActiveRef.current) {
        guardActiveRef.current = false;
        swallowPopsRef.current += 1;
        window.history.back();
      }
    },
    [native],
  );

  const navigate = useCallback(
    (next: S) => {
      const stack = stackRef.current;
      if (stack[stack.length - 1] === next) return;
      const existing = stack.lastIndexOf(next);
      stackRef.current = existing >= 0 ? stack.slice(0, existing + 1) : [...stack, next];
      syncGuard();
      setScreen(next);
    },
    [syncGuard],
  );

  // Pops one entry. Returns false (and does nothing) on the root screen.
  const goBack = useCallback((): boolean => {
    const stack = stackRef.current;
    if (stack.length <= 1) return false;
    stackRef.current = stack.slice(0, -1);
    setScreen(stackRef.current[stackRef.current.length - 1]);
    return true;
  }, []);

  useEffect(() => {
    if (native) {
      let removed = false;
      let handle: { remove: () => Promise<void> } | null = null;
      void CapacitorApp.addListener("backButton", () => {
        if (dismissTopBackOverlay()) return;
        if (!goBack()) void CapacitorApp.exitApp();
      }).then((h) => {
        if (removed) void h.remove();
        else handle = h;
      });
      return () => {
        removed = true;
        void handle?.remove();
      };
    }
    if (typeof window === "undefined") return;
    const onPopState = () => {
      if (swallowPopsRef.current > 0) {
        swallowPopsRef.current -= 1;
        return;
      }
      // Back consumed our guard entry.
      guardActiveRef.current = false;
      const overlays = backOverlayCount();
      if (dismissTopBackOverlay()) syncGuard(overlays - 1);
      else if (goBack()) syncGuard();
    };
    window.addEventListener("popstate", onPopState);
    // An overlay closing by its own controls (or opening) changes whether a
    // guard is wanted, independent of any navigation.
    const unsubscribeOverlays = subscribeBackOverlays(() => syncGuard());
    return () => {
      window.removeEventListener("popstate", onPopState);
      unsubscribeOverlays();
    };
  }, [native, goBack, syncGuard]);

  return { screen, navigate };
}
