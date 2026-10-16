"""Menu music for Operation REBIRTH, made with chiptune.py.
Run:  python3 tools/audio/menu_music.py OUT_DIR      (writes title.wav and select.wav)
then  ffmpeg -i title.wav -c:a libvorbis -q:a 4 title.ogg   (and .mp3) for public/assets/audio/music/

title  - "Rebirth" intro theme: 120 BPM, 10 bars = exactly 20 s, loops. D minor fanfare: a heroic pulse
         lead over a bouncing triangle bass, off-beat chord stabs and a driving beat; the last bar
         ends on the A chord so it leads straight back into the start.
select - fighter select theme: 150 BPM, 16 bars (25.6 s), loops. Bright F major, I-V-vi-IV bounce:
         a catchy hook, a 16th-note arpeggio sparkle, root-fifth bass and a dance beat. The second
         8 bars repeat the hook an octave up with a harmony line under it.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from chiptune import Track

OUT = sys.argv[1]
D, E, F, G, A, Bb, B, C, Cs = 62, 64, 65, 67, 69, 70, 71, 72, 61   # octave-4 names (MIDI)

# ======================================================================= title (intro) theme
t = Track(120, 40)
chords = [('Dm', 38), ('Bb', 34), ('C', 36), ('A', 33), ('Dm', 38), ('Bb', 34), ('Gm', 31), ('A', 33), ('BbC', 34), ('A', 33)]
tones = {'Dm': [D, F, A], 'Bb': [Bb - 12, D, F], 'C': [C - 12, E, G], 'A': [A - 12, Cs, E], 'Gm': [G - 12, Bb - 12, D]}
for bar, (name, root) in enumerate(chords):
    b0 = bar * 4
    for k in range(8):                                   # bass: octave bounce in 8ths
        r = root if name != 'BbC' else (34 if k < 4 else 36)
        t.tri(r + (12 if k % 2 else 0), 0.5, b0 + k * 0.5, 0.55)
    for k in range(4):                                   # off-beat chord stabs
        ch = tones['Bb'] if name == 'BbC' and k < 2 else tones['C'] if name == 'BbC' else tones[name]
        for m in ch: t.pulse(m, 0.22, b0 + k + 0.5, 0.05, duty=0.25)
    for k in range(4):                                   # drums
        (t.kick if k % 2 == 0 else t.snare)(b0 + k)
        t.hat(b0 + k + 0.5)
    if bar == 9:
        for k in range(4): t.snare(b0 + 3 + k * 0.25, 0.4)   # fill into the loop
lead = [
    (D + 12, 1), (A, .5), (D + 12, .5), (F + 12, 1), (E + 12, .5), (D + 12, .5),
    (F + 12, 1.5), (D + 12, .5), (Bb, 2),
    (C, .5), (D + 12, .5), (E + 12, 1), (G + 12, 1), (E + 12, 1),
    (A + 12, 3), (Cs + 12, .5), (E + 12, .5),
    (D + 12, .5), (F + 12, .5), (A + 12, 1), (D + 24, 1.5), (C + 12, .5),
    (Bb + 12, 1), (A + 12, .5), (G + 12, .5), (F + 12, 2),
    (G + 12, 1), (Bb + 12, 1), (A + 12, .5), (G + 12, .5), (F + 12, .5), (E + 12, .5),
    (E + 12, 2), (Cs + 12, 1), (A, 1),
    (D + 12, 1), (F + 12, 1), (E + 12, 1), (G + 12, 1),
    (A + 12, 2), (G + 12, .5), (F + 12, .5), (E + 12, .5), (Cs + 12, .5),
]
t.melody(lead, 0, 0.16, duty=0.5, vib=0.006)
t.melody(lead, 0.0, 0.05, duty=0.125)                     # thin doubling for a fuller, buzzier lead
print('title', round(t.save(os.path.join(OUT, 'title.wav')), 2), 's')

# ======================================================================= fighter select theme
s = Track(150, 64)
prog = [('F', 41), ('C', 36), ('Dm', 38), ('Bb', 34), ('F', 41), ('C', 36), ('Bb', 34), ('C', 36)] * 2
chord_tones = {'F': [F, A, C], 'C': [C - 12, E, G], 'Dm': [D, F, A], 'Bb': [Bb - 12, D, F]}
for bar, (name, root) in enumerate(prog):
    b0 = bar * 4
    for k, off in enumerate([0, 7, 12, 7, 0, 7, 12, 7]):  # root-fifth-octave bounce
        s.tri(root + off, 0.5, b0 + k * 0.5, 0.5)
    ct = chord_tones[name]
    for k in range(16):                                   # 16th-note sparkle arpeggio
        s.pulse(ct[k % 3] + 12 + (12 if k % 6 == 5 else 0), 0.2, b0 + k * 0.25, 0.035, duty=0.125, release=0.02)
    for k in range(4):
        (s.kick if k % 2 == 0 else s.snare)(b0 + k, 0.8 if k % 2 == 0 else 0.5)
        s.hat(b0 + k + 0.5, 0.2, 0.09 if k % 2 else 0.04)    # open hat on the "and" of 2 and 4
        s.hat(b0 + k + 0.25, 0.08); s.hat(b0 + k + 0.75, 0.08)
hook = [
    (A, .5), (C, .5), (F + 12, 1), (E + 12, .5), (F + 12, .5), (G + 12, 1),
    (E + 12, 1.5), (D + 12, .5), (C, 1), (G, 1),
    (F + 12, .5), (E + 12, .5), (D + 12, .5), (C, .5), (D + 12, 1), (A, 1),
    (Bb, .5), (D + 12, .5), (F + 12, 1), (E + 12, .5), (D + 12, .5), (C, 1),
    (A, .5), (C, .5), (F + 12, 1), (A + 12, 1), (G + 12, 1),
    (E + 12, .5), (F + 12, .5), (G + 12, 1), (C + 12, 1), (G + 12, 1),
    (F + 12, .5), (G + 12, .5), (A + 12, .5), (Bb + 12, .5), (A + 12, 1), (G + 12, 1),
    (G + 12, 1.5), (E + 12, .5), (C, 1), (None, 1),
]
s.melody(hook, 0, 0.15, duty=0.5, decay=3.0)
s.melody([(m + 12 if m else None, l) for m, l in hook], 32, 0.11, duty=0.25, decay=3.0)    # hook up an octave
s.melody([(m - 3 if m else None, l) for m, l in hook], 32, 0.06, duty=0.5, decay=3.0)      # harmony underneath
print('select', round(s.save(os.path.join(OUT, 'select.wav')), 2), 's')
