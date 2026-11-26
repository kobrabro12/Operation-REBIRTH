"""CARTRIDGE KINGDOM stage theme for Operation REBIRTH, made with chiptune.py - written like an NES tune: two pulse
voices (lead + harmony / arpeggio), a triangle bass and noise drums, nothing else.
Run:  python3 tools/audio/kingdom_music.py OUT_DIR      (writes kingdom.wav)
then  ffmpeg -i kingdom.wav -c:a libvorbis -q:a 4 public/assets/audio/music/kingdom.ogg

"Press Start": 150 BPM, 32 bars (~51 s), loops. C major, a bright overworld march:
  intro (4) - the title fanfare over a bouncing bass   A (8) - the hook, an adventurer's walk
  B (8)     - up to F and Am, a hopping arpeggio        A' (8) - the hook again, harmony a sixth below
  outro (4) - a turnaround that drops back into the intro
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track

OUT = sys.argv[1]
t = Track(150, 128)
ROOT = {'C': 36, 'F': 41, 'G': 43, 'Am': 45, 'Em': 40, 'Dm': 38}
TONES = {'C': [60, 64, 67], 'F': [65, 69, 72], 'G': [67, 71, 74], 'Am': [69, 72, 76], 'Em': [64, 67, 71], 'Dm': [62, 65, 69]}
A = ['C', 'C', 'F', 'C', 'Am', 'F', 'G', 'G']
B = ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G']
SONG = [('intro', c) for c in ['C', 'F', 'G', 'G']] + [('A', c) for c in A] + [('B', c) for c in B] + [('A2', c) for c in A] + [('outro', c) for c in ['F', 'G', 'C', 'G']]

for bar, (sec, ch) in enumerate(SONG):
    b0 = bar * 4; r = ROOT[ch]; tones = TONES[ch]
    # triangle bass: root - fifth bounce, walking up on the last beat of every other bar
    for k, off in enumerate([0, 7, 12, 7, 0, 7, 12, 7]): t.tri(r + off, 0.45, b0 + k * 0.5, 0.6)
    if bar % 2: t.tri(r + 2, 0.25, b0 + 3.5, 0.5); t.tri(r + 4, 0.25, b0 + 3.75, 0.5)
    # pulse 2: an arpeggio in B and the outro, off-beat chord chops elsewhere
    if sec in ('B', 'outro'):
        for k in range(16): t.pulse(tones[k % 3] + (12 if k % 6 >= 3 else 0), 0.2, b0 + k * 0.25, 0.035, duty=0.125, release=0.02)
    elif sec != 'intro':
        for k in range(4):
            for m in tones: t.pulse(m, 0.16, b0 + k + 0.5, 0.03, duty=0.25)
    # noise drums
    for k in range(4):
        t.kick(b0 + k, 0.7 if k % 2 == 0 else 0.45)
        if k % 2: t.snare(b0 + k, 0.45)
        t.hat(b0 + k + 0.5, 0.1)
    if bar in (3, 11, 19, 27, 31):
        for k in range(4): t.snare(b0 + 3 + k * 0.25, 0.25 + k * 0.06)

C5, D5, E5, F5, G5, A5, B5, C6, D6, E6 = 72, 74, 76, 77, 79, 81, 83, 84, 86, 88
G4, A4, B4 = 67, 69, 71
FANFARE = [(C5, .5), (E5, .5), (G5, .5), (C6, 1.5), (None, .5), (B5, .5),
           (A5, .5), (C6, .5), (F5, 1.5), (None, .5), (A5, .5), (G5, .5),
           (B5, .5), (D6, .5), (G5, 1), (D5, .5), (G5, .5), (B5, .5),
           (D6, 2), (None, 2)]
HOOK = [(E5, .5), (G5, .5), (C6, 1), (G5, .5), (E5, .5), (C5, 1),
        (D5, .5), (E5, .5), (F5, .5), (G5, .5), (E5, 2),
        (F5, .5), (A5, .5), (C6, 1), (A5, .5), (F5, .5), (A5, 1),
        (G5, .5), (E5, .5), (C5, .5), (E5, .5), (G5, 2),
        (A5, .5), (C6, .5), (E6, 1), (D6, .5), (C6, .5), (A5, 1),
        (F5, .5), (G5, .5), (A5, .5), (C6, .5), (A5, 2),
        (B5, .5), (A5, .5), (G5, .5), (F5, .5), (E5, .5), (D5, .5), (B4, .5), (G4, .5),
        (D5, 1), (G5, 1), (B5, 1), (D6, 1)]
CLIMB = [(A5, 1), (F5, .5), (A5, .5), (C6, 1), (A5, 1),
         (B5, 1), (G5, .5), (B5, .5), (D6, 1.5), (None, .5),
         (G5, .5), (B5, .5), (E6, 1), (D6, .5), (B5, .5), (G5, 1),
         (A5, .5), (C6, .5), (E6, 1.5), (D6, .5), (C6, 1),
         (D6, .5), (C6, .5), (A5, .5), (F5, .5), (D5, 1), (F5, 1),
         (G5, 1), (B5, 1), (D6, 1.5), (C6, .5),
         (C6, .5), (G5, .5), (E5, .5), (G5, .5), (C6, 1), (E6, 1),
         (D6, 1), (B5, .5), (G5, .5), (D6, 2)]
TURN = [(F5, .5), (A5, .5), (C6, .5), (A5, .5), (G5, .5), (B5, .5), (D6, .5), (B5, .5),
        (C6, .5), (G5, .5), (E5, .5), (C5, .5), (G5, .5), (B5, .5), (D6, 1)]

def lead(notes, start, gain=0.15):
    t.melody(notes, start, gain, duty=0.5, vib=0.006)

lead(FANFARE, 0, 0.13)
lead(HOOK, 16)
lead(CLIMB, 48)
lead(HOOK, 80)
t.melody([(m - 9 if m else None, l) for m, l in HOOK], 80, 0.06, duty=0.25)          # harmony a sixth below
t.melody([(m - 12, l) for m, l in TURN] * 2, 112, 0.1, duty=0.25)
print('kingdom', round(t.save(os.path.join(OUT, 'kingdom.wav')), 2), 's')
