import { useCallback, useEffect, useState } from "react";
import { BookOpenText, Languages, Pause, Play, Volume2 } from "lucide-react";
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
import { miscLibraryLabels } from "../data/misc-library";
import { tasbeehLabels } from "../data/tasbeeh";
import { useAudioAdhkarCount } from "../lib/audioAdhkarCounts";
import { dhikrLanguageLabels } from "../data/dhikr-language-labels";
import { AUDIO_ADHKAR_CATEGORY_ORDER, AUDIO_VARIOUS_ITEMS, audioAdhkarItems } from "../data/audio-adhkar";
import type { AudioAdhkarCategoryKey, AudioVariousItem } from "../data/audio-adhkar";
import { playbackFor, useAudioAdhkarPlayback } from "../lib/audioAdhkarPlayback";
import {
  AUDIO_ENABLED_COLLECTIONS,
  getAudioAdhkarSource,
  getAudioVariousSource,
  pauseAudioAdhkar,
  resumeAudioAdhkar,
  startAudioAdhkar,
  startAudioVarious,
  stopAudioAdhkar,
} from "../lib/audioAdhkarPlayer";
import type { AudioAdhkarCollection, AudioAdhkarNowPlaying, AudioAdhkarPlaybackState } from "../lib/audioAdhkarPlayback";

// Audio Adhkar ("الأذكار المسموعة") — Morning and Evening (the same
// adhkar the Written section shows) and Various (the Tasbeeh dhikr); see
// data/audio-adhkar.ts. Displayed read-only. A dhikr with a recording gets
// a Play/Pause/Resume player (lib/audioAdhkarPlayer.ts); every other card
// keeps a placeholder.

export interface AudioAdhkarNavProps {
  onNavigateHome: () => void;
  onNavigateToTasbeeh: () => void;
  onNavigateToWritten: () => void;
  onNavigateToSettings: () => void;
  /** The Audio Adhkar main screen (from a sub-screen; a no-op on it). */
  onNavigateToAudio: () => void;
}

