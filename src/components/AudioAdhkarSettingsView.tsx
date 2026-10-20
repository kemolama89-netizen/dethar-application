import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import {
  MISC_INTERVAL_MAX,
  MISC_INTERVAL_MIN,
  MISC_INTERVAL_PRESETS,
  isValidMiscWindow,
  loadDailySchedule,
  loadExcludedAdhkar,
  loadMiscSchedule,
  loadSectionReciterChoice,
  loadSectionStatus,
  miscWindowCrossesMidnight,
  parseMiscInterval,
  saveDailySchedule,
  saveExcludedAdhkar,
  saveMiscSchedule,
  saveSectionReciterChoice,
} from "../lib/audioAdhkarScheduleSettings";
import type { DailyScheduleSettings, DailySection, MiscScheduleSettings, ScheduleSection, SectionReciterChoice } from "../lib/audioAdhkarScheduleSettings";
import { buildDailyAudioPlaylist, buildMiscAudioPlaylist, syncAudioAdhkarSchedules } from "../lib/audioAdhkarSchedules";
import type { AudioAdhkarScheduleResult } from "../lib/audioAdhkarSchedules";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "../lib/audioAdhkarNative";
import type { AudioAdhkarDiagnostics, NativeSection } from "../lib/audioAdhkarNative";
import { getAvailableQuranReciters } from "../data/quranReciters";
import { audioAdhkarSettingsLabels } from "../data/audioAdhkarSettingsLabels";
import { audioAdhkarOptionLabel } from "../data/audioAdhkarOptionLabels";
import { dailyDayTimesLabels, occasionLabels, weeklyScheduleLabels } from "../data/scheduleLabels";
import { WEEKDAYS, loadDailyDayTimes, saveDailyDayTimes } from "../lib/weeklySchedule";
import { hijriDateOf, loadOccasionSettings, occasionFor, saveOccasionSettings } from "../lib/islamicOccasions";
import { HIJRI_ADJUSTMENT_MAX, HIJRI_ADJUSTMENT_MIN, loadHijriAdjustment, saveHijriAdjustment } from "../lib/hijriAdjustment";
import { getDateTimeInfo } from "../lib/dateTime";
import { REMINDER_SOUNDS, loadReminderSound, previewReminderSound, saveReminderSound, stopReminderSoundPreview } from "../lib/adhkarReminderSounds";
import type { ReminderSoundChoice } from "../lib/adhkarReminderSounds";
import { useAudioAdhkarMaster } from "../lib/useAudioAdhkarMaster";

// Settings → إعدادات الأذكار الصوتية: three independent sections —
// Morning, Evening (each: automatic playback, daily start time, Quran
// reciter) and Miscellaneous (automatic playback, daily window, interval).
// Styled like the other Settings sub-views (SettingsScreen).

type Language = "ar" | "en";
type Labels = (typeof audioAdhkarSettingsLabels)["ar"];

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const INPUT_CLASS = "rounded-lg border px-2 py-1 text-[13px]";
const INPUT_STYLE = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { language, dir } = useLanguage();
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <div className="dithar-sticky-header mt-1 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={audioAdhkarSettingsLabels[language].back}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
      >
        <BackIcon size={18} strokeWidth={1.8} />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h1>
      <div className="h-9 w-9 shrink-0" aria-hidden="true" />
    </div>
  );
}

function formatTime(value: string, language: Language): string {
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(language === "ar" ? "ar-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit" });
}

function formatWhen(at: number, language: Language): string {
  return new Date(at).toLocaleString(language === "ar" ? "ar-u-nu-latn" : "en-US", { weekday: "long", hour: "numeric", minute: "2-digit" });
}

const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };

/**
 * Re-syncs every schedule (and reads native diagnostics) on open and
 * whenever the app comes back — e.g. from the "Alarms & reminders" system
 * page — so the status shown is current.
 */
