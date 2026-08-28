import { useEffect, useState } from "react";

// Shared "prefers-reduced-motion" reader — used by the reader's calm-reading
// readiness ring and its completion celebration, so both react consistently
// (and LIVE, via the media query's change event) to the user flipping the OS
// setting mid-session, not just whatever it happened to be at first mount.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}
