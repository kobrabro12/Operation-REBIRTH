"""Music for the costume outros (src/scenes/winSkins.js) - one short piece per outro, all synthesised here.

  shrine   LACY / SAMURAI      a lone shakuhachi (Japanese bamboo flute) over a koto, a temple bowl and a stream.
                               Miyako-bushi scale on D (D Eb G A Bb). The flute scoops up into each note, swells,
                               then the vibrato (yuri) creeps in; breath noise all through; accents of breath (muraiki).
  rosebud  MR WAKE / ROSEBUD   a music-box waltz in A minor over a slow string pad - it winds down and stops at the end.
  abyss    ROSEMARY / DEEP SEA the deep: a sub drone, sonar pings, creaking pressure, far-off whale groans and a
                               broken lullaby on a detuned glass harmonica.
  dialup   WHAT ONCE WAS / DIAL-UP   a modem dialling and handshaking, then a lo-fi late-90s MIDI loop, sad and wrong.
  western  SOUL SUMMONER / HIGH NOON   whistle and twang guitar, a bell at noon (7.0 s), then brass and choir (9.4 s).
  monster  MR WAKE / CREATURE FEATURE  theremin and timpani; DUN DUN DUNNN at the reveal (5.0 s).
  ragtime  NU / SILENT FILM            an original rag on an out-of-tune upright, projector clicking.
  victory  LACY / 16-BIT HERO          a chip battle loop, a victory fanfare at 6.6 s, a results tune from 10.4 s.
  weather  AERO / FORECAST             smooth jazz for the local forecast.

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

# ------------------------------------------------------------------ instruments for the homage costumes
def whistle(midi, dur, vel=1.0, slide_from=None):
    """A lone whistler: a near-pure sine, breathy, sliding into the note, vibrato on the long ones."""
    n = secs(dur); t = np.arange(n) / SR
    st = 0 if slide_from is None else (slide_from - midi) * np.exp(-t / 0.06)
    vib = 0.25 * np.clip((t - 0.3) / 0.5, 0, 1) * np.sin(2 * np.pi * 5.8 * t)
    ph = 2 * np.pi * np.cumsum(hz(midi) * 2 ** ((st + vib) / 12)) / SR
    x = np.sin(ph) + 0.06 * np.sin(2 * ph) + bp(noise(n), hz(midi) * 0.9, hz(midi) * 1.1) * 1.5
    return x * adsr(n, 0.04, 0, 1, 0.12) * vel

def twang(midi, dur=1.6, vel=1.0):
    """A twangy reverb guitar: a bright pluck with a fast tremolo."""
    t = np.arange(secs(dur)) / SR
    return koto(midi, dur, vel) * (0.75 + 0.25 * np.sin(2 * np.pi * 6.5 * t))

def brass(midi, dur, vel=1.0, bright=1.0):
    """A brassy stab / trumpet: detuned saws through a filter that opens on the attack."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for d in (-0.06, 0.06): x += 2 * ((t * hz(midi + d)) % 1) - 1
    cut = 600 + 3200 * bright * np.exp(-t * 3) + 800 * bright
    y = np.zeros(n); a = 0.0                                                    # a cheap time-varying one-pole low-pass
    k = 1 - np.exp(-2 * np.pi * cut / SR)
    for i in range(n): a += k[i] * (x[i] - a); y[i] = a
    return y * adsr(n, 0.03, 0.1, 0.8, 0.1) * vel * 0.6

def theremin(notes, vel=1.0):
    """A theremin: one long wavering sine, gliding from note to note. notes = [(time, midi), ...], last = end."""
    end = notes[-1][0]; n = secs(end); t = np.arange(n) / SR
    m = np.interp(t, [a for a, _ in notes], [b for _, b in notes])
    m = lp(m, 6)                                                                # glide
    f = hz(0) * 2 ** ((m + 0.45 * np.sin(2 * np.pi * 6.2 * t)) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.15 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    return x * adsr(n, 0.3, 0, 1, 0.6) * vel

def timpani(midi, dur=1.5, vel=1.0, roll=0.0):
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi)
    x = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 3) + lp(noise(n), 400) * np.exp(-t * 12) * 2
    if roll: x *= 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 9 * t))
    return x * vel * 0.5

