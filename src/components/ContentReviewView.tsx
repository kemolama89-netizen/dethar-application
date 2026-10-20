import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { contentReviewLabels, contentTypeLabels, reviewStatusLabels, usageLabels, warningLabels } from "../data/contentReviewLabels";
import { CONTENT_TYPES, REVIEW_CATEGORIES, commentsFor, contentCatalog, duplicateGroups, exportCsv, exportJson, filterCatalog, statusOf } from "../lib/contentCatalog";
import type { CatalogFilter, CatalogItem, ReviewCategory } from "../lib/contentCatalog";
import { REVIEW_STATUSES, getReviewRecord, isPublished, loadReviewerName, saveReviewerName, setReview, setReviewMany, subscribeContentReview } from "../lib/contentReview";
import type { ReviewStatus } from "../lib/contentReview";
import { exportTextFile } from "../lib/contentExport";

// Settings → «مراجعة المحتوى الديني» / Religious Content Review — a
// TEMPORARY screen (kept until the owner asks for its removal; it is one
// Settings row plus this file, lib/contentCatalog.ts and
// data/contentReviewLabels.ts, so removing it later touches nothing else).
//
// It reads the live content (lib/contentCatalog.ts) and writes only review
// decisions (lib/contentReview.ts) — never the religious texts. Only items
// marked "Approved for Publication" reach widgets, reminders and the startup
// screen.

const PAGE = 30;

const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending: "#8a6d1f",
  verified: "#1f6b4a",
  "needs-verification": "#9a5a12",
  "needs-editing": "#8a3b3b",
  approved: "#1f5e2e",
  rejected: "#6b6b6b",
};


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(5.5rem,34%)_minmax(0,1fr)] gap-x-2 text-[11.5px] leading-snug">
      <span className="font-semibold" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="min-w-0 break-words" style={{ color: "var(--color-text-primary)" }}>
        {children}
      </span>
    </div>
  );
}

