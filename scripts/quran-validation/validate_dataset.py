# Validates the bundled Qur'an text against fresh official Tanzil downloads.
# Usage (repo root): python3 -I scripts/quran-validation/validate_dataset.py . <tanzil-uthmani.txt> <tanzil-uthmani.xml> <quran-data.js> <out.json>
# Downloads: https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true (and outType=xml),
#            https://tanzil.net/res/text/metadata/quran-data.js
# DITHAR Qur'an dataset validation (run with python3 -I). Reads files only; writes JSON results.
import sys, re, json, hashlib, unicodedata, collections, xml.etree.ElementTree as ET
APP, FRESH_TXT, FRESH_XML, FRESH_META, OUT = sys.argv[1:6]
R = {"checks": [], "discrepancies": []}
def check(name, ok, detail=""):
    R["checks"].append({"check": name, "ok": bool(ok), "detail": detail})
    if not ok: R["discrepancies"].append({"check": name, "detail": detail})
raw = open(f"{APP}/src/data/quran/tanzil-quran-uthmani.txt", "rb").read()
meta_raw = open(f"{APP}/src/data/quran/tanzil-quran-metadata.txt", "rb").read()
fresh = open(FRESH_TXT, "rb").read(); fresh_meta = open(FRESH_META, "rb").read()
sha = lambda b: hashlib.sha256(b).hexdigest()
check("App text file is byte-identical to a fresh official Tanzil download (Uthmani, txt with aya numbers)", raw == fresh, f"app {sha(raw)} / fresh {sha(fresh)}, {len(raw)} bytes")
check("App metadata file is byte-identical to Tanzil's quran-data.js", meta_raw == fresh_meta, f"{sha(meta_raw)}")
check("SHA-256 equals the hash recorded in src/data/quran/README.md", sha(raw) == "bf4f57b968d03f4131c070b1e285da9be0e0a108a21c910e872801ca273312c8" and sha(meta_raw) == "9e9930c592aaa34b5c7a79ff4e99ffdc782263a266090bfe2c49e4ed4bac4ca4")
# encoding / structure
try: text = raw.decode("utf-8"); utf8 = True
except UnicodeDecodeError as e: utf8 = False; text = raw.decode("utf-8", "replace")
check("Valid UTF-8, no BOM", utf8 and not raw.startswith(b"\xef\xbb\xbf"))
check("Unix line endings only (no CR)", b"\r" not in raw)
lines = text.split("\n")
verse_lines = [l for l in lines if l and not l.startswith("#")]
other = [l for l in lines if l and l.startswith("#")]
blank = sum(1 for l in lines if l == "")
check("Only verse lines, the '#' copyright block, and blank lines", all(re.fullmatch(r"\d+\|\d+\|.+", l) for l in verse_lines), f"{len(verse_lines)} verse lines, {len(other)} notice lines, {blank} blank")
V = collections.OrderedDict(); order_ok = True; prev = (1, 0)
for l in verse_lines:
    s, a, t = l.split("|", 2); s, a = int(s), int(a)
    if not ((s == prev[0] and a == prev[1] + 1) or (s == prev[0] + 1 and a == 1)): order_ok = False; R["discrepancies"].append({"check": "order", "detail": f"{s}:{a} after {prev}"})
    if (s, a) in V: R["discrepancies"].append({"check": "duplicate key", "detail": f"{s}:{a}"})
    V[(s, a)] = t; prev = (s, a)
