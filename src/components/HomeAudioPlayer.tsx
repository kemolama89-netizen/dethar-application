import { lazy, Suspense } from "react";
import { Headphones, Play } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { homeDashboardLabels } from "../data/homeDashboardLabels";
import { useAudioAdhkarPlayback } from "../lib/audioAdhkarPlayback";
import { useLastPlayed } from "../lib/lastPlayedDhikr";
import { useAdhanPlayback } from "../lib/adhanPlayback";

// The Home screen's dhikr player card. While a dhikr plays (or is paused) it
// shows the real now-playing panel (HomeNowPlaying, loaded only then); when
// nothing plays it shows the last dhikr the user listened to, with a button
// to play it again — or, before any, a short line saying what will appear.
// While the scheduled adhan plays (Android), the card shows it instead, in
// the same panel (HomeAdhanNowPlaying) — the native player never plays the
// adhan and a dhikr at once.
const HomeNowPlaying = lazy(() => import("./HomeNowPlaying").then((m) => ({ default: m.HomeNowPlaying })));
const HomeAdhanNowPlaying = lazy(() => import("./HomeNowPlaying").then((m) => ({ default: m.HomeAdhanNowPlaying })));

export function HomeAudioPlayer({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const t = homeDashboardLabels[language];
  const playback = useAudioAdhkarPlayback();
  const last = useLastPlayed();
  const adhan = useAdhanPlayback();
  const active = playback && (playback.status === "playing" || playback.status === "paused") ? playback : null;
  const state = adhan ? `adhan-${adhan.status}` : active ? active.status : last ? "last" : "empty";
  const icon = (
    <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full min-[440px]:flex" style={{ background: "rgba(var(--color-gold-rgb), 0.16)", color: "var(--color-primary)" }} aria-hidden="true">
      <Headphones size={22} />
    </span>
  );
  return (
    <section
      className={`flex flex-col justify-center border px-3.5 py-3 ${className}`}
      style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", borderRadius: "var(--card-radius)", boxShadow: "0 2px 10px rgba(var(--color-gold-rgb), 0.08)" }}
      aria-label={t.player}
      data-home-player={state}
    >
      {adhan ? (
        <Suspense fallback={<p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>…</p>}>
          <HomeAdhanNowPlaying adhan={adhan} />
        </Suspense>
      ) : active ? (
        // While playing: the dhikr's name and reciter, progress and time, with pause/resume and stop beside the name.
        <Suspense fallback={<p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>…</p>}>
          <HomeNowPlaying playback={active} />
        </Suspense>
      ) : last ? (
        <div className="flex items-center gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[12px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
              <Headphones size={13} className="shrink-0 min-[440px]:hidden" style={{ color: "var(--color-primary)" }} aria-hidden="true" />
              {t.playerLast}
            </p>
            <p dir="auto" className="line-clamp-2 text-start text-[16px] font-bold leading-snug" style={{ color: "var(--color-text-primary)", fontFamily: language === "en" ? undefined : "var(--font-display)" }} data-home-player-last={last.itemId}>
              {language === "en" ? last.titleEn : last.titleAr}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void import("../lib/replayLastPlayed").then((m) => m.replayLastPlayed(last))}
            className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold"
            style={{ background: "var(--color-primary)", color: "var(--color-primary-contrast)" }}
            data-home-player-replay=""
          >
            <Play size={17} /> {t.play}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[14px] font-bold" style={{ color: "var(--color-text-primary)" }}>
              <Headphones size={15} className="shrink-0 min-[440px]:hidden" style={{ color: "var(--color-primary)" }} aria-hidden="true" />
              {t.player}
            </p>
            <p className="text-[12px] leading-snug" style={{ color: "var(--color-text-muted)" }} data-home-player-empty="">
              {t.playerIdle} {t.playerEmpty}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * What Home keeps of the player now that the card itself is gone (to give
 * the prayer times the room): the same now-playing panel, shown ONLY while
 * the adhan or a dhikr is actually playing or paused — so pause/stop stay
 * one tap away on Home — and nothing at all otherwise.
 */
export function HomeActivePlayback({ className = "" }: { className?: string }) {
  const { language } = useLanguage();
  const t = homeDashboardLabels[language];
  const playback = useAudioAdhkarPlayback();
  const adhan = useAdhanPlayback();
  const active = playback && (playback.status === "playing" || playback.status === "paused") ? playback : null;
  if (!adhan && !active) return null;
  return (
    <section
      className={`flex flex-col justify-center border px-3.5 py-2.5 ${className}`}
      style={{ borderColor: "var(--color-gold-soft)", background: "var(--color-surface)", borderRadius: "var(--card-radius)", boxShadow: "0 2px 10px rgba(var(--color-gold-rgb), 0.08)" }}
      aria-label={t.player}
      data-home-player={adhan ? `adhan-${adhan.status}` : active!.status}
    >
      <Suspense fallback={<p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>…</p>}>
        {adhan ? <HomeAdhanNowPlaying adhan={adhan} /> : <HomeNowPlaying playback={active!} />}
      </Suspense>
    </section>
  );
}
