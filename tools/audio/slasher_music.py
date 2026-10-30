"""13 WILLOW LANE's music: an original 90s-slasher-movie score - a creepy little piano figure in a minor key going
round and round, a low synth drone, a heartbeat kick, a clock ticking, shrieking string stabs every few bars, and a
second half where the strings start sawing and the beat speeds up (the chase). Loops seamlessly (whole bars).

Run:  python3 tools/audio/slasher_music.py
Writes public/assets/audio/music/slasher.ogg and .mp3. Loaded in BootScene as bgm_slasher.
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, secs, add, adsr, reverb, pad, piano, drum_kick, drum_hat, noise, lp, hp, hz
from shop_music import strings, saw, tri, wrap_reverb

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public/assets/audio/music')

def stab(midis, dur, vel=1.0):
    """a shrieking string stab: bright saws, a fast attack, a sharp fall"""
    n = secs(dur); x = sum(saw(m, dur, 1.0, 5200, 0.25, 0.002, 0.2) for m in midis)
    return x * np.exp(-np.arange(n) / SR * 5) * vel * 0.35

def main():
    bpm = 96; b = 60 / bpm; A = 57                                                      # A minor
    bars = 32; L = bars * 4 * b; N = secs(L); buf = np.zeros(N)
    # the piano figure: A C E D# E ... with the tritone sting (D#) that makes it wrong
    fig = [0, 3, 7, 6, 7, 3, 0, -1]
    for bar in range(bars):
        t0 = bar * 4 * b; chase = bar >= 16
        root = [0, 0, -4, -5][(bar // 2) % 4]
        add(buf, pad([A - 24 + root, A - 12 + root + 7], 4 * b + 0.3, 0.55), t0)          # the drone
        for k in range(8):                                                                # the music-box-ish piano going round
            m = fig[(k + bar) % 8] + root
            add(buf, piano(A + 12 + m, b * 0.9, 0.45 if chase else 0.6), t0 + k * b / 2)
        for k in range(4):                                                                # the heartbeat: lub-dub
            add(buf, drum_kick(0.7), t0 + k * b); add(buf, drum_kick(0.45), t0 + k * b + b * 0.28)
            add(buf, drum_hat(0.18), t0 + k * b + b / 2)                                  # the clock ticking
        if bar % 4 == 3: add(buf, stab([A + 24 + root, A + 30 + root], 1.2, 0.9), t0 + 3 * b)   # SCREEE
        if chase:                                                                         # the chase: sawing strings, a faster pulse
            for k in range(16): add(buf, strings([A - 12 + root + (7 if k % 4 == 2 else 0)], b * 0.22, 0.9), t0 + k * b / 4)
            for k in range(8): add(buf, drum_kick(0.35), t0 + k * b / 2 + b / 4)
            if bar % 2 == 1: add(buf, stab([A + 19 + root, A + 25 + root], 0.5, 0.6), t0 + 1.5 * b)
        if bar in (7, 15, 23, 31):                                                        # a rising whoosh into the next section
            n = secs(4 * b); w = hp(noise(n), 1500) * np.linspace(0, 1, n) ** 2 * 0.2; add(buf, w, t0)
    x = wrap_reverb(buf, 1.6, 2.8, 0.25)
    x = x - np.mean(x); x = x / (np.max(np.abs(x)) + 1e-9) * 0.88
    tmp = os.path.join(tempfile.gettempdir(), 'slasher.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
    base = os.path.join(OUT, 'slasher')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '3', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '96k', base + '.mp3'], check=True)
    os.remove(tmp); print('slasher %.1f s' % (len(x) / SR))

if __name__ == '__main__':
    main()