def piano(midi, dur=1.2, vel=1.0, honky=0.12):
    """An old upright: a few harmonics with their own decays, two strings slightly out of tune with each other."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n); f = hz(midi)
    for h, a, d in [(1, 1, 2.5), (2, 0.5, 3.5), (3, 0.25, 5), (4, 0.12, 7), (5, 0.06, 9)]:
        for det in (0, honky): x += a * np.sin(2 * np.pi * f * h * 2 ** (det / 12) * t) * np.exp(-t * d)
    hammer = hp(noise(min(n, secs(0.02))), 2000) * 0.3; x[:len(hammer)] += hammer
    return x * vel * 0.25

def chip(midi, dur, vel=1.0, duty=0.25):
    """A 16-bit-ish lead: pulse wave with a touch of vibrato and a soft echo added later."""
    return sq(midi, dur, vel, duty, vib=0.15)

def rhodes(midi, dur, vel=1.0):
    n = secs(dur); t = np.arange(n) / SR; f = hz(midi)
    mod = np.sin(2 * np.pi * f * t) * 1.2 * np.exp(-t * 2)
    x = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 0.9) + 0.2 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 3)
    return x * (1 + 0.15 * np.sin(2 * np.pi * 4.5 * t)) * vel * 0.3

def sax(midi, dur, vel=1.0):
    n = secs(dur); t = np.arange(n) / SR
    f = hz(midi) * 2 ** ((0.18 * np.clip(t - 0.25, 0, 1) * np.sin(2 * np.pi * 5 * t) - 0.5 * np.exp(-t / 0.05)) / 12)
    ph = np.cumsum(f) / SR; x = 2 * (ph % 1) - 1
    x = lp(x, 2200) + bp(noise(n), 1500, 4000) * 0.04
    return x * adsr(n, 0.05, 0.1, 0.85, 0.15) * vel * 0.5

def drum_kick(vel=1.0):
    n = secs(0.3); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (45 + 110 * np.exp(-t * 28)) * t) * np.exp(-t * 10) * vel
def drum_snare(vel=1.0, brush=False):
    n = secs(0.25 if not brush else 0.4); t = np.arange(n) / SR
    return (hp(noise(n), 1200 if not brush else 2500) * np.exp(-t * (16 if not brush else 7)) * (0.5 if not brush else 0.15) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.3 * (not brush)) * vel
def drum_hat(vel=1.0):
    n = secs(0.06); t = np.arange(n) / SR
    return hp(noise(n), 7000) * np.exp(-t * 60) * 0.25 * vel

# ------------------------------------------------------------------ the homage pieces
def western():
    """HIGH NOON (Soul Summoner): a lone whistle and a twangy guitar, tension, a bell at noon (7.0 s), silence for the
    stand-off, then the brass and the choir when it's over (from 9.4 s)."""
    L = 22.0; buf = np.zeros(secs(L)); A = 57                                    # A minor
    wind = lp(noise(len(buf)), 700) * 0.04 * (0.6 + 0.4 * np.sin(np.arange(len(buf)) / SR * 0.8)); buf += wind
    gt = np.zeros(len(buf))
    prog = [(0, [0, 7, 12]), (1.6, [-2, 5, 10]), (3.2, [-4, 3, 8]), (4.8, [-5, 2, 7])]  # Am  G  F  E
    for at, ch in prog:
        for i, m in enumerate(ch): add(gt, twang(A + m, 2.2, 0.7 - i * 0.12), at + 0.3 + i * 0.09)
        add(gt, twang(A - 12 + ch[0], 2.2, 0.8), at + 0.3)
    buf += reverb(gt, 2.4, 2.2, 0.5) * 0.6
    wh = np.zeros(len(buf))
    for at, m, d, sl in [(0.4, 76, 1.0, 69), (1.5, 74, 0.35, None), (1.9, 72, 0.35, None), (2.3, 69, 1.4, None),
                         (3.9, 72, 0.4, None), (4.3, 74, 0.4, None), (4.7, 76, 0.5, None), (5.2, 71, 1.6, 64)]:
        add(wh, whistle(m, d, 0.6, sl), at)
    buf += reverb(wh, 3.0, 1.8, 0.55) * 0.55
    add(buf, bowl(45, 6.0, 0.6), 7.0); add(buf, bowl(57, 5.0, 0.25), 7.0)         # the church bell: noon
    for at in (8.0, 8.6, 9.0): add(buf, lp(noise(secs(0.4)), 300) * np.exp(-np.arange(secs(0.4)) / (SR * 0.1)) * 0.12, at)   # a heartbeat
    br = np.zeros(len(buf))                                                       # 9.4 s: it's over - the brass sings out
    for at, m, d in [(9.4, 69, 0.4), (9.8, 76, 1.4), (11.3, 74, 0.3), (11.6, 72, 0.3), (11.9, 71, 0.3), (12.2, 72, 1.6),
                     (14.0, 69, 0.4), (14.4, 77, 1.2), (15.7, 76, 0.4), (16.1, 74, 0.4), (16.5, 72, 0.4), (16.9, 76, 2.6)]:
        add(br, brass(m, d + 0.1, 0.55), at)
    for at, ch in [(9.4, [57, 64, 69]), (12.2, [53, 60, 65]), (14.4, [55, 62, 67]), (16.9, [57, 64, 69])]:
        add(br, pad([c + 12 for c in ch], 3.2, 0.5, 0.12), at)                   # the choir
        add(br, twang(ch[0] - 12, 2.6, 0.7), at)
    buf += reverb(br, 2.8, 1.8, 0.45) * 0.55
    return finish(buf, 'western')

