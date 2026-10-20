import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Pause, Play, Share2, X } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { useBackDismiss } from "../lib/backOverlays";
import { reminderLabels } from "../data/reminderLabels";
import { findReminderItem, reminderPool } from "../lib/reminderContent";
import { resolveOpenedReminder } from "../lib/reminderOpen";
import type { ShownReminder } from "../lib/remindersNative";
import { reminderBackgroundFor } from "../lib/reminderBackgroundChoice";
import type { ReminderItem } from "../lib/reminderContent";
import { loadReminderSettings } from "../lib/reminderSettings";
import { findComment, loadContentHistory, pickComment, pickFreshItem, recordShown } from "../lib/contentRotation";
import type { EditorialComment } from "../data/widgetContent";
import { isFavorite, subscribeFavorites, toggleFavorite } from "../lib/favorites";
import { reminderShareContent } from "../lib/reminderShare";
import { ShareMenu } from "./ShareMenu";

// The full-screen spiritual reminder: a natural or meaningful background
// fills the whole screen and the Arabic text sits directly on it (one
// layer, never split into an image part and a text part), with — in a
// calm hierarchy beneath — its meaning, the VERIFIED evidence under its own
// label and source («من القرآن الكريم» / «من السنة»), and DITHAR's
// reflection under its own label, marked as an educational reflection, not
// a narrated text. Shown for 30 seconds (pausable), then it closes itself.
//
// It opens when the user taps a reminder notification or the home-screen
// widget (when "full-screen experience" is on) — with the same DITHAR
// comment the widget/notification showed — or from Settings → preview.
// Colors follow the app's palette (the scrim's tint, the labels' accent, the
// "Next" button); the heart saves the item, with its comment, to Favorites.
// It is an in-app screen: Android doesn't let an app put a screen over the
// lock screen or launch itself from the background without a privileged
// full-screen-intent permission meant for calls and alarms — so it never
// appears on its own while the phone is asleep or locked.

const REMINDER_DISPLAY_MS = 30_000;

/** The next item: from the enabled categories, never a recently shown one while others remain. */
function nextItem(current: ReminderItem): ReminderItem {
  const { categories } = loadReminderSettings();
  const anyEnabled = Object.values(categories).some(Boolean);
  const pool = reminderPool().filter((i) => i.id !== current.id && (categories[i.category] || !anyEnabled));
  return pickFreshItem(pool, loadContentHistory().items) ?? current;
}

/** The comment to show: the one the widget/notification showed when given, else the least recently shown. */
function chooseComment(item: ReminderItem, commentId?: string | null): EditorialComment | undefined {
  return findComment(item, commentId) ?? pickComment(item.comments, loadContentHistory().comments);
}

