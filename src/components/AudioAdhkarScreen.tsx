import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { BookOpenText, ListMusic, Languages, Pause, Play, Square, Volume2 } from "lucide-react";
import { DeviceFrame } from "./DeviceFrame";
import { AppShell } from "./AppShell";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { BackHeader, StickyBackButton } from "./BackHeader";
import { WrittenAdhkarCategoryCard } from "./WrittenAdhkarCategoryCard";
import { ResumeAdhkarBanner } from "./ResumeAdhkarBanner";
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
import { formatPlaybackTime, useAudioAdhkarProgress } from "../lib/useAudioAdhkarProgress";
import { usePageVisible } from "../lib/pageVisibility";
import { useInView } from "../lib/useInView";
import {
  AUDIO_ENABLED_COLLECTIONS,
  getAudioAdhkarPlayAll,
  getAudioAdhkarSource,
  getAudioAdhkarPlaybackFailure,
  getAudioVariousSource,
  pauseAudioAdhkar,
  playableAudioAdhkar,
  resumeAudioAdhkar,
  startAudioAdhkar,
  startAudioAdhkarPlayAll,
  startAudioVarious,
  stopAudioAdhkar,
  stopAudioAdhkarPlayback,
  subscribeAudioAdhkarPlayAll,
  subscribeAudioAdhkarPlaybackFailure,
} from "../lib/audioAdhkarPlayer";
import type { AudioAdhkarCollection, AudioAdhkarNowPlaying, AudioAdhkarPlaybackState } from "../lib/audioAdhkarPlayback";
import type { AudioAdhkarPlayAllEntry, AudioAdhkarProgress } from "../lib/audioAdhkarPlayer";

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

          {/* An adhan-interrupted Morning/Evening session, offered back (Android only). */}
          <ResumeAdhkarBanner />

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
    repetition: (n: number, total: number | null) => (total ? `التكرار ${n} من ${total}` : `التكرار ${n}`),
    loading: "جارٍ التحميل…",
    progress: "تقدّم التشغيل",
    time: "الوقت المنقضي / المدة",
    failed: "تعذّر تشغيل التسجيل الآن. حاول مرة أخرى.",
    playAll: "تشغيل الكل",
    stopAll: "إيقاف",
    playAllHint: (n: number) => `${n} ${n === 1 ? "ذكر" : "أذكار"} متتالية`,
    playAllPosition: (n: number, total: number) => `الذكر ${n} من ${total}`,
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
    repetition: (n: number, total: number | null) => (total ? `Repetition ${n} of ${total}` : `Repetition ${n}`),
    loading: "Loading…",
    progress: "Playback progress",
    time: "Elapsed / total",
    failed: "Couldn't play this recording right now. Please try again.",
    playAll: "Play All",
    stopAll: "Stop",
    playAllHint: (n: number) => `${n} ${n === 1 ? "dhikr" : "adhkar"} in sequence`,
    playAllPosition: (n: number, total: number) => `Dhikr ${n} of ${total}`,
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

/**
 * The active dhikr's player details — every value read from the real
 * playback: the title and reciter the player reports, the repetition from
 * the playback state, and the position/length from the media itself
 * (useAudioAdhkarProgress). The waveform moves only while audio plays.
 */
/**
 * `large`: the Home screen's bigger player (larger title, details and
 * progress), with `trailing` (its controls) beside the title; the Audio
 * Adhkar cards use neither.
 */
export function NowPlayingPanel({ title, playback, large = false, trailing }: { title?: string; playback: AudioAdhkarNowPlaying; large?: boolean; trailing?: ReactNode }) {
  const { language } = useLanguage();
  const labels = playerLabels[language];
  const progress = useAudioAdhkarProgress(true, playback.status === "playing", `${playback.collection}:${playback.itemId}:${playback.repetition}`);
  const subtitle = (
    <>
      {labels.repetition(playback.repetition, playback.total)}
      {/* The reciter actually heard — shown only when the player reports one (never guessed). */}
      {playback.reciter && (
        <span data-audio-reciter="">
          {" · "}
          {labels.reciter}: {playback.reciter}
        </span>
      )}
    </>
  );
  return <NowPlayingView title={title} subtitle={subtitle} status={playback.status} progress={progress} large={large} trailing={trailing} />;
}

/**
 * The now-playing panel itself — title, a detail line, waveform, real
 * progress and "00:18 / 02:45" — for whatever plays: a dhikr
 * (NowPlayingPanel above) or the adhan (HomeAdhanNowPlaying).
 */
