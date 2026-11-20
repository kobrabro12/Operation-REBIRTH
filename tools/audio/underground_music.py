"""THE UNDERGROUND's music: "Concrete Grudge", an original instrumental heavy metal track - gritty, vengeful, no
vocals. Everything is synthesized, but modelled on a real band: plucked-string guitars (Karplus-Strong through
lfilter) driven into a high-gain amp (asymmetric clipping between tone stacks) and a 4x12 cabinet (band-pass with a
presence bump and a scooped mid), double-tracked hard left / right; a picked, growling bass; a drum kit (kick with
beater click, snare with wires, hats, ride, crash, toms) with double-kick gallops; a lead guitar with vibrato and
delay that harmonises in thirds; then a room reverb and a master bus glue compressor. E Phrygian-ish, 168 bpm.
Loops seamlessly (whole bars, the reverb tail wrapped round to the start).

Run:  python3 tools/audio/underground_music.py [--sfx]
Writes public/assets/audio/music/underground.ogg (bgm_underground, in TRACKS in src/audio/music.js) and, with --sfx,
the stage intro's sounds public/assets/audio/sfx/ug_crowd.ogg (a crowd roaring and cheering) and ug_door.ogg (a
heavy metal door creaking open and banging shut). The build makes the .mp3 copies.
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
from scipy.signal import lfilter, butter, sosfilt

SR = 44100
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'audio')
rng = np.random.default_rng(1666)

BPM = 168
B = 60 / BPM                     # one beat, seconds
E2 = 40                          # MIDI: the low E string (drop nothing - E standard)


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def n(sec): return int(round(sec * SR))


def bp(x, lo, hi, order=2):
    """band-pass (Butterworth)"""
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def peak(x, f, gain_db, q=1.0):
    """a peaking EQ (RBJ biquad)"""
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


def ks(m, dur, bright=0.5, decay=0.996, seed=0):
    """a plucked string: Karplus-Strong as one IIR filter (a delay line fed back through a two-tap average)"""
    f = hz(m); N = max(2, int(round(SR / f))); L = n(dur)
    r = np.random.default_rng(seed)
    burst = r.uniform(-1, 1, N)
    burst = lfilter([bright, 1 - bright], [1], burst)            # pick hardness: how bright the attack is
    x = np.zeros(L); x[:N] = burst
    a = np.zeros(N + 2); a[0] = 1; a[N] = -decay * 0.5; a[N + 1] = -decay * 0.5
    return lfilter([1], a, x)


CACHE = {}


def string(m, dur, mute=False, take=0):
    """one guitar string, picked (palm-muted: short, dull, thumpy). Cached per pitch / length / take."""
    key = (m, round(dur, 3), mute, take)
    if key not in CACHE:
        x = ks(m, dur + 0.05, 0.25 if mute else 0.65, 0.985 if mute else 0.9975, seed=hash(key) & 0xffff)
        L = len(x); t = np.arange(L) / SR
        env = np.minimum(1, t / 0.002) * (np.exp(-t * 22) * 0.8 + 0.2 if mute else 1.0)
        rel = np.clip((dur + 0.05 - t) / 0.05, 0, 1)             # the hand stops the string
        CACHE[key] = x * env * rel
    return CACHE[key]


def amp(x, gain=30, tight=True):
    """the high-gain amp + cab: a tight pre-boost, two clipping stages, scooped mids, a 4x12 cabinet"""
    if tight: x = hp(x, 120, 1)                                  # (an overdrive in front keeps the lows tight)
    x = peak(x, 900, 6, 0.8)
    x = np.tanh(x * gain + 0.08) - np.tanh(0.08)                  # asymmetric: grittier, more even harmonics
    x = hp(x, 60, 1)
    x = np.tanh(x * 3.0)
    x = peak(x, 500, -5, 0.7)                                     # the metal scoop
    x = peak(x, 110, 4, 0.9)                                      # chug thump
    x = peak(x, 2600, 4, 1.2)                                     # presence / bite
    x = lp(x, 5600, 4)                                            # a speaker cone rolls off the fizz
    x = bp(x, 70, 7500, 1)
    return x


def power(m, dur, mute=False, take=0, oct=True):
    """a power chord (root, fifth, octave) - the clean signal before the amp"""
    notes = [m, m + 7] + ([m + 12] if oct else [])
    L = n(dur + 0.05); out = np.zeros(L)
    for i, k in enumerate(notes):
        s = string(k, dur, mute, take)
        d = int(i * SR * 0.004 * (1 + take))                     # the pick crosses the strings
        out[d:d + len(s)] += s[:L - d] * (1.0 if i == 0 else 0.8)
    return out


def add(buf, x, t):
    i = n(t)
    if i < 0: x, i = x[-i:], 0
    if i >= len(buf): return
    k = min(len(x), len(buf) - i); buf[i:i + k] += x[:k]


def add_wrap(buf, x, t):
    """adds x at time t, wrapping anything past the end round to the start (so the loop is seamless)"""
    i = n(t) % len(buf); k = min(len(x), len(buf) - i)
    buf[i:i + k] += x[:k]
    if k < len(x): add_wrap(buf, x[k:], 0)


# ---------------------------------------------------------------- drums
def kick(v=1.0):
    t = np.arange(n(0.35)) / SR
    f = 52 + 120 * np.exp(-t * 38)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    click = rng.uniform(-1, 1, len(t)) * np.exp(-t * 420)
    click = hp(click, 2500)
    return (np.tanh(body * 1.6) * 0.9 + click * 0.45) * v


def snare(v=1.0):
    t = np.arange(n(0.32)) / SR
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 26) + 0.5 * np.sin(2 * np.pi * 330 * t) * np.exp(-t * 32)
    wires = bp(rng.uniform(-1, 1, len(t)), 1800, 9000) * np.exp(-t * 14)
    crack = rng.uniform(-1, 1, len(t)) * np.exp(-t * 160)
    return np.tanh((tone * 0.7 + wires * 1.1 + crack * 0.5) * 1.4) * v


def hat(v=1.0, open_=False):
    L = n(0.35 if open_ else 0.07); t = np.arange(L) / SR
    x = hp(rng.uniform(-1, 1, L), 7000, 4)
    return x * np.exp(-t * (9 if open_ else 70)) * v


def ride(v=1.0):
    L = n(0.9); t = np.arange(L) / SR
    bell = sum(np.sin(2 * np.pi * f * t) for f in (2350, 3510, 5230)) / 3
    wash = hp(rng.uniform(-1, 1, L), 5000, 2)
    return (bell * 0.35 * np.exp(-t * 6) + wash * 0.45 * np.exp(-t * 4)) * v


def crash(v=1.0):
    L = n(2.4); t = np.arange(L) / SR
    x = hp(rng.uniform(-1, 1, L), 3200, 2)
    x = x * (np.exp(-t * 1.6) * 0.8 + np.exp(-t * 14) * 0.6)
    return x * v


def tom(m, v=1.0):
    t = np.arange(n(0.5)) / SR
    f = hz(m) * (1 + 0.6 * np.exp(-t * 30))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8) + bp(rng.uniform(-1, 1, len(t)), 200, 3000) * np.exp(-t * 40) * 0.3) * v


# ---------------------------------------------------------------- bass and lead
def bass(m, dur, v=1.0):
    """a picked bass note: two strings' worth of KS, a growl of drive, a round low end"""
    x = ks(m, dur + 0.05, 0.75, 0.998, seed=m * 7)
    t = np.arange(len(x)) / SR
    x = x * np.clip((dur + 0.05 - t) / 0.04, 0, 1)
    low = lp(x, 250, 2)
    grit = np.tanh(hp(x, 300) * 6) * 0.25
    return (np.tanh(low * 2.2) + grit) * v


