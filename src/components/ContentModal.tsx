import type { ReactNode } from "react";
import { X } from "lucide-react";

interface ContentModalProps {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  icon: ReactNode;
  title: string;
  attribution?: string;
  body: string;
  citation: string;
}

// Full-content view for the two Home cards' "Read more" action. Positioned
// absolutely within .device-screen (not `position: fixed`, which would
// escape the phone frame on the desktop preview and cover the whole
// browser window instead) so it only ever covers the DITHAR frame itself.
// Reuses the app's existing color tokens/radius/typography — no new
// visual system. Only its own content area scrolls; the Home Screen
// underneath is scroll-locked by the parent while this is open (see
// DeviceFrame's `scrollLocked` prop) and is otherwise untouched.
export function ContentModal({
  open,
  onClose,
  closeLabel,
  icon,
  title,
  attribution,
  body,
  citation,
}: ContentModalProps) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center p-3 sm:items-center"
      style={{ background: "rgba(11, 21, 38, 0.45)" }}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80%] w-full max-w-sm flex-col overflow-hidden rounded-2xl border"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-gold-soft)",
          borderRadius: "var(--card-radius)",
          boxShadow: "0 20px 50px -20px rgba(15, 15, 15, 0.5)",
        }}
      >
        <div className="flex items-start gap-3 border-b p-4" style={{ borderColor: "var(--color-gold-soft)" }}>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--color-primary)", color: "var(--color-gold)" }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="text-[18px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              {title}
            </h3>
            {attribution && (
              <p className="mt-0.5 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
                {attribution}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--color-bg)", color: "var(--color-text-muted)" }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p
            className="text-[16px] leading-[1.75]"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            {body}
          </p>
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            {citation}
          </p>
        </div>
      </div>
    </div>
  );
}
