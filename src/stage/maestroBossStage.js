// THE GRAND OPERA - the arena of MAESTRO FORTISSIMO, HE CONDUCTS THE STORM (boss IX; Trinkets > BOSS FIGHTS,
// src/data/bosses.js). An original character: a gaunt, towering, wildly dramatic orchestra conductor in tails, a mane
// of white hair that whips about with the tempo, a hooked nose, pince-nez, a crimson sash and a baton he wields like
// a rapier. He stands on a floating conductor's rostrum and treats the fight as a performance - you are his orchestra,
// and you are playing it WRONG.
// THE ARENA is real 3D (poly3d.js): the stage of an opera house, its horseshoe of gilded balconies curving away into
// the dark behind, a painted dome overhead, the ghostly audience in the boxes.
// THE SCORE: everything he does lands ON THE BEAT (`BEAT` frames = 120 BPM, his music's tempo). A musical staff under
// his health bar scrolls his coming attacks toward the playhead as notes - read it like sheet music: when a note
// reaches the line, it hits (the height of a note on the staff = high or low, for the violins). Marks on the floor show
// where. And the beat works for you too: a hit that lands ON THE BEAT does x1.5 (BRAVO!).
// His pieces (`pattern`): STACCATO (giant notes slam down on marked spots, one a beat), CRESCENDO (rings of sound pulse
// out of him, louder each beat), TIMPANI (phantom drums: the whole floor shakes on every beat - be in the air on the
// beat), VIOLINS (phantom bows sweep the stage high or low on the beat - duck or jump, the staff shows which), ARIA (a
// phantom soprano rises behind the stage and sings notes that home in on you), CHANDELIER (it swings over you for three
// beats and drops on the fourth, shattering) and BATON (he slashes fans of blade-notes).
// At half health: FORTISSIMO! (a cutscene when a player's watching) - the roof tears away, a storm, rain, and twice the
// notes (8ths); his act adds LIGHTNING (bolts on the beat). Below 30%: THE FINALE - the storm strikes on every bar.
// His death: THE FINAL BOW - the last chord, the baton snaps, he bows, roses rain down and the curtain falls.
// Stage hazards (VS too): FALLING SANDBAG (a sandbag drops from the fly tower on a mark) and TRAPDOOR SMOKE (a burst of
// stage smoke out of a trap in the floor that pushes you up).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { Poly3D, boxFaces, prismFaces } from './poly3d.js';
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W } from '../config.js';

// one beat in frames (120 BPM at 60 fps) and how far ahead the score shows notes (frames)
const BEAT = 30, LEAD = 96;
// a hit on him this close to a beat (frames) is ON THE BEAT: x this damage
const ONBEAT = { near: 4, mult: 1.5 };
// his size: rostrum height, leg, torso, head; arm; glide speeds; how far he roams
const COND = { podium: 24, leg: 72, torso: 66, head: 36, arm: 50, walk: 1.5, fast: 2.2, range: 190 };
// his colours: skin, tails, lining, waistcoat, sash, hair, gloves, rostrum wood, gold
const LOOK = { skin: 0xead8c8, tails: 0x14121c, lining: 0xc0203a, vest: 0xf4f0e8, sash: 0xc0203a, hair: 0xf4f4fa, glove: 0xffffff, wood: 0x6a3a1a, gold: 0xe8b840, ink: 0x07060c };
// STACCATO: notes (calm, enraged), how wide the slam is, hit
const STAC = { n: [4, 6], w: 24, hit: [9, [80, 5.4, 0.6]] };
// CRESCENDO: pulses, ring speed (soft, the last loud one), ring thickness, hit
const CRESC = { n: 4, speed: [4.5, 6.5], life: 56, hit: [8, [60, 5.4, 0.6]], big: [12, [60, 6.4, 0.85]] };
// TIMPANI: beats (calm, enraged), how high the shock reaches, hit
const TIMP = { n: [4, 6], h: 16, hit: [6, [80, 4.8, 0.45]] };
// VIOLINS: sweeps (calm, enraged), the two heights (low band, high band), hit
const VIOL = { n: [4, 6], low: [-34, -6], high: [-142, -112], hit: [9, [30, 5.6, 0.6]] };
// ARIA: notes she sings, speed, how hard they home in, hit
const ARIA = { n: [4, 6], speed: 3.4, turn: 0.05, life: 200, hit: [8, [60, 5, 0.55]] };
// CHANDELIER: beats it swings before it drops, its size, fall speed, hit, shards, shard hit
const CHAND = { beats: 3, w: 70, fall: 14, hit: [14, [80, 6.6, 0.95]], shards: 6, shard: [6, [40, 4.6, 0.45]] };
// BATON: slashes (calm, enraged), blades per slash, speed, hit
const BATON = { n: [2, 3], fan: 3, speed: 6.5, hit: [8, [40, 5.2, 0.55]] };
// LIGHTNING (enraged): bolts per beat, beats, hit
const BOLT = { per: 2, n: 4, hit: [10, [80, 5.8, 0.65]] };
// all his hits: x damage, x base knockback, x knockback growth (one knob for the whole fight's punch)
const HIT = { dmg: 0.85, base: 1.0, growth: 1.1 };
// THE FINALE (below this much health): a bolt on every bar
const LOW = { at: 0.3 };
// the FORTISSIMO cutscene: its length, when the roof tears away
const STORM = { n: 240, tear: 120 };
// stage hazards: SANDBAG (warning, hit) and SMOKE (warning, burst frames, hit)
const SAND = { warn: 64, hit: [8, [80, 5, 0.5]] };
const SMOKE = { warn: 56, dur: 26, hit: [5, [90, 6, 0.4]] };
// what he says
const SAY = {
  intro: 'SILENCE!  ...THE PERFORMANCE BEGINS.',
  idle: ['TEMPO! TEMPO!', 'NO, NO, NO! FROM THE TOP!', 'YOU ARE FLAT. EVERYTHING ABOUT YOU IS FLAT.', 'FEEL THE MUSIC!', 'PIANISSIMO... PIANISSIMO...', 'COUNT, YOU FOOL! ONE, TWO, THREE, FOUR!'],
  hurt: ['OFF THE BEAT!', 'A WRONG NOTE!', 'BARBARIAN!', 'MY HAIR! MY MAGNIFICENT HAIR!', 'HOW DARE YOU INTERRUPT!'],
  onbeat: ['...BRAVO.', 'ON THE BEAT?!', 'THAT... WAS IN TIME.', 'FINALLY, SOME RHYTHM!'],
  hit: ['BRAVISSIMO!', 'MUSIC!', 'AH, THE PERCUSSION SECTION!', 'AND... REST!'],
  pieces: { staccato: 'STACCATO!', crescendo: 'CRESCENDO...', timpani: 'TIMPANI!', violins: 'STRINGS!', aria: 'SING, MY DIVA!', chandelier: 'THE CHANDELIER!', baton: 'EN GARDE!', lightning: 'THUNDER, ON MY COUNT!' },
  rage: 'ENOUGH ADAGIO!', storm: 'FORTISSIMO!!', low: 'THE FINALE!!', gloat: 'THE AUDIENCE ADORES ME!',
};

/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** A repeatable 0-1 number from a few integers. */
const hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** A colour mixed toward another (k = 0..1). */
const mix = (a, b, k) => { const c = (s) => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k); return (c(16) << 16) | (c(8) << 8) | c(0); };
/** Ease out (fast, then settling). */
const easeOut = (q) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 3);
// how each kind of note looks on the score (colour)
const NOTE_COL = { staccato: 0xffd040, crescendo: 0xff6a8a, timpani: 0xc08a4a, violins: 0x8ad0ff, aria: 0xd0a0ff, chandelier: 0xfff0c0, baton: 0xffffff, bolt: 0x9ae0ff };

