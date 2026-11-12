"""The TROPHY HALL's music (Trinkets > TROPHY HALL, src/scenes/TrophyHallScene.js): "The Empty Hall", ~48 s, loops.

A slow, reverent piece for a vast marble gallery: a pipe organ (additive pipes with a little chorus) holding the
chords in D major, a wordless choir pad above it, a pedal bass, and a melody on tubular bells that rings down the
hall - all through a long cathedral reverb. 60 BPM, 4 bars of 4 per phrase, three phrases (the last one fuller).

Run:  python3 tools/audio/trophy_hall_music.py  -> public/assets/audio/music/trophy_hall.ogg (bgm_trophy_hall)
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, secs, hz, lp, bp, add, adsr, reverb, finish, OUT


def organ(midi, dur, vel=1.0):
    """A pipe-organ note: 8', 4', 2 2/3', 2' and a soft 16' pipe, two slightly detuned ranks, a breathy attack."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi); x = np.zeros(n)
    for r, a in [(0.5, 0.35), (1, 1.0), (2, 0.55), (3, 0.25), (4, 0.22), (6, 0.08), (8, 0.06)]:
        for d in (1.0, 1.0025):
            x += a * np.sin(2 * np.pi * f * r * d * t + r)
    x += lp(np.random.default_rng(midi).standard_normal(n), 3000) * 0.04 * np.exp(-t * 8)   # the chiff of air
    return x * adsr(n, 0.12, 0, 1, 0.5) * vel / 6


def choir(midis, dur, vel=1.0):
    """A wordless 'aah' choir: detuned saws through two vowel formants, swelling in slowly."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for m in midis:
        for d in (-0.07, 0, 0.06):
            f = hz(m + d) * (1 + 0.004 * np.sin(2 * np.pi * 5.1 * t + m))
            x += 2 * ((np.cumsum(f) / SR) % 1) - 1
    y = bp(x, 650, 1100) + 0.6 * bp(x, 1100, 1300) + 0.3 * lp(x, 400)
    return y * adsr(n, dur * 0.4, 0, 1, dur * 0.35) * vel / (len(midis) * 3)


def bell(midi, dur=5.0, vel=1.0):
    """A tubular bell: bright inharmonic partials, a long ring."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi); x = np.zeros(n)
    for r, a, d in [(1, 1, 0.7), (2.0, 0.5, 1.0), (3.0, 0.35, 1.4), (4.2, 0.3, 2.0), (5.4, 0.2, 2.6), (0.5, 0.25, 0.5)]:
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d)
    m = secs(0.004); x[:m] *= np.linspace(0, 1, m)
    return x * vel * 0.5


def hall():
    b = 1.0                                                                          # one beat (60 BPM)
    chords = [  # (bass, organ chord, choir) per bar - D  Bm  G  A  |  G  D/F#  Em  A  |  D  Bm  G  A(sus->A)  D
        (38, [62, 66, 69], [74, 78, 81]), (35, [62, 66, 71], [74, 78, 83]), (31, [62, 67, 71], [74, 79, 83]), (33, [61, 64, 69], [73, 76, 81]),
        (31, [62, 67, 71], [74, 79, 83]), (30, [62, 66, 69], [74, 78, 81]), (28, [64, 67, 71], [76, 79, 83]), (33, [61, 64, 69], [73, 76, 81]),
        (38, [62, 66, 69], [74, 78, 81]), (35, [62, 66, 71], [74, 78, 83]), (31, [62, 67, 71], [74, 79, 83]), (33, [62, 64, 69], [74, 76, 81]),
    ]
    L = len(chords) * 4 * b
    out = np.zeros(secs(L + 0.5))
    for i, (bass, org, ch) in enumerate(chords):
        t0 = i * 4 * b
        add(out, organ(bass - 12, 4 * b + 0.4, 0.9), t0)                             # the pedal
        for m in org: add(out, organ(m, 4 * b + 0.4, 0.55 if i < 8 else 0.7), t0)
        add(out, choir(ch, 4 * b + 0.6, 0.6 if i < 4 else 0.9), t0)
    melody = [  # (beat, midi) - the bells, ringing down the hall
        (0, 81), (2, 78), (3, 76), (4, 74), (6, 78), (8, 79), (10, 81), (11, 83), (12, 81), (14, 76),
        (16, 79), (18, 78), (19, 76), (20, 74), (22, 69), (24, 71), (26, 74), (27, 76), (28, 73), (30, 76),
        (32, 81), (33, 83), (34, 86), (36, 83), (38, 81), (40, 79), (41, 81), (42, 83), (44, 81), (46, 78), (47, 76),
    ]
    for beat, m in melody: add(out, bell(m, 5.0, 0.8 if beat < 32 else 1.0), beat * b + 0.02)
    for beat in range(0, 48, 8): add(out, bell(50, 6.0, 0.35), beat * b)              # a deep bell on every phrase
    out = reverb(lp(out, 7000), 4.5, 1.1, 0.55, pre=0.05, bright=4500)
    finish(out, 'trophy_hall_tmp', peak=0.8, fade=0.6)
    for ext in ('ogg', 'mp3'):
        src = os.path.join(OUT, 'outro_trophy_hall_tmp.' + ext)
        if ext == 'ogg': os.replace(src, os.path.join(OUT, 'trophy_hall.ogg'))
        elif os.path.exists(src): os.remove(src)                                      # (the build makes the MP3)


if __name__ == '__main__':
    hall()
