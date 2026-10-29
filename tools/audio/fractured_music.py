"""FRACTURED's stage music: "Shattered Starlight" - an interstellar house track in the spirit of THE ARTIST'S CUT
(Mason's track): 123 BPM, four-on-the-floor, pads that pump with the kick, a glassy star arpeggio and a robot-choir
lead (saw chords sung through vowel filters, like a vocoder). 32 bars, about 62 s, loops seamlessly.

  bars  1-4   pads and the star arpeggio drifting in, a riser
  bars  5-8   kick, offbeat hats and the plucked bass arrive
  bars  9-24  everything, with the robot-choir melody
  bars 25-28  breakdown: the beat drops out, the crystal hums
  bars 29-32  back in, full, into the loop

Run:  python3 tools/audio/fractured_music.py   -> public/assets/audio/music/fractured.ogg / .mp3 (bgm_fractured)
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, hz, secs, bp, lp, hp, noise, add, adsr, reverb, pad, glass, drum_kick, drum_snare, drum_hat

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public/assets/audio/music')
BPM = 123
BEAT = 60 / BPM
BARS = 32
N = secs(BARS * 4 * BEAT)

# the chords, one per bar (MIDI notes): Am9, Fmaj7, Cmaj7, G6 - then Dm9, Fmaj7, Am9, Esus
PROG = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 55, 59, 64, 67], [55, 59, 62, 64, 67],
        [50, 53, 57, 60, 64], [53, 57, 60, 64, 67], [57, 60, 64, 67, 71], [52, 57, 59, 64, 69]]
ROOTS = [45, 41, 48, 43, 38, 41, 45, 40]
# the robot-choir melody: (bar within the 8-bar phrase, beat, midi, beats long)
MELODY = [(0, 0, 76, 1.5), (0, 1.5, 74, 0.5), (0, 2, 72, 2), (1, 0, 72, 1), (1, 1, 74, 1), (1, 2, 76, 2),
          (2, 0, 79, 3), (2, 3, 76, 1), (3, 0, 74, 4),
          (4, 0, 77, 1.5), (4, 1.5, 76, 0.5), (4, 2, 74, 2), (5, 0, 72, 2), (5, 2, 76, 2),
          (6, 0, 81, 2), (6, 2, 79, 1), (6, 3, 76, 1), (7, 0, 76, 4)]


def at(bar, beat=0.0): return (bar * 4 + beat) * BEAT          # seconds (outro_music.add takes seconds)


def saw(m, dur, cut=2500, det=0.1, vel=1.0, a=0.005, r=0.08):
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for d in (-det, 0, det): x += 2 * ((t * hz(m + d)) % 1) - 1
    return lp(x, cut) * adsr(n, a, 0.05, 0.85, min(r, dur * 0.5)) * vel * 0.33


def choir(m, dur, vowel, vel=1.0):
    """A robot voice: a buzzy saw sung through three vowel formants (like a vocoder)."""
    n = secs(dur); t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.25)
    ph = np.cumsum(hz(m) * vib / SR)
    src = 2 * (ph % 1) - 1 + 0.6 * (2 * ((ph * 1.003) % 1) - 1)
    F = {'oo': [(330, 0.9), (800, 0.4), (2400, 0.12)], 'ah': [(750, 1.0), (1200, 0.6), (2600, 0.2)], 'ee': [(300, 0.7), (2300, 0.5), (3000, 0.25)]}[vowel]
    x = sum(bp(src, f * 0.88, f * 1.12) * g for f, g in F)
    return x * adsr(n, 0.04, 0.1, 0.8, 0.12) * vel * 0.9


def pluck_bass(m, dur, vel=1.0):
    n = secs(dur); t = np.arange(n) / SR
    raw = 2 * ((t * hz(m)) % 1) - 1
    bright, dark = lp(raw, 1800), lp(raw, 320)
    k = np.exp(-t * 18)                                    # the filter closes fast: a pluck
    x = bright * k + dark * (1 - k) + 0.8 * np.sin(2 * np.pi * hz(m - 12) * t)
    return x * adsr(n, 0.003, 0.12, 0.5, 0.05) * vel * 0.55


def star(m, dur, vel=1.0):
    """A glassy star bell: bright sines with a quick attack and a long-ish ring."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.003 * t) * np.exp(-t * 9) + 0.25 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 14)
    return x * np.exp(-t * 6) * adsr(n, 0.002, 0, 1, 0.04) * vel


