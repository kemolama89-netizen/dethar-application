import { useEffect, useState } from "react";
import type { RefObject } from "react";

/**
 * Whether the element is on screen (any part of it), via IntersectionObserver
 * — so a decorative animation can stop while it is scrolled out of view.
 * True where IntersectionObserver doesn't exist (nothing to observe with).
 */
export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) setInView(entry.isIntersecting);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}
