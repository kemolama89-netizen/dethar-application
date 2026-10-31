"""Makes the optional, smaller playback copies of DITHAR's audio (the originals in
public/audio are never touched) and verifies each one before listing it.

    python3 -P scripts/audio/optimize-audio.py            # encode + verify everything planned
    python3 -P scripts/audio/optimize-audio.py --check    # re-verify existing copies only

Writes:
  audio-optimized/<same path as the original, extension .ogg>  — Ogg Opus copies
  audio-optimized/report.json                                   — every measurement, pass or fail
  src/data/audioOptimized.json                                  — {original path: copy path}, PASSED copies only

Plan (conservative — the originals are already lossy, so only files with
clearly more bitrate than their content needs are re-encoded, once):
  - a file whose two channels are the same (side channel below -40 dB) or that
    is mono  → Opus 72 kb/s VBR, mono;
  - real stereo                                                      → Opus 128 kb/s VBR, stereo;
  - re-encoded only if the copy is at most 70% of the original's size;
  - never the Quran recitations' 128 kb/s files (they would barely shrink),
    the 4 reminder sounds, the UI sound, or files no code references.
Opus at 48 kHz in Ogg, saved as .ogg: Android stores .ogg uncompressed in the
APK (assets.openFd needs that), Android 5+ MediaPlayer and Chrome/WebView
play it, and its pre-skip keeps the audio sample-aligned with the original.

A copy is listed only if it passes every check against the original (both
decoded by FFmpeg at 48 kHz):
  - aligned: 0-sample offset (the Adhan segment timestamps stay exact),
  - same length within 15 ms,
  - bandwidth kept (within 1.5 kHz of the original's),
  - loudness-weighted spectral difference <= 1.0 dB,
  - approximate noise-to-mask ratio <= -2 dB on average.
These are objective proxies, not a listening test.
"""
import hashlib, json, os, subprocess, sys
import numpy as np
from scipy.signal import fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'audio-optimized')
MAP_FILE = os.path.join(ROOT, 'src', 'data', 'audioOptimized.json')
SR = 48000
STEREO = ['-c:a', 'libopus', '-b:a', '128k', '-vbr', 'on', '-compression_level', '10', '-application', 'audio']
MONO = ['-c:a', 'libopus', '-b:a', '72k', '-vbr', 'on', '-compression_level', '10', '-application', 'audio']
# Measured effective rates of those settings (VBR), for the size test before encoding.
EST_KBPS = {'stereo': 140, 'mono': 76}
FOLDERS = ['adhan', 'adhkar', 'audio-azkar']  # quran / reminders / ui are left as they are


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def probe(path):
    j = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path], capture_output=True, text=True).stdout or '{}')
    a = next((s for s in j.get('streams', []) if s.get('codec_type') == 'audio'), {})
    return dict(codec=a.get('codec_name'), ch=int(a.get('channels', 0) or 0), rate=int(a.get('sample_rate', 0) or 0), dur=float(j.get('format', {}).get('duration', 0) or 0))


def decode(path, ch, seconds=None):
    args = ['ffmpeg', '-v', 'error', '-i', path] + (['-t', str(seconds)] if seconds else []) + ['-f', 'f32le', '-ac', str(ch), '-ar', str(SR), '-']
    return np.frombuffer(subprocess.run(args, capture_output=True).stdout, dtype=np.float32).reshape(-1, ch)


def side_db(path):
    x = decode(path, 2, 90).astype(np.float64)
    L, R = x[:, 0], x[:, 1]
    return float(10 * np.log10(((L - R) ** 2).mean() / max(((L + R) ** 2).mean(), 1e-12) + 1e-12))


BARK = np.array([0, 100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700, 4400, 5300, 6400, 7700, 9500, 12000, 15500, 24000])


