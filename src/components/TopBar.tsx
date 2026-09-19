import { ThemeToggleButton } from "./ThemeToggleButton";
import { LanguageControl } from "./LanguageControl";
import { ExitAppButton } from "./ExitAppButton";

// DOM order intentionally puts LanguageControl first: the first flex
// child sits at the inline-start, which is the visual right in Arabic
// (dir="rtl", matching the approved reference) and mirrors to the visual
// left automatically in English (dir="ltr") — handled by the browser via
// `dir`, not by conditionally reordering these two elements.
//
// `showExitButton` is opt-in and defaults to unset — every existing call
// site (every screen except Home) renders the exact same markup as
// before, untouched. Only App.tsx's HomeScreen passes it, per the "exit
// button on the main screen only" requirement — grouped with
// ThemeToggleButton in the same end-side flex item so the two-groups
// layout (LanguageControl at the start, everything else at the end) is
// preserved exactly.
export function TopBar({ showExitButton = false }: { showExitButton?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <LanguageControl />
      {showExitButton ? (
        <div className="flex items-center gap-2">
          <ExitAppButton />
          <ThemeToggleButton />
        </div>
      ) : (
        <ThemeToggleButton />
      )}
    </div>
  );
}
