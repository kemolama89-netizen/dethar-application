"""Prints the batch-3 alignment for a slice of hadith items: python3 hadith_view.py START END"""
import json, os, sys
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a = json.load(open(f"{D}/batches/batch3-hadith-auto.json")); items = json.load(open(f"{D}/items-506.json"))
keys = list(a)[int(sys.argv[1]):int(sys.argv[2])]
for k in keys:
    v = items[k]
    print(f"\n### {k} | {v.get('referenceAr')} | {v.get('gradeAr')} | {v.get('gradingSourceAr')} | narr: {v.get('narratorAr')}")
    print("APP:", v["textAr"])
    for c in a[k]["cites"]:
        g = "; ".join(f"{x['name']}: {x['grade']}" for x in c["grades"])
        print(f"  [{c['book']} {c['n']}] recs={c['records']} cov={c['coverage']} narr={c['narratorTokensInSource']} grades=[{g}]")
        if c["unmatched"]: print("     unmatched:", " | ".join(c["unmatched"]))
        if c.get("skippedInSource"): print("     SKIPPED in source:", " | ".join(x[:120] for x in c["skippedInSource"]))
        if c.get("tirmidhiVerdict"): print("     Tirmidhi:", " | ".join(c["tirmidhiVerdict"]))
