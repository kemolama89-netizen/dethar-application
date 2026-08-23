import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { BackHeader } from "./BackHeader";
import { MosqueDomeIcon, SprigIcon, SunriseIcon, CrescentStarIcon } from "../icons/CustomIcons";
import { useLanguage } from "../theme/LanguageContext";
import { navLabels } from "../data/content";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels, writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarCategoryKey } from "../data/written-adhkar";

interface WrittenAdhkarScreenProps {
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onSelectCategory: (key: WrittenAdhkarCategoryKey) => void;
}

// Matches the .dithar-wa-category-card transition duration in index.css —
// navigation is deliberately held back this long so the "selected card
// grows, the rest recede" animation actually gets to play before the
// screen switches, instead of being cut off mid-motion.
const SELECT_TRANSITION_MS = 320;

// Icon per category — Prayer/Miscellaneous reuse the existing MosqueDomeIcon
// and SprigIcon unmodified (already the right symbolism); Morning/Evening
// use the two new icons added alongside this feature, same bespoke style.
const CATEGORY_ICONS: Record<WrittenAdhkarCategoryKey, typeof MosqueDomeIcon> = {
  morning: SunriseIcon,
  evening: CrescentStarIcon,
  prayer: MosqueDomeIcon,
  misc: SprigIcon,
};

const CATEGORY_ORDER: WrittenAdhkarCategoryKey[] = ["morning", "evening", "prayer", "misc"];

// Landing page for "الأذكار المكتوبة" — four elegant category cards, not a
// generic list/grid of text rows. Deliberately its own visual composition
// (large centered icon badge + title per card, two-up grid) rather than a
// copy of Home's icon-left/text-right InsightCard layout, while reusing
// the exact same color/border/radius/shadow tokens so it still reads as
// unmistakably DITHAR.
export function WrittenAdhkarScreen({ onNavigateHome, onNavigateToTasbeeh, onSelectCategory }: WrittenAdhkarScreenProps) {
  const { language, dir } = useLanguage();
  const t = writtenAdhkarLabels[language];
  const nav = navLabels[language];
  const EntryArrow = dir === "rtl" ? ChevronLeft : ChevronRight;

  // While a category is "selecting" (the brief window between tap and the
  // actual navigation), the tapped card grows toward the user and the
  // other three recede/fade — see .dithar-wa-category-card in index.css.
  const [selectingKey, setSelectingKey] = useState<WrittenAdhkarCategoryKey | null>(null);

  function handleSelect(key: WrittenAdhkarCategoryKey) {
    if (selectingKey) return;
    setSelectingKey(key);
    window.setTimeout(() => onSelectCategory(key), SELECT_TRANSITION_MS);
  }

  return (
    <DeviceFrame background="var(--wa-page-bg)">
      <AppShell>
        <TopBar />
        <div className="dithar-wa-screen-in flex flex-1 flex-col">
          <BackHeader title={nav.writtenAdhkar} onBack={onNavigateHome} backLabel={t.back} />
          <p className="mt-0.5 text-center text-[13px]" style={{ color: "var(--wa-on-page-muted)" }}>
            {t.chooseCategory}
          </p>

          <div className="mt-3 grid flex-1 grid-cols-2 content-start gap-3">
            {CATEGORY_ORDER.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              const label = writtenAdhkarCategoryLabels[key][language];
              const count = writtenAdhkarItems[key].length;
              const cardStateClass = !selectingKey
                ? ""
                : selectingKey === key
                  ? "dithar-wa-category-card--selected"
                  : "dithar-wa-category-card--receding";

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  disabled={!!selectingKey}
                  className={`dithar-wa-category-card ${cardStateClass} relative flex aspect-[4/5] flex-col items-center justify-center gap-2.5 rounded-2xl p-3 text-center active:scale-[0.97]`}
                  style={{
                    background: "var(--wa-surface)",
                    borderRadius: "var(--card-radius)",
                    // A single box-shadow value carries both the outer
                    // ambient drop shadow AND the thin inset gold hairline
                    // "border" — deliberately NOT also a real CSS `border`,
                    // since a border + an inset shadow rendered on the same
                    // edge can drift a hair out of alignment during a scale
                    // transform, reading as a faint double line.
                    boxShadow: "0 14px 28px -18px rgba(23, 38, 58, 0.28), inset 0 0 0 1px var(--wa-gold-hairline)",
                  }}
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ background: "var(--wa-badge-bg)", color: "var(--wa-ink)" }}
                  >
                    <Icon size={26} />
                  </span>
                  <span
                    className="text-[15px] font-bold leading-[1.3]"
                    style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
                  >
                    {label}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--wa-ink-muted)" }}>
                    {t.itemsCount(count)}
                  </span>
                  <EntryArrow
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="absolute bottom-2.5 end-2.5"
                    style={{ color: "var(--wa-gold)" }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <BottomNav
          className="mt-2"
          activeKey="written"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