export function NowPlayingView({
  title,
  subtitle,
  status,
  progress,
  large = false,
  trailing,
}: {
  title?: string;
  subtitle?: ReactNode;
  status: string;
  progress: AudioAdhkarProgress | null;
  large?: boolean;
  trailing?: ReactNode;
}) {
  const { language } = useLanguage();
  const labels = playerLabels[language];
  const playing = status === "playing";
  // Decorative motion (waveform, loading bar) only while it can be seen:
  // never paused, in the background, or scrolled off screen.
  const panelRef = useRef<HTMLDivElement>(null);
  const visible = usePageVisible();
  const inView = useInView(panelRef);
  const animate = playing && visible && inView;
  const known = progress && progress.durationMs !== null && progress.durationMs > 0;
  const fraction = known ? Math.min(1, progress.positionMs / progress.durationMs!) : 0;
  return (
    <div ref={panelRef} className={`flex flex-col px-1 ${large ? "gap-1.5" : "mt-2 gap-1.5"}`} data-now-playing={status}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {title && (
            <p dir="auto" className={`truncate text-start font-semibold ${large ? "text-[16px] leading-snug" : "text-[12.5px]"}`} style={{ color: "var(--wa-ink)", fontFamily: language === "en" ? undefined : "var(--font-display)" }} data-now-playing-title="">
              {title}
            </p>
          )}
          <p className={`truncate ${large ? "text-[12px]" : "text-[11px]"}`} style={{ color: "var(--wa-ink-muted)" }}>
            {subtitle}
          </p>
        </div>
        <span className={`dithar-waveform ${animate ? "is-playing" : ""}`} aria-hidden="true" data-waveform={animate ? "on" : "off"}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ background: "var(--wa-gold)", animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
        {trailing}
      </div>
      <div
        role="progressbar"
        aria-label={labels.progress}
        aria-valuemin={0}
        aria-valuemax={known ? Math.round(progress.durationMs! / 1000) : undefined}
        aria-valuenow={progress ? Math.round(progress.positionMs / 1000) : undefined}
        aria-busy={!progress || progress.loading}
        className={`relative w-full overflow-hidden rounded-full ${large ? "h-2" : "h-1.5"}`}
        style={{ background: "var(--wa-gold-hairline)" }}
        data-progress={known ? Math.round(fraction * 1000) / 1000 : "unknown"}
      >
        {known ? (
          <div className={`h-full rounded-full ${playing ? "dithar-progress-fill" : ""}`} style={{ width: `${fraction * 100}%`, background: "var(--wa-gold)" }} />
        ) : (
          <div className={`dithar-progress-indeterminate h-full w-1/3 rounded-full ${animate ? "is-playing" : ""}`} style={{ background: "var(--wa-gold-soft)" }} />
        )}
      </div>
      {/* "00:18 / 02:45": the real position and the file's real length (--:-- while unknown, never guessed). */}
      <div className={`flex items-center justify-between gap-2 tabular-nums ${large ? "text-[12px]" : "text-[11px]"}`} style={{ color: "var(--wa-ink-muted)" }}>
        <span dir="ltr" data-playback-time="" aria-label={labels.time}>
          <span data-elapsed="">{progress && !progress.loading ? formatPlaybackTime(progress.positionMs) : "--:--"}</span>
          {" / "}
          <span data-duration="">{known ? formatPlaybackTime(progress.durationMs) : "--:--"}</span>
        </span>
        {(!progress || progress.loading) && playing ? <span data-loading="">{labels.loading}</span> : null}
      </div>
    </div>
  );
}

// The Listen / Pause / Resume bar every recorded dhikr card shows, with the
// now-playing details below it while this dhikr is the one playing.
function PlayerBar({
  urls,
  playback,
  onStart,
  title,
  itemRef,
}: {
  urls: string[];
  playback: AudioAdhkarNowPlaying | null;
  onStart: () => void;
  title?: string;
  itemRef: { collection: AudioAdhkarCollection; itemId: string };
}) {
  const { language } = useLanguage();
  const labels = playerLabels[language];
  const failure = useSyncExternalStore(subscribeAudioAdhkarPlaybackFailure, getAudioAdhkarPlaybackFailure, () => null);
  const failed = failure !== null && failure.collection === itemRef.collection && failure.itemId === itemRef.itemId;
  const status = playback?.status;
  const active = status === "playing" || status === "paused";
  const [Icon, action, onClick] =
    status === "playing"
      ? [Pause, labels.pause, pauseAudioAdhkar]
      : status === "paused"
        ? [Play, labels.resume, resumeAudioAdhkar]
        : [Play, labels.listen, onStart];

  return (
    <>
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
          </span>
        )}
      </div>
      {active && playback && <NowPlayingPanel title={title} playback={playback} />}
      {failed && !active && (
        <p role="status" className="mt-1.5 px-1 text-[11px]" style={{ color: "var(--wa-ink-muted)" }} data-audio-failed="">
          {labels.failed}
        </p>
      )}
    </>
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
  // The dhikr's own name, in the app's language.
  const title = (language === "en" ? item.title_en : item.title_ar) ?? item.title_ar ?? undefined;
  return <PlayerBar urls={source.urls} playback={playback} title={title} itemRef={{ collection, itemId: item.id }} onStart={() => startAudioAdhkar(collection, item)} />;
}

