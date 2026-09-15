import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { getDeviceTimeZone } from "./dateTime";
import { loadLocationSettings, saveLastActiveLocation, saveLastPromptedTimezone, saveLastPromptedCoordinates } from "./locationSettings";
import { checkLocationChange } from "./locationChangeDetection";
import { estimateCountryFromCoordinates } from "./reverseGeocode";
import type { Coordinates } from "./prayerTimes";

export interface PendingLocationChange {
  detectedTimezone: string;
  /** Present only when this prompt was triggered (at least partly) by a
   *  fresh GPS fix obtained during the check itself — see confirmUpdate,
   *  which reuses this instead of firing a second geolocation request. */
  detectedCoordinates?: Coordinates;
}

export interface LocationChangeDetectorResult {
  /** Non-null exactly when the confirmation prompt should be shown. */
  pending: PendingLocationChange | null;
  /** User tapped "update". If the check that triggered this prompt
   *  already obtained a fresh GPS fix (`pending.detectedCoordinates`),
   *  that reading is used directly — no second request. Otherwise (the
   *  prompt was timezone-only, because GPS was unavailable/denied at
   *  check time) this makes one fresh attempt now. Either way, a
   *  successful fix becomes the new active location (Prayer Times then
   *  recalculates — see App.tsx's Home, which remounts PrayerTimesPanel
   *  via `refreshToken`). If a manual override was set in the meantime,
   *  or no fix is obtainable, nothing is silently changed. */
  confirmUpdate: () => void;
  /** User tapped "not now" — dismisses without changing the active
   *  location at all. */
  decline: () => void;
  /** Increments only after a confirmed update actually lands a fresh
   *  location — a stable, cheap signal for the caller to force-remount
   *  whatever reads useCoordinates() (the same `key={...}` remount idiom
   *  App.tsx's own screen-switch routing already uses), since
   *  useCoordinates has no reactive-to-storage mechanism of its own (see
   *  its own doc comment — "load once on mount" is this codebase's
   *  established convention throughout). */
  refreshToken: number;
}

