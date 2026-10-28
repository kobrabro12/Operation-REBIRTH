"""Music for the costume outros (src/scenes/winSkins.js) - one short piece per outro, all synthesised here.

  shrine   LACY / SAMURAI      a lone shakuhachi (Japanese bamboo flute) over a koto, a temple bowl and a stream.
                               Miyako-bushi scale on D (D Eb G A Bb). The flute scoops up into each note, swells,
                               then the vibrato (yuri) creeps in; breath noise all through; accents of breath (muraiki).
  rosebud  MR WAKE / ROSEBUD   a music-box waltz in A minor over a slow string pad - it winds down and stops at the end.
  abyss    ROSEMARY / DEEP SEA the deep: a sub drone, sonar pings, creaking pressure, far-off whale groans and a
                               broken lullaby on a detuned glass harmonica.
  dialup   WHAT ONCE WAS / DIAL-UP   a modem dialling and handshaking, then a lo-fi late-90s MIDI loop, sad and wrong.

Run:  python3 tools/audio/outro_music.py [names...]
Writes public/assets/audio/music/outro_<name>.ogg and .mp3 (needs ffmpeg). Loaded in BootScene as bgm_outro_<name>.
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 32000
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public/assets/audio/music')
rng = np.random.default_rng(7)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def secs(s): return int(round(s * SR))
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'highpass', fs=SR, output='sos'), x)
def noise(n): return rng.standard_normal(n)

def add(buf, x, at):
    i = secs(at)
    if i >= len(buf): return
    x = x[:len(buf) - i]; buf[i:i + len(x)] += x

def adsr(n, a, d, s, r):
    e = np.full(n, s, float)
    na, nd, nr = min(n, secs(a)), secs(d), min(n, secs(r))
    e[:na] = np.linspace(0, 1, na) if na else e[:na]
    if nd: seg = e[na:na + nd]; e[na:na + len(seg)] = np.linspace(1, s, nd)[:len(seg)]
    if nr: e[n - nr:] *= np.linspace(1, 0, nr)
    return e

def reverb(x, length=2.6, damp=3.2, wet=0.35, pre=0.02, bright=6000):
    """A synthetic hall: exponentially decaying noise, darker as it fades."""
    n = secs(length); t = np.arange(n) / SR
    ir = noise(n) * np.exp(-damp * t)
    ir = lp(ir, bright) * 0.7 + lp(ir, bright / 4) * 0.3
    ir = np.concatenate([np.zeros(secs(pre)), ir]); ir /= np.sqrt(np.sum(ir ** 2))
    y = fftconvolve(x, ir)[:len(x)]
    return x * (1 - wet) + y * wet * 2.2

def finish(x, name, peak=0.9, fade=1.5):
    x = x - np.mean(x)
    nf = secs(fade); x[-nf:] *= np.linspace(1, 0, nf) ** 2
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(tempfile.gettempdir(), 'outro_' + name + '.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
    base = os.path.join(OUT, 'outro_' + name)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '3', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '80k', base + '.mp3'], check=True)
    os.remove(tmp)
    print(name, '%.1f s' % (len(x) / SR))

# ------------------------------------------------------------------ instruments
def shakuhachi(midi, dur, vel=1.0, scoop=1.0, accent=False, bend_to=None):
    """A bamboo flute note: scooped attack, swell, delayed vibrato, breath through the tone."""
    n = secs(dur); t = np.arange(n) / SR; f0 = hz(midi)
    sc = -1.2 * scoop * np.exp(-t / 0.09)                                   # scoop up from below (semitones)
    vib_depth = 0.22 * np.clip((t - 0.45) / 0.9, 0, 1)                      # yuri: vibrato creeping in
    vib = vib_depth * np.sin(2 * np.pi * (4.6 + 0.6 * np.sin(t * 0.7)) * t)
    bend = 0 if bend_to is None else (bend_to - midi) * np.clip((t - dur * 0.62) / (dur * 0.3), 0, 1) ** 2   # meri/kari slide at the tail
    f = f0 * 2 ** ((sc + vib + bend) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) + 0.28 * np.sin(2 * ph + 0.3) + 0.12 * np.sin(3 * ph + 1.1) + 0.04 * np.sin(4 * ph)
    breath_pitched = bp(noise(n), f0 * 0.85, min(f0 * 1.25, SR / 2 - 100)) * 6       # breath riding the pitch
    breath_air = hp(noise(n), 1800) * 0.05                                           # the hiss across the mouthpiece
    swell = adsr(n, 0.12, 0.0, 1.0, min(0.5, dur * 0.4)) * (0.75 + 0.25 * np.sin(np.pi * np.clip(t / dur, 0, 1)))
    x = (tone * 0.75 + breath_pitched * 0.35 + breath_air) * swell * vel
    if accent:                                                                       # muraiki: an explosive breath
        m = secs(0.18); x[:m] += hp(noise(m), 900) * np.exp(-np.arange(m) / (SR * 0.05)) * 0.9 * vel
    return lp(x, 7000)

def koto(midi, dur=2.5, vel=1.0):
    """A plucked silk string: Karplus-Strong with a bright pluck and a slightly sharp attack."""
    f = hz(midi); n = secs(dur); p = max(2, int(SR / f))
    buf = (rng.random(p) * 2 - 1) * vel; out = np.zeros(n)
    prev = 0.0
    for i in range(n):
        v = buf[i % p]; nv = 0.5 * (v + buf[(i + 1) % p]) * 0.996
        buf[i % p] = nv; out[i] = v
    t = np.arange(n) / SR
    out += 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6) * vel                # the twang
    return lp(out, 5000) * np.exp(-t * 0.6)

def bowl(midi, dur=6.0, vel=1.0):
    """A temple singing bowl / rin: inharmonic partials with long, beating decays."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi); x = np.zeros(n)
    for r, a, d in [(1, 1, 0.35), (2.71, 0.5, 0.6), (5.13, 0.25, 1.0), (8.2, 0.12, 1.6), (1.003, 0.6, 0.35)]:
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d)
    m = secs(0.01); x[:m] *= np.linspace(0, 1, m)
    return x * vel

