import { useCallback, useEffect, useState } from "react";
import { BookOpenText, Check, ChevronLeft, ChevronRight, Languages, Pause, Play, Volume2 } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { BackHeader, StickyBackButton } from "./BackHeader";
import { WrittenAdhkarCategoryCard } from "./WrittenAdhkarCategoryCard";
import { DraggableMeaningCard } from "./MeaningPopover";
import { useLanguage } from "../theme/LanguageContext";
import { navLabels } from "../data/content";
import { writtenAdhkarCategoryLabels, writtenAdhkarLabels } from "../data/written-adhkar";
import type { WrittenAdhkarItem } from "../data/written-adhkar";
import { MISC_CATEGORIES, MISC_DUAS, miscLibraryLabels } from "../data/misc-library";
import type { MiscCategoryKey, MiscDuaItem } from "../data/misc-library";
import { dhikrLanguageLabels } from "../data/dhikr-language-labels";
import { AUDIO_ADHKAR_CATEGORY_ORDER, AUDIO_MISC_CATEGORY_ORDER, audioAdhkarItems, audioMiscItems } from "../data/audio-adhkar";
import type { AudioAdhkarCategoryKey } from "../data/audio-adhkar";
import { audioRepetitionTotal } from "../data/audio-adhkar";
import { playbackFor, useAudioAdhkarPlayback } from "../lib/audioAdhkarPlayback";
import {
  AUDIO_ENABLED_COLLECTIONS,
  getAudioAdhkarSource,
  pauseAudioAdhkar,
  resumeAudioAdhkar,
  startAudioAdhkar,
  stopAudioAdhkar,
} from "../lib/audioAdhkarPlayer";
import type { AudioAdhkarCollection, AudioAdhkarNowPlaying, AudioAdhkarPlaybackState } from "../lib/audioAdhkarPlayback";

// Audio Adhkar ("الأذكار المسموعة") — the same Morning,
// Evening and Various adhkar the Written section shows (see
// data/audio-adhkar.ts), displayed read-only. Evening dhikr with a
// recording get a Play/Pause/Resume player (lib/audioAdhkarPlayer.ts);
// every other card keeps a placeholder. No scheduling or background
// playback yet.

export interface AudioAdhkarNavProps {
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToWritten: () => void;
  onNavigateToSettings: () => void;
}

function AudioBottomNav({ onNavigateHome, onNavigateToTasbeeh, onNavigateToWritten, onNavigateToSettings }: AudioAdhkarNavProps) {
  return (
    <BottomNav
      className="mt-3"
      activeKey="audio"
      onSelect={(key) => {
        if (key === "home") onNavigateHome();
        if (key === "tasbih") onNavigateToTasbeeh();
        if (key === "written") onNavigateToWritten();
        if (key === "settings") onNavigateToSettings();
      }}
    />
  );
}

// Same timing as WrittenAdhkarScreen's category tiles.
const SELECT_TRANSITION_MS = 320;

