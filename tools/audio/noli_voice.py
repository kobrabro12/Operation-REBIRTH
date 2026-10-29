"""The shopkeeper's NOLI voice (Trinkets > SHOP, code NOLI): glitchy bits cut from Mason's NOLI video audio, then broken
up even more - stutters, bit-crushing, reversed slices, dropouts, tape-stops. Each MOOD is a little pool of clips taken
from different parts of the video; the shop plays a random one from the pool that fits what he's reacting to
(ShopScene NOLI_VOICE).

  python3 tools/audio/noli_voice.py "path/to/Noli Voicelines and References.mp3"

Writes public/assets/shop/noli_voice/<mood>_<n>.ogg and .mp3 (and prints which part of the video each one came from).
The video file itself isn't kept in the repo.

How the clips are picked (the source is ~5.5 minutes): it's cut into 1.2 s windows; each window gets measured -
  loudness, noisiness (spectral flatness - how much it sounds like digital hash instead of a clean voice), choppiness
  (how hard the volume jumps every 10 ms) and repetition (a looping, stuck-sounding envelope).
Each mood takes the best windows for its sound, never two from the same 6 seconds, so he uses the whole video.
"""
import os, sys, subprocess, tempfile, wave
import numpy as np

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public/assets/shop/noli_voice')
rng = np.random.default_rng(14)

def load(path):
    tmp = os.path.join(tempfile.gettempdir(), 'noli_src.wav')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(SR), tmp], check=True)
    with wave.open(tmp) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
    os.remove(tmp); return x

def measure(x, win=1.2, hop=0.3):
    rows = []
    n, h = int(win * SR), int(hop * SR)
    for i in range(0, len(x) - n, h):
        a = x[i:i + n]; rms = np.sqrt(np.mean(a ** 2))
        if rms < 0.02: continue
        fr = np.lib.stride_tricks.sliding_window_view(a, 512)[::256] * np.hanning(512)
        S = np.abs(np.fft.rfft(fr, axis=1)) + 1e-9
        flat = float(np.mean(np.exp(np.mean(np.log(S), 1)) / np.mean(S, 1)))
        env = np.array([np.sqrt(np.mean(a[j:j + 220] ** 2)) for j in range(0, n - 220, 220)])
        chop = float(np.mean(np.abs(np.diff(20 * np.log10(env + 1e-6)))))
        e = env - env.mean(); ac = np.correlate(e, e, 'full')[len(e) - 1:]; ac = ac / (ac[0] + 1e-9)
        rows.append({'t': i / SR, 'rms': rms, 'flat': flat, 'chop': chop, 'rep': float(ac[3:15].max())})
    return rows

def pick(rows, key, n, used, ok=lambda r: True, sign=1):
    out = []
    for r in sorted(rows, key=lambda r: -sign * key(r)):
        if all(abs(r['t'] - u) > 6 for u in used) and ok(r):
            out.append(r); used.append(r['t'])
            if len(out) == n: break
    return out

# ------------------------------------------------------------------ the glitches
def crush(a, bits=5, hold=4, mix=1.0):
    """bit-crush: fewer volume steps, and each sample held for `hold` samples (that grainy, broken-speaker sound)"""
    q = np.round(a * 2 ** (bits - 1)) / 2 ** (bits - 1)
    q = np.repeat(q[::hold], hold)[:len(a)]
    return a * (1 - mix) + q * mix
def stutter(a, at, grain, times):
    """repeat a little slice of it `times` times, like a skipping CD"""
    i, g = int(at * len(a)), int(grain * SR)
    sl = a[i:i + g]
    return np.concatenate([a[:i]] + [sl * (0.85 + 0.15 * k / times) for k in range(times)] + [a[i:]])
def reverse_slice(a, at, length):
    i, g = int(at * len(a)), int(length * SR); b = a.copy(); b[i:i + g] = b[i:i + g][::-1]; return b
def dropouts(a, n, length=0.03):
    b = a.copy()
    for _ in range(n): i = rng.integers(0, max(1, len(b) - int(length * SR))); b[i:i + int(length * SR)] *= 0.02
    return b
def tape_stop(a, over=0.6):
    """the end slows down and drops in pitch, like a tape machine losing power"""
    n = int(over * SR); head, tail = a[:-n], a[-n:]
    pos = np.cumsum(np.linspace(1, 0.08, n)); pos = pos[pos < len(tail) - 1]
    return np.concatenate([head, np.interp(pos, np.arange(len(tail)), tail) * np.linspace(1, 0.3, len(pos))])
def pitch(a, ratio):
    pos = np.arange(0, len(a) - 1, ratio); return np.interp(pos, np.arange(len(a)), a)
