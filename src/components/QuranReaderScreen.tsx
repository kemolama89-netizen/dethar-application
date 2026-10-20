import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";
import { Bookmark, BookmarkCheck, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, Home, List, Maximize2, Minus, Plus, RectangleHorizontal, RectangleVertical, Search, Settings2, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import "./quranReader.css";
import { DeviceFrame } from "./DeviceFrame";
import { BottomNav } from "./BottomNav";
import { useLanguage } from "../theme/LanguageContext";
import { quranLabels } from "../data/quranLabels";
import { QURAN_VERSES, TANZIL_NOTICE } from "../lib/quranText";
import { JUZ_STARTS, MUSHAF_SHOWN_BOX, SURAH_META, TOTAL_PAGES, arabicDigits, hizbOf, juzOf, mushafViewBox, pageOf, pageVerses, quarterStartsOnPage, surahMeta } from "../lib/quranMeta";
import { QURAN_SEARCH_MIN, normalizeQuery, searchQuran } from "../lib/quranSearch";
import { lockReaderOrientation } from "../lib/orientationNative";
import {
  QURAN_ZOOMS,
  QURAN_ZOOM_FIT,
  isQuranBookmarked,
  loadQuranZoom,
  saveQuranPosition,
  saveQuranZoom,
  toggleQuranBookmark,
  useQuranBookmarks,
  useQuranPosition,
} from "../lib/quranReading";
import { isPageVisible, subscribePageVisibility } from "../lib/pageVisibility";
import { SLOW_FRAMES, SLOW_FRAME_MS, markPageTurnTooSlow, pageTurnTooSlow } from "../lib/pageTurnPerformance";
import { surahHeadingFrames } from "../lib/mushafHeadings";
import { openingArtwork } from "../lib/mushafOpening";
import { MushafSurahFrame, MushafSurahFrameDefs } from "./MushafSurahFrame";

// The Qur'an reader: the pages of the King Fahd Complex's 1441H Madinah
// Mushaf (Hafs), one at a time, as printed — each page is the edition's own
// artwork (public/mushaf/hafs-kfqc/svg, from quran-svg, shown unmodified), so
// every page break and all 15 lines are exactly the print's. Bundled with
// the app: it reads offline. Over the artwork lies an invisible layer with
// one shape per verse (the edition's verse polygons, json/NNN.json), so a
// verse can be tapped to select or bookmark it. Pages turn with the
// buttons, a swipe or the arrow keys; the reading position (a verse) is
// saved automatically (src/lib/quranReading.ts). By default the page fits
// the screen; a larger zoom scrolls within the page instead of clipping.
// A page turns like a Mushaf leaf (PageTurn below): it lifts and turns over
// its spine, following the finger, with the new page beneath.

export interface QuranTarget {
  surah: number;
  ayah: number;
}

const POSITION_SAVE_DELAY_MS = 500;
/** A horizontal swipe at least this long (px) turns the page. */
const SWIPE_MIN_PX = 50;
/** Width ÷ height of a quran-svg page as shown (MUSHAF_SHOWN_BOX); the opening pages have their own. */
const PAGE_ASPECT = (([, , w, h]) => w / h)(MUSHAF_SHOWN_BOX.split(" ").map(Number));

const pad3 = (n: number) => String(n).padStart(3, "0");
const mushafAsset = (page: number, kind: "svg" | "json") => `${import.meta.env.BASE_URL}mushaf/hafs-kfqc/${kind}/${pad3(page)}.${kind}`;
/** A page's image: the decorated opening artwork for pages 1–2 (lib/mushafOpening.ts), else quran-svg's page. */
const pageImage = (page: number) => {
  const opening = openingArtwork(page);
  return opening ? `${import.meta.env.BASE_URL}${opening.path}` : mushafAsset(page, "svg");
};

/** One verse's tappable shape on a page: SVG path data in the page's own coordinates. */
interface VerseShape {
  surah: number;
  ayah: number;
  d: string;
}

/**
 * quran-svg ships a verse's polygon in two shapes (its docs/FORMAT.md): path
 * data from page 3 on, and a bare "x,y x,y …" point list on pages 1–2.
 */
function polygonToPath(polygon: string): string {
  if (polygon.trimStart().startsWith("M")) return polygon;
  const n = (polygon.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const points: string[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) points.push(`${n[i]} ${n[i + 1]}`);
  return `M ${points.join(" L ")} Z`;
}

const shapesCache = new Map<number, Promise<VerseShape[]>>();
/** A page's verse shapes, read once from the bundled json/NNN.json. */
function loadVerseShapes(page: number): Promise<VerseShape[]> {
  let pending = shapesCache.get(page);
  if (!pending) {
    pending = fetch(mushafAsset(page, "json"))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ surahNumber: number; ayahNumber: number; polygon: string }[]>;
      })
      .then((rows) => rows.map((r) => ({ surah: r.surahNumber, ayah: r.ayahNumber, d: polygonToPath(r.polygon) })));
    pending.catch(() => shapesCache.delete(page));
    shapesCache.set(page, pending);
  }
  return pending;
}

/** Where a verse's first line is, relative to the top of the page body's visible area. */
function verseLineTop(body: HTMLElement, el: Element): number {
  return (el.getClientRects()[0] ?? el.getBoundingClientRect()).top - body.getBoundingClientRect().top;
}

/**
 * The reading position within a zoomed page (which scrolls). The position
 * stays put while its verse's first line is still in view (so a verse near
 * the end of the page, which can't be scrolled up to the top, isn't replaced
 * by an earlier one); once it scrolls out of view, the position becomes the
 * first verse that starts in view — or, if none does, the verse that fills
 * the view.
 */
function readingVerse(body: HTMLElement, current: string): string {
  // What lies under the controls (the body's padding, their room) isn't in view.
  const { top, bottom } = controlsRoom(body);
  const view = body.clientHeight - bottom;
  const inView = (el: Element) => {
    const y = verseLineTop(body, el);
    return y >= top - 6 && y < view - 16;
  };
  const els = [...body.querySelectorAll<SVGElement>("[data-verse]")];
  const cur = els.find((el) => el.dataset.verse === current);
  if (cur && inView(cur)) return current;
  const firstInView = els.find(inView);
  if (firstInView) return firstInView.dataset.verse!;
  const above = els.filter((el) => verseLineTop(body, el) < top);
  return (above[above.length - 1] ?? els[0])?.dataset.verse ?? current;
}

function scrollToVerse(body: HTMLElement, key: string): void {
  const el = body.querySelector<SVGElement>(`[data-verse="${key}"]`);
  if (!el || body.scrollHeight <= body.clientHeight) return;
  body.scrollTop = Math.max(0, verseLineTop(body, el) + body.scrollTop - controlsRoom(body).top - 6);
}

/** The room kept for the controls at the top and bottom of the scroll area (its padding). */
function controlsRoom(body: HTMLElement): { top: number; bottom: number } {
  return { top: parseFloat(body.style.paddingTop) || 0, bottom: parseFloat(body.style.paddingBottom) || 0 };
}

function surahName(n: number, language: "ar" | "en"): string {
  const meta = surahMeta(n);
  if (!meta) return String(n);
  return language === "en" ? meta.nameTranslit : meta.nameAr;
}

