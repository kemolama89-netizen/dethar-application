// UI strings for the weekly schedule (WeeklyScheduleView), the per-day
// Morning/Evening times and the Islamic-occasions card (AudioAdhkarSettingsView).
import type { OccasionKey } from "../lib/islamicOccasions";

/** Sunday first — the order of Date#getDay and of every per-day list. */
const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const weeklyScheduleLabels = {
  ar: {
    row: "الجدول الأسبوعي",
    rowHint: "وقت بدء مختلف لكل يوم من أيام الأسبوع",
    pageTitle: "الجدول الأسبوعي",
    back: "رجوع",
    enable: "تفعيل",
    disable: "إيقاف",
    enabled: "مفعّل",
    disabled: "متوقف",
    weekdays: WEEKDAYS_AR,
    intro:
      "اختر وقت بدء يومك لكل يوم على حدة، فأيام العمل تختلف عن أيام الإجازة. لن يبدأ في أي يوم قبل وقته: الأذكار المتنوعة المتكررة، وتذكيرات الأدعية والأحاديث، ومحتوى الودجت. أمّا أذكار الصباح والمساء فلها أوقاتها الخاصة (ويمكن تخصيصها لكل يوم من صفحتها)، ومواقيت الصلاة والأذان لا تتغير أبدًا.",
    floorNote: "إذا كان لقسمٍ وقت بدء أحدث من وقت اليوم، يُعتمد الأحدث منهما.",
    noRestriction: "بلا تقييد",
    clear: "مسح",
    copyToAll: (day: string) => `نسخ وقت ${day} إلى كل الأيام`,
    applyToWorkdays: "تطبيق على أيام العمل",
    applyToWeekend: "تطبيق على الجمعة والسبت",
  },
  en: {
    row: "Weekly schedule",
    rowHint: "A different start time for each day of the week",
    pageTitle: "Weekly schedule",
    back: "Back",
    enable: "Enable",
    disable: "Disable",
    enabled: "On",
    disabled: "Off",
    weekdays: WEEKDAYS_EN,
    intro:
      "Choose when your day starts, separately for each day — workdays and days off differ. On each day nothing recurring starts before its time: the repeating Miscellaneous audio dhikr, dua and hadith reminders, and widget content. Morning and Evening Adhkar keep their own times (which can be set per day on their pages), and prayer times and the adhan never change.",
    floorNote: "If a section's own start time is later than the day's, the later one applies.",
    noRestriction: "No restriction",
    clear: "Clear",
    copyToAll: (day: string) => `Copy ${day}'s time to every day`,
    applyToWorkdays: "Apply to workdays",
    applyToWeekend: "Apply to Fri & Sat",
  },
};

export const dailyDayTimesLabels = {
  ar: {
    summary: "تخصيص الوقت حسب اليوم",
    hint: "اترك اليوم فارغًا ليُستخدم وقت البدء المعتاد. ويبقى التشغيل داخل فترة الأذكار نفسها وفق مواقيت الصلاة.",
    usual: "الوقت المعتاد",
    clear: "مسح",
  },
  en: {
    summary: "Customize the time by day",
    hint: "Leave a day empty to use the usual start time. Playback still stays inside the same prayer-time window.",
    usual: "Usual time",
    clear: "Clear",
  },
};

const OCCASION_NAMES: Record<"ar" | "en", Record<OccasionKey, string>> = {
  ar: {
    friday: "يوم الجمعة",
    arafah: "يوم عرفة",
    eid: "العيد وأيام التشريق",
    dhulhijjah: "العشر الأوائل من ذي الحجة",
  },
  en: {
    friday: "Friday",
    arafah: "The Day of Arafah",
    eid: "Eid and the days of Tashreeq",
    dhulhijjah: "The first ten days of Dhul-Hijjah",
  },
};

