import type { ReactNode } from "react";

// Renders the app edge-to-edge on an actual phone viewport, and as a
// bounded, phone-proportioned card on wider viewports — so the design
// never reads as a shrunken desktop page. The bezel/border styling
// itself is the approved outer-frame identity (navy+gold for men,
// ivory+gold for women), defined via theme tokens in index.css.
export function DeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="device-backdrop">
      <div className="device-frame">
        <div className="device-screen">{children}</div>
      </div>
    </div>
  );
}
