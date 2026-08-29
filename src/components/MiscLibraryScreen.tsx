import { useCallback, useMemo, useState } from "react";
import type { ComponentType } from "react";
import {
  Search,
  ShieldCheck,
  CloudSun,
  Moon,
  Users,
  Compass,
  House,
  Utensils,
  MessageCircle,
  CloudRain,
  BookOpen,
  Sunrise,
  Gem,
  Sparkles,
  Coins,
  Anchor,
  CalendarDays,
} from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BackHeader, StickyBackButton } from "./BackHeader";
import { BottomNav } from "./BottomNav";
import { MiscDuaCard, MiscMeaningPopover } from "./MiscDuaCard";
import { useMeaningPopoverState } from "./MeaningPopover";
import { MedallionIcon, LanternOutlineIcon, MosqueDomeIcon, ArchNicheOutline } from "../icons/CustomIcons";
import {
  MISC_CATEGORY_ORDER,
  MISC_CATEGORIES,
  MISC_CATEGORY_COUNTS,
  MISC_DUAS,
  MISC_FEATURED_IDS,
  miscLibraryLabels,
} from "../data/misc-library";
import type { MiscCategoryKey, MiscDuaItem } from "../data/misc-library";
import { loadMiscFavorites, saveMiscFavorites } from "../lib/miscFavorites";
import { useMiscSpeech } from "../lib/useMiscSpeech";
import { useLanguage } from "../theme/LanguageContext";

interface MiscLibraryScreenProps {
  onBack: () => void;
  onSelectCategory: (key: MiscCategoryKey) => void;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToSettings: () => void;
}

// `className` is the one prop every icon here actually shares — the four
// custom icons (CustomIcons.tsx) don't all declare `size`/`strokeWidth`
// (ArchNicheOutline takes no `size` at all), while lucide's icons do. CSS
// width/height utility classes override an SVG's own size regardless, so
// sizing purely through `className` works uniformly for both families.
type IconComponent = ComponentType<{ className?: string }>;

// One icon per category, reusing this app's existing icon language —
// purpose-built custom outline icons where one already exists (mosque,
// prayer-niche), plain thin-line lucide icons everywhere else (the same
// icon set already used throughout BottomNav/PrayerTimesPanel/Settings).
// Deliberately no photography here (see this task's report) — every card
// still reserves a dedicated image-ready slot below the icon so a real
// photographic asset can be dropped in later with no component changes.
const CATEGORY_ICONS: Record<MiscCategoryKey, IconComponent> = {
  comprehensive: MedallionIcon,
  istighfar: Sunrise,
  protection: ShieldCheck,
  distress: CloudSun,
  healing: LanternOutlineIcon,
  deceased: Moon,
  family: Users,
  travel: Compass,
  home: House,
  mosque: MosqueDomeIcon,
  food: Utensils,
  gatherings: MessageCircle,
  weather: CloudRain,
  quran: BookOpen,
  prayer: ArchNicheOutline,
  authenticRare: Gem,
  istikharah: Sparkles,
  debtRizq: Coins,
  guidance: Anchor,
  seasonal: CalendarDays,
};

