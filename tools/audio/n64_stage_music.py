"""The music of the three low-poly 3D stages - original tunes in the spirit of late-90s 64-bit cartridge soundtracks:
sampled-sounding instruments (soft brass, marimba, flute, strings, harp, celesta), a big warm hall reverb, stereo,
and above all a melody you can hum. Each loops seamlessly.

  castle_court       "Banners Over the Court"   F major, 138 BPM - a bright, bouncy royal march: brass melody over
                      pizzicato strings, snare rolls, timpani; a lyrical strings-and-flute middle section, a fanfare bridge
  jungle_falls       "Rope Bridge Groove"       D dorian / F major, 112 BPM - a tropical marimba tune over congas,
                      shakers and a round slap bass; a breezy flute chorus, steel-drum answers
  starlight_fountain "Wishes in the Water"      E-flat major (with lydian sparkle), 3/4 at 96 BPM - a celesta lullaby over
                      harp arpeggios and slow strings; a flute takes the second verse, a soaring middle section

Run:  python3 tools/audio/n64_stage_music.py [name ...]   -> public/assets/audio/music/<name>.ogg (bgm_<name>)
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, hz, secs, lp, hp, bp, noise, adsr, pad, musicbox, timpani, drum_kick, drum_snare, drum_hat
from scipy.signal import fftconvolve

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public/assets/audio/music')
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def m(name):
    """'C5', 'Bb4', 'F#3' -> a MIDI note number."""
    n = NOTE[name[0]]; i = 1
    while name[i] in 'b#': n += -1 if name[i] == 'b' else 1; i += 1
    return n + 12 * (int(name[i:]) + 1)


def seq(text):
    """A melody written as text: 'C5:1 D5:.5 r:.5 ...' (note:beats, r = rest) -> [(midi or None, beats)]."""
    out = []
    for tok in text.split():
        n, d = tok.split(':')
        out.append((None if n == 'r' else m(n), float(d)))
    return out


# ------------------------------------------------------------------ instruments (each returns a mono array)
def marimba(mi, dur=0.9, vel=1.0):
    """A wooden marimba bar: the fundamental, its tuned 4th partial, a bright knock on the attack."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(mi)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.32 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 15) + 0.1 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 30)
    k = min(n, secs(0.012)); x[:k] += hp(noise(k), 2500) * np.linspace(0.4, 0, k)
    a = secs(0.002); x[:a] *= np.linspace(0, 1, a)
    return x * vel * 0.5


def steel(mi, dur=1.0, vel=1.0):
    """A steel drum: slightly stretched partials, a soft chorus, a quick bloom then a long ring."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(mi); x = np.zeros(n)
    for h, a, d in [(1, 1, 2.8), (2, 0.5, 4), (3.01, 0.2, 6), (4.1, 0.08, 9)]:
        for det in (0, 0.0025): x += a * np.sin(2 * np.pi * f * h * (1 + det) * t) * np.exp(-t * d)
    return x * adsr(n, 0.008, 0, 1, 0.05) * vel * 0.3


def flute(mi, dur, vel=1.0):
    """A breathy flute: near-sine with a little 2nd/3rd harmonic, delayed vibrato and a puff of breath noise."""
    n = secs(dur); t = np.arange(n) / SR
    f = hz(mi) * 2 ** (0.16 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.18) / 0.3, 0, 1) / 12)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.16 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph) + bp(noise(n), 1800, 6000) * 0.035
    return x * adsr(n, 0.05, 0.1, 0.85, min(0.12, dur * 0.3)) * vel * 0.55


def horn(mi, dur, vel=1.0, bright=1.0):
    """A warm brass section: detuned saws through a filter that's brightest on the attack (the blat), then mellows."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for d in (-0.07, 0, 0.07): x += 2 * ((t * hz(mi + d)) % 1) - 1
    dark, light = lp(x, 900 + 300 * bright), lp(x, 3200 * bright)
    w = np.exp(-t * 5) * 0.75 + 0.25
    f = hz(mi) * 2 ** (0.1 * np.sin(2 * np.pi * 5 * t) * np.clip(t - 0.3, 0, 1) / 12)   # (a little vibrato on long notes)
    x = dark * (1 - w) + light * w + 0.15 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    return x * adsr(n, 0.025, 0.12, 0.8, min(0.1, dur * 0.3)) * vel * 0.22


