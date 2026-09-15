// @vitest-environment jsdom
//
// Regression coverage for tasbeehCounters.ts's event-driven listener
// fan-out (see saveTasbeehCounters/subscribeTasbeehCounters's own doc
// comments) — the mechanism that lets TasbeehScreen reflect a counters
// change from OUTSIDE its own handlers (a reconciled Floating Tasbeeh tap)
// immediately, without polling.
import { describe, expect, it, beforeEach, vi } from "vitest";
import { loadTasbeehCounters, saveTasbeehCounters, subscribeTasbeehCounters } from "./tasbeehCounters";

beforeEach(() => {
  localStorage.clear();
});

describe("subscribeTasbeehCounters", () => {
  it("notifies subscribers with the exact counters object every saveTasbeehCounters call persists", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTasbeehCounters(listener);

    saveTasbeehCounters({ 1: 5 });

    expect(listener).toHaveBeenCalledWith({ 1: 5 });
    unsubscribe();
  });

  it("still persists to storage — the listener fan-out is additive, never a replacement", () => {
    subscribeTasbeehCounters(() => {});
    saveTasbeehCounters({ 3: 9 });
    expect(loadTasbeehCounters()[3]).toBe(9);
  });

  it("supports multiple simultaneous subscribers", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeTasbeehCounters(a);
    subscribeTasbeehCounters(b);

    saveTasbeehCounters({ 2: 1 });

    expect(a).toHaveBeenCalledWith({ 2: 1 });
    expect(b).toHaveBeenCalledWith({ 2: 1 });
  });

  it("stops notifying once unsubscribed", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTasbeehCounters(listener);
    unsubscribe();

    saveTasbeehCounters({ 4: 2 });

    expect(listener).not.toHaveBeenCalled();
  });
});