def monster():
    """CREATURE FEATURE (Mr Wake): a theremin over low brass and timpani; DUN - DUN - DUNNN at the reveal (5.0 s);
    then the theremin wails over the city."""
    L = 20.0; buf = np.zeros(secs(L))
    for at in np.arange(0, 5, 0.5): add(buf, timpani(38, 0.6, 0.35 + at * 0.05, roll=1), at)   # a timpani roll, building
    th = theremin([(0, 67), (1.0, 67), (1.8, 70), (2.6, 66), (3.6, 63), (4.6, 62), (5.0, 62)], 0.6)
    add(buf, reverb(th, 2.2, 2.0, 0.45) * 0.6, 0.2)
    for at, m in [(5.0, 38), (5.6, 37), (6.3, 36)]:                               # DUN - DUN - DUNNN
        add(buf, brass(m, 0.5 if at < 6 else 1.6, 1.0, 0.6) + brass(m + 12, 0.5 if at < 6 else 1.6, 0.6, 0.6), at)
        add(buf, timpani(m, 1.2, 1.0), at)
    th2 = theremin([(0, 74), (0.8, 79), (1.6, 75), (2.4, 82), (3.4, 78), (4.2, 74), (5.0, 77), (6.0, 73), (7.0, 70), (8.0, 74), (9.0, 69), (10.5, 66), (12.0, 66)], 0.7)
    add(buf, reverb(th2, 2.6, 1.6, 0.5) * 0.6, 7.2)
    st = np.zeros(len(buf))
    for at, ch in [(7.2, [50, 53, 57]), (10.2, [49, 53, 56]), (13.2, [48, 51, 55]), (16.2, [50, 53, 57])]:
        add(st, pad(ch, 3.4, 0.7, 0.1), at); add(st, timpani(ch[0] - 12, 1.4, 0.6), at)
    buf += reverb(st, 2.4, 2.0, 0.4) * 0.6
    proj = np.zeros(len(buf)); clicks = np.arange(0, len(buf), int(SR / 24)); proj[clicks] = 0.06   # the projector, ticking
    buf += hp(proj, 1500) + lp(noise(len(buf)), 3000) * 0.01
    return finish(buf, 'monster')

