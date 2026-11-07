import type { CSSProperties, ReactNode } from "react";
import { Bell, BookOpen, Check, Headphones, Mic, Pause, Share2 } from "lucide-react";
import { introFilmLabels } from "../data/introFilmLabels";
import type { IntroSceneId } from "../data/introFilmLabels";
import { quranLabels } from "../data/quranLabels";
import { basairLabels } from "../data/basairLabels";
import { quranJourneyLabels } from "../data/quranJourneyLabels";
import { adhanAudioLabels } from "../data/adhanAudioLabels";
import { ADHAN_MUEZZINS } from "../data/adhanRecordings";
import { homeDashboardLabels } from "../data/homeDashboardLabels";
import { settingsLabels } from "../data/settings";
import { prayerNotificationLabels } from "../data/prayerNotificationLabels";
import { reminderLabels, summaryLabels, timedContentLabels } from "../data/reminderLabels";
import { weeklyScheduleLabels } from "../data/scheduleLabels";
import { archThumbUrl, wallpaperThumbUrl } from "../theme/looks";
import type { LookId } from "../theme/looks";

/**
 * The introduction's feature scenes (IntroFilm.tsx): each one a miniature of the real screen, built from
 * the app's tokens and its own labels, with one or two real interactions played out — a switch turning
 * on, a tap, a state that changes. Every timing is a CSS delay (in seconds, from the scene's start), so a
 * paused film pauses them too, and nothing here runs JavaScript while it plays. No sacred or devotional
 * text: content areas are drawn as blank lines; the only page of the Qur'an shown is the printed image.
 */
type Lang = "ar" | "en";
const css = (vars: Record<string, string | number>) => vars as CSSProperties;
const at = (s: number) => css({ "--d": `${s}s` });

const PAGE = `${import.meta.env.BASE_URL}mushaf/hafs-kfqc-opening/composed/001.svg`;
const EMBLEM = `${import.meta.env.BASE_URL}logos/dithar_emblem.png`;

/** Shown from [from] (0 = from the start) until [to] (omitted = to the end): cross-fades with its neighbours. */
function Phase({ from = 0, to, children, className = "" }: { from?: number; to?: number; children: ReactNode; className?: string }) {
  return (
    <span className={`mini-phase ${from > 0 ? "is-later" : ""} ${to !== undefined ? "is-ending" : ""} ${className}`} style={css({ "--in": `${from}s`, "--out": `${to ?? 0}s` })}>
      {children}
    </span>
  );
}

/** A switch that is on or off — or turns at [turn] seconds. */
function Switch({ on, turn }: { on: boolean; turn?: number }) {
  return <span className={`mini-switch ${on ? "is-on" : ""} ${turn !== undefined ? "is-turning" : ""}`} style={turn !== undefined ? css({ "--at": `${turn}s` }) : undefined} aria-hidden="true" />;
}

/** A finger's touch: a soft ring that blooms once at [t]. */
function Tap({ t }: { t: number }) {
  return <span className="mini-tap" style={css({ "--at": `${t}s` })} aria-hidden="true" />;
}

function Lines({ n, short = false }: { n: number; short?: boolean }) {
  return (
    <span className="mini-lines" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ width: `${i === n - 1 ? (short ? 40 : 62) : 100 - i * 6}%` }} />
      ))}
    </span>
  );
}

function Row({ label, children, d, className = "" }: { label: ReactNode; children?: ReactNode; d?: number; className?: string }) {
  return (
    <div className={`mini-row ${d !== undefined ? "intro-rise" : ""} ${className}`} style={d !== undefined ? at(d) : undefined}>
      <span className="mini-row__label">{label}</span>
      {children}
    </div>
  );
}

