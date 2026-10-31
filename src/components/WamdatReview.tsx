import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { contentReviewLabels, reviewStatusLabels, usageLabels, warningLabels } from "../data/contentReviewLabels";
import { normalizeArabic, statusOf } from "../lib/contentCatalog";
import type { CatalogItem } from "../lib/contentCatalog";
import {
  approveItemEdits,
  discardEditDraft,
  getContentEdits,
  getReviewRecord,
  saveEditDraft,
  setReview,
  statusBeforeRejection,
} from "../lib/contentReview";
import type { EditField, ReviewStatus } from "../lib/contentReview";
import { FIELD_DIR, STATUS_COLORS, currentValue, isWamdaId, loadChecked, saveChecked, shippedValue } from "./contentReviewShared";

// The Wamdat Lataif (src/data/wamdat.ts) in the Religious Content Review
// screen: every latifa in ONE card — all its fields editable in place, its
// metadata, warnings and history — with its own Save Draft / Approve /
// Remove (Restore) beside it. It writes only through lib/contentReview.ts:
// edits are per-field drafts until this item's Approve; Remove is the
// "rejected" status, so nothing is ever deleted from the source file.

/** The fields a latifa's card edits, in the order shown. */
const WAMDA_FIELDS: readonly EditField[] = ["reflectionAr", "reflectionEn", "textAr", "reference", "tafsirSource", "url", "translationSource"];

const ROWS: Partial<Record<EditField, number>> = { reflectionAr: 6, reflectionEn: 6, textAr: 3 };

/** The five states the reviewer sorts by; "draft" can be true alongside any other. */
export type WamdaState = "needs-review" | "draft" | "approved" | "verification" | "rejected";

const WAMDA_STATES: readonly WamdaState[] = ["needs-review", "draft", "approved", "verification", "rejected"];

function primaryState(status: ReviewStatus): Exclude<WamdaState, "draft"> {
  if (status === "rejected") return "rejected";
  if (status === "approved") return "approved";
  if (status === "needs-verification") return "verification";
  return "needs-review";
}

const STATE_COLORS: Record<WamdaState, string> = {
  "needs-review": STATUS_COLORS.pending,
  draft: "#5a4a8a",
  approved: STATUS_COLORS.approved,
  verification: STATUS_COLORS["needs-verification"],
  rejected: STATUS_COLORS.rejected,
};

function hasDrafts(id: string): boolean {
  return Object.keys(getContentEdits(id)?.drafts ?? {}).length > 0;
}

function matchesState(item: CatalogItem, state: WamdaState | "all"): boolean {
  if (state === "all") return true;
  if (state === "draft") return hasDrafts(item.id);
  return primaryState(statusOf(item)) === state;
}

function Badge({ color, children, ...rest }: { color: string; children: React.ReactNode } & Record<`data-${string}`, string>) {
  return (
    <span {...rest} className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white" style={{ background: color }}>
      {children}
    </span>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold" style={{ boxShadow: "inset 0 0 0 1px #9a5a12", color: "#7a4510" }}>
      {children}
    </span>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(5.5rem,34%)_minmax(0,1fr)] gap-x-2 text-[11.5px] leading-snug">
      <span className="font-semibold" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <span className="min-w-0 break-words [overflow-wrap:anywhere]" style={{ color: "var(--color-text-primary)" }}>
        {children}
      </span>
    </div>
  );
}

type Message = { text: string; tone: "ok" | "muted" };

