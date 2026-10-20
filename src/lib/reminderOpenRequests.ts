// In-app requests to open a reminder exactly as a tapped notification or
// widget does (App.tsx ReminderOverlayHost → SpiritualReminderView, resolved
// by lib/reminderOpen.ts): the same payload — the item's stable id, the
// comment shown with it, and the strings that were shown — so the same
// content opens through the same path. Home's «مختارات اليوم» card uses it.
import type { ShownReminder } from "./remindersNative";

export interface OpenReminderRequest {
  /** "<category>:<library id>", e.g. "dua:allahumma-aslih-li-dini". */
  id: string;
  commentId: string | null;
  shown?: ShownReminder;
}

const listeners = new Set<(request: OpenReminderRequest) => void>();

export function requestOpenReminder(request: OpenReminderRequest): void {
  for (const listener of [...listeners]) listener(request);
}

export function subscribeOpenReminderRequests(listener: (request: OpenReminderRequest) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
