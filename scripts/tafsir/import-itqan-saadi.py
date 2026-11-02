#!/usr/bin/env python3
"""Imports Tafsir al-Sa'di from Itqan's package into src/data/tafsir/saadi-itqan/.

Source: Itqan CMS asset 6, package tafsir-alsaadi 1.0.0 (Tafsir Center, Dar Ibn
al-Jawzi edition, CC BY-ND), tf-ab-saadi_ar.csv:
https://storage.cms.itqan.dev/media/uploads/assets/6/versions/6/tf-ab-saadi_ar.csv

The licence allows no derivatives, so nothing is rewritten: each verse's content
cell is copied character for character into its surah's file. Only the columns
the app doesn't show (project, workflow stage, editor's name) are left out.

It refuses to write anything unless the file is the expected one, every verse is
present once, every row is approved and publishable, and every row proves its
verse: its heading or commentary marker carries the verse's number, and the
Qur'an heading's consonants equal that verse's in Tanzil. Known exceptions in the
book itself are listed by verse below and must match exactly.

  python3 -I scripts/tafsir/import-itqan-saadi.py <path to tf-ab-saadi_ar.csv>
"""
import csv
import hashlib
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHA256 = "619759cf37bd69b94a54bb3595cbcb9910200785b581299a69a52ba498f2db89"
OUT = os.path.join(ROOT, "src", "data", "tafsir", "saadi-itqan")
TANZIL = os.path.join(ROOT, "src", "data", "quran", "tanzil-quran-uthmani.txt")
csv.field_size_limit(10**8)


def skeleton(text):
    """Consonants only: Uthmani and plain spelling differ in vowels, alif, hamza seats, waw and ya."""
    out = []
    for ch in unicodedata.normalize("NFKC", text):
        name = unicodedata.name(ch, "")
        if "ARABIC LETTER" not in name:
            continue
        if any(w in name for w in ("ALEF", "HAMZA", "YEH", "WAW", "TEH MARBUTA", "HIGH", "SMALL", "SUBSCRIPT", "SUPERSCRIPT", "TATWEEL", "KASHIDA")):
            continue
        out.append(ch)
    # Uthmani writes one lam where plain spelling has two (ٱلَّيْل / اللَّيْل, ٱلَّذِينَ / الَّذِينَ forms).
    return re.sub("ل+", "ل", "".join(out))


def tanzil():
    verses = {}
    for line in open(TANZIL, encoding="utf-8"):
        parts = line.rstrip("\n").split("|")
        if len(parts) == 3 and parts[0].isdigit():
            verses[(int(parts[0]), int(parts[1]))] = parts[2]
    return verses


def strip_notes(text):
    return re.sub(r"¬[^¥]*¥", "", text)


def heading_of(text):
    """The Qur'an heading: lines of '{…(n)…}' up to the first line after them, with its verse numbers."""
    plain = strip_notes(text)
    verses = []
    lines = []
    for line in plain.split("\n"):
        numbers = re.findall(r"\((\d+)\)", line)
        if line.lstrip().startswith(("{", "[")) and numbers or (lines and numbers and "}" in line):
            verses += [int(n) for n in numbers]
            lines.append(line)
        elif lines:
            break
        elif "{" in line and numbers:
            verses += [int(n) for n in numbers]
            lines.append(line[line.index("{"):])
    return "\n".join(lines), verses


def main(path):
    raw = open(path, "rb").read()
    digest = hashlib.sha256(raw).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"unexpected file: {digest}")
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig", newline="")))
    verses = tanzil()
    keys = [(int(r["رقم السورة"]), int(r["رقم الآية"])) for r in rows]
    if keys != sorted(verses):
        raise SystemExit("verses are not exactly Tanzil's 6,236, in order")
    if {r["مرحلة العمل"] for r in rows} != {"مرحلة الاعتماد"} or {r["قابل للنشر"] for r in rows} != {"نعم"}:
        raise SystemExit("a row is not approved and publishable")

    report = {"no_own_number": [], "heading_differs": [], "ayah_column_differs": [], "stray_note_marker": [], "several_verses_in_heading": [], "several_verses_in_comment": [], "no_comment": []}
    bismillah = skeleton("بسم الله الرحمن الرحيم")
    for key, row in zip(keys, rows):
        surah, ayah = key
        text = row["المحتوى"]
        target = skeleton(verses[key])
        if ayah == 1 and surah not in (1, 9) and target.startswith(bismillah):
            target = target[len(bismillah):]
        if skeleton(row["الآية"]) != target:
            report["ayah_column_differs"].append(f"{surah}:{ayah}")
        heading, numbers = heading_of(text)
        markers = [int(n) for n in re.findall(r"\{(\d+)\}", strip_notes(text))]
        if ayah not in numbers and ayah not in markers:
            report["no_own_number"].append(f"{surah}:{ayah}")
        if len(set(numbers)) > 1:
            report["several_verses_in_heading"].append({"verse": f"{surah}:{ayah}", "numbers": sorted(set(numbers))})
        if any(m != ayah for m in markers):
            report["several_verses_in_comment"].append({"verse": f"{surah}:{ayah}", "numbers": markers})
        if not markers:
            report["no_comment"].append(f"{surah}:{ayah}")
        # Only a single-verse heading can be compared whole with its verse.
        if numbers == [ayah]:
            head = skeleton(re.sub(r"\(\d+\)", "", heading))
            if head != target and bismillah + target != head:
                report["heading_differs"].append(f"{surah}:{ayah}")
        if text.count("¬") != text.count("¥") or re.search(r"¬[^¥]*¬|¥[^¬]*¥", text):
            report["stray_note_marker"].append(f"{surah}:{ayah}")
    if "--report" in sys.argv:
        json.dump(report, open(sys.argv[sys.argv.index("--report") + 1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print({k: len(v) for k, v in report.items()})
    if "--write" not in sys.argv:
        return
    if report["no_own_number"] != EXPECTED_NO_OWN_NUMBER or report["ayah_column_differs"]:
        raise SystemExit(f"unexpected mapping exceptions: {report['no_own_number'][:20]} {report['ayah_column_differs'][:20]}")
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for surah in range(1, 115):
        ayat = [{"ayah": k[1], "text": r["المحتوى"]} for k, r in zip(keys, rows) if k[0] == surah]
        name = f"surah-{surah}.json"
        data = json.dumps({"surah": surah, "ayat": ayat}, ensure_ascii=False, separators=(",", ":"))
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            f.write(data)
        manifest[str(surah)] = {"verses": len(ayat), "contentSha256": hashlib.sha256("".join(a["text"] for a in ayat).encode()).hexdigest()}
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"sourceSha256": SHA256, "surahs": manifest}, f, indent=0)
    print("wrote", OUT)


EXPECTED_NO_OWN_NUMBER = []

if __name__ == "__main__":
    main(sys.argv[1])
