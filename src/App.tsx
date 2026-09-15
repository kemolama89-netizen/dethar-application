import { lazy, Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider, useLanguage } from "./theme/LanguageContext";
import { PaletteProvider } from "./theme/PaletteContext";
import { DeviceFrame } from "./components/DeviceFrame";
import { AppShell } from "./components/AppShell";
import { TopBar } from "./components/TopBar";
import { LogoHeader } from "./components/LogoHeader";
import { DateTimeStrip } from "./components/DateTimeStrip";
import { InsightCard } from "./components/InsightCard";
import type { InsightCardDetail } from "./components/InsightCard";
import { PrayerTimesPanel } from "./components/PrayerTimesPanel";
import { BottomNav } from "./components/BottomNav";
import { ContentModal } from "./components/ContentModal";
import { LocationChangePrompt } from "./components/LocationChangePrompt";
import { useLocationChangeDetector } from "./lib/useLocationChangeDetector";
import { BookOpen, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { MosqueDomeIcon, TasbihBeadsIcon } from "./icons/CustomIcons";
import { labels } from "./data/content";
import { WAMDAT, getWamdaVerseText, getWamdaVerseReference, getWamdaSourceCitation } from "./data/wamdat";
import { HADITHS, getHadithDetailFields } from "./data/hadith";
import type { HadithDetailKey } from "./data/hadith";
import { useDateTime } from "./lib/useDateTime";
import { dateKeyToDayNumber } from "./lib/dateTime";
import type { WrittenAdhkarCategoryKey } from "./data/written-adhkar";
import type { MiscCategoryKey } from "./data/misc-library";
import type { WrittenSearchResult } from "./components/WrittenAdhkarSearchScreen";

// Every screen except Home is loaded lazily, in its own chunk, fetched only
// the first time the user actually navigates there — Home is the one
// screen guaranteed to be needed at startup, so it alone stays a static
// import. Named exports need the .then() remap since React.lazy expects a
// module with a default export. Behavior is unchanged: AppRouter still
// picks exactly one of these to render, exactly as before.
//
// Each loader is kept as its own named function (rather than inlined into
// `lazy(...)`) so the SAME function can also be called directly, ahead of
// time, from the idle-prefetch effect below — `import()` for a module
// that's already loaded/loading just returns the cached promise instead
// of firing a second network request, so calling a loader early here and
// having React.lazy call it again later never double-fetches anything.
const loadTasbeehScreen = () => import("./components/TasbeehScreen").then((m) => ({ default: m.TasbeehScreen }));
const loadWrittenAdhkarScreen = () =>
  import("./components/WrittenAdhkarScreen").then((m) => ({ default: m.WrittenAdhkarScreen }));
const loadWrittenAdhkarReader = () =>
  import("./components/WrittenAdhkarReader").then((m) => ({ default: m.WrittenAdhkarReader }));
const loadWrittenAdhkarSearchScreen = () =>
  import("./components/WrittenAdhkarSearchScreen").then((m) => ({ default: m.WrittenAdhkarSearchScreen }));
const loadSettingsScreen = () => import("./components/SettingsScreen").then((m) => ({ default: m.SettingsScreen }));
const loadMiscLibraryScreen = () =>
  import("./components/MiscLibraryScreen").then((m) => ({ default: m.MiscLibraryScreen }));
const loadMiscCategoryScreen = () =>
  import("./components/MiscCategoryScreen").then((m) => ({ default: m.MiscCategoryScreen }));

const TasbeehScreen = lazy(loadTasbeehScreen);
const WrittenAdhkarScreen = lazy(loadWrittenAdhkarScreen);
const WrittenAdhkarReader = lazy(loadWrittenAdhkarReader);
const WrittenAdhkarSearchScreen = lazy(loadWrittenAdhkarSearchScreen);
const SettingsScreen = lazy(loadSettingsScreen);
const MiscLibraryScreen = lazy(loadMiscLibraryScreen);
const MiscCategoryScreen = lazy(loadMiscCategoryScreen);

// Fetches a lazy screen's chunk ahead of the user actually navigating to
// it, once the browser is idle (never competing with the current screen's
// own render/paint work) — so by the time they tap the nav item, the
// chunk is already cached and Suspense resolves on the same tick instead
// of waiting on a network round trip. `requestIdleCallback` isn't in
// Safari, hence the timeout fallback; the failure catch is because a
// prefetch that's interrupted (e.g. the user navigates away first) should
// never surface as an unhandled rejection — the real navigation's own
// lazy() call just falls back to loading it normally.
function preloadOnIdle(loader: () => Promise<unknown>) {
  const run = () => {
    loader().catch(() => {});
  };
  if (typeof window === "undefined") return;
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run);
  } else {
    window.setTimeout(run, 200);
  }
}

