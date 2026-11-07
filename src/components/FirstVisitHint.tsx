import { useState } from "react";
import { useLanguage } from "../theme/LanguageContext";
import { onboardingLabels } from "../data/onboardingLabels";
import { markHintSeen, shouldShowHint } from "../lib/onboarding";

/**
 * A section's deeper guidance (lib/onboarding.ts): one line, shown inline in the section's own controls
 * area on its first visit — never laid over Qur'an, Hadith or adhkar text — until «حسنًا».
 */
export function FirstVisitHint({ id, text }: { id: string; text: string }) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(() => shouldShowHint(id));
  if (!open) return null;
  return (
    <div className="dithar-first-hint mt-2 flex items-start gap-3" role="note" data-first-visit-hint={id}>
      <p className="min-w-0 flex-1 text-[12px] leading-[1.6]">{text}</p>
      <button
        type="button"
        className="dithar-first-hint__ok shrink-0"
        onClick={() => {
          markHintSeen(id);
          setOpen(false);
        }}
        data-first-visit-hint-ok=""
      >
        {onboardingLabels[language].gotIt}
      </button>
    </div>
  );
}