/** THE GRAND OPERA and MAESTRO FORTISSIMO (see the top of the file). */
export class MaestroBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_maestro';
    this.platforms = [
      { x1: -250, x2: 250, y: 0, solid: true, bottom: 44 },
      { x1: -225, x2: -130, y: -108, solid: false },
      { x1: 130, x2: 225, y: -108, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['sandbag', 'smoke'], { color: '#ffd040', stroke: '#2a0a10', gap: 720 });
    this.e = { x: 100, y: 0, dir: -1, walk: 0, hop: 0, bow: 0, arms: 'conduct', alpha: 1, wild: 0, snap: false, curtain: 0 };
    this.notes = []; this.fx = []; this.chand = null; this.diva = null; this.pit = null; this.storm = 0; this.low = false; this.rain = [];
    this.say = null; this.sayCD = 300; this.pop = null; this.flash = 0; this.sand = null; this.smoke = null; this.prev = new Map();
    this.sparkColor = 0xd03050; this.bodyW = 80; this.bodyH = 220;
  }

  // ------------------------------------------------------------------ the arena
  /** Builds the backdrop, the 3D opera house (balconies, columns, dome), the stage, his layers and the speech bubble. */
  draw(world, bg) {
    const s = this.scene;
    this.skyG = s.add.graphics().setScrollFactor(0); bg.push(this.skyG);
    const R = this.R = new Poly3D(s, world, { fog: 0x1a0610, zFar: 3400, zNear: 500, soft: 0.35, grain: 0.06, edge: 0.15 });
    // the horseshoe of balconies: four tiers of boxes curving round behind the stage, red velvet fronts with gold rails,
    // a ghostly audience in them, columns between the boxes
    for (let tier = 0; tier < 4; tier++) {
      const y = 150 - tier * 110, N = 18;
      for (let i = 0; i < N; i++) {
        const a0 = -1.9 + i * 3.8 / N, a1 = a0 + 3.8 / N, P = (a) => [Math.sin(a) * 900, 1250 + Math.cos(a) * 700];
        const [x0, z0] = P(a0), [x1, z1] = P(a1);
        const front = { p: [[x0, y - 46, z0], [x1, y - 46, z1], [x1, y, z1], [x0, y, z0]], n: null, c: 0x8a1428, k: 'house' };
        const rail = { p: [[x0, y - 52, z0], [x1, y - 52, z1], [x1, y - 44, z1], [x0, y - 44, z0]], n: null, c: LOOK.gold, k: 'house' };
        const back = { p: [[x0 * 1.12, y - 110, z0 + 80], [x1 * 1.12, y - 110, z1 + 80], [x1 * 1.12, y, z1 + 80], [x0 * 1.12, y, z0 + 80]], n: null, c: 0x2a0812, k: 'house' };
        R.faces.push(back, front, rail);
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2 + 30;
        if (hash(i, tier) < 0.7) R.faces.push({ p: [[mx - 10, y - 74, mz], [mx + 10, y - 74, mz], [mx + 14, y - 46, mz], [mx - 14, y - 46, mz]], n: null, c: 0x5a7a9a, a: 0.55, nofog: true, bb: true, k: 'ghost' });
        R.faces.push(...prismFaces(x0, y - 110, y, z0 + 4, 9, 6, 0xc8a050, LOOK.gold).map((f) => ({ ...f, k: 'house' })));
      }
    }
    // the dome: a ring of painted panels high overhead with gilded ribs (it tears away for FORTISSIMO)
    for (let i = 0; i < 16; i++) {
      const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2, r1 = 600, r2 = 1100, y1 = -560, y2 = -360, cz = 1200;
      const q = [[Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1 * 0.5], [Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1 * 0.5], [Math.cos(a1) * r2, y2, cz + Math.sin(a1) * r2 * 0.5], [Math.cos(a0) * r2, y2, cz + Math.sin(a0) * r2 * 0.5]];
      R.faces.push({ p: q, n: null, c: i % 2 ? 0x3a2a5a : 0x4a3060, k: 'roof' }, { p: [q[0], q[3], [q[3][0] * 1.01, y2 + 8, q[3][2]], [q[0][0] * 1.01, y1 + 8, q[0][2]]], n: null, c: LOOK.gold, k: 'roof' });
    }
    // the proscenium: two great gilded columns and a velvet valance framing the stage
    for (const sx of [-1, 1]) { R.faces.push(...prismFaces(sx * 360, -420, 60, 260, 26, 10, 0xc8a050, LOOK.gold)); R.faces.push(...boxFaces(sx * 360 - 50, 40, 230, sx * 360 + 50, 70, 290, 0x6a4a2a, 0x8a6a3a)); }
    this.curtainG = s.add.graphics(); world.push(this.curtainG);       // the velvet curtains at the sides (and the final one)
    this.arenaG = s.add.graphics(); world.push(this.arenaG);
    this.pitG = s.add.graphics(); world.push(this.pitG);               // the phantom orchestra and the soprano
    this.backG = s.add.graphics(); world.push(this.backG);             // (his tails and hair)
    this.condG = s.add.graphics(); world.push(this.condG);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.finalG = s.add.graphics(); world.push(this.finalG);           // the falling curtain over everything (his death)
    this.popT = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '10px', color: '#ffd040', stroke: '#2a0a10', strokeThickness: 4 }).setOrigin(0.5).setVisible(false); world.push(this.popT);
    this.bubG = s.add.graphics(); world.push(this.bubG);
    this.bubT = s.add.text(0, 0, '', { fontFamily: FONT, fontSize: '9px', color: '#2a0a10', align: 'center', wordWrap: { width: 170 } }).setOrigin(0.5).setVisible(false); world.push(this.bubT);
    this.cycle.makeBanner(s);
    this.paintSky();
  }
  /** The back wall: deep red velvet drapery in the dark - or, once the roof's gone, a storm sky. */
  paintSky() {
    const g = this.skyG; g.clear();
    if (this.storm) { g.fillGradientStyle(0x0a0e1a, 0x0a0e1a, 0x2a3040, 0x2a3040, 1); g.fillRect(-400, -400, 1440, 1200); for (let i = 0; i < 12; i++) { g.fillStyle(0x3a4050, 0.5); g.fillEllipse(hash(i, 1) * 900 - 100, 40 + hash(i, 2) * 140, 200 + hash(i, 3) * 200, 50 + hash(i, 4) * 40); } return; }
    g.fillGradientStyle(0x1a0408, 0x1a0408, 0x3a0a14, 0x3a0a14, 1); g.fillRect(-400, -400, 1440, 1200);
    for (let i = 0; i < 40; i++) { const x = -100 + i * 22; g.fillStyle(i % 2 ? 0x4a0c18 : 0x2a060c, 0.6); g.fillRect(x, -100, 12, 700); }
  }
  /**
   * The stage: polished boards, a row of footlights along the front (they pulse on the beat), gilded trim; the two
   * opera boxes floating as ledges; the floor marks of coming notes are drawn with the effects.
   */
  drawArena(g) {
    const t = this.t, pulse = 1 - (t % BEAT) / BEAT;
    g.clear();
    g.fillStyle(0x1a0a06, 1); g.fillRect(-256, -2, 512, 46);
    g.fillStyle(0x6a3a1a, 1); g.fillRect(-250, 0, 500, 30);
    for (let i = 0; i < 25; i++) { g.fillStyle(i % 2 ? 0x7a4420 : 0x5e3218, 1); g.fillRect(-250 + i * 20, 0, 20, 30); g.fillStyle(0x000000, 0.25); g.fillRect(-250 + i * 20, 0, 1, 30); }
    g.fillStyle(0xffffff, 0.12); g.fillRect(-250, 0, 500, 3);
    g.fillStyle(LOOK.gold, 1); g.fillRect(-256, 30, 512, 4); g.fillStyle(0x2a0a10, 1); g.fillRect(-256, 34, 512, 10);
    for (let i = 0; i < 16; i++) { const x = -234 + i * 31.2; g.fillStyle(0x1a1a1a, 1); g.fillRect(x - 7, 34, 14, 6); g.fillStyle(0xfff0c0, 0.5 + 0.5 * pulse); g.fillEllipse(x, 34, 10, 4); g.fillStyle(0xfff0c0, 0.08 + 0.1 * pulse); g.fillTriangle(x - 5, 34, x + 5, 34, x, -20); }
    // the opera boxes: a velvet front with a gold rail and swagged drapes
    for (const L of this.platforms.slice(1)) {
      const w = L.x2 - L.x1, cx = (L.x1 + L.x2) / 2;
      g.fillStyle(LOOK.ink, 1); g.fillRoundedRect(L.x1 - 4, L.y - 4, w + 8, 34, 6);
      g.fillStyle(0x8a1428, 1); g.fillRoundedRect(L.x1, L.y, w, 28, 4); g.fillStyle(0xb02038, 1); g.fillRect(L.x1 + 4, L.y + 8, w - 8, 3);
      g.fillStyle(LOOK.gold, 1); g.fillRect(L.x1 - 2, L.y - 2, w + 4, 5); for (let x = L.x1 + 8; x < L.x2; x += 14) { g.fillStyle(LOOK.gold, 1); g.fillCircle(x, L.y + 18, 2.4); }
      g.fillStyle(0xd8b050, 1); g.fillTriangle(cx - 10, L.y + 28, cx + 10, L.y + 28, cx, L.y + 40);
    }
  }
  /** The great red curtains drawn back at either side of the stage, with gold tie-backs and tassels. */
  drawCurtains(g) {
    g.clear();
    for (const s of [-1, 1]) {
      const x0 = s * 330, sway = Math.sin(this.t * 0.02 + s) * 4;
      for (let i = 0; i < 6; i++) { const x = x0 - s * i * 14; g.fillStyle(i % 2 ? 0x8a1428 : 0x6a0c1e, 1); g.fillPoints([{ x: x, y: -560 }, { x: x - s * 16, y: -560 }, { x: x - s * 30 + sway, y: -140 }, { x: x - s * 10 + sway, y: 60 }, { x: x + s * 6, y: 60 }, { x: x - s * 8 + sway, y: -140 }], true); }
      g.fillStyle(LOOK.gold, 1); g.fillEllipse(s * 290 + sway, -150, 26, 10); g.fillTriangle(s * 290 + sway - 5, -146, s * 290 + sway + 5, -146, s * 290 + sway, -110);
    }
    g.fillStyle(0x6a0c1e, 1); for (let i = 0; i < 16; i++) g.fillEllipse(-360 + i * 48, -470, 60, 50);
    g.fillStyle(LOOK.gold, 1); g.fillRect(-380, -500, 760, 6);
  }

  // ------------------------------------------------------------------ MAESTRO FORTISSIMO
  /** His hits (BossArena.bhit), all launching a bit harder than the numbers in the tables (`HIT`). */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more) { return super.bhit(id, x1, y1, x2, y2, dmg * HIT.dmg, [angle, base * HIT.base, growth * HIT.growth], more); }
  /** The boss's own state when the fight starts: the hazards slower; THE SCORE under his health bar. */
  makeBoss(match) {
    this.cycle.gap = 1400; this.cycle.next = 1500;
    this.scoreG = match.add.graphics().setDepth(30); match.addUI(this.scoreG);
  }
  /** The intro (and the UI layer the FORTISSIMO cutscene flashes on). */
  startIntro(match) {
    super.startIntro(match);
    this.uiG = match.add.graphics().setDepth(39).setVisible(false); match.addUI(this.uiG);
  }
  /** The intro hides the score; it fades in with the health bar. */
  endIntro() { super.endIntro(); this.e.y = 0; this.e.alpha = 1; this.e.bow = 0; this.lightsK = 1; this.curtainK = 0; }
  /**
   * His body's points this frame: feet (on his rostrum), hips, shoulders, head, the baton hand and the baton's tip
   * (following the 4/4 conducting pattern, or an attack's pose), the free hand.
   */
  body() {
    const E = this.e, d = E.dir;
    const ft = { x: E.x, y: E.y - COND.podium - E.hop };
    const hip = { x: ft.x, y: ft.y - COND.leg };
    const sh = { x: hip.x + d * (2 + E.bow * 30), y: hip.y - COND.torso * (1 - E.bow * 0.35) };
    const head = { x: sh.x + d * (4 + E.bow * 22), y: sh.y - COND.head * 0.5 - 8 + E.bow * 26 };
    const h = this.handPose(), hand = { x: sh.x + d * h.x, y: sh.y + h.y };
    const tip = { x: hand.x + Math.cos(h.a) * d * 46, y: hand.y + Math.sin(h.a) * 46 };
    const hand2 = { x: sh.x - d * 8 + d * h.x2, y: sh.y + h.y2 };
    return { ft, hip, sh, head, hand, tip, hand2 };
  }
  /**
   * Where his hands are (relative to the shoulder; x toward the way he faces): the 4/4 beat pattern - down on 1, in on
   * 2, out on 3, up on 4 - with the baton angle; or a pose ('up' both arms raised, 'thrust', 'bow', 'snap').
   */
  handPose() {
    const E = this.e, t = this.t;
    if (E.arms === 'up') return { x: 18, y: -62, a: -1.4, x2: -24, y2: -60 };
    if (E.arms === 'thrust') return { x: 50, y: -10, a: -0.1, x2: -30, y2: -30 };
    if (E.arms === 'bow') return { x: 30, y: 30, a: 1.3, x2: -34, y2: 10 };
    const P = [[14, 46], [-8, 16], [40, 14], [18, -44]], beat = (t % (BEAT * 4)) / BEAT, i = Math.floor(beat), k = beat - i;
    const a = P[i], b = P[(i + 1) % 4], q = easeOut(Math.min(1, k * 1.6)), big = 1 + E.wild * 0.4;
    const x = lerp(a[0], b[0], q) * big + 6, y = lerp(a[1], b[1], q) * big - 4;
    return { x, y, a: -0.9 + (y / 60) * 0.6, x2: -20 + Math.sin(t * 0.07) * 8, y2: -10 + Math.sin(t * 0.05) * 14 - E.wild * 20 };
  }
  /** What the camera and the CPU aim at: his head. */
  core() { const b = this.body(); return { x: b.head.x, y: b.head.y }; }
  /** Is this frame on the beat (close enough for the ON THE BEAT bonus)? */
  onBeat() { const k = this.t % BEAT; return Math.min(k, BEAT - k) <= ONBEAT.near; }
  /** Where he can be hit: his head (x1.2), his body (x0.9) - x1.5 ON THE BEAT. Nothing while he takes his bow. */
  hurt() {
    const E = this.e; if (E.alpha < 0.5) return [];
    const b = this.body(), on = this.onBeat() ? ONBEAT.mult : 1;
    return [{ x1: b.head.x - 24, y1: b.head.y - 30, x2: b.head.x + 24, y2: b.head.y + 22, mult: 1.2 * on },
      { x1: b.hip.x - 26, y1: b.sh.y, x2: b.hip.x + 26, y2: b.ft.y + COND.podium, mult: 0.9 * on }];
  }
  /** His pieces: the whole repertoire; enraged, LIGHTNING too. */
  pattern(phase) { const P = ['staccato', 'crescendo', 'timpani', 'violins', 'aria', 'chandelier', 'baton']; return phase === 2 ? [...P, 'lightning', 'lightning'] : P; }
  rageLine() { return 'FORTISSIMO!'; }
  /** How many notes a piece plays now (calm / enraged). */
  many(pair) { return pair[this.boss && this.boss.phase === 2 ? 1 : 0]; }
  /** The step between notes now: a beat - or half a beat (8ths) once he's enraged. */
  step8() { return this.boss && this.boss.phase === 2 ? BEAT / 2 : BEAT; }
  /** The frame of the next beat at least `after` frames from now (where a new piece's first note goes). */
  nextBeat(after = LEAD) { return Math.ceil((this.t + after) / BEAT) * BEAT; }
  /** Writes a note into the score: it hits at frame `at` (kind = which piece, more = where / what). Returns it. */
  note(at, kind, more = {}) { const N = { at, kind, id: this.sid(kind), ...more }; this.notes.push(N); return N; }
  /** Says something (a speech bubble) for `life` frames. */
  talk(text, life = 100) { this.say = { text, t: 0, life }; this.sayCD = 260 + Math.random() * 200; }
  /** A hit lands on him: ON THE BEAT he's grudgingly impressed (a gold BRAVO!); otherwise he complains now and then. */
  onHurt(match) {
    const b = this.body();
    if (this.onBeat()) { this.pop = { text: 'ON THE BEAT!', x: b.head.x, y: b.head.y - 60, t: 0 }; sfx('ding', 0.6, 1.5); if (Math.random() < 0.4) this.talk(SAY.onbeat[Math.floor(Math.random() * SAY.onbeat.length)], 60); return; }
    if (this.sayCD <= 0 || (this.say && this.say.t > 40)) { if (Math.random() < 0.3) this.talk(SAY.hurt[Math.floor(Math.random() * SAY.hurt.length)], 70); }
  }
  /** His glide speed. */
  speed() { return this.boss && this.boss.phase === 2 ? COND.fast : COND.walk; }
  /** He glides on his rostrum toward x. Returns true once there. */
  walkTo(x, sp) { const E = this.e, dx = Phaser.Math.Clamp(x, -COND.range, COND.range) - E.x; if (Math.abs(dx) < 6) return true; E.dir = Math.sign(dx); E.x += Math.sign(dx) * Math.min(Math.abs(dx), sp); return false; }
  /** At rest: he conducts (the beat pattern), drifts after you on his rostrum and lectures you. */
  idle(match) {
    const E = this.e, tg = this.nearest(match, E.x);
    E.arms = 'conduct'; E.hop = Math.sin(this.t * 0.05) * 3 + 3;
    if (tg && Math.abs(tg.x - E.x) > 150) this.walkTo(tg.x - Math.sign(tg.x - E.x) * 120, this.speed() * 0.7);
    else if (tg) E.dir = Math.sign(tg.x - E.x) || E.dir;
    if (this.sayCD <= 0 && !this.say) this.talk(SAY.idle[Math.floor(Math.random() * SAY.idle.length)]);
  }
  /** Starts a piece: announces it and turns to you. */
  begin(match, a, name) { const tg = this.nearest(match, this.e.x); if (tg) this.e.dir = Math.sign(tg.x - this.e.x) || this.e.dir; this.talk(SAY.pieces[name], 70); a.end = 0; return tg; }
  /** A piece has played out once its last note is `tail` frames gone. */
  done(a, tail = 30) { return this.t > a.end + tail; }

  // ------------------------------------------------------------------ the pieces (each writes its notes into the score)
  /** STACCATO: a run of notes, each slamming a giant note-head down on a marked spot by you (the mark follows you until a beat before). */
  atk_staccato(match, a) {
    if (a.t === 1) { this.begin(match, a, 'staccato'); const n = this.many(STAC.n), at = this.nextBeat(), st = this.step8(); for (let i = 0; i < n; i++) { const tg = this.nearest(match, 0); a.end = this.note(at + i * st, 'staccato', { x: tg ? tg.x : 0, track: true, line: 2 + (i % 3) }).at; } }
    return this.done(a);
  }
  /** CRESCENDO: rings of sound pulse out of him on each beat, louder and faster each time - the last one is the loud one. */
  atk_crescendo(match, a) {
    if (a.t === 1) { this.begin(match, a, 'crescendo'); const at = this.nextBeat(); for (let i = 0; i < CRESC.n; i++) a.end = this.note(at + i * BEAT, 'crescendo', { big: i === CRESC.n - 1, line: i }).at; }
    this.e.arms = this.t > a.end - BEAT ? 'up' : 'conduct';
    return this.done(a, 50);
  }
  /** TIMPANI: phantom kettle drums in the pit; the whole floor shakes on every beat - be off the ground on the beat. */
  atk_timpani(match, a) {
    if (a.t === 1) { this.begin(match, a, 'timpani'); this.pit = { kind: 'timpani', k: 0 }; const n = this.many(TIMP.n), at = this.nextBeat(); for (let i = 0; i < n; i++) a.end = this.note(at + i * BEAT, 'timpani', { line: 0 }).at; }
    if (this.pit) this.pit.k = Math.min(1, this.pit.k + 0.05);
    if (this.done(a)) { this.pit = null; return true; }
    return false;
  }
  /** VIOLINS: phantom bows sweep the stage on the beat, high or low (the note's height on the staff says which) - duck under or jump over. */
  atk_violins(match, a) {
    if (a.t === 1) { this.begin(match, a, 'violins'); this.pit = { kind: 'violins', k: 0 }; const n = this.many(VIOL.n), at = this.nextBeat(); let hi = Math.random() < 0.5; for (let i = 0; i < n; i++) { if (Math.random() < 0.6) hi = !hi; a.end = this.note(at + i * BEAT, 'violins', { hi, line: hi ? 4 : 0 }).at; } }
    if (this.pit) this.pit.k = Math.min(1, this.pit.k + 0.05);
    if (this.done(a)) { this.pit = null; return true; }
    return false;
  }
  /** ARIA: a phantom soprano rises behind the stage; on each beat she sings a note that flies at you, homing in. */
  atk_aria(match, a) {
    if (a.t === 1) { this.begin(match, a, 'aria'); this.diva = { k: 0, x: -this.e.dir * 120 }; const n = this.many(ARIA.n), at = this.nextBeat(); for (let i = 0; i < n; i++) a.end = this.note(at + i * BEAT, 'aria', { line: 1 + (i * 2) % 5 }).at; }
    const D = this.diva; if (D) D.k = this.t < a.end + 20 ? Math.min(1, D.k + 0.03) : D.k - 0.04;
    this.e.arms = 'up';
    if (this.done(a, 60)) { this.diva = null; return true; }
    return false;
  }
  /** CHANDELIER: the great chandelier swings out over you for three beats, then drops on the fourth and shatters into shards. */
  atk_chandelier(match, a) {
    if (a.t === 1) { this.begin(match, a, 'chandelier'); const at = this.nextBeat(); this.chand = { x: 0, y: -330, sw: 0, fall: false, at: at + CHAND.beats * BEAT, id: this.sid('chand') }; for (let i = 0; i < CHAND.beats; i++) this.note(at + i * BEAT, 'tick', { line: 4 }); a.end = this.note(this.chand.at, 'chandelier', { line: 0 }).at; }
    const C = this.chand;
    if (C && !C.fall) { const tg = this.nearest(match, C.x); if (tg && this.t < C.at - 12) C.x += Phaser.Math.Clamp(tg.x - C.x, -3, 3); C.sw = Math.sin(this.t * 0.2) * (this.t < C.at - 12 ? 6 : 1); }
    this.e.arms = 'thrust';
    return this.done(a, 70) && !this.chand;
  }
  /** BATON: he lunges and slashes the baton on the beat, flinging a fan of blade-sharp eighth notes. */
  atk_baton(match, a) {
    if (a.t === 1) { this.begin(match, a, 'baton'); const n = this.many(BATON.n), at = this.nextBeat(); for (let i = 0; i < n; i++) a.end = this.note(at + i * BEAT * 2, 'baton', { line: 3 }).at; }
    const k = (this.nextBeat(0) - this.t) / BEAT; this.e.arms = k < 0.3 ? 'thrust' : 'up';
    return this.done(a);
  }
  /** LIGHTNING (enraged): he points the baton at the sky - bolts strike marked spots on the beat, two at a time. */
  atk_lightning(match, a) {
    if (a.t === 1) {
      this.begin(match, a, 'lightning'); const at = this.nextBeat();
      for (let i = 0; i < BOLT.n; i++) for (let j = 0; j < BOLT.per; j++) { const tg = this.nearest(match, 0), x = j === 0 && tg ? tg.x : Phaser.Math.Clamp((Math.random() - 0.5) * 460, -230, 230); a.end = this.note(at + i * BEAT, 'bolt', { x, track: j === 0, line: 4 - j * 2 }).at; }
    }
    this.e.arms = 'up';
    return this.done(a);
  }

  /** Plays the notes that reach the playhead this frame, each as its piece's strike (pushed into `fx`). */
  playNotes(match) {
    const t = this.t, b = this.body();
    for (const N of this.notes) {
      if (N.track && t < N.at - BEAT) { const tg = this.nearest(match, N.x); if (tg) N.x += Phaser.Math.Clamp(tg.x - N.x, -4, 4); N.x = Phaser.Math.Clamp(N.x, -235, 235); }
      if (N.at !== t) continue;
      N.done = true;
      if (N.kind === 'staccato') { this.fx.push({ k: 'slam', x: N.x, life: 12, id: N.id }); sfx('bighit', 0.6, 1.3); sfx('taiko', 0.5, 1.4); match.shake(4, 5); }
      else if (N.kind === 'crescendo') { this.fx.push({ k: 'ring', x: b.head.x, y: b.head.y + 30, r: 20, v: CRESC.speed[N.big ? 1 : 0], life: CRESC.life, big: N.big, id: N.id }); sfx(N.big ? 'roar' : 'whoosh', N.big ? 0.7 : 0.5, N.big ? 1.3 : 1.1); if (N.big) match.shake(8, 14); }
      else if (N.kind === 'timpani') { this.fx.push({ k: 'floor', life: 8, id: N.id }); sfx('taiko', 1, 0.6); sfx('bighit', 0.5, 0.6); match.shake(6, 6); if (this.pit) this.pit.hit = 10; }
      else if (N.kind === 'violins') { this.fx.push({ k: 'bow', hi: N.hi, life: 12, id: N.id }); sfx('slash', 0.7, N.hi ? 1.6 : 1.1); sfx('swing', 0.5, N.hi ? 1.8 : 1.2); }
      else if (N.kind === 'aria') { const D = this.diva, x = D ? D.x : 0, y = -230, tg = this.nearest(match, x), ang = tg ? Math.atan2(tg.y - 24 - y, tg.x - x) : Math.PI / 2; this.fx.push({ k: 'proj', x, y, vx: Math.cos(ang) * ARIA.speed, vy: Math.sin(ang) * ARIA.speed, home: true, life: ARIA.life, id: N.id, hit: ARIA.hit, c: 0xd0a0ff }); sfx('ding', 0.6, 2 + N.line * 0.1); }
      else if (N.kind === 'chandelier') { if (this.chand) { this.chand.fall = true; sfx('glass', 0.7, 0.6); } }
      else if (N.kind === 'tick') sfx('clocktick', 0.6, 1.2);
      else if (N.kind === 'baton') { const d = this.e.dir; for (let i = 0; i < BATON.fan; i++) { const ang = (d > 0 ? 0 : Math.PI) + d * (-0.35 + i * 0.35); this.fx.push({ k: 'proj', x: b.tip.x, y: b.tip.y, vx: Math.cos(ang) * BATON.speed, vy: Math.sin(ang) * BATON.speed, life: 90, id: this.sid('blade'), hit: BATON.hit, c: 0xffffff, blade: true }); } sfx('slash', 0.9, 1.4); }
      else if (N.kind === 'bolt') { this.fx.push({ k: 'bolt', x: N.x, life: 10, id: N.id }); sfx('thunder', 0.7, 1 + Math.random() * 0.3); this.flash = 6; match.shake(5, 6); }
    }
    this.notes = this.notes.filter((N) => !N.done);
  }
  /** Moves every strike on the stage one frame and pushes its hitboxes. */
  stepFx(match, out) {
    for (const F of this.fx) {
      F.life--;
      if (F.k === 'slam') { if (F.life > 6) out.push(this.bhit(F.id, F.x - STAC.w, -90, F.x + STAC.w, 0, ...STAC.hit)); }
      else if (F.k === 'ring') { F.r += F.v; const n = 20, th = F.big ? 16 : 11; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = F.x + Math.cos(a) * F.r, y = F.y + Math.sin(a) * F.r * 0.85; if (y < 4) out.push(this.bhit(F.id, x - th, y - th, x + th, y + th, ...(F.big ? CRESC.big : CRESC.hit), { dirX: Math.sign(Math.cos(a)) || 1 })); } }
      else if (F.k === 'floor') { if (F.life > 3) out.push(this.bhit(F.id, -252, -TIMP.h, 252, 2, ...TIMP.hit)); }
      else if (F.k === 'bow') { const [y1, y2] = F.hi ? VIOL.high : VIOL.low; if (F.life > 4) out.push(this.bhit(F.id, -260, y1, 260, y2, ...VIOL.hit, { dirX: this.e.dir })); }
      else if (F.k === 'proj') {
        if (F.home) { const tg = this.nearest(match, F.x); if (tg) { const want = Math.atan2(tg.y - 24 - F.y, tg.x - F.x), cur = Math.atan2(F.vy, F.vx); let dA = want - cur; while (dA > Math.PI) dA -= Math.PI * 2; while (dA < -Math.PI) dA += Math.PI * 2; const na = cur + Phaser.Math.Clamp(dA, -ARIA.turn, ARIA.turn); F.vx = Math.cos(na) * ARIA.speed; F.vy = Math.sin(na) * ARIA.speed; } }
        F.x += F.vx; F.y += F.vy;
        out.push(this.bhit(F.id, F.x - 11, F.y - 11, F.x + 11, F.y + 11, ...F.hit, { dirX: Math.sign(F.vx) || 1 }));
        if (F.y > 6 || Math.abs(F.x) > 330) F.life = 0;
      } else if (F.k === 'bolt') { if (F.life > 3) out.push(this.bhit(F.id, F.x - 20, -420, F.x + 20, 0, ...BOLT.hit)); }
      else if (F.k === 'rose') { F.x += F.vx; F.y = Math.min(-4, F.y + F.vy); }
      else if (F.k === 'shard') { F.vy += 0.4; F.x += F.vx; F.y = Math.min(-6, F.y + F.vy); if (F.y >= -6) F.vy = -Math.abs(F.vy) * 0.5; out.push(this.bhit(F.id, F.x - 8, F.y - 8, F.x + 8, F.y + 8, ...CHAND.shard, { dirX: Math.sign(F.vx) || 1 })); if (Math.abs(F.x) > 300) F.life = 0; }
    }
    this.fx = this.fx.filter((F) => F.life > 0);
    const C = this.chand;
    if (C && C.fall) {
      C.y += CHAND.fall;
      out.push(this.bhit(C.id, C.x - CHAND.w / 2, C.y - 40, C.x + CHAND.w / 2, C.y + 20, ...CHAND.hit));
      if (C.y >= -20) { this.chand = null; sfx('glass', 1, 0.8); sfx('bighit', 0.8, 0.8); match.shake(10, 14); for (let i = 0; i < CHAND.shards; i++) this.fx.push({ k: 'shard', x: C.x, y: -20, vx: (i % 2 ? 1 : -1) * (2 + i * 0.6), vy: -4 - Math.random() * 3, life: 120, id: this.sid('shard') }); for (let i = 0; i < 20; i++) match.particles.push({ x: C.x, y: -10, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, life: 30, color: i % 2 ? 0xfff0c0 : 0xd0f0ff, size: 2, grav: 0.25 }); }
    }
  }

  /**
   * Half health. With a player watching: the FORTISSIMO cutscene (cutStep). Without (the sim): straight into the storm -
   * the roof gone, rain, 8th notes.
   */
  onRage(match) {
    this.notes = []; this.fx = []; this.chand = null; this.diva = null; this.pit = null;
    if (this.uiG) { const cam = match.worldCam || match.cameras.main; this.cut = { t: 0, n: STORM.n, once: new Set() }; this.ccam = { x: cam.midPoint.x, y: cam.midPoint.y, zoom: cam.zoom }; this.rageText.setVisible(false); this.boss.rage = 0; return; }
    this.tearRoof(match);
  }
  /** The storm: the dome rips away into the sky, rain starts, his hair goes wild. */
  tearRoof(match) {
    this.storm = 1; this.e.wild = 1; this.R.faces = this.R.faces.filter((f) => f.k !== 'roof'); this.R.fog = 0x10141e; this.paintSky();
    sfx('thunder', 1, 0.8); sfx('roar', 0.6, 0.9); this.flash = 14; match.shake(14, 30);
    for (let i = 0; i < 80; i++) this.rain.push({ x: (Math.random() - 0.5) * 900, y: -600 + Math.random() * 700, v: 9 + Math.random() * 5 });
  }
  /** The cutscene camera (MatchScene asks introCam): eased toward `cut.shot`. */
  introCam() {
    if (!this.cut) return super.introCam();
    const w = this.cut.shot || { x: 0, y: -120, zoom: 1 }; this.ccam = { x: lerp(this.ccam.x, w.x, 0.08), y: lerp(this.ccam.y, w.y, 0.08), zoom: lerp(this.ccam.zoom, w.zoom, 0.08) };
    return { ...this.ccam, exact: true };
  }
  /** A fresh press skips to the storm. */
  skipCut(match) { if (!this.storm) this.tearRoof(match); this.endStorm(); }
  /**
   * FORTISSIMO (half health): he slams the score shut - ENOUGH ADAGIO! - and raises both arms; thunder rolls, the
   * chandeliers shake, lightning flashes through the dome and it tears away into a storm sky; rain pours onto the
   * stage, his hair whips wild: FORTISSIMO!!
   */
  cutStep(match) {
    const C = this.cut, t = ++C.t, E = this.e, b = this.body(); this.t++;
    const once = (k, at) => t >= at && !C.once.has(k) && !!C.once.add(k);
    if (once('line', 1)) { this.talk(SAY.rage, 100); sfx('clang', 0.8, 0.7); }
    if (this.say) this.say.t++;
    E.arms = t < 60 ? 'thrust' : 'up'; E.hop = t > 60 ? Math.min(20, (t - 60) * 0.3) : 0; E.wild = Math.min(1, Math.max(0, (t - 60) / 60));
    C.shot = t < STORM.tear - 20 ? { x: b.head.x, y: b.head.y - 30, zoom: 1.45 } : { x: 0, y: -200, zoom: 0.85 };
    if (t > 60 && t < STORM.tear && t % 20 === 0) { sfx('thunder', 0.5, 1.4); this.flash = 4; match.shake(4, 8); }
    if (once('tear', STORM.tear)) this.tearRoof(match);
    if (once('shout', STORM.tear + 30)) this.talk(SAY.storm, 90);
    this.stepRain();
    if (this.uiG) { const g = this.uiG; g.clear(); g.setVisible(this.flash > 0); if (this.flash > 0) { g.fillStyle(0xffffff, this.flash / 14); g.fillRect(0, 0, VIEW_W, 360); } if (this.flash > 0) this.flash--; }
    if (t >= C.n) this.endStorm();
  }
  /** The FORTISSIMO cutscene is over: back to the fight in the storm. */
  endStorm() { this.cut = null; if (this.uiG) this.uiG.setVisible(false); this.rageText.setText('FORTISSIMO!').setVisible(true); this.boss.rage = 90; this.boss.wait = 30; this.e.hop = 0; }
  /** THE FINALE (low health): the storm strikes on every bar. */
  startLow(match) { this.low = true; this.talk(SAY.low, 110); this.rageText.setText('THE FINALE!'); this.boss.rage = 100; sfx('thunder', 1, 0.7); match.shake(10, 20); }
  /** The rain: streaks falling, wrapping round. */
  stepRain() { for (const r of this.rain) { r.y += r.v; r.x -= 1.5; if (r.y > 60) { r.y = -600; r.x = (Math.random() - 0.5) * 900; } } }

  /** You lost: he bows low to the ghostly audience, arms wide, roses flying (BossArena.bossTaunt). */
  onGloat(match, t) { const E = this.e; E.arms = t % 160 < 80 ? 'bow' : 'up'; E.bow = E.arms === 'bow' ? Math.min(1, E.bow + 0.05) : Math.max(0, E.bow - 0.05); if (t === 1) this.talk(SAY.gloat, 400); if (t % 12 === 0) this.fx.push({ k: 'rose', x: (Math.random() - 0.5) * 400, y: -400, vx: (Math.random() - 0.5), vy: 2, life: 200, id: 'rose' }); }

  // ------------------------------------------------------------------ the death: THE FINAL BOW
  /** Health gone: the score's cleared; he starts his final bow. */
  onDeath() { this.notes = []; this.fx = []; this.chand = null; this.diva = null; this.pit = null; this.talk('...BRAVO.  BRAVISSIMO.', 150); }
  /**
   * THE FINAL BOW: arms flung up for the last chord (thunder), the baton SNAPS in his hand, he bows low - roses rain
   * down from the boxes - and the great red curtain falls over him.
   */
  stepDeath(match) {
    const B = this.boss, E = this.e, f = B.dying;
    if (f < 40) { E.arms = 'up'; E.hop = Math.sin(f * 0.8) * 2 + 6; if (f === 2) { sfx('thunder', 0.9, 0.7); this.flash = 10; } }
    else if (f === 40) { E.snap = true; sfx('clang', 1, 1.8); sfx('slash', 0.8, 2); match.puff(this.body().hand.x, this.body().hand.y, 0xffffff, 8); }
    else { E.arms = 'bow'; E.bow = Math.min(1, E.bow + 0.06); E.hop = 0; if (f % 4 === 0) this.fx.push({ k: 'rose', x: E.x + (Math.random() - 0.5) * 300, y: -400, vx: (Math.random() - 0.5), vy: 2.5 + Math.random(), life: 200, id: 'rose' }); }
    if (f === 60) sfx('laugh', 0.4, 0.6);
    E.curtain = Math.max(0, (f - 80) / 60);
    for (const F of this.fx) if (F.k === 'rose') { F.x += F.vx; F.y = Math.min(-4, F.y + F.vy); F.life--; }
  }

  // ------------------------------------------------------------------ the entrance
  /**
   * THE ENTRANCE (k = 0..1): the dark house; the ghostly audience murmurs; the footlights come up one by one; a single
   * spotlight finds him from behind - his back to us on the rostrum. He taps the stand three times (tak, tak, tak),
   * flings his arms up - lightning flashes through the dome - and he turns: SILENCE! ...THE PERFORMANCE BEGINS.
   */
  introPose(match, k, t, n) {
    this.t++;
    const E = this.e, e = (a, b) => Phaser.Math.Clamp((k - a) / (b - a), 0, 1);
    this.lightsK = e(0.05, 0.35); this.spotK = e(0.35, 0.45);
    E.x = 60; E.y = 0; E.alpha = 1; E.dir = k < 0.78 ? 1 : -1; E.bow = 0;
    E.arms = k < 0.5 ? 'conduct' : k < 0.66 ? 'thrust' : k < 0.78 ? 'up' : 'conduct'; E.wild = k > 0.7 && k < 0.85 ? 1 : 0;
    for (const at of [0.5, 0.55, 0.6]) if (t === Math.round(at * n)) sfx('clocktick', 1, 0.8);
    if (t === Math.round(0.7 * n)) { sfx('thunder', 1, 0.8); this.flash = 12; match.shake(8, 12); }
    if (t === Math.round(0.82 * n)) this.talk(SAY.intro, 140);
    if (t === Math.round(0.36 * n)) sfx('clang', 0.4, 0.6);
    if (this.say) this.say.t++;
    if (this.flash > 0) this.flash--;
  }
  /** The entrance's camera: wide on the dark house, onto him as the spotlight finds him, close as he turns. */
  introShot(k) { const c = this.core(); return k < 0.35 ? { x: 0, y: -170, zoom: 0.85 } : k < 0.66 ? { x: c.x, y: c.y + 60, zoom: 1.2 } : k < 0.78 ? { x: 0, y: -160, zoom: 0.95 } : { x: c.x - 20, y: c.y + 40, zoom: 1.35 }; }
  /** The freeze frame: him, baton raised. */
  introAt() { const c = this.core(); return { x: c.x - 40, y: c.y + 50, zoom: 1.2 }; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_sandbag(match, h) { h.title = 'SANDBAG!'; const tg = this.nearest(match); h.x = Phaser.Math.Clamp(tg ? tg.x : 0, -235, 235); }
  /** SANDBAG: a counterweight sandbag swings loose up in the fly tower over a mark, then drops. */
  step_sandbag(match, h, out) {
    if (h.t < SAND.warn) { this.sand = { x: h.x, k: h.t / SAND.warn }; return false; }
    const y = -440 + (h.t - SAND.warn) * 15; this.sand = { x: h.x, y };
    out.push(this.bhit('sand' + h.id, h.x - 16, y - 20, h.x + 16, y + 12, ...SAND.hit));
    if (y >= -10) { this.sand = null; sfx('bighit', 0.6, 0.8); match.shake(4, 6); for (let i = 0; i < 10; i++) match.particles.push({ x: h.x, y: -4, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 2, life: 30, color: 0xc8b080, size: 2, grav: 0.1 }); return true; }
    return false;
  }
  start_smoke(match, h) { h.title = 'TRAPDOOR SMOKE!'; h.x = [-160, -40, 80, 180][Math.floor(Math.random() * 4)]; }
  /** TRAPDOOR SMOKE: a trap in the stage floor rattles, then blasts a column of stage smoke that pushes you up. */
  step_smoke(match, h, out) {
    this.smoke = { x: h.x, k: Math.min(1, h.t / SMOKE.warn), on: h.t >= SMOKE.warn };
    if (h.t >= SMOKE.warn) { out.push(this.bhit('smoke' + h.id, h.x - 26, -200, h.x + 26, 0, ...SMOKE.hit)); if (h.t === SMOKE.warn) sfx('geyser', 0.7, 0.8); if (h.t % 2 === 0) match.particles.push({ x: h.x + (Math.random() - 0.5) * 30, y: -4, vx: (Math.random() - 0.5), vy: -3 - Math.random() * 3, life: 50, color: 0xd8d0e0, size: 7, grav: -0.02, drag: 0.96 }); }
    if (h.t >= SMOKE.warn + SMOKE.dur) { this.smoke = null; return true; }
    return false;
  }

  // ------------------------------------------------------------------ the frame
  /** Moves the opera and MAESTRO one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    if (this.hazardsOn) this.cycle.run(match, out);
    if (this.storm) this.stepRain();
    if (this.flash > 0) this.flash--;
    if (this.boss) {
      const B = this.boss;
      if (!B.dying) { this.watchHits(match); this.playNotes(match); }
      this.bossStep(match, out);
      if (!this.low && !B.dying && !this.cut && B.phase === 2 && B.hp <= B.max * LOW.at) this.startLow(match);
      if (this.low && !B.dying && !match.over && this.t % (BEAT * 4) === 0) { const tg = this.nearest(match, 0); this.note(this.nextBeat(), 'bolt', { x: tg ? tg.x : 0, track: true, line: 4 }); }
      if (!B.dying) this.stepFx(match, out);
      if (this.sayCD > 0) this.sayCD--;
      if (this.say && ++this.say.t > this.say.life) this.say = null;
      if (this.pop && ++this.pop.t > 40) this.pop = null;
    }
    return out;
  }
  /** When one of his strikes lands on a player, he's delighted (now and then). */
  watchHits(match) {
    if (match.over) return;
    for (const f of match.fighters) { const p = this.prev.get(f) ?? f.percent; if (f.percent > p + 6 && Math.random() < 0.25 && (!this.say || this.say.t > 40)) this.talk(SAY.hit[Math.floor(Math.random() * SAY.hit.length)], 60); this.prev.set(f, f.percent); }
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the house, the stage, the orchestra and soprano, the conductor, the strikes, the score, the bar. */
  render() {
    const B = this.boss, lit = this.lightsK ?? 1;
    this.R.fog = this.storm ? 0x10141e : mix(0x020102, 0x1a0610, lit);
    this.R.render([]); this.drawCurtains(this.curtainG); this.drawArena(this.arenaG);
    this.arenaG.setAlpha(0.25 + 0.75 * lit); this.curtainG.setAlpha(0.3 + 0.7 * lit);
    this.pitG.clear(); this.backG.clear(); this.condG.clear(); this.fxG.clear(); this.finalG.clear(); this.bubG.clear(); this.bubT.setVisible(false); this.popT.setVisible(false);
    if (lit < 1) { this.pitG.fillStyle(0x000000, 0.75 * (1 - lit)); this.pitG.fillRect(-900, -900, 1800, 1300); }
    this.drawPit(this.pitG);
    if (B) this.drawConductor(this.condG, this.backG);
    this.drawFx(this.fxG);
    if (this.e.curtain > 0) this.drawFinalCurtain(this.finalG, this.e.curtain);
    if (this.say && B) this.drawBubble();
    if (this.pop) this.popT.setText(this.pop.text).setPosition(this.pop.x, this.pop.y - this.pop.t * 0.6).setAlpha(1 - this.pop.t / 40).setScale(1 + Math.max(0, 0.4 - this.pop.t * 0.04)).setVisible(true);
    if (B) { this.drawBar(); this.drawScore(); }
  }
  /** His health bar: a row of tiny gold notes along it. */
  barStyle(g, x, y, w, h, k) { for (let i = 6; i < w * k; i += 14) { g.fillStyle(0xffe8a0, 0.7); g.fillCircle(x + i, y + h - 3, 1.6); g.fillRect(x + i + 1, y + 1, 1, h - 4); } }
  /**
   * THE SCORE (UI, under the health bar): a five-line staff scrolling right to left, bar lines every four beats, the
   * coming notes coloured by piece (the higher on the staff, the higher it hits, for the violins) and a gold playhead
   * that pulses on every beat.
   */
  drawScore() {
    const g = this.scoreG; g.clear();
    const B = this.boss; if (!B || B.dying || this.intro) { g.setVisible(false); return; } g.setVisible(true);
    const x0 = VIEW_W / 2 - 170, w = 340, y0 = 46, gap = 4, head = x0 + 34, t = this.t, px = (w - 40) / LEAD / 1.6;
    g.fillStyle(0x07060e, 0.7); g.fillRect(x0 - 4, y0 - 6, w + 8, gap * 4 + 12);
    for (let i = 0; i < 5; i++) { g.fillStyle(0xe8d8c0, 0.5); g.fillRect(x0, y0 + i * gap, w, 1); }
    for (let b = Math.ceil(t / BEAT) * BEAT; ; b += BEAT) { const x = head + (b - t) * px; if (x > x0 + w) break; const bar = (b / BEAT) % 4 === 0; g.fillStyle(0xe8d8c0, bar ? 0.6 : 0.15); g.fillRect(x, y0, 1, gap * 4 + 1); }
    const pulse = 1 - (t % BEAT) / BEAT;
    g.fillStyle(LOOK.gold, 0.5 + 0.5 * pulse); g.fillRect(head - 1, y0 - 4, 3, gap * 4 + 9);
    g.fillStyle(LOOK.gold, 0.2 * pulse); g.fillCircle(head, y0 + gap * 2, 6 + 6 * pulse);
    for (const N of this.notes) {
      const x = head + (N.at - t) * px; if (x > x0 + w - 4) continue;
      const y = y0 + gap * 4 - (N.line ?? 2) * gap, c = NOTE_COL[N.kind] || 0xffffff;
      g.fillStyle(0x07060e, 1); g.fillEllipse(x, y, 9, 7); g.fillStyle(c, 1); g.fillEllipse(x, y, 7, 5); g.fillRect(x + 2.5, y - 12, 1.5, 12);
      if (N.kind === 'staccato' || N.kind === 'baton') { g.fillStyle(c, 1); g.fillCircle(x, y + 6, 1.2); }
      if (N.kind === 'crescendo' && N.big) { g.fillStyle(c, 1); g.fillRect(x - 5, y - 14, 4, 2); }
    }
  }
  /** The phantom orchestra in the pit (timpani, violins) and the soprano: glowing, see-through, pale blue-white. */
  drawPit(g) {
    const t = this.t, P = this.pit, D = this.diva, ghost = 0x9ae0ff;
    if (P && P.kind === 'timpani') {
      const hit = P.hit ? P.hit-- : 0;
      for (const x of [-150, 150]) { const s = 1 + hit * 0.01; g.fillStyle(ghost, 0.15 * P.k); g.fillEllipse(x, -20, 110 * s, 60); g.fillStyle(0xd8a060, 0.55 * P.k); g.fillEllipse(x, 4, 80, 50); g.fillStyle(0xfff0e0, 0.7 * P.k); g.fillEllipse(x, -18, 80, 16); g.lineStyle(2, ghost, 0.8 * P.k); g.strokeEllipse(x, -18, 80, 16); g.lineStyle(0); const m = hit > 5 ? -20 : -50; g.lineStyle(3, ghost, 0.7 * P.k); g.lineBetween(x - 20, m - 20, x - 10, m); g.lineBetween(x + 20, m - 20, x + 10, m); g.lineStyle(0); g.fillStyle(0xffffff, 0.8 * P.k); g.fillCircle(x - 10, m, 5); g.fillCircle(x + 10, m, 5); }
    }
    if (P && P.kind === 'violins') {
      for (const x of [-200, -120, 120, 200]) { const bob = Math.sin(t * 0.1 + x) * 3; g.fillStyle(ghost, 0.15 * P.k); g.fillEllipse(x, -50 + bob, 40, 70); g.fillStyle(0xc08040, 0.5 * P.k); g.fillEllipse(x, -40 + bob, 20, 30); g.fillEllipse(x, -60 + bob, 16, 22); g.fillStyle(0x2a1a0a, 0.6 * P.k); g.fillRect(x - 1, -90 + bob, 2, 40); g.lineStyle(2, 0xffffff, 0.6 * P.k); const sw = Math.sin(t * 0.2 + x) * 14; g.lineBetween(x - 26 + sw, -36 + bob, x + 26 + sw, -54 + bob); g.lineStyle(0); }
    }
    if (D) {                                                                                // the soprano: a tall glowing diva in a sweeping gown, mouth open on a high note
      const k = Math.max(0, D.k), x = D.x, y = -230, sing = this.notes.length && this.t % BEAT < 10;
      g.fillStyle(ghost, 0.12 * k); g.fillEllipse(x, y + 80, 200, 300);
      g.fillStyle(0xe0d0ff, 0.45 * k); g.fillTriangle(x, y + 10, x - 70, y + 200, x + 70, y + 200); g.fillStyle(0xffffff, 0.3 * k); g.fillTriangle(x, y + 20, x - 20, y + 200, x + 10, y + 200);
      g.fillStyle(0xe0d0ff, 0.5 * k); g.fillEllipse(x, y + 26, 36, 50); g.fillStyle(0xf8f0ff, 0.6 * k); g.fillCircle(x, y - 10, 15);
      g.fillStyle(0xb090e0, 0.5 * k); g.fillEllipse(x - 14, y - 4, 10, 30); g.fillEllipse(x + 14, y - 4, 10, 30); g.fillEllipse(x, y - 24, 30, 12);
      g.fillStyle(0x3a1a5a, 0.7 * k); g.fillEllipse(x, y - 4, 6, sing ? 10 : 4);
      g.lineStyle(4, 0xe0d0ff, 0.5 * k); g.lineBetween(x - 14, y + 20, x - 40, y - 20); g.lineBetween(x + 14, y + 20, x + 46, y + 4); g.lineStyle(0);
      if (sing) for (let i = 0; i < 3; i++) { g.lineStyle(2, 0xd0a0ff, 0.6 * k * (1 - i / 3)); g.strokeCircle(x, y - 4, 14 + i * 10 + (this.t % BEAT)); } g.lineStyle(0);
    }
  }
  /**
   * MAESTRO FORTISSIMO on his rostrum: the round gilded rostrum (floating, a glow under it); long thin legs; tails
   * flaring out behind with their crimson lining (`backG`); a white waistcoat, crimson sash and white tie; long arms
   * in black sleeves, white gloves, the baton (with a gold trail through the beat pattern); a gaunt face with a hooked
   * nose, pince-nez, fierce brows; and the great white mane of hair streaming back (wilder in the storm).
   */
  drawConductor(g, back) {
    const E = this.e, d = E.dir, t = this.t, b = this.body(), fl = this.boss && this.boss.flash > 0, ink = LOOK.ink, A = E.alpha;
    if (A < 0.02) return;
    const col = (c) => (fl ? 0xffffff : c);
    const limb = (a, c2, w, colr, gg = g) => { gg.lineStyle(w + 4, ink, A); gg.lineBetween(a.x, a.y, c2.x, c2.y); gg.lineStyle(w, col(colr), A); gg.lineBetween(a.x, a.y, c2.x, c2.y); gg.lineStyle(0); };
    const blob = (x, y, rx, ry, c, gg = g) => { gg.fillStyle(ink, A); gg.fillEllipse(x, y, rx * 2 + 4, ry * 2 + 4); gg.fillStyle(col(c), A); gg.fillEllipse(x, y, rx * 2, ry * 2); };
    // the rostrum: a round drum of polished wood with gold bands, floating a little, a glow under it
    const rx = E.x, ry = E.y - E.hop * 0.3;
    if (this.spotK != null && this.spotK < 1 && this.intro) { g.fillStyle(0xfff0c0, 0.25 * this.spotK); g.fillTriangle(rx - 8, -440, rx + 8, -440, rx + 50, ry); g.fillTriangle(rx - 8, -440, rx - 50, ry, rx + 50, ry); }
    g.fillStyle(0xffd080, 0.15); g.fillEllipse(rx, ry, 70, 10);
    g.fillStyle(ink, A); g.fillRoundedRect(rx - 34, ry - COND.podium - 4, 68, COND.podium + 2, 8);
    g.fillStyle(col(LOOK.wood), A); g.fillRoundedRect(rx - 31, ry - COND.podium - 2, 62, COND.podium - 2, 6);
    g.fillStyle(LOOK.gold, A); g.fillRect(rx - 31, ry - COND.podium - 2, 62, 3); g.fillRect(rx - 31, ry - 8, 62, 2);
    g.fillStyle(0xffffff, 0.15 * A); g.fillRect(rx - 24, ry - COND.podium + 2, 8, COND.podium - 10);
    // the tails: two long swallow-tails flaring behind, crimson lining showing
    const flare = 10 + Math.sin(t * 0.1) * 4 + E.wild * 16 + (this.storm ? Math.sin(t * 0.3) * 6 : 0);
    for (const [o, c] of [[6, LOOK.lining], [0, LOOK.tails]]) { back.fillStyle(ink, A); back.fillTriangle(b.hip.x - d * 8, b.hip.y - 30, b.hip.x - d * 20, b.hip.y - 30, b.hip.x - d * (34 + flare + o), b.hip.y + 52 - o); back.fillStyle(col(c), A); back.fillTriangle(b.hip.x - d * 9, b.hip.y - 28, b.hip.x - d * 18, b.hip.y - 28, b.hip.x - d * (31 + flare + o), b.hip.y + 48 - o); }
    // legs and patent shoes
    for (const s of [-1, 1]) { const foot = { x: b.ft.x + s * 9, y: b.ft.y - 4 }, knee = { x: (b.hip.x + foot.x) / 2 + d * 3, y: (b.hip.y + foot.y) / 2 }; limb({ x: b.hip.x + s * 5, y: b.hip.y }, knee, 11, LOOK.tails); limb(knee, foot, 10, LOOK.tails); blob(foot.x + d * 7, foot.y + 1, 12, 5, 0x0a0a10); g.fillStyle(0xffffff, 0.7 * A); g.fillEllipse(foot.x + d * 10, foot.y - 1, 6, 2); }
    // the back arm (free hand: expressive)
    const e2 = { x: (b.sh.x + b.hand2.x) / 2 - d * 4, y: (b.sh.y + b.hand2.y) / 2 + 6 }; limb(b.sh, e2, 10, mix(LOOK.tails, 0x000000, 0.2)); limb(e2, b.hand2, 9, mix(LOOK.tails, 0x000000, 0.2)); blob(b.hand2.x, b.hand2.y, 6, 6, LOOK.glove);
    // the torso: tailcoat over a white waistcoat, the crimson sash across it, white tie
    const J = [{ x: b.sh.x - 20, y: b.sh.y - 2 }, { x: b.sh.x + 20, y: b.sh.y - 2 }, { x: b.hip.x + 16, y: b.hip.y }, { x: b.hip.x - 16, y: b.hip.y }];
    g.fillStyle(ink, A); g.fillPoints(J.map((p) => ({ x: p.x + (p.x > b.hip.x ? 2 : -2), y: p.y + (p.y < b.hip.y ? -2 : 2) })), true); g.fillStyle(col(LOOK.tails), A); g.fillPoints(J, true);
    g.fillStyle(col(LOOK.vest), A); g.fillPoints([{ x: b.sh.x - 8, y: b.sh.y }, { x: b.sh.x + 8, y: b.sh.y }, { x: b.hip.x + 9, y: b.hip.y - 4 }, { x: b.hip.x, y: b.hip.y + 4 }, { x: b.hip.x - 9, y: b.hip.y - 4 }], true);
    g.fillStyle(col(LOOK.sash), A); g.fillPoints([{ x: b.sh.x - d * 16, y: b.sh.y + 4 }, { x: b.sh.x - d * 6, y: b.sh.y + 2 }, { x: b.hip.x + d * 16, y: b.hip.y - 10 }, { x: b.hip.x + d * 10, y: b.hip.y }], true);
    g.fillStyle(LOOK.gold, A); g.fillCircle(b.hip.x + d * 12, b.hip.y - 6, 3.4); g.fillStyle(0xffffff, 0.6 * A); g.fillCircle(b.hip.x + d * 11, b.hip.y - 7, 1.2);   // a medal
    g.fillStyle(col(0xffffff), A); g.fillTriangle(b.sh.x, b.sh.y + 2, b.sh.x - 9, b.sh.y - 3, b.sh.x - 9, b.sh.y + 7); g.fillTriangle(b.sh.x, b.sh.y + 2, b.sh.x + 9, b.sh.y - 3, b.sh.x + 9, b.sh.y + 7);
    // the head: the mane behind first, then the gaunt face
    const hx = b.head.x, hy = b.head.y, wind = (this.storm ? 1.6 : 1) + E.wild;
    // the mane: a great white cloud of hair round the back and top of his head, blown back, with flyaway locks
    const puffs = [];
    for (let i = 0; i < 15; i++) { const a = -0.3 - i * 0.2, r = 18 + (i % 3) * 4 + E.wild * 4, sway = Math.sin(t * 0.12 * wind + i) * 2 * wind; puffs.push({ x: hx - d * (Math.cos(a) * -r + 6 + i * 1.3 * wind) + sway * -d, y: hy - 6 + Math.sin(a) * r * 0.9 - (i < 6 ? 4 : 0), r: 9 + (i % 4) * 2 }); }
    for (const P of puffs) { back.fillStyle(ink, A); back.fillCircle(P.x, P.y, P.r + 2); }
    for (const P of puffs) { back.fillStyle(col(0xc8c8d8), A); back.fillCircle(P.x, P.y, P.r); }
    for (const P of puffs) { back.fillStyle(col(LOOK.hair), A); back.fillCircle(P.x + d * 2, P.y - 2, P.r * 0.75); }
    for (let r = 0; r < 6; r++) {                                                          // flyaway locks streaming back
      const sx = hx - d * 22, sy = hy - 18 + r * 7, len = 18 + r * 4 + E.wild * 16, pts = [];
      for (let q = 0; q <= 5; q++) { const s = q / 5; pts.push({ x: sx - d * s * len, y: sy - Math.sin(s * 2) * 6 + Math.sin(t * 0.18 * wind + r + s * 4) * 3 * s * wind }); }
      back.lineStyle(3, ink, A); for (let q = 1; q < pts.length; q++) back.lineBetween(pts[q - 1].x, pts[q - 1].y, pts[q].x, pts[q].y);
      back.lineStyle(1.6, col(LOOK.hair), A); for (let q = 1; q < pts.length; q++) back.lineBetween(pts[q - 1].x, pts[q - 1].y, pts[q].x, pts[q].y);
    }
    back.lineStyle(0);
    limb({ x: b.sh.x + d * 2, y: b.sh.y - 2 }, { x: hx, y: hy + 12 }, 8, LOOK.skin);
    // the face: a long gaunt oval with a sharp chin, a hollow cheek, a great hooked nose
    const face = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; face.push({ x: hx + d * 2 + Math.cos(a) * 15, y: hy + Math.sin(a) * (Math.sin(a) > 0 ? 24 : 19) }); }
    g.fillStyle(ink, A); g.fillPoints(face.map((p) => ({ x: hx + d * 2 + (p.x - hx - d * 2) * 1.14, y: hy + (p.y - hy) * 1.1 })), true); g.fillStyle(col(LOOK.skin), A); g.fillPoints(face, true);
    g.fillStyle(0x000000, 0.13 * A); g.fillTriangle(hx - d * 10, hy - 2, hx + d * 2, hy + 6, hx - d * 8, hy + 16);   // a hollow cheek
    const nose = [{ x: hx + d * 10, y: hy - 8 }, { x: hx + d * 25, y: hy + 6 }, { x: hx + d * 22, y: hy + 10 }, { x: hx + d * 13, y: hy + 9 }];
    g.fillStyle(ink, A); g.fillPoints(nose.map((p) => ({ x: p.x + d * 1.5, y: p.y + 1 })), true); g.fillStyle(col(mix(LOOK.skin, 0xc08a7a, 0.35)), A); g.fillPoints(nose, true);
    const shut = this.say && this.say.t < 10 ? false : (t % 200 < 80);                     // he conducts with his eyes closed, rapt
    for (const ex of [-1, 7]) { if (shut) { g.lineStyle(1.5, ink, A); g.lineBetween(hx + d * ex - 4, hy - 4, hx + d * ex + 3, hy - 3); g.lineStyle(0); } else { g.fillStyle(0xffffff, A); g.fillEllipse(hx + d * ex, hy - 4, 6, 4); g.fillStyle(ink, A); g.fillCircle(hx + d * (ex + 1), hy - 4, 1.5); } }
    g.lineStyle(1.5, LOOK.gold, A); g.strokeCircle(hx + d * 7, hy - 4, 5); g.strokeCircle(hx - d * 1, hy - 4, 5); g.lineStyle(0);
    g.fillStyle(0xffffff, 0.8 * A); g.fillRect(hx + d * 5, hy - 7, 2, 1);
    const angry = this.boss && (this.boss.phase === 2 || this.boss.flash > 0) ? 3 : 0;
    g.fillStyle(col(LOOK.hair), A); g.fillPoints([{ x: hx - d * 6, y: hy - 12 - angry }, { x: hx + d * 12, y: hy - 9 + angry }, { x: hx + d * 12, y: hy - 6 + angry }, { x: hx - d * 6, y: hy - 9 - angry }], true);
    g.fillStyle(ink, A); g.fillRect(hx + d * 1 - (d > 0 ? 0 : 8), hy + 13, 8, 1.5);
    if (this.say && this.say.t < this.say.life) { g.fillStyle(0x3a0a10, A); g.fillEllipse(hx + d * 4, hy + 14, 7, 4 + Math.abs(Math.sin(t * 0.5)) * 3); }
    // the baton arm and the baton (snapped in two at his death), its gold trail through the beat
    const el = { x: (b.sh.x + b.hand.x) / 2 + d * 2, y: (b.sh.y + b.hand.y) / 2 + 8 };
    limb(b.sh, el, 10, LOOK.tails); limb(el, b.hand, 9, LOOK.tails);
    g.fillStyle(col(0xffffff), A); g.fillCircle(el.x + (b.hand.x - el.x) * 0.85, el.y + (b.hand.y - el.y) * 0.85, 4);   // shirt cuff
    if (!E.snap) {
      if (E.arms === 'conduct' && !this.intro) { const tr = this.trail || (this.trail = []); tr.push({ x: b.tip.x, y: b.tip.y }); if (tr.length > 10) tr.shift(); for (let i = 1; i < tr.length; i++) { g.lineStyle(i * 0.4, LOOK.gold, i / tr.length * 0.6 * A); g.lineBetween(tr[i - 1].x, tr[i - 1].y, tr[i].x, tr[i].y); } g.lineStyle(0); }
      limb(b.hand, b.tip, 2, 0xfff8f0); g.fillStyle(0xd0a070, A); g.fillCircle(b.hand.x, b.hand.y, 3.5);
    } else { const mid = { x: (b.hand.x + b.tip.x) / 2, y: (b.hand.y + b.tip.y) / 2 }; limb(b.hand, mid, 2, 0xfff8f0); limb({ x: mid.x + 6, y: mid.y + 10 }, { x: mid.x + 20, y: mid.y + 24 }, 2, 0xfff8f0); }
    blob(b.hand.x, b.hand.y, 6, 6, LOOK.glove);
  }
  /** The strikes and their marks: note marks on the floor, slamming notes, rings, the floor shock, bow sweeps, flying notes and blades, bolts, the chandelier, shards, roses, rain, flashes, the hazards. */
  drawFx(g) {
    const t = this.t, ink = LOOK.ink;
    for (const N of this.notes) {                                                         // marks on the floor for notes that land on a spot
      if (N.x == null) continue; const k = 1 - Math.max(0, Math.min(1, (N.at - t) / LEAD)), c = NOTE_COL[N.kind];
      g.fillStyle(c, 0.12 + 0.3 * k); g.fillEllipse(N.x, -2, 50, 10); g.lineStyle(2, c, 0.6 * k); g.strokeEllipse(N.x, -2, 50 * (1.6 - k * 0.6), 10 * (1.6 - k * 0.6)); g.lineStyle(0);
      if (N.kind === 'bolt') { g.fillStyle(c, 0.05 + 0.1 * k); g.fillRect(N.x - 20, -420, 40, 420); }
    }
    for (const N of this.notes) if (N.kind === 'violins' && N.at - t < BEAT) { const [y1, y2] = N.hi ? VIOL.high : VIOL.low, k = 1 - (N.at - t) / BEAT; g.fillStyle(0x8ad0ff, 0.06 + 0.14 * k); g.fillRect(-260, y1, 520, y2 - y1); }
    for (const N of this.notes) if (N.kind === 'timpani' && N.at - t < BEAT) { g.fillStyle(0xc08a4a, 0.25 * (1 - (N.at - t) / BEAT)); g.fillRect(-252, -TIMP.h, 504, TIMP.h); }
    for (const F of this.fx) {
      if (F.k === 'slam') { const k = Math.min(1, (12 - F.life) / 3), y = lerp(-140, 0, k); g.fillStyle(ink, 1); g.fillEllipse(F.x, y - 14, 52, 34); g.fillStyle(0xffd040, 1); g.fillEllipse(F.x, y - 14, 46, 28); g.fillStyle(ink, 1); g.fillRect(F.x + 18, y - 110, 6, 96); g.fillStyle(0xffd040, 1); g.fillRect(F.x + 19, y - 108, 4, 94); g.fillStyle(0xffffff, 0.5); g.fillEllipse(F.x - 8, y - 20, 14, 8); if (k >= 1) { g.lineStyle(3, 0xffd040, F.life / 9); g.strokeEllipse(F.x, -2, 80 + (9 - F.life) * 8, 14); g.lineStyle(0); } }
      else if (F.k === 'ring') { const a = Math.min(1, F.life / 20); g.lineStyle(F.big ? 10 : 6, 0xff6a8a, 0.35 * a); g.strokeEllipse(F.x, F.y, F.r * 2, F.r * 1.7); g.lineStyle(F.big ? 4 : 2, 0xffffff, 0.9 * a); g.strokeEllipse(F.x, F.y, F.r * 2, F.r * 1.7); g.lineStyle(0); }
      else if (F.k === 'floor') { g.fillStyle(0xffd080, 0.5 * F.life / 8); g.fillRect(-252, -TIMP.h, 504, TIMP.h); for (let i = 0; i < 12; i++) { g.fillStyle(0xfff0c0, 0.7 * F.life / 8); g.fillTriangle(-240 + i * 42, 0, -230 + i * 42, -TIMP.h - 8 * F.life / 8, -220 + i * 42, 0); } }
      else if (F.k === 'bow') { const [y1, y2] = F.hi ? VIOL.high : VIOL.low, k = 1 - F.life / 12, x = lerp(-300, 300, k) * this.e.dir; g.fillStyle(0x8ad0ff, 0.35 * (F.life / 12)); g.fillRect(-260, y1, 520, y2 - y1); g.lineStyle(4, 0xffffff, 0.9); g.lineBetween(x - 120, (y1 + y2) / 2 + 4, x + 120, (y1 + y2) / 2 - 4); g.lineStyle(0); g.fillStyle(0xc08040, 1); g.fillRect(x + 116 * this.e.dir - 4, (y1 + y2) / 2 - 8, 8, 10); }
      else if (F.k === 'proj') { if (F.blade) { const a = Math.atan2(F.vy, F.vx), c = Math.cos(a), s = Math.sin(a); g.fillStyle(ink, 1); g.fillEllipse(F.x, F.y, 16, 12); g.fillStyle(0xffffff, 1); g.fillEllipse(F.x, F.y, 12, 8); g.lineStyle(3, 0xffffff, 1); g.lineBetween(F.x + 5, F.y, F.x + 5 - s * 18, F.y - 18 + c * 0); g.lineBetween(F.x + 5, F.y - 18, F.x + 14, F.y - 10); g.lineStyle(0); g.lineStyle(1, 0xffffff, 0.5); g.lineBetween(F.x, F.y, F.x - c * 24, F.y - s * 24); g.lineStyle(0); }
        else { g.fillStyle(F.c, 0.3); g.fillCircle(F.x, F.y, 16); g.fillStyle(ink, 1); g.fillEllipse(F.x, F.y + 4, 14, 10); g.fillStyle(F.c, 1); g.fillEllipse(F.x, F.y + 4, 11, 7); g.fillRect(F.x + 4, F.y - 14, 2, 18); g.fillTriangle(F.x + 6, F.y - 14, F.x + 14, F.y - 8, F.x + 6, F.y - 8); } }
      else if (F.k === 'bolt') { for (let k = 0; k < 3; k++) { g.lineStyle(6 - k * 2, [0x9ae0ff, 0xd0f0ff, 0xffffff][k], 1); g.beginPath(); let x = F.x; for (let y = -440; y <= 0; y += 30) { g.lineTo(x, y); x = F.x + (hash(F.id.length, y, t >> 1) - 0.5) * 30; } g.strokePath(); } g.lineStyle(0); g.fillStyle(0xd0f0ff, 0.5); g.fillEllipse(F.x, 0, 80, 16); }
      else if (F.k === 'shard') { g.fillStyle(0xd0f0ff, 1); g.fillTriangle(F.x, F.y - 9, F.x + 6, F.y + 5, F.x - 6, F.y + 5); g.fillStyle(0xffffff, 1); g.fillTriangle(F.x, F.y - 9, F.x + 2, F.y + 2, F.x - 3, F.y); }
      else if (F.k === 'rose') { g.lineStyle(2, 0x2a6a2a, 1); g.lineBetween(F.x, F.y, F.x - 6, F.y + 14); g.lineStyle(0); g.fillStyle(0xc0102a, 1); g.fillCircle(F.x, F.y, 5); g.fillStyle(0xff3a5a, 1); g.fillCircle(F.x - 1, F.y - 1, 2.5); }
    }
    const C = this.chand;                                                                // the chandelier: gilded tiers of crystal and candle flames on a rope
    if (C) {
      const x = C.x + C.sw, y = C.y;
      if (!C.fall) { g.lineStyle(3, 0x8a6a3a, 1); g.lineBetween(C.x, -520, x, y - 40); g.lineStyle(0); g.fillStyle(0xfff0c0, 0.15 + 0.1 * (t % 10 < 5 ? 1 : 0)); g.fillEllipse(C.x, -2, CHAND.w + 20, 12); }
      g.fillStyle(LOOK.gold, 1); g.fillEllipse(x, y - 30, 40, 10); g.fillEllipse(x, y, CHAND.w, 14); g.fillRect(x - 3, y - 40, 6, 44);
      for (let i = 0; i < 9; i++) { const cx = x - CHAND.w / 2 + 4 + i * (CHAND.w - 8) / 8; g.fillStyle(0xd0f0ff, 0.9); g.fillTriangle(cx - 3, y + 6, cx + 3, y + 6, cx, y + 18 + (i % 3) * 4); g.fillStyle(0xfff8e0, 1); g.fillRect(cx - 1.5, y - 10, 3, 8); g.fillStyle(0xffa040, 0.9); g.fillEllipse(cx, y - 13, 4, 7); }
      g.fillStyle(0xfff0c0, 0.15); g.fillCircle(x, y - 6, 50);
    }
    if (this.storm) for (const r of this.rain) { g.lineStyle(1, 0xa0b8d8, 0.4); g.lineBetween(r.x, r.y, r.x - 3, r.y + 14); } g.lineStyle(0);
    if (this.flash > 0) { g.fillStyle(0xffffff, 0.06 * this.flash); g.fillRect(-800, -800, 1600, 1100); }
    if (this.sand) { const S = this.sand, x = S.x, y = S.y ?? -440; if (S.y == null) { g.fillStyle(0xc8b080, 0.15 + 0.25 * S.k); g.fillEllipse(x, -1, 40, 7); } g.lineStyle(2, 0x6a5a3a, 1); g.lineBetween(x, -560, x, y - 20); g.lineStyle(0); g.fillStyle(ink, 1); g.fillEllipse(x, y, 34, 40); g.fillStyle(0xb8a070, 1); g.fillEllipse(x, y, 30, 36); g.fillStyle(0x8a7450, 1); g.fillRect(x - 5, y - 22, 10, 6); }
    if (this.smoke) { const S = this.smoke; g.fillStyle(0x000000, 1); g.fillRect(S.x - 26, -3, 52, 5); if (!S.on && t % 6 < 3) { g.fillStyle(0xd8d0e0, 0.4 * S.k); g.fillRect(S.x - 26, -6, 52, 4); } if (S.on) { g.fillStyle(0xd8d0e0, 0.25); g.fillRect(S.x - 26, -200, 52, 200); } }
  }
  /** His final curtain: heavy red velvet falling from the flies over the whole stage, gold fringe at its hem. */
  drawFinalCurtain(g, k) {
    const y = lerp(-560, 44, easeOut(k));
    for (let i = 0; i < 20; i++) { const x = -330 + i * 33; g.fillStyle(i % 2 ? 0x8a1428 : 0x6a0c1e, 1); g.fillRect(x, -600, 34, y + 600); g.fillStyle(0xffffff, 0.06); g.fillRect(x + 4, -600, 6, y + 600); }
    g.fillStyle(LOOK.gold, 1); g.fillRect(-330, y - 8, 660, 8); for (let x = -326; x < 330; x += 8) g.fillTriangle(x, y, x + 6, y, x + 3, y + 10);
  }
  /** His speech bubble: an ivory bubble edged in crimson, with a tail toward his face. */
  drawBubble() {
    const S = this.say, b = this.body(), g = this.bubG, pop = Math.min(1, S.t / 6), x = Phaser.Math.Clamp(b.head.x - this.e.dir * 40, -220, 220), y = b.head.y - 76;
    this.bubT.setText(S.text).setPosition(x, y).setScale(pop).setVisible(true);
    const w = Math.max(60, this.bubT.width + 20) * pop, h = (this.bubT.height + 14) * pop;
    g.fillStyle(LOOK.ink, 1); g.fillRoundedRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 10); g.fillStyle(0xc0203a, 1); g.fillRoundedRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, 9); g.fillStyle(0xfff8ec, 1); g.fillRoundedRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, 8);
    g.fillStyle(0xfff8ec, 1); g.fillTriangle(x - 6, y + h / 2 - 2, x + 8, y + h / 2 - 2, b.head.x, b.head.y - 24); g.lineStyle(2, LOOK.ink, 1); g.lineBetween(x - 6, y + h / 2, b.head.x, b.head.y - 24); g.lineBetween(x + 8, y + h / 2, b.head.x, b.head.y - 24); g.lineStyle(0);
  }
}

