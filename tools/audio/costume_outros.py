"""Music for the miracle costumes' outros (src/scenes/costumeOutros.js), each scored to its shots (frame / 60 = seconds).

  storm      STORMCALLER "THE SKY ANSWERS" (14 s): rain and a low drone on the peak with thunder rolling in (0-3.2 s), a
             choir and timpani swelling as he raises his hand (3.2-5.5), three orchestral hits on the three strikes (5.8,
             6.3, 6.8), a heroic brass call on the close-up (7.8), the storm resolving into a warm major dawn (10).
  pharaoh    SUN PHARAOH "THE ETERNAL" (14 s), in E phrygian dominant: a drone, a plucked oud-like melody and a hand-drum
             groove over the dunes; a choir in the temple (3 s); a rising swell to a blaze as the sun fills the screen (7.2);
             tension as they're wrapped, a clang and a boom on the coffin lids (9.0, 9.8); a slow falling line at the tomb,
             the door's boom (11.3), a last chord.
  starfarer  SPACEWALK (AERO) "ONE SMALL SPLASH" (14 s): a tense pulse under the countdown, the launch swell (2 s); floating
             pads and a celesta of wonder in orbit (3.3); a bouncy moonwalk tune (6.3) with a chime as the flag goes in
             (8.0); hushed on the dome (9); a bright, triumphant little theme as he waves (10.7).

Run:  python3 tools/audio/costume_outros.py [storm pharaoh starfarer]  -> public/assets/audio/music/outro_<name>.ogg (bgm_outro_<name>)
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from outro_music import SR, secs, hz, lp, hp, bp, add, adsr, reverb, finish, brass, timpani, pad, glass, noise, drum_kick
from trophy_hall_music import organ, choir
from boss_music import strings, ohit, pluck, sinew, glock, sub, supersaw

LEN = 14.0


def thunder(vel=1.0, dur=2.6):
    """A roll of thunder: a crack of bright noise, then a long low rumble that swells and fades."""
    n = secs(dur); t = np.arange(n) / SR
    crack = hp(noise(n), 1500) * np.exp(-t * 18) * 0.8
    roll = lp(noise(n), 160) * (np.exp(-t * 1.2) * (1 - np.exp(-t * 14))) * (1 + 0.5 * np.sin(2 * np.pi * 3 * t)) * 3
    return (crack + roll) * vel * 0.5


def rainfall(dur, vel=1.0):
    """Steady rain: soft band-passed noise with little patters."""
    n = secs(dur)
    x = bp(noise(n), 1200, 6000) * 0.08
    for i in range(int(dur * 40)): j = np.random.randint(0, n - 200); x[j:j + 200] += hp(noise(200), 3000) * np.exp(-np.arange(200) / 30) * 0.15
    return x * vel


def drum(kind, vel=1.0):
    """A hand drum: 'D' the deep doum, 'T' the tight tek, 'k' a ka."""
    n = secs(0.4); t = np.arange(n) / SR
    if kind == 'D': return (np.sin(2 * np.pi * 90 * t * (1 - 0.3 * t)) * np.exp(-t * 9) + lp(noise(n), 300) * np.exp(-t * 30) * 0.5) * vel * 0.7
    f = 420 if kind == 'T' else 520
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 35) + bp(noise(n), 1500, 6000) * np.exp(-t * 50) * 0.7) * vel * 0.4


def storm():
    out = np.zeros(secs(LEN + 3))
    add(out, rainfall(10.0, 1.0), 0)
    add(out, sub(28, 5.5, 0.5), 0)
    for at in (0.0, 1.17, 2.33): add(out, thunder(0.9), at)
    add(out, choir([52, 59, 64], 2.6, 0.5), 3.1); add(out, choir([55, 62, 67], 2.4, 0.6), 4.3)   # the swell as he raises his hand
    add(out, timpani(40, 2.2, 0.9, roll=1.0), 3.4); add(out, strings([52, 59, 64, 71], 2.4, 0.6), 3.2)
    for i, at in enumerate((5.83, 6.33, 6.83)): add(out, ohit([52 + i * 3, 59 + i * 3, 64 + i * 3], 1.2), at); add(out, thunder(0.8, 1.6), at); add(out, timpani(40, 1.0, 1.0), at)
    for at, m, d in [(7.83, 64, 0.5), (8.33, 71, 0.5), (8.83, 69, 0.4), (9.23, 76, 0.9)]: add(out, brass(m, d, 0.6, 1.2), at); add(out, brass(m - 12, d, 0.4, 1.0), at)   # the heroic call
    add(out, strings([52, 64, 67, 71], 2.2, 0.5), 7.9)
    add(out, choir([60, 64, 67, 72], 4.0, 0.55), 10.0); add(out, pad([48, 55, 64, 67, 72], 4.0, 0.45), 10.0)   # dawn: C major, warm
    for i, m in enumerate([72, 76, 79, 84, 79, 76]): add(out, glass(m, 1.2, 0.18), 10.4 + i * 0.5)
    finish(reverb(out, 3.0, 2.4, 0.4)[:secs(LEN)], 'storm', peak=0.88, fade=1.2)


def pharaoh():
    out = np.zeros(secs(LEN + 3))
    E = [52, 53, 56, 57, 59, 60, 62, 64]                                          # E phrygian dominant
    add(out, sub(28, 7.8, 0.45), 0); add(out, organ(40, 7.8, 0.25), 0)
    groove = 'D.TkD.Tk'
    for b in range(28):                                                         # the hand drums, 2 beats a bar at 120
        if 15 <= b < 20: continue
        for i, c in enumerate(groove):
            if c != '.': add(out, drum(c, 0.8 if c == 'D' else 0.5), b * 0.5 + i * 0.0625 * 1.0)
    mel = [(0.0, 64, 0.5), (0.5, 65, 0.25), (0.75, 68, 0.25), (1.0, 69, 0.5), (1.5, 68, 0.25), (1.75, 65, 0.25), (2.0, 64, 0.75), (2.75, 62, 0.25),
           (3.0, 64, 1.0)]
    for rep in (0, 1):
        for at, m, d in mel: add(out, pluck(m + 12 * rep, d * 1.6, 0.7), 0.2 + rep * 3.0 + at)   # the oud, then an octave up in the temple
    add(out, choir([52, 56, 59], 2.6, 0.5), 3.0)
    for i in range(14): add(out, strings([52 + E[i % 8] - 52 + 12], 0.18, 0.35), 5.5 + i * 0.12)   # rising runs as the sun climbs
    add(out, strings([52, 56, 59, 64], 1.8, 0.6), 5.5); add(out, choir([64, 68, 71, 76], 1.6, 0.6), 5.8)
    add(out, ohit([52, 56, 59, 64], 1.4), 7.17); add(out, timpani(40, 1.5, 1.0), 7.17)   # the blaze
    add(out, strings([53, 56, 60], 2.2, 0.5), 7.9); add(out, sub(29, 2.2, 0.5), 7.9)   # wrapped: tense, the F above E
    add(out, timpani(40, 1.2, 0.9), 9.0); add(out, ohit([40, 47, 52], 1.0), 9.83); add(out, drum_kick(1.0), 9.83)
    for i, m in enumerate([76, 74, 72, 71, 69, 68, 65, 64]): add(out, sinew(m, 0.55, 0.22, 0.03, 0.2), 10.4 + i * 0.4)   # the falling line at the tomb
    add(out, timpani(40, 2.0, 1.0), 11.3); add(out, drum_kick(1.0), 11.3)
    add(out, choir([52, 56, 59, 64], 3.0, 0.5), 11.6); add(out, organ(40, 3.0, 0.3), 11.6)
    finish(reverb(out, 2.8, 2.6, 0.38)[:secs(LEN)], 'pharaoh', peak=0.88, fade=1.2)


def starfarer():
    out = np.zeros(secs(LEN + 3))
    for i in range(16): add(out, sinew(45 + (i % 2) * 12, 0.12, 0.35, 0.005, 0.05), i * 0.125)   # the countdown's pulse
    add(out, pad([57, 64, 69], 2.0, 0.3), 0)
    m = secs(2.0); rise = hp(noise(m), 800) * np.linspace(0, 1, m) ** 2 * 0.25; add(out, rise, 0)
    add(out, ohit([45, 52, 57, 64], 1.3), 2.0); add(out, timpani(33, 2.0, 1.0, roll=1.0), 2.0); add(out, lp(noise(secs(2.5)), 200) * np.exp(-np.arange(secs(2.5)) / SR * 1.2) * 1.2, 2.0)   # LIFT-OFF
    add(out, pad([57, 61, 64, 68, 71], 3.2, 0.9), 3.33); add(out, choir([69, 73, 76], 3.0, 0.55), 3.4)   # orbit: wonder
    for i, mm in enumerate([81, 85, 88, 92, 88, 85, 81, 80, 85, 88, 93, 92]): add(out, glock(mm, 0.6, 0.75), 3.4 + i * 0.25)
    walk = [(0, 69), (0.25, 72), (0.5, 76), (0.75, 72), (1.0, 74), (1.25, 77), (1.5, 81), (1.75, 77)]   # the moonwalk: bouncy
    for rep in range(2):
        for at, mm in walk: add(out, pluck(mm, 0.3, 1.1), 6.33 + rep * 2.0 + at * 1.33)
        add(out, sinew(45, 0.3, 0.75), 6.33 + rep * 2.0); add(out, sinew(50, 0.3, 0.75), 6.33 + rep * 2.0 + 1.0)
    add(out, glock(93, 1.2, 0.6), 8.0); add(out, glock(88, 1.2, 0.4), 8.05)   # the flag
    add(out, pad([64, 69, 73], 1.8, 0.6), 9.0); add(out, glass(85, 1.6, 0.18), 9.2)   # the dome: hushed
    theme = [(0, 69, 0.4), (0.4, 73, 0.4), (0.8, 76, 0.4), (1.2, 81, 0.8), (2.0, 80, 0.4), (2.4, 76, 0.4), (2.8, 78, 0.4), (3.2, 81, 1.0)]   # the wave: bright, triumphant
    for at, mm, d in theme: add(out, brass(mm - 12, d, 0.45, 1.1), 10.67 + at); add(out, glock(mm + 12, d, 0.25), 10.67 + at)
    add(out, strings([57, 64, 69, 73], 3.3, 0.45), 10.67)
    for i in range(12): add(out, supersaw(69 + [0, 4, 7, 12][i % 4], 0.12, 0.18), 10.67 + i * 0.13)
    finish(reverb(out, 2.8, 2.4, 0.36)[:secs(LEN)], 'starfarer', peak=0.88, fade=1.2)


if __name__ == '__main__':
    for w in sys.argv[1:] or ['storm', 'pharaoh', 'starfarer']: globals()[w]()