def musicbox(midi, dur=1.8, vel=1.0):
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.35 * np.sin(2 * np.pi * f * 4.2 * t) * np.exp(-t * 9) + 0.15 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 4)
    m = secs(0.003); x[:m] *= np.linspace(0, 1, m)
    return x * vel

def pad(midis, dur, vel=1.0, detune=0.08):
    """A slow string pad: a few detuned saws per note, softened."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for m in midis:
        for d in (-detune, 0, detune):
            f = hz(m + d); x += 2 * ((t * f) % 1) - 1
    x = lp(x, 1400, 2) / (len(midis) * 3)
    return x * adsr(n, dur * 0.35, 0, 1, dur * 0.4) * vel

def glass(midi, dur, vel=1.0, wobble=0.0):
    """Glass harmonica: pure, slightly detuned pair of sines, slow attack."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi) * 2 ** (wobble * np.sin(t * 2.1) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.6 * np.sin(ph * 1.004) + 0.2 * np.sin(2 * ph)
    return x * adsr(n, 0.25, 0, 1, 0.6) * vel

def sq(midi, dur, vel=1.0, duty=0.5, vib=0.0):
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi) * 2 ** (vib * np.sin(2 * np.pi * 5.5 * t) * np.clip(t - 0.2, 0, 1) / 12)
    ph = np.cumsum(f) / SR
    return np.where(ph % 1 < duty, 1.0, -1.0) * adsr(n, 0.01, 0.1, 0.6, 0.1) * vel

