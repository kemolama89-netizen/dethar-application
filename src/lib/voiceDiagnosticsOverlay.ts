// TEMPORARY, DEV-ONLY on-screen diagnostic overlay for Voice Tasbeeh.
//
// Safari on iOS/iPadOS has no remote-inspectable console without a Mac
// (Settings > Safari > Advanced > Web Inspector, plus a Mac connected via
// USB or the same Wi-Fi network, with Safari's Develop menu enabled there
// too) — not always available. This gives the exact same log lines
// useVoiceTasbeeh.ts already writes to console.log a second, Mac-free
// destination: a small panel rendered directly on the page, with a
// "Copy all" button (navigator.clipboard) so the captured log text can be
// pasted straight into a message without transcribing anything by hand.
//
// Deliberately NOT a React component and NOT wired into any existing UI
// file (TasbeehScreen.tsx or otherwise) — this module manages its own
// plain DOM node, created lazily on first use and appended directly to
// `document.body`, entirely outside the React tree. useVoiceTasbeeh.ts
// only ever calls `pushDiagLog`, never anything UI-shaped.
//
// Import this module ONLY from behind an isDevBuild check (see
// useVoiceTasbeeh.ts) — Vite's dead-code elimination then drops this
// entire file from the production bundle, exactly like every other
// isDevBuild-gated diagnostic in this feature. Temporary: meant to be
// deleted once the real root cause is confirmed from captured output —
// not a permanent addition.

const MAX_LINES = 300;

interface OverlayState {
  root: HTMLDivElement;
  logEl: HTMLDivElement;
  lines: string[];
  collapsed: boolean;
}

let overlay: OverlayState | null = null;

function formatLine(label: string, data: Record<string, unknown>): string {
  const time = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  let json: string;
  try {
    json = JSON.stringify(data);
  } catch {
    json = String(data);
  }
  return `${time} ${label} ${json}`;
}

function createOverlay(): OverlayState {
  const root = document.createElement("div");
  root.setAttribute("data-dithar-voice-diag", "true");
  root.style.cssText = [
    "position:fixed",
    "left:0",
    "right:0",
    "bottom:0",
    "z-index:2147483647", // always on top, above the app's own UI
    "font-family:ui-monospace,Menlo,Consolas,monospace",
    "font-size:10px",
    "line-height:1.35",
    "background:rgba(10,10,10,0.92)",
    "color:#7CFC7C",
    "pointer-events:auto",
    "box-shadow:0 -2px 12px rgba(0,0,0,0.5)",
  ].join(";");

  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;gap:8px;align-items:center;padding:6px 8px;background:#111;border-bottom:1px solid #333;flex-wrap:wrap;";

  const title = document.createElement("span");
  title.textContent = "voice-diag";
  title.style.cssText = "color:#fff;font-weight:bold;margin-right:auto;";
  bar.appendChild(title);

  const makeButton = (text: string, onClick: () => void) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = "font-size:11px;padding:4px 8px;border-radius:6px;border:1px solid #444;background:#222;color:#fff;";
    btn.addEventListener("click", onClick);
    return btn;
  };

  const logEl = document.createElement("div");
  logEl.style.cssText = "max-height:32vh;overflow-y:auto;padding:6px 8px;white-space:pre-wrap;word-break:break-word;";

  const state: OverlayState = { root, logEl, lines: [], collapsed: false };

  const copyBtn = makeButton("Copy all", () => {
    const text = state.lines.join("\n");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          copyBtn.textContent = "Copied!";
          window.setTimeout(() => {
            copyBtn.textContent = "Copy all";
          }, 1200);
        })
        .catch(() => {
          copyBtn.textContent = "Copy failed";
        });
    }
  });
  const clearBtn = makeButton("Clear", () => {
    state.lines = [];
    logEl.textContent = "";
  });
  const toggleBtn = makeButton("Hide log", () => {
    state.collapsed = !state.collapsed;
    logEl.style.display = state.collapsed ? "none" : "block";
    toggleBtn.textContent = state.collapsed ? "Show log" : "Hide log";
  });

  bar.appendChild(copyBtn);
  bar.appendChild(clearBtn);
  bar.appendChild(toggleBtn);

  root.appendChild(bar);
  root.appendChild(logEl);
  document.body.appendChild(root);

  return state;
}

/** Appends one diagnostic line to BOTH the on-screen panel and its internal buffer (used by "Copy all"). Lazily creates the panel on first call. Caps retained lines at MAX_LINES (oldest dropped) so the DOM/memory footprint stays bounded during a long test session. */
export function pushDiagLog(label: string, data: Record<string, unknown>): void {
  if (typeof document === "undefined") return;
  if (!overlay) overlay = createOverlay();
  const line = formatLine(label, data);
  overlay.lines.push(line);
  if (overlay.lines.length > MAX_LINES) overlay.lines.shift();
  overlay.logEl.textContent = overlay.lines.join("\n");
  overlay.logEl.scrollTop = overlay.logEl.scrollHeight;
}