function SurahIndex({ onOpen, onBack, onNavigate }: { onOpen: (t: QuranTarget) => void; onBack: () => void; onNavigate?: (key: string) => void }) {
  const { language, dir } = useLanguage();
  const t = quranLabels[language];
  const [query, setQuery] = useState("");
  const [browse, setBrowse] = useState<"surah" | "juz">("surah");
  const bookmarks = useQuranBookmarks();
  const last = useQuranPosition();
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const q = query.trim().replace(/[إأآٱ]/g, "ا").toLowerCase();
  const list = SURAH_META.filter((s) => !q || String(s.number) === q || s.nameAr.replace(/[إأآٱ]/g, "ا").includes(q) || s.nameTranslit.toLowerCase().includes(q));
  return (
    <div className="flex min-h-full flex-col px-4 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))]" data-quran-index="">
      <div className="dithar-sticky-header flex items-center gap-2">
        <button type="button" onClick={onBack} aria-label={t.back} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold-soft)", color: "var(--color-text-primary)" }}>
          <BackIcon size={18} />
        </button>
        <h1 className="flex-1 text-center text-[20px] font-bold" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }}>
          {t.title}
        </h1>
        <span className="w-9" />
      </div>

      {last && (
        <button
          type="button"
          onClick={() => onOpen({ surah: last.surah, ayah: last.ayah })}
          className="mt-3 flex items-center justify-between rounded-2xl px-4 py-2.5 text-start"
          style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}
          data-quran-last=""
        >
          <span className="text-[13px] font-semibold">{t.lastRead}</span>
          <span className="text-[12px]" style={{ color: "var(--color-gold-on-primary)" }}>
            {t.surah(surahName(last.surah, language))} · {t.ayah(language === "ar" ? arabicDigits(last.ayah) : String(last.ayah))}
            {last.page ? ` · ${t.page(language === "ar" ? arabicDigits(last.page) : String(last.page))}` : ""}
          </span>
        </button>
      )}

      <section className="mt-3 rounded-2xl border px-3 py-2" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }} data-quran-bookmarks="">
        <h2 className="text-[13px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.bookmarks}
        </h2>
        {bookmarks.length === 0 ? (
          <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
            {t.noBookmarks}
          </p>
        ) : (
          <ul className="mt-1 flex flex-col">
            {bookmarks.map((b) => (
              <li key={`${b.surah}:${b.ayah}`} className="flex items-center gap-2 border-t py-1.5 first:border-t-0" style={{ borderColor: "var(--color-gold-soft)" }}>
                <button type="button" onClick={() => onOpen({ surah: b.surah, ayah: b.ayah })} className="flex-1 text-start text-[12.5px]" style={{ color: "var(--color-text-primary)" }} data-quran-bookmark={`${b.surah}:${b.ayah}`}>
                  {t.surah(surahName(b.surah, language))} · {t.ayah(language === "ar" ? arabicDigits(b.ayah) : String(b.ayah))}
                </button>
                <button type="button" onClick={() => toggleQuranBookmark(b.surah, b.ayah)} aria-label={t.removeBookmark} className="p-1" style={{ color: "var(--color-text-muted)" }}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.searchAll}
        aria-label={t.searchAll}
        className="mt-3 rounded-xl border px-3 py-2 text-[13px]"
        style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        data-quran-search=""
      />
      {!q && (
        <div className="mt-3 grid grid-cols-2 rounded-full p-1" style={{ background: "var(--color-surface)", boxShadow: "inset 0 0 0 1px var(--color-gold-soft)" }} role="tablist" aria-label={t.browseBy} data-quran-browse={browse}>
          {(["surah", "juz"] as const).map((b) => (
            <button
              key={b}
              type="button"
              role="tab"
              aria-selected={browse === b}
              onClick={() => setBrowse(b)}
              className="rounded-full py-1.5 text-[13px] font-semibold"
              style={browse === b ? { background: "var(--color-primary)", color: "var(--color-primary-contrast)" } : { color: "var(--color-text-primary)" }}
              data-quran-browse-tab={b}
            >
              {b === "surah" ? t.surahs : t.juzList}
            </button>
          ))}
        </div>
      )}
      {!q && browse === "juz" ? (
        <JuzList onOpen={onOpen} />
      ) : (
        list.length > 0 && (
          <ul className="mt-2 grid grid-cols-1 gap-1.5" data-quran-surahs="">
            {list.map((s) => (
              <li key={s.number}>
                <button
                  type="button"
                  onClick={() => onOpen({ surah: s.number, ayah: 1 })}
                  className="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start"
                  style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                  data-quran-surah={s.number}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
                    {language === "ar" ? arabicDigits(s.number) : s.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                      {s.nameAr}
                    </span>
                    <span className="block text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                      {language === "en" ? `${s.nameTranslit} · ` : ""}
                      {s.type === "Meccan" ? t.meccan : t.medinan} · {t.ayahCount(language === "ar" ? arabicDigits(s.ayahCount) : String(s.ayahCount))}
                    </span>
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {t.page(language === "ar" ? arabicDigits(pageOf(s.number, 1) ?? 0) : String(pageOf(s.number, 1) ?? ""))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
      {/* The verses containing what is typed (a word, a phrase or a whole verse), under the surahs it names. */}
      {q && <VerseResults query={query} onOpen={onOpen} />}
      <BottomNav className="mt-3" activeKey="quran" onSelect={(key) => onNavigate?.(key)} />
    </div>
  );
}

/** The 30 Juz, each opened where it begins — its first verse, surah and page, and its two hizbs. */
function JuzList({ onOpen }: { onOpen: (t: QuranTarget) => void }) {
  const { language } = useLanguage();
  const t = quranLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  return (
    <ul className="mt-2 grid grid-cols-1 gap-1.5" data-quran-juzs="">
      {JUZ_STARTS.map(([surah, ayah], i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => onOpen({ surah, ayah })}
            className="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start"
            style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
            data-quran-juz-item={i + 1}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
              {digits(i + 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {t.juz(digits(i + 1))}
              </span>
              <span className="block text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                {t.surah(surahName(surah, language))} · {t.ayah(digits(ayah))} · {t.hizbs(digits(2 * i + 1), digits(2 * i + 2))}
              </span>
            </span>
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              {t.page(digits(pageOf(surah, ayah) ?? 0))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const RESULTS_STEP = 50;

/** The verses that contain `query` (lib/quranSearch.ts), as they are written (Tanzil's Uthmani text), the matched words marked. */
function VerseResults({ query, onOpen }: { query: string; onOpen: (t: QuranTarget) => void }) {
  const { language } = useLanguage();
  const t = quranLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const deferred = useDeferredValue(query);
  const hits = useMemo(() => searchQuran(deferred), [deferred]);
  // How many are shown: the first RESULTS_STEP of each new search, more on request.
  const [more, setMore] = useState({ query: deferred, shown: RESULTS_STEP });
  const shown = more.query === deferred ? more.shown : RESULTS_STEP;
  const tooShort = normalizeQuery(deferred).replace(/ /g, "").length < QURAN_SEARCH_MIN;
  return (
    <section className="mt-3" data-quran-results={hits.length}>
      <h2 className="text-[13px] font-bold" style={{ color: "var(--color-text-primary)" }}>
        {t.verses}
        {!tooShort && (
          <span className="ms-1.5 text-[11.5px] font-normal" style={{ color: "var(--color-text-muted)" }} data-quran-results-count="">
            {hits.length === 0 ? t.noResults : t.resultCount(digits(hits.length))}
          </span>
        )}
      </h2>
      {tooShort && (
        <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
          {t.searchHint}
        </p>
      )}
      <ul className="mt-1.5 grid grid-cols-1 gap-1.5">
        {hits.slice(0, shown).map((h) => {
          const marked = new Set(h.matched);
          return (
            <li key={`${h.surah}:${h.ayah}`}>
              <button
                type="button"
                onClick={() => onOpen({ surah: h.surah, ayah: h.ayah })}
                className="flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-start"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
                data-quran-result={`${h.surah}:${h.ayah}`}
              >
                <span className="text-[11px] font-semibold" style={{ color: "var(--color-primary)" }}>
                  {t.surah(surahName(h.surah, language))} · {t.ayah(digits(h.ayah))} · {t.page(digits(pageOf(h.surah, h.ayah) ?? 0))}
                </span>
                <span dir="rtl" lang="ar" className="dithar-quran-verse-text">
                  {h.words.map((w, i) => (
                    <span key={i}>
                      {i > 0 ? " " : ""}
                      {marked.has(i) ? <mark data-quran-result-match="">{w}</mark> : w}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {hits.length > shown && (
        <button type="button" onClick={() => setMore({ query: deferred, shown: shown + RESULTS_STEP })} className="mt-2 w-full rounded-full py-2 text-[12.5px] font-semibold" style={{ boxShadow: "inset 0 0 0 1px var(--color-gold-soft)", color: "var(--color-text-primary)" }} data-quran-results-more="">
          {t.showMore(digits(hits.length - shown))}
        </button>
      )}
    </section>
  );
}

/** The reader's search: a word or a whole verse, opened on its page. */
function QuranSearchPanel({ onOpen }: { onOpen: (t: QuranTarget) => void }) {
  const { language } = useLanguage();
  const t = quranLabels[language];
  const [query, setQuery] = useState("");
  return (
    <div className="flex flex-col">
      <input
        type="search"
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.searchVerses}
        aria-label={t.searchVerses}
        dir="rtl"
        className="rounded-xl border px-3 py-2 text-[14px]"
        style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-bg)", color: "var(--color-text-primary)" }}
        data-quran-verse-search=""
      />
      {query.trim() !== "" && <VerseResults query={query} onOpen={onOpen} />}
    </div>
  );
}

const verseKey = (surah: number, ayah: number) => `${surah}:${ayah}`;
function parseVerseKey(key: string): QuranTarget {
  const [surah, ayah] = key.split(":").map(Number);
  return { surah, ayah };
}

/** Room under the page for its printed number, and above it (px). */
const FOLIO_PX = 18;
const TOP_PAD_PX = 4;
/** A press held this long on a verse selects it (a tap only shows or hides the controls). */
const LONG_PRESS_MS = 450;

/** Width ÷ height of a page as shown: the opening pages' own design, else quran-svg's page (MUSHAF_SHOWN_BOX). */
function pageAspect(page: number): number {
  const opening = openingArtwork(page);
  if (!opening) return PAGE_ASPECT;
  const [, , w, h] = opening.displayBox.split(/\s+/).map(Number);
  return w / h;
}

/** One Mushaf page: the edition's artwork with its surah-title frames, and a tappable shape per verse. */
function MushafSheet({
  page,
  width,
  height,
  verses,
  failed,
  onFailed,
  selected,
  highlight,
  onLongPress,
  style,
}: {
  page: number;
  width: number;
  height: number;
  verses: VerseShape[];
  failed: boolean;
  onFailed: (page: number) => void;
  selected: string | null;
  highlight: string | null;
  onLongPress: (key: string) => void;
  style?: CSSProperties;
}) {
  const { language } = useLanguage();
  const t = quranLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const opening = openingArtwork(page);
  const artViewBox = shownViewBox(page);
  const press = useRef<{ key: string; x: number; y: number; timer: number } | null>(null);
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
  };
  return (
    <div className="dithar-mushaf-leaf" style={style} data-quran-leaf={page}>
      {failed ? (
        <p className="m-auto px-4 py-10 text-center text-[13px]" style={{ color: "var(--color-text-muted)", width: width || undefined }} role="alert" data-quran-load-error="">
          {t.loadError}
        </p>
      ) : (
        <div className="dithar-mushaf-sheet" style={width > 0 ? { width, height } : { visibility: "hidden" }} data-quran-sheet={page}>
          <MushafArt page={page} onFailed={onFailed} />
          <svg viewBox={artViewBox} className="dithar-mushaf-hits" aria-label={t.pages} data-quran-hits={page}>
            <g transform={opening?.shapeTransform}>
              {verses.map(({ surah, ayah, d }) => {
                const key = verseKey(surah, ayah);
                return (
                  <path
                    key={key}
                    d={d}
                    role="button"
                    tabIndex={0}
                    aria-label={`${t.surah(surahName(surah, language))} · ${t.ayah(digits(ayah))}`}
                    aria-pressed={selected === key}
                    data-verse={key}
                    data-selected={selected === key ? "" : undefined}
                    data-target={highlight === key ? "" : undefined}
                    // A tap goes on to the page (it shows or hides the controls); a long press selects the verse.
                    onPointerDown={(e) => {
                      cancelPress();
                      press.current = { key, x: e.clientX, y: e.clientY, timer: window.setTimeout(() => {
                        press.current = null;
                        onLongPress(key);
                      }, LONG_PRESS_MS) };
                    }}
                    onPointerMove={(e) => {
                      if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 10) cancelPress();
                    }}
                    onPointerUp={cancelPress}
                    onPointerCancel={cancelPress}
                    onContextMenu={(e) => {
                      // A long press on Android (and a right click) — the same selection, no browser menu.
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
                    {/* The verse's words for screen readers (Tanzil's text, verbatim); the page itself is an image. */}
                    <title>{QURAN_VERSES[surah - 1]?.[ayah - 1] ?? ""}</title>
                  </path>
                );
              })}
            </g>
          </svg>
        </div>
      )}
      <MushafFolio page={page} main />
    </div>
  );
}

/** What is shown of a page, in its own coordinates: the opening pages' decorative design (lib/mushafOpening.ts), else MUSHAF_SHOWN_BOX of quran-svg's page. */
const shownViewBox = (page: number) => openingArtwork(page)?.displayBox ?? MUSHAF_SHOWN_BOX;

/**
 * A page's artwork, with its surah-title frames. The reader's page has
 * `onFailed`; the copies drawn while a page turns (PageTurn) are plain images
 * with their own ids.
 */
function MushafArt({ page, onFailed }: { page: number; onFailed?: (page: number) => void }) {
  const { language } = useLanguage();
  const t = quranLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const main = !!onFailed;
  const id = main ? String(page) : `${page}-turn`;
  const opening = openingArtwork(page);
  const headingFrames = surahHeadingFrames(page);
  // Where the image itself lies in the shown coordinate space: laid out whole, at its own size.
  const artViewBox = shownViewBox(page);
  const artBox = (opening?.imageBox ?? mushafViewBox(page)).split(/\s+/).map(Number);
  const shownBox = artViewBox.split(/\s+/).map(Number);
  return (
    /* The page artwork, and — behind it, in the SAME viewport so the two can never drift apart by
       a pixel — a frame centred on each surah's own printed title (lib/mushafHeadings.ts). */
    <svg viewBox={artViewBox} className="dithar-mushaf-art" role={main ? "img" : undefined} aria-label={main ? t.pageOf(digits(page), digits(TOTAL_PAGES)) : undefined} aria-hidden={main ? undefined : true} data-quran-art={main ? page : undefined}>
      {headingFrames.length > 0 && (
        <g className="dithar-mushaf-headings" data-quran-headings={main ? page : undefined} aria-hidden="true">
          <MushafSurahFrameDefs id={`dithar-surah-arabesque-${id}`} />
          {headingFrames.map((f) => (
            <MushafSurahFrame key={f.surah} frame={f} pattern={`dithar-surah-arabesque-${id}`} />
          ))}
        </g>
      )}
      {/* Only the shown box is drawn — never the blank paper beyond it, on any screen shape. */}
      <clipPath id={`dithar-mushaf-shown-${id}`}>
        <rect x={shownBox[0]} y={shownBox[1]} width={shownBox[2]} height={shownBox[3]} />
      </clipPath>
      <image
        href={pageImage(page)}
        x={artBox[0]}
        y={artBox[1]}
        width={artBox[2]}
        height={artBox[3]}
        clipPath={`url(#dithar-mushaf-shown-${id})`}
        onError={onFailed ? () => onFailed(page) : undefined}
        data-quran-page-image={main ? page : undefined}
      />
    </svg>
  );
}

/**
 * The printed page number, at the page's outer bottom corner as in a bound
 * Mushaf: odd pages are right-hand pages (al-Fatihah, page 1, faces
 * al-Baqarah, page 2, on the left), so their number is at the bottom right;
 * even pages' at the bottom left.
 */
const folioSide = (page: number): "right" | "left" => (page % 2 === 1 ? "right" : "left");

function MushafFolio({ page, main = false }: { page: number; main?: boolean }) {
  return (
    <div className="dithar-mushaf-folio" data-side={folioSide(page)} data-quran-folio={main ? page : undefined} data-quran-folio-side={main ? folioSide(page) : undefined}>
      <span>{arabicDigits(page)}</span>
    </div>
  );
}

/** A copy of a page and its number — what is drawn while a page turns (PageTurn); it has no verse shapes. */
function MushafLeafCopy({ page, width, height, leafRef, children }: { page: number; width: number; height: number; leafRef?: Ref<HTMLDivElement>; children?: ReactNode }) {
  return (
    <div className="dithar-mushaf-leaf" ref={leafRef}>
      <div className="dithar-mushaf-sheet" style={{ width, height }}>
        <MushafArt page={page} />
        {children}
      </div>
      <MushafFolio page={page} />
    </div>
  );
}

/** A page turn in progress (MushafReader): the two pages, which way, and how each is laid out. */
interface PageTurn {
  from: number;
  to: number;
  dir: "next" | "prev";
  /** Where the page turned from was scrolled to (landscape): its copy is shown just as it was. */
  fromScroll: number;
  fromSize: { w: number; h: number };
  toSize: { w: number; h: number };
}
/** A whole page turn (ms); a part of one takes its part of this. */
const TURN_MS = 420;
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function MushafReader({
  target,
  onIndex,
  onOpen,
  landscape,
  onToggleLandscape,
  rotateHint = false,
}: {
  target: QuranTarget;
  onIndex: () => void;
  onOpen: (t: QuranTarget) => void;
  /** The reader's own landscape mode (its orientation button), kept by QuranReaderScreen. */
  landscape: boolean;
  onToggleLandscape: () => void;
  /** The screen couldn't be turned here (a browser that doesn't allow it): show the "turn your phone" note. */
  rotateHint?: boolean;
}) {
  const { language, dir } = useLanguage();
  const t = quranLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));

  const [page, setPage] = useState(() => pageOf(target.surah, target.ayah) ?? 1);
  const pageRef = useRef(page);
  const [position, setPosition] = useState<QuranTarget>(target);
  const positionRef = useRef<QuranTarget>(target);
  const [highlight, setHighlight] = useState<string | null>(target.ayah > 1 ? verseKey(target.surah, target.ayah) : null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(loadQuranZoom);
  const [area, setArea] = useState({ w: 0, h: 0 });
  // Each page's verse shapes, as they arrive; pages whose image failed to load.
  const [shapes, setShapes] = useState<Record<number, VerseShape[]>>({});
  const [failed, setFailed] = useState<Record<number, true>>({});
  const [panel, setPanel] = useState<null | "goto" | "settings" | "about" | "search">(null);
  // The controls are hidden while reading. A tap on the page shows them as a light overlay ABOVE the
  // page; another tap hides them. They never take room from the page and never move it.
  const [controls, setControls] = useState(false);
  const [, setBookmarkVersion] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  // A verse the reader still has to bring into view (in a page that scrolls) once its shapes are drawn.
  const pendingVerse = useRef<string | null>(verseKey(target.surah, target.ayah));
  const longPressed = useRef(false);

  const saveNow = useCallback(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    saveQuranPosition(positionRef.current.surah, positionRef.current.ayah);
  }, []);

  const moveTo = useCallback(
    (p: QuranTarget, when: "now" | "soon") => {
      positionRef.current = p;
      setPosition(p);
      if (when === "now") saveNow();
      else {
        if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(saveNow, POSITION_SAVE_DELAY_MS);
      }
    },
    [saveNow],
  );

  const showPage = useCallback((p: number) => {
    pageRef.current = p;
    setPage(p);
  }, []);

  // Opening saves the exact verse opened at (the saved position, a bookmark, or a chosen verse).
  useEffect(() => {
    saveQuranPosition(target.surah, target.ayah);
  }, [target.surah, target.ayah]);

  // Saved on leaving the reader and when the app goes to the background.
  useEffect(() => {
    const unsubscribe = subscribePageVisibility(() => {
      if (!isPageVisible()) saveNow();
    });
    return () => {
      unsubscribe();
      saveNow();
    };
  }, [saveNow]);

  // The room the pages have, measured whenever the screen size changes — a rotation included.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => setArea((a) => (a.w === body.clientWidth && a.h === body.clientHeight ? a : { w: body.clientWidth, h: body.clientHeight }));
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(body);
    return () => observer?.disconnect();
  }, []);

  // ---- One page at a time ----------------------------------------------------
  // The page is only ever SCALED, at its own proportions — its 15 lines stay the print's:
  //  - portrait: the WHOLE page (and its number) fits the screen — as wide as the screen allows,
  //    never taller than it — so it is read without scrolling;
  //  - landscape: the page takes the screen's full width and scrolls vertically, top to bottom.
  // Pages change only by a horizontal swipe (or the overlay's buttons); scrolling never turns one.
  // The controls take no room: they float over the page when shown. A larger zoom scrolls.
  const measured = area.w > 0 && area.h > 0;
  const wide = area.w > area.h;
  /** A page's size on this screen, at a zoom. */
  const fitSheet = (p: number, z: number) => {
    const aspect = pageAspect(p);
    const base = !measured ? 0 : wide ? area.w : Math.min(area.w, Math.max(0, area.h - FOLIO_PX - TOP_PAD_PX) * aspect);
    const w = Math.floor(base * z);
    return { w, h: Math.floor(w / aspect) };
  };
  const { w: sheetWidth, h: sheetHeight } = fitSheet(page, zoom);
  const zoomed = zoom > QURAN_ZOOM_FIT;
  // Wider than the screen (zoomed): a sideways drag pans instead of turning the page.
  const pansSideways = sheetWidth > area.w + 1;
  const scrollable = measured && (sheetHeight + FOLIO_PX > area.h + 1 || pansSideways);

  // The drawn page's verse shapes; the neighbouring pages' artwork is fetched ahead so a turn shows at once.
  useEffect(() => {
    let cancelled = false;
    if (!shapes[page]) {
      loadVerseShapes(page).then(
        (v) => !cancelled && setShapes((s) => (s[page] ? s : { ...s, [page]: v })),
        () => !cancelled && setShapes((s) => (s[page] ? s : { ...s, [page]: [] })),
      );
    }
    for (const p of [page + 1, page - 1]) if (p >= 1 && p <= TOTAL_PAGES && typeof Image !== "undefined") new Image().src = pageImage(p);
    return () => {
      cancelled = true;
    };
  }, [page, shapes]);

  // A page that scrolls (landscape, or zoomed) opens — and after a rotation or zoom stays — at the
  // reading position; a page that fits the screen needs nothing.
  const previousWidth = useRef(0);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !measured) return;
    if (previousWidth.current !== sheetWidth) {
      if (previousWidth.current > 0) pendingVerse.current = verseKey(positionRef.current.surah, positionRef.current.ayah);
      previousWidth.current = sheetWidth;
    }
    const key = pendingVerse.current;
    if (!key) return;
    if (!scrollable) {
      pendingVerse.current = null;
      return;
    }
    const { surah, ayah } = parseVerseKey(key);
    const [s0, a0] = pageVerses(page)[0] ?? [surah, ayah];
    // The page's first verse: its own top (its margin and any surah title stay in view).
    if (s0 === surah && a0 === ayah) {
      body.scrollTop = 0;
      pendingVerse.current = null;
      return;
    }
    if (!body.querySelector(`[data-verse="${key}"]`)) return; // its shapes are still on their way
    scrollToVerse(body, key);
    pendingVerse.current = null;
  }, [measured, sheetWidth, scrollable, shapes, page]);

  const goToPage = useCallback(
    (next: number, at?: QuranTarget) => {
      if (next < 1 || next > TOTAL_PAGES) return;
      if (next === pageRef.current && !at) return;
      const [s, a] = pageVerses(next)[0];
      const p = at ?? { surah: s, ayah: a };
      showPage(next);
      setSelected(null);
      setHighlight(at && at.ayah > 1 ? verseKey(at.surah, at.ayah) : null);
      setFailed((f) => {
        if (!f[next]) return f;
        const copy = { ...f };
        delete copy[next];
        return copy;
      });
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      moveTo(p, "now");
      pendingVerse.current = verseKey(p.surah, p.ayah);
    },
    [moveTo, showPage],
  );

  // ---- Turning a page ----------------------------------------------------------
  // Like a leaf of a printed Mushaf: the page lifts — its free edge first, rising a little — and turns
  // over its spine (the right edge: an Arabic book), uncovering the next page; turning back, the
  // previous page comes back over it the same way. The leaf follows the finger (its free edge stays
  // under it) and, let go, completes the turn or falls back. Buttons, keys and a quick swipe play the
  // same turn. Only copies of the two pages move (MushafLeafCopy, plain images composited by the GPU:
  // one transform per frame, nothing laid out), over the reader's own page — which has already
  // changed, so the position, bookmarks and verse shapes are never in between. Without animation
  // (reduced motion, a zoomed page, or a device too slow to draw it — lib/pageTurnPerformance.ts)
  // the page simply changes.
  const [turn, setTurn] = useState<PageTurn | null>(null);
  const turnRef = useRef<PageTurn | null>(null);
  const turnProgress = useRef(0);
  const turnFrame = useRef<number | null>(null);
  const turnLeaf = useRef<HTMLDivElement>(null);
  const turnCast = useRef<HTMLDivElement>(null);
  const turnOver = useRef<HTMLDivElement>(null);
  const turnUnder = useRef<HTMLDivElement>(null);

  const canAnimateTurn = () => measured && !zoomed && !pageTurnTooSlow() && typeof requestAnimationFrame === "function" && !prefersReducedMotion();
  const turnShade = useRef<HTMLDivElement>(null);
  /** Watches the turn's frames while it lasts (lib/pageTurnPerformance.ts): the lightweight fallback if they are too slow. */
  const turnProbe = useRef<{ frame: number | null; slow: number; last: number | null }>({ frame: null, slow: 0, last: null });
  const onTurnTooSlow = useRef<() => void>(() => {});

  /** Draws the turn at `p` (0: not begun, 1: done). */
  const applyTurn = useCallback((p: number) => {
    turnProgress.current = p;
    const t = turnRef.current;
    const leaf = turnLeaf.current;
    if (!t || !leaf) return;
    const sheet = leaf.firstElementChild as HTMLElement | null;
    // How far the moving leaf is lifted from flat (0) to standing on its spine (1). Its free edge lies
    // at spine − width·cos(angle): with cos = 1 − lift it moves straight with the finger.
    const lift = t.dir === "next" ? p : 1 - p;
    const angle = Math.acos(1 - lift);
    const rise = Math.sin(angle);
    leaf.style.transform = `rotateY(${(angle * 180) / Math.PI}deg) rotateX(${(3 * rise).toFixed(2)}deg) translateY(${(-1.2 * rise).toFixed(2)}%)`;
    // Opacity and transform only, each on its own layer: no frame repaints a page.
    if (turnShade.current) turnShade.current.style.opacity = (0.55 * rise).toFixed(3);
    const cast = turnCast.current;
    const beneath = cast?.parentElement;
    if (cast && sheet && beneath) {
      // Its right side under the leaf's free edge, in the page beneath's own coordinates (both panes share a box).
      const edge = sheet.offsetLeft + sheet.offsetWidth * lift - beneath.offsetLeft;
      cast.style.transform = `translateX(${edge.toFixed(1)}px)`;
      cast.style.opacity = (rise * (1 - lift * 0.6)).toFixed(3);
    }
  }, []);

  const endTurn = useCallback(() => {
    if (turnFrame.current !== null) cancelAnimationFrame(turnFrame.current);
    turnFrame.current = null;
    if (turnProbe.current.frame !== null) cancelAnimationFrame(turnProbe.current.frame);
    turnProbe.current = { frame: null, slow: 0, last: null };
    turnRef.current = null;
    turnProgress.current = 0;
    setTurn(null);
  }, []);
  useEffect(() => endTurn, [endTurn]);

  /** Plays the turn from where it is to `to` (1: complete, 0: fall back), then removes it. */
  const animateTurn = useCallback(
    (to: 0 | 1) => {
      if (turnFrame.current !== null) cancelAnimationFrame(turnFrame.current);
      const from = turnProgress.current;
      const duration = Math.max(140, TURN_MS * Math.abs(to - from));
      let start: number | null = null;
      const step = (now: number) => {
        start ??= now;
        const k = Math.min(1, (now - start) / duration);
        applyTurn(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        if (k < 1) turnFrame.current = requestAnimationFrame(step);
        else endTurn();
      };
      turnFrame.current = requestAnimationFrame(step);
    },
    [applyTurn, endTurn],
  );

  /** Lays the two copies over the page, unturned. */
  const beginTurn = (to: number): PageTurn => {
    endTurn();
    const from = pageRef.current;
    const t: PageTurn = { from, to, dir: to > from ? "next" : "prev", fromScroll: bodyRef.current?.scrollTop ?? 0, fromSize: fitSheet(from, QURAN_ZOOM_FIT), toSize: fitSheet(to, QURAN_ZOOM_FIT) };
    turnRef.current = t;
    turnProgress.current = 0;
    setTurn(t);
    const probe = (now: number) => {
      const watch = turnProbe.current;
      if (watch.last !== null && now - watch.last > SLOW_FRAME_MS) watch.slow += 1;
      watch.last = now;
      if (watch.slow >= SLOW_FRAMES) {
        markPageTurnTooSlow();
        onTurnTooSlow.current();
      } else watch.frame = requestAnimationFrame(probe);
    };
    turnProbe.current.frame = requestAnimationFrame(probe);
    return t;
  };

  // The copies, once drawn: each scrolled as its page is (the page left at its place, the new one at its
  // top), then the turn drawn where it is.
  useLayoutEffect(() => {
    if (!turn) return;
    const fromCopy = turn.dir === "next" ? turnOver.current : turnUnder.current;
    if (fromCopy) fromCopy.scrollTop = turn.fromScroll;
    const leaf = turnLeaf.current;
    if (leaf) {
      const scroll = turn.dir === "next" ? turn.fromScroll : 0;
      leaf.style.transformOrigin = `right ${scroll + (turnOver.current?.clientHeight ?? 0) / 2}px`;
    }
    applyTurn(turnProgress.current);
  }, [turn, applyTurn]);

  /** Turns to the next or previous page (the buttons, the keys, a quick swipe). */
  const turnPage = (next: number) => {
    if (next < 1 || next > TOTAL_PAGES || next === pageRef.current) return;
    const animate = canAnimateTurn();
    if (animate) beginTurn(next);
    else endTurn();
    goToPage(next);
    if (animate) animateTurn(1);
  };

  // A finger on the page: undecided until it has moved; a clearly sideways move lifts the leaf.
  const drag = useRef<{ x: number; y: number; at: number; mode: "pending" | "turn" | "pending-swipe" | "none"; to: number; p: number } | null>(null);
  const onTouchMove = useRef<(e: TouchEvent) => void>(() => {});
  const handleTouchMove = (e: TouchEvent) => {
    const d = drag.current;
    const f = e.touches[0];
    if (!d || !f || d.mode === "none" || d.mode === "pending-swipe") return;
    const dx = f.clientX - d.x;
    const dy = f.clientY - d.y;
    if (d.mode === "pending") {
      if (Math.hypot(dx, dy) < 10) return;
      const to = dx > 0 ? pageRef.current + 1 : pageRef.current - 1;
      if (pansSideways || zoomed || Math.abs(dx) <= Math.abs(dy) * 1.5 || to < 1 || to > TOTAL_PAGES || !canAnimateTurn()) {
        d.mode = "none";
        return;
      }
      d.mode = "turn";
      d.to = to;
      beginTurn(to);
    }
    // Drawing the finger to the right brings the next page (as in a printed Mushaf), to the left the previous.
    if (e.cancelable) e.preventDefault();
    const width = fitSheet(pageRef.current, QURAN_ZOOM_FIT).w || 1;
    d.p = Math.min(1, Math.max(0, ((d.to > pageRef.current ? dx : -dx) / width) * 1.05));
    applyTurn(d.p);
  };
  // Too slow here: the turn ends at once — a page already turned stays turned; a leaf still under the
  // finger is dropped, and letting go then acts as a plain swipe.
  const dropSlowTurn = () => {
    endTurn();
    if (drag.current?.mode === "turn") drag.current.mode = "pending-swipe";
  };
  // The native listeners (touchmove here, the arrow keys below) and the frame probe call the latest handlers.
  const turnPageRef = useRef(turnPage);
  useLayoutEffect(() => {
    onTouchMove.current = handleTouchMove;
    turnPageRef.current = turnPage;
    onTurnTooSlow.current = dropSlowTurn;
  });
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Not passive: once the leaf is lifted, the finger turns it instead of scrolling the page.
    const listener = (e: TouchEvent) => onTouchMove.current(e);
    stage.addEventListener("touchmove", listener, { passive: false });
    return () => stage.removeEventListener("touchmove", listener);
  }, []);

  /** The start of a surah, in place (the reader stays open, its controls as they are). */
  const goToSurah = (n: number) => {
    const start = pageOf(n, 1);
    if (start) goToPage(start, { surah: n, ayah: 1 });
  };

  // Arrow keys turn pages the way the Mushaf opens: left is the next page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel || e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft") turnPageRef.current(page + 1);
      else if (e.key === "ArrowRight") turnPageRef.current(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, panel]);

  // Scrolling within a page (landscape, or zoomed): the reading position follows the verses in view.
  // It never turns the page — only a horizontal swipe (or the overlay's buttons) does.
  const onScroll = () => {
    const body = bodyRef.current;
    if (!body || pendingVerse.current || body.scrollHeight <= body.clientHeight) return;
    const current = verseKey(positionRef.current.surah, positionRef.current.ayah);
    // Back at the very top of the page: the reading position is its first verse in view.
    const atTop = body.scrollTop <= 2;
    const found = readingVerse(body, atTop ? "" : current);
    if (found !== current) moveTo(parseVerseKey(found), "soon");
  };

  const changeZoom = (delta: 1 | -1) => {
    const next = QURAN_ZOOMS[QURAN_ZOOMS.indexOf(zoom) + delta];
    if (next === undefined) return;
    setZoom(next);
    saveQuranZoom(next);
  };
  const fitPage = () => {
    setZoom(QURAN_ZOOM_FIT);
    saveQuranZoom(QURAN_ZOOM_FIT);
  };

  // A long press (or Enter) on a verse selects it — it becomes the reading position — and shows the controls.
  const selectVerse = useCallback(
    (key: string) => {
      longPressed.current = true;
      setSelected(key);
      setControls(true);
      moveTo(parseVerseKey(key), "now");
    },
    [moveTo],
  );

  // A tap on the page shows the controls, or hides them — nothing else changes: the reading
  // position and the scroll stay exactly where they are.
  const onPageTap = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (controls) setSelected(null);
    setControls((c) => !c);
  };

  const markKey = selected ?? verseKey(position.surah, position.ayah);
  const mark = parseVerseKey(markKey);
  const marked = isQuranBookmarked(mark.surah, mark.ayah);
  const toggleMark = (p: QuranTarget) => {
    toggleQuranBookmark(p.surah, p.ayah);
    setBookmarkVersion((v) => v + 1);
  };
  const firstOnPage = pageVerses(page)[0] ?? [1, 1];
  // The page's Juz and Hizb (where it begins), and the quarter-hizb markers that begin on it — all from
  // the Tanzil metadata, checked against Quran.com (lib/quranMeta.ts, quranHizb.test.ts).
  const juz = juzOf(firstOnPage[0], firstOnPage[1]);
  const hizb = hizbOf(firstOnPage[0], firstOnPage[1]);
  const quarters = quarterStartsOnPage(page);
  const panelTitle = panel === "goto" ? t.goTo : panel === "settings" ? t.settings : panel === "search" ? t.search : t.about;
  const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-35";
  const plain = { color: "var(--color-text-primary)" };
  const ring = { boxShadow: "inset 0 0 0 1px var(--color-gold-soft)", color: "var(--color-text-primary)" };
  // Hidden controls stay in place (no layout change) but can't be reached by touch, keyboard or screen reader.
  const overlay = (shown: boolean) => ({ "data-shown": shown ? "" : undefined, "aria-hidden": shown ? undefined : true, inert: !shown });

  return (
    <div
      className="dithar-quran-immersive"
      data-quran-reader={position.surah}
      data-quran-controls={controls ? "shown" : "hidden"}
      data-quran-orientation={landscape ? "landscape" : "portrait"}
    >
      <div
        ref={stageRef}
        className="dithar-quran-stage"
        data-pan={zoomed ? "free" : "vertical"}
        onTouchStart={(e) => {
          const p = e.touches[0];
          drag.current = p && e.touches.length === 1 ? { x: p.clientX, y: p.clientY, at: Date.now(), mode: "pending", to: page, p: 0 } : null;
          if (!p || e.touches.length > 1) {
            if (turnRef.current && turnFrame.current === null) animateTurn(0);
          }
        }}
        onTouchEnd={(e) => {
          const d = drag.current;
          const p = e.changedTouches[0];
          drag.current = null;
          if (!d || !p) return;
          const dx = p.clientX - d.x;
          const dy = p.clientY - d.y;
          if (d.mode === "turn") {
            // Let go past a quarter of the way, or flicked onward: the page turns; else it falls back.
            const speed = Math.abs(dx) / Math.max(1, Date.now() - d.at);
            if (d.p > 0.25 || (d.p > 0.04 && speed > 0.35)) {
              goToPage(d.to);
              animateTurn(1);
            } else animateTurn(0);
            return;
          }
          // A zoomed page (wider than the screen) pans under the finger instead; the buttons still turn it.
          if (pansSideways || zoomed) return;
          // Only a clearly HORIZONTAL swipe turns the page — a vertical scroll (landscape) never does.
          // Like turning the pages of a printed Mushaf: drawing the finger to the right brings the next page.
          if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) turnPage(dx > 0 ? page + 1 : page - 1);
        }}
        onTouchCancel={() => {
          drag.current = null;
          if (turnRef.current && turnFrame.current === null) animateTurn(0);
        }}
        onClick={onPageTap}
        data-quran-swipe=""
      >
        <article className="dithar-mushaf-page" dir="rtl" lang="ar" data-quran-mushaf-page={page}>
          <div ref={bodyRef} onScroll={onScroll} className="dithar-mushaf-body" data-zoomed={zoomed ? "" : undefined} data-scrollable={scrollable ? "" : undefined} data-quran-area="">
            <MushafSheet
              key={page}
              page={page}
              width={sheetWidth}
              height={sheetHeight}
              verses={shapes[page] ?? []}
              failed={!!failed[page]}
              onFailed={(f) => setFailed((s) => ({ ...s, [f]: true }))}
              selected={selected}
              highlight={highlight}
              onLongPress={selectVerse}
            />
          </div>
          {turn && (
            <div className="dithar-mushaf-turn" aria-hidden="true" data-quran-turn={turn.dir}>
              {/* Beneath: the page uncovered (next) or the page being covered (previous). */}
              <div className="dithar-mushaf-turn-under">
                <div ref={turnUnder} className="dithar-mushaf-turn-pane">
                  <MushafLeafCopy page={turn.dir === "next" ? turn.to : turn.from} width={turn.dir === "next" ? turn.toSize.w : turn.fromSize.w} height={turn.dir === "next" ? turn.toSize.h : turn.fromSize.h}>
                    {/* The leaf's shadow, on this page only (the sheet clips it). */}
                    <div ref={turnCast} className="dithar-mushaf-turn-cast" />
                  </MushafLeafCopy>
                </div>
              </div>
              {/* The leaf that moves: the page turned away (next) or turned back over (previous). */}
              <div ref={turnOver} className="dithar-mushaf-turn-pane dithar-mushaf-turn-over" style={{ perspective: `${Math.round(Math.max(area.w, area.h) * 2.2)}px` }}>
                {turn.dir === "next" ? (
                  <MushafLeafCopy page={turn.from} width={turn.fromSize.w} height={turn.fromSize.h} leafRef={turnLeaf}>
                    <div ref={turnShade} className="dithar-mushaf-turn-shade" />
                  </MushafLeafCopy>
                ) : (
                  <MushafLeafCopy page={turn.to} width={turn.toSize.w} height={turn.toSize.h} leafRef={turnLeaf}>
                    <div ref={turnShade} className="dithar-mushaf-turn-shade" />
                  </MushafLeafCopy>
                )}
              </div>
            </div>
          )}
        </article>
      </div>

      {!controls && (
        <p className="dithar-quran-hint" aria-hidden="true" data-quran-tap-hint="">
          {t.tapHint}
        </p>
      )}
      {rotateHint && (
        <p className="dithar-quran-hint" role="status" style={{ top: "45%", bottom: "auto", zIndex: 30, whiteSpace: "normal", textAlign: "center" }} data-quran-rotate-hint="">
          {t.rotateHint}
        </p>
      )}

      <header className="dithar-quran-bar dithar-quran-bar-top flex flex-wrap items-center gap-1 px-2.5 pb-1" {...overlay(controls)}>
        {/* A compact Home button — the bottom navigation's own Home icon, smaller — back to the
            Qur'an section's main screen (the surah index). System Back still follows the history. */}
        <button type="button" onClick={onIndex} aria-label={t.quranHome} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={ring} data-quran-home="">
          <Home size={15} strokeWidth={1.9} />
        </button>
        {/* The surah name opens "Go to" (page, surah, verse). */}
        <button type="button" onClick={() => setPanel("goto")} className="flex min-w-0 flex-1 flex-col items-center leading-tight" aria-label={t.goTo} data-quran-open-goto="">
          <span className="flex max-w-full items-center gap-0.5 truncate text-[16px] font-bold" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)" }} data-quran-title="">
            {t.surah(surahName(position.surah, language))}
            <ChevronDown size={14} className="shrink-0 opacity-60" />
          </span>
          <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }} data-quran-ayah={position.ayah}>
            {t.ayah(digits(position.ayah))}
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleMark(mark)}
          aria-pressed={marked}
          aria-label={`${marked ? t.removeBookmark : t.addBookmark} · ${t.ayah(digits(mark.ayah))}`}
          className={iconButton}
          style={marked ? { color: "var(--color-gold)" } : plain}
          data-quran-bookmark-toggle={markKey}
        >
          {marked ? <BookmarkCheck size={18} fill="currentColor" fillOpacity={0.2} /> : <Bookmark size={18} />}
        </button>
        <button type="button" onClick={() => changeZoom(-1)} disabled={zoom <= QURAN_ZOOMS[0]} aria-label={t.smaller} className={iconButton} style={plain} data-quran-quick-zoom="out">
          <ZoomOut size={18} />
        </button>
        <button type="button" onClick={() => changeZoom(1)} disabled={zoom >= QURAN_ZOOMS[QURAN_ZOOMS.length - 1]} aria-label={t.larger} className={iconButton} style={plain} data-quran-quick-zoom="in">
          <ZoomIn size={18} />
        </button>
        <button type="button" onClick={() => setPanel("search")} aria-label={t.search} className={iconButton} style={plain} data-quran-open-search="">
          <Search size={18} />
        </button>
        {/* Turns the screen itself (the page stays upright): landscape reads the page at full width. */}
        <button type="button" onClick={onToggleLandscape} aria-pressed={landscape} aria-label={landscape ? t.portraitMode : t.landscapeMode} className={iconButton} style={landscape ? { color: "var(--color-gold)" } : plain} data-quran-quick-orientation={landscape ? "landscape" : "portrait"}>
          {landscape ? <RectangleVertical size={18} /> : <RectangleHorizontal size={18} />}
        </button>
        <button type="button" onClick={() => setPanel("settings")} aria-label={t.settings} className={iconButton} style={plain} data-quran-open-settings="">
          <Settings2 size={18} />
        </button>
        {/* The Mushaf's own divisions for this page: where it is in the Juz and Hizb, its number, and
            any quarter-hizb (۞) that begins on it. */}
        <p
          className="flex basis-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[11px] leading-snug"
          style={{ color: "var(--color-text-muted)" }}
          data-quran-current={verseKey(position.surah, position.ayah)}
          data-quran-page={page}
        >
          {juz ? <span data-quran-juz={juz}>{t.juz(digits(juz))}</span> : null}
          {hizb ? <span data-quran-hizb={hizb}>· {t.hizb(digits(hizb))}</span> : null}
          <span data-quran-page-number={page}>· {t.page(digits(page))}</span>
          {quarters.map((q) => (
            <span key={q.quarter} className="rounded-full px-1.5 font-semibold" style={{ background: "rgba(var(--color-gold-rgb), 0.16)", color: "var(--color-text-primary)" }} data-quran-quarter={q.quarter}>
              ۞ {t.quarter(q.part, digits(q.hizb))}
            </span>
          ))}
        </p>
      </header>

      <div className="dithar-quran-bar dithar-quran-bar-bottom" {...overlay(controls)}>
        {selected !== null ? (
          <div className="flex items-center justify-between gap-2 px-4 py-2" data-quran-selection={selected}>
            <span className="text-[12.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t.surah(surahName(mark.surah, language))} · {t.ayah(digits(mark.ayah))}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => toggleMark(mark)} className="flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }} data-quran-select-bookmark="">
                {marked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                {marked ? t.removeBookmark : t.addBookmark}
              </button>
              <button type="button" onClick={() => setSelected(null)} aria-label={t.close} className="p-1" style={{ color: "var(--color-text-muted)" }}>
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <nav dir="rtl" className="flex items-center justify-between gap-1.5 px-2.5 pt-1.5" aria-label={t.pages} data-quran-pager="">
            <button type="button" onClick={() => goToSurah(position.surah - 1)} disabled={position.surah <= 1} aria-label={t.prevSurah} className={iconButton} style={ring} data-quran-prev-surah="">
              <ChevronsRight size={17} />
            </button>
            <button type="button" onClick={() => turnPage(page - 1)} disabled={page <= 1} aria-label={t.prevPage} className="flex h-9 items-center gap-0.5 rounded-full pe-3.5 ps-2 text-[12px] font-semibold disabled:opacity-35" style={ring} data-quran-prev-page="">
              <ChevronRight size={17} />
              <span>{t.prevPage}</span>
            </button>
            <button type="button" onClick={() => setPanel("goto")} dir={dir} className="rounded-full px-1.5 py-1 text-[12px] font-semibold tabular-nums" style={{ color: "var(--color-text-muted)" }} aria-label={t.pageOf(digits(page), digits(TOTAL_PAGES))} data-quran-page-of={page}>
              {digits(page)} / {digits(TOTAL_PAGES)}
            </button>
            <button type="button" onClick={() => turnPage(page + 1)} disabled={page >= TOTAL_PAGES} aria-label={t.nextPage} className="flex h-9 items-center gap-0.5 rounded-full pe-2 ps-3.5 text-[12px] font-semibold disabled:opacity-35" style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }} data-quran-next-page="">
              <span>{t.nextPage}</span>
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={() => goToSurah(position.surah + 1)} disabled={position.surah >= SURAH_META.length} aria-label={t.nextSurah} className={iconButton} style={ring} data-quran-next-surah="">
              <ChevronsLeft size={17} />
            </button>
          </nav>
        )}

        <footer className="px-6 pt-1 text-center text-[10px] leading-snug" style={{ color: "var(--color-text-muted)" }} data-quran-attribution="">
          <span>{t.sourceShort} · </span>
          <button type="button" onClick={() => setPanel("about")} className="underline" style={{ color: "var(--color-primary)" }}>
            {t.about}
          </button>
        </footer>
      </div>

      {panel && (
        <div className="absolute inset-0 z-20 flex items-end" style={{ background: "rgba(0,0,0,0.35)" }} onClick={() => setPanel(null)} data-quran-panel={panel}>
          <div className="mx-auto max-h-[85%] w-full max-w-[34rem] overflow-y-auto rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3" style={{ background: "var(--color-surface)" }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={panelTitle}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                {panelTitle}
              </h2>
              <button type="button" onClick={() => setPanel(null)} aria-label={t.close} className="p-1" style={{ color: "var(--color-text-muted)" }}>
                <X size={18} />
              </button>
            </div>
            {panel === "settings" ? (
              <div className="flex flex-col gap-3">
                {/* Page size: the page is scaled only — its lines never change. */}
                <div className="flex items-center justify-between gap-3" data-quran-text-size="">
                  <span className="text-[12.5px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {t.textSize}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => changeZoom(-1)} aria-label={t.smaller} disabled={zoom <= QURAN_ZOOMS[0]} className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-35" style={ring} data-quran-zoom="out">
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center text-[13px] font-semibold tabular-nums" style={{ color: "var(--color-text-primary)" }} data-quran-zoom-value={zoom}>
                      {digits(Math.round(zoom * 100))}
                      {language === "ar" ? "٪" : "%"}
                    </span>
                    <button type="button" onClick={() => changeZoom(1)} aria-label={t.larger} disabled={zoom >= QURAN_ZOOMS[QURAN_ZOOMS.length - 1]} className="flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-35" style={ring} data-quran-zoom="in">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                <button type="button" onClick={fitPage} aria-pressed={!zoomed} className="flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold" style={!zoomed ? { background: "var(--color-primary)", color: "var(--color-primary-contrast)" } : ring} data-quran-zoom="fit">
                  <Maximize2 size={14} />
                  {t.fitPage}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanel(null);
                    onToggleLandscape();
                  }}
                  aria-pressed={landscape}
                  className="flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold"
                  style={landscape ? { background: "var(--color-primary)", color: "var(--color-primary-contrast)" } : ring}
                  data-quran-orientation-toggle={landscape ? "landscape" : "portrait"}
                >
                  {landscape ? <RectangleVertical size={15} /> : <RectangleHorizontal size={15} />}
                  {landscape ? t.portraitMode : t.landscapeMode}
                </button>
                <button type="button" onClick={onIndex} className="flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold" style={ring} data-quran-open-index="">
                  <List size={15} />
                  {t.surahs}
                </button>
                <button type="button" onClick={() => setPanel("about")} className="flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold" style={ring} data-quran-open-about="">
                  {t.about}
                </button>
              </div>
            ) : panel === "search" ? (
              <QuranSearchPanel
                onOpen={(p) => {
                  setPanel(null);
                  onOpen(p);
                }}
              />
            ) : panel === "goto" ? (
              <GoToPanel
                page={page}
                position={position}
                onOpen={(p) => {
                  setPanel(null);
                  onOpen(p);
                }}
              />
            ) : (
              <div className="flex flex-col gap-1.5 text-[11.5px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                <p>{t.source}</p>
                <p>
                  {t.pagesSource}{" "}
                  <a href="https://github.com/quran-ws/quran-svg" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline" style={{ color: "var(--color-primary)" }} dir="ltr">
                    github.com/quran-ws/quran-svg <ExternalLink size={9} />
                  </a>
                </p>
                <p>
                  {t.license}{" "}
                  <a href="https://tanzil.net" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline" style={{ color: "var(--color-primary)" }} dir="ltr">
                    tanzil.net <ExternalLink size={9} />
                  </a>
                </p>
                <pre dir="ltr" className="mt-1 whitespace-pre-wrap rounded-lg p-2 text-[10.5px]" style={{ background: "var(--color-bg)", color: "var(--color-text-primary)", fontFamily: "ui-monospace, monospace" }} data-quran-notice="">
                  {TANZIL_NOTICE}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Go straight to a page, a surah, or a verse. */
function GoToPanel({ page, position, onOpen }: { page: number; position: QuranTarget; onOpen: (t: QuranTarget) => void }) {
  const { language } = useLanguage();
  const t = quranLabels[language];
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));
  const [surah, setSurah] = useState(position.surah);
  const count = surahMeta(surah)?.ayahCount ?? 1;
  const field = "w-full rounded-xl border px-3 py-2 text-[13px]";
  const fieldStyle = { borderColor: "var(--color-gold-soft)", background: "var(--color-bg)", color: "var(--color-text-primary)" };
  const [pageInput, setPageInput] = useState(String(page));
  const typed = Number(pageInput);
  const typedValid = Number.isInteger(typed) && typed >= 1 && typed <= TOTAL_PAGES;
  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!typedValid) return;
          const [s, a] = pageVerses(typed)[0];
          onOpen({ surah: s, ayah: a });
        }}
      >
        <label className="text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }} htmlFor="quran-goto-page">
          {t.goToPage(digits(TOTAL_PAGES))}
        </label>
        <div className="flex gap-2">
          <input id="quran-goto-page" type="number" inputMode="numeric" min={1} max={TOTAL_PAGES} value={pageInput} onChange={(e) => setPageInput(e.target.value)} className={field} style={fieldStyle} data-quran-goto-page="" />
          <button type="submit" disabled={!typedValid} className="shrink-0 rounded-xl px-4 text-[13px] font-semibold disabled:opacity-40" style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }} data-quran-goto-page-submit="">
            {t.open}
          </button>
        </div>
      </form>
      <label className="flex flex-col gap-1 text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {t.goToSurah}
        <select value={surah} onChange={(e) => setSurah(Number(e.target.value))} className={field} style={fieldStyle} data-quran-goto-surah="">
          {SURAH_META.map((s) => (
            <option key={s.number} value={s.number}>
              {digits(s.number)}. {language === "en" ? `${s.nameTranslit} — ${s.nameAr}` : s.nameAr}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {t.goToAyah}
        <select value="" onChange={(e) => onOpen({ surah, ayah: Number(e.target.value) })} className={field} style={fieldStyle} data-quran-goto="">
          <option value="" disabled>
            {t.chooseAyah}
          </option>
          {Array.from({ length: count }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {digits(i + 1)} · {t.page(digits(pageOf(surah, i + 1) ?? 0))}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => onOpen({ surah, ayah: 1 })} className="rounded-xl px-4 py-2 text-[13px] font-semibold" style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }} data-quran-goto-surah-open="">
        {t.openSurah(surahMeta(surah)!.nameAr, digits(pageOf(surah, 1) ?? 1))}
      </button>
    </div>
  );
}

// The reader takes the whole screen — outside the app's phone frame, edge to
// edge within the safe area, in portrait and landscape alike — so the page
// is drawn as large as the screen allows. The surah index keeps the frame
// and the bottom navigation, like every other section.
export function QuranReaderScreen({ start, onBack, onNavigate }: { start: QuranTarget | null; onBack: () => void; onNavigate?: (key: string) => void }) {
  const [target, setTarget] = useState<QuranTarget | null>(start);
  // The orientation button's landscape mode — kept here so going to another page or surah keeps it.
  // It turns the SCREEN (lib/orientationNative.ts), never the page: the mode only changes once the
  // screen really turned; where it can't be turned, a short note suggests turning the phone (the
  // reader follows a turned phone on its own). Leaving the reader hands the orientation back.
  const [landscape, setLandscape] = useState(false);
  const [rotateHint, setRotateHint] = useState(false);
  const landscapeRef = useRef(false);
  const turned = useRef(false);
  const toggleLandscape = useCallback(() => {
    const next = !landscapeRef.current;
    void lockReaderOrientation(next ? "landscape" : "portrait")
      .catch(() => false)
      .then((ok) => {
        if (ok) {
          turned.current = true;
          landscapeRef.current = next;
          setLandscape(next);
          setRotateHint(false);
        } else if (next) {
          setRotateHint(true);
        }
      });
  }, []);
  useEffect(() => {
    if (!rotateHint) return;
    const timer = window.setTimeout(() => setRotateHint(false), 3500);
    return () => window.clearTimeout(timer);
  }, [rotateHint]);
  const reading = target !== null;
  useEffect(() => {
    if (reading || !turned.current) return;
    turned.current = false;
    landscapeRef.current = false;
    setLandscape(false);
    void lockReaderOrientation("unlocked").catch(() => {});
  }, [reading]);
  useEffect(
    () => () => {
      if (turned.current) void lockReaderOrientation("unlocked").catch(() => {});
    },
    [],
  );
  if (target)
    return (
      <MushafReader
        key={`${target.surah}:${target.ayah}`}
        target={target}
        onIndex={() => setTarget(null)}
        onOpen={setTarget}
        landscape={landscape}
        onToggleLandscape={toggleLandscape}
        rotateHint={rotateHint}
      />
    );
  return (
    <DeviceFrame>
      <SurahIndex onOpen={setTarget} onBack={onBack} onNavigate={onNavigate} />
    </DeviceFrame>
  );
}
