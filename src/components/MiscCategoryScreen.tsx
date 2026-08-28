import { useMemo, useState } from "react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BackHeader } from "./BackHeader";
import { BottomNav } from "./BottomNav";
import { MiscDuaCard } from "./MiscDuaCard";
import { MISC_CATEGORIES, MISC_DUAS, miscLibraryLabels as t } from "../data/misc-library";
import type { MiscCategoryKey } from "../data/misc-library";
import { loadMiscFavorites, saveMiscFavorites } from "../lib/miscFavorites";

interface MiscCategoryScreenProps {
  categoryKey: MiscCategoryKey;
  onBack: () => void;
  onNavigateToWrittenRoot: () => void;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToSettings: () => void;
}

// A single category's verified dua cards — per spec section 9: title,
// subtitle, then the complete dua cards (see MiscDuaCard). This is also
// the feature's "detail view": each card already shows the complete text,
// count, and source in full, so there is no separate deeper per-dua screen
// to open (nothing would be added by one for content this short) — see
// this task's final report for that simplification.
export function MiscCategoryScreen({
  categoryKey,
  onBack,
  onNavigateToWrittenRoot,
  onNavigateHome,
  onNavigateToTasbeeh,
  onNavigateToSettings,
}: MiscCategoryScreenProps) {
  const meta = MISC_CATEGORIES[categoryKey];
  const items = useMemo(() => MISC_DUAS.filter((item) => item.categories.includes(categoryKey)), [categoryKey]);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadMiscFavorites());

  function handleToggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveMiscFavorites(next);
      return next;
    });
  }

  return (
    <DeviceFrame background="var(--wa-page-bg)">
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          <BackHeader title={meta.title_ar} onBack={onBack} backLabel={t.back} />
          <p className="mt-1 text-center text-[12.5px]" style={{ color: "var(--wa-on-page-muted)" }}>
            {meta.subtitle_ar}
          </p>
          <p className="mt-0.5 text-center text-[11px]" style={{ color: "var(--wa-on-page-muted)" }}>
            {t.itemsCount(items.length)}
          </p>

          <div className="mt-4 flex flex-col gap-3 pb-4">
            {items.length === 0 ? (
              <p className="mt-8 text-center text-[13px]" style={{ color: "var(--wa-on-page-muted)" }}>
                {t.comingSoon}
              </p>
            ) : (
              items.map((item) => (
                <MiscDuaCard
                  key={item.id}
                  item={item}
                  isFavorite={favorites.has(item.id)}
                  onToggleFavorite={() => handleToggleFavorite(item.id)}
                />
              ))
            )}
          </div>
        </div>

        <BottomNav
          className="mt-2"
          activeKey="written"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
            // Matches WrittenAdhkarReader's own convention: the bottom
            // nav's "written" tab always jumps back to the top-level
            // category grid, not just one step up.
            if (key === "written") onNavigateToWrittenRoot();
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
