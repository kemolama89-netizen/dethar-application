// @vitest-environment jsdom
//
// Regression coverage for calculationSettings.ts's persistence layer —
// Step 6. Mirrors locationSettings.test.ts's own structure: round-trips,
// independence between method/madhab, and corrupt-storage tolerance.
import { describe, expect, it, beforeEach } from "vitest";
import { loadCalculationOverrides, saveCalculationMethodOverride, saveMadhabOverride } from "./calculationSettings";

beforeEach(() => {
  localStorage.clear();
});

describe("loadCalculationOverrides", () => {
  it("defaults to no method/madhab override (both Automatic) when nothing is persisted", () => {
    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: undefined });
  });

  it("starts clean rather than throwing on corrupt storage", () => {
    localStorage.setItem("dithar:calculation:settings:v1", "{not json");
    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: undefined });
  });

  it("tolerates an invalid method/madhab id rather than throwing or passing it through", () => {
    localStorage.setItem(
      "dithar:calculation:settings:v1",
      JSON.stringify({ methodOverride: "NotARealMethod", madhabOverride: "notAMadhab" }),
    );
    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: undefined });
  });
});

describe("saveCalculationMethodOverride / saveMadhabOverride", () => {
  it("persists a method override", () => {
    saveCalculationMethodOverride("Egyptian");
    expect(loadCalculationOverrides()).toEqual({ method: "Egyptian", madhab: undefined });
  });

  it("persists a madhab override", () => {
    saveMadhabOverride("hanafi");
    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: "hanafi" });
  });

  it("method and madhab overrides are independent — setting one never touches the other", () => {
    saveCalculationMethodOverride("Turkey");
    saveMadhabOverride("hanafi");
    expect(loadCalculationOverrides()).toEqual({ method: "Turkey", madhab: "hanafi" });

    saveCalculationMethodOverride("Qatar");
    expect(loadCalculationOverrides()).toEqual({ method: "Qatar", madhab: "hanafi" });

    saveMadhabOverride(null);
    expect(loadCalculationOverrides()).toEqual({ method: "Qatar", madhab: undefined });
  });

  it("passing null clears a method override back to Automatic", () => {
    saveCalculationMethodOverride("Karachi");
    saveCalculationMethodOverride(null);
    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: undefined });
  });

  it("passing null clears a madhab override back to Automatic", () => {
    saveMadhabOverride("hanafi");
    saveMadhabOverride(null);
    expect(loadCalculationOverrides()).toEqual({ method: undefined, madhab: undefined });
  });

  it("overrides persist across separate loads (a fresh read sees the saved value)", () => {
    saveCalculationMethodOverride("Singapore");
    saveMadhabOverride("hanafi");
    expect(loadCalculationOverrides()).toEqual({ method: "Singapore", madhab: "hanafi" });
    expect(loadCalculationOverrides()).toEqual({ method: "Singapore", madhab: "hanafi" });
  });
});
