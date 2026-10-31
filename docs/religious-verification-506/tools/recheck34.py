"""Independent recheck of the 34 corrected items against their cited sources. Usage: recheck34.py <fresh export json>"""
import json, re, sys, os, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wamada_view as wv
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a = json.load(open(sys.argv[1]))
def N(s):
    s = unicodedata.normalize("NFC", re.sub(r"<[^>]+>|\[\[.*?\]\]", " ", s, flags=re.S)); s = re.sub(r"[ً-ٰٟـ]", "", s)
    for x, y in (("أ","ا"),("إ","ا"),("آ","ا"),("ٱ","ا"),("ى","ي"),("ة","ه"),("ؤ","و"),("ئ","ي")): s = s.replace(x, y)
    s = re.sub(r"(صلي الله عليه وسلم|ﷺ|رضي الله عنه|رضى الله عنه)", " ", s)
    return " ".join(re.findall(r"[ء-ي0-9]+", s))
C = f"{D}/cache/hadith-api"
ed = lambda l, b: json.load(open(f"{C}/{l}-{b}.json"))["hadiths"]
B, M = ed("ara", "bukhari"), ed("ara", "muslim")
rec = lambda E, n: " ".join(h["text"] for h in E if h["hadithnumber"] == n)
mrec = lambda n: " ".join(h["text"] for h in M if str(h.get("arabicnumber") or "").split(".")[0] == str(n))
res = {}
def R(k, ok, ev): res[k] = {"ok": bool(ok), "evidence": ev}
def quote(t): return re.findall(r"«([^»]+)»", t)
# --- hadith wording
t = a["hadith:9"]["textAr"]; R("hadith:9", N("وشبّك أصابعه") in N(rec(B, 481)) and "بين أصابعه" not in t and N(quote(t)[0]) in N(rec(B, 481)), "Bukhari 481 reads «وشبّك أصابعه»; the quote is verbatim there.")
t = a["hadith:71"]["textAr"]; R("hadith:71", N("إني أبدع بي فاحملني") in N(mrec(1893)) and "انقطعت" not in t and all(N(q) in N(mrec(1893)) for q in quote(t)), "Muslim 1893: «إني أُبدِع بي فاحملني»; both quoted sayings verbatim.")
t = a["hadith:137"]["textAr"]; R("hadith:137", N("يا نبي الله علمني شيئا انتفع به") in N(mrec(2618)) and N(quote(t)[0]) in N(mrec(2618)), "Muslim 2618: «يا نبي الله، علّمني شيئاً أنتفع به… اعزل الأذى عن طريق المسلمين».")
t = a["hadith:77"]; intro = rec(M, 4)
R("hadith:77", t["narratorAr"] == "أبو هريرة رضي الله عنه" and N(quote(t["textAr"])[0]) in N(rec(B, 110)) and N(quote(t["textAr"])[0]) in N(intro) and "هريره" in N(rec(B, 110)) and "هريره" in N(intro),
  "Abu Hurayra in both chains; «من كذب علي متعمداً فليتبوأ مقعده من النار» verbatim in Bukhari 110 and in Muslim's introduction (hadith-api ara-muslim no. 4).")
# --- reference
must = wv.norm(open(f"{D}/cache/openiti/mustadrak-Shamela0002266.txt", encoding="utf-8").read().replace("\n~~", " "))
i = must.find("الحياء والايمان قرنا"); R("hadith:70", a["hadith:70"]["referenceAr"] == "المستدرك للحاكم 58" and "58 -" in must[i-700:i], "al-Mustadrak (Ata ed.) no. 58 holds the hadith; reference now «المستدرك للحاكم 58».")
# --- grading credits: each named grader/verdict must be confirmed in an opened source
E = {b: {h["hadithnumber"]: h for h in ed("eng", b)} for b in ("abudawud", "tirmidhi")}
alb = lambda b, n: [g["grade"] for g in E[b][n]["grades"] if g["name"] == "Al-Albani"]
trm = lambda n: re.findall(r"هَذَا حَدِيثٌ [^.‏]*", rec(ed("ara", "tirmidhi"), n))
G = {"hadith:52": (alb("abudawud", 4800) == ["Hasan"], "al-Albani: Hasan (Abu Dawud 4800)."),
     "hadith:103": (alb("abudawud", 561) == ["Sahih"], "al-Albani: Sahih (Abu Dawud 561); the unsupported «حسّنه الترمذي» removed."),
     "hadith:105": (alb("abudawud", 3116) == ["Sahih"] and "هذا حديث صحيح الاسناد" in must[must.find("من كان اخر كلامه لا اله الا الله"):][:200], "al-Albani: Sahih (Abu Dawud 3116); al-Hakim «صحيح الإسناد» (al-Mustadrak 1299); unconfirmed «ووافقه الذهبي» removed."),
     "hadith:111": None,
     "hadith:112": (alb("tirmidhi", 2390) == ["Sahih"] and any("صَحِيحٌ" in x for x in trm(2390)), "al-Tirmidhi 2390 «حسن صحيح»; al-Albani: Sahih; unopened «صحيح الجامع» removed."),
     "hadith:114": (alb("tirmidhi", 1924) == ["Sahih"] and any("صَحِيحٌ" in x for x in trm(1924)), "al-Tirmidhi 1924 «حسن صحيح»; al-Albani: Sahih; the contradicted «حسّنه الألباني» and unconfirmed al-Hakim/al-Silsila credits removed."),
     "hadith:142": (alb("tirmidhi", 2139) == ["Hasan"] and any("حَسَنٌ" in x for x in trm(2139)), "al-Tirmidhi 2139 «حسن غريب»; al-Albani: Hasan; the contradicted «صححه الألباني» and «صحيح الجامع» removed."),
     "hadith:148": (alb("tirmidhi", 3479) == ["Hasan"], "al-Albani: Hasan (Tirmidhi 3479); unopened «صحيح الجامع (245)» removed.")}
