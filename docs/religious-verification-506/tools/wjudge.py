"""Records Wamada reflection judgments: wjudge.py '<json: key -> [result, evidence]>'.
result: verified | adds-claim | rejected | unverified."""
import json, os, sys
P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "batches", "batch4-wamada-judgments.json")
j = json.load(open(P)) if os.path.exists(P) else {}
for k, (res, ev) in json.loads(sys.stdin.read() if sys.argv[1:] == ["-"] else sys.argv[1]).items():
    assert res in ("verified", "adds-claim", "rejected", "unverified"), res
    j[k] = {"result": res, "evidence": ev}
json.dump(j, open(P, "w"), ensure_ascii=False, indent=1); print(len(j), "Wamadat judged")