check("Total verses = 6,236", len(V) == 6236, str(len(V)))
check("114 surahs, numbered 1-114", sorted({s for s, _ in V}) == list(range(1, 115)))
check("Verse order: every verse follows the previous (no gap, no repeat, no reordering)", order_ok)
check("No verse key appears twice", len(V) == len(verse_lines))
# metadata
m = meta_raw.decode()
sura_rows = re.findall(r"\[(\d+), (\d+), (\d+), (\d+), '([^']*)', \"([^\"]*)\", '([^']*)', '(Meccan|Medinan)'\]", re.search(r"QuranData\.Sura = \[([\s\S]*?)\];", m).group(1))
counts = collections.Counter(s for s, _ in V)
cnt_mis = [(i + 1, int(r[1]), counts[i + 1]) for i, r in enumerate(sura_rows) if int(r[1]) != counts[i + 1]]
check("Each surah's verse count equals Tanzil metadata (all 114)", len(sura_rows) == 114 and not cnt_mis, str(cnt_mis))
starts_ok = all(int(r[0]) == sum(counts[j] for j in range(1, i + 1)) for i, r in enumerate(sura_rows))
check("Metadata surah start offsets are consistent with the counts", starts_ok)
app_surahs = re.findall(r'\{ number: (\d+), nameAr: "([^"]+)", ayahCount: (\d+) \}', open(f"{APP}/src/data/quranSurahs.ts", encoding="utf-8").read())
check("App surah table (src/data/quranSurahs.ts): 114 entries, numbers 1-114 in order", [int(n) for n, _, _ in app_surahs] == list(range(1, 115)))
app_cnt_mis = [(int(n), int(c), counts[int(n)]) for n, _, c in app_surahs if int(c) != counts[int(n)]]
check("App surah table verse counts equal the text (all 114)", not app_cnt_mis, str(app_cnt_mis))
def norm_name(x): return re.sub(r"[ً-ٰٟـ]", "", x).replace("ٱ", "ا").replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").strip()
name_diff = [(i + 1, a[1], r[4]) for i, (a, r) in enumerate(zip(app_surahs, sura_rows)) if norm_name(a[1]) != norm_name(r[4])]
R["names"] = [{"surah": i + 1, "app": a[1], "tanzil": r[4], "tanzil_translit": r[5]} for i, (a, r) in enumerate(zip(app_surahs, sura_rows))]
R["name_spelling_differences"] = name_diff
check("Surah names: the app's Arabic names match Tanzil's (ignoring hamza/alef forms and tashkeel)", not name_diff, f"{len(name_diff)} differ in spelling: {name_diff}")
# XML second channel
root = ET.parse(FRESH_XML).getroot()
xmlv = {(int(su.get("index")), int(ay.get("index"))): (ay.get("bismillah"), ay.get("text")) for su in root.iter("sura") for ay in su.iter("aya")}
x_names = [su.get("name") for su in root.iter("sura")]
def xml_full(k):
    b, t = xmlv[k]
    return (b + " " + t) if b else t
xml_mis = [f"{s}:{a}" for (s, a) in V if (s, a) not in xmlv or xml_full((s, a)) != V[(s, a)]]
check("Every verse equals Tanzil's separately downloaded XML edition (basmala attribute + text)", len(xmlv) == 6236 and not xml_mis, f"{len(xml_mis)} mismatches {xml_mis[:10]}")
check("Surah names in Tanzil XML equal the metadata names", x_names == [r[4] for r in sura_rows])
# per-verse content
ARABIC = lambda c: "؀" <= c <= "ۿ" or "ݐ" <= c <= "ݿ" or "ࢠ" <= c <= "ࣿ" or "ﭐ" <= c <= "﷿" or "ﹰ" <= c <= "﻿"
inv = collections.Counter(c for t in V.values() for c in t)
non_ar = {c: n for c, n in inv.items() if not (ARABIC(c) or c == " ")}
check("Only Arabic-script characters and single spaces in verse text", not non_ar, str({hex(ord(c)): n for c, n in non_ar.items()}))
digits = [f"{s}:{a}" for (s, a), t in V.items() if re.search(r"[0-9٠-٩۰-۹]", t)]
check("No digits inside verse text (verse numbers are added by the app, not stored in the text)", not digits, str(digits[:10]))
empties = [f"{s}:{a}" for (s, a), t in V.items() if not t.strip()]
check("No empty verse", not empties, str(empties))
ws = [f"{s}:{a}" for (s, a), t in V.items() if t != t.strip() or "  " in t or "\t" in t]
check("No leading/trailing/double spaces or tabs", not ws, str(ws[:10]))
ctrl = [f"{s}:{a}" for (s, a), t in V.items() if any(unicodedata.category(c) in ("Cc", "Cf", "Co", "Cn") or c == "�" for c in t)]
check("No control, format, private-use, unassigned or replacement characters", not ctrl, str(ctrl[:10]))
mark_start = [f"{s}:{a} word {i+1}" for (s, a), t in V.items() for i, w in enumerate(t.split(" ")) if w and unicodedata.combining(w[0])]
check("No word begins with a detached diacritic (combining mark)", not mark_start, str(mark_start[:10]))
pipe = [f"{s}:{a}" for (s, a), t in V.items() if "|" in t]
check("No field separator inside verse text (parsing safety)", not pipe)
dup_marks = collections.Counter()
for (s, a), t in V.items():
    for m_ in re.finditer(r"([ً-ٰٟۖ-ۭ])\1", t): dup_marks[(f"{s}:{a}", hex(ord(m_.group(1))))] += 1
