import type { ReactNode } from "react";

// The mobile content column, sized to fill .device-screen's real height
// (see DeviceFrame). Fixed, width-first spacing on each section (their own
// `mt-*`) sets a comfortable minimum gap — not tied to viewport height.
//
// `justify-between` distributes any LEFTOVER space (on a taller phone,
// once every section already has its comfortable minimum gap) evenly
// across all the gaps, so extra room reads as balanced breathing space
// rather than one big empty block dumped in a single spot. If content is
// taller than the available height, .device-screen scrolls internally
// (its own overflow-y) rather than this column overflowing the frame.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-col justify-between px-4 pb-0.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
      {children}
    </div>
  );
}
