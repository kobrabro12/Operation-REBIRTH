// THE DEVOTED's mechanics (def.devoted, devoted.js): her SYMBOL, the DEVOTION meter, PRAY (down special) and
// the four SLUDGE STAGES she climbs, the sludge stains she leaves on the stage (match.sludgeStains), and her Limit
// FEED THE DARK (and her old one, BLACK TIDE). Mixed into Fighter like the other fighter*.js files.
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { showFighter } from './roster.js';
import { drawDemonFace } from './entities.js';
import { skinTexture, skinInfo } from './skins.js';

const STAGE_DIRS = ['', 'semi', 'taken', 'drowned'];

const SLUDGE = [0x060508, 0x0e0c12, 0x1a1720];

/** THE DEVOTED's methods (symbol, devotion, PRAY, sludge stages, stains, BLACK TIDE), attached to Fighter. */
export class FighterDevoted {
  /**
   * Every frame for THE DEVOTED: sets her up the first time, puts her symbol down where she first lands after
   * (re)spawning, keeps DROWNED's wing jumps, and drips / stains sludge at the rate her stage gives.
   */
  devotedTick() {
    const D = this.def.devoted, m = this.match;
    if (this.sludge === undefined) {
      this.sludge = 0; this.devotion = 0; this.sigil = null; this.sigilWait = true;
      this.sigilG = this.scene.add.graphics(); m.addWorld(this.sigilG);
      if (!m.sludgeStains) { m.sludgeStains = []; m.sludgeG = this.scene.add.graphics(); m.addWorld(m.sludgeG); this.stainOwner = true; }
      this.setSludge(0);
    }
    if (this.state === 'respawn') this.sigilWait = true;
    else if (this.sigilWait && this.grounded && this.platform && this.alive) {       // her symbol appears where she lands
      this.sigilWait = false;
      this.sigil = { x: this.x, y: this.y, plat: this.platform, dx: this.x - this.platform.x1, born: this.age };
      sfx('curse', 0.4, 1.4); m.puff(this.x, this.y - 20, 0x3a3028, 10);   // (the dying tree grows there)
    }
    if (this.sigil && this.sigil.plat) { this.sigil.x = this.sigil.plat.x1 + this.sigil.dx; this.sigil.y = this.sigil.plat.y; }   // (riding a moving platform)
    if (this.swimCd > 0) this.swimCd--;
    if (this.sludge >= 3 && this.grounded) this.jumpsLeft = Math.max(this.jumpsLeft, D.wingJumps);
    if (this.sludge >= 3) {                                   // DROWNED: holding jump on the way down hangs her in the air
      if (this.grounded) this.hoverLeft = D.hover.hold;
      else if ((this.state === 'air' || this.state === 'attack') && this.ctrl.held('jump') && this.vy > -0.5 && this.hoverLeft > 0) {
        this.hoverLeft--; this.vy = Math.min(this.vy, D.hover.sink);   // (hangs there, sinking slowly - it never climbs)
        if (this.age % 5 === 0 && !m.demo) { const R = Math.random; m.particles.push({ x: this.x - this.facing * 16 + (R() - 0.5) * 16, y: this.y - 30, vx: -this.facing * 0.4, vy: 1.2 + R(), life: 16, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.1 }); }
      }
    }
    if (this.state !== 'attack') this.perfectHit = this.perfectSeen = false;   // THE WRAITH's PERFECT STEP: an attack started just after a swap hits harder
    else if (!this.perfectSeen) { this.perfectSeen = true; this.perfectHit = this.perfectUntil > this.age && this.moveName !== 'neutralB'; if (this.perfectHit) { sfx('shing', 0.5, 1.3); this.match.popText(this, 'PERFECT', '#f4eefc'); } }
    if (this.state === 'hitstun' && this.demon && this.demon.alive && this.demon.kind === 'wraith' && this.buffer.special) {   // THE WRAITH: SHADOW BREAK out of a combo
      if (this.demon.breakOut()) this.buffer.special = 0;
    }
    if (this.cutFx) {                                       // CROSS CUTS' marks hang where they hit until the combo's over
      const chain = this.state === 'attack' && this.move && this.move.cut;
      if (!chain) { for (const c of this.cutFx) c.age++; this.cutFx = this.cutFx.filter((c) => c.age < 16); }
    }
    const U = this.def.moves.upb;
    if (this.state === 'upb' && U.geyser && this.t <= U.riseAt + U.geyser.length && !m.demo) {   // SLUDGE GEYSER: the column of sludge under her
      const R = Math.random, gx = this.t <= U.riseAt ? this.x : this.geyserX;
      if (this.t === U.riseAt) {
        this.geyserX = this.x; sfx('bighit', 0.6, 0.55); sfx('curse', 0.4, 0.7); m.shake(4, 8);
        if (this.platform || this.lastPlatform) this.stain(this.x, this.platform || this.lastPlatform, 8 + this.sludge * 2);
      }
      if (this.t >= U.riseAt) for (let i = 0; i < 3; i++) m.particles.push({ x: gx + (R() - 0.5) * 14, y: (this.geyserY ?? this.y) - R() * 6, vx: (R() - 0.5) * 0.8, vy: -5 - R() * 4, life: 16 + R() * 8, color: SLUDGE[i % 3], size: 3, grav: 0.3 });
      if (this.t === U.riseAt) this.geyserY = this.y;
    }
    if (this.grounded && this.platform) this.lastPlatform = this.platform;
    const every = D.stainEvery[this.sludge];
    const under = this.state === 'sludgeswim';           // (under the sludge she only swims in what's there - she doesn't spread it)
    if (every && !under && this.grounded && this.platform && this.age % every === 0) this.stain(this.x + (Math.random() - 0.5) * 10, this.platform, 3 + this.sludge * 2);
    const drip = D.dripEvery[this.sludge];
    if (drip && !under && this.age % drip === 0 && !m.demo) {
      const R = Math.random;
      m.particles.push({ x: this.x + (R() - 0.5) * 18, y: this.y - 10 - R() * 36, vx: (R() - 0.5) * 0.3, vy: 0.3, life: 30, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.16 });
    }
  }

