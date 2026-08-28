import { useState } from "react";
import type { ComponentType } from "react";
import { Settings, Volume2, Home, BookOpen } from "lucide-react";
import { TasbihBeadsIcon } from "../icons/CustomIcons";
import { navLabels } from "../data/content";
import { useLanguage } from "../theme/LanguageContext";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface NavItem {
  key: string;
  labelKey: keyof typeof navLabels.ar;
  icon: IconComponent;
}

// DOM order is fixed (not language-dependent) — direction is handled at
// the layout level via `dir`, so this same order mirrors correctly on its
// own: rightmost-first in RTL (Arabic — matches the approved reference:
// الإعدادات، الأذكار المسموعة، الرئيسية، الأذكار المكتوبة، السبحة) becomes
// leftmost-first in LTR (English), with الرئيسية/Home always the centered,
// active item either way. Never manually reversed per language.
const NAV_ITEMS: NavItem[] = [
  { key: "settings", labelKey: "settings", icon: Settings },
  { key: "audio", labelKey: "audioAdhkar", icon: Volume2 },
  { key: "home", labelKey: "home", icon: Home },
  { key: "written", labelKey: "writtenAdhkar", icon: BookOpen },
  { key: "tasbih", labelKey: "tasbih", icon: TasbihBeadsIcon },
];

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
  const active = activeKey ?? internalActive;
  const { language } = useLanguage();
  const labels = navLabels[language];

  return (
    <nav
      className={`sticky bottom-0 z-10 flex w-full min-w-0 max-w-full items-center justify-between rounded-full border px-1.5 py-2.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] ${className}`}
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
            }}
            aria-current={isActive ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-0.5 text-center font-medium"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
              fontSize: "clamp(8.5px, 2.5vw, 10.5px)",
            }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full transition-transform"
              style={
                isActive
                  ? {
                      background: "var(--color-primary)",
                      color: "var(--color-gold)",
                      transform: "translateY(-10px)",
                      boxShadow: "0 8px 16px -4px rgba(var(--color-shadow-rgb), 0.5)",
                    }
                  : undefined
              }
            >
              <Icon size={19} strokeWidth={1.7} />
            </span>
            <span
              className="w-full px-0.5 leading-[1.15]"
              style={{ marginTop: isActive ? -6 : 0, wordBreak: "keep-all" }}
            >
              {labels[item.labelKey]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
