"""The BOSS FIGHTS themes (all of them driven by `drive()`: a dance-floor kick, claps, 16th hats, a pumping bass, fills, risers and crashes over each theme) (Trinkets > BOSS FIGHTS; each boss arena plays its own: src/stage/*BossStage.js). Each loops.

  colossus  "Pressure Critical" - THE CLOCKWORK COLOSSUS (steampunk): 152 BPM in D minor. A pounding foundry march -
            kick and snare like a steam hammer, a ticking clock on the off-beats, anvil strikes, a churning low organ,
            brass stabs and a brass melody over it; a breakdown with just the ticking and the anvil, then it all comes back.
  polygon   "Frame Rate King" - KING POLYGON (64-bit era): 170 BPM in E minor. Bright sampled-style synth brass, an
            orchestra-hit on the downbeats, a slap-ish pulse bass, a square-wave lead with vibrato, punchy drums, lots of reverb.
  demon     "The Mad Blade" - KARNAX, THE MAD BLADE (medieval demon): 150 BPM in C minor. War drums and timpani, a low choir, a
            horn melody, string pads, a chanting bridge, and a final phrase with everything at full force.
  machine   "Fatal Exception" - BEIGE.EXE (a 90s computer): 162 BPM in A minor, like an old sound card's built-in
            synth: a square-wave lead, a sine bass, a stiff drum machine, a startup chime at the top, a glitchy middle
            where the beat stutters, then everything back at full volume.
  hum       "Level 0" - THE HUM (the backrooms): 126 BPM, a half-time beat under it. The fluorescent hum itself as the drone (mains buzz and its
            harmonics), detuned pads, a slow wrong-sounding celesta tune, far-off thuds like footsteps in another room,
            and a swell of noise in the second half.
  knight    "Rootbound" - THORNWARD, THE ROOTBOUND KNIGHT (forest guardian): 138 BPM in A dorian. Rolling harp plucks, frame
            drums and timpani, a deep choir under a breathy wooden-flute lead; a hushed middle with just plucks and wind,
            then the drums come crashing back with the choir up high.

  smudge    "Wet Paint" - SMUDGE, THE LITTLE MASTER (a kid art prodigy): 144 BPM in F major, gone a bit wrong. A bouncy
            oom-pah of plucked bass and stabs, a toy-piano glockenspiel tune that keeps changing key on a whim (like he
            changes style), a cheeky square-wave counter-line, a kazoo-ish brass answer; the drive layer underneath.

  jackpot   "Big Money" - MAX JACKPOT, YOUR HOST (a game show): 132 BPM in B-flat, a swinging big-band TV theme. A walking
            bass, swung hats and rim clicks, brass section stabs and a bright trumpet melody, a Hammond-ish organ comp,
            a "ding ding ding" bell on every big phrase, a drum-roll and fanfare into the second chorus.
  maestro   "Fortissimo" - MAESTRO FORTISSIMO (an opera conductor): 120 BPM (a beat = 30 frames, his attacks fall on
            it) in D minor. A full pit orchestra: driving staccato strings, timpani and a pipe organ, a soaring
            soprano line over a low choir, brass fanfares; a quiet adagio middle with only harp and violins, then
            the storm comes back fortissimo.

Run:  python3 tools/audio/boss_music.py [colossus polygon demon knight machine hum]  -> public/assets/audio/music/boss_<name>.ogg (bgm_boss_<name>)
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


def drive(n, b, bars, roots, vel=1.0, quiet=(), half=False, saw=True):
    """The energy layer (added dry, after the reverb): a four-on-the-floor kick (or half-time in `half`), claps on 2
    and 4, 16th hats with open hats on the off-beats, a pumping 8th-note bass on each bar's root (`roots`, midi, one per
    bar, repeating), a snare fill into every 4th bar, a noise riser into every 8th bar and a crash on it. `quiet` = bars
    left without it (breakdowns). Returns the layer (n samples)."""
    out = np.zeros(n)
    for bar in range(bars):
        t0 = bar * 4 * b
        if bar in quiet: continue
        r = roots[bar % len(roots)]
        for i in range(4):
            if not half or i % 2 == 0: add(out, drum_kick(1.0 * vel), t0 + i * b)
            if i % 2 == 1: add(out, drum_snare(0.75 * vel) * 0.8, t0 + i * b); add(out, bp(noise(secs(0.12)), 900, 3000) * np.exp(-np.arange(secs(0.12)) / SR * 30) * 0.5 * vel, t0 + i * b + 0.005)
            add(out, hp(noise(secs(0.18)), 6000) * np.exp(-np.arange(secs(0.18)) / SR * 14) * 0.18 * vel, t0 + i * b + b / 2)   # open hat
        for i in range(16): add(out, drum_hat(0.45 * vel * (1 if i % 2 else 0.6)), t0 + i * b / 4)
        if saw:
            for i in range(8):                                                      # the pumping bass: ducks under each kick
                note = saw_bass(r - 12 + (12 if i % 4 == 3 else 0), b / 2 * 0.8, 0.75 * vel, 700)
                add(out, note * np.minimum(1, np.arange(len(note)) / (SR * 0.06)), t0 + i * b / 2)
        if bar % 4 == 3:                                                            # a snare fill
            for k in range(8): add(out, drum_snare(0.5 + k * 0.06) * vel, t0 + 2 * b + k * b / 4)
        if bar % 8 == 7:                                                            # a riser
            m = secs(4 * b); rise = hp(noise(m), 2500) * np.linspace(0, 1, m) ** 2 * 0.22 * vel
            add(out, rise, t0)
        if bar % 8 == 0: add(out, hp(noise(secs(1.6)), 4000) * np.exp(-np.arange(secs(1.6)) / SR * 2.5) * 0.3 * vel, t0)
    return out


def colossus():
    b = 60 / 152; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
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
    R = reverb(out, 1.6, 4, 0.22); R[:len(out)] += drive(len(out), b, bars, [p[0] for p in prog], 0.9, quiet=range(12, 16))[:len(R)]
    save(R, 'colossus', bars * 4 * b)


def polygon():
    b = 60 / 170; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
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
    R = reverb(out, 2.0, 3.4, 0.3); R[:len(out)] += drive(len(out), b, bars, [p[0] for p in prog], 0.85)[:len(R)]
    save(R, 'polygon', bars * 4 * b)


def demon():
    b = 60 / 150; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
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
    R = reverb(out, 2.8, 2.6, 0.32); R[:len(out)] += drive(len(out), b, bars, [p[0] for p in prog], 0.95, quiet=(0, 1))[:len(R)]
    save(R, 'demon', bars * 4 * b)


def pluck(midi, dur, vel=1.0):
    """A harp / koto pluck (Karplus-Strong): a burst of noise in a short delay line, decaying."""
    n = secs(dur); per = max(2, int(SR / hz(midi))); buf = np.random.uniform(-1, 1, per); x = np.zeros(n)
    for i in range(n):
        x[i] = buf[i % per]; buf[i % per] = 0.996 * 0.5 * (buf[i % per] + buf[(i + 1) % per])
    return lp(x, 4000) * vel * 0.45


def flute(midi, dur, vel=1.0):
    """A breathy wooden flute: a sine with a little octave, slow vibrato, a puff of breath noise."""
    n = secs(dur); t = np.arange(n) / SR
    f = hz(midi) * (1 + 0.006 * np.sin(2 * np.pi * 5 * t) * np.clip(t * 3, 0, 1))
    ph = np.cumsum(f) / SR * 2 * np.pi
    x = np.sin(ph) + 0.2 * np.sin(2 * ph) + 0.25 * bp(noise(n), hz(midi) * 0.8, hz(midi) * 3) * np.exp(-t * 6)
    return x * adsr(n, 0.06, 0.1, 0.85, 0.12) * vel * 0.32


def knight():
    b = 60 / 138; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
    prog = [(33, [57, 60, 64]), (31, [55, 59, 62]), (38, [57, 62, 66]), (33, [57, 60, 64]), (29, [57, 60, 65]), (31, [55, 59, 62]), (28, [56, 59, 64]), (33, [57, 60, 64])]
    for bar in range(bars):
        root, ch = prog[bar % 8]; t0 = bar * 4 * b
        hush = 8 <= bar < 12
        arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1], ch[0] + 12, ch[2]]
        for i, m in enumerate(arp): add(out, pluck(m, 1.2, 0.7), t0 + i * b / 2)                      # the rolling harp
        if not hush:
            add(out, saw_bass(root - 12, 4 * b * 0.95, 0.5, 260), t0)
            add(out, choir(ch if bar < 16 else [m + 12 for m in ch], 4 * b + 0.3, 0.8 if bar < 16 else 1.0), t0)
            for st in (0, 2.5): add(out, timpani(root + 12, 0.9, 0.8), t0 + st * b)
        else:
            add(out, bp(noise(secs(4 * b)), 300, 1400) * 0.05 * np.sin(np.linspace(0, np.pi, secs(4 * b))), t0)   # the wind
    drums(out, b, 8, 'k.......k.s.....|h...h...h...h...', 0.9)
    drums(out, b, 4, 'k.k.k.k.s.s.sss.|T...T...T.T.TTTT', 1.0, 12 * 4 * b)
    drums(out, b, 8, 'k..k..k.s..k.k.s|h.hhh.hhh.hhh.hh|x...............', 1.05, 16 * 4 * b)
    tune = [(0, 69, 1.5), (1.5, 71, 0.5), (2, 72, 1), (3, 74, 1), (4, 76, 3), (7, 74, 1), (8, 72, 1.5), (9.5, 71, 0.5), (10, 69, 2), (12, 67, 2), (14, 69, 2),
            (16, 76, 1.5), (17.5, 78, 0.5), (18, 79, 2), (20, 78, 1), (21, 76, 1), (22, 74, 2), (24, 72, 1), (25, 74, 1), (26, 76, 2), (28, 69, 4)]
    for rep in (0, 2):
        for beat, m, d in tune:
            add(out, flute(m, d * b * 0.95, 0.9), rep * 32 * b + beat * b)
            if rep == 2: add(out, brass(m - 12, d * b * 0.9, 0.35, 0.9), rep * 32 * b + beat * b)
    R = reverb(out, 2.6, 2.8, 0.34); R[:len(out)] += drive(len(out), b, bars, [p[0] for p in prog], 0.85, quiet=(8, 9, 10, 11))[:len(R)]
    save(R, 'knight', bars * 4 * b)


def sinew(midi, dur, vel=1.0, att=0.005, rel=0.08):
    """A plain sine note with a little second harmonic (an old sound card's 'bass')."""
    n = secs(dur); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * hz(midi) * t) + 0.25 * np.sin(4 * np.pi * hz(midi) * t)
    return x * adsr(n, att, 0.1, 0.8, rel) * vel * 0.4