// Shown for the brief moment a lazy screen's chunk is being fetched — just
// the same frame chrome every screen already renders first (see
// DeviceFrame/AppShell/TopBar below), so the transition never drops to a
// bare blank page. On a bundled production build this chunk fetch is
// typically imperceptible; this only guards the rare slow-network case.
function ScreenFallback() {
  return (
    <DeviceFrame>
      <AppShell>
        <TopBar />
      </AppShell>
    </DeviceFrame>
  );
}

// The Featured Hadith under the logo is never previewed/clamped — it has
// no modal state here. Both Home cards (Quranic Insight and Hadith) share
// the same full-content overlay (ContentModal) via this one piece of
// state — only one can be open at a time, which also matches "opening one
// closes the other" being the only sane behavior.
type OpenCard = "quran" | "hadith" | null;

// Resolving `language` -> the right content object happens once, here —
// InsightCard/PrayerTimesPanel/BottomNav stay simple/localization-agnostic,
// they just render whatever strings they're given.
//
// `onNavigateToTasbeeh`/`onNavigateToWritten` are the only additions
// needed to make BottomNav's السبحة/Tasbeeh and الأذكار المكتوبة/Written
// Adhkar items actually navigate — everything else in this function is
// unchanged from the approved Home Screen.
function HomeScreen({
  onNavigateToTasbeeh,
  onNavigateToWritten,
  onNavigateToSettings,
}: {
  onNavigateToTasbeeh: () => void;
  onNavigateToWritten: () => void;
  onNavigateToSettings: () => void;
}) {
  const { language, dir } = useLanguage();
  const t = labels[language];

  // Date & Time foundation — device clock + device timezone only (see
  // src/lib/dateTime.ts), the single source of truth for today's date and
  // the current time. `dateKey` is this same hook's stable LOCAL-calendar-
  // day identity ("YYYY-MM-DD"); Lataif/Hadith's own daily rotation below
  // is derived from it (via dateKeyToDayNumber) instead of each keeping
  // its own separate UTC-epoch-day calculation, so the day flips at the
  // device's actual local midnight rather than at UTC midnight. `date`
  // feeds PrayerTimesPanel's real calculation below (which LOCAL day to
  // calculate for) — it reuses this one foundation for "today" rather
  // than creating its own. PrayerTimesPanel gets its own timezone from
  // useCoordinates instead of from here — see that hook's own comment for
  // why it's paired with location, not with the device clock.
  const { dateKey, date } = useDateTime(language);
  const dayNumber = dateKeyToDayNumber(dateKey);

  // Step 5: location-change detection. Runs only while Home is mounted
  // (see useLocationChangeDetector.ts's own comment on this scoping
  // trade-off). `refreshToken` is passed as PrayerTimesPanel's `key` —
  // the same force-remount idiom AppRouter's own screen-switch routing
  // already uses (`key={screen}`) — so a CONFIRMED location update makes
  // PrayerTimesPanel's useCoordinates() re-read the freshly-saved
  // location instead of staying on its stale mount-time snapshot.
  const locationChange = useLocationChangeDetector();

  // Local state for the "Read more" full-content modal — not global,
  // just which (if any) card's full content is currently open.
  const [openCard, setOpenCard] = useState<OpenCard>(null);

  // The Quranic Insight card (لطيفة قرآنية) is DITHAR's "Wamda" (Tafsir
  // Flash) card. FINAL production behavior: one deterministic flash per
  // local calendar day — dayNumber (from the shared dateKey above) modulo
  // the flash count — so every user sees the same flash on a given day
  // with no stored state needed, and the cycle continues seamlessly past
  // the last flash back to flash #1. This logic is complete and untouched
  // by the temporary toggle below.
  const dayFlashIndex = dayNumber % WAMDAT.length;

  // TEMPORARY, web-only testing phase: while true, the card is driven by
  // the manual Refresh control below (sequential, wraps back to the
  // start) instead of dayFlashIndex above, so every flash can be
  // clicked through and verified in the browser. Set this to `false`
  // (or delete this flag, `previewFlashIndex`, and the button below) once
  // the mobile app ships and only the day-based rotation is needed —
  // dayFlashIndex requires no change at that point.
  const IS_TAFSIR_PREVIEW_TESTING = true;

  // Plain React state: normal re-renders never advance it — only the
  // button's onClick does, by exactly one step, wrapping from the last
  // flash back to #1. Starts at #1 (index 0) on every fresh mount.
  const [previewFlashIndex, setPreviewFlashIndex] = useState(0);

  // Browsing history of the flashes actually shown by Refresh (not a
  // numerical id/index walk) — the stack's top always equals
  // `previewFlashIndex`. Previous pops the top and reveals what's under
  // it, without pushing anything, so it retraces exactly what the user
  // saw. Refresh always pushes forward from wherever the stack currently
  // sits, so going back and then refreshing starts a new path from that
  // point (the old "future" entries were never kept in the first place).
  const [flashHistory, setFlashHistory] = useState<number[]>([0]);
  const canGoToPreviousFlash = flashHistory.length > 1;

  function handleRefreshFlash() {
    const next = (previewFlashIndex + 1) % WAMDAT.length;
    setPreviewFlashIndex(next);
    setFlashHistory((history) => (next === history[history.length - 1] ? history : [...history, next]));
  }

  function handlePreviousFlash() {
    if (flashHistory.length <= 1) return;
    const newHistory = flashHistory.slice(0, -1);
    setFlashHistory(newHistory);
    setPreviewFlashIndex(newHistory[newHistory.length - 1]);
  }

  const flashIndex = IS_TAFSIR_PREVIEW_TESTING ? previewFlashIndex : dayFlashIndex;
  const flash = WAMDAT[flashIndex];
  // Display order requested for the card: verse, then its surah/ayah
  // reference, then the Wamda insight itself, then the tafsir source —
  // all four sourced verbatim from this one flash record, so Refresh
  // (preview) / the new day (production) always swap them together,
  // never independently. verse/verseReference are derived from the raw
  // `ayah` field (see getWamdaVerseText/getWamdaVerseReference) since the
  // dataset stores them combined, unlike the old dataset's separate
  // fields.
  // `flash.source` (the tafsir book citation, e.g. "التحرير والتنوير - ابن
  // عاشور") has no englishSource field in the Wamdat dataset — Arabic
  // shows it verbatim; English uses getWamdaSourceCitation's own
  // dictionary of the 17 known classical-work titles this library cites,
  // and is `undefined` (never the Arabic string under an English label)
  // for the rare case that dictionary doesn't cover.
  const insight = {
    verse: getWamdaVerseText(flash),
    verseReference: getWamdaVerseReference(flash),
    body: language === "ar" ? flash.insightAr : flash.insightEn,
    citation: getWamdaSourceCitation(flash, language),
  };

  // The Hadith card (حديث نبوي) — same deterministic-daily-pick pattern as
  // the Quranic Insight card above (same shared `dayNumber`, from the
  // Date & Time foundation's local dateKey), now backed by the 200-entry
  // dithar_hadith_library_final.json (see src/data/hadith.ts) instead of
  // the old single static hadith. One Hadith per local calendar day, same
  // seamless wrap past the last entry back to #1.
  const dayHadithIndex = dayNumber % HADITHS.length;

  // TEMPORARY, web-only testing phase — same purpose/lifecycle as
  // IS_TAFSIR_PREVIEW_TESTING above: while true, the card is driven by the
  // manual Refresh/Previous controls below instead of dayHadithIndex, so
  // all 200 Hadiths can be reviewed in the browser. Set this to `false`
  // (or delete this flag, `previewHadithIndex`, `hadithHistory`, and the
  // two buttons below) once review is done — dayHadithIndex requires no
  // change at that point.
  const IS_HADITH_PREVIEW_TESTING = true;

  const [previewHadithIndex, setPreviewHadithIndex] = useState(0);

  // Same "browsing history, not a numerical walk" behavior as
  // flashHistory above — Previous retraces exactly what Refresh actually
  // showed.
  const [hadithHistory, setHadithHistory] = useState<number[]>([0]);
  const canGoToPreviousHadith = hadithHistory.length > 1;

  function handleRefreshHadith() {
    const next = (previewHadithIndex + 1) % HADITHS.length;
    setPreviewHadithIndex(next);
    setHadithHistory((history) => (next === history[history.length - 1] ? history : [...history, next]));
  }

  function handlePreviousHadith() {
    if (hadithHistory.length <= 1) return;
    const newHistory = hadithHistory.slice(0, -1);
    setHadithHistory(newHistory);
    setPreviewHadithIndex(newHistory[newHistory.length - 1]);
  }

  const hadithIndex = IS_HADITH_PREVIEW_TESTING ? previewHadithIndex : dayHadithIndex;
  const hadithEntry = HADITHS[hadithIndex];
  const hadith = {
    body: language === "ar" ? hadithEntry.textAr : hadithEntry.textEn,
  };

  // The Hadith's structured takhrij/details (Source, Hadith No., Grade,
  // Grading Source, Narrator) — see getHadithDetailFields's own doc
  // comment for exactly how much of this resolves in English (a field is
  // omitted, never shown half-translated, when its dictionary doesn't
  // cover a given entry). `hadithDetails` existing/non-empty is what shows
  // the Hadith card's "Show More" button (InsightCard.tsx) — never Hadith
  // text length, which fixes short Hadiths not exposing their (fully
  // available, Arabic) details before this change. The rows themselves are
  // rendered by ContentModal, once the full-content overlay is open.
  const hadithDetailLabels: Record<HadithDetailKey, string> = {
    source: t.detailSource,
    reference: t.detailReference,
    grade: t.detailGrade,
    gradingSource: t.detailGradingSource,
    narrator: t.detailNarrator,
  };
  const hadithDetails: InsightCardDetail[] = getHadithDetailFields(hadithEntry, language).map((field) => ({
    label: hadithDetailLabels[field.key],
    value: field.value,
  }));

  return (
    <DeviceFrame scrollLocked={openCard !== null || locationChange.pending !== null}>
      <AppShell>
        <TopBar />
        <LogoHeader />
        <DateTimeStrip className="mt-1" />

        <InsightCard
          variant="quran"
          icon={<BookOpen size={19} strokeWidth={1.7} />}
          title={t.insightTitle}
          verse={insight.verse}
          verseReference={insight.verseReference}
          body={insight.body}
          citation={insight.citation}
          readMoreLabel={t.readMore}
          onReadMore={() => setOpenCard("quran")}
          className="mt-1"
        />

        {IS_TAFSIR_PREVIEW_TESTING && (
          <div className="mt-1 flex items-center gap-3 self-start">
            <button
              type="button"
              onClick={handlePreviousFlash}
              disabled={!canGoToPreviousFlash}
              aria-label="Previous Tafsir Flash"
              className="flex items-center gap-1 text-[11px] font-medium underline underline-offset-2"
              style={{
                color: canGoToPreviousFlash ? "var(--color-gold)" : "var(--color-text-muted)",
                opacity: canGoToPreviousFlash ? 1 : 0.45,
              }}
            >
              {dir === "rtl" ? <ChevronRight size={12} strokeWidth={2} /> : <ChevronLeft size={12} strokeWidth={2} />}
              Previous Tafsir Flash (preview test)
            </button>
            <button
              type="button"
              onClick={handleRefreshFlash}
              className="flex items-center gap-1 text-[11px] font-medium underline underline-offset-2"
              style={{ color: "var(--color-gold)" }}
            >
              <RefreshCw size={12} strokeWidth={2} />
              Refresh Tafsir Flash (preview test) — {flashIndex + 1}/{WAMDAT.length}
            </button>
          </div>
        )}

        <InsightCard
          variant="hadith"
          icon={<MosqueDomeIcon size={19} />}
          title={t.hadithTitle}
          attribution={t.hadithAttribution}
          body={hadith.body}
          details={hadithDetails}
          readMoreLabel={t.showDetails}
          onReadMore={() => setOpenCard("hadith")}
          className="mt-1"
        />

        {IS_HADITH_PREVIEW_TESTING && (
          <div className="mt-1 flex items-center gap-3 self-start">
            <button
              type="button"
              onClick={handlePreviousHadith}
              disabled={!canGoToPreviousHadith}
              aria-label="Previous Hadith"
              className="flex items-center gap-1 text-[11px] font-medium underline underline-offset-2"
              style={{
                color: canGoToPreviousHadith ? "var(--color-gold)" : "var(--color-text-muted)",
                opacity: canGoToPreviousHadith ? 1 : 0.45,
              }}
            >
              {dir === "rtl" ? <ChevronRight size={12} strokeWidth={2} /> : <ChevronLeft size={12} strokeWidth={2} />}
              Previous Hadith (preview test)
            </button>
            <button
              type="button"
              onClick={handleRefreshHadith}
              className="flex items-center gap-1 text-[11px] font-medium underline underline-offset-2"
              style={{ color: "var(--color-gold)" }}
            >
              <RefreshCw size={12} strokeWidth={2} />
              Refresh Hadith (preview test) — {hadithIndex + 1}/{HADITHS.length}
            </button>
          </div>
        )}

        <PrayerTimesPanel key={locationChange.refreshToken} date={date} className="mt-1" />

        {/* Floating Tasbeeh placeholder — the real feature (a native Android
            overlay bubble; see src/lib/floatingTasbeehSync.ts) isn't wired
            up on web yet, so this is a non-interactive "coming soon"
            stand-in only. It reuses the exact circle treatment BottomNav
            already uses for its own Tasbeeh tab (h-11 w-11 rounded-full,
            --color-primary/--color-gold, same TasbihBeadsIcon) plus a
            shadow for a "floating" read, sitting in its own row right
            above the nav's Tasbeeh tab rather than as an overlay, so it can
            never cover any existing card/text on any viewport. */}
        <div className="mt-1 flex justify-end" aria-hidden="true">
          <div
            className="flex items-center gap-1.5 rounded-full border py-1 ps-1 pe-2.5"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-gold-soft)",
              boxShadow: "0 8px 16px -4px rgba(var(--color-shadow-rgb), 0.5)",
            }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "var(--color-primary)", color: "var(--color-gold)" }}
            >
              <TasbihBeadsIcon size={15} />
            </span>
            <span className="text-[11px] font-medium" style={{ color: "var(--color-primary)" }}>
              قريبًا
            </span>
          </div>
        </div>

        <BottomNav
          className="mt-1"
          onSelect={(key) => {
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "written") onNavigateToWritten();
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>

      <ContentModal
        open={openCard === "quran"}
        onClose={() => setOpenCard(null)}
        closeLabel={t.close}
        icon={<BookOpen size={19} strokeWidth={1.7} />}
        title={t.insightTitle}
        verse={insight.verse}
        verseReference={insight.verseReference}
        body={insight.body}
        citation={insight.citation}
      />

      <ContentModal
        open={openCard === "hadith"}
        onClose={() => setOpenCard(null)}
        closeLabel={t.close}
        icon={<MosqueDomeIcon size={19} />}
        title={t.hadithTitle}
        attribution={t.hadithAttribution}
        body={hadith.body}
        details={hadithDetails}
      />

      <LocationChangePrompt
        open={locationChange.pending !== null}
        title={t.locationChangeTitle}
        body={t.locationChangeBody}
        confirmLabel={t.locationChangeConfirm}
        declineLabel={t.locationChangeDecline}
        onConfirm={locationChange.confirmUpdate}
        onDecline={locationChange.decline}
      />
    </DeviceFrame>
  );
}

