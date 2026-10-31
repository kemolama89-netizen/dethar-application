import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ImagePlus } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { reminderLabels } from "../data/reminderLabels";
import {
  REMINDER_INTERVALS,
  clearCustomBackground,
  hasAnyCategory,
  loadCustomBackground,
  loadReminderSettings,
  saveCustomBackground,
  saveReminderSettings,
} from "../lib/reminderSettings";
import type { BackgroundMode, ReminderSettings } from "../lib/reminderSettings";
import { REMINDER_CATEGORIES, reminderPool } from "../lib/reminderContent";
import type { ReminderCategory } from "../lib/reminderContent";
import { BACKGROUNDS, backgroundUrl } from "../lib/reminderBackgrounds";
import { RemindersNative, isRemindersNativeAvailable } from "../lib/remindersNative";
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "../lib/audioAdhkarNative";
import { SpiritualReminderView } from "./SpiritualReminderView";
import { BackgroundCropper } from "./BackgroundCropper";

// Settings → التذكيرات والودجت: reminders (on/off, notifications on/off,
// content kinds, interval, permitted period), the full-screen experience,
// a content preview, the background of the widget and the experience, and
// the home-screen widget — explained as distinct from notifications. Saving
// notifies remindersSync.ts, which re-syncs native at once.

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const INPUT_CLASS = "rounded-lg border px-2 py-1 text-[13px]";
const INPUT_STYLE = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };

function Switch({ checked, onChange, label, on, off }: { checked: boolean; onChange: () => void; label: string; on: string; off: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-medium"
      style={{
        borderColor: checked ? "var(--color-gold)" : "var(--color-gold-soft)",
        background: checked ? "var(--color-primary)" : "var(--color-surface)",
        color: checked ? "var(--color-gold)" : "var(--color-text-primary)",
      }}
    >
      {checked ? off : on}
    </button>
  );
}