function useScheduleStatus() {
  const [schedule, setSchedule] = useState<AudioAdhkarScheduleResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<AudioAdhkarDiagnostics | null>(null);
  const apply = useCallback(() => {
    syncAudioAdhkarSchedules().then(setSchedule, () => setSchedule(null));
    if (isAudioAdhkarNativeAvailable()) AudioAdhkarNative.getDiagnostics().then(setDiagnostics, () => setDiagnostics(null));
  }, []);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") apply();
    };
    apply();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [apply]);
  return { schedule, diagnostics, apply };
}

function Row({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[13px]" style={primaryText}>
        {label}
      </label>
      {children}
    </div>
  );
}

function EnableRow({ enabled, onToggle, t }: { enabled: boolean; onToggle: () => void; t: Labels }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold" style={primaryText}>
          {t.enableRow}
        </p>
        <p className="mt-0.5 text-[11.5px]" style={muted}>
          {enabled ? t.enabledStatus : t.disabledStatus}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={enabled ? t.disable : t.enable}
        className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
        style={{
          borderColor: enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
          background: enabled ? "var(--color-primary)" : "var(--color-surface)",
          color: enabled ? "var(--color-gold)" : "var(--color-text-primary)",
        }}
      >
        {enabled ? t.disable : t.enable}
      </button>
    </div>
  );
}

function ActionHint({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 text-[11.5px] leading-[1.6]" style={muted}>
        {text}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium"
        style={{ borderColor: "var(--color-gold)", color: "var(--color-text-primary)" }}
      >
        {action}
      </button>
    </div>
  );
}

const BACKGROUND_LAUNCH_HINT_KEY = "dithar.audioAdhkar.backgroundLaunchHintDismissed";

