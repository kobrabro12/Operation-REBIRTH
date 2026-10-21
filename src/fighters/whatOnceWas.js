// WHAT ONCE WAS: something that got lost in the Backrooms a long time ago - a deformed body of stained
// wallpaper with an old CRT television for a head. Still in the lab (Trinkets > TEST FIGHTERS). Data only -
// stats, sprite sheets and every move's hitboxes. Boxes are [x, y, w, h] from its feet while facing right
// (negative y = up). Art and animation: tools/sprites/what_once_was_draw.py and what_once_was_moves.py.
// Its own behaviour (the SIGNAL meter and CHANNEL menu, Channel Surf, the Wrong Door, the elevator, the
// screen beam, LEVEL 0) is in fighterWhatOnceWas.js. Numbers are first-pass - tune after playtesting.
import { DEFAULT_GRAB } from './common.js';
import { WOW_MOVES } from './wowMoves.js';

// its ability colours: a dead screen's glow on stained yellow
export const PAL_SIGNAL = { outline: 0x120e06, deep: 0x8a7a2a, mid: 0xd8c860, light: 0xfff6b0, core: 0xffffff, shade: 0x2a2410, void: 0x0a0804 };

export const WHAT_ONCE_WAS = {
  id: 'what-once-was',
  name: 'WHAT ONCE WAS',
  sheets: { idle: 'wow_idle', run: 'wow_run', jump: 'wow_jump', fall: 'wow_fall', moves: 'wow_moves' },
  runCycle: [0, 8],
  moveAnims: WOW_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,                 // feet on row 58 of the 64x64 frame
  handOffset: { x: 20, y: -16 },    // the long arm's claw: where posters leave from
  portrait: [22, 0, 30, 30],
  fxColor: 0xfff6b0,
  swingSfx: 'swing',
  pal: PAL_SIGNAL,
  backrooms: true,                  // draws its own effects (fighterWhatOnceWas.js drawWhatOnceWas)
  body: { w: 22, h: 52 },
  headTop: 58,
  tagY: 70,
  weight: 1.04,
  walkSpeed: 2.9, runAccel: 0.5, groundFriction: 0.55,
  airSpeed: 2.6, airAccel: 0.24, airFriction: 0.04,
  jumpV: -9.2, shortHopV: -6.2, doubleJumpV: -8.6,

  // SIGNAL meter: fills as it deals and takes damage. Full: the taunt key (1) opens its CHANNEL menu instead
  // of taunting - pick a channel with a direction (fighterWhatOnceWas.js):
  //   UP    WARNING   - 8 s of red screen: it deals 25% more damage
  //   SIDE  MISSING   - vanishes into static and comes out behind the nearest opponent, posting them MISSING
  //                     for 6 s (they take 20% more damage)
  //   DOWN  DEAD AIR  - recovers 15% (15 HP in Stamina) and can't be flinched for 4 s
  signal: { max: 100, perDealt: 0.8, perTaken: 0.6, menuFor: 150,
    warning: { frames: 480, dmg: 1.25 }, missing: { frames: 360, behind: 28 }, deadAir: { heal: 15, armor: 240 } },

  // TAUNT (1, when the meter isn't full): NO SIGNAL - the head tilts right over; the screen flicks through posters
  taunt: { name: 'NO SIGNAL', frames: 96, lines: ['HAVE YOU SEEN ME?', '...MISSING...', 'PLEASE STAND BY', 'NO SIGNAL'],
    sounds: [[1, 'buzz', 0.3, 1], [30, 'glitch', 0.4, 0.8], [58, 'buzz', 0.4, 0.7]] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks
    // SCREEN BASH: two headbutts with the TV, then a burst of static from the screen
    jab: { frames: 28, multi: true, fx: 'jab', static: 16, hits: [
      { from: 5, to: 6, box: [8, -62, 34, 26], dmg: 2, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 10, to: 11, box: [8, -62, 34, 26], dmg: 2, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 16, to: 18, box: [10, -66, 44, 34], dmg: 4, angle: 40, base: 3.0, growth: 2.8 },
    ] },
    // LONG REACH: that too-long arm lashes straight out - the longest tilt in the game
    ftilt: { frames: 30, fx: 'arc', hits: [{ from: 10, to: 14, box: [10, -46, 66, 22], dmg: 9, angle: 34, base: 3.0, growth: 6.0 }] },
    // ANTENNA WHIP: the head snaps back and the rabbit ears whip overhead
    utilt: { frames: 24, fx: 'up', hits: [{ from: 7, to: 13, box: [-30, -96, 56, 40], dmg: 7, angle: 95, base: 3.0, growth: 5.6 }] },
    // CARPET CLAW: drops low and rakes the claw along the floor
    dtilt: { frames: 22, fx: 'low', hits: [{ from: 7, to: 11, box: [6, -16, 52, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.8 }] },
    // LURCH (attack at a full run): trips forward and slides along the carpet, screen first
    dashAttack: { frames: 34, fx: 'low', slide: { from: 4, to: 20, vx: 7.0, dust: 0x8a7a4a }, hits: [
      { from: 5, to: 9, box: [4, -34, 44, 34], dmg: 9, angle: 72, base: 3.2, growth: 4.6 },
      { from: 10, to: 18, box: [4, -30, 40, 30], dmg: 5, angle: 60, base: 2.4, growth: 3.0 },
    ] },
    // ---- smash attacks
    // CRT BLAST: rears back, the screen flashes a WARNING sign - then a beam of white light blasts out of it
    fsmash: { frames: 48, lunge: 1.2, fx: 'thrust', beam: { from: 18, to: 30, ox: 22, oy: -46, angle: 0, len: 92, w: 18 },
      hits: [{ from: 18, to: 24, box: [16, -62, 92, 34], dmg: 16, angle: 36, base: 4.2, growth: 7.4 }] },
    // ANTENNA SURGE: head thrown back, antennae to the sky - a column of red static straight up
    usmash: { frames: 44, fx: 'up', beam: { from: 14, to: 26, ox: -2, oy: -66, angle: -90, len: 110, w: 20, red: true },
      hits: [{ from: 14, to: 22, box: [-24, -170, 48, 120], dmg: 15, angle: 88, base: 4.2, growth: 7.4 }] },
    // DEAD SIGNAL: slams the TV face-down into the floor; static crawls out both ways
    dsmash: { frames: 44, fx: 'low2', static: 15, hits: [{ from: 15, to: 19, box: [-58, -16, 116, 18], dmg: 13, angle: 30, base: 3.8, growth: 6.8 }] },
    // ---- aerials
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-30, -60, 60, 56], dmg: 7, angle: 45, base: 2.8, growth: 4.0 }] },
    // SCREEN SMASH: a flying headbutt, screen first
    fair: { frames: 26, landLag: 9, fx: 'thrust', hits: [{ from: 8, to: 12, box: [10, -60, 40, 30], dmg: 11, angle: 40, base: 3.0, growth: 6.2 }] },
    // the swollen leg kicks back
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-44, -42, 38, 26], dmg: 12, angle: 145, base: 3.2, growth: 6.4 }] },
    // ANTENNA: head snapped straight up, the rabbit ears spark
    uair: { frames: 24, landLag: 6, fx: 'up', hits: [{ from: 6, to: 11, box: [-24, -104, 48, 46], dmg: 8, angle: 86, base: 3.0, growth: 5.8 }] },
    // POWER CORD: curls up, then whips its cord straight down - a spike
    dair: { frames: 34, landLag: 14, fx: 'down', hits: [{ from: 10, to: 14, box: [-20, -14, 26, 30], dmg: 12, angle: -80, base: 3.0, growth: 4.4 }] },
    // ---- specials
    // MISSING POSTER (neutral): flings a poster that flutters forward. Whoever it hits is posted MISSING for
    // 2 seconds (they take 20% more damage) and it fills the SIGNAL meter. One poster out at a time.
    neutralB: { frames: 30, spawnAt: 13, poster: {
      speed: 4.2, life: 80, flutter: 6, mark: 120,
      hit: { dmg: 6, angle: 40, base: 2.4, growth: 2.2 },
    } },
    // CHANNEL SURF (side): dissolves into static and can't be hit while it's out of reality, then flickers
    // back in further ahead, hitting anyone where it lands. Once per jump.
    sideB: { frames: 40, landLag: 10, fx: 'spin', noclip: { from: 8, to: 22, vx: 8.2 },
      hits: [{ from: 23, to: 26, box: [-26, -58, 52, 58], dmg: 9, angle: 50, base: 3.2, growth: 5.0 }] },
    // OUT OF ORDER (up): an old elevator car carries it straight up; its roof hits anyone above
    upb: { frames: 40, riseAt: 8, riseV: -5.2, liftV: -5.2, stopAt: 30, drift: 1.6, elevator: true, hits: [
      { from: 9, to: 16, box: [-22, -82, 44, 16], dmg: 5, angle: 85, base: 3.0, growth: 2.0, stun: 14 },
      { from: 28, to: 31, box: [-26, -88, 52, 88], dmg: 5, angle: 80, base: 4.0, growth: 4.4 },
    ] },
    // WRONG DOOR (down): sets a door down behind it. Press it again (anywhere, even in the air) to step into a
    // doorway and out of that door. One door at a time; it lasts 15 seconds and opponents can break it.
    downB: { frames: 30, spawnAt: 12, door: { behind: 34, hp: 18, life: 900 },
      walk: { frames: 28, swapAt: 12, safeFrom: 2, safeTo: 18 } },
  },

  // Limit: LEVEL 0. The screen shows one huge eye... then floods red. Everyone close enough noclips out of
  // reality into the Backrooms - and THE BACTERIA is right behind them. They run down the endless yellow
  // hallway as it closes in, the lights dying behind it; it catches them, mauls them three times in the dark
  // (10% each) and hurls them back out of the walls (20%). 50% in all. Nobody in reach: the lights flicker.
  limit: {
    name: 'LEVEL 0', type: 'level0', reach: 300, reachY: 120, frames: 160, grabAt: 48,
    // the chase: starts this many frames into the cutscene, lasts `frames`, the thing starts `gap0` px behind,
    // the hallway streams past at `speed` px a frame
    chase: { from: 14, frames: 130, gap0: 210, speed: 6 },
    mauls: 3, maulEvery: 14,
    maul: { dmg: 10, angle: 90, base: 2.0, growth: 0, stun: 30 },
    final: { dmg: 20, angle: 45, base: 6.4, growth: 6.6 },
    colors: PAL_SIGNAL,
  },
};
