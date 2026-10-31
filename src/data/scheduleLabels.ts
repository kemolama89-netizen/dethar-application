// UI strings for the weekly holiday start (WeeklyScheduleView), the per-day
// Morning/Evening times and the Islamic-occasions card (AudioAdhkarSettingsView).
import type { OccasionKey } from "../lib/islamicOccasions";

/** Sunday first — the order of Date#getDay and of every per-day list. */
const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const weeklyScheduleLabels = {
  ar: {
    row: "الجدول الأسبوعي",
    rowHint: "أيام الإجازة ووقت البدء فيها",
    pageTitle: "الجدول الأسبوعي",
    back: "رجوع",
    enable: "تفعيل",
    disable: "إيقاف",
    enabled: "مفعّل",
    disabled: "متوقف",
    weekdays: WEEKDAYS_AR,
    holidayTitle: "وقت بدء أيام الإجازة",
    holidayIntro:
      "اختر أيام إجازتك الأسبوعية ووقتًا واحدًا لها. في هذه الأيام لا يبدأ شيء قبل هذا الوقت: الأذكار المتنوعة (وتبقى نهايتها كما هي)، وأذكار الصباح والمساء، وتنبيهات الصلاة والأذان، وتذكيرات الودجت. أول تنبيه صلاة يكون لأول صلاة في هذا الوقت أو بعده، وما بعده يبقى على موعده المعتاد. ويستمر هذا كل أسبوع حتى تغيّره.",
    holidayDays: "أيام الإجازة",
    holidayTime: "لا شيء قبل",
  },
  en: {
    row: "Weekly schedule",
    rowHint: "Your days off and when they start",
    pageTitle: "Weekly schedule",
    back: "Back",
    enable: "Enable",
    disable: "Disable",
    enabled: "On",
    disabled: "Off",
    weekdays: WEEKDAYS_EN,
    holidayTitle: "Holiday start time",
    holidayIntro:
      "Choose your weekly days off and one time for them. On those days nothing starts before it: the Miscellaneous audio dhikr (its end time stays), Morning and Evening Adhkar, prayer notifications and the adhan, and widget reminders. The first prayer notification is for the first prayer at or after that time; everything after keeps its usual time. It repeats every week until you change it.",
    holidayDays: "Days off",
    holidayTime: "Nothing before",
  },
};

export const dailyDayTimesLabels = {
  ar: {
    summary: "تخصيص الوقت حسب اليوم",
    hint: "اترك اليوم فارغًا ليُستخدم وقت البدء المعتاد. واليوم الذي تحدّد له وقتًا تبدأ أذكاره في هذا الوقت تمامًا، ولو خارج فترة الأذكار المعتادة (مع انتظار فترة الأذان إن وافقتها)، وتبقى الأيام الأخرى على وقتها المعتاد.",
    usual: "الوقت المعتاد",
    clear: "مسح",
  },
  en: {
    summary: "Customize the time by day",
    hint: "Leave a day empty to use the usual start time. A day with its own time starts at exactly that time, even outside the usual prayer-time window (it still waits out an adhan pause); every other day keeps the usual time.",
    usual: "Usual time",
    clear: "Clear",
  },
};

/** Misc: its own start and end on chosen weekdays. */
export const miscDayTimesLabels = {
  ar: {
    summary: "تخصيص الفترة حسب اليوم",
    hint: "حدّد لليوم بدايةً أو نهايةً أو كليهما؛ وما تتركه فارغًا يبقى على الوقت المعتاد. ويظلّ الفاصل بين الأذكار كما هو، ويُطبَّق الجدول الأسبوعي (أبكر وقت للبدء) فوق ذلك.",
    usual: "الفترة المعتادة",
    clear: "مسح",
    from: "من",
    to: "إلى",
  },
  en: {
    summary: "Customize the period by day",
    hint: "Set a start, an end or both for a day; whatever you leave empty keeps the usual time. The interval stays the same, and the weekly schedule's earliest start still applies on top.",
    usual: "Usual period",
    clear: "Clear",
    from: "From",
    to: "To",
  },
};

/** The Adhan: a later time for one prayer on chosen weekdays. */
export const adhanDayTimesLabels = {
  ar: {
    title: "وقت الأذان حسب اليوم",
    summary: (prayer: string) => `تأخير أذان ${prayer} في أيام محددة`,
    hint: "يُؤخَّر الأذان وتنبيه الصلاة إلى هذا الوقت في هذا اليوم وحده. ولا يُرفع الأذان قبل دخول الوقت أبدًا: إن كان الوقت المحدد قبل وقت الصلاة أو بعد دخول الصلاة التالية، رُفع الأذان في وقت الصلاة.",
    usual: "وقت الصلاة",
    clear: "مسح",
    prayer: "الصلاة",
  },
  en: {
    title: "Adhan time by day",
    summary: (prayer: string) => `Delay the ${prayer} Adhan on chosen days`,
    hint: "The Adhan and the prayer notification move to this time on that day only. The Adhan is never called before the prayer time: if the chosen time is before it, or after the next prayer has begun, the Adhan plays at the prayer time.",
    usual: "Prayer time",
    clear: "Clear",
    prayer: "Prayer",
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