def bands(x, n=2048):
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[:: n // 2] * np.hanning(n)
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    idx = np.digitize(f, BARK) - 1
    return np.stack([spec[:, idx == b].sum(axis=1) for b in range(len(BARK) - 1)], axis=1), spec, f


def bandwidth(spec, f):
    m = 10 * np.log10(spec.mean(axis=0) + 1e-20)
    return float(f[np.where(m > m.max() - 60)[0].max()])


def compare(orig_path, copy_path, ch):
    a = decode(orig_path, ch).mean(axis=1)
    b = decode(copy_path, ch).mean(axis=1)
    # Alignment: cross-correlate a 10 s stretch from the middle, searching +-100 ms.
    s0, seg, pad = len(a) // 3, min(len(a) // 3, SR * 10), SR // 10
    ref = a[s0:s0 + seg]
    win = b[s0 - pad: s0 + seg + pad]
    lag = int(np.argmax(fftconvolve(win, ref[::-1], mode='valid'))) - pad
    n = min(len(a), len(b))
    a2, b2 = a[:n], b[:n]
    gain = float(np.dot(a2, b2) / max(np.dot(b2, b2), 1e-12))
    S, spec_a, f = bands(a2)
    E, _, _ = bands(a2 - b2 * gain)
    B, spec_b, _ = bands(b2 * gain)
    loud = 10 * np.log10(S.sum(axis=1) + 1e-20)
    keep = loud > loud.max() - 45
    sig = S[keep] > S[keep].max() * 1e-7
    nmr = 10 * np.log10((E[keep] + 1e-20) / (S[keep] * 10 ** (-14 / 10) + 1e-20))
    lsd = np.abs(10 * np.log10((S[keep] + 1e-20) / (B[keep] + 1e-20)))
    return dict(lag=lag, dur_diff_ms=round((len(b) - len(a)) / SR * 1000, 1), gain=round(gain, 4),
                nmr_mean=round(float(nmr[sig].mean()), 2), lsd_db=round(float(lsd[sig].mean()), 2),
                bw_orig=round(bandwidth(spec_a, f)), bw_copy=round(bandwidth(spec_b, f)))


def referenced_paths():
    """Every audio path the app's code names (data modules), so nothing unreferenced is converted."""
    text = ''
    for dp, _, fs in os.walk(os.path.join(ROOT, 'src')):
        for f in fs:
            if f.endswith(('.ts', '.tsx', '.json')) and '.test.' not in f and f != 'audioOptimized.json':
                text += open(os.path.join(dp, f), encoding='utf-8').read()
    return text


def plan():
    text = referenced_paths()
    items = []
    for folder in FOLDERS:
        base = os.path.join(ROOT, 'public', 'audio', folder)
        for dp, _, fs in os.walk(base):
            for f in sorted(fs):
                if f.endswith('.md'):
                    continue
                path = os.path.join(dp, f)
                rel = os.path.relpath(path, os.path.join(ROOT, 'public')).replace(os.sep, '/')
                stem = os.path.splitext(f)[0]
                # Adhan files are named in full; adhkar files by their id (morning_003, tasbeeh_01, …).
                if rel not in text and (folder == 'adhan' or stem not in text):
                    continue
                info = probe(path)
                mono = info['ch'] == 1 or side_db(path) < -40
                kind = 'mono' if mono else 'stereo'
                est = EST_KBPS[kind] * 1000 / 8 * info['dur']
                if est > 0.7 * os.path.getsize(path):
                    continue
                items.append(dict(original=rel, copy=os.path.splitext(rel)[0] + '.ogg', kind=kind, **info))
    return items


def passes(m):
    return (abs(m['lag']) <= 1 and abs(m['dur_diff_ms']) <= 15 and m['bw_copy'] >= m['bw_orig'] - 1500
            and m['lsd_db'] <= 1.0 and m['nmr_mean'] <= -2.0)


def main():
    check_only = '--check' in sys.argv
    items = json.load(open(os.path.join(OUT_DIR, 'report.json')))['files'] if check_only else plan()
    report, mapping = [], {}
    for it in items:
        src = os.path.join(ROOT, 'public', it['original'])
        dst = os.path.join(OUT_DIR, it['copy'])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not check_only:
            ch = ['-ac', '1'] if it['kind'] == 'mono' else ['-ac', '2']
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-map', '0:a', '-map_metadata', '-1', '-ar', str(SR)] + ch + (MONO if it['kind'] == 'mono' else STEREO) + [dst], check=True)
        m = compare(src, dst, 1 if it['kind'] == 'mono' else 2)
        ok = passes(m)
        row = dict(it, **m, size_original=os.path.getsize(src), size_copy=os.path.getsize(dst), sha256_original=sha256(src), sha256_copy=sha256(dst), passed=ok)
        report.append(row)
        if ok:
            mapping[it['original']] = it['copy']
        print(('PASS ' if ok else 'FAIL ') + json.dumps({k: row[k] for k in ('original', 'kind', 'lag', 'dur_diff_ms', 'nmr_mean', 'lsd_db', 'bw_orig', 'bw_copy')}, ensure_ascii=False), flush=True)
    saved = sum(r['size_original'] - r['size_copy'] for r in report if r['passed'])
    json.dump(dict(settings=dict(stereo=' '.join(STEREO), mono=' '.join(MONO), sample_rate=SR, container='Ogg (.ogg)'),
                   files=report, passed=len(mapping), failed=len(report) - len(mapping), bytes_saved=saved),
              open(os.path.join(OUT_DIR, 'report.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(dict(sorted(mapping.items())), open(MAP_FILE, 'w'), ensure_ascii=False, indent=1)
    print(f'{len(mapping)} passed, {len(report) - len(mapping)} failed; saves {saved / 1e6:.1f} MB')


main()
