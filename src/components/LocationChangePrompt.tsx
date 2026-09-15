import { MapPin } from "lucide-react";

interface LocationChangePromptProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  declineLabel: string;
  onConfirm: () => void;
  onDecline: () => void;
}

// Step 5's location-change confirmation — same visual pattern as
// ContentModal.tsx (dim backdrop, centered/bottom-sheet card, DITHAR
// colors/radius/typography — no new visual system), but with a
// confirm/decline choice instead of a single X close, since this is a
// yes/no decision, not a read-and-dismiss content panel. Positioned
// absolutely within .device-screen (not `position: fixed`, same reason
// ContentModal documents: it must only ever cover the DITHAR frame
// itself, never escape it on the desktop preview) — rendered from
// App.tsx's Home, the one screen with a .device-screen to anchor to.
//
// Declining (or clicking the backdrop, treated the same as declining —
// this is a low-stakes "not now" dismissal, not a destructive action)
// changes nothing about the active location.
export function LocationChangePrompt({ open, title, body, confirmLabel, declineLabel, onConfirm, onDecline }: LocationChangePromptProps) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-end justify-center p-3 sm:items-center"
      style={{ background: "rgba(11, 21, 38, 0.45)" }}
      role="presentation"
      onClick={onDecline}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-gold-soft)",
          borderRadius: "var(--card-radius)",
          boxShadow: "0 20px 50px -20px rgba(var(--color-shadow-rgb), 0.5)",
        }}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--color-primary)", color: "var(--color-gold)" }}
          >
            <MapPin size={19} strokeWidth={1.7} />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="text-[16px] font-bold leading-[1.4]" style={{ color: "var(--color-text-primary)" }}>
              {title}
            </h3>
            <p className="mt-1 text-[13px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
              {body}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: "var(--color-gold-soft)" }}>
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 rounded-xl border px-3 py-2 text-[13px] font-medium"
            style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
          >
            {declineLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold"
            style={{ background: "var(--color-primary)", color: "var(--color-gold)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
