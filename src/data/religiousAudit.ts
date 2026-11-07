// The religious-content audit (2026-10-30, fully re-reviewed the same day), limited to three categories:
// Prophetic Hadiths, the Quranic Wamadat / Lataif, and the Lataif that quote
// Tafsir al-Sa'di. Only items in these categories are gated (lib/religiousAudit.ts
// inAuditScope); Written and Audio Adhkar, duas, Tasbeeh and everything else
// are untouched. Every decision, with its verified source or the reason it
// failed, is in docs/religious-content-audit-full-799-2026-10-30.md (the earlier
// docs/religious-content-audit-scoped-2026-10-30.md is superseded).
//
//   "ar"          verified — shown (Arabic)
//   "ar+en"       verified — shown, and its English is verbatim in a published
//                 translation of the same source (Saheeh International; Muhsin
//                 Khan for al-Bukhari; Abdul Hamid Siddiqui for Muslim)
//   "excluded"    checked and found wrong (wording, narrator, reference, grade,
//                 or a reflection not supported by its cited tafsir) — not shown
//   "partial"     partly supported: the reflection takes a point from its
//                 cited tafsir but adds a claim the tafsir does not make, or a
//                 hadith whose main reference is right but a cross-reference is
//                 wrong — not shown
//   "unverified"  could not be verified (source unavailable or editions
//                 disagree) — not shown until it is
//
// Since the 2026-10-30 cleanup, only the 506 Approved items remain in the
// content sources and in this table; the 293 that were Excluded, Partially
// Supported or Unverified were removed from the app (backed up, with their
// evidence, in backups/religious-content-cleanup-2026-10-30/). An in-scope
// item with no entry is still never shown, so new hadiths or Lataif stay
// hidden until audited. A Wamadat reflection is approved only when the
// tafsir it cites says what it says; it is shown as drawn from that work
// («مستفاد من»), never as a quotation.
export type AuditFlags = "ar" | "ar+en" | "excluded" | "partial" | "unverified";

