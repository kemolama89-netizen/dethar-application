"""Batch 2: each Saadi Latifa's tafsir excerpt vs Tafsir al-Sa'di at the cited verse, in three digital witnesses."""
import json, re, os, sys, unicodedata, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from fetch import fetch
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = json.load(open(f"{D}/items-506.json"))
def norm(s):  # letters only: no vowels, punctuation, tatweel or spacing differences; unify alif/ya/ta forms
    s = unicodedata.normalize("NFC", html.unescape(re.sub(r"<[^>]+>", " ", s)))
    s = re.sub(r"[ً-ٰٟـ]", "", s)
    s = s.replace("ٱ", "ا").replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ى", "ي").replace("ة", "ه").replace("اللّه", "الله")
    return re.sub(r"[^ء-ي]+", "", s)
W = {
 "quran.com tafsir 91": lambda s, a: (f"https://api.quran.com/api/v4/tafsirs/91/by_ayah/{s}:{a}", lambda t: json.loads(t)["tafsir"]["text"]),
 "tafsir_api ar-tafsir-as-saadi": lambda s, a: (f"https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-as-saadi/{s}/{a}.json", lambda t: json.loads(t)["text"]),
 "tafsir_api ar-tafseer-al-saddi": lambda s, a: (f"https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/{s}/{a}.json", lambda t: json.loads(t)["text"]),
}
out = {}
for k, v in items.items():
    if v["kind"] != "saadi": continue
    s, a = map(int, v["tafsirRef"].split(":"))
    ex = norm(v["tafsirAr"]); r = {}
    for name, f in W.items():
        url, get = f(s, a)
        try:
            txt = norm(get(fetch(url)))
            # al-Sa'di often comments on a group of verses under its first verse: also try the neighbours.
            hit = ex in txt
            r[name] = {"url": url, "verbatim": hit, "len": len(txt)}
        except Exception as e:
            r[name] = {"url": url, "error": str(e)}
    out[k] = {"ref": v["tafsirRef"], "witnesses": r}
    print(k, v["tafsirRef"], {n: (x.get("verbatim"), x.get("len"), x.get("error")) for n, x in r.items()})
json.dump(out, open(f"{D}/batches/batch2-saadi.json", "w"), ensure_ascii=False, indent=1)
