import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Share2, X } from "lucide-react";
import { useLanguage } from "../../theme/LanguageContext";
import { basairLabels } from "../../data/basairLabels";
import { useBackDismiss } from "../../lib/backOverlays";
import { saveBasairPosition } from "../../lib/basairPosition";
import { arabicDigits, surahMeta, SURAH_META } from "../../lib/quranMeta";
import { getSaadiVerse, neighbourVerse } from "../../lib/saadiTafsir";
import type { SaadiParagraph, SaadiVerse } from "../../lib/saadiTafsir";
import { loadKfgqpcText, whenKfgqpcFontReady } from "../../lib/kfgqpcText";
import { saadiTextForCard, saadiTextForSharing, tafsirShareContent } from "../../lib/tafsirShare";
import type { ShareableContent, ShareOutcome } from "../../lib/shareContent";
import { ShareMenu } from "../ShareMenu";
import { quranJourneyLabels } from "../../data/quranJourneyLabels";
import { DAILY_VIEW_MS, JOURNEY_PAGES, dailyAssignment, emptyJourney, loadJourney, pastDays, recordDailyInsightViewed } from "../../lib/quranJourney";
import type { DailyAssignment, JourneyEntry } from "../../lib/quranJourney";
import { todayLocalDate } from "../../lib/stats";
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
 * The third value says whether it would need it even without the last [reserve] px of the
 * row (the header's share button), so that button alone never changes the rest of the screen.
 */
function useNeedsCompact<T extends HTMLElement>(content: string, reserve = 0) {
  const ref = useRef<T>(null);
  const [compact, setCompact] = useState(false);
  const [withoutReserve, setWithoutReserve] = useState(false);
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
        setWithoutReserve(fullWidth.current - reserve > el.clientWidth + 1);
      } else if (compact && el.clientWidth >= fullWidth.current) {
        setCompact(false);
        setWithoutReserve(false);
      } else if (compact) {
        setWithoutReserve(fullWidth.current - reserve > el.clientWidth + 1);
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact, content, reserve]);
  return [ref, compact, compact && withoutReserve] as const;
}

export type VerseLine = { ayah: number; words: string; mark?: string };
type SurahText = { surah: number; verses: VerseLine[]; basmala: string | null; kfgqpc: boolean };

