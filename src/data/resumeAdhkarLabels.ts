// UI strings for the in-app "Resume Adhkar" banner (ResumeAdhkarBanner) —
// the same wording as the native notification (AudioAdhkarResumePromptReceiver.kt).
type DailySection = "morning" | "evening";

export const resumeAdhkarLabels = {
  ar: {
    title: (section: DailySection) => (section === "morning" ? "أذكار الصباح لم تكتمل" : "أذكار المساء لم تكتمل"),
    body: (position: number, count: number) =>
      count > 0 ? `توقفت للصلاة عند الذكر ${position} من ${count}. تابع من حيث توقفت.` : "توقفت للصلاة. تابع من حيث توقفت.",
    action: "استئناف الأذكار",
  },
  en: {
    title: (section: DailySection) => (section === "morning" ? "Morning Adhkar not finished" : "Evening Adhkar not finished"),
    body: (position: number, count: number) =>
      count > 0 ? `Paused for prayer at dhikr ${position} of ${count}. Continue where you left off.` : "Paused for prayer. Continue where you left off.",
    action: "Resume Adhkar",
  },
};
