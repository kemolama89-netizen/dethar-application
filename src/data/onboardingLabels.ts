// The first-time tour and the first-visit hints (components/OnboardingTour.tsx, FirstVisitHint.tsx).
// Interface words only: what each place is for, and how to use it — no religious claim.
export type TourStepId = "prayer" | "picks" | "adhkar" | "tasbeeh" | "quran" | "settings" | "explore";

export const onboardingLabels = {
  ar: {
    dialog: "جولة في دِثار",
    next: "التالي",
    back: "السابق",
    skip: "تخطَّ",
    finish: "إنهاء",
    step: (n: number, total: number) => `${n} / ${total}`,
    steps: {
      prayer: { title: "مواقيت الصلاة", body: "مواقيت يومك حسب موقعك. «تذكير الصلاة» يُنبّهك عند كل صلاة، و«الأذكار الصوتية» تُسمِعك أذكارك في أوقاتها." },
      picks: { title: "مختارات اليوم", body: "دعاءٌ أو حديث أو ذكرٌ موثّق يتجدد، وهو نفسه على ودجت الشاشة الرئيسية. اضغط «اقرأ» لتقرأه كاملًا وتشاركه." },
      adhkar: { title: "الأذكار", body: "الأذكار المكتوبة والمسموعة. «تشغيل الكل» يُسمِعك أذكار الصباح أو المساء متتابعة، وإن توقفت تتابع من موضعك." },
      tasbeeh: { title: "السبحة", body: "عدّاد التسبيح باللمس أو بالصوت. ولتسبّح وأنت في تطبيقات أخرى، فعّل «السبحة العائمة» من الإعدادات." },
      quran: { title: "المصحف", body: "صفحات المصحف كما طُبعت. اضغط مطوّلًا على آية ثم «عرض التفسير» لتقرأ تفسير السعدي، ومن «بصائر» صفحة يومك في رحلة القرآن." },
      settings: { title: "الإعدادات", body: "المظهر والتنبيهات والإحصائيات، وكل خيارات التطبيق." },
      explore: { title: "اكتشف دِثار", body: "كل ميزات التطبيق وخيارات تخصيصه في الإعدادات. افتح «جولة داخل التطبيق» لتشاهد مقدمة دِثار، وتتصفح دليل الميزات، وتعيد هذه الجولة متى شئت." },
    } as Record<TourStepId, { title: string; body: string }>,
    // The «جولة داخل التطبيق» rows are appTourLabels, below.
    // First-visit hints
    gotIt: "حسنًا",
    hintPlayAll: "«تشغيل الكل» يُسمِعك أذكار القسم متتابعة. وإن خرجت أو انقطع التشغيل، تجد هنا «متابعة» من حيث توقفت.",
    hintBasair: "في «بصائر» صفحة يومك من رحلة القرآن. وفي المصحف، اضغط مطوّلًا على آية ثم «عرض التفسير».",
  },
  en: {
    dialog: "A tour of DITHAR",
    next: "Next",
    back: "Back",
    skip: "Skip",
    finish: "Finish",
    step: (n: number, total: number) => `${n} / ${total}`,
    steps: {
      prayer: { title: "Prayer times", body: "Today's prayer times for your location. «Prayer Reminder» notifies you at each prayer; «Audio Adhkar» plays your adhkar at their times." },
      picks: { title: "Today's picks", body: "A verified dua, hadith or dhikr that changes — the same as on your home-screen widget. Tap «Read» to see it in full and share it." },
      adhkar: { title: "Adhkar", body: "Written and audio adhkar. «Play All» plays the morning or evening adhkar in sequence, and if you stop, you resume from where you were." },
      tasbeeh: { title: "Tasbeeh", body: "A counter by tap or by voice. To count while using other apps, turn on «Floating Tasbeeh» in Settings." },
      quran: { title: "Mushaf", body: "The Mushaf's printed pages. Long-press a verse, then «View Tafsir», to read Tafsir al-Sa'di; in «Basa'ir» you'll find your page of the day in the Qur'an Journey." },
      settings: { title: "Settings", body: "Appearance, notifications, statistics, and every option in the app." },
      explore: { title: "Discover DITHAR", body: "All the app's features and ways to make it yours are in Settings. Open «App tour» to watch the DITHAR film, browse the feature guide, and replay this tour any time." },
    } as Record<TourStepId, { title: string; body: string }>,
    gotIt: "Got it",
    hintPlayAll: "«Play All» plays this section's adhkar in sequence. If you leave or playback stops, «Resume» here continues from where you were.",
    hintBasair: "Your page of the day in the Qur'an Journey is in «Basa'ir». In the Mushaf, long-press a verse, then «View Tafsir».",
  },
};

// Settings → «جولة داخل التطبيق»: one place for everything that explains DITHAR — its film, the feature
// guide, and the tour on Home (components/AppTourView.tsx).
export const appTourLabels = {
  ar: {
    row: "جولة داخل التطبيق",
    rowHint: "مقدمة دِثار، ودليل الميزات، والجولة الإرشادية",
    title: "جولة داخل التطبيق",
    back: "رجوع",
    intro: "كل ما يعرّفك بدِثار في مكان واحد.",
    film: "شاهد مقدمة دِثار",
    filmHint: "فيلم قصير يعرض ميزات التطبيق",
    guide: "دليل الميزات",
    guideHint: "شرح مختصر لكل ميزة ومكان إعدادها",
    tour: "الجولة الإرشادية",
    tourHint: "أعد الجولة على الشاشة الرئيسية",
  },
  en: {
    row: "App tour",
    rowHint: "The DITHAR film, the feature guide and the guided tour",
    title: "App tour",
    back: "Back",
    intro: "Everything that introduces DITHAR, in one place.",
    film: "Watch the DITHAR film",
    filmHint: "A short film of the app's features",
    guide: "Feature guide",
    guideHint: "What each feature does and where to set it",
    tour: "Guided tour",
    tourHint: "Replay the tour on the Home screen",
  },
};
