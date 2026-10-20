// The exact strings the app hands to the native home-screen widget
// (remindersSync.nativeReminderItem), frozen in a fixture that the Android
// JVM test WidgetNativeContractTest reads and pushes through the native
// store (ReminderStore) — so the same strings are checked on both sides.
//
// This test fails when the app's output no longer matches the fixture
// (content or preparation changed). Regenerate it deliberately with:
//   WRITE_WIDGET_FIXTURE=1 npx vitest run src/lib/widgetNativeContract.test.ts
import { describe, expect, it } from "vitest";
import fixture from "../../android/app/src/test/resources/widget-native-items.json";
import { reminderPool } from "./reminderContent";
import { nativeReminderItem } from "./remindersSync";

const FIXTURE_URL = new URL("../../android/app/src/test/resources/widget-native-items.json", import.meta.url);

function current() {
  return {
    ar: reminderPool().map((i) => nativeReminderItem(i, "ar")).filter((i) => i.widget !== false),
    en: reminderPool().map((i) => nativeReminderItem(i, "en")).filter((i) => i.widget !== false),
  };
}

describe("widget strings handed to native", () => {
  it("are exactly the fixture the Android contract test checks", async () => {
    const now = current();
    if (import.meta.env.WRITE_WIDGET_FIXTURE) {
      // Regeneration only (Vitest runs in Node); kept untyped so the app's browser-only TypeScript setup needs no Node types.
      const fs = await import(/* @vite-ignore */ ["node", "fs"].join(":"));
      fs.writeFileSync(FIXTURE_URL, JSON.stringify(now, null, 1) + "\n");
      return;
    }
    expect(fixture.ar.length).toBe(now.ar.length);
    expect(fixture.en.length).toBe(now.en.length);
    expect(fixture).toEqual(now);
  });
});
