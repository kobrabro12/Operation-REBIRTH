"""The music for GNASH's POP LINES costume's win cutscene (src/scenes/gnashOutros.js), 12 s:

  pop   POP LINES: early-80s New York electro - a boom-bap drum machine with handclaps (112 BPM), a rubbery synth bass,
        a bright square-wave hook; chalk scratches over the bare beat on the subway platform [0], the hook comes in as
        the mural fills with colour [200], the whole band with a high counter-melody for the block party [430], a
        last stab and a scratch [600]

Run:  python3 tools/audio/gnash_outros.py [name ...]  -> public/assets/audio/music/outro_<name>.ogg (bgm_outro_<name>)
(GNASH's other map costumes' outros play their stage's own music.)
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, secs, lp, hp, bp, noise, add, finish, reverb, sq, drum_kick, drum_snare, drum_hat
from n64_stage_music import bass, crash, seq


def clap(vel=1.0):
    """A drum machine handclap: three quick bursts of band-passed noise."""
    n = secs(0.18); out = np.zeros(n)
    for i, d in enumerate((0.0, 0.012, 0.024)):
        m = secs(0.16 - d); t = np.arange(m) / SR
        add(out, bp(noise(m), 900, 2600) * np.exp(-t * (60 if i < 2 else 22)) * (0.6 if i < 2 else 1.0), d)
    return out * vel * 0.6


def scratch(dur=0.3, vel=1.0):
    """A chalk / record scratch: filtered noise swept up and back down."""
    n = secs(dur); t = np.arange(n) / SR; x = noise(n)
    sweep = np.sin(np.pi * t / dur)
    return hp(x, 1500) * sweep * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * t)) * 0.25 * vel


def electro_beat(out, t0, bars, bpm, vel=1.0, claps=True):
    """Boom-bap: kick on 1 and the 'and' of 2, snare + clap on 2 and 4, sixteenth hats."""
    b = 60 / bpm
    for bar in range(bars):
        tb = t0 + bar * 4 * b
        for kq in (0, 1.5, 2.75): add(out, drum_kick(0.9 * vel), tb + kq * b)
        for sq_ in (1, 3):
            add(out, drum_snare(0.55 * vel), tb + sq_ * b)
            if claps: add(out, clap(0.8 * vel), tb + sq_ * b)
        for h in range(16): add(out, drum_hat((0.4 if h % 2 == 0 else 0.22) * vel), tb + h * b / 4)


def pop():
    L = 12.0; out = np.zeros(secs(L)); bpm = 112; b = 60 / bpm
    bassline = [36, 36, 48, 36, 39, 41, 36, 43]                                    # C minor, rubbery
    def bass_bar(t, bar, vel):
        for i, mi in enumerate(bassline): add(out, bass(mi + (5 if bar % 4 == 2 else 0), b * 0.45, vel), t + i * b / 2)
    for i in range(6): add(out, scratch(0.25 + (i % 3) * 0.1, 0.8), 0.2 + i * 0.5)  # [0] chalk scratching on the platform
    electro_beat(out, 0.0, 2, bpm, 0.7, claps=False)
    for bar in range(2): bass_bar(0.0 + bar * 4 * b, bar, 0.5)
    hook = seq('C5:.5 Eb5:.5 G5:.5 Eb5:.25 F5:.75 G5:.5 Bb5:.5 G5:1  C5:.5 Eb5:.5 G5:.5 Bb5:.5 C6:.5 Bb5:.5 G5:1')
    t1 = 3.33                                                                      # [200] the hook as the colour floods in
    t = t1
    for mi, d in hook: add(out, sq(mi, d * b * 0.9, 0.5, 0.25), t); t += d * b
    electro_beat(out, t1, 4, bpm, 0.9)
    for bar in range(4): bass_bar(t1 + bar * 4 * b, bar, 0.7)
    t2 = 7.17                                                                      # [430] the block party: hook + counter-melody
    t = t2
    for mi, d in hook: add(out, sq(mi, d * b * 0.9, 0.55, 0.25), t); add(out, sq(mi + 12, d * b * 0.5, 0.18, 0.125), t + b / 4); t += d * b
    electro_beat(out, t2, 4, bpm, 1.0)
    for bar in range(4): bass_bar(t2 + bar * 4 * b, bar, 0.85)
    t3 = 10.0                                                                      # [600] a last stab and a scratch
    for mi in (48, 55, 60, 63, 67): add(out, sq(mi, 0.6, 0.35, 0.5), t3)
    add(out, crash(0.7), t3); add(out, drum_kick(1.0), t3); add(out, scratch(0.5, 1.0), t3 + 0.6)
    finish(reverb(out, 1.6, 3.0, 0.25), 'pop', fade=1.0)


PIECES = {'pop': pop}
if __name__ == '__main__':
    for nm in (sys.argv[1:] or PIECES): PIECES[nm]()
