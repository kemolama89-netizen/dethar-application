import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useScreenNavigation } from "./lib/useScreenNavigation";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider, useLanguage } from "./theme/LanguageContext";
import { PaletteProvider } from "./theme/PaletteContext";
import { LookProvider } from "./theme/LookContext";
import { setLookSuspended } from "./theme/looks";
import { QuranReciterProvider } from "./theme/QuranReciterContext";
import { DeviceFrame } from "./components/DeviceFrame";
import { AppShell } from "./components/AppShell";
import { TopBar } from "./components/TopBar";
import { LogoHeader } from "./components/LogoHeader";
import { DateTimeStrip } from "./components/DateTimeStrip";
import { PrayerTimesPanel } from "./components/PrayerTimesPanel";
import { BottomNav } from "./components/BottomNav";
import { QuranNavContext } from "./lib/quranNav";
import { AdhkarNavContext } from "./lib/adhkarNav";
import { DailyProgressCard } from "./components/HomeDashboard";
import { HomeActivePlayback } from "./components/HomeAudioPlayer";
import { HomeDailyPicksCard } from "./components/HomeDailyPicksCard";
import type { DailyPickTarget } from "./components/HomeDailyPicksCard";
import type { QuranTarget } from "./components/QuranReaderScreen";
import { loadQuranPosition } from "./lib/quranReading";
import { LocationChangePrompt } from "./components/LocationChangePrompt";
import { useLocationChangeDetector } from "./lib/useLocationChangeDetector";
import { labels } from "./data/content";
import { useDateTime } from "./lib/useDateTime";
import { loadInstallationAnchorDateKey, saveInstallationAnchorDateKey } from "./lib/dailyContentProgress";
import type { WrittenAdhkarCategoryKey } from "./data/written-adhkar";
import type { WrittenSearchResult } from "./components/WrittenAdhkarSearchScreen";
import type { AudioAdhkarList } from "./components/AudioAdhkarScreen";
import { startFloatingOpenRouteRequests, startFloatingTasbeehSync } from "./lib/floatingTasbeehSync";
import { isAudioAdhkarNativeAvailable } from "./lib/audioAdhkarNative";
import { startPrayerNotificationSync, syncPrayerNotifications } from "./lib/prayerNotifications";
import { discardLegacyCalculationOverrides } from "./lib/legacyCalculationSettings";
import { RemindersNative, isRemindersNativeAvailable } from "./lib/remindersNative";
import type { ShownReminder } from "./lib/remindersNative";
import { requestOpenReminder, subscribeOpenReminderRequests } from "./lib/reminderOpenRequests";
// Eager, not lazy: the launch intro must be in the very first paint, or the Home Screen shows before it.
import { StartupHadithOverlay } from "./components/StartupHadithOverlay";
import { dismissStartupOverlay, holdLaunchCover, startupIntroWillShow } from "./lib/startupOverlay";
import type { LaunchCoverHold } from "./lib/startupOverlay";

// Every screen except Home is loaded lazily, in its own chunk, fetched only
// the first time the user actually navigates there — Home is the one
// screen guaranteed to be needed at startup, so it alone stays a static
// import. Named exports need the .then() remap since React.lazy expects a
// module with a default export. Behavior is unchanged: AppRouter still
// picks exactly one of these to render, exactly as before.
//
// Each loader is kept as its own named function (rather than inlined into
// `lazy(...)`) so the SAME function can also be called directly, ahead of
// time, from the idle-prefetch effect below — `import()` for a module
// that's already loaded/loading just returns the cached promise instead
// of firing a second network request, so calling a loader early here and
// having React.lazy call it again later never double-fetches anything.
const loadTasbeehScreen = () => import("./components/TasbeehScreen").then((m) => ({ default: m.TasbeehScreen }));
const loadWrittenAdhkarScreen = () =>
  import("./components/WrittenAdhkarScreen").then((m) => ({ default: m.WrittenAdhkarScreen }));
const loadWrittenAdhkarReader = () =>
  import("./components/WrittenAdhkarReader").then((m) => ({ default: m.WrittenAdhkarReader }));
const loadWrittenAdhkarSearchScreen = () =>
  import("./components/WrittenAdhkarSearchScreen").then((m) => ({ default: m.WrittenAdhkarSearchScreen }));
