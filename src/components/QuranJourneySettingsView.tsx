import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { quranJourneyLabels } from "../data/quranJourneyLabels";
import { buildJourneyNotice, loadJourneyNotifySettings, saveJourneyNotifySettings } from "../lib/quranJourneyNotify";
import type { JourneyNotifySettings } from "../lib/quranJourneyNotify";
import { QuranJourneyNative, isJourneyNativeAvailable } from "../lib/quranJourneyNative";
import type { JourneyNotice } from "../lib/quranJourneyNative";
import { subscribeJourney } from "../lib/quranJourney";
import { arabicDigits, surahMeta } from "../lib/quranMeta";
import { todayLocalDate } from "../lib/stats";

// Settings → إشعار رحلة القرآن: on/off and time of the Journey's daily notification
// (lib/quranJourneyNotify.ts), whether the device lets it through, and what it will invite to
// next. Laid out like the end-of-day summary's page beside it.

const CARD = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)" };
const INPUT_STYLE = { borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", color: "var(--color-text-primary)" };
const muted = { color: "var(--color-text-muted)" };
const primaryText = { color: "var(--color-text-primary)" };

export function QuranJourneySettingsView({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = quranJourneyLabels[language];
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const [settings, setSettings] = useState<JourneyNotifySettings>(() => loadJourneyNotifySettings());
  const [notice, setNotice] = useState<JourneyNotice | null>(null);
  const [blocked, setBlocked] = useState(false);
  const native = isJourneyNativeAvailable();
  const digits = (n: number) => (language === "ar" ? arabicDigits(n) : String(n));

  // What the next notification invites to; follows the journey (a page read moves it to tomorrow).
  useEffect(() => {
    let live = true;
    const refresh = () =>
      void buildJourneyNotice(language).then(
        (n) => live && setNotice(n),
        () => {},
      );
    refresh();
    const unsubscribe = subscribeJourney(refresh);
    return () => {
      live = false;
      unsubscribe();
    };
  }, [language]);

  const checkBlocked = () => {
    if (!native) return;
    void QuranJourneyNative.getStatus().then(
      (s) => setBlocked(!s.notifications),
      () => {},
    );
  };
  useEffect(checkBlocked, [native, settings.enabled]);

  function update(next: JourneyNotifySettings) {
    setSettings(next);
    saveJourneyNotifySettings(next);
  }

  async function toggle() {
    if (!settings.enabled && native) {
      // Asked only on this explicit action (Android 13+); a refusal leaves the switch on with the warning below.
      await QuranJourneyNative.requestPermissions({ permissions: ["notifications"] }).catch(() => {});
    }
    update({ ...settings, enabled: !settings.enabled });
  }

  const ref = (insight: string) => {
    const [surah, ayah] = insight.split(":").map(Number);
    const meta = surahMeta(surah);
    return `${language === "en" ? (meta?.nameTranslit ?? "") : (meta?.nameAr ?? "")} · ${digits(ayah)}`;
  };

  return (
    <div className="flex flex-1 flex-col pb-4" data-journey-settings="">
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
          {t.settingsTitle}
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
            data-journey-notify-switch=""
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
          <label htmlFor="journey-notify-time" className="text-[13px]" style={primaryText}>
            {t.time}
          </label>
          <input
            id="journey-notify-time"
            type="time"
            value={settings.time}
            onChange={(e) => e.target.value && update({ ...settings, time: e.target.value })}
            className="rounded-lg border px-2 py-1 text-[13px]"
            style={INPUT_STYLE}
            data-journey-notify-time=""
          />
        </div>
        {native && settings.enabled && blocked && (
          <div className="flex flex-col gap-2" data-journey-notify-blocked="">
            <p className="text-[11.5px] leading-[1.6]" style={primaryText}>
              {t.blocked}
            </p>
            <button
              type="button"
              onClick={() => void QuranJourneyNative.openNotificationSettings().then(checkBlocked, () => {})}
              className="self-start rounded-full border px-3 py-1 text-[12px] font-medium"
              style={{ borderColor: "var(--color-gold)", ...primaryText }}
            >
              {t.openSettings}
            </button>
          </div>
        )}
        {!native && (
          <p className="text-[11.5px] leading-[1.6]" style={muted}>
            {t.webOnly}
          </p>
        )}
      </div>

      {notice && (
        <div className="mt-3 flex flex-col gap-1 rounded-2xl border p-4" style={CARD} data-journey-notify-next={notice.fromDate === todayLocalDate() ? "today" : "tomorrow"}>
          <p className="text-[13px] font-semibold" style={primaryText}>
            {t.next}
          </p>
          <p className="text-[12.5px] leading-[1.7]" style={primaryText}>
            {(notice.fromDate === todayLocalDate() ? t.nextToday : t.nextTomorrow)(digits(notice.page), ref(notice.insight))}
          </p>
        </div>
      )}
    </div>
  );
}
