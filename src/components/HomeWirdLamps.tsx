import { useId } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../theme/LanguageContext";
import { homeDashboardLabels } from "../data/homeDashboardLabels";

// The Morning and Evening Adhkar sessions as two lamps hanging in the prayer
// panel's niche: a lamp is lit once its session is complete today. Each opens
// that session in Written Adhkar. State is always said in words too, never by
// the light alone.

export type WirdLampSection = "morning" | "evening";
/** done: completed today. due: inside its time window and not done. idle: neither. */
export type WirdLampState = "done" | "due" | "idle";

/** A hanging glass mosque lamp: suspension, flared neck, round bowl, foot; a flame when lit. */
function LampArt({ lit }: { lit: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className="dithar-lamp__art" viewBox="0 0 48 60" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-glass`} cx="50%" cy="62%" r="60%">
          <stop offset="0" stopColor="#fff6d8" />
          <stop offset="0.45" stopColor="#f3d48c" />
          <stop offset="1" stopColor="#c6a15b" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffe7ae" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffe7ae" stopOpacity="0" />
        </radialGradient>
      </defs>
      {lit && <circle cx="24" cy="37" r="24" fill={`url(#${id}-glow)`} />}
      <path d="M15 17 L24 6 L33 17" fill="none" stroke="#e9c983" strokeWidth="1" />
      <path
        d="M15 17 C15.5 22 17 24 16.8 27 C13.5 29.5 11 33 11 37.5 C11 44 16.5 49 24 49 C31.5 49 37 44 37 37.5 C37 33 34.5 29.5 31.2 27 C31 24 32.5 22 33 17 Z"
        fill={lit ? `url(#${id}-glass)` : "rgba(10, 16, 32, 0.62)"}
        stroke="#e9c983"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13.6 17 H34.4" stroke="#e9c983" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 49.2 H28 L29.5 53 H18.5 Z" fill={lit ? "#c6a15b" : "none"} stroke="#e9c983" strokeWidth="1.2" strokeLinejoin="round" />
      {lit ? (
        <path d="M24 31 C26.6 34.6 27.6 36.6 27.6 38.8 A3.6 3.6 0 0 1 20.4 38.8 C20.4 36.6 21.4 34.6 24 31Z" fill="#fffdf2" />
      ) : (
        <path d="M24 41 V36" stroke="#e9c983" strokeWidth="1.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function WirdLamp({
  section,
  state,
  how,
  onOpen,
}: {
  section: WirdLampSection;
  state: WirdLampState;
  /** How a completed session was completed (lib/stats.ts wirdsHow). */
  how: readonly ("read" | "listened")[];
  onOpen?: (section: WirdLampSection) => void;
}) {
  const { language, dir } = useLanguage();
  const t = homeDashboardLabels[language];
  const title = section === "morning" ? t.morningAdhkar : t.eveningAdhkar;
  const howText = how.map((h) => t.how[h]).join(" + ");
  const stateText = state === "done" ? (howText ? `${t.lampDone} (${howText})` : t.lampDone) : state === "due" ? t.lampDue : t.lampIdle;
  const Arrow = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      className={`dithar-lamp dithar-lamp--${state}`}
      onClick={() => onOpen?.(section)}
      aria-label={`${title}: ${stateText}`}
      data-home-wird={section}
      data-state={state}
      data-done={state === "done" ? "" : undefined}
      data-how={how.join(" ")}
    >
      <span className="dithar-lamp__chain" aria-hidden="true" />
      <LampArt lit={state === "done"} />
      <span className="dithar-lamp__pill">
        <span className="dithar-lamp__title">{title}</span>
        <span className="dithar-lamp__state">
          {state === "done" && <Check className="dithar-lamp__icon" strokeWidth={2.75} aria-hidden="true" />}
          <span>{stateText}</span>
          {state !== "done" && <Arrow className="dithar-lamp__icon" strokeWidth={2.75} aria-hidden="true" />}
        </span>
      </span>
    </button>
  );
}
