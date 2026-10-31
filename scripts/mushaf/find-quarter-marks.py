"""Finds where each quarter-hizb sign (۞) is printed on the 1441H pages.

Writes src/data/quran/kfqc-hafs-1441-quarter-marks.json, which the Qur'an
reader uses to draw the sign in its own colour (the artwork is never edited).

  python3 scripts/mushaf/find-quarter-marks.py quarters <work>/quarters.json
  node scripts/mushaf/render-quarter-pages.mjs <work>/quarters.json <work>/png
  python3 scripts/mushaf/find-quarter-marks.py match <work>/quarters.json <work>/png

The sign's template is cut from page 5, where it begins 2:26. Each quarter's
first verse is searched at the start (right end) of its first line, using its
verse polygon (public/mushaf/hafs-kfqc/json). Scores are bimodal: every quarter
that begins mid-surah scores >= 0.86; a quarter that begins a surah has no sign
in the text (as printed) and scores <= 0.53. Quarter 106 is searched at 15:49
as well as Tanzil's 15:50: the print draws it before 15:49.
"""
import json, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.signal import fftconvolve

SC = 4
META = 'src/data/quran/tanzil-quran-metadata.txt'
PAGES = 'src/data/quran/kfqc-hafs-1441-pages.json'
OUT = 'src/data/quran/kfqc-hafs-1441-quarter-marks.json'


def quarters():
    meta = open(META).read()
    block = re.search(r'QuranData\.HizbQaurter = \[([\s\S]*?)\];', meta).group(1)
    starts = [(int(a), int(b)) for a, b in re.findall(r'\[(\d+), (\d+)\]', block) if int(a) <= 114]
    page_starts = [tuple(x) for x in json.load(open(PAGES))['pageStarts']]
    page_of = lambda v: max(i for i, s in enumerate(page_starts) if s <= v) + 1
    return [{"quarter": i + 1, "surah": s, "ayah": a, "page": page_of((s, a))} for i, (s, a) in enumerate(starts)]


def template(png_dir):
    im = np.array(Image.open(f'{png_dir}/005.png').convert('L')) < 128
    y0, x0 = 500, 110
    w = im[y0:590, x0:172]
    lab, _ = ndimage.label(w)
    keep = np.zeros_like(w)
    for i in range(1, lab.max() + 1):
        yy, xx = np.nonzero(lab == i)
        if np.hypot(yy.mean() - (542 - y0), xx.mean() - (150 - x0)) < 17 and np.ptp(yy) < 20 and np.ptp(xx) < 20:
            keep |= lab == i
    ys, xs = np.nonzero(keep)
    return keep[ys.min():ys.max() + 1, xs.min():xs.max() + 1].astype(float)


def first_line(page, s, a):
    for r in json.load(open('public/mushaf/hafs-kfqc/json/%03d.json' % page)):
        if r['surahNumber'] == s and r['ayahNumber'] == a:
            n = [float(v) for v in re.findall(r'-?\d+(?:\.\d+)?', r['polygon'])][:8]
            return min(n[0::2]), max(n[0::2]), min(n[1::2]), max(n[1::2])


def match(q, tpl, png_dir):
    x0, x1, y0, y1 = first_line(q['page'], q['surah'], q['ayah'])
    im = np.array(Image.open('%s/%03d.png' % (png_dir, q['page'])).convert('L')) < 128
    wx0, wx1 = int(max(0, (x1 - 24) * SC)), int(min(im.shape[1], (x1 + 3) * SC))
    wy0, wy1 = int(max(0, (y0 - 2) * SC)), int(min(im.shape[0], (y1 + 2) * SC))
    win = im[wy0:wy1, wx0:wx1].astype(float)
    score = fftconvolve(win, tpl[::-1, ::-1], mode='valid') / np.sqrt(tpl.sum() * np.maximum(fftconvolve(win, np.ones_like(tpl), mode='valid'), 1))
    iy, ix = np.unravel_index(np.argmax(score), score.shape)
    th, tw = tpl.shape
    return float(score[iy, ix]), [round((wx0 + ix) / SC, 2), round((wy0 + iy) / SC, 2), round(tw / SC, 2), round(th / SC, 2)]


def main():
    if sys.argv[1] == 'quarters':
        json.dump(quarters(), open(sys.argv[2], 'w'))
        return
    qs, png_dir = json.load(open(sys.argv[2])), sys.argv[3]
    tpl = template(png_dir)
    marks, no_sign = [], []
    for q in qs:
        if q['quarter'] == 106:
            q = {**q, "ayah": 49}
        if q['page'] <= 2:
            no_sign.append({**q, "score": 0}); continue
        score, box = match(q, tpl, png_dir)
        (marks if score >= 0.8 else no_sign).append({**q, "box": box, "score": round(score, 3)} if score >= 0.8 else {**q, "score": round(score, 3)})
    assert all(n['ayah'] == 1 for n in no_sign), no_sign
    json.dump({
        "about": "Where each quarter-hizb sign (۞) is printed on the 1441H pages (public/mushaf/hafs-kfqc/svg), in each page's own 345 x 550 viewBox units: box = [x, y, width, height]. Found by scripts/mushaf/find-quarter-marks.py (template match of the sign, at the start of each quarter's first verse, on pages rendered at 4x). Quarter starts are Tanzil's HizbQaurter list, except quarter 106, which the print begins at 15:49 (its sign is drawn there; 15:50 has none). Quarters that begin a surah have no sign in the text (as in the print) and are listed under noSign.",
        "generated": "2026-10-20",
        "marks": marks,
        "noSign": no_sign,
    }, open(OUT, 'w'), ensure_ascii=False, separators=(",", ":"))
    print(len(marks), 'signs;', len(no_sign), 'quarters without one')


main()
