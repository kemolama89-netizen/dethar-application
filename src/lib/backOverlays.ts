import { useEffect, useRef } from "react";

// Registry of the transient overlays (dialogs, popovers) that are open right
// now, so system Back can dismiss the topmost one BEFORE it navigates — see
// useScreenNavigation.ts, the only consumer of everything but the hook.
//
// An overlay opts in with `useBackDismiss(isOpen, close)`: while `isOpen` it
// is registered (last registered = topmost), and it is unregistered when it
// closes or unmounts — including when navigation unmounts its screen, so a
// stale entry can never outlive the overlay it belongs to. This is purely
// behavior: no overlay's markup, styling or own close controls change.
interface Entry {
  dismiss: () => void;
}

const entries: Entry[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function register(entry: Entry): () => void {
  entries.push(entry);
  notify();
  return () => {
    const i = entries.indexOf(entry);
    if (i === -1) return;
    entries.splice(i, 1);
    notify();
  };
}

export function backOverlayCount(): number {
  return entries.length;
}

/** Closes the topmost open overlay. Returns false (doing nothing) if none is open. */
export function dismissTopBackOverlay(): boolean {
  const top = entries[entries.length - 1];
  if (!top) return false;
  top.dismiss();
  return true;
}

/** Fires whenever an overlay opens or closes. Returns an unsubscribe function. */
export function subscribeBackOverlays(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Registers `onDismiss` as the Back action while `active` is true. Call it
 * unconditionally (before any early return) in the component that owns the
 * overlay's open state. `onDismiss` is read through a ref, so passing an
 * inline arrow doesn't re-register on every render.
 */
export function useBackDismiss(active: boolean, onDismiss: () => void): void {
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    if (!active) return;
    return register({ dismiss: () => dismissRef.current() });
  }, [active]);
}
