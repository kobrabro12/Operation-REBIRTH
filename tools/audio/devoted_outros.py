"""The music for THE DEVOTED's three drawn costumes' win cutscenes (src/scenes/winSkins.js). Each is 15 s long and
scored to its shots (frame numbers at 60 fps in brackets):

  cartridge  POWER ON: a sparkling console boot chime [0], a bouncy 64-bit adventure tune as she runs the field [150],
             a brass "you found it" fanfare as she grabs the shard [420], then the cartridge corrupts - the tune
             stutters, bit-crushes and tape-stops [620] - into a hollow, glitchy music-box ending [700]
  bride      THE WEDDING: rain and a slow, broken bridal march on a cold organ and music box (her own, in A minor)
             [0], thunder at the lightning flash [300], the vows over a single held organ chord [380], a bell tolls
             for each cut [470], the bouquet falls to a last music-box phrase and a far bell [560]
  ember      MARTYRDOM: a low choir and a heartbeat on timpani [0], the fire catching - rising choir, a crackle [180],
             a huge hit as she rises out of the flames [360], a soaring choir chord over a bell [560]

  devoted    her own outro (no costume): wind, her music-box theme, the stab, the beaten sinking, three splashes as the
             sludge takes her, a whisper, the thing's eyes opening
Spoken lines (tools/audio/voice_src/dv_*.ogg) were made with Kokoro TTS (kokoro-onnx, voice af_nicole, slowed).

Run:  python3 tools/audio/devoted_outros.py [name ...]  -> public/assets/audio/music/outro_<name>.ogg (bgm_outro_<name>)
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, hz, secs, lp, hp, bp, noise, add, adsr, pad, glass, musicbox, timpani, drum_kick, drum_snare, drum_hat, finish, reverb, sq
from n64_stage_music import marimba, flute, horn, harp, bass, chime, crash, seq, m

F = 1 / 60                                     # one frame, in seconds


def mx(*xs):
    """Mixes sounds of different lengths."""
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out


VOICE = os.path.join(os.path.dirname(__file__), 'voice_src')


def voice(name, semis=-1.0, ghost=0.3):
    """A spoken line (tools/audio/voice_src/<name>.ogg, made with Kokoro TTS - see the README note at the top) made
    eerie: pitched down a little, with a ghost of itself an octave below."""
    import soundfile as sf
    x, sr = sf.read(os.path.join(VOICE, name + '.ogg'))
    if x.ndim > 1: x = x.mean(1)
    def at(rate):
        n = int(len(x) * SR / sr / rate); return np.interp(np.arange(n) * rate * sr / SR, np.arange(len(x)), x)
    a, b = at(2 ** (semis / 12)), at(0.5)
    out = np.zeros(max(len(a), len(b))); out[:len(a)] += a; out[:len(b)] += b * ghost
    return out / (np.max(np.abs(out)) + 1e-9)


def clank(vel=1.0, pitch=1.0):
    """Metal on stone: a knife landing."""
    n = secs(0.6); t = np.arange(n) / SR; x = np.zeros(n)
    for h, d in ((1, 9), (2.76, 14), (5.4, 20), (8.9, 28)): x += np.sin(2 * np.pi * 900 * pitch * h * t) * np.exp(-t * d) / h
    return (x + hp(noise(n), 3000) * np.exp(-t * 40) * 0.5) * vel * 0.5


def organ(mids, dur, vel=1.0):
    """A cold pipe organ: stacked sines (8', 4', 2 2/3'), a slow swell and a chiff on the attack."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for mi in mids:
        f = hz(mi)
        for h, a in ((1, 1), (2, 0.55), (3, 0.3), (4, 0.18), (6, 0.08)): x += a * np.sin(2 * np.pi * f * h * t)
    x /= max(1, len(mids)) * 1.6
    ch = min(n, secs(0.04)); x[:ch] += bp(noise(ch), 1500, 5000) * 0.15
    return x * adsr(n, 0.12, 0, 1, 0.5) * vel


def choir(mids, dur, vel=1.0, vowel=(700, 1200)):
    """A wordless choir: detuned saws through two vowel formants, a slow swell, a gentle vibrato."""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for mi in mids:
        for d in (-0.12, 0, 0.1):
            f = hz(mi + d) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t + mi))
            x += 2 * ((np.cumsum(f) / SR) % 1) - 1
    x = bp(x, vowel[0] * 0.7, vowel[0] * 1.3) + 0.6 * bp(x, vowel[1] * 0.8, vowel[1] * 1.2)
    return x / (len(mids) * 3) * adsr(n, dur * 0.3, 0, 1, dur * 0.3) * vel * 2.2


