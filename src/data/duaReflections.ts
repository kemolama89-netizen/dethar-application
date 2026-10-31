// Short DITHAR reflections on dua, shown — one at a time, in turn — under
// every dua in reminders, notifications and the home-screen widget. They
// replace the one line that used to come with every dua (its
// `theme:dua:legacy` comment, data/dhikrReflections.ts DHIKR_REFLECTIONS.dua).
//
// CONTENT RULES (as data/dhikrReflections.ts and data/widgetContent.ts)
//  - DITHAR's own reminders in plain words: never a Qur'anic verse or a
//    Hadith, never a paraphrase presented as one, never attributed to
//    anyone, and never a promise of what Allah will do.
//  - Short enough for a widget line in both languages
//    (lib/widgetFeed.ts WIDGET_MAX_COMMENT_CHARS).
//  - Varied: closeness, hope, trust, humility, patience, gratitude, seeking
//    forgiveness, relief in hardship, persistence — no two on the same idea
//    in the same words.
//
// Ids are stable (`dua-reflection:NN`): rotation history and Favorites keep
// them across releases. They are DITHAR's own words like the line they
// replace, so they are published by default (lib/contentReview.ts) and can be
// held back or rejected in the Religious Content Review screen like any other
// comment.
import type { CommentStyle, EditorialComment } from "./widgetContent";