function AudioBottomNav({ onNavigateHome, onNavigateToTasbeeh, onNavigateToWritten, onNavigateToSettings, onNavigateToAudio }: AudioAdhkarNavProps) {
  return (
    <BottomNav
      className="mt-3"
      activeKey="audio"
      onSelect={(key) => {
        if (key === "home") onNavigateHome();
        if (key === "tasbih") onNavigateToTasbeeh();
        if (key === "written") onNavigateToWritten();
        if (key === "settings") onNavigateToSettings();
        if (key === "audio") onNavigateToAudio();
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
                t.itemsCount(key === "misc" ? AUDIO_VARIOUS_ITEMS.length : audioAdhkarItems[key].length);
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

export type AudioAdhkarList = { kind: "written"; key: "morning" | "evening" } | { kind: "various" };

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
    heard: "عدد مرات الاستماع",
    reciter: "القارئ",
  },
  en: {
    listen: "Listen",
    pause: "Pause",
    resume: "Resume",
    nowPlaying: "Now playing",
    paused: "Paused",
    notRecorded: "No recording yet",
    heard: "Times heard",
    reciter: "Reciter",
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

/** How many times this dhikr was heard to the end in this list (lib/audioAdhkarCounts.ts) — kept across restarts. */
function HeardCount({ collection, itemId }: { collection: AudioAdhkarCollection; itemId: string }) {
  const { language } = useLanguage();
  const count = useAudioAdhkarCount(collection, itemId);
  return (
    <p className="mt-1 text-[11px] font-semibold" style={{ color: "var(--wa-gold)" }} data-audio-count={count}>
      {playerLabels[language].heard}: <span dir="ltr">{count}</span>
    </p>
  );
}

// The Listen / Pause / Resume bar every recorded dhikr card shows.
function PlayerBar({ urls, playback, onStart }: { urls: string[]; playback: AudioAdhkarNowPlaying | null; onStart: () => void }) {
  const { language } = useLanguage();
  const labels = playerLabels[language];
  const status = playback?.status;
  const active = status === "playing" || status === "paused";
  const [Icon, action, onClick] =
    status === "playing"
      ? [Pause, labels.pause, pauseAudioAdhkar]
      : status === "paused"
        ? [Play, labels.resume, resumeAudioAdhkar]
        : [Play, labels.listen, onStart];

  return (
    <div
      data-audio-player-slot=""
      data-audio-source={urls.join(",")}
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
      {active && (
        <span className="min-w-0 truncate text-[11px]" style={{ color: "var(--wa-ink-muted)" }} aria-live="polite">
          {status === "playing" ? labels.nowPlaying : labels.paused}
          {/* The reciter actually heard — shown only when the player reports one (never guessed). */}
          {playback?.reciter && (
            <span data-audio-reciter="">
              {" · "}
              {labels.reciter}: {playback.reciter}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

// Play / Pause / Resume for one Morning/Evening dhikr's recording (see lib/audioAdhkarPlayer.ts).
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
  return <PlayerBar urls={source.urls} playback={playback} onStart={() => startAudioAdhkar(collection, item)} />;
}

const CARD_CLASS = "dithar-audio-dhikr-card px-4 py-4";
// Same emphasis the Written reader gives its active card.
const ACTIVE_CARD_SHADOW = "0 16px 34px -18px rgba(var(--color-shadow-rgb), 0.24), inset 0 0 0 1.5px var(--wa-gold-soft)";

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
      <p className="mt-3 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
        {t.source}: {isEn ? item.source_en : item.source_ar}
      </p>
      <HeardCount collection={collection} itemId={item.id} />
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

// Various: a Tasbeeh dhikr with its own recording, played once per Listen;
// one without a recording keeps the placeholder slot.
function VariousItemCard({ item, collection, playback, openInfo, onToggleInfo }: CardProps<AudioVariousItem>) {
  const { language } = useLanguage();
  const t = tasbeehLabels[language];
  const isEn = language === "en";
  const virtue = isEn ? item.virtue_en : item.virtue_ar;
  const source = isEn ? item.source_en : item.source_ar;
  const mine = playbackFor(playback, { collection, itemId: item.id });
  const isActive = mine?.status === "playing" || mine?.status === "paused";
  const recording = getAudioVariousSource(item);

  return (
    <div
      className={CARD_CLASS}
      style={isActive ? { ...CARD_STYLE, boxShadow: ACTIVE_CARD_SHADOW } : CARD_STYLE}
      data-dhikr-id={item.id}
      data-active-dhikr={isActive ? "" : undefined}
    >
      <ArabicText text={item.text_ar} />
      {recording ? <PlayerBar urls={recording.urls} playback={mine} onStart={() => startAudioVarious(item)} /> : <AudioPlayerSlot />}
      <div className="mt-3 min-w-0">
        {virtue && (
          <p className="text-[11.5px] font-semibold leading-snug" style={{ color: "var(--wa-gold)" }}>
            {t.virtueLabel}: {virtue}
          </p>
        )}
        {source && (
          <p className="mt-1 text-[10.5px] leading-snug" style={{ color: "var(--wa-ink-muted)" }}>
            {t.sourceLabel}: {source}
          </p>
        )}
        <HeardCount collection={collection} itemId={item.id} />
      </div>
      <InfoControls
        itemId={item.id}
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

export function AudioAdhkarListScreen({ list, onBack, ...nav }: AudioAdhkarNavProps & { list: AudioAdhkarList; onBack: () => void }) {
  const { language, dir } = useLanguage();
  const playback = useAudioAdhkarPlayback();
  const collection: AudioAdhkarCollection = list.kind === "written" ? list.key : "misc";
  const [openInfo, setOpenInfo] = useState<InfoTarget | null>(null);
  // Leaving the list stops in-app (WebView) audio; Android's native playback continues (see stopAudioAdhkar).
  useEffect(() => stopAudioAdhkar, []);
  const handleToggleInfo = useCallback<ToggleInfo>((target, buttonEl) => {
    setOpenInfo((prev) =>
      prev?.itemId === target.itemId && prev.kind === target.kind
        ? null
        : { ...target, cardEl: buttonEl.closest<HTMLElement>(".dithar-audio-dhikr-card") ?? buttonEl },
    );
  }, []);
  const handleCloseInfo = useCallback(() => setOpenInfo(null), []);
  const title = writtenAdhkarCategoryLabels[list.kind === "written" ? list.key : "misc"][language];

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
              : AUDIO_VARIOUS_ITEMS.map((item) => (
                  <VariousItemCard key={item.id} item={item} collection={collection} playback={playback} openInfo={openInfo} onToggleInfo={handleToggleInfo} />
                ))}
          </div>
          {openInfo && <InfoPopover key={`${openInfo.itemId}:${openInfo.kind}`} target={openInfo} onClose={handleCloseInfo} />}
        </div>
        <AudioBottomNav {...nav} />
      </AppShell>
    </DeviceFrame>
  );
}