/** One-tap decisions: Approve / Needs verification / Needs editing / Reject, saved at once (with `notes`). */
function QuickActions({ id, current, notes, reviewer, onSaved }: { id: string; current: ReviewStatus; notes: string; reviewer: string; onSaved?: () => void }) {
  const { language } = useLanguage();
  const t = contentReviewLabels[language];
  const actions: [ReviewStatus, string][] = [
    ["approved", t.actions.approve],
    ["needs-verification", t.actions.verify],
    ["needs-editing", t.actions.edit],
    ["rejected", t.actions.reject],
  ];
  return (
    <div className="flex flex-wrap gap-1.5" data-review-actions={id}>
      {actions.map(([status, label]) => {
        const active = current === status;
        return (
          <button
            key={status}
            type="button"
            data-review-action={status}
            aria-pressed={active}
            onClick={() => {
              setReview(id, { status, notes, reviewer });
              onSaved?.();
            }}
            className="rounded-full px-3 py-1 text-[11.5px] font-semibold"
            style={active ? { background: STATUS_COLORS[status], color: "#fff" } : { boxShadow: `inset 0 0 0 1.5px ${STATUS_COLORS[status]}`, color: STATUS_COLORS[status] }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ItemCard({ item, duplicates, reviewer, comments, defaultOpen }: { item: CatalogItem; duplicates: string[]; reviewer: string; comments: CatalogItem[]; defaultOpen: boolean }) {
  const { language } = useLanguage();
  const t = contentReviewLabels[language];
  const statuses = reviewStatusLabels[language];
  const record = getReviewRecord(item.id);
  const status = statusOf(item);
  const [open, setOpen] = useState(defaultOpen);
  const [draftStatus, setDraftStatus] = useState<ReviewStatus>(status);
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const isLink = (v?: string) => v && /^https?:\/\//.test(v);

  return (
    <li
      data-review-item={item.id}
      className="rounded-2xl border px-3 py-2.5"
      style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
          {contentTypeLabels[language][item.type]}
        </span>
        <span data-review-status={status} className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white" style={{ background: STATUS_COLORS[status] }}>
          {statuses[status]}
        </span>
        {item.origin === "new" && (
          <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ boxShadow: "inset 0 0 0 1px var(--color-gold)", color: "var(--color-text-primary)" }}>
            {t.newBadge}
          </span>
        )}
        {item.warnings.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10.5px] font-semibold" style={{ color: "#9a5a12" }} title={item.warnings.map((w) => warningLabels[language][w]).join(" · ")}>
            <AlertTriangle size={12} /> {item.warnings.length}
          </span>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-[11.5px] font-semibold underline underline-offset-2" style={{ color: "var(--color-primary)" }}>
          {open ? t.close : t.open}
        </button>
      </div>

      <p dir="rtl" className={`mt-1.5 whitespace-pre-line text-[14px] leading-[1.9] ${open ? "" : "line-clamp-2"}`} style={{ fontFamily: item.type === "reflection" ? undefined : "var(--font-display)", color: "var(--color-text-primary)" }}>
        {item.textAr}
      </p>
      {!open && item.sourceName && (
        <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--color-text-muted)" }}>
          {item.sourceName}
        </p>
      )}

      {open && (
        <div className="mt-2 flex flex-col gap-1.5" data-review-details="">
          {item.warnings.length > 0 && (
            <ul className="flex flex-col gap-0.5 rounded-xl px-2.5 py-1.5" style={{ background: "rgba(154, 90, 18, 0.1)" }} data-review-warnings="">
              {item.warnings.map((w) => (
                <li key={w} className="flex items-start gap-1 text-[11.5px]" style={{ color: "#7a4510" }}>
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {warningLabels[language][w]}
                </li>
              ))}
            </ul>
          )}
          {item.textEn && (
            <Field label={t.textEn}>
              <span dir="ltr" className="block text-start">
                {item.textEn}
              </span>
            </Field>
          )}
          {item.supportAr && item.supportLabel && (
            <Field label={item.supportLabel === "tafsir" ? `${t.scholarly} — ${t.support.tafsir}` : t.support[item.supportLabel]}>
              <span dir="rtl" className="block">
                {item.supportAr}
              </span>
              {item.supportEn && (
                <span dir="ltr" className="mt-0.5 block text-start" style={{ color: "var(--color-text-muted)" }}>
                  {item.supportEn}
                </span>
              )}
            </Field>
          )}
          <Field label={t.fields.id}>
            <code>{item.id}</code>
          </Field>
          <Field label={t.fields.storage}>
            <code className="text-[10.5px]">{item.storage}</code>
          </Field>
          {item.sourceName && <Field label={t.fields.source}>{item.sourceName}</Field>}
          {item.reference && <Field label={t.fields.reference}>{item.reference}</Field>}
          {item.narrator && <Field label={t.fields.narrator}>{item.narrator}</Field>}
          {item.grade && <Field label={t.fields.grade}>{item.grade}</Field>}
          {item.gradedBy && <Field label={t.fields.gradedBy}>{item.gradedBy}</Field>}
          {item.verseRef && <Field label={t.fields.verseRef}>{item.verseRef}</Field>}
          {item.tafsirSource && <Field label={t.fields.tafsirSource}>{item.tafsirSource}</Field>}
          {item.tafsirRef && <Field label={t.fields.tafsirRef}>{item.tafsirRef}</Field>}
          {item.poet && <Field label={t.fields.poet}>{item.poet}</Field>}
          {item.attributionConfidence && <Field label={t.fields.attribution}>{t.attribution[item.attributionConfidence]}</Field>}
          {item.translationSource && <Field label={t.fields.translation}>{item.translationSource}</Field>}
          {[item.url, item.tafsirUrl].filter(isLink).map((link, i) => (
            <Field key={link} label={i === 0 && item.url ? t.fields.url : t.fields.tafsirUrl}>
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 underline [overflow-wrap:anywhere]" style={{ color: "var(--color-primary)" }} dir="ltr">
                {link} <ExternalLink size={11} />
              </a>
            </Field>
          ))}
          <Field label={t.fields.usage}>{item.usage.map((u) => usageLabels[language][u]).join(" · ")}</Field>
          {item.attachedTo && item.attachedTo.length > 0 && (
            <Field label={t.fields.attachedTo}>
              <code className="text-[10.5px]">{item.attachedTo.slice(0, 12).join(", ")}{item.attachedTo.length > 12 ? ` … (+${item.attachedTo.length - 12})` : ""}</code>
            </Field>
          )}
          {item.dataNote && <Field label={t.fields.dataNote}>{item.dataNote}</Field>}
          {duplicates.length > 0 && (
            <Field label={t.fields.duplicates}>
              <code className="text-[10.5px]" data-review-duplicates="">
                {duplicates.join(", ")}
              </code>
            </Field>
          )}
          <Field label={t.fields.defaultStatus}>{statuses[item.defaultStatus]}</Field>
          {item.type !== "reflection" && (
            <div className="mt-1 rounded-xl border px-2.5 py-2" style={{ borderColor: "var(--color-gold-soft)", borderStyle: "dashed" }} data-review-comments={item.id}>
              <p className="text-[11.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
                {t.ditharComments}
              </p>
              {comments.length === 0 ? (
                <p className="mt-1 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                  {t.noComments}
                </p>
              ) : (
                <ul className="mt-1 flex flex-col gap-2">
                  {comments.map((c) => {
                    const cs = statusOf(c);
                    return (
                      <li key={c.id} data-review-comment={c.id} className="flex flex-col gap-1">
                        <div className="flex items-start gap-1.5">
                          <span className="mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-white" style={{ background: STATUS_COLORS[cs] }} data-review-status={cs}>
                            {statuses[cs]}
                          </span>
                          <span className="flex-1 text-[12.5px] leading-relaxed" style={{ color: "var(--color-text-primary)" }}>
                            <span dir="rtl" className="block">
                              {c.textAr}
                            </span>
                            {c.textEn && (
                              <span dir="ltr" className="block text-start text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                                {c.textEn}
                              </span>
                            )}
                          </span>
                        </div>
                        <QuickActions id={c.id} current={cs} notes={getReviewRecord(c.id)?.notes ?? ""} reviewer={reviewer} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {record && record.history.length > 0 && (
            <Field label={t.fields.history}>
              {record.history
                .slice()
                .reverse()
                .map((h) => `${statuses[h.status]} — ${new Date(h.at).toLocaleString(language === "ar" ? "ar" : "en")}${h.reviewer ? ` — ${h.reviewer}` : ""}`)
                .join(" | ")}
            </Field>
          )}

          <div className="mt-1 flex flex-col gap-1.5 rounded-xl p-2" style={{ background: "var(--color-bg)" }}>
            <QuickActions
              id={item.id}
              current={status}
              notes={notes}
              reviewer={reviewer}
              onSaved={() => {
                setSaved(true);
                window.setTimeout(() => setSaved(false), 1500);
              }}
            />
            <p className="text-[10.5px]" style={{ color: "var(--color-text-muted)" }}>
              {t.actionsHint}
            </p>
            <label className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t.status}
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value as ReviewStatus)}
                data-review-select={item.id}
                className="flex-1 rounded-lg border px-2 py-1 text-[12px]"
                style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
              >
                {REVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statuses[s]}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notes}
              aria-label={t.notes}
              rows={2}
              className="rounded-lg border px-2 py-1 text-[12px]"
              style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-review-save={item.id}
                onClick={() => {
                  setReview(item.id, { status: draftStatus, notes, reviewer });
                  setSaved(true);
                  window.setTimeout(() => setSaved(false), 1500);
                }}
                className="rounded-full px-4 py-1.5 text-[12px] font-semibold"
                style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}
              >
                {t.save}
              </button>
              {saved && (
                <span role="status" className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
                  {t.saved}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function ContentReviewView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = contentReviewLabels[language];
  const statuses = reviewStatusLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const catalog = useMemo(() => contentCatalog(), []);
  const duplicates = useMemo(() => duplicateGroups(catalog), [catalog]);
  const [filter, setFilter] = useState<CatalogFilter>({ query: "", category: "all", type: "all", language: "all", status: "all", verification: "all" });
  // Choosing a category shows its items in full (every field) by default.
  const [expandAll, setExpandAll] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [reviewer, setReviewer] = useState(() => loadReviewerName());
  const [bulkStatus, setBulkStatus] = useState<ReviewStatus>("approved");
  const [copyState, setCopyState] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeContentReview(() => setVersion((v) => v + 1)), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version`: statuses changed
  const results = useMemo(() => filterCatalog(catalog, filter), [catalog, filter, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version`: statuses changed
  const publishedCount = useMemo(() => catalog.filter((i) => isPublished(i.id)).length, [catalog, version]);

  const update = (patch: Partial<CatalogFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };
  const select = (value: string, onChange: (v: string) => void, options: [string, string][], label: string, name: string) => (
    <label className="flex min-w-0 flex-col gap-0.5 text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-review-filter={name}
        className="min-w-0 rounded-lg border px-1.5 py-1 text-[12px]"
        style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="flex flex-1 flex-col" data-content-review="">
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
        <h1 className="min-w-0 flex-1 truncate text-center text-[16px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.pageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <p className="mt-3 text-[12px] leading-[1.8]" style={{ color: "var(--color-text-primary)" }}>
        {t.intro}
      </p>
      <p className="mt-1 flex items-start gap-1 text-[11.5px] leading-[1.7]" style={{ color: "#7a4510" }}>
        <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {t.scholarNote}
      </p>

      <label className="mt-3 flex flex-col gap-0.5 text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
        {t.reviewer}
        <input
          value={reviewer}
          onChange={(e) => {
            setReviewer(e.target.value);
            saveReviewerName(e.target.value);
          }}
          placeholder={t.reviewerPlaceholder}
          className="rounded-lg border px-2 py-1.5 text-[12.5px]"
          style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        />
      </label>

      <input
        type="search"
        value={filter.query}
        onChange={(e) => update({ query: e.target.value })}
        placeholder={t.search}
        aria-label={t.search}
        data-review-search=""
        className="mt-2 rounded-xl border px-3 py-2 text-[13px]"
        style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
      />
      <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t.category} data-review-categories="">
        {(["all", ...REVIEW_CATEGORIES] as (ReviewCategory | "all")[]).map((c) => {
          const active = (filter.category ?? "all") === c;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={active}
              data-review-category={c}
              onClick={() => {
                update({ category: c });
                setExpandAll(c !== "all");
              }}
              className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-semibold"
              style={active ? { background: "var(--color-primary)", color: "var(--color-primary-contrast)", borderColor: "var(--color-primary)" } : { borderColor: "var(--color-gold-soft)", color: "var(--color-text-primary)", background: "var(--color-surface)" }}
            >
              {t.categories[c]}
            </button>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {select(filter.type ?? "all", (v) => update({ type: v as CatalogFilter["type"] }), [["all", t.all], ...CONTENT_TYPES.map((c) => [c, contentTypeLabels[language][c]] as [string, string])], t.type, "type")}
        {select(filter.status ?? "all", (v) => update({ status: v as CatalogFilter["status"] }), [["all", t.all], ...REVIEW_STATUSES.map((s) => [s, statuses[s]] as [string, string])], t.status, "status")}
        {select(filter.language ?? "all", (v) => update({ language: v as CatalogFilter["language"] }), [["all", t.all], ["en", t.langEn], ["en-missing", t.langEnMissing]], t.language, "language")}
        {select(
          filter.verification ?? "all",
          (v) => update({ verification: v as CatalogFilter["verification"] }),
          [["all", t.all], ["warnings", t.verWarnings], ["scholar", t.verScholar], ["clean", t.verClean], ["new", t.verNew]],
          t.verification,
          "verification",
        )}
      </div>

      <p className="mt-2 rounded-xl border px-3 py-2 text-[11px] leading-snug" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-muted)" }} data-review-storage="local">
        {t.storageNote}
      </p>

      <p className="mt-2 flex justify-between text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
        <span data-review-count={results.length}>{t.results(results.length, catalog.length)}</span>
        <button type="button" data-review-expand={expandAll ? "open" : "closed"} onClick={() => setExpandAll((v) => !v)} className="font-semibold underline underline-offset-2" style={{ color: "var(--color-primary)" }}>
          {expandAll ? t.collapseAll : t.expandAll}
        </button>
        <span>{t.published(publishedCount)}</span>
      </p>

      <details className="mt-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-gold-soft)" }}>
        <summary className="cursor-pointer text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {t.bulkTitle}
        </summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as ReviewStatus)}
            data-review-bulk-status=""
            className="rounded-lg border px-2 py-1 text-[12px]"
            style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
          >
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statuses[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-review-bulk-apply=""
            disabled={results.length === 0}
            onClick={() => {
              if (!window.confirm(t.bulkConfirm(results.length, statuses[bulkStatus]))) return;
              setReviewMany(
                results.map((i) => i.id),
                { status: bulkStatus, reviewer },
              );
            }}
            className="rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)", opacity: results.length === 0 ? 0.5 : 1 }}
          >
            {t.bulkApply(results.length)}
          </button>
        </div>
      </details>

      <details className="mt-2 rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-gold-soft)" }}>
        <summary className="cursor-pointer text-[12px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {t.exportTitle}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" data-review-export="json" onClick={() => void exportTextFile("dithar-content-review.json", "application/json", exportJson(results)).then((o) => setCopyState(t.exported[o]))} className="flex items-center gap-1 rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-primary)" }}>
            <Download size={13} /> {t.exportJson}
          </button>
          <button type="button" data-review-export="csv" onClick={() => void exportTextFile("dithar-content-review.csv", "text/csv", exportCsv(results)).then((o) => setCopyState(t.exported[o]))} className="flex items-center gap-1 rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-primary)" }}>
            <Download size={13} /> {t.exportCsv}
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(exportJson(results))
                .then(() => setCopyState(t.copied))
                .catch(() => setCopyState(t.copyFailed));
            }}
            className="rounded-full border px-3 py-1 text-[12px]"
            style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-primary)" }}
          >
            {t.copyJson}
          </button>
          {copyState && (
            <span role="status" className="self-center text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {copyState}
            </span>
          )}
        </div>
        <p className="mt-1 text-[10.5px]" style={{ color: "var(--color-text-muted)" }}>
          {t.exportHint}
        </p>
      </details>

      <ul className="mt-3 flex flex-col gap-2 pb-2">
        {results.slice(0, limit).map((item) => (
          <ItemCard
            key={`${item.id}:${expandAll ? "open" : "closed"}`}
            item={item}
            duplicates={duplicates.get(item.id) ?? []}
            reviewer={reviewer}
            comments={commentsFor(catalog, item.id)}
            defaultOpen={expandAll}
          />
        ))}
      </ul>
      {results.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mb-2 self-center rounded-full border px-4 py-1.5 text-[12px] font-semibold" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
          {t.more}
        </button>
      )}
    </div>
  );
}