// One shared tile for every category size — "large" (the single featured
// "أدعية جامعة" entry point), "special" (the distinctly-but-subtly framed
// "صحيح مهجور" editorial tile — a slightly warmer border, never a
// game/reward treatment), and the plain default for everything else.
function CategoryTile({
  categoryKey,
  size,
  onSelect,
}: {
  categoryKey: MiscCategoryKey;
  size: "large" | "default" | "special";
  onSelect: () => void;
}) {
  const { language } = useLanguage();
  const t = miscLibraryLabels[language];
  const meta = MISC_CATEGORIES[categoryKey];
  const Icon = CATEGORY_ICONS[categoryKey];
  const count = MISC_CATEGORY_COUNTS[categoryKey];
  const isEmpty = count === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isEmpty}
      className={`relative flex w-full flex-col overflow-hidden text-start ${size === "large" ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}
      style={{
        borderRadius: "var(--wa-card-radius)",
        background: "var(--wa-surface)",
        boxShadow:
          size === "special"
            ? "0 8px 20px -16px rgba(var(--color-shadow-rgb), 0.14), inset 0 0 0 1.5px var(--wa-gold)"
            : "0 8px 20px -16px rgba(var(--color-shadow-rgb), 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
        opacity: isEmpty ? 0.55 : 1,
      }}
    >
      {meta.image ? (
        // The gold-soft tone underneath is the same one the icon fallback
        // below already uses — it shows through for the instant between
        // mount and image-decode so the card reads as "a warm Dithar
        // card" rather than flashing the near-white --wa-surface behind
        // it, with no separate loading state/animation to manage.
        <div className="absolute inset-0" style={{ background: "var(--wa-gold-soft)" }}>
          <img
            src={meta.image}
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </div>
      ) : (
        // Fallback for the categories with no uploaded artwork yet — the
        // original plain, neutral single-tone icon placeholder.
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "var(--wa-gold-soft)" }}>
          <Icon className={size === "large" ? "h-9 w-9 opacity-80" : "h-6 w-6 opacity-80"} />
        </div>
      )}

      {/* Lower text overlay — a soft dark gradient only over the bottom of
          the artwork, just enough to keep the title/count readable
          regardless of the underlying photo. Real HTML text, never baked
          into the image. */}
      <div
        className="relative mt-auto flex flex-col gap-0.5 px-3 py-2.5"
        style={
          meta.image
            ? { background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 60%, rgba(0,0,0,0) 100%)" }
            : undefined
        }
      >
        <h3
          className={size === "large" ? "text-[15px] font-bold" : "text-[12.5px] font-bold"}
          style={{ fontFamily: "var(--font-display)", color: meta.image ? "#ffffff" : "var(--wa-ink)" }}
        >
          {language === "en" ? meta.title_en : meta.title_ar}
        </h3>
        {size === "large" && (
          <p
            className="text-[11px] leading-snug"
            style={{ color: meta.image ? "rgba(255,255,255,0.85)" : "var(--wa-ink-muted)" }}
          >
            {language === "en" ? meta.subtitle_en : meta.subtitle_ar}
          </p>
        )}
        <p className="mt-0.5 text-[10px] font-semibold" style={{ color: "var(--wa-gold)" }}>
          {isEmpty ? t.comingSoon : t.itemsCount(count)}
        </p>
      </div>
    </button>
  );
}

export function MiscLibraryScreen({
  onBack,
  onSelectCategory,
  onNavigateHome,
  onNavigateToTasbeeh,
  onNavigateToSettings,
}: MiscLibraryScreenProps) {
  const { language, dir } = useLanguage();
  const t = miscLibraryLabels[language];
  const [favorites, setFavorites] = useState<Set<string>>(() => loadMiscFavorites());
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { speakingId, toggle: toggleSpeech } = useMiscSpeech();
  // Which single item's full Transliteration/Meaning is currently shown,
  // and where — shared across both card lists below (search results and
  // featured), which never render at the same time. See MiscDuaCard's
  // Meaning button and MiscMeaningPopover.
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

  // Simple substring search across the dua text and every category name it
  // belongs to — no fuzzy matching, no external search service, matching
  // the plain in-memory data this whole feature already uses.
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return MISC_DUAS.filter((item) => {
      if (item.text_ar.includes(q)) return true;
      return item.categories.some((key) => MISC_CATEGORIES[key].title_ar.includes(q));
    });
  }, [query]);

  const featuredItems = useMemo(
    () => MISC_FEATURED_IDS.map((id) => MISC_DUAS.find((item) => item.id === id)).filter((item) => item !== undefined),
    [],
  );

  const isSearching = searchOpen && query.trim().length > 0;

  return (
    <DeviceFrame background="var(--wa-page-bg)" scrollLocked={meaningAnchor !== null}>
      <AppShell>
        <TopBar />
        {/* `relative` + `dithar-misc-list` (a plain marker class, not a
            style hook — same convention as WrittenAdhkarReader's own
            `.dithar-wa-list`) turn this into the positioning context
            MiscMeaningPopover anchors against; it's the common ancestor of
            both card lists below, which never render at the same time. */}
        <div className="dithar-misc-list relative flex flex-1 flex-col">
          <StickyBackButton onBack={onBack} backLabel={t.back} dir={dir} />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <BackHeader title={t.screenTitle} onBack={onBack} backLabel={t.back} hideButton />
            </div>
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label={t.searchAria}
              aria-pressed={searchOpen}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                boxShadow: "inset 0 0 0 1.5px var(--wa-gold)",
                background: searchOpen ? "var(--wa-gold)" : "var(--wa-surface)",
                color: searchOpen ? "var(--wa-surface)" : "var(--wa-ink)",
              }}
            >
              <Search size={16} strokeWidth={1.8} />
            </button>
          </div>

          <p className="mt-1 text-center text-[12.5px]" style={{ color: "var(--wa-on-page-muted)" }}>
            {t.screenSubtitle}
          </p>

          {searchOpen && (
            <div className="mt-3">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchAria}
                dir="rtl"
                className="w-full rounded-full border px-4 py-2 text-[13px]"
                style={{ borderColor: "var(--wa-gold-soft)", background: "var(--wa-surface)", color: "var(--wa-ink)" }}
              />
            </div>
          )}

          {isSearching ? (
            <div className="mt-4 flex flex-col gap-3 pb-4">
              {searchResults.length === 0 ? (
                <p className="mt-8 text-center text-[13px]" style={{ color: "var(--wa-on-page-muted)" }}>
                  {t.noResults}
                </p>
              ) : (
                searchResults.map((item) => (
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
            </div>
          ) : (
            <>
              {/* "مختارات اليوم" — a small, FIXED editorial selection (see
                  MISC_FEATURED_IDS), never random/generated content. */}
              {featuredItems.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-[12.5px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wa-gold)" }}>
                    {t.featuredTitle}
                  </h2>
                  <div className="mt-2 flex flex-col gap-3">
                    {featuredItems.map((item) => (
                      <MiscDuaCard
                        key={item.id}
                        item={item}
                        isFavorite={favorites.has(item.id)}
                        onToggleFavorite={handleToggleFavorite}
                        isSpeaking={speakingId === item.id}
                        onToggleListen={toggleSpeech}
                        onShowMeaning={handleShowMeaning}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3 pb-4">
                <CategoryTile categoryKey="comprehensive" size="large" onSelect={() => onSelectCategory("comprehensive")} />
                {MISC_CATEGORY_ORDER.filter((key) => key !== "comprehensive" && key !== "authenticRare").map((key) => (
                  <CategoryTile key={key} categoryKey={key} size="default" onSelect={() => onSelectCategory(key)} />
                ))}
                <CategoryTile categoryKey="authenticRare" size="special" onSelect={() => onSelectCategory("authenticRare")} />
              </div>
            </>
          )}

          <MiscMeaningPopover anchor={meaningAnchor} onClose={handleCloseMeaning} dialogRef={meaningDialogRef} />
        </div>

        <BottomNav
          className="mt-2"
          activeKey="written"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "written") onBack();
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
