"""progress.json: one record per item — checks done so far, final status once decided."""
import json, os
P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "progress.json")
def load():
    return json.load(open(P)) if os.path.exists(P) else {}
def save(p):
    tmp = P + ".tmp"; json.dump(p, open(tmp, "w"), ensure_ascii=False, indent=1); os.replace(tmp, P)
def check(p, k, name, result, evidence, urls=()):
    r = p.setdefault(k, {"checks": {}, "status": None})
    r["checks"][name] = {"result": result, "evidence": evidence, "urls": list(urls)}
def decide(p, k, status, reason):
    assert status in ("Verified", "Needs Correction", "Unverified", "Rejected")
    p[k]["status"] = status; p[k]["reason"] = reason
