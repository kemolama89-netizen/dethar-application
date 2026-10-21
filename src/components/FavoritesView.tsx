import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Maximize2, Share2 } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { favoritesLabels, reminderLabels } from "../data/reminderLabels";
import { MISC_DUAS, miscLibraryLabels } from "../data/misc-library";
import { favoriteOpenRequest, loadFavorites, removeFavorite, subscribeFavorites } from "../lib/favorites";
import { requestOpenReminder } from "../lib/reminderOpenRequests";
import type { FavoriteEntry } from "../lib/favorites";
import { loadMiscFavorites, saveMiscFavorites } from "../lib/miscFavorites";
import { findReminderCandidate } from "../lib/reminderContent";
import { reminderShareSections } from "../lib/reminderShare";
import type { ShareableContent, ShareSection } from "../lib/shareContent";
import { ShareMenu } from "./ShareMenu";

// Settings → «المفضلة» / Favorites: everything the user saved — from the
// home-screen widget's heart, the full-screen reflection, and the written
// library's own per-dua hearts — in one place, newest first.
//
// Each card shows the ORIGINAL Arabic text as saved (never altered), what it
// is (a dua from the Qur'an, a hadith, a dhikr virtue, poetry…), its source
// and grading — or the poet / «يُنسب إلى…» for poetry — and the DITHAR comment
// that was shown with it, under its own label. Same language rule as the
// library: in Arabic only Arabic metadata is shown; in English the Arabic
// text stays primary, with the English meaning and source beside it.

interface Row {
  key: string;
  kindTitle: string;
  textAr: string;
  meaningEn?: string;
  sourceAr?: string;
  sourceEn?: string;
  gradeAr?: string;
  gradeEn?: string;
  isPoetry: boolean;
  attributionUncertain: boolean;
  comment?: { ar: string; en: string };
  /** The library dua's own note (performing it correctly), shared with it. */
  note?: { ar?: string; en?: string };
  fromWidget: boolean;
  savedAt: number;
  remove: () => void;
  /** Saved reminder content: opens it in the full reminder view, as the widget does (absent for library duas). */
  open?: () => void;
}

const LIBRARY_PREFIX = "library:";

