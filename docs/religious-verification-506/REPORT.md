# DITHAR — strict verification of the 506 Approved items

Date: 2026-10-31. The verification itself was read-only; the 34 items it flagged were then corrected from their cited sources and rechecked (see «Corrections applied»). Method, rules and access notes: [README.md](README.md). Machine-readable: [report.csv](report.csv), [progress.json](progress.json).

## Summary

| Category | Verified | Needs Correction | Unverified | Rejected | Total |
|---|---|---|---|---|---|
| Hadith | 158 | 0 | 0 | 0 | 158 |
| Wamadat | 332 | 0 | 0 | 0 | 332 |
| Saadi Lataif | 16 | 0 | 0 | 0 | 16 |
| **All** | **506** | **0** | **0** | **0** | **506** |

## Sources opened

- Qur'an: Tanzil `quran-simple` (tanzil.net). Saheeh International: quran.com API (resource 20).
- Hadith: fawazahmed0/hadith-api (Arabic and English editions with graders' grades); OpenITI transcriptions of printed editions: Sahih Muslim (Abd al-Baqi), al-Mustadrak (Ata, DKI), al-Adab al-Mufrad (Abd al-Baqi), Ibn Hajar's al-Talkhis al-Habir, al-Iraqi's al-Mughni.
- Tafsir: spa5k/tafsir_api per-verse texts of Ibn Kathir, al-Tabari, al-Kashshaf, Ibn Ashur, al-Bahr al-Muhit, al-Sa'di; OpenITI transcriptions of al-Raghib's Mufradat (Kilani) and Ibn al-Qayyim's Madarij, Tariq al-Hijratayn, Ighatha (al-Fiqi), al-Fawa'id, Bada'i al-Fawa'id, Zad al-Ma'ad (al-Arna'ut); al-Sa'di also via quran.com tafsir 91 and OpenITI (altafsir.com).

**Access limits.** sunnah.com and dorar.net refuse automated requests (HTTP 403) and were not used. No printed edition of Tafsir al-Sa'di was available (three independent digital texts agree). Grading credits that point to works not openable here (al-Albani's Sahih al-Jami' and al-Silsila, al-Albani's Sahih al-Adab al-Mufrad, al-Mundhiri, al-Arna'ut on al-Adab al-Mufrad) could not be confirmed; where a credit depends on them the item is Needs Correction (see README). The English of Wamadat and of most enriched hadiths is not shown in the app and was not assessed.

## Corrections applied (2026-10-31)

34 items were corrected, each from its cited source, and rechecked independently (tools/recheck34.py, batches/recheck-34.json). Backup taken before editing: backups/corrections-34-20261031T111550Z/.

### 103 — أبو داود 561، الترمذي 223 — fixed: grade
- `gradingSourceAr` before: حسّنه الترمذي وصححه الألباني في صحيح أبي داود
- `gradingSourceAr` after: صححه الألباني في صحيح أبي داود
- Recheck: al-Albani: Sahih (Abu Dawud 561); the unsupported «حسّنه الترمذي» removed.

### 105 — 3116 — fixed: grade
- `gradingSourceAr` before: صححه الألباني في صحيح أبي داود، والحاكم ووافقه الذهبي
- `gradingSourceAr` after: صححه الألباني في صحيح أبي داود، وقال الحاكم: صحيح الإسناد
- Recheck: al-Albani: Sahih (Abu Dawud 3116); al-Hakim «صحيح الإسناد» (al-Mustadrak 1299); unconfirmed «ووافقه الذهبي» removed.

### 111 — 594 — fixed: grade
- `gradingSourceAr` before: حسّنه الألباني وابن حجر (سنده حسن) والعراقي (سند جيد) والأرناؤوط (حسن بشواهده)
- `gradingSourceAr` after: قال ابن حجر: إسناده حسن، وقال العراقي: بسند جيد
- Recheck: Ibn Hajar, al-Talkhis al-Habir 1315 «وإسناده حسن»; al-Iraqi, al-Mughni 1453 «بسند جيد»; unopened al-Albani/al-Arnaut credits removed.

### 112 — 2390 — fixed: grade
- `gradingSourceAr` before: صححه الترمذي والألباني في صحيح الترمذي وصحيح الجامع
- `gradingSourceAr` after: صححه الترمذي والألباني في صحيح الترمذي
- Recheck: al-Tirmidhi 2390 «حسن صحيح»; al-Albani: Sahih; unopened «صحيح الجامع» removed.

### 114 — أبو داود 4941، الترمذي 1924 — fixed: grade
- `gradingSourceAr` before: صححه الترمذي والحاكم، وحسّنه الألباني في صحيح الترمذي وصححه في السلسلة الصحيحة (925)
- `gradingSourceAr` after: صححه الترمذي والألباني
- Recheck: al-Tirmidhi 1924 «حسن صحيح»; al-Albani: Sahih; the contradicted «حسّنه الألباني» and unconfirmed al-Hakim/al-Silsila credits removed.

### 137 — 2618 — fixed: hadith-wording
- `textAr` before: عن أبي برزة الأسلمي رضي الله عنه قال: قلت: يا رسول الله، علّمني شيئاً أنتفع به. قال: «اعزل الأذى عن طريق المسلمين»
- `textAr` after: عن أبي برزة الأسلمي رضي الله عنه قال: قلت: يا نبي الله، علّمني شيئاً أنتفع به. قال: «اعزل الأذى عن طريق المسلمين»
- Recheck: Muslim 2618: «يا نبي الله، علّمني شيئاً أنتفع به… اعزل الأذى عن طريق المسلمين».

### 142 — 2139 — fixed: grade
- `gradingSourceAr` before: حسّنه الترمذي، وصححه الألباني في صحيح الترمذي وصحيح الجامع
- `gradingSourceAr` after: حسّنه الترمذي والألباني في صحيح الترمذي
- Recheck: al-Tirmidhi 2139 «حسن غريب»; al-Albani: Hasan; the contradicted «صححه الألباني» and «صحيح الجامع» removed.

### 148 — 3479 — fixed: grade
- `gradingSourceAr` before: حسّنه الألباني في صحيح الترمذي وصحيح الجامع (245)
- `gradingSourceAr` after: حسّنه الألباني في صحيح الترمذي
- Recheck: al-Albani: Hasan (Tirmidhi 3479); unopened «صحيح الجامع (245)» removed.

### 52 — 4800 — fixed: grade
- `gradingSourceAr` before: حسّنه الألباني في صحيح أبي داود وصحيح الجامع (1464)، وقال المنذري: لا ينزل عن درجة الحسن وقد يكون على شرط الصحيحين أو أحدهما
- `gradingSourceAr` after: حسّنه الألباني في صحيح أبي داود
- Recheck: al-Albani: Hasan (Abu Dawud 4800).

### 70 — المستدرك للحاكم 58 — fixed: reference
- `referenceAr` before: صححه الحاكم
- `referenceAr` after: المستدرك للحاكم 58
- Recheck: al-Mustadrak (Ata ed.) no. 58 holds the hadith; reference now «المستدرك للحاكم 58».

### 71 — 1893 — fixed: hadith-wording
- `textAr` before: عن أبي مسعود عقبة بن عمرو الأنصاري رضي الله عنه أن رجلاً جاء إلى النبي صلى الله عليه وسلم فقال: يا رسول الله، انقطعت بي الحمولة فاحملني، فقال: «ما عندي»، فقال رجل: يا رسول الله، أنا أدله على من يحمله، فقال رسول الله صلى الله عليه وسلم: «من دلّ على خير فله مثل أجر فاعله»
- `textAr` after: عن أبي مسعود عقبة بن عمرو الأنصاري رضي الله عنه أن رجلاً جاء إلى النبي صلى الله عليه وسلم فقال: إني أُبدِع بي فاحملني، فقال: «ما عندي»، فقال رجل: يا رسول الله، أنا أدله على من يحمله، فقال رسول الله صلى الله عليه وسلم: «من دلّ على خير فله مثل أجر فاعله»
- Recheck: Muslim 1893: «إني أُبدِع بي فاحملني»; both quoted sayings verbatim.

### 77 — البخاري 110، مسلم (المقدمة، حديث متواتر) — fixed: hadith-wording, reference
- `textAr` before: عن أنس بن مالك وأبي هريرة وسلمة بن الأكوع والمغيرة بن شعبة رضي الله عنهم أن رسول الله صلى الله عليه وسلم قال: «من كذب علي متعمداً فليتبوأ مقعده من النار»
- `textAr` after: عن أبي هريرة رضي الله عنه قال: قال رسول الله صلى الله عليه وسلم: «من كذب علي متعمداً فليتبوأ مقعده من النار»
- `narratorAr` before: جمع من الصحابة، منهم أنس بن مالك وأبو هريرة
- `narratorAr` after: أبو هريرة رضي الله عنه
- Recheck: Abu Hurayra in both chains; «من كذب علي متعمداً فليتبوأ مقعده من النار» verbatim in Bukhari 110 and in Muslim's introduction (hadith-api ara-muslim no. 4).

### 9 — البخاري 481، مسلم 2585 — fixed: hadith-wording
- `textAr` before: عن أبي موسى الأشعري رضي الله عنه عن النبي صلى الله عليه وسلم قال: «إن المؤمن للمؤمن كالبنيان يشد بعضه بعضاً» وشبّك بين أصابعه
- `textAr` after: عن أبي موسى الأشعري رضي الله عنه عن النبي صلى الله عليه وسلم قال: «إن المؤمن للمؤمن كالبنيان يشد بعضه بعضاً» وشبّك أصابعه
- Recheck: Bukhari 481 reads «وشبّك أصابعه»; the quote is verbatim there.

### bukhari-6116 — البخاري 6116 — fixed: english
- `meaningEn` before: A man said to the Prophet ﷺ: "Advise me." He said: "Do not become angry." The man repeated (his request) several times, and he said: "Do not become angry."
- `meaningEn` after: Narrated Abu Huraira: A man said to the Prophet (ﷺ), "Advise me!" The Prophet (ﷺ) said, "Do not become angry and furious." The man asked (the same) again and again, and the Prophet (ﷺ) said in each case, "Do not become angry and furious."
- Recheck: Verbatim Muhsin Khan (hadith-api eng-bukhari 6116), labelled as such.

### Wamada 30 — سورة النساء – الآية 147 — fixed: reflection-attribution
- `insightAr` before: انتفاء رغبة التعذيب والتودد الإلهي البديع؛ استفهام إنكاري يقدم دلالة عقدية ونفسية هامة: الله عز وجل غني عن عذاب البشر ولا يتلذذ بآلامهم، فالتكاليف والعقوبات لم تأتِ للإعنات، بل إن التزام العبد بالركيزتين (الشكر باللسان والجوارح، والإيمان بالقلب) كفيل برفع البلاء واستقرار العافية، ووصف الله نفسه بـ {شَاكِرًا} تودداً وتقديراً لجهد العبد الضعيف.
- `insightAr` after: انتفاء رغبة التعذيب؛ استفهام إنكاري يقدم دلالة عقدية ونفسية هامة: الله عز وجل غني عن عذاب البشر ولا يتلذذ بآلامهم، فالتكاليف والعقوبات لم تأتِ للإعنات، بل إن التزام العبد بالركيزتين (الشكر باللسان والجوارح، والإيمان بالقلب) كفيل برفع البلاء واستقرار العافية، ووصف الله نفسه بـ {شَاكِرًا}: «مثيباً موفياً أجوركم».
- Recheck: Cited work now «الكشاف - الزمخشري»; quoted wording verbatim in it at 4:147: «مثيباً موفياً أجوركم»; the unsupported claim (تودد) removed.

### Wamada 49 — سورة الأنفال – الآية 24 — fixed: reflection-attribution
- `insightAr` before: خطورة التقلب وحيلولة القلب الخفية؛ تحذير مرعب لقلب العبد؛ فالقلب سريّ التقلب لدرجة أن الله تبارك وتعالى بقدرته قد يحول بين الإنسان وبين إرادته ونواياه إذا تمادى في الغي، فيسلب منه التوفيق أو يثبته على الحق بفضله. وكان كثر دعاء النبي : "يا مقلب القلوب ثبت قلبي على دينك" حذراً من هذه الحيلولة القدرية.
- `insightAr` after: خطورة التقلب وحيلولة القلب الخفية؛ تحذير مرعب لقلب العبد؛ فالقلب سريّ التقلب لدرجة أن الله تبارك وتعالى بقدرته قد يحول بين الإنسان وبين إرادته ونواياه. وكانت أكثر يمين النبي ﷺ: «لا ومقلب القلوب».
- Recheck: Cited work now «طريق الهجرتين - ابن القيم»; quoted wording verbatim in it at 8:24: «لا ومقلب القلوب»; the unsupported claim (تمادى, ثبت قلبي) removed.

### Wamada 76 — سورة يوسف – الآية 86 — fixed: reflection-attribution
- `insightAr` before: الفرق النفسي الدقيق بين البث والحزن؛ "البث" هو أشد الحزن الذي لا يطيق صاحبه كتمانه فيفيض منه ويبثه للآخرين، أما "الحزن" فهو ما يضمره المرء في قلبه وينطوي عليه. فسكب يعقوب عليه السلام ما ظهر من ألمه وما بطن في شكواه لله وحده، ليعلمنا أدب الشكوى للخالق لا المخلوق.
- `insightAr` after: "البث" هو أشد الحزن الذي لا يطيق صاحبه كتمانه فيفيض منه ويبثه للآخرين. فسكب يعقوب عليه السلام شكواه لله وحده، ليعلمنا أدب الشكوى للخالق لا المخلوق.
- Recheck: Cited work now «الكشاف - الزمخشري»; no quotation; the unsupported claim (يضمره) removed.

### Wamada 116 — سورة الإسراء – الآية 30 — fixed: quran-verse
- `ayah` before: {إِنَّ رَبَّكَ يَبْسُطُ الرِّزْق لمن يَشَاءُ وَيَقْدِرُ إِنَّهُ كَانَ بِعِبَادِهِ خَبِيرًا بَصِيرًا} [الآية 30]
- `ayah` after: {إِنَّ رَبَّكَ يَبْسُطُ الرِّزْقَ لِمَن يَشَاءُ وَيَقْدِرُ إِنَّهُ كَانَ بِعِبَادِهِ خَبِيرًا بَصِيرًا} [الآية 30]
- Recheck: Verse now letter-and-vowel identical to Tanzil 17:30.

### Wamada 130 — سورة الكهف – الآية 79 — fixed: quran-verse
- `ayah` before: {أَمَّا السَّفِينَةُ فَكَانَتْ لِمَسَاكِينَ يَعْمَلُونَ فِي الْبَحْرِ فَأَرَدتُّ أَنْ أَعِيبَهَا وَكَانَ وَرَاءهُم مَّلِكٌ يَأْخُذُ كُلَّ سَفِينَةٍ غَصْبًا} [الآية 79]
- `ayah` after: {أَمَّا السَّفِينَةُ فَكَانَتْ لِمَسَاكِينَ يَعْمَلُونَ فِي الْبَحْرِ فَأَرَدتُّ أَنْ أَعِيبَهَا وَكَانَ وَرَاءَهُم مَّلِكٌ يَأْخُذُ كُلَّ سَفِينَةٍ غَصْبًا} [الآية 79]
- Recheck: Verse now letter-and-vowel identical to Tanzil 18:79.

### Wamada 155 — سورة المائدة – الآية 23 — fixed: reflection-attribution
- `insightAr` before: أخلاق الشجاعة وبذل السبب الاستراتيجي؛ في مقابل الهزيمة الجماعية، قام رجلان صالحان (يوشع بن نون وكالب بن يوفنا) يملكان رصيداً باطناً من التقوى والخوف الإلهي ({مِنَ الَّذِينَ يَخَافُونَ}) فمنحهما الله ثباتاً وبصيرة، ووضعا الخطة العسكرية المعتمدة على المفاجأة واقتحام خطوط العدو ({ادْخُلُوا عَلَيْهِمُ الْبَابَ}) والتوكل، فالنصر مع بذل السبب الذكي.
- `insightAr` after: أخلاق الشجاعة؛ في مقابل الهزيمة الجماعية، قام رجلان صالحان (يوشع بن نون وكالب بن يوفنا) يملكان رصيداً باطناً من التقوى والخوف الإلهي ({مِنَ الَّذِينَ يَخَافُونَ}) فمنحهما الله ثباتاً وبصيرة، وقالا: {ادْخُلُوا عَلَيْهِمُ الْبَابَ}، أي: «متى توكلتم على الله واتبعتم أمره، ووافقتم رسوله، نصركم الله على أعدائكم».
- Recheck: Cited work now «تفسير ابن كثير»; quoted wording verbatim in it at 5:23: «متى توكلتم على الله واتبعتم أمره، ووافقتم رسوله، نصركم الله على أعدائكم»; the unsupported claim (المفاجأة, الخطة) removed.

### Wamada 165 — سورة المائدة – الآية 45 — fixed: reflection-attribution
- `insightAr` before: تفصيل القصاص الجنائي الدقيق حماية للبشر؛ وضعت الآية معياراً صارماً وقاسياً للعدالة والقصاص في الاعتداءات الجسدية؛ فكل عضو بشري يُتلف عمداً يُقابل بمثله تماماً وبذات المساحة والجرح حساً دون تفرقة طبيقية أو عرقية، مما يمنع ثارات الجاهلية ويورث النفوس ارتداداً رادعاً عن إيذاء الآخرين.
- `insightAr` after: تفصيل القصاص الجنائي الدقيق حماية للبشر؛ وضعت الآية معياراً صارماً وقاسياً للعدالة والقصاص في الاعتداءات الجسدية؛ فكل عضو بشري يُتلف عمداً يُقابل بمثله تماماً وبذات المساحة والجرح حساً، مما يمنع ثارات الجاهلية ويورث النفوس ارتداداً رادعاً عن إيذاء الآخرين.
- Recheck: Cited work now «جامع البيان - الطبري»; no quotation; the unsupported claim (طبيقية) removed.

### Wamada 212 — سورة طه – الآيات 1–3 — fixed: reflection-attribution
- `insightAr` before: نفي الشقاء والربط بالسعادة؛ افتتحت السورة بتقرير غاية الوحي والرسالة: القرآن لم ينزل ليكون عبئاً، أو مشقة، أو شقاءً نفسياً وبدنياً على البشر {مَا أَنزَلْنَا عَلَيْكَ الْقُرْآنَ لِتَشْقَى }، بل هو محض بوابة للسكينة والسعادة والراحة، والنفوس الواجلة الخاشعة هي الأسرع تذكراً وانتفاعاً به.
- `insightAr` after: نفي الشقاء؛ افتتحت السورة بملاطفة النبي ﷺ: القرآن لم ينزل عليه ليكون عبئاً أو مشقة {مَا أَنزَلْنَا عَلَيْكَ الْقُرْآنَ لِتَشْقَى }، بل تذكرة لمن يخشى، والنفوس الواجلة الخاشعة هي الأسرع تذكراً وانتفاعاً به.
- Recheck: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (البشر, السعادة) removed.

### Wamada 239 — سورة الفرقان – الآية 20 — fixed: reflection-attribution
- `insightAr` before: قانون الاختلاف الاجتماعي والمواساة؛ وضعت الآية سنة إلهية في العلاقات البشرية: جعل الله تفاوت الناس في الأرزاق، والصحة، والمناصب، والأخلاق ابتلاءً متبادلاً؛ فالغني فتنة للفقير، والظالم فتنة للمظلوم، والمريض فتنة للصحيح؛ ليرى الله من يلتزم بالصبر وحفظ الحقوق {أَتَصْبِرُونَ}، وهو تشخيص يرفع القلق الاجتماعي.
- `insightAr` after: قانون الاختلاف الاجتماعي والمواساة؛ وضعت الآية سنة إلهية في العلاقات البشرية: جعل الله تفاوت الناس ابتلاءً متبادلاً؛ ليرى الله من يلتزم بالصبر وحفظ الحقوق {أَتَصْبِرُونَ}، وهو تشخيص يرفع القلق الاجتماعي.
- Recheck: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (الغني فتنة) removed.

### Wamada 260 — سورة الدخان – الآيتان 3–4 — fixed: reflection-attribution
- `insightAr` before: ليلة الحسابات السنوية للأقدار؛ "يفرق" أي يفصل ويُكتب. في ليلة القدر المباركة يُنسخ من اللوح المحفوظ إلى صحف الملائكة الحفظة تفاصيل أقدار البشر السنوية القادمة: من يعيش، من يموت، من يفتقر، ومن يغتني، وهي دعوة للنفس لتقاد الطاعات في تلك الليلة ليكون قدرها سعيداً.
- `insightAr` after: ليلة الحسابات السنوية للأقدار؛ "يفرق" أي يُقضى ويُفصل. في ليلة القدر المباركة «يُقضى ويُفصل كل أمر أحكمه الله تعالى في تلك السنة»: من يعيش، من يموت، من يفتقر، ومن يغتني، وهي دعوة للنفس لتقاد الطاعات في تلك الليلة ليكون قدرها سعيداً.
- Recheck: Cited work now «جامع البيان - الطبري»; quoted wording verbatim in it at 44:3: «يُقضى ويُفصل كل أمر أحكمه الله تعالى في تلك السنة»; the unsupported claim (اللوح المحفوظ) removed.

### Wamada 278 — سورة النجم – الآيتان 17–18 — fixed: reflection-attribution
- `insightAr` before: ثبات الأدب النبوي في المعراج؛ مدح الله تعالى بصر نبيه بالانضباط التام والأدب السامي في حضرة جلال السماوات؛ فلم يمل بصره يمنة أو يسرة استشرافاً ({مَا زَاغَ})، ولم يتجاوز حدود ما أُذن له برؤيته ({وَمَا طَغَى }). وهو توجيه للنفس البشرية بحفظ الأدب والخشوع عند المثول بين يدي الله.
- `insightAr` after: صدق الرؤية النبوية في المعراج؛ رأى ﷺ «رؤية لا خطأ فيها ولا زيادة على ما وصف»: فـ{مَا زَاغَ} «أي: ما مال بصره إلى مرئي آخر غير ما ذكر»، و{وَمَا طَغَى } من «الطغيان: تجاوز الحد».
- Recheck: Cited work now «التحرير والتنوير - ابن عاشور»; quoted wording verbatim in it at 53:17: «رؤية لا خطأ فيها ولا زيادة على ما وصف» / «أي: ما مال بصره إلى مرئي آخر غير ما ذكر» / «الطغيان: تجاوز الحد»; the unsupported claim (الأدب) removed.

### Wamada 286 — سورة المجادلة – الآية 1 — fixed: reflection-attribution
- `insightAr` before: نصرة الضعيف وسماع الشكوى المباشرة؛ نزلت في خولة بنت ثعلبة وهي تشتكي نبي الله. تروي عائشة أنها كانت في كنف البيت ويخفى عليها بعض كلام خولة، بينما الله من فوق سبع سماوات سمع حوارها الضعيف ونصر مظلمتها وشرّع لأجلها أحكاماً تتلى، دلالة على إحاطة سمعه ونصرته للمنكسرين.
- `insightAr` after: نصرة الضعيف وسماع الشكوى المباشرة؛ نزلت في خولة بنت مالك بن ثعلبة وهي تجادل النبي ﷺ في زوجها وتشتكي إلى الله، فسمع الله حوارها ونصر مظلمتها وشرّع لأجلها أحكاماً تتلى، دلالة على إحاطة سمعه ونصرته للمنكسرين.
- Recheck: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (عائشة) removed.

### Wamada 296 — سورة التحريم – الآية 6 — fixed: reflection-attribution
- `insightAr` before: ترتيب الأولويات التربوية؛ بدأ الله بالأمر بوقاية النفس أولاً {أَنفُسَكُمْ} ثم الأهل {وَأَهْلِيكُمْ}، لأن فاقد الشيء لا يعطيه. فالإنسان لا يمكنه إصلاح أسرته أو مجتمعه إلا إذا بدأ أولاً بزكاة وتأديب وتقويم نفسه على طاعة الله.
- `insightAr` after: وقاية النفس والأهل؛ أمر الله المؤمنين بوقاية {أَنفُسَكُمْ} و{وَأَهْلِيكُمْ}: أي «واعملوا بطاعة الله»، و«علموا أهليكم من العمل بطاعة الله ما يقون به أنفسهم من النار».
- Recheck: Cited work now «جامع البيان - الطبري»; quoted wording verbatim in it at 66:6: «واعملوا بطاعة الله» / «علموا أهليكم من العمل بطاعة الله ما يقون به أنفسهم من النار»; the unsupported claim (فاقد الشيء) removed.

### Wamada 347 — سورة آل عمران – الآية 19 — fixed: reflection-attribution
- `insightAr` before: {بَغْيًا}؛ معناها: حسداً، وتعدياً، وظلماً، وطلباً للمكاسب والريادة المادية رغماً عن وضوح الحجة الفكرية.
- `insightAr` after: {بَغْيًا}؛ معناها: حسداً، وتعدياً، وظلماً رغماً عن وضوح الحجة الفكرية.
- Recheck: Cited work now «تفسير ابن كثير»; no quotation; the unsupported claim (المكاسب) removed.

### Wamada 432 — سورة النمل – الآية 28 — fixed: reflection-attribution
- `insightAr` before: {يَرْجِعُونَ}؛ معناها: يردون ويعيدون من جواب فكري أو سياسي على الخطاب.
- `insightAr` after: {يَرْجِعُونَ}؛ معناها: ما «يرجع بعضهم إلى بعض» من القول.
- `source` before: جامع البيان - الطبري.
- `source` after: الكشاف - الزمخشري.
- Recheck: Cited work now «الكشاف - الزمخشري»; quoted wording verbatim in it at 27:28: «يرجع بعضهم إلى بعض»; the unsupported claim (سياسي) removed.

### Wamada 462 — سورة الواقعة – الآية 19 — fixed: quran-verse
- `ayah` before: {لَا يَصْدَعُونَ عَنْهَا وَلَا يُنزِفُونَ} [الآية 19]
- `ayah` after: {لَّا يُصَدَّعُونَ عَنْهَا وَلَا يُنزِفُونَ} [الآية 19]
- Recheck: Verse now letter-and-vowel identical to Tanzil 56:19.

### Wamada 469 — سورة الطلاق – الآية 4 — fixed: reflection-attribution
- `insightAr` before: {إِنِ ارْتَبْتُمْ}؛ معناها: إن شككتم وجهلتم حُكم عدتهن الشرعية لعدم معرفة قواعد انقطاع الدم أو السن الفسيولوجي المادي.
- `insightAr` after: {إِنِ ارْتَبْتُمْ}؛ معناها: إن شككتم وجهلتم حُكم عدتهن الشرعية فلم تدروا ما هنّ.
- Recheck: Cited work now «جامع البيان - الطبري»; no quotation; the unsupported claim (الفسيولوجي) removed.

### Wamada 501 — سورة القدر – الآية 1 — fixed: reflection-attribution
- `insightAr` before: {الْقَدْرِ}؛ معناها: الشرف والمنزلة العالية السامية، وتأتي بمعنى التضييق أو تقدير وفصل تفاصيل الأقدار السنوية للبشر.
- `insightAr` after: {الْقَدْرِ}؛ معناها: الشرف والمنزلة العالية السامية.
- Recheck: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (التضييق) removed.

### Saadi q39-10 — سورة الزمر، الآية 10 — fixed: english
- `verseEn` before: Indeed, the patient will be given their reward without account
- `verseEn` after: Indeed, the patient will be given their reward without account [i.e., limit]
- Recheck: Now verbatim Saheeh International (quran.com resource 20), bracketed note included.

### Saadi q94-5 — سورة الشرح، الآية 5–6 — fixed: english
- `verseEn` before: For indeed, with hardship [will be] ease Indeed, with hardship [will be] ease
- `verseEn` after: For indeed, with hardship [will be] ease [i.e., relief]. Indeed, with hardship [will be] ease
- Recheck: Now verbatim Saheeh International (quran.com resource 20), bracketed note included.

## Items needing correction

None — all 506 items are Verified.

## All 506 items

Each row: status, then every check with its result and evidence; links are the opened sources.


### Hadith

