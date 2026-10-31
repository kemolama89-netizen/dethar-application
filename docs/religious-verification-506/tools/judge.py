"""Manual wording judgments for batch 3, saved incrementally: judge.py '<json dict of key -> [result, note]>'"""
import json, os, sys
P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "batches", "batch3-wording-judgments.json")
j = json.load(open(P)) if os.path.exists(P) else {}
for k, (res, note) in json.loads(sys.argv[1]).items():
    assert res in ("pass", "pass-excerpt", "fail", "unverified"), res
    j[k] = {"result": res, "note": note}
json.dump(j, open(P, "w"), ensure_ascii=False, indent=1); print(len(j), "judged")