function ToggleRow({ title, hint, checked, onChange, t }: { title: string; hint?: string; checked: boolean; onChange: () => void; t: (typeof reminderLabels)["ar"] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold" style={primaryText}>
            {title}
          </p>
          <p className="text-[11.5px]" style={muted}>
            {checked ? t.on : t.off}
          </p>
        </div>
        <Switch checked={checked} onChange={onChange} label={title} on={t.enable} off={t.disable} />
      </div>
      {hint && (
        <p className="text-[11.5px] leading-[1.6]" style={muted}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Card({ children, ...rest }: { children: ReactNode } & Record<string, unknown>) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border p-4" style={CARD} {...rest}>
      {children}
    </div>
  );
}

/** One example per kind, for the preview list. */
function previewItems() {
  const pool = reminderPool();
  return REMINDER_CATEGORIES.map((c) => pool.find((i) => i.category === c)).filter((i) => i !== undefined);
}

export function RemindersSettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = reminderLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminderSettings());
  const [custom, setCustom] = useState(() => loadCustomBackground());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState(false);
  const [widget, setWidget] = useState<{ count: number; pinSupported: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const native = isRemindersNativeAvailable();

  useEffect(() => {
    if (!native) return;
    const refresh = () => void RemindersNative.getWidgetStatus().then(setWidget, () => setWidget(null));
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [native]);

  function update(next: ReminderSettings) {
    setSettings(next);
    saveReminderSettings(next);
  }

  async function toggleEnabled() {
    // Android 13+ asks for the notification permission on an explicit enable tap only.
    if (!settings.enabled && settings.notifications && isAudioAdhkarNativeAvailable()) {
      await AudioAdhkarNative.requestPermissions({ permissions: ["notifications"] }).catch(() => {});
    }
    update({ ...settings, enabled: !settings.enabled });
  }

  function toggleCategory(c: ReminderCategory) {
    const next = { ...settings, categories: { ...settings.categories, [c]: !settings.categories[c] } };
    if (!hasAnyCategory(next)) return; // at least one kind stays on
    update(next);
  }

  function setMode(mode: BackgroundMode) {
    if (mode === "custom" && !custom) {
      fileInput.current?.click();
      return;
    }
    update({ ...settings, backgroundMode: mode });
  }

  function onCropped(dataUrl: string) {
    setCropFile(null);
    if (!saveCustomBackground(dataUrl)) {
      setImageError(true);
      return;
    }
    setImageError(false);
    setCustom(loadCustomBackground());
    update({ ...settings, backgroundMode: "custom" });
  }

  function removeCustom() {
    clearCustomBackground();
    setCustom(null);
    update({ ...settings, backgroundMode: "auto" });
  }

  const radio = (mode: BackgroundMode, label: string) => (
    <label className="flex cursor-pointer items-center gap-2 text-[13px]" style={primaryText}>
      <input type="radio" name="reminder-background" checked={settings.backgroundMode === mode} onChange={() => setMode(mode)} style={{ accentColor: "var(--color-primary)" }} />
      {label}
    </label>
  );

  return (
    <div className="flex flex-1 flex-col pb-4" data-reminders-settings="">
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

      {!native && (
        <p className="mt-3 text-[11.5px] leading-[1.6]" style={muted}>
          {t.webOnly}
        </p>
      )}

      <Card data-reminders-master="">
        <ToggleRow title={t.master} hint={t.masterHint} checked={settings.enabled} onChange={() => void toggleEnabled()} t={t} />
      </Card>

      <div style={{ opacity: settings.enabled ? 1 : 0.6 }}>
        <Card>
          <ToggleRow title={t.notifications} hint={t.notificationsHint} checked={settings.notifications} onChange={() => update({ ...settings, notifications: !settings.notifications })} t={t} />
        </Card>

        <Card data-reminder-categories="">
          <p className="text-[13.5px] font-semibold" style={primaryText}>
            {t.categories}
          </p>
          {REMINDER_CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2 text-[13px]" style={primaryText}>
              <input type="checkbox" data-category={c} checked={settings.categories[c]} onChange={() => toggleCategory(c)} style={{ accentColor: "var(--color-primary)" }} />
              {t.categoryNames[c]}
            </label>
          ))}
          <p className="text-[11px]" style={muted}>
            {t.oneCategoryNeeded}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="reminder-interval" className="text-[13px]" style={primaryText}>
              {t.interval}
            </label>
            <select id="reminder-interval" value={settings.intervalMinutes} onChange={(e) => update({ ...settings, intervalMinutes: Number(e.target.value) })} className={INPUT_CLASS} style={INPUT_STYLE}>
              {REMINDER_INTERVALS.map((m) => (
                <option key={m} value={m}>
                  {t.intervalLabel(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="reminder-start" className="text-[13px]" style={primaryText}>
              {t.periodStart}
            </label>
            <input id="reminder-start" type="time" value={settings.startTime} onChange={(e) => e.target.value && update({ ...settings, startTime: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="reminder-end" className="text-[13px]" style={primaryText}>
              {t.periodEnd}
            </label>
            <input id="reminder-end" type="time" value={settings.endTime} onChange={(e) => e.target.value && update({ ...settings, endTime: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
          </div>
          <p className="text-[11.5px] leading-[1.6]" style={muted}>
            {t.periodHint}
          </p>
        </Card>
      </div>

      <Card data-reminder-fullscreen="">
        <ToggleRow title={t.fullScreen} hint={t.fullScreenHint} checked={settings.fullScreen} onChange={() => update({ ...settings, fullScreen: !settings.fullScreen })} t={t} />
      </Card>

      <Card data-reminder-preview="">
        <p className="text-[13.5px] font-semibold" style={primaryText}>
          {t.previewTitle}
        </p>
        <p className="text-[11.5px]" style={muted}>
          {t.previewHint}
        </p>
        {previewItems().map((item) => (
          <button
            key={item.id}
            type="button"
            data-preview-item={item.id}
            onClick={() => setPreviewId(item.id)}
            className="rounded-xl border px-3 py-2 text-start"
            style={{ borderColor: "var(--color-gold-soft)" }}
          >
            <span className="block text-[11px] font-semibold" style={{ color: "var(--color-primary)" }}>
              {t.categoryTitle[item.category]}
            </span>
            <span dir="rtl" className="line-clamp-2 block text-[13.5px] leading-[1.8]" style={{ ...primaryText, fontFamily: "var(--font-display)" }}>
              {item.textAr}
            </span>
          </button>
        ))}
      </Card>

      <Card data-reminder-background="">
        <p className="text-[13.5px] font-semibold" style={primaryText}>
          {t.background}
        </p>
        {radio("auto", t.backgroundAuto)}
        {settings.backgroundMode === "auto" && (
          <p className="text-[11px] leading-[1.6]" style={muted}>
            {t.backgroundAutoHint}
          </p>
        )}
        {radio("fixed", t.backgroundFixed)}
        {settings.backgroundMode === "fixed" &&
          (["nature", "islamic"] as const).map((kind) => (
            <div key={kind}>
              <p className="mb-1 text-[11px] font-semibold" style={muted}>
                {kind === "nature" ? t.nature : t.islamic}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BACKGROUNDS.filter((b) => b.kind === kind).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    data-background={b.id}
                    aria-pressed={settings.fixedBackground === b.id}
                    onClick={() => update({ ...settings, backgroundMode: "fixed", fixedBackground: b.id })}
                    className="aspect-[9/16] overflow-hidden rounded-lg"
                    style={{ boxShadow: settings.fixedBackground === b.id ? "0 0 0 2.5px var(--color-gold)" : "0 0 0 1px var(--color-gold-soft)" }}
                  >
                    <img src={backgroundUrl(b.id)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        {radio("custom", t.backgroundCustom)}
        {custom && settings.backgroundMode === "custom" && (
          <div className="flex items-center gap-3">
            <img src={custom.dataUrl} alt="" className="aspect-[9/16] w-16 rounded-lg object-cover" />
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => fileInput.current?.click()} className="rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: "var(--color-gold)", ...primaryText }}>
                {t.changeImage}
              </button>
              <button type="button" onClick={removeCustom} className="rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: "var(--color-gold-soft)", ...primaryText }}>
                {t.removeImage}
              </button>
            </div>
          </div>
        )}
        {!custom && (
          <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[12px]" style={{ borderColor: "var(--color-gold)", ...primaryText }}>
            <ImagePlus size={14} />
            {t.chooseImage}
          </button>
        )}
        {imageError && (
          <p className="text-[11.5px]" role="alert" style={{ color: "var(--color-primary)" }}>
            {t.imageTooLarge}
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          data-background-file=""
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) setCropFile(file);
          }}
        />
      </Card>

      <Card data-widget-info="">
        <p className="text-[13.5px] font-semibold" style={primaryText}>
          {t.widgetTitle}
        </p>
        <p className="text-[11.5px] leading-[1.7]" style={muted}>
          {t.widgetExplain}
        </p>
        {widget && (
          <p className="text-[12px] font-medium" style={{ color: "var(--color-primary)" }}>
            {t.widgetCount(widget.count)}
          </p>
        )}
        {widget?.pinSupported && (
          <button
            type="button"
            onClick={() => void RemindersNative.requestPinWidget().catch(() => {})}
            className="self-start rounded-full border px-3 py-1.5 text-[12px] font-medium"
            style={{ borderColor: "var(--color-gold)", ...primaryText }}
          >
            {t.addWidget}
          </button>
        )}
      </Card>

      {previewId && <SpiritualReminderView itemId={previewId} onClose={() => setPreviewId(null)} />}
      {cropFile && <BackgroundCropper file={cropFile} onCancel={() => setCropFile(null)} onSave={onCropped} />}
    </div>
  );
}
