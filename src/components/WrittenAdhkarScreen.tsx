import { useState } from "react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { WrittenAdhkarCategoryCard } from "./WrittenAdhkarCategoryCard";
import { useLanguage } from "../theme/LanguageContext";
import { navLabels } from "../data/content";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels, writtenAdhkarItems } from "../data/written-adhkar";
import type { WrittenAdhkarCategoryKey } from "../data/written-adhkar";

interface WrittenAdhkarScreenProps {
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToSettings: () => void;
  onSelectCategory: (key: WrittenAdhkarCategoryKey) => void;
}

// Matches the .dithar-wa-category-card transition duration in index.css —
// navigation is deliberately held back this long so the "selected card
// grows, the rest recede" animation actually gets to play before the
// screen switches, instead of being cut off mid-motion.
const SELECT_TRANSITION_MS = 320;

const CATEGORY_ORDER: WrittenAdhkarCategoryKey[] = ["morning", "evening", "prayer", "misc"];

// Landing page for "الأذكار المكتوبة" — four illustrated collection
// tiles, each with its own bespoke visual metaphor (dawn horizon,
// crescent + stars, a mihrab niche, an ascending branch), not four copies
// of a generic icon-in-a-circle card. No header back button here — Home
// is already one tap away via Bottom Navigation, so a second "go back"
// control would just be redundant chrome (unlike the Reader below it,
// which keeps its own back action for the one hop BottomNav can't do:
// returning to this list without leaving Written Adhkar entirely).
export function WrittenAdhkarScreen({ onNavigateHome, onNavigateToTasbeeh, onNavigateToSettings, onSelectCategory }: WrittenAdhkarScreenProps) {
  const { language } = useLanguage();
  const t = writtenAdhkarLabels[language];
  const nav = navLabels[language];

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
    <DeviceFrame background="var(--wa-category-bg)">
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          <h1
            className="mt-2 text-center text-[20px] font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
          >
            {nav.writtenAdhkar}
          </h1>
          <p className="mt-0.5 text-center text-[13px]" style={{ color: "var(--wa-ink-muted)" }}>
            {t.chooseCategory}
          </p>

          {/* grid-rows-2 (not content-start) so the two rows stretch to
              fill this flex-1 container's full height — matches "eliminate
              the empty space below the four cards": with content-start,
              each row only took its natural content height, leaving the
              rest of the available screen area blank beneath the grid. */}
          <div className="mt-3 grid flex-1 grid-cols-2 grid-rows-2 gap-3">
            {CATEGORY_ORDER.map((key) => {
              const label = writtenAdhkarCategoryLabels[key][language];
              const count = writtenAdhkarItems[key].length;
              const cardStateClass = !selectingKey
                ? ""
                : selectingKey === key
                  ? "dithar-wa-category-card--selected"
                  : "dithar-wa-category-card--receding";

              return (
                <WrittenAdhkarCategoryCard
                  key={key}
                  category={key}
                  label={label}
                  itemsCountLabel={t.itemsCount(count)}
                  cardStateClass={cardStateClass}
                  disabled={!!selectingKey}
                  onSelect={() => handleSelect(key)}
                />
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
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
