"""The AERO MEADOW stage theme for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/aero_music.py OUT_DIR      (writes aero.wav)
then  ffmpeg -i aero.wav -c:a libvorbis -q:a 5 aero.ogg   (and .mp3) for public/assets/audio/music/

"Clear Skies": 104 BPM, 32 bars (about 74 s), loops. D major with lots of major sevenths and add-nines -
bright, glossy and a little dreamy, like a 2007 desktop wallpaper that you can fight on:
  the pad      - soft, slightly detuned pulse chords with a slow attack, swelling on every bar
  the bells    - a music-box arpeggio running up and down the chord in sixteenths, with an echo
  the bass     - round triangle notes on the root and fifth, gently syncopated
  the drums    - a soft kick and a shaker, a light snare on two and four from bar 9
  the melody   - a breezy lead (bars 9-24), answered an octave up with the echo of a chime
  water drops  - a bright plink now and then, falling a little in pitch
Bars 25-32 thin out to pad, bells and drops, then lift back into the loop.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track, SR

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
BARS = 32
t = Track(104, BARS * 4)

# chords per bar (midi notes): Dmaj7 - Bm9 - Gmaj7 - A6/9 ... and a lift to Em9 - F#m7 in the second half
CH = {'D': [50, 54, 57, 61], 'Bm': [47, 50, 54, 61], 'G': [43, 47, 50, 54], 'A': [45, 49, 52, 59], 'Em': [40, 43, 47, 54], 'F#m': [42, 45, 49, 52]}
PROG = ['D', 'Bm', 'G', 'A'] * 4 + ['G', 'A', 'F#m', 'Bm', 'Em', 'A', 'D', 'D'] + ['G', 'A', 'D', 'Bm', 'G', 'Em', 'A', 'A']
assert len(PROG) == BARS

for bar, name in enumerate(PROG):
    ch = CH[name]
    # the pad: each chord tone on a soft pulse, two of them detuned so it shimmers
    for i, m in enumerate(ch):
        t.pulse(m + 12, 3.9, bar * 4, 0.035, duty=0.5, attack=0.25, release=0.4, vib=0.004)
        if i % 2: t.pulse(m + 12.1, 3.9, bar * 4, 0.02, duty=0.25, attack=0.3, release=0.4)
    # the bells: up and down the chord, two octaves up, sixteenths, with an echo three sixteenths later
    arp = [ch[0], ch[1], ch[2], ch[3], ch[2] + 12, ch[3], ch[2], ch[1]]
    for i in range(16):
        if bar >= 28 and i % 2: continue
        m = arp[i % 8] + 24
        t.pulse(m, 0.22, bar * 4 + i * 0.25, 0.04, duty=0.125, decay=7, release=0.05)
        t.pulse(m, 0.22, bar * 4 + i * 0.25 + 0.75, 0.016, duty=0.125, decay=7, release=0.05)
    # the bass: root on the one, fifth on the and-of-two, root on four
    if bar >= 2 and bar < 28 or bar >= 30:
        r = ch[0] - 12 if ch[0] > 44 else ch[0]
        for beat, m, l in ((0, r, 1.4), (1.5, r + 7, 1.0), (3, r, 0.8)):
            t.tri(m, l, bar * 4 + beat, 0.42)
    # drums
    if 4 <= bar < 28 or bar >= 30:
        for b in range(4):
            beat = bar * 4 + b
            if b in (0, 2): t.kick(beat, 0.45)
            if bar >= 8 and b in (1, 3): t.snare(beat, 0.2)
            t.hat(beat + 0.5, 0.06, length=0.06)
            t.hat(beat + 0.25, 0.025); t.hat(beat + 0.75, 0.025)

# the melody (bars 9-24) and its chime answer an octave up
A = [(74, 1.5), (76, 0.5), (78, 1), (81, 1), (79, 2), (78, 1), (76, 1), (74, 1.5), (73, 0.5), (71, 2), (None, 1), (69, 1),
     (71, 1), (73, 1), (74, 1), (76, 1), (78, 3), (None, 1)]
B = [(81, 1.5), (83, 0.5), (85, 1), (81, 1), (79, 2), (78, 2), (76, 1.5), (78, 0.5), (79, 1), (83, 1), (81, 3), (None, 1),
     (79, 1), (78, 1), (76, 1), (74, 1), (73, 2), (74, 2)]
t.melody(A, 32, 0.12, duty=0.25, vib=0.006, release=0.12, attack=0.01)
t.melody(B, 48, 0.12, duty=0.25, vib=0.006, release=0.12, attack=0.01)
t.melody(A, 64, 0.11, duty=0.25, vib=0.006, release=0.12, attack=0.01)
t.melody(B, 80, 0.11, duty=0.25, vib=0.006, release=0.12, attack=0.01)
for start, notes in ((40, A), (88, B)):                       # the chime: the phrase's long notes, an octave up, echoing
    b = start
    for m, l in notes:
        if m is not None and l >= 1.5:
            t.pulse(m + 12, 0.5, b, 0.05, duty=0.125, decay=5, release=0.1)
            t.pulse(m + 12, 0.5, b + 0.75, 0.02, duty=0.125, decay=5, release=0.1)
        b += l

# water drops: bright plinks that fall in pitch
n = int(0.12 * SR); tt = np.arange(n) / SR
for beat in (6, 23, 37, 52, 66, 79, 95, 101, 110, 117, 124):
    f = 2400 * np.exp(-tt * 9) + 900
    ph = np.cumsum(f) / SR
    t.add(np.where((ph % 1) < 0.5, 1.0, -1.0) * np.exp(-tt * 30), beat + 0.25, 0.05)

secs = t.save(os.path.join(OUT, 'aero.wav'))
print('aero.wav', round(secs, 1), 's')
