"""Neon Arcade stage theme for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/arcade_music.py OUT_DIR      (writes arcade.wav)
then  ffmpeg -i arcade.wav -c:a libvorbis -q:a 5 arcade.ogg   (and .mp3) for public/assets/audio/music/

"Insert Coin": 160 BPM, 32 bars = 48 s, loops. E minor, a driving arcade-boss anthem:
  intro (4 bars)  - pumping octave bass, four-on-the-floor kick and a rising arpeggio, snare roll in
  A     (8 bars)  - the hook: i - VI - VII - V (Em C D B) with a buzzy doubled lead
  B     (8 bars)  - climbs higher over Am Em C D | Am Em B B, syncopated bass, bigger drums
  A'    (8 bars)  - the hook again with a harmony line and off-beat chord stabs
  outro (4 bars)  - a fast 16th-note riff that winds back into the intro for a seamless loop
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track

OUT = sys.argv[1]
t = Track(160, 128)

ROOT = {'Em': 40, 'C': 36, 'D': 38, 'B': 35, 'Am': 45}
TONES = {'Em': [64, 67, 71], 'C': [60, 64, 67], 'D': [62, 66, 69], 'B': [59, 63, 66], 'Am': [57, 60, 64]}
A_PROG = ['Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B']
B_PROG = ['Am', 'Em', 'C', 'D', 'Am', 'Em', 'B', 'B']
SONG = [('intro', c) for c in ['Em', 'C', 'D', 'B']] + [('A', c) for c in A_PROG] + [('B', c) for c in B_PROG] + \
       [('A2', c) for c in A_PROG] + [('outro', c) for c in ['Em', 'C', 'D', 'B']]

for bar, (sec, ch) in enumerate(SONG):
    b0 = bar * 4
    root, tones = ROOT[ch], TONES[ch]
    # ---- bass: pumping 8th-note octaves (syncopated in B)
    pattern = [0, 12, 0, 12, 0, 12, 0, 12] if sec != 'B' else [0, 0, 12, 0, 0, 12, 0, 12]
    for k, off in enumerate(pattern): t.tri(root + off, 0.5, b0 + k * 0.5, 0.55)
    # ---- 16th-note arpeggio sparkle, rising through the chord
    for k in range(16):
        m = tones[k % 3] + 12 + (12 if (k // 3) % 2 and sec in ('B', 'A2', 'outro') else 0)
        t.pulse(m, 0.2, b0 + k * 0.25, 0.03 if sec != 'intro' else 0.02 + 0.005 * bar, duty=0.125, release=0.02)
    # ---- off-beat chord stabs in A' and B
    if sec in ('A2', 'B'):
        for k in range(4):
            for m in tones: t.pulse(m, 0.18, b0 + k + 0.5, 0.035, duty=0.25)
    # ---- drums
    for k in range(4):
        t.kick(b0 + k, 0.85)
        if sec != 'intro' and k % 2: t.snare(b0 + k, 0.55)
        t.hat(b0 + k + 0.5, 0.16, 0.09)                     # open hat on the off-beat
        for q in (0.25, 0.75): t.hat(b0 + k + q, 0.07)
    if sec == 'B' and bar % 2: t.kick(b0 + 3.5, 0.6)         # extra push in B
    if (sec, bar) in (('intro', 3), ('A', 11), ('B', 19), ('A2', 27)):
        for k in range(8): t.snare(b0 + 2 + k * 0.25, 0.25 + k * 0.04)   # fill into the next section

E5, Fs5, G5, A5, B5, C6, D6, Ds6, E6 = 76, 78, 79, 81, 83, 84, 86, 87, 88
B4, D5, Ds5 = 71, 74, 75
HOOK = [
    (E5, .5), (B4, .5), (E5, .5), (Fs5, .5), (G5, 1), (Fs5, .5), (E5, .5),
    (D5, .5), (E5, .5), (G5, 1), (E5, .5), (D5, .5), (72, 1),
    (D5, 1.5), (Fs5, .5), (A5, 1), (Fs5, .5), (D5, .5),
    (Ds5, 1), (Fs5, 1), (B5, 1.5), (A5, .5),
    (G5, .5), (Fs5, .5), (E5, 1), (B4, .5), (E5, .5), (G5, 1),
    (E5, .5), (G5, .5), (C6, 1), (B5, .5), (A5, .5), (G5, 1),
    (Fs5, .5), (G5, .5), (A5, 1), (D6, 1), (C6, .5), (A5, .5),
    (B5, 2), (A5, .5), (Fs5, .5), (Ds5, .5), (B4, .5),
]
CLIMB = [
    (A5, 1), (E5, .5), (A5, .5), (C6, 1), (B5, .5), (A5, .5),
    (G5, 1.5), (E5, .5), (B4, 1), (E5, 1),
    (C6, .5), (B5, .5), (G5, .5), (E5, .5), (G5, 1), (C6, 1),
    (D6, 1.5), (C6, .5), (A5, 1), (Fs5, 1),
    (A5, .5), (C6, .5), (E6, 1), (D6, .5), (C6, .5), (A5, 1),
    (B5, 1), (G5, .5), (E5, .5), (G5, .5), (B5, .5), (E6, 1),
    (Ds6, 1), (B5, .5), (Fs5, .5), (A5, 1), (Fs5, 1),
    (Ds5, .5), (Fs5, .5), (A5, .5), (B5, .5), (Ds6, 2),
]
RIFF = [(m, .25) for bar in ([64, 67, 71, 76], [60, 64, 67, 72], [62, 66, 69, 74], [59, 63, 66, 71]) for m in (bar * 4)]

def lead(notes, start, gain=0.15):
    t.melody(notes, start, gain, duty=0.5, vib=0.007)
    t.melody(notes, start, gain * 0.35, duty=0.125)          # thin doubling: a fuller, buzzier lead

lead(HOOK, 16)
lead(CLIMB, 48)
lead(HOOK, 80)
t.melody([(m - 4 if m else None, l) for m, l in HOOK], 80, 0.06, duty=0.25)   # harmony under the second hook
t.melody([(m + 12, l) for m, l in RIFF], 112, 0.09, duty=0.25, release=0.015)
print('arcade', round(t.save(os.path.join(OUT, 'arcade.wav')), 2), 's')