// Location-change detection — Step 5 of the global hybrid prayer-time
// architecture, with its GPS-distance correction. Reuses the EXACT SAME
// appStateChange primitive floatingTasbeehSync.ts already uses for its
// own foreground-return reconciliation (verified to also work on web, not
// just native — see @capacitor/app's own web.js, which maps it onto the
// standard `visibilitychange` DOM event) — no new platform capability, no
// new dependency.
//
// TWO signals feed checkLocationChange on every check: the device's
// current IANA timezone (always available, no permission needed), and —
// when geolocation permission is already granted — ONE single-shot
// `getCurrentPosition` read taken AT THAT CHECK, never a `watchPosition`
// subscription and never polled on a timer. This is the correction's
// whole point: two genuinely different locations can share the same UTC
// offset for part of the year (Kuwait/Egypt is the worked example — see
// locationChangeDetection.ts), which a timezone-only comparison cannot
// distinguish. If geolocation is denied/unavailable/times out, the check
// simply proceeds on the timezone signal alone, exactly as this hook
// behaved before this correction — no error, no different code path.
// `maximumAge` is a generous few minutes: a relocation significant enough
// to matter never happens on a sub-minute timescale, so reusing a
// recently-cached OS position (when the OS already has one) avoids
// needlessly re-activating GPS hardware on every single foreground event.
//
// Deliberately SKIPS this entire check when a manual location is active:
// a manual pick is an explicit, sticky user choice (see
// locationSettings.ts) — often made BECAUSE the user is traveling and
// wants a specific city's calculation regardless of where they physically
// are, so second-guessing it with "did you move?" would be actively
// unhelpful, not just redundant. This also sidesteps ever needing to
// silently clear a manual override, satisfying "never silently replace a
// manually selected city" by construction — there is no code path here
// that touches `manualLocation` at all.
//
// Never touches the active location on its own — see checkLocationChange
// (locationChangeDetection.ts) for the actual comparison; this hook only
// wires that pure logic to real timers/events/persistence and exposes the
// resulting UI state.
export function useLocationChangeDetector(): LocationChangeDetectorResult {
  const [pending, setPending] = useState<PendingLocationChange | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  function evaluate(currentCoordinates: Coordinates | undefined) {
    const { manualLocation, lastActiveLocation, lastPromptedTimezone, lastPromptedCoordinates } = loadLocationSettings();
    if (manualLocation) return; // sticky override — never second-guessed
    if (!lastActiveLocation) return; // nothing established yet (first-ever launch) — nothing to compare against

    const currentTimezone = getDeviceTimeZone();
    const result = checkLocationChange({
      activeLocation: lastActiveLocation,
      currentTimezone,
      currentCoordinates,
      lastPromptedTimezone,
      lastPromptedCoordinates,
    });

    if (result.kind === "back-in-sync") {
      // Re-arm both signals: a later recurrence of either old mismatch
      // value should prompt again rather than being silently suppressed.
      saveLastPromptedTimezone(null);
      saveLastPromptedCoordinates(null);
      setPending(null);
    } else if (result.kind === "genuine-change") {
      setPending({ detectedTimezone: result.detectedTimezone, detectedCoordinates: result.detectedCoordinates });
    }
    // "no-change" and "already-prompted": nothing to do — in particular,
    // never touch `pending` here, so an already-visible prompt from a
    // previous check stays visible until the user actually acts on it,
    // and a re-render/re-check with nothing new never conjures one up.
  }

  // ONE single-shot geolocation read per check — never `watchPosition`,
  // never a timer/interval. Falls through to the timezone-only path on
  // any failure (denied, unavailable, no runtime support, timeout).
  function check() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      evaluate(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => evaluate({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => evaluate(undefined),
      { maximumAge: 5 * 60 * 1000, timeout: 8_000 },
    );
  }

  useEffect(() => {
    check(); // covers cold start / navigating to Home while already foregrounded

    let removeListener: (() => void) | undefined;
    let cancelled = false;
    void App.addListener("appStateChange", (state) => {
      if (state.isActive) check();
    }).then((handle) => {
      if (cancelled) {
        void handle.remove();
      } else {
        removeListener = () => void handle.remove();
      }
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `check` is a
    // plain function with no reactive closures of its own (it always
    // re-reads fresh state itself); re-creating the listener on every
    // render would defeat the point of this effect.
  }, []);

  function confirmUpdate() {
    const detected = pending;
    setPending(null);
    if (!detected) return;
    saveLastPromptedTimezone(detected.detectedTimezone);
    saveLastPromptedCoordinates(detected.detectedCoordinates ?? null);

    function activate(coords: Coordinates, timezone: string) {
      // A manual selection could have been made while a request was in
      // flight — never overwrite it (same guard useCoordinates.ts's own
      // geolocation effect already uses).
      if (loadLocationSettings().manualLocation) return;
      saveLastActiveLocation({
        source: "device",
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone,
        // Step 7: same best-effort offline country estimate
        // useCoordinates.ts's own device fix uses — `undefined` when too
        // far from every bundled city (see reverseGeocode.ts).
        countryCode: estimateCountryFromCoordinates(coords),
      });
      setRefreshToken((n) => n + 1);
    }

    if (detected.detectedCoordinates) {
      // Already have a fresh fix from the check that triggered this
      // prompt — use it directly rather than firing a second request.
      activate(detected.detectedCoordinates, detected.detectedTimezone);
      return;
    }

    // The prompt was timezone-only (no GPS fix was obtainable at check
    // time) — the user has now explicitly asked to update, so try once
    // more.
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => activate({ latitude: position.coords.latitude, longitude: position.coords.longitude }, getDeviceTimeZone()),
      () => {
        // Failed/denied/timed out — nothing changes; the previous active
        // location remains exactly as it was.
      },
      { maximumAge: 0, timeout: 10_000 },
    );
  }

  function decline() {
    const detected = pending;
    setPending(null);
    if (!detected) return;
    saveLastPromptedTimezone(detected.detectedTimezone);
    saveLastPromptedCoordinates(detected.detectedCoordinates ?? null);
  }

  return { pending, confirmUpdate, decline, refreshToken };
}