def bell(mi, dur=4.0, vel=1.0):
    """A church bell: inharmonic partials, the hum note long, the strike bright."""
    n = secs(dur); t = np.arange(n) / SR; f = hz(mi); x = np.zeros(n)
    for h, a, d in ((0.5, 0.6, 0.6), (1, 1, 1.0), (1.19, 0.5, 1.4), (1.5, 0.4, 1.8), (2.0, 0.35, 2.2), (2.74, 0.25, 3), (3.76, 0.15, 4)):
        x += a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * d)
    return x * vel * 0.35


def thunder(dur=3.0, vel=1.0):
    n = secs(dur); t = np.arange(n) / SR
    return lp(noise(n), 260) * (np.exp(-t * 1.2) * (1 + 0.6 * np.sin(2 * np.pi * 3 * t) ** 2)) * vel * 1.6


def rainfall(dur, vel=1.0):
    n = secs(dur)
    return bp(noise(n), 1200, 8000) * 0.05 * vel


def crackle(dur, vel=1.0, seed=3):
    """A fire: a bed of roar with pops."""
    n = secs(dur); r = np.random.default_rng(seed); x = lp(noise(n), 500) * 0.15
    for i in r.integers(0, n - 400, int(dur * 25)): x[i:i + 300] += hp(r.standard_normal(300), 2500) * np.exp(-np.arange(300) / 40) * r.uniform(0.1, 0.5)
    return x * vel


def crush(x, bits=4, hold=6):
    """Bit-crush and sample-hold (a corrupted cartridge)."""
    y = np.round(x * 2 ** bits) / 2 ** bits
    return np.repeat(y[::hold], hold)[:len(x)]


def tapestop(x, length):
    """Slows the end of a sound to a stop, like the power being pulled."""
    n = len(x); k = secs(length); out = x.copy(); seg = x[n - k:]
    pos = np.cumsum(np.linspace(1, 0, k)); pos = pos[pos < len(seg) - 1]
    out[n - k:n - k + len(pos)] = np.interp(pos, np.arange(len(seg)), seg); out[n - k + len(pos):] = 0
    return out


def cartridge():
    L = 15.0; out = np.zeros(secs(L))
    # [0] boot: a rising sparkle chord and a soft whoosh
    for i, mi in enumerate([72, 76, 79, 84, 88, 91, 96]): add(out, musicbox(mi, 2.4, 0.5), 0.2 + i * 0.07)
    add(out, mx(glass(84, 2.2, 0.4), glass(91, 2.2, 0.3)), 0.7)
    add(out, lp(noise(secs(1.2)), 2000) * np.linspace(0, 0.2, secs(1.2)), 0)
    # [150] the field: a bouncy tune (C major, 150 BPM) on marimba and horn, with bass and a light beat
    t0, b = 2.5, 60 / 150
    tune = seq('G4:.5 C5:.5 E5:.5 G5:.5 A5:1 G5:1  F5:.5 E5:.5 D5:.5 C5:.5 D5:1 G4:1  E5:.5 G5:.5 C6:.5 B5:.5 A5:1 F5:1  G5:1.5 E5:.5 C5:2')
    sec = 0.0; part = np.zeros(secs(L))
    for mi, d in tune:
        if mi: add(part, mx(marimba(mi, 0.6, 1.0), horn(mi, d * b * 0.9, 0.5)), t0 + sec * b)
        sec += d
    for i, r in enumerate([48, 41, 45, 43]):
        for q in range(4):
            add(part, bass(r if q % 2 == 0 else r + 7, b * 0.8, 0.8), t0 + (i * 4 + q) * b)
            add(part, drum_kick(0.5) if q % 2 == 0 else drum_snare(0.35), t0 + (i * 4 + q) * b)
            add(part, drum_hat(0.5), t0 + (i * 4 + q + 0.5) * b)
    out += part
    # [420] the fanfare
    t1 = 7.0
    for i, (mi, d) in enumerate([(72, 0.25), (76, 0.25), (79, 0.25), (84, 1.2)]):
        s = sum(x[1] for x in [(72, 0.25), (76, 0.25), (79, 0.25), (84, 1.2)][:i])
        for h in (0, -5, -12): add(out, horn(mi + h, d, 0.9 if h == 0 else 0.5, bright=1.3), t1 + s)
    add(out, chime(1.0), t1 + 0.8); add(out, crash(0.6), t1 + 0.75)
    for i, mi in enumerate([84, 88, 91, 96, 91, 88, 84, 79]): add(out, musicbox(mi, 1.0, 0.4), t1 + 1.3 + i * 0.1)
    # [620] corruption: the fanfare's echo and the tune again, crushed, stuttering, then the power gets pulled
    t2 = 10.33; g = np.zeros(secs(2.0))
    for i, mi in enumerate([72, 76, 79, 72, 72, 72, 84, 83]):
        s = horn(mi, 0.22, 0.8, bright=1.4); g[secs(i * 0.2):secs(i * 0.2) + len(s)] += s[:len(g) - secs(i * 0.2)]
    g = tapestop(crush(g, 3, 9), 0.9)
    add(out, g, t2); add(out, crush(lp(noise(secs(0.4)), 3000) * 0.3, 2, 20), t2 + 1.6)
    # [700] the hollow ending: a detuned music box over a low drone
    t3 = 11.7
    for i, mi in enumerate(seq('E5:1 D5:1 C5:1 G4:2')):
        add(out, musicbox(mi[0] - 0.3 * (i % 2), 2.2, 0.55), t3 + sum(d for _, d in seq('E5:1 D5:1 C5:1 G4:2')[:i]) * 0.5)
    add(out, pad([36, 43], 3.3, 0.35, detune=0.3), t3)
    finish(reverb(out, 2.0, 2.8, 0.28), 'cartridge', fade=0.8)