const loadSettingsScreen = () => import("./components/SettingsScreen").then((m) => ({ default: m.SettingsScreen }));
const loadAudioAdhkarModule = () => import("./components/AudioAdhkarScreen");
const loadAdhkarScreen = () => import("./components/AdhkarScreen").then((m) => ({ default: m.AdhkarScreen }));
const loadSpiritualReminderView = () => import("./components/SpiritualReminderView").then((m) => ({ default: m.SpiritualReminderView }));
const SpiritualReminderView = lazy(loadSpiritualReminderView);

const TasbeehScreen = lazy(loadTasbeehScreen);
const WrittenAdhkarScreen = lazy(loadWrittenAdhkarScreen);
const WrittenAdhkarReader = lazy(loadWrittenAdhkarReader);
const WrittenAdhkarSearchScreen = lazy(loadWrittenAdhkarSearchScreen);
const SettingsScreen = lazy(loadSettingsScreen);
const AdhkarScreen = lazy(loadAdhkarScreen);
const AudioAdhkarScreen = lazy(() => loadAudioAdhkarModule().then((m) => ({ default: m.AudioAdhkarScreen })));
const AudioAdhkarListScreen = lazy(() => loadAudioAdhkarModule().then((m) => ({ default: m.AudioAdhkarListScreen })));
// The Qur'an reader brings the Mushaf text (~1.3 MB) with it, so it is only loaded when opened.
const QuranReaderScreen = lazy(() => import("./components/QuranReaderScreen").then((m) => ({ default: m.QuranReaderScreen })));

// Fetches a lazy screen's chunk ahead of the user actually navigating to
// it, once the browser is idle (never competing with the current screen's
// own render/paint work) — so by the time they tap the nav item, the
// chunk is already cached and Suspense resolves on the same tick instead
// of waiting on a network round trip. `requestIdleCallback` isn't in
// Safari, hence the timeout fallback; the failure catch is because a
// prefetch that's interrupted (e.g. the user navigates away first) should
// never surface as an unhandled rejection — the real navigation's own
// lazy() call just falls back to loading it normally.
function preloadOnIdle(loader: () => Promise<unknown>) {
  const run = () => {
    loader().catch(() => {});
  };
  if (typeof window === "undefined") return;
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run);
  } else {
    window.setTimeout(run, 200);
  }
}

// Shown for the brief moment a lazy screen's chunk is being fetched — just
// the same frame chrome every screen already renders first (see
// DeviceFrame/AppShell/TopBar below), so the transition never drops to a
// bare blank page. On a bundled production build this chunk fetch is
// typically imperceptible; this only guards the rare slow-network case.
function ScreenFallback() {
  return (
    <DeviceFrame>
      <AppShell>
        <TopBar />
      </AppShell>
    </DeviceFrame>
  );
}

