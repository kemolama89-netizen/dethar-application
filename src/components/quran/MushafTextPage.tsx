import { useEffect, useMemo, useRef, useState } from "react";
import { quranLabels } from "../../data/quranLabels";
import { useLanguage } from "../../theme/LanguageContext";
import { loadKfgqpcText, whenKfgqpcFontReady } from "../../lib/kfgqpcText";
import type { KfgqpcVerse } from "../../lib/kfgqpcText";
import { arabicDigits, surahMeta } from "../../lib/quranMeta";
import type { QuranTextTheme } from "../../lib/quranReading";
import "./kfgqpc-font.css";
import "./mushaf-text.css";

const LONG_PRESS_MS = 450;

/**
 * The Mushaf's text reading mode: one printed page's verses, in the King Fahd
 * Complex's own Uthmanic text and font, at the reader's chosen size. The printed
 * pages stay the default. It covers the same verses as the printed page (verified
 * for all 604), but doesn't keep its line breaks. If the text or font can't load,
 * it says so through onUnavailable and the reader goes back to the printed page.
 */
export function MushafTextPage({
  page,
  scale,
  theme,
  selected,
  highlight,
  found,
  onLongPress,
  onUnavailable,
}: {
  page: number;
  /** The reader's size, 1 to 2. */
  scale: number;
  theme: QuranTextTheme;
  selected: string | null;
  highlight: string | null;
  found: string | null;
  onLongPress: (key: string) => void;
  onUnavailable: () => void;
}) {
  const { language } = useLanguage();
  const t = quranLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const [all, setAll] = useState<KfgqpcVerse[] | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([loadKfgqpcText(), whenKfgqpcFontReady()]).then(([verses, font]) => {
      if (!live) return;
      if (verses && font) setAll(verses);
      else onUnavailable();
    });
    return () => {
      live = false;
    };
  }, [onUnavailable]);
  const verses = useMemo(() => all?.filter((v) => v.page === page) ?? [], [all, page]);
  const basmala = all?.[0]?.words ?? "";

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTop = 0;
    const key = found ?? highlight;
    const verse = key ? box.querySelector(`[data-verse="${key}"]`) : null;
    if (!verse) return;
    // Only this page scrolls: scrollIntoView would also move the reader's hidden containers.
    const at = verse.getBoundingClientRect();
    const view = box.getBoundingClientRect();
    box.scrollTop = Math.max(0, at.top - view.top - Math.max(0, (view.height - at.height) / 2));
  }, [page, verses, found, highlight]);

  const press = useRef<{ key: string; x: number; y: number; timer: number } | null>(null);
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  return (
    <div ref={scroller} className="dithar-mushaf-text" data-text-theme={theme} style={{ ["--dithar-text-scale" as string]: scale }} data-quran-text-page={page} dir="rtl" lang="ar">
      {all === null && <p className="dithar-mushaf-text__status">{t.loading}</p>}
      <div className="dithar-mushaf-text__body dithar-kfgqpc">
        {verses.map((v) => {
          const key = `${v.surah}:${v.ayah}`;
          const meta = surahMeta(v.surah);
          return (
            <span key={key} style={{ display: "contents" }}>
              {v.ayah === 1 && (
                <span className="dithar-mushaf-text__opening" data-quran-text-surah={v.surah}>
                  <span className="dithar-mushaf-text__surah">{t.surah(meta?.nameAr ?? "")}</span>
                  {v.surah !== 1 && v.surah !== 9 && <span className="dithar-mushaf-text__basmala">{basmala}</span>}
                </span>
              )}{" "}
              <span
                role="button"
                tabIndex={0}
                className="dithar-mushaf-text__verse"
                aria-pressed={selected === key}
                data-verse={key}
                data-selected={selected === key ? "" : undefined}
                data-target={highlight === key ? "" : undefined}
                data-found={found === key ? "" : undefined}
                onPointerDown={(e) => {
                  cancelPress();
                  press.current = {
                    key,
                    x: e.clientX,
                    y: e.clientY,
                    timer: window.setTimeout(() => {
                      press.current = null;
                      onLongPress(key);
                    }, LONG_PRESS_MS),
                  };
                }}
                onPointerMove={(e) => {
                  if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) cancelPress();
                }}
                onPointerUp={cancelPress}
                onPointerCancel={cancelPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  cancelPress();
                  onLongPress(key);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onLongPress(key);
                  }
                }}
              >
                {v.words}
                {" "}
                <span className="dithar-kfgqpc-mark" aria-hidden="true">
                  {v.mark}
                </span>
                <span className="sr-only" lang={language}>
                  {t.ayah(digits(v.ayah))}
                </span>
              </span>
            </span>
          );
        })}
      </div>
      <p className="dithar-mushaf-text__folio" dir="ltr">
        {digits(page)}
      </p>
    </div>
  );
}