def bride():
    L = 15.0; out = np.zeros(secs(L))
    out += rainfall(L, 1.0)
    # [0] the broken bridal march: organ chords + a music-box melody that keeps slowing, A minor
    chords = [([57, 60, 64], 1.6), ([53, 57, 60], 1.6), ([52, 56, 59], 1.6), ([57, 60, 64], 0.2)]
    t = 0.3
    for ch, d in chords[:3]: add(out, organ(ch, d * 1.05, 0.6), t); t += d
    mel = seq('A4:1 A4:.75 A4:.25 A4:2  C5:1 B4:.75 A4:.25 G#4:2  A4:1 C5:1 E5:2')
    t = 0.3
    for i, (mi, d) in enumerate(mel):
        slow = 0.4 * (1 + i * 0.03)
        add(out, musicbox(mi + 12, 2.0, 0.7), t); t += d * slow
    # [300] thunder
    add(out, thunder(3.5, 1.0), 5.0)
    # [380] the vows: one held organ chord, low, swelling
    add(out, organ([45, 52, 57, 60], 3.0, 0.8), 6.33)
    # [470] a bell for each cut
    for i in range(3): add(out, bell(57 - i * 2, 3.0, 0.8 - i * 0.15), 7.83 + i * 0.5)
    # [560] the bouquet falls: a last phrase, and a far bell
    t = 9.4
    for mi, d in seq('E5:1 D5:1 C5:1 B4:1 A4:3'): add(out, musicbox(mi, 2.4, 0.6), t); t += d * 0.55
    add(out, organ([45, 48, 52], 4.5, 0.4), 9.4)
    add(out, bell(45, 4.5, 0.5), 12.3)
    finish(reverb(out, 3.2, 1.8, 0.45), 'bride', fade=1.6)


