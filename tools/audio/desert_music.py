"""DUST RUNNER's music: an original desert-highway rock track - a twangy, reverb-soaked guitar riff over a driving
beat and a galloping bass, a whistled tune on top in the second half, a big drum fill into each section. Loops
seamlessly (whole bars).

Run:  python3 tools/audio/desert_music.py
Writes public/assets/audio/music/desert.ogg and .mp3. Loaded in BootScene as bgm_desert.
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, secs, add, drum_kick, drum_snare, drum_hat, whistle
from shop_music import pluck, tri, strum, wrap_reverb

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public/assets/audio/music')

def twang(m, dur, vel=1.0):
    """a twangy guitar note: a bright pluck with a little pitch dip and a tremolo"""
    x = pluck(m, dur + 0.3, vel, 0.9); x[:secs(dur + 0.2)] += pluck(m + 12, dur + 0.2, vel * 0.25, 1.0)[:len(x)]
    t = np.arange(len(x)) / SR
    return x * (1 + 0.25 * np.sin(2 * np.pi * 7 * t))

def main():
    bpm = 148; b = 60 / bpm; E = 52                                                     # E minor
    prog = [0, 0, 3, 3, 5, 5, -2, -2]                                                    # Em Em G G A A D D (by root)
    riff = [0, 0, 12, 0, 10, 0, 7, 5, 0, 0, 12, 0, 15, 14, 12, 10]
    tune = [19, None, 17, 15, 12, None, 15, 17, 19, 22, 19, 17, 15, None, 12, None]
    bars = 32; L = bars * 4 * b; N = secs(L); buf = np.zeros(N)
    for bar in range(bars):
        t0 = bar * 4 * b; root = prog[bar % 8]; part = bar // 8
        for k in range(8):                                                               # the galloping bass: da-da-DUM
            add(buf, tri(E - 24 + root + (7 if k % 4 == 3 else 0), b * 0.42, 0.55), t0 + k * b / 2)
        for k in range(4):
            add(buf, drum_kick(0.9), t0 + k * b)
            if k % 2: add(buf, drum_snare(0.75), t0 + k * b)
            add(buf, drum_hat(0.45), t0 + k * b + b / 2); add(buf, drum_hat(0.25), t0 + k * b + b * 0.75)
        for k in range(8):                                                               # the twangy riff
            m = riff[(bar % 2) * 8 + k]
            add(buf, twang(E + root + m, b * 0.45, 0.8 if part != 1 else 0.6), t0 + k * b / 2)
        if part >= 1: add(buf, strum([E + 12 + root, E + 19 + root, E + 24 + root], b * 1.8, 0.35), t0)   # chords ring out
        if part >= 2:                                                                    # the whistled tune
            for k in range(4):
                m = tune[(bar % 4) * 4 + k]
                if m is not None: add(buf, whistle(E + 12 + m, b * 0.9, 0.5), t0 + k * b)
        if bar % 8 == 7:                                                                 # a drum fill into the next section
            for k in range(8): add(buf, drum_snare(0.4 + k * 0.08), t0 + 2 * b + k * b / 4)
    x = wrap_reverb(buf, 1.2, 2.4, 0.22)
    x = x - np.mean(x); x = x / (np.max(np.abs(x)) + 1e-9) * 0.88
    tmp = os.path.join(tempfile.gettempdir(), 'desert.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
    base = os.path.join(OUT, 'desert')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '3', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '96k', base + '.mp3'], check=True)
    os.remove(tmp); print('desert %.1f s' % (len(x) / SR))

if __name__ == '__main__':
    main()
