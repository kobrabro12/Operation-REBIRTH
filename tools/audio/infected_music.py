"""The INFECTED.EXE stage theme for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/infected_music.py OUT_DIR      (writes infected.wav)
then  ffmpeg -i infected.wav -c:a libvorbis -q:a 5 infected.ogg   (and .mp3) for public/assets/audio/music/

"Payload": 150 BPM, 32 bars (about 51 s), loops. E minor, fast and twitchy, like a machine that's lost
control of itself:
  bars 1-8    boot up: a dial-up modem screech, then the bass starts driving eighth notes
  bars 9-16   the main riff on a thin 25% pulse, a second pulse an octave down answering it
  bars 17-24  the pop-ups: a bright, mocking three-note "ha-ha-ha" figure over a bouncing bass
  bars 25-32  the red room: everything drops to a low drone and a slow minor line, then builds back
Here and there a beat gets caught and stutters (the buffer is copied over itself), like a frozen PC.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track, SR

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
BARS = 32
t = Track(150, BARS * 4)
rng = np.random.default_rng(11)

# ---- boot: a dial-up handshake screech over the first bar and a half
n = int(t.beat * 6 * SR); tt = np.arange(n) / SR
f = np.where(tt < 0.5, 1200 + 800 * np.sign(np.sin(2 * np.pi * 9 * tt)), 2100 + 600 * np.sin(2 * np.pi * 37 * tt)) + rng.uniform(-200, 200, n) * (tt > 1.0)
ph = np.cumsum(f) / SR
modem = np.where((ph % 1) < 0.5, 1.0, -1.0) * np.minimum(1, tt * 20) * np.clip((n / SR - tt) * 4, 0, 1)
t.add(modem, 0, 0.12)
t.add(rng.choice([-1.0, 1.0], n) * np.clip((tt - 1.2) * 3, 0, 1) * np.clip((n / SR - tt) * 4, 0, 1), 0, 0.06)

# ---- bass: driving eighths. Roots per bar.
ROOTS = ([40, 40, 43, 45] * 2 + [40, 40, 36, 38] * 2 + [45, 45, 43, 43, 40, 40, 47, 47] + [40, 40, 41, 41, 40, 40, 47, 47])
for bar, r in enumerate(ROOTS):
    if bar < 2: continue
    red = 24 <= bar < 30
    for i in range(8 if not red else 2):
        m = r + (12 if (i % 2 and not red and 16 <= bar < 24) else 0)
        t.tri(m, 0.5 if not red else 2, bar * 4 + i * (0.5 if not red else 2), 0.5)

# ---- drums
for bar in range(2, BARS):
    red = 24 <= bar < 30
    for b in range(4):
        beat = bar * 4 + b
        if red:
            if b == 0: t.kick(beat, 0.7)
            continue
        t.kick(beat, 0.8 if b % 2 == 0 else 0.55)
        if b % 2: t.snare(beat, 0.45)
        t.hat(beat + 0.5, 0.12)
        if bar >= 8: t.hat(beat + 0.25, 0.06); t.hat(beat + 0.75, 0.06)
    if bar % 8 == 7 and not red:                               # a fill into the next section
        for k in range(4): t.snare(bar * 4 + 3 + k * 0.25, 0.3 + k * 0.08)

# ---- the main riff (bars 9-16), 25% pulse, answered an octave down
RIFF = [(64, 0.5), (67, 0.5), (71, 0.5), (74, 0.5), (72, 1), (71, 0.5), (67, 0.5),
        (69, 0.5), (71, 0.5), (69, 0.5), (67, 0.5), (64, 1.5), (None, 0.5),
        (64, 0.5), (67, 0.5), (71, 0.5), (76, 0.5), (75, 1), (74, 0.5), (71, 0.5),
        (72, 0.5), (71, 0.5), (69, 0.5), (66, 0.5), (67, 1), (66, 1)]
t.melody(RIFF, 32, 0.15, duty=0.25, release=0.02)
t.melody(RIFF, 48, 0.15, duty=0.25, release=0.02)
t.melody([(m - 12 if m else None, l) for m, l in RIFF], 48, 0.08, duty=0.5, release=0.02)

# ---- the pop-ups (bars 17-24): a bright mocking "ha-ha-ha" figure, bouncing between registers
HA = [(76, 0.25), (None, 0.25), (79, 0.25), (None, 0.25), (83, 0.5), (None, 0.5)]
for bar in range(16, 24):
    shift = [0, 0, -2, -2, 0, 0, 3, 3][bar - 16]
    t.melody([(m + shift if m else None, l) for m, l in HA], bar * 4, 0.12, duty=0.125, release=0.02)
    t.melody([(m + shift - 12 if m else None, l) for m, l in HA], bar * 4 + 2, 0.1, duty=0.25, release=0.02)

# ---- the red room (bars 25-32): a slow minor line, with vibrato, over the drone
RED = [(64, 4), (65, 4), (64, 2), (63, 2), (64, 4), (60, 4), (59, 4), (64, 4), (71, 2), (70, 2)]
t.melody(RED, 96, 0.16, duty=0.5, vib=0.01, release=0.2, attack=0.05)
for k in range(16):                                            # the build back: rising eighths in the last two bars
    t.pulse(52 + k, 0.4, 120 + k * 0.5, 0.06 + k * 0.004, duty=0.25, release=0.02)

# ---- freezes: a slice of the buffer copied over itself a few times
def stutter(beat, slice_beats, repeats):
    i = t.at(beat); L = t.at(slice_beats)
    chunk = t.out[i:i + L].copy()
    for r in range(1, repeats): t.out[i + r * L:i + (r + 1) * L] = chunk
for beat in (31, 63, 79, 95):
    stutter(beat, 0.125, 8)

secs = t.save(os.path.join(OUT, 'infected.wav'))
print('infected.wav', round(secs, 1), 's')
