import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Check, ChevronLeft, ChevronRight, Home, ImagePlus, RotateCcw } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { useTheme } from "../theme/ThemeContext";
import { useLook } from "../theme/LookContext";
import { ORIGINAL_COLORS } from "../theme/palettes";
import {
  CARD_OPACITY_MAX,
  CARD_OPACITY_MIN,
  DEFAULT_LOOK_SETTINGS,
  LOOKS,
  LOOK_IDS,
  WALLPAPER_IDS,
  archThumbUrl,
  lookTokens,
  shownWallpaper,
  toneOfImage,
  veilAlpha,
  wallpaperThumbUrl,
} from "../theme/looks";
import type { AutoDark, CustomWallpaper, LookId, LookSettings, WallpaperChoice, WallpaperId } from "../theme/looks";
import { BackgroundCropper } from "./BackgroundCropper";

// Settings → Appearance → «تخصيص المظهر» (public/reference/Dithar App Theme
// Showcase.png, its right-hand panel): the four themes, the Home wallpaper
// (the themes' own, more scenes, or a photo of the user's), the cards'
// transparency and automatic dark mode. The theme sets the colours by itself
// (no manual colour palette any more — theme/paletteStore.ts). Every choice
// is a DRAFT shown in the preview above until «تطبيق»
// saves it; «استعادة الافتراضي» returns to the original appearance.

const labels = {
  ar: {
    title: "تخصيص المظهر",
    preview: "معاينة",
    themes: "السمة",
    wallpaper: "خلفية التطبيق",
    opacity: "شفافية البطاقات",
    autoDark: "الوضع الداكن التلقائي",
    autoDarkHint: "يتحول إلى الوضع الليلي تلقائيًا",
    apply: "تطبيق",
    applied: "تم تطبيق المظهر",
    unsaved: "تغييرات لم تُطبَّق بعد",
    restore: "استعادة المظهر الافتراضي",
    custom: "خلفية مخصصة",
    themeWallpaper: "حسب السمة",
    storageFull: "تعذّر حفظ الصورة: لا توجد مساحة كافية على الجهاز.",
    look: { classic: "كلاسيكي", night: "ليلي", nature: "طبيعة", sunset: "غروب" } as Record<LookId, string>,
    wall: { classic: "كلاسيكي", night: "ليلي", nature: "طبيعة", sunset: "غروب", sea: "بحر", mosque: "مسجد", flowers: "ورود" } as Record<WallpaperId, string>,
    dark: { off: "إيقاف", device: "حسب الجهاز", time: "حسب الوقت" } as Record<AutoDark, string>,
    seeThrough: "شفافة",
    solid: "معتمة",
  },
  en: {
    title: "Customize appearance",
    preview: "Preview",
    themes: "Theme",
    wallpaper: "App background",
    opacity: "Card transparency",
    autoDark: "Automatic dark mode",
    autoDarkHint: "Switches to Night by itself",
    apply: "Apply",
    applied: "Appearance applied",
    unsaved: "Changes not applied yet",
    restore: "Restore default appearance",
    custom: "Your photo",
    themeWallpaper: "Theme's own",
    storageFull: "The photo couldn't be saved: not enough space on this device.",
    look: { classic: "Classic", night: "Night", nature: "Nature", sunset: "Modern Sunset" } as Record<LookId, string>,
    wall: { classic: "Classic", night: "Night", nature: "Nature", sunset: "Sunset", sea: "Sea", mosque: "Mosque", flowers: "Flowers" } as Record<WallpaperId, string>,
    dark: { off: "Off", device: "Follow device", time: "By time of day" } as Record<AutoDark, string>,
    seeThrough: "See-through",
    solid: "Solid",
  },
};

const sectionTitle: CSSProperties = { color: "var(--color-text-primary)" };

