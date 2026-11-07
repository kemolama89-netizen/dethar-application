// What a tapped notification opens (Android): the screen it is about — never just Home.
//
// Native puts a route on the tap (android/.../NotificationRoutes.kt, in the open-route extra that the
// Floating Tasbeeh menu already used for «الإعدادات»). It is held natively until pulled and cleared as
// it is taken (lib/floatingTasbeehSync.ts startFloatingOpenRouteRequests) — at launch (cold start), on
// every return to the app (background) and when native says one arrived (foreground) — so a route is
// never lost while the app starts, nor applied twice. App.tsx (NotificationRouteHost) takes it at once,
// before the screens exist, and the router opens it as its first screen; while running, it navigates.
//
// Reminders, timed content, the widget and the Qur'an Journey carry their own exact item instead
// (ReminderOpen / JourneyOpen, App.tsx ReminderOverlayHost / JourneyOpenHost).
export type AppRoute =
  | { kind: "settings" }
  /** End-of-day summary: Settings → Statistics. */
  | { kind: "statistics" }
  /** Prayer-time notifications and the adhan: Home, whose top is the prayer times. */
  | { kind: "prayer" }
  /** Floating Tasbeeh's notification. */
  | { kind: "tasbeeh" }
  /** Audio Adhkar — where an adhan-interrupted session's "Resume Adhkar" banner is. */
  | { kind: "audio" }
  /** One section's Audio Adhkar list: its playback, Play All, and resuming a Play All run. */
  | { kind: "audio-list"; section: "morning" | "evening" | "misc" };

/** A native route string as the app's route; null for anything it doesn't know (ignored). */
export function parseAppRoute(route: string | null | undefined): AppRoute | null {
  switch (route) {
    case "settings":
    case "statistics":
    case "prayer":
    case "tasbeeh":
    case "audio":
      return { kind: route };
    case "audio:morning":
    case "audio:evening":
    case "audio:misc":
      return { kind: "audio-list", section: route.slice("audio:".length) as "morning" | "evening" | "misc" };
    default:
      return null;
  }
}

let pending: AppRoute | null = null;
const listeners = new Set<() => void>();

/** A route arrived (the latest wins: a second tap before the first was applied replaces it). */
export function deliverAppRoute(route: AppRoute): void {
  pending = route;
  for (const l of [...listeners]) l();
}

/** Takes (and clears) the route waiting to be opened — once. */
export function takeAppRoute(): AppRoute | null {
  const route = pending;
  pending = null;
  return route;
}

export function subscribeAppRoutes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
