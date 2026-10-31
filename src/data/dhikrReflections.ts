// Short reflections for the full-screen spiritual reminder (and its widget
// / notification twins): each dhikr connected to its meaning.
//
// CONTENT RULES
//  - A reflection is DITHAR's own educational wording. It is always shown
//    under its own label («تأمّل» / "Reflection"), never inside quotation
//    marks, and is never attributed to the Prophet ﷺ, a Companion or a
//    scholar.
//  - The EVIDENCE shown with it is never written here: it is read from
//    content the app already ships and has audited — a Tasbeeh dhikr's
//    virtue with its citation (tasbeeh-library.json + sourceAr), or a
//    Qur'anic verse from the Wamdat dataset — and shown under its own label
//    («من السنة» / «من القرآن»), with its source.
//  - Each theme suggests a fitting background (reminderBackgrounds.ts).
import type { Language } from "../theme/LanguageContext";

export type ReflectionTheme = "hamd" | "tasbih" | "istighfar" | "takbir" | "salawat" | "tahlil" | "hawqala" | "dua";

export type ReflectionEvidence = { kind: "virtue"; tasbeehId: number } | { kind: "quran"; wamdaId: number };

export interface DhikrReflection {
  theme: ReflectionTheme;
  name: Record<Language, string>;
  reflection: Record<Language, string>;
  evidence: ReflectionEvidence;
  /** A fitting background id, or "auto" for the time-of-day/season one. */
  background: string;
}

export const DHIKR_REFLECTIONS: Readonly<Record<ReflectionTheme, DhikrReflection>> = {
  hamd: {
    theme: "hamd",
    name: { ar: "الحمد لله", en: "Alhamdulillah" },
    reflection: {
      ar: "قِف لحظةً مع نِعَم الله عليك: نَفَسٌ يتردّد، وقلبٌ ينبض، وهدايةٌ دلّتك على ذكره. الحمدُ اعترافٌ بالفضل، وشكرٌ يجعل يومك أوسع وأطيب.",
      en: "Pause on Allah's blessings around you: a breath that comes and goes, a heart that beats, the guidance that led you to remember Him. Praise is recognizing His favour — gratitude that makes your day wider and kinder.",
    },
    evidence: { kind: "virtue", tasbeehId: 8 },
    background: "day-spring",
  },
  tasbih: {
    theme: "tasbih",
    name: { ar: "سبحان الله", en: "SubhanAllah" },
    reflection: {
      ar: "سبحان الله: تنزيهٌ لله عن كل نقص، وإقرارٌ بكمال صنعه. انظر إلى السماء وانتظامها، وإلى دقائق الخلق من حولك، وقُلها بقلبٍ يرى عظمة الخالق.",
      en: "SubhanAllah declares Allah free of every imperfection and affirms the perfection of His making. Look at the ordered sky and the finest details of creation around you, and say it with a heart that sees the Creator's greatness.",
    },
    evidence: { kind: "virtue", tasbeehId: 1 },
    background: "night-spring",
  },
  istighfar: {
    theme: "istighfar",
    name: { ar: "أستغفر الله", en: "Astaghfirullah" },
    reflection: {
      ar: "الاستغفار بابٌ مفتوحٌ للرجوع مهما ابتعدت الخُطى؛ اعترافٌ صادقٌ بالتقصير، وثقةٌ برحمة الله وعفوه، وبدايةٌ جديدة مع كل مرة.",
      en: "Seeking forgiveness is an open door back to Allah, however far the steps have strayed: an honest admission of shortcoming, trust in His mercy and pardon, and a fresh beginning every time.",
    },
    evidence: { kind: "virtue", tasbeehId: 10 },
    background: "dawn-spring",
  },
  takbir: {
    theme: "takbir",
    name: { ar: "الله أكبر", en: "Allahu Akbar" },
    reflection: {
      ar: "الله أكبر: أكبر من همّك، وأكبر من كل ما يشغلك ويُقلقك. حين تقولها بقلبك يصغر في عينك كل شيءٍ سواه.",
      en: "Allahu Akbar: Allah is greater than your worry, greater than all that occupies and troubles you. Say it with your heart, and everything besides Him grows small.",
    },
    evidence: { kind: "virtue", tasbeehId: 16 },
    background: "sunset-winter",
  },
  salawat: {
    theme: "salawat",
    name: { ar: "الصلاة على النبي ﷺ", en: "Salawat upon the Prophet ﷺ" },
    reflection: {
      ar: "صلاتك على النبي ﷺ محبةٌ لمن بلّغك الهدى، وتقديرٌ لرسالته التي أخرجت الناس إلى النور، وعهدٌ متجدّد باتباع سنّته في أخلاقك ويومك.",
      en: "Sending blessings upon the Prophet ﷺ is love for the one who brought you guidance, appreciation of the message that led people to light, and a renewed promise to follow his Sunnah in your character and your day.",
    },
    evidence: { kind: "virtue", tasbeehId: 9 },
    background: "mosque-night",
  },
  tahlil: {
    theme: "tahlil",
    name: { ar: "لا إله إلا الله", en: "La ilaha illa Allah" },
    reflection: {
      ar: "لا إله إلا الله: كلمة التوحيد التي يقوم عليها كل شيء؛ تُحرِّر القلب من التعلّق بغير الله، وتجمع شتاته على وجهةٍ واحدة.",
      en: "La ilaha illa Allah, the word of Tawhid on which everything stands: it frees the heart from attachment to anything besides Allah and gathers it towards a single direction.",
    },
    evidence: { kind: "virtue", tasbeehId: 12 },
    background: "arches-dusk",
  },
  hawqala: {
    theme: "hawqala",
    name: { ar: "لا حول ولا قوة إلا بالله", en: "La hawla wa la quwwata illa billah" },
    reflection: {
      ar: "تبذل وُسعك ثم تُسلِّم: لا تحوُّل من حالٍ إلى حال، ولا قوة على أمرٍ إلا بالله. توكّلٌ يريح القلب ولا يُعطِّل العمل.",
      en: "You give your best, then you entrust: there is no change of state and no strength for anything except through Allah. Reliance that rests the heart without halting the effort.",
    },
    evidence: { kind: "virtue", tasbeehId: 7 },
    background: "auto",
  },
  dua: {
    theme: "dua",
    name: { ar: "الدعاء", en: "Dua" },
    reflection: {
      ar: "الدعاء حديثٌ صادقٌ بينك وبين ربك بلا واسطة. اطلب منه ما يُهمّك صغيرًا كان أو كبيرًا، فهو القريب الذي يسمع.",
      en: "Dua is a sincere conversation between you and your Lord, with no intermediary. Ask Him for what matters to you, small or great — He is near and He hears.",
    },
    evidence: { kind: "quran", wamdaId: 3 },
    background: "auto",
  },
};

/** Which reflection each Tasbeeh dhikr (by Tasbeeh id) belongs to. */
export const TASBEEH_REFLECTION_THEME: Readonly<Record<number, ReflectionTheme>> = {
  1: "tasbih",
  2: "tasbih",
  3: "tasbih",
  4: "tasbih",
  5: "tasbih",
  6: "tahlil",
  7: "hawqala",
  8: "hamd",
  9: "salawat",
  10: "istighfar",
  11: "takbir",
  12: "tahlil",
  13: "takbir",
  14: "tasbih",
  15: "hamd",
  16: "takbir",
};
