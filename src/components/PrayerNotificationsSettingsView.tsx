import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { prayerNames } from "../data/content";
import { prayerNotificationLabels } from "../data/prayerNotificationLabels";
import { NOTIFIED_PRAYERS, loadPrayerReminderSettings, savePrayerReminderSettings, subscribePrayerReminderSettings } from "../lib/prayerReminderSettings";
import type { PrayerReminderSettings } from "../lib/prayerReminderSettings";
import {
  PrayerNotificationsNative,
  isPrayerNotificationsAvailable,
  setPrayerNotificationsEnabled,
  syncPrayerNotifications,
} from "../lib/prayerNotifications";
import type { PrayerNotificationStatus } from "../lib/prayerNotifications";
import { knownPrayerLocation } from "../lib/prayerSchedule";

// Settings → تنبيهات الصلاة: the master switch (the same one as the Prayer
// Times card's reminder toggle) and one switch per prayer. Every change is
// saved and re-schedules at once. Styled like the other Settings sub-pages.

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };

function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: () => void; label: string; id?: string }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "var(--color-primary)" : "var(--color-gold-soft)" }}
    >
      <span
        className="absolute top-1 h-4 w-4 rounded-full transition-all"
        style={{ background: checked ? "var(--color-gold)" : "var(--color-surface)", insetInlineStart: checked ? "1.5rem" : "0.25rem" }}
      />
    </button>
  );
}

export function PrayerNotificationsSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = prayerNotificationLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const native = isPrayerNotificationsAvailable();
  const [settings, setSettings] = useState<PrayerReminderSettings>(() => loadPrayerReminderSettings());
  const [status, setStatus] = useState<PrayerNotificationStatus | null>(null);
  const locationKnown = knownPrayerLocation() !== null;

  const resync = useCallback(() => {
    syncPrayerNotifications(new Date(), language).then(setStatus, () => setStatus(null));
  }, [language]);

  // Current status on open and whenever the app comes back (e.g. from a system permission page).
  useEffect(() => {
    if (!native) return;
    const refresh = () => {
      if (document.visibilityState === "visible") PrayerNotificationsNative.getStatus().then(setStatus, () => setStatus(null));
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [native]);

  // The Prayer Times card's toggle is the same master: follow it.
  useEffect(() => subscribePrayerReminderSettings(setSettings), []);

  function update(next: PrayerReminderSettings) {
    setSettings(next);
    savePrayerReminderSettings(next);
    resync();
  }

  function toggleMaster() {
    setPrayerNotificationsEnabled(!settings.enabled, language).then(setStatus, () => setStatus(null));
  }

  const anyPrayer = NOTIFIED_PRAYERS.some((p) => settings.prayers[p]);
  const nextAt = settings.enabled ? (status?.nextAt ?? null) : null;

  return (
    <div className="flex flex-1 flex-col" data-prayer-notifications="">
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t.back}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
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
              {settings.enabled ? t.enabledStatus : t.disabledStatus}
            </p>
            <p className="mt-0.5 text-[11px] leading-[1.5]" style={muted} data-master-hint="">
              {t.masterHint}
            </p>
          </div>
          <button
            type="button"
            data-master=""
            onClick={toggleMaster}
            aria-pressed={settings.enabled}
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
        {nextAt !== null && (
          <p className="text-[12px] font-medium" style={{ color: "var(--color-primary)" }} data-next-notification="">
            {t.nextNotification(new Date(nextAt).toLocaleString(language === "ar" ? "ar-u-nu-latn" : "en-US", { weekday: "long", hour: "numeric", minute: "2-digit" }))}
          </p>
        )}
        {settings.enabled && native && status && !status.notifications && (
          <Hint text={t.notificationsOff} action={t.notificationsAllow} onAction={() => void PrayerNotificationsNative.openNotificationSettings().catch(() => {})} />
        )}
        {settings.enabled && native && status && !status.exact && (
          <Hint text={t.exactNeeded} action={t.exactAllow} onAction={() => void PrayerNotificationsNative.openExactAlarmSettings().catch(() => {})} />
        )}
        {settings.enabled && !locationKnown && (
          <p className="text-[11.5px] leading-[1.6]" style={muted} role="status">
            {t.locationUnknown}
          </p>
        )}
        {!native && (
          <p className="text-[11.5px] leading-[1.6]" style={muted}>
            {t.webOnly}
          </p>
        )}
      </div>

      <div className="mt-3 rounded-2xl border p-4" style={{ ...CARD, opacity: settings.enabled ? 1 : 0.6 }}>
        <p className="text-[13px] font-semibold" style={primaryText}>
          {t.perPrayer}
        </p>
        <p className="mt-0.5 text-[11.5px]" style={muted}>
          {t.perPrayerHint}
        </p>
        <ul className="mt-2 flex flex-col">
          {NOTIFIED_PRAYERS.map((prayer) => (
            <li key={prayer} className="flex items-center justify-between gap-3 py-2" data-prayer-row={prayer}>
              <label htmlFor={`prayer-notify-${prayer}`} className="text-[14px]" style={primaryText}>
                {prayerNames[language][prayer]}
              </label>
              <Switch
                id={`prayer-notify-${prayer}`}
                checked={settings.prayers[prayer]}
                label={prayerNames[language][prayer]}
                onChange={() => update({ ...settings, prayers: { ...settings.prayers, [prayer]: !settings.prayers[prayer] } })}
              />
            </li>
          ))}
        </ul>
        {!anyPrayer && (
          <p className="mt-1 text-[12px] font-medium" style={{ color: "var(--color-primary)" }} role="status">
            {t.noPrayer}
          </p>
        )}
      </div>

      <p className="mt-3 px-1 text-[11.5px] leading-[1.6]" style={muted}>
        {t.source} {t.noAdhan}
      </p>

      {status?.events && (
        <details className="mt-3 rounded-2xl border p-3 text-[11px]" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-muted)" }} data-prayer-diagnostics="">
          <summary className="cursor-pointer text-[12px]">{t.diagnostics}</summary>
          <p className="mt-2" dir="ltr">
            exactAlarms={String(status.exact)} · notifications={String(status.notifications)} · batteryUnrestricted={String(status.ignoringBatteryOptimizations)} · standbyBucket=
            {status.standbyBucket}
          </p>
          <ol className="mt-1 flex flex-col gap-0.5" dir="ltr">
            {status.events
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

function Hint({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 text-[11.5px] leading-[1.6]" style={muted}>
        {text}
      </p>
      <button type="button" onClick={onAction} className="shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium" style={{ borderColor: "var(--color-gold)", ...primaryText }}>
        {action}
      </button>
    </div>
  );
}