function readHintDismissed(): boolean {
  try {
    return localStorage.getItem(BACKGROUND_LAUNCH_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * HONOR/Huawei only: their "App launch" manager can hold DITHAR's alarms
 * after a swipe from Recents (see AlarmPolicy in AudioAdhkarLogic.kt).
 * Shown until dismissed once.
 */
function BackgroundLaunchHint({ t }: { t: Labels }) {
  const [dismissed, setDismissed] = useState(readHintDismissed);
  if (dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(BACKGROUND_LAUNCH_HINT_KEY, "1");
    } catch {
      // Not remembered: it shows again next time.
    }
  };
  const button = "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium";
  return (
    <div className="flex flex-col gap-2" data-background-launch-hint="">
      <p className="text-[11.5px] leading-[1.6]" style={muted}>
        {t.backgroundLaunchHint}
      </p>
      <div className="flex gap-2">
        <button type="button" className={button} style={{ borderColor: "var(--color-gold)", ...primaryText }} onClick={() => void AudioAdhkarNative.openBackgroundLaunchSettings().catch(() => {})}>
          {t.backgroundLaunchOpen}
        </button>
        <button type="button" data-dismiss-hint="" className={button} style={{ borderColor: "var(--color-gold-soft)", ...primaryText }} onClick={dismiss}>
          {t.backgroundLaunchDismiss}
        </button>
      </div>
    </div>
  );
}

/** Next run, permission hints, the web note and the adhan rule — the same for every section. */
function StatusBlock({
  section,
  enabled,
  schedule,
  diagnostics,
  t,
}: {
  section: NativeSection;
  enabled: boolean;
  schedule: AudioAdhkarScheduleResult | null;
  diagnostics: AudioAdhkarDiagnostics | null;
  t: Labels;
}) {
  const { language } = useLanguage();
  const scheduledAt = schedule?.available ? schedule[section].scheduledAt : null;
  return (
    <>
      {enabled && scheduledAt !== null && (
        <p className="text-[12px] font-medium" style={{ color: "var(--color-primary)" }} data-next-run="">
          {t.nextRun(formatWhen(scheduledAt, language))}
        </p>
      )}
      {enabled && schedule?.available && !schedule.exact && (
        <ActionHint text={t.exactNeeded} action={t.exactAllow} onAction={() => void AudioAdhkarNative.openExactAlarmSettings().catch(() => {})} />
      )}
      {enabled && diagnostics && !diagnostics.notifications && (
        <ActionHint text={t.notificationsOff} action={t.notificationsAllow} onAction={() => void AudioAdhkarNative.openNotificationSettings().catch(() => {})} />
      )}
      {enabled && diagnostics?.backgroundLaunchManaged && <BackgroundLaunchHint t={t} />}
      {!isAudioAdhkarNativeAvailable() && (
        <p className="text-[11.5px] leading-[1.6]" style={muted}>
          {t.webOnly}
        </p>
      )}
      <p className="text-[11.5px] leading-[1.6]" style={muted} data-adhan-pause-note="">
        {t.adhanPause}
      </p>
    </>
  );
}

function Diagnostics({ diagnostics, t }: { diagnostics: AudioAdhkarDiagnostics | null; t: Labels }) {
  const [report, setReport] = useState<string | null>(null);
  if (!diagnostics) return null;
  const button = "rounded-full border px-3 py-1 text-[11.5px] font-medium";
  const buttonStyle = { borderColor: "var(--color-gold)", color: "var(--color-text-primary)" };
  return (
    <details className="mt-3 rounded-2xl border p-3 text-[11px]" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-muted)" }}>
      <summary className="cursor-pointer text-[12px]">{t.diagnostics}</summary>
      <p className="mt-2" dir="ltr">
        exactAlarms={String(diagnostics.exactAlarms)} · notifications={String(diagnostics.notifications)} · batteryUnrestricted=
        {String(diagnostics.ignoringBatteryOptimizations)} · standbyBucket={diagnostics.standbyBucket}
      </p>
      {/* The full background-playback trace (AudioAdhkarTrace.kt): every stage, exit reasons, device state. */}
      <div className="mt-2 flex flex-wrap gap-2" data-diagnostics-actions="">
        <button type="button" className={button} style={buttonStyle} onClick={() => void AudioAdhkarNative.shareDiagnostics().catch(() => {})}>
          {t.shareLog}
        </button>
        <button
          type="button"
          className={button}
          style={buttonStyle}
          onClick={() => {
            if (report !== null) return setReport(null);
            AudioAdhkarNative.getDiagnosticsReport().then(({ report: text }) => setReport(text), () => setReport(""));
          }}
        >
          {report !== null ? t.hideLog : t.viewLog}
        </button>
        <button type="button" className={button} style={buttonStyle} onClick={() => void AudioAdhkarNative.clearDiagnostics().then(() => setReport(null), () => {})}>
          {t.clearLog}
        </button>
      </div>
      {report !== null && (
        <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap break-all text-[10px] leading-[1.4]" dir="ltr" data-diagnostics-report="">
          {report}
        </pre>
      )}
      <ol className="mt-1 flex flex-col gap-0.5" dir="ltr">
        {diagnostics.events
          .slice()
          .reverse()
          .map((event, i) => {
            const [ms, message] = event.split("|");
            return (
              <li key={i}>
                {new Date(Number(ms)).toLocaleString("en-GB")} — {message.replace(/\b1\d{12}\b/g, (n) => new Date(Number(n)).toLocaleString("en-GB"))}
              </li>
            );
          })}
      </ol>
    </details>
  );
}

/** The system media notification needs this on Android 13+; asked only on an explicit enable tap. */
async function askForNotificationsOnEnable(enabling: boolean) {
  if (enabling && isAudioAdhkarNativeAvailable()) {
    await AudioAdhkarNative.requestPermissions({ permissions: ["notifications"] }).catch(() => {});
  }
}

/**
 * Which adhkar a section plays automatically: a checklist of every dhikr
 * that has audio, in its order, with Select all / Deselect all. Only the
 * checked ones are scheduled; with none checked, nothing is.
 */
function AdhkarChecklist({ section, items, onChange }: { section: ScheduleSection; items: { id: string; title: string }[]; onChange: () => void }) {
  const { language } = useLanguage();
  // Shown in the interface language; saved by id only (audioAdhkarOptionLabels.ts).
  const label = (item: { id: string; title: string }) => audioAdhkarOptionLabel(section, item.id, language) ?? { title: item.title };
  const t = audioAdhkarSettingsLabels[language];
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set(loadExcludedAdhkar(section)));
  const selected = items.filter((item) => !excluded.has(item.id)).length;

  function save(next: Set<string>) {
    setExcluded(next);
    saveExcludedAdhkar(section, [...next]);
    onChange();
  }

  function toggle(id: string) {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    save(next);
  }

  const smallButton = "rounded-full border px-3 py-1 text-[12px] font-medium";
  return (
    <div className="mt-3 rounded-2xl border p-4" style={CARD} data-adhkar-checklist={section}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold" style={primaryText}>
          {t.selection} <span style={muted}>({t.selectionCount(selected, items.length)})</span>
        </p>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" data-select-all="" onClick={() => save(new Set([...excluded].filter((id) => !items.some((i) => i.id === id))))} className={smallButton} style={{ borderColor: "var(--color-gold)", ...primaryText }}>
          {t.selectAll}
        </button>
        <button type="button" data-deselect-all="" onClick={() => save(new Set([...excluded, ...items.map((i) => i.id)]))} className={smallButton} style={{ borderColor: "var(--color-gold-soft)", ...primaryText }}>
          {t.deselectAll}
        </button>
      </div>
      {selected === 0 && (
        <p className="mt-2 text-[12px] font-medium" style={{ color: "var(--color-primary)" }} role="status" data-none-selected="">
          {t.noneSelected}
        </p>
      )}
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-start gap-2 py-1 text-[13px]" style={primaryText}>
              <input type="checkbox" data-adhkar-id={item.id} checked={!excluded.has(item.id)} onChange={() => toggle(item.id)} className="mt-1 shrink-0" style={{ accentColor: "var(--color-primary)" }} />
              <span className="min-w-0">
                <span className="line-clamp-2 block" dir={language === "en" ? "ltr" : "rtl"}>
                  {label(item).title}
                </span>
                {label(item).subtitle && (
                  <span className="line-clamp-1 block text-[11.5px]" style={muted}>
                    {label(item).subtitle}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Morning/Evening "customize by day": an optional start time per weekday
 * (empty = the usual start time). Saved by weekday index; the plan stays
 * inside the section's prayer-time window either way.
 */
function DailyDayTimes({ section, onChange }: { section: DailySection; onChange: () => void }) {
  const { language } = useLanguage();
  const t = dailyDayTimesLabels[language];
  const days = weeklyScheduleLabels[language].weekdays;
  const [times, setTimes] = useState<string[]>(() => loadDailyDayTimes(section));
  const set = (day: number, value: string) => {
    const next = times.map((v, i) => (i === day ? value : v));
    setTimes(next);
    saveDailyDayTimes(section, next);
    onChange();
  };
  return (
    <details className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-gold-soft)" }} data-day-times={section} open={times.some(Boolean)}>
      <summary className="cursor-pointer text-[13px] font-medium" style={primaryText}>
        {t.summary}
      </summary>
      <p className="mt-2 text-[11.5px] leading-[1.6]" style={muted}>
        {t.hint}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {WEEKDAYS.map((day) => (
          <div key={day} className="flex items-center justify-between gap-3">
            <label htmlFor={`${section}-day-${day}`} className="text-[12.5px]" style={primaryText}>
              {days[day]}
            </label>
            <div className="flex items-center gap-2">
              {!times[day] && (
                <span className="text-[11px]" style={muted}>
                  {t.usual}
                </span>
              )}
              <input id={`${section}-day-${day}`} type="time" value={times[day]} onChange={(e) => set(day, e.target.value)} className={INPUT_CLASS} style={INPUT_STYLE} />
              {times[day] && (
                <button type="button" onClick={() => set(day, "")} className="text-[11px] underline" style={muted}>
                  {t.clear}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Misc: Fridays and Islamic occasions (lib/islamicOccasions.ts) — on/off, the Hijri adjustment, today's status, the evidence. */
function OccasionsCard({ onChange }: { onChange: () => void }) {
  const { language } = useLanguage();
  const t = occasionLabels[language];
  const [enabled, setEnabled] = useState(() => loadOccasionSettings().enabled);
  const [adjustment, setAdjustment] = useState(() => loadHijriAdjustment());
  const now = new Date();
  const today = enabled ? occasionFor(now, adjustment) : null;
  const hijriKnown = hijriDateOf(now, adjustment) !== null;

  function toggle() {
    saveOccasionSettings({ enabled: !enabled });
    setEnabled(!enabled);
    onChange();
  }

  function adjust(days: number) {
    saveHijriAdjustment(days);
    setAdjustment(days);
    onChange();
  }

  const options: number[] = [];
  for (let d = HIJRI_ADJUSTMENT_MIN; d <= HIJRI_ADJUSTMENT_MAX; d++) options.push(d);
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border p-4" style={CARD} data-occasions="">
      <p className="text-[14px] font-semibold" style={primaryText}>
        {t.title}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px]" style={primaryText}>
          {t.enableRow}
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={t.enableRow}
          data-occasions-switch=""
          onClick={toggle}
          className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
          style={{
            borderColor: enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
            background: enabled ? "var(--color-primary)" : "var(--color-surface)",
            color: enabled ? "var(--color-gold)" : "var(--color-text-primary)",
          }}
        >
          {enabled ? audioAdhkarSettingsLabels[language].disable : audioAdhkarSettingsLabels[language].enable}
        </button>
      </div>
      <p className="text-[11.5px] leading-[1.7]" style={muted}>
        {t.intro}
      </p>
      <p className="text-[12px] font-medium" style={{ color: "var(--color-primary)" }} data-occasion-today={today ?? "none"}>
        {today ? t.todayIs(t.names[today], t.details[today].plays) : t.todayNormal}
      </p>
      {hijriKnown ? (
        <p className="text-[11.5px]" style={muted}>
          {t.todayHijri(getDateTimeInfo(now, language).hijriDate.formatted)}
        </p>
      ) : (
        <p className="text-[11.5px] leading-[1.6]" style={muted} role="status">
          {t.noCalendar}
        </p>
      )}
      <Row label={t.hijriAdjust} htmlFor="hijri-adjustment">
        <select id="hijri-adjustment" value={adjustment} onChange={(e) => adjust(Number(e.target.value))} className={`${INPUT_CLASS} max-w-[55%]`} style={INPUT_STYLE}>
          {options.map((d) => (
            <option key={d} value={d}>
              {t.hijriAdjustOption(d)}
            </option>
          ))}
        </select>
      </Row>
      <p className="text-[11px] leading-[1.6]" style={muted}>
        {t.hijriAdjustHint}
      </p>
      <details className="text-[11.5px]" style={muted}>
        <summary className="cursor-pointer text-[12px]" style={primaryText}>
          {t.evidenceSummary}
        </summary>
        <ul className="mt-2 flex flex-col gap-2">
          {(["friday", "arafah", "dhulhijjah", "eid"] as const).map((key) => (
            <li key={key} className="leading-[1.7]">
              <span className="font-semibold" style={primaryText}>
                {t.names[key]}:
              </span>{" "}
              <span dir={language === "en" ? "ltr" : "rtl"}>{t.details[key].plays}</span>
              <br />
              <span>{t.details[key].evidence}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 leading-[1.6]">{t.ramadanNote}</p>
      </details>
    </div>
  );
}

/** Morning/Evening: the calm sound of the one-minute reminder — choose, preview, or turn off. */
function ReminderSoundRow({ section, onChange }: { section: DailySection; onChange: () => void }) {
  const { language } = useLanguage();
  const t = audioAdhkarSettingsLabels[language];
  const [choice, setChoice] = useState<ReminderSoundChoice>(() => loadReminderSound(section));
  useEffect(() => stopReminderSoundPreview, []);
  const id = `${section}-reminder-sound`;
  return (
    <div className="flex flex-col gap-1.5" data-reminder-sound={section}>
      <Row label={t.reminderSound} htmlFor={id}>
        <div className="flex items-center gap-2">
          <select
            id={id}
            value={choice}
            onChange={(e) => {
              const next = e.target.value as ReminderSoundChoice;
              setChoice(next);
              saveReminderSound(section, next);
              onChange();
              if (next !== "off") previewReminderSound(next);
              else stopReminderSoundPreview();
            }}
            className={`${INPUT_CLASS} max-w-[11rem]`}
            style={INPUT_STYLE}
          >
            {REMINDER_SOUNDS[section].map((sound) => (
              <option key={sound} value={sound}>
                {t.reminderSoundNames[sound]}
              </option>
            ))}
            <option value="off">{t.reminderSoundOff}</option>
          </select>
          {choice !== "off" && (
            <button
              type="button"
              data-preview-sound=""
              onClick={() => previewReminderSound(choice)}
              className="shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-medium"
              style={{ borderColor: "var(--color-gold)", ...primaryText }}
            >
              {t.preview}
            </button>
          )}
        </div>
      </Row>
      <p className="text-[11px] leading-[1.6]" style={muted}>
        {t.reminderSoundHint}
      </p>
    </div>
  );
}

function DailyView({ section, onBack }: { section: DailySection; onBack: () => void }) {
  const { language } = useLanguage();
  const t = audioAdhkarSettingsLabels[language];
  const [settings, setSettings] = useState<DailyScheduleSettings>(() => loadDailySchedule(section));
  const [reciter, setReciter] = useState<SectionReciterChoice>(() => loadSectionReciterChoice(section));
  const { schedule, diagnostics, apply } = useScheduleStatus();
  // Built on every render (cheap): every dhikr with audio, for the checklist, and how many are selected.
  const items = buildDailyAudioPlaylist(section, { all: true }).map((p) => ({ id: p.dhikrId, title: p.title }));
  const [selected, setSelected] = useState(() => buildDailyAudioPlaylist(section).length);

  function update(next: DailyScheduleSettings) {
    setSettings(next);
    saveDailySchedule(section, next);
    apply();
  }

  async function handleToggle() {
    await askForNotificationsOnEnable(!settings.enabled);
    update({ ...settings, enabled: !settings.enabled });
  }

  function chooseReciter(choice: SectionReciterChoice) {
    setReciter(choice);
    saveSectionReciterChoice(section, choice);
    apply();
  }

  const timeId = `${section}-audio-start-time`;
  const reciterSelectId = `${section}-audio-reciter`;

  return (
    <div className="flex flex-1 flex-col" data-audio-schedule-section={section}>
      <Header title={t[section]} onBack={onBack} />

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={CARD}>
        <EnableRow enabled={settings.enabled} onToggle={() => void handleToggle()} t={t} />
        <Row label={t.startTime} htmlFor={timeId}>
          <input id={timeId} type="time" value={settings.startTime} onChange={(e) => update({ ...settings, startTime: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
        </Row>
        {settings.enabled && !settings.startTime && (
          <p className="text-[11.5px]" style={muted}>
            {t.chooseTime}
          </p>
        )}
        <DailyDayTimes section={section} onChange={apply} />
        <ReminderSoundRow section={section} onChange={apply} />
        <p className="text-[11.5px] leading-[1.6]" style={muted} data-daily-window={section}>
          {t.dailyWindow[section]}
        </p>
        <Row label={t.reciter} htmlFor={reciterSelectId}>
          <select id={reciterSelectId} value={reciter} onChange={(e) => chooseReciter(e.target.value)} className={`${INPUT_CLASS} max-w-[55%]`} style={INPUT_STYLE}>
            <option value="random">{t.reciterRandom}</option>
            {getAvailableQuranReciters().map((r) => (
              <option key={r.id} value={r.id}>
                {r.name[language]}
              </option>
            ))}
          </select>
        </Row>
        <StatusBlock section={section} enabled={settings.enabled && selected > 0} schedule={schedule} diagnostics={diagnostics} t={t} />
      </div>

      <AdhkarChecklist
        section={section}
        items={items}
        onChange={() => {
          setSelected(buildDailyAudioPlaylist(section).length);
          apply();
        }}
      />

      <Diagnostics diagnostics={diagnostics} t={t} />
    </div>
  );
}

function MiscView({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const t = audioAdhkarSettingsLabels[language];
  const [settings, setSettings] = useState<MiscScheduleSettings>(() => loadMiscSchedule());
  const { schedule, diagnostics, apply } = useScheduleStatus();
  const items = buildMiscAudioPlaylist({ all: true }).map((p) => ({ id: p.dhikrId, title: p.title }));
  const [selected, setSelected] = useState(() => buildMiscAudioPlaylist().length);
  const validWindow = isValidMiscWindow(settings);
  const isPreset = (MISC_INTERVAL_PRESETS as readonly number[]).includes(settings.intervalMinutes);
  const [custom, setCustom] = useState(() => !isPreset);
  const [customText, setCustomText] = useState(() => String(settings.intervalMinutes));
  const customInvalid = custom && parseMiscInterval(customText) === null;

  function update(next: MiscScheduleSettings) {
    setSettings(next);
    saveMiscSchedule(next);
    apply();
  }

  async function handleToggle() {
    await askForNotificationsOnEnable(!settings.enabled);
    update({ ...settings, enabled: !settings.enabled });
  }

  return (
    <div className="flex flex-1 flex-col" data-audio-schedule-section="misc">
      <Header title={t.misc} onBack={onBack} />

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={CARD}>
        <EnableRow enabled={settings.enabled} onToggle={() => void handleToggle()} t={t} />
        <Row label={t.startTime} htmlFor="misc-audio-start-time">
          <input
            id="misc-audio-start-time"
            type="time"
            value={settings.startTime}
            onChange={(e) => e.target.value && update({ ...settings, startTime: e.target.value })}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </Row>
        <Row label={t.endTime} htmlFor="misc-audio-end-time">
          <input
            id="misc-audio-end-time"
            type="time"
            value={settings.endTime}
            onChange={(e) => e.target.value && update({ ...settings, endTime: e.target.value })}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          />
        </Row>
        {!validWindow && (
          <p className="text-[11.5px]" style={muted} role="alert">
            {t.invalidWindow}
          </p>
        )}
        {miscWindowCrossesMidnight(settings) && (
          <p className="text-[11.5px]" style={muted}>
            {t.crossesMidnight}
          </p>
        )}
        <Row label={t.interval} htmlFor="misc-audio-interval">
          <select
            id="misc-audio-interval"
            value={custom ? "custom" : settings.intervalMinutes}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setCustom(true);
                setCustomText(String(settings.intervalMinutes));
                return;
              }
              setCustom(false);
              update({ ...settings, intervalMinutes: Number(e.target.value) });
            }}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
          >
            {MISC_INTERVAL_PRESETS.map((m) => (
              <option key={m} value={m}>
                {t.intervalLabel(m)}
              </option>
            ))}
            <option value="custom">{t.intervalCustom}</option>
          </select>
        </Row>
        {custom && (
          <Row label={t.customMinutes} htmlFor="misc-audio-custom-interval">
            <input
              id="misc-audio-custom-interval"
              type="number"
              inputMode="numeric"
              min={MISC_INTERVAL_MIN}
              max={MISC_INTERVAL_MAX}
              step={1}
              value={customText}
              aria-invalid={customInvalid}
              onChange={(e) => {
                setCustomText(e.target.value);
                // Only a valid value is saved (and scheduled); an invalid one keeps the last valid interval.
                const minutes = parseMiscInterval(e.target.value);
                if (minutes !== null) update({ ...settings, intervalMinutes: minutes });
              }}
              className={`${INPUT_CLASS} w-24`}
              style={{ ...INPUT_STYLE, borderColor: customInvalid ? "var(--color-primary)" : INPUT_STYLE.borderColor }}
            />
          </Row>
        )}
        {customInvalid && (
          <p className="text-[11.5px] font-medium" style={{ color: "var(--color-primary)" }} role="alert" data-interval-error="">
            {t.intervalInvalid(MISC_INTERVAL_MIN, MISC_INTERVAL_MAX)}
          </p>
        )}
        <StatusBlock section="misc" enabled={settings.enabled && validWindow && selected > 0} schedule={schedule} diagnostics={diagnostics} t={t} />
      </div>

      <AdhkarChecklist
        section="misc"
        items={items}
        onChange={() => {
          setSelected(buildMiscAudioPlaylist().length);
          apply();
        }}
      />
      {selected > 0 && (
        <p className="mt-2 px-1 text-[11.5px]" style={muted}>
          {t.miscPlaylist(selected)}
        </p>
      )}

      <OccasionsCard onChange={apply} />

      <Diagnostics diagnostics={diagnostics} t={t} />
    </div>
  );
}

type Page = "list" | DailySection | "misc";

export function AudioAdhkarSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = audioAdhkarSettingsLabels[language];
  const [page, setPage] = useState<Page>("list");
  const master = useAudioAdhkarMaster();
  const ForwardIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  if (page === "morning" || page === "evening") return <DailyView section={page} onBack={() => setPage("list")} />;
  if (page === "misc") return <MiscView onBack={() => setPage("list")} />;

  // Read fresh on every render — this list re-renders when returning from a section page.
  // Each section's OWN switch (loadSectionStatus — the same status its page and the native sync use);
  // the master switch never changes it, it only dims the list while off.
  const status = (section: ScheduleSection): string => {
    const { enabled, issue } = loadSectionStatus(section);
    if (!enabled) return t.disabledStatus;
    if (issue === "noStartTime") return `${t.enabledStatus} — ${t.issueNoStartTime}`;
    if (issue === "invalidWindow") return `${t.enabledStatus} — ${t.issueInvalidWindow}`;
    if (section === "misc") {
      const misc = loadMiscSchedule();
      return `${t.enabledStatus} — ${t.windowSummary(formatTime(misc.startTime, language), formatTime(misc.endTime, language), t.intervalLabel(misc.intervalMinutes))}`;
    }
    return `${t.enabledStatus} — ${formatTime(loadDailySchedule(section).startTime, language)}`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header title={t.pageTitle} onBack={onBack} />
      {/* The master switch — the same one as the home screen's toggle beside "الصلاة القادمة". */}
      <div className="mt-4 flex flex-col gap-2 rounded-2xl border p-4" style={CARD} data-audio-adhkar-master="">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={primaryText}>
              {t.master}
            </p>
            <p className="mt-0.5 text-[11.5px]" style={muted}>
              {master.enabled ? t.enabledStatus : t.disabledStatus}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={master.enabled}
            aria-label={t.master}
            data-master-switch=""
            onClick={master.toggle}
            className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
            style={{
              borderColor: master.enabled ? "var(--color-gold)" : "var(--color-gold-soft)",
              background: master.enabled ? "var(--color-primary)" : "var(--color-surface)",
              color: master.enabled ? "var(--color-gold)" : "var(--color-text-primary)",
            }}
          >
            {master.enabled ? t.disable : t.enable}
          </button>
        </div>
        <p className="text-[11.5px] leading-[1.6]" style={muted} role={master.enabled ? undefined : "status"}>
          {master.enabled ? t.masterHint : t.masterOff}
        </p>
      </div>
      <div className="mt-2.5 flex flex-col gap-2.5" style={{ opacity: master.enabled ? 1 : 0.6 }}>
        {(["morning", "evening", "misc"] as const).map((section) => (
          <button
            key={section}
            type="button"
            data-audio-schedule-row={section}
            onClick={() => setPage(section)}
            className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
            style={CARD}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold" style={primaryText}>
                {t[section]}
              </span>
              <span className="block text-[11.5px]" style={muted}>
                {status(section)}
              </span>
            </span>
            <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={muted} />
          </button>
        ))}
      </div>
    </div>
  );
}