// ---- 4 · Reading & Tafsir -----------------------------------------------------------------
function TafsirScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  const q = quranLabels[lang];
  return (
    <div className="mini-wrap">
      <div className="mini-reader intro-rise" style={at(0.1)}>
        {/* The printed page, untouched — only its top shown, nothing laid over it. */}
        <img src={PAGE} alt="" className="mini-reader__page" draggable={false} />
        <div className="mini-pager" dir="rtl">
          <span className="mini-chip">{q.prevPage}</span>
          <span className="mini-chip">{q.nextPage}</span>
        </div>
      </div>
      <div className="mini-card intro-rise" style={at(0.8)}>
        <span className="mini-muted">{t.verse}</span>
        <div className="mini-actions">
          <span className="mini-chip is-gold">
            <BookOpen size={12} aria-hidden="true" /> {basairLabels[lang].viewTafsir}
            <Tap t={1.5} />
          </span>
          <span className="mini-chip">{q.addBookmark}</span>
          <span className="mini-chip">
            <Share2 size={12} aria-hidden="true" /> {q.shareAyah}
          </span>
        </div>
      </div>
      <div className="mini-card mini-sheet intro-rise" style={at(1.9)}>
        <b className="mini-title">{t.tafsirTitle}</b>
        <Lines n={3} />
      </div>
    </div>
  );
}

// ---- 5 · Qur'an Journey ---------------------------------------------------------------
function JourneyScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  const j = quranJourneyLabels[lang];
  return (
    <div className="mini-wrap">
      <div className="mini-card mini-notice intro-rise" style={at(0.2)}>
        <img src={EMBLEM} alt="" className="mini-notice__icon" draggable={false} />
        <div className="mini-notice__body">
          <b className="mini-title">{j.noticeTitle(t.page12, t.of604)}</b>
          <Lines n={2} short />
        </div>
        <Tap t={1.3} />
      </div>
      <span className="mini-chip is-gold intro-rise" style={at(1.6)}>
        <span className="mini-dot" aria-hidden="true" /> {j.markUnread(t.page12)}
      </span>
      <div className="mini-card intro-rise" style={at(2.1)}>
        <span className="mini-muted">{j.title}</span>
        <b className="mini-title">{j.headline(12, 604)}</b>
        <span className="mini-track" aria-hidden="true">
          <span className="mini-track__fill" style={css({ "--w": "8%", "--at": "2.4s" })} />
        </span>
      </div>
    </div>
  );
}

// ---- 6 · Adhan voices -------------------------------------------------------------------
function AdhanScene({ lang }: { lang: Lang }) {
  const a = adhanAudioLabels[lang];
  const names = (["abdulbasit", "husary", "banna"] as const).map((id) => ADHAN_MUEZZINS[id]?.[lang] ?? "");
  return (
    <div className="mini-wrap">
      <div className="mini-card mini-stack intro-rise" style={at(0.1)}>
        <b className="mini-title">{a.pageTitle}</b>
        <Row label={a.rotate}>
          <span className="mini-relative">
            <Switch on={false} turn={0.9} />
            <Tap t={0.8} />
          </span>
        </Row>
        <span className="mini-muted">{a.rotationVoices}</span>
        {names.map((name, i) => (
          <div key={name} className={`mini-voice ${i === 1 ? "is-leaving-rotation" : ""}`} style={i === 1 ? css({ "--at": "2s" }) : undefined}>
            <span className="mini-check" aria-hidden="true">
              <Check size={11} strokeWidth={3} />
            </span>
            <span className="mini-voice__name">{name}</span>
            {i === 1 && <Tap t={1.9} />}
          </div>
        ))}
        <Row label={a.autoPlay} className="mini-row--top">
          <Switch on />
        </Row>
      </div>
    </div>
  );
}