export function AudioAdhkarScreen({
  onSelectCategory,
  ...nav
}: AudioAdhkarNavProps & { onSelectCategory: (key: AudioAdhkarCategoryKey) => void }) {
  const { language } = useLanguage();
  const t = writtenAdhkarLabels[language];
  const [selectingKey, setSelectingKey] = useState<AudioAdhkarCategoryKey | null>(null);

  function handleSelect(key: AudioAdhkarCategoryKey) {
    if (selectingKey) return;
    setSelectingKey(key);
    window.setTimeout(() => onSelectCategory(key), SELECT_TRANSITION_MS);
  }

  return (
    <DeviceFrame background="var(--wa-category-bg)">
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          <h1
            className="mt-2 text-center text-[20px] font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
          >
            {navLabels[language].audioAdhkar}
          </h1>
          <p className="mt-0.5 text-center text-[13px]" style={{ color: "var(--wa-ink-muted)" }}>
            {t.chooseCategory}
          </p>

          {/* Same 2×2 grid as Written Adhkar. The third tile sits centered on
              the bottom row at exactly one column's width (the row's width
              minus the gap, halved), so all three tiles are the same size. */}
          <div className="mt-3 grid flex-1 grid-cols-2 grid-rows-2 gap-3">
            {AUDIO_ADHKAR_CATEGORY_ORDER.map((key) => {
              const itemsCountLabel =
                key === "misc" ? miscLibraryLabels[language].itemsCount(MISC_DUAS.length) : t.itemsCount(audioAdhkarItems[key].length);
              const cardStateClass = !selectingKey
                ? ""
                : selectingKey === key
                  ? "dithar-wa-category-card--selected"
                  : "dithar-wa-category-card--receding";
              return (
                <div key={key} className={key === "misc" ? "col-span-2 flex justify-center" : "flex"}>
                  <WrittenAdhkarCategoryCard
                    category={key}
                    label={writtenAdhkarCategoryLabels[key][language]}
                    itemsCountLabel={itemsCountLabel}
                    cardStateClass={`${key === "misc" ? "w-[calc((100%_-_0.75rem)/2)]" : "w-full"} ${cardStateClass}`}
                    disabled={!!selectingKey}
                    onSelect={() => handleSelect(key)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <AudioBottomNav {...nav} />
      </AppShell>
    </DeviceFrame>
  );
}

// Various: the Misc Library's categories, in the same order its grid shows.
export function AudioMiscCategoriesScreen({
  onBack,
  onSelectCategory,
  ...nav
}: AudioAdhkarNavProps & { onBack: () => void; onSelectCategory: (key: MiscCategoryKey) => void }) {
  const { language, dir } = useLanguage();
  const t = miscLibraryLabels[language];
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <DeviceFrame background="var(--wa-page-bg)">
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          <BackHeader title={writtenAdhkarCategoryLabels.misc[language]} onBack={onBack} backLabel={t.back} hideButton />
          <StickyBackButton onBack={onBack} backLabel={t.back} dir={dir} />
          <div className="mt-4 flex flex-col gap-2.5 pb-4">
            {AUDIO_MISC_CATEGORY_ORDER.map((key) => {
              const meta = MISC_CATEGORIES[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectCategory(key)}
                  className="flex items-center gap-3 px-4 py-3 text-start"
                  style={{
                    background: "var(--wa-surface)",
                    borderRadius: "var(--wa-card-radius)",
                    boxShadow: "0 8px 20px -16px rgba(var(--color-shadow-rgb), 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[15px] font-bold leading-[1.4]"
                      style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
                    >
                      {language === "en" ? meta.title_en : meta.title_ar}
                    </span>
                    <span className="block text-[11px]" style={{ color: "var(--wa-ink-muted)" }}>
                      {t.itemsCount(audioMiscItems(key).length)}
                    </span>
                  </span>
                  <Chevron size={16} strokeWidth={1.8} style={{ color: "var(--wa-gold)" }} />
                </button>
              );
            })}
          </div>
        </div>
        <AudioBottomNav {...nav} />
      </AppShell>
    </DeviceFrame>
  );
}

export type AudioAdhkarList = { kind: "written"; key: "morning" | "evening" } | { kind: "misc"; key: MiscCategoryKey };

const CARD_STYLE = {
  background: "var(--wa-surface)",
  borderRadius: "var(--wa-card-radius)",
  boxShadow: "0 8px 20px -16px rgba(var(--color-shadow-rgb), 0.14), inset 0 0 0 1px var(--wa-gold-hairline)",
};

// Secondary English content (Meaning, Transliteration) never sits in the
// card itself: a small trigger opens it in the same DraggableMeaningCard
// popup the Written Adhkar reader uses for Meaning, and tapping the same
// trigger again closes it. Like Written, this English content is offered
// only in English mode.
type InfoKind = "meaning" | "transliteration";

interface InfoTarget {
  itemId: string;
  kind: InfoKind;
  cardEl: HTMLElement;
  title?: string;
  text_ar: string;
  body: string;
}

type ToggleInfo = (target: Omit<InfoTarget, "cardEl">, buttonEl: HTMLButtonElement) => void;

interface InfoEntry {
  kind: InfoKind;
  body?: string;
}

function InfoControls({
  itemId,
  title,
  text_ar,
  entries,
  open,
  onToggle,
}: {
  itemId: string;
  title?: string;
  text_ar: string;
  entries: InfoEntry[];
  open: InfoTarget | null;
  onToggle: ToggleInfo;
}) {
  const { language } = useLanguage();
  const mt = dhikrLanguageLabels[language];
  const available = entries.filter((e): e is Required<InfoEntry> => !!e.body);
  if (language !== "en" || available.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" dir="ltr">
      {available.map(({ kind, body }) => {
        const isOpen = open?.itemId === itemId && open.kind === kind;
        const Icon = kind === "meaning" ? BookOpenText : Languages;
        return (
          <button
            key={kind}
            type="button"
            data-meaning-trigger="true"
            aria-expanded={isOpen}
            onClick={(e) => onToggle({ itemId, kind, title, text_ar, body }, e.currentTarget)}
            className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium"
            style={{
              boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)",
              background: isOpen ? "var(--wa-badge-bg)" : undefined,
              color: "var(--wa-gold)",
            }}
          >
            <Icon size={14} strokeWidth={1.8} />
            {kind === "meaning" ? mt.meaningHeading : mt.transliterationHeading}
          </button>
        );
      })}
    </div>
  );
}

function InfoPopover({ target, onClose }: { target: InfoTarget; onClose: () => void }) {
  const mt = dhikrLanguageLabels.en;
  const heading = target.kind === "meaning" ? mt.meaningHeading : mt.transliterationHeading;
  return (
    <DraggableMeaningCard
      cardEl={target.cardEl}
      listSelector=".dithar-audio-list"
      onClose={onClose}
      ariaLabel={heading}
      closeAria={mt.close}
      header={
        <>
          {target.title && (
            <p className="text-[11px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {target.title}
            </p>
          )}
          <p dir="rtl" className="mt-1 text-[12.5px]" style={{ color: "var(--wa-ink-muted)" }}>
            {target.text_ar}
          </p>
        </>
      }
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--wa-gold)" }}>
        {heading}
      </p>
      <p
        className={`mt-1 text-[14px] leading-[1.6] ${target.kind === "transliteration" ? "italic" : ""}`}
        style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}
      >
        {target.body}
      </p>
    </DraggableMeaningCard>
  );
}

function ArabicText({ text }: { text: string }) {
  return (
    <p dir="rtl" className="mt-1 text-[17px] font-bold leading-[1.95]" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
      {text}
    </p>
  );
}

const playerLabels = {
  ar: {
    listen: "استماع",
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    nowPlaying: "يُشغَّل الآن",
    paused: "متوقف مؤقتًا",
    notRecorded: "لا يتوفر تسجيل صوتي بعد",
  },
  en: {
    listen: "Listen",
    pause: "Pause",
    resume: "Resume",
    nowPlaying: "Now playing",
    paused: "Paused",
    notRecorded: "No recording yet",
  },
};

// A player row with nothing to play: "coming soon" for lists whose audio
// isn't connected yet, "no recording yet" for an item in a connected list.
function AudioPlayerSlot({ label }: { label?: string }) {
  const { language } = useLanguage();
  return (
    <div
      data-audio-player-slot=""
      className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full text-[11px]"
      style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-ink-muted)", opacity: 0.7 }}
    >
      <Volume2 size={15} strokeWidth={1.7} aria-hidden="true" />
      <span>{label ?? miscLibraryLabels[language].comingSoon}</span>
    </div>
  );
}

// Play / Pause / Resume for one dhikr's recording (see lib/audioAdhkarPlayer.ts).
function AudioPlayerControl({
  collection,
  item,
  playback,
}: {
  collection: AudioAdhkarCollection;
  item: WrittenAdhkarItem;
  playback: AudioAdhkarNowPlaying | null;
}) {
  const { language } = useLanguage();
  const labels = playerLabels[language];
  const source = getAudioAdhkarSource(collection, item);
  if (!AUDIO_ENABLED_COLLECTIONS.includes(collection)) return <AudioPlayerSlot />;
  if (!source) return <AudioPlayerSlot label={labels.notRecorded} />;

  const status = playback?.status;
  const [Icon, action, onClick] =
    status === "playing"
      ? [Pause, labels.pause, pauseAudioAdhkar]
      : status === "paused"
        ? [Play, labels.resume, resumeAudioAdhkar]
        : [Play, labels.listen, () => startAudioAdhkar(collection, item)];

  return (
    <div
      data-audio-player-slot=""
      data-audio-source={source.urls.join(",")}
      className="mt-3 flex h-10 items-center gap-2 rounded-full ps-1 pe-4"
      style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-soft)" }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={action}
        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold"
        style={{ background: "var(--wa-gold)", color: "var(--wa-surface)" }}
      >
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
        {action}
      </button>
      {(status === "playing" || status === "paused") && (
        <span className="text-[11px]" style={{ color: "var(--wa-ink-muted)" }} aria-live="polite">
          {status === "playing" ? labels.nowPlaying : labels.paused}
        </span>
      )}
    </div>
  );
}

