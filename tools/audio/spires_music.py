"""Verdant Spires stage theme for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/spires_music.py OUT_DIR      (writes spires.wav)
then  ffmpeg -i spires.wav -c:a libvorbis -q:a 5 spires.ogg   (and .mp3) for public/assets/audio/music/

"Overgrown": 116 BPM with a swung, bouncing shuffle, 32 bars (about 66 s), loops. G mixolydian - a
jungle-ruins adventure theme, the flat seventh (F) giving it an old, earthy feel:
  intro (4 bars)  - plucky woodblock-style percussion and a bubbling bass riff
  A     (8 bars)  - the flute-like hook over G - F - C - G
  B     (8 bars)  - darker, down in E minor (Em C D Em | Em C D D), staccato low lead, tom rolls
  A'    (8 bars)  - the hook with a bird-call counter-melody trilling above it
  outro (4 bars)  - the bass riff alone with the drums, back to the intro
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track

OUT = sys.argv[1]
t = Track(116, 128)
SW = 0.62                                        # swing: the off-beat 8th lands at 0.62 of the beat

ROOT = {'G': 43, 'F': 41, 'C': 36, 'Em': 40, 'D': 38}
TONES = {'G': [67, 71, 74], 'F': [65, 69, 72], 'C': [64, 67, 72], 'Em': [64, 67, 71], 'D': [62, 66, 69]}
A_PROG = ['G', 'F', 'C', 'G', 'G', 'F', 'C', 'D']
B_PROG = ['Em', 'C', 'D', 'Em', 'Em', 'C', 'D', 'D']
SONG = [('intro', c) for c in ['G', 'G', 'F', 'G']] + [('A', c) for c in A_PROG] + [('B', c) for c in B_PROG] + \
       [('A2', c) for c in A_PROG] + [('outro', c) for c in ['G', 'F', 'C', 'D']]

def sw(b): return int(b) + (SW if b % 1 else 0)  # swung position of an 8th note

for bar, (sec, ch) in enumerate(SONG):
    b0 = bar * 4
    root, tones = ROOT[ch], TONES[ch]
    # ---- bubbling bass riff: root, octave, flat 7, fifth (swung 8ths)
    riff = [0, 12, 10, 7, 0, 12, 7, 5] if sec != 'B' else [0, 0, 7, 0, 3, 0, 7, 10]
    for k, off in enumerate(riff): t.tri(root + off, 0.4, b0 + sw(k * 0.5), 0.55)
    # ---- marimba-ish plucks on the chord (short, decaying pulse)
    if sec != 'intro':
        for k in (0.5, 1.5, 2.5, 3.5):
            for m in tones[:2]: t.pulse(m, 0.25, b0 + sw(k), 0.03, duty=0.25, decay=14, release=0.05)
    # ---- percussion: kick, woodblock clicks, shaker; toms in B
    for k in range(4):
        t.kick(b0 + k, 0.75 if k in (0, 2) else 0.3)
        t.hat(b0 + sw(k + 0.5), 0.12, 0.03)
        t.hat(b0 + k, 0.05, 0.03)
        if sec != 'intro' and k in (1, 3): t.snare(b0 + k, 0.4)
    if sec in ('intro',) or bar % 4 == 3:                     # woodblock pattern (a short high tri pip)
        for q in (0, 0.75, 1.5, 2.5, 3.25):
            t.tri(84, 0.06, b0 + q, 0.18)
    if sec == 'B':
        for k in range(4): t.tri(48 - k * 3, 0.2, b0 + 3 + k * 0.25, 0.3)       # tom roll
    if bar in (3, 11, 19, 27):
        for k in range(6): t.snare(b0 + 2.5 + k * 0.25, 0.18 + k * 0.05)

G4, A4, B4, C5, D5, E5, F5, G5, A5, B5, C6, D6 = 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86
def swung(notes):
    """Turn straight 8th pairs into a long-short swing (0.62 / 0.38)."""
    out, pos = [], 0.0
    for m, l in notes:
        if l == 0.5: l = SW if pos % 1 == 0 else 1 - SW
        out.append((m, l)); pos = round(pos + l, 4)
    return out
HOOK = swung([
    (D5, .5), (G5, .5), (A5, .5), (B5, 1.5), (A5, .5), (G5, .5),
    (F5, 1.5), (G5, .5), (A5, 1), (C6, 1),
    (G5, .5), (E5, .5), (C5, 1), (E5, .5), (G5, .5), (C6, 1),
    (B5, 2), (G5, 1), (D5, 1),
    (D5, .5), (G5, .5), (A5, .5), (B5, 1.5), (D6, .5), (C6, .5),
    (A5, 1.5), (F5, .5), (G5, 1), (A5, 1),
    (C6, 1), (B5, .5), (A5, .5), (G5, 1), (E5, 1),
    (F5, .5), (A5, .5), (D6, 1.5), (C6, .5), (A5, 1),
])
LOW = swung([
    (E5, .5), (None, .5), (E5, .5), (G5, .5), (B4, 1), (E5, 1),
    (C5, .5), (None, .5), (E5, .5), (G5, .5), (C6, 1.5), (B5, .5),
    (A5, 1), (F5 + 1, 1), (D5, 1), (A4, 1),
    (B4, .5), (E5, .5), (G5, .5), (B5, .5), (E5 + 12, 2),
    (E5, .5), (None, .5), (E5, .5), (G5, .5), (B5, 1), (G5, 1),
    (C6, .5), (B5, .5), (G5, .5), (E5, .5), (C5, 2),
    (D5, 1), (F5 + 1, 1), (A5, 1), (D6, 1),
    (C6, .5), (A5, .5), (F5 + 1, .5), (D5, .5), (A4, 2),
])

def lead(notes, start, gain=0.13, **kw):
    t.melody(notes, start, gain, duty=0.25, vib=0.012, **kw)          # breathy, flute-like
    t.melody(notes, start + 0.06, gain * 0.25, duty=0.5)               # a slight chorus

lead(HOOK, 16)
t.melody([(m - 12 if m else None, l) for m, l in LOW], 48, 0.12, duty=0.5, decay=8)   # staccato low lead
lead(HOOK, 80, 0.12)
for bar in range(8):                                                   # bird calls: quick trills high above
    b = 80 + bar * 4 + 3
    for k in range(6): t.pulse((G5 + 24) if k % 2 == 0 else (A5 + 24), 0.08, b + k * 0.09, 0.025, duty=0.125)
print('spires', round(t.save(os.path.join(OUT, 'spires.wav')), 2), 's')
