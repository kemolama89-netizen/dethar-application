import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "../../theme/LanguageContext";
import { basairLabels } from "../../data/basairLabels";
import { useBackDismiss } from "../../lib/backOverlays";
import { saveBasairPosition } from "../../lib/basairPosition";
import { arabicDigits, surahMeta, SURAH_META } from "../../lib/quranMeta";
import { getSaadiVerse, neighbourVerse } from "../../lib/saadiTafsir";
import type { SaadiParagraph, SaadiVerse } from "../../lib/saadiTafsir";
import { loadKfgqpcText, whenKfgqpcFontReady } from "../../lib/kfgqpcText";
import { LOOK_OFF_ATTRIBUTE, setLookSuspended } from "../../theme/looks";
import "../quran/kfgqpc-font.css";
import "./basair.css";

/**
 * The Mushaf turns the app's themes off for its own pages. Basa'ir is the app's
 * own screen, so it follows the theme while open, and hands the Mushaf back
 * exactly as it was. It covers the Mushaf completely, so no change shows.
 */
export function useThemeOverMushaf(): void {
  useLayoutEffect(() => {
    const wasOff = document.documentElement.hasAttribute(LOOK_OFF_ATTRIBUTE);
    setLookSuspended(false);
    return () => setLookSuspended(wasOff);
  }, []);
}

/**
 * Whether this row needs its compact form: measured, because large text can come from the
 * app's root size or the system's text zoom. Rechecks whenever its content changes.
 */
function useNeedsCompact<T extends HTMLElement>(content: string) {
  const ref = useRef<T>(null);
  const [compact, setCompact] = useState(false);
  const fullWidth = useRef(0);
  const measured = useRef(content);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (measured.current !== content) {
      measured.current = content;
      if (compact) {
        setCompact(false); // Measures again at full size, before anything is painted.
        return;
      }
    }
    const measure = () => {
      if (!compact && el.scrollWidth > el.clientWidth + 1) {
        fullWidth.current = el.scrollWidth;
        setCompact(true);
      } else if (compact && el.clientWidth >= fullWidth.current) {
        setCompact(false);
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, content]);
  return [ref, compact] as const;
}

type VerseLine = { ayah: number; words: string; mark?: string };
type SurahText = { surah: number; verses: VerseLine[]; basmala: string | null; kfgqpc: boolean };

/** A surah in the Complex's own text and font, or Tanzil's text if that font can't draw. */
function useSurahText(surah: number): SurahText | null {
  const [text, setText] = useState<SurahText | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([loadKfgqpcText(), whenKfgqpcFontReady()]).then(async ([all, font]) => {
      const verses = font ? all?.filter((v) => v.surah === surah) : undefined;
      if (verses?.length) {
        const basmala = surah !== 1 && surah !== 9 ? (all?.[0]?.words ?? null) : null;
        if (live) setText({ surah, verses: verses.map(({ ayah, words, mark }) => ({ ayah, words, mark })), basmala, kfgqpc: true });
        return;
      }
      const m = await import("../../lib/quranShareText");
      const count = surahMeta(surah)?.ayahCount ?? 0;
      const fallback = Array.from({ length: count }, (_, i) => ({ ayah: i + 1, words: m.markedVerseForSharing(surah, i + 1) ?? "" }));
      if (live) setText({ surah, verses: fallback, basmala: null, kfgqpc: false });
    });
    return () => {
      live = false;
    };
  }, [surah]);
  return text?.surah === surah ? text : null;
}

function VerseWords({ verse }: { verse: VerseLine }) {
  return (
    <>
      {verse.words}
      {verse.mark && (
        <>
          {" "}
          <span className="dithar-kfgqpc-mark" aria-hidden="true">
            {verse.mark}
          </span>
        </>
      )}
    </>
  );
}

/** A stretch of the surah as continuous text. Each verse wraps across lines and opens at a tap. */
function SurahRun({ surah, verses, kfgqpc, onOpen }: { surah: number; verses: VerseLine[]; kfgqpc: boolean; onOpen: (ayah: number) => void }) {
  if (verses.length === 0) return null;
  const onKey = (e: KeyboardEvent, ayah: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(ayah);
    }
  };
  return (
    <p dir="rtl" lang="ar" className={`dithar-opening-run${kfgqpc ? " dithar-kfgqpc" : ""}`}>
      {verses.map((verse) => (
        <span key={verse.ayah}>
          <span role="button" tabIndex={0} className="dithar-opening-verse" data-opening-verse={`${surah}:${verse.ayah}`} onClick={() => onOpen(verse.ayah)} onKeyDown={(e) => onKey(e, verse.ayah)}>
            <VerseWords verse={verse} />
          </span>{" "}
        </span>
      ))}
    </p>
  );
}

