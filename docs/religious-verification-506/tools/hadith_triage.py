"""Splits batch-3 hadiths into 'clean' (every unmatched word is framing, nothing cut inside the quote in the best witness)
and 'read' (needs reading). Writes batches/batch3-triage.json."""
import json, os, re
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a = json.load(open(f"{D}/batches/batch3-hadith-auto.json")); items = json.load(open(f"{D}/items-506.json"))
FRAME = set("عن ان النبي رسول الله قال قالت سمعت يقول بن ابن رضي عنه عنها عنهما قل".split())
def frame_only(spans, narr):
    ws = [w for s in spans for w in s.split()]
    return all(w in FRAME or w in narr for w in ws)
def real_skips(c):
    return [s for s in c.get("skippedInSource", []) if not re.search(r"حدثنا|اخبرنا|حدثني|اخبرني|انبانا", s) and not set(s.split()) <= FRAME | {"صلي", "وسلم", "عليه"}]
out = {}
for k, r in a.items():
    narr = set(re.sub(r"[^ء-ي ]", " ", (items[k].get("narratorAr") or "").replace("أ", "ا").replace("ة", "ه").replace("ى", "ي").replace("ئ", "ي")).split())
    narr |= {w[2:] for w in narr if w.startswith("ال")} | {"عبدالله", "عبد", "الله"}
    best = {}
    for c in r["cites"]:
        bk = c["book"].replace("-JK", "")
        if bk not in best or c["coverage"] > best[bk]["coverage"]: best[bk] = c
    clean = {bk: (c["records"] > 0 and frame_only(c["unmatched"], narr) and not real_skips(c)) for bk, c in best.items()}
    out[k] = {"clean": clean, "allClean": bool(clean) and all(clean.values()), "anyClean": any(clean.values())}
if __name__ == "__main__":
    json.dump(out, open(f"{D}/batches/batch3-triage.json", "w"), ensure_ascii=False, indent=1)
    print("all cited records clean:", sum(x["allClean"] for x in out.values()), "| some clean:", sum(x["anyClean"] and not x["allClean"] for x in out.values()), "| none clean:", sum(not x["anyClean"] for x in out.values()))
