"""The Backrooms stage theme for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/backrooms_music.py OUT_DIR      (writes backrooms.wav)
then  ffmpeg -i backrooms.wav -c:a libvorbis -q:a 5 backrooms.ogg   (and .mp3) for public/assets/audio/music/

"Fluorescent": 84 BPM, 32 bars (about 91 s), loops. A minor with a flat second and a tritone - empty,
humming, not quite right, with a slow pulse underneath so it still moves for a fight:
  the hum      - the lights: a 120 Hz buzz that never stops, stuttering now and then
  the drone    - triangle bass on the root, sliding down a semitone every 4 bars and back
  the pulse    - a soft, muffled kick on every beat with an off-beat tick, like distant footsteps
  the melody   - two square waves a few cents apart (so it beats and wobbles), long notes with vibrato
  music box    - sparse high notes with a long echo, as if from another room
  second half  - the melody climbs, a thin arpeggio joins, and the hum gets louder
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track, SR

OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
BARS = 32
t = Track(84, BARS * 4)

# ---- the hum of the lights: 120 Hz square + a little noise, with stutters
n = t.n; tt = np.arange(n) / SR
hum = np.where(((tt * 120) % 1) < 0.5, 1.0, -1.0) * 0.5 + np.where(((tt * 240) % 1) < 0.3, 1.0, -1.0) * 0.18
rng = np.random.default_rng(3)
hum += rng.uniform(-1, 1, n) * 0.06
stutter = np.ones(n)
for s in rng.integers(0, n - SR, 18):                       # flickers: the buzz drops out for a split second
    stutter[s:s + int(SR * rng.uniform(0.03, 0.12))] = 0.15
swell = 0.07 + 0.05 * (tt / tt[-1])                         # louder through the loop... (it wraps back quietly)
t.out += hum * stutter * swell

# ---- drone: A, then down to Ab (the flat), back, then the tritone Eb under the second half
ROOTS = [33, 33, 32, 33, 33, 33, 32, 27]                     # one per 4 bars
for i, r in enumerate(ROOTS):
    for b in range(4):
        t.tri(r, 4, (i * 4 + b) * 4, 0.42)

# ---- pulse: muffled kick on every beat, a tick off the beat (from bar 3)
for beat in range(BARS * 4):
    if beat >= 8: t.kick(beat, 0.32)
    if beat >= 8 and beat % 2: t.hat(beat + 0.5, 0.06)
    if beat >= 64 and beat % 4 == 3: t.snare(beat + 0.5, 0.12)

# ---- the melody: long notes, two pulses slightly out of tune with each other
A = [(69, 3), (68, 1), (64, 4), (None, 2), (65, 2), (64, 2), (63, 2), (64, 6), (None, 2),
     (69, 3), (70, 1), (69, 2), (65, 2), (64, 8)]
B = [(76, 3), (75, 1), (71, 4), (None, 2), (72, 2), (71, 2), (70, 2), (69, 6), (None, 2),
     (76, 2), (77, 2), (75, 4), (70, 4), (69, 8)]
def lead(notes, start, gain):
    b = start
    for m, length in notes:
        if m is not None:
            t.pulse(m, length * 0.92, b, gain, duty=0.25, vib=0.006, release=0.2, attack=0.05)
            t.pulse(m + 0.12, length * 0.92, b, gain * 0.6, duty=0.5, vib=0.004, release=0.2, attack=0.08)   # a few cents sharp: it beats
        b += length
lead(A, 16, 0.16); lead(A, 48, 0.16); lead(B, 80, 0.15); lead(B, 112, 0.15)

# ---- music box from another room: sparse high notes with a long echo
BOX = [(81, 4), (88, 10), (84, 18), (81, 30), (87, 44), (84, 58), (93, 70), (88, 86), (84, 98), (81, 110), (87, 122)]
for m, beat in BOX:
    for e, g in enumerate((0.09, 0.05, 0.028, 0.014)):
        t.pulse(m, 0.25, beat + e * 0.75, g, duty=0.125, decay=8, release=0.1)

# ---- second half: a thin arpeggio creeping in
ARP = [57, 60, 64, 63]
for bar in range(16, BARS):
    for i in range(8):
        t.pulse(ARP[i % 4] + (12 if bar >= 24 and i % 2 else 0), 0.4, bar * 4 + i * 0.5, 0.035, duty=0.125, release=0.05)

secs = t.save(os.path.join(OUT, 'backrooms.wav'))
print('backrooms.wav', round(secs, 1), 's')
