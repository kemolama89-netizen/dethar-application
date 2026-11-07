// @vitest-environment jsdom
// Time-based content notifications: when they are scheduled (before Asr, Friday, the evening
// before the White Days), what they show (verified, audited hadiths only), that a tap opens the
// same reminder card with its source and sharing, and that they never join the widget's rotation.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";

const native = vi.hoisted(() => ({ calls: [] as unknown[] }));
// The user's saved location, as Kuwait (the sync reads it itself).
vi.mock("./prayerSchedule", async (original) => {
  const real = await original<typeof import("./prayerSchedule")>();
  return { ...real, knownPrayerLocation: () => ({ coordinates: { latitude: 29.3759, longitude: 47.9774 }, timezone: "Asia/Kuwait", country: "KW" }) };
});
vi.mock("./remindersNative", async (original) => ({
  ...(await original<typeof import("./remindersNative")>()),
  isRemindersNativeAvailable: () => true,
  RemindersNative: { setTimedContent: async (o: unknown) => (native.calls.push(o), { nextAt: null }) },
}));

import { TIMED_CONTENT, buildTimedEntries, loadTimedContentSettings, saveTimedContentSettings, syncTimedContent, timedItem, DEFAULT_TIMED_CONTENT } from "./timedContent";
import type { TimedContentSettings } from "./timedContent";
import { upcomingPrayerTimes } from "./prayerSchedule";
import { hijriDateOf } from "./islamicOccasions";
import { findReminderCandidate, reminderRotationPool } from "./reminderContent";
import { resolveOpenedReminder } from "./reminderOpen";
import { nativeReminderItem } from "./remindersSync";
import type { PrayerLocation } from "./prayerTimes";
import { LanguageProvider } from "../theme/LanguageContext";
import { SpiritualReminderView } from "../components/SpiritualReminderView";
import { LANGUAGE_STORAGE_KEY } from "./appearancePreferences";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const KUWAIT: PrayerLocation = { coordinates: { latitude: 29.3759, longitude: 47.9774 }, timezone: "Asia/Kuwait", country: "KW" };
const ON: TimedContentSettings = { ...DEFAULT_TIMED_CONTENT, enabled: true, kinds: { asr: true, friday: true, kahf: true, whiteDays: true } };
const toNative = (language: "ar" | "en") => (item: Parameters<typeof nativeReminderItem>[0]) => nativeReminderItem(item, language);
// Wednesday 4 November 2026, 06:00 in Kuwait.
const NOW = new Date("2026-11-04T03:00:00Z");
const build = (settings = ON, language: "ar" | "en" = "ar", location: PrayerLocation | null = KUWAIT, now = NOW) => buildTimedEntries(now, toNative(language), settings, language, location, 14, 0);

beforeEach(() => {
  localStorage.clear();
  native.calls = [];
});

