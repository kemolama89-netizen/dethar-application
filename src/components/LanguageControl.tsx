import { Globe } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";

// Icon-only globe control — now functionally switches the app language
// (theme/visual identity is untouched; language and theme are independent
// state). aria-label announces which language pressing it will switch TO,
// following the common toggle-button convention.
export function LanguageControl() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className="flex h-11 w-11 items-center justify-center rounded-full border-2"
      style={{
        borderColor: "var(--color-gold-soft)",
        background: "var(--color-surface)",
        color: "var(--color-text-primary)",
      }}
    >
      <Globe size={18} strokeWidth={1.7} style={{ color: "var(--color-gold)" }} />
    </button>
  );
}
