"""The BOSS FIGHTS themes (Trinkets > BOSS FIGHTS; each boss arena plays its own: src/stage/*BossStage.js). Each loops.

  colossus  "Pressure Critical" - THE CLOCKWORK COLOSSUS (steampunk): 132 BPM in D minor. A pounding foundry march -
            kick and snare like a steam hammer, a ticking clock on the off-beats, anvil strikes, a churning low organ,
            brass stabs and a brass melody over it; a breakdown with just the ticking and the anvil, then it all comes back.
  polygon   "Frame Rate King" - KING POLYGON (64-bit era): 150 BPM in E minor. Bright sampled-style synth brass, an
            orchestra-hit on the downbeats, a slap-ish pulse bass, a square-wave lead with vibrato, punchy drums, lots of reverb.
  demon     "The Mad Blade" - KARNAX, THE MAD BLADE (medieval demon): 128 BPM in C minor. War drums and timpani, a low choir, a
            horn melody, string pads, a chanting bridge, and a final phrase with everything at full force.

Run:  python3 tools/audio/boss_music.py [colossus polygon demon]  -> public/assets/audio/music/boss_<name>.ogg (bgm_boss_<name>)
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, secs, hz, lp, hp, bp, add, adsr, reverb, finish, OUT, brass, timpani, sq, drum_kick, drum_snare, drum_hat, noise
from trophy_hall_music import organ, choir


def anvil(vel=1.0):
    """An anvil strike: bright, inharmonic, ringing."""
    n = secs(1.2); t = np.arange(n) / SR; x = np.zeros(n)
    for f, a, d in [(1180, 1, 4), (1730, 0.6, 5), (2610, 0.5, 7), (3920, 0.3, 9), (620, 0.4, 3)]: x += a * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
    x[:secs(0.01)] += hp(noise(secs(0.01)), 3000) * 0.8
    return x * vel * 0.3


def tick(vel=1.0):
    """A clock's tick: a tiny woody click."""
    n = secs(0.04); t = np.arange(n) / SR
    return bp(noise(n), 2500, 6000) * np.exp(-t * 120) * vel * 0.5


def saw_bass(midi, dur, vel=1.0, cut=500):
    """A low sawtooth bass, filtered dark."""
    n = secs(dur); t = np.arange(n) / SR
    x = (2 * ((t * hz(midi)) % 1) - 1) + 0.6 * (2 * ((t * hz(midi) * 1.003) % 1) - 1)
    return lp(x, cut) * adsr(n, 0.005, 0.15, 0.7, 0.05) * vel * 0.5


def ohit(midis, vel=1.0):
    """An orchestra hit: a brass chord with a burst of noise, cut short."""
    x = sum(brass(m, 0.35, 1.0, 1.4) for m in midis)
    n = len(x); t = np.arange(n) / SR
    x = x + bp(noise(n), 300, 3000) * np.exp(-t * 18) * 0.6
    return x * np.exp(-t * 5) * vel / len(midis) * 1.6


