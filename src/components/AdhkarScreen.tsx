import type { ReactNode } from "react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { BackArrowButton } from "./BackHeader";
import { writtenAdhkarLabels } from "../data/written-adhkar";
import { useLanguage } from "../theme/LanguageContext";
import { navLabels } from "../data/content";

// The bottom navigation's «الأذكار» / Adhkar item: two cards, each opening
// the existing screen as it is — Audio Adhkar (AudioAdhkarScreen) and
// Written Adhkar (WrittenAdhkarScreen). Nothing of those screens is here.
// Each card shows what its section holds, in DITHAR's own colours (the
// theme's tokens, so both identities and dark mode follow): Audio Adhkar
// on the primary colour with gold headphones and a sound wave; Written
// Adhkar on the ivory paper of the written section with an open book.

const adhkarScreenLabels = {
  ar: {
    choose: "اختر طريقتك في الذكر",
    audioHint: "استمع إلى الأذكار بأصوات القرّاء",
    writtenHint: "اقرأ أذكار الصباح والمساء والصلاة",
  },
  en: {
    choose: "Choose how to remember Allah",
    audioHint: "Listen to the adhkar, recited",
    writtenHint: "Read the morning, evening and prayer adhkar",
  },
} as const;

interface AdhkarScreenProps {
  onOpenAudio: () => void;
  onOpenWritten: () => void;
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToSettings: () => void;
  /** The header's back arrow: back to the previous screen. */
  onBack: () => void;
}

/** Headphones between two sound waves, over a soft ring — listening. */
function AudioIllustration() {
  // Waveform bar heights, mirrored on each side of the headphones.
  const bars = [10, 18, 28, 16, 34, 22, 12];
  return (
    <svg viewBox="0 0 220 120" className="h-full max-h-[120px] w-full" aria-hidden="true">
      <circle cx="110" cy="62" r="46" fill="none" stroke="var(--color-gold)" strokeOpacity="0.22" strokeWidth="1" />
      <circle cx="110" cy="62" r="36" fill="var(--color-gold)" fillOpacity="0.1" />
      {/* Sound waves leaving the cups */}
      {[0, 1, 2].map((k) => (
        <g key={k} fill="none" stroke="var(--color-gold)" strokeLinecap="round" strokeWidth="2" strokeOpacity={0.75 - k * 0.22}>
          <path d={`M${62 - k * 9} ${44 - k * 6} q${-10 - k * 3} ${18 + k * 6} 0 ${36 + k * 12}`} />
          <path d={`M${158 + k * 9} ${44 - k * 6} q${10 + k * 3} ${18 + k * 6} 0 ${36 + k * 12}`} />
        </g>
      ))}
      {/* Headphones */}
      <g fill="none" stroke="var(--color-gold)" strokeLinecap="round" strokeWidth="5">
        <path d="M84 72 v-8 a26 26 0 0 1 52 0 v8" />
      </g>
      <rect x="76" y="66" width="16" height="28" rx="7" fill="var(--color-gold)" />
      <rect x="128" y="66" width="16" height="28" rx="7" fill="var(--color-gold)" />
      {/* Waveform */}
      {bars.map((h, i) => (
        <g key={i} fill="var(--color-gold)" fillOpacity={0.35 + (i % 3) * 0.15}>
          <rect x={12 + i * 6} y={104 - h / 2} width="3" height={h / 2} rx="1.5" />
          <rect x={205 - i * 6} y={104 - h / 2} width="3" height={h / 2} rx="1.5" />
        </g>
      ))}
    </svg>
  );
}

