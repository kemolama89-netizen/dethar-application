import { useState } from "react";
import { Power } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLanguage } from "../theme/LanguageContext";
import { exitAppLabels } from "../data/exitApp";

// Exit-app control — rendered only in TopBar's `showExitButton` slot (Home
// screen only, see TopBar.tsx), never on any other screen. Same visual
// language as ThemeToggleButton (h-12 w-12 circular, gold border,
// primary-color icon) so it reads as part of the same existing control
// row rather than a bolted-on addition — no new colors/spacing introduced.
//
// The button's aria-label and the confirmation dialog's text follow the
// app's own language toggle (useLanguage + exitAppLabels), like every other
// bilingual on-screen string. `dir` is set explicitly on the dialog card
// from the same context value so its layout/button order matches the
// current language.
//
// Capacitor's own `App.exitApp()` is native-Android-only — its web
// implementation throws "Not implemented on web" — so the actual call is
// gated on `Capacitor.isNativePlatform()`, the same guard pattern
// voiceRecognitionNative.ts's isNativeVoiceRecognitionAvailable already
// uses. On web/dev-server preview, confirming just closes the dialog.
export function ExitAppButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { language, dir } = useLanguage();
  const t = exitAppLabels[language];

  function handleConfirm() {
    setConfirmOpen(false);
    if (Capacitor.isNativePlatform()) {
      void CapacitorApp.exitApp();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={t.buttonAria}
        className="flex h-12 w-12 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
        style={{
          borderColor: "var(--color-gold)",
          background: "var(--color-surface)",
          color: "var(--color-primary)",
        }}
      >
        <Power size={20} strokeWidth={1.7} />
      </button>

      {confirmOpen && (
        // Same visual pattern as LocationChangePrompt.tsx (dim backdrop,
        // centered/bottom-sheet card, DITHAR colors/radius/typography) —
        // positioned absolutely within the nearest `.device-screen`
        // ancestor (see DeviceFrame.tsx's `position: relative`), which
        // TopBar already renders inside on every screen, so this covers
        // exactly the same frame LocationChangePrompt already does.
        // Clicking the backdrop is treated as Cancel, matching that same
        // existing dialog's own convention.
        <div
          className="absolute inset-0 z-20 flex items-end justify-center p-3 sm:items-center"
          style={{ background: "rgba(11, 21, 38, 0.45)" }}
          role="presentation"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.confirmTitle}
            dir={dir}
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
                <Power size={19} strokeWidth={1.7} />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <h3 className="text-[16px] font-bold leading-[1.4]" style={{ color: "var(--color-text-primary)" }}>
                  {t.confirmTitle}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: "var(--color-gold-soft)" }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-xl border px-3 py-2 text-[13px] font-medium"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold"
                style={{ background: "var(--color-primary)", color: "var(--color-gold)" }}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