def ember():
    """16 s: the pyre, the fire, the rising, the judgment - then "Ashes to ashes", the knife thrown at the screen, the
    picture burning, the knife falling."""
    L = 16.0; out = np.zeros(secs(L))
    # [0] a low choir and a heartbeat
    add(out, choir([45, 52, 57], 3.2, 0.7, (500, 900)), 0.1)
    for i in range(6):
        add(out, timpani(33, 0.8, 0.9), 0.4 + i * 0.5); add(out, timpani(33, 0.6, 0.5), 0.6 + i * 0.5)
    # [180] the fire catches: crackle, the choir rising a step at a time
    add(out, crackle(8.4, 0.9), 3.0)
    for i, ch in enumerate([[45, 52, 57, 60], [47, 53, 59, 62], [48, 55, 60, 64]]): add(out, choir(ch, 1.4, 0.6 + 0.15 * i, (700, 1150)), 3.0 + i * 1.0)
    for i in range(12): add(out, timpani(33 + (i % 2) * 7, 0.4, 0.4 + i * 0.05, roll=0.5), 3.0 + i * 0.25)
    # [360] she rises: a huge hit
    add(out, mx(drum_kick(1.5), timpani(28, 2.0, 1.5)), 6.0); add(out, crash(1.0), 6.0)
    add(out, choir([52, 59, 64, 68, 71], 3.6, 1.0, (800, 1300)), 6.0)
    for i, mi in enumerate([64, 68, 71, 76]): add(out, horn(mi, 3.2 - i * 0.5, 0.5, bright=1.2), 6.0 + i * 0.12)
    # [560] judgment: a held chord over a bell...
    add(out, choir([52, 59, 64, 68], 2.2, 0.7, (900, 1400)), 9.33); add(out, bell(52, 4.0, 0.6), 9.33)
    # [600] ..."Ashes to ashes."
    add(out, voice('dv_ashes', -1.2, 0.35) * 0.9, 10.0)
    # [680] the throw - [700] it hits the screen: glass, a heavy thud; then the picture burns
    add(out, hp(noise(secs(0.35)), 1500) * np.linspace(0, 0.5, secs(0.35)), 11.33)
    add(out, mx(drum_kick(1.6), clank(0.8, 1.4), hp(noise(secs(0.4)), 2500) * np.exp(-np.arange(secs(0.4)) / SR * 9) * 0.8), 11.67)
    add(out, crackle(4.2, 1.6, seed=9), 11.7)
    roar = lp(noise(secs(4.0)), 400) * np.linspace(0.2, 1.0, secs(4.0)) * 0.5; add(out, roar, 11.7)
    add(out, choir([40, 47, 52], 3.5, 0.6, (400, 800)), 12.0)
    # [820] the knife falls and clatters; [880] the title
    add(out, clank(0.9, 1.0), 13.67); add(out, clank(0.5, 1.1), 13.85); add(out, clank(0.25, 1.2), 13.98)
    add(out, mx(timpani(28, 2.0, 1.2), bell(40, 2.0, 0.6)), 14.67)
    finish(reverb(out, 3.0, 1.9, 0.38), 'ember', fade=1.0)


def devoted():
    """THE DEVOTED's own outro (15 s): the dead field, her prayer and the stab, the beaten sinking, the sludge taking
    her stage by stage, a whisper, the thing in the dark opening its eyes."""
    L = 15.0; out = np.zeros(secs(L))
    out += lp(noise(secs(L)), 300) * 0.06                                          # wind over the field
    add(out, pad([38, 45, 50], 5.6, 0.45, detune=0.25), 0.0)
    motif = seq('D5:1 F5:1 E5:1 A4:2  D5:1 C5:.5 Bb4:.5 A4:3')                      # her theme, on a music box
    t = 0.3
    for mi, d in motif: add(out, musicbox(mi, 2.4, 0.55), t); t += d * 0.42
    # [230] the stab
    add(out, mx(drum_kick(1.4), timpani(26, 1.6, 1.3)), 3.83); add(out, lp(noise(secs(1.2)), 900) * np.exp(-np.arange(secs(1.2)) / SR * 4) * 0.8, 3.85)
    add(out, pad([37, 44, 49], 5.0, 0.5, detune=0.35), 4.0)
    # [340] the beaten sinking: a swelling rumble, bubbles
    sw = lp(noise(secs(3.2)), 160) * np.linspace(0, 1, secs(3.2)) ** 2; add(out, sw * 1.2, 5.67)
    for i in range(18): add(out, glass(40 + (i * 7) % 12, 0.15, 0.25), 5.8 + i * 0.16)
    # [560, 600, 640] the sludge takes her: three splashes, each lower
    for i, tt in enumerate((9.33, 10.0, 10.67)):
        add(out, mx(drum_kick(1.0 - i * 0.1), lp(noise(secs(0.6)), 1200) * np.exp(-np.arange(secs(0.6)) / SR * 6)), tt)
        add(out, pad([38 - i * 2, 45 - i * 2], 0.8, 0.5, detune=0.4), tt)
    # [660] the whisper; [690] its eyes open
    add(out, voice('dv_listens', -2.0, 0.45) * 0.9, 11.0)
    add(out, mx(timpani(26, 2.4, 1.4), bell(38, 3.0, 0.5)), 11.5)
    # [720] the end: the motif again, detuned, very slow
    t = 12.0
    for i, (mi, d) in enumerate(motif[:5]): add(out, musicbox(mi - 0.35 * (i % 2), 2.6, 0.45), t); t += d * 0.5
    finish(reverb(out, 3.2, 1.8, 0.42), 'devoted', fade=1.2)


PIECES = {'cartridge': cartridge, 'bride': bride, 'ember': ember, 'devoted': devoted}
if __name__ == '__main__':
    for nm in (sys.argv[1:] or PIECES): PIECES[nm]()
