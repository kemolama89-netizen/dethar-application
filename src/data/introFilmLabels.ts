// The first-launch introduction (components/IntroFilm.tsx, IntroFilmScenes.tsx). Interface words only:
// each caption and each miniature control describes a feature that exists in the app today, in the words
// of its own labels (checked against the screens on 2026-11-07; where a label module is light enough the
// scenes import it directly). The tagline is the owner's. No verse, Tafsir, hadith, dua or dhikr text is
// written here — the Qur'an scenes show the printed Mushaf page image itself, and content areas are drawn
// as blank lines. Sample numbers (page 12, repetition 2 of 3, a target of 33) are examples of the UI.

export type IntroSceneId =
  | "opening"
  | "prayer"
  | "quran"
  | "tafsir"
  | "journey"
  | "adhan"
  | "audio"
  | "written"
  | "tasbeeh"
  | "floating"
  | "widget"
  | "notify"
  | "daysoff"
  | "stats"
  | "looks"
  | "closing";

type IntroLabels = {
  dialog: string;
  skip: string;
  next: string;
  pause: string;
  play: string;
  mute: string;
  unmute: string;
  begin: string;
  progress: (n: number, total: number) => string;
  tagline: string;
  brand: string;
  captions: Record<IntroSceneId, string>;
  prayer: { next: string };
  mini: {
    verse: string;
    tafsirTitle: string;
    page12: string;
    of604: string;
    morning: string;
    repetition: string;
    stoppedAt: string;
    window: string;
    misc: string;
    adhan: string;
    adhanAt: string;
    resumeAt: string;
    pauseWindow: string;
    miscPaused: string;
    miscResumed: string;
    categories: [string, string, string, string];
    count: (n: string) => string;
    target33: string;
    floatingNote: string;
    widgetTitle: string;
    shareTitle: string;
    asText: string;
    asImage: string;
    copy: string;
    dua: string;
    hadith: string;
    days: string[];
    time10: string;
    delayed: [string, string, string];
    looks: [string, string, string, string];
    autoDark: string;
    byTime: string;
    digits: (n: number) => string;
  };
  closing: string;
};

const arDigits = (n: number) => n.toLocaleString("ar-EG");
const enDigits = (n: number) => n.toLocaleString("en-US");

