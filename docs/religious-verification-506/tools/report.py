"""Writes REPORT.md and report.csv from progress.json + items-506.json."""
import json, os, csv, collections, re
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = json.load(open(f"{D}/progress.json")); it = json.load(open(f"{D}/items-506.json"))
CAT = {"hadith-library": "Hadith", "hadith-enriched": "Hadith", "hadith-startup": "Hadith", "wamada": "Wamadat", "saadi": "Saadi Lataif"}
ORDER = ["Verified", "Needs Correction", "Unverified", "Rejected"]
def label(k):
    v = it[k]
    if v["kind"] == "wamada": return f"Wamada {v['id']} — {v['verseRefShown']}"
    if v["kind"] == "saadi": return f"Saadi {v['id']} — {v['verseRefAr']}"
    return f"{k.split(':',1)[1]} — {v.get('referenceAr','')}"
def keyorder(k):
    v = it[k]; c = CAT[v["kind"]]
    return (["Hadith", "Wamadat", "Saadi Lataif"].index(c), v["id"] if v["kind"] == "wamada" else 0, str(k))
keys = sorted(p, key=keyorder)
cnt = collections.Counter((CAT[it[k]["kind"]], p[k]["status"]) for k in keys)
L = []
L.append("# DITHAR — strict verification of the 506 Approved items\n")
L.append("Date: 2026-10-31. The verification itself was read-only; the 34 items it flagged were then corrected from their cited sources and rechecked (see «Corrections applied»). Method, rules and access notes: [README.md](README.md). Machine-readable: [report.csv](report.csv), [progress.json](progress.json).\n")
L.append("## Summary\n")
L.append("| Category | " + " | ".join(ORDER) + " | Total |"); L.append("|---|" + "---|" * (len(ORDER) + 1))
for c in ["Hadith", "Wamadat", "Saadi Lataif"]:
    row = [cnt[(c, s)] for s in ORDER]; L.append(f"| {c} | " + " | ".join(map(str, row)) + f" | {sum(row)} |")
tot = [sum(cnt[(c, s)] for c in ["Hadith", "Wamadat", "Saadi Lataif"]) for s in ORDER]
L.append("| **All** | " + " | ".join(f"**{x}**" for x in tot) + f" | **{sum(tot)}** |\n")
L.append("## Sources opened\n")
L.append("- Qur'an: Tanzil `quran-simple` (tanzil.net). Saheeh International: quran.com API (resource 20).")
L.append("- Hadith: fawazahmed0/hadith-api (Arabic and English editions with graders' grades); OpenITI transcriptions of printed editions: Sahih Muslim (Abd al-Baqi), al-Mustadrak (Ata, DKI), al-Adab al-Mufrad (Abd al-Baqi), Ibn Hajar's al-Talkhis al-Habir, al-Iraqi's al-Mughni.")
L.append("- Tafsir: spa5k/tafsir_api per-verse texts of Ibn Kathir, al-Tabari, al-Kashshaf, Ibn Ashur, al-Bahr al-Muhit, al-Sa'di; OpenITI transcriptions of al-Raghib's Mufradat (Kilani) and Ibn al-Qayyim's Madarij, Tariq al-Hijratayn, Ighatha (al-Fiqi), al-Fawa'id, Bada'i al-Fawa'id, Zad al-Ma'ad (al-Arna'ut); al-Sa'di also via quran.com tafsir 91 and OpenITI (altafsir.com).")
L.append("\n**Access limits.** sunnah.com and dorar.net refuse automated requests (HTTP 403) and were not used. No printed edition of Tafsir al-Sa'di was available (three independent digital texts agree). Grading credits that point to works not openable here (al-Albani's Sahih al-Jami' and al-Silsila, al-Albani's Sahih al-Adab al-Mufrad, al-Mundhiri, al-Arna'ut on al-Adab al-Mufrad) could not be confirmed; where a credit depends on them the item is Needs Correction (see README). The English of Wamadat and of most enriched hadiths is not shown in the app and was not assessed.\n")
corr = [k for k in keys if p[k].get("correction")]
if corr:
    L.append("## Corrections applied (2026-10-31)\n")
    L.append(f"{len(corr)} items were corrected, each from its cited source, and rechecked independently (tools/recheck34.py, batches/recheck-34.json). Backup taken before editing: backups/corrections-34-20261031T111550Z/.\n")
    for k in corr:
        c = p[k]["correction"]; L.append(f"### {label(k)} — fixed: {', '.join(c['fixed_checks'])}")
        for f, ba in c["changes"].items():
            L.append(f"- `{f}` before: {ba['before']}"); L.append(f"- `{f}` after: {ba['after']}")
        L.append(f"- Recheck: {c['recheck']}\n")
L.append("## Items needing correction\n")
if all(p[k]["status"] == "Verified" for k in keys): L.append("None — all 506 items are Verified.\n")
for k in keys:
    r = p[k]
    if r["status"] == "Verified": continue
    L.append(f"### {label(k)} — **{r['status']}**")
    L.append(f"`{k}`. {r['reason']}\n")
    for n, c in r["checks"].items():
        if c["result"] == "fail":
            L.append(f"- **{n}**: {c['evidence']}" + (f" ({' · '.join(c['urls'][:3])})" if c["urls"] else ""))
    L.append("")
L.append("## All 506 items\n")
L.append("Each row: status, then every check with its result and evidence; links are the opened sources.\n")
cur = None
for k in keys:
    c = CAT[it[k]["kind"]]
    if c != cur: L.append(f"\n### {c}\n"); cur = c
    r = p[k]
    L.append(f"**{label(k)}** (`{k}`) — **{r['status']}**")
    for n, ch in r["checks"].items():
        if ch["result"] == "not-shown": continue
        mark = {"pass": "✓", "fail": "✗"}.get(ch["result"], ch["result"])
        L.append(f"- {mark} {n}: {ch['evidence']}" + (f" — {' · '.join(ch['urls'][:3])}" if ch["urls"] else ""))
    L.append("")
open(f"{D}/REPORT.md", "w").write("\n".join(L))
with open(f"{D}/report.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["key", "category", "label", "status", "reason", "failed_checks", "evidence", "source_urls"])
    for k in keys:
        r = p[k]
        w.writerow([k, CAT[it[k]["kind"]], label(k), r["status"], r["reason"], ";".join(n for n, c in r["checks"].items() if c["result"] == "fail"),
                    " || ".join(f"{n}: {c['evidence']}" for n, c in r["checks"].items() if c["result"] != "not-shown"),
                    " ".join(u for c in r["checks"].values() for u in c["urls"])])
print("REPORT.md", os.path.getsize(f"{D}/REPORT.md"), "bytes; report.csv rows", len(keys))
