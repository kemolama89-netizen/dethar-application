import { ThemeToggleButton } from "./ThemeToggleButton";
import { LanguageControl } from "./LanguageControl";

// DOM order intentionally puts LanguageControl first: the first flex
// child sits at the inline-start, which is the visual right in Arabic
// (dir="rtl", matching the approved reference) and mirrors to the visual
// left automatically in English (dir="ltr") — handled by the browser via
// `dir`, not by conditionally reordering these two elements.
export function TopBar() {
  return (
    <div className="flex items-center justify-between">
      <LanguageControl />
      <ThemeToggleButton />
    </div>
  );
}
