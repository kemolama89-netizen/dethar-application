// @vitest-environment jsdom
//
// The temporary voice-pipeline diagnostic panel must render ONLY inside the
// native Android app — never on the web/browser build (dev server, GitHub
// Pages) or iOS, where every user who turns on Voice Tasbeeh would
// otherwise see raw transcripts and event counters.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
  },
  registerPlugin: vi.fn(() => ({})),
}));

import { Capacitor } from "@capacitor/core";
import { VoiceDiagnosticPanel } from "./VoiceDiagnosticPanel";
import type { VoicePipelineDiagnostic } from "../lib/useVoiceTasbeeh";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const diagnostics: VoicePipelineDiagnostic = {
  recognitionApiAvailable: true,
  instancesStarted: 2,
  onstartCount: 1,
  onaudiostartCount: 1,
  onspeechstartCount: 0,
  onspeechendCount: 0,
  onaudioendCount: 0,
  onresultCount: 3,
  onnomatchCount: 0,
  onerrorCount: 0,
  onendCount: 1,
  lastRawTranscript: "سبحان الله",
  lastIsFinal: true,
  recognitionLang: "ar-SA",
  lastErrorCode: null,
  lastErrorMessage: null,
  totalCompletionsSeen: 3,
  lastEventAt: "12:00:00.000",
};

async function render() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<VoiceDiagnosticPanel diagnostics={diagnostics} />);
  });
  return { container, unmount: () => act(async () => root.unmount()) };
}

beforeEach(() => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  vi.mocked(Capacitor.getPlatform).mockReturnValue("web");
});

describe("VoiceDiagnosticPanel — native Android only", () => {
  it("renders nothing on the web/browser build", async () => {
    const { container, unmount } = await render();
    expect(container.textContent).toBe("");
    await unmount();
  });

  it("renders nothing on iOS", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    const { container, unmount } = await render();
    expect(container.textContent).toBe("");
    await unmount();
  });

  it("renders the diagnostic inside the native Android app", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    const { container, unmount } = await render();
    expect(container.textContent).toContain("[TEMP DIAGNOSTIC]");
    expect(container.textContent).toContain("onresult=3");
    expect(container.textContent).toContain('lastTranscript="سبحان الله"');
    await unmount();
  });
});
