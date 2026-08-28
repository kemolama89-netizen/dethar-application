import { useState } from "react";
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
import { TasbeehScreen } from "./components/TasbeehScreen";
import { WrittenAdhkarScreen } from "./components/WrittenAdhkarScreen";
import { WrittenAdhkarReader } from "./components/WrittenAdhkarReader";
import { SettingsScreen } from "./components/SettingsScreen";
import { MiscLibraryScreen } from "./components/MiscLibraryScreen";
import { MiscCategoryScreen } from "./components/MiscCategoryScreen";
import { BookOpen } from "lucide-react";
import { MosqueDomeIcon } from "./icons/CustomIcons";
import { labels, insightCardContent, hadithCardContent } from "./data/content";
import type { WrittenAdhkarCategoryKey } from "./data/written-adhkar";
import type { MiscCategoryKey } from "./data/misc-library";

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
        <TasbeehScreen
          onNavigateHome={() => setScreen("home")}
          onNavigateToWritten={() => setScreen("written")}
          onNavigateToSettings={() => setScreen("settings")}
        />
      </div>
    );
  }
  if (screen === "written") {
    return (
      <div key={screen} className="dithar-app-transition">
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
      </div>
    );
  }
  if (screen === "written-reader") {
    return (
      <div key={screen} className="dithar-app-transition">
        <WrittenAdhkarReader
          category={writtenCategory}
          onNavigateHome={() => setScreen("home")}
          onNavigateToTasbeeh={() => setScreen("tasbeeh")}
          onNavigateToSettings={() => setScreen("settings")}
          onBackToCategories={() => setScreen("written")}
        />
      </div>
    );
  }
  if (screen === "misc-library") {
    return (
      <div key={screen} className="dithar-app-transition">
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
      </div>
    );
  }
  if (screen === "misc-category") {
    return (
      <div key={screen} className="dithar-app-transition">
        <MiscCategoryScreen
          categoryKey={miscCategory}
          onBack={() => setScreen("misc-library")}
          onNavigateToWrittenRoot={() => setScreen("written")}
          onNavigateHome={() => setScreen("home")}
          onNavigateToTasbeeh={() => setScreen("tasbeeh")}
          onNavigateToSettings={() => setScreen("settings")}
        />
      </div>
    );
  }
  if (screen === "settings") {
    return (
      <div key={screen} className="dithar-app-transition">
        <SettingsScreen
          onNavigateHome={() => setScreen("home")}
          onNavigateToTasbeeh={() => setScreen("tasbeeh")}
          onNavigateToWritten={() => setScreen("written")}
        />
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
