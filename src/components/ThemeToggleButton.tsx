import { Palette } from "lucide-react";
import { useTheme } from "../theme/ThemeContext";

export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "men" ? "التبديل إلى الهوية النسائية" : "التبديل إلى الهوية الرجالية"}
      aria-pressed={theme === "women"}
      className="flex h-12 w-12 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
      style={{
        borderColor: "var(--color-gold)",
        background: "var(--color-surface)",
        color: "var(--color-primary)",
      }}
    >
      <Palette size={20} strokeWidth={1.7} />
    </button>
  );
}