/** A surah in the Complex's own text and font, or Tanzil's text if that font can't draw. */
export function useSurahText(surah: number): SurahText | null {
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

export function VerseWords({ verse }: { verse: VerseLine }) {
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
export function NoteText({ note }: { note: string }) {
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

type Daily = { assignment: DailyAssignment; explored: boolean };

/** The Qur'an Journey's assignment for today (lib/quranJourney.ts), once known; null while loading or when storage can't be read. */
function useDailyJourney() {
  const [daily, setDaily] = useState<Daily | null>(null);
  // Whether the assignment has been asked for and answered (or failed): null [daily] then means there is none.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let live = true;
    dailyAssignment(todayLocalDate()).then(
      (status) => {
        if (!live) return;
        if (status.kind === "assigned") setDaily({ assignment: status.assignment, explored: status.explored });
        setSettled(true);
      },
      () => live && setSettled(true),
    );
    return () => {
      live = false;
    };
  }, []);
  const markRead = useCallback(() => setDaily((d) => (d ? { ...d, explored: true } : d)), []);
  return [daily, markRead, settled] as const;
}

/** Whether the app is on screen: a view kept open behind another app, or with the screen off, isn't being read. */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

const insightVerse = (insight: string) => {
  const [surah, ayah] = insight.split(":").map(Number);
  return { surah, ayah };
};

/**
 * A Journey leaf: the page, small, then the verse in the Complex's text and font, then
 * al-Sa'di's whole comment on it, exactly as Basa'ir shows it, scrolling in full. One way
 * out (×, or Back) and the footer's actions. The day's leaf (DailyLeaf) and a past day's
 * (JourneyHistoryView) are the same leaf: only the title, the read mark and the footer differ.
 */
function JourneyLeaf({
  page,
  round,
  insight,
  title,
  read = false,
  onClose,
  onLoaded,
  footer,
  dataAttrs,
}: {
  page: number;
  round: number;
  insight: string;
  title: string;
  read?: boolean;
  onClose: () => void;
  onLoaded?: () => void;
  footer: ReactNode;
  dataAttrs?: Record<string, string>;
}) {
  const { language, dir } = useLanguage();
  const t = basairLabels[language];
  const jt = quranJourneyLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const { surah, ayah } = insightVerse(insight);
  const text = useSurahText(surah);
  const verse = text?.verses.find((v) => v.ayah === ayah);
  const meta = surahMeta(surah);
  const name = language === "en" ? (meta?.nameTranslit ?? "") : (meta?.nameAr ?? "");
  return (
    <div className="dithar-journey-leaf" dir={dir} role="dialog" aria-modal="true" aria-label={title} data-journey-leaf={insight} {...dataAttrs}>
      <header className="dithar-journey-leaf-top">
        <button type="button" onClick={onClose} className="dithar-opening-back" aria-label={jt.close} data-journey-close="">
          <X size={20} aria-hidden="true" />
        </button>
        <h2 className="dithar-journey-leaf-title" data-journey-leaf-title="">
          {title}
        </h2>
        <span className="dithar-journey-leaf-spacer" aria-hidden="true" />
      </header>
      <div className="dithar-tafsir-scroll" key={insight}>
        <div className="dithar-opening-flow">
          <div className="dithar-journey-leaf-page" data-journey-page={page}>
            <span className="dithar-journey-medallion" aria-hidden="true">
              {digits(page)}
            </span>
            <span className="dithar-journey-leaf-meta">
              {jt.pageMeta(digits(page), digits(JOURNEY_PAGES), digits(round))}
            </span>
            {read && (
              <span className="dithar-journey-leaf-read" role="status" data-journey-read="">
                <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                {jt.read}
              </span>
            )}
          </div>
          <section className="dithar-opening dithar-journey-leaf-passage" aria-label={`${t.surah(name)} · ${t.ayah(digits(ayah))}`}>
            {verse && text ? (
              <p dir="rtl" lang="ar" data-tafsir-verse="" data-journey-verse={insight} className={`dithar-opening-run${text.kfgqpc ? " dithar-kfgqpc" : ""}`}>
                <VerseWords verse={verse} />
              </p>
            ) : (
              <p className="dithar-tafsir-status">{t.loading}</p>
            )}
            <p className="dithar-journey-leaf-ref">{`${t.surah(name)} · ${t.ayah(digits(ayah))}`}</p>
            <SaadiPassage surah={surah} ayah={ayah} onLoaded={onLoaded ?? noop} />
          </section>
        </div>
      </div>
      <footer className="dithar-tafsir-footer">{footer}</footer>
    </div>
  );
}

const noop = () => {};

/**
 * The day's leaf, from today's assignment: its page is counted by VerseTafsirView once it has stayed
 * on screen. With [onPastDays], the Journey's earlier days are a tap away (on the older side, as in a
 * past day's own leaf).
 */
function DailyLeaf({ daily, onClose, onLoaded, onContext, onPastDays }: { daily: Daily; onClose: () => void; onLoaded: () => void; onContext: () => void; onPastDays?: () => void }) {
  const { language, dir } = useLanguage();
  const jt = quranJourneyLabels[language];
  const OlderIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <JourneyLeaf
      page={daily.assignment.page}
      round={daily.assignment.round}
      insight={daily.assignment.insight}
      title={jt.todayPage}
      read={daily.explored}
      onClose={onClose}
      onLoaded={onLoaded}
      footer={
        <>
          {onPastDays && (
            <nav className="dithar-journey-history-nav" aria-label={jt.history}>
              <span aria-hidden="true" />
              <button type="button" onClick={onPastDays} data-journey-past-days="">
                <span>{jt.pastDays}</span>
                <OlderIcon size={17} aria-hidden="true" />
              </button>
            </nav>
          )}
          <button type="button" className="dithar-journey-context" onClick={onContext} data-journey-context="">
            {jt.readInContext}
          </button>
        </>
      }
    />
  );
}

