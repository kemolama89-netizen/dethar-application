// Settings → «دليل الميزات» (components/FeatureGuideView.tsx) and the one-line first-visit hints on
// the more involved Settings pages. Interface words only — every sentence describes a control that
// exists in the app today, in the words of its own label (checked against the screens on 2026-11-07).
// No religious claim, no quotation.

/** The Settings pages a guide section can open directly. */
export type GuideTarget =
  | "adhan-audio"
  | "weekly-schedule"
  | "prayer-notifications"
  | "audio-adhkar"
  | "floating-tasbeeh"
  | "reminders"
  | "journey-notify"
  | "appearance"
  | "audio-settings";

export type GuideSectionId =
  | "silence"
  | "adhan"
  | "weekly"
  | "audioAdhkar"
  | "floating"
  | "quran"
  | "journey"
  | "notifications"
  | "appearance"
  | "more";

export type GuideSection = { title: string; summary: string; points: string[]; open?: GuideTarget };

type GuideLabels = {
  row: string;
  rowHint: string;
  title: string;
  back: string;
  intro: string;
  open: string;
  sections: Record<GuideSectionId, GuideSection>;
  hints: Record<"adhanAudio" | "weekly" | "prayerNotifications" | "audioAdhkar" | "floating", string>;
};

export const GUIDE_ORDER: GuideSectionId[] = ["silence", "adhan", "weekly", "audioAdhkar", "floating", "quran", "journey", "notifications", "appearance", "more"];