const CARD_CLASS = "dithar-audio-dhikr-card px-4 py-4";
// Same emphasis the Written reader gives its active card.
const ACTIVE_CARD_SHADOW = "0 16px 34px -18px rgba(var(--color-shadow-rgb), 0.24), inset 0 0 0 1.5px var(--wa-gold-soft)";

const repetitionLabels = {
  ar: {
    aria: (n: number, total: number | null) => (total === null ? `التكرار الحالي ${n}` : `التكرار الحالي ${n} من ${total}`),
    finished: "اكتمل التكرار",
  },
  en: {
    aria: (n: number, total: number | null) => (total === null ? `Current repetition ${n}` : `Current repetition ${n} of ${total}`),
    finished: "Repetitions complete",
  },
};

const RING_SIZE = 56;
const RING_STROKE = 4;

// Repetition STATUS — which repetition is playing right now — drawn with
// the same ring as Written Adhkar's counter but deliberately NOT a button:
// the user never counts here. The number comes only from the playback
// state (lib/audioAdhkarPlayback.ts), which the audio engine advances
// after each complete playback. With nothing playing, the ring rests
// dimmed on 1 (where playback will start); after the last repetition it
// shows ✓.
function RepetitionIndicator({ total, playback }: { total: number | null; playback: AudioAdhkarNowPlaying | null }) {
  const { language } = useLanguage();
  const labels = repetitionLabels[language];
  const finished = playback?.status === "finished";
  const repetition = playback?.repetition ?? 1;
  // While playing, the engine's own total wins (it knows what it plays).
  const shownTotal = playback ? playback.total : total;

  return (
    <div
      role="img"
      aria-label={finished ? labels.finished : labels.aria(repetition, shownTotal)}
      data-repetition-indicator=""
      data-playback-status={playback?.status ?? "idle"}
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{ width: RING_SIZE, height: RING_SIZE, opacity: playback ? 1 : 0.55 }}
    >
      <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0" aria-hidden="true">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={(RING_SIZE - RING_STROKE) / 2}
          fill="none"
          stroke={playback ? "var(--wa-gold-soft)" : "var(--wa-gold-hairline)"}
          strokeWidth={RING_STROKE}
        />
      </svg>
      {finished ? (
        <Check size={20} strokeWidth={2.5} style={{ color: "var(--wa-gold)" }} aria-hidden="true" />
      ) : (
        <span className="flex flex-col items-center leading-none" aria-hidden="true">
          <span className="text-[15px] font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--wa-ink)" }}>
            {repetition}
          </span>
          {shownTotal !== null && shownTotal > 1 && (
            <span className="mt-0.5 text-[8.5px]" style={{ color: "var(--wa-ink-muted)" }}>
              {writtenAdhkarLabels[language].ofTarget(shownTotal)}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

interface CardProps<T> {
  item: T;
  collection: AudioAdhkarCollection;
  playback: AudioAdhkarPlaybackState;
  openInfo: InfoTarget | null;
  onToggleInfo: ToggleInfo;
}

function WrittenItemCard({ item, collection, playback, openInfo, onToggleInfo }: CardProps<WrittenAdhkarItem>) {
  const { language } = useLanguage();
  const mine = playbackFor(playback, { collection, itemId: item.id });
  const isActive = mine?.status === "playing" || mine?.status === "paused";
  const t = writtenAdhkarLabels[language];
  const isEn = language === "en";
  const title = isEn ? item.title_en : item.title_ar;

  return (
    <div
      className={CARD_CLASS}
      style={isActive ? { ...CARD_STYLE, boxShadow: ACTIVE_CARD_SHADOW } : CARD_STYLE}
      data-dhikr-id={item.id}
      data-active-dhikr={isActive ? "" : undefined}
    >
      {title && (
        <p className="text-[11.5px] font-medium" style={{ color: "var(--wa-gold)" }}>
          {title}
        </p>
      )}
      <ArabicText text={item.text_ar} />
      <AudioPlayerControl collection={collection} item={item} playback={mine} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {item.unboundedCount ? (
            <p className="text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {t.unboundedNote}
            </p>
          ) : (
            <p className="text-[11.5px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {t.repeatTimes(item.repeat ?? 1)}
            </p>
          )}
          <p className="mt-1 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
            {t.source}: {isEn ? item.source_en : item.source_ar}
          </p>
        </div>
        <RepetitionIndicator total={audioRepetitionTotal(item)} playback={mine} />
      </div>
      <InfoControls
        itemId={item.id}
        title={item.title_en}
        text_ar={item.text_ar}
        entries={[
          { kind: "meaning", body: item.text_en },
          { kind: "transliteration", body: item.transliteration_en },
        ]}
        open={openInfo}
        onToggle={onToggleInfo}
      />
    </div>
  );
}

function MiscItemCard({ item, collection, playback, openInfo, onToggleInfo }: CardProps<MiscDuaItem>) {
  const { language } = useLanguage();
  const t = miscLibraryLabels[language];
  const isEn = language === "en";
  const occasion = isEn ? item.occasion_en : item.occasion_ar;
  const count = isEn ? item.count_en : item.count_ar;
  const source = isEn ? item.source_en : item.source_ar;
  const note = isEn ? item.note_en : item.note_ar;

  return (
    <div className={CARD_CLASS} style={CARD_STYLE} data-dhikr-id={item.id}>
      <ArabicText text={item.text_ar} />
      <AudioPlayerSlot />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {occasion && (
            <p className="text-[11.5px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {t.occasionLabel}: {occasion}
            </p>
          )}
          {count && (
            <p className="text-[11.5px] font-semibold" style={{ color: "var(--wa-gold)" }}>
              {t.countLabel}: {count}
            </p>
          )}
          {source && (
            <p className="mt-1 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {item.isQuranic ? t.sourceLabelQuran : t.sourceLabelHadith}: {source}
            </p>
          )}
          {note && (
            <p className="mt-1 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
              {t.noteLabel}: {note}
            </p>
          )}
        </div>
        {/* Misc counts are display text (e.g. "ثلاث مرات"), not numbers — the
            engine supplies the total when it starts playback. */}
        <RepetitionIndicator total={null} playback={playbackFor(playback, { collection, itemId: item.id })} />
      </div>
      <InfoControls
        itemId={item.id}
        text_ar={item.text_ar}
        entries={[
          { kind: "meaning", body: item.englishMeaning },
          { kind: "transliteration", body: item.englishTransliteration },
        ]}
        open={openInfo}
        onToggle={onToggleInfo}
      />
    </div>
  );
}

export function AudioAdhkarListScreen({ list, onBack, ...nav }: AudioAdhkarNavProps & { list: AudioAdhkarList; onBack: () => void }) {
  const { language, dir } = useLanguage();
  const playback = useAudioAdhkarPlayback();
  const collection: AudioAdhkarCollection = list.kind === "written" ? list.key : "misc";
  const [openInfo, setOpenInfo] = useState<InfoTarget | null>(null);
  // No background playback yet: leaving the list stops its audio.
  useEffect(() => stopAudioAdhkar, []);
  const handleToggleInfo = useCallback<ToggleInfo>((target, buttonEl) => {
    setOpenInfo((prev) =>
      prev?.itemId === target.itemId && prev.kind === target.kind
        ? null
        : { ...target, cardEl: buttonEl.closest<HTMLElement>(".dithar-audio-dhikr-card") ?? buttonEl },
    );
  }, []);
  const handleCloseInfo = useCallback(() => setOpenInfo(null), []);
  const title =
    list.kind === "written"
      ? writtenAdhkarCategoryLabels[list.key][language]
      : language === "en"
        ? MISC_CATEGORIES[list.key].title_en
        : MISC_CATEGORIES[list.key].title_ar;

  return (
    <DeviceFrame background="var(--wa-page-bg)" scrollLocked={openInfo !== null}>
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          {/* Same always-reachable back control as the Written Adhkar reader:
              it stays pinned while the dhikr list scrolls. */}
          <BackHeader title={title} onBack={onBack} backLabel={writtenAdhkarLabels[language].back} hideButton />
          <StickyBackButton onBack={onBack} backLabel={writtenAdhkarLabels[language].back} dir={dir} />
          <div className="dithar-audio-list mt-4 flex flex-col gap-4 pb-4">
            {list.kind === "written"
              ? audioAdhkarItems[list.key].map((item) => (
                  <WrittenItemCard key={item.id} item={item} collection={collection} playback={playback} openInfo={openInfo} onToggleInfo={handleToggleInfo} />
                ))
              : audioMiscItems(list.key).map((item) => (
                  <MiscItemCard key={item.id} item={item} collection={collection} playback={playback} openInfo={openInfo} onToggleInfo={handleToggleInfo} />
                ))}
          </div>
          {openInfo && <InfoPopover key={`${openInfo.itemId}:${openInfo.kind}`} target={openInfo} onClose={handleCloseInfo} />}
        </div>
        <AudioBottomNav {...nav} />
      </AppShell>
    </DeviceFrame>
  );
}
