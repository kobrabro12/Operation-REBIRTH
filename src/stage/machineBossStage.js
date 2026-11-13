// THE DESKTOP - the arena of BEIGE.EXE, THE OLD MACHINE (boss V, a vintage 90s computer; Trinkets > BOSS FIGHTS,
// src/data/bosses.js). An original homage to old desktop computers - no real brand, logo or OS name anywhere.
// You fight on the TASKBAR (a grey bevelled bar with a BEGIN button and a clock) in front of a teal desktop with
// big pixel icons; two open WINDOWS are the side ledges (stand on their title bars). Behind the taskbar looms the
// MACHINE: a huge beige CRT monitor on a tower case, a pixel face on its screen, and its giant MOUSE CURSOR is its hand.
//   Weak point: its SCREEN (x1.2; x1.7 while it's NOT RESPONDING - every few attacks it freezes, an hourglass spinning
//   and its screen greyed out). The beige casing takes x0.5, the cursor x0.3.
//   Attacks: DOUBLE CLICK (the cursor tracks you overhead, then clicks twice - CLICK CLICK), DRAG SELECT (it drags a
//   dashed selection box over you... DELETE? - get out before it fills), ERROR CASCADE (error dialogs rain down on
//   marks - then lie on the taskbar as platforms until they close), SOLITAIRE (a card cascade bounces out of its screen
//   and across the taskbar), FATAL EXCEPTION (at half health its screen goes BLUE; enraged it adds PIPES - the old 3D
//   screensaver: pipes grow across the room in right angles - and SYSTEM CRASH - glitch blocks rain down in columns).
// Stage hazards (also in VS, where the switched-off monitor just shows its reflection): POP-UP (a window falls on a
// marked spot and lies there as a ledge) and DIAL-UP (a screeching modem beam sweeps across a marked band).
import { HazardCycle } from './hazardCycle.js';
import { BossArena } from './bossBase.js';
import { sfx } from '../audio/sfx.js';

// 90s desktop greys, teal, title-bar blue, beige plastic
const C = { out: 0x101010, teal: [0x007070, 0x008080, 0x109090], grey: [0x404040, 0x808080, 0xc0c0c0, 0xdfdfdf, 0xffffff], navy: 0x000080, blue: 0x1084d0,
  beige: [0x8a8070, 0xb8ae98, 0xd8d0b8, 0xece6d4], screen: [0x0a2a1a, 0x103a24, 0x30ff80, 0xb0ffd0], bsod: 0x0000aa, card: [0xffffff, 0xd02020, 0x101010, 0x2050c0], pipe: [0xc02020, 0x20a040, 0x2060d0, 0xe0c020] };
// the monitor: where its screen's centre floats, its size, the casing round it
const MON = { x: 0, y: -176, sw: 150, sh: 110, bez: 22 };
// DOUBLE CLICK: tracking frames, the drop, the click's hit
const CLICK = { track: 54, drop: 7, hold: 8, hit: [12, [70, 6.2, 0.9]] };
// DRAG SELECT: the drag (frames), the DELETE? warning, the fill's hit; the smallest box
const DRAG = { drag: 40, warn: 30, fill: 10, min: 130, hit: [13, [80, 6.2, 0.85]] };
// ERROR CASCADE: dialogs (normal / enraged), frames apart, mark warning, fall speed, dialog size, how long they lie there, hit
const ERR = { n: [3, 4], every: 16, warn: 34, fall: 13, w: 96, h: 62, life: 260, hit: [11, [80, 5.8, 0.75]] };
// SOLITAIRE: cards (normal / enraged), frames apart, bounce, the card's hit
const CARDS = { n: [5, 7], every: 9, bounce: 0.82, grav: 0.32, hit: [7, [55, 5, 0.6]] };
// PIPES (enraged): pipes, step size, frames per step, steps, the growing end's hit
const PIPES = { n: 2, step: 14, every: 3, steps: 46, hit: [9, [60, 5.4, 0.6]] };
// SYSTEM CRASH (enraged): blocks, frames apart, warning, hit
const CRASH = { n: 9, every: 6, warn: 30, hit: [9, [80, 5, 0.55]] };
// NOT RESPONDING: every `every` attacks it freezes for `dur` frames
const HANG = { every: 4, dur: 170 };
// hazards: POP-UP (a window falls on a mark) and DIAL-UP (a screeching beam: warning frames, sweep frames, band height, hit)
const POPUP = { warn: 50, hit: [10, [80, 5.6, 0.7]] };
const DIAL = { warn: 70, on: 60, h: 30, hit: [5, [40, 4.6, 0.4]] };
// where the desktop backdrop sits on the background camera
const SKY = { x: 320, y: 250 };

