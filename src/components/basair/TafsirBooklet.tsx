import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Loader2, Share2, X } from "lucide-react";
import { useLanguage } from "../../theme/LanguageContext";
import { basairLabels } from "../../data/basairLabels";
import { useBackDismiss } from "../../lib/backOverlays";
import { arabicDigits, surahMeta } from "../../lib/quranMeta";
import { getSaadiVerse } from "../../lib/saadiTafsir";
import type { SaadiParagraph, SaadiVerse } from "../../lib/saadiTafsir";
import { BOOKLET_EDGE, VERSE_EXCERPT_SHARE, pageOfText, sharedPageHeight, verseNeedsExcerpt, wordsThatFit } from "../../lib/tafsirBooklet";
import { paintBookletPage } from "../../lib/bookletImage";
import { shareImageSet } from "../../lib/shareContent";
import type { ShareableContent, ShareOutcome } from "../../lib/shareContent";
import { paragraphsUnderVerse, saadiTextForSharing, tafsirShareContent } from "../../lib/tafsirShare";
import { ShareMenu } from "../ShareMenu";
import { NoteText, VerseWords, useSurahText } from "./TafsirReadingView";
import "../quran/kfgqpc-font.css";
import "./basair.css";

/** Space between two pages' columns in the flow (px). */
const PAGE_GAP = 40;
/** A sideways swipe at least this long turns a page. */
const SWIPE_PX = 40;

/** al-Sa'di's words as the booklet shows them: the same runs as Basa'ir, with note numbers as plain marks. */
type Run = SaadiParagraph["runs"][number];


function renderRun(run: Run, key: string | number) {
  if (run.kind === "stray") return null;
  // The editor's note number, bracketed so it reads as a number (a lone «١» is a mere stroke).
  if (run.kind === "note") return <sup key={key} className="dithar-booklet-noteref">({arabicDigits(run.index + 1)})</sup>;
  if (run.kind === "marker") return <span key={key} className="dithar-saadi-marker">{run.text}</span>;
  return run.kind === "quote" ? (
    <span key={key} className="dithar-tafsir-quran">
      {run.text}
    </span>
  ) : (
    <span key={key}>{run.text}</span>
  );
}

/** al-Sa'di's words as the booklet shows them: the same runs as Basa'ir, with note numbers as plain marks. */
function BookletRuns({ runs }: { runs: SaadiParagraph["runs"] }) {
  return <>{runs.map((run, i) => renderRun(run, i))}</>;
}

/** The first and last page the verse block is on (a verse taller than a page is split between its lines). */
function pagesOfVerse(verse: HTMLElement | null, flowRight: number, step: number): [number, number] {
  const rects = verse ? [...verse.getClientRects()].filter((r) => r.height > 0) : [];
  if (!rects.length || step <= 0) return [0, 0];
  const pages = rects.map((r) => pageOfText(r.right, flowRight, step, true));
  return [Math.min(...pages), Math.max(...pages)];
}

/**
 * The booklet's pages as laid out now: how many, and which the verse is on. Everything is measured
 * against the flow's own box — the first page — which carries the same transform as its text, so
 * the page on screen (and a page turn still sliding) never changes the count.
 */
function measureLayout(flow: HTMLElement | null, end: HTMLElement | null, verse: HTMLElement | null, step: number) {
  if (!flow || !end || step <= PAGE_GAP) return null;
  const first = flow.getBoundingClientRect().right;
  const last = pageOfText(end.getBoundingClientRect().right, first, step, true);
  return { pages: last + 1, versePages: pagesOfVerse(verse, first, step) };
}

/** The system bars' room (safe-area insets), read once from CSS. */
function safeInsets(): { top: number; bottom: number } {
  if (typeof document === "undefined") return { top: 0, bottom: 0 };
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = { top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 };
  probe.remove();
  return insets;
}

/**
 * The Tafsir of the selected verse as a small booklet over the Mushaf: the verse (in the
 * Complex's text and font), then al-Sa'di's whole comment, his editor's notes and the source,
 * flowing across as many pages as they need — at the reading size, never shrunk, never cut,
 * breaking lines only between words. It opens beside the verse, which stays in view; the
 * Mushaf page under it never moves. Pages turn by a sideways swipe (as the Mushaf's) or the
 * buttons; Share sends every page as its own image, in order, together.
 */