describe("when they are scheduled", () => {
  it("nothing while switched off (the default)", () => {
    expect(loadTimedContentSettings().enabled).toBe(false);
    expect(build({ ...ON, enabled: false })).toEqual([]);
  });

  it("before Asr: the chosen lead before each day's Asr time, from the app's own prayer times", () => {
    const asr = upcomingPrayerTimes(NOW, KUWAIT, 14).filter((p) => p.prayer === "asr" && p.at - 30 * 60_000 > NOW.getTime());
    const entries = build().filter((e) => e.kind === "asr");
    expect(entries.map((e) => e.at)).toEqual(asr.slice(0, entries.length).map((p) => p.at - 30 * 60_000));
    expect(entries.length).toBeGreaterThanOrEqual(14);
    const later = build({ ...ON, asrLeadMinutes: 60 }).filter((e) => e.kind === "asr");
    expect(later[0].at).toBe(asr[0].at - 60 * 60_000);
  });

  it("Friday: two hours before that Friday's Dhuhr (Jumu'ah), and only on Fridays where the prayers are", () => {
    const fridays = build().filter((e) => e.kind === "friday");
    expect(fridays.map((e) => e.key)).toEqual(["friday:2026-11-06", "friday:2026-11-13"]);
    const dhuhr = upcomingPrayerTimes(NOW, KUWAIT, 14).find((p) => p.prayer === "dhuhr" && p.at > Date.parse("2026-11-06T00:00:00Z"))!;
    expect(fridays[0].at).toBe(dhuhr.at - 120 * 60_000);
    expect(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kuwait", weekday: "short" }).format(fridays[0].at)).toBe("Fri");
  });

  it("the White Days: 20:00 on the evening before each Hijri 13th (the app's Umm al-Qura date)", () => {
    const white = build().filter((e) => e.kind === "whiteDays");
    expect(white.length).toBeGreaterThanOrEqual(0);
    for (const e of white) {
      const at = new Date(e.at);
      expect([at.getHours(), at.getMinutes()]).toEqual([20, 0]);
      expect(hijriDateOf(new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, 12), 0)!.day).toBe(13);
    }
    // Over two months there are always two.
    const twoMonths = buildTimedEntries(NOW, toNative("ar"), ON, "ar", KUWAIT, 60, 0).filter((e) => e.kind === "whiteDays");
    expect(twoMonths.length).toBe(2);
    expect(new Set(twoMonths.map((e) => e.key)).size).toBe(2);
  });

  it("a user's Hijri adjustment moves the White Days with the date the app shows", () => {
    const plain = buildTimedEntries(NOW, toNative("ar"), ON, "ar", KUWAIT, 60, 0).filter((e) => e.kind === "whiteDays")[0];
    const shifted = buildTimedEntries(NOW, toNative("ar"), ON, "ar", KUWAIT, 60, 1).filter((e) => e.kind === "whiteDays")[0];
    expect(plain.at - shifted.at).toBe(86_400_000);
  });

  it("without a known location: no prayer-based ones, only the White Days", () => {
    const kinds = new Set(buildTimedEntries(NOW, toNative("ar"), ON, "ar", null as PrayerLocation | null, 60, 0).map((e) => e.kind));
    expect([...kinds]).toEqual(["whiteDays"]);
  });

  it("each moment can be turned off on its own", () => {
    expect(build({ ...ON, kinds: { asr: false, friday: true, kahf: false, whiteDays: false } }).every((e) => e.kind === "friday")).toBe(true);
  });

  it("future only, in time order, one key per moment and day — the same on every sync (no duplicates)", () => {
    const a = build();
    const b = build();
    expect(a).toEqual(b);
    expect(a.every((e) => e.at > NOW.getTime())).toBe(true);
    expect(a.map((e) => e.at)).toEqual([...a.map((e) => e.at)].sort((x, y) => x - y));
    expect(new Set(a.map((e) => e.key)).size).toBe(a.length);
    // Half an hour later the passed one is gone, the rest unchanged.
    const later = build(ON, "ar", KUWAIT, new Date(a[0].at + 1));
    expect(later.map((e) => e.key)).not.toContain(a[0].key);
  });

  it("settings keep a valid lead and fall back otherwise", () => {
    saveTimedContentSettings({ ...ON, asrLeadMinutes: 45 });
    expect(loadTimedContentSettings()).toMatchObject({ enabled: true, asrLeadMinutes: 45 });
    localStorage.setItem("dithar:timed-content:v1", JSON.stringify({ enabled: true, asrLeadMinutes: 7 }));
    expect(loadTimedContentSettings().asrLeadMinutes).toBe(30);
  });
});

