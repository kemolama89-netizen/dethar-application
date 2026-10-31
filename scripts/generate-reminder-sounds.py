#!/usr/bin/env python3
"""Synthesizes DITHAR's calm Morning/Evening reminder sounds.

Every sound is generated here from scratch (sine tones, filtered noise and
envelopes, with a fixed random seed) — no recording, sample or third-party
asset is used, so the output is original work, dedicated to the public
domain (CC0 1.0) and freely distributable with the app. Re-running the
script reproduces the same files.

Outputs (≈6 s each, gentle fade-in/out, peak ≈ -6 dBFS):
  android/app/src/main/res/raw/adhkar_reminder_<id>.ogg   — notification channel sounds
  public/audio/reminders/<id>.mp3                         — in-app preview on the web

  birdsong  morning: soft dawn air with a few songbird phrases
  stream    morning: a gentle brook with light water bubbles
  crickets  evening: crickets over a faint breeze
  waves     evening: slow sea swells on a quiet shore

Requires numpy and ffmpeg.
"""
import os
import subprocess
import tempfile
import wave

import numpy as np

RATE = 44100
DURATION = 6.0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(ROOT, "android", "app", "src", "main", "res", "raw")
WEB_DIR = os.path.join(ROOT, "public", "audio", "reminders")


def t_axis(seconds=DURATION):
    return np.arange(int(RATE * seconds)) / RATE


def one_pole_lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / RATE)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def bandpass(x, low, high):
    return one_pole_lowpass(x, high) - one_pole_lowpass(x, low)


def pink_noise(n, rng):
    # Voss-style approximation: sum of octave-spaced held random values.
    rows = 12
    out = np.zeros(n)
    for r in range(rows):
        step = 2 ** r
        vals = rng.standard_normal(n // step + 2)
        out += np.repeat(vals, step)[:n]
    return out / rows


def envelope(n, attack, release):
    env = np.ones(n)
    a = int(attack * RATE)
    r = int(release * RATE)
    env[:a] = np.linspace(0, 1, a) ** 2
    env[n - r:] = np.linspace(1, 0, r) ** 2
    return env


def chirp(freq_start, freq_end, seconds, rng, vibrato=0.0):
    t = t_axis(seconds)
    sweep = np.linspace(freq_start, freq_end, t.size)
    if vibrato:
        sweep = sweep * (1 + vibrato * np.sin(2 * np.pi * rng.uniform(25, 40) * t))
    phase = 2 * np.pi * np.cumsum(sweep) / RATE
    env = np.sin(np.pi * np.linspace(0, 1, t.size)) ** 1.5
    return np.sin(phase) * env


def place(track, sound, at):
    start = int(at * RATE)
    end = min(track.size, start + sound.size)
    if start < track.size:
        track[start:end] += sound[: end - start]


def birdsong(rng):
    n = int(RATE * DURATION)
    air = bandpass(pink_noise(n, rng), 300, 3000) * 0.08
    birds = np.zeros(n)
    # Three phrases from two "birds" at different pitches and distances.
    phrases = [(0.6, 1.0, 3200), (2.2, 0.55, 4100), (3.6, 0.85, 3400), (4.6, 0.5, 4300)]
    for start, gain, base in phrases:
        at = start
        for _ in range(rng.integers(4, 7)):
            length = rng.uniform(0.06, 0.13)
            up = rng.random() < 0.6
            f0 = base * rng.uniform(0.9, 1.1)
            f1 = f0 * (rng.uniform(1.25, 1.5) if up else rng.uniform(0.7, 0.85))
            place(birds, gain * chirp(f0, f1, length, rng, vibrato=0.02), at)
            at += length + rng.uniform(0.03, 0.09)
        # A short trill to end the phrase.
        for k in range(rng.integers(3, 6)):
            place(birds, gain * 0.6 * chirp(base * 1.3, base * 1.15, 0.035, rng), at + k * 0.045)
    return air + birds * 0.5


def stream(rng):
    n = int(RATE * DURATION)
    t = t_axis()
    water = bandpass(pink_noise(n, rng), 500, 4000)
    flutter = 0.75 + 0.25 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 0.23 * t + 1)
    track = water * flutter * 0.35
    for _ in range(26):
        f = rng.uniform(600, 1400)
        place(track, 0.12 * chirp(f, f * 1.6, rng.uniform(0.02, 0.05), rng), rng.uniform(0.2, DURATION - 0.3))
    return track


def crickets(rng):
    n = int(RATE * DURATION)
    t = t_axis()
    breeze = one_pole_lowpass(pink_noise(n, rng), 500) * 0.25 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.15 * t))
    track = breeze
    for carrier, period, offset, gain in [(4600, 0.62, 0.3, 0.16), (4150, 0.81, 0.55, 0.1)]:
        at = offset
        while at < DURATION - 0.3:
            for pulse in range(3):
                length = 0.018
                tone = np.sin(2 * np.pi * carrier * t_axis(length)) * np.sin(np.pi * np.linspace(0, 1, int(RATE * length)))
                place(track, gain * tone, at + pulse * 0.032)
            at += period * rng.uniform(0.95, 1.05)
    return track


def waves(rng):
    n = int(RATE * DURATION)
    t = t_axis()
    surf = one_pole_lowpass(pink_noise(n, rng), 900)
    hiss = bandpass(pink_noise(n, rng), 1500, 5000) * 0.25
    swell = np.clip(np.sin(2 * np.pi * (t / 4.2) - 1.2), 0, None) ** 1.6
    return (surf * 0.6 + hiss) * (0.15 + 0.85 * swell)


def finish(signal):
    signal = signal - np.mean(signal)
    signal = signal * envelope(signal.size, 0.8, 1.6)
    peak = np.max(np.abs(signal)) or 1.0
    return signal / peak * 0.5  # ≈ -6 dBFS: calm, never startling


def write_wav(path, signal):
    data = (np.clip(signal, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(WEB_DIR, exist_ok=True)
    sounds = {"birdsong": birdsong, "stream": stream, "crickets": crickets, "waves": waves}
    for index, (name, make) in enumerate(sounds.items()):
        rng = np.random.default_rng(1447 + index)
        signal = finish(make(rng))
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, f"{name}.wav")
            write_wav(wav, signal)
            ogg = os.path.join(RAW_DIR, f"adhkar_reminder_{name}.ogg")
            mp3 = os.path.join(WEB_DIR, f"{name}.mp3")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "3", ogg], check=True)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libmp3lame", "-b:a", "96k", mp3], check=True)
        print(f"{name}: {os.path.getsize(ogg)} B ogg, {os.path.getsize(mp3)} B mp3")


if __name__ == "__main__":
    main()
