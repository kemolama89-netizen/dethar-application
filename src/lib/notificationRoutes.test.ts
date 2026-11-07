// What a tapped notification opens: a known route, taken once — the latest when two arrive before it is applied.
import { beforeEach, describe, expect, it } from "vitest";
import { deliverAppRoute, parseAppRoute, subscribeAppRoutes, takeAppRoute } from "./notificationRoutes";

beforeEach(() => void takeAppRoute());

describe("routes", () => {
  it("understands every route native sends, and nothing else", () => {
    expect(parseAppRoute("statistics")).toEqual({ kind: "statistics" });
    expect(parseAppRoute("prayer")).toEqual({ kind: "prayer" });
    expect(parseAppRoute("tasbeeh")).toEqual({ kind: "tasbeeh" });
    expect(parseAppRoute("settings")).toEqual({ kind: "settings" });
    expect(parseAppRoute("audio")).toEqual({ kind: "audio" });
    expect(parseAppRoute("audio:morning")).toEqual({ kind: "audio-list", section: "morning" });
    expect(parseAppRoute("audio:evening")).toEqual({ kind: "audio-list", section: "evening" });
    expect(parseAppRoute("audio:misc")).toEqual({ kind: "audio-list", section: "misc" });
    for (const unknown of ["", "home", "audio:quran", "javascript:alert(1)", null, undefined]) expect(parseAppRoute(unknown)).toBeNull();
  });

  it("is taken once, and the latest wins", () => {
    let told = 0;
    const stop = subscribeAppRoutes(() => told++);
    deliverAppRoute({ kind: "prayer" });
    deliverAppRoute({ kind: "tasbeeh" });
    expect(told).toBe(2);
    expect(takeAppRoute()).toEqual({ kind: "tasbeeh" });
    expect(takeAppRoute()).toBeNull();
    stop();
  });
});