describe("what they show", () => {
  it("every listed hadith exists in the library and passed the audit in Arabic", () => {
    for (const ids of Object.values(TIMED_CONTENT)) for (const id of ids) expect(findReminderCandidate(id), id).toBeDefined();
    for (const kind of ["asr", "friday", "kahf", "whiteDays"] as const) expect(timedItem(kind, 0, "ar")).not.toBeNull();
  });

  it("in English only those whose English is a verified published translation", () => {
    for (let n = 0; n < 4; n++) {
      expect(timedItem("asr", n, "en")!.id).toBe("hadith:bukhari-574");
      expect(timedItem("whiteDays", n, "en")!.id).toBe("hadith:bukhari-1981");
    }
  });

  it("alternates its hadiths day by day, with the exact stored text and source", () => {
    const asr = build().filter((e) => e.kind === "asr");
    expect(new Set(asr.slice(0, 2).map((e) => e.item.id))).toEqual(new Set(TIMED_CONTENT.asr));
    const e = asr.find((x) => x.item.id === "hadith:bukhari-574")!;
    expect(e.item.text).toBe(findReminderCandidate("hadith:bukhari-574")!.textAr);
    expect(e.item.source).toContain("البخاري 574، ومسلم 635");
    expect(e.title).toBe("اقتربت صلاة العصر");
  });

  it("never joins the widget's or the reminders' rotation", () => {
    const rotation = new Set(reminderRotationPool().map((i) => i.id));
    for (const id of ["hadith:bukhari-574", "hadith:muslim-854", "hadith:bukhari-935", "hadith:tirmidhi-761", "hadith:bukhari-1981", "reminder:kahf-friday"]) expect(rotation.has(id), id).toBe(false);
    // The library's own Asr hadith (Muslim 634) stays where it was.
    expect(rotation.has("hadith:102")).toBe(true);
  });
});

describe("a tap opens the reminder card, with its source and sharing", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    const r = root;
    if (!r) return;
    act(() => r.unmount());
    container.remove();
  });

  it("the notification's item resolves to the library's own hadith (deep link)", () => {
    const entry = build().find((e) => e.kind === "friday")!;
    const shown = { category: entry.item.category, title: entry.item.title, text: entry.item.text, meaning: entry.item.meaning, detail: "", source: entry.item.source, commentText: null };
    const opened = resolveOpenedReminder(entry.item.id, null, shown, "ar")!;
    expect(opened.from).toBe("library");
    expect(opened.item.id).toBe(entry.item.id);
  });

  it("shows the hadith, its source and grade, and the share menu offers the image", async () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "ar");
    container = document.createElement("div");
    document.body.appendChild(container);
    const r = createRoot(container);
    root = r;
    act(() => r.render(<LanguageProvider><SpiritualReminderView itemId="hadith:bukhari-935" onClose={() => {}} /></LanguageProvider>));
    expect(container.querySelector("[data-reminder-text]")!.textContent).toBe(findReminderCandidate("hadith:bukhari-935")!.textAr);
    expect(container.querySelector("[data-reminder-source]")!.textContent).toContain("البخاري 935");
    await act(async () => (container.querySelector("[data-reminder-share]") as HTMLElement).click());
    const menu = document.querySelector("[data-share-menu]");
    expect(menu).not.toBeNull();
    expect(document.querySelector("[data-share-option='image']")).not.toBeNull();
  });
});

describe("what native is given", () => {
  it("the next days' entries in the interface language", async () => {
    saveTimedContentSettings(ON);
    await syncTimedContent("en", toNative("en"), NOW);
    const call = native.calls[0] as { language: string; entries: { key: string; title: string; item: { id: string } }[] };
    expect(call.language).toBe("en");
    expect(call.entries.length).toBeGreaterThan(0);
    expect(call.entries.find((e) => e.key.startsWith("asr:"))!.title).toBe("Asr is near");
    // Off: an empty list, so native cancels its alarm.
    saveTimedContentSettings({ ...ON, enabled: false });
    await syncTimedContent("en", toNative("en"), NOW);
    expect((native.calls[1] as { entries: unknown[] }).entries).toEqual([]);
  });
});