/** A past Journey entry, as Statistics lists it (lib/quranJourney.ts journeyStats history) and the day's leaf (pastDays). */
export type JourneyHistoryEntry = Pick<JourneyEntry, "page" | "round" | "insight" | "localDate">;

/** "YYYY-MM-DD" read as that local day (noon, so no time zone can move it to a neighbour). */
const localDay = (date: string) => new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12);

/** The day an entry was read, as the leaf's title: «الخميس ١٢ نوفمبر» (with the year when it isn't this year's). */
function journeyDayTitle(date: string, language: "ar" | "en", now: Date = new Date()): string {
  const day = localDay(date);
  const withYear = day.getFullYear() !== now.getFullYear();
  return new Intl.DateTimeFormat(language === "ar" ? "ar-u-nu-arab" : "en-GB", { weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}) }).format(day).replace("،", "");
}

/** A neighbouring entry's day, short, for the footer: «١١ نوفمبر». */
function journeyShortDay(date: string, language: "ar" | "en"): string {
  return new Intl.DateTimeFormat(language === "ar" ? "ar-u-nu-arab" : "en-GB", { day: "numeric", month: "long" }).format(localDay(date));
}

/**
 * A past day's leaf, opened from Statistics → «سجل الصفحات» or the day's leaf → «الأيام السابقة»: the same leaf as the day's own,
 * titled with the day it was read, with the newer and older entries a tap away. Reading it
 * counts nothing — it never calls recordDailyInsightViewed, so today's page is untouched.
 * «اقرأها في سياقها» opens the verse in Basa'ir over it, exactly as from today's leaf.
 */
export function JourneyHistoryView({ entries, index: initialIndex, onClose }: { entries: readonly JourneyHistoryEntry[]; index: number; onClose: () => void }) {
  const { language, dir } = useLanguage();
  const jt = quranJourneyLabels[language];
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, entries.length - 1)));
  const [context, setContext] = useState<{ surah: number; ayah: number } | null>(null);
  useBackDismiss(!context, onClose);
  const entry = entries[index];
  if (!entry) return null;
  const newer = index > 0 ? entries[index - 1] : null;
  const older = index < entries.length - 1 ? entries[index + 1] : null;
  // Newest first: the newer entry is the "previous" side, the older the "next" (as the list reads).
  const NewerIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const OlderIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <div className="dithar-tafsir-page dithar-journey-history" dir={dir} data-journey-history-view="">
      <JourneyLeaf
        page={entry.page}
        round={entry.round}
        insight={entry.insight}
        title={journeyDayTitle(entry.localDate, language)}
        onClose={onClose}
        dataAttrs={{ "data-journey-history-entry": `${entry.round}:${entry.page}` }}
        footer={
          <>
            <nav className="dithar-journey-history-nav" aria-label={jt.history}>
              <button type="button" disabled={!newer} onClick={() => setIndex((i) => i - 1)} aria-label={newer ? `${jt.historyNewer}: ${journeyDayTitle(newer.localDate, language)}` : jt.historyNewer} data-journey-history-newer="">
                <NewerIcon size={17} aria-hidden="true" />
                <span>{newer ? journeyShortDay(newer.localDate, language) : jt.historyNewer}</span>
              </button>
              <button type="button" disabled={!older} onClick={() => setIndex((i) => i + 1)} aria-label={older ? `${jt.historyOlder}: ${journeyDayTitle(older.localDate, language)}` : jt.historyOlder} data-journey-history-older="">
                <span>{older ? journeyShortDay(older.localDate, language) : jt.historyOlder}</span>
                <OlderIcon size={17} aria-hidden="true" />
              </button>
            </nav>
            <button type="button" className="dithar-journey-context" onClick={() => setContext(insightVerse(entry.insight))} data-journey-context="">
              {jt.readInContext}
            </button>
          </>
        }
      />
      {context && <VerseTafsirView surah={context.surah} ayah={context.ayah} onClose={() => setContext(null)} />}
    </div>
  );
}