/** One latifa: every field editable, its metadata, and its own actions. */
export function WamdaReviewCard({ item, reviewer, onActed }: { item: CatalogItem; reviewer: string; onActed?: (id: string) => void }) {
  const { language } = useLanguage();
  const t = contentReviewLabels[language].wamdat;
  const statuses = reviewStatusLabels[language];
  const status = statusOf(item);
  const state = primaryState(status);
  const record = getReviewRecord(item.id);
  const edits = getContentEdits(item.id);
  // Only the fields the reviewer has typed in — saving never touches the others.
  const [typed, setTyped] = useState<Partial<Record<EditField, string>>>({});
  const [notes, setNotes] = useState<string | null>(null);
  const [checked, setChecked] = useState(() => loadChecked().has(item.id));
  const [message, setMessage] = useState<Message | null>(null);

  const baseline = (field: EditField) => edits?.drafts[field] ?? currentValue(item, field);
  const dirtyFields = WAMDA_FIELDS.filter((f) => typed[f] !== undefined && typed[f] !== baseline(f));
  const savedNotes = record?.notes ?? "";
  const notesDirty = notes !== null && notes !== savedNotes;
  const unsaved = dirtyFields.length > 0 || notesDirty;
  const title = currentValue(item, "reference") || item.id;

  /** Saves the typed fields as drafts (and the notes); returns how many fields changed. */
  const saveDraft = (): number => {
    for (const field of dirtyFields) {
      const value = typed[field]!;
      // Back to the current value: nothing to approve, so any draft goes.
      if (value === currentValue(item, field)) discardEditDraft(item.id, field, reviewer);
      else saveEditDraft(item.id, field, value, reviewer);
    }
    if (notesDirty) setReview(item.id, { status, notes: notes!, reviewer });
    setTyped({});
    setNotes(null);
    return dirtyFields.length + (notesDirty ? 1 : 0);
  };

  const done = (text: string) => {
    setMessage({ text, tone: "ok" });
    onActed?.(item.id);
  };

  const approve = () => {
    if (unsaved && !window.confirm(t.approveUnsaved)) return;
    if (unsaved) saveDraft();
    const n = approveItemEdits(item.id, reviewer);
    setReview(item.id, { status: "approved", reviewer });
    done(t.approvedMsg(n));
  };

  const remove = () => {
    if (!window.confirm(t.removeConfirm(item.id, title))) return;
    setReview(item.id, { status: "rejected", reviewer });
    done(t.removedMsg);
  };

  const restore = () => {
    const back = statusBeforeRejection(item.id);
    setReview(item.id, { status: back, reviewer });
    done(t.restoredMsg(statuses[back]));
  };

  const history = [
    ...(record?.history ?? []).map((h) => ({ at: h.at, text: t.historyStatus(statuses[h.status]), reviewer: h.reviewer })),
    ...(edits?.history ?? []).map((h) => ({ at: h.at, text: `${t.historyEdit[h.action]} — ${t.fields[h.field as keyof typeof t.fields] ?? h.field}`, reviewer: h.reviewer })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 12);

  const inputStyle = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };
  const buttonBase = "rounded-full px-4 py-1.5 text-[12.5px] font-semibold";

  return (
    <li
      data-review-item={item.id}
      data-wamda-card=""
      data-wamda-state={state}
      data-wamda-unsaved={unsaved ? "true" : "false"}
      className="rounded-2xl border px-3 py-2.5"
      style={{ borderColor: unsaved ? STATE_COLORS.draft : "var(--color-gold-soft)", background: "var(--color-surface)" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            saveChecked(item.id, e.target.checked);
          }}
          aria-label={contentReviewLabels[language].reviewedCheck}
          title={contentReviewLabels[language].reviewedCheck}
          data-review-checked={item.id}
          className="h-4 w-4 shrink-0"
          style={{ accentColor: "var(--color-primary)" }}
        />
        <code className="text-[11px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {item.id}
        </code>
        <Badge color={STATE_COLORS[state]} data-wamda-state-badge={state}>
          {t.states[state]}
        </Badge>
        {hasDrafts(item.id) && (
          <Badge color={STATE_COLORS.draft} data-wamda-draft-badge="">
            {t.states.draft}
          </Badge>
        )}
        {unsaved && (
          <span data-wamda-unsaved-badge="" className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ boxShadow: `inset 0 0 0 1.5px ${STATE_COLORS.draft}`, color: STATE_COLORS.draft }}>
            ● {t.unsaved}
          </span>
        )}
        {item.warnings.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10.5px] font-semibold" style={{ color: "#9a5a12" }}>
            <AlertTriangle size={12} /> {item.warnings.length}
          </span>
        )}
      </div>
      <p dir="rtl" className="mt-1 text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </p>

      {/* The actions sit at the top of the card, beside the item they act on. */}
      <div className="mt-2 flex flex-wrap items-center gap-2" data-wamda-actions={item.id}>
        <button type="button" data-wamda-save={item.id} onClick={() => setMessage({ text: t.savedDraft(saveDraft()), tone: "muted" })} className={buttonBase} style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}>
          {t.saveDraft}
        </button>
        <button type="button" data-wamda-approve={item.id} onClick={approve} className={buttonBase} style={{ background: STATUS_COLORS.approved, color: "#fff" }}>
          {t.approve}
        </button>
        {state === "rejected" ? (
          <button type="button" data-wamda-restore={item.id} onClick={restore} className={buttonBase} style={{ boxShadow: `inset 0 0 0 1.5px ${STATUS_COLORS.rejected}`, color: "var(--color-text-primary)" }}>
            {t.restore}
          </button>
        ) : (
          <button type="button" data-wamda-remove={item.id} onClick={remove} className={buttonBase} style={{ boxShadow: "inset 0 0 0 1.5px #8a3b3b", color: "#8a3b3b" }}>
            {t.remove}
          </button>
        )}
      </div>
      {message && (
        <p role="status" data-wamda-message="" className="mt-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold" style={message.tone === "ok" ? { background: "rgba(31, 94, 46, 0.12)", color: STATUS_COLORS.approved } : { background: "var(--color-bg)", color: "var(--color-text-primary)" }}>
          {message.text}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-2">
        {WAMDA_FIELDS.map((field) => {
          const draft = edits?.drafts[field];
          const approvedEdit = edits?.approved[field] !== undefined;
          const value = typed[field] ?? baseline(field);
          const dirty = dirtyFields.includes(field);
          const original = shippedValue(item, field);
          const unverified =
            !approvedEdit && ((field === "translationSource" && value !== "") || (field === "reference" && !!item.dataNote) || (field === "url" && value === ""));
          return (
            <div key={field} data-wamda-field={field} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1">
                <label htmlFor={`${item.id}:${field}`} className="text-[11.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  {t.fields[field as keyof typeof t.fields]}
                </label>
                {value === "" && <Flag>{t.empty}</Flag>}
                {unverified && <Flag>{t.unverified}</Flag>}
                {dirty && (
                  <span data-wamda-field-unsaved="" className="text-[9.5px] font-semibold" style={{ color: STATE_COLORS.draft }}>
                    ● {t.unsavedField}
                  </span>
                )}
                {draft !== undefined && !dirty && (
                  <span data-wamda-field-draft="" className="rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-white" style={{ background: STATE_COLORS.draft }}>
                    {t.draftBadge}
                  </span>
                )}
                {approvedEdit && (
                  <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-white" style={{ background: STATUS_COLORS.approved }}>
                    {t.approvedEdit}
                  </span>
                )}
                <span className="flex-1" />
                {draft !== undefined && (
                  <button
                    type="button"
                    data-wamda-discard={field}
                    onClick={() => {
                      discardEditDraft(item.id, field, reviewer);
                      setTyped((prev) => {
                        const next = { ...prev };
                        delete next[field];
                        return next;
                      });
                    }}
                    className="text-[10.5px] font-semibold underline underline-offset-2"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {t.discardDraft}
                  </button>
                )}
              </div>
              <textarea
                id={`${item.id}:${field}`}
                value={value}
                onChange={(e) => {
                  const next = e.target.value;
                  setTyped((prev) => ({ ...prev, [field]: next }));
                }}
                dir={FIELD_DIR[field]}
                rows={ROWS[field] ?? 2}
                data-wamda-input={field}
                className={`w-full rounded-lg border px-2 py-1.5 ${field === "reflectionAr" || field === "textAr" ? "text-[14px] leading-[1.9]" : "text-[12.5px] leading-relaxed"}`}
                style={{ ...inputStyle, ...(dirty ? { borderColor: STATE_COLORS.draft } : {}), ...(field === "textAr" ? { fontFamily: "var(--font-display)" } : {}) }}
              />
              {field === "tafsirSource" && <span className="text-[10.5px]" style={{ color: "#7a4510" }}>{t.paraphrased}</span>}
              {original !== value && (
                <details className="text-[11px]" data-wamda-original={field}>
                  <summary className="cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
                    {t.original}
                  </summary>
                  <span dir={FIELD_DIR[field]} className="mt-0.5 block whitespace-pre-line break-words [overflow-wrap:anywhere]" style={{ color: "var(--color-text-muted)" }}>
                    {original || t.empty}
                  </span>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex flex-col gap-1.5 rounded-xl px-2.5 py-2" style={{ background: "var(--color-bg)" }}>
        <Info label={t.info.id}>
          <code>{item.id}</code>
        </Info>
        <Info label={t.info.storage}>
          <code className="text-[10.5px]">{item.storage}</code>
        </Info>
        <Info label={t.info.status}>
          <span data-wamda-status={status}>{t.states[state]}</span>
          <span className="block text-[10.5px]" style={{ color: "var(--color-text-muted)" }}>
            {t.underlying(statuses[status])}
          </span>
        </Info>
        <Info label={t.info.usage}>{item.usage.length ? item.usage.map((u) => usageLabels[language][u]).join(" · ") : t.noUsage}</Info>
        <Info label={t.info.warnings}>
          {item.warnings.length === 0 && !item.dataNote ? (
            "—"
          ) : (
            <ul className="flex flex-col gap-0.5" data-wamda-warnings="">
              {item.dataNote && (
                <li className="flex items-start gap-1" style={{ color: "#7a4510" }} dir="ltr">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {item.dataNote}
                </li>
              )}
              {item.warnings.map((w) => (
                <li key={w} className="flex items-start gap-1" style={{ color: "#7a4510" }}>
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {warningLabels[language][w]}
                </li>
              ))}
            </ul>
          )}
        </Info>
        <Info label={t.info.history}>
          {history.length === 0
            ? t.noHistory
            : history.map((h, i) => (
                <span key={i} className="block text-[10.5px]">
                  {new Date(h.at).toLocaleString(language === "ar" ? "ar" : "en")} — {h.text}
                  {h.reviewer ? ` — ${h.reviewer}` : ""}
                </span>
              ))}
        </Info>
        <label className="flex flex-col gap-0.5 text-[11.5px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
          {t.info.notes}
          <textarea value={notes ?? savedNotes} onChange={(e) => setNotes(e.target.value)} rows={2} data-wamda-notes="" className="rounded-lg border px-2 py-1 text-[12px] font-normal" style={inputStyle} />
        </label>
      </div>
    </li>
  );
}

const PAGE = 20;

/** Every latifa, with its own search and review-state filter. */
export function WamdatReviewPanel({ catalog, reviewer }: { catalog: CatalogItem[]; reviewer: string }) {
  const { language } = useLanguage();
  const t = contentReviewLabels[language].wamdat;
  const [query, setQuery] = useState("");
  const [state, setState] = useState<WamdaState | "all">("all");
  const [limit, setLimit] = useState(PAGE);
  // Cards acted on stay in view under the current filter, so their confirmation is seen.
  const [kept, setKept] = useState<Set<string>>(() => new Set());
  const items = catalog.filter((i) => isWamdaId(i.id));

  const q = query.trim().toLowerCase();
  const nq = normalizeArabic(q);
  const matchesQuery = (item: CatalogItem) => {
    if (!q) return true;
    const e = getContentEdits(item.id);
    const text = [item.id, item.textAr, item.supportAr, item.supportEn, item.verseRef, item.tafsirSource, ...Object.values(e?.drafts ?? {}), ...Object.values(e?.approved ?? {})].filter(Boolean).join(" \n ");
    return text.toLowerCase().includes(q) || (!!nq && normalizeArabic(text).includes(nq));
  };
  const searched = items.filter(matchesQuery);
  const results = searched.filter((i) => kept.has(i.id) || matchesState(i, state));
  const reset = () => {
    setKept(new Set());
    setLimit(PAGE);
  };

  return (
    <div className="mt-2 flex flex-col" data-wamdat-review="">
      <p className="text-[11.5px] leading-[1.8]" style={{ color: "var(--color-text-primary)" }}>
        {t.intro}
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          reset();
        }}
        placeholder={t.search}
        aria-label={t.search}
        data-wamda-search=""
        className="mt-2 rounded-xl border px-3 py-2 text-[13px]"
        style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
      />
      <div className="-mx-1 mt-2 flex flex-wrap gap-1.5 px-1" role="tablist" aria-label={contentReviewLabels[language].status}>
        {(["all", ...WAMDA_STATES] as (WamdaState | "all")[]).map((s) => {
          const active = state === s;
          const color = s === "all" ? "var(--color-primary)" : STATE_COLORS[s];
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={active}
              data-wamda-filter={s}
              onClick={() => {
                setState(s);
                reset();
              }}
              className="rounded-full px-3 py-1 text-[12px] font-semibold"
              style={active ? { background: color, color: "#fff" } : { boxShadow: `inset 0 0 0 1.5px ${color}`, color: "var(--color-text-primary)", background: "var(--color-surface)" }}
            >
              {t.states[s]} ({searched.filter((i) => matchesState(i, s)).length})
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px]" style={{ color: "var(--color-text-muted)" }} data-wamda-count={results.length}>
        {t.count(results.length, items.length)}
      </p>
      <ul className="mt-2 flex flex-col gap-2.5 pb-2">
        {results.slice(0, limit).map((item) => (
          <WamdaReviewCard key={item.id} item={item} reviewer={reviewer} onActed={(id) => setKept((k) => new Set(k).add(id))} />
        ))}
      </ul>
      {results.length > limit && (
        <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mb-2 self-center rounded-full border px-4 py-1.5 text-[12px] font-semibold" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-primary)" }}>
          {contentReviewLabels[language].more}
        </button>
      )}
    </div>
  );
}
