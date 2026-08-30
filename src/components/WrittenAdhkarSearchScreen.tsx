import { useMemo, useState } from "react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BackHeader, StickyBackButton } from "./BackHeader";
import { BottomNav } from "./BottomNav";
import { useLanguage } from "../theme/LanguageContext";
import { writtenAdhkarCategoryLabels, writtenAdhkarItems, writtenAdhkarLabels } from "../data/written-adhkar";
import type { WrittenAdhkarCategoryKey } from "../data/written-adhkar";
import { MISC_CATEGORIES, MISC_DUAS } from "../data/misc-library";
import type { MiscCategoryKey } from "../data/misc-library";

// Where a search result actually navigates to, once tapped — see App.tsx's
// `handleSelectSearchResult`, the only place that acts on this. A plain
// discriminated union (not a screen name) so this component stays
// completely decoupled from AppRouter's own navigation state.
export type WrittenSearchResult =
  | { kind: "written"; category: WrittenAdhkarCategoryKey; itemId: string }
  | { kind: "misc"; category: MiscCategoryKey; itemId: string };

interface SearchHit {
  key: string;
  contextLabel: string;
  title?: string;
  snippet: string;
  navigate: WrittenSearchResult;
}

interface WrittenAdhkarSearchScreenProps {
  onBack: () => void;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToSettings: () => void;
  onSelectResult: (result: WrittenSearchResult) => void;
}

// Morning/Evening/Prayer — searched from `writtenAdhkarItems` directly.
// "misc" is deliberately excluded from this list: that key only ever held
// the small pre-Misc-Library legacy dataset (see written-adhkar.ts), never
// the actual 89-record Miscellaneous/Various Adhkar content a user reads
// today (MISC_DUAS, from misc-library.ts) — searched separately below so
// results always point at real, currently-reachable content.
const WRITTEN_SEARCH_CATEGORIES: WrittenAdhkarCategoryKey[] = ["morning", "evening", "prayer"];

// Search-time-only normalization (see `results` below for where this is
// used) — strips Arabic tashkeel/diacritics and the tatweel elongation
// mark, then folds the common letter-form variants (alef, including the
// Qur'anic wasla "ٱ"; alef maksura "ى" -> yeh; ta marbuta "ة" -> heh) that
// Arabic speakers routinely treat as interchangeable when typing a plain
// search query. Never applied to any text actually rendered, shared, or
// stored — only to throwaway copies used purely for matching.
const ARABIC_DIACRITICS_RE =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08FF\u0640]/g;
function normalizeArabic(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS_RE, "")
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