// ---- 7 · Audio Adhkar: resume where you stopped; and the adhan pause ------------------------------
// Its Morning dhikr («سبحان الله وبحمده») is heard whole (SCENE_SOUNDS): it plays to its end, the pause
// comes in the quiet before the next repetition, and «متابعة» continues into that quiet.
// The real behaviour (audioadhkar/AudioAdhkarLogic.kt AdhanSuppression, AudioAdhkarPauseReceiver.kt): from
// each adhan, nothing plays for 30 minutes and anything playing stops. Scheduled Miscellaneous Adhkar then
// resume by themselves when the pause ends, with the two notices below. (An interrupted Morning/Evening
// session instead offers «استئناف الأذكار» — the Resume Adhkar prompt — rather than restarting unasked.)
function AudioScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  const resume = lang === "ar" ? { go: "متابعة", restart: "من البداية" } : { go: "Resume", restart: "Restart" };
  return (
    <div className="mini-wrap">
      <div className="mini-swap mini-swap--block intro-rise" style={at(0.1)}>
        {/* Morning Adhkar, paused by hand and resumed where it stopped. */}
        <Phase to={3.5}>
          <div className="mini-card mini-player">
            <div className="mini-player__head">
              <Headphones size={16} aria-hidden="true" />
              <b className="mini-title">{t.morning}</b>
            </div>
            <span className="mini-track" aria-hidden="true">
              <span className="mini-track__play" />
            </span>
            <div className="mini-swap">
              <Phase to={2.4} className="mini-player__line">
                <span className="mini-round">
                  <Pause size={14} aria-hidden="true" />
                  <Tap t={2.3} />
                </span>
                <span className="mini-muted">{t.repetition}</span>
              </Phase>
              <Phase from={2.4} to={3.1} className="mini-player__line">
                <span className="mini-muted">{t.stoppedAt}</span>
                <span className="mini-chip is-solid mini-relative">
                  {resume.go}
                  <Tap t={3} />
                </span>
                <span className="mini-chip">{resume.restart}</span>
              </Phase>
              <Phase from={3.1} className="mini-player__line">
                <span className="mini-round">
                  <Pause size={14} aria-hidden="true" />
                </span>
                <span className="mini-muted">{t.repetition}</span>
              </Phase>
            </div>
          </div>
        </Phase>
        {/* Scheduled Miscellaneous Adhkar: the adhan stops them, and 30 minutes later they resume. */}
        <Phase from={3.8}>
          <div className="mini-card mini-player">
            <div className="mini-player__head">
              <Headphones size={16} aria-hidden="true" />
              <b className="mini-title">{t.misc}</b>
              <span className="mini-adhan-badge" style={css({ "--at": "4.1s" })}>
                {t.adhan} · <span dir="ltr">{t.adhanAt}</span>
              </span>
            </div>
            <div className="mini-swap mini-swap--block">
              <Phase to={4.1}>
                <span className="mini-track" aria-hidden="true">
                  <span className="mini-track__fill is-held" />
                </span>
              </Phase>
              <Phase from={4.1} to={5.9}>
                <span className="mini-notice-text">{t.miscPaused}</span>
                <span className="mini-pause-span" aria-hidden="true">
                  <span dir="ltr">{t.adhanAt}</span>
                  <span className="mini-track mini-track--wide">
                    <span className="mini-track__fill" style={css({ "--w": "100%", "--at": "4.4s", "--grow": "1.4s" })} />
                  </span>
                  <span dir="ltr">{t.resumeAt}</span>
                </span>
                <span className="mini-muted">{t.pauseWindow}</span>
              </Phase>
              <Phase from={5.9} className="mini-player__line">
                <span className="mini-round">
                  <Pause size={14} aria-hidden="true" />
                </span>
                <span className="mini-gold">{t.miscResumed}</span>
              </Phase>
            </div>
          </div>
        </Phase>
      </div>
    </div>
  );
}