export const introFilmLabels: Record<"ar" | "en", IntroLabels> = {
  ar: {
    dialog: "مقدمة دِثار",
    skip: "تخطَّ",
    next: "التالي",
    pause: "إيقاف مؤقت",
    play: "تشغيل",
    mute: "كتم الصوت",
    unmute: "تشغيل الصوت",
    begin: "ابدأ",
    progress: (n, total) => `المشهد ${n} من ${total}`,
    tagline: "نحو حياة أقرب إلى الله",
    brand: "DITHAR",
    captions: {
      opening: "نحو حياة أقرب إلى الله",
      prayer: "مواقيت يومك حسب موقعك، والأذان بالصوت الذي تختاره.",
      quran: "المصحف كما طُبع، مع تفسير السعدي، وصفحة كل يوم في رحلة القرآن.",
      tafsir: "اضغط مطوّلًا على آية: تفسيرٌ، وعلامةٌ، ومشاركة.",
      journey: "صفحة كل يوم في بصائر، وتقدّمك محفوظ.",
      adhan: "نوّع بين المؤذنين، واستبعد من لا تريد.",
      audio: "تابع من حيث توقفت، وعند الأذان تتوقف المتنوعة ٣٠ دقيقة ثم تُستأنف.",
      written: "عدّادٌ لكل ذكر، ومصباحٌ يضيء حين تُتمّ وردك.",
      tasbeeh: "سبّح باللمس أو بالصوت، ولك عددٌ تبلغه.",
      floating: "فعّلها من الإعدادات، وسبّح فوق أي تطبيق.",
      widget: "ودجت يتجدّد على شاشتك، وكل ما تقرؤه يُشارَك.",
      notify: "لكل تنبيهٍ مفتاحه، توقفه وحده متى شئت.",
      daysoff: "في أيام إجازتك، لا يبدأ شيءٌ قبل الوقت الذي تختاره.",
      stats: "وردك محفوظ يومًا بيوم، وملخصٌ في آخر اليوم.",
      looks: "أربع سمات، وخلفيتك، ووضعٌ ليلي تلقائي.",
      closing: "دِثار يرافقك في يومك، ودليل الميزات في الإعدادات.",
    },
    prayer: { next: "الصلاة القادمة" },
    mini: {
      verse: "سورة الفاتحة · الآية ٢",
      tafsirTitle: "تفسير السعدي",
      page12: "١٢",
      of604: "٦٠٤",
      morning: "أذكار الصباح",
      repetition: "الذكر ٣ · التكرار ٢ من ١٠٠",
      stoppedAt: "توقفت عند الذكر ٣",
      window: "من بعد الفجر بـ30 دقيقة",
      misc: "الأذكار المتنوعة",
      adhan: "الأذان",
      // An example prayer time; the app writes these times as HH:mm (AudioAdhkarPauseReceiver.kt).
      adhanAt: "15:12",
      resumeAt: "15:42",
      pauseWindow: "٣٠ دقيقة بعد الأذان",
      // The app's own notices for the adhan pause (AudioAdhkarPauseReceiver.kt), word for word.
      miscPaused: "تم إيقاف الأذكار المتنوعة بسبب الصلاة، وسيتم استئنافها الساعة 15:42 بعد انتهاء فترة التوقف.",
      miscResumed: "تم استئناف الأذكار المتنوعة",
      categories: ["أذكار الصباح", "أذكار المساء", "أذكار الصلاة", "أذكار وأدعية متفرقة"],
      count: (n) => `${n} / ٣`,
      target33: "٣٣",
      floatingNote: "تطبيق آخر",
      widgetTitle: "ودجت دِثار",
      shareTitle: "مشاركة",
      asText: "مشاركة كنص",
      asImage: "مشاركة كصورة",
      copy: "نسخ النص",
      dua: "دعاء",
      hadith: "حديث نبوي",
      days: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
      time10: "١٠:٠٠ ص",
      delayed: ["الأذكار الصوتية", "تنبيهات الصلاة", "تذكيرات الودجت"],
      looks: ["كلاسيكي", "ليلي", "طبيعة", "غروب"],
      autoDark: "الوضع الداكن التلقائي",
      byTime: "حسب الوقت",
      digits: arDigits,
    },
    closing: "حيّاك في دِثار",
  },
  en: {
    dialog: "Introducing DITHAR",
    skip: "Skip",
    next: "Next",
    pause: "Pause",
    play: "Play",
    mute: "Mute",
    unmute: "Sound on",
    begin: "Begin",
    progress: (n, total) => `Scene ${n} of ${total}`,
    tagline: "Toward a life closer to Allah",
    brand: "DITHAR",
    captions: {
      opening: "Toward a life closer to Allah",
      prayer: "Today's prayer times for where you are, and the adhan in the voice you choose.",
      quran: "The Mushaf as it was printed, with Tafsir al-Sa'di, and a page each day on the Qur'an Journey.",
      tafsir: "Long-press a verse: Tafsir, a bookmark, or share it.",
      journey: "A page a day in Basa'ir, with your progress kept.",
      adhan: "Rotate muezzins, and leave out any you don't want.",
      audio: "Resume where you stopped; at the adhan, Miscellaneous Adhkar pause 30 minutes, then resume.",
      written: "A counter for each dhikr, and a lamp that lights when your wird is done.",
      tasbeeh: "Count by touch or by voice, toward a target.",
      floating: "Turn it on in Settings, and count over any app.",
      widget: "A widget that refreshes on your screen, and anything you read can be shared.",
      notify: "Every notification has its own switch.",
      daysoff: "On your days off, nothing starts before the time you choose.",
      stats: "Your wird kept day by day, and a summary at day's end.",
      looks: "Four themes, your background, and automatic night mode.",
      closing: "With you through your day — the Feature guide is in Settings.",
    },
    prayer: { next: "Next prayer" },
    mini: {
      verse: "Al-Fatiha · Verse 2",
      tafsirTitle: "Tafsir al-Sa'di",
      page12: "12",
      of604: "604",
      morning: "Morning Adhkar",
      repetition: "Dhikr 3 · Repetition 2 of 100",
      stoppedAt: "Stopped at dhikr 3",
      window: "From 30 minutes after Fajr",
      misc: "Miscellaneous Adhkar",
      adhan: "Adhan",
      adhanAt: "15:12",
      resumeAt: "15:42",
      pauseWindow: "30 minutes after the adhan",
      miscPaused: "Miscellaneous Adhkar paused for prayer. They will resume at 15:42, when the pause ends.",
      miscResumed: "Miscellaneous Adhkar resumed",
      categories: ["Morning Adhkar", "Evening Adhkar", "Prayer Adhkar", "Various Adhkar & Duas"],
      count: (n) => `${n} / 3`,
      target33: "33",
      floatingNote: "Another app",
      widgetTitle: "DITHAR widget",
      shareTitle: "Share",
      asText: "Share as text",
      asImage: "Share as image",
      copy: "Copy text",
      dua: "Dua",
      hadith: "Hadith",
      days: ["S", "M", "T", "W", "T", "F", "S"],
      time10: "10:00 AM",
      delayed: ["Audio Adhkar", "Prayer notifications", "Widget reminders"],
      looks: ["Classic", "Night", "Nature", "Modern Sunset"],
      autoDark: "Automatic dark mode",
      byTime: "By time of day",
      digits: enDigits,
    },
    closing: "Welcome to DITHAR",
  },
};
