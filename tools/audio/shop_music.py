"""Battle music sold in the shop (Trinkets > SHOP > MUSIC). Once bought, a track can be switched on to play in every
match instead of the stage's own music. All original, all synthesised; each one loops seamlessly (whole bars).

  neon    NEON DRIVE        synthwave: pulsing octave bass, a gated pad, a bright lead, big snare
  lofi    LOFI DOJO         lo-fi hip hop: swung Rhodes chords, a koto melody, dusty boom-bap and vinyl crackle
  chip    8-BIT RUSH        a fast chiptune: square leads and arps, triangle bass, noise drums
  organ   GRAVEYARD SHIFT   a spooky waltz on a pipe organ with tolling bells
  surf    SURF'S UP         surf rock: tremolo-picked reverb guitar, a driving beat
  jazz    BLUE HOUR         a jazz trio: walking bass, Rhodes comping, brushes and a saxophone
  taiko   TAIKO THUNDER     war drums under a shakuhachi and koto
  dream   STARLIGHT         a music box, a slow pad and glass bells - gentle

Run:  python3 tools/audio/shop_music.py [names...]
Writes public/assets/audio/music/shop_<name>.ogg and .mp3. Loaded in BootScene as bgm_shop_<name>.
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import (SR, hz, secs, bp, lp, hp, noise, add, adsr, reverb, shakuhachi, koto, bowl, musicbox, pad,
                         glass, sq, fm_piano, piano, rhodes, sax, drum_kick, drum_snare, drum_hat, whistle)

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public/assets/audio/music')
rng = np.random.default_rng(11)

def write(x, name, peak=0.88):
    x = x - np.mean(x)
    n = secs(0.01); x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)      # (no fade: it loops)
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    tmp = os.path.join(tempfile.gettempdir(), 'shop_' + name + '.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
    base = os.path.join(OUT, 'shop_' + name)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '3', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '96k', base + '.mp3'], check=True)
    os.remove(tmp)
    print(name, '%.1f s' % (len(x) / SR))

def wrap_reverb(x, *a, **k):
    """Reverb that wraps around the loop point, so the tail of the end rings into the start."""
    y = reverb(np.concatenate([x, x]), *a, **k)
    return y[len(x):]

# ------------------------------------------------------------------ extra instruments
def saw(m, dur, vel=1.0, cut=2500, det=0.08, a=0.005, r=0.08):
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for d in (-det, det): x += 2 * ((t * hz(m + d)) % 1) - 1
    return lp(x, cut) * adsr(n, a, 0.05, 0.85, min(r, dur * 0.5)) * vel * 0.5
def tri(m, dur, vel=1.0):
    n = secs(dur); ph = (np.arange(n) * hz(m) / SR) % 1
    return (4 * np.abs(ph - 0.5) - 1) * adsr(n, 0.005, 0.0, 1, 0.03) * vel
def nz_drum(kind, vel=1.0):
    n = secs(0.12 if kind == 'hat' else 0.2); t = np.arange(n) / SR
    if kind == 'hat': return hp(noise(n), 6000) * np.exp(-t * 50) * 0.3 * vel
    if kind == 'snare': return np.sign(noise(n)) * np.exp(-t * 18) * 0.35 * vel
    return np.sin(2 * np.pi * (60 + 160 * np.exp(-t * 40)) * t) * np.exp(-t * 14) * vel
def organ(m, dur, vel=1.0):
    n = secs(dur); t = np.arange(n) / SR; f = hz(m)
    x = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in [(0.5, 0.6), (1, 1), (2, 0.6), (3, 0.3), (4, 0.25), (6, 0.1)])
    x *= 1 + 0.08 * np.sin(2 * np.pi * 5.5 * t)                                         # a slow Leslie wobble
    return x * adsr(n, 0.04, 0, 1, 0.1) * vel * 0.18
def taiko(vel=1.0, big=True):
    n = secs(0.9 if big else 0.4); t = np.arange(n) / SR
    f = (70 if big else 140) * (1 + 0.6 * np.exp(-t * 25))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (5 if big else 11)) + lp(noise(n), 900) * np.exp(-t * 30) * 0.8
    return x * vel
def crackle(n, amt=0.2):
    x = np.zeros(n); idx = rng.integers(0, n, n // 900); x[idx] = rng.standard_normal(len(idx)) * amt
    return hp(x, 2500) + lp(noise(n), 4000) * 0.004

# ------------------------------------------------------------------ the tracks
def neon():
    bpm, bars = 100, 16; b = 60 / bpm; L = bars * 4 * b; N = secs(L); buf = np.zeros(N); A = 45
    prog = [0, 0, -4, -4, -7, -7, -2, -2] * 2                                            # Am F C G, two bars each
    chords = {0: [0, 3, 7], -4: [-4, 0, 3], -7: [-7, -3, 0], -2: [-2, 2, 5]}
    lead = [12, 15, 19, 17, 15, 12, 10, 12, 15, 19, 22, 19, 17, 15, 17, None]
    for bar in range(bars):
        r = prog[bar]; t0 = bar * 4 * b
        for k in range(8): add(buf, saw(A + r + (12 if k % 2 else 0), b * 0.45, 0.5, 900), t0 + k * b / 2)   # pulsing octave bass
        for k in range(8): add(buf, saw(A + 12 + chords[r][k % 3] + 12, b * 0.4, 0.12, 3200) * (0.6 if k % 2 else 1), t0 + k * b / 2)   # gated arp
        add(buf, pad([A + 24 + c for c in chords[r]], 4 * b, 0.4, 0.12), t0)
        for k in range(4):
            add(buf, drum_kick(0.9), t0 + k * b)
            if k % 2: add(buf, wrap_reverb(np.concatenate([drum_snare(0.9), np.zeros(secs(0.3))]), 1.4, 3, 0.5), t0 + k * b)
            add(buf, drum_hat(0.5), t0 + k * b + b / 2)
        if bar >= 4:                                                                      # the lead comes in on bar 5
            for k in range(4):
                m = lead[(bar * 4 + k) % 16]
                if m is not None: add(buf, sq(A + 12 + m, b * 0.9, 0.18, 0.25, vib=0.2), t0 + k * b)
    return write(wrap_reverb(buf, 1.2, 3, 0.2), 'neon')

def lofi():
    bpm, bars = 80, 16; b = 60 / bpm; L = bars * 4 * b; N = secs(L); buf = np.zeros(N); D = 50
    chords = [[0, 4, 7, 11, 14], [-3, 0, 4, 7, 11], [2, 5, 9, 12, 16], [-5, -1, 2, 5, 9]]   # Dmaj9 Bm9 Em9 A13-ish
    swing = lambda k: (k // 2) * b + (k % 2) * b * 0.62
    mel = [14, None, 12, 9, None, 7, 9, None, 12, 14, None, 16, 14, None, 12, None]
    for bar in range(bars):
        ch = chords[bar % 4]; t0 = bar * 4 * b
        for k, off in enumerate([0, swing(3), swing(5)]):
            for m in ch: add(buf, rhodes(D + 12 + m, b * 1.6, 0.55 if k == 0 else 0.35), t0 + off)
        add(buf, tri(D - 12 + ch[0], b * 1.8, 0.35), t0); add(buf, tri(D - 12 + ch[0] + 7, b * 0.9, 0.25), t0 + swing(5))
        for k in range(8):
            if k in (0, 5): add(buf, lp(drum_kick(1.0), 2000), t0 + swing(k))
            if k in (2, 6): add(buf, lp(drum_snare(0.8), 3500), t0 + swing(k))
            add(buf, lp(drum_hat(0.4 if k % 2 else 0.6), 6000), t0 + swing(k))
        if bar % 8 >= 2:
            for k in range(4):
                m = mel[(bar * 4 + k) % 16]
                if m is not None: add(buf, koto(D + 12 + m, 1.6, 0.45), t0 + k * b + (0.04 if k % 2 else 0))
    buf = lp(buf, 4200) + crackle(N, 0.25)
    return write(wrap_reverb(buf, 1.6, 2.6, 0.22), 'lofi')

def chip():
    bpm, bars = 150, 24; b = 60 / bpm; L = bars * 4 * b; N = secs(L); buf = np.zeros(N); E = 52
    prog = [0, 0, 5, 5, 3, 3, -2, -2]
    lead = [12, 12, 19, 12, 17, 15, 12, 10, 12, 15, 17, 19, 22, 19, 17, 15]
    for bar in range(bars):
        r = prog[bar % 8]; t0 = bar * 4 * b
        for k in range(8): add(buf, tri(E - 12 + r + (12 if k in (2, 6) else 0), b * 0.45, 0.5), t0 + k * b / 2)   # triangle bass
        for k in range(16): add(buf, sq(E + 12 + r + [0, 3, 7, 12][k % 4], b * 0.22, 0.07, 0.125), t0 + k * b / 4)   # arps
        for k in range(4):
            add(buf, nz_drum('kick', 0.8), t0 + k * b)
            if k % 2: add(buf, nz_drum('snare', 0.7), t0 + k * b)
            add(buf, nz_drum('hat', 0.6), t0 + k * b + b / 2)
        if bar >= 8:
            for k in range(4):
                m = lead[(bar * 4 + k) % 16] + (5 if bar >= 16 else 0)
                add(buf, sq(E + m + 12, b * 0.8, 0.15, 0.25, vib=0.25), t0 + k * b)
    return write(buf, 'chip')

def organ_piece():
    bpm, bars = 132, 24; b = 60 / bpm; L = bars * 3 * b; N = secs(L); buf = np.zeros(N); C = 48   # a waltz: 3 beats a bar
    prog = [[0, 3, 7], [5, 8, 12], [-1, 2, 5, 8], [0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2], [-5, -1, 2]]
    mel = [15, 14, 12, 11, 12, 14, 15, 17, 19, 17, 15, 14, 12, 11, 8, 7, 8, 11, 12, 14, 15, 14, 12, 11]
    for bar in range(bars):
        ch = prog[bar % 8]; t0 = bar * 3 * b
        add(buf, organ(C - 12 + ch[0], b * 0.9, 1.2), t0)                              # oom...
        for k in (1, 2):
            for m in ch: add(buf, organ(C + m, b * 0.8, 0.6), t0 + k * b)               # ...pah, pah
        m = mel[bar % len(mel)]; add(buf, organ(C + 12 + m, b * 2.8, 0.9), t0)
        if bar % 8 == 0: add(buf, bowl(C - 12, 6.0, 0.5), t0)                            # a bell tolls
    buf += lp(noise(N), 500) * 0.02                                                       # wind in the crypt
    return write(wrap_reverb(buf, 2.8, 1.8, 0.4), 'organ')

def surf():
    bpm, bars = 160, 24; b = 60 / bpm; L = bars * 4 * b; N = secs(L); buf = np.zeros(N); E = 52
    prog = [0, 0, 5, 5, 0, 0, 7, 5]
    riff = [0, 3, 5, 7, 10, 7, 5, 3]
    for bar in range(bars):
        r = prog[bar % 8]; t0 = bar * 4 * b
        for k in range(8): add(buf, tri(E - 12 + r + [0, 0, 7, 0, 10, 7, 5, 3][k], b * 0.45, 0.6), t0 + k * b / 2)
        for k in range(4):
            add(buf, drum_kick(0.8), t0 + k * b)
            if k % 2: add(buf, drum_snare(0.8), t0 + k * b)
            for s in range(2): add(buf, drum_hat(0.5), t0 + k * b + s * b / 2)
        if bar >= 4:                                                                      # tremolo-picked melody, drenched in spring reverb
            m = riff[bar % 8] + r
            for s in range(16): add(buf, koto(E + 12 + m + (12 if bar % 4 == 3 and s > 8 else 0), 0.25, 0.4), t0 + s * b / 4)
    return write(wrap_reverb(buf, 2.0, 2.4, 0.4), 'surf')

def jazz():
    bpm, bars = 132, 16; b = 60 / bpm; L = bars * 4 * b; N = secs(L); buf = np.zeros(N); F = 53
    prog = [(2, [2, 5, 9, 12]), (7, [7, 11, 14, 17]), (0, [0, 4, 7, 11]), (9, [9, 12, 16, 19])]   # ii V I vi
    sw = lambda k: (k // 2) * b + (k % 2) * b * 0.66
    tune = [16, 14, 12, None, 14, 16, 19, None, 21, 19, 17, 16, 14, None, 12, None]
    for bar in range(bars):
        root, ch = prog[bar % 4]; t0 = bar * 4 * b
        walk = [root, root + 4, root + 7, root + 9]
        for k in range(4): add(buf, lp(tri(F - 24 + walk[k], b * 0.95, 0.7), 900), t0 + k * b)   # walking bass
        for off in (sw(1), sw(5)):
            for m in ch: add(buf, rhodes(F + m, b * 0.8, 0.4), t0 + off)
        for k in range(4): add(buf, drum_snare(0.6, brush=True), t0 + k * b); add(buf, drum_hat(0.4), t0 + sw(k * 2 + 1))
        if bar >= 4:
            for k in range(4):
                m = tune[(bar * 4 + k) % 16]
                if m is not None: add(buf, sax(F + 12 + m, b * 0.9, 0.5), t0 + sw(k * 2))
    return write(wrap_reverb(buf, 1.6, 2.6, 0.25), 'jazz')

def taiko_piece():
    bpm, bars = 112, 16; b = 60 / bpm; L = bars * 4 * b; N = secs(L); buf = np.zeros(N); D = 62
    pattern = [(0, 1, True), (1.5, 0.7, False), (2, 1, True), (3, 0.6, False), (3.5, 0.8, False)]
    for bar in range(bars):
        t0 = bar * 4 * b
        for at, v, big in pattern: add(buf, taiko(v, big), t0 + at * b)
        if bar % 4 == 3: [add(buf, taiko(0.5 + i * 0.12, False), t0 + (2 + i * 0.25) * b) for i in range(8)]   # a roll into the next phrase
        for k in range(4): add(buf, koto(D - 12 + [0, 7, 12, 7][k], 1.2, 0.35), t0 + k * b)
    fl = np.zeros(N)
    for at, m, d in [(4, 9, 3), (7.5, 10, 1), (8.5, 9, 2), (12, 5, 3), (16, 7, 2.5), (19, 9, 1), (20, 12, 4), (25, 10, 2), (27.5, 9, 3)]:
        add(fl, shakuhachi(D + m, d * b * 1.4, 0.9, 1.0, True), at * b)
    buf += wrap_reverb(fl, 2.4, 2.0, 0.4) * 0.5
    return write(wrap_reverb(buf, 1.8, 2.2, 0.25), 'taiko')

def dream():
    bpm, bars = 72, 12; b = 60 / bpm; L = bars * 4 * b; N = secs(L); buf = np.zeros(N); G = 55
    chords = [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [2, 5, 9, 12]]
    box = [12, 16, 19, 23, 19, 16, 14, 12]
    for bar in range(bars):
        ch = chords[bar % 4]; t0 = bar * 4 * b
        add(buf, pad([G + c for c in ch], 4 * b + 0.5, 0.45, 0.1), t0)
        for k in range(8): add(buf, musicbox(G + 12 + box[(k + bar) % 8] + ch[0] - (12 if ch[0] > 4 else 0), 1.8, 0.35), t0 + k * b / 2)
        if bar % 2 == 0: add(buf, glass(G + 24 + ch[2], 3.0, 0.3, wobble=0.15), t0 + b)
    return write(wrap_reverb(buf, 3.0, 1.4, 0.45), 'dream')

PIECES = {'neon': neon, 'lofi': lofi, 'chip': chip, 'organ': organ_piece, 'surf': surf, 'jazz': jazz, 'taiko': taiko_piece, 'dream': dream}
if __name__ == '__main__':
    for nm in (sys.argv[1:] or PIECES): PIECES[nm]()