export const RELIGIOUS_AUDIT: Readonly<Record<string, AuditFlags>> = {
  // Prophetic Hadiths — hadith library, enriched hadiths and startup hadith — all 158 kept are shown
  "hadith:5": "ar", "hadith:6": "ar", "hadith:8": "ar", "hadith:9": "ar",
  "hadith:10": "ar", "hadith:11": "ar", "hadith:12": "ar", "hadith:13": "ar",
  "hadith:14": "ar", "hadith:15": "ar", "hadith:16": "ar", "hadith:17": "ar",
  "hadith:18": "ar", "hadith:19": "ar", "hadith:20": "ar", "hadith:28": "ar",
  "hadith:29": "ar", "hadith:31": "ar", "hadith:32": "ar", "hadith:34": "ar",
  "hadith:35": "ar", "hadith:37": "ar", "hadith:38": "ar", "hadith:42": "ar",
  "hadith:45": "ar", "hadith:46": "ar", "hadith:52": "ar", "hadith:54": "ar",
  "hadith:61": "ar", "hadith:64": "ar", "hadith:65": "ar", "hadith:67": "ar",
  "hadith:68": "ar", "hadith:70": "ar", "hadith:71": "ar", "hadith:72": "ar",
  "hadith:73": "ar", "hadith:74": "ar", "hadith:76": "ar", "hadith:77": "ar",
  "hadith:80": "ar", "hadith:84": "ar", "hadith:86": "ar", "hadith:87": "ar",
  "hadith:88": "ar", "hadith:89": "ar", "hadith:90": "ar", "hadith:91": "ar",
  "hadith:94": "ar", "hadith:97": "ar", "hadith:99": "ar", "hadith:102": "ar",
  "hadith:103": "ar", "hadith:105": "ar", "hadith:107": "ar", "hadith:108": "ar",
  "hadith:109": "ar", "hadith:110": "ar", "hadith:111": "ar", "hadith:112": "ar",
  "hadith:114": "ar", "hadith:116": "ar", "hadith:117": "ar", "hadith:118": "ar",
  "hadith:120": "ar", "hadith:123": "ar", "hadith:127": "ar", "hadith:128": "ar",
  "hadith:134": "ar", "hadith:137": "ar", "hadith:138": "ar", "hadith:139": "ar",
  "hadith:140": "ar", "hadith:141": "ar", "hadith:142": "ar", "hadith:143": "ar",
  "hadith:145": "ar", "hadith:147": "ar", "hadith:148": "ar", "hadith:150": "ar",
  "hadith:151": "ar", "hadith:152": "ar", "hadith:153": "ar", "hadith:154": "ar",
  "hadith:156": "ar", "hadith:157": "ar", "hadith:160": "ar", "hadith:162": "ar",
  "hadith:163": "ar", "hadith:166": "ar", "hadith:168": "ar", "hadith:169": "ar",
  "hadith:173": "ar", "hadith:174": "ar", "hadith:176": "ar", "hadith:181": "ar",
  "hadith:186": "ar", "hadith:191": "ar", "hadith:194": "ar", "hadith:195": "ar",
  "hadith:196": "ar", "hadith:197": "ar", "hadith:198": "ar", "hadith:199": "ar",
  "hadith:muslim-38": "ar", "hadith:muslim-373": "ar", "hadith:muslim-482": "ar", "hadith:muslim-798": "ar",
  "hadith:muslim-804": "ar", "hadith:muslim-817": "ar", "hadith:muslim-2553": "ar", "hadith:muslim-2564": "ar",
  "hadith:muslim-2566": "ar", "hadith:muslim-2695": "ar", "hadith:muslim-2700": "ar", "hadith:muslim-2733": "ar",
  "hadith:muslim-2734": "ar", "hadith:muslim-2749": "ar", "hadith:muslim-2759": "ar", "hadith:muslim-2822": "ar",
  "hadith:muslim-2963": "ar", "hadith:muslim-2965": "ar", "hadith:bukhari-39": "ar", "hadith:bukhari-69": "ar",
  "hadith:bukhari-1145": "ar", "hadith:bukhari-1283": "ar", "hadith:bukhari-1469": "ar", "hadith:bukhari-2320": "ar",
  "hadith:bukhari-2996": "ar", "hadith:bukhari-5269": "ar", "hadith:bukhari-5986": "ar", "hadith:bukhari-5991": "ar",
  "hadith:bukhari-6116": "ar+en", "hadith:bukhari-6309": "ar", "hadith:bukhari-6340": "ar", "hadith:bukhari-6407": "ar",
  "hadith:bukhari-6412": "ar", "hadith:bukhari-6416": "ar", "hadith:bukhari-6446": "ar", "hadith:tirmidhi-1987": "ar",
  "hadith:tirmidhi-2346": "ar", "hadith:tirmidhi-2399": "ar", "hadith:tirmidhi-2518": "ar", "hadith:tirmidhi-3372": "ar",
  "hadith:tirmidhi-3375": "ar", "hadith:tirmidhi-3377": "ar", "hadith:tirmidhi-3556": "ar", "hadith:ibnmajah-3818": "ar",
  "hadith:ibnmajah-4032": "ar", "hadith:bukhari-6018": "ar+en", "hadith:bukhari-6464": "ar+en", "hadith:bukhari-6011": "ar+en",
  "hadith:bukhari-6035": "ar+en", "hadith:bukhari-2989": "ar+en", "hadith:bukhari-6012": "ar+en", "hadith:bukhari-6064": "ar+en",
  "hadith:bukhari-6477": "ar+en", "startup:tirmidhi-3377": "ar",
  // Time-based notifications (lib/timedContent.ts), checked 2026-11-07 against the hadith-api editions:
  // Arabic verbatim; English the published translation verbatim (al-Tirmidhi's English is not a named translation: Arabic only).
  "hadith:bukhari-574": "ar+en", "hadith:muslim-854": "ar+en", "hadith:bukhari-935": "ar+en", "hadith:bukhari-1981": "ar+en",
  "hadith:tirmidhi-761": "ar",
  // The uncommon hadiths added 2026-11-07, each checked against the hadith-api editions (English only a published translation, verbatim).
  "hadith:bukhari-1433": "ar", "hadith:bukhari-6490": "ar+en", "hadith:bukhari-5060": "ar+en", "hadith:bukhari-6133": "ar+en", "hadith:bukhari-6488": "ar+en", "hadith:bukhari-4836": "ar+en", "hadith:bukhari-5999": "ar+en", "hadith:bukhari-6435": "ar+en", "hadith:bukhari-6421": "ar+en", "hadith:bukhari-6439": "ar+en", "hadith:bukhari-6203": "ar", "hadith:bukhari-6510": "ar", "hadith:bukhari-6501": "ar", "hadith:bukhari-3562": "ar+en", "hadith:bukhari-6031": "ar+en", "hadith:muslim-2702": "ar+en", "hadith:muslim-2732": "ar+en", "hadith:muslim-2599": "ar+en", "hadith:muslim-2575": "ar", "hadith:muslim-2735": "ar+en", "hadith:muslim-2611": "ar+en", "hadith:muslim-2612": "ar+en", "hadith:muslim-2615": "ar+en", "hadith:muslim-2627": "ar+en", "hadith:muslim-2617": "ar+en", "hadith:muslim-2622": "ar+en", "hadith:muslim-2590": "ar+en", "hadith:muslim-2621": "ar+en", "hadith:muslim-2957": "ar", "hadith:muslim-542": "ar", "hadith:muslim-1914": "ar", "hadith:muslim-2812": "ar+en", "hadith:muslim-2958": "ar+en", "hadith:muslim-2552": "ar", "hadith:muslim-2328": "ar+en", "hadith:muslim-2327": "ar", "hadith:muslim-2311": "ar+en", "hadith:muslim-2309": "ar", "hadith:muslim-2608": "ar", "hadith:muslim-2814": "ar+en", "hadith:ibnmajah-4216": "ar", "hadith:tirmidhi-2377": "ar", "hadith:abudawud-4918": "ar", "hadith:tirmidhi-2314": "ar", "hadith:abudawud-4799": "ar", "hadith:ibnmajah-4198": "ar", "hadith:tirmidhi-2010": "ar", "hadith:abudawud-4985": "ar", "hadith:tirmidhi-2315": "ar", "hadith:abudawud-4902": "ar",
  // From Open Hadith Data (2026-11-07), each checked against the hadith-api edition; Arabic only.
  "hadith:bukhari-2262": "ar", "hadith:bukhari-2910": "ar", "hadith:bukhari-3490": "ar", "hadith:bukhari-3648": "ar", "hadith:bukhari-4959": "ar", "hadith:bukhari-4881": "ar", "hadith:bukhari-5754": "ar", "hadith:bukhari-6990": "ar", "hadith:bukhari-82": "ar", "hadith:bukhari-6165": "ar", "hadith:bukhari-2586": "ar", "hadith:bukhari-6596": "ar", "hadith:bukhari-2390": "ar", "hadith:bukhari-2885": "ar", "hadith:bukhari-3366": "ar", "hadith:bukhari-5684": "ar", "hadith:bukhari-5823": "ar", "hadith:bukhari-5836": "ar", "hadith:bukhari-6777": "ar", "hadith:bukhari-7060": "ar", "hadith:bukhari-5305": "ar", "hadith:bukhari-6762": "ar", "hadith:bukhari-1370": "ar", "hadith:bukhari-6386": "ar", "hadith:bukhari-2793": "ar", "hadith:bukhari-1337": "ar", "hadith:bukhari-5784": "ar", "hadith:muslim-2021": "ar", "hadith:muslim-2551": "ar", "hadith:muslim-1888": "ar", "hadith:muslim-553": "ar", "hadith:muslim-537": "ar", "hadith:ibnmajah-202": "ar", "hadith:ibnmajah-4158": "ar", "hadith:ibnmajah-2135": "ar", "hadith:ibnmajah-3845": "ar", "hadith:ibnmajah-180": "ar", "hadith:nasai-2084": "ar", "hadith:nasai-2223": "ar", "hadith:nasai-3104": "ar", "hadith:nasai-2141": "ar", "hadith:nasai-3375": "ar", "hadith:nasai-2385": "ar", "hadith:abudawud-4345": "ar", "hadith:abudawud-5187": "ar", "hadith:abudawud-2530": "ar", "hadith:abudawud-3450": "ar", "hadith:abudawud-5111": "ar", "hadith:abudawud-5125": "ar", "hadith:bukhari-6223": "ar",
  // Quranic Wamadat / Lataif (src/data/wamdat.ts): the verse and its reflection — all 332 kept are shown
  "lataif:w1": "ar", "lataif:w3": "ar", "lataif:w4": "ar", "lataif:w6": "ar",
  "lataif:w8": "ar", "lataif:w10": "ar", "lataif:w11": "ar", "lataif:w12": "ar",
  "lataif:w14": "ar", "lataif:w15": "ar", "lataif:w19": "ar", "lataif:w20": "ar",
  "lataif:w21": "ar", "lataif:w23": "ar", "lataif:w25": "ar", "lataif:w30": "ar",
  "lataif:w32": "ar", "lataif:w33": "ar", "lataif:w34": "ar", "lataif:w35": "ar",
  "lataif:w37": "ar", "lataif:w38": "ar", "lataif:w39": "ar", "lataif:w43": "ar",
  "lataif:w47": "ar", "lataif:w48": "ar", "lataif:w49": "ar", "lataif:w51": "ar",
  "lataif:w58": "ar", "lataif:w59": "ar", "lataif:w62": "ar", "lataif:w64": "ar",
  "lataif:w68": "ar", "lataif:w76": "ar", "lataif:w77": "ar", "lataif:w79": "ar",
  "lataif:w80": "ar", "lataif:w83": "ar", "lataif:w87": "ar", "lataif:w90": "ar",
  "lataif:w96": "ar", "lataif:w98": "ar", "lataif:w102": "ar", "lataif:w103": "ar",
  "lataif:w104": "ar", "lataif:w105": "ar", "lataif:w106": "ar", "lataif:w108": "ar",
  "lataif:w109": "ar", "lataif:w110": "ar", "lataif:w111": "ar", "lataif:w113": "ar",
  "lataif:w114": "ar", "lataif:w115": "ar", "lataif:w116": "ar", "lataif:w117": "ar",
  "lataif:w118": "ar", "lataif:w119": "ar", "lataif:w121": "ar", "lataif:w122": "ar",
  "lataif:w123": "ar", "lataif:w127": "ar", "lataif:w130": "ar", "lataif:w131": "ar",
  "lataif:w133": "ar", "lataif:w135": "ar", "lataif:w136": "ar", "lataif:w137": "ar",
  "lataif:w138": "ar", "lataif:w139": "ar", "lataif:w140": "ar", "lataif:w143": "ar",
  "lataif:w151": "ar", "lataif:w152": "ar", "lataif:w153": "ar", "lataif:w154": "ar",
  "lataif:w155": "ar", "lataif:w157": "ar", "lataif:w159": "ar", "lataif:w162": "ar",
  "lataif:w164": "ar", "lataif:w165": "ar", "lataif:w167": "ar", "lataif:w168": "ar",
  "lataif:w169": "ar", "lataif:w170": "ar", "lataif:w171": "ar", "lataif:w173": "ar",
  "lataif:w176": "ar", "lataif:w178": "ar", "lataif:w179": "ar", "lataif:w181": "ar",
  "lataif:w182": "ar", "lataif:w184": "ar", "lataif:w185": "ar", "lataif:w189": "ar",
  "lataif:w191": "ar", "lataif:w194": "ar", "lataif:w195": "ar", "lataif:w196": "ar",
  "lataif:w199": "ar", "lataif:w200": "ar", "lataif:w202": "ar", "lataif:w203": "ar",
  "lataif:w208": "ar", "lataif:w210": "ar", "lataif:w212": "ar", "lataif:w217": "ar",
  "lataif:w219": "ar", "lataif:w220": "ar", "lataif:w221": "ar", "lataif:w222": "ar",
  "lataif:w225": "ar", "lataif:w226": "ar", "lataif:w228": "ar", "lataif:w231": "ar",
  "lataif:w233": "ar", "lataif:w234": "ar", "lataif:w237": "ar", "lataif:w238": "ar",
  "lataif:w239": "ar", "lataif:w241": "ar", "lataif:w242": "ar", "lataif:w245": "ar",
  "lataif:w248": "ar", "lataif:w249": "ar", "lataif:w252": "ar", "lataif:w255": "ar",
  "lataif:w256": "ar", "lataif:w258": "ar", "lataif:w259": "ar", "lataif:w260": "ar",
  "lataif:w262": "ar", "lataif:w263": "ar", "lataif:w266": "ar", "lataif:w268": "ar",
  "lataif:w269": "ar", "lataif:w270": "ar", "lataif:w272": "ar", "lataif:w276": "ar",
  "lataif:w278": "ar", "lataif:w281": "ar", "lataif:w283": "ar", "lataif:w285": "ar",
  "lataif:w286": "ar", "lataif:w289": "ar", "lataif:w290": "ar", "lataif:w292": "ar",
  "lataif:w294": "ar", "lataif:w296": "ar", "lataif:w298": "ar", "lataif:w299": "ar",
  "lataif:w300": "ar", "lataif:w302": "ar", "lataif:w305": "ar", "lataif:w307": "ar",
  "lataif:w308": "ar", "lataif:w314": "ar", "lataif:w315": "ar", "lataif:w316": "ar",
  "lataif:w319": "ar", "lataif:w321": "ar", "lataif:w322": "ar", "lataif:w323": "ar",
  "lataif:w324": "ar", "lataif:w325": "ar", "lataif:w326": "ar", "lataif:w327": "ar",
  "lataif:w328": "ar", "lataif:w329": "ar", "lataif:w330": "ar", "lataif:w331": "ar",
  "lataif:w332": "ar", "lataif:w334": "ar", "lataif:w337": "ar", "lataif:w338": "ar",
  "lataif:w339": "ar", "lataif:w341": "ar", "lataif:w342": "ar", "lataif:w343": "ar",
  "lataif:w344": "ar", "lataif:w345": "ar", "lataif:w346": "ar", "lataif:w347": "ar",
  "lataif:w349": "ar", "lataif:w351": "ar", "lataif:w352": "ar", "lataif:w353": "ar",
  "lataif:w354": "ar", "lataif:w355": "ar", "lataif:w356": "ar", "lataif:w358": "ar",
  "lataif:w359": "ar", "lataif:w360": "ar", "lataif:w362": "ar", "lataif:w363": "ar",
  "lataif:w364": "ar", "lataif:w365": "ar", "lataif:w366": "ar", "lataif:w367": "ar",
  "lataif:w368": "ar", "lataif:w369": "ar", "lataif:w370": "ar", "lataif:w371": "ar",
  "lataif:w372": "ar", "lataif:w373": "ar", "lataif:w374": "ar", "lataif:w375": "ar",
  "lataif:w376": "ar", "lataif:w377": "ar", "lataif:w378": "ar", "lataif:w379": "ar",
  "lataif:w380": "ar", "lataif:w381": "ar", "lataif:w382": "ar", "lataif:w383": "ar",
  "lataif:w384": "ar", "lataif:w385": "ar", "lataif:w387": "ar", "lataif:w388": "ar",
  "lataif:w389": "ar", "lataif:w390": "ar", "lataif:w391": "ar", "lataif:w392": "ar",
  "lataif:w393": "ar", "lataif:w394": "ar", "lataif:w395": "ar", "lataif:w396": "ar",
  "lataif:w397": "ar", "lataif:w399": "ar", "lataif:w400": "ar", "lataif:w402": "ar",
  "lataif:w403": "ar", "lataif:w404": "ar", "lataif:w406": "ar", "lataif:w407": "ar",
  "lataif:w408": "ar", "lataif:w409": "ar", "lataif:w410": "ar", "lataif:w411": "ar",
  "lataif:w412": "ar", "lataif:w413": "ar", "lataif:w414": "ar", "lataif:w415": "ar",
  "lataif:w416": "ar", "lataif:w418": "ar", "lataif:w419": "ar", "lataif:w420": "ar",
  "lataif:w421": "ar", "lataif:w422": "ar", "lataif:w423": "ar", "lataif:w424": "ar",
  "lataif:w425": "ar", "lataif:w426": "ar", "lataif:w428": "ar", "lataif:w429": "ar",
  "lataif:w430": "ar", "lataif:w432": "ar", "lataif:w434": "ar", "lataif:w436": "ar",
  "lataif:w437": "ar", "lataif:w439": "ar", "lataif:w440": "ar", "lataif:w441": "ar",
  "lataif:w442": "ar", "lataif:w443": "ar", "lataif:w444": "ar", "lataif:w445": "ar",
  "lataif:w446": "ar", "lataif:w447": "ar", "lataif:w448": "ar", "lataif:w449": "ar",
  "lataif:w450": "ar", "lataif:w451": "ar", "lataif:w452": "ar", "lataif:w453": "ar",
  "lataif:w454": "ar", "lataif:w456": "ar", "lataif:w457": "ar", "lataif:w458": "ar",
  "lataif:w460": "ar", "lataif:w461": "ar", "lataif:w462": "ar", "lataif:w463": "ar",
  "lataif:w464": "ar", "lataif:w465": "ar", "lataif:w466": "ar", "lataif:w467": "ar",
  "lataif:w469": "ar", "lataif:w471": "ar", "lataif:w472": "ar", "lataif:w475": "ar",
  "lataif:w476": "ar", "lataif:w477": "ar", "lataif:w478": "ar", "lataif:w479": "ar",
  "lataif:w480": "ar", "lataif:w481": "ar", "lataif:w484": "ar", "lataif:w485": "ar",
  "lataif:w486": "ar", "lataif:w487": "ar", "lataif:w488": "ar", "lataif:w489": "ar",
  "lataif:w491": "ar", "lataif:w492": "ar", "lataif:w493": "ar", "lataif:w494": "ar",
  "lataif:w495": "ar", "lataif:w496": "ar", "lataif:w497": "ar", "lataif:w499": "ar",
  "lataif:w500": "ar", "lataif:w501": "ar", "lataif:w502": "ar", "lataif:w504": "ar",
  "lataif:w505": "ar", "lataif:w506": "ar", "lataif:w507": "ar", "lataif:w508": "ar",
  "lataif:w510": "ar", "lataif:w511": "ar", "lataif:w512": "ar", "lataif:w513": "ar",
  "lataif:w514": "ar", "lataif:w516": "ar", "lataif:w517": "ar", "lataif:w518": "ar",
  "lataif:w519": "ar", "lataif:w521": "ar", "lataif:w522": "ar", "lataif:w523": "ar",
  // Lataif with Tafsir al-Sa'di quotations (src/data/quranLataif.ts) — all 16 kept are shown
  "lataif:q33-41": "ar+en", "lataif:q39-53": "ar+en", "lataif:q94-5": "ar+en", "lataif:q3-134": "ar+en",
  "lataif:q41-34": "ar+en", "lataif:q7-205": "ar+en", "lataif:q16-53": "ar+en", "lataif:q39-10": "ar+en",
  "lataif:q16-18": "ar+en", "lataif:q70-5": "ar+en", "lataif:q14-7": "ar+en", "lataif:q49-10": "ar+en",
  "lataif:q11-115": "ar+en", "lataif:q4-86": "ar+en", "lataif:q93-11": "ar+en", "lataif:q39-9": "ar+en",
};
