import type { ReactNode } from "react";

// The navy/gold (or ivory/gold, women's theme) frame — the approved outer
// identity — is now visible at every width, real phone included, not just
// as a desktop-preview affordance. Its thickness/radius are width-based
// clamp()s (see index.css) so it stays proportionate from a 320px phone up
// through a bounded desktop-preview card, without ever disappearing.
//
// `scrollLocked` freezes .device-screen's own scrolling while a
// ContentModal is open (its "Read more" overlay is positioned absolutely
// within this same box), so the Home Screen underneath stays visually
// fixed in place — only the modal's own content area scrolls.
export function DeviceFrame({ children, scrollLocked = false }: { children: ReactNode; scrollLocked?: boolean }) {
  return (
    <div className="device-backdrop">
      <div className="device-frame">
        <div className="device-screen" style={scrollLocked ? { overflow: "hidden" } : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