def clap(vel=1.0):
    n = secs(0.25); t = np.arange(n) / SR; x = np.zeros(n)
    for k, d in enumerate([0, 0.008, 0.016, 0.024]):
        s = secs(d); x[s:] += bp(noise(n - s), 900, 2400) * np.exp(-t[:n - s] * (60 if k < 3 else 16))
    return x * 0.5 * vel


def riser(dur):
    n = secs(dur); t = np.arange(n) / SR
    x = noise(n); y = np.zeros(n); seg = secs(0.05)
    for i in range(0, n, seg):
        f = 300 + 7000 * (i / n) ** 2
        y[i:i + seg] = bp(x[i:i + seg], f * 0.7, min(f * 1.4, SR / 2 - 100))
    return y * (t / dur) ** 2 * 0.35


def build():
    mix = np.zeros(N + secs(4))
    duck = np.ones(N + secs(4))                        # the pump: everything but drums dips on each kick
    drums = np.zeros_like(mix); music = np.zeros_like(mix)
    for bar in range(BARS):
        k = bar % 8
        beat_on = 4 <= bar < 24 or bar >= 28
        # pads: each bar's chord, swelling
        music_bar = pad(PROG[k], 4 * BEAT + 0.3, vel=0.55 if bar >= 4 else 0.4)
        add(music, music_bar, at(bar))
        # the star arpeggio: 16ths up and down the chord, glassy, with an echo three 16ths later
        notes = PROG[k] + [PROG[k][1] + 12, PROG[k][2] + 12]
        order = notes + notes[-2:0:-1]
        for i in range(16):
            m = order[i % len(order)] + 12
            v = (0.22 if i % 4 == 0 else 0.15) * (0.6 if bar < 2 else 1)
            add(music, star(m, 0.5, vel=v), at(bar, i * 0.25))
            add(music, star(m, 0.4, vel=v * 0.35), at(bar, i * 0.25 + 0.75))   # the echo
        if bar >= 4 and not (24 <= bar < 28):
            # plucked bass on the offbeats, root and octave
            for b in range(4):
                add(music, pluck_bass(ROOTS[k] + (12 if b % 2 else 0), BEAT * 0.45, vel=0.9), at(bar, b + 0.5))
        if beat_on:
            for b in range(4):
                add(drums, drum_kick(1.0), at(bar, b))
                s = secs(at(bar, b)); duck[s:s + secs(0.22)] = np.minimum(duck[s:s + secs(0.22)], np.linspace(0.35, 1, secs(0.22)))
                add(drums, drum_hat(0.55), at(bar, b + 0.5))
                for q in (0.25, 0.75): add(drums, drum_hat(0.18), at(bar, b + q))
            for b in (1, 3): add(drums, clap(0.8), at(bar, b))
        if 8 <= bar < 24 or bar >= 28:                    # the robot choir sings the melody
            vowels = ['oo', 'ah', 'ah', 'ee', 'oo', 'ah', 'ee', 'oo']
            for (mb, beat, m, ln) in MELODY:
                if mb == k:
                    add(music, choir(m, ln * BEAT * 0.95, vowels[k], vel=0.75), at(bar, beat))
                    add(music, choir(m - 12, ln * BEAT * 0.95, 'oo', vel=0.35), at(bar, beat))
        if 24 <= bar < 28:                                 # breakdown: the crystal hums
            add(music, saw(ROOTS[k] + 12, 4 * BEAT, cut=900, vel=0.35, a=0.6, r=0.6), at(bar))
    for b in (3, 23, 27):                                  # risers into the drops
        add(music, riser(4 * BEAT), at(b))
    music *= duck
    music = reverb(np.concatenate([music, music]), length=3.2, damp=2.6, wet=0.32)[len(music):]   # (wraps round the loop)
    x = music + drums * 0.9
    x = x[:N] + np.concatenate([x[N:], np.zeros(2 * N)])[:N]    # fold the tail back into the start
    return x


def write(x, name='fractured', peak=0.88):
    x = x - np.mean(x)
    n = secs(0.01); x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)
    x = np.tanh(x / (np.max(np.abs(x)) + 1e-9) * 1.4) / np.tanh(1.4) * peak
    tmp = os.path.join(tempfile.gettempdir(), name + '.wav')
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
    base = os.path.join(OUT, name)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libvorbis', '-q:a', '4', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '112k', base + '.mp3'], check=True)
    os.remove(tmp)
    print(name, '%.1f s' % (len(x) / SR))


if __name__ == '__main__':
    write(build())
