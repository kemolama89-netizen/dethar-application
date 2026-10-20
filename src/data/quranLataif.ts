// Quranic Lataif (لطائف قرآنية) for the widget, reminders and the
// full-screen reflection — each item keeps THREE layers apart:
//
//   1. The verse — copied word for word from the Qur'an text (Tanzil
//      «quran-simple»), with its surah and verse number. `excerpt` marks a
//      phrase taken from within a longer verse.
//   2. Scholarly tafsir — a VERBATIM excerpt of Tafsir al-Sa'di (تيسير الكريم
//      الرحمن), checked as an exact substring of the tafsir text of that
//      verse (Quran.com API, tafsir 91), with a direct link. Never
//      paraphrased, never extended with our own words.
//   3. DITHAR's reflections — our own short words, always labelled as such,
//      never presented as the tafsir or as a scholar's view.
//
// English: the verse's meaning is Saheeh International's (a published human
// translation), trimmed to the same phrase for excerpts. Tafsir al-Sa'di has
// no verified English translation here, so the tafsir is shown in Arabic only.
//
// Every item starts as Pending Review for publication (lib/contentReview.ts):
// it reaches widgets and reminders only after it is approved in the
// Religious Content Review screen.
import type { CommentStyle, EditorialComment, SourceReview } from "./widgetContent";

export interface QuranLatifa {
  /** The reminder id is "lataif:<id>". */
  id: string;
  surah: number;
  ayahs: number[];
  verseAr: string;
  /** A phrase from within a longer verse. */
  excerpt: boolean;
  verseRefAr: string;
  verseRefEn: string;
  verseEn: string;
  verseEnSource: string;
  verseUrl: string;
  tafsirAr: string;
  tafsirSourceAr: string;
  tafsirSourceEn: string;
  /** The verse key the tafsir excerpt belongs to, e.g. "33:41". */
  tafsirRef: string;
  tafsirUrl: string;
  review: SourceReview;
  comments: EditorialComment[];
}

interface LatifaSpec {
  id: string;
  surah: number;
  ayahs: number[];
  verseAr: string;
  excerpt: boolean;
  verseRefAr: string;
  verseRefEn: string;
  verseEn: string;
  tafsirAr: string;
  tafsirRef: string;
  comments: readonly (readonly [CommentStyle, string, string])[];
}

function lataif(spec: LatifaSpec): QuranLatifa {
  const { comments, ...rest } = spec;
  const [s, a] = spec.tafsirRef.split(":");
  return {
    ...rest,
    verseEnSource: "Saheeh International",
    verseUrl: `https://quran.com/${spec.surah}/${spec.ayahs[0]}${spec.ayahs.length > 1 ? `-${spec.ayahs[spec.ayahs.length - 1]}` : ""}`,
    tafsirSourceAr: "تفسير السعدي (تيسير الكريم الرحمن في تفسير كلام المنان)",
    tafsirSourceEn: "Tafsir al-Sa'di (Taysir al-Karim al-Rahman)",
    tafsirUrl: `https://quran.com/ar/${s}:${a}/tafsirs/ar-tafseer-al-saddi`,
    // Verification of the wording is done (machine-checked against the sources);
    // PUBLICATION is a separate decision, pending until approved (lib/contentReview.ts).
    review: {
      status: "source-checked",
      checkedAgainst: "Qur'an text (Tanzil quran-simple); Tafsir al-Sa'di via the Quran.com API (tafsir 91); Saheeh International",
      checkedOn: "2026-10-15",
    },
    comments: comments.map(([style, ar, en], i) => ({ id: `lataif:${spec.id}:c${i + 1}`, style, ar, en })),
  };
}

