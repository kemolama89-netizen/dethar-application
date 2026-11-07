import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { homeDashboardLabels } from "../data/homeDashboardLabels";
import { reminderLabels } from "../data/reminderLabels";
import { useLocalDateKey } from "../lib/useLocalDateKey";
import { PREVIEW_MAX_CHARS, watchWidgetPreview, type WidgetPreviewState } from "../lib/homeWidgetPreview";
import type { OpenReminderRequest } from "../lib/reminderOpenRequests";

// Home's «مختارات اليوم» card: a preview of what the home-screen widget shows
// (lib/homeWidgetPreview.ts — the widget's own item, read from native; never a
// rotation of its own). It shows the item's kind and its whole text, exactly as
// stored — never part of it: widget items are short by design (lib/widgetFeed.ts
// WIDGET_MAX_TEXT_CHARS), and anything longer shows the hint instead of a cut
// text. A tap opens THAT item in full the way a tap on the widget does (`onOpen`
// gets the very request the widget sends — App.tsx passes it down the notification path).
//
// Where there is no widget (the web app, or an Android build without the
// preview) or nothing to show yet, it is today's first Daily Pick, as before
// (lib/dailyPicks.ts: a verified written-library dua, the same one the Misc
// library shows), loaded lazily after Home's first paint; a tap before it
// arrives loads it first, so the same dua opens either way.

async function loadTodayPick(duaTitle: string): Promise<OpenReminderRequest | null> {
  const { getDailyPicks } = await import("../lib/dailyPicks");
  const first = getDailyPicks()[0];
  if (!first) return null;
  return {
    id: `dua:${first.id}`,
    commentId: null,
    shown: { category: "dua", title: duaTitle, text: first.text_ar, meaning: "", detail: "", source: first.source_ar ?? "", commentText: null },
  };
}

/**
 * The widget's item while there is one; otherwise today's Daily Pick (null until it is known).
 * [fallback]: the Daily Pick is what this card shows (no widget item); false while the widget's item is still being read.
 */
function useCardItem(duaTitle: string): { request: OpenReminderRequest | null; widget: boolean; fallback: boolean } {
  const [state, setState] = useState<WidgetPreviewState>({ kind: "loading" });
  useEffect(() => watchWidgetPreview(setState), []);
  const [pick, setPick] = useState<OpenReminderRequest | null>(null);
  const fallback = state.kind === "unsupported" || state.kind === "empty";
  // A new local day — at midnight with Home open, or back in the app the next morning — reads the day's pick again.
  const day = useLocalDateKey({ atMidnight: true });
  useEffect(() => {
    if (!fallback) return;
    let cancelled = false;
    void loadTodayPick(duaTitle)
      .then((first) => {
        if (!cancelled && first) setPick(first);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [day, fallback, duaTitle]);
  if (state.kind === "item") return { request: state.request, widget: true, fallback: false };
  return { request: fallback ? pick : null, widget: false, fallback };
}

export function HomeDailyPicksCard({ onOpen, className = "" }: { onOpen: (request: OpenReminderRequest) => void; className?: string }) {
  const { language, dir } = useLanguage();
  const t = homeDashboardLabels[language];
  const duaTitle = reminderLabels[language].categoryTitle.dua;
  const { request, widget, fallback } = useCardItem(duaTitle);
  const Arrow = dir === "rtl" ? ChevronLeft : ChevronRight;
  const shown = request?.shown;
  const kind = shown?.title || "";
  return (
    <button
      type="button"
      onClick={() => {
        // Only ever what the card shows: while the widget's item is still being read (a moment), a tap waits for it.
        if (request) onOpen(request);
        else if (fallback) void loadTodayPick(duaTitle).then((p) => p && onOpen(p));
      }}
      className={`dithar-glass dithar-daily-pick ${className}`}
      aria-label={`${t.dailyPicks}${kind ? `: ${kind}` : ""} — ${t.dailyPicksAction}`}
      data-home-daily-picks={request?.id ?? ""}
      data-home-daily-picks-from={widget ? "widget" : request ? "daily-pick" : "loading"}
    >
      <span className="dithar-daily-pick__text">
        <span className="dithar-daily-pick__title">
          {t.dailyPicks}
          {kind && <span className="dithar-daily-pick__kind">{kind}</span>}
        </span>
        {shown && shown.text.length <= PREVIEW_MAX_CHARS ? (
          // The whole text, exactly as stored: a religious text is never shown cut short.
          <span className="dithar-daily-pick__excerpt" dir="rtl" lang="ar" data-home-daily-pick-excerpt="">
            {shown.text}
          </span>
        ) : (
          <span className="dithar-daily-pick__hint">{t.dailyPicksHint}</span>
        )}
      </span>
      <span className="dithar-daily-pick__action" aria-hidden="true">
        {t.dailyPicksAction}
        <Arrow size={15} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </button>
  );
}