tal = wv.norm(open(f"{D}/cache/openiti/talkhis.txt", encoding="utf-8").read()); mug = wv.norm(open(f"{D}/cache/openiti/mughni.txt", encoding="utf-8").read())
j = tal.find("1315 حديث تهادوا تحابوا"); k = mug.find("1453 حديث ( تهادوا تحابوا )")
G["hadith:111"] = ("واسناده حسن" in tal[j:j+400] and "بسند جيد" in mug[k:k+250], "Ibn Hajar, al-Talkhis al-Habir 1315 «وإسناده حسن»; al-Iraqi, al-Mughni 1453 «بسند جيد»; unopened al-Albani/al-Arnaut credits removed.")
for key, (ok, ev) in G.items(): R(key, ok, ev)
# --- English
eng = {h["hadithnumber"]: h["text"] for h in ed("eng", "bukhari")}
L = lambda s: re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
R("hadith:bukhari-6116", L(a["hadith:bukhari-6116"]["meaningEn"]) == L(eng[6116]) and "Muhsin Khan" in a["hadith:bukhari-6116"]["translation"]["source"], "Verbatim Muhsin Khan (hadith-api eng-bukhari 6116), labelled as such.")
from fetch import fetch
for k, ref in (("lataif:q94-5", ("94", [5, 6])), ("lataif:q39-10", ("39", [10]))):
    si = " ".join(json.loads(fetch(f"https://api.quran.com/api/v4/quran/translations/20?verse_key={ref[0]}:{x}"))["translations"][0]["text"] for x in ref[1])
    si = re.sub(r"<sup[^>]*>.*?</sup>", "", si).replace("ā", "a")
    R(k, L(a[k]["verseEn"]) in L(si) and "[i.e.," in a[k]["verseEn"], "Now verbatim Saheeh International (quran.com resource 20), bracketed note included.")
# --- verses
T = {}
for l in open(f"{D}/cache/tanzil-simple.txt", encoding="utf-8"):
    if l.count("|") >= 2 and not l.startswith("#"): s_, a_, t_ = l.rstrip("\n").split("|", 2); T[(int(s_), int(a_))] = t_
nf = lambda s: re.sub(r"\s+", " ", unicodedata.normalize("NFC", s)).strip()
for k in ("lataif:w116", "lataif:w130", "lataif:w462"):
    r = a[k]["quranRef"]; cited = nf(" ".join(T[(r["surah"], x)] for x in range(r["fromAyah"], r["toAyah"] + 1)))
    R(k, nf(a[k]["verseShown"]) == cited, f"Verse now letter-and-vowel identical to Tanzil {r['surah']}:{r['fromAyah']}.")
# --- Wamadat reflections: every «quote» verbatim in the cited work; removed claims gone
GONE = {30: ["تودد"], 49: ["تمادى", "ثبت قلبي"], 76: ["يضمره"], 155: ["المفاجأة", "الخطة"], 165: ["طبيقية"], 212: ["البشر", "السعادة"], 239: ["الغني فتنة"],
        260: ["اللوح المحفوظ"], 278: ["الأدب"], 286: ["عائشة"], 296: ["فاقد الشيء"], 347: ["المكاسب"], 432: ["سياسي"], 469: ["الفسيولوجي"], 501: ["التضييق"]}
for i, gone in GONE.items():
    k = f"lataif:w{i}"; v = a[k]; r = v["quranRef"]
    src = wv.cited_text(wv.SLUG[v["source"]], r) if v["source"] in wv.SLUG else wv.book(wv.OPENITI[v["source"]])
    qs = quote(v["insightAr"]); ok_q = all(N(q) in N(src) for q in qs); ok_g = all(g not in v["insightAr"] for g in gone)
    R(k, ok_q and ok_g, f"Cited work now «{v['source'].rstrip('.')}»; " + (f"quoted wording verbatim in it at {r['surah']}:{r['fromAyah']}: " + " / ".join(f"«{q}»" for q in qs) + "; " if qs else "no quotation; ") + "the unsupported claim (" + ", ".join(gone) + ") removed.")
json.dump(res, open(f"{D}/batches/recheck-34.json", "w"), ensure_ascii=False, indent=1)
bad = [k for k, x in res.items() if not x["ok"]]; print(len(res), "rechecked; failed:", bad)
