import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BackHeader, StickyBackButton } from "./BackHeader";
import { BottomNav } from "./BottomNav";
import { MiscDuaCard, MiscMeaningPopover } from "./MiscDuaCard";
import { useMeaningCardState } from "./MeaningPopover";
import { MISC_CATEGORIES, MISC_DUAS, miscLibraryLabels } from "../data/misc-library";
import type { MiscCategoryKey, MiscDuaItem } from "../data/misc-library";
import { loadMiscFavorites, saveMiscFavorites } from "../lib/miscFavorites";
import { useMiscSpeech } from "../lib/useMiscSpeech";
import { useLanguage } from "../theme/LanguageContext";

interface MiscCategoryScreenProps {
  categoryKey: MiscCategoryKey;
  onBack: () => void;
  onNavigateToWrittenRoot: () => void;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToSettings: () => void;
  /**
   * Set ONLY when arriving here from the global Written Adhkar search (see
   * WrittenAdhkarSearchScreen / App.tsx) — the specific dua to scroll
   * straight to on mount, instead of the plain top-of-list start. Absent
   * for every ordinary category-tile entry, which behaves exactly as
   * before.
   */
  targetItemId?: string;
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
  targetItemId,
}: MiscCategoryScreenProps) {
  const { language, dir } = useLanguage();
  const t = miscLibraryLabels[language];
  const meta = MISC_CATEGORIES[categoryKey];
  const items = useMemo(() => MISC_DUAS.filter((item) => item.categories.includes(categoryKey)), [categoryKey]);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadMiscFavorites());
  const { speakingId, toggle: toggleSpeech } = useMiscSpeech();
  // Global-search deep link (see WrittenAdhkarSearchScreen / App.tsx): jump
  // straight to the specific dua the user tapped in the results, instead of
  // the plain top-of-list start — per this task's spec, tapping a result
  // must land ON that exact card, not just open its category at the top.
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (!targetItemId) return;
    itemRefs.current[targetItemId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [targetItemId]);
  // Which single item's full Transliteration/Meaning is currently shown,
  // and the specific DOM card it was opened from — see MiscDuaCard's
  // Meaning button and MiscMeaningPopover. Same shared hook Written
  // Adhkar's own reader uses (see MeaningPopover.tsx), not a separate
  // implementation.
  const { target: meaningTarget, show: handleShowMeaning, close: handleCloseMeaning } =
    useMeaningCardState<MiscDuaItem>(".dithar-misc-dua-card");

  // Stable identity (empty deps — only reads/writes state via functional
  // updaters) so it can be passed straight to every memoized MiscDuaCard;
  // see that component's own comment for why this matters.
  const handleToggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveMiscFavorites(next);
      return next;
    });
  }, []);

  return (
    <DeviceFrame background="var(--wa-page-bg)" scrollLocked={meaningTarget !== null}>
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          <BackHeader title={language === "en" ? meta.title_en : meta.title_ar} onBack={onBack} backLabel={t.back} hideButton />
          <StickyBackButton onBack={onBack} backLabel={t.back} dir={dir} />
          <p className="mt-1 text-center text-[12.5px]" style={{ color: "var(--wa-on-page-muted)" }}>
            {language === "en" ? meta.subtitle_en : meta.subtitle_ar}
          </p>
          <p className="mt-0.5 text-center text-[11px]" style={{ color: "var(--wa-on-page-muted)" }}>
            {t.itemsCount(items.length)}
          </p>

          {/* `dithar-misc-list` — plain marker class, matching
              WrittenAdhkarReader's own `.dithar-wa-list` convention; used
              by DraggableMeaningCard to find the nearest scrollable list
              ancestor when it needs to make extra room above a card. */}
          <div className="dithar-misc-list relative mt-4 flex flex-col gap-3 pb-4">
            {items.length === 0 ? (
              <p className="mt-8 text-center text-[13px]" style={{ color: "var(--wa-on-page-muted)" }}>
                {t.comingSoon}
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[item.id] = el;
                  }}
                >
                  <MiscDuaCard
                    item={item}
                    isFavorite={favorites.has(item.id)}
                    onToggleFavorite={handleToggleFavorite}
                    isSpeaking={speakingId === item.id}
                    onToggleListen={toggleSpeech}
                    onShowMeaning={handleShowMeaning}
                  />
                </div>
              ))
            )}
          </div>

          {meaningTarget && (
            <MiscMeaningPopover key={meaningTarget.item.id} item={meaningTarget.item} cardEl={meaningTarget.cardEl} onClose={handleCloseMeaning} />
          )}
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
