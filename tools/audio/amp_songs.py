"""NU's AMP songs: four short 8-bit rock loops the speaker blasts while it's out (AMP DROP).
Run:  python3 tools/audio/amp_songs.py      (needs numpy and ffmpeg)
Writes public/assets/audio/sfx/amp_song1..4.ogg and .mp3.

All four are at 90 BPM - one beat = 40 game frames, NU's ON BEAT - so the amp's thumps land on the kick drum.
Each loop is 4 bars (16 beats) and starts on a downbeat. Chiptune rock: a crunchy power-chord rhythm part
(two square waves a fifth apart, palm-muted, clipped), a pulse-wave lead, a pumping square bass, and noise
drums (kick, snare on 2 and 4, hats).
"""
import os, subprocess, tempfile
import numpy as np

SR = 22050
BPM = 90
BEAT = 60 / BPM
STEP = BEAT / 4                         # a sixteenth note
BARS = 4
N = int(round(BARS * 4 * BEAT * SR))
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'assets', 'audio', 'sfx')

def hz(note):                           # MIDI note number -> frequency
    return 440 * 2 ** ((note - 69) / 12)

def square(f, n, duty=0.5, phase=0.0):
    t = np.arange(n) / SR
    return np.where(((t * f + phase) % 1) < duty, 1.0, -1.0)

def env(n, attack=0.004, decay=0.0, sustain=1.0, release=0.02):
    e = np.ones(n) * sustain
    a = max(1, int(attack * SR)); e[:a] = np.linspace(0, 1, a)
    if decay: d = int(decay * SR); e[a:a + d] = np.linspace(1, sustain, len(e[a:a + d]))
    r = max(1, int(release * SR)); e[-r:] *= np.linspace(1, 0, len(e[-r:]))
    return e

def add(buf, at, sig):
    i = int(at * SR); j = min(len(buf), i + len(sig))
    if i < len(buf): buf[i:j] += sig[:j - i]

