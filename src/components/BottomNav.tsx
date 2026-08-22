import { useState } from "react";
import type { ComponentType } from "react";
import { Settings, Volume2, Home, BookOpen } from "lucide-react";
import { TasbihBeadsIcon } from "../icons/CustomIcons";
import { navLabels } from "../data/content";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface NavItem {
  key: string;
  label: string;
  icon: IconComponent;
}

// Right-to-left visual order matches the approved reference exactly:
// الإعدادات، الأذكار الصوتية، الرئيسية (center/active)، الأذكار المكتوبة، السبحة
const NAV_ITEMS: NavItem[] = [
  { key: "settings", label: navLabels.settings, icon: Settings },
  { key: "audio", label: navLabels.audioAdhkar, icon: Volume2 },
  { key: "home", label: navLabels.home, icon: Home },
  { key: "written", label: navLabels.writtenAdhkar, icon: BookOpen },
  { key: "tasbih", label: navLabels.tasbih, icon: TasbihBeadsIcon },
];

// Sticky (not fixed) so it floats pinned to the viewport bottom while
// scrolling on a real phone, while staying correctly bounded to the
// device-frame card's width on wider viewports — a `position: fixed`
// bar would ignore the frame and span the full browser width instead.
export function BottomNav() {
  const [active, setActive] = useState("home");

  return (
    <nav
      className="sticky bottom-0 z-10 mt-auto flex w-full min-w-0 max-w-full items-center justify-between rounded-full border px-1.5 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-gold-soft)",
        boxShadow: "0 -8px 24px -12px rgba(18, 33, 63, 0.35), 0 12px 24px -14px rgba(18, 33, 63, 0.4)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.key;
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            aria-current={isActive ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-0.5 text-center font-medium"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
              fontSize: "clamp(9.5px, 2.7vw, 11.5px)",
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
                      boxShadow: "0 8px 16px -4px rgba(18, 33, 63, 0.5)",
                    }
                  : undefined
              }
            >
              <Icon size={19} strokeWidth={1.7} />
            </span>
            <span className="w-full truncate px-0.5" style={{ marginTop: isActive ? -6 : 0 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
