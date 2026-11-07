import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { appTourLabels } from "../data/onboardingLabels";

/**
 * Settings → «جولة داخل التطبيق»: the film, the feature guide and the guided tour, together. The rows
 * themselves are Settings' own (SettingsScreen passes them in), so they look and behave like every other.
 */
export function AppTourView({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const { language, dir } = useLanguage();
  const t = appTourLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <div className="flex flex-1 flex-col" data-app-tour="">
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.title}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>
      <p className="mt-3 px-1 text-[12px] leading-[1.7]" style={{ color: "var(--color-text-muted)" }}>
        {t.intro}
      </p>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