/** An editor's note, with any Qur'an it quotes set as Qur'an. Layout only: its characters are the source's. */
function NoteText({ note }: { note: string }) {
  return (
    <>
      {note.split(/(\{[^{}]*\})/).map((piece, i) =>
        i % 2 === 1 ? (
          <span key={i} className="dithar-tafsir-quran">
            {piece}
          </span>
        ) : (
          piece
        ),
      )}
    </>
  );
}

function SaadiRuns({ runs }: { runs: SaadiParagraph["runs"] }) {
  const { language } = useLanguage();
  const t = basairLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  return (
    <>
      {runs.map((run, i) => {
        if (run.kind === "stray") return null;
        if (run.kind === "note") {
          return (
            <button
              key={i}
              type="button"
              className="dithar-saadi-noteref"
              aria-label={t.noteRef(digits(run.index + 1))}
              data-saadi-noteref={run.index}
              onClick={() => {
                const note = document.getElementById(`saadi-note-${run.index}`);
                const box = note?.closest(".dithar-tafsir-scroll");
                if (!note || !box) return;
                box.scrollTo?.({ top: box.scrollTop + note.getBoundingClientRect().top - box.getBoundingClientRect().top - 24, behavior: "smooth" });
              }}
            >
              {arabicDigits(run.index + 1)}
            </button>
          );
        }
        if (run.kind === "marker") return <span key={i} className="dithar-saadi-marker" data-saadi-marker={run.verse}>{run.text}</span>;
        return run.kind === "quote" ? (
          <span key={i} className="dithar-tafsir-quran">
            {run.text}
          </span>
        ) : (
          <span key={i}>{run.text}</span>
        );
      })}
    </>
  );
}

