import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../theme/LanguageContext";
import { basairLabels } from "../../data/basairLabels";
import { BasairIcon } from "./BasairIcon";
import "./basair.css";

/** The way in on the Mushaf's index: its own card, unlike any ordinary Mushaf action. */
export function BasairEntryCard({ onOpen }: { onOpen: () => void }) {
  const { language, dir } = useLanguage();
  const t = basairLabels[language];
  const Forward = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <button type="button" onClick={onOpen} className="dithar-basair-card" aria-label={`${t.open}: ${t.entrySubtitle}`} data-basair-entry="index">
      <BasairIcon size={46} />
      <span className="dithar-basair-card-text">
        <span className="dithar-basair-card-name">{t.name}</span>
        <span className="dithar-basair-card-sub">{t.entrySubtitle}</span>
      </span>
      <Forward size={18} aria-hidden="true" className="dithar-basair-card-arrow" />
    </button>
  );
}

/** The way in while reading: its mark among the reader's controls. */
export function BasairEntryButton({ onOpen }: { onOpen: () => void }) {
  const { language } = useLanguage();
  const t = basairLabels[language];
  return (
    <button type="button" onClick={onOpen} aria-label={t.open} title={t.name} className="dithar-basair-chip" data-basair-entry="reader">
      <BasairIcon size={34} />
    </button>
  );
}