  /**
   * DEMONS (neutral special, like Shulk's Monado Arts): stops her to choose a demon from the wheel (state demonpick).
   */
  startDemonPick() {
    this.setState('demonpick'); this.pickSel = 0; this.pickDir = 99; this.vx *= 0.3;
    const all = this.def.demons.list.slice();                 // the wheel offers a different few each time
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    this.pickList = all.slice(0, this.def.demons.offer);
    sfx('curse', 0.5, 0.7); sfx('select', 0.3, 0.6);
    if (!this.pickText) { this.pickText = this.scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '6px', color: '#f4eefc', align: 'center', stroke: '#0b0a14', strokeThickness: 3, lineSpacing: 3 }).setOrigin(0.5).setDepth(31); this.match.addWorld(this.pickText); }
  }

  /**
   * Every frame on the wheel: she hangs still (falling slowly in the air); tapping the stick turns the wheel, special or
   * attack calls it, shield backs out. If she waits too long it calls the one she's pointing at.
   * @param {object} c - her controller
   */
  st_demonpick(c) {
    const L = this.pickList, n = L.length;
    this.vx *= 0.8; if (!this.grounded) this.vy = Math.min(this.vy, 1.2);
    const dir = Math.abs(c.x) > 0.5 ? Math.sign(c.x) : Math.abs(c.y) > 0.5 ? Math.sign(c.y) : 0;   // right / down = next round the wheel, left / up = back
    if (dir && dir !== this.pickDir) { this.pickSel = (this.pickSel + dir + n) % n; sfx('menu', 0.35, 1.3); }
    this.pickDir = dir;
    const pick = L[this.pickSel];
    this.pickText.setText(pick.name + '\n' + pick.power).setPosition(Math.round(this.x), Math.round(this.y - 116));
    this.buffer.jump = 0;                                    // (up on the stick is a direction here, not a jump)
    if (c.held('shield')) { this.setState(this.grounded ? 'idle' : 'air'); return; }
    if (this.buffer.special || this.buffer.attack || this.t > this.def.demons.pickFor) {
      this.buffer.special = this.buffer.attack = 0;
      this.demon = this.match.spawnDemon(this, pick);
      this.match.popText(this, pick.name, '#c890ff'); sfx('roar', 0.35, 1.2); this.match.shake(3, 8);
      this.setState(this.grounded ? 'idle' : 'air');
    }
  }

  /** Her neutral special with a demon out: it attacks (if it's ready). */
  demonCommand() {
    if (this.demon && this.demon.alive) this.demon.attack();
  }

  /**
   * The demon wheel round her while she chooses: five demon faces in a ring, the one she's pointing at big and lit,
   * a dark circle behind, and the name + power of the chosen one over her head.
   */
  drawDemonWheel(g) {
    const L = this.pickList || this.def.demons.list.slice(0, 5), n = L.length, cx = this.x, cy = this.y - 34, R = 46, k = Math.min(1, this.t / 8);
    g.fillStyle(0x0b0a14, 0.55 * k); g.fillCircle(cx, cy, R + 18);
    g.lineStyle(2, 0x4a3248, 0.9 * k); g.strokeCircle(cx, cy, R + 18);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / n, x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k, on = i === this.pickSel;
      g.fillStyle(on ? L[i].color : 0x1a1418, 1); g.fillCircle(x, y, on ? 15 : 11);
      g.lineStyle(on ? 2 : 1, on ? 0xf4eefc : L[i].color, 1); g.strokeCircle(x, y, on ? 15 : 11);
      drawDemonFace(g, L[i].kind, x, y, on ? 1 : 0.75, this.age);
    }
  }

  /**
   * CROSS CUTS: a cut connected - its mark moves onto the spot where it hit them.
   * @param {object} t - who it hit
   */
  cutLanded(t) {
    const c = this.cutFx && this.cutFx[this.cutFx.length - 1];
    if (!c || c.age > 0) return;
    if (this.move.cut === 9) { const o = this.cutFx[this.cutFx.length - 2]; if (o) { o.x = t.x; o.y = t.y - t.body.h / 2; } }
    c.x = t.x; c.y = t.y - t.body.h / 2;
  }

  /**
   * THE MAW (neutral special): flings sludge at the floor ahead (further with forward held) - where it lands, a jaw of
   * sludge will snap up (`SludgeMaw` in entities.js). It needs floor under that spot (the nearest platform below).
   */
  throwMaw(M) {
    const st = this.sludge || 0, far = this.ctrl.x * this.facing > 0.5 ? M.far : 0, x = this.x + this.facing * (M.dist[st] + far);
    sfx('swing', 0.5, 0.6); sfx('curse', 0.3, 1.4);
    let plat = null;
    for (const p of this.match.stage.platforms) if (x >= p.x1 + 4 && x <= p.x2 - 4 && p.y >= this.y - 40 && (!plat || p.y < plat.y)) plat = p;
    const R = Math.random;
    for (let i = 0; i < 8; i++) this.match.particles.push({ x: this.x + this.facing * 12, y: this.y - 36, vx: this.facing * (2 + R() * 3), vy: -1 + R() * 2, life: 16, color: SLUDGE[i % 3], size: 2, grav: 0.25 });
    if (plat) this.match.spawnMaw(this, plat, x, { ...M, r: M.r[st], hit: { ...M.hit, dmg: M.hit.dmg + M.perStage * st } });
  }

  /**
   * OFFERING (old neutral special, unused now): flings globs of sludge from her cut palm - more of them, fanned out, at each stage
   * (`glob.count[stage]`), each one a little harder (`glob.perStage` extra damage per stage).
   */
  throwGlobs(G) {
    const n = G.count[this.sludge || 0], hit = { ...G.hit, dmg: G.hit.dmg + G.perStage * (this.sludge || 0) };
    sfx('swing', 0.5, 0.7); sfx('curse', 0.25, 1.6);
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0 : i / (n - 1) - 0.5;                    // fanned: -0.5 .. 0.5
      this.match.spawnGlob(this, { ...G, hit }, this.facing * (G.speed + k * G.fan), G.lift - k * G.fan * 0.8);
    }
  }

  /** Switches her look, stats and powers to a sludge stage (0 DEFAULT - 3 DROWNED). */
  setSludge(n) {
    const D = this.def.devoted;
    this.sludge = n;
    const set = skinInfo(this.def.id, this.skin || 0).sheetSet, cs = set && this.def.costumeSheets && this.def.costumeSheets[set];
    if (cs) this.sheets = Object.fromEntries(['idle', 'run', 'jump', 'fall', 'moves'].map((k) => [k, cs[(n ? STAGE_DIRS[n] + '_' : '') + k]]));   // (a drawn costume: its own strips for this stage)
    else this.sheets = Object.fromEntries(Object.entries(this.def.sludgeSheets[n]).map(([k, key]) => [k, skinTexture(this.scene, key, this.def.id, this.skin)]));   // (in her costume's colours)
    this.devoteDmg = D.dmg[n]; this.devoteSpeed = D.speed[n]; this.devoteKb = D.kb[n];
    this.demonFloat = n >= 3 ? D.hover.float : null;          // DROWNED hovers like a demon
  }

  /** A hit she landed: one more toward her next stage. Says PRAY when the meter is full. */
  addDevotion(n = 1) {
    const D = this.def.devoted;
    if (this.demon && this.demon.alive) this.demon.ownerHit();        // (her demon's power: THE GLUTTON heals her...)
    if (this.demon && this.demon.alive && this.demon.kind === 'weeper' && (this.weepHits = (this.weepHits || 0) + 1) % 2 === 0) n++;   // (...THE WEEPER doubles every second hit)
    if (this.sludge === undefined || this.sludge >= 3) return;
    const need = D.need[this.sludge], was = this.devotion;
    this.devotion = Math.min(need, this.devotion + n);
    if (was < need && this.devotion >= need) { this.match.popText(this, 'PRAY', '#f8f4ec'); sfx('limitready', 0.45, 0.6); }
  }

  /** True when praying right now would take her up a stage: devotion full, near her symbol, standing. */
  canAscend() {
    const D = this.def.devoted;
    if (this.sludge >= 3 || this.devotion < D.need[this.sludge] || !this.sigil || !this.grounded) return false;
    return Math.abs(this.x - this.sigil.x) <= D.range && Math.abs(this.y - this.sigil.y) <= 40;
  }

  /**
   * PRAY (her down special, run from st_attack while the downB move plays): decides on the first frame whether
   * the prayer is answered; an answered one takes her up a stage on `ascendAt`, an unanswered one ends early.
   */
  prayTick() {
    const D = this.def.devoted, m = this.match;
    this.vx *= 0.7;
    if (this.t === 1) {
      this.prayAnswered = this.canAscend();
      if (!this.prayAnswered) {
        const why = this.sludge >= 3 ? 'NOTHING LEFT' : this.devotion < D.need[this.sludge] ? 'NOT YET' : !this.sigil ? '...' : 'TOO FAR';
        m.popText(this, why, '#8a8494'); sfx('curse', 0.25, 0.8);
      } else { sfx('curse', 0.6, 0.6); this.match.shake(3, 20); }
    }
    if (this.t === D.stabAt) {                            // the karambit hits the ground: a thud and a splash of sludge
      const kx = this.x + this.facing * 14, R = Math.random;
      sfx('hit', 0.5, 0.6); sfx('clang', 0.25, 0.7); m.shake(this.prayAnswered ? 4 : 2, 6);
      for (let i = 0; i < 10; i++) m.particles.push({ x: kx, y: this.y - 2, vx: (R() - 0.5) * 3, vy: -1 - R() * 2.5, life: 22, color: SLUDGE[i % 3], size: 2, grav: 0.2 });
      if (this.platform) this.stain(kx, this.platform, 4 + this.sludge * 2);
    }
    if (this.prayAnswered) {
      if (this.t < D.ascendAt && this.t % 3 === 0) {      // the sludge rises out of the floor round her
        const R = Math.random;
        m.particles.push({ x: this.x + (R() - 0.5) * 40, y: this.y, vx: 0, vy: -1 - R() * 1.5, life: 24, color: SLUDGE[Math.floor(R() * 3)], size: 3, grav: -0.02 });
      }
      if (this.t === D.ascendAt) this.ascend();
    } else if (this.t >= D.failLength) this.setState(this.grounded ? 'idle' : 'air');
  }

  /** Goes up a sludge stage: the new look and stats, an empty meter, a burst of sludge staining the floor. */
  ascend() {
    const D = this.def.devoted, m = this.match;
    this.setSludge(Math.min(3, this.sludge + 1)); this.devotion = 0;
    m.popText(this, D.names[this.sludge], '#f8f4ec');
    sfx('bighit', 0.8, 0.5); sfx('curse', 0.8, 0.45); m.shake(8, 14);
    const R = Math.random;
    for (let i = 0; i < 26; i++) m.particles.push({ x: this.x, y: this.y - 28, vx: (R() - 0.5) * 7, vy: -2 - R() * 4, life: 34, color: SLUDGE[i % 3], size: 3, grav: 0.22 });
    m.particles.push({ shape: 'ring', x: this.x, y: this.y - 28, vx: 0, vy: 0, life: 16, maxLife: 16, r: 10, dr: 5, color: 0x2e2a38, grav: 0 });
    if (this.platform) for (let i = 0; i < 4 + this.sludge * 2; i++) this.stain(this.x + (R() - 0.5) * (40 + this.sludge * 20), this.platform, 4 + this.sludge * 2);
  }

  /**
   * Leaves a sludge stain on a platform at x (grows a stain that's already there). Stains are kept in
   * match.sludgeStains = [{ plat, dx, w, owner, age }] so a later mechanic can read them.
   */
  stain(x, plat, w) {
    const m = this.match, S = m.sludgeStains;
    if (!S || !plat || x < plat.x1 || x > plat.x2) return;
    const dx = x - plat.x1, near = S.find((s) => s.plat === plat && Math.abs(s.dx - dx) < 6);
    if (near) { near.w = Math.min(40, near.w + 1); return; }
    S.push({ plat, dx, w, owner: this, age: this.age });
    if (S.length > this.def.devoted.maxStains) S.shift();
  }

  /** Draws her symbol (the dying tree) and (for the first DEVOTED) every sludge stain. Her meter is on the HUD (drawDevotionHud). */
  drawDevoted() {
    if (this.sludge === undefined) return;
    const g = this.sigilG, D = this.def.devoted, m = this.match;
    g.clear();
    if (this.stainOwner) {
      const sg = m.sludgeG; sg.clear();
      for (const s of m.sludgeStains) {
        const x = s.plat.x1 + s.dx, y = s.plat.y;
        sg.fillStyle(0x060508, 0.92); sg.fillEllipse(x, y + 1, s.w * 2, 3 + s.w * 0.12);
        sg.fillStyle(0x2e2a38, 0.6); sg.fillRect(x - s.w * 0.4, y, Math.max(1, s.w * 0.3), 1);   // an oily sheen
      }
      for (const f of this.sludgeFalls()) {                 // INK FALLS pouring off the edges
        const x = f.x + f.side * 2, len = f.bot - f.top, a = this.age;
        sg.fillStyle(0x060508, 0.92); sg.fillRect(x - 3, f.top, 6, len - 10);
        sg.fillStyle(0x0e0c12, 0.9); sg.fillRect(x - 4 + f.side * 2, f.top, 3, len * 0.6);
        sg.fillStyle(0x4a3248, 0.8); sg.fillRect(x - 1, f.top + ((a * 2) % len), 1, 10);      // a purple sheen running down it
        sg.fillStyle(0x4a3248, 0.5); sg.fillRect(x + 1, f.top + ((a * 2 + len / 2) % len), 1, 6);
        for (let i = 0; i < 3; i++) {                       // drips falling off the bottom
          const d = (a * 1.5 + i * 23) % 40;
          sg.fillStyle(0x060508, 1 - d / 40); sg.fillRect(x - 1, f.bot - 10 + d, 2, 3);
        }
      }
    }
    if (this.cutFx) for (const c of this.cutFx) {         // CROSS CUTS: the slashes left hanging where they hit
      const flash = c.age > 0 && c.age < 4, k = c.age < 4 ? 1 : 1 - (c.age - 4) / 12, dx = Math.cos(c.a) * c.len / 2, dy = Math.sin(c.a) * c.len / 2;
      const jit = c.age === 0 ? Math.sin(this.age * 0.8 + c.x) * 0.6 : 0;
      g.lineStyle((flash ? 8 : 5) * k, flash ? 0xf4eefc : 0x7a2ad8, (flash ? 0.9 : 0.75) * k); g.lineBetween(c.x - dx, c.y - dy + jit, c.x + dx, c.y + dy + jit);
      g.lineStyle(2 * k, flash ? 0x7a2ad8 : 0xf4eefc, k); g.lineBetween(c.x - dx, c.y - dy + jit, c.x + dx, c.y + dy + jit);
      if (c.age === 0) { g.fillStyle(0xf4eefc, 0.6); g.fillCircle(c.x + dx * Math.sin(this.age * 0.3), c.y + dy * Math.sin(this.age * 0.3), 1.5); }   // a glint running along it
    }
    if (this.state === 'demonpick') this.drawDemonWheel(g);
    if (this.pickText) this.pickText.setVisible(this.state === 'demonpick' && this.alive);
    const ready = this.sludge < 3 && this.devotion >= D.need[this.sludge];
    if (this.sigil) this.drawTree(g, this.sigil.x, this.sigil.y, Math.min(1, (this.age - this.sigil.born) / 30), ready);
  }

  /** The stain right under x on platform plat (any DEVOTED's) - inside the puddle you can see - or null. */
  stainAt(x, plat) {
    const S = this.match.sludgeStains;
    if (!S || !plat) return null;
    return S.find((s) => s.plat === plat && Math.abs(x - (plat.x1 + s.dx)) <= s.w * 0.85) || null;
  }

  /**
   * The INK FALLS: where a stain reaches a platform's edge, the sludge pours off it in a column down the side.
   * Worked out from the stains every frame. Returns [{ plat, side (-1 left / 1 right), x, top, bot }].
   */
  sludgeFalls() {
    const m = this.match, S = m.sludgeStains, W = this.def.moves.downB.swim;
    if (!S) return [];
    if (m.sludgeFallsAt === this.age && m.sludgeFallsBy === this) return m.sludgeFallsCache;
    const out = [];
    for (const s of S) {
      const p = s.plat, wide = p.x2 - p.x1;
      for (const side of [-1, 1]) {
        if (side < 0 ? s.dx - s.w > 2 : s.dx + s.w < wide - 2) continue;
        if (out.some((f) => f.plat === p && f.side === side)) continue;
        out.push({ plat: p, side, x: side < 0 ? p.x1 : p.x2, top: p.y, bot: (p.solid ? p.bottom ?? p.y + 40 : p.y) + W.fallLength });
      }
    }
    m.sludgeFallsAt = this.age; m.sludgeFallsBy = this; m.sludgeFallsCache = out;
    return out;
  }

  /** The ink fall she's touching in the air (within reach of its column), or null. */
  fallNear() {
    if (this.grounded) return null;
    return this.sludgeFalls().find((f) => Math.abs(this.x - (f.x + f.side * this.body.w / 2)) < 24 && this.y > f.top + 4 && this.y - this.body.h < f.bot) || null;
  }

  /** SLUDGE SWIM: can down special sink her into the sludge here? (standing in a stain, or in the air by an ink fall - and not able to go up a stage) */
  canSwim() {
    if (this.swimCd > 0 || this.canAscend()) return false;
    if (this.grounded) return !!(this.platform && this.stainAt(this.x, this.platform));
    return !!this.fallNear();
  }

  /** Sinks her into the sludge (state sludgeswim), or into the ink fall she's next to (state sludgeclimb). */
  startSwim() {
    const fall = this.fallNear();
    if (fall) { this.enterFall(fall, this.y); return; }
    this.setState('sludgeswim'); this.vx = 0; this.swimFrom = this.x;
    sfx('geyser', 0.3, 1.4); sfx('curse', 0.2, 1.6);
    const R = Math.random;
    for (let i = 0; i < 10; i++) this.match.particles.push({ x: this.x + (R() - 0.5) * 20, y: this.y - 2, vx: (R() - 0.5) * 2.5, vy: -1 - R() * 2, life: 18, color: SLUDGE[i % 3], size: 2, grav: 0.2 });
  }

  /**
   * Every frame under the sludge: slides along the stains on her platform with the stick (stopping at their edge),
   * can't be hit, and bursts out with jump / attack / special, or when she's been under too long or lost the floor.
   * @param {object} c - her controller
   */
  st_sludgeswim(c) {
    const W = this.def.moves.downB.swim, m = this.match, plat = this.platform, R = Math.random;
    this.vx = 0;
    if (!this.grounded || !plat) { this.swimCd = W.cooldown; this.setState('air'); return; }
    if (this.t <= W.sink) return;
    this.invincible = Math.max(this.invincible, 2);
    if (Math.abs(c.x) > 0.2) {
      this.facing = Math.sign(c.x);
      const nx = Math.max(plat.x1 + 1, Math.min(plat.x2 - 1, this.x + c.x * W.speed * this.speedMult));   // (she stays on the platform...)
      const fall = this.sludgeFalls().find((f) => f.plat === plat && f.side === Math.sign(c.x));
      if (fall && Math.abs(nx - fall.x) < 3) { this.enterFall(fall, plat.y + 8); return; }   // (...unless an ink fall takes her over the edge)
      if (this.stainAt(nx, plat)) this.x = nx;             // (never out past the sludge's edge)
      else for (let k = 1; k <= 6; k++) { const px = this.x + Math.sign(c.x) * k; if (this.stainAt(px, plat)) this.x = px; else break; }
      if (this.t % 3 === 0) m.particles.push({ x: this.x - this.facing * 8, y: this.y - 1, vx: -this.facing * (0.5 + R()), vy: -0.6 - R() * 1.2, life: 14, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.15 });
    }
    const leap = this.buffer.jump;
    if (this.buffer.attack) { this.swimPop(W.cutRise, 0, 'swimCut'); return; }   // attack: up out of it, knife first
    if (leap || this.buffer.special || this.t > W.max) this.swimPop(leap ? W.leap : W.hop);
  }

  /**
   * Into an ink fall (state sludgeclimb): she hangs in the column of sludge pouring off a platform's edge.
   * @param {object} fall - from sludgeFalls()
   * @param {number} y - how far down it she goes in
   */
  enterFall(fall, y) {
    this.setState('sludgeclimb'); this.climbFall = fall; this.climbRush = false;
    this.vx = this.vy = this.lx = this.ly = 0; this.grounded = false; this.platform = null; this.fastFalling = false;
    this.x = fall.x + fall.side * this.body.w / 2; this.y = Math.max(fall.top + 8, Math.min(fall.bot, y)); this.facing = -fall.side;
    sfx('geyser', 0.3, 1.6);
  }

  /**
   * Every frame in an ink fall: up / down swims along it (climbing back up the stage's side); at the top, holding
   * up pulls her out onto the platform; at the bottom, holding down lets go. Jump shoots her up it and out onto the platform,
   * attack / special bursts out away from it. Can't be hit; she comes out by herself when she's been in the sludge too long, or if the fall dries up.
   * @param {object} c - her controller
   */
  st_sludgeclimb(c) {
    const W = this.def.moves.downB.swim, m = this.match, R = Math.random, old = this.climbFall;
    const fall = this.sludgeFalls().find((f) => f.plat === old.plat && f.side === old.side);
    this.vx = this.vy = this.lx = this.ly = 0;
    if (!fall) { this.swimCd = W.cooldown; this.setState('air'); return; }   // (the sludge at the edge is gone)
    this.climbFall = fall; this.invincible = Math.max(this.invincible, 2); this.grounded = false; this.platform = null;
    this.x = fall.x + fall.side * this.body.w / 2;
    if (this.buffer.jump) { this.buffer.jump = 0; this.climbRush = true; sfx('geyser', 0.35, 1.8); }   // jump: shoots up the fall and out on top
    if (this.climbRush || Math.abs(c.y) > 0.25) {
      this.y += (this.climbRush ? -W.climb * 2.6 : c.y * W.climb) * this.speedMult;
      if (this.t % 3 === 0) m.particles.push({ x: fall.x + (R() - 0.5) * 6, y: this.y - 4, vx: fall.side * R(), vy: 0.5 + R(), life: 14, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.15 });
    }
    if (this.y < fall.top + 8) {                                // at the top: out onto the platform
      this.y = fall.top + 8;
      if (c.y < -0.5 || this.climbRush) { this.swimPop(this.climbRush ? W.leap * 0.85 : W.hop, -fall.side * 2.4); this.x = fall.x - fall.side * 6; this.y = fall.top - 2; return; }
    }
    if (this.y >= fall.bot) {                                // at the bottom: keep holding down to let go
      this.y = fall.bot; this.climbHold = c.y > 0.5 ? (this.climbHold || 0) + 1 : 0;
      if (this.climbHold > 20) { this.swimCd = W.cooldown; this.setState('air'); return; }
    } else this.climbHold = 0;
    if (this.buffer.attack || this.buffer.special || this.t > W.max) this.swimPop(W.hop, fall.side * 1.6);
  }

  /**
   * Bursts out of the sludge (floor or ink fall) as move swimPop: a leap or a hop, with a splash that hits anyone there.
   * @param {number} vy - her jump out
   * @param {number} vx - sideways push
   */
  swimPop(vy, vx = 0, move = 'swimPop') {
    const m = this.match, R = Math.random, W = this.def.moves.downB.swim;
    this.buffer.jump = this.buffer.attack = this.buffer.special = 0;
    this.swimCd = W.cooldown;
    this.startAttack(move);
    this.vy = vy; this.vx = vx; if (vx) this.facing = Math.sign(vx);
    this.grounded = false; this.platform = null; this.y -= 1;
    sfx('geyser', 0.45, 1.1); m.shake(2, 6);
    for (let i = 0; i < 16; i++) m.particles.push({ x: this.x + (R() - 0.5) * 16, y: this.y - 2, vx: (R() - 0.5) * 4, vy: -2 - R() * 4, life: 22, color: SLUDGE[i % 3], size: 3, grav: 0.25 });
  }

  /**
   * SLUDGE SWIM's knife uppercut (attack out of the sludge, move swimCut): she bursts up karambit first. The first
   * one it catches is SKEWERED - stuck on the knife, carried up with her - then at the top she smacks them back down
   * (`swimCut.smack`, a spike). Called every frame of the move from st_attack.
   * @param {object} m - the move (swimCut)
   */
  skewerStep(m) {
    const M = this.match, S = m.skewer, v = this.skewered;
    if (!v && this.t >= S.from && this.t <= S.to) {           // the knife going up: catch the first one in reach
      for (const o of M.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.isIntangible() || ['seized', 'grabbed', 'respawn'].includes(o.state)) continue;
        const hb = o.hurtbox(), x1 = this.x - 18, x2 = this.x + 18, y1 = this.y - 96, y2 = this.y - 20;
        if (!(x1 < hb.x2 && x2 > hb.x1 && y1 < hb.y2 && y2 > hb.y1)) continue;
        if (o.state === 'shield') { M.shieldHit(o, { h: S.stab, owner: this, id: 'skewer' + this.age, facing: this.facing }); continue; }
        o.stopChargeSound(); o.setState('seized'); o.seizedBy = this; o.vx = o.vy = o.lx = o.ly = 0;
        o.percent += S.stab.dmg; this.skewered = o; this.skewerT = 0;
        sfx('hit', 0.9, 0.6); sfx('slash', 0.6, 0.7); M.shake(4, 6); this.hitstop = 4;
        break;
      }
    }
    if (!this.skewered) return;
    const o = this.skewered;
    if (!o.alive || o.state !== 'seized') { this.skewered = null; return; }
    this.skewerT++;
    o.x = this.x + this.facing * 4; o.y = this.y - 76;           // stuck on the knife above her
    if (this.vy >= -0.5 || this.skewerT >= S.hold) {           // the top: she smacks them back down
      this.skewered = null; o.seizedBy = null; o.setState('air');
      M.applyHit(o, { x1: o.x - 10, x2: o.x + 10, y1: o.y - 40, y2: o.y, h: S.smack, owner: this, id: 'smack' + this.age, facing: this.facing }, this.x);
      sfx('bighit', 0.9, 0.6); M.shake(6, 8);
      this.startAttack('swimSmack'); this.vy = Math.min(this.vy, -1);
    }
  }

  /** Whether she's still holding someone on her knife (the victim's st_seized asks). */
  holdsSeized(v) { return this.skewered === v && this.state === 'attack'; }

  /**
   * Draws her under the sludge: sinking into it, then only a black bulge in the puddle with her white eyes and
   * smile peeking out, rippling as she moves.
   */
  drawSwim(spr, g) {
    const W = this.def.moves.downB.swim, k = Math.min(1, this.t / W.sink);
    if (this.state === 'sludgeclimb') {                     // in an ink fall: a bulge in the column, eyes looking out
      spr.setAlpha(0);
      const f = this.climbFall, fx = Math.round(f.x + f.side * 2), y = Math.round(this.y - 12), bob = Math.sin(this.anim * 0.3);
      g.fillStyle(0x060508, 1); g.fillEllipse(fx, y + bob, 10, 26);
      g.fillStyle(0xffffff, 1); g.fillRect(fx + f.side * 1 - 1, y - 6, 2, 2); g.fillRect(fx + f.side * 1 - 1, y - 1, 2, 2);
      return;
    }
    if (k < 1) { spr.setScale(1 + k * 0.4, 1 - k * 0.9); return; }
    spr.setAlpha(0);
    const x = Math.round(this.x), y = Math.round(this.y), bob = Math.sin(this.anim * 0.3), moving = Math.abs(this.x - (this.swimLastX ?? this.x)) > 0.5;
    this.swimLastX = this.x;
    g.fillStyle(0x060508, 1); g.fillEllipse(x, y - 2 - bob * 0.5, 26 + (moving ? 6 : 0), 9);
    g.fillStyle(0x2e2a38, 0.8); g.fillRect(x - 6, y - 5 - bob * 0.5, 7, 1);
    g.fillStyle(0xffffff, 1); g.fillRect(x + this.facing * 2 - 3, y - 5, 2, 2); g.fillRect(x + this.facing * 2 + 2, y - 5, 2, 2);   // eyes
    g.fillRect(x + this.facing * 2 - 3, y - 2, 7, 1);                                                                             // the smile
    if (moving) { g.lineStyle(1, 0x2e2a38, 0.7); g.strokeEllipse(x - this.facing * 12, y - 1, 10, 3); }
  }

  /**
   * Her OBLATION meter on the HUD: a column of living sludge standing on her player plate. Its sides wobble and bulge,
   * the purple sludge inside rises from the bottom as she lands hits (bubbling, with a wavy surface), it drips off its
   * sides, and OBLATION is written down it. On top sits a sludge-soaked skull with glowing eyes; when the meter is
   * full (and always at DROWNED) the skull LAUGHS - jaw clacking, rattling, eyes squeezed shut, "HA" popping out.
   * @param {Phaser.GameObjects.Graphics} g - the HUD's graphics
   * @param {number} cx - the column's middle
   * @param {number} by - its foot (the top of her plate)
   * @param {number} frame - for the animation
   */
  drawDevotionHud(g, cx, by, frame) {
    const D = this.def.devoted, need = this.sludge < 3 ? D.need[this.sludge] : 0;
    const frac = need ? Math.min(1, this.devotion / need) : 1, ready = !need || this.devotion >= need;
    const Hh = 72, top = by - Hh, half = (y) => 6 + 1.6 * Math.sin(y * 0.33 + frame * 0.09) + 0.8 * Math.sin(y * 0.11 - frame * 0.05);
    if (!this.oblText) {                                    // the lettering, once
      this.oblText = this.scene.add.text(0, 0, 'O\nB\nL\nA\nT\nI\nO\nN', { fontFamily: FONT, fontSize: '5px', color: '#f4eefc', align: 'center', lineSpacing: 1, stroke: '#1a0a2a', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(11);
      this.oblLaugh = this.scene.add.text(0, 0, 'HA', { fontFamily: FONT, fontSize: '5px', color: '#e0c8ff', stroke: '#1a0a2a', strokeThickness: 2 }).setOrigin(0.5).setDepth(11);
      this.match.addUI(this.oblText); this.match.addUI(this.oblLaugh);
    }
    this.oblText.setPosition(cx + 0.5, top + 5).setVisible(!this.eliminated);
    // the column: a wobbling black skin of sludge, dark inside
    for (let y = top; y < by; y += 2) { const w = half(y); g.fillStyle(0x060508, 1); g.fillRect(Math.round(cx - w - 1), y, Math.round(w * 2 + 2), 2); }
    for (let y = top + 1; y < by; y += 2) { const w = half(y) - 1.5; g.fillStyle(0x1a0f24, 1); g.fillRect(Math.round(cx - w), y, Math.round(w * 2), 2); }
    // the purple sludge inside, rising with her devotion: a wavy surface, a lit edge, bubbles
    const fh = Math.round((Hh - 2) * frac), surf = by - fh;
    if (fh > 0) {
      for (let y = surf; y < by; y += 2) {
        const w = half(y) - 1.5, wave = y < surf + 2 ? 1 : 0;
        g.fillStyle(ready && (frame >> 3) % 2 ? 0x8a3ae8 : 0x6a22c0, 1); g.fillRect(Math.round(cx - w) + wave, y, Math.round(w * 2) - wave * 2, 2);
        g.fillStyle(0xb47aff, 0.7); g.fillRect(Math.round(cx - w), y, 1, 2);
        g.fillStyle(0x3a0e70, 0.8); g.fillRect(Math.round(cx + w) - 2, y, 2, 2);
      }
      for (let x = -4; x <= 4; x++) { g.fillStyle(0xd8b0ff, 1); g.fillRect(cx + x, surf + Math.round(Math.sin(x * 0.9 + frame * 0.2)), 1, 1); }   // the wavy surface
      for (let i = 0; i < 4; i++) {                         // bubbles rising through it
        const ph = (frame * 0.6 + i * 23) % (fh + 4), bx = cx + Math.round(Math.sin(i * 2.1 + frame * 0.05) * 3), byy = by - ph;
        if (byy > surf + 1) { g.lineStyle(1, 0xd8b0ff, 0.8); g.strokeCircle(bx, byy, 1 + (i % 2)); }
      }
    }
    // gobs of sludge bulging out of its sides, and drips running off them
    for (const [side, ph] of [[-1, 0], [1, 9], [-1, 17], [1, 28], [-1, 36]]) {
      const yy = top + 10 + ph * 1.6, w = half(yy), len = 2 + ((frame >> 2) + ph) % 9;
      g.fillStyle(0x060508, 1); g.fillCircle(cx + side * (w + 1), yy, 2.5);
      g.fillStyle(0x4a3248, 1); g.fillRect(cx + side * (w + 1) - 1, yy - 2, 1, 1);
      g.fillStyle(0x060508, 1); g.fillRect(cx + side * (w + 1), yy + 2, 1, len); g.fillCircle(cx + side * (w + 1) + 0.5, yy + 3 + len, 1.2);
    }
    for (let i = 0; i < 2; i++) {                           // a drop falling off the bottom onto the plate
      const d = (frame * 0.7 + i * 30) % 60; if (d < 14) { g.fillStyle(0x060508, 1); g.fillRect(cx + (i ? 7 : -8), by - 6 + d * 0.5, 2, 2); }
    }
    // the skull on top: sludge-soaked, eyes glowing; laughing when the meter is full
    const laugh = ready, jaw = laugh ? ((frame >> 2) % 2 ? 4 : 1) : 0, rattle = laugh ? ((frame >> 1) % 2 ? 1 : -1) : 0;
    const sx = cx + rattle, sy = top - 8 + (laugh ? Math.round(Math.sin(frame * 0.5)) : 0);
    g.fillStyle(0x060508, 1); g.fillCircle(sx, sy, 9); g.fillRect(sx - 6, sy + 3, 12, 6);
    g.fillStyle(0x3a2050, 1); g.fillCircle(sx, sy, 8); g.fillRect(sx - 5, sy + 3, 10, 5);
    g.fillStyle(0x5a3080, 1); g.fillCircle(sx - 2, sy - 3, 4);
    g.fillStyle(0x060508, 1);                               // sludge dripping over the cranium
    g.fillEllipse(sx + 1, sy - 7, 14, 5); for (const [dx, l] of [[-5, 4], [-1, 6 + ((frame >> 3) % 3)], [4, 3]]) { g.fillRect(sx + dx, sy - 6, 2, l); g.fillCircle(sx + dx + 1, sy - 5 + l, 1.3); }
    const eye = [0xf4eefc, 0xe0c8ff, 0xc890ff, 0xff7aff][this.sludge || 0];
    if (laugh) {                                            // eyes squeezed shut, glowing: ^ ^
      g.lineStyle(2, eye, 1); g.lineBetween(sx - 6, sy + 2, sx - 4, sy); g.lineBetween(sx - 4, sy, sx - 2, sy + 2); g.lineBetween(sx + 2, sy + 2, sx + 4, sy); g.lineBetween(sx + 4, sy, sx + 6, sy + 2);
      g.fillStyle(eye, 0.25); g.fillCircle(sx - 4, sy + 1, 5); g.fillCircle(sx + 4, sy + 1, 5);
    } else {
      g.fillStyle(0x060508, 1); g.fillRect(sx - 6, sy - 1, 5, 5); g.fillRect(sx + 1, sy - 1, 5, 5);
      g.fillStyle(eye, 0.8 + 0.2 * Math.sin(frame * 0.1)); g.fillRect(sx - 5, sy, 3, 3); g.fillRect(sx + 2, sy, 3, 3);
    }
    g.fillStyle(0x060508, 1); g.fillRect(sx - 1, sy + 4, 2, 2);                                 // nose
    for (let i = 0; i < 4; i++) { g.fillStyle(0xf4eefc, 1); g.fillRect(sx - 4 + i * 2.5, sy + 7, 1.5, 2); }   // top teeth
    // the jaw, hanging open as it laughs
    g.fillStyle(0x060508, 1); g.fillRect(sx - 6, sy + 9 + jaw - 1, 12, 5); g.fillStyle(0x3a2050, 1); g.fillRect(sx - 5, sy + 9 + jaw, 10, 3);
    for (let i = 0; i < 4; i++) { g.fillStyle(0xf4eefc, 1); g.fillRect(sx - 4 + i * 2.5, sy + 9 + jaw - 1, 1.5, 2); }
    if (jaw > 1) { g.fillStyle(0x060508, 1); g.fillRect(sx - 4, sy + 9, 8, jaw - 1); }
    const ha = laugh && !this.eliminated && (frame % 24) < 16;
    this.oblLaugh.setVisible(ha);
    if (ha) { const k = (frame % 24) / 16, side = (frame / 24 | 0) % 2 ? 1 : -1; this.oblLaugh.setPosition(sx + side * (13 + k * 6), sy - 4 - k * 8).setAlpha(1 - k * 0.6); }
  }

  /**
   * CROSS CUTS (side special), every frame of a cut: draws its slash, holds her up in the air, and when special is
   * tapped in the cut's window, carries on into the next cut (the last one she has at her stage is the finisher).
   * @param {object} m - the cut's move
   * @returns {boolean} true when it started the next cut
   */
  cutStep(m) {
    const D = this.def.devoted, max = D.cuts[this.sludge || 0];
    if (!this.grounded) { this.vy = Math.min(this.vy, 0.5); if (this.t === 1) this.vx = this.facing * 2; }   // (cuts in the air keep her up)
    const h = m.hits[0];
    if (this.t === h.from) {
      const x = this.x + this.facing * (h.box[0] + h.box[2] / 2), y = this.y + h.box[1] + h.box[3] / 2;
      this.cutFx = this.cutFx || [];
      if (m.cut === 9) { this.cutFx.push({ x, y, a: 0.8, len: 70, age: 0 }, { x, y, a: -0.8, len: 70, age: 0 }); sfx('shing', 0.6, 0.7); }
      else this.cutFx.push({ x, y, a: [-0.6, 0.6, -0.15, 1.2][(m.cut - 1) % 4] * this.facing, len: 52, age: 0 });
      sfx('slash', 0.5, 0.9 + m.cut * 0.07);
    }
    if (!m.next || !this.buffer.special || this.t < m.next[0] || this.t > m.next[1]) return false;   // (no tap: the combo ends and the marks vanish)
    this.buffer.special = 0;
    const n = m.cut + 1;
    this.startAttack(n >= max ? 'sideBF' : 'sideB' + n);
    return true;
  }

  /**
   * THE SYMBOL: a small dying tree growing where she first landed - crooked bare trunk, drooping broken branches with
   * a few dead leaves left on them, black sludge weeping from a knot in the trunk. When her prayer would be answered
   * the knot glows with a pale smile and a faint light rises round the tree.
   * @param {number} a - how far it has faded in (0-1)
   * @param {boolean} ready - devotion full
   */
  drawTree(g, x, y, a, ready) {
    const t = this.age, S = this.def.devoted.treeScale || 1, sway = Math.sin(t * 0.03) * 0.6 * S;
    const P = (px, py) => ({ x: x + px * S + sway * (-py / 46), y: y + py * S });      // a point on the tree (the top sways a little)
    const line = (w, c, x1, y1, x2, y2) => { const p1 = P(x1, y1), p2 = P(x2, y2); g.lineStyle(Math.max(1, Math.round(w * S)), c, a); g.lineBetween(p1.x, p1.y, p2.x, p2.y); };
    if (ready) { const p = 0.5 + 0.5 * Math.sin(t * 0.15); g.fillStyle(0xf8f4ec, 0.07 + 0.08 * p); g.fillEllipse(x, y - 26 * S, 54 * S, 64 * S); g.fillStyle(0xf8f4ec, 0.05 + 0.05 * p); g.fillEllipse(x, y - 26 * S, 34 * S, 44 * S); }
    g.fillStyle(0x060508, 0.9 * a); g.fillEllipse(x, y + 1, 26 * S, 4 * S * 0.75);       // the sludge pooled round its roots
    for (const dx of [-7, 6, -3]) line(2, 0x241c18, dx * 0.4, -1 / S, dx, 1 / S);           // roots
    // the branches (from, to, thickness): crooked, drooping at the ends, one snapped short
    const B = [[-2, -26, -12, -34, 2], [-12, -34, -16, -29, 1], [-12, -34, -14, -42, 1], [0, -34, -4, -46, 2], [-4, -46, -8, -49, 1],
      [1, -31, 10, -41, 2], [10, -41, 16, -39, 1], [16, -39, 18, -33, 1], [3, -20, 11, -24, 1], [11, -24, 13, -20, 1]];
    for (const [x1, y1, x2, y2, w] of B) line(w + 1.2, 0x140e0c, x1, y1, x2, y2);
    for (const [x1, y1, x2, y2, w] of B) line(w, 0x4a3c32, x1, y1, x2, y2);
    // the trunk: crooked, cracked
    const T = [[-4, 0], [-3, -10], [-4, -18], [-2, -26], [-1, -34], [1, -34], [2, -27], [4, -19], [3, -10], [5, 0]].map(([px, py]) => P(px, py));
    g.fillStyle(0x3a3028, a); g.fillPoints(T, true); g.lineStyle(Math.max(1, Math.round(S * 0.7)), 0x140e0c, a); g.strokePoints(T, true);
    line(0.6, 0x241c18, -1, -4, 0, -12); line(0.6, 0x241c18, 1, -22, 0, -30);              // cracks in the bark
    line(0.6, 0x5a4a3e, -2.6, -9, -2.6, -3);                                                 // light down one side
    // the knot: black sludge weeps out of it; a pale smile in it when she's ready
    const k = P(0, -16); g.fillStyle(0x060508, a); g.fillEllipse(k.x, k.y, 5 * S, 4 * S);
    const drip = (4 + ((t >> 4) % 5)) * S;
    g.fillRect(k.x - S * 0.5, k.y + S, S, drip); g.fillRect(k.x - S * 1.5, k.y + S, S, Math.max(2, drip - 3 * S));
    if (ready) { g.lineStyle(Math.max(1, Math.round(S * 0.8)), 0xf8f4ec, 0.9 * a); g.beginPath(); g.arc(k.x, k.y - S * 0.5, 2 * S, 0.2, Math.PI - 0.2); g.strokePath(); }
    // the last few dead leaves, hanging on
    for (const [lx, ly, c] of [[-16, -29, 0x6a4a2a], [18, -33, 0x8a5a2a], [13, -20, 0x5a3e24], [-8, -49, 0x7a5228]]) {
      const q = P(lx, ly), s2 = Math.sin(t * 0.06 + lx) * S;
      g.fillStyle(c, a); g.fillRect(q.x + s2 - S, q.y, 2 * S, 3 * S);
    }
  }

  /**
   * FEED THE DARK (her Limit): throws the karambit straight ahead (no homing). If it sticks in someone, a cutscene
   * (`drawRite`): a giant shadow demon of sludge rises behind them, grabs them, lifts them and tears them in half -
   * back in the arena they're KO'd on the spot. If it hits nobody, the knife just flies off.
   */
  riteLimit(L) {
    const m = this.match;
    this.vx = 0; this.lx = 0; this.vy = this.grounded ? 0 : Math.min(this.vy, 0.5);
    if (this.t === 1) {
      this.ult = { rite: true, target: null, victims: [], phase: 'aim', ct: 0 };   // (no aiming help: it flies the way she faces)
      sfx('curse', 0.6, 0.6);
    }
    const U = this.ult, T = U.target;
    if (U.phase === 'aim' && this.t === L.throwAt) {      // the knife leaves her hand
      U.phase = 'throw'; U.kx = this.x + this.facing * 14; U.ky = this.y - 38; U.kvx = this.facing * L.knifeSpeed; U.kvy = 0; U.spin = 0;
      sfx('swing', 0.8, 0.8); sfx('whoosh', 0.5, 1.2);
    }
    if (U.phase === 'throw') {                              // straight ahead - it sticks in the first one it reaches
      U.spin += 0.6; U.kvy += 0.06; U.kx += U.kvx; U.ky += U.kvy;
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.isIntangible()) continue;
        const hb = o.hurtbox();
        if (U.kx > hb.x1 - 6 && U.kx < hb.x2 + 6 && U.ky > hb.y1 - 6 && U.ky < hb.y2 + 6) {   // it sticks: the cutscene
          sfx('hit', 0.9, 0.7); sfx('bighit', 0.6, 0.5); m.shake(6, 8);
          U.target = o; U.victims = [o];
          U.phase = 'cutscene'; U.ct = 0; m.frozen = 9999; m.cutscene = this; U.origin = { x: this.x, y: this.y };
          o.vx = o.vy = o.lx = o.ly = 0; o.setState('hitstun'); o.hitstun = 999; U.tx = o.x; U.ty = o.y;
          return;
        }
      }
      if (this.t > L.throwAt + L.flyFor) { U.phase = 'miss'; U.missEnd = this.t + L.whiff; m.popText(this, '...', '#8a8494'); }
      return;
    }
    if (U.phase === 'miss') { U.kx += U.kvx; U.ky += U.kvy + (this.t - L.throwAt) * 0.02; U.spin += 0.6; if (this.t >= U.missEnd) this.endRite(); return; }
    if (U.phase === 'cutscene') {
      const C = L.scene, ct = ++U.ct;
      if (!T.alive) return this.endRite();
      T.vx = T.vy = T.lx = T.ly = 0; T.x = U.tx; T.y = U.ty;
      if (ct === 1) sfx('whoosh', 0.6, 0.4);                                        // the lights go out
      if (ct > C.look && ct < C.emerge && (ct - C.look) % 22 === 0) sfx('land', 0.25, 1.5);   // they look round, shuffling
      if (ct === C.emerge) { sfx('rumble', 0.7, 0.5); sfx('curse', 0.7, 0.5); }
      if (ct === C.emerge + 30) sfx('roar', 0.6, 0.45);
      if (ct === C.grab) { sfx('hit', 0.6, 0.5); sfx('laugh', 0.5, 0.4); }            // it grabs them by the head
      if (ct === C.slam1 || ct === C.slam2) { sfx('bighit', 1, 0.4); sfx('land', 1, 0.5); sfx('hit', 0.7, 0.5); m.shake(10, 8); }   // slammed into the floor
      if (ct === C.hit) { sfx('bighit', 1, 0.45); sfx('hit', 0.8, 0.6); }            // the uppercut
      if (ct === C.fly) sfx('whoosh', 0.8, 0.6);
      if (ct === C.catch) { sfx('bighit', 0.6, 0.6); sfx('laugh', 0.7, 0.45); }
      if (ct === C.tear) { sfx('slash', 1, 0.5); sfx('bighit', 1, 0.4); sfx('ko', 0.7, 0.6); }
      if (ct >= C.end) {                                    // back in the arena: they're gone
        m.frozen = 0; m.cutscene = null; this.x = U.origin.x; this.y = U.origin.y;
        T.hitstun = 0; T.setState('air'); T.lastHitBy = this; T.lastHitTimer = 120;
        const R = Math.random;
        for (let i = 0; i < 30; i++) m.particles.push({ x: T.x, y: T.y - 30, vx: (R() - 0.5) * 8, vy: -1 - R() * 5, life: 40, color: SLUDGE[i % 3], size: 3, grav: 0.22 });
        m.popText(T, 'FED TO THE DARK', '#c890ff'); m.shake(14, 12);
        m.onKO(T);
        U.phase = 'out'; U.outEnd = this.t + 20;
      }
      return;
    }
    if (U.phase === 'out' && this.t >= U.outEnd) this.endRite();
  }

  /** Ends FEED THE DARK (lifting the cutscene if it was still on). */
  endRite() {
    const U = this.ult, m = this.match;
    if (U && U.phase === 'cutscene') { m.frozen = 0; m.cutscene = null; if (U.origin) { this.x = U.origin.x; this.y = U.origin.y; } if (U.target) { U.target.hitstun = 0; U.target.setState('air'); } }
    this.ult = null; this.invincible = 30; this.setState(this.grounded ? 'idle' : 'air');
  }

  /**
   * Draws FEED THE DARK: the spinning karambit in the arena, then the cutscene on screen (beats in `limit.scene`):
   * everything goes black; they look round in a thin light; a hulking demon steps out of the shadows behind them
   * (eyes first); an uppercut knocks them up; the demon flies up after them, catches them and tears them in half.
   * @param {object|null} U - the Limit's state (null clears it all away)
   */
  drawRite(U) {
    const m = this.match;
    if (!this.riteG) {
      this.riteG = this.scene.add.graphics().setDepth(30); m.addWorld(this.riteG);
      this.riteUI = this.scene.add.graphics().setDepth(40); m.addUI(this.riteUI);
      this.riteMid = this.scene.add.graphics().setDepth(40.5); m.addUI(this.riteMid);
      this.riteFront = this.scene.add.graphics().setDepth(42); m.addUI(this.riteFront);
      this.riteTop = this.scene.add.sprite(0, 0, this.sheets.idle, 0).setDepth(41).setVisible(false); m.addUI(this.riteTop);
      this.riteBot = this.scene.add.sprite(0, 0, this.sheets.idle, 0).setDepth(41).setVisible(false); m.addUI(this.riteBot);
      this.riteText = this.scene.add.text(VIEW_W / 2, 17, '', { fontFamily: FONT, fontSize: '10px', color: '#c890ff' }).setOrigin(0.5).setDepth(43).setVisible(false); m.addUI(this.riteText);
    }
    const g = this.riteG, ui = this.riteUI, mid = this.riteMid, fr = this.riteFront;
    g.clear(); ui.clear(); mid.clear(); fr.clear(); this.riteTop.setVisible(false); this.riteBot.setVisible(false); this.riteText.setVisible(false);
    if (!U) return;
    if (U.phase === 'throw' || U.phase === 'miss') {        // the knife, spinning through the air
      for (let i = 1; i <= 3; i++) { g.fillStyle(0x7a2ad8, 0.25 / i); g.fillCircle(U.kx - U.kvx * i * 0.6, U.ky - U.kvy * i * 0.6, 4); }
      this.drawKarambit(g, U.kx, U.ky, U.spin, 1);
      return;
    }
    if (U.phase !== 'cutscene') return;
    const C = this.def.limit.scene, ct = U.ct, T = U.target, W = VIEW_W, H = VIEW_H, floor = H - 60, R = Math.random;
    const clamp = (v) => Math.max(0, Math.min(1, v)), ease = (v) => v * v * (3 - 2 * v);
    const up = ct >= C.fly ? ease(clamp((ct - C.fly) / (C.catch - C.fly))) : 0;      // how far "up" the camera has flown with them
    // ---- the black, and the shadows (in flight: purple dark with streaks rushing down past them)
    ui.fillStyle(0x000000, 1); ui.fillRect(0, 0, W, H);
    if (ct >= C.look && ct < C.fly) {                        // a thin light from above on them, the floor just visible
      const k = clamp((ct - C.look) / 12);
      ui.fillStyle(0xd8d0ff, 0.06 * k); ui.fillTriangle(W * 0.4 - 10, 34, W * 0.4 + 10, 34, W * 0.4 + 60, floor); ui.fillTriangle(W * 0.4 - 10, 34, W * 0.4 - 60, floor, W * 0.4 + 60, floor);
      ui.fillStyle(0xd8d0ff, 0.12 * k); ui.fillEllipse(W * 0.4, floor + 2, 120, 12);
    }
    if (ct >= C.emerge && ct < C.fly) for (let i = 0; i < 8; i++) {   // shadows curling round the edges
      const a = ct * 0.02 + i * 0.8; ui.fillStyle(0x1a0f24, 0.35); ui.fillEllipse(W * 0.7 + Math.cos(a) * 140, floor - 120 + Math.sin(a * 1.3) * 90, 160, 60);
    }
    if (ct >= C.fly) {
      ui.fillStyle(0x120a1a, 1); ui.fillRect(0, 0, W, H);
      for (let i = 0; i < 24; i++) { const x = (i * 97) % W, y = ((i * 53 + ct * (ct < C.catch ? 26 : 4)) % (H + 80)) - 40; ui.fillStyle(0x3a2450, 0.6); ui.fillRect(x, y, 2, ct < C.catch ? 40 : 10); }
    }
    // ---- them (screen positions: on the floor, knocked up, held up in front of it)
    let vx = 250, vy = floor, rot = 0, flip = !!T.def.facesLeft;
    if (ct >= C.look && ct < C.grab) flip = ((Math.floor((ct - C.look) / 22)) % 2 === 1) !== flip;   // looking round, left then right
    if (ct >= C.grab && ct < C.hit) {                         // grabbed by the head: lifted, slammed into the floor, lifted, slammed again, hauled up
      const seg = (a, b) => clamp((ct - a) / (b - a));
      let h = 0;
      if (ct < C.slam1 - 6) h = 70 * seg(C.grab, C.grab + 12);
      else if (ct < C.slam1) { h = 70 * (1 - seg(C.slam1 - 6, C.slam1)); rot = -1.5 * seg(C.slam1 - 6, C.slam1); }
      else if (ct < C.slam1 + 6) rot = -1.5;
      else if (ct < C.slam2 - 6) { h = 70 * seg(C.slam1 + 6, C.slam1 + 14); rot = -1.5 * (1 - seg(C.slam1 + 6, C.slam1 + 14)); }
      else if (ct < C.slam2) { h = 70 * (1 - seg(C.slam2 - 6, C.slam2)); rot = 1.5 * seg(C.slam2 - 6, C.slam2); }
      else if (ct < C.hit - 14) rot = 1.5;
      else { h = 40 * seg(C.hit - 14, C.hit - 4); rot = 1.5 * (1 - seg(C.hit - 14, C.hit - 4)); }
      vy = floor - h + (h > 60 ? Math.sin(ct * 1.7) * 2 : 0);
    }
    if (ct >= C.hit && ct < C.fly) { vy = floor - (ct - C.hit) * 14; vx = 250 + (ct - C.hit) * 3; rot = (ct - C.hit) * 0.3; }   // the uppercut sends them up
    else if (ct >= C.fly) { const k = clamp((ct - C.fly) / (C.catch - C.fly)); vy = floor - 140 + k * 14 + Math.sin(ct * 0.2) * 2; vx = 280 + k * 30; rot = ct < C.catch ? 3 + (ct - C.fly) * 0.3 : 0; }
    const torn = ct >= C.tear, since = ct - C.tear;
    for (const [spr, top] of [[this.riteTop, true], [this.riteBot, false]]) {
      if (T.def.menuSheets) showFighter(spr, T.def, Math.floor(ct / 6), T.skin);
      else spr.setTexture(T.sheets.idle, ct < C.grab ? Math.floor(ct / 6) % Math.max(1, Math.min(32, this.scene.textures.get(T.sheets.idle).frameTotal - 1)) : 0).setOrigin(T.def.originX ?? 0.5, T.def.originY ?? 1);
      spr.setScale(2).setFlipX(flip).setVisible(ct >= C.dark).setTintMode(Phaser.TintModes.MULTIPLY)
        .setTint(ct < C.look ? 0x2a2430 : ct < C.fly ? 0xb8b0c8 : torn ? 0x8a7a98 : 0xd0c8e0).setAlpha(ct < C.look ? clamp((ct - C.dark) / 10) : 1);
      const fh = spr.frame.realHeight, fw = spr.frame.realWidth, waist = Math.max(4, Math.round((T.def.originY ?? 1) * fh - T.body.h * 0.55));
      if (top) spr.setCrop(0, 0, fw, waist); else spr.setCrop(0, waist, fw, fh - waist);
      const k = torn ? Math.min(1, since / 16) : 0;
      spr.setPosition(vx + (top ? -1 : 1) * k * 90, vy + (top ? -1 : 1) * k * 24 + (torn ? since * since * 0.04 : 0)).setRotation(rot + (torn ? (top ? -1 : 1) * k * 1.1 : 0));
    }
    const bh = T.body.h * 2, chest = vy - bh * 0.7;
    if (ct >= C.emerge + 10 && ct < C.emerge + 34) { fr.fillStyle(0xffffff, 0.9); fr.fillRect(vx - 2, vy - bh - 30, 4, 10); fr.fillRect(vx - 2, vy - bh - 17, 4, 4); }   // "!" - something's behind them
    // ---- the demon (its own graphics, moved and scaled: drawn at 0,0 = its chest)
    mid.setVisible(ct >= C.emerge);
    if (ct >= C.emerge) {
      const a = clamp((ct - C.emerge - 14) / 40), eyes = clamp((ct - C.emerge) / 10), sc = 0.72;
      let X = 440, Y = floor - 110, pose;
      const head = (k) => [vx + Math.sin(rot) * bh * k, vy - Math.cos(rot) * bh * k];                            // a point up their body (they may be lying down)
      if (ct < C.grab - 12) pose = { l: [X - 90, Y + 90], r: [X + 90, Y + 95], grin: 4 };                        // looming, arms hanging
      else if (ct < C.hit - 10) {                                                                                // its hand clamped on their head
        const k = clamp((ct - (C.grab - 12)) / 12); X = 440 - k * 40;
        const hd = head(0.92), rest = [X - 90, Y + 90];
        pose = { l: ct < C.grab ? [rest[0] + (hd[0] - rest[0]) * k, rest[1] + (hd[1] - rest[1]) * k] : hd, r: [X + 90, Y + 95], grin: ct >= C.grab ? 10 : 6 };
      }
      else if (ct < C.fly) {                                                                                     // the uppercut
        const k = clamp((ct - (C.hit - 10)) / 10); X = 400 - k * 10;
        pose = { l: [X - 90, Y + 80], r: ct < C.hit ? [vx + 60 - (1 - k) * 40, Y + 80 - k * 110] : [vx + 20, vy - bh - 20], grin: 10, fist: true };
      } else if (ct < C.catch) {                                                                                  // flying up after them, from below
        const k = ease(clamp((ct - C.fly) / (C.catch - C.fly))); X = 330; Y = floor + 220 - k * 250;
        pose = { l: [X - 70, Y + 110], r: [vx, chest + (1 - k) * 60], grin: 8, rise: true };
      } else {                                                                                                   // it has them: one hand on each half, then tears
        X = 330; Y = floor - 30;
        const pull = torn ? Math.min(1, since / 16) * 90 : clamp((ct - C.catch) / (C.tear - C.catch)) * 6;
        pose = { l: [vx - 8 - pull, vy - bh * 0.85 - (torn ? pull * 0.27 : 0)], r: [vx + 8 + pull, vy - bh * 0.3 + (torn ? pull * 0.27 : 0)], grin: torn ? 16 : 12, hold: true, rise: true };
      }
      mid.setPosition(X, Y).setScale(sc);
      const local = (pt) => [(pt[0] - X) / sc, (pt[1] - Y) / sc];
      this.drawDemon(mid, 0, 0, a, eyes, { ...pose, l: local(pose.l), r: local(pose.r) }, ct);
    }
    if (torn && since < 34) {                                 // the tear: sludge bursting out of them
      if (!U.spray) U.spray = Array.from({ length: 60 }, () => ({ x: vx, y: vy - T.body.h * 1.1, vx: (R() - 0.5) * 10, vy: -3 - R() * 6, r: 1 + R() * 3 }));
      for (const p of U.spray) { p.x += p.vx; p.y += p.vy; p.vy += 0.35; fr.fillStyle(p.r > 2.5 ? 0x4a3248 : 0x060508, 1); fr.fillCircle(p.x, p.y, p.r); }
    }
    // impact frames: the uppercut and the tear
    if (ct >= C.slam1 && ct < C.fly) {                        // cracks in the floor where they were slammed
      fr.lineStyle(2, 0xd8d0ff, 0.5);
      for (let i = 0; i < 7; i++) { const a = Math.PI + i * 0.45 + 0.1, l = 20 + (i * 37) % 30; fr.lineBetween(vx - 30, floor, vx - 30 + Math.cos(a) * l * 1.6, floor + Math.abs(Math.sin(a)) * 6); fr.lineBetween(vx + 30, floor, vx + 30 - Math.cos(a) * l * 1.6, floor + Math.abs(Math.sin(a)) * 6); }
      if (!U.slamSpray || ct === C.slam2) U.slamSpray = Array.from({ length: 30 }, () => ({ x: vx + (R() - 0.5) * 50, y: floor - 4, vx: (R() - 0.5) * 7, vy: -2 - R() * 5, r: 1 + R() * 2.5 }));
      for (const p of U.slamSpray) { p.x += p.vx; p.y += p.vy; p.vy += 0.4; if (p.y < floor + 4) { fr.fillStyle(p.r > 2 ? 0x4a3248 : 0x060508, 1); fr.fillCircle(p.x, p.y, p.r); } }
    }
    for (const at of [C.slam1, C.slam2, C.hit, C.tear]) {
      const d = ct - at;
      if (d >= 0 && d < 4) {
        fr.fillStyle(d < 2 ? 0xffffff : 0x000000, 1); fr.fillRect(0, 0, W, H);
        if (d >= 2) for (const spr of [this.riteTop, this.riteBot]) spr.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff).setDepth(43);
        else for (const spr of [this.riteTop, this.riteBot]) spr.setVisible(false);
      }
    }
    for (const spr of [this.riteTop, this.riteBot]) if (![C.slam1, C.slam2, C.hit, C.tear].some((at) => ct - at >= 2 && ct - at < 4)) spr.setDepth(41);
    // ---- letterbox, a line of text, fades
    fr.fillStyle(0x000000, 1); fr.fillRect(0, 0, W, 34); fr.fillRect(0, H - 34, W, 34);
    const line = ct >= C.look + 10 && ct < C.emerge ? '...HELLO?' : ct >= C.emerge + 20 && ct < C.grab ? 'IT HUNGERS.' : torn && since > 10 ? 'FED.' : '';
    if (line) this.riteText.setText(line).setVisible(true);
    if (ct > C.end - 8) { fr.fillStyle(0x000000, (ct - (C.end - 8)) / 8); fr.fillRect(0, 0, W, H); }
  }

  /**
   * The demon of the Limit, drawn on the cutscene's screen: a huge, man-shaped brute of black sludge - broad
   * shoulders, a barrel chest with pecs and abs picked out in a purple rim light, thick arms ending in clawed hands,
   * a human skull-like face with heavy brows, curling horns, white burning eyes and a wide grin - its lower half
   * trailing off into shadow (or a smoky tail as it flies).
   * @param {number} cx - its chest; cy - its chest's height
   * @param {number} a - how solid it is (0-1, stepping out of the shadows); eyes - how lit its eyes are (they come first)
   * @param {object} pose - l / r: where its left / right hand is; grin: how wide its mouth is; fist / hold / rise
   */
  drawDemon(ui, cx, cy, a, eyes, pose, ct) {
    const BODY = 0x040306, RIM = 0x5a3480, MUS = 0x24162e, sh = [[cx - 96, cy - 66], [cx + 96, cy - 66]];
    const arm = (s, hand, side, w) => {                     // a thick two-part arm (shoulder -> elbow -> hand), elbow bent outward
      const L1 = 92, L2 = 88, dx = hand[0] - s[0], dy = hand[1] - s[1], d = Math.min(L1 + L2 - 1, Math.max(20, Math.hypot(dx, dy)));
      const base = Math.atan2(dy, dx), bend = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const ea = base - side * bend, ex = s[0] + Math.cos(ea) * L1, ey = s[1] + Math.sin(ea) * L1;
      const ha = Math.atan2(hand[1] - ey, hand[0] - ex), hx = ex + Math.cos(ha) * L2, hy = ey + Math.sin(ha) * L2;
      return { ex, ey, hx, hy, ha, w };
    };
    const arms = [arm(sh[0], pose.l, -1, 40), arm(sh[1], pose.r, 1, 40)];
    const shapes = (col, k, alpha) => {                     // the whole silhouette; k = how much bigger (for the rim)
      ui.fillStyle(col, alpha); ui.lineStyle(0, col, 0);
      const tail = pose.rise ? 220 : 150;
      for (let i = 0; i < 6; i++) ui.fillEllipse(cx + Math.sin(ct * 0.1 + i) * 8, cy + 70 + i * (tail / 6), 150 - i * 20 + k * 2, 60 + k * 2);   // trailing off into shadow
      ui.fillPoints([{ x: cx - 112 - k, y: cy - 74 - k }, { x: cx + 112 + k, y: cy - 74 - k }, { x: cx + 62 + k, y: cy + 80 + k }, { x: cx - 62 - k, y: cy + 80 + k }], true);   // the torso
      ui.fillCircle(sh[0][0], sh[0][1], 40 + k); ui.fillCircle(sh[1][0], sh[1][1], 40 + k);                       // shoulders
      ui.fillPoints([{ x: cx - 30 - k, y: cy - 100 }, { x: cx + 30 + k, y: cy - 100 }, { x: cx + 70 + k, y: cy - 66 }, { x: cx - 70 - k, y: cy - 66 }], true);   // neck and traps
      for (const A of arms) {
        ui.lineStyle(A.w + k * 2, col, alpha); ui.lineBetween(sh[arms.indexOf(A)][0], sh[arms.indexOf(A)][1], A.ex, A.ey);
        ui.lineStyle(A.w - 6 + k * 2, col, alpha); ui.lineBetween(A.ex, A.ey, A.hx, A.hy);
        ui.fillStyle(col, alpha); ui.fillCircle(A.ex, A.ey, A.w / 2 + k); ui.fillCircle(A.hx, A.hy, (pose.fist ? 26 : 22) + k);
      }
      ui.fillEllipse(cx, cy - 128, 70 + k * 2, 80 + k * 2);                                                   // the head
      ui.fillEllipse(cx, cy - 104, 62 + k * 2, 44 + k * 2);                                                   // a heavy jaw
      for (const s of [-1, 1]) {                                                                              // horns curling up and back
        ui.fillTriangle(cx + s * 22, cy - 150, cx + s * 36, cy - 140, cx + s * 58 + s * k, cy - 196 - k);
        ui.fillTriangle(cx + s * 58, cy - 196, cx + s * 50, cy - 184, cx + s * 40 + s * k, cy - 214 - k);
      }
    };
    if (a <= 0 && eyes <= 0) return;
    shapes(RIM, 3, 0.85 * a);                                                                                // (it comes out of the dark: its body is
    shapes(BODY, 0, 1);                                                                                      // black on black - only its rim light fades in)
    if (a > 0) {                                                                                              // the muscles, in the rim light
      ui.lineStyle(2, MUS, a);
      ui.strokeEllipse(cx - 36, cy - 40, 66, 40); ui.strokeEllipse(cx + 36, cy - 40, 66, 40);                 // pecs
      for (let i = 0; i < 3; i++) { ui.strokeRect(cx - 26, cy - 10 + i * 24, 22, 20); ui.strokeRect(cx + 4, cy - 10 + i * 24, 22, 20); }   // abs
      ui.lineBetween(cx, cy - 64, cx, cy + 64);
      for (const A of arms) { ui.lineStyle(2, MUS, a); ui.strokeEllipse((A.ex + sh[arms.indexOf(A)][0]) / 2, (A.ey + sh[arms.indexOf(A)][1]) / 2, 40, 26); }   // biceps
      ui.lineStyle(3, RIM, 0.6 * a); ui.lineBetween(cx - 30, cy - 142, cx + 30, cy - 142);                    // a heavy brow
      for (const A of arms) {                                                                                 // claws
        for (let f = -1; f <= 1.01; f += 0.66) {
          const fa = A.ha + f * 0.5, x0 = A.hx + Math.cos(fa) * 18, y0 = A.hy + Math.sin(fa) * 18;
          ui.lineStyle(5, BODY, a); ui.lineBetween(x0, y0, x0 + Math.cos(fa + 0.4) * 18, y0 + Math.sin(fa + 0.4) * 18);
          ui.lineStyle(1, RIM, a); ui.lineBetween(x0 + Math.cos(fa + 0.4) * 10, y0 + Math.sin(fa + 0.4) * 10, x0 + Math.cos(fa + 0.4) * 18, y0 + Math.sin(fa + 0.4) * 18);
        }
      }
      const open = pose.grin + Math.sin(ct * 0.6) * (pose.grin > 8 ? 3 : 0);                                  // the grin
      ui.fillStyle(0x10081a, a); ui.fillEllipse(cx, cy - 104, 46, 6 + open);
      ui.fillStyle(0xf4eefc, a);
      for (let i = -3; i <= 3; i++) { const x = cx + i * 6; ui.fillTriangle(x - 2.5, cy - 107 - open * 0.3, x + 2.5, cy - 107 - open * 0.3, x, cy - 101); ui.fillTriangle(x - 2.5, cy - 101 + open * 0.5, x + 2.5, cy - 101 + open * 0.5, x, cy - 106 + open * 0.4); }
      for (let i = 0; i < 5; i++) { const x = cx - 50 + i * 25, l = 8 + ((ct + i * 11) % 24); ui.fillStyle(BODY, a); ui.fillRect(x, cy + 60, 3, l); ui.fillCircle(x + 1.5, cy + 60 + l, 2.5); }   // sludge dripping off it
    }
    ui.fillStyle(0xffffff, eyes);                                                                            // its eyes, burning white
    ui.fillTriangle(cx - 26, cy - 134, cx - 6, cy - 128, cx - 22, cy - 124); ui.fillTriangle(cx + 26, cy - 134, cx + 6, cy - 128, cx + 22, cy - 124);
    ui.fillStyle(0xd8b0ff, 0.25 * eyes); ui.fillCircle(cx - 16, cy - 129, 12); ui.fillCircle(cx + 16, cy - 129, 12);
  }

  /** Her karambit, drawn on its own (thrown, or stuck in someone): a curved hooked blade with a ring at the grip. */
  drawKarambit(g, x, y, ang, s) {
    const c = Math.cos(ang), sn = Math.sin(ang), P = (u, v) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
    g.lineStyle(2 * s, 0x1a1418, 1); g.strokeCircle(...P(-6, 0), 2.5 * s);
    g.lineStyle(2 * s, 0x2e2a38, 1); g.lineBetween(...P(-4, 0), ...P(1, 0));
    g.lineStyle(2 * s, 0xd8dce4, 1);
    let prev = P(1, 0); for (let i = 1; i <= 6; i++) { const t = i / 6, pt = P(1 + t * 8, -Math.sin(t * 2.6) * 5); g.lineBetween(...prev, ...pt); prev = pt; }
  }

  /**
   * BLACK TIDE (her Limit): sludge bursts out of her on `hitAt`, hitting everyone in `radius` (harder for each
   * stage she's reached), staining the floor all round her and filling her devotion.
   */
  tideLimit(L) {
    const m = this.match;
    this.vx = 0; this.vy = this.grounded ? 0 : Math.max(-1, this.vy - 0.3);
    if (this.t === L.hitAt) {
      sfx('bighit', 1, 0.45); sfx('curse', 0.9, 0.5); m.shake(10, 16);
      const blast = { ...L.blast, dmg: L.blast.dmg + L.perStage * (this.sludge || 0) };
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.isIntangible()) continue;
        if (Math.hypot(o.x - this.x, o.y - this.y) <= L.radius) m.applyHit(o, { h: blast, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'tide' + this.slot + ':' + o.slot + ':' + this.age, pillar: true }, this.x);
      }
      const R = Math.random;
      for (let i = 0; i < 40; i++) m.particles.push({ x: this.x, y: this.y - 24, vx: (R() - 0.5) * 12, vy: -1 - R() * 6, life: 40, color: SLUDGE[i % 3], size: 3, grav: 0.25 });
      for (const p of m.stage.platforms) for (let i = 0; i < 6; i++) { const x = this.x + (R() - 0.5) * L.radius * 2; if (Math.abs(p.y - this.y) < L.radius) this.stain(x, p, 6 + R() * 6); }
      if (this.sludge < 3) this.devotion = this.def.devoted.need[this.sludge];
    }
    if (this.t < L.hitAt) m.particles.push({ shape: 'ring', x: this.x, y: this.y - 28, vx: 0, vy: 0, life: 10, maxLife: 10, r: 40 - this.t * 2, dr: -2, color: 0x2e2a38, grav: 0 });
    if (this.t >= L.frames) { this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
  }
}