// ---- 8 · Written Adhkar ---------------------------------------------------------------------
function WrittenScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  const h = homeDashboardLabels[lang];
  const d = t.digits;
  return (
    <div className="mini-wrap">
      <div className="mini-grid intro-rise" style={at(0.1)}>
        {t.categories.map((c, i) => (
          <span key={c} className={`mini-tile ${i === 0 ? "mini-tapped" : ""}`} style={i === 0 ? css({ "--at": "0.7s" }) : undefined}>
            {c}
            {i === 0 && <Tap t={0.7} />}
          </span>
        ))}
      </div>
      <div className="mini-card mini-dhikr intro-rise" style={at(1)}>
        <Lines n={2} />
        <div className="mini-swap mini-swap--center">
          <Phase to={1.6} className="mini-counter">{t.count(d(1))}</Phase>
          <Phase from={1.6} to={2.2} className="mini-counter">{t.count(d(2))}</Phase>
          <Phase from={2.2} className="mini-counter is-done">
            <Check size={14} strokeWidth={3} aria-hidden="true" /> {t.count(d(3))}
          </Phase>
          <Tap t={1.5} />
          <Tap t={2.1} />
        </div>
      </div>
      <div className="mini-lamp-row intro-rise" style={at(2.4)}>
        <span className="mini-lamp" style={css({ "--at": "2.7s" })} aria-hidden="true" />
        <span>{h.morningAdhkar}</span>
        <span className="mini-swap">
          <Phase to={2.7} className="mini-muted">{h.lampIdle}</Phase>
          <Phase from={2.7} className="mini-gold">{h.lampDone}</Phase>
        </span>
      </div>
    </div>
  );
}

// ---- 9 · Tasbeeh ------------------------------------------------------------------------------
function TasbeehScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  const tl = lang === "ar" ? { target: "العدد المستهدف", voice: "التسبيح الصوتي", listening: "جارٍ الاستماع…" } : { target: "Target count", voice: "Voice Tasbeeh", listening: "Listening…" };
  return (
    <div className="mini-wrap mini-wrap--tasbeeh">
      <div className="mini-ring" aria-hidden="true">
        <Lines n={1} short />
        <span className={`mini-count ${lang === "ar" ? "is-ar" : ""}`} />
        <Tap t={0.9} />
        <Tap t={1.6} />
      </div>
      <div className="mini-tasbeeh-row intro-rise" style={at(1.8)}>
        <span className="mini-chip">
          {tl.target}: {t.target33}
        </span>
        <span className="mini-mic" style={css({ "--at": "2.4s" })}>
          <Mic size={13} aria-hidden="true" />
          <span className="mini-swap">
            <Phase to={2.4}>{tl.voice}</Phase>
            <Phase from={2.4}>{tl.listening}</Phase>
          </span>
        </span>
      </div>
    </div>
  );
}

// ---- 10 · Floating Tasbeeh --------------------------------------------------------------------
function FloatingScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  const s = settingsLabels[lang];
  return (
    <div className="mini-wrap">
      <div className="mini-card intro-rise" style={at(0.1)}>
        <Row label={s.floatingTasbeehRow}>
          <span className="mini-swap mini-relative">
            <Phase to={0.8} className="mini-chip">{s.floatingTasbeehEnableLabel}</Phase>
            <Phase from={0.8} className="mini-chip is-solid">{s.floatingTasbeehDisableLabel}</Phase>
            <Tap t={0.7} />
          </span>
        </Row>
        <span className="mini-swap">
          <Phase to={0.8} className="mini-muted">{s.floatingTasbeehDisabledStatus}</Phase>
          <Phase from={0.8} className="mini-muted">{s.floatingTasbeehEnabledStatus}</Phase>
        </span>
      </div>
      <div className="mini-phone intro-rise" style={at(1)}>
        <span className="mini-phone__label">{t.floatingNote}</span>
        <span className="mini-phone__block" />
        <span className="mini-phone__block is-short" />
        <span className="mini-phone__block" />
        {/* The pill, then full-screen counting, then the pill again. Its buttons are in Arabic on every phone (the overlay's own labels). */}
        <Phase from={1.3} to={2.2} className="mini-pill">
          {t.digits(21)}
          <Tap t={2} />
        </Phase>
        <Phase from={2.2} to={3.5} className="mini-overlay">
          <span className="mini-overlay__count">{t.digits(22)}</span>
          <span className="mini-overlay__buttons" dir="rtl" lang="ar">
            <span className="mini-chip mini-relative">
              تصغير
              <Tap t={3.3} />
            </span>
            <span className="mini-chip">إغلاق</span>
          </span>
        </Phase>
        <Phase from={3.5} className="mini-pill">{t.digits(22)}</Phase>
      </div>
    </div>
  );
}