// Resolving `language` -> the right content object happens once, here —
// InsightCard/PrayerTimesPanel/BottomNav stay simple/localization-agnostic,
// they just render whatever strings they're given.
//
// `onNavigateToTasbeeh`/`onNavigateToWritten` are the only additions
// needed to make BottomNav's السبحة/Tasbeeh and الأذكار المكتوبة/Written
// Adhkar items actually navigate — everything else in this function is
// unchanged from the approved Home Screen.
function HomeScreen({
  onNavigateToTasbeeh,
  onNavigateToWritten,
  onNavigateToSettings,
  onNavigateToAudio,
  onOpenDailyPick,
}: {
  onNavigateToTasbeeh: () => void;
  onNavigateToWritten: () => void;
  onNavigateToSettings: () => void;
  onNavigateToAudio: () => void;
  onOpenDailyPick: (pick: DailyPickTarget) => void;
}) {
  const { language } = useLanguage();
  const t = labels[language];

  // Date & Time foundation — device clock + device timezone only (see
  // src/lib/dateTime.ts), the single source of truth for today's date and
  // the current time. `dateKey` is this same hook's stable LOCAL-calendar-
  // day identity ("YYYY-MM-DD"); Lataif/Hadith's own daily rotation below
  // is derived from it instead of each keeping its own separate UTC-epoch-
  // day calculation, so the day flips at the device's actual local
  // midnight rather than at UTC midnight. `date` feeds PrayerTimesPanel's
  // real calculation below (which LOCAL day to calculate for) — it reuses
  // this one foundation for "today" rather than creating its own.
  // PrayerTimesPanel gets its own timezone from useCoordinates instead of
  // from here — see that hook's own comment for why it's paired with
  // location, not with the device clock. This file's own daily-content
  // logic below is the ONLY thing that also derives an installation-day
  // number from `dateKey`; it never feeds back into `date`/PrayerTimesPanel.
  const { dateKey, date } = useDateTime(language);

  // Installation-based Day 1 anchor for Lataif/Hadith rotation: the local
  // dateKey of THIS INSTALL's first-ever launch, so every new user starts
  // at item #1 regardless of today's actual calendar date (see
  // src/lib/dailyContentProgress.ts for the full design rationale). Read
  // synchronously once via a useState initializer, the same
  // read-in-useState/write-in-useEffect split useCoordinates.ts already
  // uses for its own persisted location state (resolveActiveLocationRecord
  // in useState, saveLastActiveLocation in an effect) — never written
  // directly during render. Falls back to the CURRENT `dateKey` when no
  // anchor exists yet (this mount is the genuine first launch); the effect
  // below then persists exactly that value, once.
  const [installationAnchorDateKey] = useState(() => loadInstallationAnchorDateKey() ?? dateKey);
  // Prayer times are automatic now — drop any method/madhab choice an older
  // version stored (nothing reads it; this just keeps storage clean).
  useEffect(() => discardLegacyCalculationOverrides(), []);
  useEffect(() => {
    if (loadInstallationAnchorDateKey() === null) {
      saveInstallationAnchorDateKey(installationAnchorDateKey);
    }
  }, [installationAnchorDateKey]);
  // (The anchor is still kept: it is this install's Day 1 for any daily
  // rotation, even though the Home cards that used it were replaced.)

  // Step 5: location-change detection. Runs only while Home is mounted
  // (see useLocationChangeDetector.ts's own comment on this scoping
  // trade-off). `refreshToken` is passed as PrayerTimesPanel's `key` —
  // the same force-remount idiom AppRouter's own screen-switch routing
  // already uses (`key={screen}`) — so a CONFIRMED location update makes
  // PrayerTimesPanel's useCoordinates() re-read the freshly-saved
  // location instead of staying on its stale mount-time snapshot.
  const locationChange = useLocationChangeDetector();

  return (
    <DeviceFrame scrollLocked={locationChange.pending !== null} wallpaper>
      <AppShell>
        <TopBar showExitButton />
        <LogoHeader />
        <DateTimeStrip className="mt-1 [@media(max-height:940px)]:mt-0" />

        {/* The Quranic Insight and Hadith cards used to sit here; their
            content now reaches the user through the widget, reminders and
            the full-screen reflection (lib/reminderContent.ts — the Wamdat
            Lataif and the Hadith library are unchanged). In their place: */}
        {/* The dashboard fills the height between the header and the bottom
            navigation: today's progress right under the header, then the
            «مختارات اليوم» card (it opens today's dua itself), and the prayer
            times — the main panel — growing to take all the room left
            (the dhikr player and Qur'an cards that used to sit here are
            gone: the Mushaf has its own item in the navigation, and the
            player's controls appear only while something actually plays).
            On a short phone everything keeps its minimum size (and the
            screen scrolls inside its frame if it must). */}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 py-1 [@media(min-height:820px)]:gap-2.5 [@media(min-height:820px)]:py-1.5" data-home-dashboard="">
          <DailyProgressCard />
          <HomeDailyPicksCard onOpen={onOpenDailyPick} />
          <HomeActivePlayback />
          <PrayerTimesPanel key={locationChange.refreshToken} date={date} variant="hero" className="flex-1" />
        </div>

        <BottomNav
          className="mt-auto pt-1.5"
          onSelect={(key) => {
            if (key === "tasbih") onNavigateToTasbeeh();
            if (key === "written") onNavigateToWritten();
            if (key === "settings") onNavigateToSettings();
            if (key === "audio") onNavigateToAudio();
          }}
        />
      </AppShell>

      <LocationChangePrompt
        open={locationChange.pending !== null}
        title={t.locationChangeTitle}
        body={t.locationChangeBody}
        confirmLabel={t.locationChangeConfirm}
        declineLabel={t.locationChangeDecline}
        onConfirm={locationChange.confirmUpdate}
        onDecline={locationChange.decline}
      />
    </DeviceFrame>
  );
}

