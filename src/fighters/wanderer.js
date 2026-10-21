// THE WANDERER: a lost explorer in the Backrooms, still in the lab (Trinkets > TEST FIGHTERS). Data only -
// stats, sprite sheets and every move's hitboxes. Boxes are [x, y, w, h] from his feet while facing right
// (negative y = up). Art and animation: tools/sprites/wanderer_draw.py and tools/sprites/wanderer_moves.py.
// His own behaviour (Noclip, the Wrong Door, the torch beam, the Elevator, LEVEL 0) is in fighterWanderer.js.
// Numbers are first-pass placeholders, mostly copied from NU (same body size and rig) - tune after playtesting.
import { DEFAULT_GRAB } from './common.js';
import { WN_MOVES } from './wnMoves.js';

// his ability colours: buzzing fluorescent light on stained yellow
export const PAL_FLUO = { outline: 0x1a160a, deep: 0x8a7a2a, mid: 0xd8c860, light: 0xfff6b0, core: 0xffffff, shade: 0x3a3418, void: 0x0e0c06 };

export const WANDERER = {
  id: 'wanderer',
  name: 'THE WANDERER',
  sheets: { idle: 'wn_idle', run: 'wn_run', jump: 'wn_jump', fall: 'wn_fall', moves: 'wn_moves' },
  runCycle: [0, 8],
  moveAnims: WN_MOVES, movesOrigin: [56 / 112, 95 / 104],
  originY: 59 / 64,                 // feet on row 58 of the 64x64 frame
  handOffset: { x: 23, y: -33 },    // the flashlight's lens: where the torch beam comes out
  portrait: [18, 2, 36, 32],
  fxColor: 0xfff6b0,
  swingSfx: 'swing',
  pal: PAL_FLUO,
  backrooms: true,                  // draws his own effects (fighterWanderer.js drawWanderer)
  body: { w: 22, h: 50 },
  headTop: 54,
  tagY: 64,
  weight: 1.02,
  walkSpeed: 3.0, runAccel: 0.55, groundFriction: 0.55,
  airSpeed: 2.7, airAccel: 0.24, airFriction: 0.04,
  jumpV: -9.2, shortHopV: -6.2, doubleJumpV: -8.6,

  // TAUNT (1): LOST - shines the torch one way, then the other... then a helpless shrug
  taunt: { name: 'LOST', frames: 96, lines: ['HELLO...?', 'WHICH WAY IS OUT?', "I'VE BEEN HERE BEFORE.", 'DO YOU HEAR THAT HUM?'],
    sounds: [[1, 'buzz', 0.25, 1], [40, 'buzz', 0.2, 0.9], [66, 'dodge', 0.3, 0.6]] },

  moves: {
    ...DEFAULT_GRAB,
    // ---- ground attacks
    // FLASHLIGHT BONK: two quick bonks with the torch, then he clicks it on full in their face
    jab: { frames: 28, multi: true, fx: 'jab', light: { from: 15, to: 20, angle: 0, len: 46, w: 14 }, hits: [
      { from: 4, to: 5, box: [8, -50, 34, 26], dmg: 2, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 9, to: 10, box: [8, -50, 34, 26], dmg: 2, angle: 20, base: 0.8, growth: 0, stun: 8 },
      { from: 15, to: 17, box: [10, -54, 44, 32], dmg: 4, angle: 40, base: 3.0, growth: 2.8 },
    ] },
    // WET FLOOR SIGN: swings the yellow caution sign round from behind him - long reach
    ftilt: { frames: 32, fx: 'arc', hits: [{ from: 10, to: 14, box: [8, -54, 58, 40], dmg: 10, angle: 38, base: 3.2, growth: 6.0 }] },
    // CEILING CHECK: sweeps the torch beam overhead, front to back
    utilt: { frames: 26, fx: 'up', light: { from: 6, to: 16, angle: -40, toAngle: -150, len: 64, w: 16 },
      hits: [{ from: 7, to: 15, box: [-34, -104, 68, 52], dmg: 7, angle: 95, base: 3.0, growth: 5.6 }] },
    // DAMP CARPET: a low, squelching sweep along the floor
    dtilt: { frames: 22, fx: 'low', splash: 7, hits: [{ from: 6, to: 9, box: [6, -16, 42, 16], dmg: 6, angle: 24, base: 2.4, growth: 3.8 }] },
    // ENDLESS HALLWAY (attack at a full run): slides on his knees down the damp carpet
    dashAttack: { frames: 34, fx: 'low', slide: { from: 4, to: 20, vx: 7.0, dust: 0x8a7a4a }, hits: [
      { from: 5, to: 9, box: [4, -34, 40, 34], dmg: 9, angle: 72, base: 3.2, growth: 4.6 },
      { from: 10, to: 18, box: [4, -30, 36, 30], dmg: 5, angle: 60, base: 2.4, growth: 3.0 },
    ] },
    // ---- smash attacks
    // WET FLOOR: heaves the sign overhead and slams it down in front of him
    fsmash: { frames: 48, lunge: 1.6, fx: 'arc', hits: [{ from: 18, to: 22, box: [10, -64, 54, 64], dmg: 17, angle: 40, base: 4.2, growth: 7.6 }] },
    // POWER SURGE: torch thrust straight up - it flares into a blinding column
    usmash: { frames: 44, fx: 'up', light: { from: 12, to: 24, angle: -90, len: 120, w: 26, surge: true },
      hits: [{ from: 14, to: 20, box: [-24, -112, 48, 88], dmg: 15, angle: 88, base: 4.2, growth: 7.4 }] },
    // PUDDLE STOMP: stamps into a puddle; the splash hits both sides
    dsmash: { frames: 44, fx: 'low2', splash: 15, hits: [{ from: 15, to: 19, box: [-56, -14, 112, 16], dmg: 13, angle: 30, base: 3.8, growth: 6.8 }] },
    // ---- aerials
    // LOST: tumbles round once, torch out
    nair: { frames: 26, landLag: 6, fx: 'spin', hits: [{ from: 4, to: 14, box: [-28, -58, 56, 54], dmg: 7, angle: 45, base: 2.8, growth: 4.0 }] },
    // BOOT: a stiff rubber-boot kick
    fair: { frames: 26, landLag: 9, fx: 'thrust', hits: [{ from: 8, to: 11, box: [6, -40, 42, 26], dmg: 11, angle: 40, base: 3.0, growth: 6.2 }] },
    // WHAT WAS THAT?!: a panicked kick at something behind him
    bair: { frames: 24, landLag: 9, fx: 'back', hits: [{ from: 7, to: 9, box: [-42, -42, 36, 26], dmg: 12, angle: 145, base: 3.2, growth: 6.4 }] },
    // LIGHT UP: the torch pointed straight up
    uair: { frames: 24, landLag: 6, fx: 'up', light: { from: 6, to: 12, angle: -90, len: 70, w: 18 },
      hits: [{ from: 6, to: 11, box: [-24, -96, 48, 44], dmg: 8, angle: 86, base: 3.0, growth: 5.8 }] },
    // FALL THROUGH THE FLOOR: curls up, then stamps straight down with both boots - a spike
    dair: { frames: 34, landLag: 14, fx: 'down', hits: [{ from: 10, to: 14, box: [-14, -12, 28, 24], dmg: 12, angle: -80, base: 3.0, growth: 4.4 }] },
    // ---- specials
    // ALMOND WATER (neutral): lobs a bottle. It smashes where it lands into a puddle: opponents slip about
    // in it (slowed) and he slowly heals while he stands in it. One bottle in the air and one puddle at a time.
    neutralB: { frames: 30, spawnAt: 13, almond: {
      vx: 3.4, vy: -5.0, grav: 0.32,
      hit: { dmg: 5, angle: 50, base: 2.6, growth: 2.6 },
      // the puddle: how wide, how long it lasts, the slip it gives opponents (frames), and his healing:
      // 1% every `healEvery` frames he stands in it, up to `healMax`% per puddle
      puddle: { width: 64, life: 420, slip: 30, healEvery: 24, healMax: 12 },
    } },
    // NOCLIP (side): dives into thin air and is gone - he can't be hit while he's out of reality - then
    // glitches back in further ahead, hitting anyone where he lands. Once per jump.
    sideB: { frames: 40, landLag: 10, fx: 'spin', noclip: { from: 8, to: 22, vx: 8.2 },
      hits: [{ from: 23, to: 26, box: [-26, -56, 52, 56], dmg: 9, angle: 50, base: 3.2, growth: 5.0 }] },
    // ELEVATOR (up): an old elevator car carries him straight up at a steady pace; its roof hits anyone
    // above, and it dings when it arrives
    upb: { frames: 40, riseAt: 8, riseV: -5.2, liftV: -5.2, stopAt: 30, drift: 1.6, elevator: true, hits: [
      { from: 9, to: 16, box: [-22, -78, 44, 16], dmg: 5, angle: 85, base: 3.0, growth: 2.0, stun: 14 },
      { from: 28, to: 31, box: [-26, -84, 52, 84], dmg: 5, angle: 80, base: 4.0, growth: 4.4 },
    ] },
    // WRONG DOOR (down): sets a door down behind him. Press it again (anywhere, even in the air) to step
    // into a doorway and out of that door. One door at a time; it lasts 15 seconds and opponents can break it.
    downB: { frames: 30, spawnAt: 12, door: { behind: 34, hp: 18, life: 900 },
      walk: { frames: 28, swapAt: 12, safeFrom: 2, safeTo: 18 } },
  },

  // Limit: LEVEL 0. He holds up his torch... the lights buzz louder... and he clicks it off. Everyone close
  // enough noclips out of reality into the Backrooms - and THE BACTERIA is right behind them. They run down
  // the endless yellow hallway as it closes in, the lights dying behind it; it catches them, mauls them three
  // times in the dark (10% each) and hurls them back out of the walls (20%). 50% in all.
  // Nobody close enough: the lights just flicker and come back.
  limit: {
    name: 'LEVEL 0', type: 'level0', reach: 300, reachY: 120, frames: 160, grabAt: 48,
    // the chase: starts this many frames into the cutscene, lasts `frames`, the thing starts `gap0` px behind,
    // the hallway streams past at `speed` px a frame
    chase: { from: 14, frames: 130, gap0: 210, speed: 6 },
    mauls: 3, maulEvery: 14,
    maul: { dmg: 10, angle: 90, base: 2.0, growth: 0, stun: 30 },
    final: { dmg: 20, angle: 45, base: 6.4, growth: 6.6 },
    colors: PAL_FLUO,
  },
};