/** THE DESKTOP and BEIGE.EXE (see the top of the file). */
export class MachineBossStage extends BossArena {
  constructor(scene) {
    super();
    this.scene = scene; this.t = 0; this.hazardsOn = true; this.music = 'bgm_boss_machine';
    this.platforms = [
      { x1: -268, x2: 268, y: 0, solid: true, bottom: 40 },
      { x1: -250, x2: -146, y: -104, solid: false },
      { x1: 146, x2: 250, y: -104, solid: false },
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: -60, y: 0 }, { x: -110, y: 0 }, { x: 150, y: 0 }];
    this.cycle = new HazardCycle(this, ['popup', 'dialup'], { color: '#ffffff', stroke: '#000080', gap: 700 });
    this.cur = { x: 120, y: -120, mode: 'arrow', press: 0 };
    this.count = 0; this.hang = 0; this.blue = 0; this.mood = 'idle';
    this.drag = null; this.errs = []; this.cards = []; this.pipes = []; this.blocks = []; this.dial = null;
    this.sparkColor = 0x30ff80; this.bodyW = 200; this.bodyH = 160;
  }

  /** Builds the teal desktop (icons), the two open windows (ledges) and the taskbar (the floor). */
  draw(world, bg) {
    const s = this.scene;
    const sky = s.add.graphics().setScrollFactor(0.15).setPosition(SKY.x, SKY.y); bg.push(sky); this.paintDesk(sky);
    const back = s.add.graphics(); world.push(back); this.paintWindows(back);
    this.monG = s.add.graphics(); world.push(this.monG);
    const front = s.add.graphics(); world.push(front); this.paintTaskbar(front);
    this.fxG = s.add.graphics(); world.push(this.fxG);
    this.cycle.makeBanner(s);
  }

  /** A bevelled grey box (lit top-left, shaded bottom-right) - the look of every old window and button. */
  bevel(g, x, y, w, h, inset = false) {
    g.fillStyle(C.grey[2], 1); g.fillRect(x, y, w, h);
    g.fillStyle(inset ? C.grey[0] : C.grey[4], 1); g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
    g.fillStyle(inset ? C.grey[4] : C.grey[0], 1); g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
  }
  /** The desktop far behind: flat teal, a faint dither, and a column of big pixel icons (computer, folder, bin, notepad). */
  paintDesk(g) {
    g.fillStyle(C.teal[1], 1); g.fillRect(-700, -700, 1400, 1100);
    for (let y = -600; y < 300; y += 4) for (let x = -700 + ((y / 4) % 2) * 2; x < 700; x += 8) { g.fillStyle(C.teal[0], 0.25); g.fillRect(x, y, 1, 1); }
    const icon = (x, y, kind) => {
      if (kind === 'pc') { g.fillStyle(C.out, 1); g.fillRect(x - 15, y - 14, 30, 22); g.fillStyle(C.beige[2], 1); g.fillRect(x - 14, y - 13, 28, 20); g.fillStyle(C.navy, 1); g.fillRect(x - 10, y - 10, 20, 13); g.fillStyle(C.beige[1], 1); g.fillRect(x - 8, y + 8, 16, 4); }
      if (kind === 'folder') { g.fillStyle(C.out, 1); g.fillRect(x - 15, y - 9, 30, 20); g.fillStyle(0xe8c840, 1); g.fillRect(x - 14, y - 8, 28, 18); g.fillRect(x - 14, y - 12, 12, 5); g.fillStyle(0xf8e070, 1); g.fillRect(x - 14, y - 4, 28, 3); }
      if (kind === 'bin') { g.fillStyle(C.out, 1); g.fillRect(x - 11, y - 12, 22, 25); g.fillStyle(C.grey[3], 1); g.fillRect(x - 10, y - 11, 20, 23); for (let i = 0; i < 3; i++) { g.fillStyle(C.grey[1], 1); g.fillRect(x - 6 + i * 5, y - 7, 2, 16); } }
      if (kind === 'note') { g.fillStyle(C.out, 1); g.fillRect(x - 11, y - 14, 22, 27); g.fillStyle(C.grey[4], 1); g.fillRect(x - 10, y - 13, 20, 25); for (let i = 0; i < 5; i++) { g.fillStyle(C.blue, 1); g.fillRect(x - 7, y - 9 + i * 4, 12 - (i % 2) * 4, 1); } }
      g.fillStyle(C.grey[4], 1); g.fillRect(x - 16, y + 18, 32, 4); g.fillStyle(C.teal[0], 1); g.fillRect(x - 14, y + 19, 28, 2);   // its label
    };
    ['pc', 'folder', 'bin', 'note'].forEach((k, i) => icon(-290, -330 + i * 64, k));
    ['folder', 'note'].forEach((k, i) => icon(-226, -330 + i * 64, k));
  }
  /** The two open windows the ledges stand on: navy title bars with their three buttons, grey frames, white pages. */
  paintWindows(g) {
    for (const p of this.platforms.slice(1)) {
      const x = p.x1 - 6, w = p.x2 - p.x1 + 12, y = p.y, h = 104;
      g.fillStyle(C.out, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2); this.bevel(g, x, y, w, h);
      g.fillStyle(C.navy, 1); g.fillRect(x + 3, y + 3, w - 6, 12); g.fillStyle(C.blue, 1); g.fillRect(x + 3 + (w - 6) * 0.5, y + 3, (w - 6) * 0.5, 12);
      for (let i = 0; i < 3; i++) { this.bevel(g, x + w - 16 - i * 13, y + 5, 11, 9); g.fillStyle(C.out, 1); g.fillRect(x + w - 13 - i * 13, y + 9, 5, 2); }
      g.fillStyle(C.grey[4], 1); g.fillRect(x + 4, y + 18, w - 8, h - 22); g.fillStyle(C.grey[1], 1); g.fillRect(x + w - 14, y + 18, 10, h - 22);
      for (let i = 0; i < 8; i++) { g.fillStyle(C.grey[1], 1); g.fillRect(x + 10, y + 26 + i * 9, 30 + ((i * 17) % 40), 3); }
    }
  }
  /** The taskbar floor: a long grey bevel bar, the BEGIN button (a little power symbol), quick icons and the clock tray. */
  paintTaskbar(g) {
    const P = this.platforms[0], x = P.x1, w = P.x2 - P.x1;
    g.fillStyle(C.out, 1); g.fillRect(x - 2, -2, w + 4, 44); this.bevel(g, x, 0, w, 40);
    this.bevel(g, x + 6, 6, 70, 28); g.lineStyle(3, 0xd04020, 1); g.beginPath(); g.arc(x + 22, 20, 7, -1.2, 4.3); g.strokePath(); g.lineBetween(x + 22, 10, x + 22, 19); g.lineStyle(0);
    for (let i = 0; i < 4; i++) { g.fillStyle(C.grey[1], 1); g.fillRect(x + 36 + i * 8, 16, 5, 7); }
    for (let i = 0; i < 3; i++) { this.bevel(g, x + 90 + i * 112, 6, 104, 28, i === 0); g.fillStyle(C.navy, 1); g.fillRect(x + 96 + i * 112, 14, 10, 10); for (let k = 0; k < 5; k++) { g.fillStyle(C.out, 1); g.fillRect(x + 112 + i * 112 + k * 12, 18, 8, 3); } }
    this.bevel(g, x + w - 84, 6, 78, 28, true);
  }

  // ------------------------------------------------------------------ BEIGE.EXE
  /** The boss's own state when the fight starts. */
  makeBoss() { this.cycle.gap = 1250; this.cycle.next = 1500; }
  /** Its screen: what the camera, the death and the CPU aim at. */
  core() { return { x: MON.x, y: MON.y + this.bob() }; }
  /** How far it floats up and down. */
  bob() { return Math.sin(this.t * 0.03) * 6 + (this.hang > 0 ? 18 : 0); }
  /** Where it can be hit: the screen (x1.2, x1.7 NOT RESPONDING), the casing (x0.5), the cursor (x0.3). */
  hurt() {
    const c = this.core(), sw = MON.sw / 2, sh = MON.sh / 2, b = MON.bez, k = this.cur;
    return [{ x1: c.x - sw, y1: c.y - sh, x2: c.x + sw, y2: c.y + sh, mult: this.hang > 0 ? 1.7 : 1.2 },
      { x1: c.x - sw - b, y1: c.y - sh - b, x2: c.x + sw + b, y2: c.y + sh + b + 20, mult: 0.5 },
      { x1: k.x - 4, y1: k.y - 4, x2: k.x + 30, y2: k.y + 46, mult: 0.3 }];
  }
  /** What it does next: every few attacks it hangs (NOT RESPONDING); enraged adds PIPES and SYSTEM CRASH. */
  pattern(phase) {
    if (this.count % HANG.every === HANG.every - 1) return ['hang'];
    return phase === 1 ? ['click', 'drag', 'errors', 'cards', 'click'] : ['click', 'drag', 'errors', 'cards', 'pipes', 'crash'];
  }
  /** Counts its attacks (every few, it hangs). */
  tally() { this.count++; }
  start_click() { this.tally(); } start_drag() { this.tally(); } start_errors() { this.tally(); } start_cards() { this.tally(); } start_pipes() { this.tally(); } start_crash() { this.tally(); } start_hang() { this.tally(); }
  rageLine() { return 'FATAL EXCEPTION!'; }
  /** Half health: the screen goes BLUE - a sad face, the error text - and the whole room flickers blue. */
  onRage(match) { this.blue = 150; sfx('glitch', 1, 0.6); sfx('ding', 1, 0.5); match.shake(8, 20); }
  /** You lost: it shows a big grin and the cursor waves a little goodbye. */
  onGloat(match, t) { this.mood = 'grin'; this.cur.mode = 'hand'; this.cur.x += (60 + Math.sin(t * 0.3) * 30 - this.cur.x) * 0.2; this.cur.y += (-150 - this.cur.y) * 0.2; }

  /** At rest: the cursor drifts over toward the nearest player, wiggling. */
  idle(match) {
    const tg = this.nearest(match, this.cur.x), k = this.cur;
    this.mood = 'idle'; k.mode = 'arrow';
    if (tg) { k.x += (tg.x + 70 - k.x) * 0.03; k.y += (-180 + Math.sin(this.t * 0.07) * 14 - k.y) * 0.05; }
  }
  /** Moves the cursor part of the way toward a point. */
  toward(x, y, q) { this.cur.x += (x - this.cur.x) * q; this.cur.y += (y - this.cur.y) * q; }

  /** DOUBLE CLICK: the cursor tracks the nearest player from above (its shadow below), then clicks down twice. */
  atk_click(match, a, out) {
    const k = this.cur, tr = this.sp(CLICK.track), cyc = CLICK.drop + CLICK.hold + 8;
    this.mood = 'angry'; k.mode = 'arrow';
    if (a.t < tr) { const tg = this.nearest(match, k.x); if (tg) { a.tx = Phaser.Math.Clamp(tg.x, -255, 255); } this.toward(a.tx ?? 0, -190, 0.12); a.shadow = true; return false; }
    const q = a.t - tr, i = Math.floor(q / cyc), e = q % cyc;
    if (i >= 2) { a.shadow = false; this.toward(80, -170, 0.1); return a.t > tr + 2 * cyc + 20; }
    if (e < CLICK.drop) { k.y = -190 + (190 - 2) * (e + 1) / CLICK.drop; out.push(this.bhit('click' + a.id + i, k.x - 22, k.y - 30, k.x + 34, k.y + 6, ...CLICK.hit)); }
    else if (e === CLICK.drop) { k.press = 6; sfx('clang', 0.8, 2.2); sfx('hit', 0.6, 1.8); match.shake(6, 6); match.popText({ x: k.x, y: -60 }, 'CLICK!', '#ffffff'); }
    else if (e > CLICK.drop + CLICK.hold) k.y += (-190 - k.y) * 0.4;
    return false;
  }
  /** DRAG SELECT: the cursor drags a dashed selection box over the nearest player; DELETE? flashes; then the box fills with static. */
  atk_drag(match, a, out) {
    const k = this.cur, dr = this.sp(DRAG.drag), wn = this.sp(DRAG.warn);
    this.mood = 'angry';
    if (a.t === 1) { const tg = this.nearest(match, k.x), cx = Phaser.Math.Clamp(tg ? tg.x : 0, -200, 200); a.x0 = cx - 70 - Math.random() * 30; a.y0 = -160; a.x1 = cx + 70 + Math.random() * 30; a.y1 = 0; }
    if (a.t < 16) { this.toward(a.x0, a.y0, 0.3); return false; }
    if (a.t < 16 + dr) { const q = (a.t - 16) / dr; k.x = a.x0 + (a.x1 - a.x0) * q; k.y = a.y0 + (a.y1 - a.y0) * q; this.drag = { x1: a.x0, y1: a.y0, x2: k.x, y2: k.y }; if (a.t % 6 === 0) sfx('menu', 0.3, 1.6); return false; }
    if (a.t < 16 + dr + wn) { this.drag = { x1: a.x0, y1: a.y0, x2: a.x1, y2: a.y1, warn: true }; if (a.t === 16 + dr) { sfx('ding', 0.9, 0.9); match.popText({ x: (a.x0 + a.x1) / 2, y: a.y0 - 6 }, 'DELETE?', '#ffffff'); } return false; }
    if (a.t < 16 + dr + wn + DRAG.fill) { this.drag = { x1: a.x0, y1: a.y0, x2: a.x1, y2: a.y1, fill: true }; out.push(this.bhit('drag' + a.id, a.x0, a.y0, a.x1, a.y1, ...DRAG.hit, { radial: true })); if (a.t === 16 + dr + wn) { sfx('glitch', 1, 1); match.shake(8, 10); } return false; }
    this.drag = null; this.toward(80, -170, 0.1);
    return a.t > 16 + dr + wn + DRAG.fill + 24;
  }
  /** ERROR CASCADE: error dialogs drop onto marks one after another (a chime each) and land on the taskbar as ledges. */
  atk_errors(match, a, out) {
    const n = ERR.n[this.boss.phase - 1];
    this.mood = 'angry'; this.cur.mode = 'wait';
    if (a.t % ERR.every === 1 && a.t < n * ERR.every) { const tg = this.nearest(match), x = Phaser.Math.Clamp((a.t < ERR.every && tg ? tg.x : (Math.random() - 0.5) * 460), -215, 215); this.dropDialog(x, true); sfx('ding', 0.6, 1.1); }
    this.stepErrors(match, out);
    return a.t > n * ERR.every + ERR.warn + 40;
  }
  /** A dialog that will fall on x (boss = its hit is the boss's; else a hazard). */
  dropDialog(x, boss) { this.errs.push({ x, y: -460, t: 0, st: 'mark', id: 'mc-err-' + (++this.uidM || (this.uidM = 1)), life: 0, boss }); }
  /** Dialogs: the mark, the fall (a hit), then lying on the taskbar as a ledge until they close. */
  stepErrors(match, out) {
    for (const d of this.errs) {
      d.t++;
      if (d.st === 'mark' && d.t > (d.boss ? this.sp(ERR.warn) : POPUP.warn)) d.st = 'fall';
      if (d.st === 'fall') {
        d.y += ERR.fall; out.push(this.bhit(d.id, d.x - ERR.w / 2, d.y - ERR.h, d.x + ERR.w / 2, d.y, ...(d.boss ? ERR.hit : POPUP.hit)));
        if (d.y >= 0) { d.y = 0; d.st = 'lie'; sfx('bighit', 0.6, 1.3); match.shake(4, 6); d.plat = { x1: d.x - ERR.w / 2 + 4, x2: d.x + ERR.w / 2 - 4, y: -ERR.h, solid: false, temp: true }; this.platforms.push(d.plat); }
      }
      if (d.st === 'lie' && ++d.life > ERR.life) { d.st = 'close'; d.k = 1; this.platforms = this.platforms.filter((p) => p !== d.plat); sfx('menu', 0.4, 0.8); }
      if (d.st === 'close') { d.k -= 0.12; if (d.k <= 0) d.dead = true; }
    }
    this.errs = this.errs.filter((d) => !d.dead);
  }
  /** SOLITAIRE: cards fly out of its screen one after another and bounce across the taskbar, leaving trails of copies. */
  atk_cards(match, a, out) {
    const n = CARDS.n[this.boss.phase - 1], c = this.core();
    this.mood = 'happy';
    if (a.t % CARDS.every === 1 && a.t < n * CARDS.every) { const s = (a.t / CARDS.every) % 2 < 1 ? -1 : 1; this.cards.push({ x: c.x, y: c.y, vx: s * (2.2 + Math.random() * 2), vy: -3 - Math.random() * 2, trail: [], n: 0, id: 'mc-card-' + (++this.uidM || (this.uidM = 1)), suit: Math.floor(Math.random() * 4) }); sfx('menu', 0.5, 1.4); }
    this.stepCards(match, out);
    return a.t > n * CARDS.every && !this.cards.length;
  }
  /** The cards: gravity, a bounce on the taskbar, a trail; gone off either edge. */
  stepCards(match, out) {
    for (const k of this.cards) {
      k.vy += CARDS.grav; k.x += k.vx; k.y += k.vy;
      if (k.y > -16 && k.vy > 0 && Math.abs(k.x) < 270) { k.y = -16; k.vy = -Math.abs(k.vy) * CARDS.bounce; k.n++; sfx('land', 0.3, 1.5); }
      if (this.t % 2 === 0) { k.trail.push({ x: k.x, y: k.y }); if (k.trail.length > 40) k.trail.shift(); }
      out.push(this.bhit(k.id + k.n, k.x - 11, k.y - 16, k.x + 11, k.y + 16, ...CARDS.hit, { dirX: Math.sign(k.vx) || 1 }));
      if (Math.abs(k.x) > 330 || k.y > 300) k.dead = true;
    }
    this.cards = this.cards.filter((k) => !k.dead);
  }
  /** PIPES (enraged): the old screensaver - pipes grow across the room, turning at right angles; their growing ends hit. */
  atk_pipes(match, a, out) {
    this.mood = 'blank';
    if (a.t === 1) { sfx('limit', 0.6, 0.7); for (let i = 0; i < PIPES.n; i++) { const s = i % 2 ? 1 : -1; this.pipes.push({ pts: [{ x: s * 280, y: -40 - Math.random() * 160 }], dx: -s, dy: 0, n: 0, col: C.pipe[Math.floor(Math.random() * 4)], id: 'mc-pipe-' + (++this.uidM || (this.uidM = 1)), fade: 0 }); } }
    if (a.t % PIPES.every === 0) for (const p of this.pipes) {
      if (p.n >= PIPES.steps) continue;
      const h = p.pts[p.pts.length - 1];
      if (p.n % 6 === 5 || Math.random() < 0.12) { const turn = Math.random() < 0.5; [p.dx, p.dy] = turn ? [p.dy, -p.dx] : [-p.dy, p.dx]; }
      let nx = h.x + p.dx * PIPES.step, ny = h.y + p.dy * PIPES.step;
      if (Math.abs(nx) > 275 || ny > -14 || ny < -280) { p.dx = -p.dx; p.dy = -p.dy; nx = h.x + p.dx * PIPES.step; ny = h.y + p.dy * PIPES.step; }
      p.pts.push({ x: nx, y: ny }); p.n++;
      if (p.n % 4 === 0) sfx('clang', 0.15, 1.4);
    }
    for (const p of this.pipes) { const h = p.pts[p.pts.length - 1]; if (p.n < PIPES.steps) out.push(this.bhit(p.id + Math.floor(p.n / 6), h.x - 14, h.y - 14, h.x + 14, h.y + 14, ...PIPES.hit, { radial: true })); }
    if (this.pipes.every((p) => p.n >= PIPES.steps)) { for (const p of this.pipes) p.fade++; if (this.pipes[0] && this.pipes[0].fade > 40) { this.pipes = []; return true; } }
    return false;
  }
  /** SYSTEM CRASH (enraged): its screen glitches, and blocks of corrupted pixels rain down in marked columns. */
  atk_crash(match, a, out) {
    this.mood = 'glitch';
    if (a.t % CRASH.every === 1 && a.t < CRASH.n * CRASH.every) { const tg = this.nearest(match); this.blocks.push({ x: Phaser.Math.Clamp(a.t < CRASH.every * 2 && tg ? tg.x : (Math.random() - 0.5) * 500, -250, 250), y: -400, t: 0, id: 'mc-blk-' + (++this.uidM || (this.uidM = 1)), c: [0xff00ff, 0x00ffff, 0xffff00, 0x00ff00][Math.floor(Math.random() * 4)] }); sfx('glitch', 0.4, 1.4); }
    for (const b of this.blocks) {
      b.t++; if (b.t < this.sp(CRASH.warn)) continue;
      b.y += 15; if (b.y > -20) out.push(this.bhit(b.id, b.x - 16, b.y - 16, b.x + 16, b.y + 16, ...CRASH.hit));
      if (b.y >= -8) { b.dead = true; sfx('hit', 0.4, 1.6); for (let i = 0; i < 6; i++) match.particles.push({ x: b.x, y: -6, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 16, color: b.c, size: 3 }); }
    }
    this.blocks = this.blocks.filter((b) => !b.dead);
    return a.t > CRASH.n * CRASH.every && !this.blocks.length;
  }
  /** NOT RESPONDING: it freezes - an hourglass cursor, its screen greyed, sagging - and its screen takes x1.7. */
  atk_hang(match, a) {
    if (a.t === 1) { this.hang = this.sp(HANG.dur) + 30; sfx('glitch', 0.8, 0.5); if (this.rageText && !this.boss.rage) { this.rageText.setText('(NOT RESPONDING)'); this.boss.rage = 70; } }
    this.mood = 'hang'; this.cur.mode = 'wait';
    return this.hang <= 0;
  }

  /** Its death: the screen collapses to a line, then a dot (the explosions come from BossArena). */
  onDeath() { this.drag = null; this.cards = []; this.pipes = []; this.blocks = []; this.hang = 0; }

  /**
   * THE ENTRANCE (k = 0..1): the switched-off monitor sits dark; the tower's power light blinks on, it whirs and
   * beeps, the screen warms up from a dot to a line to a picture (a startup screen with a loading bar), its face
   * appears and grins - and its giant cursor slides in and clicks on you: the pose the freeze frame stops on.
   */
  introPose(match, k, t, n) {
    this.t++;
    this.boot = k; this.mood = k > 0.7 ? 'grin' : 'boot';
    if (t === Math.round(0.08 * n)) { sfx('ding', 0.8, 0.5); sfx('rumble', 0.5, 1.6); }
    if (t === Math.round(0.45 * n)) { sfx('ding', 0.9, 1.0); sfx('ding', 0.7, 1.26); sfx('ding', 0.6, 1.5); }
    const e = Phaser.Math.Clamp((k - 0.72) / 0.2, 0, 1);
    this.cur.x = 330 - 260 * (1 - Math.pow(1 - e, 3)); this.cur.y = -120; this.cur.mode = k > 0.9 ? 'hand' : 'arrow';
    if (t === Math.round(0.92 * n)) { this.cur.press = 8; sfx('clang', 0.8, 2.2); }
  }
  /** The entrance's camera: close on its dark screen, pulling back as it boots, wide for the cursor. */
  introShot(k) { const c = this.core(); return k < 0.45 ? { x: c.x, y: c.y + 20, zoom: 1.5 } : k < 0.72 ? { x: c.x, y: c.y + 30, zoom: 1.2 } : { x: 30, y: -140, zoom: 1.0 }; }
  /** The freeze frame: its screen and cursor. */
  introAt() { const c = this.core(); return { x: c.x + 20, y: c.y + 30, zoom: 1.05 }; }
  /** After the intro it's fully booted. */
  endIntro() { super.endIntro(); this.boot = 1; }

  // ------------------------------------------------------------------ hazards (VS too)
  start_popup(match, h) { h.title = 'POP-UP!'; const tg = this.nearest(match); this.dropDialog(Phaser.Math.Clamp(tg ? tg.x : 0, -215, 215), false); }
  /** POP-UP: a window falls on the marked spot and lies there as a ledge (stepErrors does the work). */
  step_popup(match, h, out) { if (!this.boss) this.stepErrors(match, out); return h.t > POPUP.warn + 50; }
  start_dialup(match, h) { h.title = 'DIAL-UP!'; h.y = Math.random() < 0.5 ? -DIAL.h : -130; h.s = Math.random() < 0.5 ? -1 : 1; sfx('glitch', 0.5, 1.8); }
  /** DIAL-UP: a striped band flashes, then a screeching modem beam sweeps across it. */
  step_dialup(match, h, out) {
    if (h.t < DIAL.warn) { this.dial = { y: h.y, warn: h.t / DIAL.warn }; return false; }
    if (h.t < DIAL.warn + DIAL.on) {
      const q = (h.t - DIAL.warn) / DIAL.on, x = h.s * (-300 + 600 * q); this.dial = { y: h.y, x, s: h.s };
      out.push(this.bhit('dial' + h.id + Math.floor(h.t / 10), x - 60, h.y, x + 60, h.y + DIAL.h, ...DIAL.hit, { dirX: h.s }));
      if (h.t % 6 === 0) sfx('laser', 0.3, 0.6 + Math.random());
      return false;
    }
    this.dial = null; return true;
  }

  /** Moves the desktop and BEIGE.EXE one frame; returns hazard + boss hitboxes. */
  step(match) {
    this.t++;
    const out = [];
    this.cycle.run(match, out);
    if (this.boss) {
      this.bossStep(match, out);
      if (this.hang > 0) this.hang--;
      if (this.blue > 0) this.blue--;
      if (this.cur.press > 0) this.cur.press--;
      if (!this.boss.atk || this.boss.atk.name !== 'errors') this.stepErrors(match, out);
      if (!this.boss.atk || this.boss.atk.name !== 'cards') this.stepCards(match, out);
      if (this.boss.dying) this.mood = 'dead';
    }
    return out;
  }

  // ------------------------------------------------------------------ drawing
  /** Draws the machine (monitor + tower + cables), its cursor, dialogs, cards, pipes, blocks, the hazards; the bar. */
  render() {
    const t = this.t, B = this.boss, g = this.monG, x = this.fxG;
    g.clear(); x.clear();
    this.drawMachine(g, B ? B.flash > 0 : false, !B);
    if (this.drag) {                                                                    // the selection box
      const D = this.drag, x1 = Math.min(D.x1, D.x2), x2 = Math.max(D.x1, D.x2), y1 = Math.min(D.y1, D.y2), y2 = Math.max(D.y1, D.y2);
      if (D.fill) { for (let i = 0; i < 40; i++) { x.fillStyle([0xffffff, 0x000000, C.blue][i % 3], 0.6); x.fillRect(x1 + Math.random() * (x2 - x1 - 6), y1 + Math.random() * (y2 - y1 - 6), 6, 6); } x.fillStyle(0xffffff, 0.35); x.fillRect(x1, y1, x2 - x1, y2 - y1); }
      else { x.fillStyle(C.blue, D.warn ? (t % 8 < 4 ? 0.35 : 0.15) : 0.12); x.fillRect(x1, y1, x2 - x1, y2 - y1); }
      const dash = (ax, ay, bx, by) => { const L = Math.hypot(bx - ax, by - ay), n = Math.floor(L / 6); for (let i = 0; i < n; i += 2) { const q1 = i / n, q2 = (i + 1) / n; x.lineStyle(2, i % 4 ? 0xffffff : 0x000000, 1); x.lineBetween(ax + (bx - ax) * q1, ay + (by - ay) * q1, ax + (bx - ax) * q2, ay + (by - ay) * q2); } };
      dash(x1, y1, x2, y1); dash(x2, y1, x2, y2); dash(x2, y2, x1, y2); dash(x1, y2, x1, y1); x.lineStyle(0);
    }
    for (const d of this.errs) this.drawDialog(x, d);
    for (const k of this.cards) { k.trail.forEach((p, i) => { if (i % 3 === 0) this.drawCard(x, p.x, p.y, k.suit, 0.9); }); this.drawCard(x, k.x, k.y, k.suit, 1); }
    for (const p of this.pipes) {                                                        // the screensaver's pipes: shaded tubes with ball joints
      const a = Math.max(0, 1 - p.fade / 40);
      for (const [lw, c, al] of [[16, C.out, 1], [12, p.col, 1], [4, 0xffffff, 0.45]]) { x.lineStyle(lw, c, a * al); for (let i = 1; i < p.pts.length; i++) x.lineBetween(p.pts[i - 1].x, p.pts[i - 1].y - (lw === 4 ? 3 : 0), p.pts[i].x, p.pts[i].y - (lw === 4 ? 3 : 0)); }
      x.lineStyle(0); for (let i = 1; i < p.pts.length - 1; i++) { const q = p.pts[i], pr = p.pts[i - 1], nx = p.pts[i + 1]; if ((q.x - pr.x) * (nx.y - q.y) !== (q.y - pr.y) * (nx.x - q.x)) { x.fillStyle(p.col, a); x.fillCircle(q.x, q.y, 9); x.fillStyle(0xffffff, 0.5 * a); x.fillCircle(q.x - 3, q.y - 3, 3); } }
    }
    for (const b of this.blocks) { if (b.t < this.sp(CRASH.warn)) { x.fillStyle(b.c, 0.3 + 0.3 * (t % 6 < 3 ? 1 : 0)); x.fillRect(b.x - 16, -4, 32, 4); continue; } for (let i = 0; i < 4; i++) { x.fillStyle([b.c, 0x000000, 0xffffff, b.c][i], 1); x.fillRect(b.x - 16 + (i % 2) * 16, b.y - 16 + Math.floor(i / 2) * 16, 16, 16); } }
    if (this.dial) {                                                                     // DIAL-UP: warning stripes, then the screech
      const D = this.dial;
      if (D.warn != null) { for (let sx = -270; sx < 270; sx += 20) { x.fillStyle(t % 10 < 5 ? 0xffff00 : 0x000000, 0.4 * D.warn + 0.1); x.fillTriangle(sx, D.y + DIAL.h, sx + 10, D.y, sx + 20, D.y + DIAL.h); } }
      else for (let i = 0; i < 24; i++) { x.fillStyle([0xffffff, 0x30ff80, 0x00ffff][i % 3], 0.7); x.fillRect(D.x - 60 + Math.random() * 120, D.y + Math.random() * DIAL.h, 3 + Math.random() * 10, 2); }
    }
    if (this.blue > 0 && this.blue % 10 < 5) { x.fillStyle(C.bsod, 0.25 * this.blue / 150); x.fillRect(-700, -700, 1400, 1100); }
    this.drawCursor(x);
    if (B) this.drawBar();
  }
  /** One error dialog: a grey window, navy title bar with an X, a red error icon, two text lines, an OK button. */
  drawDialog(g, d) {
    if (d.st === 'mark') { if (d.t > 0) { g.fillStyle(0xff2020, 0.3 + 0.3 * (this.t % 8 < 4 ? 1 : 0)); g.fillRect(d.x - ERR.w / 2, -4, ERR.w, 4); } return; }
    const k = d.st === 'close' ? Math.max(0, d.k) : 1, w = ERR.w * k, h = ERR.h * k, x = d.x - w / 2, y = d.y - h;
    if (w < 4) return;
    g.fillStyle(C.out, 1); g.fillRect(x - 1, y - 1, w + 2, h + 2); this.bevel(g, x, y, w, h);
    g.fillStyle(C.navy, 1); g.fillRect(x + 3, y + 3, w - 6, 11 * k); this.bevel(g, x + w - 14 * k, y + 4, 10 * k, 9 * k);
    if (k > 0.6) {
      g.fillStyle(0xd01010, 1); g.fillCircle(x + 18, y + 30, 10); g.lineStyle(3, 0xffffff, 1); g.lineBetween(x + 13, y + 25, x + 23, y + 35); g.lineBetween(x + 23, y + 25, x + 13, y + 35); g.lineStyle(0);
      g.fillStyle(C.out, 1); g.fillRect(x + 34, y + 23, 50, 3); g.fillRect(x + 34, y + 30, 38, 3);
      this.bevel(g, x + w / 2 - 16, y + h - 18, 32, 13); g.fillStyle(C.out, 1); g.fillRect(x + w / 2 - 6, y + h - 13, 4, 4); g.fillRect(x + w / 2 + 1, y + h - 13, 5, 4);
    }
  }
  /** A playing card (bouncing in the solitaire cascade): white with a red or black pip. */
  drawCard(g, x, y, suit, a) {
    g.fillStyle(C.out, a); g.fillRect(x - 11, y - 16, 22, 32); g.fillStyle(C.card[0], a); g.fillRect(x - 10, y - 15, 20, 30);
    const col = suit % 2 ? C.card[1] : C.card[2];
    g.fillStyle(col, a);
    if (suit === 1) { g.fillCircle(x - 3, y - 2, 4); g.fillCircle(x + 3, y - 2, 4); g.fillTriangle(x - 7, y, x + 7, y, x, y + 8); }
    else if (suit === 3) { g.fillTriangle(x, y - 8, x + 6, y, x, y + 8); g.fillTriangle(x, y - 8, x - 6, y, x, y + 8); }
    else { g.fillCircle(x, y - 3, 4); g.fillCircle(x - 4, y + 2, 4); g.fillCircle(x + 4, y + 2, 4); g.fillRect(x - 1, y + 2, 2, 7); }
    g.fillRect(x - 8, y - 13, 3, 4);
  }
  /** Its giant cursor: an arrow (white, black outline), a pointing hand, or the hourglass; pressed in when it clicks. */
  drawCursor(g) {
    const k = this.cur, s = 2.6 * (k.press > 0 ? 0.9 : 1), x = k.x, y = k.y;
    if (!this.boss && !this.boot) return;
    if (k.mode === 'wait') {
      const a = (this.t * 0.06) % Math.PI;
      g.fillStyle(C.out, 1); g.fillRect(x - 12, y - 4, 24, 46); g.fillStyle(C.grey[4], 1); g.fillRect(x - 10, y - 2, 20, 42);
      g.fillStyle(C.out, 1); g.fillRect(x - 12, y - 4, 24, 5); g.fillRect(x - 12, y + 37, 24, 5);
      g.fillStyle(0xe8c840, 1); g.fillTriangle(x - 7, y + 4, x + 7, y + 4, x, y + 19); g.fillTriangle(x - 7 * Math.cos(a), y + 36, x + 7 * Math.cos(a), y + 36, x, y + 22);
      return;
    }
    const P = k.mode === 'hand'
      ? [[3, 0], [6, 0], [6, 6], [9, 6], [12, 7], [14, 9], [14, 16], [11, 20], [4, 20], [0, 14], [0, 9], [3, 11]]
      : [[0, 0], [0, 16], [4, 12], [7, 19], [10, 18], [7, 11], [12, 11]];
    g.fillStyle(C.out, 1); g.fillPoints(P.map(([px, py]) => ({ x: x + px * s - 2, y: y + py * s - 2 })), true); g.fillPoints(P.map(([px, py]) => ({ x: x + px * s + 2, y: y + py * s + 2 })), true);
    g.fillStyle(C.grey[4], 1); g.fillPoints(P.map(([px, py]) => ({ x: x + px * s, y: y + py * s })), true);
    if (k.press > 0) { g.lineStyle(2, 0xffffff, k.press / 6); g.strokeCircle(x, y, 20 + (6 - k.press) * 4); g.lineStyle(0); }
    const A = this.boss && this.boss.atk;
    if (A && A.shadow) { g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 10, -2, 40, 8); }
  }
  /**
   * The machine: a beige tower case behind (drive slots, a power light), a fat CRT monitor floating on its stand -
   * beige casing with vents and a badge-less bezel, buttons and a power LED - and on its curved green screen its
   * face, by mood: idle / angry / happy / grin / hang (greyed out, an hourglass) / glitch / blank (the screensaver) /
   * blue (FATAL EXCEPTION: a sad face and error lines) / boot (the intro: off, a dot, a line, a loading bar) / dead.
   */
  drawMachine(g, flash, off) {
    const c = this.core(), sw = MON.sw, sh = MON.sh, b = MON.bez, Bg = flash ? [0xffffff, 0xffffff, 0xffffff, 0xffffff] : C.beige, t = this.t;
    const dk = this.deathK();
    // the tower case behind and to the right
    const tx = 150, ty = -230;
    g.fillStyle(C.out, 1); g.fillRect(tx - 2, ty - 2, 74, 234); g.fillStyle(Bg[1], 1); g.fillRect(tx, ty, 70, 230); g.fillStyle(Bg[2], 1); g.fillRect(tx, ty, 62, 230);
    for (let i = 0; i < 3; i++) { g.fillStyle(C.out, 1); g.fillRect(tx + 8, ty + 14 + i * 22, 46, 14); g.fillStyle(Bg[0], 1); g.fillRect(tx + 9, ty + 15 + i * 22, 44, 12); g.fillStyle(C.out, 1); g.fillRect(tx + 14, ty + 20 + i * 22, 30, 2); }
    g.fillStyle(off ? 0x203020 : (t % 40 < 30 ? 0x30ff60 : 0x108030), 1); g.fillRect(tx + 10, ty + 90, 6, 4); g.fillStyle(0xffa020, off ? 0.2 : (t % 7 < 3 ? 1 : 0.2)); g.fillRect(tx + 20, ty + 90, 6, 4);
    for (let i = 0; i < 8; i++) { g.fillStyle(Bg[0], 1); g.fillRect(tx + 10, ty + 120 + i * 8, 44, 3); }
    // the cable from the monitor to the tower
    g.lineStyle(6, C.out, 1); g.lineBetween(c.x + 60, c.y + sh / 2 + b + 30, tx + 30, ty + 200); g.lineStyle(4, C.grey[1], 1); g.lineBetween(c.x + 60, c.y + sh / 2 + b + 30, tx + 30, ty + 200); g.lineStyle(0);
    // the stand
    g.fillStyle(C.out, 1); g.fillRect(c.x - 26, c.y + sh / 2 + b - 4, 52, 34); g.fillStyle(Bg[1], 1); g.fillRect(c.x - 24, c.y + sh / 2 + b - 2, 48, 30);
    g.fillStyle(C.out, 1); g.fillEllipse(c.x, c.y + sh / 2 + b + 32, 130, 22); g.fillStyle(Bg[2], 1); g.fillEllipse(c.x, c.y + sh / 2 + b + 30, 124, 18);
    // the CRT's deep back, then the bezel
    g.fillStyle(C.out, 1); g.fillRoundedRect(c.x - sw / 2 - b + 16, c.y - sh / 2 - b - 10, sw + b * 2 - 32, sh + b * 2 + 14, 14); g.fillStyle(Bg[0], 1); g.fillRoundedRect(c.x - sw / 2 - b + 18, c.y - sh / 2 - b - 8, sw + b * 2 - 36, 20, 10);
    g.fillStyle(C.out, 1); g.fillRoundedRect(c.x - sw / 2 - b - 2, c.y - sh / 2 - b - 2, sw + b * 2 + 4, sh + b * 2 + 22, 10);
    g.fillStyle(Bg[1], 1); g.fillRoundedRect(c.x - sw / 2 - b, c.y - sh / 2 - b, sw + b * 2, sh + b * 2 + 18, 9);
    g.fillStyle(Bg[3], 1); g.fillRoundedRect(c.x - sw / 2 - b + 3, c.y - sh / 2 - b + 3, sw + b * 2 - 6, 8, 4);
    g.fillStyle(Bg[2], 1); g.fillRect(c.x - sw / 2 - b + 3, c.y - sh / 2 - b + 10, sw + b * 2 - 6, sh + b * 2 - 6);
    g.fillStyle(Bg[0], 1); for (let i = 0; i < 5; i++) g.fillRect(c.x - sw / 2 + 6 + i * 6, c.y + sh / 2 + b + 4, 3, 8);       // vents
    g.fillStyle(C.out, 1); g.fillCircle(c.x + sw / 2 - 2, c.y + sh / 2 + b + 8, 5); g.fillStyle(Bg[1], 1); g.fillCircle(c.x + sw / 2 - 2, c.y + sh / 2 + b + 8, 4);
    g.fillStyle(off ? 0x203020 : 0x30ff60, 1); g.fillRect(c.x + sw / 2 - 16, c.y + sh / 2 + b + 6, 5, 3);
    // the screen
    const x0 = c.x - sw / 2, y0 = c.y - sh / 2;
    g.fillStyle(C.out, 1); g.fillRoundedRect(x0 - 3, y0 - 3, sw + 6, sh + 6, 10);
    const blue = this.blue > 0 || (this.boss && this.boss.phase === 2 && this.mood !== 'grin' && this.mood !== 'blank' && this.mood !== 'glitch' && this.t % 300 < 20);
    let bgc = C.screen[0];
    if (off || this.mood === 'dead') bgc = 0x101810; else if (this.mood === 'hang') bgc = 0x3a4a40; else if (blue) bgc = C.bsod; else if (this.mood === 'blank') bgc = 0x000000;
    g.fillStyle(bgc, 1); g.fillRoundedRect(x0, y0, sw, sh, 8);
    const px = (gx, gy, w = 1, h = 1, col = C.screen[2]) => { g.fillStyle(col, 1); g.fillRect(x0 + 15 + gx * 6, y0 + 10 + gy * 6, w * 6, h * 6); };   // the face's 20x15 pixel grid
    const boot = this.boot ?? 1;
    if (off) { g.fillStyle(0xffffff, 0.08); g.fillRoundedRect(x0 + 10, y0 + 8, 50, 26, 8); }
    else if (this.mood === 'dead') { const k = 1 - dk; g.fillStyle(0xffffff, 1); g.fillRect(c.x - sw / 2 * k, c.y - 1, sw * k, 2); }
    else if (boot < 0.45) {                                                              // booting: off, a dot, a line
      const q = boot / 0.45;
      if (q > 0.3) { g.fillStyle(0xffffff, 1); const w = q < 0.6 ? 4 : sw * (q - 0.6) / 0.4; g.fillRect(c.x - w / 2, c.y - 1, w, q < 0.6 ? 4 : 2); }
    } else if (boot < 0.7) {                                                             // the startup screen: a loading bar
      const q = (boot - 0.45) / 0.25;
      g.fillStyle(C.navy, 1); g.fillRoundedRect(x0, y0, sw, sh, 8); g.fillStyle(0xffffff, 1); g.fillRect(c.x - 22, c.y - 30, 44, 4); g.fillRect(c.x - 14, c.y - 20, 28, 4);
      g.fillStyle(C.grey[2], 1); g.fillRect(c.x - 50, c.y + 20, 100, 10); g.fillStyle(C.blue, 1); for (let i = 0; i < Math.floor(q * 12); i++) g.fillRect(c.x - 48 + i * 8, c.y + 22, 6, 6);
    } else if (blue) {                                                                   // FATAL EXCEPTION
      const W = 0xffffff; px(2, 2, 2, 2, W); px(2, 6, 2, 2, W); px(7, 2, 1, 6, W); px(8, 2, 2, 1, W); px(8, 7, 2, 1, W);   // a ":("
      for (let i = 0; i < 5; i++) px(2, 10 + i, 6 + ((i * 7) % 10), 0.4, W);
    } else if (this.mood === 'hang') {
      px(4, 3, 3, 3, C.grey[2]); px(13, 3, 3, 3, C.grey[2]); px(6, 10, 8, 1, C.grey[2]);
      g.fillStyle(0xffffff, 0.2); g.fillRect(x0, y0 + ((t * 3) % sh), sw, 3);
    } else if (this.mood === 'blank') {
      for (let i = 0; i < 20; i++) { g.fillStyle(0xffffff, 0.6); g.fillRect(x0 + ((i * 37 + t) % sw), y0 + ((i * 53) % sh), 2, 2); }
    } else if (this.mood === 'glitch') {
      for (let i = 0; i < 14; i++) { g.fillStyle([0xff00ff, 0x00ffff, 0xffff00, 0x30ff80][i % 4], 0.8); g.fillRect(x0 + Math.random() * (sw - 20), y0 + Math.random() * (sh - 8), 10 + Math.random() * 30, 4 + Math.random() * 6); }
    } else {                                                                              // its face
      const m = this.mood, blink = t % 140 < 6;
      if (m === 'angry') { px(3, 3, 4, 1); px(13, 3, 4, 1); px(4, 4, 3, 2); px(13, 4, 3, 2); px(6, 11, 8, 1); px(5, 12, 1, 1); px(14, 12, 1, 1); }
      else {
        if (blink) { px(4, 5, 3, 1); px(13, 5, 3, 1); } else { px(4, 3, 3, 3); px(13, 3, 3, 3); px(5, 4, 1, 1, C.screen[3]); px(14, 4, 1, 1, C.screen[3]); }
        if (m === 'grin' || m === 'happy') { px(4, 9, 12, 1); px(5, 10, 10, 1); px(7, 11, 6, 1); px(6, 10, 8, 1, 0x0a2a1a); for (let i = 0; i < 4; i++) px(6 + i * 2, 10, 1, 1, C.screen[3]); }
        else { px(5, 10, 1, 1); px(6, 11, 8, 1); px(14, 10, 1, 1); }
      }
    }
    if (!off) { for (let y = y0; y < y0 + sh; y += 3) { g.fillStyle(0x000000, 0.12); g.fillRect(x0, y, sw, 1); } }   // scanlines
    g.fillStyle(0xffffff, 0.1); g.fillRoundedRect(x0 + 8, y0 + 6, sw * 0.45, sh * 0.25, 8);                         // the glass's shine
  }
}

