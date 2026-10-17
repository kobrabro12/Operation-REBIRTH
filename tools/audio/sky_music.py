"""Sky Sanctum stage theme for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/sky_music.py OUT_DIR      (writes sky.wav)
then  ffmpeg -i sky.wav -c:a libvorbis -q:a 5 sky.ogg   (and .mp3) for public/assets/audio/music/

"Above the Clouds": 136 BPM, 32 bars (about 56 s), loops. D major, bright and heroic - a temple
floating in open sky:
  intro (4 bars)  - shimmering high arpeggios over a held bass, a soft drum build
  A     (8 bars)  - the soaring hook: I - V - vi - IV (D A Bm G), marching bass, steady drums
  B     (8 bars)  - lifts to the IV and ii (G A F#m Bm | G A Em A), with a call-and-answer lead
  A'    (8 bars)  - the hook an octave up with a harmony a third below and bell-like counter notes
  outro (4 bars)  - a rising sequence that hands back to the intro so the loop is seamless
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track

OUT = sys.argv[1]
t = Track(136, 128)

ROOT = {'D': 38, 'A': 33, 'Bm': 35, 'G': 31, 'F#m': 42, 'Em': 40}
TONES = {'D': [62, 66, 69], 'A': [61, 64, 69], 'Bm': [62, 66, 71], 'G': [62, 67, 71], 'F#m': [61, 66, 69], 'Em': [64, 67, 71]}
A_PROG = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A']
B_PROG = ['G', 'A', 'F#m', 'Bm', 'G', 'A', 'Em', 'A']
SONG = [('intro', c) for c in ['D', 'G', 'D', 'A']] + [('A', c) for c in A_PROG] + [('B', c) for c in B_PROG] + \
       [('A2', c) for c in A_PROG] + [('outro', c) for c in ['G', 'A', 'Bm', 'A']]

for bar, (sec, ch) in enumerate(SONG):
    b0 = bar * 4
    root, tones = ROOT[ch], TONES[ch]
    # ---- bass: held in the intro, a marching root-fifth-octave line after
    if sec == 'intro': t.tri(root, 4, b0, 0.5)
    else:
        for k, off in enumerate([0, 7, 12, 7, 0, 7, 12, 7]):
            t.tri(root + off, 0.5, b0 + k * 0.5, 0.5)
    # ---- shimmering arpeggio: 16ths up and down the chord, two octaves up, very thin
    up = tones + [m + 12 for m in tones]
    seq = up + up[-2:0:-1]
    for k in range(16):
        t.pulse(seq[k % len(seq)] + 12, 0.2, b0 + k * 0.25, 0.022 if sec != 'intro' else 0.03, duty=0.125, release=0.03, decay=6)
    # ---- warm pad chords on beats 1 and 3 in B and A'
    if sec in ('B', 'A2'):
        for k in (0, 2):
            for m in tones: t.pulse(m, 1.8, b0 + k, 0.022, duty=0.25, attack=0.04, release=0.2)
    # ---- drums: light in the intro, a marching beat after
    for k in range(4):
        if sec == 'intro':
            if bar >= 2: t.hat(b0 + k + 0.5, 0.08)
            continue
        t.kick(b0 + k, 0.7 if k % 2 == 0 else 0.35)
        if k % 2: t.snare(b0 + k, 0.45)
        t.hat(b0 + k + 0.5, 0.1)
    if bar in (3, 11, 19, 27):
        for k in range(4): t.snare(b0 + 3 + k * 0.25, 0.2 + k * 0.06)          # fill into each section

# notes
A4, B4, Cs5, D5, E5, Fs5, G5, A5, B5, Cs6, D6, E6 = 69, 71, 73, 74, 76, 78, 79, 81, 83, 85, 86, 88
HOOK = [
    (A4, .5), (D5, .5), (Fs5, 1.5), (E5, .5), (D5, .5), (E5, .5),
    (Cs5, 1), (E5, .5), (A5, 1.5), (G5, .5), (Fs5, .5),
    (Fs5, 1), (D5, .5), (B4, .5), (D5, .5), (Fs5, .5), (B5, 1),
    (A5, 1.5), (G5, .5), (Fs5, 1), (E5, 1),
    (A4, .5), (D5, .5), (Fs5, 1.5), (A5, .5), (D6, 1),
    (Cs6, 1), (B5, .5), (A5, .5), (E5, 1), (Cs5, 1),
    (D5, .5), (E5, .5), (G5, 1), (B5, 1), (A5, .5), (G5, .5),
    (A5, 3), (None, 1),
]
CALL = [
    (B5, 1), (A5, .5), (G5, .5), (D5, 2),
    (Cs6, 1), (B5, .5), (A5, .5), (E5, 2),
    (A5, 1), (Fs5, .5), (A5, .5), (Cs6, 1.5), (A5, .5),
    (B5, 2), (Fs5, 2),
    (G5, .5), (A5, .5), (B5, 1), (D6, 1), (B5, 1),
    (Cs6, .5), (D6, .5), (E6, 1.5), (Cs6, .5), (A5, 1),
    (G5, 1), (B5, 1), (E6, 1), (D6, .5), (B5, .5),
    (Cs6, 2), (A5, 1), (E5, 1),
]
RISE = [(m, .5) for m in (67, 71, 74, 79, 69, 73, 76, 81, 71, 74, 78, 83, 69, 73, 76, 81)] + [(None, 0)]

def lead(notes, start, gain=0.13, up=0):
    n = [(m + up if m else None, l) for m, l in notes]
    t.melody(n, start, gain, duty=0.5, vib=0.008)
    t.melody(n, start, gain * 0.3, duty=0.125)

lead(HOOK, 16)
lead(CALL, 48)
t.melody([(m - 12 if m else None, l) for m, l in CALL], 48.5, 0.04, duty=0.25)   # the answer: a soft echo an octave down
lead(HOOK, 80, 0.11, 12)
t.melody([(m - 3 if m else None, l) for m, l in HOOK], 80, 0.05, duty=0.25)        # harmony below
for k in range(8):                                                                   # bell counter-notes on each bar
    t.pulse(TONES[A_PROG[k]][2] + 24, 1, 80 + k * 4 + 2, 0.03, duty=0.5, decay=4, release=0.4)
t.melody(RISE, 112, 0.09, duty=0.25, release=0.02)
print('sky', round(t.save(os.path.join(OUT, 'sky.wav')), 2), 's')