def lead(m, dur, v=1.0, bend=0.0):
    """a lead guitar note: a bowed-sounding sustained saw stack, vibrato that deepens, through the amp"""
    L = n(dur + 0.08); t = np.arange(L) / SR
    vib = 0.25 * np.clip(t / 0.35, 0, 1) * np.sin(2 * np.pi * 5.6 * t)
    m_t = m + vib - bend * np.exp(-t * 18)
    ph = np.cumsum(440 * 2 ** ((m_t - 69) / 12)) / SR
    x = (2 * (ph % 1) - 1) * 0.6 + (2 * ((ph * 1.003) % 1) - 1) * 0.4
    x += ks(m, dur + 0.08, 0.8, 0.999, seed=m)[:L] * 0.8          # the pick's attack
    env = np.minimum(1, t / 0.01) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return x * env * 0.25 * v


# ---------------------------------------------------------------- the song
# riff cells: (semitones above E2, length in 16ths, palm-muted?) - None = rest
GALLOP = [(0, 1, 1), (0, 1, 1), (0, 2, 1)]                         # da-da-DUM
A1 = GALLOP * 2 + [(1, 2, 0), (0, 2, 1)] + GALLOP + [(3, 2, 0), (None, 1, 0), (6, 1, 0)]
A2 = GALLOP * 2 + [(1, 2, 0), (0, 2, 1)] + GALLOP + [(5, 2, 0), (3, 1, 0), (1, 1, 0)]
B1 = [(0, 4, 0), (0, 2, 1), (0, 2, 1), (8, 4, 0), (7, 4, 0)]       # big open chords
B2 = [(0, 4, 0), (0, 2, 1), (0, 2, 1), (3, 4, 0), (1, 2, 0), (6, 2, 0)]
BRK = [(0, 3, 1), (0, 3, 1), (None, 2, 0), (0, 1, 1), (0, 1, 1), (None, 2, 0), (1, 4, 0)]   # breakdown, half time
INTRO = [(0, 8, 0), (1, 8, 0)]
# lead melody (MIDI) in 8ths, over riff A; None = hold/rest
LEAD = [64, 65, 67, 65, 64, None, 62, 64, 67, 70, 69, 67, 65, None, 64, None,
        64, 65, 67, 70, 72, 70, 69, 67, 69, None, 67, 65, 64, None, None, None]

