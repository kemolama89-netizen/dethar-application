import { useEffect, useState } from "react";
import { getDailyActivity, getDailyAudioActivity, subscribeStatsChanges, todayLocalDate } from "./stats";
import type { DailyActivity, DailyAudioActivity } from "./stats";
import { isPageVisible, subscribePageVisibility } from "./pageVisibility";

/** Today's recorded activity, kept current as anything is recorded (and across midnight on the next change). */
export function useTodayActivity(): { activity: DailyActivity; audio: DailyAudioActivity } {
  const read = () => {
    const today = todayLocalDate();
    return { activity: getDailyActivity(today), audio: getDailyAudioActivity(today) };
  };
  const [state, setState] = useState(read);
  useEffect(() => subscribeStatsChanges(() => setState(read())), []);
  // Back in the app (possibly on a new day): read again.
  useEffect(() => subscribePageVisibility(() => isPageVisible() && setState(read())), []);
  return state;
}