type Screen = "home" | "tasbeeh" | "adhkar" | "written" | "written-reader" | "written-search" | "settings" | "audio" | "audio-list" | "quran";

// Minimal in-memory screen switcher — no router dependency added. Screens
// don't keep their own transient state across a switch (theme/language are
// separate app-wide preferences and DO persist — see
// lib/appearancePreferences.ts): navigating away and back
// unmounts/remounts, so e.g. the domino reader's progress resets each
// visit.
//
// `writtenCategory` is the one extra piece of navigation state the
// Written Adhkar flow needs (Home -> Written Adhkar -> Category ->
// Reader) — which category the reader should open. It's set right before
// switching to "written-reader" and simply left as-is when navigating
// back to "written" (the category list doesn't read it).
//
// Every branch's returned screen is wrapped in the SAME
// `dithar-app-transition` element, keyed by `screen` — that key is what
// makes React remount (and so replay the fade-in) on every navigation,
// giving one unified transition language across all sections without
// touching HomeScreen's or TasbeehScreen's own markup at all: this only
// wraps their already-existing output at the router boundary.
function AppRouter() {
  // `setScreen` keeps its old name and call shape but now also records a
  // back stack (see lib/useScreenNavigation.ts) so system Back — Android's
  // hardware/gesture button and the browser's — returns to the previous
  // screen instead of leaving the app.
  const { screen, navigate: setScreen, back } = useScreenNavigation<Screen>("home");
  const [writtenCategory, setWrittenCategory] = useState<WrittenAdhkarCategoryKey>("morning");
  // The Mushaf keeps its own appearance: the appearance theme (look) and the wallpaper never reach it
  // (theme/looks.ts LOOK_OFF_ATTRIBUTE). Set before paint, so it never shows a frame in the look's colours.
  useLayoutEffect(() => setLookSuspended(screen === "quran"), [screen]);

  // Android only: schedules prayer-time notifications from the saved
  // choices and keeps them current (launch, return to the app, location
  // changes — see lib/prayerNotifications.ts); a language change re-syncs
  // too, since each notification's text is in the interface language.
  const { language } = useLanguage();
  useEffect(() => startPrayerNotificationSync(), []);
  const languageSynced = useRef(language);
  useEffect(() => {
    if (languageSynced.current === language) return;
    languageSynced.current = language;
    void syncPrayerNotifications(new Date(), language).catch(() => {});
    // The Misc "paused for prayer" notifications are in the interface language too.
    if (isAudioAdhkarNativeAvailable()) void import("./lib/audioAdhkarSchedules").then((m) => m.syncAudioAdhkarSchedules()).catch(() => {});
    // So are reminders, the widget's text and the end-of-day summary.
    if (isRemindersNativeAvailable()) void import("./lib/remindersSync").then((m) => Promise.all([m.syncReminders({ withPool: true }), m.syncSummary()])).catch(() => {});
  }, [language]);
  // The specific Dhikr/dua a global search result pointed at — set ONLY
  // right before jumping into "written-reader" FROM a
  // search result (see handleSelectSearchResult below), read once by that
  // screen to scroll straight to it instead of starting at the top.
  // Explicitly cleared to `null` at every ORDINARY entry point into that
  // screen (the category tiles, the bottom-nav "written" tab) so a
  // stale target from a previous search never lingers into a normal visit.
  const [searchTargetItemId, setSearchTargetItemId] = useState<string | null>(null);
  // Which list the Audio Adhkar list screen shows — same pattern as
  // `writtenCategory` above.
  const [audioList, setAudioList] = useState<AudioAdhkarList>({ kind: "written", key: "morning" });
  // The navigation's المصحف item (on every screen, through QuranNavContext).
  // The reader opens at the saved reading position — read each time the
  // section opens (also when Back returns to it), never a stale copy — or
  // at the beginning of the Mushaf before any reading.
  const openQuran = useCallback(() => setScreen("quran"), [setScreen]);
  // The navigation's الأذكار item (on every screen, through AdhkarNavContext): the Adhkar screen's two cards.
  const openAdhkar = useCallback(() => setScreen("adhkar"), [setScreen]);
  const audioNav = {
    onNavigateHome: () => setScreen("home"),
    onNavigateToTasbeeh: () => setScreen("tasbeeh"),
    onNavigateToWritten: () => setScreen("written"),
    onNavigateToSettings: () => setScreen("settings"),
    onNavigateToAudio: () => setScreen("audio"),
  };

  // The Floating Tasbeeh menu's "الإعدادات" row asks the app to open its
  // existing Settings screen — routed through this same screen switcher,
  // never via Home. A no-op on web/iOS.
  useEffect(
    () =>
      startFloatingOpenRouteRequests((route) => {
        if (route === "settings") setScreen("settings");
      }),
    [],
  );

  function handleSelectSearchResult(result: WrittenSearchResult) {
    setSearchTargetItemId(result.itemId);
    setWrittenCategory(result.category);
    setScreen("written-reader");
  }

  // Warms the chunk for whichever screen is the
  // likely NEXT hop from wherever the user currently is, once the browser
  // is idle. This is what makes Home -> Settings/Tasbeeh and
  // Written -> Reader feel instant instead of waiting on a chunk
  // fetch triggered only at the moment of navigation. Deliberately not
  // "prefetch everything from Home": screens two hops away (the reader,
  // the search screen) only get warmed once the user has
  // actually entered that flow, so the initial idle work stays small.
  useEffect(() => {
    if (screen === "home") {
      preloadOnIdle(loadAdhkarScreen);
      preloadOnIdle(loadTasbeehScreen);
      preloadOnIdle(loadWrittenAdhkarScreen);
      preloadOnIdle(loadSettingsScreen);
    } else if (screen === "written") {
      preloadOnIdle(loadWrittenAdhkarReader);
      preloadOnIdle(loadWrittenAdhkarSearchScreen);
    }
  }, [screen]);

  // Every screen's BottomNav reaches the Mushaf through this one provider.
  const routed = (() => {
    if (screen === "tasbeeh") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <TasbeehScreen
              onNavigateHome={() => setScreen("home")}
              onNavigateToWritten={() => setScreen("written")}
              onNavigateToSettings={() => setScreen("settings")}
              onNavigateToAudio={() => setScreen("audio")}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "adhkar") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <AdhkarScreen
              onOpenAudio={() => setScreen("audio")}
              onOpenWritten={() => setScreen("written")}
              onNavigateHome={() => setScreen("home")}
              onNavigateToTasbeeh={() => setScreen("tasbeeh")}
              onNavigateToSettings={() => setScreen("settings")}
              onBack={back}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "written") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <WrittenAdhkarScreen
              onNavigateHome={() => setScreen("home")}
              onNavigateToTasbeeh={() => setScreen("tasbeeh")}
              onNavigateToSettings={() => setScreen("settings")}
              onNavigateToAudio={() => setScreen("audio")}
              onSelectCategory={(key) => {
                setSearchTargetItemId(null);
                setWrittenCategory(key);
                setScreen("written-reader");
              }}
              onOpenSearch={() => setScreen("written-search")}
              onBack={() => setScreen("adhkar")}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "written-reader") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <WrittenAdhkarReader
              category={writtenCategory}
              onNavigateHome={() => setScreen("home")}
              onNavigateToTasbeeh={() => setScreen("tasbeeh")}
              onNavigateToSettings={() => setScreen("settings")}
              onNavigateToAudio={() => setScreen("audio")}
              onBackToCategories={() => setScreen("written")}
              targetItemId={searchTargetItemId ?? undefined}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "written-search") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <WrittenAdhkarSearchScreen
              onBack={() => setScreen("written")}
              onNavigateHome={() => setScreen("home")}
              onNavigateToTasbeeh={() => setScreen("tasbeeh")}
              onNavigateToSettings={() => setScreen("settings")}
              onNavigateToAudio={() => setScreen("audio")}
              onSelectResult={handleSelectSearchResult}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "audio") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <AudioAdhkarScreen
              {...audioNav}
              onBack={() => setScreen("adhkar")}
              onSelectCategory={(key) => {
                setAudioList(key === "misc" ? { kind: "various" } : { kind: "written", key });
                setScreen("audio-list");
              }}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "audio-list") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <AudioAdhkarListScreen
              {...audioNav}
              list={audioList}
              onBack={() => setScreen("audio")}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "quran") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <QuranReaderScreen
              start={quranStart()}
              onBack={() => setScreen("home")}
              onNavigate={(key) => {
                if (key === "home") setScreen("home");
                if (key === "tasbih") setScreen("tasbeeh");
                if (key === "written") setScreen("written");
                if (key === "settings") setScreen("settings");
                if (key === "audio") setScreen("audio");
              }}
            />
          </Suspense>
        </div>
      );
    }
    if (screen === "settings") {
      return (
        <div key={screen} className="dithar-app-transition">
          <Suspense fallback={<ScreenFallback />}>
            <SettingsScreen
              onNavigateHome={() => setScreen("home")}
              onNavigateToTasbeeh={() => setScreen("tasbeeh")}
              onNavigateToWritten={() => setScreen("written")}
              onNavigateToAudio={() => setScreen("audio")}
            />
          </Suspense>
        </div>
      );
    }
    return (
      <div key={screen} className="dithar-app-transition">
        <HomeScreen
          onNavigateToTasbeeh={() => setScreen("tasbeeh")}
          onNavigateToWritten={() => setScreen("written")}
          onNavigateToSettings={() => setScreen("settings")}
          onNavigateToAudio={() => setScreen("audio")}
          // «مختارات اليوم» opens like a tapped notification: the same
          // full-screen view, on the very dua the card shows.
          onOpenDailyPick={(pick) =>
            requestOpenReminder({
              id: `dua:${pick.id}`,
              commentId: null,
              shown: { category: "dua", title: "", text: pick.text, meaning: "", detail: "", source: pick.source, commentText: null },
            })
          }
        />
      </div>
    );
  })();
  return (
    <QuranNavContext.Provider value={openQuran}>
      <AdhkarNavContext.Provider value={openAdhkar}>{routed}</AdhkarNavContext.Provider>
    </QuranNavContext.Provider>
  );
}