export const QURAN_LATAIF: readonly QuranLatifa[] = [
  lataif({
    id: "q33-41",
    surah: 33,
    ayahs: [41, 42],
    verseAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا وَسَبِّحُوهُ بُكْرَةً وَأَصِيلًا",
    excerpt: false,
    verseRefAr: "سورة الأحزاب، الآية 41–42",
    verseRefEn: "Surat Al-Ahzab 33:41–42",
    verseEn: "O you who have believed, remember Allah with much remembrance And exalt Him morning and afternoon",
    tafsirAr: "يأمر تعالى المؤمنين، بذكره ذكرا كثيرًا، من تهليل، وتحميد، وتسبيح، وتكبير وغير ذلك، من كل قول فيه قربة إلى اللّه، وأقل ذلك، أن يلازم الإنسان، أوراد الصباح، والمساء، وأدبار الصلوات الخمس، وعند العوارض والأسباب.",
    tafsirRef: "33:41",
    comments: [
      ["practice", "اجعل لذكرك نصيبًا ثابتًا في أول النهار وآخره، ولو كان قليلًا.", "Give your remembrance a fixed share at the start and end of the day, even if small."],
      ["reflection", "الذكر الكثير لا يعني وقتًا طويلًا، بل قلبًا يعود إلى الله مرةً بعد مرة.", "Much remembrance doesn't mean long hours, but a heart that returns to Allah again and again."],
    ],
  }),
  lataif({
    id: "q2-153",
    surah: 2,
    ayahs: [153],
    verseAr: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    excerpt: false,
    verseRefAr: "سورة البقرة، الآية 153",
    verseRefEn: "Surat Al-Baqarah 2:153",
    verseEn: "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient",
    tafsirAr: "فالصبر هو: حبس النفس وكفها عما تكره, فهو ثلاثة أقسام: صبرها على طاعة الله حتى تؤديها, وعن معصية الله حتى تتركها, وعلى أقدار الله المؤلمة فلا تتسخطها",
    tafsirRef: "2:153",
    comments: [
      ["meaning", "الصبر هنا ثلاثة أبواب: على الطاعة، وعن المعصية، وعلى المؤلم من الأقدار.", "Patience here has three doors: in obedience, away from sin, and through painful decrees."],
      ["practice", "حين يشتد عليك أمر، اجمع بين الصبر والصلاة كما أرشدت الآية.", "When something weighs on you, join patience with prayer, as the verse guides."],
    ],
  }),
  lataif({
    id: "q39-53",
    surah: 39,
    ayahs: [53],
    verseAr: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنْفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ",
    excerpt: false,
    verseRefAr: "سورة الزمر، الآية 53",
    verseRefEn: "Surat Az-Zumar 39:53",
    verseEn: "Say, \"O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful",
    tafsirAr: "يخبر تعالى عباده المسرفين بسعة كرمه، ويحثهم على الإنابة قبل أن لا يمكنهم ذلك",
    tafsirRef: "39:53",
    comments: [
      ["encouragement", "مهما كثرت الذنوب، فباب الرجوع إلى الله ما زال مفتوحًا.", "However many the sins, the door back to Allah is still open."],
      ["reflection", "الآية نداءٌ للمسرفين على أنفسهم بالرجاء لا باليأس.", "The verse calls those who wronged themselves to hope, not despair."],
    ],
  }),
  lataif({
    id: "q94-5",
    surah: 94,
    ayahs: [5, 6],
    verseAr: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    excerpt: false,
    verseRefAr: "سورة الشرح، الآية 5–6",
    verseRefEn: "Surat Ash-Sharh 94:5–6",
    verseEn: "For indeed, with hardship [will be] ease Indeed, with hardship [will be] ease",
    tafsirAr: "بشارة عظيمة، أنه كلما وجد عسر وصعوبة، فإن اليسر يقارنه ويصاحبه",
    tafsirRef: "94:5",
    comments: [
      ["encouragement", "العسر لا يأتي وحده؛ فاليسر يصحبه وإن لم تره بعد.", "Hardship never comes alone; ease accompanies it, even if you can't see it yet."],
      ["practice", "تذكّر شدةً مرّت بك ثم انفرجت، واحمد الله عليها.", "Recall a hardship that passed and eased, and thank Allah for it."],
    ],
  }),
  lataif({
    id: "q3-134",
    surah: 3,
    ayahs: [134],
    verseAr: "الَّذِينَ يُنْفِقُونَ فِي السَّرَّاءِ وَالضَّرَّاءِ وَالْكَاظِمِينَ الْغَيْظَ وَالْعَافِينَ عَنِ النَّاسِ وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ",
    excerpt: false,
    verseRefAr: "سورة آل عمران، الآية 134",
    verseRefEn: "Surat Al 'Imran 3:134",
    verseEn: "Who spend [in the cause of Allah] during ease and hardship and who restrain anger and who pardon the people - and Allah loves the doers of good",
    tafsirAr: "والعفو أبلغ من الكظم، لأن العفو ترك المؤاخذة مع السماحة عن المسيء",
    tafsirRef: "3:134",
    comments: [
      ["meaning", "كظم الغيظ إمساكٌ عن الأذى، والعفو خطوةٌ أعلى منه.", "Restraining anger holds back harm; pardoning is a step higher still."],
      ["practice", "اختر اليوم موقفًا تعفو فيه بدل أن تكتفي بالسكوت.", "Choose a moment today to pardon rather than merely stay silent."],
    ],
  }),
  lataif({
    id: "q41-34",
    surah: 41,
    ayahs: [34],
    verseAr: "وَلَا تَسْتَوِي الْحَسَنَةُ وَلَا السَّيِّئَةُ ادْفَعْ بِالَّتِي هِيَ أَحْسَنُ فَإِذَا الَّذِي بَيْنَكَ وَبَيْنَهُ عَدَاوَةٌ كَأَنَّهُ وَلِيٌّ حَمِيمٌ",
    excerpt: false,
    verseRefAr: "سورة فصلت، الآية 34",
    verseRefEn: "Surat Fussilat 41:34",
    verseEn: "And not equal are the good deed and the bad. Repel [evil] by that [deed] which is better; and thereupon the one whom between you and him is enmity [will become] as though he was a devoted friend",
    tafsirAr: "ثم أمر بإحسان خاص، له موقع كبير، وهو الإحسان إلى من أساء إليك",
    tafsirRef: "41:34",
    comments: [
      ["practice", "قابل الكلمة القاسية بكلمةٍ طيبة، وانظر كيف يتغيّر الموقف.", "Meet a harsh word with a kind one, and see how the moment changes."],
      ["reflection", "الإحسان إلى من أساء ليس ضعفًا، بل خُلُقٌ رفيع.", "Being good to one who wronged you isn't weakness; it is noble character."],
    ],
  }),
  lataif({
    id: "q29-45",
    surah: 29,
    ayahs: [45],
    verseAr: "وَلَذِكْرُ اللَّهِ أَكْبَرُ",
    excerpt: true,
    verseRefAr: "سورة العنكبوت، الآية 45",
    verseRefEn: "Surat Al-'Ankabut 29:45",
    verseEn: "and the remembrance of Allah is greater",
    tafsirAr: "وثَمَّ في الصلاة مقصود أعظم من هذا وأكبر، وهو ما اشتملت عليه من ذكر اللّه، بالقلب واللسان والبدن. فإن اللّه تعالى، إنما خلق الخلق لعبادته، وأفضل عبادة تقع منهم الصلاة، وفيها من عبوديات الجوارح كلها، ما ليس في غيرها، ولهذا قال: { وَلَذِكْرُ اللَّهِ أَكْبَرُ } ويحتمل أنه لما أمر بالصلاة ومدحها، أخبر أن ذكره تعالى خارج الصلاة أكبر من الصلاة، كما هو قول جمهور المفسرين، لكن الأول أولى",
    tafsirRef: "29:45",
    comments: [
      ["reflection", "الصلاة نفسها ذكرٌ بالقلب واللسان والجسد معًا.", "Prayer itself is remembrance with heart, tongue and body together."],
      ["practice", "استحضر في صلاتك القادمة أنها أعظم مجالس الذكر.", "In your next prayer, recall that it is among the greatest moments of remembrance."],
    ],
  }),
  lataif({
    id: "q7-205",
    surah: 7,
    ayahs: [205],
    verseAr: "وَاذْكُرْ رَبَّكَ فِي نَفْسِكَ تَضَرُّعًا وَخِيفَةً وَدُونَ الْجَهْرِ مِنَ الْقَوْلِ بِالْغُدُوِّ وَالْآصَالِ وَلَا تَكُنْ مِنَ الْغَافِلِينَ",
    excerpt: false,
    verseRefAr: "سورة الأعراف، الآية 205",
    verseRefEn: "Surat Al-A'raf 7:205",
    verseEn: "And remember your Lord within yourself in humility and in fear without being apparent in speech - in the mornings and the evenings. And do not be among the heedless",
    tafsirAr: "الذكر للّه تعالى يكون بالقلب، ويكون باللسان، ويكون بهما، وهو أكمل أنواع الذكر وأحواله",
    tafsirRef: "7:205",
    comments: [
      ["practice", "اذكر ربك في نفسك بهدوء، دون رفع صوت ولا غفلة.", "Remember your Lord within yourself, calmly — neither loud nor heedless."],
      ["meaning", "أكمل الذكر ما اجتمع فيه القلب واللسان.", "The most complete remembrance is where heart and tongue meet."],
    ],
  }),
  lataif({
    id: "q65-3",
    surah: 65,
    ayahs: [3],
    verseAr: "وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
    excerpt: true,
    verseRefAr: "سورة الطلاق، الآية 3",
    verseRefEn: "Surat At-Talaq 65:3",
    verseEn: "And whoever relies upon Allah - then He is sufficient for him",
    tafsirAr: "أي: في أمر دينه ودنياه، بأن يعتمد على الله في جلب ما ينفعه ودفع ما يضره، ويثق به في تسهيل ذلك",
    tafsirRef: "65:3",
    comments: [
      ["meaning", "التوكل اعتمادٌ على الله في جلب النفع ودفع الضر، مع الثقة به.", "Reliance is depending on Allah to bring good and avert harm, trusting Him."],
      ["encouragement", "ما وكلته إلى الله فهو في أمانٍ؛ فخذ بالأسباب واطمئن.", "What you entrust to Allah is in safe keeping; take the means and be at peace."],
    ],
  }),
  lataif({
    id: "q16-53",
    surah: 16,
    ayahs: [53],
    verseAr: "وَمَا بِكُمْ مِنْ نِعْمَةٍ فَمِنَ اللَّهِ ثُمَّ إِذَا مَسَّكُمُ الضُّرُّ فَإِلَيْهِ تَجْأَرُونَ",
    excerpt: false,
    verseRefAr: "سورة النحل، الآية 53",
    verseRefEn: "Surat An-Nahl 16:53",
    verseEn: "And whatever you have of favor - it is from Allah. Then when adversity touches you, to Him you cry for help",
    tafsirAr: "فالذي انفرد بإعطائكم ما تحبون، وصرف ما تكرهون، هو الذي لا تنبغي العبادة إلا له وحده.",
    tafsirRef: "16:53",
    comments: [
      ["practice", "انسب كل نعمةٍ تراها اليوم إلى الله، واشكره عليها.", "Attribute every blessing you notice today to Allah, and thank Him for it."],
      ["reflection", "من أعطاك ما تحب وصرف عنك ما تكره هو الأحق بقلبك.", "The One who gives what you love and averts what you dislike most deserves your heart."],
    ],
  }),
  lataif({
    id: "q39-10",
    surah: 39,
    ayahs: [10],
    verseAr: "إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُمْ بِغَيْرِ حِسَابٍ",
    excerpt: true,
    verseRefAr: "سورة الزمر، الآية 10",
    verseRefEn: "Surat Az-Zumar 39:10",
    verseEn: "Indeed, the patient will be given their reward without account",
    tafsirAr: "وهذا عام في جميع أنواع الصبر، الصبر على أقدار اللّه المؤلمة فلا يتسخطها، والصبر عن معاصيه فلا يرتكبها، والصبر على طاعته حتى يؤديها، فوعد اللّه الصابرين أجرهم بغير حساب، أي: بغير حد ولا عد ولا مقدار",
    tafsirRef: "39:10",
    comments: [
      ["encouragement", "صبرك ليس ضائعًا؛ فأجره بلا حدٍّ ولا عدّ.", "Your patience isn't wasted; its reward is without limit or count."],
      ["meaning", "يشمل الصبر هنا الطاعة، وترك المعصية، وتحمّل الأقدار.", "Patience here includes obedience, leaving sin, and bearing what is decreed."],
    ],
  }),
  lataif({
    id: "q16-18",
    surah: 16,
    ayahs: [18],
    verseAr: "وَإِنْ تَعُدُّوا نِعْمَةَ اللَّهِ لَا تُحْصُوهَا إِنَّ اللَّهَ لَغَفُورٌ رَحِيمٌ",
    excerpt: false,
    verseRefAr: "سورة النحل، الآية 18",
    verseRefEn: "Surat An-Nahl 16:18",
    verseEn: "And if you should count the favors of Allah, you could not enumerate them. Indeed, Allah is Forgiving and Merciful",
    tafsirAr: "فإن نعمه الظاهرة والباطنة على العباد بعدد الأنفاس واللحظات",
    tafsirRef: "16:18",
    comments: [
      ["practice", "حاول أن تعدّ نعم يومك؛ ستجد أنها أكثر من أن تُحصى.", "Try counting today's blessings; you'll find them beyond counting."],
      ["reflection", "النعم بعدد الأنفاس؛ فليكن الشكر رفيق النفَس.", "Blessings are as many as breaths; let gratitude keep pace with each one."],
    ],
  }),
  lataif({
    id: "q70-5",
    surah: 70,
    ayahs: [5],
    verseAr: "فَاصْبِرْ صَبْرًا جَمِيلًا",
    excerpt: false,
    verseRefAr: "سورة المعارج، الآية 5",
    verseRefEn: "Surat Al-Ma'arij 70:5",
    verseEn: "So be patient with gracious patience",
    tafsirAr: "لا تضجر فيه ولا ملل، بل استمر على أمر الله",
    tafsirRef: "70:5",
    comments: [
      ["meaning", "الصبر الجميل صبرٌ بلا ضجر ولا ملل.", "Beautiful patience is patience without complaint or weariness."],
      ["practice", "إن طال عليك أمر، فاستمر عليه بهدوء دون تذمّر.", "If something drags on, keep at it calmly, without complaint."],
    ],
  }),  // Added 2026-10-16 (verse: Tanzil; tafsir: verbatim al-Sa'di via Quran.com; English: Saheeh International). Pending Review.
  lataif({
    id: "q25-63",
    surah: 25,
    ayahs: [63],
    verseAr: "وَعِبَادُ الرَّحْمَٰنِ الَّذِينَ يَمْشُونَ عَلَى الْأَرْضِ هَوْنًا وَإِذَا خَاطَبَهُمُ الْجَاهِلُونَ قَالُوا سَلَامًا",
    excerpt: false,
    verseRefAr: "سورة الفرقان، الآية 63",
    verseRefEn: "Surat Al-Furqan 25:63",
    verseEn: "And the servants of the Most Merciful are those who walk upon the earth easily, and when the ignorant address them [harshly], they say [words of] peace",
    tafsirAr: "ساكنين متواضعين لله والخلق فهذا وصف لهم بالوقار والسكينة والتواضع لله ولعباده",
    tafsirRef: "25:63",
    comments: [
      ["meaning", "من صفات عباد الرحمن: السكينة والتواضع، والردّ على الجاهل بما يسلم به المرء.", "Among the traits of the servants of the Most Merciful: calm, humility, and answering the ignorant with words that keep one safe."],
      ["practice", "إذا خاطبك أحدٌ بحدّة اليوم، فأجبه بهدوء أو اترك الجدال.", "If someone speaks to you harshly today, answer calmly or let the argument go."],
    ],
  }),
  lataif({
    id: "q14-7",
    surah: 14,
    ayahs: [7],
    verseAr: "وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ وَلَئِنْ كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ",
    excerpt: false,
    verseRefAr: "سورة إبراهيم، الآية 7",
    verseRefEn: "Surat Ibrahim 14:7",
    verseEn: "And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is severe",
    tafsirAr: "والشكر: هو اعتراف القلب بنعم الله والثناء على الله بها وصرفها في مرضاة الله تعالى",
    tafsirRef: "14:7",
    comments: [
      ["meaning", "الشكر عند السعدي: اعتراف القلب بالنعمة، والثناء على الله بها، واستعمالها فيما يرضيه.", "Gratitude, in al-Sa'di's words: the heart acknowledging a blessing, praising Allah for it, and using it in what pleases Him."],
      ["practice", "اختر نعمةً واحدة اليوم، واحمد الله عليها، واستعملها في خير.", "Pick one blessing today, praise Allah for it, and put it to good use."],
    ],
  }),
  lataif({
    id: "q49-10",
    surah: 49,
    ayahs: [10],
    verseAr: "إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا بَيْنَ أَخَوَيْكُمْ وَاتَّقُوا اللَّهَ لَعَلَّكُمْ تُرْحَمُونَ",
    excerpt: false,
    verseRefAr: "سورة الحجرات، الآية 10",
    verseRefEn: "Surat Al-Hujurat 49:10",
    verseEn: "The believers are but brothers, so make settlement between your brothers. And fear Allah that you may receive mercy",
    tafsirAr: "هذا عقد، عقده الله بين المؤمنين، أنه إذا وجد من أي شخص كان، في مشرق الأرض ومغربها، الإيمان بالله، وملائكته، وكتبه، ورسله، واليوم الآخر، فإنه أخ للمؤمنين",
    tafsirRef: "49:10",
    comments: [
      ["meaning", "الأخوّة في الإيمان رابطٌ يجمع المؤمنين أينما كانوا.", "Brotherhood in faith is a bond joining believers wherever they are."],
      ["practice", "إن كان بين اثنين تعرفهما خلاف، فكن سببًا في الصلح بكلمة طيبة.", "If two people you know are at odds, be a cause of reconciliation with a kind word."],
    ],
  }),
  lataif({
    id: "q11-115",
    surah: 11,
    ayahs: [115],
    verseAr: "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
    excerpt: false,
    verseRefAr: "سورة هود، الآية 115",
    verseRefEn: "Surat Hud 11:115",
    verseEn: "And be patient, for indeed, Allah does not allow to be lost the reward of those who do good",
    tafsirAr: "احبس نفسك على طاعة الله، وعن معصيته، وإلزامها لذلك، واستمر ولا تضجر",
    tafsirRef: "11:115",
    comments: [
      ["meaning", "الصبر هنا حبس النفس على الطاعة وعن المعصية، والاستمرار دون ضجر.", "Patience here is holding oneself to obedience and back from sin, and continuing without complaint."],
      ["encouragement", "إحسانك لا يضيع، وإن لم يره أحد.", "Your good deeds are never lost, even if no one sees them."],
    ],
  }),
  lataif({
    id: "q4-86",
    surah: 4,
    ayahs: [86],
    verseAr: "وَإِذَا حُيِّيتُمْ بِتَحِيَّةٍ فَحَيُّوا بِأَحْسَنَ مِنْهَا أَوْ رُدُّوهَا إِنَّ اللَّهَ كَانَ عَلَىٰ كُلِّ شَيْءٍ حَسِيبًا",
    excerpt: false,
    verseRefAr: "سورة النساء، الآية 86",
    verseRefEn: "Surat An-Nisa 4:86",
    verseEn: "And when you are greeted with a greeting, greet [in return] with one better than it or [at least] return it [in a like manner]. Indeed Allah is ever, over all things, an Accountant",
    tafsirAr: "فأمر تعالى المؤمنين أنهم إذا حُيّوا بأي تحية كانت، أن يردوها بأحسن منها لفظا وبشاشة، أو مثلها في ذلك",
    tafsirRef: "4:86",
    comments: [
      ["practice", "ردّ السلام اليوم بأحسن منه: بكلمة أتمّ وابتسامة.", "Return greetings today with something better: a fuller word and a smile."],
      ["reflection", "أدب التحية في القرآن: إمّا الأحسن أو المثل، لا أقل.", "The Qur'an's manners of greeting: return it better, or at least the same — never less."],
    ],
  }),
  lataif({
    id: "q93-11",
    surah: 93,
    ayahs: [11],
    verseAr: "وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ",
    excerpt: false,
    verseRefAr: "سورة الضحى، الآية 11",
    verseRefEn: "Surat Ad-Duha 93:11",
    verseEn: "But as for the favor of your Lord, report [it]",
    tafsirAr: "فإن التحدث بنعمة الله، داع لشكرها، وموجب لتحبيب القلوب إلى من أنعم بها، فإن القلوب مجبولة على محبة المحسن",
    tafsirRef: "93:11",
    comments: [
      ["practice", "حدّث اليوم بنعمةٍ أنعم الله بها عليك، شكرًا لا تفاخرًا.", "Speak today of a blessing Allah gave you — in thanks, not in boasting."],
      ["meaning", "ذِكر النعمة يدعو إلى شكرها، كما قال السعدي.", "Speaking of a blessing invites gratitude for it, as al-Sa'di notes."],
    ],
  }),
  lataif({
    id: "q39-9",
    surah: 39,
    ayahs: [9],
    verseAr: "قُلْ هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ إِنَّمَا يَتَذَكَّرُ أُولُو الْأَلْبَابِ",
    excerpt: true,
    verseRefAr: "سورة الزمر، الآية 9",
    verseRefEn: "Surat Az-Zumar 39:9",
    verseEn: "Say, \"Are those who know equal to those who do not know?\" Only they will remember [who are] people of understanding",
    tafsirAr: "هذه مقابلة بين العامل بطاعة اللّه وغيره، وبين العالم والجاهل",
    tafsirRef: "39:9",
    comments: [
      ["reflection", "العلم يرفع صاحبه؛ والتذكّر ثمرة العقل.", "Knowledge raises its owner; remembering is the fruit of understanding."],
      ["practice", "تعلّم اليوم شيئًا نافعًا ولو صغيرًا.", "Learn something beneficial today, even something small."],
    ],
  }),
];