def ragtime():
    """SILENT FILM (NU): a honky-tonk upright playing a rag (an original one), with the projector clicking along."""
    L = 22.0; buf = np.zeros(secs(L)); beat = 60 / 112; C = 60
    bass = [(0, [-24, -12]), (1, [-5, 0, 4]), (2, [-17, -5]), (3, [-5, 0, 4]),          # oom-pah: root, chord, fifth, chord
            (4, [-19, -7]), (5, [-3, 2, 5]), (6, [-24, -12]), (7, [-5, 0, 4])]
    bars = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7], [5, 9, 12], [2, 5, 9], [7, 11, 14], [0, 4, 7]]
    # the tune: syncopated, in eighths (rests = None)
    tune = [76, None, 79, 76, 77, None, 76, 72, 74, 76, None, 72, 69, None, 67, None,
            72, None, 76, 79, 81, 79, None, 77, 76, None, 74, 72, 74, None, None, None,
            76, None, 79, 76, 77, None, 76, 72, 81, 79, None, 76, 77, 76, 74, 72,
            79, 81, 79, 76, 74, None, 72, 74, 72, None, None, None, 72, 76, 79, 84]
    for rep in range(2):
        t0 = rep * 32 * beat * 0.5 * 2
        for bar in range(8):
            ch = bars[bar]
            for k in range(4):
                b = t0 + (bar * 4 + k) * beat
                if k % 2 == 0: add(buf, piano(C - 24 + ch[0], 0.8, 0.9), b); add(buf, piano(C - 12 + ch[0], 0.8, 0.5), b)
                else:
                    for m in ch: add(buf, piano(C + m - 12 + 12 * (m < 4), 0.5, 0.45), b)
        for i, m in enumerate(tune):
            if m is None: continue
            b = t0 + i * beat / 2 + (0.03 if i % 2 else 0)                              # a little swing
            add(buf, piano(m, 0.7, 0.8), b); add(buf, piano(m - 12, 0.7, 0.3), b)
    proj = np.zeros(len(buf)); proj[np.arange(0, len(buf), int(SR / 18))] = 0.08
    buf = reverb(buf, 1.0, 4.0, 0.12) + hp(proj, 1800) + bp(noise(len(buf)), 200, 4000) * 0.008
    buf = lp(hp(buf, 180), 5500)                                                 # thin, like an old recording
    return finish(buf, 'ragtime')

def victory():
    """16-BIT HERO (Lacy): a battle loop (0-6.6 s), then an original victory fanfare (6.6 s) and a calm results tune."""
    L = 22.0; buf = np.zeros(secs(L)); beat = 60 / 150; D = 62
    bt = np.zeros(len(buf))
    bass = [0, 0, 12, 0, -2, -2, 10, -2, -4, -4, 8, -4, -5, -5, 7, 7]
    lead = [12, None, 15, 17, 19, None, 17, 15, 14, None, 10, 12, 14, 15, 17, 19]
    for rep in range(2):
        for i in range(16):
            b = (rep * 16 + i) * beat * 0.5 + 0.0
            if b >= 6.4: break
            add(bt, sq(D - 24 + bass[i], beat * 0.45, 0.35, 0.5), b)
            if lead[i] is not None: add(bt, chip(D + lead[i], beat * 0.9, 0.22, 0.25), b)
            if i % 4 == 0: add(bt, drum_kick(0.7), b)
            if i % 4 == 2: add(bt, drum_snare(0.6), b)
            add(bt, drum_hat(0.6), b)
    buf += reverb(bt, 1.2, 4, 0.15) * 0.8
    # the fanfare: a run up, three hits, a held chord
    F = 6.6; ff = np.zeros(len(buf)); C5 = 72
    for at, m, d in [(0, 60, 0.12), (0.12, 64, 0.12), (0.24, 67, 0.12), (0.36, 72, 0.5), (0.9, 71, 0.15), (1.08, 72, 0.15), (1.26, 74, 0.15),
                     (1.44, 76, 0.6), (2.1, 74, 0.2), (2.32, 76, 0.2), (2.54, 79, 1.6)]:
        add(ff, brass(m, d + 0.08, 0.6, 1.2), F + at); add(ff, chip(m + 12, d, 0.15, 0.125), F + at)
    for at, ch in [(0.36, [48, 55, 64]), (1.44, [53, 60, 65]), (2.54, [55, 62, 67, 71])]:
        for m in ch: add(ff, brass(m, 0.5 if at < 2 else 1.7, 0.35, 0.8), F + at)
        add(ff, drum_kick(0.8) + 0 * 0, F + at); add(ff, drum_snare(0.5), F + at)
    buf += reverb(ff, 1.6, 3, 0.25)
    # the results screen: a gentle loop
    R = 10.4; rs = np.zeros(len(buf)); b2 = 60 / 104
    prog = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]]
    mel = [76, 74, 72, 74, 76, 79, 76, None, 74, 72, 69, 72, 74, None, 72, None]
    for rep in range(2):
        for bar in range(4):
            t0 = R + (rep * 4 + bar) * 4 * b2 * 0.5
            for k in range(4):
                for m in prog[bar]: add(rs, sq(m, b2 * 0.4, 0.08, 0.5), t0 + k * b2 * 0.5)
            add(rs, sq(prog[bar][0] - 12, b2 * 1.8, 0.25, 0.5), t0)
            for j in range(4):
                m = mel[(bar * 4 + j) % 16]
                if m is not None: add(rs, chip(m, b2 * 0.45, 0.2, 0.25), t0 + j * b2 * 0.5)
    buf += reverb(rs, 1.4, 3, 0.3) * 0.7
    return finish(buf, 'victory')