/**
 * Basa'ir: the surah as one continuous text. A tapped verse moves into an opening
 * in that text with its Tafsir directly beneath it, and the next verses continue
 * below. It lies over the reader, which stays mounted beneath. Closing on the
 * verse it opened leaves the reader exactly as it was; after moving to another
 * verse, the reader goes to that verse.
 */
export function VerseTafsirView({
  surah,
  ayah,
  onClose,
  openDailyLeaf = false,
  onDailyLeafShown,
}: {
  surah: number;
  ayah: number;
  onClose: (at: { surah: number; ayah: number }) => void;
  /** Opened from the Journey's daily notification (App.tsx JourneyOpenHost): the day's leaf opens at once. */
  openDailyLeaf?: boolean;
  /** With [openDailyLeaf]: the day's insight has painted (or there is none to show). */
  onDailyLeafShown?: () => void;
}) {
  const { language, dir } = useLanguage();
  const t = basairLabels[language];
  const [at, setAt] = useState({ surah, ayah });
  const [open, setOpen] = useState(true);
  const [verseAway, setVerseAway] = useState(false);
  // The share button (44px and the row's 6px gap) shortens the header's labels when they don't fit beside it,
  // but only overflow without it turns the whole screen compact, exactly as before the button.
  // The Qur'an Journey's day: its mark in the header, its leaf, and whether its insight is on screen now.
  const [daily, markDailyRead, dailySettled] = useDailyJourney();
  const pageVisible = usePageVisible();
  const jt = quranJourneyLabels[language];
  const [leafOpen, setLeafOpen] = useState(false);
  const [leafLoaded, setLeafLoaded] = useState(false);
  /** A past day open over the day's leaf (from «الأيام السابقة»). */
  const [pastOpen, setPastOpen] = useState(false);
  const [contextFromDaily, setContextFromDaily] = useState(false);
  // Like the share button, the day's mark only shortens the header's labels; it never turns the screen compact.
  const [header, headerCompact, headerCompactWithoutShare] = useNeedsCompact<HTMLElement>(`${at.surah}:${at.ayah}:${language}:${daily ? "j" : ""}`, daily ? 100 : 50);
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
  // Sharing the open verse with its Tafsir (lib/tafsirShare.ts), through the app's share sheet.
  // [pages]: 0 = one card (short, medium); else a long Tafsir, shared as that many pages (PDF or images).
  const [share, setShare] = useState<{ key: string; content: ShareableContent; pages: number } | null>(null);
  const sharing = useRef(false);
  const shareTitle = `${t.surah(surahName)} · ${t.ayah(digits(at.ayah))}`;
  const onShare = async () => {
    if (sharing.current) return;
    sharing.current = true;
    const target = at;
    try {
      // The verse as the Mushaf shares it (Tanzil's marked text), loaded only now: it's a large chunk.
      const [{ markedVerseForSharing }, tafsir] = await Promise.all([import("../../lib/quranShareText"), getSaadiVerse(target.surah, target.ayah)]);
      const verse = markedVerseForSharing(target.surah, target.ayah);
      if (!verse || tafsir.status !== "found") return;
      const content = tafsirShareContent(
        { ...target, text: verse },
        saadiTextForSharing(tafsir.parsed),
        { kind: t.shareKind, reference: shareTitle, tafsirLabel: t.tafsirLabel, source: `${t.saadiBook} — ${t.saadiAuthor}` },
        saadiTextForCard(tafsir.parsed, target.ayah),
      );
      // Long or not, decided by the card's own layout at its normal size (lib/shareImageTafsir.ts).
      const pages = await import("../../lib/shareImage").then((m) => m.tafsirSharePages(withColophon(content), language)).catch(() => 0);
      setShare({ key: `${target.surah}:${target.ayah}`, content, pages });
    } finally {
      sharing.current = false;
    }
  };

  /** A long Tafsir's pages end with the full colophon: the book and author, then the edition, publisher and licence. */
  const withColophon = (content: ShareableContent): ShareableContent => ({
    ...content,
    sections: content.sections?.map((section) => ({ ...section, note: `${t.saadiEdition}. ${t.saadiPublisher}. ${t.saadiLicense}` })),
  });

  /** A long Tafsir's pages (the card, continued), shared as one PDF or as the images, in order. */
  const shareLongTafsir = async (content: ShareableContent, as: "pdf" | "images"): Promise<ShareOutcome> => {
    try {
      const [images, pdf, sharing] = await Promise.all([import("../../lib/shareImage"), import("../../lib/pdfFromJpegs"), import("../../lib/shareContent")]);
      const drawn = await images.renderTafsirPages(withColophon(content), language, {
        continued: t.shareContinued(shareTitle),
        verseContinued: `${shareTitle} · ${t.bookletVerseContinued}`,
        reference: shareTitle,
        verseContinues: t.bookletContinues,
        folio: (n, total) => t.bookletPageOf(digits(n), digits(total)),
      });
      const count = drawn.images.length;
      const caption = t.bookletCaption(shareTitle, t.bookletPages(count, digits(count)));
      const title = `${t.tafsirLabel} · ${shareTitle}`;
      const base = `dithar-tafsir-${at.surah}-${at.ayah}`;
      if (as === "images") return await sharing.shareImageSet(drawn.images, title, base, caption);
      const file = pdf.pdfFromJpegs(
        drawn.images.map((d) => ({ jpeg: pdf.dataUrlBytes(d), width: drawn.width, height: drawn.height })),
        { title, author: t.saadiAuthor },
      );
      return await sharing.shareDocument(pdf.pdfDataUrl(file), `${base}.pdf`, title, caption);
    } catch {
      return "failed";
    }
  };

  const go = useCallback((to: { surah: number; ayah: number }) => {
    moved.current = true;
    setAt(to);
    setOpen(true);
    // Reading on from here is free reading: only the day's insight, reached from its leaf, counts.
    setContextFromDaily(false);
  }, []);

  const openLeaf = () => {
    setLeafLoaded(false);
    setPastOpen(false);
    setLeafOpen(true);
  };
  const closeLeaf = useCallback(() => setLeafOpen(false), []);
  useBackDismiss(leafOpen, closeLeaf);
  // The Journey's earlier days, read when the day's leaf opens (newest first; today's page stays apart),
  // and the one open over the leaf. Reading them counts nothing.
  const pastEntries = useMemo(() => (leafOpen && daily ? pastDays(loadJourney() ?? emptyJourney(), daily.assignment.localDate) : []), [leafOpen, daily]);
  const onLeafLoaded = useCallback(() => setLeafLoaded(true), []);
  const openDailyInContext = () => {
    if (!daily) return;
    go(insightVerse(daily.assignment.insight));
    setContextFromDaily(true);
    setLeafOpen(false);
  };
  // The page counts once the day's insight has stayed on screen DAILY_VIEW_MS: in its leaf, or
  // in its context reached from the leaf. Assigned, or read freely, it never counts.
  const atKey = `${at.surah}:${at.ayah}`;
  // Only while the app is on screen: the 3 s start again when it comes back.
  // A past day open over the leaf hides it: today's insight isn't on screen then.
  const viewingDaily = pageVisible && !!daily && !daily.explored && ((leafOpen && leafLoaded && !pastOpen) || (!leafOpen && contextFromDaily && open && atKey === daily.assignment.insight));
  useEffect(() => {
    if (!viewingDaily || !daily) return;
    const timer = setTimeout(() => {
      if (recordDailyInsightViewed(daily.assignment)) markDailyRead();
    }, DAILY_VIEW_MS);
    return () => clearTimeout(timer);
  }, [viewingDaily, daily, markDailyRead]);
  // From the daily notification: the day's leaf opens once, as soon as the assignment is known.
  const leafFromNotice = useRef(false);
  useEffect(() => {
    if (!openDailyLeaf || leafFromNotice.current || !daily) return;
    leafFromNotice.current = true;
    setLeafLoaded(false);
    setLeafOpen(true);
  }, [openDailyLeaf, daily]);
  // …and says when its insight is on screen (two frames after it loaded), or that there is none.
  const shownReported = useRef(false);
  const noDaily = openDailyLeaf && dailySettled && !daily;
  const leafShown = openDailyLeaf && leafOpen && leafLoaded;
  useEffect(() => {
    if (shownReported.current || !onDailyLeafShown || !(leafShown || noDaily)) return;
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => {
        shownReported.current = true;
        onDailyLeafShown();
      });
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [leafShown, noDaily, onDailyLeafShown]);
  const dailyPage = daily ? digits(daily.assignment.page) : "";
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
    <div className="dithar-tafsir-page" dir={dir} role="dialog" aria-modal="true" aria-label={t.name} data-basair="" data-compact={headerCompactWithoutShare || navCompact ? "" : undefined}>
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
        {daily && (
          <button
            type="button"
            onClick={openLeaf}
            className="dithar-opening-back dithar-journey-mark"
            aria-label={daily.explored ? jt.markRead(dailyPage) : jt.markUnread(dailyPage)}
            title={jt.todayPage}
            data-journey-mark={daily.explored ? "read" : "unread"}
          >
            <span className="dithar-journey-medallion" aria-hidden="true">
              {dailyPage}
            </span>
            {daily.explored && (
              <span className="dithar-journey-check" aria-hidden="true">
                <Check size={10} strokeWidth={3} />
              </span>
            )}
          </button>
        )}
        <button type="button" onClick={() => void onShare()} className="dithar-opening-back" aria-label={`${t.shareVerse}: ${shareTitle}`} data-tafsir-share="">
          <Share2 size={20} aria-hidden="true" />
        </button>
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
      {share && (
        <ShareMenu
          content={share.content}
          subtitle={shareTitle}
          open={share.key === key}
          onClose={() => setShare(null)}
          {...(share.pages > 0
            ? {
                document: { label: t.sharePdf(t.bookletPages(share.pages, digits(share.pages))), preparing: t.sharePreparingPdf, run: () => shareLongTafsir(share.content, "pdf") },
                imageSet: { label: t.sharePageImages, preparing: t.bookletSharing, run: () => shareLongTafsir(share.content, "images") },
              }
            : {})}
        />
      )}
      {daily && leafOpen && <DailyLeaf daily={daily} onClose={closeLeaf} onLoaded={onLeafLoaded} onContext={openDailyInContext} onPastDays={pastEntries.length > 0 ? () => setPastOpen(true) : undefined} />}
      {leafOpen && pastOpen && pastEntries.length > 0 && <JourneyHistoryView entries={pastEntries} index={0} onClose={() => setPastOpen(false)} />}
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
          <div className="dithar-opening-hint-row">
            <p className="dithar-opening-hint" data-opening-hint="">
              {t.tapHint}
            </p>
            {daily && (
              <button type="button" className="dithar-journey-footer" onClick={openLeaf} data-journey-footer="">
                {daily.explored && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
                {jt.footerButton(dailyPage)}
              </button>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
