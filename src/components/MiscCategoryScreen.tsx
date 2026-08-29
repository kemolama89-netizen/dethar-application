import { useCallback, useMemo, useState } from "react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BackHeader, StickyBackButton } from "./BackHeader";
import { BottomNav } from "./BottomNav";
import { MiscDuaCard, MiscMeaningPopover } from "./MiscDuaCard";
import { useMeaningPopoverState } from "./MeaningPopover";
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
  const { language, dir } = useLanguage();
  const t = miscLibraryLabels[language];
  const meta = MISC_CATEGORIES[categoryKey];
  const items = useMemo(() => MISC_DUAS.filter((item) => item.categories.includes(categoryKey)), [categoryKey]);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadMiscFavorites());
  const { speakingId, toggle: toggleSpeech } = useMiscSpeech();
  // Which single item's full Transliteration/Meaning is currently shown,
  // and where — see MiscDuaCard's Meaning button and MiscMeaningPopover.
  const { anchor: meaningAnchor, show: handleShowMeaning, close: handleCloseMeaning, dialogRef: meaningDialogRef } =
    useMeaningPopoverState<MiscDuaItem>(".dithar-misc-list");

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
    <DeviceFrame background="var(--wa-page-bg)" scrollLocked={meaningAnchor !== null}>
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

          {/* `relative` + `dithar-misc-list` (a plain marker class, not a
              style hook — same convention as WrittenAdhkarReader's own
              `.dithar-wa-list`) turn this into the positioning context
              MiscMeaningPopover anchors against. */}
          <div className="dithar-misc-list relative mt-4 flex flex-col gap-3 pb-4">
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
                  onToggleFavorite={handleToggleFavorite}
                  isSpeaking={speakingId === item.id}
                  onToggleListen={toggleSpeech}
                  onShowMeaning={handleShowMeaning}
                />
              ))
            )}

            <MiscMeaningPopover anchor={meaningAnchor} onClose={handleCloseMeaning} dialogRef={meaningDialogRef} />
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