def harp(mi, dur=1.6, vel=1.0):
    """A plucked harp string: harmonics that die away faster the higher they are."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(mi); x = np.zeros(n)
    for h in range(1, 7): x += np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.6 + h * 1.4)) / h ** 1.3
    a = secs(0.003); x[:a] *= np.linspace(0, 1, a)
    return x * vel * 0.4


def pizz(mi, dur=0.35, vel=1.0):
    """Pizzicato strings: a short woody pluck."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(mi); x = np.zeros(n)
    for h in range(1, 6): x += np.sin(2 * np.pi * f * h * t) * np.exp(-t * (9 + h * 4)) / h
    return lp(x, 2500) * vel * 0.5


def bass(mi, dur, vel=1.0, slap=False):
    """A round bass (finger or slap): sine plus a couple of harmonics, a thump on the attack."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(mi)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + (0.25 if slap else 0.1) * np.sin(6 * np.pi * f * t) * np.exp(-t * 12)
    env = np.exp(-t * (3.5 if slap else 1.2)) * 0.7 + 0.3
    return x * env * adsr(n, 0.004, 0, 1, 0.04) * vel * 0.55


def strings(mids, dur, vel=1.0):
    """A slow, lush string section (the shared pad, a touch brighter)."""
    return pad(mids, dur, vel, detune=0.1) * 1.1


def conga(high, vel=1.0):
    """A conga hit: a pitched skin that drops a little as it rings."""
    n = secs(0.25); t = np.arange(n) / SR; f0 = 330 if high else 220
    return np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.2 * np.exp(-t * 30))) / SR) * np.exp(-t * 14) * vel * 0.5


def shaker(vel=1.0):
    n = secs(0.09); t = np.arange(n) / SR
    return hp(noise(n), 5000) * np.minimum(1, t / 0.015) * np.exp(-t * 40) * 0.25 * vel


def chime(vel=1.0):
    """A shimmering wind-chime sweep (bright sines falling in quick succession)."""
    n = secs(1.6); x = np.zeros(n)
    for i, mi in enumerate([96, 93, 91, 88, 86, 84, 81, 79]):
        s = musicbox(mi, 1.2, 0.25); j = secs(i * 0.045); x[j:j + len(s)] += s[:n - j]
    return x * vel


def crash(vel=1.0):
    n = secs(2.2); t = np.arange(n) / SR
    return hp(noise(n), 4000) * np.exp(-t * 2.2) * 0.25 * vel


# ------------------------------------------------------------------ the mixer
class Song:
    """A stereo loop: notes are placed by beat and panned; everything past the end folds back to the start."""
    def __init__(self, bpm, beats):
        self.beat = 60 / bpm; self.N = secs(beats * self.beat)
        self.L = np.zeros(self.N + secs(6)); self.R = np.zeros(self.N + secs(6))
        self.dry = 1.0

    def put(self, x, beat, pan=0.0, gain=1.0):
        """Adds a sound at a beat, panned -1 (left) .. 1 (right)."""
        i = secs(beat * self.beat)
        if i >= len(self.L): return
        x = x[:len(self.L) - i] * gain
        self.L[i:i + len(x)] += x * np.sqrt((1 - pan) / 2) * 1.414
        self.R[i:i + len(x)] += x * np.sqrt((1 + pan) / 2) * 1.414

    def line(self, notes, start, inst, pan=0.0, gain=1.0, legato=1.0, shift=0, **kw):
        """Plays a melody [(midi, beats)] with an instrument from a start beat; returns the beat after it."""
        b = start
        for mi, d in notes:
            if mi is not None: self.put(inst(mi + shift, d * self.beat * legato, **kw), b, pan, gain)
            b += d
        return b

    def render(self, name, wet=0.3, room=2.4, peak=0.9):
        """Folds the tail round, adds the hall (also wrapped round the loop), normalises and writes <name>.ogg."""
        N = self.N; out = []
        for ch, seed in ((self.L, 1), (self.R, 2)):
            x = ch[:N].copy(); x[:len(ch) - N] += ch[N:]
            r = np.random.default_rng(seed); n = secs(room); t = np.arange(n) / SR
            ir = r.standard_normal(n) * np.exp(-3.0 * t); ir = lp(ir, 5500) * 0.7 + lp(ir, 1400) * 0.3
            ir = np.concatenate([np.zeros(secs(0.025)), ir]); ir /= np.sqrt(np.sum(ir ** 2))
            y = fftconvolve(np.concatenate([x, x]), ir)[N:2 * N]
            out.append(x + y * wet * 2.0)
        L, R = out
        mx = max(np.max(np.abs(L)), np.max(np.abs(R))) + 1e-9
        L = np.tanh(L / mx * 1.3) / np.tanh(1.3) * peak; R = np.tanh(R / mx * 1.3) / np.tanh(1.3) * peak
        st = np.empty(2 * N, np.int16); st[0::2] = (L * 32767).astype(np.int16); st[1::2] = (R * 32767).astype(np.int16)
        tmp = os.path.join(tempfile.gettempdir(), name + '.wav')
        with wave.open(tmp, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
        os.makedirs(OUT, exist_ok=True)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', os.path.join(OUT, name + '.ogg')], check=True)
        os.remove(tmp)
        print(name, '%.1f s' % (N / SR))


def chord(root, kind):
    """Chord tones above a root: maj, min, 7, maj7, m7, sus, add9."""
    return [root + i for i in {'maj': (0, 4, 7), 'min': (0, 3, 7), '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10),
                                'sus': (0, 5, 7), 'add9': (0, 4, 7, 14), 'dim': (0, 3, 6)}[kind]]


# ------------------------------------------------------------------ CASTLE COURT
def castle_court():
    """A royal march: A (brass tune) - B (strings + flute, lyrical) - A (brass + harmony) - C (fanfare bridge)."""
    BPB = 4
    A_CH = [('F3', 'maj'), ('C3', 'maj'), ('D3', 'min'), ('Bb2', 'maj'), ('F3', 'maj'), ('G3', 'm7'), ('C3', '7'), ('F3', 'maj')]
    B_CH = [('Bb2', 'maj'), ('C3', 'maj'), ('A2', 'min'), ('D3', 'min'), ('G2', 'min'), ('C3', 'maj'), ('A2', '7'), ('D3', 'min')]
    C_CH = [('Bb2', 'maj'), ('Bb2', 'maj'), ('F3', 'maj'), ('F3', 'maj'), ('G2', 'min'), ('G2', 'min'), ('C3', 'maj'), ('C3', '7')]
    A = seq('C5:1 F5:1 E5:.5 F5:.5 G5:1  E5:3 C5:1  D5:1 F5:1 A5:1 G5:.5 F5:.5  F5:2 D5:1 Bb4:1 '
            'A4:1 C5:.5 F5:.5 A5:1 G5:.5 F5:.5  G5:1.5 F5:.5 E5:1 D5:1  E5:1 G5:1 Bb5:1 A5:.5 G5:.5  F5:3 r:1')
    A2 = A[:-2] + seq('F5:1 A5:1 C6:2')
    B = seq('D5:1 F5:1 Bb5:2  A5:1.5 G5:.5 E5:2  C5:1 E5:1 A5:1 G5:1  F5:3 D5:1 '
            'Bb4:1 D5:1 G5:1 F5:.5 E5:.5  E5:1 G5:1 C6:2  C#5:1 E5:1 A5:1 G5:1  F5:1 E5:1 D5:2')
    C = seq('Bb4:.5 D5:.5 F5:.5 Bb5:.5 A5:1 F5:1  G5:1.5 F5:.5 D5:2  C5:.5 F5:.5 A5:.5 C6:.5 Bb5:1 A5:1  A5:3 r:1 '
            'Bb5:1 A5:1 G5:1 D5:1  G5:1 F5:1 E5:2  E5:.5 F5:.5 G5:.5 A5:.5 Bb5:1 G5:1  C6:1 Bb5:1 A5:1 G5:1')
    plan = [(A_CH, A, 'A'), (B_CH, B, 'B'), (A_CH, A2, 'A2'), (C_CH, C, 'C')]
    S = Song(138, 32 * BPB)
    for si, (chs, mel, kind) in enumerate(plan):
        s0 = si * 8 * BPB
        # the tune
        if kind in ('A', 'A2'):
            S.line(mel, s0, horn, pan=0.1, gain=1.0, legato=0.92)
            if kind == 'A2': S.line(mel, s0, horn, pan=-0.35, gain=0.45, legato=0.92, shift=-5, bright=0.7)   # a harmony a 4th below
            if kind == 'A2': S.line(mel, s0, flute, pan=0.3, gain=0.3, shift=12)
        elif kind == 'B':
            S.line(mel, s0, flute, pan=0.25, gain=1.1)
            S.line(mel, s0, horn, pan=-0.2, gain=0.25, shift=-12, bright=0.5)
        else:
            S.line(mel, s0, horn, pan=0.0, gain=1.15, legato=0.85, bright=1.2)
        for bi, (r, k) in enumerate(chs):
            b = s0 + bi * BPB; root = m(r); tones = chord(root + 12, k)
            # strings hold the chord, pizzicato bounces under it
            S.put(strings([t + 12 for t in tones[:3]], BPB * S.beat * 1.05, 0.55 if kind != 'B' else 0.8), b, -0.4, 0.8)
            for q in range(4):
                S.put(pizz(root if q % 2 == 0 else root + 7, 0.3, 0.9), b + q, -0.15, 0.9)
                S.put(pizz(tones[1 + q % 2] + 12, 0.25, 0.6), b + q + 0.5, 0.45, 0.6)
            S.put(bass(root - 12, BPB * S.beat * 0.45), b, 0, 0.6); S.put(bass(root - 5, BPB * S.beat * 0.45), b + 2, 0, 0.5)
            # the march: kick on 1 and 3, snare on 2 and 4 with a roll every 4th bar, timpani on chord changes
            for q in (0, 2): S.put(drum_kick(0.8), b + q, 0, 0.8)
            for q in (1, 3): S.put(drum_snare(0.6), b + q, 0.1, 0.7)
            for q in range(8): S.put(drum_hat(0.5 + 0.3 * (q % 2 == 0)), b + q * 0.5, 0.3, 0.6)
            if bi % 4 == 3:
                for q in range(8): S.put(drum_snare(0.25 + q * 0.06), b + 2 + q * 0.25, 0.1, 0.5)
            if bi % 2 == 0: S.put(timpani(root - 12, 1.2), b, -0.1, 0.9)
        if kind == 'C': S.put(crash(), s0, 0.4, 0.8)
    S.put(crash(0.8), 0, -0.4, 0.7)
    S.render('castle_court', wet=0.26)


# ------------------------------------------------------------------ JUNGLE FALLS
def jungle_falls():
    """A tropical groove: 4 bars of drums and bass, A (marimba tune) x2, B (flute chorus, steel-drum answers), A."""
    BPB = 4
    A_CH = [('D3', 'm7'), ('G3', '7'), ('D3', 'm7'), ('G3', '7'), ('Bb2', 'maj7'), ('C3', 'maj'), ('D3', 'm7'), ('A2', '7')]
    B_CH = [('F3', 'maj'), ('C3', 'maj'), ('D3', 'min'), ('A2', 'min'), ('Bb2', 'maj'), ('F3', 'maj'), ('G2', 'min'), ('A2', '7')]
    A = seq('A4:.5 D5:.5 r:.5 D5:.5 F5:1 E5:.5 D5:.5  B4:.5 D5:.5 r:.5 G5:.5 F5:1 D5:1  A5:1 G5:.5 F5:.5 G5:.5 F5:.5 D5:1  E5:1.5 D5:.5 B4:2 '
            'D5:.5 F5:.5 A5:.5 F5:.5 Bb5:1 A5:1  G5:.5 E5:.5 C5:.5 E5:.5 G5:1 C6:1  A5:1.5 G5:.5 F5:1 D5:1  E5:1 C#5:1 A4:2')
    A2 = A[:-3] + seq('E5:.5 G5:.5 A5:1 r:2')
    B = seq('A5:2 C6:2  G5:3 E5:1  F5:1 A5:1 D6:2  C6:3 A5:1  Bb5:1 A5:1 G5:1 F5:1  A5:3 F5:1  G5:1 Bb5:1 D6:1 C6:1  C#6:2 E5:2')
    ANS = seq('r:3 C6:.5 A5:.5  r:3 G5:.5 E5:.5  r:3 D6:.5 A5:.5  r:3 E6:.5 C6:.5  r:3 D6:.5 Bb5:.5  r:3 C6:.5 A5:.5  r:3 Bb5:.5 G5:.5  r:2 E5:.5 G5:.5 A5:.5 C#6:.5')
    plan = [(A_CH[:4], None, 'intro'), (A_CH, A, 'A'), (A_CH, A2, 'A2'), (B_CH, B, 'B'), (A_CH, A, 'A3')]
    beats = (4 + 8 * 4) * BPB
    S = Song(112, beats)
    s0 = 0
    for chs, mel, kind in plan:
        if mel is not None:
            if kind in ('A', 'A2', 'A3'):
                b = s0
                for mi, d in mel:                                        # the marimba: short strikes, a soft tremolo on long notes
                    if mi is not None:
                        S.put(marimba(mi, 0.9), b, 0.15, 1.25)
                        if d >= 1:
                            for k in range(1, int(d * 4)): S.put(marimba(mi, 0.5, 0.45), b + k * 0.25, 0.15, 1.0)
                    b += d
                if kind == 'A2': S.line(mel, s0, steel, pan=-0.4, gain=0.55, shift=-12)
                if kind == 'A3': S.line(mel, s0, flute, pan=-0.3, gain=0.35, shift=12)
            else:
                S.line(mel, s0, flute, pan=0.2, gain=1.15)
                S.line(ANS, s0, steel, pan=-0.45, gain=0.85)
        for bi, (r, k) in enumerate(chs):
            b = s0 + bi * BPB; root = m(r); tones = chord(root + 12, k)
            # the bass: a bouncing tumbao, slapped on the "and" of 2
            for off, nn, d in [(0, root - 12, 0.75), (1.5, root - 12, 0.4), (2.5, root - 5, 0.4), (3, root, 0.4), (3.5, root - 2, 0.4)]:
                S.put(bass(nn, d * S.beat, 1.0, slap=off in (1.5, 3)), b + off, 0, 0.9)
            if kind != 'intro':
                S.put(strings([t + 12 for t in tones[:3]], BPB * S.beat, 0.35), b, -0.5, 0.6)        # a soft pad under it
                for q, t in enumerate([tones[0], tones[1], tones[2], tones[1]] * 2):                 # marimba comping, upper right
                    if q % 2: S.put(marimba(t + 12, 0.4, 0.4), b + q * 0.5, 0.55, 0.6)
            # the groove: kick, rim, congas, shaker
            for q in (0, 2.5): S.put(drum_kick(0.7), b + q, 0, 0.75)
            for q in (1, 3): S.put(drum_snare(0.35, brush=True), b + q, 0.2, 0.9)
            for q, hi in [(0.5, 1), (1, 0), (1.75, 1), (2.5, 1), (3, 0), (3.5, 0), (3.75, 1)]: S.put(conga(hi, 0.8), b + q, -0.35 if hi else -0.2, 0.85)
            for q in range(16): S.put(shaker(0.5 + 0.5 * (q % 4 == 2)), b + q * 0.25, 0.45, 0.7)
        s0 += len(chs) * BPB
    for b in (16, 48, 80, 112): S.put(chime(0.8), b, 0.6, 0.6)
    S.render('jungle_falls', wet=0.22)


# ------------------------------------------------------------------ STARLIGHT FOUNTAIN
def starlight_fountain():
    """A lullaby in 3/4: A (celesta) - A' (flute) - B (strings swell, flute + celesta) - A' (celesta and flute together)."""
    BPB = 3
    A_CH = [('Eb3', 'maj7'), ('F3', 'add9'), ('Eb3', 'maj7'), ('F3', 'add9'), ('C3', 'm7'), ('Ab2', 'maj7'), ('Bb2', 'sus'), ('Bb2', 'maj')]
    B_CH = [('Ab2', 'maj7'), ('Bb2', 'maj'), ('G2', 'm7'), ('C3', 'm7'), ('F2', 'm7'), ('Bb2', 'maj'), ('Eb3', 'maj7'), ('Bb2', 'sus')]
    A = seq('G5:1.5 F5:.5 Eb5:1  F5:1 A5:1 C6:1  Bb5:2 G5:1  A5:3  G5:1 Eb5:1 C5:1  Eb5:1.5 F5:.5 G5:1  F5:2 Bb4:1  D5:3')
    A2 = A[:-3] + seq('F5:1 G5:1 Ab5:1  Bb5:3')
    B = seq('C6:1.5 Bb5:.5 Ab5:1  Bb5:2 F5:1  G5:1 Bb5:1 D6:1  C6:3  Ab5:1 C6:1 Eb6:1  D6:2 Bb5:1  G5:1.5 Ab5:.5 Bb5:1  F5:3')
    plan = [(A_CH, A, 'A'), (A_CH, A2, 'A2'), (B_CH, B, 'B'), (A_CH, A2, 'A3')]
    S = Song(96, 32 * BPB)
    for si, (chs, mel, kind) in enumerate(plan):
        s0 = si * 8 * BPB
        if kind == 'A':
            S.line(mel, s0, lambda mi, d: musicbox(mi, max(1.6, d * 1.6), 1.0), pan=0.2, gain=1.0)
        elif kind == 'A2':
            S.line(mel, s0, flute, pan=0.15, gain=1.1)
            S.line(mel, s0, lambda mi, d: musicbox(mi, 1.6, 0.4), pan=-0.4, gain=1.0, shift=12)
        elif kind == 'B':
            S.line(mel, s0, flute, pan=0.1, gain=1.15)
            S.line(mel, s0, lambda mi, d: musicbox(mi, 2.0, 0.6), pan=-0.3, gain=1.0)
        else:
            S.line(mel, s0, flute, pan=0.25, gain=0.9)
            S.line(mel, s0, lambda mi, d: musicbox(mi, 1.8, 0.8), pan=-0.25, gain=1.0, shift=12)
        for bi, (r, k) in enumerate(chs):
            b = s0 + bi * BPB; root = m(r); tones = chord(root + 12, k)
            # harp: a rippling arpeggio up and back down, two notes a beat
            arp = [root, tones[1], tones[2], tones[-1] + 12 if len(tones) > 3 else tones[0] + 12, tones[2], tones[1]]
            for q, t in enumerate(arp): S.put(harp(t + 12, 1.8, 0.75 if q else 1.0), b + q * 0.5, -0.35 + 0.14 * q, 0.85)
            S.put(bass(root - 12, BPB * S.beat * 0.9, 0.7), b, 0, 0.55)
            S.put(strings([t + 12 for t in tones], BPB * S.beat * 1.1, 0.5 if kind != 'B' else 0.9), b, 0.4, 0.75)
            if kind in ('B', 'A3'):                                                                   # soft brushes join for the second half
                S.put(drum_kick(0.4), b, 0, 0.5)
                S.put(drum_snare(0.25, brush=True), b + 1, 0.3, 0.8); S.put(drum_snare(0.2, brush=True), b + 2, 0.3, 0.7)
            if bi % 4 == 0: S.put(chime(0.7), b, 0.55 if bi % 8 == 0 else -0.55, 0.55)
    S.render('starlight_fountain', wet=0.38, room=3.2)


PIECES = {'castle_court': castle_court, 'jungle_falls': jungle_falls, 'starlight_fountain': starlight_fountain}
if __name__ == '__main__':
    for nm in (sys.argv[1:] or PIECES): PIECES[nm]()
