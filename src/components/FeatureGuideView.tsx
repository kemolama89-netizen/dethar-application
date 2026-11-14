import { useEffect, useId, useRef } from "react";
import { BellRing, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Circle, Headphones, Megaphone, Palette, SlidersHorizontal, Sparkles, VolumeX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { featureGuideLabels, GUIDE_ORDER } from "../data/featureGuideLabels";
import type { GuideSectionId, GuideTarget } from "../data/featureGuideLabels";
import { scrollIntoScreen } from "../lib/screenScroll";

/**
 * Settings → «دليل الميزات»: a short, always-available explanation of each feature and where it is set,
 * one section open at a time. A section about a Settings page can open that page directly; Back from it
 * returns here (SettingsScreen). Interface words only (data/featureGuideLabels.ts) — nothing here is
 * laid over Qur'an or adhkar text.
 */
const ICONS: Record<GuideSectionId, LucideIcon> = {
  silence: VolumeX,
  adhan: Megaphone,
  weekly: CalendarDays,
  audioAdhkar: Headphones,
  floating: Circle,
  quran: BookOpen,
  journey: Sparkles,
  notifications: BellRing,
  appearance: Palette,
  more: SlidersHorizontal,
};

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const primaryText = { color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-muted)" };

export function FeatureGuideView({
  onBack,
  onOpen,
  openSection,
  onToggleSection,
}: {
  onBack: () => void;
  onOpen: (target: GuideTarget) => void;
  openSection: GuideSectionId | null;
  onToggleSection: (id: GuideSectionId | null) => void;
}) {
  const { language, dir } = useLanguage();
  const t = featureGuideLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const ForwardIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const baseId = useId();
  // Back from a page this guide opened: the section it came from, in view again.
  const listRef = useRef<HTMLDivElement>(null);
  const initialSection = useRef(openSection);
  useEffect(() => {
    if (initialSection.current) scrollIntoScreen(listRef.current?.querySelector(`[data-guide-section='${initialSection.current}']`), "start");
  }, []);

  return (
    <div className="flex flex-1 flex-col" data-feature-guide="">
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", ...primaryText }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={primaryText}>
          {t.title}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <p className="mt-3 px-1 text-[12px] leading-[1.7]" style={muted}>
        {t.intro}
      </p>

      <div ref={listRef} className="mt-3 flex scroll-mt-4 flex-col gap-2.5 pb-2">
        {GUIDE_ORDER.map((id) => {
          const section = t.sections[id];
          const Icon = ICONS[id];
          const open = openSection === id;
          const panelId = `${baseId}-${id}`;
          return (
            <section key={id} className="rounded-2xl border" style={CARD} data-guide-section={id}>
              <h2>
                <button
                  type="button"
                  onClick={() => onToggleSection(open ? null : id)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-start"
                  data-guide-toggle={id}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
                    <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold" style={primaryText}>
                      {section.title}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-[1.5]" style={muted}>
                      {section.summary}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="shrink-0 transition-transform motion-reduce:transition-none"
                    style={{ color: "var(--color-gold)", transform: open ? "rotate(180deg)" : undefined }}
                  />
                </button>
              </h2>
              {open && (
                <div id={panelId} className="px-4 pb-4" data-guide-panel={id}>
                  <ul className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--color-gold-soft)" }}>
                    {section.points.map((point) => (
                      <li key={point} className="flex gap-2 text-[12.5px] leading-[1.75]" style={primaryText}>
                        <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--color-gold)" }} aria-hidden="true" />
                        <span className="min-w-0 flex-1">{point}</span>
                      </li>
                    ))}
                  </ul>
                  {section.open && (
                    <button
                      type="button"
                      onClick={() => onOpen(section.open!)}
                      className="mt-3 flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold"
                      style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}
                      data-guide-open={section.open}
                    >
                      {t.open}
                      <ForwardIcon size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