// ---- 11 · Widget & sharing ---------------------------------------------------------------------
function WidgetScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  return (
    <div className="mini-wrap">
      <div className="mini-phone mini-phone--home intro-rise" style={at(0.1)}>
        <div className="mini-widget">
          <span className="mini-swap">
            <Phase to={1.4} className="mini-gold">{t.dua}</Phase>
            <Phase from={1.4} className="mini-gold">{t.hadith}</Phase>
          </span>
          <span className="mini-swap mini-swap--block">
            <Phase to={1.4}>
              <Lines n={3} />
            </Phase>
            <Phase from={1.4}>
              <Lines n={2} short />
            </Phase>
          </span>
          <span className="mini-widget__brand">{t.widgetTitle}</span>
        </div>
        <span className="mini-apps" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} />
          ))}
        </span>
        <div className="mini-card mini-share intro-rise" style={at(2)}>
          <b className="mini-title">
            <Share2 size={13} aria-hidden="true" /> {t.shareTitle}
          </b>
          <span className="mini-share__row">{t.asText}</span>
          <span className="mini-share__row is-picked mini-relative" style={css({ "--at": "2.8s" })}>
            {t.asImage}
            <Tap t={2.8} />
          </span>
          <span className="mini-share__row">{t.copy}</span>
        </div>
      </div>
    </div>
  );
}

// ---- 12 · Notifications --------------------------------------------------------------------------
function NotifyScene({ lang }: { lang: Lang }) {
  const rows = [prayerNotificationLabels[lang].row, reminderLabels[lang].row, timedContentLabels[lang].master, summaryLabels[lang].row, quranJourneyLabels[lang].settingsRow];
  return (
    <div className="mini-wrap">
      <div className="mini-card mini-stack">
        {rows.map((label, i) => (
          <Row key={label} label={label} d={0.1 + i * 0.15}>
            <span className="mini-relative">
              {i === 2 ? <Switch on turn={1.9} /> : <Switch on />}
              {i === 2 && <Tap t={1.8} />}
            </span>
          </Row>
        ))}
      </div>
    </div>
  );
}