def strings(midis, dur, vel=1.0):
    """A string section pad: detuned saws, slow attack, soft."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for m in midis:
        for d in (-0.09, 0, 0.08):
            f = hz(m + d) * (1 + 0.003 * np.sin(2 * np.pi * 5.5 * t + m))
            x += 2 * ((np.cumsum(f) / SR) % 1) - 1
    return lp(x, 2400) * adsr(n, dur * 0.25, 0, 1, dur * 0.2) * vel / (len(midis) * 3) * 0.6


def drums(out, beat, bars, pattern, vel=1.0, off=0.0):
    """A drum pattern per bar of 4 beats: 'k' kick, 's' snare, 'h' hat, 't' tick, 'a' anvil, 'T' low timpani, 'x' crash -
    each step a 16th; pattern = 16 characters (several letters per step separated by '|' rows)."""
    rows = pattern.split('|')
    for bar in range(bars):
        for row in rows:
            for i, c in enumerate(row):
                at = off + (bar * 4 + i / 4) * beat
                if c == 'k': add(out, drum_kick(vel), at)
                elif c == 's': add(out, drum_snare(vel * 0.9), at)
                elif c == 'h': add(out, drum_hat(vel * 0.7), at)
                elif c == 't': add(out, tick(vel), at)
                elif c == 'a': add(out, anvil(vel * 0.7), at)
                elif c == 'T': add(out, timpani(36, 1.2, vel * 1.1), at)
                elif c == 'x': add(out, hp(noise(secs(1.2)), 4000) * np.exp(-np.arange(secs(1.2)) / SR * 3) * 0.25 * vel, at)


def save(out, name, length):
    """Writes boss_<name>.ogg, exactly `length` seconds so it loops seamlessly: the reverb tail past the end is folded
    back onto the start (finish writes outro_<tmp>; the build makes the MP3)."""
    n = secs(length); tail = out[n:]; out = out[:n].copy(); out[:len(tail)] += tail[:n]
    finish(out, 'boss_' + name + '_tmp', peak=0.85, fade=0.005)
    for ext in ('ogg', 'mp3'):
        src = os.path.join(OUT, 'outro_boss_' + name + '_tmp.' + ext)
        if ext == 'ogg': os.replace(src, os.path.join(OUT, 'boss_' + name + '.ogg'))
        elif os.path.exists(src): os.remove(src)


def colossus():
    b = 60 / 132; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
    prog = [(38, [62, 65, 69]), (38, [62, 65, 69]), (34, [62, 65, 70]), (36, [60, 64, 67]), (38, [62, 65, 69]), (41, [60, 65, 69]), (43, [62, 67, 70]), (45, [61, 64, 69])]
    for bar in range(bars):
        root, ch = prog[bar % 8]; t0 = bar * 4 * b
        brk = 12 <= bar < 16
        for i in range(8):                                                   # the churning bass, eighths
            if not brk or i % 4 == 0: add(out, saw_bass(root - 12 + (7 if i in (3, 7) else 0), b / 2 * 0.9, 0.9), t0 + i * b / 2)
        if not brk:
            add(out, organ(root, 4 * b, 0.5), t0)
            for m in ch: add(out, organ(m - 12, 4 * b, 0.25), t0)
            for st in (0, 2.5): add(out, sum(brass(m, 0.22, 0.7, 1.2) for m in ch) / 2, t0 + st * b)   # stabs
    drums(out, b, 12, 'k...s..kk...s...|t.t.t.t.t.t.t.t.|a...............', 1.0)
    drums(out, b, 4, 't.t.t.t.t.t.t.t.|a.......a.......', 1.0, 12 * 4 * b)
    drums(out, b, 8, 'k..kS..kk.k.s.s.'.replace('S', 's') + '|hththththththth.|x...............', 1.05, 16 * 4 * b)
    mel = [(0, 74, 1.5), (1.5, 77, 0.5), (2, 76, 1), (3, 74, 1), (4, 72, 2), (6, 69, 2), (8, 70, 1.5), (9.5, 72, 0.5), (10, 74, 1), (11, 76, 1), (12, 73, 4),
           (16, 74, 1), (17, 77, 1), (18, 81, 2), (20, 79, 1), (21, 77, 1), (22, 76, 2), (24, 77, 1.5), (25.5, 76, 0.5), (26, 74, 1), (27, 72, 1), (28, 74, 4)]
    for rep in (0, 2):                                                       # the brass tune: bars 0-7 and 16-23
        for beat, m, d in mel: add(out, brass(m, d * b * 0.95, 0.75 + 0.15 * rep / 2, 1.1), rep * 32 * b + beat * b)
    for beat in range(0, 16, 2): add(out, sq(86 if beat % 4 == 0 else 81, b * 0.4, 0.15, 0.25), 12 * 4 * b + beat * b)   # music-box chimes in the breakdown
    save(reverb(out, 1.6, 4, 0.22), 'colossus', bars * 4 * b)


def polygon():
    b = 60 / 150; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
    prog = [(40, [64, 67, 71]), (36, [60, 64, 67]), (38, [62, 66, 69]), (35, [59, 63, 66]), (40, [64, 67, 71]), (36, [60, 64, 67]), (33, [57, 60, 64]), (35, [59, 63, 66])]
    for bar in range(bars):
        root, ch = prog[bar % 8]; t0 = bar * 4 * b
        if bar % 2 == 0: add(out, ohit([m + 12 for m in ch]), t0)
        for i, o in enumerate([0, 12, 0, 12, 7, 0, 12, 7]): add(out, lp(sq(root - 12 + o, b / 2 * 0.8, 0.5, 0.5), 900), t0 + i * b / 2)   # slap-ish pulse bass
        for st in (1, 2.5, 3.5) if bar % 4 != 3 else (0.5, 1, 1.5, 2, 3): add(out, sum(brass(m, 0.2, 0.55, 1.5) for m in ch) / 2.4, t0 + st * b)
    drums(out, b, 24, 'k...s.k.k.k.s...|h.hhh.hhh.hhh.hh', 1.0)
    for bar in range(0, 24, 8): drums(out, b, 1, 'x...............', 1.0, bar * 4 * b)
    lead = [(0, 76, 1), (1, 79, 1), (2, 83, 2), (4, 81, 1), (5, 79, 1), (6, 78, 2), (8, 76, 1), (9, 74, 1), (10, 76, 1), (11, 79, 1), (12, 78, 4),
            (16, 76, 1), (17, 79, 1), (18, 83, 1.5), (19.5, 86, 0.5), (20, 88, 2), (22, 86, 1), (23, 83, 1), (24, 81, 1), (25, 83, 1), (26, 79, 2), (28, 78, 2), (30, 75, 2)]
    for rep in range(3):
        for beat, m, d in lead:
            if rep: add(out, sq(m, d * b * 0.92, 0.32, 0.25, vib=0.25), rep * 32 * b + beat * b)        # (the first time round: no lead yet)
            if rep == 2: add(out, brass(m, d * b * 0.9, 0.35, 1.3), rep * 32 * b + beat * b)
    save(reverb(out, 2.0, 3.4, 0.3), 'polygon', bars * 4 * b)


def demon():
    b = 60 / 128; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
    prog = [(36, [60, 63, 67]), (32, [60, 63, 68]), (34, [58, 62, 65]), (31, [59, 62, 67]), (36, [60, 63, 67]), (29, [60, 65, 68]), (31, [59, 62, 67]), (31, [59, 62, 65])]
    for bar in range(bars):
        root, ch = prog[bar % 8]; t0 = bar * 4 * b
        add(out, strings([m - 12 for m in ch] + [ch[0]], 4 * b + 0.2, 0.9), t0)
        add(out, saw_bass(root - 12, 4 * b * 0.95, 0.6, 300), t0)
        if 8 <= bar < 16: add(out, choir([m + 12 for m in ch], 4 * b + 0.3, 1.0), t0)                 # the chanting bridge
        elif bar >= 16: add(out, choir(ch, 4 * b + 0.3, 0.7), t0)
        for st in (0, 0.75, 1.5): add(out, timpani(root, 0.9, 0.7), t0 + st * b)                        # the gallop
    drums(out, b, 8, 'k.....k.s.......|T.......T.......', 1.0)
    drums(out, b, 8, 'k..k..k.s..k.ks.|T...T...T...T...', 1.05, 8 * 4 * b)
    drums(out, b, 8, 'k.kk..k.s.kk.ss.|T.T.T.T.T.T.T.T.|x...............', 1.1, 16 * 4 * b)
    horn = [(0, 67, 2), (2, 72, 1.5), (3.5, 70, 0.5), (4, 68, 2), (6, 67, 2), (8, 65, 1), (9, 67, 1), (10, 68, 2), (12, 67, 4),
            (16, 72, 2), (18, 75, 1.5), (19.5, 74, 0.5), (20, 72, 2), (22, 70, 2), (24, 68, 1), (25, 67, 1), (26, 65, 2), (28, 67, 4)]
    for rep in (0, 2):
        for beat, m, d in horn: add(out, brass(m - (12 if rep == 0 else 0), d * b * 0.95, 0.8, 0.8), rep * 32 * b + beat * b)
    save(reverb(out, 2.8, 2.6, 0.32), 'demon', bars * 4 * b)


if __name__ == '__main__':
    which = sys.argv[1:] or ['colossus', 'polygon', 'demon']
    for w in which: globals()[w]()
