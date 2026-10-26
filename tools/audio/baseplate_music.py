"""The BASEPLATE 2012 stage theme for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/baseplate_music.py OUT_DIR      (writes baseplate.wav)
then  ffmpeg -i baseplate.wav -c:a libvorbis -q:a 5 baseplate.ogg   (and .mp3) for public/assets/audio/music/

"Meet At Spawn": 128 BPM, 32 bars (about 60 s), loops. An original, bouncy C major tune in the spirit of the
cheerful lobby music of 2010s block-building games - the kind that played while you jumped around a baseplate
waiting for someone to sword fight:
  the bass     - a bouncing octave triangle bass, root and octave on every eighth
  the chords   - short staccato pulse stabs on the off-beats (ska-ish skank)
  the drums    - four-on-the-floor kick, snare on two and four, open hats on the and
  the melody   - a hooky, singable square lead (bars 5-20), then a higher answer (21-28)
  the blips    - little coin-like arpeggio blips at the end of each 4-bar phrase
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
BARS = 32
t = Track(128, BARS * 4)

CH = {'C': [48, 52, 55], 'G': [43, 47, 50], 'Am': [45, 48, 52], 'F': [41, 45, 48], 'Dm': [50, 53, 57], 'E': [52, 56, 59]}
PROG = (['C', 'G', 'Am', 'F'] * 5 + ['F', 'G', 'C', 'Am', 'Dm', 'G', 'E', 'G'] + ['C', 'G', 'F', 'G'])
assert len(PROG) == BARS

for bar, name in enumerate(PROG):
    ch = CH[name]
    root = ch[0] - 12 if ch[0] > 45 else ch[0]
    # the bass: bouncing root / octave eighths
    if bar >= 1:
        for i in range(8):
            t.tri(root + (12 if i % 2 else 0), 0.4, bar * 4 + i * 0.5, 0.38)
    # the chord stabs on the off-beats
    if bar >= 2:
        for b in range(4):
            for m in ch: t.pulse(m + 12, 0.18, bar * 4 + b + 0.5, 0.03, duty=0.25, decay=6, release=0.03)
    # drums
    if bar >= 2 and not (bar in (28, 29)):
        for b in range(4):
            beat = bar * 4 + b
            t.kick(beat, 0.5)
            if b in (1, 3): t.snare(beat, 0.24)
            t.hat(beat + 0.5, 0.07, length=0.08)
    # the blip at the end of every 4 bars: a quick coin-like arpeggio
    if bar % 4 == 3:
        for i, m in enumerate([72, 76, 79, 84]):
            t.pulse(m, 0.12, bar * 4 + 3 + i * 0.125, 0.06, duty=0.125, decay=8, release=0.02)

# the melody: two hooky 4-bar phrases (bars 5-20), then a higher answer (bars 21-28)
A = [(72, 0.5), (72, 0.5), (76, 0.5), (79, 0.5), (81, 1), (79, 1),
     (76, 0.5), (74, 0.5), (76, 1), (71, 1), (None, 1),
     (72, 0.5), (74, 0.5), (76, 0.5), (77, 0.5), (76, 1), (72, 1),
     (74, 1.5), (72, 0.5), (69, 2)]
B = [(79, 0.5), (79, 0.5), (81, 0.5), (79, 0.5), (76, 1), (72, 1),
     (74, 0.5), (76, 0.5), (77, 1), (74, 1), (None, 1),
     (76, 0.5), (77, 0.5), (79, 0.5), (84, 0.5), (83, 1), (79, 1),
     (77, 1), (76, 1), (72, 2)]
C = [(84, 1), (83, 0.5), (81, 0.5), (79, 1), (76, 1), (77, 1), (79, 1), (81, 2),
     (79, 1), (77, 0.5), (76, 0.5), (74, 1), (79, 1), (83, 2), (79, 2),
     (84, 1), (83, 0.5), (81, 0.5), (79, 1), (81, 1), (83, 1), (84, 1), (86, 2),
     (84, 1), (83, 1), (79, 1), (83, 1), (84, 4)]
t.melody(A, 16, 0.11, duty=0.5, vib=0.004, release=0.06)
t.melody(B, 32, 0.11, duty=0.5, vib=0.004, release=0.06)
t.melody(A, 48, 0.11, duty=0.5, vib=0.004, release=0.06)
t.melody(B, 64, 0.11, duty=0.5, vib=0.004, release=0.06)
t.melody(C, 80, 0.10, duty=0.25, vib=0.006, release=0.08)
t.melody(A, 112, 0.09, duty=0.5, vib=0.004, release=0.06)

secs = t.save(os.path.join(OUT, 'baseplate.wav'))
print('baseplate.wav', round(secs, 1), 's')
