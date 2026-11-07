// Encouragement for the end-of-day summary (lib/dailySummary.ts → native DailySummary in
// ReminderLogic.kt, which picks one per summary from the day's real records and rotates them).
//
// Two kinds, kept apart and shown differently:
//  - "grounded": DITHAR's own wording of a meaning that an opened source states. Never a
//    quotation presented as the words of Allah or of the Prophet ﷺ: a phrase in «» is used only
//    where it is verbatim in the cited hadith (checked by summaryEncouragement.test.ts against
//    the text recorded in `verified.sourceText`). The summary shows its credit, «مستفاد من: …»,
//    under it. Only Qur'an verses (Tanzil quran-simple) and Sahih al-Bukhari / Sahih Muslim
//    (hadith-api editions; Bukhari by Fath al-Bari numbering, Muslim by Abd al-Baqi) are used.
//    Every entry records the source opened, where, and when: no entry from memory.
//  - "original": DITHAR's own motivational wording. It makes no religious claim (no virtue,
//    reward, promise or outcome) and carries no credit.
//
// Not a published translation: the English is DITHAR's wording too, credited "Drawn from".
//
// Situations say when a message fits, from what was actually recorded that day:
//  any (anything recorded), morningEvening (both wirds), wird (one of them), prayer, tasbeeh,
//  written, week (something recorded on each of the last 7 days and today), listening (only
//  Audio Adhkar listened to), empty (nothing recorded, verified).

export type EncouragementSituation = "any" | "morningEvening" | "wird" | "prayer" | "tasbeeh" | "written" | "week" | "listening" | "empty";

export type EncouragementSource =
  | { kind: "quran"; surah: number; ayah: number }
  | { kind: "hadith"; book: "bukhari" | "muslim"; number: number; alsoIn?: { book: "bukhari" | "muslim"; number: number }[] };

export interface Encouragement {
  id: string;
  kind: "grounded" | "original";
  situations: EncouragementSituation[];
  ar: string;
  en: string;
  source?: EncouragementSource;
  /** For "grounded": what was opened, where, and when. */
  verified?: { on: string; url: string; sourceText: string };
}

const QURAN_URL = "https://api.alquran.cloud/v1/quran/quran-simple";
const hadithUrl = (book: "bukhari" | "muslim") => `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${book}.json`;
const ON = "2026-11-07";