SECTIONS = ([('intro', INTRO)] * 4 + [('A', A1), ('A', A2)] * 4 + [('B', B1), ('B', B2)] * 2
            + [('L', A1), ('L', A2)] * 4 + [('K', BRK)] * 4 + [('A', A1), ('A', A2)] * 2 + [('B', B1), ('B', B2)])


def render():
    bars = len(SECTIONS); L = n(bars * 4 * B)
    gl = np.zeros(L); gr = np.zeros(L); bs = np.zeros(L); dr = np.zeros(L); ld = np.zeros(L); cym = np.zeros(L)
    s16 = B / 4
    lead_i = 0
    for bar, (kind, riff) in enumerate(SECTIONS):
        t0 = bar * 4 * B
        half = kind == 'K'
        step = s16 * (2 if half else 1)
        pos = 0
        for (k, ln, mute) in riff:
            dur = ln * step
            if k is not None:
                m = E2 + k
                for take, buf in ((0, gl), (1, gr)):
                    jitter = (take * 0.006) + rng.uniform(-0.002, 0.002)
                    add(buf, power(m, dur * (0.92 if mute else 0.98), bool(mute), take, oct=not mute), t0 + pos * step + jitter)
                add(bs, bass(m - 12, dur * 0.95, 0.8 if mute else 1.0), t0 + pos * step)
            pos += ln
        # drums
        if kind == 'intro':
            add(cym, crash(0.9), t0)
            add(dr, kick(1.0), t0); add(dr, kick(1.0), t0 + 2 * B)
            add(dr, snare(0.9), t0 + B * 1); add(dr, snare(1.0), t0 + B * 3)
            if bar == 3:                                                               # tom roll into the riff
                for i in range(8): add(dr, tom(50 - i * 1.5, 0.6 + i * 0.05), t0 + 2 * B + i * s16)
        elif kind in ('A', 'L'):
            for i in range(16):                                                        # double kick on the gallops
                if i % 4 != 3: add(dr, kick(0.85 if i % 2 else 1.0), t0 + i * s16)
            for b_ in (1, 3): add(dr, snare(1.0), t0 + b_ * B)
            for i in range(8): add(cym, ride(0.5 if i % 2 else 0.7) if kind == 'L' else hat(0.55 if i % 2 else 0.8), t0 + i * 2 * s16)
            if bar % 8 == 0 or (kind == 'L' and bar % 4 == 0): add(cym, crash(0.8), t0)
        elif kind == 'B':
            for i in range(16): add(dr, kick(0.9), t0 + i * s16)                      # 16th double kick
            for b_ in range(4): add(dr, snare(0.9 if b_ % 2 else 0.7), t0 + b_ * B + (0 if b_ % 2 else B / 2))
            add(cym, crash(0.75), t0); add(cym, crash(0.5), t0 + 2 * B)
            if bar % 2 == 1:
                for i in range(4): add(dr, tom(47 - i * 2, 0.7), t0 + 3 * B + i * s16)
        else:                                                                          # breakdown: half-time
            add(dr, kick(1.0), t0); add(dr, kick(1.0), t0 + 1.5 * B); add(dr, kick(0.9), t0 + 2.75 * B)
            add(dr, snare(1.0), t0 + 2 * B)
            add(cym, crash(0.9) if bar % 2 == 0 else ride(0.8), t0)
            for i in range(4): add(cym, hat(0.7, open_=True), t0 + i * B + B / 2)
        if kind == 'L':                                                                # the lead, harmonised in thirds
            for i in range(8):
                m = LEAD[lead_i % len(LEAD)]; lead_i += 1
                if m is None: continue
                ln = 1
                while LEAD[(lead_i - 1 + ln) % len(LEAD)] is None and ln < 3: ln += 1
                add(ld, lead(m + 12, ln * B / 2 * 0.95, 1.0, bend=1.0 if i % 4 == 0 else 0), t0 + i * B / 2)
                add(ld, lead(m + 12 - 3 if (m % 12) in (4, 7, 9) else m + 12 - 4, ln * B / 2 * 0.95, 0.55), t0 + i * B / 2 + 0.004)
    # through the amps
    gl = amp(gl * 0.9); gr = amp(gr * 0.9)
    ldw = amp(ld, gain=18, tight=False)
    dly = np.zeros_like(ldw); d = n(B * 0.75)
    dly[d:] = ldw[:-d] * 0.35; dly[2 * d:] += ldw[:-2 * d] * 0.15        # a dotted-8th delay on the lead
    ldw = ldw + dly
    bs = hp(bs, 35, 2)
    drums = dr + cym * 0.55
    mixL = gl * 0.55 + gr * 0.08 + bs * 0.55 + drums * 0.62 + ldw * 0.35
    mixR = gr * 0.55 + gl * 0.08 + bs * 0.55 + drums * 0.62 + ldw * 0.28
    # a small, dark room (a basement club) - comb + allpass, tails wrapped to the start
    for ch in (mixL, mixR):
        wet = np.zeros_like(ch)
        for dt, g in ((0.031, 0.22), (0.047, 0.18), (0.071, 0.14), (0.113, 0.09)):
            k = n(dt); wet[k:] += ch[:-k] * g
        wet = lp(wet, 4000)
        ch += wet
    out = np.stack([mixL, mixR], 1)
    # glue compressor + limiter on the master bus
    env = np.abs(out).max(1); env = lfilter([0.002], [1, -0.998], env)
    gain = np.minimum(1, (0.35 / (env + 1e-6)) ** 0.5)
    out = out * gain[:, None]
    out = np.tanh(out / (np.max(np.abs(out)) + 1e-9) * 1.6)
    out = out / np.max(np.abs(out)) * 0.92
    # crossfade the last 40 ms into the first so the loop never clicks
    f = n(0.04); w = np.linspace(0, 1, f)[:, None]
    out[:f] = out[:f] * w + out[-f:] * (1 - w)
    return out


