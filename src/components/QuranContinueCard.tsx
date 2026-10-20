import { BookOpenText, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { quranLabels } from "../data/quranLabels";
import { arabicDigits, surahMeta } from "../lib/quranMeta";
import { useQuranPosition } from "../lib/quranReading";
import type { QuranTarget } from "./QuranReaderScreen";

// Home's Qur'an card: continue exactly where the user stopped (surah, verse
// and Mushaf page — the page from Tanzil's page metadata, shown only when the
// metadata places the verse, never guessed), or, before any reading, start at
// the beginning of the Qur'an. The whole card opens the reader; the action
// pill says what tapping it does. It grows with the space Home has free
// (App.tsx), its content kept centred.
export function QuranContinueCard({ onOpen, className = "" }: { onOpen: (target: QuranTarget) => void; className?: string }) {
  const { language, dir } = useLanguage();
  const t = quranLabels[language];
  const position = useQuranPosition();
  const meta = position ? surahMeta(position.surah) : undefined;
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const Arrow = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={() => onOpen(position ? { surah: position.surah, ayah: position.ayah } : { surah: 1, ayah: 1 })}
      className={`flex w-full flex-col justify-center border px-3.5 py-3 text-start ${className}`}
      style={{
        borderColor: "var(--color-gold)",
        background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface) 55%, rgba(var(--color-gold-rgb), 0.14) 100%)",
        borderRadius: "var(--card-radius)",
        boxShadow: "0 2px 10px rgba(var(--color-gold-rgb), 0.12)",
      }}
      data-home-quran={position ? `${position.surah}:${position.ayah}` : "start"}
    >
      <span className="flex items-center gap-3">
        {/* The large icon only where the width allows it; on a narrow phone the small one in the label line stands in, leaving the room to the surah name. */}
        <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full min-[440px]:flex" style={{ background: "var(--color-primary)", color: "var(--color-gold-on-primary)" }} aria-hidden="true">
          <BookOpenText size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 truncate text-[12.5px] font-semibold" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-display)" }}>
            <BookOpenText size={14} className="shrink-0 min-[440px]:hidden" style={{ color: "var(--color-primary)" }} aria-hidden="true" />
            {language === "en" ? <span style={{ fontFamily: "var(--font-body)" }}>{position ? t.lastRead : t.title}</span> : position ? `القرآن الكريم · ${t.lastRead}` : "القرآن الكريم"}
          </span>
          {position && meta ? (
            <span className="block min-w-0" data-home-quran-where="">
              <span className={`line-clamp-2 block font-bold leading-snug ${language === "en" ? "text-[16.5px]" : "text-[18px]"}`} style={{ color: "var(--color-primary)", fontFamily: "var(--font-display)" }} data-home-quran-surah="">
                {t.surah(language === "en" ? meta.nameTranslit : meta.nameAr)}
              </span>
              <span className="block text-[12.5px] tabular-nums" style={{ color: "var(--color-text-muted)" }} data-home-quran-detail="">
                {t.ayah(digits(position.ayah))}
                {position.page ? ` · ${t.page(digits(position.page))}` : ""}
              </span>
            </span>
          ) : (
            <span className="line-clamp-2 block text-[12px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
              {t.startHint}
            </span>
          )}
        </span>
        <span className="flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }} data-home-quran-action="">
          {position ? t.continueReading : t.startReading}
          <Arrow size={16} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