// ---- 13 · Days off ---------------------------------------------------------------------------------
function DaysOffScene({ lang, dir }: { lang: Lang; dir: "rtl" | "ltr" }) {
  const t = introFilmLabels[lang].mini;
  const w = weeklyScheduleLabels[lang];
  return (
    <div className="mini-wrap">
      <div className="mini-card mini-stack intro-rise" style={at(0.1)}>
        <b className="mini-title">{w.holidayTitle}</b>
        <span className="mini-muted">{w.holidayDays}</span>
        <div className="mini-days">
          {t.days.map((day, i) => (
            <span key={i} className={`mini-day ${i === 5 || i === 6 ? "is-picked" : ""}`} style={i === 5 ? css({ "--at": "0.9s" }) : i === 6 ? css({ "--at": "1.2s" }) : undefined}>
              {day}
              {(i === 5 || i === 6) && <Tap t={i === 5 ? 0.85 : 1.15} />}
            </span>
          ))}
        </div>
        <Row label={w.holidayTime} d={1.4}>
          <span className="mini-chip is-gold">{t.time10}</span>
        </Row>
      </div>
      {/* On those days, these wait for the chosen time. */}
      <div className="mini-timeline intro-rise" style={css({ "--d": "1.9s", "--dirx": dir === "rtl" ? -1 : 1 })}>
        <span className="mini-timeline__line" aria-hidden="true" />
        <span className="mini-timeline__mark">{t.time10}</span>
        {t.delayed.map((name, i) => (
          <span key={name} className="mini-timeline__item" style={css({ "--row": i, "--at": `${2.2 + i * 0.15}s` })}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---- 14 · Statistics & summary -----------------------------------------------------------------------
const BARS = [38, 62, 50, 80, 56, 92, 70];
function StatsScene({ lang }: { lang: Lang }) {
  const s = settingsLabels[lang];
  return (
    <div className="mini-wrap">
      <div className="mini-segments intro-rise" style={at(0.1)}>
        {[s.periodDaily, s.periodWeekly, s.periodMonthly, s.periodYearly].map((p, i) => (
          <span key={p} className={i === 1 ? "is-picked" : ""}>
            {p}
          </span>
        ))}
      </div>
      <div className="mini-card intro-rise" style={at(0.3)}>
        <div className="mini-bars" aria-hidden="true">
          {BARS.map((h, i) => (
            <span key={i} style={css({ "--h": `${h}%`, "--at": `${0.5 + i * 0.12}s` })} />
          ))}
        </div>
        {[s.morningTitle, s.eveningTitle, s.tasbeehTitle].map((name, i) => (
          <Row key={name} label={name} d={1.3 + i * 0.12}>
            <span className="mini-meter" style={css({ "--w": `${[80, 64, 48][i]}%`, "--at": `${1.5 + i * 0.12}s` })} />
          </Row>
        ))}
      </div>
      <div className="mini-card mini-notice intro-rise" style={at(2.3)}>
        <span className="mini-round">
          <Bell size={13} aria-hidden="true" />
        </span>
        <div className="mini-notice__body">
          <b className="mini-title">{summaryLabels[lang].row}</b>
          <Lines n={1} short />
        </div>
      </div>
    </div>
  );
}

// ---- 15 · Appearance -----------------------------------------------------------------------------------
const LOOKS: LookId[] = ["classic", "night", "nature", "sunset"];
function LooksScene({ lang }: { lang: Lang }) {
  const t = introFilmLabels[lang].mini;
  return (
    <div className="mini-wrap">
      <div className="mini-looks intro-rise" style={at(0.1)}>
        {LOOKS.map((look, i) => (
          <span key={look} className="mini-look">
            <img src={archThumbUrl(look)} alt="" draggable={false} />
            <span className="mini-look__ring" style={css({ "--in": `${0.4 + i * 0.6}s`, "--out": `${1 + i * 0.6}s`, "--last": i === LOOKS.length - 1 ? 1 : 0 })} />
            <span className="mini-look__name">{t.looks[i]}</span>
          </span>
        ))}
      </div>
      <div className="mini-card intro-rise" style={at(2.4)}>
        <Row label={settingsLabels[lang].lookRow}>
          <span className="mini-walls" aria-hidden="true">
            {(["sea", "mosque", "flowers"] as const).map((w) => (
              <img key={w} src={wallpaperThumbUrl(w)} alt="" draggable={false} />
            ))}
          </span>
        </Row>
        <Row label={t.autoDark}>
          <span className="mini-chip is-gold">{t.byTime}</span>
        </Row>
      </div>
    </div>
  );
}

/** The scene's miniature, or null for the three original scenes and the closing (IntroFilm draws those). */
export function FeatureScene({ id, lang, dir }: { id: IntroSceneId; lang: Lang; dir: "rtl" | "ltr" }) {
  switch (id) {
    case "tafsir":
      return <TafsirScene lang={lang} />;
    case "journey":
      return <JourneyScene lang={lang} />;
    case "adhan":
      return <AdhanScene lang={lang} />;
    case "audio":
      return <AudioScene lang={lang} />;
    case "written":
      return <WrittenScene lang={lang} />;
    case "tasbeeh":
      return <TasbeehScene lang={lang} />;
    case "floating":
      return <FloatingScene lang={lang} />;
    case "widget":
      return <WidgetScene lang={lang} />;
    case "notify":
      return <NotifyScene lang={lang} />;
    case "daysoff":
      return <DaysOffScene lang={lang} dir={dir} />;
    case "stats":
      return <StatsScene lang={lang} />;
    case "looks":
      return <LooksScene lang={lang} />;
    default:
      return null;
  }
}
