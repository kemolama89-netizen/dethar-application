import { lazy, Suspense, useEffect, useState } from "react";
import { useScreenNavigation } from "./lib/useScreenNavigation";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider, useLanguage } from "./theme/LanguageContext";
import { PaletteProvider } from "./theme/PaletteContext";
import { QuranReciterProvider } from "./theme/QuranReciterContext";
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
import { MosqueDomeIcon } from "./icons/CustomIcons";
import { labels } from "./data/content";
import { WAMDAT, getWamdaVerseText, getWamdaVerseReference, getWamdaSourceCitation } from "./data/wamdat";
import { HADITHS, getHadithDetailFields } from "./data/hadith";
import type { HadithDetailKey } from "./data/hadith";
import { useDateTime } from "./lib/useDateTime";
import {
  loadInstallationAnchorDateKey,
  saveInstallationAnchorDateKey,
  computeInstallationDayNumber,
  installationDayToIndex,
} from "./lib/dailyContentProgress";
import type { WrittenAdhkarCategoryKey } from "./data/written-adhkar";
import type { MiscCategoryKey } from "./data/misc-library";
import type { WrittenSearchResult } from "./components/WrittenAdhkarSearchScreen";
import type { AudioAdhkarList } from "./components/AudioAdhkarScreen";
import { startFloatingOpenRouteRequests, startFloatingTasbeehSync } from "./lib/floatingTasbeehSync";
import { isAudioAdhkarNativeAvailable } from "./lib/audioAdhkarNative";

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
const loadAudioAdhkarModule = () => import("./components/AudioAdhkarScreen");

