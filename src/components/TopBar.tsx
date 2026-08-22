import { ThemeToggleButton } from "./ThemeToggleButton";
import { LanguageControl } from "./LanguageControl";

// DOM order intentionally puts LanguageControl first: under dir="rtl" the
// first flex child sits at the inline-start (visual right), matching the
// reference where the language pill is top-right and the theme toggle is
// top-left.
export function TopBar() {
  return (
    <div className="flex items-center justify-between">
      <LanguageControl />
      <ThemeToggleButton />
    </div>
  );
}
