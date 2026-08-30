import { lazy, Suspense, useEffect, useState } from "react";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider, useLanguage } from "./theme/LanguageContext";
import { PaletteProvider } from "./theme/PaletteContext";
import { DeviceFrame } from "./components/DeviceFrame";
import { AppShell } from "./components/AppShell";
import { TopBar } from "./components/TopBar";
import { LogoHeader } from "./components/LogoHeader";
import { InsightCard } from "./components/InsightCard";
import { PrayerTimesPanel } from "./components/PrayerTimesPanel";
import { BottomNav } from "./components/BottomNav";
import { ContentModal } from "./components/ContentModal";
import { BookOpen } from "lucide-react";
import { MosqueDomeIcon } from "./icons/CustomIcons";
import { labels, insightCardContent, hadithCardContent } from "./data/content";
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
// no modal state here. "Read more" remains only for the two content cards.
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
  const { language } = useLanguage();
  const t = labels[language];
  const insight = insightCardContent[language];
  const hadith = hadithCardContent[language];

  // Local state for the "Read more" full-content modal — not global,
  // just which (if any) card's full content is currently open.
  const [openCard, setOpenCard] = useState<OpenCard>(null);

  return (
    <DeviceFrame scrollLocked={openCard !== null}>
      <AppShell>
        <TopBar />
        <LogoHeader />

        <InsightCard
          variant="quran"
          icon={<BookOpen size={19} strokeWidth={1.7} />}
          title={t.insightTitle}
          body={insight.body}
          citation={insight.citation}
          readMoreLabel={t.readMore}
          onReadMore={() => setOpenCard("quran")}
          className="mt-1"
        />

        <InsightCard
          variant="hadith"
          icon={<MosqueDomeIcon size={19} />}
          title={t.hadithTitle}
          attribution={t.hadithAttribution}
          body={hadith.body}
          citation={hadith.citation}
          readMoreLabel={t.readMore}
          onReadMore={() => setOpenCard("hadith")}
          className="mt-1"
        />

        <PrayerTimesPanel className="mt-1" />

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
        citation={hadith.citation}
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
