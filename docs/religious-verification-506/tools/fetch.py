"""Cached fetch through curl (plain request; sites that refuse it are recorded as inaccessible, never bypassed)."""
import hashlib, os, subprocess, time
CACHE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache", "http")
os.makedirs(CACHE, exist_ok=True)
def fetch(url, retries=3):
    p = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest())
    if os.path.exists(p): return open(p, encoding="utf-8").read()
    for i in range(retries):
        r = subprocess.run(["curl", "-s", "-L", "-m", "60", "-w", "\n%{http_code}", url], capture_output=True, text=True)
        body, _, code = r.stdout.rpartition("\n")
        if code == "200":
            open(p, "w", encoding="utf-8").write(body); return body
        time.sleep(1 + i)
    raise RuntimeError(f"HTTP {code} for {url}")