R["doubled_mark_sequences"] = [f"{k[0]} {k[1]}" for k in dup_marks]
check("No identical diacritic repeated twice in a row", not dup_marks, f"{len(dup_marks)} found: {R['doubled_mark_sequences'][:15]}")
nfc = sum(1 for t in V.values() if unicodedata.normalize("NFC", t) != t)
R["not_nfc_verses"] = nfc
# repeated verses (expected in the Qur'an)
rep = collections.defaultdict(list)
for k, t in V.items(): rep[t].append(f"{k[0]}:{k[1]}")
repeated = {t: ks for t, ks in rep.items() if len(ks) > 1 and t not in ("",)}
consec = [(ks[i], ks[i+1]) for ks in repeated.values() for i in range(len(ks)-1) if ks[i].split(":")[0] == ks[i+1].split(":")[0] and int(ks[i+1].split(":")[1]) == int(ks[i].split(":")[1]) + 1]
R["repeated_verse_texts"] = [{"verses": ks, "chars": len(t)} for t, ks in sorted(repeated.items(), key=lambda x: -len(x[1]))]
R["consecutive_identical_verses"] = consec
# basmala
B = V[(1, 1)]; nosh = lambda x: x.replace("ّ", "")
bas = [s for s in range(2, 115) if s != 9 and nosh(" ".join(V[(s, 1)].split(" ")[:4])) == nosh(B)]
check("Basmala opens verse 1 of all 112 surahs except al-Fatihah (where it is verse 1) and at-Tawbah", len(bas) == 112 and not nosh(V[(9, 1)]).startswith(nosh(B)), f"{len(bas)} surahs")
check("27:30 contains the basmala within the verse", nosh(B) in nosh(V[(27, 30)]))
# special marks
hizb = [f"{s}:{a}" for (s, a), t in V.items() if "۞" in t]
sajda_txt = [f"{s}:{a}" for (s, a), t in V.items() if "۩" in t]
sajda_meta = [f"{s}:{a}" for s, a in re.findall(r"\[(\d+), (\d+), '(?:recommended|obligatory)'\]", m)]
R["rub_el_hizb_marks"] = hizb; R["sajda_marks_in_text"] = sajda_txt; R["sajda_in_metadata"] = sajda_meta
R["info"] = [f"Optional signs: the text has {len(sajda_txt)} sajda signs (U+06E9) and {len(hizb)} rub el-hizb signs (U+06DE). Tanzil's download leaves these optional signs out by default; the 15 sajda verses are listed in the metadata instead ({', '.join(sajda_meta)})."]
R["character_inventory"] = [{"char": c, "code": f"U+{ord(c):04X}", "name": unicodedata.name(c, "?"), "count": n} for c, n in sorted(inv.items(), key=lambda x: ord(x[0]))]
R["summary"] = {"verses": len(V), "surahs": len({s for s, _ in V}), "words": sum(len(t.split(" ")) for t in V.values()), "characters": sum(len(t) for t in V.values()), "distinct_characters": len(inv), "repeated_texts": len(repeated), "verses_not_in_NFC": nfc}
json.dump(R, open(OUT, "w"), ensure_ascii=False, indent=1)
print(json.dumps(R["summary"], ensure_ascii=False))
for c in R["checks"]: print(("PASS " if c["ok"] else "FAIL ") + c["check"] + (f"  [{c['detail'][:160]}]" if c["detail"] else ""))
print("discrepancies:", len(R["discrepancies"]))