export const SUMMARY_ENCOURAGEMENT: readonly Encouragement[] = [
  // ---- grounded: the Qur'an ---------------------------------------------------
  {
    id: "q-2-152",
    kind: "grounded",
    situations: ["any", "written", "tasbeeh"],
    ar: "ذكرُك لله لا يضيع؛ ففي القرآن أن الله يذكر من يذكره.",
    en: "Your remembrance is never lost: the Qur'an tells that Allah remembers whoever remembers Him.",
    source: { kind: "quran", surah: 2, ayah: 152 },
    verified: { on: ON, url: QURAN_URL, sourceText: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ" },
  },
  {
    id: "q-13-28",
    kind: "grounded",
    situations: ["any", "listening"],
    ar: "إن أثقلك يومك، ففي ذكر الله طمأنينةٌ للقلوب.",
    en: "When the day feels heavy, the remembrance of Allah brings hearts rest.",
    source: { kind: "quran", surah: 13, ayah: 28 },
    verified: { on: ON, url: QURAN_URL, sourceText: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُمْ بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ" },
  },
  {
    id: "q-33-41",
    kind: "grounded",
    situations: ["tasbeeh", "any"],
    ar: "دعا القرآن المؤمنين إلى ذكر الله كثيرًا، وكل تسبيحة خطوةٌ في هذا الطريق.",
    en: "The Qur'an calls the believers to remember Allah much — every tasbeeh is a step on that path.",
    source: { kind: "quran", surah: 33, ayah: 41 },
    verified: { on: ON, url: QURAN_URL, sourceText: "يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا" },
  },
  {
    id: "q-33-35",
    kind: "grounded",
    situations: ["week", "tasbeeh"],
    ar: "في القرآن أن الله أعدّ للذاكرين الله كثيرًا والذاكرات مغفرةً وأجرًا عظيمًا؛ نسأل الله أن يجعلك منهم.",
    en: "The Qur'an tells that Allah has prepared forgiveness and a great reward for the men and women who remember Him much. May Allah make you among them.",
    source: { kind: "quran", surah: 33, ayah: 35 },
    verified: {
      on: ON,
      url: QURAN_URL,
      sourceText: "… وَالذَّاكِرِينَ اللَّهَ كَثِيرًا وَالذَّاكِرَاتِ أَعَدَّ اللَّهُ لَهُمْ مَغْفِرَةً وَأَجْرًا عَظِيمًا",
    },
  },
  {
    id: "q-3-191",
    kind: "grounded",
    situations: ["any", "written"],
    ar: "الذكر يرافقك في كل حال: قائمًا وقاعدًا ومضطجعًا، كما وصف القرآن الذين يذكرون الله.",
    en: "Dhikr goes with you in every state — standing, sitting or lying down — as the Qur'an describes those who remember Allah.",
    source: { kind: "quran", surah: 3, ayah: 191 },
    verified: { on: ON, url: QURAN_URL, sourceText: "الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ …" },
  },
  {
    id: "q-7-205",
    kind: "grounded",
    situations: ["morningEvening"],
    ar: "ذكرُ الله في الصباح والمساء جاء الأمر به في القرآن، وقد حافظتَ على الاثنين.",
    en: "Remembering Allah in the mornings and evenings is commanded in the Qur'an — and you kept to both.",
    source: { kind: "quran", surah: 7, ayah: 205 },
    verified: { on: ON, url: QURAN_URL, sourceText: "وَاذْكُرْ رَبَّكَ فِي نَفْسِكَ تَضَرُّعًا وَخِيفَةً وَدُونَ الْجَهْرِ مِنَ الْقَوْلِ بِالْغُدُوِّ وَالْآصَالِ وَلَا تَكُنْ مِنَ الْغَافِلِينَ" },
  },
  {
    id: "q-2-286",
    kind: "grounded",
    situations: ["empty"],
    ar: "الله لا يحمّل نفسًا فوق طاقتها؛ فابدأ غدًا بما تستطيع ولو كان قليلًا.",
    en: "Allah does not burden a soul beyond its capacity — tomorrow, begin with what you can, even a little.",
    source: { kind: "quran", surah: 2, ayah: 286 },
    verified: { on: ON, url: QURAN_URL, sourceText: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا …" },
  },
  {
    id: "q-39-53",
    kind: "grounded",
    situations: ["empty"],
    ar: "إن فاتك وردك فلا تيأس؛ فالقرآن ينهى عن القنوط من رحمة الله. ارجع إلى الذكر متى استطعت.",
    en: "If you missed your wird, don't lose heart: the Qur'an forbids despairing of Allah's mercy. Return to dhikr whenever you can.",
    source: { kind: "quran", surah: 39, ayah: 53 },
    verified: { on: ON, url: QURAN_URL, sourceText: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ …" },
  },

  // ---- grounded: Sahih al-Bukhari and Sahih Muslim ---------------------------------
  {
    id: "h-bukhari-6407",
    kind: "grounded",
    situations: ["any", "listening"],
    ar: "شبّه النبي ﷺ الذي يذكر ربه والذي لا يذكره بالحيّ والميت؛ فاجعل لذكرك نصيبًا من كل يوم.",
    en: "The Prophet ﷺ likened the one who remembers his Lord and the one who doesn't to the living and the dead — give your remembrance a share of every day.",
    source: { kind: "hadith", book: "bukhari", number: 6407 },
    verified: { on: ON, url: hadithUrl("bukhari"), sourceText: "مَثَلُ الَّذِي يَذْكُرُ رَبَّهُ وَالَّذِي لاَ يَذْكُرُ مَثَلُ الْحَىِّ وَالْمَيِّتِ" },
  },
  {
    id: "h-bukhari-6465-week",
    kind: "grounded",
    situations: ["week"],
    ar: "سبعة أيام لم يخلُ أحدها من الذكر؛ وقد أخبر النبي ﷺ أن أحبّ الأعمال إلى الله «أدومها وإن قل».",
    en: "Seven days, none without dhikr — and the Prophet ﷺ taught that the deeds most beloved to Allah are the most constant, even if small.",
    source: { kind: "hadith", book: "bukhari", number: 6465, alsoIn: [{ book: "muslim", number: 783 }] },
    verified: { on: ON, url: hadithUrl("bukhari"), sourceText: "سُئِلَ النَّبِيُّ صلى الله عليه وسلم أَىُّ الأَعْمَالِ أَحَبُّ إِلَى اللَّهِ قَالَ ‏\"‏ أَدْوَمُهَا وَإِنْ قَلَّ ‏\"‏‏.‏ وَقَالَ ‏\"‏ اكْلَفُوا مِنَ الأَعْمَالِ مَا تُطِيقُونَ ‏\"" },
  },
  {
    id: "h-bukhari-6465-little",
    kind: "grounded",
    situations: ["empty", "any"],
    ar: "لا يلزم أن يكون الذكر كثيرًا؛ فقد أخبر النبي ﷺ أن أحبّ الأعمال إلى الله «أدومها وإن قل». ذكرٌ واحد كل يوم بداية.",
    en: "Dhikr needn't be much: the Prophet ﷺ taught that the deeds most beloved to Allah are the most constant, even if small. One dhikr a day is a beginning.",
    source: { kind: "hadith", book: "bukhari", number: 6465, alsoIn: [{ book: "muslim", number: 783 }] },
    verified: { on: ON, url: hadithUrl("bukhari"), sourceText: "أَىُّ الأَعْمَالِ أَحَبُّ إِلَى اللَّهِ قَالَ ‏\"‏ أَدْوَمُهَا وَإِنْ قَلَّ ‏\"" },
  },
  {
    id: "h-bukhari-6465-capacity",
    kind: "grounded",
    situations: ["any", "empty"],
    ar: "الذكر ليس سباق أرقام؛ وقد أوصى النبي ﷺ أن نأخذ من الأعمال ما نطيق.",
    en: "Dhikr is not a race of numbers; the Prophet ﷺ advised taking on the deeds we are able to keep.",
    source: { kind: "hadith", book: "bukhari", number: 6465 },
    verified: { on: ON, url: hadithUrl("bukhari"), sourceText: "وَقَالَ ‏\"‏ اكْلَفُوا مِنَ الأَعْمَالِ مَا تُطِيقُونَ ‏\"" },
  },
  {
    id: "h-bukhari-7405",
    kind: "grounded",
    situations: ["any", "written"],
    ar: "جاء في الحديث القدسي أن الله مع عبده حين يذكره؛ فاجعل ذكرك حاضرًا بقلبك.",
    en: "In a hadith qudsi, Allah is with His servant when he remembers Him — let your heart be present in your dhikr.",
    source: { kind: "hadith", book: "bukhari", number: 7405, alsoIn: [{ book: "muslim", number: 2675 }] },
    verified: { on: ON, url: hadithUrl("bukhari"), sourceText: "يَقُولُ اللَّهُ تَعَالَى أَنَا عِنْدَ ظَنِّ عَبْدِي بِي، وَأَنَا مَعَهُ إِذَا ذَكَرَنِي" },
  },
  {
    id: "h-muslim-2694",
    kind: "grounded",
    situations: ["tasbeeh"],
    ar: "أخبر النبي ﷺ أن «سبحان الله وبحمده، سبحان الله العظيم» كلمتان «خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن».",
    en: "The Prophet ﷺ described “Subhan Allah wa bihamdihi, Subhan Allah al-'Azim” as two phrases light on the tongue, heavy on the scale and beloved to the Most Merciful.",
    // The phrase order quoted is Muslim's (al-Bukhari 6406 has the same two phrases the other way round).
    source: { kind: "hadith", book: "muslim", number: 2694, alsoIn: [{ book: "bukhari", number: 6406 }] },
    verified: {
      on: ON,
      url: hadithUrl("muslim"),
      sourceText: "كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ ثَقِيلَتَانِ فِي الْمِيزَانِ حَبِيبَتَانِ إِلَى الرَّحْمَنِ سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ",
    },
  },
  {
    id: "h-muslim-223",
    kind: "grounded",
    situations: ["tasbeeh", "written"],
    ar: "أخبر النبي ﷺ أن «الحمد لله تملأ الميزان»؛ فلا تستقلّ كلمة حمدٍ قلتها.",
    en: "The Prophet ﷺ taught that “Al-hamdu lillah” fills the scale — so no word of praise you said is small.",
    source: { kind: "hadith", book: "muslim", number: 223 },
    verified: { on: ON, url: hadithUrl("muslim"), sourceText: "الطُّهُورُ شَطْرُ الإِيمَانِ وَالْحَمْدُ لِلَّهِ تَمْلأُ الْمِيزَانَ" },
  },
  {
    id: "h-muslim-2695",
    kind: "grounded",
    situations: ["tasbeeh", "any"],
    ar: "كان قول «سبحان الله والحمد لله ولا إله إلا الله والله أكبر» أحبَّ إلى النبي ﷺ «مما طلعت عليه الشمس».",
    en: "Saying “Subhan Allah, al-hamdu lillah, la ilaha illa Allah, Allahu akbar” was dearer to the Prophet ﷺ than everything the sun rises upon.",
    source: { kind: "hadith", book: "muslim", number: 2695 },
    verified: { on: ON, url: hadithUrl("muslim"), sourceText: "لأَنْ أَقُولَ سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلاَ إِلَهَ إِلاَّ اللَّهُ وَاللَّهُ أَكْبَرُ أَحَبُّ إِلَىَّ مِمَّا طَلَعَتْ عَلَيْهِ الشَّمْسُ" },
  },
  {
    id: "h-muslim-2137",
    kind: "grounded",
    situations: ["tasbeeh"],
    ar: "أخبر النبي ﷺ أن «أحب الكلام إلى الله أربع»: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر، «لا يضرك بأيهن بدأت».",
    en: "The Prophet ﷺ taught that the dearest words to Allah are four — Subhan Allah, al-hamdu lillah, la ilaha illa Allah, Allahu akbar — whichever you begin with.",
    source: { kind: "hadith", book: "muslim", number: 2137 },
    verified: { on: ON, url: hadithUrl("muslim"), sourceText: "أَحَبُّ الْكَلاَمِ إِلَى اللَّهِ أَرْبَعٌ سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلاَ إِلَهَ إِلاَّ اللَّهُ وَاللَّهُ أَكْبَرُ‏.‏ لاَ يَضُرُّكَ بَأَيِّهِنَّ بَدَأْتَ" },
  },
  {
    id: "h-muslim-2676",
    kind: "grounded",
    situations: ["week", "tasbeeh"],
    ar: "أخبر النبي ﷺ أنه «سبق المفردون»، وهم «الذاكرون الله كثيرا والذاكرات».",
    en: "The Prophet ﷺ said that those who remember Allah much — men and women — have gone ahead.",
    source: { kind: "hadith", book: "muslim", number: 2676 },
    verified: { on: ON, url: hadithUrl("muslim"), sourceText: "سَبَقَ الْمُفَرِّدُونَ ‏\"‏ ‏.‏ قَالُوا وَمَا الْمُفَرِّدُونَ يَا رَسُولَ اللَّهِ قَالَ ‏\"‏ الذَّاكِرُونَ اللَّهَ كَثِيرًا وَالذَّاكِرَاتُ" },
  },

  // ---- original: DITHAR's own wording, no religious claim ---------------------------------
  {
    id: "o-steady",
    kind: "original",
    situations: ["any"],
    ar: "خطوةٌ صغيرة كل يوم أبقى من جهدٍ كبير يتوقف. استمرّ على ما أنت عليه.",
    en: "A small step every day lasts longer than a big effort that stops. Keep going as you are.",
  },
  {
    id: "o-busy",
    kind: "original",
    situations: ["any", "written"],
    ar: "اجعل لسانك قريبًا من الذكر حتى وسط انشغالك؛ دقيقةٌ هنا ودقيقةٌ هناك تصنع عادة.",
    en: "Keep dhikr close to your tongue even when you're busy — a minute here and a minute there becomes a habit.",
  },
  {
    id: "o-bless",
    kind: "original",
    situations: ["any"],
    ar: "بارك الله في يومك وتقبّل ذكرك. القليل الدائم يصنع الكثير — نلقاك غدًا على الذكر.",
    en: "May Allah bless your day and accept your remembrance. A little, kept up, goes a long way — see you tomorrow.",
  },
  {
    id: "o-morning-evening",
    kind: "original",
    situations: ["morningEvening"],
    ar: "أذكار الصباح والمساء كلاهما في يومٍ واحد — بارك الله فيك، وأعانك على أن تبقى عليها.",
    en: "Morning and Evening Adhkar, both in one day — may Allah bless you and help you keep to them.",
  },
  {
    id: "o-wird",
    kind: "original",
    situations: ["wird"],
    ar: "وردٌ أتممتَه اليوم بداية طيبة؛ وإن تيسّر الآخر غدًا فهو خيرٌ على خير.",
    en: "A wird completed today is a good start; and if the other comes easily tomorrow, all the better.",
  },
  {
    id: "o-morning-evening-frame",
    kind: "original",
    situations: ["morningEvening"],
    ar: "بدأتَ يومك بالذكر وختمته به؛ يومٌ محاطٌ بذكر الله من طرفيه.",
    en: "You began your day with dhikr and closed it with dhikr — a day held by remembrance at both ends.",
  },
  {
    id: "o-wird-start",
    kind: "original",
    situations: ["wird"],
    ar: "جعلتَ لوردك مكانًا في يومك؛ وما تكرّر كل يوم صار جزءًا منك.",
    en: "You made room for your wird today; what you repeat each day becomes part of you.",
  },
  {
    id: "o-wird-gentle",
    kind: "original",
    situations: ["wird"],
    ar: "وردٌ أتممتَه أجمل من خطةٍ كبيرة مؤجَّلة؛ بارك الله في ما أتممت.",
    en: "A wird completed is lovelier than a big plan put off — may Allah bless what you completed.",
  },
  {
    id: "o-prayer-calm",
    kind: "original",
    situations: ["prayer"],
    ar: "دقائق الذكر بعد الصلاة تُبقي أثرها معك؛ جميلٌ أنك لم تقم منها مسرعًا.",
    en: "The minutes of dhikr after prayer stay with you — it's lovely that you didn't rush away from them.",
  },
  {
    id: "o-prayer",
    kind: "original",
    situations: ["prayer"],
    ar: "ختمتَ صلاتك بأذكارها؛ عادةٌ جميلة تستحق أن تبقى معك.",
    en: "You followed your prayer with its adhkar — a beautiful habit worth keeping.",
  },
  {
    id: "o-prayer-minutes",
    kind: "original",
    situations: ["prayer"],
    ar: "أذكار ما بعد الصلاة دقائق قليلة، وقد جعلتَ لها مكانًا في يومك؛ فاستمر.",
    en: "The adhkar after prayer take only a few minutes, and you made room for them today — keep it up.",
  },
  {
    id: "o-tasbeeh",
    kind: "original",
    situations: ["tasbeeh"],
    ar: "التسبيح لا يحتاج مكانًا ولا وقتًا خاصًّا، وقد جعلتَ له نصيبًا من يومك.",
    en: "Tasbeeh needs no special place or time, and you gave it a share of your day.",
  },
  {
    id: "o-written",
    kind: "original",
    situations: ["written"],
    ar: "قراءة الأذكار بتأنٍّ تمنحها حضورًا؛ المهم أن تستمر، لا أن تُكثر.",
    en: "Reading the adhkar slowly gives them presence — what matters is keeping on, not doing more.",
  },
  {
    id: "o-week",
    kind: "original",
    situations: ["week"],
    ar: "ثباتك على الذكر هذه الأيام هو المقصود، لا كثرة الأرقام. بارك الله فيك.",
    en: "Your steadiness in dhikr these days is what counts, not big numbers. May Allah bless you.",
  },
  {
    id: "o-listening",
    kind: "original",
    situations: ["listening"],
    ar: "تقبّل الله استماعك. وإن ردّدتَ معه ذكرًا ولو مرة، سُجّل لك ذكرًا منك.",
    en: "May Allah accept your listening. Saying a dhikr along with it — even once — is counted as your own.",
  },
  {
    id: "o-listening-along",
    kind: "original",
    situations: ["listening"],
    ar: "جميلٌ أن تملأ وقتك بسماع الذكر؛ جرّب غدًا أن تردّد معه ولو ذكرًا واحدًا.",
    en: "It's lovely to fill your time with listening to dhikr; tomorrow, try repeating even one along with it.",
  },
  {
    id: "o-empty-okay",
    kind: "original",
    situations: ["empty"],
    ar: "غدًا صفحةٌ جديدة: ابدأ بذكرٍ واحد بعد الفجر، ودَع القليل يكبر.",
    en: "Tomorrow is a fresh page: begin with a single dhikr after Fajr, and let a little grow.",
  },
  {
    id: "o-empty-return",
    kind: "original",
    situations: ["empty"],
    ar: "إن انشغلتَ اليوم، فارجع إلى الذكر غدًا من غير أن تلوم نفسك؛ ذكرٌ واحد بدايةٌ حسنة.",
    en: "If today was busy, come back to dhikr tomorrow without blaming yourself — a single dhikr is a good beginning.",
  },
];

/**
 * Approved by the owner on 2026-11-07 (18 grounded, 18 original), after the source check: shown
 * automatically, picked and rotated by native from the day's real records — users never choose
 * or enable individual messages. Adding or editing a message needs a new source check and a new
 * approval (summaryEncouragement.test.ts holds the library to this list).
 */
export const SUMMARY_ENCOURAGEMENT_APPROVAL = {
  on: "2026-11-07",
  ids: [
  "q-2-152",
  "q-13-28",
  "q-33-41",
  "q-33-35",
  "q-3-191",
  "q-7-205",
  "q-2-286",
  "q-39-53",
  "h-bukhari-6407",
  "h-bukhari-6465-week",
  "h-bukhari-6465-little",
  "h-bukhari-6465-capacity",
  "h-bukhari-7405",
  "h-muslim-2694",
  "h-muslim-223",
  "h-muslim-2695",
  "h-muslim-2137",
  "h-muslim-2676",
  "o-steady",
  "o-busy",
  "o-bless",
  "o-morning-evening",
  "o-wird",
  "o-morning-evening-frame",
  "o-wird-start",
  "o-wird-gentle",
  "o-prayer-calm",
  "o-prayer",
  "o-prayer-minutes",
  "o-tasbeeh",
  "o-written",
  "o-week",
  "o-listening",
  "o-listening-along",
  "o-empty-okay",
  "o-empty-return",
  ] as readonly string[],
};

/** The credit line under a grounded message, in the interface language (Western digits, as the summary's counts). */
export function encouragementCredit(source: EncouragementSource, language: "ar" | "en"): string {
  if (source.kind === "quran") {
    return language === "en" ? `Drawn from: Qur'an ${source.surah}:${source.ayah}` : `مستفاد من: سورة ${SURAH_AR[source.surah] ?? source.surah}، الآية ${source.ayah}`;
  }
  const name = (book: "bukhari" | "muslim") => (language === "en" ? (book === "bukhari" ? "Sahih al-Bukhari" : "Sahih Muslim") : book === "bukhari" ? "صحيح البخاري" : "صحيح مسلم");
  const refs = [{ book: source.book, number: source.number }, ...(source.alsoIn ?? [])].map((r) => `${name(r.book)} ${r.number}`);
  return (language === "en" ? "Drawn from: " : "مستفاد من: ") + refs.join(language === "en" ? "; " : "، ");
}

/** Only the surahs the library cites, as the Mushaf names them. */
const SURAH_AR: Record<number, string> = { 2: "البقرة", 3: "آل عمران", 7: "الأعراف", 13: "الرعد", 33: "الأحزاب", 39: "الزمر" };
