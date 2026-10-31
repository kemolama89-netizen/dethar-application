import { useCallback, useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "../lib/audioAdhkarNative";
import type { NativePendingResume } from "../lib/audioAdhkarNative";
import { resumeAdhkarLabels } from "../data/resumeAdhkarLabels";

// The in-app twin of the "Resume Adhkar" notification: a Morning/Evening
// session the adhan interrupted (saved natively, exactly where it stopped)
// is offered here until it is resumed, completed, replaced or its window
// ends. Nothing plays until the user taps Resume. Android only — the web
// build has no scheduled sessions to interrupt.

export function ResumeAdhkarBanner() {
  const { language } = useLanguage();
  const t = resumeAdhkarLabels[language];
  const [pending, setPending] = useState<NativePendingResume | null>(null);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(() => {
    if (!isAudioAdhkarNativeAvailable()) return;
    AudioAdhkarNative.getPendingResume().then(({ pending: p }) => setPending(p), () => setPending(null));
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (!pending) return null;

  async function resume() {
    if (!pending || starting) return;
    setStarting(true);
    try {
      await AudioAdhkarNative.resumeSaved({ section: pending.section });
    } catch {
      // Refused (e.g. the adhan is playing): the banner stays for another try.
    } finally {
      setStarting(false);
      refresh();
    }
  }

  return (
    <div
      className="mt-3 flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: "var(--wa-surface)", boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)" }}
      role="status"
      data-resume-adhkar={pending.section}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold" style={{ color: "var(--wa-ink)" }}>
          {t.title(pending.section)}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
          {t.body(pending.index + 1, pending.count)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void resume()}
        disabled={starting}
        className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
        style={{ background: "var(--wa-gold)", color: "var(--wa-surface)", opacity: starting ? 0.6 : 1 }}
      >
        <Play size={13} strokeWidth={2} />
        {t.action}
      </button>
    </div>
  );
}
