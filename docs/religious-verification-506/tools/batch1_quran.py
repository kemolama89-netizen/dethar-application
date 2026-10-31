"""Batch 1: every shown Qur'an verse vs Tanzil quran-simple; Saadi English vs Saheeh International (quran.com API, resource 20)."""
import json, re, sys, unicodedata, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch import fetch
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = json.load(open(f"{D}/items-506.json"))
T = {}
for l in open(f"{D}/cache/tanzil-simple.txt", encoding="utf-8"):
    if l.count("|") >= 2 and not l.startswith("#"):
        s, a, t = l.rstrip("\n").split("|", 2); T[(int(s), int(a))] = t
nfc = lambda s: re.sub(r"\s+", " ", unicodedata.normalize("NFC", s.replace("ـ", ""))).strip()
letters = lambda s: re.sub(r"[ً-ٰٟۖ-ۭ]", "", nfc(s))
TANZIL = "https://tanzil.net/#{s}:{a}"
out = {}
for k, v in items.items():
    if v["kind"] == "wamada":
        shown = nfc(v["verseShown"].replace("*", " "))
        r = v["quranRef"]
        if r: s, a, b = r["surah"], r["fromAyah"], r["toAyah"]
        else: s, a, b = 1, 1, 7  # no ayah number in the source: al-Fatihah as a whole
        cited = nfc(" ".join(T[(s, i)] for i in range(a, b + 1)))
        if r: ok = "exact" if shown == cited else ("letters-only" if letters(shown) == letters(cited) else "differs")
        else: ok = "exact-excerpt" if shown in cited else ("letters-only-excerpt" if letters(shown) in letters(cited) else "differs")
        out[k] = {"verse": ok, "ref": f"{s}:{a}" + (f"-{b}" if b != a else ""), "refShown": v["verseRefShown"], "url": TANZIL.format(s=s, a=a)}
    elif v["kind"] == "saadi":
        s, ay = v["surah"], v["ayahs"]
        cited = nfc(" ".join(T[(s, i)] for i in range(ay[0], ay[-1] + 1)))
        shown = nfc(v["verseAr"])
        if v["excerpt"]: ok = "exact-excerpt" if shown in cited and shown != cited else ("letters-only-excerpt" if letters(shown) in letters(cited) else "differs")
        else: ok = "exact" if shown == cited else ("letters-only" if letters(shown) == letters(cited) else "differs")
        # English: Saheeh International via quran.com
        si = []
        for i in range(ay[0], ay[-1] + 1):
            u = f"https://api.quran.com/api/v4/quran/translations/20?verse_key={s}:{i}"
            si.append(json.loads(fetch(u))["translations"][0]["text"])
        out[k] = {"verse": ok, "ref": f"{s}:{ay[0]}" + (f"-{ay[-1]}" if len(ay) > 1 else ""), "refShown": v["verseRefAr"], "url": TANZIL.format(s=s, a=ay[0]),
                  "siOfficial": " ".join(si), "enShown": v["verseEn"], "enUrl": f"https://quran.com/{s}/{ay[0]}" + (f"-{ay[-1]}" if len(ay) > 1 else "")}
json.dump(out, open(f"{D}/batches/batch1-quran.json", "w"), ensure_ascii=False, indent=1)
import collections; print(collections.Counter(x["verse"] for x in out.values()))
for k, x in out.items():
    if x["verse"] not in ("exact", "exact-excerpt"): print(k, x)