// `shownAs` (from a tapped notification or widget): exactly what it showed —
// the view opens that same content (lib/reminderOpen.ts), never another.
// `autoClose`: the 30-second display — by default the "full-screen
// experience" setting; without it the reminder stays (paused) until closed.
export function SpiritualReminderView({
  itemId,
  commentId,
  shownAs,
  autoClose,
  onClose,
}: {
  itemId: string;
  commentId?: string | null;
  shownAs?: ShownReminder;
  autoClose?: boolean;
  onClose: () => void;
}) {
  const { language, dir } = useLanguage();
  const t = reminderLabels[language];
  const [shown, setShown] = useState<{ item: ReminderItem; comment?: EditorialComment; title?: string } | null>(() => {
    if (shownAs) {
      const opened = resolveOpenedReminder(itemId, commentId, shownAs, language);
      return opened ? { item: opened.item, comment: opened.comment ?? (opened.from === "library" && !commentId ? chooseComment(opened.item) : undefined), title: opened.title } : null;
    }
    const item = findReminderItem(itemId);
    return item ? { item, comment: chooseComment(item, commentId) } : null;
  });
  const item = shown?.item ?? null;
  const comment = shown?.comment;
  const [paused, setPaused] = useState(() => !(autoClose ?? loadReminderSettings().fullScreen));
  const [remaining, setRemaining] = useState(REMINDER_DISPLAY_MS);
  // Only the running interval writes this, so pausing or "Next" never double-counts time.
  const remainingRef = useRef(REMINDER_DISPLAY_MS);
  const background = useMemo(() => (item ? reminderBackgroundFor(item) : null), [item]);
  // Re-render when Favorites change (e.g. a removal elsewhere); the heart's state is read from the store.
  const [, setFavoritesVersion] = useState(0);
  const favorite = item ? isFavorite(item.id) : false;
  const [toast, setToast] = useState<string | null>(null);
  // Sharing (as text, as an image, or copy — ShareMenu) pauses the 30 seconds, so the reminder doesn't close mid-share.
  const [shareOpen, setShareOpen] = useState(false);
  const openShare = useCallback(() => {
    setPaused(true);
    setShareOpen(true);
  }, []);

  // What was shown is remembered (across restarts), so "Next" and the next visit don't repeat it.
  useEffect(() => {
    if (shown) recordShown(shown.item.id, shown.comment?.id);
  }, [shown]);

  useEffect(() => subscribeFavorites(() => setFavoritesVersion((v) => v + 1)), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useBackDismiss(true, onClose);

  // A 30-second display that pauses while the user reads longer.
  useEffect(() => {
    if (paused) return;
    const start = Date.now();
    const base = remainingRef.current;
    const tick = window.setInterval(() => {
      const left = base - (Date.now() - start);
      remainingRef.current = left;
      setRemaining(left);
      if (left <= 0) onClose();
    }, 250);
    return () => window.clearInterval(tick);
  }, [paused, onClose, item]);

  const next = useCallback(() => {
    if (!item) return;
    remainingRef.current = REMINDER_DISPLAY_MS;
    setRemaining(REMINDER_DISPLAY_MS);
    const following = nextItem(item);
    setShown({ item: following, comment: chooseComment(following) });
  }, [item]);

  const onToggleFavorite = useCallback(() => {
    if (!item) return;
    const nowFavorite = toggleFavorite(item, comment, "app");
    setToast(nowFavorite ? t.favoriteAdded : t.favoriteRemoved);
  }, [item, comment, t]);

  useEffect(() => {
    if (!item) onClose();
  }, [item, onClose]);
  if (!item || !background) return null;

  const isEn = language === "en";
  const source = isEn ? item.sourceEn : item.sourceAr;
  const evidence = item.evidence;
  const evidenceText = evidence ? (isEn && evidence.en ? evidence.en : evidence.ar) : null;
  const evidenceSource = evidence ? (isEn ? (evidence.sourceEn ?? evidence.sourceAr) : evidence.sourceAr) : null;
  const reflection = item.reflection?.[language];
  const commentText = comment ? comment[language] : undefined;
  const title = shown?.title ?? t.kindTitle[item.kind];
  const isPoetry = item.category === "poetry";
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  const progress = Math.min(1, Math.max(0, 1 - remaining / REMINDER_DISPLAY_MS));

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-spiritual-reminder={item.id}
      style={{ backgroundImage: `url("${background}")`, backgroundSize: "cover", backgroundPosition: "center", color: "#fff" }}
    >
      {/* Readability: a soft scrim over the whole image — strongest where the text is — with a light wash of the palette's primary. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(var(--reminder-tint-rgb), 0.22) 0%, rgba(var(--reminder-tint-rgb), 0.12) 100%), linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.62) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative h-1 w-full" style={{ background: "rgba(255,255,255,0.18)" }} aria-hidden="true">
        <div className="h-full" style={{ width: `${progress * 100}%`, background: "var(--color-accent-on-dark)", opacity: 0.9, transition: "width 250ms linear" }} />
      </div>

      <div className="relative flex items-center justify-between px-4 pt-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <button type="button" onClick={onClose} aria-label={t.close} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.3)" }}>
          <X size={18} />
        </button>
        <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={{ background: "rgba(0,0,0,0.3)", color: "var(--color-accent-on-dark)" }} data-reminder-kind={item.kind}>
          {title}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t.resume : t.pause}
            aria-pressed={paused}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            type="button"
            onClick={openShare}
            aria-label={t.share}
            data-reminder-share=""
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            <Share2 size={16} />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={favorite ? t.favoriteRemove : t.favoriteAdd}
            aria-pressed={favorite}
            data-reminder-favorite={favorite ? "on" : "off"}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "rgba(0,0,0,0.3)", color: favorite ? "var(--color-accent-on-dark)" : "#fff" }}
          >
            <Heart size={17} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center px-4" role="status" aria-live="polite">
          <span className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold" style={{ background: "rgba(0,0,0,0.55)", color: "var(--color-accent-on-dark)" }}>
            {toast}
          </span>
        </div>
      )}

      {/* "safe" centring: a long text (a complete verse) starts at the top and scrolls; with plain
          centring its first lines were pushed above the scroll area, out of reach. */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center-safe overflow-y-auto px-6 py-6 text-center">
        <p
          dir="rtl"
          className={`max-w-[34rem] font-bold leading-[2] ${isPoetry ? "whitespace-pre-line text-[clamp(19px,5.4vw,26px)]" : "text-[clamp(22px,6.2vw,30px)]"}`}
          style={{ fontFamily: "var(--font-display)", textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}
          data-reminder-text=""
        >
          {item.textAr}
        </p>
        {isEn && item.meaningEn && (
          <p className="mt-3 max-w-[30rem] text-[14px] italic leading-[1.6]" style={{ color: "rgba(255,255,255,0.88)" }}>
            {item.meaningEn}
          </p>
        )}
        {source && (
          <p className="mt-3 max-w-[30rem] text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.78)" }} data-reminder-source="">
            {isPoetry ? t.poetLabel : t.sourceLabel}: {source}
          </p>
        )}
        {isPoetry && (
          <p className="mt-1 max-w-[30rem] text-[10.5px]" style={{ color: "rgba(255,255,255,0.66)" }} data-reminder-poetry-note="">
            {t.poetryNote}
            {item.attribution && item.attribution !== "established" ? ` · ${t.attributionUncertain}` : ""}
          </p>
        )}

        {evidence && evidenceText && item.category !== "virtue" && (
          <div className="mt-6 max-w-[32rem] rounded-2xl px-4 py-3" style={{ background: "rgba(0,0,0,0.28)" }} data-reminder-evidence={evidence.kind}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-accent-on-dark)" }}>
              {evidence.kind === "quran" ? t.quranLabel : evidence.kind === "tafsir" ? t.tafsirLabel : evidence.kind === "insight" ? t.insightLabel : t.sunnahLabel}
            </p>
            <p dir={isEn && evidence.en ? "ltr" : "rtl"} className="mt-1 text-[14.5px] leading-[1.9]" style={{ fontFamily: isEn && evidence.en ? undefined : evidence.kind === "insight" || evidence.kind === "tafsir" ? undefined : "var(--font-display)" }}>
              {evidenceText}
            </p>
            {evidenceSource && (
              <p className="mt-1 text-[10.5px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                {evidenceSource}
              </p>
            )}
          </div>
        )}
        {item.category === "virtue" && evidence && (
          <div className="mt-6 max-w-[32rem] rounded-2xl px-4 py-3" style={{ background: "rgba(0,0,0,0.28)" }} data-reminder-evidence="virtue">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-accent-on-dark)" }}>
              {t.sunnahLabel}
            </p>
            <p dir={isEn && evidence.en ? "ltr" : "rtl"} className="mt-1 text-[14px] leading-[1.8]">
              {isEn && evidence.en ? evidence.en : evidence.ar}
            </p>
          </div>
        )}

        {(commentText || reflection) && (
          <div className="mt-4 max-w-[32rem] px-2" data-reminder-reflection="">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--color-accent-on-dark)" }}>
              {t.commentLabel}
            </p>
            {commentText && (
              <p className="mt-1 text-[14px] font-medium leading-[1.8]" style={{ color: "rgba(255,255,255,0.95)" }} data-reminder-comment={comment?.id}>
                {commentText}
              </p>
            )}
            {reflection && (
              <p className="mt-2 text-[13px] leading-[1.8]" style={{ color: "rgba(255,255,255,0.85)" }}>
                {reflection}
              </p>
            )}
            <p className="mt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              {t.reflectionNote}
            </p>
          </div>
        )}
      </div>

      <div className="relative flex justify-center px-4 pb-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={next}
          className="flex items-center gap-1.5 rounded-full px-5 py-2 text-[13px] font-semibold"
          style={{ background: "var(--color-accent-on-dark)", color: "var(--color-text-primary)" }}
        >
          {t.next}
          <NextIcon size={15} />
        </button>
      </div>

      <ShareMenu
        content={reminderShareContent(item, comment, language, { kindLabel: title, background })}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