def gate(a, on=0.05, off=0.03):
    """chop it on and off, fast"""
    m = np.zeros(len(a)); p = int((on + off) * SR); o = int(on * SR)
    for i in range(0, len(a), p): m[i:i + o] = 1
    return a * m
def static(n_sec, amp=0.4):
    return crush(rng.standard_normal(int(n_sec * SR)) * amp, 3, 6)
def shuffle(a, pieces=6):
    sl = np.array_split(a, pieces); order = rng.permutation(pieces); return np.concatenate([sl[i] for i in order])

def cut(x, t, d):
    a = x[int(t * SR):int((t + d) * SR)].copy(); return a / (np.max(np.abs(a)) + 1e-9) * 0.9   # (full volume before it's broken up)
def fade(a, i=0.01, o=0.05):
    a = a.copy(); ni, no = int(i * SR), int(o * SR); a[:ni] *= np.linspace(0, 1, ni); a[-no:] *= np.linspace(1, 0, no); return a

def write(a, name):
    a = a - np.mean(a); a = a / (np.max(np.abs(a)) + 1e-9) * 0.9
    loud = np.nonzero(np.abs(a) > 0.08)[0]                                     # (trim the quiet off both ends)
    if len(loud): a = fade(a[max(0, loud[0] - 200):loud[-1] + 400], 0.005, 0.03)
    tmp = os.path.join(tempfile.gettempdir(), 'nv_' + name + '.wav')
    with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((a * 32767).astype(np.int16).tobytes())
    base = os.path.join(OUT, name)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '96k', base + '.mp3'], check=True)
    os.remove(tmp)

# each mood: how many clips, which windows suit it, how long a bit to cut, and how to break it
MOODS = {
    # greeting: the most voice-like bits (least noisy), lightly broken - one skip, a little crush
    'greet': (3, lambda r: -r['flat'] + r['rms'], 1.3, lambda a: fade(crush(stutter(a, rng.uniform(0.2, 0.5), 0.07, 3), 6, 2, 0.6))),
    # blips: tiny bursts for things that happen all the time - pitched up, crushed hard, short
    'blip': (5, lambda r: r['chop'], 0.32, lambda a: fade(crush(pitch(stutter(a, 0.3, 0.035, 3), rng.choice([1.3, 1.6, 0.8])), 4, 5), 0.005, 0.03)),
    # tic: a phrase whose last syllable sticks and repeats
    'tic': (3, lambda r: r['rms'] + r['chop'] * 0.02, 1.1, lambda a: fade(crush(stutter(stutter(a, 0.8, 0.06, 5), 0.3, 0.04, 2), 6, 3, 0.7))),
    # crunch: the noisiest, most digital bits, crushed to pieces
    'crunch': (4, lambda r: r['flat'] if r['rms'] > 0.06 else -1, 0.9, lambda a: fade(dropouts(crush(np.tanh(a * 8), 4, 8), 3))),
    # snap: a burst that cuts off hard into static
    'snap': (3, lambda r: r['chop'] + r['rms'], 0.5, lambda a: fade(np.concatenate([crush(a, 5, 3), static(0.18)]), 0.005, 0.02)),
    # loop: the most repetitive bits, stuck in a stutter that climbs in pitch
    'loop': (3, lambda r: r['rep'], 1.6, lambda a: fade(np.concatenate([a[:int(0.5 * SR)]] + [pitch(a[int(0.5 * SR):int(0.58 * SR)], 1 + k * 0.06) for k in range(10)] + [crush(a[int(0.58 * SR):], 4, 4)]))),
    # dive: a voice with a reversed slice, then the tape stops
    'dive': (3, lambda r: r['rms'] - r['flat'] * 0.2, 1.6, lambda a: fade(tape_stop(reverse_slice(crush(a, 6, 2, 0.5), rng.uniform(0.2, 0.5), 0.15), 0.8))),
    # chop: chopped up, shuffled and gated - excited babble
    'chop': (3, lambda r: r['chop'], 1.6, lambda a: fade(crush(gate(shuffle(a, 7), 0.055, 0.025), 5, 3, 0.8))),
}

if __name__ == '__main__':
    src = sys.argv[1]
    x = load(src); rows = measure(x); used = []
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
    for mood, (n, key, d, fx) in MOODS.items():
        loud = lambda r: np.sqrt(np.mean(x[int(r['t'] * SR):int((r['t'] + d) * SR)] ** 2)) > 0.05   # (the bit actually cut has to have sound in it)
        for i, r in enumerate(pick(rows, key, n, used, loud)):
            a = fx(cut(x, r['t'], d)); write(a, '%s_%d' % (mood, i))
            print('%s_%d  from %d:%04.1f  (%.2f s)  noise %.2f chop %.1f repeat %.2f' % (mood, i, r['t'] // 60, r['t'] % 60, len(a) / SR, r['flat'], r['chop'], r['rep']))
