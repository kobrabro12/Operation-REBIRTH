"""The music for NU's and AERO's beach costumes' win cutscenes (src/scenes/beachOutros.js), 12 s each:

  surf   SURF ROCK: a reverb-drenched twangy guitar riding a galloping surf beat (E minor, 168 BPM), a tremolo-picked
         run as he catches the wave [200], the band kicking in for the bonfire show [430], a last big chord [600]
  tide   TIDE POOL: waves on the shore, a lazy steel-drum and marimba tune in C (100 BPM) [0], it goes muffled and
         bubbly underwater [200], back up into the warm air for the low tide [430], a final shimmer [600]

Run:  python3 tools/audio/beach_outros.py [name ...]  -> public/assets/audio/music/outro_<name>.ogg (bgm_outro_<name>)
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, secs, lp, hp, bp, noise, add, finish, reverb, twang, drum_kick, drum_snare, drum_hat
from n64_stage_music import marimba, steel, bass, chime, crash, seq


def surf_beat(out, t0, bars, bpm, vel=1.0):
    """The galloping surf drum beat: kick on 1 and 3, snare on 2 and 4, eighth-note hats, a tom-ish fill every 4th bar."""
    b = 60 / bpm
    for bar in range(bars):
        for q in range(4):
            tt = t0 + (bar * 4 + q) * b
            add(out, drum_kick(0.8 * vel) if q % 2 == 0 else drum_snare(0.6 * vel), tt)
            add(out, drum_hat(0.5 * vel), tt); add(out, drum_hat(0.35 * vel), tt + b / 2)
        if bar % 4 == 3:
            for i in range(4): add(out, drum_snare(0.3 + i * 0.1), t0 + (bar * 4 + 3 + i / 4) * b)


def surf():
    L = 12.0; out = np.zeros(secs(L)); bpm = 168; b = 60 / bpm
    out += lp(noise(secs(L)), 500) * 0.04                                          # the sea, under it all
    riff = seq('E4:.5 E4:.5 G4:.5 E4:.5 A4:.5 E4:.5 B4:.5 A4:.5  E4:.5 E4:.5 G4:.5 E4:.5 D5:.5 B4:.5 A4:.5 G4:.5')
    t = 0.2
    for rep in range(2):                                                           # [0] the walk: the twangy riff, sparse
        for mi, d in riff: add(out, twang(mi, d * b * 1.6, 0.8), t); t += d * b
    for bar in range(8): add(out, bass(40 + (0 if bar % 2 == 0 else 3), 4 * b * 0.9, 0.6), 0.2 + bar * 4 * b * 0.5)
    t1 = 3.33                                                                      # [200] the ride: tremolo-picked run up the neck
    for i, mi in enumerate([52, 55, 57, 59, 62, 64, 67, 69, 71, 74, 76, 79]):
        for k in range(6): add(out, twang(mi, 0.09, 0.6), t1 + i * 0.25 + k * 0.04)
    surf_beat(out, t1, 8, bpm, 0.8)
    for bar in range(8): add(out, bass([40, 43, 45, 47][bar % 4], 4 * b, 0.8), t1 + bar * 4 * b)
    t2 = 7.17                                                                      # [430] the show: the riff with the whole band
    t = t2
    for mi, d in riff + riff[:8]: add(out, twang(mi, d * b * 1.4, 1.0), t); add(out, twang(mi + 12, d * b, 0.35), t); t += d * b
    surf_beat(out, t2, 5, bpm, 1.0)
    for bar in range(5): add(out, bass([40, 45, 47, 40, 40][bar], 4 * b, 0.9), t2 + bar * 4 * b)
    t3 = 10.0                                                                      # [600] a last big chord, ringing out
    for mi in (40, 47, 52, 55, 59, 64): add(out, twang(mi, 2.0, 0.6), t3)
    add(out, crash(0.8), t3); add(out, drum_kick(1.0), t3)
    finish(reverb(out, 2.4, 2.4, 0.4), 'surf', fade=1.0)


def tide():
    L = 12.0; out = np.zeros(secs(L)); bpm = 100; b = 60 / bpm
    for k in range(6):                                                             # waves breaking on the shore
        n = secs(2.2); tt = np.arange(n) / SR
        add(out, lp(noise(n), 1200) * np.sin(np.pi * tt / 2.2) ** 2 * 0.18, k * 2.0)
    tune = seq('E5:1 G5:.5 A5:.5 G5:1 E5:1  C5:1 D5:.5 E5:.5 D5:2  E5:1 G5:.5 A5:.5 C6:1 A5:1  G5:1.5 E5:.5 C5:2')
    t = 0.3
    for mi, d in tune[:9]: add(out, steel(mi, 1.2, 0.9), t); t += d * b              # [0] steel drum on the shore
    for i in range(8): add(out, marimba([48, 52, 55, 52][i % 4], 0.6, 0.5), 0.3 + i * b)
    under = np.zeros(secs(4.0)); t = 0.0                                           # [200] underwater: muffled and bubbly
    for mi, d in tune[9:]: add(under, steel(mi, 1.4, 0.9), t); t += d * b
    for i in range(30): add(under, steel(84 + (i * 5) % 12, 0.15, 0.15), i * 0.13)
    add(out, lp(under, 900) * 1.3, 3.33)
    t = 7.17                                                                       # [430] the low tide: back in the air
    for mi, d in tune: add(out, steel(mi, 1.2, 0.8), t); add(out, marimba(mi - 12, 0.5, 0.4), t); t += d * b * 0.7
    for i in range(8): add(out, bass([36, 41, 43, 36][i % 4], b * 1.8, 0.5), 7.17 + i * b * 2 * 0.7)
    add(out, chime(1.0), 10.0)                                                     # [600] a final shimmer
    finish(reverb(out, 2.6, 2.2, 0.38), 'tide', fade=1.2)


PIECES = {'surf': surf, 'tide': tide}
if __name__ == '__main__':
    for nm in (sys.argv[1:] or PIECES): PIECES[nm]()