describe("the Friday Surah al-Kahf reminder", () => {
  const kahf = () => build().filter((e) => e.kind === "kahf");
  let container: HTMLDivElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;
  afterEach(() => {
    const r = root;
    if (r) act(() => r.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });
  const mount = (language: "ar" | "en") => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    container = document.createElement("div");
    document.body.appendChild(container);
    const r = createRoot(container);
    root = r;
    act(() => r.render(<LanguageProvider><SpiritualReminderView itemId="reminder:kahf-friday" onClose={() => {}} /></LanguageProvider>));
    return container;
  };

  it("comes every Friday at the configured Friday time, beside — not instead of — the Friday hadith", () => {
    const fridays = build().filter((e) => e.kind === "friday");
    expect(kahf().map((e) => e.key)).toEqual(["kahf:2026-11-06", "kahf:2026-11-13"]);
    expect(kahf().map((e) => e.at)).toEqual(fridays.map((e) => e.at));
    for (const e of kahf()) expect(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kuwait", weekday: "short" }).format(e.at)).toBe("Fri");
    // Its own switch; the other moments are unchanged by it.
    const without = build({ ...ON, kinds: { ...ON.kinds, kahf: false } });
    expect(without.some((e) => e.kind === "kahf")).toBe(false);
    expect(without).toEqual(build().filter((e) => e.kind !== "kahf"));
  });

  it("is the plain reminder only: its wording, labelled «تذكير», no hadith, virtue or source", () => {
    const [e] = kahf();
    expect(e.title).toBe("سورة الكهف");
    expect(e.item).toMatchObject({ id: "reminder:kahf-friday", title: "تذكير", text: "تذكير بقراءة سورة الكهف يوم الجمعة", source: "", meaning: "", comments: [], detail: "" });
    const en = build(ON, "en").find((x) => x.kind === "kahf")!;
    expect(en.title).toBe("Surah Al-Kahf");
    expect(en.item).toMatchObject({ title: "Reminder", meaning: "A reminder to read Surah Al-Kahf on Friday", source: "" });
    const item = findReminderCandidate("reminder:kahf-friday")!;
    expect(item.evidence).toBeUndefined();
    expect(item.reflection).toBeUndefined();
  });

  it("is on by default once time-based reminders are on, and saved settings without it keep it on", () => {
    expect(DEFAULT_TIMED_CONTENT.kinds.kahf).toBe(true);
    localStorage.setItem("dithar:timed-content:v1", JSON.stringify({ enabled: true, kinds: { asr: true, friday: false, whiteDays: true } }));
    expect(loadTimedContentSettings().kinds).toEqual({ asr: true, friday: false, kahf: true, whiteDays: true });
  });

  it("a tap opens the reminder card on exactly it (deep link)", () => {
    const [e] = kahf();
    const shown = { category: e.item.category, title: e.item.title, text: e.item.text, meaning: e.item.meaning, detail: "", source: e.item.source, commentText: null };
    const opened = resolveOpenedReminder(e.item.id, null, shown, "ar")!;
    expect(opened).toMatchObject({ from: "library", item: { id: "reminder:kahf-friday", kind: "reminder" } });
  });

  it("the card shows its wording under «تذكير», with no source line, and shares it — without any reference", async () => {
    const c = mount("ar");
    expect(c.querySelector("[data-reminder-text]")!.textContent).toBe("تذكير بقراءة سورة الكهف يوم الجمعة");
    expect(c.querySelector("[data-reminder-kind]")!.textContent).toBe("تذكير");
    expect(c.querySelector("[data-reminder-source]")).toBeNull();
    expect(c.querySelector("[data-reminder-evidence]")).toBeNull();
    await act(async () => (c.querySelector("[data-reminder-share]") as HTMLElement).click());
    expect(document.querySelector("[data-share-menu]")).not.toBeNull();
    expect(document.querySelector("[data-share-option='image']")).not.toBeNull();
    const { reminderShareContent } = await import("./reminderShare");
    const share = reminderShareContent(findReminderCandidate("reminder:kahf-friday")!, undefined, "ar", { kindLabel: "تذكير" });
    expect(share).toMatchObject({ textAr: "تذكير بقراءة سورة الكهف يوم الجمعة", kindLabel: "تذكير" });
    expect(share.reference).toBeUndefined();
  });

  it("in English: the Arabic wording with its English, labelled “Reminder”", () => {
    const c = mount("en");
    expect(c.querySelector("[data-reminder-kind]")!.textContent).toBe("Reminder");
    expect(c.textContent).toContain("A reminder to read Surah Al-Kahf on Friday");
    expect(c.querySelector("[data-reminder-source]")).toBeNull();
  });
});