def write(path, x, q='4'):
    tmp = os.path.join(tempfile.gettempdir(), 'ug_tmp.wav')
    st = x if x.ndim == 2 else x[:, None]
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(st.shape[1]); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', q, path], check=True)
    print('wrote', os.path.relpath(path), f'{os.path.getsize(path) / 1024:.0f} KB')


def crowd():
    """a crowd: hundreds of voices - band-passed noise with slow swells, whoops (pitched formant sweeps), claps"""
    L = n(4.5); t = np.arange(L) / SR
    x = bp(rng.uniform(-1, 1, L), 300, 3200, 2)
    swell = np.minimum(1, t / 0.5) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.6 * t)) * np.clip((4.5 - t) / 1.6, 0, 1)
    x = x * swell
    for _ in range(40):                                                    # whoops and yells
        s = rng.uniform(0.1, 3.4); d = rng.uniform(0.25, 0.7); k = n(d); tt = np.arange(k) / SR
        f0 = rng.uniform(380, 900) * (1 + 0.4 * np.sin(np.pi * tt / d))
        v = np.sin(2 * np.pi * np.cumsum(f0) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f0) / SR)
        v = bp(v + rng.uniform(-0.3, 0.3, k), 400, 2600) * np.sin(np.pi * tt / d) * rng.uniform(0.05, 0.14)
        add(x, v, s)
    for _ in range(140):                                                   # claps
        s = rng.uniform(0.3, 4.0); k = n(0.03)
        add(x, bp(rng.uniform(-1, 1, k), 900, 5000) * np.exp(-np.arange(k) / SR * 140) * rng.uniform(0.05, 0.2), s)
    x = x + lp(x, 300) * 0.0
    return np.stack([x, np.roll(x, n(0.013))], 1) / np.max(np.abs(x)) * 0.8