/** Tafsir al-Sa'di on one verse, from lib/saadiTafsir.ts: the book's own words, and verses it groups said to be grouped. */
function SaadiPassage({ surah, ayah, onLoaded }: { surah: number; ayah: number; onLoaded: () => void }) {
  const { language } = useLanguage();
  const t = basairLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const [state, setState] = useState<{ key: string; result: SaadiVerse } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${surah}:${ayah}`;
  useEffect(() => {
    let live = true;
    void getSaadiVerse(surah, ayah).then((result) => {
      if (live) setState({ key, result });
    });
    return () => {
      live = false;
    };
  }, [surah, ayah, key, attempt]);
  const result = state?.key === key ? state.result : null;
  // The screen could only reach the opening once there's text below it to scroll through.
  useLayoutEffect(() => {
    if (result) onLoaded();
  }, [result, onLoaded]);
  if (!result) return <p className="dithar-tafsir-status">{t.loading}</p>;
  if (result.status !== "found") {
    return (
      <div className="dithar-tafsir-notice" role="status" data-tafsir-none={result.status}>
        <p>{result.status === "invalid" ? t.noInvalid : t.loadFailed}</p>
        {result.status === "load-failed" && (
          <button type="button" className="dithar-tafsir-retry" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </button>
        )}
      </div>
    );
  }
  const { parsed, together } = result;
  const otherComments = parsed.commentVerses.filter((v) => v !== ayah);
  return (
    <>
      {together.length > 0 && (
        <div className="dithar-tafsir-notice" role="status" data-saadi-heading-together={together.join(",")}>
          <p>{t.headingTogether(digits(together[0]), digits(together[together.length - 1]))}</p>
        </div>
      )}
      {otherComments.length > 0 && (
        <div className="dithar-tafsir-notice" role="status" data-saadi-comment-also={otherComments.join(",")}>
          <p>{t.commentAlso(otherComments.map(digits).join(language === "ar" ? "، " : ", "))}</p>
        </div>
      )}
      <article dir="rtl" lang="ar" className="dithar-tafsir-text" data-tafsir-passage={key}>
        {parsed.paragraphs.map((p, i) => (
          <p key={i} className={p.heading ? "dithar-tafsir-heading" : undefined} data-tafsir-paragraph="">
            <SaadiRuns runs={p.runs} />
          </p>
        ))}
        {parsed.notes.length > 0 && (
          <aside className="dithar-tafsir-notes" aria-label={t.editorNotes} data-tafsir-notes="">
            <h3>{t.editorNotes}</h3>
            {parsed.notes.map((note, i) => (
              <p key={i} id={`saadi-note-${i}`} data-saadi-note={i}>
                <span className="dithar-saadi-notenum">{arabicDigits(i + 1)}</span> <NoteText note={note} />
              </p>
            ))}
          </aside>
        )}
      </article>
      <footer className="dithar-tafsir-source" data-tafsir-source="">
        <p>
          <b>{t.sourceTitle}:</b> {t.saadiBook}. {t.saadiAuthor}. {t.saadiEdition}. {t.saadiPublisher}.
        </p>
        <p>
          {t.saadiLicense}{" "}
          <a href="https://cms.itqan.dev/gallery/asset/6" target="_blank" rel="noreferrer" dir="ltr">
            cms.itqan.dev
          </a>
        </p>
      </footer>
    </>
  );
}

/**
 * Basa'ir: the surah as one continuous text. A tapped verse moves into an opening
 * in that text with its Tafsir directly beneath it, and the next verses continue
 * below. It lies over the reader, which stays mounted beneath. Closing on the
 * verse it opened leaves the reader exactly as it was; after moving to another
 * verse, the reader goes to that verse.
 */
export function VerseTafsirView({ surah, ayah, onClose }: { surah: number; ayah: number; onClose: (at: { surah: number; ayah: number }) => void }) {
  const { language, dir } = useLanguage();
  const t = basairLabels[language];
  const [at, setAt] = useState({ surah, ayah });
  const [open, setOpen] = useState(true);
  const [verseAway, setVerseAway] = useState(false);
  const [header, headerCompact] = useNeedsCompact<HTMLElement>(`${at.surah}:${at.ayah}:${language}`);
  const [nav, navCompact] = useNeedsCompact<HTMLElement>(`${at.ayah}:${verseAway}:${language}`);
  useThemeOverMushaf();
  const close = () => onClose(at);
  useBackDismiss(true, close);
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const text = useSurahText(at.surah);
  const meta = surahMeta(at.surah);
  const total = meta?.ayahCount ?? 0;
  const surahName = language === "en" ? (meta?.nameTranslit ?? "") : (meta?.nameAr ?? "");
  const prev = neighbourVerse(at.surah, at.ayah, -1);
  const next = neighbourVerse(at.surah, at.ayah, 1);
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const scroller = useRef<HTMLDivElement>(null);
  const opening = useRef<HTMLElement>(null);
  const verseLine = useRef<HTMLParagraphElement>(null);
  const moved = useRef(false);

  const go = useCallback((to: { surah: number; ayah: number }) => {
    moved.current = true;
    setAt(to);
    setOpen(true);
  }, []);
  const onOpenVerse = (n: number) => go({ surah: at.surah, ayah: n });

  useEffect(() => saveBasairPosition(at), [at]);

  // Scroll by hand, never scrollIntoView: that also moves the fixed screens around this one.
  const scrollTo = useCallback((target: Element | null) => {
    const box = scroller.current;
    if (!box || !target) return;
    box.scrollTop += target.getBoundingClientRect().top - box.getBoundingClientRect().top;
  }, []);
  const reachOpening = useCallback(() => scrollTo(opening.current), [scrollTo]);
  const ready = text !== null;
  useLayoutEffect(() => {
    if (!ready) return;
    const target = open ? opening.current : scroller.current?.querySelector(`[data-opening-verse='${at.surah}:${at.ayah}']`);
    scrollTo(target ?? null);
    if (moved.current) {
      moved.current = false;
      (target as HTMLElement | null)?.focus?.({ preventScroll: true });
    }
  }, [at, open, ready, scrollTo]);

  // Far into a long Tafsir, the verse is a tap away.
  const onScroll = () => {
    const box = scroller.current?.getBoundingClientRect();
    const line = verseLine.current?.getBoundingClientRect();
    const section = opening.current?.getBoundingClientRect();
    setVerseAway(Boolean(box && line && section && line.bottom < box.top && section.bottom > box.top + 80));
  };

  const verses = text?.verses ?? [];
  const before = open ? verses.filter((v) => v.ayah < at.ayah) : verses;
  const current = open ? verses.find((v) => v.ayah === at.ayah) : undefined;
  const after = open ? verses.filter((v) => v.ayah > at.ayah) : [];
  const key = `${at.surah}:${at.ayah}`;
  return (
    <div className="dithar-tafsir-page" dir={dir} role="dialog" aria-modal="true" aria-label={t.name} data-basair="" data-compact={headerCompact || navCompact ? "" : undefined}>
      <header ref={header} className="dithar-opening-top" data-short-labels={headerCompact ? "" : undefined}>
        <button type="button" onClick={close} className="dithar-opening-back" aria-label={t.backToMushaf} data-tafsir-back="">
          <PrevIcon size={20} aria-hidden="true" />
        </button>
        <label className="dithar-opening-select">
          <span className="sr-only">{t.chooseSurah}</span>
          <span className="dithar-opening-select-text" aria-hidden="true">
            {headerCompact ? surahName : t.surah(surahName)}
          </span>
          <ChevronDown size={15} aria-hidden="true" />
          <select value={at.surah} onChange={(e) => go({ surah: Number(e.target.value), ayah: 1 })} data-opening-surah-picker="">
            {SURAH_META.map((s) => (
              <option key={s.number} value={s.number}>
                {t.surah(language === "en" ? s.nameTranslit : s.nameAr)}
              </option>
            ))}
          </select>
        </label>
        <label className="dithar-opening-select" data-opening-position="">
          <span className="sr-only">{t.chooseVerse}</span>
          <span className="dithar-opening-select-text" aria-hidden="true">
            {headerCompact ? t.ayah(digits(at.ayah)) : t.verseOf(digits(at.ayah), digits(total))}
          </span>
          <ChevronDown size={15} aria-hidden="true" />
          <select value={at.ayah} onChange={(e) => go({ surah: at.surah, ayah: Number(e.target.value) })} data-saadi-picker="">
            {Array.from({ length: total }, (_, i) => (
              <option key={i} value={i + 1}>
                {t.verseOf(digits(i + 1), digits(total))}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="dithar-opening-body">
        <div className="dithar-tafsir-scroll" ref={scroller} onScroll={onScroll}>
          <div className="dithar-opening-flow">
            {!text && <p className="dithar-tafsir-status">{t.loading}</p>}
            {text?.basmala && (
              <p dir="rtl" lang="ar" className="dithar-opening-basmala dithar-kfgqpc">
                {text.basmala}
              </p>
            )}
            {text && <SurahRun surah={at.surah} verses={before} kfgqpc={text.kfgqpc} onOpen={onOpenVerse} />}
            {text && current && (
              <section ref={opening} tabIndex={-1} className="dithar-opening" aria-label={t.selectedVerse} data-verse-tafsir={key} data-tafsir-source-name="itqan-saadi">
                <h2 className="sr-only">{`${t.surah(language === "en" ? (meta?.nameTranslit ?? "") : (meta?.nameAr ?? ""))} · ${t.ayah(digits(at.ayah))}`}</h2>
                <p ref={verseLine} dir="rtl" lang="ar" data-tafsir-verse="" className={`dithar-opening-run${text.kfgqpc ? " dithar-kfgqpc" : ""}`}>
                  <VerseWords verse={current} />
                </p>
                <SaadiPassage surah={at.surah} ayah={at.ayah} onLoaded={reachOpening} />
              </section>
            )}
            {text && <SurahRun surah={at.surah} verses={after} kfgqpc={text.kfgqpc} onOpen={onOpenVerse} />}
          </div>
        </div>
      </div>
      <footer className="dithar-tafsir-footer">
        {open ? (
          <nav ref={nav} className="dithar-saadi-nav" aria-label={t.chooseVerse} data-saadi-nav="">
            <button type="button" disabled={!prev} onClick={() => prev && go(prev)} data-saadi-prev="">
              <PrevIcon size={17} aria-hidden="true" />
              <span className="dithar-saadi-nav-label">{t.prevVerse}</span>
            </button>
            {/* Far into a long Tafsir the verse is a tap away, here in the bar where it covers no text. */}
            {verseAway ? (
              <button
                type="button"
                className="dithar-opening-return"
                aria-label={t.returnToVerse(digits(at.ayah))}
                onClick={() => {
                  scrollTo(opening.current);
                  opening.current?.focus({ preventScroll: true });
                }}
                data-opening-return=""
              >
                <ArrowUp size={16} aria-hidden="true" />
                <span>{t.ayah(digits(at.ayah))}</span>
              </button>
            ) : (
              <button type="button" className="dithar-opening-close" onClick={() => { moved.current = true; setOpen(false); }} aria-label={t.closePassage} data-opening-close="">
                <X size={19} aria-hidden="true" />
              </button>
            )}
            <button type="button" disabled={!next} onClick={() => next && go(next)} data-saadi-next="">
              <span className="dithar-saadi-nav-label">{t.nextVerse}</span>
              <NextIcon size={17} aria-hidden="true" />
            </button>
          </nav>
        ) : (
          <p className="dithar-opening-hint" data-opening-hint="">
            {t.tapHint}
          </p>
        )}
      </footer>
    </div>
  );
}
