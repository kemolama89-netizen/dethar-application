import type { ReactNode } from "react";

// The mobile content column. Sizing lives inside .device-screen (see
// DeviceFrame) — this component only owns padding/gap for its children.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-col gap-2.5 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {children}
    </div>
  );
}