type Screen = "home" | "tasbeeh" | "written" | "written-reader" | "written-search" | "misc-library" | "misc-category" | "settings";

// Minimal in-memory screen switcher — no router dependency added. No
// screen persists its state across a switch (matching how theme/language
// already don't persist across a reload): navigating away and back
// unmounts/remounts, so e.g. the Tasbeeh counter or the domino reader's
// progress resets each visit.
//
// `writtenCategory` is the one extra piece of navigation state the
// Written Adhkar flow needs (Home -> Written Adhkar -> Category ->
// Reader) — which category the reader should open. It's set right before
// switching to "written-reader" and simply left as-is when navigating
// back to "written" (the category list doesn't read it).
//
// Every branch's returned screen is wrapped in the SAME
// `dithar-app-transition` element, keyed by `screen` — that key is what
// makes React remount (and so replay the fade-in) on every navigation,
// giving one unified transition language across all sections without
// touching HomeScreen's or TasbeehScreen's own markup at all: this only
// wraps their already-existing output at the router boundary.
function AppRouter() {
  const [screen, setScreen] = useState<Screen>("home");
  const [writtenCategory, setWrittenCategory] = useState<WrittenAdhkarCategoryKey>("morning");
  // Which Misc-library category the detail screen should open — same
  // pattern as `writtenCategory` above, set right before switching to
  // "misc-category" and simply left as-is on the way back.
  const [miscCategory, setMiscCategory] = useState<MiscCategoryKey>("comprehensive");
  // The specific Dhikr/dua a global search result pointed at — set ONLY
  // right before jumping into "written-reader"/"misc-category" FROM a
  // search result (see handleSelectSearchResult below), read once by that
  // screen to scroll straight to it instead of starting at the top.
  // Explicitly cleared to `null` at every ORDINARY entry point into those
  // two screens (the category tiles, the bottom-nav "written" tab) so a
  // stale target from a previous search never lingers into a normal visit.
  const [searchTargetItemId, setSearchTargetItemId] = useState<string | null>(null);

  function handleSelectSearchResult(result: WrittenSearchResult) {
    setSearchTargetItemId(result.itemId);
    if (result.kind === "written") {
      setWrittenCategory(result.category);
      setScreen("written-reader");
    } else {
      setMiscCategory(result.category);
      setScreen("misc-category");
    }
  }

  // Warms the chunk (and, for Misc Library, its category images — see
  // that module's own preload side effect) for whichever screen is the
  // likely NEXT hop from wherever the user currently is, once the browser
  // is idle. This is what makes Home -> Settings/Tasbeeh and
  // Written -> Misc Library feel instant instead of waiting on a chunk
  // fetch triggered only at the moment of navigation. Deliberately not
  // "prefetch everything from Home": screens two hops away (the reader,
  // the category detail screen) only get warmed once the user has
  // actually entered that flow, so the initial idle work stays small.
  useEffect(() => {
    if (screen === "home") {
      preloadOnIdle(loadTasbeehScreen);
      preloadOnIdle(loadWrittenAdhkarScreen);
      preloadOnIdle(loadSettingsScreen);
    } else if (screen === "written") {
      preloadOnIdle(loadWrittenAdhkarReader);
      preloadOnIdle(loadMiscLibraryScreen);
      preloadOnIdle(loadWrittenAdhkarSearchScreen);
    } else if (screen === "misc-library") {
      preloadOnIdle(loadMiscCategoryScreen);
    }
  }, [screen]);

  if (screen === "tasbeeh") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <TasbeehScreen
            onNavigateHome={() => setScreen("home")}
            onNavigateToWritten={() => setScreen("written")}
            onNavigateToSettings={() => setScreen("settings")}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "written") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <WrittenAdhkarScreen
            onNavigateHome={() => setScreen("home")}
            onNavigateToTasbeeh={() => setScreen("tasbeeh")}
            onNavigateToSettings={() => setScreen("settings")}
            onSelectCategory={(key) => {
              // "Miscellaneous Adhkar & Duas" is now the richer Dithar
              // Library (landing + category grid + search) built from
              // ASSETS/dithar_master_content_library.md, rather than the
              // old flat single-reader list — every other category is
              // completely unaffected and still opens the existing reader.
              setSearchTargetItemId(null);
              if (key === "misc") {
                setScreen("misc-library");
                return;
              }
              setWrittenCategory(key);
              setScreen("written-reader");
            }}
            onOpenSearch={() => setScreen("written-search")}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "written-reader") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <WrittenAdhkarReader
            category={writtenCategory}
            onNavigateHome={() => setScreen("home")}
            onNavigateToTasbeeh={() => setScreen("tasbeeh")}
            onNavigateToSettings={() => setScreen("settings")}
            onBackToCategories={() => setScreen("written")}
            targetItemId={searchTargetItemId ?? undefined}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "written-search") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <WrittenAdhkarSearchScreen
            onBack={() => setScreen("written")}
            onNavigateHome={() => setScreen("home")}
            onNavigateToTasbeeh={() => setScreen("tasbeeh")}
            onNavigateToSettings={() => setScreen("settings")}
            onSelectResult={handleSelectSearchResult}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "misc-library") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <MiscLibraryScreen
            onBack={() => setScreen("written")}
            onNavigateHome={() => setScreen("home")}
            onNavigateToTasbeeh={() => setScreen("tasbeeh")}
            onNavigateToSettings={() => setScreen("settings")}
            onSelectCategory={(key) => {
              setSearchTargetItemId(null);
              setMiscCategory(key);
              setScreen("misc-category");
            }}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "misc-category") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <MiscCategoryScreen
            categoryKey={miscCategory}
            onBack={() => setScreen("misc-library")}
            onNavigateToWrittenRoot={() => setScreen("written")}
            onNavigateHome={() => setScreen("home")}
            onNavigateToTasbeeh={() => setScreen("tasbeeh")}
            onNavigateToSettings={() => setScreen("settings")}
            targetItemId={searchTargetItemId ?? undefined}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "settings") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <SettingsScreen
            onNavigateHome={() => setScreen("home")}
            onNavigateToTasbeeh={() => setScreen("tasbeeh")}
            onNavigateToWritten={() => setScreen("written")}
          />
        </Suspense>
      </div>
    );
  }
  return (
    <div key={screen} className="dithar-app-transition">
      <HomeScreen
        onNavigateToTasbeeh={() => setScreen("tasbeeh")}
        onNavigateToWritten={() => setScreen("written")}
        onNavigateToSettings={() => setScreen("settings")}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <PaletteProvider>
          <AppRouter />
        </PaletteProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
