// @vitest-environment jsdom
//
// The selected Quran reciter: loaded on startup, saved on change, survives
// a restart (a fresh mount with only localStorage carried over), and a
// change stops any Quran audio resolved for the previous reciter.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QuranReciterProvider, useQuranReciter } from "./QuranReciterContext";
import { LanguageProvider } from "./LanguageContext";
import { QuranReciterSettingsView } from "../components/QuranReciterSettingsView";
import { DEFAULT_QURAN_RECITER_ID, getAvailableQuranReciters, getQuranReciterById } from "../data/quranReciters";
import { QURAN_RECITER_STORAGE_KEY } from "../lib/quranAudioPreferences";
import { claimAudio, getActiveAudio, stopAudio } from "../lib/audioEngine";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const OTHER_ID = getAvailableQuranReciters().find((r) => r.id !== DEFAULT_QURAN_RECITER_ID)!.id;

let latest: ReturnType<typeof useQuranReciter> | undefined;
function Probe() {
  latest = useQuranReciter();
  return null;
}

let container: HTMLDivElement;
let root: Root;

async function mount(children = <Probe />) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <LanguageProvider>
        <QuranReciterProvider>{children}</QuranReciterProvider>
      </LanguageProvider>,
    );
  });
}

async function unmount() {
  await act(async () => root.unmount());
  container.remove();
}

beforeEach(() => {
  localStorage.clear();
  latest = undefined;
});
afterEach(async () => {
  stopAudio();
  if (container?.isConnected) await unmount();
});

describe("QuranReciterProvider", () => {
  it("starts with the default reciter", async () => {
    await mount();
    expect(latest!.selectedReciterId).toBe(DEFAULT_QURAN_RECITER_ID);
    expect(latest!.selectedReciter.id).toBe(DEFAULT_QURAN_RECITER_ID);
    expect(latest!.reciters.map((r) => r.id)).toEqual(getAvailableQuranReciters().map((r) => r.id));
  });

  it("loads the persisted reciter on startup", async () => {
    localStorage.setItem(QURAN_RECITER_STORAGE_KEY, OTHER_ID);
    await mount();
    expect(latest!.selectedReciter).toBe(getQuranReciterById(OTHER_ID));
  });

  it("falls back to the default for an invalid persisted id", async () => {
    localStorage.setItem(QURAN_RECITER_STORAGE_KEY, "retired-reciter");
    await mount();
    expect(latest!.selectedReciterId).toBe(DEFAULT_QURAN_RECITER_ID);
  });

  it("persists a change immediately and restores it after a restart", async () => {
    await mount();
    await act(async () => latest!.setSelectedReciterId(OTHER_ID));
    expect(latest!.selectedReciterId).toBe(OTHER_ID);
    expect(localStorage.getItem(QURAN_RECITER_STORAGE_KEY)).toBe(OTHER_ID);
    await unmount();
    await mount();
    expect(latest!.selectedReciterId).toBe(OTHER_ID);
  });

  it("ignores ids that aren't available reciters", async () => {
    await mount();
    await act(async () => latest!.setSelectedReciterId("no-such-reciter"));
    expect(latest!.selectedReciterId).toBe(DEFAULT_QURAN_RECITER_ID);
    expect(localStorage.getItem(QURAN_RECITER_STORAGE_KEY)).toBeNull();
  });

  it("stops Quran audio from the previous reciter on change, but not other audio", async () => {
    await mount();
    const stopQuran = vi.fn();
    claimAudio("quran", `quran:${DEFAULT_QURAN_RECITER_ID}:2:255`, stopQuran);
    await act(async () => latest!.setSelectedReciterId(OTHER_ID));
    expect(stopQuran).toHaveBeenCalledTimes(1);
    expect(getActiveAudio()).toBeNull();

    const stopTts = vi.fn();
    claimAudio("tts", "tts:1", stopTts);
    await act(async () => latest!.setSelectedReciterId(DEFAULT_QURAN_RECITER_ID));
    expect(stopTts).not.toHaveBeenCalled();
  });
});

describe("QuranReciterSettingsView", () => {
  it("shows every available reciter, marks the selection, and persists a tap", async () => {
    await mount(
      <>
        <QuranReciterSettingsView onBack={() => {}} />
        <Probe />
      </>,
    );
    const rows = Array.from(container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"));
    expect(rows).toHaveLength(getAvailableQuranReciters().length);
    const other = getQuranReciterById(OTHER_ID)!;
    const otherRow = rows.find((b) => b.textContent?.includes(other.name.ar))!;
    expect(otherRow.getAttribute("aria-pressed")).toBe("false");
    await act(async () => otherRow.click());
    expect(otherRow.getAttribute("aria-pressed")).toBe("true");
    expect(latest!.selectedReciterId).toBe(OTHER_ID);
    expect(localStorage.getItem(QURAN_RECITER_STORAGE_KEY)).toBe(OTHER_ID);
  });
});