const TasbeehScreen = lazy(loadTasbeehScreen);
const WrittenAdhkarScreen = lazy(loadWrittenAdhkarScreen);
const WrittenAdhkarReader = lazy(loadWrittenAdhkarReader);
const WrittenAdhkarSearchScreen = lazy(loadWrittenAdhkarSearchScreen);
const SettingsScreen = lazy(loadSettingsScreen);
const MiscLibraryScreen = lazy(loadMiscLibraryScreen);
const MiscCategoryScreen = lazy(loadMiscCategoryScreen);
const AudioAdhkarScreen = lazy(() => loadAudioAdhkarModule().then((m) => ({ default: m.AudioAdhkarScreen })));
const AudioMiscCategoriesScreen = lazy(() => loadAudioAdhkarModule().then((m) => ({ default: m.AudioMiscCategoriesScreen })));
const AudioAdhkarListScreen = lazy(() => loadAudioAdhkarModule().then((m) => ({ default: m.AudioAdhkarListScreen })));

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
  onNavigateToAudio,
}: {
  onNavigateToTasbeeh: () => void;
  onNavigateToWritten: () => void;
  onNavigateToSettings: () => void;
  onNavigateToAudio: () => void;
}) {
  const { language, dir } = useLanguage();
  const t = labels[language];

  // Date & Time foundation — device clock + device timezone only (see
  // src/lib/dateTime.ts), the single source of truth for today's date and
  // the current time. `dateKey` is this same hook's stable LOCAL-calendar-
  // day identity ("YYYY-MM-DD"); Lataif/Hadith's own daily rotation below
  // is derived from it instead of each keeping its own separate UTC-epoch-
  // day calculation, so the day flips at the device's actual local
  // midnight rather than at UTC midnight. `date` feeds PrayerTimesPanel's
  // real calculation below (which LOCAL day to calculate for) — it reuses
  // this one foundation for "today" rather than creating its own.
  // PrayerTimesPanel gets its own timezone from useCoordinates instead of
  // from here — see that hook's own comment for why it's paired with
  // location, not with the device clock. This file's own daily-content
  // logic below is the ONLY thing that also derives an installation-day
  // number from `dateKey`; it never feeds back into `date`/PrayerTimesPanel.
  const { dateKey, date } = useDateTime(language);

  // Installation-based Day 1 anchor for Lataif/Hadith rotation: the local
  // dateKey of THIS INSTALL's first-ever launch, so every new user starts
  // at item #1 regardless of today's actual calendar date (see
  // src/lib/dailyContentProgress.ts for the full design rationale). Read
  // synchronously once via a useState initializer, the same
  // read-in-useState/write-in-useEffect split useCoordinates.ts already
  // uses for its own persisted location state (resolveActiveLocationRecord
  // in useState, saveLastActiveLocation in an effect) — never written
  // directly during render. Falls back to the CURRENT `dateKey` when no
  // anchor exists yet (this mount is the genuine first launch); the effect
  // below then persists exactly that value, once.
  const [installationAnchorDateKey] = useState(() => loadInstallationAnchorDateKey() ?? dateKey);
  useEffect(() => {
    if (loadInstallationAnchorDateKey() === null) {
      saveInstallationAnchorDateKey(installationAnchorDateKey);
    }
  }, [installationAnchorDateKey]);
  // Recomputed every render from the live `dateKey` (never cached) so a
  // local-midnight rollover while this screen stays mounted is reflected
  // immediately — `installationAnchorDateKey` itself never changes after
  // mount, only the gap between it and `dateKey` grows.
  const installationDayNumber = computeInstallationDayNumber(installationAnchorDateKey, dateKey);

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
  // Flash) card. DAILY/PRODUCTION mode: one deterministic flash per
  // INSTALLATION day (installationDayNumber above, anchored to this
  // install's first launch — see dailyContentProgress.ts) modulo the
  // flash count — so a brand-new user always starts at flash #1 no matter
  // today's date, every user sees the same flash on a given install-day,
  // and the cycle continues seamlessly past the last flash back to #1.
  const dayFlashIndex = installationDayToIndex(installationDayNumber, WAMDAT.length);

  // PREVIEW MODE — a permanent manual-review tool (the Previous/Refresh
  // controls below), NOT a debug-only override: it lets every flash in
  // the library be walked through and checked without touching the daily
  // rotation. `isTafsirPreviewMode` starts `false`, so DAILY mode is
  // always what a fresh mount shows; pressing Refresh/Previous switches
  // this mount to previewing, and walking Previous all the way back to
  // today's flash switches it back to daily (see handlePreviousFlash).
  // Preview state is local to this component instance — it never mutates
  // dayFlashIndex, and navigating away and back (or reloading) always
  // returns to the real day-based flash.
  const [isTafsirPreviewMode, setIsTafsirPreviewMode] = useState(false);

  // Anchored to today's flash (not a fixed 0), so the first Refresh press
  // steps forward from whatever is actually live today, and Previous can
  // always walk back down to it. Only ever advances via the button
  // onClicks below, never on its own.
  const [previewFlashIndex, setPreviewFlashIndex] = useState(dayFlashIndex);

  // Browsing history of the flashes actually shown by Refresh (not a
  // numerical id/index walk) — the stack's top always equals
  // `previewFlashIndex`, and its bottom entry is always the daily flash
  // this mount started from. Previous pops the top and reveals what's
  // under it, without pushing anything, so it retraces exactly what the
  // user saw. Refresh always pushes forward from wherever the stack
  // currently sits, so going back and then refreshing starts a new path
  // from that point (the old "future" entries were never kept in the
  // first place).
  const [flashHistory, setFlashHistory] = useState<number[]>([dayFlashIndex]);
  const canGoToPreviousFlash = flashHistory.length > 1;

  function handleRefreshFlash() {
    setIsTafsirPreviewMode(true);
    const next = (previewFlashIndex + 1) % WAMDAT.length;
    setPreviewFlashIndex(next);
    setFlashHistory((history) => (next === history[history.length - 1] ? history : [...history, next]));
  }

  function handlePreviousFlash() {
    if (flashHistory.length <= 1) return;
    const newHistory = flashHistory.slice(0, -1);
    setFlashHistory(newHistory);
    setPreviewFlashIndex(newHistory[newHistory.length - 1]);
    // Walked all the way back to the daily anchor — hand control back to
    // dayFlashIndex itself rather than staying pinned to a preview value
    // that only currently happens to match it: dayFlashIndex keeps
    // tracking local midnight even if this component stays mounted,
    // which a frozen preview index never would.
    if (newHistory.length === 1) setIsTafsirPreviewMode(false);
  }

  const flashIndex = isTafsirPreviewMode ? previewFlashIndex : dayFlashIndex;
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

  // The Hadith card (حديث نبوي) — same deterministic-installation-day-pick
  // pattern as the Quranic Insight card above (same shared
  // `installationDayNumber`), now backed by the 200-entry
  // dithar_hadith_library_final.json (see src/data/hadith.ts) instead of
  // the old single static hadith. One Hadith per installation day, same
  // seamless wrap past the last entry back to #1.
  const dayHadithIndex = installationDayToIndex(installationDayNumber, HADITHS.length);

  // PREVIEW MODE — same permanent manual-review purpose/behavior as
  // isTafsirPreviewMode above, kept independent from it (a reviewer can be
  // mid-preview on one card without affecting the other). Daily mode is
  // always the default on a fresh mount; Refresh/Previous below switch
  // into previewing, and Previous walking back to today's Hadith switches
  // back to daily (see handlePreviousHadith).
  const [isHadithPreviewMode, setIsHadithPreviewMode] = useState(false);

  // Anchored to today's Hadith, not a fixed 0 — same reasoning as
  // previewFlashIndex above.
  const [previewHadithIndex, setPreviewHadithIndex] = useState(dayHadithIndex);

  // Same "browsing history, not a numerical walk" behavior as
  // flashHistory above — Previous retraces exactly what Refresh actually
  // showed, and the stack's bottom entry is always the daily anchor.
  const [hadithHistory, setHadithHistory] = useState<number[]>([dayHadithIndex]);
  const canGoToPreviousHadith = hadithHistory.length > 1;

  function handleRefreshHadith() {
    setIsHadithPreviewMode(true);
    const next = (previewHadithIndex + 1) % HADITHS.length;
    setPreviewHadithIndex(next);
    setHadithHistory((history) => (next === history[history.length - 1] ? history : [...history, next]));
  }

  function handlePreviousHadith() {
    if (hadithHistory.length <= 1) return;
    const newHistory = hadithHistory.slice(0, -1);
    setHadithHistory(newHistory);
    setPreviewHadithIndex(newHistory[newHistory.length - 1]);
    // Same daily-handback reasoning as handlePreviousFlash above.
    if (newHistory.length === 1) setIsHadithPreviewMode(false);
  }

  const hadithIndex = isHadithPreviewMode ? previewHadithIndex : dayHadithIndex;
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
        <TopBar showExitButton />
        <LogoHeader />
        <DateTimeStrip className="mt-1 [@media(max-height:860px)]:mt-0" />

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
          className="mt-1 [@media(max-height:860px)]:mt-0"
        />

        <div className="mt-1 flex items-center gap-3 self-start [@media(max-height:860px)]:mt-0">
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

        <InsightCard
          variant="hadith"
          icon={<MosqueDomeIcon size={19} />}
          title={t.hadithTitle}
          attribution={t.hadithAttribution}
          body={hadith.body}
          details={hadithDetails}
          readMoreLabel={t.showDetails}
          onReadMore={() => setOpenCard("hadith")}
          className="mt-1 [@media(max-height:860px)]:mt-0"
        />

        <div className="mt-1 flex items-center gap-3 self-start [@media(max-height:860px)]:mt-0">
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

        <PrayerTimesPanel
          key={locationChange.refreshToken}
          date={date}
          className="mt-1 [@media(max-height:860px)]:mt-0"
        />

        <BottomNav
          className="mt-1 [@media(max-height:860px)]:mt-0"
          onSelect={(key) => {
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "written") onNavigateToWritten();
            if (key === "settings") onNavigateToSettings();
            if (key === "audio") onNavigateToAudio();
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

type Screen = "home" | "tasbeeh" | "written" | "written-reader" | "written-search" | "misc-library" | "misc-category" | "settings" | "audio" | "audio-misc" | "audio-list";

// Minimal in-memory screen switcher — no router dependency added. Screens
// don't keep their own transient state across a switch (theme/language are
// separate app-wide preferences and DO persist — see
// lib/appearancePreferences.ts): navigating away and back
// unmounts/remounts, so e.g. the domino reader's progress resets each
// visit.
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
  // `setScreen` keeps its old name and call shape but now also records a
  // back stack (see lib/useScreenNavigation.ts) so system Back — Android's
  // hardware/gesture button and the browser's — returns to the previous
  // screen instead of leaving the app.
  const { screen, navigate: setScreen } = useScreenNavigation<Screen>("home");
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
  // Which list the Audio Adhkar list screen shows — same pattern as
  // `writtenCategory` above.
  const [audioList, setAudioList] = useState<AudioAdhkarList>({ kind: "written", key: "morning" });
  const audioNav = {
    onNavigateHome: () => setScreen("home"),
    onNavigateToTasbeeh: () => setScreen("tasbeeh"),
    onNavigateToWritten: () => setScreen("written"),
    onNavigateToSettings: () => setScreen("settings"),
  };

  // The Floating Tasbeeh menu's "الإعدادات" row asks the app to open its
  // existing Settings screen — routed through this same screen switcher,
  // never via Home. A no-op on web/iOS.
  useEffect(
    () =>
      startFloatingOpenRouteRequests((route) => {
        if (route === "settings") setScreen("settings");
      }),
    [],
  );

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
  if (screen === "audio") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <AudioAdhkarScreen
            {...audioNav}
            onSelectCategory={(key) => {
              if (key === "misc") {
                setScreen("audio-misc");
                return;
              }
              setAudioList({ kind: "written", key });
              setScreen("audio-list");
            }}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "audio-misc") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <AudioMiscCategoriesScreen
            {...audioNav}
            onBack={() => setScreen("audio")}
            onSelectCategory={(key) => {
              setAudioList({ kind: "misc", key });
              setScreen("audio-list");
            }}
          />
        </Suspense>
      </div>
    );
  }
  if (screen === "audio-list") {
    return (
      <div key={screen} className="dithar-app-transition">
        <Suspense fallback={<ScreenFallback />}>
          <AudioAdhkarListScreen
            {...audioNav}
            list={audioList}
            onBack={() => setScreen(audioList.kind === "misc" ? "audio-misc" : "audio")}
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
        onNavigateToAudio={() => setScreen("audio")}
      />
    </div>
  );
}

export default function App() {
  // A safe no-op everywhere except the native Android build (see
  // isFloatingTasbeehAvailable in floatingTasbeehSync.ts) — the one place
  // that starts Floating Tasbeeh reconciliation and pushes the dhikr list
  // to native, once per app launch regardless of the landing screen.
  // (Removed in 8d240c4 while floatingTasbeehSync.ts was still untracked;
  // the module is committed now, so it belongs back here.)
  useEffect(() => {
    startFloatingTasbeehSync();
  }, []);

  // Android only: re-arms scheduled Evening Audio Adhkar from saved
  // settings and mirrors the native background player's state (see
  // lib/eveningAudioSchedule.ts). Loaded lazily so the adhkar data stays
  // out of the startup bundle.
  useEffect(() => {
    if (!isAudioAdhkarNativeAvailable()) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("./lib/eveningAudioSchedule").then((m) => {
      if (!cancelled) stop = m.startEveningAudioNativeSync();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <PaletteProvider>
          <QuranReciterProvider>
            <AppRouter />
          </QuranReciterProvider>
        </PaletteProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
