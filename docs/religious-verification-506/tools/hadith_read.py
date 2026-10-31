"""Compact reading view for the hadiths triage did not clear: python3 hadith_read.py START END"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hadith_triage import real_skips  # noqa: E402  (re-runs triage; cheap)
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
a = json.load(open(f"{D}/batches/batch3-hadith-auto.json")); t = json.load(open(f"{D}/batches/batch3-triage.json")); items = json.load(open(f"{D}/items-506.json"))
todo = [k for k in a if not t[k]["anyClean"]][int(sys.argv[1]):int(sys.argv[2])]
for k in todo:
    v = items[k]; print(f"\n## {k} [{v.get('referenceAr')}] narr={v.get('narratorAr')}\nAPP: {v['textAr']}")
    best = {}
    for c in a[k]["cites"]:
        bk = c["book"].replace("-JK", "")
        if bk not in best or c["coverage"] > best[bk]["coverage"]: best[bk] = c
    for bk, c in best.items():
        print(f"  {c['book']} {c['n']} recs={c['records']} cov={c['coverage']} | unmatched: {' | '.join(c['unmatched'])} | cut: {' | '.join(x[:150] for x in real_skips(c))}")