/** Where the Qur'an section opens: the saved reading position, or the beginning of the Mushaf. */
function quranStart(): QuranTarget {
  const saved = loadQuranPosition();
  return saved ? { surah: saved.surah, ayah: saved.ayah } : { surah: 1, ayah: 1 };
}

// A reminder notification or the home-screen widget opened the app (Android):
// that reminder is shown full screen over whatever screen is open
// (SpiritualReminderView; lib/remindersSync.ts keeps native in step).
function ReminderOverlayHost() {
  // The reminder to show, as the widget/notification showed it: its id, the
  // DITHAR comment shown with it, and the very strings it drew (so exactly
  // that content opens — lib/reminderOpen.ts).
  const [openReminder, setOpenReminder] = useState<{ id: string; commentId: string | null; shown?: ShownReminder } | null>(null);
  const closeReminder = useCallback(() => setOpenReminder(null), []);
  // A tap on a notification or the widget opens its reminder DIRECTLY — never Home first:
  //  - cold start: the launch cover (index.html) is held from the first frame until native has said
  //    whether the app was opened from a reminder (consumeLaunchReminder); if it was, the cover stays
  //    until the reminder's view has painted, then goes — Home, mounted beneath, is never seen;
  //  - running (background or open): native's "openReminder" event opens the view over the current
  //    screen; its code is fetched ahead (idle), and while it loads an opaque cover stands in.
  // Taken in a layout effect that runs before the launch intro's (this host comes first in App), so the
  // intro can't remove the cover before the answer.
  const launchHold = useRef<LaunchCoverHold | null>(null);
  const launchReminderPending = useRef(false);
  useLayoutEffect(() => {
    if (!isRemindersNativeAvailable()) return;
    const hold = holdLaunchCover();
    launchHold.current = hold;
    return () => hold.cancel();
  }, []);
  // The reminder's view has painted: the cover can go (at once — the logo's time doesn't apply).
  const reminderPainted = useCallback(() => {
    launchReminderPending.current = false;
    launchHold.current?.release(true);
  }, []);
  // The reminder the user tapped is what they came for: the launch intro steps aside at once.
  useEffect(() => {
    if (openReminder) dismissStartupOverlay();
  }, [openReminder]);
  // In-app requests (Home's «مختارات اليوم») take the very same path as a tapped notification.
  useEffect(
    () => subscribeOpenReminderRequests(({ id, commentId, shown }) => setOpenReminder({ id, commentId, shown })),
    [],
  );
  useEffect(() => {
    if (!isRemindersNativeAvailable()) return;
    preloadOnIdle(loadSpiritualReminderView);
    const handle = RemindersNative.addListener("openReminder", ({ id, commentId, shown }) => setOpenReminder({ id, commentId: commentId ?? null, shown: shown ?? undefined }));
    void RemindersNative.consumeLaunchReminder()
      .then(({ id, commentId, shown }) => {
        if (id) {
          launchReminderPending.current = true;
          setOpenReminder({ id, commentId: commentId ?? null, shown: shown ?? undefined });
        } else if (!launchReminderPending.current) {
          // Not opened from a reminder: the launch goes on as usual (logo, intro, Home).
          launchHold.current?.release();
        }
      })
      .catch(() => launchHold.current?.release());
    return () => void handle.then((h) => h.remove());
  }, []);
  if (!openReminder) return null;
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[80]" style={{ background: "var(--color-bg)" }} aria-hidden="true" data-reminder-loading="" />}>
      <SpiritualReminderView
        key={`${openReminder.id}|${openReminder.commentId ?? ""}|${openReminder.shown?.text ?? ""}`}
        itemId={openReminder.id}
        commentId={openReminder.commentId}
        shownAs={openReminder.shown}
        onClose={closeReminder}
      />
      <AfterPaint onPainted={reminderPainted} />
    </Suspense>
  );
}

