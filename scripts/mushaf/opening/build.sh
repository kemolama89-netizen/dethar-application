#!/usr/bin/env bash
# Builds the decorated opening pages (1–2): public/mushaf/hafs-kfqc-opening/composed/00{1,2}.svg
# and src/data/quran/kfqc-hafs-1441-opening.json, from public/reference/mushaf-opening-design.png
# (the frame) and quran-svg's public/mushaf/hafs-kfqc/svg/00{1,2}.svg (the Qur'an text).
# See public/mushaf/hafs-kfqc-opening/README.md.
#
# Usage: PYTHON=/path/to/python scripts/mushaf/opening/build.sh
# (PYTHON needs NumPy, SciPy, scikit-image and Pillow; default python3.)
set -euo pipefail
cd "$(dirname "$0")/../../.."
PYTHON="${PYTHON:-python3}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

"$PYTHON" scripts/mushaf/opening/frame.py regions public/reference/mushaf-opening-design.png "$WORK"
node scripts/mushaf/opening/layers.mjs ink "$WORK"
"$PYTHON" scripts/mushaf/opening/frame.py fit "$WORK"
node scripts/mushaf/opening/layers.mjs build "$WORK"
echo "Built public/mushaf/hafs-kfqc-opening/composed/ and src/data/quran/kfqc-hafs-1441-opening.json"