export function TafsirBooklet({
  surah,
  ayah,
  verseTop,
  verseBottom,
  page: mushafPage = null,
  onClose,
}: {
  surah: number;
  ayah: number;
  verseTop: number;
  verseBottom: number;
  /** The Mushaf page on screen: the booklet's pages are its size. */
  page?: { left: number; top: number; width: number; height: number } | null;
  onClose: () => void;
}) {
  const { language, dir } = useLanguage();
  const t = basairLabels[language];
  const rtl = dir === "rtl";
  const digits = useCallback((n: number) => (language === "ar" ? arabicDigits(n) : String(n)), [language]);
  useBackDismiss(true, onClose);

  // The screen the booklet stays within, and its page: the Mushaf page's own size and place on screen
  // (within the screen), or — without one — most of the screen.
  const [frame] = useState(() => {
    const insets = safeInsets();
    const vw = typeof window === "undefined" ? 390 : window.innerWidth;
    const vh = typeof window === "undefined" ? 800 : window.innerHeight;
    const minX = BOOKLET_EDGE;
    const maxX = vw - BOOKLET_EDGE;
    const minY = insets.top + BOOKLET_EDGE;
    const maxY = vh - insets.bottom - BOOKLET_EDGE;
    const width = Math.min(mushafPage?.width ?? Math.min(vw - 2 * BOOKLET_EDGE, 480), maxX - minX);
    const height = Math.min(mushafPage?.height ?? (maxY - minY) * 0.8, maxY - minY);
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
    const left = clamp(mushafPage?.left ?? (vw - width) / 2, minX, maxX - width);
    const top = clamp(mushafPage?.top ?? minY, minY, maxY - height);
    return { minX, maxX, minY, maxY, width, height, left, top, vh, insets };
  });
  const text = useSurahText(surah);
  const verse = text?.verses.find((v) => v.ayah === ayah);
  const meta = surahMeta(surah);
  const reference = `${language === "en" ? `Surah ${meta?.nameTranslit ?? ""}` : `سورة ${meta?.nameAr ?? ""}`} · ${language === "en" ? "Verse" : "الآية"} ${digits(ayah)}`;

  const [result, setResult] = useState<{ key: string; value: SaadiVerse } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${surah}:${ayah}`;
  useEffect(() => {
    let live = true;
    void getSaadiVerse(surah, ayah).then((value) => live && setResult({ key, value }));
    return () => {
      live = false;
    };
  }, [surah, ayah, key, attempt]);
  const saadi = result?.key === key ? result.value : null;

  // ---- pages: the columns of one flowing text ------------------------------------------
  const sheet = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const flow = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLSpanElement>(null);
  const verseRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  /** Words of the verse shown when it is an excerpt; null = the whole verse. */
  const [excerpt, setExcerpt] = useState<number | null>(null);
  /** True while the shared pages are being laid out (with the whole verse) and drawn. */
  const [exporting, setExporting] = useState(false);
  /** A short Tafsir's own height (the booklet shrinks to it); null = not measured yet, 0 = it fills the room. */
  const [fit, setFit] = useState<{ key: string; height: number } | null>(null);
  /** How far the booklet has been dragged (px), in any direction, kept within the screen. */
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; from: { x: number; y: number }; box: DOMRect } | null>(null);
  /** The pages the verse is on (first, last) — a verse taller than a page continues, and says so. */
  const [versePages, setVersePages] = useState<[number, number]>([0, 0]);
  const step = size.w + PAGE_GAP;
  // The booklet's text is Arabic, so its pages always run right to left, whatever the interface language:
  // page n is n steps to the left of the first, brought into view by shifting the text right.
  const shift = page * step;

  useLayoutEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const measure = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  useEffect(() => {
    let live = true;
    void (document.fonts?.ready ?? Promise.resolve()).then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  const ready = !!saadi && !!text && size.w > 0;
  // A verse that alone would fill more than a page and a half opens with an excerpt (whole words, marked).
  useLayoutEffect(() => {
    const el = verseRef.current;
    if (!ready || !fontsReady || !el || !verse || excerpt !== null) return;
    // Split across pages, the verse is several boxes: its height is theirs together.
    const height = [...el.getClientRects()].reduce((sum, r) => sum + r.height, 0) || el.offsetHeight;
    if (!verseNeedsExcerpt(height, size.h)) return;
    const words = verse.words.split(" ");
    const probe = el.cloneNode(false) as HTMLElement;
    probe.style.cssText = `position:absolute;visibility:hidden;width:${size.w}px`;
    flow.current?.parentElement?.appendChild(probe);
    const count = wordsThatFit(words, (n) => {
      probe.textContent = `${words.slice(0, n).join(" ")} …`;
      return probe.offsetHeight <= size.h * VERSE_EXCERPT_SHARE;
    });
    probe.remove();
    setExcerpt(count);
  }, [ready, fontsReady, verse, size, excerpt]);

  // How many pages: the page the end of the text falls on. Counted from the content and the page's
  // size only — never from the page on screen — so turning pages never changes the count.
  useLayoutEffect(() => {
    const end = endRef.current;
    const win = windowRef.current;
    const layout = measureLayout(flow.current, end, verseRef.current, step);
    if (!ready || !end || !win || !layout) return;
    const last = layout.pages - 1;
    setPages(layout.pages);
    setVersePages((v) => (v[0] === layout.versePages[0] && v[1] === layout.versePages[1] ? v : layout.versePages));
    // Pages break only where a page is full: no lines are carried to fill the last page (that would
    // end the page before it early, and could add a page).
    setPage((p) => Math.min(p, last));
    // Content-aware height: a Tafsir that fits one page takes only its own height (measured once per
    // content, at the full room); a longer one keeps all the room beside the verse.
    const contentKey = `${key}:${excerpt ?? ""}:${size.w}:${fontsReady ? "f" : ""}`;
    if (!exporting && fit?.key !== contentKey && sheet.current) {
      if (last > 0) setFit({ key: contentKey, height: 0 });
      else {
        // With room for the block that never splits (the source) to keep its place at the smaller size.
        const used = end.getBoundingClientRect().bottom - win.getBoundingClientRect().top + 40;
        const chrome = sheet.current.offsetHeight - win.clientHeight;
        const height = Math.ceil(used + chrome);
        setFit({ key: contentKey, height: height < sheet.current.offsetHeight - 16 ? height : 0 });
      }
    }
  }, [ready, fontsReady, excerpt, exporting, size, step, saadi, fit, key]);

  // Once the browser has laid the columns out at the current size (a frame after any change), count
  // the pages again from where the text really ends; and if a compact booklet turned out too short
  // for its Tafsir (the text ran onto a second page), give it back all the room beside the verse.
  useEffect(() => {
    if (!ready || exporting) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const layout = measureLayout(flow.current, endRef.current, verseRef.current, step);
        if (!layout) return;
        setPages((n) => (n === layout.pages ? n : layout.pages));
        setPage((p) => Math.min(p, layout.pages - 1));
        if (layout.pages > 1) setFit((f) => (f && f.height > 0 ? { key: f.key, height: 0 } : f));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, exporting, size, step, fit, excerpt, fontsReady, saadi]);

  const go = (to: number) => setPage(Math.max(0, Math.min(pages - 1, to)));
  const swipe = useRef<{ x: number; y: number } | null>(null);

  // ---- sharing (the share menu: the pages as images, or the complete text) --------------
  // An excerpt is for the screen only: the shared pages are laid out with the whole verse (exporting).
  const [menu, setMenu] = useState<ShareableContent | null>(null);
  const [sharing, setSharing] = useState<"idle" | "preparing" | "failed">("idle");
  const showExcerpt = excerpt !== null && !exporting;
  // The booklet's own width (it is centred, at most 34rem): the shared page's height follows from it.
  // The shared page's height, from the booklet's own width, fixed when a share starts.
  const [exportHeight, setExportHeight] = useState(0);

  /** Every page as its own image, in order, with a caption naming the verse, the book and the page count. */
  const exportImages = async (): Promise<ShareOutcome> => {
    // The shared pages are laid out on a taller, phone-shaped page (sharedPageHeight) — the same
    // width and type size as on screen, more lines per page, so fewer images — and with the whole verse.
    // From the first page, without the turn's slide, so every page's place is known; back to the reader's page after.
    const readingPage = page;
    const width = sheet.current?.offsetWidth ?? 360;
    flushSync(() => {
      setExportHeight(sharedPageHeight(width));
      setExporting(true);
      setPage(0);
    });
    const measured = windowRef.current;
    if (measured) flushSync(() => setSize({ w: measured.clientWidth, h: measured.clientHeight }));
    // A few frames: the taller layout, then (if the source would stand alone) its last lines carried over.
    for (let f = 0; f < 4; f++) await new Promise<void>((r) => requestAnimationFrame(() => r()));
    try {
      await document.fonts?.ready;
      const win = windowRef.current;
      const pageLayout = measureLayout(flow.current, endRef.current, verseRef.current, step);
      if (!sheet.current || !win || !flow.current || !pageLayout) return "failed";
      const count = pageLayout.pages;
      const [verseFirst, verseLast] = pageLayout.versePages;
      const layout = { sheet: sheet.current, viewport: win, flow: flow.current, shift: 0, step, rtl: true };
      const images: string[] = [];
      for (let p = 0; p < count; p++) {
        const folio = `${t.bookletPageOf(digits(p + 1), digits(count))} · ${t.bookletBrand}`;
        images.push(
          paintBookletPage(layout, p, {
            title: t.bookletTitle,
            reference: p > verseFirst && p <= verseLast ? `${reference} · ${t.bookletVerseContinued}` : reference,
            footer: p >= verseFirst && p < verseLast ? `${t.bookletContinues} · ${folio}` : folio,
          }),
        );
        // Let the screen breathe between pages on a long booklet.
        await new Promise((r) => setTimeout(r, 0));
      }
      return await shareImageSet(images, `${t.bookletTitle} · ${reference}`, `dithar-tafsir-${surah}-${ayah}`, t.bookletCaption(reference, t.bookletPages(count, digits(count))));
    } catch {
      return "failed";
    } finally {
      flushSync(() => setExporting(false));
      setPage(readingPage);
    }
  };

  /** The share menu, with the complete text ready: the verse as the Mushaf shares it, al-Sa'di's whole Tafsir, its source. */
  const openShare = async () => {
    const found = saadi?.status === "found" ? saadi.parsed : null;
    if (!found || sharing === "preparing") return;
    setSharing("preparing");
    try {
      const m = await import("../../lib/quranShareText");
      const verseText = m.markedVerseForSharing(surah, ayah);
      if (!verseText) throw new Error("no verse text");
      setMenu({
        ...tafsirShareContent({ surah, ayah, text: verseText }, saadiTextForSharing(found), { kind: t.shareKind, reference, tafsirLabel: t.tafsirLabel, source: `${t.saadiBook} — ${t.saadiAuthor}` }),
        // «سورة … · الآية …» names the verse; «المصدر:» is the Tafsir's own source only.
        referenceIsVerse: true,
      });
      setSharing("idle");
    } catch {
      setSharing("failed");
    }
  };

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;
  const flowStyle: CSSProperties = { width: size.w, height: size.h, columnWidth: size.w, columnGap: PAGE_GAP, transform: `translateX(${shift}px)` };
  const parsed = saadi?.status === "found" ? saadi.parsed : null;
  // The verse is shown once: al-Sa'di's opening quotation of this very verse is left out under it (as on
  // the share card) — but kept when the booklet shows only an excerpt, so the whole verse is still here.
  const paragraphs = parsed ? (showExcerpt ? parsed.paragraphs : paragraphsUnderVerse(parsed, ayah)) : [];
  // The booklet's box. Pages are the Mushaf page's size. A Tafsir that fits one page is one page, as
  // tall as it needs: beside the verse when there is room for it there (so the verse stays in view),
  // else over the page. A longer one covers the Mushaf page, page for page — and is drawn aside to read it.
  const compact = fit && fit.height > 0 ? fit.height : null;
  const shown = compact ?? frame.height;
  const boxTop = (() => {
    if (compact === null) return frame.top;
    const below = frame.maxY - Math.ceil(verseBottom);
    const above = Math.floor(verseTop) - frame.minY;
    if (below >= compact && below >= above) return Math.ceil(verseBottom);
    if (above >= compact) return Math.floor(verseTop) - compact;
    return Math.min(Math.max(frame.top, frame.minY), frame.maxY - compact);
  })();
  const startDrag = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button") || !sheet.current) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: offset, box: sheet.current.getBoundingClientRect() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    // Within the screen on every side: the box where the drag began, moved, clamped.
    const dx = Math.min(frame.maxX - d.box.right, Math.max(frame.minX - d.box.left, e.clientX - d.x));
    const dy = Math.min(frame.maxY - d.box.bottom, Math.max(frame.minY - d.box.top, e.clientY - d.y));
    setOffset({ x: d.from.x + dx, y: d.from.y + dy });
  };
  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const otherComments = parsed ? parsed.commentVerses.filter((v) => v !== ayah) : [];

  return (
    <div className="dithar-booklet-layer" data-tafsir-booklet={key} data-booklet-side={compact !== null && boxTop >= verseBottom ? "below" : compact !== null && boxTop + shown <= verseTop ? "above" : "over"} data-booklet-exporting={exporting ? "" : undefined}>
      <div className="dithar-booklet-scrim" onClick={onClose} aria-hidden="true" />
      <section
        ref={sheet}
        className="dithar-booklet"
        dir={dir}
        role="dialog"
        aria-modal="true"
        aria-label={t.bookletLabel(reference)}
        style={
          exporting
            ? { top: BOOKLET_EDGE, left: frame.left, width: frame.width, height: exportHeight }
            : { top: boxTop, left: frame.left, width: frame.width, height: shown, transform: offset.x || offset.y ? `translate(${offset.x}px, ${offset.y}px)` : undefined }
        }
        data-booklet-height={fit && fit.height > 0 ? "content" : "room"}
      >
        <div className="dithar-booklet-frame" aria-hidden="true" />
        {/* The top: its controls, then its running head — and the handle the booklet is dragged sideways by. */}
        <header className="dithar-booklet-head" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} data-booklet-handle="">
          <div className="dithar-booklet-bar">
            <button type="button" onClick={onClose} aria-label={t.bookletClose} data-booklet-close="">
              <X size={20} aria-hidden="true" />
            </button>
            <span className="dithar-booklet-pager">
              <button type="button" onClick={() => go(page - 1)} disabled={page === 0} aria-label={t.bookletPrev} data-booklet-prev="">
                <PrevIcon size={20} aria-hidden="true" />
              </button>
              <span className="dithar-booklet-folio" aria-live="polite" data-booklet-folio="">
                {t.bookletPageOf(digits(page + 1), digits(pages))}
              </span>
              <button type="button" onClick={() => go(page + 1)} disabled={page >= pages - 1} aria-label={t.bookletNext} data-booklet-next="">
                <NextIcon size={20} aria-hidden="true" />
              </button>
            </span>
            <button type="button" onClick={() => void openShare()} disabled={saadi?.status !== "found" || sharing === "preparing"} aria-label={t.bookletShare} data-booklet-share={sharing}>
              {sharing === "preparing" ? <Loader2 size={19} className="animate-spin" aria-hidden="true" /> : <Share2 size={19} aria-hidden="true" />}
            </button>
          </div>
          <div className="dithar-booklet-running">
            <b>{t.bookletTitle}</b>
            <span data-booklet-reference="">{page > versePages[0] && page <= versePages[1] ? `${reference} · ${t.bookletVerseContinued}` : reference}</span>
          </div>
        </header>
        <div
          ref={windowRef}
          className="dithar-booklet-window"
          onTouchStart={(e) => {
            const p = e.touches[0];
            swipe.current = p && e.touches.length === 1 ? { x: p.clientX, y: p.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const s = swipe.current;
            const p = e.changedTouches[0];
            swipe.current = null;
            if (!s || !p) return;
            const dx = p.clientX - s.x;
            // As the Mushaf's pages: drawing the finger to the right brings the next page.
            if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(p.clientY - s.y) * 1.5) go(dx > 0 ? page + 1 : page - 1);
          }}
          data-booklet-window=""
        >
          {!saadi || !text ? (
            <p className="dithar-booklet-status">{t.loading}</p>
          ) : saadi.status !== "found" ? (
            <div className="dithar-booklet-status" role="status">
              <p>{saadi.status === "invalid" ? t.noInvalid : t.loadFailed}</p>
              {saadi.status === "load-failed" && (
                <button type="button" className="dithar-tafsir-retry" onClick={() => setAttempt((n) => n + 1)}>
                  {t.retry}
                </button>
              )}
            </div>
          ) : (
            <div ref={flow} className="dithar-booklet-flow" style={flowStyle} dir="rtl" lang="ar" data-booklet-page={page} data-booklet-pages={pages}>
              {verse && (
                <div ref={verseRef} className={`dithar-booklet-verse${text.kfgqpc ? " dithar-kfgqpc" : ""}`} data-booklet-rule="top bottom" data-booklet-verse={showExcerpt ? "excerpt" : "whole"}>
                  {showExcerpt ? `${verse.words.split(" ").slice(0, excerpt!).join(" ")} …` : <VerseWords verse={verse} />}
                </div>
              )}
              {showExcerpt && (
                <p className="dithar-booklet-excerpt" data-booklet-excerpt="">
                  {t.bookletExcerpt}
                </p>
              )}
              {saadi.together.length > 0 && <p className="dithar-booklet-notice">{t.headingTogether(digits(saadi.together[0]), digits(saadi.together[saadi.together.length - 1]))}</p>}
              {otherComments.length > 0 && <p className="dithar-booklet-notice">{t.commentAlso(otherComments.map(digits).join(language === "ar" ? "، " : ", "))}</p>}
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  // The last paragraph carries at least three lines onto the last page, with the notes and the source.
                  className={`dithar-booklet-text${p.heading ? " dithar-tafsir-heading" : ""}${i === paragraphs.length - 1 ? " dithar-booklet-last" : ""}`}
                  data-booklet-paragraph=""
                >
                  <BookletRuns runs={p.runs} />
                </p>
              ))}
              {parsed!.notes.length > 0 && (
                <div className="dithar-booklet-notes" data-booklet-rule="top">
                  <p className="dithar-booklet-notes-title">{t.editorNotes}</p>
                  {parsed!.notes.map((note, i) => (
                    <p key={i}>
                      <span className="dithar-saadi-notenum">{arabicDigits(i + 1)}</span> <NoteText note={note} />
                    </p>
                  ))}
                </div>
              )}
              {/* The source, ending with the closing ornament (inside it, so the ornament never ends a page alone). */}
              <div className="dithar-booklet-close">
                <div className="dithar-booklet-source" data-booklet-rule="top" data-booklet-source="">
                  <p>
                    <b>{t.sourceTitle}:</b> {t.saadiBook}. {t.saadiAuthor}. {t.saadiEdition}. {t.saadiPublisher}.
                  </p>
                  <p>{t.saadiLicense}</p>
                  <p className="dithar-booklet-ornament" aria-hidden="true">
                    ✦ ✦ ✦<span ref={endRef} />
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {exporting && (
          <p className="dithar-booklet-exporting" role="status">
            {t.bookletSharing}
          </p>
        )}
        {sharing === "failed" && (
          <p className="dithar-booklet-error" role="alert">
            {t.bookletShareFailed}
          </p>
        )}
      </section>
      {menu && (
        <ShareMenu
          content={menu}
          open
          onClose={() => setMenu(null)}
          subtitle={reference}
          imageSet={{ label: t.bookletShareImages, preparing: t.bookletSharing, run: exportImages }}
        />
      )}
    </div>
  );
}