/** What each occasion plays, and the evidence (shown so the user can verify it). */
const OCCASION_DETAILS: Record<"ar" | "en", Record<OccasionKey, { plays: string; evidence: string }>> = {
  ar: {
    friday: {
      plays: "الصلاة على النبي ﷺ فقط",
      evidence: "«إنَّ مِن أفضلِ أيامِكم يومَ الجمعةِ… فأكثِروا عليَّ من الصلاةِ فيه» — أبو داود 1047، النسائي 1374، ابن ماجه 1085 (صححه الألباني).",
    },
    arafah: {
      plays: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
      evidence: "«خيرُ الدعاءِ دعاءُ يومِ عرفةَ، وخيرُ ما قلتُ أنا والنبيُّون من قبلي: لا إله إلا الله…» — الترمذي 3585 (حسّنه الألباني).",
    },
    eid: {
      plays: "أذكار التكبير والتحميد",
      evidence: "﴿وَلِتُكَبِّرُوا اللَّهَ عَلَىٰ مَا هَدَاكُمْ﴾ البقرة 185، ﴿وَاذْكُرُوا اللَّهَ فِي أَيَّامٍ مَّعْدُودَاتٍ﴾ البقرة 203؛ «أيامُ التشريقِ أيامُ أكلٍ وشربٍ وذكرٍ لله» — مسلم 1141.",
    },
    dhulhijjah: {
      plays: "التهليل والتكبير والتحميد",
      evidence: "فضل العمل في العشر — البخاري 969؛ وتكبير ابن عمر وأبي هريرة في الأسواق أيام العشر — البخاري (معلّقًا)؛ ﴿وَيَذْكُرُوا اسْمَ اللَّهِ فِي أَيَّامٍ مَّعْلُومَاتٍ﴾ الحج 28.",
    },
  },
  en: {
    friday: {
      plays: "Salawat upon the Prophet ﷺ only",
      evidence: "“Among the best of your days is Friday… so send abundant blessings upon me on it” — Abu Dawud 1047, al-Nasa'i 1374, Ibn Majah 1085 (graded sahih by al-Albani).",
    },
    arafah: {
      plays: "Lā ilāha illā Allāhu waḥdahu lā sharīka lah… (There is no deity but Allah alone…)",
      evidence: "“The best supplication is the supplication of the Day of Arafah, and the best of what I and the prophets before me said: Lā ilāha illā Allāh…” — al-Tirmidhi 3585 (graded hasan by al-Albani).",
    },
    eid: {
      plays: "Dhikr of takbir and praise",
      evidence: "“…and that you glorify Allah for guiding you” (Qur'an 2:185); “Remember Allah during the appointed days” (2:203); “The days of Tashreeq are days of eating, drinking and remembering Allah” — Muslim 1141.",
    },
    dhulhijjah: {
      plays: "Tahlil, takbir and tahmid",
      evidence: "The virtue of good deeds in the ten days — al-Bukhari 969; Ibn 'Umar and Abu Hurayrah's takbir in the markets during the ten days — al-Bukhari (mu'allaq); Qur'an 22:28.",
    },
  },
};

export const occasionLabels = {
  ar: {
    title: "الجمعة والمناسبات الإسلامية",
    enableRow: "تكييف الأذكار المتنوعة تلقائيًا",
    intro:
      "في هذه الأيام تُشغِّل الأذكار المتنوعة المتكررة الذكرَ الوارد فيها فقط، بنفس فترة التشغيل والمدة بين كل ذكر، ثم تعود إلى اختيارك المعتاد تلقائيًا من حيث توقف. لا تتغير أذكار الصباح والمساء.",
    ramadanNote: "رمضان: لا يُغيَّر التناوب المعتاد، إذ لا يتوفر ذكرٌ مخصوص لأيامه بدليل ثابت ضمن التسجيلات المتاحة.",
    hijriAdjust: "تعديل التاريخ الهجري",
    hijriAdjustHint: "يُحسب التاريخ الهجري وفق تقويم أم القرى. إن كانت بلدك تبدأ الشهر برؤية محلية مختلفة فعدّله هنا (ويظهر التعديل في التاريخ بالصفحة الرئيسية أيضًا).",
    hijriAdjustOption: (d: number) => (d === 0 ? "أم القرى (بدون تعديل)" : d > 0 ? `+${d} ${d === 1 ? "يوم" : "يومان"}` : `−${-d} ${d === -1 ? "يوم" : "يومان"}`),
    todayHijri: (date: string) => `التاريخ الهجري اليوم: ${date}`,
    todayIs: (name: string, plays: string) => `اليوم: ${name} — ${plays}`,
    todayNormal: "اليوم: التناوب المعتاد لاختيارك.",
    noCalendar: "تعذّر تحديد التاريخ الهجري على هذا الجهاز، فتُطبَّق الجمعة فقط وتبقى بقية الأيام على التناوب المعتاد.",
    evidenceSummary: "المناسبات وأدلتها",
    names: OCCASION_NAMES.ar,
    details: OCCASION_DETAILS.ar,
  },
  en: {
    title: "Fridays and Islamic occasions",
    enableRow: "Adapt Miscellaneous Adhkar automatically",
    intro:
      "On these days the repeating Miscellaneous audio dhikr plays only the dhikr reported for the day — same window and interval — then returns to your usual selection automatically, where it left off. Morning and Evening Adhkar never change.",
    ramadanNote: "Ramadan: the usual rotation is kept, as no dhikr specific to its days with reliable evidence is among the available recordings.",
    hijriAdjust: "Hijri date adjustment",
    hijriAdjustHint: "The Hijri date follows the Umm al-Qura calendar. If your country starts months by a different local sighting, adjust it here (the Home screen date follows it too).",
    hijriAdjustOption: (d: number) => (d === 0 ? "Umm al-Qura (no adjustment)" : `${d > 0 ? "+" : "−"}${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"}`),
    todayHijri: (date: string) => `Today's Hijri date: ${date}`,
    todayIs: (name: string, plays: string) => `Today: ${name} — ${plays}`,
    todayNormal: "Today: your usual rotation.",
    noCalendar: "The Hijri date can't be determined on this device, so only Fridays apply; other days keep the usual rotation.",
    evidenceSummary: "Occasions and their evidence",
    names: OCCASION_NAMES.en,
    details: OCCASION_DETAILS.en,
  },
};