/** THE DESKTOP's miniature for the stage select screen. */
export function drawDesktopPreview(g, x, y, w, h) {
  g.fillStyle(C.teal[1], 1); g.fillRect(x, y, w, h);
  g.fillStyle(C.grey[2], 1); g.fillRect(x, y + h * 0.82, w, h * 0.18); g.fillStyle(C.grey[4], 1); g.fillRect(x, y + h * 0.82, w, 1);
  g.fillStyle(C.grey[3], 1); g.fillRect(x + 2, y + h * 0.85, w * 0.12, h * 0.12);
  const cx = x + w * 0.5, cy = y + h * 0.4;
  g.fillStyle(C.beige[1], 1); g.fillRect(cx - w * 0.2, cy - h * 0.3, w * 0.4, h * 0.5); g.fillRect(cx - w * 0.06, cy + h * 0.2, w * 0.12, h * 0.1);
  g.fillStyle(C.screen[0], 1); g.fillRect(cx - w * 0.15, cy - h * 0.24, w * 0.3, h * 0.36);
  g.fillStyle(C.screen[2], 1); g.fillRect(cx - w * 0.08, cy - h * 0.14, 3, 3); g.fillRect(cx + w * 0.05, cy - h * 0.14, 3, 3); g.fillRect(cx - w * 0.08, cy, w * 0.16, 2);
  g.fillStyle(0xffffff, 1); g.fillTriangle(x + w * 0.75, y + h * 0.3, x + w * 0.75, y + h * 0.52, x + w * 0.82, y + h * 0.46);
  for (const s of [0.08, 0.72]) { g.fillStyle(C.grey[2], 1); g.fillRect(x + w * s, y + h * 0.5, w * 0.2, h * 0.25); g.fillStyle(C.navy, 1); g.fillRect(x + w * s, y + h * 0.5, w * 0.2, 3); }
}
