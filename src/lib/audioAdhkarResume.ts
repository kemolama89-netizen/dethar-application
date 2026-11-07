// Resume Adhkar: an unfinished «تشغيل الكل» (Play All) run of Morning or Evening Adhkar can continue
// from where it stopped instead of restarting — after leaving the list, a call, the app being closed
// or the phone restarting. Each section keeps its own point.
//
// The point is the next dhikr and repetition NOT yet finished: it is saved only when a repetition is
// heard to its end (or the user skips to the next dhikr), never on a stop — so a repetition cut off
// part-way plays again from its start, and nothing is ever marked finished that wasn't. It is cleared
// when the run completes, or when the user chooses to start from the beginning.
//
//  - Android: the native player keeps it (AudioAdhkarPlaybackService.savePlayAllProgress →
//    AudioAdhkarStore.playAllProgress), so it stays right while the app is closed.
//  - Web: the in-app player keeps it here, in localStorage.
//
// A point belongs to the run's exact list of adhkar ([ids]): if the list changed since (another
// selection of adhkar, an app update), it is not offered — never resumed at the wrong dhikr.
import { AudioAdhkarNative, isAudioAdhkarNativeAvailable } from "./audioAdhkarNative";

export type ResumableSection = "morning" | "evening";

export interface PlayAllResumePoint {
  /** The run's whole list, in order (dhikr ids). */
  ids: string[];
  /** The dhikr to continue with (0-based, in [ids]). */
  index: number;
  /** Its repetition to continue with (1-based): those before it were heard to their end. */
  repetition: number;
  updatedAt: number;
}

const KEY = (section: ResumableSection) => `dithar:audio-adhkar:play-all-resume:${section}:v1`;

export function isResumableSection(collection: string): collection is ResumableSection {
  return collection === "morning" || collection === "evening";
}

function valid(p: unknown): p is PlayAllResumePoint {
  const v = p as PlayAllResumePoint | null;
  return (
    !!v &&
    Array.isArray(v.ids) &&
    v.ids.length > 0 &&
    v.ids.every((id) => typeof id === "string") &&
    Number.isInteger(v.index) &&
    v.index >= 0 &&
    v.index < v.ids.length &&
    Number.isInteger(v.repetition) &&
    v.repetition >= 1
  );
}

/** Web: the in-app player's saved point. */
export function saveWebResumePoint(section: ResumableSection, point: PlayAllResumePoint): void {
  try {
    localStorage.setItem(KEY(section), JSON.stringify(point));
  } catch {
    // Best effort: without storage the run simply restarts next time.
  }
  notify();
}

/** The section's saved point (Android: the native player's), or null. */
export async function loadResumePoint(section: ResumableSection): Promise<PlayAllResumePoint | null> {
  if (isAudioAdhkarNativeAvailable()) {
    try {
      const { progress } = await AudioAdhkarNative.getPlayAllProgress({ section });
      return valid(progress) ? progress : null;
    } catch {
      return null;
    }
  }
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY(section)) ?? "null");
    return valid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Completed, or the user starts from the beginning: the point goes. */
export async function clearResumePoint(section: ResumableSection): Promise<void> {
  try {
    localStorage.removeItem(KEY(section));
  } catch {
    // Nothing to clear.
  }
  if (isAudioAdhkarNativeAvailable()) await AudioAdhkarNative.clearPlayAllProgress({ section }).catch(() => {});
  notify();
}

/** Whether [point] belongs to a run of exactly these adhkar (so it resumes at the right dhikr). */
export function resumesRun(point: PlayAllResumePoint | null, ids: readonly string[]): point is PlayAllResumePoint {
  return !!point && point.ids.length === ids.length && point.ids.every((id, i) => id === ids[i]) && point.index < ids.length;
}

/**
 * Where a run continues after a repetition of dhikr [index] (of [count]) was heard to its end —
 * repetition [repetition] of [total]: the next repetition, else the next dhikr, else null (completed).
 */
export function nextPoint(index: number, count: number, repetition: number, total: number): { index: number; repetition: number } | null {
  if (repetition < total) return { index, repetition: repetition + 1 };
  if (index + 1 < count) return { index: index + 1, repetition: 1 };
  return null;
}

const listeners = new Set<() => void>();
function notify() {
  for (const l of [...listeners]) l();
}

/** Called when a point is saved or cleared here (the native player's own saves are read again on demand). */
export function subscribeResumePoints(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