function Tile({ selected, onClick, label, image, children, testId }: { selected: boolean; onClick: () => void; label: string; image?: string; children?: React.ReactNode; testId: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className="flex min-w-0 flex-col items-center gap-1" data-look-tile={testId}>
      <span
        className="relative block aspect-[4/5] w-full overflow-hidden rounded-2xl"
        style={{
          background: image ? `url("${image}") center / cover no-repeat` : "var(--color-surface)",
          boxShadow: selected ? "0 0 0 2px var(--color-gold), 0 6px 14px -8px rgba(var(--color-shadow-rgb), 0.5)" : "inset 0 0 0 1px var(--color-gold-soft)",
        }}
      >
        {children}
        {selected && (
          <span className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "var(--color-gold)", color: "#fff" }}>
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="line-clamp-2 w-full text-center text-[11.5px] font-semibold leading-tight" style={{ color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
        {label}
      </span>
    </button>
  );
}

/** A look's primary and gold in this identity: the look's own primary (Nature, Sunset), else the identity's. */
function accentOf(theme: "men" | "women", look: LookId): { primary: string; gold: string } {
  return { primary: LOOKS[look].originalPrimary?.primary ?? ORIGINAL_COLORS[theme].primary, gold: ORIGINAL_COLORS[theme].accent };
}

/** A small Home: the draft's wallpaper, a frosted card, the arch scene and the navigation — in the draft's colours. */
function Preview({ draft, custom }: { draft: LookSettings; custom: CustomWallpaper | null }) {
  const { theme } = useTheme();
  const look = draft.look;
  const tokens = lookTokens(look);
  const accent = accentOf(theme, look);
  const wallpaper = shownWallpaper(draft, look, custom);
  const primary = look === "night" ? accent.gold : accent.primary;
  const cardText = LOOKS[look].tone === "dark" ? "#f3e9d2" : "#2b2a33";
  const style = {
    ...tokens,
    "--look-card-alpha": String(draft.cardOpacity),
    background: `linear-gradient(rgba(${LOOKS[look].veilRgb}, ${veilAlpha(look, wallpaper.tone)}), rgba(${LOOKS[look].veilRgb}, ${veilAlpha(look, wallpaper.tone)})), url("${wallpaper.url}") center / cover no-repeat`,
  } as CSSProperties;
  const card: CSSProperties = { background: `rgba(${LOOKS[look].cardRgb}, ${draft.cardOpacity})`, border: `1px solid ${LOOKS[look].cardBorder}`, backdropFilter: "blur(6px)" };
  return (
    <div className="mx-auto flex w-[150px] flex-col gap-1.5 overflow-hidden rounded-[22px] p-2" style={{ ...style, boxShadow: `0 0 0 4px ${LOOKS[look].bezel}, 0 0 0 5px ${accent.gold}, 0 14px 28px -12px rgba(0,0,0,0.5)` }} data-look-preview={look} aria-hidden="true">
      <div className="flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={card}>
        <span className="h-5 w-5 shrink-0 rounded-full" style={{ boxShadow: `inset 0 0 0 2px ${accent.gold}` }} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="block h-1.5 w-4/5 rounded-full" style={{ background: cardText, opacity: 0.7 }} />
          <span className="block h-1 w-3/5 rounded-full" style={{ background: cardText, opacity: 0.35 }} />
        </span>
      </div>
      <div className="flex items-center justify-between rounded-xl px-2 py-1.5" style={card}>
        <span className="block h-1.5 w-1/2 rounded-full" style={{ background: cardText, opacity: 0.55 }} />
        <span className="block h-3 w-7 rounded-full" style={{ background: primary }} />
      </div>
      <div className="relative h-[92px] overflow-hidden rounded-xl" style={{ background: `${tokens["--look-arch-scene"]} center 42% / cover no-repeat`, border: `1px solid ${LOOKS[look].cardBorder}` }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {/* The same arch as the Home panel (components/SceneArch.tsx). */}
          <path d="M0 0 H100 V100 H97.5 V46 C97.5 26 67 16 50 8 C33 16 2.5 26 2.5 46 V100 H0 Z" fill={`rgba(${LOOKS[look].cardRgb}, 0.94)`} />
          <path d="M2.5 100 V46 C2.5 26 33 16 50 8 C67 16 97.5 26 97.5 46 V100" fill="none" stroke={accent.gold} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="flex items-center justify-around rounded-full px-2 py-1" style={card}>
        {[0, 1, 2, 3, 4].map((i) =>
          i === 2 ? (
            <span key={i} className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: primary, color: look === "night" ? "#101a36" : accent.gold }}>
              <Home size={10} />
            </span>
          ) : (
            <span key={i} className="block h-1.5 w-1.5 rounded-full" style={{ background: cardText, opacity: 0.45 }} />
          ),
        )}
      </div>
    </div>
  );
}

export function LookCustomizer({ onBack }: { onBack: () => void }) {
  const { language, dir } = useLanguage();
  const t = labels[language];
  const { settings, custom, apply, restoreDefault } = useLook();
  const [draft, setDraft] = useState<LookSettings>(settings);
  const [draftCustom, setDraftCustom] = useState<CustomWallpaper | null>(custom);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings) || draftCustom?.dataUrl !== custom?.dataUrl,
    [draft, settings, draftCustom, custom],
  );
  const update = (patch: Partial<LookSettings>) => {
    setMessage(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  function onApply() {
    if (!apply(draft, draftCustom?.dataUrl !== custom?.dataUrl ? draftCustom : undefined)) {
      setMessage(t.storageFull);
      return;
    }
    setMessage(t.applied);
  }
  function onRestore() {
    restoreDefault();
    setDraft(DEFAULT_LOOK_SETTINGS);
    setDraftCustom(null);
    setMessage(t.applied);
  }
  async function onCropped(dataUrl: string) {
    setCropFile(null);
    setDraftCustom({ dataUrl, tone: await toneOfImage(dataUrl) });
    update({ wallpaper: "custom" });
  }

  const wallpapers: { choice: WallpaperChoice; label: string; image?: string }[] = [
    { choice: "theme", label: t.themeWallpaper, image: wallpaperThumbUrl(draft.look) },
    ...WALLPAPER_IDS.map((id) => ({ choice: id as WallpaperChoice, label: t.wall[id], image: wallpaperThumbUrl(id) })),
  ];

  return (
    <div className="flex flex-1 flex-col" data-look-customizer="">
      <div className="dithar-sticky-header mt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={language === "ar" ? "رجوع" : "Back"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1.5px var(--color-gold)", background: "var(--color-surface)", color: "var(--color-text-primary)" }}
        >
          <BackIcon size={18} strokeWidth={1.8} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-bold" style={{ color: "var(--color-text-primary)" }}>
          {t.title}
        </h1>
        <div className="h-9 w-9 shrink-0" aria-hidden="true" />
      </div>

      <div className="mt-3 flex flex-col gap-5 pb-4">
        <section className="flex flex-col items-center gap-1.5">
          <Preview draft={draft} custom={draftCustom} />
          <span className="text-[11px]" style={{ color: dirty ? "var(--color-gold)" : "var(--color-text-muted)" }} data-look-dirty={dirty ? "" : undefined}>
            {dirty ? t.unsaved : t.preview}
          </span>
        </section>

        <section>
          <h2 className="mb-2 text-[14px] font-bold" style={sectionTitle}>
            {t.themes}
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {LOOK_IDS.map((id) => (
              <Tile key={id} testId={`look:${id}`} selected={draft.look === id} onClick={() => update({ look: id })} label={t.look[id]} image={archThumbUrl(id)} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[14px] font-bold" style={sectionTitle}>
            {t.wallpaper}
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {wallpapers.map((w) => (
              <Tile key={w.choice} testId={`wallpaper:${w.choice}`} selected={draft.wallpaper === w.choice} onClick={() => update({ wallpaper: w.choice })} label={w.label} image={w.image} />
            ))}
            <Tile
              testId="wallpaper:custom"
              selected={draft.wallpaper === "custom"}
              onClick={() => (draftCustom && draft.wallpaper !== "custom" ? update({ wallpaper: "custom" }) : fileInput.current?.click())}
              label={t.custom}
              image={draftCustom?.dataUrl}
            >
              {!draftCustom && (
                <span className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--color-gold)" }}>
                  <ImagePlus size={22} strokeWidth={1.6} />
                </span>
              )}
            </Tile>
          </div>
          {draftCustom && (
            <button type="button" onClick={() => fileInput.current?.click()} className="mt-2 rounded-full border px-3 py-1 text-[12px]" style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-primary)" }}>
              <ImagePlus size={13} className="me-1 inline" />
              {t.custom}
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            data-look-file=""
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setCropFile(file);
            }}
          />
        </section>

        <section>
          <h2 className="mb-2 text-[14px] font-bold" style={sectionTitle}>
            {t.opacity}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              {t.seeThrough}
            </span>
            <input
              type="range"
              min={CARD_OPACITY_MIN}
              max={CARD_OPACITY_MAX}
              step={0.05}
              value={draft.cardOpacity}
              onChange={(e) => update({ cardOpacity: Number(e.target.value) })}
              className="min-w-0 flex-1"
              style={{ accentColor: "var(--color-gold)" }}
              aria-label={t.opacity}
              data-look-opacity=""
            />
            <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              {t.solid}
            </span>
          </div>
        </section>

        <section>
          <h2 className="text-[14px] font-bold" style={sectionTitle}>
            {t.autoDark}
          </h2>
          <p className="mb-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            {t.autoDarkHint}
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-full p-1" style={{ background: "var(--color-surface)", boxShadow: "inset 0 0 0 1px var(--color-gold-soft)" }} role="radiogroup" aria-label={t.autoDark}>
            {(["off", "device", "time"] as const).map((mode) => {
              const selected = draft.autoDark === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update({ autoDark: mode })}
                  className="rounded-full px-2 py-1.5 text-[12px] font-semibold"
                  style={selected ? { background: "var(--color-primary)", color: "var(--color-primary-contrast)" } : { color: "var(--color-text-muted)" }}
                  data-look-autodark={mode}
                >
                  {t.dark[mode]}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col gap-2">
          {message && (
            <p className="text-center text-[12px]" style={{ color: "var(--color-text-muted)" }} role="status" data-look-message="">
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={onApply}
            disabled={!dirty}
            className="rounded-full px-4 py-3 text-[14px] font-bold disabled:opacity-45"
            style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}
            data-look-apply=""
          >
            {t.apply}
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-semibold"
            style={{ borderColor: "var(--color-gold-soft)", color: "var(--color-text-primary)" }}
            data-look-restore=""
          >
            <RotateCcw size={14} />
            {t.restore}
          </button>
        </div>
      </div>

      {cropFile && <BackgroundCropper file={cropFile} onCancel={() => setCropFile(null)} onSave={(d) => void onCropped(d)} />}
    </div>
  );
}
