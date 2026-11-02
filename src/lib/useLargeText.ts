import { useEffect, useRef, useState } from "react";

// Whether the person's text scale (browser or system text size) makes text
// clearly larger than its CSS size: layouts that need it can't be chosen from
// width alone, because text scaling leaves CSS lengths and media queries as
// they were. Measured from a hidden 20px line, so it's what actually renders,
// and kept current if the setting changes while the screen is open.
const PROBE_PX = 20;
const LARGE_FROM = 1.25;

export function useLargeText() {
  const probe = useRef<HTMLSpanElement | null>(null);
  const [large, setLarge] = useState(false);
  useEffect(() => {
    const element = probe.current;
    if (!element) return;
    const measure = () => setLarge(element.getBoundingClientRect().height / PROBE_PX >= LARGE_FROM);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { probe, large, probeSize: PROBE_PX };
}
