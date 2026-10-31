import { useContext, useState } from "react";
import type { ComponentType } from "react";
import { Settings, Home, BookOpen, BookOpenText } from "lucide-react";
import { TasbihBeadsIcon } from "../icons/CustomIcons";
import { navLabels } from "../data/content";
import { QuranNavContext } from "../lib/quranNav";
import { AdhkarNavContext } from "../lib/adhkarNav";
import { useLanguage } from "../theme/LanguageContext";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface NavItem {
  key: string;
  labelKey: keyof typeof navLabels.ar;
  icon: IconComponent;
}

// Five items, in this order from RIGHT to LEFT in both languages: Tasbeeh,
// Adhkar, Home (in the centre), Mushaf, Settings. The nav is laid out
// left-to-right (`dir="ltr"` below) so this physical order is the same in
// Arabic and English, hence the list runs left to right. Adhkar opens the
// Adhkar screen, whose two cards lead to Audio Adhkar and Written Adhkar.
const NAV_ITEMS: NavItem[] = [
  { key: "settings", labelKey: "settings", icon: Settings },
  { key: "quran", labelKey: "quran", icon: BookOpenText },
  { key: "home", labelKey: "home", icon: Home },
  { key: "adhkar", labelKey: "adhkar", icon: BookOpen },
  { key: "tasbih", labelKey: "tasbih", icon: TasbihBeadsIcon },
];

/** The Audio and Written Adhkar screens (and their sub-screens) are under the Adhkar item. */
const navItemFor = (key: string) => (key === "audio" || key === "written" ? "adhkar" : key);

// AppShell's `justify-between` already lands this at the bottom edge in
// the normal (fits-without-scrolling) case. `sticky bottom-0` is the
// fallback for when .device-screen has to scroll internally (content
// taller than available height) — it keeps the nav pinned to the visible
// bottom of that scroll area instead of scrolling away with the content.
//
// `activeKey`/`onSelect` are optional so this stays a drop-in, visually
// identical replacement on Home (which passes neither — active state is
// purely internal there, exactly as before). Screens that need real
// navigation (e.g. Tasbeeh) pass both: `activeKey` to show the correct
// item highlighted, `onSelect` to actually navigate on tap.
export function BottomNav({
  className = "",
  activeKey,
  onSelect,
}: {
  className?: string;
  activeKey?: string;
  onSelect?: (key: string) => void;
}) {
  const [internalActive, setInternalActive] = useState("home");
  const active = navItemFor(activeKey ?? internalActive);
  const { language } = useLanguage();
  const labels = navLabels[language];
  const openQuran = useContext(QuranNavContext);
  const openAdhkar = useContext(AdhkarNavContext);

  return (
    <nav
      dir="ltr"
      // Items top-aligned (not centered): every icon sits on one line and
      // every label starts on one line, whether a label wraps to two lines
      // ("الأذكار المسموعة") or not. Spacing scales with the screen width.
      className={`dithar-glass sticky bottom-0 z-10 flex w-full min-w-0 max-w-full items-start justify-between gap-[clamp(1px,0.6vw,4px)] rounded-full border px-[clamp(5px,1.8vw,10px)] pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${className}`}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-gold-soft)",
        boxShadow: "0 -8px 24px -12px rgba(var(--color-shadow-rgb), 0.35), 0 12px 24px -14px rgba(var(--color-shadow-rgb), 0.4)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setInternalActive(item.key);
              onSelect?.(item.key);
              if (item.key === "quran" && item.key !== active) openQuran?.();
              // From Audio or Written Adhkar too: back to the Adhkar screen's two cards.
              if (item.key === "adhkar" && activeKey !== "adhkar") openAdhkar?.();
            }}
            aria-current={isActive ? "page" : undefined}
            className="flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 py-0.5 text-center font-medium"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
              fontSize: "clamp(8.5px, 2.35vw, 10.5px)",
              fontWeight: isActive ? 700 : 500,
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center rounded-full transition-transform"
              style={{ width: "clamp(34px, 9.6vw, 42px)", height: "clamp(34px, 9.6vw, 42px)", ...(isActive
                ? {
                    background: "var(--color-primary)",
                    color: "var(--color-gold-on-primary)",
                    transform: "translateY(-10px)",
                    boxShadow: "0 8px 16px -4px rgba(var(--color-shadow-rgb), 0.5)",
                  }
                : {}) }}
            >
              <Icon size={19} strokeWidth={1.7} />
            </span>
            {/* The active label stays on the same line as the others (only its icon lifts). */}
            <span className="w-full px-0.5 leading-[1.2]" style={{ wordBreak: "keep-all" }}>
              {labels[item.labelKey]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
