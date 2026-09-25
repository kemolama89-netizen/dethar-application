import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { loadEveningAudioSettings, saveEveningAudioSettings } from "../lib/eveningAudioSettings";
import type { EveningAudioSettings } from "../lib/eveningAudioSettings";
import { buildEveningAudioPlaylist, syncEveningAudioSchedule } from "../lib/eveningAudioSchedule";
import type { EveningScheduleResult } from "../lib/eveningAudioSchedule";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "../lib/audioAdhkarNative";
import type { AudioAdhkarDiagnostics } from "../lib/audioAdhkarNative";
import { audioAdhkarSettingsLabels } from "../data/audioAdhkarSettingsLabels";

// Settings → إعدادات الأذكار الصوتية → أذكار المساء. Evening only for now —
// it is the only list with recordings. Styled exactly like the Reminders
// settings view (SettingsScreen's NotificationsView).


function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { language, dir } = useLanguage();
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  return (
    <div className="mt-1 flex items-center gap-2">
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

function formatTime(value: string, language: "ar" | "en"): string {
  const [h, m] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(language === "ar" ? "ar-u-nu-latn" : "en-US", { hour: "numeric", minute: "2-digit" });
}

function EveningView({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const t = audioAdhkarSettingsLabels[language];
  const [settings, setSettings] = useState<EveningAudioSettings>(() => loadEveningAudioSettings());
  const [schedule, setSchedule] = useState<EveningScheduleResult | null>(null);
  const playlist = useMemo(() => buildEveningAudioPlaylist(), []);
  const native = isAudioAdhkarNativeAvailable();

  const [diagnostics, setDiagnostics] = useState<AudioAdhkarDiagnostics | null>(null);
  const apply = useCallback((next: EveningAudioSettings) => {
    syncEveningAudioSchedule(next).then(setSchedule, () => setSchedule(null));
    if (isAudioAdhkarNativeAvailable()) AudioAdhkarNative.getDiagnostics().then(setDiagnostics, () => setDiagnostics(null));
  }, []);

  // Re-read on open and whenever the app comes back (e.g. from the
  // "Alarms & reminders" system page), so the status is current.
  useEffect(() => {
    const refresh = () => apply(loadEveningAudioSettings());
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [apply]);

  function update(next: EveningAudioSettings) {
    setSettings(next);
    saveEveningAudioSettings(next);
    apply(next);
  }

  async function handleToggle() {
    const enabling = !settings.eveningAudioEnabled;
    if (enabling && native) {
      // The system media notification needs this on Android 13+; asked only on an explicit enable tap.
      await AudioAdhkarNative.requestPermissions({ permissions: ["notifications"] }).catch(() => {});
    }
    update({ ...settings, eveningAudioEnabled: enabling });
  }

  const scheduledAt = schedule?.available ? schedule.scheduledAt : null;

  return (
    <div className="flex flex-1 flex-col">
      <Header title={t.evening} onBack={onBack} />

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t.enableRow}
            </p>
            <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {settings.eveningAudioEnabled ? t.enabledStatus : t.disabledStatus}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleToggle()}
            aria-pressed={settings.eveningAudioEnabled}
            aria-label={settings.eveningAudioEnabled ? t.disable : t.enable}
            className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
            style={{
              borderColor: settings.eveningAudioEnabled ? "var(--color-gold)" : "var(--color-gold-soft)",
              background: settings.eveningAudioEnabled ? "var(--color-primary)" : "var(--color-surface)",
              color: settings.eveningAudioEnabled ? "var(--color-gold)" : "var(--color-text-primary)",
            }}
          >
            {settings.eveningAudioEnabled ? t.disable : t.enable}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="evening-audio-start-time" className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>
            {t.startTime}
          </label>
          <input
            id="evening-audio-start-time"
            type="time"
            value={settings.eveningAudioStartTime}
            onChange={(e) => update({ ...settings, eveningAudioStartTime: e.target.value })}
            className="rounded-lg border px-2 py-1 text-[13px]"
            style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
          />
        </div>

        {settings.eveningAudioEnabled && !settings.eveningAudioStartTime && (
          <p className="text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
            {t.chooseTime}
          </p>
        )}

        {settings.eveningAudioEnabled && scheduledAt !== null && (
          <p className="text-[12px] font-medium" style={{ color: "var(--color-primary)" }} data-next-run="">
            {t.nextRun(
              new Date(scheduledAt).toLocaleString(language === "ar" ? "ar-u-nu-latn" : "en-US", {
                weekday: "long",
                hour: "numeric",
                minute: "2-digit",
              }),
            )}
          </p>
        )}

        {settings.eveningAudioEnabled && schedule?.available && !schedule.exact && (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[11.5px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
              {t.exactNeeded}
            </p>
            <button
              type="button"
              onClick={() => void AudioAdhkarNative.openExactAlarmSettings().catch(() => {})}
              className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium"
              style={{ borderColor: "var(--color-gold)", color: "var(--color-text-primary)" }}
            >
              {t.exactAllow}
            </button>
          </div>
        )}

        {settings.eveningAudioEnabled && diagnostics && !diagnostics.notifications && (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[11.5px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
              {t.notificationsOff}
            </p>
            <button
              type="button"
              onClick={() => void AudioAdhkarNative.openNotificationSettings().catch(() => {})}
              className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium"
              style={{ borderColor: "var(--color-gold)", color: "var(--color-text-primary)" }}
            >
              {t.notificationsAllow}
            </button>
          </div>
        )}

        {!native && (
          <p className="text-[11.5px] leading-[1.6]" style={{ color: "var(--color-text-muted)" }}>
            {t.webOnly}
          </p>
        )}
      </div>

      <div className="mt-3 rounded-2xl border p-4" style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}>
        <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
          {t.playlist(playlist.length)}
        </p>
        <ol className="mt-2 flex list-inside list-decimal flex-col gap-1 text-[13px]" style={{ color: "var(--color-text-primary)" }}>
          {playlist.map((item) => (
            <li key={item.dhikrId} data-playlist-id={item.dhikrId}>
              {item.title}
            </li>
          ))}
        </ol>
      </div>

      {diagnostics && (
        <details className="mt-3 rounded-2xl border p-3 text-[11px]" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-muted)" }}>
          <summary className="cursor-pointer text-[12px]">{t.diagnostics}</summary>
          <p className="mt-2" dir="ltr">
            exactAlarms={String(diagnostics.exactAlarms)} · notifications={String(diagnostics.notifications)} · batteryUnrestricted=
            {String(diagnostics.ignoringBatteryOptimizations)} · standbyBucket={diagnostics.standbyBucket}
          </p>
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
      )}
    </div>
  );
}

export function AudioAdhkarSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = audioAdhkarSettingsLabels[language];
  const [page, setPage] = useState<"list" | "evening">("list");
  const ForwardIcon = dir === "rtl" ? ChevronLeft : ChevronRight;
  // Read fresh on every render — this list re-renders when returning from the Evening page.
  const settings = loadEveningAudioSettings();

  if (page === "evening") return <EveningView onBack={() => setPage("list")} />;

  return (
    <div className="flex flex-1 flex-col">
      <Header title={t.pageTitle} onBack={onBack} />
      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setPage("evening")}
          className="flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-start"
          style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" }}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {t.evening}
            </span>
            <span className="block text-[11.5px]" style={{ color: "var(--color-text-muted)" }}>
              {settings.eveningAudioEnabled && settings.eveningAudioStartTime
                ? `${t.enabledStatus} — ${formatTime(settings.eveningAudioStartTime, language)}`
                : t.disabledStatus}
            </span>
          </span>
          <ForwardIcon size={16} strokeWidth={1.8} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
        </button>
      </div>
    </div>
  );
}