def door():
    """a heavy steel door: a latch clack, a long rusty creak (a stick-slip squeal), then the bang of it hitting the wall"""
    L = n(1.8); out = np.zeros(L)
    k = n(0.05); add(out, bp(rng.uniform(-1, 1, k), 1500, 6000) * np.exp(-np.arange(k) / SR * 90) * 0.6, 0.0)
    cl = n(1.0); tt = np.arange(cl) / SR
    f = 180 + 120 * np.sin(2 * np.pi * 0.9 * tt) + 40 * rng.standard_normal(cl).cumsum() / 400
    sq = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * tt))
    sq = bp(sq, 300, 3000) * np.sin(np.pi * np.minimum(1, tt / 1.0)) * 0.35
    add(out, sq, 0.08)
    bk = n(0.6); tb = np.arange(bk) / SR
    bang = np.sin(2 * np.pi * 70 * tb) * np.exp(-tb * 9) + bp(rng.uniform(-1, 1, bk), 120, 2500) * np.exp(-tb * 18) * 0.8
    bang += sum(np.sin(2 * np.pi * fr * tb) * np.exp(-tb * dk) * 0.12 for fr, dk in ((410, 6), (893, 8), (1517, 11)))   # the steel rings
    add(out, np.tanh(bang * 1.5), 1.1)
    return out / np.max(np.abs(out)) * 0.85


if __name__ == '__main__':
    if '--sfx' in sys.argv:
        write(os.path.join(ROOT, 'sfx', 'ug_crowd.ogg'), crowd(), '2')
        write(os.path.join(ROOT, 'sfx', 'ug_door.ogg'), door(), '2')
    write(os.path.join(ROOT, 'music', 'underground.ogg'), render(), '3')
