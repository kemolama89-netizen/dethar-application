import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CUSTOM_WALLPAPER_KEY, DEFAULT_LOOK_SETTINGS, LOOK_STORAGE_KEY, effectiveLook, loadCustomWallpaper, loadLookSettings, lookStylesheet, saveCustomWallpaper, saveLookSettings, shownWallpaper, veilAlpha } from "./looks";
import type { CustomWallpaper, LookId, LookSettings } from "./looks";
import { RemindersNative, isRemindersNativeAvailable } from "../lib/remindersNative";

// The active appearance theme ("look", theme/looks.ts) for the whole app:
// sets html[data-look] (the look's tokens) and
// the Home wallpaper's custom properties on <html>, from the first render, so a
// saved look shows from the first frame. Automatic dark mode follows the phone
// (prefers-color-scheme) or the time of day, re-checked every minute.

interface LookContextValue {
  settings: LookSettings;
  /** The look on screen now (Night when automatic dark mode applies). */
  look: LookId;
  custom: CustomWallpaper | null;
  apply: (settings: LookSettings, custom?: CustomWallpaper | null) => boolean;
  restoreDefault: () => void;
}

const LookContext = createContext<LookContextValue | null>(null);

const STYLE_ELEMENT_ID = "dithar-looks";

function ensureLookStylesheet(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ELEMENT_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = lookStylesheet();
  document.head.appendChild(style);
}

function deviceDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Puts the look and the wallpaper on <html> (the stylesheet reads data-look; Home reads the --look-wallpaper-* properties). */
function applyLookToDocument(settings: LookSettings, custom: CustomWallpaper | null, look: LookId): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-look", look);
  const wallpaper = shownWallpaper(settings, look, custom);
  root.style.setProperty("--look-wallpaper", `url("${wallpaper.url}")`);
  root.style.setProperty("--look-veil-alpha", String(veilAlpha(look, wallpaper.tone)));
  root.style.setProperty("--look-card-alpha", String(settings.cardOpacity));
}

export function LookProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LookSettings>(() => loadLookSettings());
  const [custom, setCustom] = useState<CustomWallpaper | null>(() => loadCustomWallpaper());
  const [dark, setDark] = useState(deviceDark);
  const [now, setNow] = useState(() => new Date());
  const look = effectiveLook(settings, dark, now);

  // Applied while the first render is computed (as PaletteProvider does), then on every change.
  useState(() => {
    ensureLookStylesheet();
    applyLookToDocument(settings, custom, look);
    return null;
  });
  useEffect(() => applyLookToDocument(settings, custom, look), [settings, custom, look]);
  // The floating Tasbeeh and native's reminder cover follow the theme, also while the app is closed (AppLook.kt).
  useEffect(() => {
    if (isRemindersNativeAvailable()) void RemindersNative.setAppLook({ look: settings.look, autoDark: settings.autoDark }).catch(() => {});
  }, [settings.look, settings.autoDark]);

  useEffect(() => {
    if (settings.autoDark !== "device" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(query.matches);
    onChange();
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, [settings.autoDark]);
  useEffect(() => {
    if (settings.autoDark !== "time") return;
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, [settings.autoDark]);

  // Another tab (the web preview) changed it.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOOK_STORAGE_KEY) setSettings(loadLookSettings());
      if (e.key === CUSTOM_WALLPAPER_KEY) setCustom(loadCustomWallpaper());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const apply = useCallback((next: LookSettings, nextCustom?: CustomWallpaper | null) => {
    if (nextCustom !== undefined) {
      if (!saveCustomWallpaper(nextCustom)) return false;
      setCustom(nextCustom);
    }
    saveLookSettings(next);
    setSettings(next);
    setNow(new Date());
    return true;
  }, []);
  const restoreDefault = useCallback(() => {
    saveCustomWallpaper(null);
    setCustom(null);
    saveLookSettings(DEFAULT_LOOK_SETTINGS);
    setSettings(DEFAULT_LOOK_SETTINGS);
  }, []);

  const value = useMemo<LookContextValue>(() => ({ settings, look, custom, apply, restoreDefault }), [settings, look, custom, apply, restoreDefault]);
  return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}

export function useLook(): LookContextValue {
  const ctx = useContext(LookContext);
  if (!ctx) throw new Error("useLook must be used within a LookProvider");
  return ctx;
}
