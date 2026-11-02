#!/usr/bin/env python3
"""Imports the King Fahd Complex's Unicode Uthmanic (Hafs) text and font, from
Itqan's package unicode-uthmanic-font-hafs-narration 1.0.0 (Itqan CMS asset 138):
https://storage.cms.itqan.dev/media/uploads/assets/138/versions/tmp-4deda695/uthmanichafs_v2-0.zip

Used by the Mushaf's text reading mode and the Tafsir view. Each verse's aya_text
is copied character for character, and the font file byte for byte. It refuses to
write unless the zip is the expected one, every verse's consonants equal Tanzil's,
and every page starts on the verse the reader's 1441H pages start on.

  python3 -I scripts/mushaf/import-kfgqpc-text.py <path to uthmanichafs_v2-0.zip>
"""
import hashlib
import json
import os
import re
import sys
import unicodedata
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ZIP_SHA256 = "a7b0e5591945712ec5e4d6142938ae4d1e9b49bdc89dff06222789bfebdfd72c"
OUT_TEXT = os.path.join(ROOT, "src", "data", "quran", "kfgqpc-hafs-text.json")
OUT_FONT = os.path.join(ROOT, "src", "assets", "fonts", "kfgqpc-hafs")


def skeleton(text):
    out = []
    # The font's verse-number glyphs use Arabic presentation-form code points: not letters here.
    # So this text must only ever be shown in this font.
    text = re.sub("[\\uFB50-\\uFDFF\\uFE70-\\uFEFF]", "", text)
    for ch in unicodedata.normalize("NFKC", text):
        name = unicodedata.name(ch, "")
        if "ARABIC LETTER" not in name or any(w in name for w in ("ALEF", "HAMZA", "YEH", "WAW", "TEH MARBUTA", "HIGH", "SMALL", "SUBSCRIPT", "SUPERSCRIPT", "TATWEEL", "KASHIDA")):
            continue
        out.append(ch)
    return re.sub("ل+", "ل", "".join(out))


def main(path):
    digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
    if digest != ZIP_SHA256:
        raise SystemExit(f"unexpected file: {digest}")
    z = zipfile.ZipFile(path)
    rows = json.loads(z.read("UthmanicHafs_v2-0 data/hafsData_v2-0.json").decode("utf-8"))
    tanzil = {}
    for line in open(os.path.join(ROOT, "src/data/quran/tanzil-quran-uthmani.txt"), encoding="utf-8"):
        parts = line.rstrip("\n").split("|")
        if len(parts) == 3 and parts[0].isdigit():
            tanzil[(int(parts[0]), int(parts[1]))] = parts[2]
    keys = [(r["sura_no"], r["aya_no"]) for r in rows]
    if keys != sorted(tanzil):
        raise SystemExit("verses are not exactly Tanzil's 6,236, in order")
    bismillah = skeleton("بسم الله الرحمن الرحيم")
    for key, row in zip(keys, rows):
        target = skeleton(tanzil[key])
        if key[1] == 1 and key[0] not in (1, 9) and target.startswith(bismillah):
            target = target[len(bismillah):]
        if skeleton(row["aya_text"]) != target:
            raise SystemExit(f"text differs from Tanzil at {key}")
    starts = json.load(open(os.path.join(ROOT, "src/data/quran/kfqc-hafs-1441-pages.json"), encoding="utf-8"))["pageStarts"]
    first = {}
    for key, row in zip(keys, rows):
        first.setdefault(row["page"], list(key))
    if [first.get(p + 1) for p in range(604)] != starts:
        raise SystemExit("page starts differ from the reader's 1441H pages")
    out = [[r["sura_no"], r["aya_no"], r["page"], r["aya_text"]] for r in rows]
    with open(OUT_TEXT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.makedirs(OUT_FONT, exist_ok=True)
    with open(os.path.join(OUT_FONT, "uthmanic_hafs_v20.ttf"), "wb") as f:
        f.write(z.read("UthmanicHafs_v2-0 font/uthmanic_hafs_v20.ttf"))
    with open(os.path.join(OUT_FONT, "read.me"), "wb") as f:
        f.write(z.read("UthmanicHafs_v2-0 data/read.me"))
    print("wrote", OUT_TEXT, OUT_FONT, hashlib.sha256(open(OUT_TEXT, "rb").read()).hexdigest())


if __name__ == "__main__":
    main(sys.argv[1])
