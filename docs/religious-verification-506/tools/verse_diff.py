"""Word-level diff of a shown verse against Tanzil, for the letters-only cases of batch 1."""
import json, re, unicodedata, difflib, os, sys
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = json.load(open(f"{D}/items-506.json")); b1 = json.load(open(f"{D}/batches/batch1-quran.json"))
T = {}
for l in open(f"{D}/cache/tanzil-simple.txt", encoding="utf-8"):
    if l.count("|") >= 2 and not l.startswith("#"):
        s, a, t = l.rstrip("\n").split("|", 2); T[(int(s), int(a))] = t
nfc = lambda s: re.sub(r"\s+", " ", unicodedata.normalize("NFC", s.replace("ـ", ""))).strip()
res = {}
for k, x in b1.items():
    if x["verse"] in ("exact", "exact-excerpt"): continue
    v = items[k]; shown = nfc((v.get("verseShown") or v.get("verseAr")).replace("*", " "))
    s, r = x["ref"].split(":"); a, _, b = r.partition("-"); s, a, b = int(s), int(a), int(b or a)
    cited = nfc(" ".join(T[(s, i)] for i in range(a, b + 1)))
    sw, cw = shown.split(), cited.split()
    sm = difflib.SequenceMatcher(None, sw, cw, autojunk=False)
    diffs = [(" ".join(sw[i1:i2]), " ".join(cw[j1:j2])) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal"]
    if x["verse"].endswith("excerpt"):  # trim leading/trailing material the excerpt leaves out
        diffs = [d for d in diffs if d[0]]
    res[k] = diffs
    marks = lambda w: " ".join(f"U+{ord(c):04X}" for c in w if unicodedata.combining(c) or ord(c) in (0x0670,))
    print(k, " | ".join(f"«{a}» → Tanzil «{b}»" for a, b in diffs))
json.dump(res, open(f"{D}/batches/batch1-verse-diffs.json", "w"), ensure_ascii=False, indent=1)