const REFLECTIONS: readonly [CommentStyle, string, string][] = [
  // Closeness
  ["reflection", "الدعاء بابٌ مفتوح؛ تطرقه متى شئت، بلا موعدٍ ولا وسيط.", "Dua is an open door; knock whenever you wish, with no appointment and no go-between."],
  ["reflection", "حين ترفع يديك، فأنت تخاطب من هو أعلم بحالك منك.", "Raising your hands, you speak to One who knows your state better than you do."],
  ["practice", "الدعاء حوارٌ بلا وسيط؛ قل ما في قلبك بلغتك وكلماتك.", "Dua needs no go-between; say what is in your heart, in your own words."],
  ["reflection", "في هدوء الليل يصفو الدعاء، ويقترب القلب من ربه.", "In the stillness of night, dua grows clear and the heart draws close to its Lord."],
  // Hope
  ["encouragement", "في الدعاء يتّسع الأمل، مهما ضاقت الأسباب من حولك.", "In dua, hope widens, however narrow the means around you."],
  ["encouragement", "لا تستكثر حاجتك على ربك، ولا تستصغر دعوةً قلتها بصدق.", "Never think your need too great for your Lord, nor a sincere dua too small."],
  ["encouragement", "لا تيأس إن طال الانتظار؛ فالأمل في الله لا ينقطع.", "Don't despair if the wait is long; hope in Allah does not run out."],
  // Trust
  ["practice", "ادعُ ثم اطمئن؛ فالتوكّل أن تسأل وتترك التدبير لله.", "Ask, then be at peace: trust is to ask and leave the arranging to Allah."],
  ["reflection", "قد يتأخر ما تطلبه، لكن قلبك يقترب مع كل دعاء.", "What you ask for may take time, but your heart draws nearer with every dua."],
  ["reflection", "ليست كل إجابةٍ كما تتخيّل؛ فاستمر في الدعاء وثِق بحكمة ربك.", "Not every answer looks as you imagine; keep asking and trust your Lord's wisdom."],
  ["practice", "سَل ربك الخير، ثم ارضَ بما يختاره لك؛ ففي الرضا راحة.", "Ask your Lord for good, then accept what He chooses; there is rest in contentment."],
  // Humility
  ["meaning", "الدعاء اعترافٌ جميل بالحاجة؛ فيه يلين الكِبر ويسكن القلب.", "Dua is a beautiful admission of need: pride softens and the heart settles."],
  ["reflection", "أصدق الدعاء ما خرج من قلبٍ يعرف ضعفه ويعرف ربه.", "The truest dua comes from a heart that knows its weakness and knows its Lord."],
  ["meaning", "قف بين يدي ربك فقيرًا إليه؛ فهذا جوهر الدعاء.", "Stand before your Lord in need of Him; that is the heart of dua."],
  ["practice", "لا تحتاج إلى عباراتٍ منمّقة؛ يكفي أن تكون صادقًا.", "You don't need polished phrases; it is enough to be sincere."],
  // Patience
  ["encouragement", "اصبر على الدعاء كما تصبر على الزرع؛ لا يُرى نموّه كل يوم.", "Be patient with dua as with a seed: you don't see it grow every day."],
  ["reflection", "قد تأتي الإجابة في صورة صبرٍ يُعطاه قلبك.", "An answer may come as patience given to your heart."],
  // Gratitude
  ["practice", "اجعل في دعائك شكرًا لما أُعطيت، قبل أن تسأل ما تريد.", "Let your dua hold thanks for what you were given before you ask for more."],
  ["reminder", "الدعاء ليس للشدائد وحدها؛ ادعُ وأنت في عافيةٍ شاكرًا.", "Dua isn't only for hard times; ask while you are well, with a grateful heart."],
  ["reminder", "إذا رأيت أثر دعائك، فلا تنسَ أن تعود شاكرًا.", "When you see what your dua brought, don't forget to come back with thanks."],
  // Seeking forgiveness
  ["encouragement", "لا يمنعك ذنبٌ من الدعاء؛ ارجع إلى ربك كما أنت.", "Don't let a sin keep you from dua; return to your Lord just as you are."],
  ["practice", "استغفارٌ صادق في دعائك يخفّف عن قلبك ثِقل التقصير.", "Sincere seeking of forgiveness in your dua eases the weight of your shortcomings."],
  // Relief in hardship
  ["encouragement", "إذا ضاقت بك الدنيا، فالدعاء متّسعٌ لا يضيق.", "When the world closes in, dua remains a space that does not narrow."],
  ["practice", "بُح بهمّك لربك؛ فبعض الهموم يخفّ بمجرد أن يُقال.", "Pour out your worry to your Lord; some burdens lighten just by being spoken."],
  ["encouragement", "كلما شعرت بالعجز، تذكّر أن الدعاء قوة من لا قوة له.", "Whenever you feel helpless, remember: dua is the strength of the powerless."],
  ["reflection", "بعد الدعاء يهدأ القلب؛ فقد وضعت حملك عند من يقدر عليه.", "After dua the heart grows calm: you have laid your load before the One able to bear it."],
  // Persistence
  ["encouragement", "لا تملّ من تكرار حاجتك؛ فالإلحاح في الدعاء عبادةٌ تقرّبك.", "Don't tire of repeating your need; persistence in dua is worship that draws you near."],
  ["practice", "اجعل لك موعدًا يوميًا مع الدعاء، ولو بكلماتٍ قليلة.", "Keep a daily meeting with dua, even if only in a few words."],
  ["practice", "ادعُ وقلبك حاضر؛ فالكلمات أصدق حين تخرج من القلب.", "Make dua with a present heart; words ring truest when they come from within."],
  // Small needs and every day
  ["practice", "لا تحتقر حاجةً صغيرة؛ اسألها ربك كما تسأله العظيم.", "No need is too small; bring it to your Lord as you would a great one."],
  ["reminder", "ابدأ يومك بدعاء؛ فهو أجمل ما تحمله معك إلى ما ينتظرك.", "Begin your day with dua; it is the finest thing to carry into what awaits you."],
  ["reminder", "لا تنسَ قلبك في دعائك: اسأل له الطمأنينة والثبات.", "Don't forget your heart in your dua: ask for its calm and steadiness."],
  // Others
  ["practice", "ادعُ لمن تحب وهو لا يعلم؛ فالدعاء للناس محبةٌ خفيّة.", "Pray for those you love without their knowing; dua for others is quiet love."],
  ["reminder", "اجعل لأهلك نصيبًا من دعائك؛ فهو أثرٌ طيبٌ يبقى.", "Give your family a share of your dua; it is a kindness that stays."],
];

export const DUA_REFLECTIONS: readonly EditorialComment[] = REFLECTIONS.map(([style, ar, en], i) => ({
  id: `dua-reflection:${String(i + 1).padStart(2, "0")}`,
  style,
  ar,
  en,
}));
