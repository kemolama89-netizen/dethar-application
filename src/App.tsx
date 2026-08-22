import { ThemeProvider } from "./theme/ThemeContext";
import { DeviceFrame } from "./components/DeviceFrame";
import { AppShell } from "./components/AppShell";
import { TopBar } from "./components/TopBar";
import { LogoHeader } from "./components/LogoHeader";
import { InsightCard } from "./components/InsightCard";
import { PrayerTimesPanel } from "./components/PrayerTimesPanel";
import { BottomNav } from "./components/BottomNav";
import { BookOpen } from "lucide-react";
import { MosqueDomeIcon } from "./icons/CustomIcons";
import { labels, insightCardContent, hadithCardContent } from "./data/content";

function HomeScreen() {
  return (
    <DeviceFrame>
      <AppShell>
        <TopBar />
        <LogoHeader />

        <InsightCard
          variant="quran"
          icon={<BookOpen size={19} strokeWidth={1.7} />}
          title={labels.insightTitle}
          body={insightCardContent.body}
          citation={insightCardContent.citation}
          shareLabel={labels.shareInsight}
        />

        <InsightCard
          variant="hadith"
          icon={<MosqueDomeIcon size={19} />}
          title={labels.hadithTitle}
          attribution={labels.hadithAttribution}
          body={hadithCardContent.body}
          citation={hadithCardContent.citation}
          shareLabel={labels.shareHadith}
        />

        <PrayerTimesPanel />

        <BottomNav />
      </AppShell>
    </DeviceFrame>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>
  );
}
