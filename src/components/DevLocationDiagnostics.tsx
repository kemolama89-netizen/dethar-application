import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { loadLocationSettings, resetLocationSettingsForTesting } from "../lib/locationSettings";

// DEV-ONLY diagnostic overlay for the first-launch location permission
// flow. Added because manual testing on a device with no accessible JS
// console (e.g. an iPad's Safari, with no Mac to attach Web Inspector)
// otherwise makes it impossible to inspect this app's own persisted
// location state, or the browser's actual Permissions API result, on
// that exact device — which is precisely the information needed to tell
// apart "the app never asked" from "the browser/OS already has a
// decision on file and correctly isn't asking again" (see
// useCoordinates.ts's own doc comment: the app deliberately has no
// second "already asked" flag of its own — that memory is the browser's/
// OS's job, not this app's).
//
// Gated ENTIRELY by `import.meta.env.DEV` at the call site (see
// main.tsx) — Vite statically replaces that with `false` in a production
// build and dead-code-eliminates the branch (and, since nothing else
// references this component, its import) — same mechanism/convention
// already used by useVoiceTasbeeh.ts's DEV-only debug log and
// locationSettings.ts's own __ditharResetLocationForTesting console
// global. This never ships to a real user and is not reachable from any
// existing screen — a floating overlay outside the whole App tree, not a
// modification to any existing production UI.
// GeolocationPositionError.code values (no runtime enum on the type
// itself — MDN documents these as fixed numeric constants).
const GEOLOCATION_ERROR_CODE_NAMES: Record<number, string> = {
  1: "PERMISSION_DENIED",
  2: "POSITION_UNAVAILABLE",
  3: "TIMEOUT",
};

interface GeoTestState {
  status: "requesting" | "success" | "error";
  requestedAt: number;
  resolvedAt: number | null;
  coords: string | null;
  errorCode: number | null;
  errorMessage: string | null;
}