export const featureGuideLabels: Record<"ar" | "en", GuideLabels> = {
  ar: {
    row: "دليل الميزات",
    rowHint: "شرح مختصر لكل ميزة ومكان إعدادها",
    title: "دليل الميزات",
    back: "رجوع",
    intro: "شرح مختصر لما في دِثار وأين تجده. اضغط على أي قسم لتفتحه.",
    open: "فتح الإعداد",
    sections: {
      silence: {
        title: "إيقاف الأصوات والتنبيهات",
        summary: "لا يوجد زر واحد يكتم كل شيء؛ لكل نوع مفتاحه.",
        points: [
          "«تذكير الصلاة» في بطاقة أوقات الصلاة يوقف تنبيهات الصلوات والأذان التلقائي معًا. وهو المفتاح نفسه في الإعدادات ← تنبيهات الصلاة.",
          "«الأذكار الصوتية» في البطاقة نفسها يوقف كل الأذكار الصوتية المجدولة (الصباح والمساء والمتنوعة) وتنبيهاتها.",
          "لإيقاف الأذان وحده مع بقاء تنبيه الصلاة: أوقف «تشغيل الأذان عند دخول الوقت» في صوت الأذان.",
          "التذكيرات، وملخص نهاية اليوم، وإشعار رحلة القرآن، وتنبيهات الأوقات: لكلٍّ منها مفتاح في صفحته.",
          "ما يُشغَّل الآن، أذانًا كان أو أذكارًا، تجد في إشعاره «إيقاف مؤقت» و«إيقاف».",
          "زر الخروج أعلى الشاشة الرئيسية يغلق التطبيق فقط؛ تبقى المواعيد المجدولة كما هي.",
          "عند إيقاف أي مفتاح تبقى اختياراتك محفوظة وتعود كما كانت عند التفعيل.",
        ],
      },
      adhan: {
        title: "صوت الأذان والمؤذنون",
        summary: "صوت للأذان العادي وصوت منفصل للفجر، والتنويع بين المؤذنين.",
        points: [
          "«الأذان العادي» للظهر والعصر والمغرب والعشاء، و«أذان الفجر» يُختار منفصلًا.",
          "اضغط «استماع» لتجربة أي صوت، ثم «تنزيل» ليعمل دون اتصال. في التطبيق صوتان جاهزان، و«حذف» يزيل ما نزّلته.",
          "«طريقة التشغيل»: الأذان كاملًا، أو التكبير فقط، وللفجر خيار «الصلاة خير من النوم» فقط.",
          "«تنويع المؤذنين» يرفع كل أذان بصوت عشوائي من الأصوات المختارة، دون تكرار الصوت نفسه مرتين متتاليتين.",
          "في «الأصوات في التناوب» أزل علامة الصوت الذي لا تريده فيُستبعد، ويجب إبقاء صوت واحد على الأقل. ولا يدخل التناوب عند وقت الصلاة إلا ما نزّلته.",
          "«تشغيل الأذان عند دخول الوقت» يرفع الأذان تلقائيًا بمستوى صوت الوسائط، ويحتاج أن تكون تنبيهات الصلاة مفعّلة.",
        ],
        open: "adhan-audio",
      },
      weekly: {
        title: "الجدول الأسبوعي (أيام الإجازة)",
        summary: "أيام تبدأ فيها متأخرًا، فلا يبدأ شيء قبل وقت تختاره.",
        points: [
          "اختر أيام إجازتك من أيام الأسبوع، ووقتًا واحدًا في «لا شيء قبل».",
          "في هذه الأيام لا يبدأ قبل هذا الوقت: الأذكار المتنوعة (وتبقى نهايتها كما هي)، وأذكار الصباح والمساء، وتنبيهات الصلاة والأذان، وتذكيرات الودجت.",
          "أول تنبيه صلاة يكون لأول صلاة في هذا الوقت أو بعده، وما بعده على موعده المعتاد.",
          "يتكرر كل أسبوع حتى تغيّره، وبقية الأيام لا تتأثر.",
        ],
        open: "weekly-schedule",
      },
      audioAdhkar: {
        title: "الأذكار الصوتية",
        summary: "تشغيل تلقائي في مواعيد تختارها، أو «تشغيل الكل» متى شئت.",
        points: [
          "من قسم الأذكار ← الأذكار المسموعة: «استماع» لذكر واحد، و«تشغيل الكل» لأذكار القسم متتابعة.",
          "يستمر التشغيل والتطبيق في الخلفية أو مغلق، وتتحكم فيه من إشعاره.",
          "إن توقف «تشغيل الكل» قبل نهايته تجد «متابعة» من حيث توقفت أو «من البداية». وإن أوقفها الأذان يصلك تنبيه «استئناف الأذكار».",
          "في الإعدادات ← إعدادات الأذكار الصوتية: «الأذكار الصوتية التلقائية» للكل، ثم لكل قسم «التشغيل التلقائي» ووقت البدء.",
          "أذكار الصباح والمساء: اختر الأذكار من «الأذكار المختارة»، وقارئ الآيات، وصوت التنبيه قبل البدء بدقيقة.",
          "الأذكار المتنوعة: بداية ونهاية، و«المدة بين كل ذكر والذي يليه»، ويُشغَّل ذكر واحد في كل مرة بالتناوب.",
          "لا تُشغَّل الأذكار من وقت كل أذان ولمدة 30 دقيقة بعده. ومستوى صوتها في إعدادات الصوت.",
        ],
        open: "audio-adhkar",
      },
      floating: {
        title: "السبحة العائمة",
        summary: "عدّاد يظهر فوق التطبيقات الأخرى، ويُفعَّل من الإعدادات.",
        points: [
          "الإعدادات ← السبحة العائمة ← «تفعيل». يُطلب إذن «الظهور فوق التطبيقات الأخرى» أول مرة.",
          "تظهر أولًا زرًّا صغيرًا: المسه لتكبيرها، واسحبه لتغيير مكانه.",
          "في الوضع المكبّر المس أي مكان للتسبيح، و«الأذكار» لاختيار الذكر.",
          "«تصغير» يعيدها زرًّا صغيرًا، وتصغر وحدها بعد ثلاث دقائق دون لمس.",
          "«إغلاق» داخلها، أو «إيقاف» في إشعارها، يوقفها تمامًا. ولإظهارها من جديد اضغط «تفعيل» في صفحتها بالإعدادات.",
          "عدّها يُضاف إلى السبحة والإحصائيات عند فتح التطبيق.",
        ],
        open: "floating-tasbeeh",
      },
      quran: {
        title: "المصحف",
        summary: "صفحات مصحف المدينة، مع التفسير والعلامات والبحث.",
        points: [
          "المس الصفحة لإظهار الأدوات أو إخفائها. «السابقة» و«التالية» للصفحات، وبجانبهما السورة السابقة والتالية.",
          "اضغط مطوّلًا على آية لتحديدها، ثم اختر «عرض التفسير» أو «حفظ علامة» أو «مشاركة».",
          "في الأدوات: التكبير والتصغير، والبحث في القرآن، والعرض الأفقي، وإعدادات القراءة.",
          "صفحة القرآن الرئيسية فيها السور والأجزاء والعلامات، و«متابعة القراءة» من آخر موضع.",
          "صوت تقليب الصفحات يُشغَّل أو يُكتم من الإعدادات ← إعدادات الصوت.",
        ],
      },
      journey: {
        title: "رحلة القرآن",
        summary: "صفحة واحدة كل يوم، مع فائدتها من تفسير السعدي.",
        points: [
          "من «بصائر» في صفحة القرآن الرئيسية، افتح «صفحة اليوم» لتقرأ آيتها وفائدتها.",
          "تُحسب الصفحة مقروءة بعد فتحها قليلًا، والصفحة التالية غدًا.",
          "تقدّمك ودوراتك في الإعدادات ← الإحصائيات ← رحلة القرآن.",
          "«إشعار رحلة القرآن» يذكّرك بصفحة اليوم في وقت تختاره، والضغط عليه يفتحها.",
        ],
        open: "journey-notify",
      },
      notifications: {
        title: "أنواع الإشعارات",
        summary: "كل نوع مستقل، وتوقفه من صفحته دون أن يتأثر غيره.",
        points: [
          "تنبيهات الصلاة: اختر الصلوات التي تريد التنبيه لها، والأذان من صوت الأذان.",
          "الأذكار الصوتية: تنبيه قبل البدء بدقيقة، وأدوات التحكم أثناء التشغيل.",
          "التذكيرات والودجت: دعاء أو حديث أو فضل ذكر أو شعر داخل الفترة التي تختارها. وإن أوقفت «إظهار التذكير كإشعار» يبقى الودجت يتجدّد.",
          "تنبيهات الأوقات (في صفحة التذكيرات): قبل العصر، ويوم الجمعة، وتذكير سورة الكهف، والأيام البيض.",
          "ملخص نهاية اليوم، وإشعار رحلة القرآن: كلٌّ في وقت تختاره.",
          "لمس أي إشعار يفتح المكان الخاص به في التطبيق.",
        ],
        open: "reminders",
      },
      appearance: {
        title: "المظهر",
        summary: "أربع سمات، وخلفية، وشفافية، ووضع داكن تلقائي.",
        points: [
          "الإعدادات ← المظهر ← تخصيص المظهر.",
          "«السمة»: كلاسيكي، ليلي، طبيعة، غروب. و«خلفية التطبيق»: حسب السمة، أو إحدى الخلفيات، أو صورة من عندك.",
          "«شفافية البطاقات» من شفافة إلى معتمة.",
          "«الوضع الداكن التلقائي»: إيقاف، أو حسب الجهاز، أو حسب الوقت.",
          "التغييرات تظهر في «معاينة»، ولا تُحفظ حتى تضغط «تطبيق».",
        ],
        open: "appearance",
      },
      more: {
        title: "ميزات أخرى",
        summary: "اللغة، والموقع، والصوت، والمفضلة، والإحصائيات.",
        points: [
          "اللغة: زر اللغة أعلى الشاشة للتبديل بين العربية والإنجليزية.",
          "الموقع: تلقائيًا أو باختيار مدينة، ومنه تُحسب مواقيت الصلاة.",
          "إعدادات الصوت: مستوى صوت الأذان وكل قسم من الأذكار داخل دِثار، دون تغيير صوت الهاتف.",
          "المفضلة: ما حفظته من الأدعية والأحاديث والأذكار والشعر.",
          "الإحصائيات: أذكارك وتسبيحك يومًا وأسبوعًا وشهرًا وسنة.",
          "الإعدادات ← جولة داخل التطبيق: مقدمة دِثار، وهذا الدليل، وإعادة الجولة الإرشادية.",
        ],
        open: "audio-settings",
      },
    },
    hints: {
      adhanAudio: "لكل من الأذان العادي وأذان الفجر صوته. فعّل «تنويع المؤذنين» ثم أزل من «الأصوات في التناوب» ما لا تريده.",
      weekly: "في أيام الإجازة لا تبدأ الأذكار المجدولة ولا تنبيهات الصلاة وتذكيرات الودجت قبل الوقت الذي تختاره هنا.",
      prayerNotifications: "هذا المفتاح هو نفسه «تذكير الصلاة» في الشاشة الرئيسية، وإيقافه يوقف الأذان التلقائي أيضًا.",
      audioAdhkar: "المفتاح الأول يشغّل الأذكار المجدولة كلها أو يوقفها. ولكل قسم بعده موعده واختياراته.",
      floating: "بعد التفعيل تظهر زرًّا صغيرًا فوق التطبيقات: المسه لتكبيرها، وو«تصغير» يعيدها صغيرة، و«إغلاق» يوقفها.",
    },
  },
  en: {
    row: "Feature guide",
    rowHint: "What each feature does and where to set it",
    title: "Feature guide",
    back: "Back",
    intro: "A short guide to what's in DITHAR and where to find it. Tap any section to open it.",
    open: "Open setting",
    sections: {
      silence: {
        title: "Turning sounds and notifications off",
        summary: "There's no single switch that silences everything; each kind has its own.",
        points: [
          "«Prayer Reminder» on the prayer-times card turns off prayer notifications and the automatic adhan together. It's the same switch as Settings → Prayer Notifications.",
          "«Audio Adhkar» on the same card turns off all scheduled audio adhkar (Morning, Evening, Miscellaneous) and their notifications.",
          "To silence only the adhan and keep the prayer notification: turn off «Play the adhan at prayer time» in Adhan audio.",
          "Reminders, the end-of-day summary, the Qur'an Journey notification and time-based reminders each have a switch on their own page.",
          "Whatever is playing now, adhan or adhkar, has «Pause» and «Stop» in its notification.",
          "The exit button at the top of Home only closes the app; scheduled times stay as they are.",
          "Turning any switch off keeps your choices; they come back when you turn it on.",
        ],
      },
      adhan: {
        title: "Adhan audio and voices",
        summary: "One voice for the regular adhan, a separate one for Fajr, and rotation.",
        points: [
          "«Regular adhan» is for Dhuhr, Asr, Maghrib and Isha; «Fajr adhan» is chosen separately.",
          "Tap «Listen» to try any voice, then «Download» so it works offline. Two voices come with the app, and «Remove» deletes a download.",
          "«Playback»: «Full adhan» or «Takbeer only»; Fajr also offers the phrase «As-salatu khayrun min an-nawm» only.",
          "«Rotate muezzins» plays each adhan in a random voice from the ones you chose, never the same voice twice in a row.",
          "In «Voices in rotation», untick a voice you don't want and it's left out; at least one must stay. Only downloaded voices are used at prayer time.",
          "«Play the adhan at prayer time» plays it automatically at media volume, and needs prayer notifications to be on.",
        ],
        open: "adhan-audio",
      },
      weekly: {
        title: "Weekly schedule (days off)",
        summary: "Days you start later: nothing starts before a time you choose.",
        points: [
          "Choose your days off and one time in «Nothing before».",
          "On those days, none of these start before it: the Miscellaneous audio dhikr (its end time stays), Morning and Evening Adhkar, prayer notifications and the adhan, and widget reminders.",
          "The first prayer notification is for the first prayer at or after that time; the rest keep their usual times.",
          "It repeats every week until you change it; other days aren't affected.",
        ],
        open: "weekly-schedule",
      },
      audioAdhkar: {
        title: "Audio Adhkar",
        summary: "Automatic playback at times you choose, or «Play All» whenever you like.",
        points: [
          "In Adhkar → Audio Adhkar: «Listen» plays one dhikr, «Play All» plays the section in sequence.",
          "Playback continues with the app in the background or closed; control it from its notification.",
          "If «Play All» stops before the end, you'll find «Resume» from where it stopped, or «Restart». If the adhan paused it, you'll get a «Resume Adhkar» notification.",
          "In Settings → Audio Adhkar Settings: «Automatic Audio Adhkar» for everything, then for each section «Automatic playback» and its start time.",
          "Morning and Evening: choose adhkar in «Selected adhkar», the «Reciter for Quranic verses», and the «Sound one minute before».",
          "Miscellaneous: a start and end time and «Time between adhkar»; one dhikr plays each time, in turn.",
          "No adhkar play from each adhan until 30 minutes after it. Their volume is in Audio settings.",
        ],
        open: "audio-adhkar",
      },
      floating: {
        title: "Floating Tasbeeh",
        summary: "A counter over other apps, turned on from Settings.",
        points: [
          "Settings → Floating Tasbeeh → «Enable». The first time, you'll be asked for «Display over other apps».",
          "It first appears as a small pill: tap it to expand, drag it to move it.",
          "Expanded, touch anywhere to count, and «Adhkar» to choose the dhikr.",
          "«Minimize» turns it back into the pill; it also minimizes itself after three minutes untouched.",
          "«Close» inside it, or «Stop» in its notification, turns it off completely. To bring it back, tap «Enable» on its Settings page.",
          "Its counts are added to Tasbeeh and Statistics when you open the app.",
        ],
        open: "floating-tasbeeh",
      },
      quran: {
        title: "Mushaf",
        summary: "The Madinah Mushaf's pages, with Tafsir, bookmarks and search.",
        points: [
          "Touch the page to show or hide the controls. «Previous» and «Next» turn pages; beside them are the previous and next surah.",
          "Long-press a verse to select it, then choose «View Tafsir», «Bookmark» or «Share».",
          "In the controls: zoom, search the Qur'an, landscape view and reading settings.",
          "The Qur'an home has surahs, juz' and bookmarks, and «Continue reading» from your last place.",
          "The page-turn sound is turned on or muted in Settings → Audio settings.",
        ],
      },
      journey: {
        title: "Qur'an Journey",
        summary: "One page a day, with its benefit from Tafsir al-Sa'di.",
        points: [
          "In «Basa'ir» on the Qur'an home, open «Today's page» to read its verse and benefit.",
          "The page counts as read once it's been open briefly; the next page comes tomorrow.",
          "Your progress and rounds are in Settings → Statistics → Qur'an Journey.",
          "«Qur'an Journey notification» reminds you of today's page at a time you choose; tapping it opens the page.",
        ],
        open: "journey-notify",
      },
      notifications: {
        title: "Kinds of notification",
        summary: "Each kind is separate; turn one off on its page without affecting the others.",
        points: [
          "Prayer notifications: choose which prayers to be notified for; the adhan is in Adhan audio.",
          "Audio Adhkar: a notice one minute before it starts, and controls while it plays.",
          "Reminders & widget: a dua, hadith, virtue of dhikr or poetry within the period you choose. If you turn off «Show reminders as notifications», the widget still refreshes.",
          "Time-based reminders (on the Reminders page): before Asr, on Friday, the Surah Al-Kahf reminder, and the White Days.",
          "The end-of-day summary and the Qur'an Journey notification: each at a time you choose.",
          "Tapping any notification opens its place in the app.",
        ],
        open: "reminders",
      },
      appearance: {
        title: "Appearance",
        summary: "Four themes, a background, transparency and automatic dark mode.",
        points: [
          "Settings → Appearance → Customize appearance.",
          "«Theme»: Classic, Night, Nature, Modern Sunset. «App background»: the theme's own, one of the backgrounds, or your photo.",
          "«Card transparency» from see-through to solid.",
          "«Automatic dark mode»: off, follow device, or by time of day.",
          "Changes show in «Preview» and aren't saved until you tap «Apply».",
        ],
        open: "appearance",
      },
      more: {
        title: "More features",
        summary: "Language, location, sound, favorites and statistics.",
        points: [
          "Language: the language button at the top of the screen switches between Arabic and English.",
          "Location: automatic or by choosing a city; prayer times are calculated from it.",
          "Audio settings: the volume of the adhan and of each adhkar section inside DITHAR, without changing the phone's volume.",
          "Favorites: the duas, hadiths, dhikr and poetry you saved.",
          "Statistics: your adhkar and Tasbeeh by day, week, month and year.",
          "Settings → App tour: the DITHAR film, this guide, and the guided tour again.",
        ],
        open: "audio-settings",
      },
    },
    hints: {
      adhanAudio: "The regular adhan and the Fajr adhan each have their own voice. Turn on «Rotate muezzins», then untick in «Voices in rotation» any you don't want.",
      weekly: "On your days off, scheduled adhkar, prayer notifications and widget reminders don't start before the time you set here.",
      prayerNotifications: "This is the same switch as «Prayer Reminder» on Home; turning it off also stops the automatic adhan.",
      audioAdhkar: "The first switch turns all scheduled adhkar on or off. Each section below has its own times and choices.",
      floating: "Once enabled it appears as a small pill over other apps: tap it to expand; «Minimize» shrinks it again and «Close» turns it off.",
    },
  },
};
