import { useEffect, useState } from "react";
import { loadAudioAdhkarMasterEnabled, saveAudioAdhkarMasterEnabled, subscribeAudioAdhkarMaster } from "./audioAdhkarScheduleSettings";

export interface UseAudioAdhkarMasterResult {
  /** Scheduled Audio Adhkar (every section) on or off — see audioAdhkarScheduleSettings.ts. */
  enabled: boolean;
  toggle: () => void;
}

// The Audio Adhkar master switch, shared by the home screen's toggle (beside
// "الصلاة القادمة") and Settings → إعدادات الأذكار الصوتية: both read and
// write the same saved value and follow each other's changes. The switch is
// saved at once; the scheduling module (with the adhkar data) is loaded
// lazily, as App.tsx does, so it stays out of the home screen's bundle.
export function useAudioAdhkarMaster(): UseAudioAdhkarMasterResult {
  const [enabled, setEnabled] = useState(loadAudioAdhkarMasterEnabled);
  useEffect(() => subscribeAudioAdhkarMaster(setEnabled), []);

  function toggle() {
    const next = !enabled;
    saveAudioAdhkarMasterEnabled(next);
    void import("./audioAdhkarSchedules").then((m) => m.setAudioAdhkarMasterEnabled(next)).catch(() => {});
  }

  return { enabled, toggle };
}