export function DevLocationDiagnostics() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<{
    manual: string;
    lastActive: string;
    lastPromptedTimezone: string;
    lastPromptedCoordinates: string;
    permissionState: string;
    hasGeolocation: boolean;
    isSecureContext: boolean;
    protocol: string;
    host: string;
    origin: string;
  } | null>(null);
  // Separate from `info`: this is the result of an explicit, on-demand
  // getCurrentPosition() call (see requestLocationNow below), not a
  // passive read of persisted/Permissions-API state. Kept apart so
  // opening/closing the panel or hitting "refresh" never clobbers the
  // result of a live test still worth reporting.
  const [geoTest, setGeoTest] = useState<GeoTestState | null>(null);

  function refresh() {
    const { manualLocation, lastActiveLocation, lastPromptedTimezone, lastPromptedCoordinates } = loadLocationSettings();
    setInfo({
      manual: manualLocation ? `${manualLocation.cityNameEn ?? "(no name)"} [${manualLocation.source}]` : "none",
      lastActive: lastActiveLocation
        ? `${lastActiveLocation.source} @ ${lastActiveLocation.latitude.toFixed(2)},${lastActiveLocation.longitude.toFixed(2)}`
        : "none",
      lastPromptedTimezone: lastPromptedTimezone ?? "none",
      lastPromptedCoordinates: lastPromptedCoordinates
        ? `${lastPromptedCoordinates.latitude.toFixed(2)},${lastPromptedCoordinates.longitude.toFixed(2)}`
        : "none",
      permissionState: "checking…",
      hasGeolocation: typeof navigator !== "undefined" && !!navigator.geolocation,
      isSecureContext: typeof window !== "undefined" && window.isSecureContext,
      protocol: typeof location !== "undefined" ? location.protocol : "?",
      host: typeof location !== "undefined" ? location.host : "?",
      // The exact string to diff against the row Safari's own Website
      // Settings list shows for "this website" — a per-site permission
      // decision is keyed by origin, so if this doesn't character-for-
      // character match that row, they're two different permission
      // buckets regardless of what either one is set to.
      origin: typeof location !== "undefined" ? location.origin : "?",
    });

    // The Permissions API's geolocation support itself varies by browser
    // (notably inconsistent on WebKit/Safari across versions) — this is
    // read defensively and reported as "unsupported" rather than assumed,
    // exactly the distinction this diagnostic exists to make explicit.
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          setInfo((prev) => (prev ? { ...prev, permissionState: status.state } : prev));
        })
        .catch(() => {
          setInfo((prev) => (prev ? { ...prev, permissionState: "unsupported by this browser" } : prev));
        });
    } else {
      setInfo((prev) => (prev ? { ...prev, permissionState: "Permissions API unsupported by this browser" } : prev));
    }
  }

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh reads fresh state itself on every call, not a reactive closure.
  }, [open]);

  // DEV-ONLY, direct call — bypasses this app's whole location hierarchy
  // (useCoordinates.ts, useLocationChangeDetector.ts) entirely so a real
  // permission prompt/grant/denial can be observed in isolation, without
  // guessing whether some app-side gate (a manual override already set,
  // StrictMode's double-invoke, etc.) is the reason nothing happened.
  // `maximumAge: 0` deliberately forbids reusing any cached fix — a
  // request that resolves in single-digit milliseconds vs. one that takes
  // seconds (or never resolves until you respond to a native dialog) is
  // itself the signal for "was a prompt actually shown", since page JS has
  // no way to detect the browser's own native permission UI directly.
  function requestLocationNow() {
    const requestedAt = Date.now();
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoTest({ status: "error", requestedAt, resolvedAt: requestedAt, coords: null, errorCode: null, errorMessage: "navigator.geolocation is not present in this context." });
      return;
    }
    setGeoTest({ status: "requesting", requestedAt, resolvedAt: null, coords: null, errorCode: null, errorMessage: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoTest({
          status: "success",
          requestedAt,
          resolvedAt: Date.now(),
          coords: `${position.coords.latitude.toFixed(4)},${position.coords.longitude.toFixed(4)} (±${Math.round(position.coords.accuracy)}m)`,
          errorCode: null,
          errorMessage: null,
        });
        if (open) refresh(); // permissions.query() can only reflect the browser's post-decision state after a real request has been made
      },
      (err: GeolocationPositionError) => {
        setGeoTest({ status: "error", requestedAt, resolvedAt: Date.now(), coords: null, errorCode: err.code, errorMessage: err.message });
        if (open) refresh();
      },
      { maximumAge: 0, timeout: 15_000 },
    );
  }

  const badgeStyle: CSSProperties = {
    position: "fixed",
    insetBlockEnd: "max(8px, env(safe-area-inset-bottom, 0px))",
    insetInlineStart: 8,
    zIndex: 999999,
    fontFamily: "monospace",
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ ...badgeStyle, fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "#111", color: "#0f0", opacity: 0.55, border: "none" }}>
        loc-dev
      </button>
    );
  }

  return (
    <div style={{ ...badgeStyle, fontSize: 11, lineHeight: 1.6, padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.9)", color: "#0f0", maxWidth: 300, maxHeight: "70vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <strong>location dev diagnostics</strong>
        <button type="button" onClick={() => setOpen(false)} style={{ color: "#0f0", background: "none", border: "none", fontSize: 14, lineHeight: 1 }}>
          ✕
        </button>
      </div>
      {info ? (
        <div style={{ whiteSpace: "pre-wrap" }}>
          {`origin: ${info.origin}\n(compare this EXACTLY to the row in Safari Website Settings — a mismatch means it's a different permission bucket entirely)\n\nhost: ${info.host}\nprotocol: ${info.protocol}\nisSecureContext: ${info.isSecureContext}\nnavigator.geolocation present: ${info.hasGeolocation}\n\npermissions.query("geolocation"): ${info.permissionState}\n\nmanualLocation: ${info.manual}\nlastActiveLocation: ${info.lastActive}\nlastPromptedTimezone: ${info.lastPromptedTimezone}\nlastPromptedCoordinates: ${info.lastPromptedCoordinates}`}
        </div>
      ) : (
        <div>loading…</div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button type="button" onClick={refresh} style={{ color: "#0f0", background: "#222", border: "1px solid #0f0", borderRadius: 6, padding: "4px 8px" }}>
          refresh
        </button>
        <button
          type="button"
          onClick={() => {
            resetLocationSettingsForTesting();
            location.reload();
          }}
          style={{ color: "#000", background: "#0f0", border: "none", borderRadius: 6, padding: "4px 8px", fontWeight: 700 }}
        >
          reset + reload
        </button>
      </div>

      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #044" }}>
        <strong>live geolocation test</strong>
        <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
          {geoTest
            ? [
                `status: ${geoTest.status}`,
                `elapsed: ${geoTest.resolvedAt !== null ? `${geoTest.resolvedAt - geoTest.requestedAt}ms` : "pending — waiting on callback…"}`,
                `success callback fired: ${geoTest.status === "success"}`,
                `error callback fired: ${geoTest.status === "error"}`,
                geoTest.errorCode !== null ? `error code: ${geoTest.errorCode} (${GEOLOCATION_ERROR_CODE_NAMES[geoTest.errorCode] ?? "unknown"})` : null,
                geoTest.errorMessage !== null ? `error message: ${geoTest.errorMessage}` : null,
                geoTest.coords !== null ? `coords: ${geoTest.coords}` : null,
              ]
                .filter((line): line is string => line !== null)
                .join("\n")
            : "not yet requested"}
        </div>
        <button
          type="button"
          onClick={requestLocationNow}
          disabled={geoTest?.status === "requesting"}
          style={{ color: "#000", background: "#0ff", border: "none", borderRadius: 6, padding: "4px 8px", fontWeight: 700, marginTop: 6 }}
        >
          {geoTest?.status === "requesting" ? "requesting…" : "Request Location Now"}
        </button>
      </div>
    </div>
  );
}
