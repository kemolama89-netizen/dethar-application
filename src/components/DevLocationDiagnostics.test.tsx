// @vitest-environment jsdom
//
// Smoke coverage for the DEV-only first-launch debugging overlay: it
// must accurately report this app's own persisted location state (the
// one thing a device with no accessible JS console — e.g. an iPad's
// Safari with no Mac to attach Web Inspector — otherwise has no way to
// surface), and its reset control must actually clear that state. Not a
// test of production UI — see the component's own doc comment for why it
// exists and how it's excluded from production builds.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DevLocationDiagnostics } from "./DevLocationDiagnostics";
import { saveManualLocation, loadLocationSettings } from "../lib/locationSettings";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<DevLocationDiagnostics />);
  });
  return {
    container,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      document.body.removeChild(container);
    },
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DevLocationDiagnostics", () => {
  it("starts collapsed as a small badge, never open by default", async () => {
    const { container, unmount } = await mount();
    expect(container.textContent).toContain("loc-dev");
    expect(container.textContent).not.toContain("location dev diagnostics");
    await unmount();
  });

  it("opening it reports 'none' for manualLocation/lastActiveLocation when nothing is persisted (a genuine first-launch state)", async () => {
    const { container, unmount } = await mount();
    await act(async () => {
      container.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("manualLocation: none");
    expect(container.textContent).toContain("lastActiveLocation: none");
    await unmount();
  });

  it("reports a persisted manual location by name — the tool this codebase's own DEV console reset is meant to make visible on a device with no console", async () => {
    saveManualLocation({
      source: "manual",
      latitude: 21.3891,
      longitude: 39.8579,
      timezone: "Asia/Riyadh",
      countryCode: "SA",
      cityNameEn: "Mecca",
      cityNameAr: "مكة المكرمة",
    });

    const { container, unmount } = await mount();
    await act(async () => {
      container.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain("manualLocation: Mecca [manual]");
    await unmount();
  });

  it("reports the current origin so it can be diffed against Safari's Website Settings row", async () => {
    const { container, unmount } = await mount();
    await act(async () => {
      container.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.textContent).toContain(`origin: ${window.location.origin}`);
    await unmount();
  });

  it("'Request Location Now' reports a fired success callback and the resolved coordinates", async () => {
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 21.3891, longitude: 39.8579, accuracy: 15 } } as GeolocationPosition);
        },
      },
    });

    const { container, unmount } = await mount();
    await act(async () => {
      container.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true })); // open the panel
    });
    const requestButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Request Location Now")!;
    await act(async () => {
      requestButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("status: success");
    expect(container.textContent).toContain("success callback fired: true");
    expect(container.textContent).toContain("error callback fired: false");
    expect(container.textContent).toContain("coords: 21.3891,39.8579");

    Object.defineProperty(navigator, "geolocation", { configurable: true, value: originalGeolocation });
    await unmount();
  });

  it("'Request Location Now' reports a fired error callback with the exact GeolocationPositionError code/message", async () => {
    const originalGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: "User denied Geolocation" } as GeolocationPositionError);
        },
      },
    });

    const { container, unmount } = await mount();
    await act(async () => {
      container.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const requestButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Request Location Now")!;
    await act(async () => {
      requestButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("status: error");
    expect(container.textContent).toContain("success callback fired: false");
    expect(container.textContent).toContain("error callback fired: true");
    expect(container.textContent).toContain("error code: 1 (PERMISSION_DENIED)");
    expect(container.textContent).toContain("error message: User denied Geolocation");

    Object.defineProperty(navigator, "geolocation", { configurable: true, value: originalGeolocation });
    await unmount();
  });

  it("the reset control actually clears the persisted location state", async () => {
    saveManualLocation({ source: "manual", latitude: 21.3891, longitude: 39.8579, timezone: "Asia/Riyadh", countryCode: "SA" });
    expect(loadLocationSettings().manualLocation).not.toBeNull();

    const originalReload = window.location.reload;
    // jsdom doesn't implement navigation — stub it out so the click handler
    // (which also calls resetLocationSettingsForTesting()) doesn't throw.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: () => {} },
    });

    const { container, unmount } = await mount();
    const buttons = container.querySelectorAll("button");
    await act(async () => {
      buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true })); // open the panel
    });
    const resetButton = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "reset + reload")!;
    await act(async () => {
      resetButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(loadLocationSettings().manualLocation).toBeNull();

    Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, reload: originalReload } });
    await unmount();
  });
});