/** Calls [onPainted] once what was committed with it is on screen (two frames later). */
function AfterPaint({ onPainted }: { onPainted: () => void }) {
  useEffect(() => {
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(onPainted);
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, [onPainted]);
  return null;
}

export default function App() {
  // A safe no-op everywhere except the native Android build (see
  // isFloatingTasbeehAvailable in floatingTasbeehSync.ts) — the one place
  // that starts Floating Tasbeeh reconciliation and pushes the dhikr list
  // to native, once per app launch regardless of the landing screen.
  // (Removed in 8d240c4 while floatingTasbeehSync.ts was still untracked;
  // the module is committed now, so it belongs back here.)
  useEffect(() => {
    startFloatingTasbeehSync();
  }, []);

  // Android only: re-arms scheduled Audio Adhkar (Morning, Evening, Misc)
  // from saved settings and mirrors the native background player's state
  // (see lib/audioAdhkarSchedules.ts). Loaded lazily so the adhkar data stays
  // out of the startup bundle.
  useEffect(() => {
    if (!isAudioAdhkarNativeAvailable()) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("./lib/audioAdhkarSchedules").then((m) => {
      if (!cancelled) stop = m.startAudioAdhkarNativeSync();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  // Android only: reminders, the home-screen widget and the end-of-day
  // summary (lib/remindersSync.ts), loaded lazily like the schedules above.
  useEffect(() => {
    if (!isRemindersNativeAvailable()) return;
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("./lib/remindersSync").then((m) => {
      if (!cancelled) stop = m.startRemindersSync();
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  // With the launch intro, the Home Screen mounts once the intro's text is on
  // screen (so the two never compete for the first frames); without it, at once.
  const [homeMounted, setHomeMounted] = useState(() => !startupIntroWillShow());
  const mountHome = useCallback(() => setHomeMounted(true), []);
  // The first screen has painted (one frame after it mounted): the launch
  // intro may leave as soon as its brief display is over.
  const [appReady, setAppReady] = useState(false);
  useEffect(() => {
    if (!homeMounted) return;
    const frame = window.requestAnimationFrame(() => setAppReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [homeMounted]);

  return (
    <LanguageProvider>
      <ThemeProvider>
        <PaletteProvider>
          <LookProvider>
            <QuranReciterProvider>
              {homeMounted && <AppRouter />}
              <ReminderOverlayHost />
              <StartupHadithOverlay appReady={appReady} onShown={mountHome} />
            </QuranReciterProvider>
          </LookProvider>
        </PaletteProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
