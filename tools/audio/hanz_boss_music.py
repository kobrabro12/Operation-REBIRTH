"""HANZ & $@L's boss theme: "Closing Hour", an original demented waltz that turns into metal - a music box and a
church organ in D harmonic minor, a clock ticking, a funeral bell, then distorted guitars chugging ONE-two-three,
bass, a waltz kit (kick on one, snare on two and three) with double-kick fills, and a lead guitar taking the music
box's tune. Everything is synthesized (the guitar / amp / drum models are tools/audio/underground_music.py's).
Then it loses its mind: THE FRENZY - blast beats, tremolo-picked guitars, an organ screaming clusters, a bell on
every bar, the music box stuttering an octave up, shredded arpeggio runs, the whole song shoving up a semitone every
four bars - and a half-time BREAKDOWN on a tritone before the music box leads it back round. Loops seamlessly (whole bars).

Run:  python3 tools/audio/hanz_boss_music.py
Writes public/assets/audio/music/boss_hanz.ogg (bgm_boss_hanz, in TRACKS in src/audio/music.js).
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import underground_music as U
from underground_music import SR, n, hz, add, lp, hp, bp, amp, power, bass, kick, snare, hat, crash, tom, lead, write

BPM = 168
B = 60 / BPM                                            # one beat; a bar is three
D = 50                                                  # D3
rng = np.random.default_rng(1313)
# the waltz's chords by bar (semitones above D): i, iv, V, i ... harmonic minor's raised seventh in the V
PROG = [0, 0, 5, 5, 7, 7, 0, 0, 0, 0, 5, 5, 10, 8, 7, 7]
# the music-box tune, one note a beat (semitones above D4), None = rest
TUNE = [12, 15, 14, 12, 10, 9, 10, 12, 7, None, 7, 9,
        10, 9, 7, 5, 3, 2, 3, 5, 1, 2, None, None,
        12, 15, 14, 12, 17, 15, 14, 12, 10, 9, 10, 12,
        14, 12, 10, 9, 7, 5, 4, 5, 7, 2, None, None]
# sections: (name, bars)
FORM = [('intro', 4), ('waltz', 16), ('metal', 16), ('dirge', 8), ('metal', 12), ('frenzy', 16), ('breakdown', 4)]
# THE FRENZY (the rage at the end before it loops): every 4 bars the whole song shoves up a semitone; its lead's runs
FRENZY_UP = 4
RUN = [0, 3, 7, 12, 15, 19, 24, 19, 15, 12, 7, 3]


def musicbox(m, dur, v=1.0):
    """a music-box tine: a bright sine with inharmonic overtones and a long ring"""
    L = n(dur + 0.8); t = np.arange(L) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4.07 * t) * np.exp(-t * 9) + 0.15 * np.sin(2 * np.pi * f * 9.3 * t) * np.exp(-t * 20)
    return x * np.exp(-t * 2.6) * np.minimum(1, t / 0.002) * 0.3 * v


def organ(notes, dur, v=1.0):
    """a church organ chord: drawbar sines (8', 4', 2 2/3', 2'), a slow tremolo, soft attack and release"""
    L = n(dur); t = np.arange(L) / SR; x = np.zeros(L)
    for m in notes:
        f = hz(m)
        for mul, a in ((0.5, 0.5), (1, 1), (2, 0.6), (3, 0.3), (4, 0.25)): x += np.sin(2 * np.pi * f * mul * t) * a
    env = np.minimum(1, t / 0.08) * np.clip((dur - t) / 0.12, 0, 1)
    return x * env * (1 + 0.08 * np.sin(2 * np.pi * 5.5 * t)) * 0.05 * v


def bell(m, v=1.0):
    """a tolling bell: inharmonic partials (hum, prime, tierce, quint, nominal) ringing out"""
    L = n(4); t = np.arange(L) / SR; f = hz(m); x = np.zeros(L)
    for mul, a, d in ((0.5, 0.6, 0.6), (1, 1, 0.9), (1.2, 0.5, 1.2), (1.5, 0.35, 1.5), (2, 0.5, 1.8), (2.6, 0.25, 3), (3.2, 0.15, 4)):
        x += np.sin(2 * np.pi * f * mul * t) * a * np.exp(-t * d)
    return x * np.minimum(1, t / 0.003) * 0.22 * v


def tick(v=1.0):
    """a clock's tick: a short woody click"""
    L = n(0.04); t = np.arange(L) / SR
    return bp(rng.uniform(-1, 1, L), 1500, 6000) * np.exp(-t * 180) * 0.5 * v