**10 — البخاري 6011، مسلم 2586** (`hadith:10`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2586; Companion named in the chain. Bukhari 6011: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6011.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6586.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6011, muslim 2586, muslim-JK 2586 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6011.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6586.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6011.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6586.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**102 — 634** (`hadith:102`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 634, including «يعني الفجر والعصر»; Companion Umara b. Ruwayba (via his son). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1436.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 634, muslim-JK 634 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1436.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1436.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**103 — أبو داود 561، الترمذي 223** (`hadith:103`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 223 and Abu Dawud 561; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/223.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/561.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 223, abudawud 561 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/223.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/561.json
- ✓ grade: Corrected 2026-10-31 and rechecked: al-Albani: Sahih (Abu Dawud 561); the unsupported «حسّنه الترمذي» removed. (Before correction: «صحيح» confirmed by al-Albani (Abu Dawud 561, Tirmidhi 223), but the credit «حسّنه الترمذي» is wrong: al-Tirmidhi 223 says «هذا حديث غريب من هذا الوجه مرفوع، هو صحيح مسند وموقوف…», not «حسن».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/223.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/561.json

**105 — 3116** (`hadith:105`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Abu Dawud 3116; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/3116.json
- ✓ reference: Cited number(s) found and hold this hadith: abudawud 3116 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/3116.json
- ✓ grade: Corrected 2026-10-31 and rechecked: al-Albani: Sahih (Abu Dawud 3116); al-Hakim «صحيح الإسناد» (al-Mustadrak 1299); unconfirmed «ووافقه الذهبي» removed. (Before correction: «صحيح» confirmed: al-Albani Sahih (Abu Dawud 3116); al-Hakim «صحيح الإسناد» (al-Mustadrak 1299, 1842). «ووافقه الذهبي» not confirmed: no al-Dhahabi note at either place in the opened edition.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/3116.json

**107 — البخاري 5997، مسلم 2318** (`hadith:107`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 5997; Muslim 2318 same Companion, shorter wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5997.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6028.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5997, muslim 2318, muslim-JK 2318 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5997.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6028.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5997.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6028.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**108 — 2072** (`hadith:108`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 2072; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2072.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2072 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2072.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2072.json

**109 — البخاري 1427، مسلم 1034** (`hadith:109`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 1427; Companion named in the chain. Muslim 1034: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1427.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2386.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1427, muslim 1034, muslim-JK 1034 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1427.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2386.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1427.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2386.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**11 — البخاري 7376، مسلم 2319** (`hadith:11`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 7376; Companion named in the chain. Muslim 2319: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7376.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6030.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 7376, muslim 2319, muslim-JK 2319 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7376.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6030.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7376.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6030.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**110 — البخاري 5353، مسلم 2982** (`hadith:110`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2982; Companion named in the chain. Bukhari 5353: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5353.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7468.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5353, muslim 2982, muslim-JK 2982 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5353.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7468.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5353.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7468.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**111 — 594** (`hadith:111`) — **Verified**
- ✓ hadith-wording: Verbatim in al-Adab al-Mufrad no. 594 (ed. Abd al-Baqi, Dar al-Bashair; OpenITI JK000011), Abu Hurayra in the chain. — https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0256Bukhari/0256Bukhari.AdabMufrad/0256Bukhari.AdabMufrad.JK000011-ara1 · https://raw.githubusercontent.com/OpenITI/0875AH/master/data/0852IbnHajarCasqalani/0852IbnHajarCasqalani.TalkhisHabir/0852IbnHajarCasqalani.TalkhisHabir.JK000559-ara1 · https://raw.githubusercontent.com/OpenITI/0825AH/master/data/0806IbnHusaynZaynDinCiraqi/0806IbnHusaynZaynDinCiraqi.Mughni/0806IbnHusaynZaynDinCiraqi.Mughni.JK005021-ara1
- ✓ reference: Cited number(s) found and hold this hadith:  — https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0256Bukhari/0256Bukhari.AdabMufrad/0256Bukhari.AdabMufrad.JK000011-ara1 · https://raw.githubusercontent.com/OpenITI/0875AH/master/data/0852IbnHajarCasqalani/0852IbnHajarCasqalani.TalkhisHabir/0852IbnHajarCasqalani.TalkhisHabir.JK000559-ara1 · https://raw.githubusercontent.com/OpenITI/0825AH/master/data/0806IbnHusaynZaynDinCiraqi/0806IbnHusaynZaynDinCiraqi.Mughni/0806IbnHusaynZaynDinCiraqi.Mughni.JK005021-ara1
- ✓ grade: Corrected 2026-10-31 and rechecked: Ibn Hajar, al-Talkhis al-Habir 1315 «وإسناده حسن»; al-Iraqi, al-Mughni 1453 «بسند جيد»; unopened al-Albani/al-Arnaut credits removed. (Before correction: «حسن» confirmed: Ibn Hajar, al-Talkhis al-Habir 1315 «وإسناده حسن»; al-Iraqi, al-Mughni 1453 «بسند جيد» (he also reports, at 1749, that Ibn Adi weakened it). Not confirmable from an opened source: al-Albani and al-Arna'ut.) — https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0256Bukhari/0256Bukhari.AdabMufrad/0256Bukhari.AdabMufrad.JK000011-ara1 · https://raw.githubusercontent.com/OpenITI/0875AH/master/data/0852IbnHajarCasqalani/0852IbnHajarCasqalani.TalkhisHabir/0852IbnHajarCasqalani.TalkhisHabir.JK000559-ara1 · https://raw.githubusercontent.com/OpenITI/0825AH/master/data/0806IbnHusaynZaynDinCiraqi/0806IbnHusaynZaynDinCiraqi.Mughni/0806IbnHusaynZaynDinCiraqi.Mughni.JK005021-ara1

**112 — 2390** (`hadith:112`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 2390; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2390.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 2390 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2390.json
- ✓ grade: Corrected 2026-10-31 and rechecked: al-Tirmidhi 2390 «حسن صحيح»; al-Albani: Sahih; unopened «صحيح الجامع» removed. (Before correction: «صحيح» confirmed: al-Tirmidhi 2390 «حسن صحيح»; al-Albani Sahih. Not confirmable from an opened source: «صحيح الجامع».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2390.json

**114 — أبو داود 4941، الترمذي 1924** (`hadith:114`) — **Verified**
- ✓ hadith-wording: Verbatim in Tirmidhi 1924; Abu Dawud 4941 same Companion, slightly different wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1924.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4941.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 1924, abudawud 4941 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1924.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4941.json
- ✓ grade: Corrected 2026-10-31 and rechecked: al-Tirmidhi 1924 «حسن صحيح»; al-Albani: Sahih; the contradicted «حسّنه الألباني» and unconfirmed al-Hakim/al-Silsila credits removed. (Before correction: «صحيح» confirmed: al-Tirmidhi 1924 «حسن صحيح»; al-Albani Sahih. Wrong in the credit: «حسّنه الألباني في صحيح الترمذي» (his grade on record is Sahih). Not confirmable: al-Hakim (wording not found in al-Mustadrak) and «السلسلة الصحيحة (925)».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1924.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4941.json

**116 — 55** (`hadith:116`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 55; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/196.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 55, muslim-JK 55 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/196.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/196.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**117 — البخاري 15، مسلم 44** (`hadith:117`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 15; Companion named in the chain. Muslim 44: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/15.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/168.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 15, muslim 44, muslim-JK 44 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/15.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/168.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/15.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/168.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**118 — 1563** (`hadith:118`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 1563 (the Prophet's words, without Abu Qatada's story). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4000.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1563, muslim-JK 1563 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4000.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4000.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**12 — 2594** (`hadith:12`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2594; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6602.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2594, muslim-JK 2594 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6602.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6602.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**120 — 1054** (`hadith:120`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1054; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2426.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1054, muslim-JK 1054 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2426.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2426.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**123 — 2674** (`hadith:123`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2674; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6804.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2674, muslim-JK 2674 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6804.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6804.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**127 — البخاري 48، مسلم 64** (`hadith:127`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 48 and Muslim 64. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/48.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/221.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 48, muslim 64, muslim-JK 64 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/48.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/221.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/48.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/221.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**128 — 67** (`hadith:128`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 67; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/227.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 67, muslim-JK 67 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/227.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/227.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**13 — 2593** (`hadith:13`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 2593; the quote starts after the Prophet's address «يا عائشة». (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6601.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2593, muslim-JK 2593 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6601.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6601.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**134 — 1855** (`hadith:134`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1855; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4804.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1855, muslim-JK 1855 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4804.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4804.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**137 — 2618** (`hadith:137`) — **Verified**
- ✓ hadith-wording: Corrected 2026-10-31 and rechecked: Muslim 2618: «يا نبي الله، علّمني شيئاً أنتفع به… اعزل الأذى عن طريق المسلمين». (Before correction: The Prophet's words are verbatim in Muslim 2618, but the Companion's address is changed: app «يا رسول الله، علّمني شيئاً أنتفع به», Muslim 2618 «يا نبي الله، علّمني شيئاً أنتفع به».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6673.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2618, muslim-JK 2618 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6673.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6673.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**138 — 5027** (`hadith:138`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 5027; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5027.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5027 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5027.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5027.json

**139 — البخاري 61، مسلم 2811** (`hadith:139`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 61 (only «قال عبد الله» left out). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/61.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7098.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 61, muslim 2811, muslim-JK 2811 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/61.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7098.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/61.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7098.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**14 — البخاري 6114، مسلم 2609** (`hadith:14`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6114 and Muslim 2609; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6114.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6643.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6114, muslim 2609, muslim-JK 2609 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6114.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6643.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6114.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6643.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**140 — البخاري 6117، مسلم 37** (`hadith:140`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 37; Companion named in the chain. Bukhari 6117: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6117.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/156.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6117, muslim 37, muslim-JK 37 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6117.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/156.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6117.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/156.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**141 — 2144** (`hadith:141`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Ibn Majah 2144; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/2144.json
- ✓ reference: Cited number(s) found and hold this hadith: ibnmajah 2144 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/2144.json
- ✓ grade: Displayed «صحيح» confirmed: al-Albani Sahih (Ibn Majah 2144); al-Hakim «صحيح على شرط الشيخين» with al-Dhahabi «على شرط البخاري ومسلم» (al-Mustadrak 2134, Jabir; also 7924 «صحيح»). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/2144.json

**142 — 2139** (`hadith:142`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 2139; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2139.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 2139 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2139.json
- ✓ grade: Corrected 2026-10-31 and rechecked: al-Tirmidhi 2139 «حسن غريب»; al-Albani: Hasan; the contradicted «صححه الألباني» and «صحيح الجامع» removed. (Before correction: «حسن» confirmed: al-Tirmidhi 2139 «حسن غريب»; al-Albani Hasan. Wrong in the credit: «صححه الألباني» (his grade on record is Hasan). Not confirmable: «صحيح الجامع».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2139.json

**143 — 1164** (`hadith:143`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1164; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2758.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1164, muslim-JK 1164 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2758.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2758.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**145 — البخاري 1240، مسلم 2162** (`hadith:145`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 1240; Muslim 2162 same Companion, other order. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1240.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5650.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1240, muslim 2162, muslim-JK 2162 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1240.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5650.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1240.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5650.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**147 — 1006** (`hadith:147`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1006; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2329.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1006, muslim-JK 1006 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2329.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2329.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**148 — 3479** (`hadith:148`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 3479; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3479.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3479 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3479.json
- ✓ grade: Corrected 2026-10-31 and rechecked: al-Albani: Hasan (Tirmidhi 3479); unopened «صحيح الجامع (245)» removed. (Before correction: «حسن» confirmed: al-Albani Hasan (Tirmidhi 3479; al-Tirmidhi himself says «غريب»). Not confirmable from an opened source: «صحيح الجامع (245)».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3479.json

**15 — البخاري 6094، مسلم 2607** (`hadith:15`) — **Verified**
- ✓ hadith-wording: Verbatim in a Muslim 2607 narration; the final clause about lying («وما يزال الرجل يكذب…») is left out. Bukhari 6094 is the same Companion with other wording. (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6094.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6637.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6094, muslim 2607, muslim-JK 2607 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6094.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6637.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6094.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6637.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**150 — البخاري 7013، مسلم 523** (`hadith:150`) — **Verified**
- ✓ hadith-wording: Verbatim in a Muslim 523 narration; Bukhari 7013 same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7013.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1167.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 7013, muslim 523, muslim-JK 523 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7013.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1167.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7013.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1167.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**151 — البخاري 2697، مسلم 1718** (`hadith:151`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1718; Companion named in the chain. Bukhari 2697: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2697.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4492.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2697, muslim 1718, muslim-JK 1718 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2697.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4492.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2697.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4492.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**152 — 867** (`hadith:152`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 867; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2005.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 867, muslim-JK 867 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2005.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2005.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**153 — 1393** (`hadith:153`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 1393; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1393.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1393 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1393.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1393.json

**154 — 49** (`hadith:154`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 49 (without the Marwan context). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/177.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 49, muslim-JK 49 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/177.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/177.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**156 — البخاري 5641، مسلم 2573** (`hadith:156`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 5641 (Abu Said and Abu Hurayra together); Muslim 2573 same two Companions. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5641.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6568.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5641, muslim 2573, muslim-JK 2573 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5641.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6568.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5641.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6568.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**157 — 5645** (`hadith:157`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 5645. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5645.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5645 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5645.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5645.json

**16 — البخاري 33، مسلم 59** (`hadith:16`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 33; Companion named in the chain. Muslim 59: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/33.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/211.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 33, muslim 59, muslim-JK 59 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/33.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/211.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/33.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/211.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**160 — البخاري 5757، مسلم 2220** (`hadith:160`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 5757 and Muslim 2220; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5757.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5788.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5757, muslim 2220, muslim-JK 2220 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5757.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5788.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5757.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5788.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**162 — 1467** (`hadith:162`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1467; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3645.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1467, muslim-JK 1467 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3645.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3645.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**163 — البخاري 5090، مسلم 1466** (`hadith:163`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 5090; Companion named in the chain. Muslim 1466: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5090.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3635.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5090, muslim 1466, muslim-JK 1466 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5090.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3635.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5090.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3635.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**166 — 1162** (`hadith:166`) — **Verified**
- ✓ hadith-wording: Both answers verbatim in Muslim 1162 (part of Abu Qatada's longer hadith on fasting). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2746.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1162, muslim-JK 1162 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2746.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2746.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**168 — البخاري 1773، مسلم 1349** (`hadith:168`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 1773 and Muslim 1349; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1773.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3289.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1773, muslim 1349, muslim-JK 1349 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1773.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3289.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1773.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3289.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**169 — البخاري 1521، مسلم 1350** (`hadith:169`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 1521; Muslim 1350 same Companion («من أتى هذا البيت…»). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1521.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3291.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1521, muslim 1350, muslim-JK 1350 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1521.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3291.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1521.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3291.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**17 — 2588** (`hadith:17`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2588; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6592.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2588, muslim-JK 2588 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6592.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6592.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**173 — 3443** (`hadith:173`) — **Verified**
- ✓ hadith-wording: The supplication is verbatim in Tirmidhi 3443; the framing («كان إذا ودّع رجلاً») summarises Ibn Umar's report that the Prophet bade people farewell with it — not presented as a quotation. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3443.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3443 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3443.json
- ✓ grade: Displayed «صحيح» confirmed: al-Tirmidhi 3443 «حسن صحيح غريب»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3443.json

**174 — البخاري 6231، مسلم 2160** (`hadith:174`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 2160; Bukhari 6231 same Companion («يسلّم الصغير على الكبير…»). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6231.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5646.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6231, muslim 2160, muslim-JK 2160 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6231.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5646.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6231.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5646.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**176 — 6696** (`hadith:176`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6696; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6696.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6696 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6696.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6696.json

**18 — 2865** (`hadith:18`) — **Verified**
- ✓ hadith-wording: Verbatim within Muslim 2865 (the closing part of Iyad b. Himar's long sermon hadith). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7207.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2865, muslim-JK 2865 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7207.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7207.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**181 — البخاري 7158، مسلم 1717** (`hadith:181`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 7158; Muslim 1717 same Companion («لا يحكم أحد…»). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7158.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4490.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 7158, muslim 1717, muslim-JK 1717 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7158.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4490.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7158.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4490.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**186 — البخاري 7070، مسلم 98** (`hadith:186`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 7070 and Muslim 98. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7070.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/280.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 7070, muslim 98, muslim-JK 98 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7070.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/280.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/7070.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/280.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**19 — 91** (`hadith:19`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 91; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/265.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 91, muslim-JK 91 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/265.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/265.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**191 — 3461** (`hadith:191`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 3461. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3461.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 3461 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3461.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3461.json

**194 — 2956** (`hadith:194`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2956; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7417.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2956, muslim-JK 2956 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7417.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7417.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**195 — أبو داود 1052، الترمذي 500** (`hadith:195`) — **Verified**
- ✓ hadith-wording: Verbatim in Tirmidhi 500; Abu Dawud 1052 same Companion («تهاوناً بها» with slightly different wording). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/500.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/1052.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 500, abudawud 1052 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/500.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/1052.json
- ✓ grade: Displayed «حسن صحيح» confirmed: al-Tirmidhi 500 «حسن»; al-Albani Hasan Sahih (Abu Dawud 1052). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/500.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/1052.json

**196 — 553** (`hadith:196`) — **Verified**
- ✓ hadith-wording: The Prophet's words are verbatim in Bukhari 553 (reported by Burayda during a campaign). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/553.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 553 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/553.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/553.json

**197 — 82** (`hadith:197`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 82. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/246.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 82, muslim-JK 82 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/246.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/246.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**198 — 671** (`hadith:198`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 671; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1528.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 671, muslim-JK 671 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1528.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1528.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**199 — البخاري 9، مسلم 35** (`hadith:199`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 35; Companion named in the chain. Bukhari 9: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/9.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/152.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 9, muslim 35, muslim-JK 35 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/9.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/152.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/9.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/152.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**20 — 2699** (`hadith:20`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2699; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2699, muslim-JK 2699 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**28 — 3895** (`hadith:28`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 3895; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3895.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3895 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3895.json
- ✓ grade: Displayed «حسن صحيح» confirmed: al-Tirmidhi 3895 «حسن غريب صحيح»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3895.json

**29 — 1469** (`hadith:29`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1469; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3649.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1469, muslim-JK 1469 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3649.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3649.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**31 — 2999** (`hadith:31`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2999; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7500.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2999, muslim-JK 2999 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7500.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7500.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**32 — 2578** (`hadith:32`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2578; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6576.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2578, muslim-JK 2578 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6576.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6576.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**34 — 2699** (`hadith:34`) — **Verified**
- ✓ hadith-wording: One self-contained clause of Muslim 2699, verbatim. (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2699, muslim-JK 2699 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6853.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**35 — 2564** (`hadith:35`) — **Verified**
- ✓ hadith-wording: One self-contained clause of Muslim 2564, verbatim. (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6541.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2564, muslim-JK 2564 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6541.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6541.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**37 — 1956** (`hadith:37`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 1956; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1956.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 1956 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1956.json
- ✓ grade: Displayed «حسن» confirmed: al-Tirmidhi 1956 «حسن غريب»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1956.json

**38 — البخاري 2989، مسلم 1009** (`hadith:38`) — **Verified**
- ✓ hadith-wording: Clause «والكلمة الطيبة صدقة» of Bukhari 2989 / Muslim 1009, verbatim. (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2335.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2989, muslim 1009, muslim-JK 1009 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2335.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2335.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**42 — البخاري 6056، مسلم 105** (`hadith:42`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 6056 and one Muslim 105 narration («قتّات»); Companion Hudhayfa in both chains. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6056.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/290.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6056, muslim 105, muslim-JK 105 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6056.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/290.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6056.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/290.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**45 — 1914** (`hadith:45`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 1914; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4940.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1914, muslim-JK 1914 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4940.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4940.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**46 — 2589** (`hadith:46`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2589; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6593.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2589, muslim-JK 2589 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6593.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6593.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**5 — البخاري 6018، مسلم 47** (`hadith:5`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 47; Companion named in the chain. Bukhari 6018: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6018.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/173.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6018, muslim 47, muslim-JK 47 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6018.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/173.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6018.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/173.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**52 — 4800** (`hadith:52`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Abu Dawud 4800; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4800.json
- ✓ reference: Cited number(s) found and hold this hadith: abudawud 4800 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4800.json
- ✓ grade: Corrected 2026-10-31 and rechecked: al-Albani: Hasan (Abu Dawud 4800). (Before correction: «حسن» confirmed: al-Albani Hasan (hadith-api, Abu Dawud 4800). Not confirmable from an opened source: «صحيح الجامع (1464)» and al-Mundhiri's statement.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4800.json

**54 — البخاري 3470، مسلم 2766** (`hadith:54`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2766; Companion named in the chain. Bukhari 3470: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3470.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7008.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 3470, muslim 2766, muslim-JK 2766 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3470.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7008.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3470.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7008.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**6 — 6474** (`hadith:6`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6474; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6474.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6474 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6474.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6474.json

**61 — البخاري 3062، مسلم 111** (`hadith:61`) — **Verified**
- ✓ hadith-wording: Closing statement of the Khaybar/Hunayn report, verbatim in Bukhari 3062 («وإن الله ليؤيد…») and Muslim 111. (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3062.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/305.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 3062, muslim 111, muslim-JK 111 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3062.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/305.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/3062.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/305.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**64 — البخاري 4729، مسلم 2785** (`hadith:64`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2785; Companion named in the chain. Bukhari 4729: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4729.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7045.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 4729, muslim 2785, muslim-JK 2785 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4729.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7045.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4729.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7045.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**65 — 2887** (`hadith:65`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 2887; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2887.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2887 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2887.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2887.json

**67 — 2493** (`hadith:67`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 2493; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2493.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2493 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2493.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2493.json

**68 — البخاري 4686، مسلم 2583** (`hadith:68`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 4686; Companion named in the chain. Muslim 2583: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4686.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6581.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 4686, muslim 2583, muslim-JK 2583 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4686.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6581.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/4686.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6581.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**70 — المستدرك للحاكم 58** (`hadith:70`) — **Verified**
- ✓ hadith-wording: Verbatim in al-Mustadrak no. 58 (ed. Mustafa Ata, Dar al-Kutub al-Ilmiyya; OpenITI Shamela0002266), Ibn Umar in the chain. — https://raw.githubusercontent.com/OpenITI/0425AH/master/data/0405HakimNaysaburi/0405HakimNaysaburi.Mustadrak/0405HakimNaysaburi.Mustadrak.Shamela0002266-ara1 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/24.json
- ✓ reference: Corrected 2026-10-31 and rechecked: al-Mustadrak (Ata ed.) no. 58 holds the hadith; reference now «المستدرك للحاكم 58». (Before correction: No hadith number given (al-Mustadrak 58).) — https://raw.githubusercontent.com/OpenITI/0425AH/master/data/0405HakimNaysaburi/0405HakimNaysaburi.Mustadrak/0405HakimNaysaburi.Mustadrak.Shamela0002266-ara1 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/24.json
- ✓ grade: Displayed «صحيح» confirmed: al-Mustadrak 58, al-Hakim «صحيح على شرطهما», al-Dhahabi «على شرطهما»; the parallel «الحياء من الإيمان» is Bukhari 24 (Ibn Umar). — https://raw.githubusercontent.com/OpenITI/0425AH/master/data/0405HakimNaysaburi/0405HakimNaysaburi.Mustadrak/0405HakimNaysaburi.Mustadrak.Shamela0002266-ara1 · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/24.json

**71 — 1893** (`hadith:71`) — **Verified**
- ✓ hadith-wording: Corrected 2026-10-31 and rechecked: Muslim 1893: «إني أُبدِع بي فاحملني»; both quoted sayings verbatim. (Before correction: The Prophet's words are verbatim in Muslim 1893, but the man's words are paraphrased as speech: app «يا رسول الله، انقطعت بي الحمولة فاحملني», Muslim 1893 «إني أُبدِع بي فاحملني».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4899.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 1893, muslim-JK 1893 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4899.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4899.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**72 — البخاري 2840، مسلم 1153** (`hadith:72`) — **Verified**
- ✓ hadith-wording: Verbatim in a Muslim 1153 narration («باعد الله وجهه عن النار سبعين خريفاً»); Bukhari 2840 same Companion, reads «بعّد». — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2840.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2711.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2840, muslim 1153, muslim-JK 1153 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2840.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2711.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2840.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2711.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**73 — 223** (`hadith:73`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 223; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/534.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 223, muslim-JK 223 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/534.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/534.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**74 — 2676** (`hadith:74`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 2676 without the opening travel context (Jumdan). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6808.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2676, muslim-JK 2676 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6808.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6808.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**76 — 118** (`hadith:76`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 118; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/313.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 118, muslim-JK 118 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/313.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/313.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**77 — البخاري 110، مسلم (المقدمة، حديث متواتر)** (`hadith:77`) — **Verified**
- ✓ hadith-wording: Corrected 2026-10-31 and rechecked: Abu Hurayra in both chains; «من كذب علي متعمداً فليتبوأ مقعده من النار» verbatim in Bukhari 110 and in Muslim's introduction (hadith-api ara-muslim no. 4). (Before correction: The wording is verbatim in Bukhari 110 (Abu Hurayra), but the app gives it to four Companions with only Bukhari 110 cited; Anas' narration (Bukhari 108) reads «من تعمد علي كذباً» and Salama's (Bukhari 109) «من يقل علي ما لم أقل». Attribution/reference needs correcting.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/110.json
- ✓ reference: Corrected 2026-10-31 and rechecked: Abu Hurayra in both chains; «من كذب علي متعمداً فليتبوأ مقعده من النار» verbatim in Bukhari 110 and in Muslim's introduction (hadith-api ara-muslim no. 4). (Before correction: Only Bukhari 110 is cited for four Companions; their narrations are Bukhari 107–110 and 1291 with different wordings.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/110.json
- ✓ grade: «صحيح متفق عليه (بل هو من الأحاديث المتواترة)»: in both Sahihs (graded by inclusion), same Companion. Its mass transmission (tawatur) is shown by Bukhari 107–110 and 1291 and Muslim's introduction. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/110.json

**8 — البخاري 13، مسلم 45** (`hadith:8`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 13; Companion named in the chain. Muslim 45: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/13.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/170.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 13, muslim 45, muslim-JK 45 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/13.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/170.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/13.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/170.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**80 — 2979** (`hadith:80`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 2979 (Abd al-Baqi edition, OpenITI JK000109; hadith-api has no record under this number); Companion Abdullah b. Amr in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2979.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim-JK 2979 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2979.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2979.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**84 — أبو داود 4811، الترمذي 1954** (`hadith:84`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Abu Dawud 4811; Companion named in the chain. Tirmidhi 1954: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1954.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4811.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 1954, abudawud 4811 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1954.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4811.json
- ✓ grade: Displayed «صحيح» confirmed: al-Tirmidhi 1954 «حسن صحيح»; al-Albani Sahih (Tirmidhi 1954, Abu Dawud 4811). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1954.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud/4811.json

**86 — 384** (`hadith:86`) — **Verified**
- ✓ hadith-wording: The sentence is verbatim in Muslim 384 (the hadith on answering the muadhdhin). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/849.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 384, muslim-JK 384 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/849.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/849.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**87 — البخاري 1417، مسلم 1016** (`hadith:87`) — **Verified**
- ✓ hadith-wording: Verbatim in a Muslim 1016 narration; Bukhari 1417 same Companion (Adi b. Hatim). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1417.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2347.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1417, muslim 1016, muslim-JK 1016 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1417.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2347.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1417.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2347.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**88 — البخاري 16، مسلم 43** (`hadith:88`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 16; Companion named in the chain. Muslim 43: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/16.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/165.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 16, muslim 43, muslim-JK 43 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/16.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/165.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/16.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/165.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**89 — 1903** (`hadith:89`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 1903; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1903.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1903 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1903.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1903.json

**9 — البخاري 481، مسلم 2585** (`hadith:9`) — **Verified**
- ✓ hadith-wording: Corrected 2026-10-31 and rechecked: Bukhari 481 reads «وشبّك أصابعه»; the quote is verbatim there. (Before correction: The Prophet's words are verbatim in Bukhari 481, but the narrator's description adds a word: app «وشبّك بين أصابعه», Bukhari 481 «وشبّك أصابعه». Muslim 2585 has no such sentence.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/481.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6585.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 481, muslim 2585, muslim-JK 2585 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/481.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6585.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/481.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6585.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**90 — البخاري 6077، مسلم 2560** (`hadith:90`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2560; Companion named in the chain. Bukhari 6077: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6077.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6532.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6077, muslim 2560, muslim-JK 2560 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6077.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6532.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6077.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6532.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**91 — 2631** (`hadith:91`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2631; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6695.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2631, muslim-JK 2631 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6695.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6695.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**94 — 2910** (`hadith:94`) — **Verified**
- ✓ hadith-wording: Verbatim in Tirmidhi 2910; Companion Abdullah b. Masud in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2910.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 2910 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2910.json
- ✓ grade: Displayed «حسن صحيح» confirmed: al-Tirmidhi 2910 «حسن صحيح غريب»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2910.json

**97 — البخاري 2736، مسلم 2677** (`hadith:97`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 2736 and Muslim 2677; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2736.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6809.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2736, muslim 2677, muslim-JK 2677 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2736.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6809.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2736.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6809.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**99 — البخاري 6993، مسلم 2266** (`hadith:99`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2266; Companion named in the chain. Bukhari 6993: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6993.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5919.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6993, muslim 2266, muslim-JK 2266 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6993.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5919.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6993.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/5919.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-1145 — البخاري 1145، ومسلم 758** (`hadith:bukhari-1145`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 1145; Companion named in the chain. Muslim 758: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1145.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1772.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1145, muslim 758, muslim-JK 758 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1145.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1772.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1145.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1772.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-1283 — البخاري 1283، ومسلم 926 (طرفٌ من الحديث)** (`hadith:bukhari-1283`) — **Verified**
- ✓ hadith-wording: Verbatim closing words of Bukhari 1283, marked «طرفٌ من الحديث»; Muslim 926 same Companion. (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1283.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2139.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1283, muslim 926, muslim-JK 926 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1283.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2139.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1283.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2139.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-1469 — البخاري 1469 (طرفٌ من الحديث)** (`hadith:bukhari-1469`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 1469, marked «طرفٌ من الحديث». (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1469.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 1469 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1469.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/1469.json

**bukhari-2320 — البخاري 2320، ومسلم 1553** (`hadith:bukhari-2320`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 2320 and Muslim 1553; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2320.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3973.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2320, muslim 1553, muslim-JK 1553 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2320.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3973.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2320.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/3973.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-2989 — البخاري 2989** (`hadith:bukhari-2989`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 2989; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2989 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2989.json
- ✓ english: Verbatim Muhsin Khan (hadith-api eng-bukhari 2989), as the item states. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/2989.json

**bukhari-2996 — البخاري 2996** (`hadith:bukhari-2996`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 2996. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2996.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 2996 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2996.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/2996.json

**bukhari-39 — البخاري 39** (`hadith:bukhari-39`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 39; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/39.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 39 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/39.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/39.json

**bukhari-5269 — البخاري 5269، ومسلم 127 بنحوه** (`hadith:bukhari-5269`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 5269; Companion named in the chain. Muslim 127: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5269.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/331.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5269, muslim 127, muslim-JK 127 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5269.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/331.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5269.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/331.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-5986 — البخاري 5986، ومسلم 2557** (`hadith:bukhari-5986`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 5986 and Muslim 2557; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5986.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6523.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5986, muslim 2557, muslim-JK 2557 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5986.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6523.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5986.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6523.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-5991 — البخاري 5991** (`hadith:bukhari-5991`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 5991. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5991.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 5991 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5991.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/5991.json

**bukhari-6011 — البخاري 6011** (`hadith:bukhari-6011`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 6011. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6011.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6011 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6011.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6011.json
- ✓ english: Verbatim Muhsin Khan (hadith-api eng-bukhari 6011), as the item states. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6011.json

**bukhari-6012 — البخاري 6012** (`hadith:bukhari-6012`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6012; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6012.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6012 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6012.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6012.json
- ✓ english: Verbatim Muhsin Khan (hadith-api eng-bukhari 6012), as the item states. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6012.json

**bukhari-6018 — البخاري 6018** (`hadith:bukhari-6018`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6018; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6018.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6018 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6018.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6018.json
- ✓ english: Verbatim Muhsin Khan (hadith-api eng-bukhari 6018), as the item states. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6018.json

**bukhari-6035 — البخاري 6035 (طرفٌ من الحديث)** (`hadith:bukhari-6035`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 6035, marked «طرفٌ من الحديث». (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6035.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6035 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6035.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6035.json
- ✓ english: Verbatim excerpt of Muhsin Khan's translation (hadith-api eng-bukhari 6035). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6035.json

**bukhari-6064 — البخاري 6064** (`hadith:bukhari-6064`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6064; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6064.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6064 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6064.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6064.json
- ✓ english: Verbatim Muhsin Khan (hadith-api eng-bukhari 6064), as the item states. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6064.json

**bukhari-6116 — البخاري 6116** (`hadith:bukhari-6116`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6116; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6116.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6116 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6116.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6116.json
- ✓ english: Corrected 2026-10-31 and rechecked: Verbatim Muhsin Khan (hadith-api eng-bukhari 6116), labelled as such. (Before correction: The English is a DITHAR rendering (the item says so), not a published translation: Muhsin Khan reads «Do not become angry and furious».) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6116.json

**bukhari-6309 — البخاري 6309** (`hadith:bukhari-6309`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6309; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6309.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6309 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6309.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6309.json

**bukhari-6340 — البخاري 6340، ومسلم 2735** (`hadith:bukhari-6340`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6340 and Muslim 2735; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6340.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6934.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6340, muslim 2735, muslim-JK 2735 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6340.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6934.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6340.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6934.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-6407 — البخاري 6407** (`hadith:bukhari-6407`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6407; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6407.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6407 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6407.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6407.json

**bukhari-6412 — البخاري 6412** (`hadith:bukhari-6412`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6412; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6412.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6412 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6412.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6412.json

**bukhari-6416 — البخاري 6416** (`hadith:bukhari-6416`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6416; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6416.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6416 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6416.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6416.json

**bukhari-6446 — البخاري 6446، ومسلم 1051** (`hadith:bukhari-6446`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6446 and Muslim 1051; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6446.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2420.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6446, muslim 1051, muslim-JK 1051 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6446.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2420.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6446.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2420.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**bukhari-6464 — البخاري 6464** (`hadith:bukhari-6464`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 6464; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6464.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6464 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6464.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6464.json
- ✓ english: Verbatim Muhsin Khan (hadith-api eng-bukhari 6464), as the item states. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6464.json

**bukhari-6477 — البخاري 6477** (`hadith:bukhari-6477`) — **Verified**
- ✓ hadith-wording: Verbatim in Bukhari 6477 (it ends «أبعد مما بين المشرق» in the source too). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6477.json
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 6477 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6477.json
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/6477.json
- ✓ english: Verbatim Muhsin Khan (hadith-api eng-bukhari 6477), as the item states. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/6477.json

**bukhari-69 — البخاري 69، ومسلم 1734** (`hadith:bukhari-69`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Bukhari 69; Companion named in the chain. Muslim 1734: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/69.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4528.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: bukhari 69, muslim 1734, muslim-JK 1734 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/69.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4528.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح متفق عليه»: in both Sahihs (graded by inclusion), same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/69.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/4528.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**ibnmajah-3818 — ابن ماجه 3818** (`hadith:ibnmajah-3818`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Ibn Majah 3818; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3818.json
- ✓ reference: Cited number(s) found and hold this hadith: ibnmajah 3818 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3818.json
- ✓ grade: Displayed «صحيح» confirmed: al-Albani Sahih; Shuaib al-Arnaut Sahih (hadith-api). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3818.json

**ibnmajah-4032 — ابن ماجه 4032** (`hadith:ibnmajah-4032`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Ibn Majah 4032; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4032.json
- ✓ reference: Cited number(s) found and hold this hadith: ibnmajah 4032 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4032.json
- ✓ grade: Displayed «صحيح» confirmed: al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4032.json

**muslim-2553 — مسلم 2553** (`hadith:muslim-2553`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2553; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6516.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2553, muslim-JK 2553 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6516.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6516.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2564 — مسلم 2564** (`hadith:muslim-2564`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2564; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6541.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2564, muslim-JK 2564 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6541.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6541.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2566 — مسلم 2566** (`hadith:muslim-2566`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2566; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6548.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2566, muslim-JK 2566 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6548.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6548.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2695 — مسلم 2695** (`hadith:muslim-2695`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2695; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6847.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2695, muslim-JK 2695 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6847.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6847.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2700 — مسلم 2700** (`hadith:muslim-2700`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 2700 (Abd al-Baqi edition; hadith-api lacks the number). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2700.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim-JK 2700 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2700.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2700.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2733 — مسلم 2733** (`hadith:muslim-2733`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 2733 (Abd al-Baqi edition). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2733.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim-JK 2733 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2733.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2733.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2734 — مسلم 2734** (`hadith:muslim-2734`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2734; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6932.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2734, muslim-JK 2734 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6932.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6932.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2749 — مسلم 2749** (`hadith:muslim-2749`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2749; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6965.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2749, muslim-JK 2749 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6965.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/6965.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2759 — مسلم 2759** (`hadith:muslim-2759`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2759; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2759.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim-JK 2759 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2759.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/2759.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2822 — مسلم 2822** (`hadith:muslim-2822`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2822; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7130.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2822, muslim-JK 2822 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7130.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7130.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2963 — مسلم 2963** (`hadith:muslim-2963`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 2963; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7428.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2963, muslim-JK 2963 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7428.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7428.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-2965 — مسلم 2965** (`hadith:muslim-2965`) — **Verified**
- ✓ hadith-wording: The Prophet's words are verbatim in Muslim 2965 (Sad's reply to his son). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7432.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 2965, muslim-JK 2965 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7432.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/7432.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-373 — مسلم 373** (`hadith:muslim-373`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 373; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/826.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 373, muslim-JK 373 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/826.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/826.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-38 — مسلم 38** (`hadith:muslim-38`) — **Verified**
- ✓ hadith-wording: Verbatim in Muslim 38. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/159.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 38, muslim-JK 38 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/159.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/159.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-482 — مسلم 482** (`hadith:muslim-482`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 482; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1083.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 482, muslim-JK 482 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1083.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1083.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-798 — مسلم 798** (`hadith:muslim-798`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Muslim 798; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1862.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 798, muslim-JK 798 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1862.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1862.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-804 — مسلم 804 (طرفٌ من الحديث)** (`hadith:muslim-804`) — **Verified**
- ✓ hadith-wording: Verbatim opening of Muslim 804; the item marks it «طرفٌ من الحديث». (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1874.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 804, muslim-JK 804 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1874.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1874.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**muslim-817 — مسلم 817** (`hadith:muslim-817`) — **Verified**
- ✓ hadith-wording: Umar's quotation of the Prophet is verbatim in Muslim 817 (Abd al-Baqi edition). (Excerpt.) — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1897.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ reference: Cited number(s) found and hold this hadith: muslim 817, muslim-JK 817 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1897.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1
- ✓ grade: «صحيح»: in a Sahih (graded by inclusion). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim/1897.json · https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1

**tirmidhi-1987 — الترمذي 1987** (`hadith:tirmidhi-1987`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 1987; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1987.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 1987 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1987.json
- ✓ grade: Displayed «حسن» confirmed: al-Tirmidhi «حسن صحيح»; al-Albani Hasan. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/1987.json

**tirmidhi-2346 — الترمذي 2346، وابن ماجه 4141 بنحوه** (`hadith:tirmidhi-2346`) — **Verified**
- ✓ hadith-wording: Verbatim in Tirmidhi 2346; Ibn Majah 4141 same Companion. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2346.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4141.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 2346, ibnmajah 4141 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2346.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4141.json
- ✓ grade: Displayed «حسن» confirmed: al-Tirmidhi «حسن غريب»; al-Albani Hasan. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2346.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/4141.json

**tirmidhi-2399 — الترمذي 2399** (`hadith:tirmidhi-2399`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 2399; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2399.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 2399 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2399.json
- ✓ grade: Displayed «حسن صحيح» confirmed: al-Tirmidhi «حسن صحيح»; al-Albani Hasan Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2399.json

**tirmidhi-2518 — الترمذي 2518** (`hadith:tirmidhi-2518`) — **Verified**
- ✓ hadith-wording: Verbatim in Tirmidhi 2518. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2518.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 2518 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2518.json
- ✓ grade: Displayed «صحيح» confirmed: al-Tirmidhi «حسن صحيح»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/2518.json

**tirmidhi-3372 — الترمذي 3372، وابن ماجه 3828 (طرفٌ من الحديث)** (`hadith:tirmidhi-3372`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 3372 and Ibn Majah 3828; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3372.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3828.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3372, ibnmajah 3828 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3372.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3828.json
- ✓ grade: Displayed «صحيح» confirmed: al-Tirmidhi «حسن صحيح»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3372.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3828.json

**tirmidhi-3375 — الترمذي 3375، وابن ماجه 3793 بنحوه** (`hadith:tirmidhi-3375`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 3375; Companion named in the chain. Ibn Majah 3793: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3375.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3793.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3375, ibnmajah 3793 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3375.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3793.json
- ✓ grade: Displayed «صحيح» confirmed: al-Tirmidhi «حسن غريب»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3375.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3793.json

**tirmidhi-3377 — الترمذي 3377** (`hadith:tirmidhi-3377`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 3377; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3377 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json
- ✓ grade: Displayed «صحيح» confirmed: Ahmad Shakir Sahih; al-Albani Sahih (hadith-api, Tirmidhi 3377). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json

**tirmidhi-3556 — الترمذي 3556، وابن ماجه 3865 بنحوه** (`hadith:tirmidhi-3556`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 3556; Companion named in the chain. Ibn Majah 3865: same Companion, other wording. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3556.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3865.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3556, ibnmajah 3865 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3556.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3865.json
- ✓ grade: Displayed «صحيح» confirmed: al-Tirmidhi «حسن غريب»; al-Albani Sahih. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3556.json · https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah/3865.json

**tirmidhi-3377 — الترمذي 3377** (`startup:tirmidhi-3377`) — **Verified**
- ✓ hadith-wording: Verbatim (apart from the framing «عن…/قال») in Tirmidhi 3377; Companion named in the chain. — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json
- ✓ reference: Cited number(s) found and hold this hadith: tirmidhi 3377 — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json
- ✓ grade: Displayed «صحيح» confirmed: Ahmad Shakir Sahih; al-Albani Sahih (hadith-api, Tirmidhi 3377). — https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi/3377.json


### Wamadat

**Wamada 1 — سورة الفاتحة** (`lataif:w1`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 1:1-7; spelling-convention differences only (no change of word or reading): «الرَّحْمَنِ» / Tanzil «الرَّحْمَٰنِ». — https://tanzil.net/#1:1
- ✓ verse-reference: Shown «سورة الفاتحة» = surah الفاتحة 1:1-7. — https://tanzil.net/#1:1
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 1:5 explains the turn from third person to address (التفات): «فإن الحامد لما حمد الله تعالى ووصفه بعظيم الصفات بلغت به الفكرة منتهاها فتخيّل نفسه في حضرة الربوبية فخاطب ربه بالإقبال». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/1/1.json

**Wamada 3 — سورة البقرة – الآية 186** (`lataif:w3`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:186. — https://tanzil.net/#2:186
- ✓ verse-reference: Shown «سورة البقرة – الآية 186» = surah البقرة 2:186. — https://tanzil.net/#2:186
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 2:186: «والمراد من هذا: أنه تعالى لا يخيب دعاء داع، ولا يشغله عنه شيء، بل هو سميع الدعاء. وفيه ترغيب في الدعاء»; the rest restates the verse («فليستجيبوا لي وليؤمنوا بي لعلهم يرشدون»). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/186.json

**Wamada 4 — سورة البقرة – الآية 268** (`lataif:w4`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:268. — https://tanzil.net/#2:268
- ✓ verse-reference: Shown «سورة البقرة – الآية 268» = surah البقرة 2:268. — https://tanzil.net/#2:268
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:268: «الشيطان يعدكم… بالصدقة… أن تفتقروا»; «وفضلاً يعني: ويعدكم أن يخلف عليكم من صدقتكم، فيتفضل عليكم من عطاياه ويسبغ عليكم في أرزاقكم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/268.json

**Wamada 6 — سورة البقرة – الآية 274** (`lataif:w6`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:274. — https://tanzil.net/#2:274
- ✓ verse-reference: Shown «سورة البقرة – الآية 274» = surah البقرة 2:274. — https://tanzil.net/#2:274
- ✓ reflection-attribution: Cited work: البحر المحيط في التفسير - أبو حيان الأندلسي. Abu Hayyan at 2:274 (quoting al-Zamakhshari): «يعمّون الأوقات والأحوال بالصدقة»; the reward clause restates the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-bahr-al-muhit/2/274.json

**Wamada 8 — سورة البقرة – الآية 155** (`lataif:w8`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:155. — https://tanzil.net/#2:155
- ✓ verse-reference: Shown «سورة البقرة – الآية 155» = surah البقرة 2:155. — https://tanzil.net/#2:155
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:155: «وهذا إخبار من الله تعالى ذكره أتباعَ رسوله ﷺ أنه مبتليهم وممتحنهم بشدائد من الأمور»; the glad tidings are for «أهل الصبر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/155.json

**Wamada 10 — سورة البقرة – الآية 255** (`lataif:w10`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:255. — https://tanzil.net/#2:255
- ✓ verse-reference: Shown «سورة البقرة – الآية 255» = surah البقرة 2:255. — https://tanzil.net/#2:255
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 2:255: «والسنة: ما يتقدم النوم من الفتور الذي يسمى النعاس»; the sentences are «بيان لقيامه بتدبير الخلق». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/2/255.json

**Wamada 11 — سورة البقرة – الآية 207** (`lataif:w11`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:207. — https://tanzil.net/#2:207
- ✓ verse-reference: Shown «سورة البقرة – الآية 207» = surah البقرة 2:207. — https://tanzil.net/#2:207
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 2:207: «و(يشري) معناه يبيع»; selling the dearest thing «لأجل تحصيل ما يرضي الله»; «رءوف بالعباد… فالرأفة كناية عن لازمها وهو إيتاء الخيرات». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/207.json

**Wamada 12 — سورة البقرة – الآية 276** (`lataif:w12`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:276. — https://tanzil.net/#2:276
- ✓ verse-reference: Shown «سورة البقرة – الآية 276» = surah البقرة 2:276. — https://tanzil.net/#2:276
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 2:276: «يمحق الربا، أي: يذهبه، إما بأن يذهبه بالكلية من يد صاحبه، أو يحرمه بركة ماله»; and the hadith «الربا وإن كثر فإن عاقبته تصير إلى قُلّ». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/276.json

**Wamada 14 — سورة البقرة – الآية 278** (`lataif:w14`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:278. — https://tanzil.net/#2:278
- ✓ verse-reference: Shown «سورة البقرة – الآية 278» = surah البقرة 2:278. — https://tanzil.net/#2:278
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:278: «وذروا… اتركوا طلب ما بقي لكم من فضل على رءوس أموالكم… إن كنتم محققين إيمانكم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/278.json

**Wamada 15 — سورة البقرة – الآية 281** (`lataif:w15`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 2:281; spelling-convention differences only (no change of word or reading): «تُوَفَّى» / Tanzil «تُوَفَّىٰ». — https://tanzil.net/#2:281
- ✓ verse-reference: Shown «سورة البقرة – الآية 281» = surah البقرة 2:281. — https://tanzil.net/#2:281
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 2:281: «يعظ عباده ويذكرهم… الرجوع إليه تعالى ومحاسبته تعالى خلقه على ما عملوا، ومجازاته إياهم بما كسبوا». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/281.json

**Wamada 19 — سورة آل عمران – الآية 35** (`lataif:w19`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:35. — https://tanzil.net/#3:35
- ✓ verse-reference: Shown «سورة آل عمران – الآية 35» = surah آل عمران 3:35. — https://tanzil.net/#3:35
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 3:35: «محرراً… جعلته عتيقاً لعبادة الله، لا ينتفع به بشيء من أمور الدنيا»; the lesson for parents is an application. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/3/35.json

**Wamada 20 — سورة آل عمران – الآية 159** (`lataif:w20`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:159. — https://tanzil.net/#3:159
- ✓ verse-reference: Shown «سورة آل عمران – الآية 159» = surah آل عمران 3:159. — https://tanzil.net/#3:159
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) quoting 3:159: «جعل الله انبساطهم مع الخلق رحمة لهم… جذبت قلوب الصادقين إليهم», with «لين الجانب»; the warning restates the verse. — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 21 — سورة آل عمران – الآية 18** (`lataif:w21`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:18. — https://tanzil.net/#3:18
- ✓ verse-reference: Shown «سورة آل عمران – الآية 18» = surah آل عمران 3:18. — https://tanzil.net/#3:18
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 3:18: «ثم قرن شهادة ملائكته وأولي العلم بشهادته… وهذه خصوصية عظيمة للعلماء في هذا المقام». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/18.json

**Wamada 23 — سورة آل عمران – الآية 144** (`lataif:w23`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:144. — https://tanzil.net/#3:144
- ✓ verse-reference: Shown «سورة آل عمران – الآية 144» = surah آل عمران 3:144. — https://tanzil.net/#3:144
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 3:144: the rumour at Uhud «ألا إن محمداً قد قتل», and Abu Bakr: «من كان يعبد محمداً فإن محمداً قد مات، ومن كان يعبد الله فإن الله حي لا يموت» — the reflection's principle. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/144.json

**Wamada 25 — سورة آل عمران – الآية 200** (`lataif:w25`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:200. — https://tanzil.net/#3:200
- ✓ verse-reference: Shown «سورة آل عمران – الآية 200» = surah آل عمران 3:200. — https://tanzil.net/#3:200
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.), منزلة الصبر: «انتقال من الأدنى إلى الأعلى… فالصبر مع نفسك، والمصابرة بينك وبين عدوك، والمرابطة الثبات وإعداد العدة… لزوم ثغر القلب». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 30 — سورة النساء – الآية 147** (`lataif:w30`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:147. — https://tanzil.net/#4:147
- ✓ verse-reference: Shown «سورة النساء – الآية 147» = surah النساء 4:147. — https://tanzil.net/#4:147
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «الكشاف - الزمخشري»; quoted wording verbatim in it at 4:147: «مثيباً موفياً أجوركم»; the unsupported claim (تودد) removed. (Before correction: Cited work: الكشاف - الزمخشري. al-Kashshaf at 4:147 supports most of it: «أيتشفى به من الغيظ… وهو الغني… وإنما هو أمر أوجبته الحكمة… فإن قمتم بشكر نعمته وآمنتم به فقد أبعدتم عن أنفسكم استحقاق العذاب»; but it glosses «شاكراً» as «مثيباً موفياً أجوركم», not «تودّداً» as the reflection says.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/4/147.json

**Wamada 32 — سورة المائدة – الآية 100** (`lataif:w32`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:100. — https://tanzil.net/#5:100
- ✓ verse-reference: Shown «سورة المائدة – الآية 100» = surah المائدة 5:100. — https://tanzil.net/#5:100
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 5:100: «الاعتزاز بالكثرة والإعجاب بها… كثرة من أشياء فاسدة خيف أن تستهوي من كانوا بقلة من الأشياء الصالحة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/100.json

**Wamada 33 — سورة المائدة – الآية 8** (`lataif:w33`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:8. — https://tanzil.net/#5:8
- ✓ verse-reference: Shown «سورة المائدة – الآية 8» = surah المائدة 5:8. — https://tanzil.net/#5:8
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 5:8: «لا يحملنكم بغض قوم على ترك العدل فيهم، بل استعملوا العدل في كل أحد، صديقاً كان أو عدواً… عدلكم أقرب إلى التقوى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/8.json

**Wamada 34 — سورة المائدة – الآية 28** (`lataif:w34`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:28. — https://tanzil.net/#5:28
- ✓ verse-reference: Shown «سورة المائدة – الآية 28» = surah المائدة 5:28. — https://tanzil.net/#5:28
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 5:28: the slain son of Adam refused to raise his hand against his brother, «إني أخاف الله رب العالمين», though threatened with murder. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/28.json

**Wamada 35 — سورة المائدة – الآية 101** (`lataif:w35`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:101. — https://tanzil.net/#5:101
- ✓ verse-reference: Shown «سورة المائدة – الآية 101» = surah المائدة 5:101. — https://tanzil.net/#5:101
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 5:101: «لا تكثروا مسألة رسول الله… حتى تسألوه عن تكاليف شاقة عليكم، إن أفتاكم بها وكلفكم إياها تغمكم وتشق عليكم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/5/101.json

**Wamada 37 — سورة الأنعام – الآية 60** (`lataif:w37`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 6:60. — https://tanzil.net/#6:60
- ✓ verse-reference: Shown «سورة الأنعام – الآية 60» = surah الأنعام 6:60. — https://tanzil.net/#6:60
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat (Kilani ed.), «جرح»: «وسميت الأعضاء الكاسبة جوارح… والاجتراح اكتساب الإثم وأصله من الجراحة». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 38 — سورة الأنعام – الآية 17** (`lataif:w38`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 6:17; spelling-convention differences only (no change of word or reading): «عَلَى» / Tanzil «عَلَىٰ». — https://tanzil.net/#6:17
- ✓ verse-reference: Shown «سورة الأنعام – الآية 17» = surah الأنعام 6:17. — https://tanzil.net/#6:17
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 6:17: «مخبراً أنه مالك الضر والنفع… لا معقب لحكمه ولا راد لقضائه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/6/17.json

**Wamada 39 — سورة الأنعام – الآية 122** (`lataif:w39`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 6:122. — https://tanzil.net/#6:122
- ✓ verse-reference: Shown «سورة الأنعام – الآية 122» = surah الأنعام 6:122. — https://tanzil.net/#6:122
- ✓ reflection-attribution: Cited work: إغاثة اللهفان - ابن القيم. Ighathat al-Lahfan (al-Fiqi ed.) on 6:122: «أي أومن كان كافراً ميت القلب مغموراً في ظلمة الجهل فهديناه… وجعلنا قلبه حياً بعد موته مشرقاً مستنيراً بعد ظلمته». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.IghathatLahfan/0751IbnQayyimJawziyya.IghathatLahfan.JK000087-ara1

**Wamada 43 — سورة الأعراف – الآية 2** (`lataif:w43`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:2. — https://tanzil.net/#7:2
- ✓ verse-reference: Shown «سورة الأعراف – الآية 2» = surah الأعراف 7:2. — https://tanzil.net/#7:2
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 7:2: «الحرج هو الضيق»; do not let your breast be straitened in warning with it and conveying it, «واصبر للمضي لأمر الله… فإن الله معك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/7/2.json

**Wamada 47 — سورة الأنفال – الآية 11** (`lataif:w47`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:11. — https://tanzil.net/#8:11
- ✓ verse-reference: Shown «سورة الأنفال – الآية 11» = surah الأنفال 8:11. — https://tanzil.net/#8:11
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 8:11: the drowsiness as security, and «مطر أنزله الله من السماء يوم بدر ليطهر به المؤمنين… ويثبت به الأقدام». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/8/11.json

**Wamada 48 — سورة الأنفال – الآية 24** (`lataif:w48`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:24. — https://tanzil.net/#8:24
- ✓ verse-reference: Shown «سورة الأنفال – الآية 24» = surah الأنفال 8:24. — https://tanzil.net/#8:24
- ✓ reflection-attribution: Cited work: الفوائد - ابن القيم. al-Fawaid (Dar al-Kutub al-Ilmiyya ed.) on 8:24: «إن الحياة النافعة إنما تحصل بالاستجابة لله ورسوله، فمن لم تحصل له هذه الاستجابة فلا حياة له، وإن كانت له حياة بهيمية مشتركة بينه وبين أرذل الحيوانات». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.Fawaid/0751IbnQayyimJawziyya.Fawaid.JK000060-ara1

**Wamada 49 — سورة الأنفال – الآية 24** (`lataif:w49`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:24. — https://tanzil.net/#8:24
- ✓ verse-reference: Shown «سورة الأنفال – الآية 24» = surah الأنفال 8:24. — https://tanzil.net/#8:24
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «طريق الهجرتين - ابن القيم»; quoted wording verbatim in it at 8:24: «لا ومقلب القلوب»; the unsupported claim (تمادى, ثبت قلبي) removed. (Before correction: Cited work: طريق الهجرتين - ابن القيم. Tariq al-Hijratayn (Dar Ibn al-Qayyim ed.) supports the heart's turning: «يكفي في هذا قوله تعالى: واعلموا أن الله يحول بين المرء وقلبه… المحرك للقلب المصرف له المقلب له كيف يشاء», with the oath «لا ومقلب القلوب»; but the condition «إذا تمادى في الغي» and the supplication «يا مقلب القلوب ثبت قلبي على دينك» (authentic elsewhere, Tirmidhi 2140) are not in the cited work.) — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.TariqHijratayn/0751IbnQayyimJawziyya.TariqHijratayn.JK000065-ara1

**Wamada 51 — سورة التوبة – الآية 118** (`lataif:w51`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:118. — https://tanzil.net/#9:118
- ✓ verse-reference: Shown «سورة التوبة – الآية 118» = surah التوبة 9:118. — https://tanzil.net/#9:118
- ✓ reflection-attribution: Cited work: زاد المعاد - ابن القيم. Zad al-Maad (al-Arnaut ed.), Kab b. Malik's account: «قد ضاقت عليّ نفسي وضاقت عليّ الأرض بما رحبت», and on 9:118: «تاب عليهم أولاً بتوفيقهم للتوبة، فلما تابوا تاب عليهم ثانياً بقبولها». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.ZadMacad/0751IbnQayyimJawziyya.ZadMacad.JK000105-ara1

**Wamada 58 — سورة التوبة – الآية 109** (`lataif:w58`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:109. — https://tanzil.net/#9:109
- ✓ verse-reference: Shown «سورة التوبة – الآية 109» = surah التوبة 9:109. — https://tanzil.net/#9:109
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 9:109: «أفمن أسس بنيان دينه على قاعدة قوية محكمة وهي الحق الذي هو تقوى الله ورضوانه، خير أم من أسسه على… الباطل والنفاق الذي مثله مثل شفا جرف هار في قلة الثبات». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/9/109.json

**Wamada 59 — سورة التوبة – الآية 128** (`lataif:w59`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:128. — https://tanzil.net/#9:128
- ✓ verse-reference: Shown «سورة التوبة – الآية 128» = surah التوبة 9:128. — https://tanzil.net/#9:128
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 9:128: «عزيز عليه ما عنتم، أي: يعز عليه الشيء الذي يعنت أمته ويشق عليها»; «حريص عليكم» restates the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/9/128.json

**Wamada 62 — سورة يونس – الآية 5** (`lataif:w62`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 10:5. — https://tanzil.net/#10:5
- ✓ verse-reference: Shown «سورة يونس – الآية 5» = surah يونس 10:5. — https://tanzil.net/#10:5
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 10:5: «ولما جعل النور في مقابلة الضياء… (ضياءً) و(نوراً) حالان مشيران إلى الحكمة والنعمة في خلقهما»; «وقدّره منازل… وقدّر سيره». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/10/5.json

**Wamada 64 — سورة يونس – الآية 11** (`lataif:w64`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 10:11. — https://tanzil.net/#10:11
- ✓ verse-reference: Shown «سورة يونس – الآية 11» = surah يونس 10:11. — https://tanzil.net/#10:11
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 10:11: «يخبر تعالى عن حلمه ولطفه بعباده: أنه لا يستجيب لهم إذا دعوا على أنفسهم أو أموالهم أو أولادهم في حال ضجرهم وغضبهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/10/11.json

**Wamada 68 — سورة يونس – الآيتان 91–92** (`lataif:w68`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 10:91-92. — https://tanzil.net/#10:91
- ✓ verse-reference: Shown «سورة يونس – الآيتان 91–92» = surah يونس 10:91-92. — https://tanzil.net/#10:91
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 10:91–92: Pharaoh sought refuge «حين فزع إليه في حال حلول سخطه به ونزول عقابه»; and Ibn Abbas: «أنجى الله فرعون لبني إسرائيل من البحر، فنظروا إليه بعد ما غرق». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/10/91.json

**Wamada 76 — سورة يوسف – الآية 86** (`lataif:w76`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:86. — https://tanzil.net/#12:86
- ✓ verse-reference: Shown «سورة يوسف – الآية 86» = surah يوسف 12:86. — https://tanzil.net/#12:86
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «الكشاف - الزمخشري»; no quotation; the unsupported claim (يضمره) removed. (Before correction: Cited work: الكشاف - الزمخشري. al-Kashshaf at 12:86 defines only «البث: أصعب الهم الذي لا يصبر عليه صاحبه فيبثه إلى الناس» and «لا أشكو إلى أحد منكم… إنما أشكو إلى ربي»; the reflection's contrasting definition of «الحزن» (what one hides in the heart) is not in it.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/12/86.json

**Wamada 77 — سورة يوسف – الآية 53** (`lataif:w77`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:53. — https://tanzil.net/#12:53
- ✓ verse-reference: Shown «سورة يوسف – الآية 53» = surah يوسف 12:53. — https://tanzil.net/#12:53
- ✓ reflection-attribution: Cited work: إغاثة اللهفان - ابن القيم. Ighathat al-Lahfan cites 12:53 for the soul that commands evil: «فالنفس تدعو إلى الطغيان وإيثار الحياة الدنيا»; salvation by God's mercy restates «إلا ما رحم ربي». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.IghathatLahfan/0751IbnQayyimJawziyya.IghathatLahfan.JK000087-ara1

**Wamada 79 — سورة يوسف – الآية 18** (`lataif:w79`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:18. — https://tanzil.net/#12:18
- ✓ verse-reference: Shown «سورة يوسف – الآية 18» = surah يوسف 12:18. — https://tanzil.net/#12:18
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 12:18: they stained the shirt «ولكنهم نسوا أن يخرقوه، فلهذا لم يرج هذا الصنيع على نبي الله يعقوب»; and on «فصبر جميل»: «صبر لا شكوى فيه» (a mursal report he cites). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/12/18.json

**Wamada 80 — سورة يوسف – الآية 23** (`lataif:w80`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:23. — https://tanzil.net/#12:23
- ✓ verse-reference: Shown «سورة يوسف – الآية 23» = surah يوسف 12:23. — https://tanzil.net/#12:23
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.), منزلة الصبر, on Yusuf: «فإنه كان شاباً… وعزباً… وغريباً… ومملوكاً… والمرأة جميلة وذات منصب وهي سيدته، وقد غاب الرقيب… ومع هذه الدواعي كلها صبر اختياراً وإيثاراً لما عند الله»; «معاذ الله» and the closed doors are the verse. — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 83 — سورة يوسف – الآية 55** (`lataif:w83`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 12:55; spelling-convention differences only (no change of word or reading): «عَلَى» / Tanzil «عَلَىٰ». — https://tanzil.net/#12:55
- ✓ verse-reference: Shown «سورة يوسف – الآية 55» = surah يوسف 12:55. — https://tanzil.net/#12:55
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 12:55: «أمين أحفظ ما تستحفظنيه، عالم بوجوه التصرف، وصفاً لنفسه بالأمانة والكفاية… فطلب التولية ابتغاء وجه الله لا لحب الملك والدنيا». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/12/55.json

**Wamada 87 — سورة يوسف – الآية 92** (`lataif:w87`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:92. — https://tanzil.net/#12:92
- ✓ verse-reference: Shown «سورة يوسف – الآية 92» = surah يوسف 12:92. — https://tanzil.net/#12:92
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 12:92: «لا تثريب عليكم اليوم، يقول: لا تأنيب عليكم ولا عتب عليكم اليوم، ولا أعيد ذنبكم في حقي بعد اليوم»; he was then in power and they admitted their wrong. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/12/92.json

**Wamada 90 — سورة الرعد – الآية 11** (`lataif:w90`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 13:11. — https://tanzil.net/#13:11
- ✓ verse-reference: Shown «سورة الرعد – الآية 11» = surah الرعد 13:11. — https://tanzil.net/#13:11
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 13:11: «ملائكة يحفظونه من بين يديه ومن خلفه، فإذا جاء قدر الله خلّوا عنه»; Ali: «إن مع كل رجل ملكين يحفظانه مما لم يقدّر، فإذا جاء القدر خلّيا بينه وبينه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/13/11.json

**Wamada 96 — سورة إبراهيم – الآية 26** (`lataif:w96`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 14:26. — https://tanzil.net/#14:26
- ✓ verse-reference: Shown «سورة إبراهيم – الآية 26» = surah ابراهيم 14:26. — https://tanzil.net/#14:26
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 14:26: «كشجرة الحنظل»; «ومعنى اجتثت استؤصلت. وحقيقة الاجتثاث أخذ الجثة كلها»; «شبه بها القول الذي لم يعضد بحجة، فهو داحض غير ثابت». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/14/26.json

**Wamada 98 — سورة إبراهيم – الآية 37** (`lataif:w98`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 14:37. — https://tanzil.net/#14:37
- ✓ verse-reference: Shown «سورة إبراهيم – الآية 37» = surah ابراهيم 14:37. — https://tanzil.net/#14:37
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 14:37 on Ibrahim settling his family at the barren valley by the House «ليقيموا الصلاة»; the lesson for parents is an application of the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/14/37.json

**Wamada 102 — سورة الحجر – الآيتان 87–88** (`lataif:w102`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 15:87-88. — https://tanzil.net/#15:87
- ✓ verse-reference: Shown «سورة الحجر – الآيتان 87–88» = surah الحجر 15:87-88. — https://tanzil.net/#15:87
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 15:87: «فهذا نص في أن الفاتحة السبع المثاني والقرآن العظيم»; and «فلا تنظرن إلى الدنيا وزينتها… فلا تغبطهم بما هم فيه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/15/87.json

**Wamada 103 — سورة النحل – الآية 1** (`lataif:w103`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:1. — https://tanzil.net/#16:1
- ✓ verse-reference: Shown «سورة النحل – الآية 1» = surah النحل 16:1. — https://tanzil.net/#16:1
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 16:1: «فجيء بالماضي المراد به المستقبل المحقق الوقوع بقرينة تفريع (فلا تستعجلوه)». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/16/1.json

**Wamada 104 — سورة النحل – الآية 8** (`lataif:w104`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:8. — https://tanzil.net/#16:8
- ✓ verse-reference: Shown «سورة النحل – الآية 8» = surah النحل 16:8. — https://tanzil.net/#16:8
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 16:8: horses, mules and donkeys made «للركوب والزينة بها، وذلك أكبر المقاصد منها»; the conclusion restates «ويخلق ما لا تعلمون». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/16/8.json

**Wamada 105 — سورة النحل – الآية 112** (`lataif:w105`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:112. — https://tanzil.net/#16:112
- ✓ verse-reference: Shown «سورة النحل – الآية 112» = surah النحل 16:112. — https://tanzil.net/#16:112
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 16:112: «وأما اللباس فقد شُبّه به لاشتماله على اللابس: ما غشي الإنسان والتبس به من بعض الحوادث… فكأنه قيل: فأذاقه ما غشيهم من الجوع والخوف». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/16/112.json

**Wamada 106 — سورة النحل – الآية 97** (`lataif:w106`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:97. — https://tanzil.net/#16:97
- ✓ verse-reference: Shown «سورة النحل – الآية 97» = surah النحل 16:97. — https://tanzil.net/#16:97
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) on 16:97: «وقد فسرت الحياة الطيبة بالقناعة والرضى والرزق الحسن وغير ذلك، والصواب أنها حياة القلب ونعيمه وبهجته وسروره بالإيمان». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 108 — سورة الإسراء – الآية 11** (`lataif:w108`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:11. — https://tanzil.net/#17:11
- ✓ verse-reference: Shown «سورة الإسراء – الآية 11» = surah الإسراء 17:11. — https://tanzil.net/#17:11
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 17:11: «يخبر تعالى عن عجلة الإنسان ودعائه في بعض الأحيان على نفسه أو ولده أو ماله بالشر… فلو استجاب له ربه لهلك بدعائه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/11.json

**Wamada 109 — سورة الإسراء – الآية 18** (`lataif:w109`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:18. — https://tanzil.net/#17:18
- ✓ verse-reference: Shown «سورة الإسراء – الآية 18» = surah الإسراء 17:18. — https://tanzil.net/#17:18
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 17:18: «العاجلة صفة موصوف محذوف… أي الحياة العاجلة»; «يعطاه بعضهم بالمقادير التي شاء الله إعطاءها… لمن نريد بدل بعض من كل». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/17/18.json

**Wamada 110 — سورة الإسراء – الآية 19** (`lataif:w110`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:19. — https://tanzil.net/#17:19
- ✓ verse-reference: Shown «سورة الإسراء – الآية 19» = surah الإسراء 17:19. — https://tanzil.net/#17:19
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) quoting 17:19: «فأخبر أن السعي المشكور: سعي من أراد الآخرة»; the three conditions restate the verse. — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 111 — سورة الإسراء – الآية 20** (`lataif:w111`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 17:20; spelling-convention differences only (no change of word or reading): «هَؤُلَاءِ وَهَؤُلَاءِ» / Tanzil «هَٰؤُلَاءِ وَهَٰؤُلَاءِ». — https://tanzil.net/#17:20
- ✓ verse-reference: Shown «سورة الإسراء – الآية 20» = surah الإسراء 17:20. — https://tanzil.net/#17:20
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 17:20: «كل واحد من الفريقين الذين أرادوا الدنيا والذين أرادوا الآخرة نمدهم فيما هم فيه… وما كان عطاء ربك محظوراً، أي: ممنوعاً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/20.json

**Wamada 113 — سورة الإسراء – الآية 24** (`lataif:w113`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:24. — https://tanzil.net/#17:24
- ✓ verse-reference: Shown «سورة الإسراء – الآية 24» = surah الإسراء 17:24. — https://tanzil.net/#17:24
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 17:24: «بتصويره في هيئة تذلل الطائر عندما يعتريه خوف… إذ يخفض جناحه متذللاً، ففي التركيب استعارة مكنية». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/17/24.json

**Wamada 114 — سورة الإسراء – الآية 27** (`lataif:w114`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:27. — https://tanzil.net/#17:27
- ✓ verse-reference: Shown «سورة الإسراء – الآية 27» = surah الإسراء 17:27. — https://tanzil.net/#17:27
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 17:26–27: «التبذير: الإنفاق في غير حق» (Ibn Masud, Ibn Abbas); «إخوان الشياطين، أي: أشباههم في ذلك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/27.json

**Wamada 115 — سورة الإسراء – الآية 29** (`lataif:w115`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 17:29; spelling-convention differences only (no change of word or reading): «إِلَى» / Tanzil «إِلَىٰ». — https://tanzil.net/#17:29
- ✓ verse-reference: Shown «سورة الإسراء – الآية 29» = surah الإسراء 17:29. — https://tanzil.net/#17:29
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 17:29: «هذا تمثيل لمنع الشحيح وإعطاء المسرف، وأمر بالاقتصاد الذي هو بين الإسراف والتقتير… ملوماً… محسوراً منقطعاً بك لا شيء عندك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/17/29.json

**Wamada 116 — سورة الإسراء – الآية 30** (`lataif:w116`) — **Verified**
- ✓ quran-verse: Corrected 2026-10-31 and rechecked: Verse now letter-and-vowel identical to Tanzil 17:30. (Before correction: Tanzil 17:30: missing short vowels: «الرِّزْق لمن» for Tanzil «الرِّزْقَ لِمَن».) — https://tanzil.net/#17:30
- ✓ verse-reference: Shown «سورة الإسراء – الآية 30» = surah الإسراء 17:30. — https://tanzil.net/#17:30
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 17:30: «ويقدر… ويقتّر… فيضيّق عليه… إن ربك ذو خبرة بعباده، ومن الذي تصلحه السعة في الرزق وتفسده، ومن الذي يصلحه الإقتار والضيق ويهلكه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/17/30.json

**Wamada 117 — سورة الإسراء – الآية 36** (`lataif:w117`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:36. — https://tanzil.net/#17:36
- ✓ verse-reference: Shown «سورة الإسراء – الآية 36» = surah الإسراء 17:36. — https://tanzil.net/#17:36
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 17:36: «ومضمون ما ذكروه: أن الله تعالى نهى عن القول بلا علم، بل بالظن الذي هو التوهم والخيال»; Qatada: «لا تقل رأيت ولم تر… فإن الله سائلك عن ذلك كله». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/36.json

**Wamada 118 — سورة الإسراء – الآية 53** (`lataif:w118`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:53. — https://tanzil.net/#17:53
- ✓ verse-reference: Shown «سورة الإسراء – الآية 53» = surah الإسراء 17:53. — https://tanzil.net/#17:53
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 17:53: «يقولوا… الكلمة التي هي أحسن وألين ولا يخاشنوهم»; the warning about the devil sowing discord is the verse; the family application is an application. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/17/53.json

**Wamada 119 — سورة الإسراء – الآية 78** (`lataif:w119`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 17:78; spelling-convention differences only (no change of word or reading): «إِلَى» / Tanzil «إِلَىٰ». — https://tanzil.net/#17:78
- ✓ verse-reference: Shown «سورة الإسراء – الآية 78» = surah الإسراء 17:78. — https://tanzil.net/#17:78
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 17:78, with the Prophet's explanation of «إن قرآن الفجر كان مشهوداً»: «تشهده ملائكة الليل وملائكة النهار» (al-Bukhari, al-Tirmidhi and others). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/78.json

**Wamada 121 — سورة الإسراء – الآية 84** (`lataif:w121`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 17:84; spelling-convention differences only (no change of word or reading): «قُل» / Tanzil «قُلْ»; «عَلَى» / Tanzil «عَلَىٰ»; «أَهْدَى» / Tanzil «أَهْدَىٰ». — https://tanzil.net/#17:84
- ✓ verse-reference: Shown «سورة الإسراء – الآية 84» = surah الإسراء 17:84. — https://tanzil.net/#17:84
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.), باب الإرادة, on 17:84: «فإن معنى الآية: كل يعمل على ما يشاكله ويناسبه ويليق به، فالفاجر يعمل على ما يليق به». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 122 — سورة الكهف – الآية 6** (`lataif:w122`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 18:6. — https://tanzil.net/#18:6
- ✓ verse-reference: Shown «سورة الكهف – الآية 6» = surah الكهف 18:6. — https://tanzil.net/#18:6
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 18:6: «قاتل نفسك ومهلكها على آثار قومك… حزناً وتلهفاً ووجداً بإدبارهم عنك… يقال منه: بخع فلان نفسه»; «وهذه معاتبة من الله… على وجده». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/18/6.json

**Wamada 123 — سورة الكهف – الآية 10** (`lataif:w123`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 18:10. — https://tanzil.net/#18:10
- ✓ verse-reference: Shown «سورة الكهف – الآية 10» = surah الكهف 18:10. — https://tanzil.net/#18:10
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 18:10: «يخبر تعالى عن أولئك الفتية الذين فروا بدينهم من قومهم لئلا يفتنوهم عنه، فهربوا منه فلجؤوا إلى غار»; the request for «رشداً» is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/18/10.json

**Wamada 127 — سورة الكهف – الآية 46** (`lataif:w127`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 18:46. — https://tanzil.net/#18:46
- ✓ verse-reference: Shown «سورة الكهف – الآية 46» = surah الكهف 18:46. — https://tanzil.net/#18:46
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 18:46: «الباقيات الصالحات أعمال الخير التي تبقى ثمرتها للإنسان، وتفنى عنه كل ما تطمح إليه نفسه من حظوظ الدنيا». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/18/46.json

**Wamada 130 — سورة الكهف – الآية 79** (`lataif:w130`) — **Verified**
- ✓ quran-verse: Corrected 2026-10-31 and rechecked: Verse now letter-and-vowel identical to Tanzil 18:79. (Before correction: Tanzil 18:79: missing fatha: «وَرَاءهُم» for Tanzil «وَرَاءَهُم».) — https://tanzil.net/#18:79
- ✓ verse-reference: Shown «سورة الكهف – الآية 79» = surah الكهف 18:79. — https://tanzil.net/#18:79
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 18:79: «إنما خرقتها لأعيبها… ملك من الظلمة يأخذ كل سفينة صالحة… لأرده عنها لعيبها، فينتفع بها أصحابها المساكين الذين لم يكن لهم شيء ينتفعون به غيرها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/18/79.json

**Wamada 131 — سورة الكهف – الآية 82** (`lataif:w131`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 18:82. — https://tanzil.net/#18:82
- ✓ verse-reference: Shown «سورة الكهف – الآية 82» = surah الكهف 18:82. — https://tanzil.net/#18:82
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 18:82: the two orphans «حفظا بصلاح أبيهما»; the treasure under the wall and their reaching maturity are the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/18/82.json

**Wamada 133 — سورة مريم – الآيتان 29–30** (`lataif:w133`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 19:29-30. — https://tanzil.net/#19:29
- ✓ verse-reference: Shown «سورة مريم – الآيتان 29–30» = surah مريم 19:29-30. — https://tanzil.net/#19:29
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 19:30: «أنطقه الله أولاً بأنه عبد الله رداً لقول النصارى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/19/29.json

**Wamada 135 — سورة مريم – الآية 59** (`lataif:w135`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 19:59. — https://tanzil.net/#19:59
- ✓ verse-reference: Shown «سورة مريم – الآية 59» = surah مريم 19:59. — https://tanzil.net/#19:59
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 19:59: «أضاعوا الصلاة… وإذا أضاعوها فهم لما سواها من الواجبات أضيع؛ لأنها عماد الدين وقوامه… وأقبلوا على شهوات الدنيا وملاذها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/19/59.json

**Wamada 136 — سورة النساء – الآية 135** (`lataif:w136`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:135. — https://tanzil.net/#4:135
- ✓ verse-reference: Shown «سورة النساء – الآية 135» = surah النساء 4:135. — https://tanzil.net/#4:135
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 4:135: «وإن كانت الشهادة على والديك وقرابتك فلا تراعهم فيها، بل اشهد بالحق وإن عاد ضررها عليهم، فإن الحق حاكم على كل أحد». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/4/135.json

**Wamada 137 — سورة النساء – الآية 141** (`lataif:w137`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:141. — https://tanzil.net/#4:141
- ✓ verse-reference: Shown «سورة النساء – الآية 141» = surah النساء 4:141. — https://tanzil.net/#4:141
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 4:141 on the hypocrites and the «فتح» of the Muslims versus the disbelievers' «نصيب»; the description of their claims restates the verse («ألم نكن معكم… ألم نستحوذ عليكم ونمنعكم»). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/4/141.json

**Wamada 138 — سورة النساء – الآية 142** (`lataif:w138`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:142. — https://tanzil.net/#4:142
- ✓ verse-reference: Shown «سورة النساء – الآية 142» = surah النساء 4:142. — https://tanzil.net/#4:142
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) on the hypocrites, quoting 4:142: «قام بهم والله الرياء… وقعد بهم الكسل عما أمروا به… فأصبح الإخلاص عليهم لذلك ثقيلاً». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 139 — سورة النساء – الآية 143** (`lataif:w139`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:143. — https://tanzil.net/#4:143
- ✓ verse-reference: Shown «سورة النساء – الآية 143» = surah النساء 4:143. — https://tanzil.net/#4:143
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 4:143: «ذبذبهم الشيطان والهوى بين الإيمان والكفر، فهم مترددون بينهما متحيرون. وحقيقة المذبذب الذي يُذَبّ عن كلا الجانبين… فلا يقر في جانب واحد». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/4/143.json

**Wamada 140 — سورة النساء – الآية 148** (`lataif:w140`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:148. — https://tanzil.net/#4:148
- ✓ verse-reference: Shown «سورة النساء – الآية 148» = surah النساء 4:148. — https://tanzil.net/#4:148
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 4:148 (Ibn Abbas): «لا يحب الله أن يدعو أحد على أحد، إلا أن يكون مظلوماً، فإنه قد أرخص له أن يدعو على من ظلمه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/4/148.json

**Wamada 143 — سورة النساء – الآية 162** (`lataif:w143`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:162. — https://tanzil.net/#4:162
- ✓ verse-reference: Shown «سورة النساء – الآية 162» = surah النساء 4:162. — https://tanzil.net/#4:162
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat, «رسخ»: «رسوخ الشيء ثباته ثباتاً متمكناً… والراسخ في العلم المتحقق به الذي لا يعرضه شبهة». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 151 — سورة المائدة – الآية 7** (`lataif:w151`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:7. — https://tanzil.net/#5:7
- ✓ verse-reference: Shown «سورة المائدة – الآية 7» = surah المائدة 5:7. — https://tanzil.net/#5:7
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 5:7: the reminder of the covenant (Ubada: «بايعنا رسول الله على السمع والطاعة في منشطنا ومكرهنا»). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/7.json

**Wamada 152 — سورة المائدة – الآية 13** (`lataif:w152`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:13. — https://tanzil.net/#5:13
- ✓ verse-reference: Shown «سورة المائدة – الآية 13» = surah المائدة 5:13. — https://tanzil.net/#5:13
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) quoting 5:13: «وأخبر أن نقض الميثاق الذي أخذه على عباده سبب لتقسية القلب… فجعل ذنب النقض موجباً لهذه الآثار: من تقسية القلب واللعنة». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 153 — سورة المائدة – الآية 15** (`lataif:w153`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:15. — https://tanzil.net/#5:15
- ✓ verse-reference: Shown «سورة المائدة – الآية 15» = surah المائدة 5:15. — https://tanzil.net/#5:15
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 5:15: «يبين لهم كثيراً مما كانوا يخفون من الكتاب، ثم أعقبه بأنه يعفو عن كثير. ومعنى يعفو: يعرض ولا…». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/15.json

**Wamada 154 — سورة المائدة – الآية 22** (`lataif:w154`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:22. — https://tanzil.net/#5:22
- ✓ verse-reference: Shown «سورة المائدة – الآية 22» = surah المائدة 5:22. — https://tanzil.net/#5:22
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 5:22: their reply out of fear «وجزعاً من قتالهم… إن يخرج منها هؤلاء الجبارون دخلناها، وإلا فإنا لا نطيق دخولها… لا طاقة لنا بهم»; the spies: «وكنا في أعينهم مثل الجراد». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/22.json

**Wamada 155 — سورة المائدة – الآية 23** (`lataif:w155`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:23. — https://tanzil.net/#5:23
- ✓ verse-reference: Shown «سورة المائدة – الآية 23» = surah المائدة 5:23. — https://tanzil.net/#5:23
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «تفسير ابن كثير»; quoted wording verbatim in it at 5:23: «متى توكلتم على الله واتبعتم أمره، ووافقتم رسوله، نصركم الله على أعدائكم»; the unsupported claim (المفاجأة, الخطة) removed. (Before correction: Cited work: تفسير ابن كثير. Ibn Kathir at 5:23 names the two men (Yusha b. Nun and Kalib b. Yufanna) and explains their advice as «متى توكلتم على الله واتبعتم أمره… نصركم الله على أعدائكم»; the reflection's «military plan based on surprise… breaking enemy lines… smart means» is not in it.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/23.json

**Wamada 157 — سورة المائدة – الآية 27** (`lataif:w157`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:27. — https://tanzil.net/#5:27
- ✓ verse-reference: Shown «سورة المائدة – الآية 27» = surah المائدة 5:27. — https://tanzil.net/#5:27
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 5:27: «مبيناً وخيم عاقبة البغي والحسد والظلم في خبر ابني آدم… فقتله بغياً عليه وحسداً له فيما وهبه الله من النعمة وتقبّل القربان». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/27.json

**Wamada 159 — سورة المائدة – الآية 32** (`lataif:w159`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:32. — https://tanzil.net/#5:32
- ✓ verse-reference: Shown «سورة المائدة – الآية 32» = surah المائدة 5:32. — https://tanzil.net/#5:32
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 5:32: «كتبنا عليهم شأناً مهماً هو مماثلة قتل نفس واحدة بغير حق لقتل القاتل الناس أجمعين»; saving a life restates the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/32.json

**Wamada 162 — سورة المائدة – الآية 41** (`lataif:w162`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:41. — https://tanzil.net/#5:41
- ✓ verse-reference: Shown «سورة المائدة – الآية 41» = surah المائدة 5:41. — https://tanzil.net/#5:41
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 5:41: «وهذا تسلية من الله تعالى ذكره نبيه محمداً ﷺ من حزنه على مسارعة الذين قصّ قصتهم من اليهود والمنافقين»; «آمنا بأفواههم ولم تؤمن قلوبهم» is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/41.json

**Wamada 164 — سورة المائدة – الآية 44** (`lataif:w164`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:44. — https://tanzil.net/#5:44
- ✓ verse-reference: Shown «سورة المائدة – الآية 44» = surah المائدة 5:44. — https://tanzil.net/#5:44
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 5:44: «فلا تخشوا الناس واخشون، أي: لا تخافوا منهم وخافوني», in the context of those who sought «فتيا دون الرجم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/44.json

**Wamada 165 — سورة المائدة – الآية 45** (`lataif:w165`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:45. — https://tanzil.net/#5:45
- ✓ verse-reference: Shown «سورة المائدة – الآية 45» = surah المائدة 5:45. — https://tanzil.net/#5:45
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «جامع البيان - الطبري»; no quotation; the unsupported claim (طبيقية) removed. (Before correction: Cited work: جامع البيان - الطبري. al-Tabari at 5:45 supports retaliation organ for organ («ويقطع الأنف بالأنف… وتقتص الجراح بالجراح»), but frames it «يستوي فيه أحرار المسلمين فيما بينهم… ويستوي فيه العبيد… فيما بينهم» — by legal status — whereas the reflection says «دون تفرقة طبقية».) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/45.json

**Wamada 167 — سورة المائدة – الآية 48** (`lataif:w167`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:48. — https://tanzil.net/#5:48
- ✓ verse-reference: Shown «سورة المائدة – الآية 48» = surah المائدة 5:48. — https://tanzil.net/#5:48
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 5:48: «وفرّع على ليبلوكم قوله: فاستبقوا الخيرات… والاستباق: التسابق، وهو هنا مجاز في المنافسة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/48.json

**Wamada 168 — سورة المائدة – الآية 50** (`lataif:w168`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:50. — https://tanzil.net/#5:50
- ✓ verse-reference: Shown «سورة المائدة – الآية 50» = surah المائدة 5:50. — https://tanzil.net/#5:50
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 5:50: «ولا تتبع أهواءهم، أي: آراءهم التي اصطلحوا عليها»; rules «أخذها من مجرد نظره وهواه… يقدمونها على الحكم بكتاب الله». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/50.json

**Wamada 169 — سورة المائدة – الآية 52** (`lataif:w169`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:52. — https://tanzil.net/#5:52
- ✓ verse-reference: Shown «سورة المائدة – الآية 52» = surah المائدة 5:52. — https://tanzil.net/#5:52
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 5:52: «يسارعون فيهم: ينكمشون في موالاتهم ويرغبون فيها، ويعتذرون بأنهم لا يأمنون أن تصيبهم دائرة من دوائر الزمان… فيحتاجون إليهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/5/52.json

**Wamada 170 — سورة المائدة – الآية 54** (`lataif:w170`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:54. — https://tanzil.net/#5:54
- ✓ verse-reference: Shown «سورة المائدة – الآية 54» = surah المائدة 5:54. — https://tanzil.net/#5:54
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) on 5:54: four signs of those God loves; «لما كان الذل منهم ذل رحمة وعطف وشفقة وإخبات عدّاه بأداة على… وإنما هو ذل اللين والانقياد». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 171 — سورة المائدة – الآية 54** (`lataif:w171`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:54. — https://tanzil.net/#5:54
- ✓ verse-reference: Shown «سورة المائدة – الآية 54» = surah المائدة 5:54. — https://tanzil.net/#5:54
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) on 5:54: «العلامة الرابعة: أنهم لا تأخذهم في الله لومة لائم، وهذا علامة صحة المحبة»; and of the one who «قد زهد في مدحهم وثنائهم». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 173 — سورة الأعراف – الآية 117** (`lataif:w173`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 7:117; spelling-convention differences only (no change of word or reading): «إِلَى مُوسَى» / Tanzil «إِلَىٰ مُوسَىٰ». — https://tanzil.net/#7:117
- ✓ verse-reference: Shown «سورة الأعراف – الآية 117» = surah الأعراف 7:117. — https://tanzil.net/#7:117
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 7:116–117: «سحروا أعين الناس: أروها بالحيل والشعوذة، وخيّلوا إليها ما الحقيقة بخلافه»; the staff swallowing what they faked is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/7/117.json

**Wamada 176 — سورة الأعراف – الآية 176** (`lataif:w176`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:176. — https://tanzil.net/#7:176
- ✓ verse-reference: Shown «سورة الأعراف – الآية 176» = surah الأعراف 7:176. — https://tanzil.net/#7:176
- ✓ reflection-attribution: Cited work: الفوائد - ابن القيم. al-Fawaid on 7:176: «وأصل الإخلاد اللزوم على الدوام… وعبّر عن ميله إلى الدنيا بإخلاده إلى الأرض… شبه لهثه على الدنيا وعدم صبره عنها وجزعه لفقدها وحرصه على تحصيلها بلهث الكلب». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.Fawaid/0751IbnQayyimJawziyya.Fawaid.JK000060-ara1

**Wamada 178 — سورة الأعراف – الآية 187** (`lataif:w178`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:187. — https://tanzil.net/#7:187
- ✓ verse-reference: Shown «سورة الأعراف – الآية 187» = surah الأعراف 7:187. — https://tanzil.net/#7:187
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 7:187: «مرساها: إرساؤها أو وقت إرسائها، أي إثباتها وإقرارها. وكل شيء ثقيل رسوّه ثباته واستقراره. ومنه: رسى الجبل وأرسى السفينة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/7/187.json

**Wamada 179 — سورة الأنفال – الآية 5** (`lataif:w179`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:5. — https://tanzil.net/#8:5
- ✓ verse-reference: Shown «سورة الأنفال – الآية 5» = surah الأنفال 8:5. — https://tanzil.net/#8:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 8:5: they wanted the caravan «التي لا حد لها ولا منعة»; «وهو أعلم بعواقب الأمور، وهو الذي دبّركم بحسن تدبيره، وإن كان العباد يحبون خلاف ذلك فيما يظهر لهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/8/5.json

**Wamada 181 — سورة الأنفال – الآية 33** (`lataif:w181`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:33. — https://tanzil.net/#8:33
- ✓ verse-reference: Shown «سورة الأنفال – الآية 33» = surah الأنفال 8:33. — https://tanzil.net/#8:33
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 8:33 (Ibn Abbas): «كان فيهم أمانان: النبي ﷺ والاستغفار، فذهب النبي ﷺ وبقي الاستغفار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/8/33.json

**Wamada 182 — سورة الأنفال – الآية 30** (`lataif:w182`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:30. — https://tanzil.net/#8:30
- ✓ verse-reference: Shown «سورة الأنفال – الآية 30» = surah الأنفال 8:30. — https://tanzil.net/#8:30
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 8:30: «ليثبتوك: ليوثقوك… ليشدّوك وثاقاً», with the Dar al-Nadwa council of Quraysh. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/8/30.json

**Wamada 184 — سورة الأنفال – الآية 61** (`lataif:w184`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 8:61; spelling-convention differences only (no change of word or reading): «وَتَوَكَّل» / Tanzil «وَتَوَكَّلْ». — https://tanzil.net/#8:61
- ✓ verse-reference: Shown «سورة الأنفال – الآية 61» = surah الأنفال 8:61. — https://tanzil.net/#8:61
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 8:61: «والجنوح: الميل، وهو مشتق من جناح الطائر»; «وإن مالوا لأجل السلم ورغبة فيه لا لغرض آخر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/8/61.json

**Wamada 185 — سورة التوبة – الآية 109** (`lataif:w185`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:109. — https://tanzil.net/#9:109
- ✓ verse-reference: Shown «سورة التوبة – الآية 109» = surah التوبة 9:109. — https://tanzil.net/#9:109
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 9:109: «أفمن أسس بنيان دينه على قاعدة قوية محكمة وهي الحق الذي هو تقوى الله… أم من أسسه على… الباطل والنفاق الذي مثله مثل شفا جرف هار في قلة الثبات». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/9/109.json

**Wamada 189 — سورة الرعد – الآية 12** (`lataif:w189`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 13:12. — https://tanzil.net/#13:12
- ✓ verse-reference: Shown «سورة الرعد – الآية 12» = surah الرعد 13:12. — https://tanzil.net/#13:12
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 13:12: «ومعنى الخوف والطمع: أن وقوع الصواعق يخاف عند لمع البرق، ويطمع في الغيث»; balancing fear and hope is an application. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/13/12.json

**Wamada 191 — سورة الحجر – الآية 21** (`lataif:w191`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 15:21. — https://tanzil.net/#15:21
- ✓ verse-reference: Shown «سورة الحجر – الآية 21» = surah الحجر 15:21. — https://tanzil.net/#15:21
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 15:21: «والخزائن تمثيل لصلوحية القدرة الإلهية لتكوين الأشياء النافعة»; «وما ننزله إلا بقدر معلوم: أطلق الإنزال على تمكين الناس من…». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/15/21.json

**Wamada 194 — سورة النحل – الآية 78** (`lataif:w194`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:78. — https://tanzil.net/#16:78
- ✓ verse-reference: Shown «سورة النحل – الآية 78» = surah النحل 16:78. — https://tanzil.net/#16:78
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 16:78: hearing, sight «والأفئدة -وهي العقول-… وهذه القوى والحواس تحصل للإنسان على التدريج قليلاً قليلاً»; born knowing nothing is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/16/78.json

**Wamada 195 — سورة النحل – الآيتان 58–59** (`lataif:w195`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:58-59. — https://tanzil.net/#16:58
- ✓ verse-reference: Shown «سورة النحل – الآيتان 58–59» = surah النحل 16:58-59. — https://tanzil.net/#16:58
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 16:58–59: «والكظيم: الغضبان المملوء حنقاً… وهذا من جاهليتهم الجهلاء وظلمهم، إذ يعاملون المرأة معاملة من لو كانت ولادة الذكور باختيارها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/16/58.json

**Wamada 196 — سورة النحل – الآية 90** (`lataif:w196`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:90. — https://tanzil.net/#16:90
- ✓ verse-reference: Shown «سورة النحل – الآية 90» = surah النحل 16:90. — https://tanzil.net/#16:90
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 16:90: «يأمر عباده بالعدل… ويندب إلى الإحسان»; Ibn Masud: «إن أجمع آية في القرآن في سورة النحل: إن الله يأمر بالعدل والإحسان». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/16/90.json

**Wamada 199 — سورة النحل – الآيتان 127–128** (`lataif:w199`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:127-128. — https://tanzil.net/#16:127
- ✓ verse-reference: Shown «سورة النحل – الآيتان 127–128» = surah النحل 16:127-128. — https://tanzil.net/#16:127
- ✓ reflection-attribution: Cited work: طريق الهجرتين - ابن القيم. Tariq al-Hijratayn: grief is not commanded but forbidden, citing «ولا تحزن عليهم ولا تك في ضيق مما يمكرون» — «فالحزن بلية من البلايا»; patience «واصبر وما صبرك إلا بالله». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.TariqHijratayn/0751IbnQayyimJawziyya.TariqHijratayn.JK000065-ara1

**Wamada 200 — سورة الإسراء – الآية 13** (`lataif:w200`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:13. — https://tanzil.net/#17:13
- ✓ verse-reference: Shown «سورة الإسراء – الآية 13» = surah الإسراء 17:13. — https://tanzil.net/#17:13
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 17:13: «وطائره: هو ما طار عنه من عمله… إنما ذكر العنق لأنه عضو لا نظير له في الجسد، ومن ألزم بشيء فيه فلا محيد له عنه»; the open book on the Day of Resurrection. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/13.json

**Wamada 202 — سورة الإسراء – الآية 37** (`lataif:w202`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:37. — https://tanzil.net/#17:37
- ✓ verse-reference: Shown «سورة الإسراء – الآية 37» = surah الإسراء 17:37. — https://tanzil.net/#17:37
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 17:37: «والمرح… شدة ازدهاء المرء وفرحه بحاله في عظمة الرزق… مشية المارح… الدالة على كبرياء الماشي بتمايل وتبختر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/17/37.json

**Wamada 203 — سورة الإسراء – الآية 53** (`lataif:w203`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:53. — https://tanzil.net/#17:53
- ✓ verse-reference: Shown «سورة الإسراء – الآية 53» = surah الإسراء 17:53. — https://tanzil.net/#17:53
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 17:53: «يقولوا… الكلمة التي هي أحسن وألين ولا يخاشنوهم»; the devil sowing discord is the verse; family application. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/17/53.json

**Wamada 208 — سورة الكهف – الآية 46** (`lataif:w208`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 18:46. — https://tanzil.net/#18:46
- ✓ verse-reference: Shown «سورة الكهف – الآية 46» = surah الكهف 18:46. — https://tanzil.net/#18:46
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 18:46: «الباقيات الصالحات أعمال الخير التي تبقى ثمرتها للإنسان، وتفنى عنه كل ما تطمح إليه نفسه من حظوظ الدنيا». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/18/46.json

**Wamada 210 — سورة مريم – الآيتان 29–30** (`lataif:w210`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 19:29-30. — https://tanzil.net/#19:29
- ✓ verse-reference: Shown «سورة مريم – الآيتان 29–30» = surah مريم 19:29-30. — https://tanzil.net/#19:29
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 19:30: «أنطقه الله أولاً بأنه عبد الله رداً لقول النصارى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/19/29.json

**Wamada 212 — سورة طه – الآيات 1–3** (`lataif:w212`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 20:1-3. — https://tanzil.net/#20:1
- ✓ verse-reference: Shown «سورة طه – الآيات 1–3» = surah طه 20:1-3. — https://tanzil.net/#20:1
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (البشر, السعادة) removed. (Before correction: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 20:1–3 reads it as kindness to the Prophet: «افتتحت السورة بملاطفة النبي ﷺ بأن الله لم يرد من إرساله وإنزال القرآن عليه أن يشقى بذلك… ولكن أراد أن يذكّر بالقرآن من يخاف وعيده»; the reflection widens it to all people and adds «بوابة للسكينة والسعادة», which he does not say.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/20/1.json

**Wamada 217 — سورة طه – الآيتان 85–86** (`lataif:w217`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 20:85-86. — https://tanzil.net/#20:85
- ✓ verse-reference: Shown «سورة طه – الآيتان 85–86» = surah طه 20:85-86. — https://tanzil.net/#20:85
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 20:85–86: Musa's appointment «ثلاثين ليلة ثم أتبعها له عشراً، فتمت أربعين ليلة», during which al-Samiri led the people to the calf; the lesson for educators is an application. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/20/85.json

**Wamada 219 — سورة طه – الآية 124** (`lataif:w219`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 20:124; spelling-convention differences only (no change of word or reading): «أَعْمَى» / Tanzil «أَعْمَىٰ». — https://tanzil.net/#20:124
- ✓ verse-reference: Shown «سورة طه – الآية 124» = surah طه 20:124. — https://tanzil.net/#20:124
- ✓ reflection-attribution: Cited work: طريق الهجرتين - ابن القيم. Tariq al-Hijratayn: «ولا صلاح لهم ولا فلاح ولا نعيم ولا لذة ولا سرور بدون ذلك بحال، فمن أعرض عن ذكر ربه فإن له معيشة ضنكاً». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.TariqHijratayn/0751IbnQayyimJawziyya.TariqHijratayn.JK000065-ara1

**Wamada 220 — سورة الأنبياء – الآية 1** (`lataif:w220`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 21:1. — https://tanzil.net/#21:1
- ✓ verse-reference: Shown «سورة الأنبياء – الآية 1» = surah الأنبياء 21:1. — https://tanzil.net/#21:1
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 21:1–2: «هذا تنبيه من الله عز وجل على اقتراب الساعة ودنوها، وأن الناس في غفلة عنها، أي: لا يعملون لها»; «إلا استمعوه وهم يلعبون». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/21/1.json

**Wamada 221 — سورة الأنبياء – الآية 18** (`lataif:w221`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 21:18. — https://tanzil.net/#21:18
- ✓ verse-reference: Shown «سورة الأنبياء – الآية 18» = surah الأنبياء 21:18. — https://tanzil.net/#21:18
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 21:18: «واستعار لذلك القذف والدمغ تصويراً لإبطاله وإهداره ومحقه، فجعله كأنه جرم صلب كالصخرة مثلاً قذف به على جرم رخو أجوف فدمغه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/21/18.json

**Wamada 222 — سورة الأنبياء – الآية 37** (`lataif:w222`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 21:37. — https://tanzil.net/#21:37
- ✓ verse-reference: Shown «سورة الأنبياء – الآية 37» = surah الأنبياء 21:37. — https://tanzil.net/#21:37
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 21:37: «فلا جرم كان الإنسان عجولاً بالطبع فكأنه مخلوق من العجلة»; the curb on haste is «فلا تستعجلون». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/21/37.json

**Wamada 225 — سورة الأنبياء – الآية 87** (`lataif:w225`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 21:87. — https://tanzil.net/#21:87
- ✓ verse-reference: Shown «سورة الأنبياء – الآية 87» = surah الأنبياء 21:87. — https://tanzil.net/#21:87
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 21:87: «فظن أن لن نقدر عليه، أي: نضيّق عليه»; Ibn Masud: «ظلمة بطن الحوت، وظلمة البحر، وظلمة الليل». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/21/87.json

**Wamada 226 — سورة الحج – الآيتان 1–2** (`lataif:w226`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 22:1-2. — https://tanzil.net/#22:1
- ✓ verse-reference: Shown «سورة الحج – الآيتان 1–2» = surah الحج 22:1-2. — https://tanzil.net/#22:1
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 22:2: «لم قيل مرضعة دون مرضع؟ قلت: المرضعة التي هي في حال الإرضاع ملقمة ثديها الصبي… إذا فوجئت به هذه وقد ألقمت الرضيع ثديها نزعته عن فيه لما يلحقها من الدهشة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/22/1.json

**Wamada 228 — سورة الحج – الآية 18** (`lataif:w228`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 22:18. — https://tanzil.net/#22:18
- ✓ verse-reference: Shown «سورة الحج – الآية 18» = surah الحج 22:18. — https://tanzil.net/#22:18
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 22:18: «سجود الموجودات غير الإنسانية ليس إلا دلالة تلك الموجودات على أنها مسخرة بخلق الله، فاستعير السجود لحالة التسخير والانطباع»; man's choice is «وكثير من الناس». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/22/18.json

**Wamada 231 — سورة المؤمنون – الآيتان 99–100** (`lataif:w231`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 23:99-100. — https://tanzil.net/#23:99
- ✓ verse-reference: Shown «سورة المؤمنون – الآيتان 99–100» = surah المؤمنون 23:99-100. — https://tanzil.net/#23:99
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 23:99–100: «يخبر تعالى عن حال المحتضر عند الموت… وسؤالهم الرجعة إلى الدنيا ليصلح ما كان أفسده في مدة حياته»; «كلا» is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/23/99.json

**Wamada 233 — سورة المؤمنون – الآيتان 115–116** (`lataif:w233`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 23:115-116. — https://tanzil.net/#23:115
- ✓ verse-reference: Shown «سورة المؤمنون – الآيتان 115–116» = surah المؤمنون 23:115-116. — https://tanzil.net/#23:115
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 23:115: «والعبث: العمل الذي لا فائدة فيه… فلو لم يكن خلق البشر في هذه الحياة مرتباً عليه مجازاة الفاعلين على أفعالهم لكان خالقه قد أتى في فعله بشيء عديم…». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/23/115.json

**Wamada 234 — سورة النور – الآية 30** (`lataif:w234`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 24:30. — https://tanzil.net/#24:30
- ✓ verse-reference: Shown «سورة النور – الآية 30» = surah النور 24:30. — https://tanzil.net/#24:30
- ✓ reflection-attribution: Cited work: إغاثة اللهفان - ابن القيم. Ighathat al-Lahfan: «والعين رائد القلب، فيبعث رائده لنظر ما هناك، فإذا أخبره بحسن المنظور إليه وجماله تحرك اشتياقاً إليه»; and on 24:30 «فجعل الزكاة بعد غض البصر وحفظ الفرج». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.IghathatLahfan/0751IbnQayyimJawziyya.IghathatLahfan.JK000087-ara1

**Wamada 237 — سورة النور – الآية 39** (`lataif:w237`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 24:39. — https://tanzil.net/#24:39
- ✓ verse-reference: Shown «سورة النور – الآية 39» = surah النور 24:39. — https://tanzil.net/#24:39
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 24:39: «شبّه ما يعمله من لا يعتقد الإيمان… من الأعمال الصالحة التي يحسبها تنفعه عند الله… ثم تخيب في العاقبة أمله ويلقى خلاف ما قدّر، بسراب يراه الكافر… وقد غلبه عطش يوم القيامة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/24/39.json

**Wamada 238 — سورة الفرقان – الآية 30** (`lataif:w238`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 25:30; spelling-convention differences only (no change of word or reading): «هَذَا» / Tanzil «هَٰذَا». — https://tanzil.net/#25:30
- ✓ verse-reference: Shown «سورة الفرقان – الآية 30» = surah الفرقان 25:30. — https://tanzil.net/#25:30
- ✓ reflection-attribution: Cited work: الفوائد - ابن القيم. al-Fawaid: «هجر القرآن أنواع: أحدها هجر سماعه… والثاني هجر العمل به… والثالث هجر تحكيمه… والرابع هجر تدبره وتفهمه… والخامس هجر الاستشفاء والتداوي به». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.Fawaid/0751IbnQayyimJawziyya.Fawaid.JK000060-ara1

**Wamada 239 — سورة الفرقان – الآية 20** (`lataif:w239`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 25:20. — https://tanzil.net/#25:20
- ✓ verse-reference: Shown «سورة الفرقان – الآية 20» = surah الفرقان 25:20. — https://tanzil.net/#25:20
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (الغني فتنة) removed. (Before correction: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 25:20 illustrates the mutual trial with the Quraysh elite who refused Islam because Ammar, Suhayb and Bilal preceded them, and reads «أتصبرون» as consolation and an urging to patience for the Prophet; the reflection's general list (rich/poor, oppressor/oppressed, sick/healthy) is not in his text.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/25/20.json

**Wamada 241 — سورة الشعراء – الآية 3** (`lataif:w241`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 26:3. — https://tanzil.net/#26:3
- ✓ verse-reference: Shown «سورة الشعراء – الآية 3» = surah الشعراء 26:3. — https://tanzil.net/#26:3
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 26:3: «لعلك يا محمد قاتل نفسك ومهلكها إن لم يؤمن قومك بك… والبخع: هو القتل والإهلاك في كلام العرب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/26/3.json

**Wamada 242 — سورة الشعراء – الآيات 78–80** (`lataif:w242`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 26:78-80. — https://tanzil.net/#26:78
- ✓ verse-reference: Shown «سورة الشعراء – الآيات 78–80» = surah الشعراء 26:78-80. — https://tanzil.net/#26:78
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 26:80: «أسند المرض إلى نفسه، وإن كان عن قدر الله وقضائه وخلقه، ولكن أضافه إلى نفسه أدباً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/26/78.json

**Wamada 245 — سورة النمل – الآية 40** (`lataif:w245`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 27:40. — https://tanzil.net/#27:40
- ✓ verse-reference: Shown «سورة النمل – الآية 40» = surah النمل 27:40. — https://tanzil.net/#27:40
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 27:40: «فليس إحسان الله إليه إلا فضلاً محضاً، ولم يشتغل سليمان حين أحضر له العرش بأن يبتهج بسلطانه ولا بمقدرة رجاله»; the test of gratitude is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/27/40.json

**Wamada 248 — سورة القصص – الآية 11** (`lataif:w248`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 28:11. — https://tanzil.net/#28:11
- ✓ verse-reference: Shown «سورة القصص – الآية 11» = surah القصص 28:11. — https://tanzil.net/#28:11
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 28:11: «فقصت أخت موسى أثره، فبصرت به عن جنب: يقول فبصرت بموسى عن بعد لم تدن منه ولم تقرب، لئلا يعلم أنها منه بسبيل… وقوم فرعون لا يشعرون بأخت موسى أنها أخته». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/28/11.json

**Wamada 249 — سورة القصص – الآية 44** (`lataif:w249`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 28:44; spelling-convention differences only (no change of word or reading): «إِلَى» / Tanzil «إِلَىٰ». — https://tanzil.net/#28:44
- ✓ verse-reference: Shown «سورة القصص – الآية 44» = surah القصص 28:44. — https://tanzil.net/#28:44
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 28:44: «منبهاً على برهان نبوة محمد… حيث أخبر بالغيوب الماضية خبراً كأن سامعه شاهد وراءٍ لما تقدم، وهو رجل أمي… ما كنت بجانب الجبل الغربي… ولكن الله… أوحى إليك ذلك ليجعله حجة وبرهاناً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/28/44.json

**Wamada 252 — سورة القصص – الآية 79** (`lataif:w252`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 28:79. — https://tanzil.net/#28:79
- ✓ verse-reference: Shown «سورة القصص – الآية 79» = surah القصص 28:79. — https://tanzil.net/#28:79
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 28:79 describes Qarun's display «في زينته» and those who wished for the same «على سبيل الرغبة في اليسار والاستغناء كما هو عادة البشر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/28/79.json

**Wamada 255 — سورة الشورى – الآية 30** (`lataif:w255`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 42:30. — https://tanzil.net/#42:30
- ✓ verse-reference: Shown «سورة الشورى – الآية 30» = surah الشورى 42:30. — https://tanzil.net/#42:30
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 42:30: «فإن ما ترى بذنب، وما يعفو الله عنه أكثر», and the hadith «إذا كثرت ذنوب العبد… ابتلاه الله بالحزن ليكفرها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/42/30.json

**Wamada 256 — سورة الشورى – الآية 5** (`lataif:w256`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 42:5. — https://tanzil.net/#42:5
- ✓ verse-reference: Shown «سورة الشورى – الآية 5» = surah الشورى 42:5. — https://tanzil.net/#42:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 42:5: «تكاد السموات يتفطرن من فوقهن… أي فَرَقاً من العظمة»; the angels' glorification and seeking forgiveness are the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/42/5.json

**Wamada 258 — سورة الزخرف – الآية 33** (`lataif:w258`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 43:33. — https://tanzil.net/#43:33
- ✓ verse-reference: Shown «سورة الزخرف – الآية 33» = surah الزخرف 43:33. — https://tanzil.net/#43:33
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 43:33: «ولولا كراهة أن يجتمعوا على الكفر ويطبقوا عليه، لجعلنا لحقارة زهرة الحياة الدنيا عندنا للكفار سقوفاً ومصاعد وأبواباً وسرراً كلها من فضة وزخرف». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/43/33.json

**Wamada 259 — سورة الدخان – الآية 29** (`lataif:w259`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 44:29. — https://tanzil.net/#44:29
- ✓ verse-reference: Shown «سورة الدخان – الآية 29» = surah الدخان 44:29. — https://tanzil.net/#44:29
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 44:29 (Ibn Abbas): «إنه ليس أحد من الخلق إلا له باب في السماء يصعد فيه عمله وينزل منه رزقه، فإذا مات بكى عليه مكانه من الأرض الذي كان يذكر الله فيه ويصلي فيه… وأما قوم فرعون فلم يكن لهم آثار صالحة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/44/29.json

**Wamada 260 — سورة الدخان – الآيتان 3–4** (`lataif:w260`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 44:3-4. — https://tanzil.net/#44:3
- ✓ verse-reference: Shown «سورة الدخان – الآيتان 3–4» = surah الدخان 44:3-4. — https://tanzil.net/#44:3
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «جامع البيان - الطبري»; quoted wording verbatim in it at 44:3: «يُقضى ويُفصل كل أمر أحكمه الله تعالى في تلك السنة»; the unsupported claim (اللوح المحفوظ) removed. (Before correction: Cited work: جامع البيان - الطبري. al-Tabari at 44:3–4 prefers Laylat al-Qadr and explains «يقضى ويفصل كل أمر أحكمه الله تعالى في تلك السنة»: «يقضى فيها أمر السنة كلها من يموت ومن يولد»; he reports «ينسخ لملك الموت من يموت ليلة القدر إلى مثلها», but not the reflection's «من اللوح المحفوظ إلى صحف الملائكة الحفظة».) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/44/3.json

**Wamada 262 — سورة الأحقاف – الآية 15** (`lataif:w262`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 46:15. — https://tanzil.net/#46:15
- ✓ verse-reference: Shown «سورة الأحقاف – الآية 15» = surah الأحقاف 46:15. — https://tanzil.net/#46:15
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 46:15: «وبلغ أربعين سنة، أي: تناهى عقله وكمل فهمه وحلمه»; gratitude and righteous offspring are the verse's prayer. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/46/15.json

**Wamada 263 — سورة الأحقاف – الآية 35** (`lataif:w263`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 46:35. — https://tanzil.net/#46:35
- ✓ verse-reference: Shown «سورة الأحقاف – الآية 35» = surah الأحقاف 46:35. — https://tanzil.net/#46:35
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 46:35: «فاصبر كما صبر أولو العزم من الرسل، أي: على تكذيب قومهم لهم… وأشهرها أنهم: نوح وإبراهيم وموسى وعيسى وخاتم الأنبياء محمد ﷺ». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/46/35.json

**Wamada 266 — سورة الفتح – الآية 4** (`lataif:w266`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 48:4. — https://tanzil.net/#48:4
- ✓ verse-reference: Shown «سورة الفتح – الآية 4» = surah الفتح 48:4. — https://tanzil.net/#48:4
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.), منزلة السكينة: «وأصل السكينة هي الطمأنينة والوقار والسكون الذي ينزله الله في قلب عبده عند اضطرابه من شدة المخاوف… ويوجب له زيادة الإيمان وقوة اليقين والثبات». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 268 — سورة الحجرات – الآية 6** (`lataif:w268`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 49:6. — https://tanzil.net/#49:6
- ✓ verse-reference: Shown «سورة الحجرات – الآية 6» = surah الحجرات 49:6. — https://tanzil.net/#49:6
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 49:6 on the duty to verify (تبيّن/تثبّت) news before acting, for both the receiver and the transmitter; harm to innocents and regret are the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/49/6.json

**Wamada 269 — سورة الحجرات – الآية 12** (`lataif:w269`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 49:12. — https://tanzil.net/#49:12
- ✓ verse-reference: Shown «سورة الحجرات – الآية 12» = surah الحجرات 49:12. — https://tanzil.net/#49:12
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 49:12: «أيحب أحدكم: تمثيل وتصوير لما يناله المغتاب من عرض المغتاب على أفظع وجه وأفحشه، وفيه مبالغات شتى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/49/12.json

**Wamada 270 — سورة الحجرات – الآية 7** (`lataif:w270`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 49:7. — https://tanzil.net/#49:7
- ✓ verse-reference: Shown «سورة الحجرات – الآية 7» = surah الحجرات 49:7. — https://tanzil.net/#49:7
- ✓ reflection-attribution: Cited work: مدارج السالكين - ابن القيم. Madarij (al-Fiqi ed.) on 49:7: «يقول سبحانه: لم تكن محبتكم للإيمان وإرادتكم له وتزيينه في قلوبكم منكم، ولكن الله هو الذي جعله في قلوبكم كذلك»; and «أن كل خير فيها ففضل من الله». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.MadarijSalikin/0751IbnQayyimJawziyya.MadarijSalikin.JK000081-ara1

**Wamada 272 — سورة ق – الآية 15** (`lataif:w272`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 50:15; spelling-convention differences only (no change of word or reading): «مِّن» / Tanzil «مِّنْ». — https://tanzil.net/#50:15
- ✓ verse-reference: Shown «سورة ق – الآية 15» = surah ق 50:15. — https://tanzil.net/#50:15
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 50:15: «ما يشك هؤلاء المشركون المكذبون بالبعث أنا لم نعي بالخلق الأول، ولكنهم في شك من قدرتنا على أن نخلقهم خلقاً جديداً بعد فنائهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/50/15.json

**Wamada 276 — سورة الطور – الآيتان 17–18** (`lataif:w276`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 52:17-18. — https://tanzil.net/#52:17
- ✓ verse-reference: Shown «سورة الطور – الآيتان 17–18» = surah الطور 52:17-18. — https://tanzil.net/#52:17
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 52:17–18: «ووقاهم ربهم عذاب الجحيم، أي: وقد نجّاهم من عذاب النار، وتلك نعمة مستقلة بذاتها على حدتها مع ما أضيف إليها من دخول الجنة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/52/17.json

**Wamada 278 — سورة النجم – الآيتان 17–18** (`lataif:w278`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 53:17-18; spelling-convention differences only (no change of word or reading): «طَغَى» / Tanzil «طَغَىٰ»; «رَأَى» / Tanzil «رَأَىٰ»; «الْكُبْرَى» / Tanzil «الْكُبْرَىٰ». — https://tanzil.net/#53:17
- ✓ verse-reference: Shown «سورة النجم – الآيتان 17–18» = surah النجم 53:17-18. — https://tanzil.net/#53:17
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «التحرير والتنوير - ابن عاشور»; quoted wording verbatim in it at 53:17: «رؤية لا خطأ فيها ولا زيادة على ما وصف» / «أي: ما مال بصره إلى مرئي آخر غير ما ذكر» / «الطغيان: تجاوز الحد»; the unsupported claim (الأدب) removed. (Before correction: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 53:17 reads «ما زاغ البصر وما طغى» as the accuracy of the sight: «رأى جبريل رؤية لا خطأ فيها ولا زيادة على ما وصف… والزيغ: الميل عن القصد، أي ما مال بصره إلى مرئي آخر… والطغيان: تجاوز الحد»; the reflection's «مدح… الأدب السامي في حضرة جلال السماوات» is not his reading.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/53/17.json

**Wamada 281 — سورة الرحمن – الآية 60** (`lataif:w281`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 55:60. — https://tanzil.net/#55:60
- ✓ verse-reference: Shown «سورة الرحمن – الآية 60» = surah الرحمن 55:60. — https://tanzil.net/#55:60
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 55:60: «ما لمن أحسن في الدنيا العمل إلا الإحسان إليه في الدار الآخرة»; returning kindness among people is an application. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/55/60.json

**Wamada 283 — سورة الواقعة – الآيات 4–6** (`lataif:w283`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 56:4-6. — https://tanzil.net/#56:4
- ✓ verse-reference: Shown «سورة الواقعة – الآيات 4–6» = surah الواقعة 56:4-6. — https://tanzil.net/#56:4
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 56:4–6: «وبست الجبال بساً… فتتت فتاً»; «هباءً منبثاً… شعاع الشمس الذي يدخل من الكوة كهيئة الغبار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/56/4.json

**Wamada 285 — سورة الحديد – الآية 16** (`lataif:w285`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 57:16. — https://tanzil.net/#57:16
- ✓ verse-reference: Shown «سورة الحديد – الآية 16» = surah الحديد 57:16. — https://tanzil.net/#57:16
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 57:16: «أما آن للمؤمنين أن تخشع قلوبهم لذكر الله، أي: تلين عند الذكر والموعظة وسماع القرآن… نهى الله المؤمنين أن يتشبهوا بالذين حملوا الكتاب قبلهم… فطال عليهم الأمد فقست قلوبهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/57/16.json

**Wamada 286 — سورة المجادلة – الآية 1** (`lataif:w286`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 58:1. — https://tanzil.net/#58:1
- ✓ verse-reference: Shown «سورة المجادلة – الآية 1» = surah المجادلة 58:1. — https://tanzil.net/#58:1
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (عائشة) removed. (Before correction: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 58:1 names the woman (Khawla/Khuwayla bint Malik b. Thalaba) and explains her complaint and argument; Aisha's report that she could not hear part of Khawla's words while God heard it is not in his commentary at this verse (it is a separate hadith).) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/58/1.json

**Wamada 289 — سورة الصف – الآيتان 2–3** (`lataif:w289`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 61:2-3. — https://tanzil.net/#61:2
- ✓ verse-reference: Shown «سورة الصف – الآيتان 2–3» = surah الصف 61:2-3. — https://tanzil.net/#61:2
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 61:2–3: «والمقت: البغض الشديد»; «كبر… أمراً كبيراً في جنس المقت». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/61/2.json

**Wamada 290 — سورة الجمعة – الآية 5** (`lataif:w290`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 62:5. — https://tanzil.net/#62:5
- ✓ verse-reference: Shown «سورة الجمعة – الآية 5» = surah الجمعة 62:5. — https://tanzil.net/#62:5
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 62:5: «بالحمار حمل أسفاراً، أي كتباً كباراً من كتب العلم، فهو يمشي بها ولا يدري منها إلا ما يمر بجنبيه وظهره من الكد والتعب. وكل من علم ولم يعمل بعلمه فهذا مثله». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/62/5.json

**Wamada 292 — سورة المنافقون – الآية 4** (`lataif:w292`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 63:4. — https://tanzil.net/#63:4
- ✓ verse-reference: Shown «سورة المنافقون – الآية 4» = surah المنافقون 63:4. — https://tanzil.net/#63:4
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 63:4: «تعجبك أجسامهم لاستواء خلقها وحسن صورها… كأن هؤلاء المنافقين خشب مسندة لا خير عندهم ولا فقه لهم ولا علم، وإنما هم صور بلا أحلام وأشباح بلا عقول». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/63/4.json

**Wamada 294 — سورة الطلاق – الآيتان 2–3** (`lataif:w294`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 65:2-3. — https://tanzil.net/#65:2
- ✓ verse-reference: Shown «سورة الطلاق – الآيتان 2–3» = surah الطلاق 65:2-3. — https://tanzil.net/#65:2
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 65:2–3, in the context of divorce and the waiting period: «ومن يتق الله فيما أمره به وترك ما نهاه عنه، يجعل له من أمره مخرجاً، ويرزقه من حيث لا يحتسب، أي: من جهة لا تخطر بباله». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/65/2.json

**Wamada 296 — سورة التحريم – الآية 6** (`lataif:w296`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 66:6. — https://tanzil.net/#66:6
- ✓ verse-reference: Shown «سورة التحريم – الآية 6» = surah التحريم 66:6. — https://tanzil.net/#66:6
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «جامع البيان - الطبري»; quoted wording verbatim in it at 66:6: «واعملوا بطاعة الله» / «علموا أهليكم من العمل بطاعة الله ما يقون به أنفسهم من النار»; the unsupported claim (فاقد الشيء) removed. (Before correction: Cited work: جامع البيان - الطبري. al-Tabari at 66:6 glosses «وأهليكم» as «وعلّموا أهليكم من العمل بطاعة الله ما يقون به أنفسهم من النار»; the reflection's point — that the self is mentioned first because «فاقد الشيء لا يعطيه» — is not in his text.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/66/6.json

**Wamada 298 — سورة الملك – الآية 13** (`lataif:w298`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 67:13. — https://tanzil.net/#67:13
- ✓ verse-reference: Shown «سورة الملك – الآية 13» = surah الملك 67:13. — https://tanzil.net/#67:13
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 67:13: «إنه عليم بذات الصدور، أي بضمائرها قبل أن تترجم الألسنة عنها، فكيف لا يعلم ما تكلم به». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/67/13.json

**Wamada 299 — سورة القلم – الآية 4** (`lataif:w299`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 68:4; spelling-convention differences only (no change of word or reading): «لَعَلَى» / Tanzil «لَعَلَىٰ». — https://tanzil.net/#68:4
- ✓ verse-reference: Shown «سورة القلم – الآية 4» = surah القلم 68:4. — https://tanzil.net/#68:4
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 68:4: «وبهذا يزداد وضوحاً معنى التمكن الذي أفاده حرف الاستعلاء في قوله وإنك لعلى خلق عظيم، فهو متمكن منه الخلق العظيم في نفسه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/68/4.json

**Wamada 300 — سورة الحاقة – الآية 19** (`lataif:w300`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 69:19. — https://tanzil.net/#69:19
- ✓ verse-reference: Shown «سورة الحاقة – الآية 19» = surah الحاقة 69:19. — https://tanzil.net/#69:19
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 69:19: «يخبر تعالى عن سعادة من أوتي كتابه يوم القيامة بيمينه وفرحه بذلك، وأنه من شدة فرحه يقول لكل من لقيه: هاؤم اقرءوا كتابيه… لأنه يعلم أن الذي فيه خير وحسنات محضة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/69/19.json

**Wamada 302 — سورة نوح – الآيات 10–12** (`lataif:w302`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 71:10-12. — https://tanzil.net/#71:10
- ✓ verse-reference: Shown «سورة نوح – الآيات 10–12» = surah نوح 71:10-12. — https://tanzil.net/#71:10
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 71:10–12: «يرسل السماء عليكم مدراراً، أي: متواصلة الأمطار»; Umar sought rain «فلم يزد على الاستغفار»; wealth, children and gardens are the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/71/10.json

**Wamada 305 — سورة المدثر – الآيتان 38–39** (`lataif:w305`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 74:38-39. — https://tanzil.net/#74:38
- ✓ verse-reference: Shown «سورة المدثر – الآيتان 38–39» = surah المدثر 74:38-39. — https://tanzil.net/#74:38
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 74:38–39: «أي كل إنسان رهن بما كسب من التقدم أو التأخر… فهو على نفسه بصيرة ليكسب ما يفضي به إلى النعيم أو إلى الجحيم»; the exception of «أصحاب اليمين» is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/74/38.json

**Wamada 307 — سورة الإنسان – الآيتان 8–9** (`lataif:w307`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 76:8-9; spelling-convention differences only (no change of word or reading): «عَلَى» / Tanzil «عَلَىٰ». — https://tanzil.net/#76:8
- ✓ verse-reference: Shown «سورة الإنسان – الآيتان 8–9» = surah الانسان 76:8-9. — https://tanzil.net/#76:8
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 76:8–9: «على حبه… أي: في حال محبتك للمال وحرصك عليه وحاجتك إليه»; «لا نريد منكم جزاء ولا شكوراً، أي: لا نطلب منكم مجازاة تكافئونا بها ولا أن تشكرونا عند الناس». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/76/8.json

**Wamada 308 — سورة المرسلات – الآيتان 30–31** (`lataif:w308`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 77:30-31; spelling-convention differences only (no change of word or reading): «إِلَى» / Tanzil «إِلَىٰ». — https://tanzil.net/#77:30
- ✓ verse-reference: Shown «سورة المرسلات – الآيتان 30–31» = surah المرسلات 77:30-31. — https://tanzil.net/#77:30
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 77:30–31: «إلى ظل، يعني دخان جهنم… ذي ثلاث شعب: يتشعب لعظمه ثلاث شعب»; «لا ظليل ولا يغني من اللهب» is the verse. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/77/30.json

**Wamada 314 — سورة المطففين – الآية 14** (`lataif:w314`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 83:14; spelling-convention differences only (no change of word or reading): «عَلَى» / Tanzil «عَلَىٰ». — https://tanzil.net/#83:14
- ✓ verse-reference: Shown «سورة المطففين – الآية 14» = surah المطففين 83:14. — https://tanzil.net/#83:14
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 83:14, the hadith: «إن العبد إذا أذنب ذنباً كانت نكتة سوداء في قلبه، فإن تاب منها صقل قلبه، وإن زاد زادت… وذاك الران»; al-Hasan: «هو الذنب على الذنب حتى يعمى القلب فيموت». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/83/14.json

**Wamada 315 — سورة البقرة – الآية 46** (`lataif:w315`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:46. — https://tanzil.net/#2:46
- ✓ verse-reference: Shown «سورة البقرة – الآية 46» = surah البقرة 2:46. — https://tanzil.net/#2:46
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:46: «إن العرب قد تسمي اليقين ظناً والشك ظناً… فكان ظنهم يقيناً، وليس ظناً في شك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/46.json

**Wamada 316 — سورة البقرة – الآية 49** (`lataif:w316`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:49. — https://tanzil.net/#2:49
- ✓ verse-reference: Shown «سورة البقرة – الآية 49» = surah البقرة 2:49. — https://tanzil.net/#2:49
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 2:49: «يسومونكم، أي: يوردونكم ويذيقونكم ويولونكم سوء العذاب… وقيل: معناه: يديمونكم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/49.json

**Wamada 319 — سورة البقرة – الآية 59** (`lataif:w319`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:59. — https://tanzil.net/#2:59
- ✓ verse-reference: Shown «سورة البقرة – الآية 59» = surah البقرة 2:59. — https://tanzil.net/#2:59
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 2:59: «فأنزل عليهم رجز من السماء وهو الطاعون». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/59.json

**Wamada 321 — سورة البقرة – الآية 68** (`lataif:w321`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:68. — https://tanzil.net/#2:68
- ✓ verse-reference: Shown «سورة البقرة – الآية 68» = surah البقرة 2:68. — https://tanzil.net/#2:68
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:68: «إنما بقرة لا مسنة هرمة، ولا صغيرة لم تلد». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/68.json

**Wamada 322 — سورة البقرة – الآية 69** (`lataif:w322`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:69. — https://tanzil.net/#2:69
- ✓ verse-reference: Shown «سورة البقرة – الآية 69» = surah البقرة 2:69. — https://tanzil.net/#2:69
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 2:69: «فكأنه قيل: شديدة الصفرة صفرتها»; Wahb: «إذا نظرت إليها خيل إليك أن شعاع الشمس يخرج من جلدها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/2/69.json

**Wamada 323 — سورة البقرة – الآية 74** (`lataif:w323`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:74. — https://tanzil.net/#2:74
- ✓ verse-reference: Shown «سورة البقرة – الآية 74» = surah البقرة 2:74. — https://tanzil.net/#2:74
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 2:74: «و(أو) بمعنى بل الانتقالية لتوفر شرطها وهو كون معطوفها جملة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/74.json

**Wamada 324 — سورة البقرة – الآية 78** (`lataif:w324`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:78. — https://tanzil.net/#2:78
- ✓ verse-reference: Shown «سورة البقرة – الآية 78» = surah البقرة 2:78. — https://tanzil.net/#2:78
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («أم» and «منى»): «ومنهم أميون لا يعلمون الكتاب إلا أماني، أي إلا أن يتلى عليهم»; «لكن لما كان أكثره عن تخمين صار الكذب له أملك». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 325 — سورة البقرة – الآية 81** (`lataif:w325`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:81. — https://tanzil.net/#2:81
- ✓ verse-reference: Shown «سورة البقرة – الآية 81» = surah البقرة 2:81. — https://tanzil.net/#2:81
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:81: «وأحاطت به خطيئته» — Ibn Abbas: «يحيط كفره بما له من حسنة»; al-Rabi b. Khuthaym: «هو الذي يموت على خطيئته قبل أن يتوب»; al-Amash: «مات بذنوبه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/81.json

**Wamada 326 — سورة البقرة – الآية 87** (`lataif:w326`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:87. — https://tanzil.net/#2:87
- ✓ verse-reference: Shown «سورة البقرة – الآية 87» = surah البقرة 2:87. — https://tanzil.net/#2:87
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 2:87: «وقفّينا من بعده بالرسل… أتبعنا. وقال غيره: أردفنا. والكل قريب، كما قال تعالى: ثم أرسلنا رسلنا تترى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/87.json

**Wamada 327 — سورة البقرة – الآية 93** (`lataif:w327`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:93. — https://tanzil.net/#2:93
- ✓ verse-reference: Shown «سورة البقرة – الآية 93» = surah البقرة 2:93. — https://tanzil.net/#2:93
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («شرب»): «وأشربوا في قلوبهم العجل… فكأنما شُدّ في قلوبهم العجل لشغفهم، وقال بعضهم معناه أُشرب في قلوبهم حب العجل… إذا أرادوا العبارة عن مخامرة حب أو بغض استعاروا له اسم الشراب». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 328 — سورة البقرة – الآية 96** (`lataif:w328`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:96. — https://tanzil.net/#2:96
- ✓ verse-reference: Shown «سورة البقرة – الآية 96» = surah البقرة 2:96. — https://tanzil.net/#2:96
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 2:96: «وما أحدهم بمن يزحزحه من النار تعميره… والزحزحة: التبعيد والإنحاء». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/2/96.json

**Wamada 329 — سورة البقرة – الآية 106** (`lataif:w329`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:106. — https://tanzil.net/#2:106
- ✓ verse-reference: Shown «سورة البقرة – الآية 106» = surah البقرة 2:106. — https://tanzil.net/#2:106
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 2:106 on naskh: «رفع الحكم الشرعي المعلوم دوامه بخطاب يرفعه»; and «نأت بخير منها أو مثلها: إظهار منتهى الحكمة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/106.json

**Wamada 330 — سورة البقرة – الآية 117** (`lataif:w330`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 2:117; spelling-convention differences only (no change of word or reading): «قَضَى» / Tanzil «قَضَىٰ». — https://tanzil.net/#2:117
- ✓ verse-reference: Shown «سورة البقرة – الآية 117» = surah البقرة 2:117. — https://tanzil.net/#2:117
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («بدع»): «الإبداع إنشاء صنعة بلا احتذاء واقتداء… وإذا استعمل في الله تعالى فهو إيجاد الشيء بغير آلة ولا مادة ولا زمان ولا مكان… والبديع يقال للمبدع نحو بديع السماوات والأرض». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 331 — سورة البقرة – الآية 124** (`lataif:w331`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:124. — https://tanzil.net/#2:124
- ✓ verse-reference: Shown «سورة البقرة – الآية 124» = surah البقرة 2:124. — https://tanzil.net/#2:124
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 2:124: «ابتلاء الله إبراهيم، أي: اختباره له بما كلفه به من الأوامر والنواهي، فأتمهن، أي: قام بهن كلهن»; «بكلمات، أي: بشرائع وأوامر ونواه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/124.json

**Wamada 332 — سورة البقرة – الآية 125** (`lataif:w332`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:125. — https://tanzil.net/#2:125
- ✓ verse-reference: Shown «سورة البقرة – الآية 125» = surah البقرة 2:125. — https://tanzil.net/#2:125
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:125: «وإذ جعلنا البيت مرجعاً للناس ومعاذاً، يأتونه كل عام ويرجعون إليه، فلا يقضون منه وطراً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/125.json

**Wamada 334 — سورة البقرة – الآية 142** (`lataif:w334`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:142. — https://tanzil.net/#2:142
- ✓ verse-reference: Shown «سورة البقرة – الآية 142» = surah البقرة 2:142. — https://tanzil.net/#2:142
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 2:142: the qibla meant is Jerusalem «وأن التولي عنها هو نسخها باستقبال الكعبة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/142.json

**Wamada 337 — سورة البقرة – الآية 20** (`lataif:w337`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:20. — https://tanzil.net/#2:20
- ✓ verse-reference: Shown «سورة البقرة – الآية 20» = surah البقرة 2:20. — https://tanzil.net/#2:20
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 2:20: «ومعنى القيام عدم المشي، أي الوقوف في الموضع». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/2/20.json

**Wamada 338 — سورة البقرة – الآية 25** (`lataif:w338`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:25. — https://tanzil.net/#2:25
- ✓ verse-reference: Shown «سورة البقرة – الآية 25» = surah البقرة 2:25. — https://tanzil.net/#2:25
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («شبه»): «وأتوا به متشابهاً، أي يشبه بعضه بعضاً لوناً لا طعماً وحقيقة، وقيل متماثلاً في الكمال والجودة». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 339 — سورة البقرة – الآية 27** (`lataif:w339`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:27. — https://tanzil.net/#2:27
- ✓ verse-reference: Shown «سورة البقرة – الآية 27» = surah البقرة 2:27. — https://tanzil.net/#2:27
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 2:27: «من بعد ميثاقه، فإنه يعني: من بعد توثّق الله فيه بأخذ عهوده بالوفاء له بما عهد إليهم في ذلك… والميثاق اسم منه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/2/27.json

**Wamada 341 — سورة البقرة – الآية 42** (`lataif:w341`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:42. — https://tanzil.net/#2:42
- ✓ verse-reference: Shown «سورة البقرة – الآية 42» = surah البقرة 2:42. — https://tanzil.net/#2:42
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 2:42: «ناهياً لليهود عما كانوا يتعمدونه من تلبيس الحق بالباطل وتمويهه به»; Ibn Abbas: «لا تخلطوا الحق بالباطل». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/2/42.json

**Wamada 342 — سورة البقرة – الآية 44** (`lataif:w342`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 2:44. — https://tanzil.net/#2:44
- ✓ verse-reference: Shown «سورة البقرة – الآية 44» = surah البقرة 2:44. — https://tanzil.net/#2:44
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («بر»): «وتصوّر منه التوسع، فاشتق منه البر، أي التوسع في فعل الخير… بر العبد ربه، أي توسع في طاعته… وذلك ضربان: ضرب في الاعتقاد وضرب في الأعمال». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 343 — سورة آل عمران – الآية 7** (`lataif:w343`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:7. — https://tanzil.net/#3:7
- ✓ verse-reference: Shown «سورة آل عمران – الآية 7» = surah آل عمران 3:7. — https://tanzil.net/#3:7
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 3:7: «آيات محكمات هن أم الكتاب، أي: بينات واضحات الدلالة لا التباس فيها على أحد من الناس»; Said b. Jubayr: «أصل الكتاب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/7.json

**Wamada 344 — سورة آل عمران – الآية 7** (`lataif:w344`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:7. — https://tanzil.net/#3:7
- ✓ verse-reference: Shown «سورة آل عمران – الآية 7» = surah آل عمران 3:7. — https://tanzil.net/#3:7
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 3:7: «الذين في قلوبهم زيغ هم أهل البدع، فيتبعون ما تشابه منه… ابتغاء الفتنة… وطلب أن يؤوّلوه التأويل الذي يشتهونه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/3/7.json

**Wamada 345 — سورة آل عمران – الآية 11** (`lataif:w345`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:11. — https://tanzil.net/#3:11
- ✓ verse-reference: Shown «سورة آل عمران – الآية 11» = surah آل عمران 3:11. — https://tanzil.net/#3:11
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 3:11: «كدأب آل فرعون… معناه: كسنتهم… وأصل الدأب من دأبت في الأمر دأباً إذا أدمنت العمل والتعب فيه، ثم إن العرب نقلت معناه إلى الشأن والأمر والعادة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/3/11.json

**Wamada 346 — سورة آل عمران – الآية 14** (`lataif:w346`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:14. — https://tanzil.net/#3:14
- ✓ verse-reference: Shown «سورة آل عمران – الآية 14» = surah آل عمران 3:14. — https://tanzil.net/#3:14
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («قنطر»): «والقناطير المقنطرة، أي المجموعة قنطاراً قنطاراً، كقولك دراهم مدرهمة ودنانير مدنرة». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 347 — سورة آل عمران – الآية 19** (`lataif:w347`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:19. — https://tanzil.net/#3:19
- ✓ verse-reference: Shown «سورة آل عمران – الآية 19» = surah آل عمران 3:19. — https://tanzil.net/#3:19
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «تفسير ابن كثير»; no quotation; the unsupported claim (المكاسب) removed. (Before correction: Cited work: تفسير ابن كثير. Ibn Kathir at 3:19 glosses «بغياً بينهم» as «بغي بعضهم على بعض، فاختلفوا في الحق لتحاسدهم وتباغضهم وتدابرهم»; the reflection's added motive «طلباً للمكاسب والريادة المادية» is not in his text.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/19.json

**Wamada 349 — سورة آل عمران – الآية 35** (`lataif:w349`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:35. — https://tanzil.net/#3:35
- ✓ verse-reference: Shown «سورة آل عمران – الآية 35» = surah آل عمران 3:35. — https://tanzil.net/#3:35
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 3:35: «محرراً لعبادتك… حبسته على خدمتك وخدمة قدسك في الكنيسة، عتيقة من خدمة كل شيء سواك، مفرغة لك خاصة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/3/35.json

**Wamada 351 — سورة آل عمران – الآية 54** (`lataif:w351`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:54. — https://tanzil.net/#3:54
- ✓ verse-reference: Shown «سورة آل عمران – الآية 54» = surah آل عمران 3:54. — https://tanzil.net/#3:54
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («مكر»): «المكر صرف الغير عما يقصده بحيلة، وذلك ضربان: مكر محمود… والله خير الماكرين، ومذموم وهو أن يتحرى به فعل قبيح»; the plot against Isa is the verse's context. — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 352 — سورة آل عمران – الآية 67** (`lataif:w352`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 3:67. — https://tanzil.net/#3:67
- ✓ verse-reference: Shown «سورة آل عمران – الآية 67» = surah آل عمران 3:67. — https://tanzil.net/#3:67
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 3:67: «ولكن كان حنيفاً مسلماً، أي: متحنّفاً عن الشرك قصداً إلى الإيمان». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/3/67.json

**Wamada 353 — سورة آل عمران – الآية 59** (`lataif:w353`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 3:59; spelling-convention differences only (no change of word or reading): «عِيسَى» / Tanzil «عِيسَىٰ». — https://tanzil.net/#3:59
- ✓ verse-reference: Shown «سورة آل عمران – الآية 59» = surah آل عمران 3:59. — https://tanzil.net/#3:59
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 3:59: «فإن قالوا: خلق عيسى من غير ذكر، فقد خلقت آدم من تراب بتلك القدرة من غير أنثى ولا ذكر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/3/59.json

**Wamada 354 — سورة النساء – الآية 2** (`lataif:w354`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:2. — https://tanzil.net/#4:2
- ✓ verse-reference: Shown «سورة النساء – الآية 2» = surah النساء 4:2. — https://tanzil.net/#4:2
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 4:2: «كان أوصياء اليتامى يأخذون الجيد من ماله والرفيع منه، ويجعلون مكانه لليتيم الرديء والخسيس، فذلك تبديلهم الذي نهاهم الله عنه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/4/2.json

**Wamada 355 — سورة النساء – الآية 3** (`lataif:w355`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:3. — https://tanzil.net/#4:3
- ✓ verse-reference: Shown «سورة النساء – الآية 3» = surah النساء 4:3. — https://tanzil.net/#4:3
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («قسط»): «والقسط هو أن يأخذ قسط غيره وذلك جور، والإقساط أن يعطي قسط غيره وذلك إنصاف، ولذلك قيل: قسط الرجل إذا جار، وأقسط إذا عدل». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 356 — سورة النساء – الآية 3** (`lataif:w356`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:3. — https://tanzil.net/#4:3
- ✓ verse-reference: Shown «سورة النساء – الآية 3» = surah النساء 4:3. — https://tanzil.net/#4:3
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 4:3: «ذلك أدنى ألا تعولوا: قال بعضهم: أدنى ألا تكثر عائلتكم… [والأكثرون]: لا تميلوا». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/4/3.json

**Wamada 358 — سورة النساء – الآية 6** (`lataif:w358`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:6. — https://tanzil.net/#4:6
- ✓ verse-reference: Shown «سورة النساء – الآية 6» = surah النساء 4:6. — https://tanzil.net/#4:6
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 4:6 on «آنستم» (perceiving the first sign of knowledge) and «والرشد… أريد به هنا حفظ المال وحسن التدبير فيه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/4/6.json

**Wamada 359 — سورة النساء – الآية 6** (`lataif:w359`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:6. — https://tanzil.net/#4:6
- ✓ verse-reference: Shown «سورة النساء – الآية 6» = surah النساء 4:6. — https://tanzil.net/#4:6
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 4:6: «لا تأكلوا أموالهم إسرافاً… ولا مبادرة منكم بلوغهم وإيناس الرشد منهم، حذراً أن يبلغوا فيلزمكم تسليمه إليهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/4/6.json

**Wamada 360 — سورة النساء – الآية 10** (`lataif:w360`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:10. — https://tanzil.net/#4:10
- ✓ verse-reference: Shown «سورة النساء – الآية 10» = surah النساء 4:10. — https://tanzil.net/#4:10
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («صلا»): «قال الخليل: صلي الكافر النار: قاسى حرها… وقيل: صلي النار: دخل فيها». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 362 — سورة النساء – الآية 12** (`lataif:w362`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 4:12. — https://tanzil.net/#4:12
- ✓ verse-reference: Shown «سورة النساء – الآية 12» = surah النساء 4:12. — https://tanzil.net/#4:12
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 4:12: «والكلالة في الأصل مصدر بمعنى الكلال… فاستعيرت للقرابة من غير جهة الولد والوالد». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/4/12.json

**Wamada 363 — سورة المائدة – الآية 1** (`lataif:w363`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:1. — https://tanzil.net/#5:1
- ✓ verse-reference: Shown «سورة المائدة – الآية 1» = surah المائدة 5:1. — https://tanzil.net/#5:1
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 5:1 on «وأنتم حرم»: the sacred precinct «فهذا الحرم يحرم صيده، كما يحرم الصيد على المحرم بحج أو عمرة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/1.json

**Wamada 364 — سورة المائدة – الآية 2** (`lataif:w364`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:2. — https://tanzil.net/#5:2
- ✓ verse-reference: Shown «سورة المائدة – الآية 2» = surah المائدة 5:2. — https://tanzil.net/#5:2
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 5:2 reports that «القلائد» are «قلائد الهدي… الهدايا المقلدات», and that garlands of the Haram's tree bark made the wearer safe «فيأمن بذلك من سائر قبائل العرب أن يعرضوا له بسوء». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/2.json

**Wamada 365 — سورة المائدة – الآية 3** (`lataif:w365`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:3. — https://tanzil.net/#5:3
- ✓ verse-reference: Shown «سورة المائدة – الآية 3» = surah المائدة 5:3. — https://tanzil.net/#5:3
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («وقذ»): «والموقوذة، أي المقتولة بالضرب». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 366 — سورة المائدة – الآية 3** (`lataif:w366`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:3. — https://tanzil.net/#5:3
- ✓ verse-reference: Shown «سورة المائدة – الآية 3» = surah المائدة 5:3. — https://tanzil.net/#5:3
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 5:3: «المتردية: التي تسقط من جبل» (Ibn Abbas); «التي تتردى في بئر» (Qatada). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/5/3.json

**Wamada 367 — سورة المائدة – الآية 3** (`lataif:w367`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:3. — https://tanzil.net/#5:3
- ✓ verse-reference: Shown «سورة المائدة – الآية 3» = surah المائدة 5:3. — https://tanzil.net/#5:3
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 5:3: «الاستقسام بالأزلام، أي بالقداح؛ كان أحدهم إذا أراد سفراً أو غزواً أو تجارة أو نكاحاً…»; «لأنه دخول في علم الغيب الذي استأثر به علام الغيوب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/5/3.json

**Wamada 368 — سورة المائدة – الآية 3** (`lataif:w368`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:3. — https://tanzil.net/#5:3
- ✓ verse-reference: Shown «سورة المائدة – الآية 3» = surah المائدة 5:3. — https://tanzil.net/#5:3
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 5:3: «والمخمصة: المجاعة، اشتقت من الخمص وهو ضمور البطن، لأن الجوع يضمر البطون». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/5/3.json

**Wamada 369 — سورة المائدة – الآية 4** (`lataif:w369`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 5:4. — https://tanzil.net/#5:4
- ✓ verse-reference: Shown «سورة المائدة – الآية 4» = surah المائدة 5:4. — https://tanzil.net/#5:4
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 5:4: «التكليب للقانص، بالكلاب كان صيده أو بغيرها»; al-Hasan: «كل ما عُلّم فصاد، من كلب أو صقر أو فهد أو غيره». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/5/4.json

**Wamada 370 — سورة الأنعام – الآية 1** (`lataif:w370`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 6:1. — https://tanzil.net/#6:1
- ✓ verse-reference: Shown «سورة الأنعام – الآية 1» = surah الأنعام 6:1. — https://tanzil.net/#6:1
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 6:1: «ثم الذين كفروا بربهم يعدلون، أي: ومع هذا كله كفر به بعض عباده، وجعلوا معه شريكاً وعدلاً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/6/1.json

**Wamada 371 — سورة الأنعام – الآية 9** (`lataif:w371`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 6:9. — https://tanzil.net/#6:9
- ✓ verse-reference: Shown «سورة الأنعام – الآية 9» = surah الأنعام 6:9. — https://tanzil.net/#6:9
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 6:9: «وللبسنا عليهم: ولخلطنا عليهم ما يخلطون على أنفسهم حينئذ». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/6/9.json

**Wamada 372 — سورة الأنعام – الآية 6** (`lataif:w372`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 6:6. — https://tanzil.net/#6:6
- ✓ verse-reference: Shown «سورة الأنعام – الآية 6» = surah الأنعام 6:6. — https://tanzil.net/#6:6
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («قرن»): «والقرن: القوم المقترنون في زمن واحد، وجمعه قرون». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 373 — سورة الأنعام – الآية 6** (`lataif:w373`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 6:6. — https://tanzil.net/#6:6
- ✓ verse-reference: Shown «سورة الأنعام – الآية 6» = surah الأنعام 6:6. — https://tanzil.net/#6:6
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 6:6: «وأرسلنا السماء عليهم مدراراً: المطر. ويعني بقوله مدراراً: غزيرة دائمة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/6/6.json

**Wamada 374 — سورة الأعراف – الآية 189** (`lataif:w374`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:189. — https://tanzil.net/#7:189
- ✓ verse-reference: Shown «سورة الأعراف – الآية 189» = surah الأعراف 7:189. — https://tanzil.net/#7:189
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 7:189: «فلما تغشاها، أي: وطئها، حملت حملاً خفيفاً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/7/189.json

**Wamada 375 — سورة الأعراف – الآية 147** (`lataif:w375`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:147. — https://tanzil.net/#7:147
- ✓ verse-reference: Shown «سورة الأعراف – الآية 147» = surah الأعراف 7:147. — https://tanzil.net/#7:147
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («حبط»): «وحبط العمل على أضرب: أحدها أن تكون الأعمال دنيوية فلا تغني في القيامة غناءً… والثاني أن تكون أعمالاً أخروية لكن لم يقصد بها صاحبها وجه الله». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 376 — سورة الأعراف – الآية 166** (`lataif:w376`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:166. — https://tanzil.net/#7:166
- ✓ verse-reference: Shown «سورة الأعراف – الآية 166» = surah الأعراف 7:166. — https://tanzil.net/#7:166
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 7:166 refers back to 7:77, where he says: «والعتو تجاوز الحد في الكبر، وتعديته لتضمينه معنى الإعراض». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/7/166.json

**Wamada 377 — سورة الأعراف – الآية 176** (`lataif:w377`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:176. — https://tanzil.net/#7:176
- ✓ verse-reference: Shown «سورة الأعراف – الآية 176» = surah الأعراف 7:176. — https://tanzil.net/#7:176
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 7:176: «فتشبيهه بالكلب في لهثه في كلتا حالتيه، إن زُجر وإن تُرك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/7/176.json

**Wamada 378 — سورة الأعراف – الآية 179** (`lataif:w378`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 7:179. — https://tanzil.net/#7:179
- ✓ verse-reference: Shown «سورة الأعراف – الآية 179» = surah الأعراف 7:179. — https://tanzil.net/#7:179
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 7:179 (Ibn Abbas): «ولقد ذرأنا لجهنم: خلقنا… لنفاذ علمه فيهم بأنهم يصيرون إليها بكفرهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/7/179.json

**Wamada 379 — سورة الأنفال – الآية 1** (`lataif:w379`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:1. — https://tanzil.net/#8:1
- ✓ verse-reference: Shown «سورة الأنفال – الآية 1» = surah الأنفال 8:1. — https://tanzil.net/#8:1
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 8:1: «قال البخاري: قال ابن عباس: الأنفال: الغنائم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/8/1.json

**Wamada 380 — سورة الأنفال – الآية 9** (`lataif:w380`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:9. — https://tanzil.net/#8:9
- ✓ verse-reference: Shown «سورة الأنفال – الآية 9» = surah الأنفال 8:9. — https://tanzil.net/#8:9
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 8:9 on «مردفين»: «ردفه إذا تبعه… بمعنى متبعين بعضهم بعضاً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/8/9.json

**Wamada 381 — سورة الأنفال – الآية 12** (`lataif:w381`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:12. — https://tanzil.net/#8:12
- ✓ verse-reference: Shown «سورة الأنفال – الآية 12» = surah الأنفال 8:12. — https://tanzil.net/#8:12
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («بن»): «البنان الأصابع… وقوله تعالى: واضربوا منهم كل بنان، خصّه لأجل أنهم بها…». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 382 — سورة الأنفال – الآية 16** (`lataif:w382`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:16. — https://tanzil.net/#8:16
- ✓ verse-reference: Shown «سورة الأنفال – الآية 16» = surah الأنفال 8:16. — https://tanzil.net/#8:16
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 8:16: «إلا متحرفاً لقتال، هو الكرّ بعد الفرّ، يخيّل عدوه أنه منهزم ثم يعطف عليه، وهو باب من خدع الحرب ومكايدها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/8/16.json

**Wamada 383 — سورة الأنفال – الآية 30** (`lataif:w383`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:30. — https://tanzil.net/#8:30
- ✓ verse-reference: Shown «سورة الأنفال – الآية 30» = surah الأنفال 8:30. — https://tanzil.net/#8:30
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 8:30: «ليثبتوك: ليقيدوك» (Ibn Abbas, Mujahid, Qatada); «ليحبسوك» (Ata, Ibn Zayd); al-Suddi: «الإثبات: هو الحبس والوثاق». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/8/30.json

**Wamada 384 — سورة الأنفال – الآية 67** (`lataif:w384`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 8:67. — https://tanzil.net/#8:67
- ✓ verse-reference: Shown «سورة الأنفال – الآية 67» = surah الأنفال 8:67. — https://tanzil.net/#8:67
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 8:67: «حتى يثخن في الأرض، يقول: حتى يبالغ في قتل المشركين فيها، ويقهرهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/8/67.json

**Wamada 385 — سورة التوبة – الآية 2** (`lataif:w385`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:2. — https://tanzil.net/#9:2
- ✓ verse-reference: Shown «سورة التوبة – الآية 2» = surah التوبة 9:2. — https://tanzil.net/#9:2
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 9:2 explains «فسيحوا في الأرض أربعة أشهر» as a respite for those with treaties, after which «لا عهد لهم، وآذن الناس كلهم بالقتال». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/9/2.json

**Wamada 387 — سورة التوبة – الآية 12** (`lataif:w387`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:12. — https://tanzil.net/#9:12
- ✓ verse-reference: Shown «سورة التوبة – الآية 12» = surah التوبة 9:12. — https://tanzil.net/#9:12
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («نكث»): «النكث: نكث الأكسية والغزل، قريب من النقض، واستعير لنقض العهد، قال تعالى: وإن نكثوا أيمانهم». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 388 — سورة التوبة – الآية 16** (`lataif:w388`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:16. — https://tanzil.net/#9:16
- ✓ verse-reference: Shown «سورة التوبة – الآية 16» = surah التوبة 9:16. — https://tanzil.net/#9:16
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 9:16: «ولم يتخذوا وليجة، أي بطانة… والوليجة: فعيلة من ولج، كالدخيلة من دخل». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/9/16.json

**Wamada 389 — سورة التوبة – الآية 37** (`lataif:w389`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:37. — https://tanzil.net/#9:37
- ✓ verse-reference: Shown «سورة التوبة – الآية 37» = surah التوبة 9:37. — https://tanzil.net/#9:37
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 9:37: «فكانوا قد أحدثوا قبل الإسلام بمدة تحليل المحرم وتأخيره إلى صفر، فيحلون الشهر الحرام»; «إنا قد حرمنا صفر وأخّرنا المحرم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/9/37.json

**Wamada 390 — سورة التوبة – الآية 38** (`lataif:w390`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 9:38. — https://tanzil.net/#9:38
- ✓ verse-reference: Shown «سورة التوبة – الآية 38» = surah التوبة 9:38. — https://tanzil.net/#9:38
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 9:38: «والتثاقل تكلّف الثقل، أي إظهار أنه ثقيل لا يستطيع النهوض… قد آثروا الراحة في الدنيا على الثواب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/9/38.json

**Wamada 391 — سورة يونس – الآية 27** (`lataif:w391`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 10:27. — https://tanzil.net/#10:27
- ✓ verse-reference: Shown «سورة يونس – الآية 27» = surah يونس 10:27. — https://tanzil.net/#10:27
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («رهق»): «رهقه الأمر: غشيه بقهر… قال: وترهقهم ذلة». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 392 — سورة يونس – الآية 35** (`lataif:w392`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 10:35. — https://tanzil.net/#10:35
- ✓ verse-reference: Shown «سورة يونس – الآية 35» = surah يونس 10:35. — https://tanzil.net/#10:35
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 10:35: «أم الذي لا يهدّي، أي لا يهتدي بنفسه، أو لا يهدي غيره إلا أن يهديه الله… أم من لا يهتدي من الأوثان إلى مكان فينتقل». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/10/35.json

**Wamada 393 — سورة يونس – الآية 39** (`lataif:w393`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 10:39. — https://tanzil.net/#10:39
- ✓ verse-reference: Shown «سورة يونس – الآية 39» = surah يونس 10:39. — https://tanzil.net/#10:39
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 10:39: «ويطلق التأويل على… هل ينظرون إلا تأويله، أي ظهور ما أنذرهم به من العذاب. والتأويل الذي في هذه الآية يحتمل المعنيين ولعل كليهما مراد». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/10/39.json

**Wamada 394 — سورة هود – الآية 5** (`lataif:w394`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 11:5. — https://tanzil.net/#11:5
- ✓ verse-reference: Shown «سورة هود – الآية 5» = surah هود 11:5. — https://tanzil.net/#11:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 11:5 (al-Bukhari from Ibn Abbas): «يستغشون: يغطون رؤوسهم»; «كانوا يثنون صدورهم إذا قالوا شيئاً أو عملوه، يظنون أنهم يستخفون من الله بذلك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/11/5.json

**Wamada 395 — سورة هود – الآية 15** (`lataif:w395`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 11:15. — https://tanzil.net/#11:15
- ✓ verse-reference: Shown «سورة هود – الآية 15» = surah هود 11:15. — https://tanzil.net/#11:15
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 11:15: «والتوفية: إعطاء الشيء وافياً، أي كاملاً غير منقوص… فالمراد أنهم لا ينقصون من لذاتهم التي هيؤوها لأنفسهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/11/15.json

**Wamada 396 — سورة هود – الآية 23** (`lataif:w396`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 11:23. — https://tanzil.net/#11:23
- ✓ verse-reference: Shown «سورة هود – الآية 23» = surah هود 11:23. — https://tanzil.net/#11:23
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («خبت»): «الخبت المطمئن من الأرض… ثم استعمل الإخبات استعمال اللين والتواضع، قال الله تعالى: وأخبتوا إلى ربهم… فتخبت له قلوبهم، أي تلين وتخشع». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 397 — سورة هود – الآية 38** (`lataif:w397`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 11:38. — https://tanzil.net/#11:38
- ✓ verse-reference: Shown «سورة هود – الآية 38» = surah هود 11:38. — https://tanzil.net/#11:38
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 11:38: «وكلما مرّ عليه جماعة من كبراء قومه سخروا منه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/11/38.json

**Wamada 399 — سورة يوسف – الآية 30** (`lataif:w399`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:30. — https://tanzil.net/#12:30
- ✓ verse-reference: Shown «سورة يوسف – الآية 30» = surah يوسف 12:30. — https://tanzil.net/#12:30
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 12:30: «قد شغفها حباً، أي: قد وصل حبه إلى شغاف قلبها، وهو غلافه»; Ibn Abbas: «والشغاف: حجاب القلب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/12/30.json

**Wamada 400 — سورة يوسف – الآية 31** (`lataif:w400`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:31. — https://tanzil.net/#12:31
- ✓ verse-reference: Shown «سورة يوسف – الآية 31» = surah يوسف 12:31. — https://tanzil.net/#12:31
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 12:31: «وأعتدت لهن متكأً: ما يتكئن عليه من نمارق». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/12/31.json

**Wamada 402 — سورة يوسف – الآية 47** (`lataif:w402`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:47. — https://tanzil.net/#12:47
- ✓ verse-reference: Shown «سورة يوسف – الآية 47» = surah يوسف 12:47. — https://tanzil.net/#12:47
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («دأب»): «الدأب إدامة السير… والدأب العادة المستمرة دائماً على حاله». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 403 — سورة يوسف – الآية 49** (`lataif:w403`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 12:49; spelling-convention differences only (no change of word or reading): «ذَلِكَ» / Tanzil «ذَٰلِكَ». — https://tanzil.net/#12:49
- ✓ verse-reference: Shown «سورة يوسف – الآية 49» = surah يوسف 12:49. — https://tanzil.net/#12:49
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 12:49: «يغاث الناس… بالمطر»; «وفيه يعصرون: … السمسم دهناً، والعنب خمراً، والزيتون زيتاً» (Ibn Abbas). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/12/49.json

**Wamada 404 — سورة يوسف – الآية 80** (`lataif:w404`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 12:80. — https://tanzil.net/#12:80
- ✓ verse-reference: Shown «سورة يوسف – الآية 80» = surah يوسف 12:80. — https://tanzil.net/#12:80
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 12:80: «ومعنى خلصوا: اعتزلوا وانفردوا عن الناس خالصين لا يخالطهم سواهم، نجياً: ذوي نجوى… لمناجاة بعضهم بعضاً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/12/80.json

**Wamada 406 — سورة إبراهيم – الآية 18** (`lataif:w406`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 14:18. — https://tanzil.net/#14:18
- ✓ verse-reference: Shown «سورة إبراهيم – الآية 18» = surah ابراهيم 14:18. — https://tanzil.net/#14:18
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 14:18: «فإذا اشتدت الرياح بالرماد انتثر وتفرق تفرقاً لا يرجى معه اجتماعه… ووصف اليوم بالعاصف مجاز عقلي، أي: عاصف ريحه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/14/18.json

**Wamada 407 — سورة إبراهيم – الآية 49** (`lataif:w407`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 14:49. — https://tanzil.net/#14:49
- ✓ verse-reference: Shown «سورة إبراهيم – الآية 49» = surah ابراهيم 14:49. — https://tanzil.net/#14:49
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 14:49: Qatada «مقرنين في القيود والأغلال»; al-Dahhak «الأصفاد: السلاسل»; Ibn Zayd «صفدت فيها أيديهم وأرجلهم ورقابهم، والأصفاد: الأغلال». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/14/49.json

**Wamada 408 — سورة الحجر – الآية 72** (`lataif:w408`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 15:72. — https://tanzil.net/#15:72
- ✓ verse-reference: Shown «سورة الحجر – الآية 72» = surah الحجر 15:72. — https://tanzil.net/#15:72
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («عمه»): «العمه التردد في الأمر من التحير… فهم يعمهون». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 409 — سورة الحجر – الآية 94** (`lataif:w409`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 15:94. — https://tanzil.net/#15:94
- ✓ verse-reference: Shown «سورة الحجر – الآية 94» = surah الحجر 15:94. — https://tanzil.net/#15:94
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 15:94: «والصدع: الجهر والإعلان، وأصله الانشقاق… فالمراد هنا الجهر والإعلان». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/15/94.json

**Wamada 410 — سورة النحل – الآية 26** (`lataif:w410`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:26. — https://tanzil.net/#16:26
- ✓ verse-reference: Shown «سورة النحل – الآية 26» = surah النحل 16:26. — https://tanzil.net/#16:26
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («خر»): «فمعنى خرّ: سقط سقوطاً يسمع منه خرير، والخرير يقال لصوت الماء والريح وغير ذلك مما يسقط من علو». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 411 — سورة النحل – الآية 46** (`lataif:w411`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 16:46. — https://tanzil.net/#16:46
- ✓ verse-reference: Shown «سورة النحل – الآية 46» = surah النحل 16:46. — https://tanzil.net/#16:46
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 16:46: «أو يهلكهم في تصرّفهم في البلاد وتردّدهم في أسفارهم»; Qatada: «في أسفارهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/16/46.json

**Wamada 412 — سورة الإسراء – الآية 5** (`lataif:w412`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 17:5. — https://tanzil.net/#17:5
- ✓ verse-reference: Shown «سورة الإسراء – الآية 5» = surah الإسراء 17:5. — https://tanzil.net/#17:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 17:5: «فجاسوا خلال الديار، أي: تملكوا بلادكم وسلكوا خلال بيوتكم، أي: بينها ووسطها، وانصرفوا ذاهبين وجائين لا يخافون أحداً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/17/5.json

**Wamada 413 — سورة لقمان – الآية 19** (`lataif:w413`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 31:19. — https://tanzil.net/#31:19
- ✓ verse-reference: Shown «سورة لقمان – الآية 19» = surah لقمان 31:19. — https://tanzil.net/#31:19
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («غض»): «الغض النقصان من الطرف والصوت… واغضض من صوتك». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 414 — سورة الكهف – الآية 6** (`lataif:w414`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 18:6; spelling-convention differences only (no change of word or reading): «عَلَى» / Tanzil «عَلَىٰ»; «بِهَذَا» / Tanzil «بِهَٰذَا». — https://tanzil.net/#18:6
- ✓ verse-reference: Shown «سورة الكهف – الآية 6» = surah الكهف 18:6. — https://tanzil.net/#18:6
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 18:6: «فلعلك يا محمد قاتل نفسك ومهلكها… حزناً وتلهفاً ووجداً»; Qatada: «قاتل نفسك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/18/6.json

**Wamada 415 — سورة مريم – الآية 4** (`lataif:w415`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 19:4. — https://tanzil.net/#19:4
- ✓ verse-reference: Shown «سورة مريم – الآية 4» = surah مريم 19:4. — https://tanzil.net/#19:4
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («وهن»): «الوهن ضعف من حيث الخَلق أو الخُلق، قال: رب إني وهن العظم مني». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 416 — سورة مريم – الآية 83** (`lataif:w416`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 19:83. — https://tanzil.net/#19:83
- ✓ verse-reference: Shown «سورة مريم – الآية 83» = surah مريم 19:83. — https://tanzil.net/#19:83
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 19:83: Qatada «تزعجهم إزعاجاً إلى معاصي الله»; al-Thawri «تغريهم إغراءً وتستعجلهم استعجالاً»; al-Suddi «تطغيهم طغياناً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/19/83.json

**Wamada 418 — سورة طه – الآية 72** (`lataif:w418`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 20:72. — https://tanzil.net/#20:72
- ✓ verse-reference: Shown «سورة طه – الآية 72» = surah طه 20:72. — https://tanzil.net/#20:72
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 20:72: «والإيثار: التفضيل… أي لن نؤثر طاعتك أو دينك على ما جاءنا من البينات». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/20/72.json

**Wamada 419 — سورة الأنبياء – الآية 3** (`lataif:w419`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 21:3. — https://tanzil.net/#21:3
- ✓ verse-reference: Shown «سورة الأنبياء – الآية 3» = surah الأنبياء 21:3. — https://tanzil.net/#21:3
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 21:3: «وأسروا النجوى… النجوى بينهم، يقول: …المناجاة بينهم، فقالوا: هل هذا… إلا بشر مثلكم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/21/3.json

**Wamada 420 — سورة الأنبياء – الآية 96** (`lataif:w420`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 21:96; spelling-convention differences only (no change of word or reading): «حَتَّى» / Tanzil «حَتَّىٰ». — https://tanzil.net/#21:96
- ✓ verse-reference: Shown «سورة الأنبياء – الآية 96» = surah الأنبياء 21:96. — https://tanzil.net/#21:96
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 21:96: «ينسلون، أي: يسرعون في المشي إلى الفساد. والحدب: هو المرتفع من الأرض» (Ibn Abbas, Ikrima and others). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/21/96.json

**Wamada 421 — سورة الحج – الآية 5** (`lataif:w421`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 22:5. — https://tanzil.net/#22:5
- ✓ verse-reference: Shown «سورة الحج – الآية 5» = surah الحج 22:5. — https://tanzil.net/#22:5
- ✓ reflection-attribution: Cited work: مفردات ألفاظ القرآن - الراغب الأصفهاني. al-Raghib, Mufradat («ربو»): «فإذا أنزلنا عليها الماء اهتزت وربت، أي زادت زيادة المتربّي». — https://raw.githubusercontent.com/OpenITI/0525AH/master/data/0502RaghibIsbahani/0502RaghibIsbahani.Mufradat/0502RaghibIsbahani.Mufradat.JK001150-ara1

**Wamada 422 — سورة الحج – الآية 29** (`lataif:w422`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 22:29. — https://tanzil.net/#22:29
- ✓ verse-reference: Shown «سورة الحج – الآية 29» = surah الحج 22:29. — https://tanzil.net/#22:29
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 22:29 (Ibn Abbas): «التفث: حلق الرأس، وأخذ من الشاربين، ونتف الإبط، وحلق العانة، وقص الأظفار»; «وضع إحرامهم من حلق الرأس ولبس الثياب وقص الأظفار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/22/29.json

**Wamada 423 — سورة المؤمنون – الآية 64** (`lataif:w423`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 23:64; spelling-convention differences only (no change of word or reading): «حَتَّى» / Tanzil «حَتَّىٰ». — https://tanzil.net/#23:64
- ✓ verse-reference: Shown «سورة المؤمنون – الآية 64» = surah المؤمنون 23:64. — https://tanzil.net/#23:64
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 23:64: «الجؤار: الصراخ باستغاثة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/23/64.json

**Wamada 424 — سورة المؤمنون – الآية 108** (`lataif:w424`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 23:108. — https://tanzil.net/#23:108
- ✓ verse-reference: Shown «سورة المؤمنون – الآية 108» = surah المؤمنون 23:108. — https://tanzil.net/#23:108
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 23:108: «اخسؤوا فيها: ذلّوا فيها وانزجروا كما تنزجر الكلاب إذا زجرت. يقال: خسأ الكلب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/23/108.json

**Wamada 425 — سورة النور – الآية 40** (`lataif:w425`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 24:40. — https://tanzil.net/#24:40
- ✓ verse-reference: Shown «سورة النور – الآية 40» = surah النور 24:40. — https://tanzil.net/#24:40
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 24:40: «أو كظلمات في بحر لجي: قال قتادة: وهو العميق». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/24/40.json

**Wamada 426 — سورة النور – الآية 43** (`lataif:w426`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 24:43. — https://tanzil.net/#24:43
- ✓ verse-reference: Shown «سورة النور – الآية 43» = surah النور 24:43. — https://tanzil.net/#24:43
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 24:43: «ويزجي: يسوق. يقال: أزجى الإبل إزجاءً. وأطلق الإزجاء على دنو بعض السحاب من بعض». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/24/43.json

**Wamada 428 — سورة الفرقان – الآية 68** (`lataif:w428`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 25:68. — https://tanzil.net/#25:68
- ✓ verse-reference: Shown «سورة الفرقان – الآية 68» = surah الفرقان 25:68. — https://tanzil.net/#25:68
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 25:68: «يلق أثاماً، يقول: يلق من عقاب الله عقوبة ونكالاً»; Mujahid: «وادياً في جهنم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/25/68.json

**Wamada 429 — سورة الشعراء – الآية 45** (`lataif:w429`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 26:45; spelling-convention differences only (no change of word or reading): «فَأَلْقَى مُوسَى» / Tanzil «فَأَلْقَىٰ مُوسَىٰ». — https://tanzil.net/#26:45
- ✓ verse-reference: Shown «سورة الشعراء – الآية 45» = surah الشعراء 26:45. — https://tanzil.net/#26:45
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 26:45: «ما يأفكون: ما يقلبونه عن وجهه وحقيقته بسحرهم… فيخيلون في حبالهم وعصيهم أنها حيات تسعى، بالتمويه على الناظرين»; and (7:117, 20:69) «تلقّفت ملء الوادي من الخشب والحبال… يتلقفها بإذن الله ويمحقها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/26/45.json

**Wamada 430 — سورة الشعراء – الآية 128** (`lataif:w430`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 26:128. — https://tanzil.net/#26:128
- ✓ verse-reference: Shown «سورة الشعراء – الآية 128» = surah الشعراء 26:128. — https://tanzil.net/#26:128
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 26:128: «اختلف المفسرون في الريع بما حاصله: أنه المكان المرتفع عند جوادّ الطرق المشهورة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/26/128.json

**Wamada 432 — سورة النمل – الآية 28** (`lataif:w432`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 27:28; spelling-convention differences only (no change of word or reading): «هَذَا» / Tanzil «هَٰذَا». — https://tanzil.net/#27:28
- ✓ verse-reference: Shown «سورة النمل – الآية 28» = surah النمل 27:28. — https://tanzil.net/#27:28
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «الكشاف - الزمخشري»; quoted wording verbatim in it at 27:28: «يرجع بعضهم إلى بعض»; the unsupported claim (سياسي) removed. (Before correction: Cited work: جامع البيان - الطبري. al-Tabari at 27:28 (and the following verses) discusses only the order of «ثم تول عنهم… فانظر ماذا يرجعون»; he gives no gloss of «يرجعون». The meaning given (they reply) is correct but is not from the cited work, and «جواب فكري أو سياسي» is the reflection's own.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/27/28.json

**Wamada 434 — سورة القصص – الآية 35** (`lataif:w434`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 28:35. — https://tanzil.net/#28:35
- ✓ verse-reference: Shown «سورة القصص – الآية 35» = surah القصص 28:35. — https://tanzil.net/#28:35
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 28:35: «سنشد عضدك، أي نقوّيك ونعينك بأخيك. تقول العرب إذا أعز رجل رجلاً وأعانه… قد شد فلان على عضد فلان». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/28/35.json

**Wamada 436 — سورة الروم – الآية 18** (`lataif:w436`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 30:18. — https://tanzil.net/#30:18
- ✓ verse-reference: Shown «سورة الروم – الآية 18» = surah الروم 30:18. — https://tanzil.net/#30:18
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 30:18: «والإظهار: حلول وقت الظهر وهو نصف النهار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/30/18.json

**Wamada 437 — سورة لقمان – الآية 18** (`lataif:w437`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 31:18. — https://tanzil.net/#31:18
- ✓ verse-reference: Shown «سورة لقمان – الآية 18» = surah لقمان 31:18. — https://tanzil.net/#31:18
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 31:18: «ولا تعرض بوجهك عمن كلمته تكبراً واستحقاراً لمن تكلمه، وأصل الصعر داء يأخذ الإبل في أعناقها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/31/18.json

**Wamada 439 — سورة الأحزاب – الآية 10** (`lataif:w439`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 33:10. — https://tanzil.net/#33:10
- ✓ verse-reference: Shown «سورة الأحزاب – الآية 10» = surah الأحزاب 33:10. — https://tanzil.net/#33:10
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 33:10: «زاغت الأبصار: مالت عن سننها ومستوى نظرها حيرة وشخوصاً… لشدة الروع». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/33/10.json

**Wamada 440 — سورة الأحزاب – الآية 59** (`lataif:w440`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 33:59. — https://tanzil.net/#33:59
- ✓ verse-reference: Shown «سورة الأحزاب – الآية 59» = surah الأحزاب 33:59. — https://tanzil.net/#33:59
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 33:59: «بأن يدنين عليهن من جلابيبهن… والجلباب هو الرداء فوق الخمار»; Ibn Abbas: «أن يغطين وجوههن من فوق رؤوسهن بالجلابيب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/33/59.json

**Wamada 441 — سورة سبأ – الآية 13** (`lataif:w441`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 34:13. — https://tanzil.net/#34:13
- ✓ verse-reference: Shown «سورة سبأ – الآية 13» = surah سبإ 34:13. — https://tanzil.net/#34:13
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 34:13 (Ibn Abbas): «وجفان كالجواب… يعني بالجواب: الحياض»; «كالجوبة من الأرض». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/34/13.json

**Wamada 442 — سورة فاطر – الآية 12** (`lataif:w442`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 35:12. — https://tanzil.net/#35:12
- ✓ verse-reference: Shown «سورة فاطر – الآية 12» = surah فاطر 35:12. — https://tanzil.net/#35:12
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 35:12: «وهذا ملح أجاج، وهو البحر الساكن… وإنما تكون مالحة زعاقاً مرّة… أي: مرّ». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/35/12.json

**Wamada 443 — سورة يس – الآية 39** (`lataif:w443`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 36:39; spelling-convention differences only (no change of word or reading): «حَتَّى» / Tanzil «حَتَّىٰ». — https://tanzil.net/#36:39
- ✓ verse-reference: Shown «سورة يس – الآية 39» = surah يس 36:39. — https://tanzil.net/#36:39
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 36:39: «والعرجون من العذق من الموضع النابت في النخلة إلى موضع الشماريخ… والقديم هو اليابس»; Ibn Abbas: «العذق اليابس»; al-Hasan: «كعذق النخلة إذا قدُم فانحنى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/36/39.json

**Wamada 444 — سورة الصافات – الآية 53** (`lataif:w444`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 37:53. — https://tanzil.net/#37:53
- ✓ verse-reference: Shown «سورة الصافات – الآية 53» = surah الصافات 37:53. — https://tanzil.net/#37:53
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 37:53: «أإنا لمحاسبون ومجزيّون بعد مصيرنا عظاماً ولحومنا تراباً»; Ibn Abbas: «لمجازون بالعمل، كما تدين تدان». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/37/53.json

**Wamada 445 — سورة ص – الآية 31** (`lataif:w445`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 38:31. — https://tanzil.net/#38:31
- ✓ verse-reference: Shown «سورة ص – الآية 31» = surah ص 38:31. — https://tanzil.net/#38:31
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 38:31: Mujahid «صفن الفرس: رفع إحدى يديه حتى يكون على طرف الحافر»; Ibn Zayd «والصفن أن تقوم على ثلاث وترفع رجلاً واحدة حتى يكون طرف الحافر على الأرض». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/38/31.json

**Wamada 446 — سورة الزمر – الآية 75** (`lataif:w446`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 39:75. — https://tanzil.net/#39:75
- ✓ verse-reference: Shown «سورة الزمر – الآية 75» = surah الزمر 39:75. — https://tanzil.net/#39:75
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 39:75: «أخبر عن ملائكته أنهم محدقون من حول عرشه المجيد يسبحون بحمد ربهم ويمجدونه ويعظمونه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/39/75.json

**Wamada 447 — سورة غافر – الآية 19** (`lataif:w447`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 40:19. — https://tanzil.net/#40:19
- ✓ verse-reference: Shown «سورة غافر – الآية 19» = surah غافر 40:19. — https://tanzil.net/#40:19
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 40:19 (Ibn Abbas): «وهو الرجل يدخل على أهل البيت بيتهم وفيهم المرأة الحسناء… فإذا غفلوا لحظ إليها، فإذا فطنوا غضّ». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/40/19.json

**Wamada 448 — سورة فصلت – الآية 21** (`lataif:w448`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 41:21. — https://tanzil.net/#41:21
- ✓ verse-reference: Shown «سورة فصلت – الآية 21» = surah فصلت 41:21. — https://tanzil.net/#41:21
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 41:21 on the skins testifying: their reply «أنطقنا الله الذي أنطق كل شيء» is the verse; the reflection restates it. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/41/21.json

**Wamada 449 — سورة الشورى – الآية 34** (`lataif:w449`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 42:34. — https://tanzil.net/#42:34
- ✓ verse-reference: Shown «سورة الشورى – الآية 34» = surah الشورى 42:34. — https://tanzil.net/#42:34
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 42:34: «أو يوبقهن بما كسبوا، أي: ولو شاء لأهلك السفن وغرّقها بذنوب أهلها الذين هم راكبون عليها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/42/34.json

**Wamada 450 — سورة الزخرف – الآية 13** (`lataif:w450`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 43:13. — https://tanzil.net/#43:13
- ✓ verse-reference: Shown «سورة الزخرف – الآية 13» = surah الزخرف 43:13. — https://tanzil.net/#43:13
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 43:13: al-Suddi «مقرنين: مطيقين»; Ibn Zayd «لسنا له مطيقين… لا نطيقها إلا بك». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/43/13.json

**Wamada 451 — سورة الدخان – الآية 47** (`lataif:w451`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 44:47; spelling-convention differences only (no change of word or reading): «إِلَى» / Tanzil «إِلَىٰ». — https://tanzil.net/#44:47
- ✓ verse-reference: Shown «سورة الدخان – الآية 47» = surah الدخان 44:47. — https://tanzil.net/#44:47
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 44:47: «فاعتلوه: فقودوه بعنف وغلظة، وهو أن يؤخذ بتلبيب الرجل فيجرّ إلى حبس أو قتل». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/44/47.json

**Wamada 452 — سورة الجاثية – الآية 28** (`lataif:w452`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 45:28. — https://tanzil.net/#45:28
- ✓ verse-reference: Shown «سورة الجاثية – الآية 28» = surah الجاثية 45:28. — https://tanzil.net/#45:28
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 45:28: «جاثية: باركة مستوفزة على الركب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/45/28.json

**Wamada 453 — سورة الأحقاف – الآية 24** (`lataif:w453`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 46:24. — https://tanzil.net/#46:24
- ✓ verse-reference: Shown «سورة الأحقاف – الآية 24» = surah الأحقاف 46:24. — https://tanzil.net/#46:24
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 46:24: «والعارض: السحاب الذي يعرض في أفق السماء». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/46/24.json

**Wamada 454 — سورة محمد – الآية 4** (`lataif:w454`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 47:4. — https://tanzil.net/#47:4
- ✓ verse-reference: Shown «سورة محمد – الآية 4» = surah محمد 47:4. — https://tanzil.net/#47:4
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 47:4: «حتى إذا أثخنتموهم… يقول: حتى إذا غلبتموهم وقهرتم من لم تضربوا رقبته منهم، فصاروا في أيديكم أسرى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/47/4.json

**Wamada 456 — سورة الحجرات – الآية 11** (`lataif:w456`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 49:11. — https://tanzil.net/#49:11
- ✓ verse-reference: Shown «سورة الحجرات – الآية 11» = surah الحجرات 49:11. — https://tanzil.net/#49:11
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 49:11: «ولا تنابزوا بالألقاب، أي: لا تتداعوا بالألقاب، وهي التي يسوء الشخص سماعها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/49/11.json

**Wamada 457 — سورة الذاريات – الآيتان 1–2** (`lataif:w457`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 51:1-2. — https://tanzil.net/#51:1
- ✓ verse-reference: Shown «سورة الذاريات – الآيتان 1–2» = surah الذاريات 51:1-2. — https://tanzil.net/#51:1
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 51:1–2: «فالحاملات وقراً: السحاب، لأنها تحمل المطر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/51/1.json

**Wamada 458 — سورة الطور – الآيتان 5–6** (`lataif:w458`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 52:5-6. — https://tanzil.net/#52:5
- ✓ verse-reference: Shown «سورة الطور – الآيتان 5–6» = surah الطور 52:5-6. — https://tanzil.net/#52:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 52:6 gives both readings: «المراد أنه يوقد يوم القيامة ناراً»; Qatada: «المسجور: المملوء». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/52/5.json

**Wamada 460 — سورة القمر – الآيتان 12–13** (`lataif:w460`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 54:12-13. — https://tanzil.net/#54:12
- ✓ verse-reference: Shown «سورة القمر – الآيتان 12–13» = surah القمر 54:12-13. — https://tanzil.net/#54:12
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 54:13: «والدسار: المسمار الذي تشد به السفينة؛ يقال منه: دسرت السفينة إذا شددتها بمسامير أو غيرها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/54/12.json

**Wamada 461 — سورة الرحمن – الآية 14** (`lataif:w461`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 55:14. — https://tanzil.net/#55:14
- ✓ verse-reference: Shown «سورة الرحمن – الآية 14» = surah الرحمن 55:14. — https://tanzil.net/#55:14
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 55:14: «من صلصال: وهو الطين اليابس الذي لم يطبخ، فإنه من يبسه له صلصلة إذا حُرّك ونُقر كالفخار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/55/14.json

**Wamada 462 — سورة الواقعة – الآية 19** (`lataif:w462`) — **Verified**
- ✓ quran-verse: Corrected 2026-10-31 and rechecked: Verse now letter-and-vowel identical to Tanzil 56:19. (Before correction: Tanzil 56:19: wrong vowelling that changes the word: «لَا يَصْدَعُونَ» for Tanzil (Hafs) «لَّا يُصَدَّعُونَ».) — https://tanzil.net/#56:19
- ✓ verse-reference: Shown «سورة الواقعة – الآية 19» = surah الواقعة 56:19. — https://tanzil.net/#56:19
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf: at 56:19 «لا يصدعون عنها، أي بسببها… لا يصدر صداعهم عنها»; and at 37:47 «ينزفون… من نزف الشارب إذا ذهب عقله. ويقال للسكران: نزيف ومنزوف». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/56/19.json

**Wamada 463 — سورة الحديد – الآية 13** (`lataif:w463`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 57:13. — https://tanzil.net/#57:13
- ✓ verse-reference: Shown «سورة الحديد – الآية 13» = surah الحديد 57:13. — https://tanzil.net/#57:13
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 57:13: «فضرب الله بين المؤمنين والمنافقين بسور، وهو حاجز بين أهل الجنة وأهل النار»; Ibn Zayd: «باطنه فيه الرحمة: الجنة وما فيها»; Qatada: «وظاهره من قبله العذاب: أي النار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/57/13.json

**Wamada 464 — سورة المجادلة – الآية 2** (`lataif:w464`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 58:2. — https://tanzil.net/#58:2
- ✓ verse-reference: Shown «سورة المجادلة – الآية 2» = surah المجادلة 58:2. — https://tanzil.net/#58:2
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 58:2: «الذين يحرّمون نساءهم على أنفسهم… فيقولون لهن: أنتن علينا كظهور أمهاتنا، وذلك كان طلاق الرجل امرأته في الجاهلية». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/58/2.json

**Wamada 465 — سورة الحشر – الآية 5** (`lataif:w465`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 59:5. — https://tanzil.net/#59:5
- ✓ verse-reference: Shown «سورة الحشر – الآية 5» = surah الحشر 59:5. — https://tanzil.net/#59:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 59:5: «اللين: نوع من التمر، وهو جيد… وقال كثيرون من المفسرين: اللينة: ألوان التمر سوى العجوة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/59/5.json

**Wamada 466 — سورة الممتحنة – الآية 8** (`lataif:w466`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 60:8. — https://tanzil.net/#60:8
- ✓ verse-reference: Shown «سورة الممتحنة – الآية 8» = surah الممتحنة 60:8. — https://tanzil.net/#60:8
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 60:8: «وتقسطوا إليهم، يقول: وتعدلوا فيهم بإحسانكم إليهم وبركم بهم»; «المقسطين: المنصفين الذين ينصفون الناس ويعطونهم الحق والعدل من أنفسهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/60/8.json

**Wamada 467 — سورة الصف – الآية 4** (`lataif:w467`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 61:4. — https://tanzil.net/#61:4
- ✓ verse-reference: Shown «سورة الصف – الآية 4» = surah الصف 61:4. — https://tanzil.net/#61:4
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 61:4: «كأنهم في تراصّهم من غير فرجة ولا خلل بنيان رُصّ بعضه إلى بعض ورُصف». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/61/4.json

**Wamada 469 — سورة الطلاق – الآية 4** (`lataif:w469`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 65:4. — https://tanzil.net/#65:4
- ✓ verse-reference: Shown «سورة الطلاق – الآية 4» = surah الطلاق 65:4. — https://tanzil.net/#65:4
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «جامع البيان - الطبري»; no quotation; the unsupported claim (الفسيولوجي) removed. (Before correction: Cited work: جامع البيان - الطبري. al-Tabari at 65:4 chooses «إن ارتبتم بالحكم فيهن وفي عددهن فلم تدروا ما هن» and argues against reading the doubt as about their blood or menopause («ومحال أن يقال… ارتبتم بيأسهن»); the reflection gives exactly that reason («لعدم معرفة قواعد انقطاع الدم أو السن»).) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/65/4.json

**Wamada 471 — سورة الملك – الآية 3** (`lataif:w471`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 67:3; spelling-convention differences only (no change of word or reading): «تَرَى» / Tanzil «تَرَىٰ»; «تَرَى» / Tanzil «تَرَىٰ». — https://tanzil.net/#67:3
- ✓ verse-reference: Shown «سورة الملك – الآية 3» = surah الملك 67:3. — https://tanzil.net/#67:3
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 67:3: «هل ترى من فطور: من صدوع وشقوق، جمع فطر وهو الشق». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/67/3.json

**Wamada 472 — سورة القلم – الآية 42** (`lataif:w472`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 68:42. — https://tanzil.net/#68:42
- ✓ verse-reference: Shown «سورة القلم – الآية 42» = surah القلم 68:42. — https://tanzil.net/#68:42
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 68:42: Ibn Abbas «هو يوم كرب وشدة»; Mujahid «شدة الأمر»; and he cites the hadith in the two Sahihs on the Lord uncovering His shin. — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/68/42.json

**Wamada 475 — سورة نوح – الآية 22** (`lataif:w475`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 71:22. — https://tanzil.net/#71:22
- ✓ verse-reference: Shown «سورة نوح – الآية 22» = surah نوح 71:22. — https://tanzil.net/#71:22
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 71:22: «ومكروا مكراً كبّاراً، يقول: ومكروا مكراً عظيماً»; «والكبار: وهو الكبير». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/71/22.json

**Wamada 476 — سورة الجن – الآية 8** (`lataif:w476`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 72:8. — https://tanzil.net/#72:8
- ✓ verse-reference: Shown «سورة الجن – الآية 8» = surah الجن 72:8. — https://tanzil.net/#72:8
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 72:8: «اللمس: المس، فاستعير للطلب»; the guards are «الملائكة الذين يرجمونهم بالشهب ويمنعونهم من الاستماع». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/72/8.json

**Wamada 477 — سورة المزمل – الآية 12** (`lataif:w477`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 73:12. — https://tanzil.net/#73:12
- ✓ verse-reference: Shown «سورة المزمل – الآية 12» = surah المزمل 73:12. — https://tanzil.net/#73:12
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 73:12: «من أنكال: وهي القيود الثقال». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/73/12.json

**Wamada 478 — سورة المدثر – الآيتان 30–31** (`lataif:w478`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 74:30-31. — https://tanzil.net/#74:30
- ✓ verse-reference: Shown «سورة المدثر – الآيتان 30–31» = surah المدثر 74:30-31. — https://tanzil.net/#74:30
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 74:31: «وما جعلنا أصحاب النار، أي: خزانها، إلا ملائكة، أي: [زبانية] غلاظاً شداداً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/74/30.json

**Wamada 479 — سورة القيامة – الآيتان 7–8** (`lataif:w479`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 75:7-8. — https://tanzil.net/#75:7
- ✓ verse-reference: Shown «سورة القيامة – الآيتان 7–8» = surah القيامة 75:7-8. — https://tanzil.net/#75:7
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 75:7: «برَق… بمعنى شخص وفُتح عند الموت… برِق بكسر الراء بمعنى: فزع وشق»; Mujahid: «عند الموت»; Qatada: «شخص البصر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/75/7.json

**Wamada 480 — سورة الإنسان – الآية 17** (`lataif:w480`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 76:17. — https://tanzil.net/#76:17
- ✓ verse-reference: Shown «سورة الإنسان – الآية 17» = surah الانسان 76:17. — https://tanzil.net/#76:17
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 76:17: «كان مزاجها زنجبيلاً… فتارة يمزج لهم الشراب بالكافور وهو بارد، وتارة بالزنجبيل وهو حار، ليعتدل الأمر». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/76/17.json

**Wamada 481 — سورة المرسلات – الآية 11** (`lataif:w481`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 77:11. — https://tanzil.net/#77:11
- ✓ verse-reference: Shown «سورة المرسلات – الآية 11» = surah المرسلات 77:11. — https://tanzil.net/#77:11
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 77:11: «وإذا الرسل أجّلت للاجتماع لوقتها يوم القيامة»; Ibn Abbas: «أقتت: جمعت»; «ليوم الفصل: ليوم يفصل الله فيه بين خلقه القضاء». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/77/11.json

**Wamada 484 — سورة عبس – الآية 33** (`lataif:w484`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 80:33. — https://tanzil.net/#80:33
- ✓ verse-reference: Shown «سورة عبس – الآية 33» = surah عبس 80:33. — https://tanzil.net/#80:33
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 80:33: Ibn Abbas «الصاخة اسم من أسماء يوم القيامة»; Ibn Jarir «لعله اسم للنفخة في الصور»; al-Baghawi «صيحة القيامة، سميت بذلك لأنها تصخ الأسماع». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/80/33.json

**Wamada 485 — سورة التكوير – الآيتان 15–16** (`lataif:w485`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 81:15-16. — https://tanzil.net/#81:15
- ✓ verse-reference: Shown «سورة التكوير – الآيتان 15–16» = surah التكوير 81:15-16. — https://tanzil.net/#81:15
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 81:15–16: «والكنس: الغيّب، من كنس الوحشي إذا دخل كناسه… فخنوسها رجوعها، وكنوسها اختفاؤها تحت ضوء الشمس». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/81/15.json

**Wamada 486 — سورة الانفطار – الآيتان 3–4** (`lataif:w486`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 82:3-4. — https://tanzil.net/#82:3
- ✓ verse-reference: Shown «سورة الانفطار – الآيتان 3–4» = surah الإنفطار 82:3-4. — https://tanzil.net/#82:3
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 82:4: «وإذا القبور أثيرت فاستخرج من فيها من الموتى أحياء؛ يقال: بعثر فلان حوض فلان إذا جعل أسفله أعلاه». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/82/3.json

**Wamada 487 — سورة المطففين – الآية 7** (`lataif:w487`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 83:7; spelling-convention differences only (no change of word or reading): «الفُجَّارِ» / Tanzil «الْفُجَّارِ». — https://tanzil.net/#83:7
- ✓ verse-reference: Shown «سورة المطففين – الآية 7» = surah المطففين 83:7. — https://tanzil.net/#83:7
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 83:7: «سجين، فعيل من السجن وهو الضيق… هو أمر عظيم وسجن مقيم»; «ثم قد قال قائلون: هي تحت الأرض السابعة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/83/7.json

**Wamada 488 — سورة الانشقاق – الآية 2** (`lataif:w488`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 84:2. — https://tanzil.net/#84:2
- ✓ verse-reference: Shown «سورة الانشقاق – الآية 2» = surah الإنشقاق 84:2. — https://tanzil.net/#84:2
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 84:2: Qatada and al-Dahhak «سمعت وأطاعت»; «وحقّت: وحقق الله عليها الاستماع بالانشقاق والانتهاء إلى طاعته». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/84/2.json

**Wamada 489 — سورة البروج – الآيتان 1–2** (`lataif:w489`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 85:1-2. — https://tanzil.net/#85:1
- ✓ verse-reference: Shown «سورة البروج – الآيتان 1–2» = surah البروج 85:1-2. — https://tanzil.net/#85:1
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 85:1: opinions on «البروج» including «النجوم», and «واختار ابن جرير أنها منازل الشمس والقمر، وهي اثنا عشر برجاً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/85/1.json

**Wamada 491 — سورة الأعلى – الآيتان 4–5** (`lataif:w491`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 87:4-5; spelling-convention differences only (no change of word or reading): «الْمَرْعَى» / Tanzil «الْمَرْعَىٰ»; «أَحْوَى» / Tanzil «أَحْوَىٰ». — https://tanzil.net/#87:4
- ✓ verse-reference: Shown «سورة الأعلى – الآيتان 4–5» = surah الأعلى 87:4-5. — https://tanzil.net/#87:4
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 87:5: «فجعله بعد خضرته ورفيفه غثاءً أحوى: درِيناً أسود». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/87/4.json

**Wamada 492 — سورة الغاشية – الآيتان 4–5** (`lataif:w492`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 88:4-5; spelling-convention differences only (no change of word or reading): «تَصْلَى» / Tanzil «تَصْلَىٰ»; «تُسْقَى» / Tanzil «تُسْقَىٰ». — https://tanzil.net/#88:4
- ✓ verse-reference: Shown «سورة الغاشية – الآيتان 4–5» = surah الغاشية 88:4-5. — https://tanzil.net/#88:4
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 88:4–5: «تصلى ناراً حامية، أي: حارة شديدة الحر، تسقى من عين آنية، أي: قد انتهى حرها وغليانها» (Ibn Abbas, Mujahid, al-Hasan, al-Suddi). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/88/4.json

**Wamada 493 — سورة الفجر – الآيات 1–3** (`lataif:w493`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 89:1-3. — https://tanzil.net/#89:1
- ✓ verse-reference: Shown «سورة الفجر – الآيات 1–3» = surah الفجر 89:1-3. — https://tanzil.net/#89:1
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 89:3 reports «الشفع: الخلق كله، والوتر: الله» (Ibn Abbas: «الله وتر، وأنتم شفع») and Qatada «إن من الصلاة شفعاً وإن منها وتراً». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/89/1.json

**Wamada 494 — سورة البلد – الآيات 1–4** (`lataif:w494`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 90:1-4. — https://tanzil.net/#90:1
- ✓ verse-reference: Shown «سورة البلد – الآيات 1–4» = surah البلد 90:1-4. — https://tanzil.net/#90:1
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 90:4: «في كبد… في شدة وطلب معيشة» (Said b. Jubayr); «في مشقة» (Qatada); «واختار ابن جرير أن المراد بذلك مكابدة الأمور ومشاقها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/90/1.json

**Wamada 495 — سورة الشمس – الآيتان 11–12** (`lataif:w495`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 91:11-12. — https://tanzil.net/#91:11
- ✓ verse-reference: Shown «سورة الشمس – الآيتان 11–12» = surah الشمس 91:11-12. — https://tanzil.net/#91:11
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 91:11 reports Qatada «أي الطغيان», Mujahid «معصيتها» and Ibn Zayd «بغيانهم وبمعصيتهم» (his own preference is the punishment that overwhelmed them). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/91/11.json

**Wamada 496 — سورة الليل – الآية 11** (`lataif:w496`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 92:11; spelling-convention differences only (no change of word or reading): «تَرَدَّى» / Tanzil «تَرَدَّىٰ». — https://tanzil.net/#92:11
- ✓ verse-reference: Shown «سورة الليل – الآية 11» = surah الليل 92:11. — https://tanzil.net/#92:11
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 92:11: «إذا تردّى: قال مجاهد: أي إذا مات. وقال أبو صالح ومالك عن زيد بن أسلم: إذا تردّى في النار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/92/11.json

**Wamada 497 — سورة الضحى – الآيتان 2–3** (`lataif:w497`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 93:2-3; spelling-convention differences only (no change of word or reading): «سَجَى» / Tanzil «سَجَىٰ»; «قَلَى» / Tanzil «قَلَىٰ». — https://tanzil.net/#93:2
- ✓ verse-reference: Shown «سورة الضحى – الآيتان 2–3» = surah الضحى 93:2-3. — https://tanzil.net/#93:2
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 93:2: «يقال: سجا الليل سجواً… إذا امتد وطال مدة ظلامه، مثل سجو المرء بالغطاء إذا غطي به جميع جسده». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/93/2.json

**Wamada 499 — سورة التين – الآية 5** (`lataif:w499`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 95:5. — https://tanzil.net/#95:5
- ✓ verse-reference: Shown «سورة التين – الآية 5» = surah التين 95:5. — https://tanzil.net/#95:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 95:5 gives both readings: «مصيره إلى النار إن لم يطع الله» and «إلى أرذل العمر» (Ibn Abbas, Ikrima; Ibn Jarir's choice). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/95/5.json

**Wamada 500 — سورة العلق – الآية 15** (`lataif:w500`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 96:15. — https://tanzil.net/#96:15
- ✓ verse-reference: Shown «سورة العلق – الآية 15» = surah العلق 96:15. — https://tanzil.net/#96:15
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 96:15: «لنسفعاً بالناصية: لنأخذن بناصيته ولنسحبنه بها إلى النار. والسفع: القبض على الشيء وجذبه بشدة». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/96/15.json

**Wamada 501 — سورة القدر – الآية 1** (`lataif:w501`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 97:1. — https://tanzil.net/#97:1
- ✓ verse-reference: Shown «سورة القدر – الآية 1» = surah القدر 97:1. — https://tanzil.net/#97:1
- ✓ reflection-attribution: Corrected 2026-10-31 and rechecked: Cited work now «التحرير والتنوير - ابن عاشور»; no quotation; the unsupported claim (التضييق) removed. (Before correction: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 97:1 gives only «والقدر… هو بمعنى الشرف والفضل… أي ليلة القدر والشرف عند الله»; the reflection's further senses («التضييق» and the annual «تقدير… الأقدار») are not in his commentary there.) — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/97/1.json

**Wamada 502 — سورة البينة – الآية 1** (`lataif:w502`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 98:1. — https://tanzil.net/#98:1
- ✓ verse-reference: Shown «سورة البينة – الآية 1» = surah البينة 98:1. — https://tanzil.net/#98:1
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 98:1: «منفكين، يقول: منتهين حتى يأتيهم… البينة»; Ibn Zayd «لم يكونوا منتهين حتى يأتيهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/98/1.json

**Wamada 504 — سورة العاديات – الآية 1** (`lataif:w504`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 100:1. — https://tanzil.net/#100:1
- ✓ verse-reference: Shown «سورة العاديات – الآية 1» = surah العاديات 100:1. — https://tanzil.net/#100:1
- ✓ reflection-attribution: Cited work: التحرير والتنوير - ابن عاشور. Ibn Ashur at 100:1: «والضبح: اضطراب النفس المتردد في الحنجرة دون أن يخرج من الفم، وهو من أصوات الخيل والسباع». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-tahrir-al-tanwir/100/1.json

**Wamada 505 — سورة العاديات – الآية 6** (`lataif:w505`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 100:6. — https://tanzil.net/#100:6
- ✓ verse-reference: Shown «سورة العاديات – الآية 6» = surah العاديات 100:6. — https://tanzil.net/#100:6
- ✓ reflection-attribution: Cited work: طريق الهجرتين - ابن القيم. Tariq al-Hijratayn on 100:6: «الكنود هو الكفور، وهو الذي يذكر المصائب وينسى النعم». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.TariqHijratayn/0751IbnQayyimJawziyya.TariqHijratayn.JK000065-ara1

**Wamada 506 — سورة العاديات – الآية 10** (`lataif:w506`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 100:10. — https://tanzil.net/#100:10
- ✓ verse-reference: Shown «سورة العاديات – الآية 10» = surah العاديات 100:10. — https://tanzil.net/#100:10
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 100:10: «وحُصّل ما في الصدور: قال ابن عباس وغيره: يعني أبرز وأظهر ما كانوا يسرّون في نفوسهم». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/100/10.json

**Wamada 507 — سورة القارعة – الآية 5** (`lataif:w507`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 101:5. — https://tanzil.net/#101:5
- ✓ verse-reference: Shown «سورة القارعة – الآية 5» = surah القارعة 101:5. — https://tanzil.net/#101:5
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 101:5: «وشبّه الجبال بالعهن، وهو الصوف المصبّغ ألواناً… وبالمنفوش منه لتفرق أجزائها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/101/5.json

**Wamada 508 — سورة التكاثر – الآيتان 1–2** (`lataif:w508`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 102:1-2. — https://tanzil.net/#102:1
- ✓ verse-reference: Shown «سورة التكاثر – الآيتان 1–2» = surah التكاثر 102:1-2. — https://tanzil.net/#102:1
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 102:1–2: Qatada «نحن أكثر من بني فلان… ألهاهم ذلك حتى ماتوا ضلالاً», and the hadith indicating «التكاثر بالمال». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/102/1.json

**Wamada 510 — سورة الهمزة – الآية 1** (`lataif:w510`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 104:1. — https://tanzil.net/#104:1
- ✓ verse-reference: Shown «سورة الهمزة – الآية 1» = surah الهمزة 104:1. — https://tanzil.net/#104:1
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 104:1 reports Mujahid «الهمزة: باليد والعين، واللمزة: باللسان» — the reflection's reading (his own opening line gives the reverse: «الهماز بالقول، واللماز بالفعل»); Ibn Abbas «طعّان معياب». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/104/1.json

**Wamada 511 — سورة الهمزة – الآية 4** (`lataif:w511`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 104:4. — https://tanzil.net/#104:4
- ✓ verse-reference: Shown «سورة الهمزة – الآية 4» = surah الهمزة 104:4. — https://tanzil.net/#104:4
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 104:4: «الحطمة… التي من شأنها أن تحطم كل ما يلقى فيها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/104/4.json

**Wamada 512 — سورة الفيل – الآية 5** (`lataif:w512`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 105:5. — https://tanzil.net/#105:5
- ✓ verse-reference: Shown «سورة الفيل – الآية 5» = surah الفيل 105:5. — https://tanzil.net/#105:5
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 105:5: «فجعل الله أصحاب الفيل كزرع أكلته الدواب فراثته، فيبس وتفرقت أجزاؤه»; Ibn Zayd: «ورق الزرع وورق البقل إذا أكلته البهائم فراثته». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/105/5.json

**Wamada 513 — سورة قريش – الآيتان 1–2** (`lataif:w513`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 106:1-2. — https://tanzil.net/#106:1
- ✓ verse-reference: Shown «سورة قريش – الآيتان 1–2» = surah قريش 106:1-2. — https://tanzil.net/#106:1
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 106:1–2 on Quraysh being safe in their winter and summer journeys «لعظمتهم عند الناس، لكونهم سكان حرم الله». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/106/1.json

**Wamada 514 — سورة الماعون – الآية 7** (`lataif:w514`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 107:7. — https://tanzil.net/#107:7
- ✓ verse-reference: Shown «سورة الماعون – الآية 7» = surah الماعون 107:7. — https://tanzil.net/#107:7
- ✓ reflection-attribution: Cited work: بدائع الفوائد - الإمام ابن القيم. Badai al-Fawaid (citing Ahmad): «الماعون: الفأس والقدر وأشباه ذلك». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.BadaicFawaid/0751IbnQayyimJawziyya.BadaicFawaid.JK000064-ara1

**Wamada 516 — سورة الكافرون – الآية 6** (`lataif:w516`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 109:6. — https://tanzil.net/#109:6
- ✓ verse-reference: Shown «سورة الكافرون – الآية 6» = surah الكافرون 109:6. — https://tanzil.net/#109:6
- ✓ reflection-attribution: Cited work: الكشاف - الزمخشري. al-Kashshaf at 109:6: «لكم دينكم ولي دين: لكم شرككم، ولي توحيدي». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/al-kashshaf-al-zamakhshari/109/6.json

**Wamada 517 — سورة النصر – الآية 2** (`lataif:w517`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 110:2. — https://tanzil.net/#110:2
- ✓ verse-reference: Shown «سورة النصر – الآية 2» = surah النصر 110:2. — https://tanzil.net/#110:2
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 110:2: «أفواجاً، يعني: زمراً، فوجاً فوجاً»; Mujahid: «زمراً زمراً»; «من صنوف العرب وقبائلها». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/110/2.json

**Wamada 518 — سورة المسد – الآية 1** (`lataif:w518`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 111:1. — https://tanzil.net/#111:1
- ✓ verse-reference: Shown «سورة المسد – الآية 1» = surah المسد 111:1. — https://tanzil.net/#111:1
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 111:1: «خسرت يدا أبي لهب، وخسر هو… تبّ عمله»; Qatada «خسرت وتبّ». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/111/1.json

**Wamada 519 — سورة المسد – الآية 5** (`lataif:w519`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 111:5. — https://tanzil.net/#111:5
- ✓ verse-reference: Shown «سورة المسد – الآية 5» = surah المسد 111:5. — https://tanzil.net/#111:5
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 111:5: al-Shabi «المسد: الليف»; al-Jawhari «حبل من ليف أو خوص… إذا أجدت فتله»; «فأعقبها الله بها حبلاً في جيدها من مسد النار». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/111/5.json

**Wamada 521 — سورة الفلق – الآية 1** (`lataif:w521`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 113:1. — https://tanzil.net/#113:1
- ✓ verse-reference: Shown «سورة الفلق – الآية 1» = surah الفلق 113:1. — https://tanzil.net/#113:1
- ✓ reflection-attribution: Cited work: جامع البيان - الطبري. al-Tabari at 113:1: «والفلق في كلام العرب: فلق الصبح… وجب أن يكون معنياً به كل ما اسمه الفلق»; al-Qurazi «فالق الحب والنوى». — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-al-tabari/113/1.json

**Wamada 522 — سورة الفلق – الآية 3** (`lataif:w522`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 113:3. — https://tanzil.net/#113:3
- ✓ verse-reference: Shown «سورة الفلق – الآية 3» = surah الفلق 113:3. — https://tanzil.net/#113:3
- ✓ reflection-attribution: Cited work: تفسير ابن كثير. Ibn Kathir at 113:3: «إنه الليل إذا أقبل بظلامه» (Ibn Abbas, Muhammad b. Kab, al-Dahhak, al-Hasan, Qatada). — https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-ibn-kathir/113/3.json

**Wamada 523 — سورة الفلق – الآية 4** (`lataif:w523`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 113:4. — https://tanzil.net/#113:4
- ✓ verse-reference: Shown «سورة الفلق – الآية 4» = surah الفلق 113:4. — https://tanzil.net/#113:4
- ✓ reflection-attribution: Cited work: بدائع الفوائد - الإمام ابن القيم. Badai al-Fawaid: «فإن النفاثات في العقد هن السواحر اللاتي يعقدن الخيوط وينفثن على كل عقدة… والنفث هو النفخ مع ريق». — https://raw.githubusercontent.com/OpenITI/0775AH/master/data/0751IbnQayyimJawziyya/0751IbnQayyimJawziyya.BadaicFawaid/0751IbnQayyimJawziyya.BadaicFawaid.JK000064-ara1


### Saadi Lataif

**Saadi q11-115 — سورة هود، الآية 115** (`lataif:q11-115`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 11:115. — https://tanzil.net/#11:115
- ✓ verse-reference: Shown «سورة هود، الآية 115» = surah هود 11:115. — https://tanzil.net/#11:115
- ✓ english: Matches Saheeh International on quran.com (resource 20): «And be patient, for indeed, Allāh does not allow to be lost the reward of those who do good.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/11/115 · https://api.quran.com/api/v4/quran/translations/20?verse_key=11:115
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 11:115 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/11:115 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/11/115.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/11/115.json

**Saadi q14-7 — سورة إبراهيم، الآية 7** (`lataif:q14-7`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 14:7; spelling-convention differences only (no change of word or reading): «لَئِنْ» / Tanzil «لَئِن»; «وَلَئِنْ» / Tanzil «وَلَئِن». — https://tanzil.net/#14:7
- ✓ verse-reference: Shown «سورة إبراهيم، الآية 7» = surah ابراهيم 14:7. — https://tanzil.net/#14:7
- ✓ english: Matches Saheeh International on quran.com (resource 20): «And [remember] when your Lord proclaimed, 'If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is severe.'"» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/14/7 · https://api.quran.com/api/v4/quran/translations/20?verse_key=14:7
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 14:7 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/14:7 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/14/7.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/14/7.json

**Saadi q16-18 — سورة النحل، الآية 18** (`lataif:q16-18`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 16:18; spelling-convention differences only (no change of word or reading): «وَإِنْ» / Tanzil «وَإِن»; «رَحِيمٌ» / Tanzil «رَّحِيمٌ». — https://tanzil.net/#16:18
- ✓ verse-reference: Shown «سورة النحل، الآية 18» = surah النحل 16:18. — https://tanzil.net/#16:18
- ✓ english: Matches Saheeh International on quran.com (resource 20): «And if you should count the favors of Allāh, you could not enumerate them. Indeed, Allāh is Forgiving and Merciful.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/16/18 · https://api.quran.com/api/v4/quran/translations/20?verse_key=16:18
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 16:18 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/16:18 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/16/18.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/16/18.json

**Saadi q16-53 — سورة النحل، الآية 53** (`lataif:q16-53`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 16:53; spelling-convention differences only (no change of word or reading): «بِكُمْ مِنْ نِعْمَةٍ» / Tanzil «بِكُم مِّن نِّعْمَةٍ». — https://tanzil.net/#16:53
- ✓ verse-reference: Shown «سورة النحل، الآية 53» = surah النحل 16:53. — https://tanzil.net/#16:53
- ✓ english: Matches Saheeh International on quran.com (resource 20): «And whatever you have of favor - it is from Allāh. Then when adversity touches you, to Him you cry for help.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/16/53 · https://api.quran.com/api/v4/quran/translations/20?verse_key=16:53
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 16:53 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/16:53 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/16/53.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/16/53.json

**Saadi q3-134 — سورة آل عمران، الآية 134** (`lataif:q3-134`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 3:134; spelling-convention differences only (no change of word or reading): «يُنْفِقُونَ» / Tanzil «يُنفِقُونَ». — https://tanzil.net/#3:134
- ✓ verse-reference: Shown «سورة آل عمران، الآية 134» = surah آل عمران 3:134. — https://tanzil.net/#3:134
- ✓ english: Matches Saheeh International on quran.com (resource 20): «Who spend [in the cause of Allāh] during ease and hardship and who restrain anger and who pardon the people - and Allāh loves the doers of good;» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/3/134 · https://api.quran.com/api/v4/quran/translations/20?verse_key=3:134
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 3:134 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/3:134 · https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/ar-tafsir-as-saadi/3/134.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/3/134.json

**Saadi q33-41 — سورة الأحزاب، الآية 41–42** (`lataif:q33-41`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 33:41-42. — https://tanzil.net/#33:41
- ✓ verse-reference: Shown «سورة الأحزاب، الآية 41–42» = surah الأحزاب 33:41-42. — https://tanzil.net/#33:41
- ✓ english: Matches Saheeh International on quran.com (resource 20): «O you who have believed, remember Allāh with much remembrance And exalt Him morning and afternoon.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/33/41-42 · https://api.quran.com/api/v4/quran/translations/20?verse_key=33:41
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 33:41 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/33:41 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/33/41.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/33/41.json

**Saadi q39-10 — سورة الزمر، الآية 10** (`lataif:q39-10`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 39:10; spelling-convention differences only (no change of word or reading): «أَجْرَهُمْ» / Tanzil «أَجْرَهُم». — https://tanzil.net/#39:10
- ✓ verse-reference: Shown «سورة الزمر، الآية 10» = surah الزمر 39:10. — https://tanzil.net/#39:10
- ✓ english: Corrected 2026-10-31 and rechecked: Now verbatim Saheeh International (quran.com resource 20), bracketed note included. (Before correction: Not verbatim: drops Saheeh International's bracketed gloss. App «Indeed, the patient will be given their reward without account» / SI «Say, "O My servants who have believed, fear your Lord. For those who do good in this world is good, and the earth of Allāh is spacious. Indeed, the patient will be given their reward without account [i.e., limit]."».) — https://quran.com/39/10
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 39:10 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/39:10 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/39/10.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/39/10.json

**Saadi q39-53 — سورة الزمر، الآية 53** (`lataif:q39-53`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 39:53; spelling-convention differences only (no change of word or reading): «أَنْفُسِهِمْ» / Tanzil «أَنفُسِهِمْ»; «مِنْ رَحْمَةِ» / Tanzil «مِن رَّحْمَةِ». — https://tanzil.net/#39:53
- ✓ verse-reference: Shown «سورة الزمر، الآية 53» = surah الزمر 39:53. — https://tanzil.net/#39:53
- ✓ english: Matches Saheeh International on quran.com (resource 20): «Say, "O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allāh. Indeed, Allāh forgives all sins. Indeed, it is He who is the Forgiving, the Merciful."» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/39/53 · https://api.quran.com/api/v4/quran/translations/20?verse_key=39:53
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 39:53 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/39:53 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/39/53.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/39/53.json

**Saadi q39-9 — سورة الزمر، الآية 9** (`lataif:q39-9`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 39:9 (excerpt). — https://tanzil.net/#39:9
- ✓ verse-reference: Shown «سورة الزمر، الآية 9» = surah الزمر 39:9. — https://tanzil.net/#39:9
- ✓ english: Matches Saheeh International (verbatim excerpt) on quran.com (resource 20): «Is one who is devoutly obedient during periods of the night, prostrating and standing [in prayer], fearing the Hereafter and hoping for the mercy of his Lord, [like one who does not]? Say, "Are those who know equal to those who do not know?" Only they will remember [who are] people of understanding.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/39/9 · https://api.quran.com/api/v4/quran/translations/20?verse_key=39:9
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 39:9 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/39:9 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/39/9.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/39/9.json

**Saadi q4-86 — سورة النساء، الآية 86** (`lataif:q4-86`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 4:86; spelling-convention differences only (no change of word or reading): «حُيِّيتُمْ» / Tanzil «حُيِّيتُم». — https://tanzil.net/#4:86
- ✓ verse-reference: Shown «سورة النساء، الآية 86» = surah النساء 4:86. — https://tanzil.net/#4:86
- ✓ english: Matches Saheeh International on quran.com (resource 20): «And when you are greeted with a greeting, greet [in return] with one better than it or [at least] return it [in a like manner]. Indeed Allāh is ever, over all things, an Accountant.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/4/86 · https://api.quran.com/api/v4/quran/translations/20?verse_key=4:86
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 4:86 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/4:86 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/4/86.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/4/86.json

**Saadi q41-34 — سورة فصلت، الآية 34** (`lataif:q41-34`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 41:34. — https://tanzil.net/#41:34
- ✓ verse-reference: Shown «سورة فصلت، الآية 34» = surah فصلت 41:34. — https://tanzil.net/#41:34
- ✓ english: Matches Saheeh International on quran.com (resource 20): «And not equal are the good deed and the bad. Repel [evil] by that [deed] which is better; and thereupon, the one whom between you and him is enmity [will become] as though he was a devoted friend.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/41/34 · https://api.quran.com/api/v4/quran/translations/20?verse_key=41:34
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 41:34 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/41:34 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/41/34.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/41/34.json

**Saadi q49-10 — سورة الحجرات، الآية 10** (`lataif:q49-10`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 49:10. — https://tanzil.net/#49:10
- ✓ verse-reference: Shown «سورة الحجرات، الآية 10» = surah الحجرات 49:10. — https://tanzil.net/#49:10
- ✓ english: Matches Saheeh International on quran.com (resource 20): «The believers are but brothers, so make settlement between your brothers. And fear Allāh that you may receive mercy.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/49/10 · https://api.quran.com/api/v4/quran/translations/20?verse_key=49:10
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 49:10 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/49:10 · https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir/ar-tafsir-as-saadi/49/10.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/49/10.json

**Saadi q7-205 — سورة الأعراف، الآية 205** (`lataif:q7-205`) — **Verified**
- ✓ quran-verse: Same letters as Tanzil 7:205; spelling-convention differences only (no change of word or reading): «وَاذْكُرْ رَبَّكَ» / Tanzil «وَاذْكُر رَّبَّكَ»; «تَكُنْ مِنَ» / Tanzil «تَكُن مِّنَ». — https://tanzil.net/#7:205
- ✓ verse-reference: Shown «سورة الأعراف، الآية 205» = surah الأعراف 7:205. — https://tanzil.net/#7:205
- ✓ english: Matches Saheeh International on quran.com (resource 20): «And remember your Lord within yourself in humility and in fear without being apparent in speech - in the mornings and the evenings. And do not be among the heedless.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/7/205 · https://api.quran.com/api/v4/quran/translations/20?verse_key=7:205
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 7:205 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/7:205 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/7/205.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/7/205.json

**Saadi q70-5 — سورة المعارج، الآية 5** (`lataif:q70-5`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 70:5. — https://tanzil.net/#70:5
- ✓ verse-reference: Shown «سورة المعارج، الآية 5» = surah المعارج 70:5. — https://tanzil.net/#70:5
- ✓ english: Matches Saheeh International on quran.com (resource 20): «So be patient with gracious patience.» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/70/5 · https://api.quran.com/api/v4/quran/translations/20?verse_key=70:5
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 70:5 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/70:5 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/70/5.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/70/5.json

**Saadi q93-11 — سورة الضحى، الآية 11** (`lataif:q93-11`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 93:11. — https://tanzil.net/#93:11
- ✓ verse-reference: Shown «سورة الضحى، الآية 11» = surah الضحى 93:11. — https://tanzil.net/#93:11
- ✓ english: Matches Saheeh International on quran.com (resource 20): «But as for the favor of your Lord, report [it].» (only «Allāh»→«Allah» and final punctuation differ). — https://quran.com/93/11 · https://api.quran.com/api/v4/quran/translations/20?verse_key=93:11
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 93:11 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/93:11 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/93/11.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/93/11.json

**Saadi q94-5 — سورة الشرح، الآية 5–6** (`lataif:q94-5`) — **Verified**
- ✓ quran-verse: Verbatim (letters and vowels) in Tanzil quran-simple at 94:5-6. — https://tanzil.net/#94:5
- ✓ verse-reference: Shown «سورة الشرح، الآية 5–6» = surah الشرح 94:5-6. — https://tanzil.net/#94:5
- ✓ english: Corrected 2026-10-31 and rechecked: Now verbatim Saheeh International (quran.com resource 20), bracketed note included. (Before correction: Not verbatim: drops Saheeh International's bracketed gloss. App «For indeed, with hardship [will be] ease Indeed, with hardship [will be] ease» / SI «For indeed, with hardship [will be] ease [i.e., relief]. Indeed, with hardship [will be] ease.».) — https://quran.com/94/5-6
- ✓ saadi-tafsir: Excerpt verbatim (letters; vowels/punctuation ignored) in Tafsir al-Sa'di at 94:5 in every witness: quran.com tafsir 91, tafsir_api ar-tafsir-as-saadi, tafsir_api ar-tafseer-al-saddi, OpenITI (altafsir.com transcription). Independent digital witnesses: quran.com tafsir 91 (= tafsir_api al-saddi, same dataset), tafsir_api as-saadi, OpenITI (source: altafsir.com). No printed edition was accessible. — https://api.quran.com/api/v4/tafsirs/91/by_ayah/94:5 · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/94/5.json · https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/94/5.json