def machine():
    b = 60 / 162; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
    for i, m in enumerate([60, 67, 72, 76]): add(out, sinew(m, 1.6, 0.5, 0.01, 1.2) + sinew(m + 12, 1.6, 0.2, 0.01, 1.2), i * 0.06)   # the startup chime
    prog = [45, 41, 43, 40, 45, 41, 38, 40]
    for bar in range(1, bars):
        root = prog[bar % 8]; t0 = bar * 4 * b; glitch = 12 <= bar < 16
        for i in range(8):
            if glitch and i % 3 == 2: continue
            add(out, sinew(root - 12 + (12 if i % 2 else 0), b / 2 * 0.85, 0.8), t0 + i * b / 2)
        for i in range(4): add(out, lp(sq(root + 12 + [0, 3, 7, 10][i], b * 0.2, 0.18, 0.25), 2500), t0 + i * b + b / 2)
    drums(out, b, 11, 'k...s...k.k.s...|h.h.h.h.h.h.h.h.', 0.9, 4 * b)
    drums(out, b, 4, 'k..k..s.k..kk.s.|h..h.h..h..h.hh.', 0.9, 12 * 4 * b)
    drums(out, b, 8, 'k...s..kk.k.s..s|hhhhhhhhhhhhhhhh|x...............', 1.0, 16 * 4 * b)
    lead = [(0, 69, 1), (1, 72, 1), (2, 76, 1.5), (3.5, 74, 0.5), (4, 72, 1), (5, 69, 1), (6, 67, 2), (8, 65, 1), (9, 67, 1), (10, 69, 1), (11, 72, 1), (12, 71, 4),
            (16, 69, 1), (17, 72, 1), (18, 76, 1), (19, 79, 1), (20, 81, 2), (22, 79, 1), (23, 76, 1), (24, 77, 1.5), (25.5, 76, 0.5), (26, 74, 2), (28, 76, 4)]
    for rep in (0, 2):
        for beat, m, d in lead:
            add(out, sq(m, d * b * 0.9, 0.3, 0.5, vib=0.15), (rep * 32 + 4) * b + beat * b)
            if rep == 2: add(out, sq(m + 12, d * b * 0.9, 0.12, 0.25), (rep * 32 + 4) * b + beat * b)
    for k in range(12, 16):                                                    # the glitch: a stuttering lead
        for i in range(0, 16, 3): add(out, sq(69 + (i % 5) * 2, 0.06, 0.3, 0.125), (k * 4 + i / 4) * b)
    R = reverb(out, 1.2, 4, 0.18); R[:len(out)] += drive(len(out), b, bars, prog, 0.85, quiet=(0, 12, 13))[:len(R)]
    save(R, 'machine', bars * 4 * b)


