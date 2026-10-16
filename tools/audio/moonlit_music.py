"""Stage music for Gravemoon Bridge: an eerie chiptune loop.
Run:  python3 tools/audio/moonlit_music.py public/assets/audio/music/gravemoon.wav
(then ffmpeg -i gravemoon.wav -c:a libvorbis -q:a 4 gravemoon.ogg for the game)

72 BPM, 16 bars (about 53 s), loops seamlessly. D minor with a flat second (Eb) and a raised
leading tone (C#) for that haunted-castle colour. Channels, like an old console:
  - bass drone: triangle wave, the chord root held under everything
  - ghost arpeggio: thin square wave with a long echo, so the notes trail off like a whisper
  - music box: sparse high plinks that ring out
  - lead (second half): a slow pulse-wave melody with a vibrato that creeps in on long notes
  - bell toll (second half): a low inharmonic bell on the first beat of every 4th bar
  - wind: soft noise that swells and fades
"""
import sys, wave
import numpy as np

SR = 22050
BPM = 72
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 16
N = int(round(BARS * BAR * SR))
rng = np.random.default_rng(13)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

def square(f, n, duty=0.5, vib=None):
    t = np.arange(n) / SR
    fr = f * (1 + (vib if vib is not None else 0))
    ph = np.cumsum(fr) / SR
    return np.where((ph % 1) < duty, 1.0, -1.0)

def triangle(f, n):
    ph = (np.arange(n) * f / SR) % 1
    return 4 * np.abs(ph - 0.5) - 1

def env(n, a=0.01, d=0.0, s=1.0, r=0.05):
    e = np.ones(n) * s
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na) if s else np.linspace(0, 1, na)
    if d:
        nd = int(d * SR); e[na:na + nd] = np.linspace(1, s, min(nd, max(0, n - na)))[:len(e[na:na + nd])]
    if nr and nr < n: e[-nr:] *= np.linspace(1, 0, nr)
    return e

out = np.zeros(N)
def add(sig, start, gain):
    i = int(start * SR)
    j = min(N, i + len(sig))
    if i < N: out[i:j] += sig[:j - i] * gain
    if i + len(sig) > N:                                  # wrap the tail to the start: seamless loop
        rest = sig[j - i:]; out[:len(rest)] += rest * gain

# chords: root (for the bass) and chord tones (MIDI)
D, Eb, E, F, G, A, Bb, C, Cs = 62, 63, 64, 65, 67, 69, 70, 72, 61
CHORDS = [
    (38, [D, F, A]), (38, [D, F, A]), (34, [Bb - 12, D, F]), (33, [A - 12, Cs, E]),
    (38, [D, F, A]), (39, [Eb, G, Bb]), (37, [Cs, E, G]), (33, [A - 12, Cs, E]),
]

# ---- bass drone: one long triangle note per bar, slight swell
for bar in range(BARS):
    root, _ = CHORDS[bar % 8]
    n = int(BAR * SR)
    sig = triangle(hz(root), n) * env(n, a=0.4, r=0.3) * (0.85 + 0.15 * np.sin(np.linspace(0, np.pi, n)))
    add(sig, bar * BAR, 0.32)
    # an octave-up ghost on beat 3, very quiet
    n2 = int(BEAT * 1.5 * SR)
    add(triangle(hz(root + 12), n2) * env(n2, a=0.05, r=0.6), bar * BAR + 2 * BEAT, 0.08)

# ---- ghost arpeggio: eighth notes 1-5-8-b3 pattern with a long echo
arp = np.zeros(N)
pattern = [0, 2, 1, 2, 0, 2, 1, 2]                       # indexes into chord tones (+ octave on 1)
for bar in range(BARS):
    _, tones = CHORDS[bar % 8]
    for k in range(8):
        m = tones[pattern[k]] + (12 if k in (2, 6) else 0)
        n = int(BEAT / 2 * SR * 0.9)
        sig = square(hz(m), n, duty=0.125) * env(n, a=0.004, r=0.25) * np.exp(-np.arange(n) / SR * 3.5)
        i = int((bar * BAR + k * BEAT / 2) * SR)
        j = min(N, i + n); arp[i:j] += sig[:j - i]
# echo: 3/8 beat delay, feedback, wrapping around the loop
delay = int(BEAT * 0.75 * SR)
echoed = arp.copy()
tap = arp.copy()
for g in (0.45, 0.28, 0.17, 0.1):
    tap = np.roll(tap, delay)
    echoed += tap * g
out += echoed * 0.10

# ---- music box: sparse high plinks on chord tones (fixed random so the loop is the same every time)
for bar in range(BARS):
    _, tones = CHORDS[bar % 8]
    for k in range(16):
        if rng.random() < 0.13:
            m = tones[rng.integers(3)] + 24
            n = int(1.4 * SR)
            t = np.arange(n) / SR
            sig = (np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(2 * np.pi * hz(m) * 3.01 * t)) * np.exp(-t * 3.2)
            sig = np.round(sig * 8) / 8                   # 4-bit crunch
            add(sig, bar * BAR + k * BEAT / 4, 0.07)

# ---- lead melody in the second half: (midi, beats)
MEL = [
    [(A, 2), (Bb, 1), (A, 1)], [(F, 3), (E, 1)], [(D, 2), (F, 2)], [(E, 3), (Cs, 1)],
    [(A, 2), (D + 12, 2)], [(Eb + 12, 2), (D + 12, 1), (Bb, 1)], [(A, 2), (G, 1), (E, 1)], [(D, 4)],
]
for bi, bar_notes in enumerate(MEL):
    t0 = (8 + bi) * BAR
    for m, beats in bar_notes:
        n = int(beats * BEAT * SR)
        t = np.arange(n) / SR
        vib = 0.012 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.35) / 0.6, 0, 1)   # vibrato creeps in
        sig = square(hz(m), n, duty=0.25, vib=vib) * env(n, a=0.08, r=0.18)
        add(sig, t0, 0.075)
        # a quiet echo of the lead
        add(sig * 0.35, t0 + BEAT * 0.75, 0.075)
        t0 += beats * BEAT

# ---- bell toll: low inharmonic bell, bars 9 and 13 (first beat)
for bar in (8, 12):
    n = int(4 * SR); t = np.arange(n) / SR
    f = hz(38 + 12)
    sig = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dcy) for r, a, dcy in [(1, 1, 0.9), (2.76, 0.5, 1.6), (5.4, 0.3, 2.5), (0.5, 0.6, 0.7)])
    sig = np.round(sig * 6) / 6
    add(sig, bar * BAR, 0.13)

# ---- wind: noise smoothed into a low hiss, swelling twice per loop
noise = rng.standard_normal(N)
k = 60
wind = np.convolve(noise, np.ones(k) / k, mode='same')
wind *= (0.5 + 0.5 * np.sin(2 * np.pi * np.arange(N) / N * 2 - 1.2)) ** 2
out += wind * 0.6

# master: gentle low-pass (old console speaker), normalise, fade nothing (it loops)
out = np.convolve(out, np.ones(3) / 3, mode='same')
out /= np.max(np.abs(out)) * 1.12
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('saved', sys.argv[1], round(N / SR, 1), 's')
