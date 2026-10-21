import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { summaryLabels } from "../data/reminderLabels";
import { loadSummarySettings, saveSummarySettings } from "../lib/dailySummary";
import type { DailySummarySettings, SummaryContent } from "../lib/dailySummary";
import { getDailyActivity, todayLocalDate } from "../lib/stats";
import { buildSummaryAudio } from "../lib/dailySummary";
import { isRemindersNativeAvailable } from "../lib/remindersNative";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "../lib/audioAdhkarNative";

// Settings → ملخص نهاية اليوم: on/off, delivery time and content
// (statistics, encouragement, or both), plus what is recorded so far today
// — the same numbers the summary will use (lib/dailySummary.ts). Saving
// notifies remindersSync.ts, which re-arms the native summary at once.

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const INPUT_CLASS = "rounded-lg border px-2 py-1 text-[13px]";
const INPUT_STYLE = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };
const CONTENTS: SummaryContent[] = ["combined", "stats", "motivational"];

export function DailySummarySettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = summaryLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [settings, setSettings] = useState<DailySummarySettings>(() => loadSummarySettings());
  const today = getDailyActivity(todayLocalDate());
  const audio = buildSummaryAudio(todayLocalDate());
  const listening =
    audio.completedPlays === 0 && audio.listenedMs === 0
      ? null
      : [
          audio.completedPlays > 0 ? t.listeningPlays(audio.completedPlays) : null,
          audio.stoppedEarlyPlays > 0 ? t.listeningStoppedEarly(audio.stoppedEarlyPlays) : null,
          audio.sessions > 0 && audio.playsWithoutSession === 0 ? t.listeningSessions(audio.sessions) : null,
          audio.listenedMs > 0 ? t.listeningTime(t.listeningMinutes(Math.round(audio.listenedMs / 60_000)), audio.playsWithoutDuration > 0) : null,
        ]
          .filter((p): p is string => p !== null)
          .join(" · ");

  function update(next: DailySummarySettings) {
    setSettings(next);
    saveSummarySettings(next);
  }

  async function toggle() {
    if (!settings.enabled && isAudioAdhkarNativeAvailable()) {
      await AudioAdhkarNative.requestPermissions({ permissions: ["notifications"] }).catch(() => {});
    }
    update({ ...settings, enabled: !settings.enabled });
  }

  const parts = [
    today.wirds.includes("morning") ? t.wirdMorning : null,
    today.wirds.includes("evening") ? t.wirdEvening : null,
    today.prayerSessions > 0 ? t.prayer(today.prayerSessions) : null,
    today.tasbeehRepetitions > 0 ? t.tasbeeh(today.tasbeehRepetitions) : null,
    today.writtenRepetitions > 0 ? t.written(today.writtenRepetitions) : null,
  ].filter((p): p is string => p !== null);

  return (
    <div className="flex flex-1 flex-col pb-4" data-summary-settings="">
      <div className="dithar-sticky-header mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", ...primaryText }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={primaryText}>
          {t.pageTitle}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={CARD}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={primaryText}>
              {t.master}
            </p>
            <p className="mt-0.5 text-[11.5px]" style={muted}>
              {settings.enabled ? t.on : t.off}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            aria-label={t.master}
            data-summary-switch=""
            onClick={() => void toggle()}
            className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
            style={{
              borderColor: settings.enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
              background: settings.enabled ? "var(--color-primary)" : "var(--color-surface)",
              color: settings.enabled ? "var(--color-gold)" : "var(--color-text-primary)",
            }}
          >
            {settings.enabled ? t.disable : t.enable}
          </button>
        </div>
        <p className="text-[11.5px] leading-[1.7]" style={muted}>
          {t.intro}
        </p>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="summary-time" className="text-[13px]" style={primaryText}>
            {t.time}
          </label>
          <input id="summary-time" type="time" value={settings.time} onChange={(e) => e.target.value && update({ ...settings, time: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="summary-content" className="text-[13px]" style={primaryText}>
            {t.content}
          </label>
          <select id="summary-content" value={settings.content} onChange={(e) => update({ ...settings, content: e.target.value as SummaryContent })} className={`${INPUT_CLASS} max-w-[60%]`} style={INPUT_STYLE}>
            {CONTENTS.map((c) => (
              <option key={c} value={c}>
                {t.contentNames[c]}
              </option>
            ))}
          </select>
        </div>
        {!isRemindersNativeAvailable() && (
          <p className="text-[11.5px] leading-[1.6]" style={muted}>
            {t.webOnly}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-2xl border p-4" style={CARD} data-summary-today="">
        <p className="text-[13.5px] font-semibold" style={primaryText}>
          {t.todayPreview}
        </p>
        <p className="text-[12.5px] leading-[1.7]" style={parts.length ? primaryText : muted}>
          {/* Listening alone is still a record of today: never "nothing recorded" over it. */}
          {parts.length ? parts.join(" · ") : listening ? t.onlyListening : t.nothingYet}
        </p>
        <div className="border-t pt-2" style={{ borderColor: "var(--color-gold-soft)" }} data-summary-listening="">
          <p className="text-[12px] font-semibold" style={primaryText}>
            {t.listeningTitle}
          </p>
          <p className="text-[12px] leading-[1.7]" style={listening ? primaryText : muted}>
            {listening ?? t.listeningNone}
          </p>
          {audio.titles.length > 0 && (
            <p dir="rtl" className="text-[11.5px] leading-[1.7]" style={muted} data-summary-titles="">
              {t.listeningOf} {audio.titles.join("، ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