def hum():
    b = 60 / 126; bars = 24; L = bars * 4 * b; n = secs(L + 3); t = np.arange(n) / SR; out = np.zeros(n)
    buzz = sum(a * np.sin(2 * np.pi * f * t + f) for f, a in [(120, 0.5), (240, 0.25), (360, 0.15), (480, 0.08), (60, 0.3)])
    buzz *= 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t) ** 2
    out += lp(buzz, 1400) * 0.12 + bp(noise(n), 2000, 7000) * 0.012                      # the lights
    for bar in range(0, bars, 2):
        ch = [[45, 52, 56], [44, 51, 55], [46, 50, 57], [43, 50, 54]][(bar // 2) % 4]
        add(out, strings([m + 12 for m in ch], 8 * b + 0.5, 0.6), bar * 4 * b)
    for bar in range(bars):                                                     # far-off thuds, like footsteps in another room
        for st in ([0, 2.75] if bar % 2 else [1.5]): add(out, lp(drum_kick(0.6), 200) * 0.7, bar * 4 * b + st * b)
    tune = [(0, 81, 2), (2, 80, 1), (3, 76, 3), (6, 75, 2), (8, 81, 2), (10, 82, 1), (11, 80, 5), (16, 77, 2), (18, 76, 2), (20, 75, 4), (24, 73, 2), (26, 74, 2), (28, 69, 4)]
    for rep in (0, 1, 2):
        for beat, m, d in tune:
            note = sinew(m + (0.3 if rep else 0), d * b, 0.25, 0.002, 1.5) * np.exp(-np.arange(secs(d * b)) / SR * 1.4)
            add(out, note, (rep * 32 + 2) * b + beat * b)
    k = np.clip((t - L * 0.5) / (L * 0.3), 0, 1) * np.clip((L - t) / (L * 0.1), 0, 1)
    out += lp(noise(n), 900) * 0.05 * k                                          # a swell of noise in the second half
    R = reverb(out, 3.2, 2.2, 0.4); R[:len(out)] += drive(len(out), b, bars, [33, 32, 34, 31], 0.85, quiet=(0, 1, 2, 3), half=True)[:len(R)]
    save(R, 'hum', L)


def glock(midi, dur, vel=1.0):
    """A toy-piano / glockenspiel note: a bright sine with an inharmonic ping, decaying fast."""
    return (sinew(midi, dur, 0.8 * vel, 0.002, 0.05) + sinew(midi + 24.3, dur, 0.18 * vel, 0.001, 0.02)) * np.exp(-np.arange(secs(dur)) / SR * 4)


def smudge():
    b = 60 / 144; bars = 24; out = np.zeros(secs(bars * 4 * b + 3))
    # F major, then it lurches to A-flat and to D major on a whim (bars 8-11, 16-19), back again
    keys = [0] * 8 + [3] * 4 + [0] * 4 + [-3] * 4 + [0] * 4
    prog = [(41, [65, 69, 72]), (46, [65, 70, 74]), (36, [64, 67, 72]), (41, [65, 69, 72]), (38, [62, 65, 69]), (46, [65, 70, 74]), (36, [64, 67, 70]), (41, [65, 69, 72])]
    for bar in range(bars):
        root, ch = prog[bar % 8]; k = keys[bar]; t0 = bar * 4 * b
        for i in range(4):                                                   # oom-pah: plucked bass on 1 and 3, chord stabs on 2 and 4
            if i % 2 == 0: add(out, pluck(root - 12 + k + (7 if i == 2 else 0), b * 0.9, 1.0), t0 + i * b)
            else: add(out, sum(pluck(m + k, b * 0.4, 0.45) for m in ch) / 2, t0 + i * b)
        if bar % 4 == 3: add(out, ohit([m + k + 12 for m in ch], 0.6), t0 + 3.5 * b)
    tune = [(0, 77, .5), (.5, 81, .5), (1, 84, 1), (2, 81, .5), (2.5, 79, .5), (3, 77, 1), (4, 76, .5), (4.5, 77, .5), (5, 79, 1), (6, 84, 1.5), (7.5, 82, .5),
            (8, 81, 1), (9, 79, .5), (9.5, 77, .5), (10, 74, 1), (11, 76, 1), (12, 77, 3), (15, 72, 1)]
    for rep in range(3):
        for beat, m, d in tune:
            for half in (0, 16):
                bar = rep * 8 + int((half + beat) // 4); k = keys[min(bar, bars - 1)]
                add(out, glock(m + k + 12, d * b, 0.5), rep * 32 * b + (half + beat) * b)
        if rep:                                                              # a cheeky square-wave counter-line, then a brass answer
            for beat, m, d in tune[::2]: add(out, sq(m - 12 + keys[rep * 8], d * b * 0.8, 0.18, 0.5, vib=0.2), rep * 32 * b + (beat + 0.5) * b)
            for st in (6, 14, 22, 30): add(out, brass(72 + keys[rep * 8] - (st % 3), 0.5 * b, 0.4, 1.4), rep * 32 * b + st * b)
    drums(out, b, 24, 'k...s...k.k.s...|h.h.h.h.h.h.h.hh', 0.8)
    R = reverb(out, 1.4, 4, 0.22); R[:len(out)] += drive(len(out), b, bars, [p[0] for p in prog], 0.75)[:len(R)]
    save(R, 'smudge', bars * 4 * b)


def jackpot():
    b = 60 / 132; bars = 24; out = np.zeros(secs(bars * 4 * b + 3)); sw = b * 0.66   # (swing: the off-beat 8th lands late)
    # B-flat major: I - vi - ii - V, then IV - iv - I - V (a showbiz turnaround)
    prog = [(46, [62, 65, 70]), (43, [62, 67, 70]), (36, [63, 67, 70]), (41, [63, 65, 69]), (39, [63, 67, 70]), (39, [63, 66, 70]), (46, [62, 65, 70]), (41, [63, 65, 69])]
    for bar in range(bars):
        root, ch = prog[bar % 8]; t0 = bar * 4 * b
        walk = [root, root + 4, root + 7, root + 9] if bar % 2 == 0 else [root + 12, root + 9, root + 7, root + 5]
        for i, m in enumerate(walk): add(out, pluck(m - 12, b * 0.9, 1.0), t0 + i * b)            # walking bass
        for i in (1, 3): add(out, sum(organ(m, b * 0.5, 0.18) for m in ch), t0 + i * b)             # organ comp on 2 and 4
        if bar % 2 == 1: add(out, sum(brass(m + 12, b * 0.35, 0.3, 1.6) for m in ch), t0 + 3 * b + sw)   # section stabs
        for i in range(4): add(out, drum_hat(0.4), t0 + i * b); add(out, drum_hat(0.3), t0 + i * b + sw)
    tune = [(0, 77, 1), (1, 74, .5), (1.66, 77, .5), (2.33, 82, 1.5), (4, 81, .5), (4.66, 79, .5), (5.33, 77, 1), (6.5, 74, 1.5),
            (8, 75, 1), (9, 79, .5), (9.66, 82, .5), (10.33, 86, 1.5), (12, 84, .66), (12.66, 82, .66), (13.33, 81, .66), (14, 82, 2)]
    for rep in range(3):
        for half in (0, 16):
            for beat, m, d in tune: add(out, brass(m, d * b * 0.95, 0.45, 2.0), rep * 32 * b + (half + beat) * b)
        for at in (3, 11, 19, 27): add(out, glock(96, 0.3, 0.4), rep * 32 * b + at * b); add(out, glock(91, 0.3, 0.35), rep * 32 * b + (at + 0.33) * b)   # ding ding
        if rep == 1:                                                         # the drum roll and fanfare into the last chorus
            for k in range(16): add(out, drum_snare(0.3 + k * 0.03), 64 * b - 4 * b + k * b / 4)
            add(out, ohit([70, 74, 77, 82], 0.8), 64 * b)
    drums(out, b, 24, 'k......sk.k...s.|....t.......t...', 0.7)
    R = reverb(out, 1.2, 4, 0.2); R[:len(out)] += drive(len(out), b, bars, [p[0] for p in prog], 0.55, saw=False)[:len(R)]
    save(R, 'jackpot', bars * 4 * b)


def maestro():
    b = 60 / 120; bars = 32; out = np.zeros(secs(bars * 4 * b + 4))
    prog = [(38, [62, 65, 69]), (34, [62, 65, 70]), (31, [62, 67, 70]), (33, [61, 64, 69]), (38, [62, 65, 69]), (36, [64, 67, 72]), (34, [65, 70, 74]), (33, [64, 67, 73])]
    quiet = range(16, 22)                                                    # the adagio: harp and violins only
    for bar in range(bars):
        root, ch = prog[bar % 8]; t0 = bar * 4 * b
        if bar in quiet:
            for i in range(8): add(out, pluck(ch[i % 3] + 12 * (i // 3 % 2), b * 0.9, 0.6), t0 + i * b / 2)
            add(out, strings([m + 12 for m in ch], 4 * b, 0.35), t0); continue
        for i in range(16): add(out, sum(strings([m], b / 4 * 0.6, 0.35) for m in (ch[0] - 12, ch[0])), t0 + i * b / 4)   # driving staccato strings
        add(out, strings([root, root + 12] + ch, 4 * b, 0.4), t0)
        add(out, sum(organ(m - 12, 4 * b, 0.12) for m in ch), t0)
        add(out, choir([m - 12 for m in ch], 4 * b, 0.35), t0)
        for i in (0, 2): add(out, timpani(root, 0.9, 0.8), t0 + i * b)
        if bar % 4 == 3: add(out, timpani(root, 1.6, 0.9, roll=1.0), t0 + 2 * b)
        if bar % 2 == 0: add(out, sum(brass(m, b * 0.6, 0.35, 1.2) for m in ch), t0 + 3.5 * b)
    aria = [(0, 74, 2), (2, 77, 1), (3, 76, 1), (4, 74, 1.5), (5.5, 73, .5), (6, 74, 2), (8, 81, 3), (11, 79, .5), (11.5, 77, .5), (12, 76, 2), (14, 73, 2),
            (16, 74, 1), (17, 77, 1), (18, 81, 1), (19, 86, 3), (22, 84, 1), (23, 82, 1), (24, 81, 2), (26, 77, 1), (27, 76, 1), (28, 74, 4)]
    for rep in (0, 1, 2):
        start = [0, 8, 22][rep] * 4 * b
        if rep == 2: start = 22 * 4 * b
        for beat, m, d in aria:
            if start + beat * b > bars * 4 * b: break
            add(out, sinew(m + 12, d * b, 0.28, 0.06, 0.3) * (1 + 0.05 * np.sin(np.arange(secs(d * b)) / SR * 2 * np.pi * 5.5)), start + beat * b)   # the soprano
            if rep == 1: add(out, brass(m, d * b * 0.9, 0.25, 1.0), start + beat * b)
    for bar in quiet:                                                        # violins sighing over the harp
        add(out, sinew(prog[bar % 8][1][2] + 12, 4 * b, 0.18, 0.4, 0.6), bar * 4 * b)
    R = reverb(out, 2.4, 2.6, 0.32)
    R[:len(out)] += drive(len(out), b, bars, [p[0] for p in prog], 0.45, quiet=tuple(quiet), half=True, saw=False)[:len(R)]
    save(R, 'maestro', bars * 4 * b)


if __name__ == '__main__':
    which = sys.argv[1:] or ['colossus', 'polygon', 'demon', 'knight', 'machine', 'hum', 'smudge', 'jackpot', 'maestro']
    for w in which: globals()[w]()
