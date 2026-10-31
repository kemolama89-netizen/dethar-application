"""Batch 3 helper: align each hadith's shown Arabic with the cited records (hadith-api), list unmatched spans,
check the Companion in the chain, and collect the graders' grades on record. Output: batches/batch3-hadith-auto.json."""
import json, re, os, difflib, unicodedata
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = f"{D}/cache/hadith-api"
items = json.load(open(f"{D}/items-506.json"))
BOOKS = {"البخاري": "bukhari", "مسلم": "muslim", "الترمذي": "tirmidhi", "أبو داود": "abudawud", "ابن ماجه": "ibnmajah"}
SRC_BOOK = {"صحيح البخاري": "bukhari", "صحيح مسلم": "muslim", "سنن الترمذي": "tirmidhi", "جامع الترمذي": "tirmidhi", "سنن أبي داود": "abudawud", "سنن ابن ماجه": "ibnmajah"}
ED = {}
def edition(lang, book):
    if (lang, book) not in ED:
        ED[(lang, book)] = json.load(open(f"{C}/{lang}-{book}.json"))["hadiths"]
    return ED[(lang, book)]
def records(book, n):
    ara, eng = edition("ara", book), edition("eng", book)
    key = (lambda h: int(float(h["arabicnumber"]))) if book == "muslim" else (lambda h: int(float(h["hadithnumber"])))
    pick = lambda ed: [h for h in ed if h.get("arabicnumber" if book == "muslim" else "hadithnumber") not in (None, "") and key(h) == n]
    return pick(ara), pick(eng)
HON = r"(صلى الله عليه وسلم|صلي الله عليه وسلم|رضي الله عنهما|رضي الله عنها|رضي الله عنه|رضى الله عنهما|رضى الله عنها|رضى الله عنه|ﷺ|تعالى)"
def norm_words(s):
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"[ً-ٰٟـ‏‎]", "", s)
    for a, b in (("أ", "ا"), ("إ", "ا"), ("آ", "ا"), ("ٱ", "ا"), ("ى", "ي"), ("ة", "ه"), ("ؤ", "و"), ("ئ", "ي")): s = s.replace(a, b)
    s = re.sub(HON.translate(str.maketrans("أإآىة", "ااايه")), " ", s)
    s = re.sub(r"[^ء-ي0-9]+", " ", s)
    return s.split()
def cites(k, v):
    if v["kind"] == "hadith-library":
        ref = v["referenceAr"]; out = []
        for name, b in BOOKS.items():
            for m in re.finditer(name + r"\s+(\d+)", ref): out.append((b, int(m.group(1))))
        if not out and re.fullmatch(r"\d+", ref.strip()):
            src = v["sourceAr"].split("،")[0].split("/")[0].strip(); b = SRC_BOOK.get(src)
            if b: out.append((b, int(ref)))
        return out
    b, _, n = k.split(":", 1)[1].partition("-")
    out = [(b, int(n))] if b in BOOKS.values() else []
    for m in re.finditer(r"(مسلم|ابن ماجه)\s+(\d+)", v["referenceAr"].split("،", 1)[1] if "،" in v["referenceAr"] else ""):
        out.append((BOOKS[m.group(1)], int(m.group(2))))
    return out
_JK = None
def jk_muslim(n):
    """Paragraphs numbered n in the OpenITI transcription of Sahih Muslim (Abd al-Baqi edition, JK000109)."""
    global _JK
    if _JK is None:
        _JK = {}
        cur = None
        for l in open(f"{D}/cache/openiti/muslim-JK000109.txt", encoding="utf-8"):
            m = re.match(r"# (\d+) (.*)", l)
            if m: cur = int(m.group(1)); _JK.setdefault(cur, []).append(m.group(2))
            elif l.startswith("~~") and cur is not None: _JK[cur][-1] += " " + l[2:].strip()
            elif l.startswith("#"): cur = None
    return _JK.get(n, [])
JK_URL = "https://raw.githubusercontent.com/OpenITI/0275AH/master/data/0261Muslim/0261Muslim.Sahih/0261Muslim.Sahih.JK000109-ara1"
res = {}
for k, v in items.items():
    if not v["kind"].startswith("hadith"): continue
    app = norm_words(v["textAr"])
    r = {"cites": [], "narrator": v.get("narratorAr")}
    todo = []
    for b, n in cites(k, v):
        todo.append((b, n))
        if b == "muslim": todo.append(("muslim-JK", n))
    for b, n in todo:
        if b == "muslim-JK":
            ar = [{"text": t, "hadithnumber": n} for t in jk_muslim(n)]; en = []
        else:
            ar, en = records(b, n)
        src = norm_words(" ".join(h["text"] for h in ar))
        sm = difflib.SequenceMatcher(None, app, src, autojunk=False)
        matched = sum(bl.size for bl in sm.get_matching_blocks())
        gaps = []; last = 0
        for bl in sm.get_matching_blocks():
            if bl.a > last: gaps.append(" ".join(app[last:bl.a]))
            last = bl.a + bl.size
        blocks = [bl for bl in sm.get_matching_blocks() if bl.size]
        skipped = []
        for x, y in zip(blocks, blocks[1:]):
            if y.b - (x.b + x.size) >= 3: skipped.append(" ".join(src[x.b + x.size:y.b]))
        verdict = re.findall(r"قَالَ أَبُو عِيسَى[^.‏]*", " ".join(h["text"] for h in ar)) if b == "tirmidhi" else []
        nar = [w for w in norm_words(v.get("narratorAr") or "") if w not in ("بن", "ابن", "ابي", "ابو", "عبد", "الله")]
        r["cites"].append({"book": b, "n": n, "records": len(ar), "coverage": round(matched / max(1, len(app)), 3), "unmatched": gaps, "skippedInSource": skipped, "tirmidhiVerdict": verdict,
                           "narratorTokensInSource": {w: (w in src) for w in nar},
                           "grades": [g for h in en for g in h.get("grades", [])],
                           "srcText": " ".join(h["text"] for h in ar),
                           "url": JK_URL if b == "muslim-JK" else f"https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-{b}/{ar[0]['hadithnumber'] if ar else n}.json"})
    res[k] = r
json.dump(res, open(f"{D}/batches/batch3-hadith-auto.json", "w"), ensure_ascii=False, indent=1)
import collections
print("no cites:", [k for k, r in res.items() if not r["cites"]])
print("no records:", [(k, c["book"], c["n"]) for k, r in res.items() for c in r["cites"] if not c["records"]])
cov = collections.Counter(("full" if c["coverage"] >= .97 else "high" if c["coverage"] >= .85 else "low") for r in res.values() for c in r["cites"])
print(cov)
