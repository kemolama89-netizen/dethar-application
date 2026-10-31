"""Batch 4 reading view: each Wamada reflection next to the best-matching passages of its cited work at the cited verse.
python3 wamada_view.py START END   (index into the Wamadat in id order).  Passages come from tafsir_api per-ayah texts
(tafsirs) or the OpenITI full text (al-Raghib, Ibn al-Qayyim). Writes nothing; judgments go through wjudge.py."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from fetch import fetch
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = json.load(open(f"{D}/items-506.json"))
W = sorted([k for k, v in items.items() if v["kind"] == "wamada"], key=lambda k: items[k]["id"])
SLUG = {"تفسير ابن كثير.": "ar-tafsir-ibn-kathir", "جامع البيان - الطبري.": "ar-tafsir-al-tabari", "الكشاف - الزمخشري.": "al-kashshaf-al-zamakhshari",
        "التحرير والتنوير - ابن عاشور.": "ar-tafseer-tahrir-al-tanwir", "البحر المحيط في التفسير - أبو حيان الأندلسي.": "al-bahr-al-muhit"}
OPENITI = {"مفردات ألفاظ القرآن - الراغب الأصفهاني.": "raghib", "مدارج السالكين - ابن القيم.": "madarij", "طريق الهجرتين - ابن القيم.": "tariq",
           "إغاثة اللهفان - ابن القيم.": "ighatha", "الفوائد - ابن القيم.": "fawaid", "بدائع الفوائد - الإمام ابن القيم.": "badai", "زاد المعاد - ابن القيم.": "zad"}
def tafsir_url(slug, s, a, raw=False):
    base = "https://raw.githubusercontent.com/spa5k/tafsir_api/main/tafsir" if raw else "https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir"
    return f"{base}/{slug}/{s}/{a}.json"
def ayah_text(slug, s, a):
    for raw in (False, True):
        try: return json.loads(fetch(tafsir_url(slug, s, a, raw)))["text"]
        except Exception: pass
    return ""
def norm(s):
    s = re.sub(r"<[^>]+>", " ", s); s = re.sub(r"[ً-ٰٟـ]", "", s)
    for x, y in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ٱ", "ا"), ("ى", "ي"), ("ة", "ه")): s = s.replace(x, y)
    return s
STOP = set(norm("في من على إلى عن أن إن ما لا لم لن هو هي هم ذلك هذا هذه التي الذي الذين كان كانت قد ثم أو بل كل بعض مع عند حتى إذا إلا الله تعالى وهو وهي فيه به له لها منه عليه ولا وما ومن وفي").split())
def stem(w):
    w = re.sub(r"^(وال|فال|بال|كال|لل|ال|و|ف|ب|ل)", "", w) if len(w) > 4 else w
    return re.sub(r"(ها|هم|ه|ات|ون|ين|ان)$", "", w) if len(w) > 4 else w
def words(s): return [stem(w) for w in re.findall(r"[ء-ي]+", norm(s)) if w not in STOP and len(w) > 2]
def windows(text, size=320, step=160):
    t = re.sub(r"\s+", " ", re.sub(r"\[\[.*?\]\]", " ", re.sub(r"<[^>]+>", " ", text), flags=re.S)).strip()
    return [t[i:i + size] for i in range(0, max(1, len(t) - size // 2), step)]
def best(text, refl, n=3, verse=""):
    """Top non-overlapping windows by idf-weighted overlap with the reflection's words that are not the verse's words."""
    import math
    ws = windows(text); sets = [set(words(w)) for w in ws]
    rw = set(words(refl)) - set(words(verse))
    df = {x: sum(x in s for s in sets) for x in rw}
    score = [sum(math.log((1 + len(ws)) / (1 + df[x])) + 0.3 for x in rw & s) for s in sets]
    order = sorted(range(len(ws)), key=lambda i: -score[i]); out = []
    for i in order:
        if all(abs(i - j) > 1 for j, _ in out): out.append((i, ws[i]))
        if len(out) == n: break
    return [(round(score[i], 1), w) for i, w in sorted(out)]
_BOOK = {}
def book(name):
    if name not in _BOOK:
        raw = open(f"{D}/cache/openiti/{name}.txt", encoding="utf-8").read()
        raw = raw.split("#META#Header#End#", 1)[-1]
        raw = re.sub(r"\n~~", " ", raw); raw = re.sub(r"PageV\d+P\d+|ms\d+", " ", raw)
        _BOOK[name] = re.sub(r"\s+", " ", raw)
    return _BOOK[name]
def openiti_hits(name, v, n=3):
    """Passages that quote the verse (rare 3-word phrases of it), ranked by distinct verse phrases then reflection overlap;
    if the verse is never quoted, the passages of the whole book that best match the reflection."""
    txt = book(name); nt = norm(txt)
    vw = re.findall(r"[\u0621-\u064A]+", norm(v["verseShown"]))
    hits = {}
    for i in range(len(vw) - 2):
        ph = " ".join(vw[i:i + 3])
        if len(ph) < 10: continue
        ms = [m.start() for m in re.finditer(re.escape(ph), nt)]
        if 0 < len(ms) <= 15:
            for p in ms: hits.setdefault(p // 400, set()).add(ph)
    rw = set(words(v["insightAr"])) - set(words(v["verseShown"]))
    if hits:
        cand = [(len(ph), c) for c, ph in hits.items()]
    else:
        cand = [(0, c) for c in range(0, len(txt) // 400)]
    scored = []
    for nph, c in cand:
        w = txt[max(0, c * 400 - 200): c * 400 + 500]
        scored.append(((nph, len(rw & set(words(w)))), w))
    scored.sort(key=lambda x: (-x[0][0], -x[0][1])); out = []
    for sc, w in scored:
        if all(w[200:300] not in o for _, o in out): out.append((sc, w))
        if len(out) == n: break
    return [(f"{'verse' if hits else 'no-verse'} phrases={sc[0]} overlap={sc[1]}", w) for sc, w in out]
def cited_text(slug, r):
    """The commentary on the cited verse(s); if a cited verse has no text of its own (commented with a group),
    walk back to the verse that opens the group (at most 8 verses)."""
    txt = ""
    for a in range(r["fromAyah"], r["toAyah"] + 1):
        t = ayah_text(slug, r["surah"], a); b = a
        while len(re.sub(r"<[^>]+>", "", t).strip()) < 40 and b > 1 and a - b < 8:
            b -= 1; t = ayah_text(slug, r["surah"], b)
        if t and f"[{r['surah']}:{b}]" not in txt: txt += f" [{r['surah']}:{b}] " + t
    return txt
if __name__ == "__main__":
    for k in W[int(sys.argv[1]):int(sys.argv[2])]:
        v = items[k]; r = v["quranRef"] or {"surah": 1, "fromAyah": 1, "toAyah": 7}
        print(f"\n## {k} | {v['source']} | {v['verseRefShown']}\nREFL: {v['insightAr']}")
        if v["source"] in SLUG:
            slug = SLUG[v["source"]]
            txt = cited_text(slug, r)
            txt = re.sub(r"\[\[.*?\]\]", " ", txt, flags=re.S)
            print(f"  [opening] {re.sub(r'<[^>]+>', ' ', txt)[:160]}…")
            for s, w in best(txt, v["insightAr"], n=2, verse=v["verseShown"]): print(f"  ({s}) …{w}…")
            shown = 0
            for m in re.finditer(r"(وَ?قَوْلُهُ|وقوله|يَقُولُ تَعَالَى|يقول تعالى|أَيْ:|أي:|والمراد|وَالْمُرَادُ|يعني)", txt):
                seg = txt[m.start():m.start() + 200]
                if len(set(words(seg)) & (set(words(v["insightAr"])) - set(words(v["verseShown"])))) >= 2 and shown < 2:
                    print(f"  [gloss] {seg}…"); shown += 1
        else:
            for sc, w in openiti_hits(OPENITI[v["source"]], v, 2): print(f"  ({sc}) …{w}…")