/**
 * «تشغيل الكل» / Play All: the section's recorded adhkar one after another
 * (lib/audioAdhkarPlayer.ts — startAudioAdhkarPlayAll), at any time, also
 * after the scheduled time has passed. While its run plays here the same
 * button pauses and resumes it, with Stop beside it and which dhikr it is
 * on; the run's place survives leaving and re-entering the list.
 */
function PlayAllBar({ collection, entries, playback }: { collection: AudioAdhkarCollection; entries: readonly AudioAdhkarPlayAllEntry[]; playback: AudioAdhkarPlaybackState }) {
  const { language } = useLanguage();
  const labels = playerLabels[language];
  const run = useSyncExternalStore(subscribeAudioAdhkarPlayAll, getAudioAdhkarPlayAll, () => null);
  const mine = run?.collection === collection ? run : null;
  const playableCount = useMemo(() => playableAudioAdhkar(collection, entries).length, [collection, entries]);
  if (playableCount === 0) return null;
  const status = mine && playback?.collection === collection ? playback.status : undefined;
  const [Icon, action, onClick] =
    status === "playing"
      ? [Pause, labels.pause, pauseAudioAdhkar]
      : status === "paused"
        ? [Play, labels.resume, resumeAudioAdhkar]
        : [ListMusic, labels.playAll, () => void startAudioAdhkarPlayAll(collection, entries)];
  const running = status === "playing" || status === "paused";
  return (
    <div
      className="mt-4 flex items-center gap-2 rounded-full py-1 ps-1 pe-3"
      style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-soft)", background: "var(--wa-surface)" }}
      data-play-all={running ? status : "idle"}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={running ? `${action} — ${labels.playAll}` : action}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-bold"
        style={{ background: "var(--wa-gold)", color: "var(--wa-surface)" }}
        data-play-all-button=""
      >
        <Icon size={15} strokeWidth={2} aria-hidden="true" />
        {action}
      </button>
      <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: "var(--wa-ink-muted)" }} aria-live="polite" data-play-all-status="">
        {running && mine ? labels.playAllPosition(mine.index + 1, mine.count) : labels.playAllHint(playableCount)}
      </span>
      {running && (
        <button
          type="button"
          onClick={stopAudioAdhkarPlayback}
          aria-label={`${labels.stopAll} — ${labels.playAll}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ boxShadow: "inset 0 0 0 1px var(--wa-gold-hairline)", color: "var(--wa-ink-muted)" }}
          data-play-all-stop=""
        >
          <Square size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
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
      {recording ? <PlayerBar urls={recording.urls} playback={mine} title={isEn && item.text_en ? item.text_en : item.text_ar} itemRef={{ collection: "misc", itemId: item.id }} onStart={() => startAudioVarious(item)} /> : <AudioPlayerSlot />}
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
  const playAllEntries = useMemo<AudioAdhkarPlayAllEntry[]>(
    () =>
      list.kind === "written"
        ? audioAdhkarItems[list.key].map((item) => ({ kind: "written" as const, item }))
        : AUDIO_VARIOUS_ITEMS.map((item) => ({ kind: "various" as const, item })),
    [list],
  );
  // Play All moving on to the next dhikr brings its card into view (only while this list's run plays).
  const run = useSyncExternalStore(subscribeAudioAdhkarPlayAll, getAudioAdhkarPlayAll, () => null);
  const followId = run?.collection === collection && playback?.collection === collection && playback.status !== "finished" ? playback.itemId : null;
  useEffect(() => {
    if (!followId) return;
    const card = [...document.querySelectorAll<HTMLElement>(".dithar-audio-list [data-dhikr-id]")].find((el) => el.dataset.dhikrId === followId);
    if (card && typeof card.scrollIntoView === "function") card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [followId]);

  return (
    <DeviceFrame background="var(--wa-page-bg)" scrollLocked={openInfo !== null}>
      <AppShell>
        <TopBar />
        <div className="flex flex-1 flex-col">
          {/* Same always-reachable back control as the Written Adhkar reader:
              it stays pinned while the dhikr list scrolls. */}
          <BackHeader title={title} onBack={onBack} backLabel={writtenAdhkarLabels[language].back} hideButton />
          <StickyBackButton onBack={onBack} backLabel={writtenAdhkarLabels[language].back} dir={dir} />
          <PlayAllBar collection={collection} entries={playAllEntries} playback={playback} />
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
