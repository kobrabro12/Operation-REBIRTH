"""Tiny NES-style chiptune synth used to compose the game's music (see menu_music.py, moonlit_music.py).
Channels are plain numpy arrays mixed into one mono track at 22050 Hz:
  pulse(duty)  - square-wave lead/harmony, with optional vibrato
  tri          - 4-bit stepped triangle bass, like the NES triangle channel
  kick/snare/hat - noise and pitch-drop drums
Songs are written as note lists: (midi note or None for a rest, length in beats).
Everything that rings past the end of the loop wraps around to the start, so tracks loop seamlessly.
"""
import wave
import numpy as np

SR = 22050

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

class Track:
    def __init__(self, bpm, beats):
        self.beat = 60 / bpm
        self.n = int(round(beats * self.beat * SR))
        self.out = np.zeros(self.n)
        self.rng = np.random.default_rng(7)

    def at(self, beat): return int(round(beat * self.beat * SR))

    def add(self, sig, beat, gain):
        i = self.at(beat) % self.n
        j = min(self.n, i + len(sig))
        self.out[i:j] += sig[:j - i] * gain
        rest = sig[j - i:]
        if len(rest): self.out[:len(rest)] += rest[:self.n] * gain          # wrap the tail for a clean loop

    # ---- voices
    def pulse(self, midi, beats, beat, gain, duty=0.5, vib=0.0, decay=0.0, release=0.03, attack=0.004):
        n = max(1, int(beats * self.beat * SR))
        t = np.arange(n) / SR
        f = hz(midi) * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1))
        ph = np.cumsum(f) / SR
        s = np.where((ph % 1) < duty, 1.0, -1.0)
        env = np.ones(n)
        na, nr = int(attack * SR), int(release * SR)
        if na: env[:na] = np.linspace(0, 1, na)
        if decay: env *= np.exp(-t * decay) * 0.6 + 0.4
        if nr < n: env[-nr:] *= np.linspace(1, 0, nr)
        self.add(s * env, beat, gain)

    def tri(self, midi, beats, beat, gain):
        n = max(1, int(beats * self.beat * SR * 0.92))
        ph = (np.arange(n) * hz(midi) / SR) % 1
        s = np.round((4 * np.abs(ph - 0.5) - 1) * 7.5) / 7.5          # 4-bit steps
        env = np.ones(n); r = min(n, int(0.01 * SR)); env[-r:] = np.linspace(1, 0, r)
        self.add(s * env, beat, gain)

    def kick(self, beat, gain=0.9):
        n = int(0.16 * SR); t = np.arange(n) / SR
        ph = np.cumsum(150 * np.exp(-t * 28) + 45) / SR
        self.add(np.sign(np.sin(2 * np.pi * ph)) * np.exp(-t * 18), beat, gain)

    def snare(self, beat, gain=0.55):
        n = int(0.14 * SR); t = np.arange(n) / SR
        noise = np.repeat(self.rng.choice([-1.0, 1.0], n // 2 + 1), 2)[:n]
        tone = np.sign(np.sin(2 * np.pi * 190 * t))
        self.add((noise * 0.8 + tone * 0.35) * np.exp(-t * 22), beat, gain)

    def hat(self, beat, gain=0.18, length=0.04):
        n = int(length * SR); t = np.arange(n) / SR
        self.add(self.rng.choice([-1.0, 1.0], n) * np.exp(-t * (60 if length < 0.08 else 18)), beat, gain)

    # ---- helpers
    def melody(self, notes, start, gain, **kw):
        b = start
        for m, length in notes:
            if m is not None: self.pulse(m, length * 0.95, b, gain, **kw)
            b += length
        return b

    def save(self, path, headroom=1.1):
        x = np.convolve(self.out, [0.25, 0.5, 0.25], mode='same')     # soften the very top end a little
        x /= np.max(np.abs(x)) * headroom
        with wave.open(path, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((x * 32767).astype(np.int16).tobytes())
        return len(x) / SR