def frenzy(name, k, nb, t0, root, ch, gl, gr, bs, dr, ld, rest):
    """One bar of THE FRENZY (blast beats, tremolo guitars, clusters, runs, the stuttering music box, rising) or of
    the BREAKDOWN (half-time tritone chugs, then everything drops out but the bell and the music box)."""
    s16 = B / 4
    if name == 'frenzy':
        for b in range(6): add(rest, tick(0.6), t0 + b * B / 2)                                   # the clock racing
        add(rest, organ([root, root + 1, root + 6, root + 7, root + 12, root + 13], 3 * B, 1.8), t0)   # the organ screaming
        add(rest, bell(D - 12 + ch + (k // FRENZY_UP), 1.2), t0)
        for b in range(3):                                                                       # the music box, stuttering an octave up
            m = TUNE[(k * 3 + b) % len(TUNE)]
            if m is None: continue
            for r in range(4 if b == 0 else 2): add(rest, musicbox(D + 24 + m + (root - D - ch), s16, 0.5 + 0.1 * r), t0 + b * B + r * s16)
        for take, buf in ((0, gl), (1, gr)):                                                     # tremolo-picked guitars
            j = take * 0.005
            add(buf, power(root - 12, B * 0.9, False, take), t0 + j)
            for q in range(4, 12): add(buf, power(root - 12 + (1 if (k % 2 and q >= 8) else 0), s16 * 0.9, True, take), t0 + q * s16 + j)
        for q in range(6): add(bs, bass(root - 24 + (12 if q % 2 else 0), B / 2 * 0.9, 1.0), t0 + q * B / 2)
        for q in range(12): add(dr, kick(0.75 + 0.2 * (q % 4 == 0)), t0 + q * s16)                # the blast beat
        for q in range(6): add(dr, snare(0.85 if q % 2 else 0.6), t0 + q * B / 2 + s16)
        add(dr, crash(0.9), t0)
        if k % 2 == 1 or k >= nb - 4:                                                            # shredding runs (every bar at the end)
            for q in range(12): add(ld, lead(D + 12 + (root - D) + RUN[q] - (12 if q > 6 else 0) + 12 * (k >= nb - 2), s16 * 0.95, 0.9), t0 + q * s16)
        else:
            for b in range(3):
                m = TUNE[(k * 3 + b) % len(TUNE)]
                if m is not None: add(ld, lead(D + 12 + m + (root - D - ch), B * 0.9, 1.0, bend=1.0 if b == 0 else 0), t0 + b * B)
        if k >= nb - 2:                                                                          # a rising roar of noise into the breakdown
            L = n(3 * B); t = np.arange(L) / SR; sweep = bp(rng.uniform(-1, 1, L), 300 + 2500 * (k - nb + 2), 6000)
            add(rest, sweep * (t / (3 * B)) * 0.25, t0)
    else:
        last = k == nb - 1
        if not last:
            for take, buf in ((0, gl), (1, gr)):                                                  # half-time chugs on a tritone
                j = take * 0.006
                add(buf, power(root - 12, B * 1.4, False, take), t0 + j); add(buf, power(root - 6, B * 0.9, False, take), t0 + 1.5 * B + j)
                add(buf, power(root - 12, B * 0.3, True, take), t0 + 2.5 * B + j)
            add(bs, bass(root - 24, B * 1.4, 1.1), t0); add(bs, bass(root - 18, B * 0.9, 1.0), t0 + 1.5 * B)
            add(dr, kick(1.0), t0); add(dr, crash(0.9), t0); add(dr, snare(1.0), t0 + 1.5 * B); add(dr, kick(0.9), t0 + 2.5 * B)
            if k == nb - 2: [add(dr, tom(50 - q * 3, 0.8), t0 + 2 * B + q * B / 6) for q in range(6)]
            add(rest, organ([root, root + 6, root + 12], 3 * B, 1.4), t0)
        add(rest, bell(D - 12, 1.3 if last else 0.9), t0)
        for b in range(3):                                                                       # the music box leads it back round
            m = TUNE[(k * 3 + b) % len(TUNE)]
            if m is not None and (last or b == 0): add(rest, musicbox(D + 12 + m, B, 0.9), t0 + b * B)
        for b in range(3): add(rest, tick(0.8 if b == 0 else 0.5), t0 + b * B)


def main():
    bars = sum(b for _, b in FORM); L = n(bars * 3 * B)
    gl, gr, bs, dr, ld, rest = (np.zeros(L) for _ in range(6))
    bar = 0
    for name, nb in FORM:
        for k in range(nb):
            t0 = bar * 3 * B; ch = PROG[bar % len(PROG)]; root = D + ch
            third = 3 if ch in (0, 5) else 4 if ch == 7 else 4
            if name in ('frenzy', 'breakdown'):
                frenzy(name, k, nb, t0, root + (k // FRENZY_UP if name == 'frenzy' else 0), ch, gl, gr, bs, dr, ld, rest); bar += 1; continue
            # clock ticks on every beat, a tock on the off-beats, all the way through
            for b in range(3): add(rest, tick(0.8 if b == 0 else 0.5), t0 + b * B); add(rest, tick(0.25), t0 + b * B + B / 2)
            if name in ('intro', 'waltz', 'dirge') or k % 4 == 0:
                add(rest, organ([root, root + third, root + 7, root + 12], 3 * B, 1.3 if name == 'dirge' else 1.0), t0)
            if name in ('intro', 'waltz', 'dirge'):
                for b in range(3):
                    m = TUNE[(bar * 3 + b) % len(TUNE)]
                    if m is not None: add(rest, musicbox(D + 12 + m, B, 0.9 if name != 'dirge' else 0.6), t0 + b * B)
            if (name == 'intro' and k == 0) or (k == 0 and name != 'intro') or (name == 'dirge' and k % 2 == 0):
                add(rest, bell(D - 12 + ch, 1.0), t0)
            if name == 'waltz' and k >= 8 or name in ('metal', 'dirge'):
                heavy = name == 'metal'
                # guitars: ONE (a ringing chord) - two - three (palm-muted stabs); the metal adds a gallop on three
                for take, buf in ((0, gl), (1, gr)):
                    j = take * 0.006
                    add(buf, power(root - 12, B * 0.95, False, take), t0 + j)
                    add(buf, power(root - 12, B * 0.45, True, take), t0 + B + j)
                    if heavy:
                        for s in range(3): add(buf, power(root - 12 + (1 if (bar % 4 == 3 and s == 2) else 0), B / 3 * 0.9, True, take), t0 + 2 * B + s * B / 3 + j)
                    else: add(buf, power(root - 12, B * 0.45, True, take), t0 + 2 * B + j)
                add(bs, bass(root - 24, B * 0.9, 1.0), t0); add(bs, bass(root - 24 + 7, B * 0.45, 0.8), t0 + B); add(bs, bass(root - 24 + 12, B * 0.45, 0.8), t0 + 2 * B)
                add(dr, kick(1.0), t0)
                if heavy:
                    for s in range(3): add(dr, kick(0.8), t0 + B + s * B / 3); add(dr, kick(0.85), t0 + 2 * B + s * B / 3 + B / 6)
                add(dr, snare(0.8), t0 + B); add(dr, snare(1.0), t0 + 2 * B)
                if k % 8 == 0: add(dr, crash(0.8), t0)
                if k % 8 == 7: [add(dr, tom(48 - s * 2, 0.7), t0 + 2 * B + s * B / 4) for s in range(4)]
            if name == 'metal':                                                  # the lead takes the music box's tune, an octave up from it, with a harmony a third under
                for b in range(3):
                    m = TUNE[(bar * 3 + b) % len(TUNE)]
                    if m is None: continue
                    add(ld, lead(D + 12 + m, B * 0.92, 1.0, bend=1.0 if b == 0 else 0), t0 + b * B)
                    if k >= 4: add(ld, lead(D + 12 + m - (3 if m % 12 in (0, 5, 7) else 4), B * 0.92, 0.5), t0 + b * B + 0.004)
            bar += 1
    gl = amp(gl * 0.9); gr = amp(gr * 0.9)
    ldw = amp(ld, gain=18, tight=False)
    dl = np.zeros_like(ldw); d = n(B * 1.5); dl[d:] = ldw[:-d] * 0.3; ldw = ldw + dl
    bs = hp(bs, 35, 2)
    mixL = gl * 0.5 + gr * 0.08 + bs * 0.5 + dr * 0.6 + ldw * 0.32 + rest * 0.9
    mixR = gr * 0.5 + gl * 0.08 + bs * 0.5 + dr * 0.6 + ldw * 0.26 + rest * 0.9
    for ch in (mixL, mixR):                                                     # a cathedral-ish hall: long, dark
        wet = np.zeros_like(ch)
        for dt, g in ((0.043, 0.3), (0.071, 0.26), (0.113, 0.22), (0.17, 0.17), (0.29, 0.12), (0.41, 0.08)):
            k = n(dt); wet[k:] += ch[:-k] * g; wet[:k] += ch[-k:] * g          # (wrapped: the loop's tail rings into its start)
        ch += lp(wet, 3500)
    out = np.stack([mixL, mixR], 1)
    env = np.abs(out).max(1); from scipy.signal import lfilter; env = lfilter([0.002], [1, -0.998], env)
    out = out * np.minimum(1, (0.35 / (env + 1e-6)) ** 0.5)[:, None]
    out = np.tanh(out / (np.max(np.abs(out)) + 1e-9) * 1.5); out = out / np.max(np.abs(out)) * 0.92
    f = n(0.04); w = np.linspace(0, 1, f)[:, None]; out[:f] = out[:f] * w + out[-f:] * (1 - w)
    write(os.path.join(U.ROOT, 'music', 'boss_hanz.ogg'), out, '3')


if __name__ == '__main__':
    main()
