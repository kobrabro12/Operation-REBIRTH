// WHAT ONCE WAS: something that got lost in the Backrooms a long time ago - a deformed body of stained
// wallpaper with an old CRT television for a head. Still in the lab (Trinkets > TEST FIGHTERS). Data only -
// stats, sprite sheets and every move's hitboxes. Boxes are [x, y, w, h] from its feet while facing right
// (negative y = up). Art and animation: tools/sprites/what_once_was_draw.py and what_once_was_moves.py.
// Its own behaviour (the SIGNAL meter and its three MODES, Channel Surf, the Wrong Door, its TV head, the
// screen beams, LEVEL 0) is in fighterWhatOnceWas.js. Numbers are first-pass - tune after playtesting.
import { DEFAULT_GRAB } from './common.js';
import { WOW_MOVES } from './wowMoves.js';

// its ability colours: a dead screen's glow on stained yellow
export const PAL_SIGNAL = { outline: 0x120e06, deep: 0x8a7a2a, mid: 0xd8c860, light: 0xfff6b0, core: 0xffffff, shade: 0x2a2410, void: 0x0a0804 };

export const WHAT_ONCE_WAS = {
  id: 'what-once-was',
  name: 'WHAT ONCE WAS',
  sheets: { idle: 'wow_idle', run: 'wow_run', jump: 'wow_jump', fall: 'wow_fall', moves: 'wow_moves' },
  // costumes with their own drawing (skins.js sheetSet): FRUTIGER, ROOT ACCESS, RONIN
  costumeSheets: Object.fromEntries(['aero', 'hack', 'ronin', 'dial'].map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'wow_' + s + '_' + k]))])),
  // which row of mode_screens.png each costume's MODE screens are on
  screenRow: { default: 0, wowAero: 1, wowHack: 2, wowRonin: 3, wowDial: 4 },
  // all its sheets are drawn WITHOUT the head (the game draws the TV - heads.png - where wowScreens.js says);
  // menus show these instead, head and all
  menuSheets: { default: 'wow_menu', aero: 'wow_aero_menu', hack: 'wow_hack_menu', ronin: 'wow_ronin_menu', dial: 'wow_dial_menu' },
  // the bodies OUT OF BODY can grow ('self' = the costume's own)
  bodies: ['self', 'suit', 'swat', 'doctor'],
  bodySheets: Object.fromEntries(['suit', 'swat', 'doctor'].map((s) => [s, Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, 'wow_' + s + '_' + k]))])),
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

  // SIGNAL meter: fills as it deals and takes damage. When it's full, it TRANSFORMS into one of three modes
  // at random. The mode stays until it's KO'd - then the meter starts over and the next mode is a new roll.
  // In a mode, its side special becomes that mode's command grab (shields don't stop grabs). Timings in frames.
  signal: { max: 100, perDealt: 0.8, perTaken: 0.6 },
  modes: {
    // SEE: one huge eye on the screen. 20% more damage on everything, for good.
    // Side special: the long arm shoots out, grabs them by the neck, snaps it (7%) and slams them down (9%).
    see: { name: 'SEE', color: 0xf0ece0, textColor: '#f0ece0', side: 'see_side', dmg: 1.2,
      lines: ['I SEE YOU.', 'THERE YOU ARE.', 'DON\'T BLINK.'],
      grab: { frames: 30, from: 7, to: 14, box: [8, -60, 74, 44], snapAt: 22, slamAt: 38, holdFrames: 58,
        snap: { dmg: 7, angle: 90, base: 1, growth: 0, stun: 40 },
        slam: { dmg: 9, angle: 82, base: 5.0, growth: 4.6 } } },
    // INCOMING: the screen floods bright red. 20% faster, for good.
    // Side special: a lunge; anyone it hits is tackled to the floor (3%), beaten (6 x 2%), hauled up and thrown (7%).
    incoming: { name: 'INCOMING', color: 0xff3a2a, textColor: '#ff4a3a', side: 'inc_side', speed: 1.2,
      lines: ['INCOMING.', 'RUN.', 'TOO SLOW.'],
      rush: { frames: 34, from: 6, to: 20, vx: 9.5, box: [0, -52, 42, 52], furyFrom: 12, furyTo: 42, furyEvery: 6, liftAt: 50, throwAt: 64, holdFrames: 80,
        tackle: { dmg: 3, angle: -60, base: 1, growth: 0, stun: 40 },
        fury: { dmg: 2, angle: -60, base: 0.5, growth: 0, stun: 40 },
        throw: { dmg: 7, angle: 30, base: 5.4, growth: 6.2 } } },
    // SMILE: a wide grin on the screen. Heals 2% a second (1% every half second), for good.
    // Side special: if someone is in range it teleports behind them, laughs, lifts them on its power cord,
    // shocks them (3 x 3%) and drops them somewhere random on the stage (3%).
    smile: { name: 'SMILE', color: 0xfff6b0, textColor: '#fff6b0', side: 'smile_side', heal: { every: 30, amount: 1 },
      lines: [':)', 'HA... HA... HA...', 'SMILE.'],
      tele: { frames: 34, at: 8, range: 240, rangeY: 120, behind: 26, box: [-6, -56, 52, 56], laugh: ['HA HA HA HA', 'HEHEHEHE', 'HA... HA... HA...'],
        laughFor: 24, shockFrom: 44, shockTo: 64, shockEvery: 10, dropAt: 78, holdFrames: 96,
        shock: { dmg: 3, angle: 90, base: 1, growth: 0, stun: 40 },
        drop: { dmg: 3, angle: 90, base: 2.0, growth: 0.8 } } },
  },

  // TAUNT (1): NO SIGNAL - the head tilts right over; the screen flicks through posters
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
    // CHANNEL SURF (side, before it transforms): dissolves into static and can't be hit while it's out of reality, then flickers
    // back in further ahead, hitting anyone where it lands. Once per jump.
    sideB: { frames: 40, landLag: 10, fx: 'spin', noclip: { from: 8, to: 22, vx: 8.2 },
      hits: [{ from: 23, to: 26, box: [-26, -58, 52, 58], dmg: 9, angle: 50, base: 3.2, growth: 5.0 }] },
    // OUT OF BODY (up): it heaves and the TV launches off its neck. You fly as the TV (steer left/right), and it
    // hits anyone above on the way up. Where the TV lands a new body grows, picks it up and puts it on - a suited
    // man, a SWAT officer, a doctor or its own body (never the one it just had). It keeps that body until the next
    // up special. Growing back takes a moment: it can be hit while it does (that just puts the TV straight on).
    upb: { tvhead: true, frames: 40, launchAt: 10, riseAt: 10, launchV: -14.5, drift: 3.4,
      neck: 38,                     // how far above its feet the TV starts
      tv: { w: 18, h: 18 },         // its hurtbox while it's only a TV
      regrow: { frames: 64, pickAt: 34, placeAt: 46, speed: 1.4 },   // in growth-animation frames; speed 1.4 = about 46 game frames
      hits: [{ from: 10, to: 28, box: [-13, -22, 26, 26], dmg: 8, angle: 85, base: 4.2, growth: 3.8 }] },
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