export function FavoritesView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = favoritesLabels[language];
  const r = reminderLabels[language];
  const isEn = language === "en";
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [entries, setEntries] = useState<FavoriteEntry[]>(() => loadFavorites());
  const [libraryIds, setLibraryIds] = useState<Set<string>>(() => loadMiscFavorites());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // The saved item being shared (ShareMenu: as text, as an image, or copy) — its complete text and reference,
  // with the evidence/tafsir and DITHAR comment it was shown with (lib/reminderShare.ts).
  const [sharing, setSharing] = useState<ShareableContent | null>(null);

  useEffect(() => subscribeFavorites(() => setEntries(loadFavorites())), []);

  const rows = useMemo<Row[]>(() => {
    const saved: Row[] = entries.map((e) => ({
      key: e.key,
      kindTitle: r.kindTitle[e.kind] ?? r.categoryTitle[e.category],
      textAr: e.textAr,
      meaningEn: e.meaningEn,
      sourceAr: e.sourceAr,
      sourceEn: e.sourceEn,
      gradeAr: e.gradeAr,
      gradeEn: e.gradeEn,
      isPoetry: e.category === "poetry",
      attributionUncertain: e.category === "poetry" && e.attribution !== undefined && e.attribution !== "established",
      comment: e.comment,
      fromWidget: e.origin === "widget",
      savedAt: e.savedAt,
      remove: () => removeFavorite(e.key),
      open: () => requestOpenReminder(favoriteOpenRequest(e, language, r.kindTitle[e.kind] ?? r.categoryTitle[e.category])),
    }));
    // The library's own hearts (lib/miscFavorites.ts) keep their own store; shown here after the others.
    const library: Row[] = MISC_DUAS.filter((d) => libraryIds.has(d.id)).map((d) => ({
      key: `${LIBRARY_PREFIX}${d.id}`,
      kindTitle: d.isQuranic ? r.kindTitle["quran-dua"] : t.libraryDua,
      textAr: d.text_ar,
      meaningEn: d.englishMeaning || undefined,
      sourceAr: d.source_ar,
      sourceEn: d.source_en,
      isPoetry: false,
      attributionUncertain: false,
      note: d.note_ar || d.note_en ? { ar: d.note_ar, en: d.note_en } : undefined,
      fromWidget: false,
      savedAt: 0,
      remove: () => {
        const next = new Set(libraryIds);
        next.delete(d.id);
        saveMiscFavorites(next);
        setLibraryIds(next);
      },
    }));
    return [...saved, ...library];
  }, [entries, libraryIds, r, t, language]);

  function shareSectionsFor(row: Row): ShareSection[] {
    const note = row.note ? (isEn ? row.note.en : row.note.ar) : undefined;
    if (row.key.startsWith(LIBRARY_PREFIX)) return note ? [{ label: miscLibraryLabels[language].noteLabel, text: note }] : [];
    return reminderShareSections(findReminderCandidate(row.key), row.comment, language);
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col" data-favorites-view="">
      <div className="dithar-sticky-header mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.pageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 px-4 text-center" data-favorites-empty="">
          <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
            <Heart size={24} strokeWidth={1.8} />
          </span>
          <p className="text-[15px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {t.empty}
          </p>
          <p className="max-w-[22rem] text-[12.5px] leading-[1.8]" style={{ color: "var(--color-text-muted)" }}>
            {t.emptyHint}
          </p>
        </div>
      ) : (
        <>
          <p className="mt-3 text-center text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
            {t.count(rows.length)}
          </p>
          <ul className="mt-2 flex flex-col gap-2.5 pb-2">
            {rows.map((row) => {
              const open = expanded.has(row.key);
              const source = isEn ? (row.sourceEn ?? row.sourceAr) : row.sourceAr;
              const grade = isEn ? (row.gradeEn ?? row.gradeAr) : row.gradeAr;
              const comment = row.comment ? (isEn ? row.comment.en : row.comment.ar) : undefined;
              return (
                <li
                  key={row.key}
                  data-favorite-item={row.key}
                  className="rounded-2xl border px-4 py-3"
                  style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
                      {row.kindTitle}
                    </span>
                    {row.fromWidget && (
                      <span className="text-[10.5px]" style={{ color: "var(--color-text-muted)" }}>
                        {t.savedFromWidget}
                      </span>
                    )}
                    <span className="flex-1" />
                    {row.open && (
                      <button
                        type="button"
                        onClick={row.open}
                        aria-label={t.openAria}
                        data-favorite-open={row.key}
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ color: "var(--color-primary)", boxShadow: "inset 0 0 0 1px var(--color-gold-soft)" }}
                      >
                        <Maximize2 size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setSharing({
                          kindLabel: row.kindTitle,
                          textAr: row.textAr,
                          meaningEn: row.meaningEn,
                          reference: [source, grade && !row.isPoetry && !(source ?? "").includes(grade) ? grade : undefined].filter(Boolean).join(" — ") || undefined,
                          isPoetry: row.isPoetry,
                          sections: shareSectionsFor(row),
                        })
                      }
                      aria-label={r.share}
                      data-favorite-share={row.key}
                      className="flex h-9 w-9 items-center justify-center rounded-full"
                      style={{ color: "var(--color-primary)", boxShadow: "inset 0 0 0 1px var(--color-gold-soft)" }}
                    >
                      <Share2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={row.remove}
                      aria-label={t.removeAria}
                      data-favorite-remove={row.key}
                      className="flex h-9 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold"
                      style={{ color: "var(--color-primary)", boxShadow: "inset 0 0 0 1px var(--color-gold-soft)" }}
                    >
                      <Heart size={15} fill="currentColor" />
                      {t.remove}
                    </button>
                  </div>

                  <p
                    dir="rtl"
                    onClick={row.open}
                    className={`mt-2 text-[16px] leading-[2] ${row.isPoetry ? "whitespace-pre-line" : ""} ${open ? "" : "line-clamp-4"} ${row.open ? "cursor-pointer" : ""}`}
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
                  >
                    {row.textAr}
                  </p>

                  {open && (
                    <div className="mt-2 flex flex-col gap-1.5" data-favorite-details="">
                      {isEn && row.meaningEn && (
                        <p className="text-[13px] italic leading-[1.6]" style={{ color: "var(--color-text-primary)" }}>
                          {row.meaningEn}
                        </p>
                      )}
                      {source && (
                        <p className="text-[11.5px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
                          {row.isPoetry ? r.poetLabel : r.sourceLabel}: {source}
                        </p>
                      )}
                      {grade && !row.isPoetry && !(source ?? "").includes(grade) && (
                        <p className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                          {r.gradeLabel}: {grade}
                        </p>
                      )}
                      {row.isPoetry && (
                        <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          {r.poetryNote}
                          {row.attributionUncertain ? ` · ${r.attributionUncertain}` : ""}
                        </p>
                      )}
                      {comment && (
                        <div className="mt-1 rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
                          <p className="text-[10.5px] font-semibold" style={{ color: "var(--color-gold)" }}>
                            {r.commentLabel}
                          </p>
                          <p className="text-[12.5px] leading-[1.8]" style={{ color: "var(--color-text-primary)" }}>
                            {comment}
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                            {r.reflectionNote}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleExpanded(row.key)}
                    aria-expanded={open}
                    className="mt-1 text-[12px] font-semibold underline underline-offset-2"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {open ? t.readLess : t.readMore}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {sharing && <ShareMenu content={sharing} open onClose={() => setSharing(null)} />}
    </div>
  );
}