/** THE GRAND OPERA's miniature for the stage select screen: velvet, gold balconies, the stage, the conductor. */
export function drawGrandOperaPreview(g, x, y, w, h) {
  g.fillStyle(0x2a0610, 1); g.fillRect(x, y, w, h);
  for (let t = 0; t < 3; t++) { g.fillStyle(0x8a1428, 1); g.fillRect(x + w * 0.05, y + h * (0.12 + t * 0.16), w * 0.9, h * 0.06); g.fillStyle(0xe8b840, 1); g.fillRect(x + w * 0.05, y + h * (0.12 + t * 0.16), w * 0.9, 1); }
  g.fillStyle(0x6a3a1a, 1); g.fillRect(x + w * 0.1, y + h * 0.72, w * 0.8, h * 0.1); g.fillStyle(0xe8b840, 1); g.fillRect(x + w * 0.1, y + h * 0.82, w * 0.8, 2);
  for (const s of [0, 1]) { g.fillStyle(0x8a1428, 1); g.fillRect(x + (s ? w * 0.9 : 0), y, w * 0.1, h); }
  const cx = x + w * 0.6, fy = y + h * 0.72;
  g.fillStyle(0x6a3a1a, 1); g.fillRect(cx - 6, fy - h * 0.06, 12, h * 0.06);
  g.fillStyle(0x14121c, 1); g.fillRect(cx - 3, fy - h * 0.36, 6, h * 0.3); g.fillStyle(0xead8c8, 1); g.fillCircle(cx, fy - h * 0.4, 3); g.fillStyle(0xf4f4fa, 1); g.fillEllipse(cx - 3, fy - h * 0.42, 9, 6);
  g.lineStyle(1, 0xffffff, 1); g.lineBetween(cx + 3, fy - h * 0.3, cx + w * 0.1, fy - h * 0.46); g.lineStyle(0);
}