def weather():
    """FORECAST (AERO): smooth jazz for the local weather - Rhodes, fretless bass, brushes, a soprano sax."""
    L = 22.0; buf = np.zeros(secs(L)); beat = 60 / 84
    prog = [([55, 58, 62, 65], 43), ([60, 64, 67, 70, 74], 48), ([53, 57, 60, 64], 41), ([50, 53, 57, 60], 38)]   # Gm7 C9 Fmaj7 Dm7
    for bar in range(8):
        ch, root = prog[bar % 4]; t0 = bar * 4 * beat
        for k, off in enumerate([0, 1.5, 2.5]):
            for m in ch: add(buf, rhodes(m, beat * (1.4 if k == 0 else 1.0), 0.6), t0 + off * beat)
        for k, (b, m) in enumerate([(0, root), (1.5, root + 7), (2, root + 12), (3, root + 10)]):           # fretless bass, sliding
            n = secs(beat * 1.2); tt = np.arange(n) / SR; f = hz(m) * 2 ** ((-0.6 * np.exp(-tt / 0.05)) / 12)
            add(buf, lp(np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR), 500) * adsr(n, 0.02, 0.1, 0.7, 0.1) * 0.5, t0 + b * beat)
        for k in range(4):
            add(buf, drum_snare(0.8, brush=True), t0 + (k + 0.5) * beat)
            add(buf, drum_hat(0.5), t0 + k * beat); add(buf, drum_hat(0.3), t0 + (k + 0.66) * beat)
            if k in (0, 2): add(buf, drum_kick(0.35), t0 + k * beat)
    sx = np.zeros(len(buf))
    for at, m, d in [(2.9, 74, 0.6), (3.5, 72, 0.3), (3.8, 70, 1.2), (5.7, 69, 0.4), (6.1, 72, 0.4), (6.5, 76, 1.8),
                     (9.8, 77, 0.5), (10.3, 76, 0.3), (10.6, 74, 0.3), (10.9, 72, 1.4), (12.8, 74, 0.5), (13.3, 76, 0.5), (13.8, 79, 2.0),
                     (16.4, 77, 0.4), (16.8, 76, 0.4), (17.2, 74, 0.4), (17.6, 72, 2.4)]:
        add(sx, sax(m, d + 0.1, 0.6), at)
    buf += reverb(sx, 2.0, 2.4, 0.4) * 0.6
    return finish(reverb(buf, 1.4, 3.0, 0.15), 'weather')

PIECES = {'shrine': shrine, 'rosebud': rosebud, 'abyss': abyss, 'dialup': dialup,
          'western': western, 'monster': monster, 'ragtime': ragtime, 'victory': victory, 'weather': weather}
if __name__ == '__main__':
    for nm in (sys.argv[1:] or PIECES): PIECES[nm]()
