import { lazy, Suspense, useState } from "react";
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

// Every screen except Home is loaded lazily, in its own chunk, fetched only
// the first time the user actually navigates there — Home is the one
// screen guaranteed to be needed at startup, so it alone stays a static
// import. Named exports need the .then() remap since React.lazy expects a
// module with a default export. Behavior is unchanged: AppRouter still
// picks exactly one of these to render, exactly as before.
const TasbeehScreen = lazy(() => import("./components/TasbeehScreen").then((m) => ({ default: m.TasbeehScreen })));
const WrittenAdhkarScreen = lazy(() =>
  import("./components/WrittenAdhkarScreen").then((m) => ({ default: m.WrittenAdhkarScreen })),
);
const WrittenAdhkarReader = lazy(() =>
  import("./components/WrittenAdhkarReader").then((m) => ({ default: m.WrittenAdhkarReader })),
);
const SettingsScreen = lazy(() => import("./components/SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const MiscLibraryScreen = lazy(() =>
  import("./components/MiscLibraryScreen").then((m) => ({ default: m.MiscLibraryScreen })),
);
const MiscCategoryScreen = lazy(() =>
  import("./components/MiscCategoryScreen").then((m) => ({ default: m.MiscCategoryScreen })),
);

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

type Screen = "home" | "tasbeeh" | "written" | "written-reader" | "misc-library" | "misc-category" | "settings";

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
              if (key === "misc") {
                setScreen("misc-library");
                return;
              }
              setWrittenCategory(key);
              setScreen("written-reader");
            }}
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