rng = np.random.RandomState(7)
NOISE = rng.uniform(-1, 1, SR * 2)
def noise(n, step=1):                    # stepped noise: bigger steps = lower, crunchier
    return np.repeat(NOISE[:n // step + 1], step)[:n]

def kick(buf, at):
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = 140 * np.exp(-t * 28) + 45
    s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 18)
    add(buf, at, s * 0.9)
def snare(buf, at):
    n = int(0.14 * SR); t = np.arange(n) / SR
    add(buf, at, (noise(n, 2) * 0.7 + square(190, n) * 0.25) * np.exp(-t * 22) * 0.75)
def hat(buf, at, open_=False):
    n = int((0.09 if open_ else 0.03) * SR); t = np.arange(n) / SR
    add(buf, at, noise(n, 1) * np.exp(-t * (30 if open_ else 90)) * 0.28)

def power_chord(buf, at, root, length, mute=True):
    n = int(length * SR)
    s = square(hz(root), n, 0.5) + square(hz(root + 7), n, 0.5) * 0.8 + square(hz(root + 12), n, 0.25) * 0.4
    s = np.clip(s * 1.6, -1, 1) * (np.exp(-np.arange(n) / SR * (14 if mute else 3)))
    add(buf, at, s * 0.22)
def bass(buf, at, note, length):
    n = int(length * SR)
    add(buf, at, square(hz(note), n, 0.5) * env(n, release=0.01) * 0.3)
def lead(buf, at, note, length, duty=0.25, vib=True):
    n = int(length * SR); t = np.arange(n) / SR
    f = hz(note) * (1 + (0.012 * np.sin(2 * np.pi * 6 * t) * np.clip(t * 6 - 0.6, 0, 1) if vib else 0))
    s = np.where((np.cumsum(f) / SR % 1) < duty, 1.0, -1.0)
    add(buf, at, s * env(n, decay=0.08, sustain=0.75, release=0.03) * 0.2)

def drums(buf, style):
    for bar in range(BARS):
        for s in range(16):
            at = (bar * 16 + s) * STEP
            if style == 'gallop':                       # kick on 1, the 'and', 3; snare 2 and 4; 16th hats
                if s in (0, 6, 8, 10): kick(buf, at)
                if s in (4, 12): snare(buf, at)
                hat(buf, at, s == 14)
            elif style == 'half':                       # heavy half-time: snare only on 3
                if s in (0, 3, 10): kick(buf, at)
                if s == 8: snare(buf, at)
                if s % 2 == 0: hat(buf, at, s == 6)
            else:                                       # straight rock beat
                if s in (0, 8, 10): kick(buf, at)
                if s in (4, 12): snare(buf, at)
                if s % 2 == 0: hat(buf, at, s == 14 and bar % 2)
            if bar == BARS - 1 and s >= 12 and style != 'half': snare(buf, at)   # a fill into the loop

# each song: chord roots per bar, rhythm-guitar pattern (16 steps, 1 = hit), lead melody as (step, note, length in steps)
SONGS = [
    # 1 AMP CHECK - E minor, driving eighths
    dict(roots=[40, 43, 45, 40], gtr=[1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1], drums='rock',
         lead=[(0, 64, 3), (3, 67, 1), (4, 69, 4), (8, 71, 2), (10, 69, 2), (12, 67, 4),
               (16, 67, 3), (19, 69, 1), (20, 71, 4), (24, 74, 4), (28, 71, 4),
               (32, 69, 3), (35, 71, 1), (36, 72, 4), (40, 71, 2), (42, 69, 2), (44, 67, 4),
               (48, 64, 2), (50, 67, 2), (52, 69, 2), (54, 71, 2), (56, 76, 8)]),
    # 2 STAGE DIVE - A, galloping metal
    dict(roots=[45, 50, 52, 45], gtr=[1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1], drums='gallop',
         lead=[(0, 69, 2), (2, 72, 2), (4, 74, 2), (6, 76, 2), (8, 74, 4), (12, 72, 4),
               (16, 74, 2), (18, 77, 2), (20, 79, 4), (24, 77, 2), (26, 76, 2), (28, 74, 4),
               (32, 76, 2), (34, 79, 2), (36, 81, 4), (40, 79, 2), (42, 76, 2), (44, 74, 4),
               (48, 72, 2), (50, 74, 2), (52, 76, 4), (56, 81, 8)]),
    # 3 MOSH CALL - D minor, heavy half-time breakdown
    dict(roots=[38, 46, 48, 45], gtr=[1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0], drums='half',
         lead=[(0, 62, 6), (6, 65, 2), (8, 64, 4), (12, 60, 4),
               (16, 58, 6), (22, 62, 2), (24, 65, 8),
               (32, 67, 6), (38, 65, 2), (40, 64, 4), (44, 62, 4),
               (48, 61, 4), (52, 64, 4), (56, 62, 8)]),
    # 4 ENCORE - E major, a big anthem
    dict(roots=[40, 48, 50, 47], gtr=[1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1], drums='rock',
         lead=[(0, 76, 4), (4, 74, 2), (6, 76, 2), (8, 79, 4), (12, 76, 4),
               (16, 79, 4), (20, 81, 2), (22, 79, 2), (24, 76, 8),
               (32, 74, 4), (36, 76, 2), (38, 78, 2), (40, 79, 4), (44, 81, 4),
               (48, 83, 4), (52, 81, 2), (54, 79, 2), (56, 76, 8)]),
]

def render(song):
    buf = np.zeros(N + SR)
    drums(buf, song['drums'])
    for bar, root in enumerate(song['roots']):
        for s, on in enumerate(song['gtr']):
            at = (bar * 16 + s) * STEP
            if on: power_chord(buf, at, root, STEP * 1.6, mute=s % 4 != 0)
            if s % 2 == 0: bass(buf, at, root - 12 + (12 if s % 4 == 2 else 0), STEP * 1.8)
    for (s, note, ln) in song['lead']: lead(buf, s * STEP, note, ln * STEP * 0.95)
    tail = buf[N:]; buf = buf[:N]; buf[:len(tail)] += tail * 0.5      # wrap the ring-out into the start so it loops
    return buf / max(1e-6, np.abs(buf).max()) * 0.9

if __name__ == '__main__':
    import wave
    with tempfile.TemporaryDirectory() as d:
        for i, song in enumerate(SONGS, 1):
            raw = os.path.join(d, 'raw.wav')
            pcm = (render(song) * 32767).astype(np.int16)
            with wave.open(raw, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
            for ext, codec in (('ogg', ['-c:a', 'libvorbis', '-q:a', '4']), ('mp3', ['-c:a', 'libmp3lame', '-q:a', '4'])):
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5', '-ar', '44100', *codec,
                                os.path.join(OUT, 'amp_song%d.%s' % (i, ext))], check=True)
            print('amp_song%d written' % i)