/** An open book with lines of script and a ribbon bookmark — reading. */
function WrittenIllustration() {
  const lines = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 220 120" className="h-full max-h-[120px] w-full" aria-hidden="true">
      {/* Pages beneath (the book's thickness) */}
      <path d="M110 108 C86 98 58 98 32 104 L32 100 C58 94 86 94 110 104 C134 94 162 94 188 100 L188 104 C162 98 134 98 110 108 Z" fill="var(--wa-gold)" fillOpacity="0.35" />
      {/* Open book */}
      <g stroke="var(--wa-gold)" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M110 34 C88 26 60 26 36 32 L36 100 C60 94 88 94 110 102 Z" fill="var(--wa-surface)" />
        <path d="M110 34 C132 26 160 26 184 32 L184 100 C160 94 132 94 110 102 Z" fill="var(--wa-surface)" />
      </g>
      <path d="M110 34 V102" stroke="var(--wa-gold)" strokeWidth="1.4" />
      {/* A ribbon bookmark hanging from the right-hand page */}
      <path d="M160 28 V50 l5 -5 l5 5 V28 Z" fill="var(--wa-gold)" />
      {/* Lines of script, right-aligned on each page as Arabic is written */}
      {lines.map((k) => (
        <g key={k} stroke="var(--wa-ink)" strokeOpacity="0.3" strokeWidth="1.6" strokeLinecap="round">
          <path d={`M${k === 4 ? 70 : 48} ${46 + k * 11} q${(100 - (k === 4 ? 70 : 48)) / 2} ${-3} ${100 - (k === 4 ? 70 : 48)} 0`} />
          <path d={`M${k === 4 ? 150 : 122} ${46 + k * 11} q${(172 - (k === 4 ? 150 : 122)) / 2} ${-3} ${172 - (k === 4 ? 150 : 122)} 0`} />
        </g>
      ))}
    </svg>
  );
}

function AdhkarCard({
  id,
  title,
  hint,
  onClick,
  illustration,
  tone,
}: {
  id: "audio" | "written";
  title: string;
  hint: string;
  onClick: () => void;
  illustration: ReactNode;
  tone: "primary" | "paper";
}) {
  const onPrimary = tone === "primary";
  return (
    <button
      type="button"
      onClick={onClick}
      data-adhkar-card={id}
      className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--wa-card-radius,24px)] px-5 py-5 text-center transition-transform active:scale-[0.98]"
      style={
        onPrimary
          ? {
              background: "radial-gradient(120% 90% at 50% 20%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%), var(--look-deep-surface, var(--color-primary))",
              color: "var(--look-on-deep, var(--color-gold-on-primary))",
              boxShadow: "0 14px 28px -18px rgba(var(--color-shadow-rgb), 0.6), inset 0 0 0 1px rgba(var(--color-gold-rgb), 0.35)",
            }
          : {
              background: "var(--wa-surface)",
              color: "var(--wa-ink)",
              boxShadow: "0 14px 28px -20px rgba(var(--color-shadow-rgb), 0.35), inset 0 0 0 1px var(--wa-gold-hairline)",
            }
      }
    >
      <div className="flex min-h-[72px] w-full flex-1 items-center justify-center">{illustration}</div>
      <span className="h-px w-10" style={{ background: onPrimary ? "rgba(var(--color-gold-rgb), 0.55)" : "var(--wa-gold-hairline)" }} aria-hidden="true" />
      <span className="text-[20px] font-bold leading-tight" style={{ fontFamily: "var(--font-display)", color: onPrimary ? "var(--look-on-deep, var(--color-gold-on-primary))" : "var(--wa-ink)" }}>
        {title}
      </span>
      <span className="text-[12.5px] leading-snug" style={{ color: onPrimary ? "rgba(255,255,255,0.78)" : "var(--wa-ink-muted)" }}>
        {hint}
      </span>
    </button>
  );
}

export function AdhkarScreen({ onOpenAudio, onOpenWritten, onNavigateHome, onNavigateToTasbeeh, onNavigateToSettings, onBack }: AdhkarScreenProps) {
  const { language } = useLanguage();
  const nav = navLabels[language];
  const t = adhkarScreenLabels[language];
  return (
    <DeviceFrame>
      <AppShell>
        <TopBar />
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mt-2 flex items-center gap-2">
            <BackArrowButton onBack={onBack} backLabel={writtenAdhkarLabels[language].back} />
            <h1 className="min-w-0 flex-1 text-center text-[20px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
              {nav.adhkar}
            </h1>
            <div className="h-9 w-9 shrink-0" aria-hidden="true" />
          </div>
          <p className="mt-0.5 text-center text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            {t.choose}
          </p>
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 pb-4" data-adhkar-cards="">
            <AdhkarCard id="audio" tone="primary" title={nav.audioAdhkar} hint={t.audioHint} illustration={<AudioIllustration />} onClick={onOpenAudio} />
            <AdhkarCard id="written" tone="paper" title={nav.writtenAdhkar} hint={t.writtenHint} illustration={<WrittenIllustration />} onClick={onOpenWritten} />
          </div>
        </div>
        <BottomNav
          className="mt-2"
          activeKey="adhkar"
          onSelect={(key) => {
            if (key === "home") onNavigateHome();
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "settings") onNavigateToSettings();
          }}
        />
      </AppShell>
    </DeviceFrame>
  );
}