def fm_piano(midi, dur, vel=1.0):
    """A cheap 90s sound card electric piano (2-op FM)."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi)
    mod = np.sin(2 * np.pi * f * t) * 2.2 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.6) * vel

# ------------------------------------------------------------------ the pieces
def shrine():
    L = 34.0; buf = np.zeros(secs(L)); D = 62                     # D4
    S = {'D': 0, 'Eb': 1, 'G': 5, 'A': 7, 'Bb': 8, 'd': 12, 'eb': 13, 'g': 17, 'a': 19}
    # the stream, faint, all through
    st = bp(noise(len(buf)), 900, 4500) * 0.018 * (0.8 + 0.2 * np.sin(np.arange(len(buf)) / SR * 0.5))
    buf += st
    # temple bowl: at the start, the middle, near the end
    for at, m, v in [(0.0, D + 12, 0.35), (13.0, D + 7, 0.28), (26.5, D + 12, 0.3)]: add(buf, bowl(m, 7, v), at)
    # koto: sparse open-string patterns (D A d / G Bb d), now and then a glissando (sha-ran)
    kot = np.zeros(len(buf))
    pat = [(1.0, ['D', 'A', 'd']), (4.6, ['G', 'Bb', 'd']), (8.2, ['D', 'A', 'eb', 'd']), (11.8, ['A', 'Bb', 'd']),
           (15.4, ['D', 'G', 'A', 'd']), (19.0, ['Eb', 'G', 'Bb']), (22.6, ['D', 'A', 'd', 'a']), (26.2, ['G', 'A', 'd'])]
    for at, notes in pat:
        for i, nm in enumerate(notes): add(kot, koto(D - 12 + S[nm], 3.0, 0.55 - i * 0.05), at + i * 0.32)
    for at in (7.6, 21.8):                                                                  # sha-ran: a sweep up the strings
        for i, nm in enumerate(['D', 'Eb', 'G', 'A', 'Bb', 'd', 'eb', 'g']): add(kot, koto(D - 12 + S[nm], 1.6, 0.25), at + i * 0.05)
    buf += kot * 0.5
    # the flute: three phrases, long held notes, scoops, breath accents and a slide down at a phrase end
    fl = np.zeros(len(buf))
    phrase = [  # (start, note, dur, accent, slide-to)
        (2.2, 'A', 2.6, True, None), (4.9, 'Bb', 0.6, False, None), (5.5, 'A', 1.8, False, 'G'), (7.6, 'D', 2.4, False, None),
        (10.4, 'G', 1.2, True, None), (11.6, 'A', 0.5, False, None), (12.1, 'Bb', 2.6, False, None), (14.9, 'A', 0.8, False, None), (15.7, 'G', 2.2, False, 'Eb'),
        (18.4, 'd', 3.0, True, None), (21.5, 'eb', 0.5, False, None), (22.0, 'd', 1.0, False, None), (23.0, 'Bb', 1.4, False, None),
        (24.5, 'A', 1.0, False, None), (25.5, 'G', 0.6, False, None), (26.1, 'A', 4.4, True, 'D'),
    ]
    for at, nm, dur, acc, to in phrase:
        fl_note = shakuhachi(D + S[nm], dur + 0.25, 0.9, 1.0, acc, None if to is None else D + S[to])
        add(fl, fl_note, at)
    buf += reverb(fl, 3.2, 1.6, 0.45) * 0.55
    return finish(reverb(buf, 2.0, 2.4, 0.2), 'shrine')

def rosebud():
    L = 30.0; buf = np.zeros(secs(L)); A = 69                       # A4, A minor waltz at 84 bpm, slowing at the end
    beat = 60 / 84
    mel = [(0, 0), (1, 3), (2, 7), (3, 12), (4.5, 11), (5, 7),        # (beat, semitones over A4)
           (6, 8), (7, 7), (8, 3), (9, 5), (10.5, 3), (11, 2),
           (12, 0), (13, 3), (14, 7), (15, 12), (16, 15), (17, 14),
           (18, 12), (19, 11), (20, 8), (21, 7), (22.5, 5), (23, 3)]
    chords = [[-24, -12, -9, -5], [-24 + 5, -12 + 5, -7, -4], [-24 + 3, -12 + 3, -9, -5], [-24 + 7, -12 + 7, -8, -1]]
    t = 0.0; pos = 0.0; bi = 0
    times = []
    for b in range(64):                                                                    # tempo: steady, then the spring runs down from beat 11
        times.append(t); t += beat * (1 + max(0, b - 11) ** 1.6 * 0.06)
    def at_beat(b): i = int(b); f = b - i; return times[min(i, 63)] + f * (times[min(i + 1, 63)] - times[min(i, 63)])
    mb = np.zeros(len(buf)); STOP = 17
    for rep in range(2):
        for b, s in mel:
            bb = b + rep * 24
            if bb >= STOP: continue
            add(mb, musicbox(A + 12 + s, 2.0, 0.8), at_beat(bb))
    for bar in range(18):                                                                  # oom-pah-pah on the box's low comb
        ch = chords[bar % 4]
        for k in range(3):
            bb = bar * 3 + k
            if bb >= STOP: continue
            notes = [ch[0] + 12] if k == 0 else ch[2:]
            for m in notes: add(mb, musicbox(A + m + 12, 1.2, 0.35 if k else 0.5), at_beat(bb))
    buf += reverb(mb, 1.8, 2.8, 0.35) * 0.7
    ps = np.zeros(len(buf))
    for bar in range(0, 6, 2): add(ps, pad([A + m for m in chords[(bar // 2) % 4][1:]], beat * 6.6, 0.5), at_beat(bar * 3))
    buf += reverb(ps, 2.5, 2.0, 0.5) * 0.35
    # the lid closing, after the box stops
    end = at_beat(STOP) + 0.6
    print('rosebud: box stops at %.2f s, lid closes at %.2f s' % (at_beat(STOP - 1), end))
    m = secs(0.12); click = hp(noise(m), 1200) * np.exp(-np.arange(m) / (SR * 0.02)) * 0.6; add(buf, click, end)
    add(buf, lp(noise(secs(0.3)), 300) * np.exp(-np.arange(secs(0.3)) / (SR * 0.05)) * 0.5, end)
    # a little vinyl-ish dust over it all
    dust = np.zeros(len(buf)); idx = rng.integers(0, len(buf), 140); dust[idx] = rng.standard_normal(140) * 0.25
    buf += hp(dust, 2000)
    return finish(buf[:secs(min(L, end + 3))], 'rosebud', fade=0.8)

def abyss():
    L = 34.0; n = secs(L); t = np.arange(n) / SR; buf = np.zeros(n)
    drone = np.sin(2 * np.pi * 36.7 * t) * 0.6 + np.sin(2 * np.pi * 55 * t + np.sin(t * 0.3) * 2) * 0.3   # D1 + A1, slowly beating
    drone += lp(noise(n), 120) * 3.5
    buf += drone * (0.6 + 0.4 * np.sin(t * 0.21) ** 2)
    for at in np.arange(1.5, L - 2, 4.4):                                                   # sonar pings, echoing back
        for e, a in [(0, 1), (0.9, 0.35), (1.8, 0.12)]:
            m = secs(1.6); tt = np.arange(m) / SR
            add(buf, np.sin(2 * np.pi * 1480 * tt) * np.exp(-tt * 4) * 0.25 * a, at + e)
    for at in (6.0, 17.5, 27.0):                                                           # whale groans, far away
        m = secs(4.5); tt = np.arange(m) / SR; f = 90 + 70 * np.sin(np.pi * tt / 4.5) - 30 * tt / 4.5
        g = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 4.5) ** 2
        add(buf, lp(g + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR), 600) * 0.35, at)
    for at in rng.uniform(2, L - 2, 9):                                                    # the hull creaking under the pressure
        m = secs(0.8); tt = np.arange(m) / SR; f = 180 + rng.uniform(-60, 60) + 40 * tt
        c = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-tt * 3) * (rng.random(m) > 0.3)
        add(buf, bp(c, 150, 900) * 0.12, at)
    gl = np.zeros(n)                                                                        # the broken lullaby (a minor, falling)
    tune = [(8.0, 69, 1.4), (9.4, 72, 1.0), (10.4, 71, 1.4), (11.8, 67, 2.4), (14.6, 69, 1.4), (16.0, 64, 1.0), (17.0, 65, 1.6), (18.6, 64, 3.0),
            (22.0, 69, 1.4), (23.4, 72, 1.0), (24.4, 71, 1.4), (25.8, 76, 1.0), (26.8, 74, 4.0)]
    for at, m, d in tune: add(gl, glass(m, d + 0.4, 0.5, wobble=0.35), at)
    buf += reverb(gl, 4.0, 1.2, 0.6) * 0.5
    return finish(reverb(buf, 3.0, 1.6, 0.3, bright=2500), 'abyss')

def dialup():
    L = 30.0; n = secs(L); buf = np.zeros(n)
    # dial tone, then the number (DTMF), then the carrier and the screech of the handshake
    def tone(fs, d, v=0.4):
        m = secs(d); tt = np.arange(m) / SR; return sum(np.sin(2 * np.pi * f * tt) for f in fs) * v / len(fs)
    add(buf, tone([350, 440], 1.0), 0.0)
    DT = {'5': (770, 1336), '5b': (770, 1336), '0': (941, 1336), '9': (852, 1477), '1': (697, 1209), '2': (697, 1336), '7': (852, 1209)}
    for i, k in enumerate(['5', '5', '5', '0', '1', '9', '9', '2']): add(buf, tone(DT[k], 0.09, 0.5), 1.2 + i * 0.14)
    for i in range(3): add(buf, tone([440, 480], 0.5, 0.25), 2.6 + i * 0.7)                 # ringing...
    add(buf, tone([2100], 1.2, 0.35), 4.6)                                                 # the answer tone
    m = secs(2.4); tt = np.arange(m) / SR                                                  # the handshake: warbling, then a screech of noise
    hs = np.sin(2 * np.pi * (1200 + 600 * np.sign(np.sin(2 * np.pi * 37 * tt))) * tt) * 0.3 + bp(noise(m), 1000, 3000) * 0.4 * (tt > 1.0)
    hs += np.sin(2 * np.pi * (980 + 220 * np.sin(2 * np.pi * 3 * tt)) * tt) * 0.25 * (tt > 0.5)
    add(buf, hs, 5.9)
    add(buf, bp(noise(secs(1.0)), 1500, 3500) * 0.3 * np.linspace(1, 0, secs(1.0)), 8.3)
    # then the loop: an FM piano in E minor, a squarewave lead, a cheap drum machine - slowed, wobbling like a bad tape
    mus = np.zeros(n); E = 64; beat = 60 / 76; start = 9.4
    chords = [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]]
    lead = [7, 10, 12, 10, 7, 5, 3, 5, 7, 7, 12, 14, 15, 14, 12, 10]
    for bar in range(7):
        b0 = start + bar * 4 * beat
        for k in range(4):
            for m in chords[bar % 4]: add(mus, fm_piano(E - 12 + m, beat * 1.2, 0.25), b0 + k * beat)
        add(mus, sq(E - 24 + chords[bar % 4][0], beat * 3.8, 0.12, 0.25), b0)
        for k in range(4):                                                                 # kick / snare / hat
            mm = secs(0.25); tt = np.arange(mm) / SR
            if k % 2 == 0: add(mus, np.sin(2 * np.pi * (50 + 120 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 12) * 0.5, b0 + k * beat)
            else: add(mus, hp(noise(mm), 1500) * np.exp(-tt * 18) * 0.25, b0 + k * beat)
            add(mus, hp(noise(secs(0.05)), 6000) * 0.08, b0 + (k + 0.5) * beat)
        for k in range(2):
            add(mus, sq(E + lead[(bar * 2 + k) % len(lead)], beat * 1.8, 0.12, 0.125, vib=0.3), b0 + k * 2 * beat)
    tt = np.arange(n) / SR                                                                 # the tape wobble
    warp = (tt + 0.004 * np.sin(2 * np.pi * 0.6 * tt)) * SR
    mus = np.interp(warp, np.arange(n), mus)
    buf += lp(reverb(mus, 1.4, 3.0, 0.25), 5000)
    buf += hp(noise(n), 3000) * 0.006                                                      # line hiss
    return finish(buf, 'dialup')

PIECES = {'shrine': shrine, 'rosebud': rosebud, 'abyss': abyss, 'dialup': dialup}
if __name__ == '__main__':
    for nm in (sys.argv[1:] or PIECES): PIECES[nm]()