// Global search across the ENTIRE Written Adhkar library — every
// Morning/Evening/Prayer Dhikr plus the complete Miscellaneous/Various
// Adhkar section (treated as one unified searchable set here, per this
// task's spec, even though it still opens into its own existing
// category screens/navigation once a result is picked). Plain substring
// matching against whichever language is currently active — same
// approach already used by Miscellaneous Adhkar's own in-category search
// (see MiscLibraryScreen.tsx), just widened to the whole library and to
// results that carry enough context (category + a text snippet) to
// recognize which Dhikr they point to before tapping one.
export function WrittenAdhkarSearchScreen({
  onBack,
  onNavigateHome,
  onNavigateToTasbeeh,
  onNavigateToSettings,
  onSelectResult,
}: WrittenAdhkarSearchScreenProps) {
  const { language, dir } = useLanguage();
  const t = writtenAdhkarLabels[language];
  const [query, setQuery] = useState("");

  const results = useMemo<SearchHit[]>(() => {
    const q = query.trim();
    if (!q) return [];
    // English matching is case-insensitive (ordinary search-box behavior
    // for Latin text). Arabic matching normalizes tashkeel/diacritics and
    // the common alef/ya/ta-marbuta letter-form variants on BOTH the query
    // and the searched text before comparing (never on the text actually
    // displayed/shared/stored) — every Dhikr in this library is fully
    // vocalized (e.g. "أَسْتَغْفِرُ") and Qur'an cards additionally use the
    // Uthmani wasla alef "ٱ", so a plain substring match against the raw
    // text would silently return nothing for the ordinary, undiacritized
    // way people actually type Arabic on a keyboard.
    const needle = language === "en" ? q.toLowerCase() : normalizeArabic(q);
    const norm = (s: string) => (language === "en" ? s.toLowerCase() : normalizeArabic(s));
    const hits: SearchHit[] = [];

    WRITTEN_SEARCH_CATEGORIES.forEach((category) => {
      writtenAdhkarItems[category].forEach((item) => {
        const title = language === "ar" ? item.title_ar : item.title_en;
        const body =
          language === "ar" ? item.text_ar : [item.text_en, item.transliteration_en].filter(Boolean).join(" ");
        if (norm(body).includes(needle) || (title && norm(title).includes(needle))) {
          hits.push({
            // Prefixed with `category`, not just the item id: a handful of
            // cards (e.g. Ayat al-Kursi) are deliberately shown in BOTH
            // Morning and Evening under the same underlying id (see
            // written-adhkar.ts's `morning_evening` staging category) — a
            // key of just the id would collide when both legitimately
            // match the same query.
            key: `written-${category}-${item.id}`,
            contextLabel: writtenAdhkarCategoryLabels[category][language],
            title,
            snippet: language === "ar" ? item.text_ar : item.text_en,
            navigate: { kind: "written", category, itemId: item.id },
          });
        }
      });
    });

    MISC_DUAS.forEach((item) => {
      const body =
        language === "ar" ? item.text_ar : [item.englishMeaning, item.englishTransliteration].filter(Boolean).join(" ");
      if (!norm(body).includes(needle)) return;
      // A dua can belong to several categories (see MiscDuaItem.categories)
      // — the first one listed is where the result navigates to, matching
      // that item's own primary categorization in the source data.
      const primaryCategory = item.categories[0];
      const miscMeta = MISC_CATEGORIES[primaryCategory];
      hits.push({
        key: `misc-${item.id}`,
        contextLabel: `${writtenAdhkarCategoryLabels.misc[language]} — ${language === "en" ? miscMeta.title_en : miscMeta.title_ar}`,
        snippet: language === "ar" ? item.text_ar : (item.englishMeaning ?? item.text_ar),
        navigate: { kind: "misc", category: primaryCategory, itemId: item.id },
      });
    });

    return hits;
  }, [query, language]);

  return (
    <DeviceFrame background="var(--wa-category-bg)">
      <AppShell>
        <TopBar />
        <div className="dithar-wa-search-list relative flex flex-1 flex-col">
          <StickyBackButton onBack={onBack} backLabel={t.back} dir={dir} />
          <BackHeader title={t.searchTitle} onBack={onBack} backLabel={t.back} hideButton />

          <div className="mt-3">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchAria}
              dir={dir}
              className="w-full rounded-full border px-4 py-2 text-[13px]"
              style={{ borderColor: "var(--wa-gold-soft)", background: "var(--wa-surface)", color: "var(--wa-ink)" }}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2.5 pb-4">
            {query.trim().length === 0 ? (
              <p className="mt-8 text-center text-[13px]" style={{ color: "var(--wa-ink-muted)" }}>
                {t.searchHint}
              </p>
            ) : results.length === 0 ? (
              <p className="mt-8 text-center text-[13px]" style={{ color: "var(--wa-ink-muted)" }}>
                {t.noResults}
              </p>
            ) : (
              results.map((hit) => (
                <button
                  key={hit.key}
                  type="button"
                  onClick={() => onSelectResult(hit.navigate)}
                  className="flex flex-col items-start gap-1 px-4 py-3 text-start"
                  style={{
                    borderRadius: "var(--wa-card-radius)",
                    background: "var(--wa-surface)",
                    boxShadow: "0 8px 20px -16px rgba(var(--color-shadow-rgb), 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
                  }}
                >
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--wa-gold)" }}>
                    {hit.contextLabel}
                  </span>
                  {hit.title && (
                    <span className="text-[12px] font-semibold" style={{ color: "var(--wa-ink)" }}>
                      {hit.title}
                    </span>
                  )}
                  <span
                    dir={language === "ar" ? "rtl" : "ltr"}
                    className="line-clamp-2 text-[12.5px] leading-snug"
                    style={{ color: "var(--wa-ink-muted)" }}
                  >
                    {hit.snippet}
                  </span>
                </button>
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
            if (key === "written") onBack();
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
