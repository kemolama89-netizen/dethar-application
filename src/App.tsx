import { useState } from "react";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider, useLanguage } from "./theme/LanguageContext";
import { DeviceFrame } from "./components/DeviceFrame";
import { AppShell } from "./components/AppShell";
import { TopBar } from "./components/TopBar";
import { LogoHeader } from "./components/LogoHeader";
import { InsightCard } from "./components/InsightCard";
import { PrayerTimesPanel } from "./components/PrayerTimesPanel";
import { BottomNav } from "./components/BottomNav";
import { ContentModal } from "./components/ContentModal";
import { TasbeehScreen } from "./components/TasbeehScreen";
import { BookOpen } from "lucide-react";
import { MosqueDomeIcon } from "./icons/CustomIcons";
import { labels, insightCardContent, hadithCardContent } from "./data/content";

// The Featured Hadith under the logo is never previewed/clamped — it has
// no modal state here. "Read more" remains only for the two content cards.
type OpenCard = "quran" | "hadith" | null;

// Resolving `language` -> the right content object happens once, here —
// InsightCard/PrayerTimesPanel/BottomNav stay simple/localization-agnostic,
// they just render whatever strings they're given.
//
// `onNavigateToTasbeeh` is the one addition needed to make BottomNav's
// السبحة/Tasbeeh item actually navigate — everything else in this
// function is unchanged from the approved Home Screen.
function HomeScreen({ onNavigateToTasbeeh }: { onNavigateToTasbeeh: () => void }) {
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

type Screen = "home" | "tasbeeh";

// Minimal in-memory screen switcher — no router dependency added. Neither
// screen persists its state across a switch (matching how theme/language
// already don't persist across a reload): navigating to Tasbeeh and back
// unmounts/remounts, so the counter resets to 0 each visit.
function AppRouter() {
  const [screen, setScreen] = useState<Screen>("home");

  if (screen === "tasbeeh") {
    return <TasbeehScreen onNavigateHome={() => setScreen("home")} />;
  }
  return <HomeScreen onNavigateToTasbeeh={() => setScreen("tasbeeh")} />;
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </LanguageProvider>
  );
}
