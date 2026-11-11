// THE DEVOTED's mechanics (def.devoted, devoted.js): his SYMBOL, the DEVOTION meter, PRAY (down special) and
// the four SLUDGE STAGES he climbs, the sludge stains he leaves on the stage (match.sludgeStains), and his Limit
// FEED THE DARK (and his old one, BLACK TIDE). Mixed into Fighter like the other fighter*.js files.
import { sfx } from '../audio/sfx.js';
import { FONT, VIEW_W, VIEW_H } from '../config.js';
import { showFighter } from './roster.js';
import { skinTexture } from './skins.js';

const SLUDGE = [0x060508, 0x0e0c12, 0x1a1720];

/** THE DEVOTED's methods (symbol, devotion, PRAY, sludge stages, stains, BLACK TIDE), attached to Fighter. */
export class FighterDevoted {
  /**
   * Every frame for THE DEVOTED: sets him up the first time, puts his symbol down where he first lands after
   * (re)spawning, keeps DROWNED's wing jumps, and drips / stains sludge at the rate his stage gives.
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
    else if (this.sigilWait && this.grounded && this.platform && this.alive) {       // his symbol appears where he lands
      this.sigilWait = false;
      this.sigil = { x: this.x, y: this.y, plat: this.platform, dx: this.x - this.platform.x1, born: this.age };
      sfx('curse', 0.4, 1.4); m.puff(this.x, this.y - 20, 0x3a3028, 10);   // (the dying tree grows there)
    }
    if (this.sigil && this.sigil.plat) { this.sigil.x = this.sigil.plat.x1 + this.sigil.dx; this.sigil.y = this.sigil.plat.y; }   // (riding a moving platform)
    if (this.swimCd > 0) this.swimCd--;
    if (this.sludge >= 3 && this.grounded) this.jumpsLeft = Math.max(this.jumpsLeft, D.wingJumps);
    if (this.sludge >= 3) {                                   // DROWNED: holding jump on the way down hangs him in the air
      if (this.grounded) this.hoverLeft = D.hover.hold;
      else if ((this.state === 'air' || this.state === 'attack') && this.ctrl.held('jump') && this.vy > -0.5 && this.hoverLeft > 0) {
        this.hoverLeft--; this.vy = Math.min(this.vy, -0.2);
        if (this.age % 5 === 0 && !m.demo) { const R = Math.random; m.particles.push({ x: this.x - this.facing * 16 + (R() - 0.5) * 16, y: this.y - 30, vx: -this.facing * 0.4, vy: 1.2 + R(), life: 16, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.1 }); }
      }
    }
    if (this.cutFx) { for (const c of this.cutFx) c.age++; this.cutFx = this.cutFx.filter((c) => c.age < 14); }
    const U = this.def.moves.upb;
    if (this.state === 'upb' && U.geyser && this.t <= U.riseAt + U.geyser.length && !m.demo) {   // SLUDGE GEYSER: the column of sludge under him
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
    const under = this.state === 'sludgeswim';           // (under the sludge he only swims in what's there - he doesn't spread it)
    if (every && !under && this.grounded && this.platform && this.age % every === 0) this.stain(this.x + (Math.random() - 0.5) * 10, this.platform, 3 + this.sludge * 2);
    const drip = D.dripEvery[this.sludge];
    if (drip && !under && this.age % drip === 0 && !m.demo) {
      const R = Math.random;
      m.particles.push({ x: this.x + (R() - 0.5) * 18, y: this.y - 10 - R() * 36, vx: (R() - 0.5) * 0.3, vy: 0.3, life: 30, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.16 });
    }
  }

  /**
   * OFFERING (neutral special): flings globs of sludge from his cut palm - more of them, fanned out, at each stage
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

  /** Switches his look, stats and powers to a sludge stage (0 DEFAULT - 3 DROWNED). */
  setSludge(n) {
    const D = this.def.devoted;
    this.sludge = n;
    this.sheets = Object.fromEntries(Object.entries(this.def.sludgeSheets[n]).map(([k, key]) => [k, skinTexture(this.scene, key, this.def.id, this.skin)]));   // (in his costume's colours)
    this.devoteDmg = D.dmg[n]; this.devoteSpeed = D.speed[n]; this.devoteKb = D.kb[n];
    this.demonFloat = n >= 3 ? D.hover.float : null;          // DROWNED hovers like a demon
  }

  /** A hit he landed: one more toward his next stage. Says PRAY when the meter is full. */
  addDevotion(n = 1) {
    const D = this.def.devoted;
    if (this.sludge === undefined || this.sludge >= 3) return;
    const need = D.need[this.sludge], was = this.devotion;
    this.devotion = Math.min(need, this.devotion + n);
    if (was < need && this.devotion >= need) { this.match.popText(this, 'PRAY', '#f8f4ec'); sfx('limitready', 0.45, 0.6); }
  }

  /** True when praying right now would take him up a stage: devotion full, near his symbol, standing. */
  canAscend() {
    const D = this.def.devoted;
    if (this.sludge >= 3 || this.devotion < D.need[this.sludge] || !this.sigil || !this.grounded) return false;
    return Math.abs(this.x - this.sigil.x) <= D.range && Math.abs(this.y - this.sigil.y) <= 40;
  }

  /**
   * PRAY (his down special, run from st_attack while the downB move plays): decides on the first frame whether
   * the prayer is answered; an answered one takes him up a stage on `ascendAt`, an unanswered one ends early.
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
      if (this.t < D.ascendAt && this.t % 3 === 0) {      // the sludge rises out of the floor round him
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

  /** Draws his symbol (the dying tree) and (for the first DEVOTED) every sludge stain. His meter is on the HUD (drawDevotionHud). */
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
    if (this.cutFx) for (const c of this.cutFx) {         // CROSS CUTS: the slashes hang in the air for a moment
      const k = 1 - c.age / 14, dx = Math.cos(c.a) * c.len / 2, dy = Math.sin(c.a) * c.len / 2;
      g.lineStyle(5 * k, 0x7a2ad8, 0.7 * k); g.lineBetween(c.x - dx, c.y - dy, c.x + dx, c.y + dy);
      g.lineStyle(2 * k, 0xf4eefc, k); g.lineBetween(c.x - dx, c.y - dy, c.x + dx, c.y + dy);
    }
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

  /** The ink fall he's touching in the air (within reach of its column), or null. */
  fallNear() {
    if (this.grounded) return null;
    return this.sludgeFalls().find((f) => Math.abs(this.x - (f.x + f.side * this.body.w / 2)) < 24 && this.y > f.top + 4 && this.y - this.body.h < f.bot) || null;
  }

  /** SLUDGE SWIM: can down special sink him into the sludge here? (standing in a stain, or in the air by an ink fall - and not able to go up a stage) */
  canSwim() {
    if (this.swimCd > 0 || this.canAscend()) return false;
    if (this.grounded) return !!(this.platform && this.stainAt(this.x, this.platform));
    return !!this.fallNear();
  }

  /** Sinks him into the sludge (state sludgeswim), or into the ink fall he's next to (state sludgeclimb). */
  startSwim() {
    const fall = this.fallNear();
    if (fall) { this.enterFall(fall, this.y); return; }
    this.setState('sludgeswim'); this.vx = 0; this.swimFrom = this.x;
    sfx('geyser', 0.3, 1.4); sfx('curse', 0.2, 1.6);
    const R = Math.random;
    for (let i = 0; i < 10; i++) this.match.particles.push({ x: this.x + (R() - 0.5) * 20, y: this.y - 2, vx: (R() - 0.5) * 2.5, vy: -1 - R() * 2, life: 18, color: SLUDGE[i % 3], size: 2, grav: 0.2 });
  }

  /**
   * Every frame under the sludge: slides along the stains on his platform with the stick (stopping at their edge),
   * can't be hit, and bursts out with jump / attack / special, or when he's been under too long or lost the floor.
   * @param {object} c - his controller
   */
  st_sludgeswim(c) {
    const W = this.def.moves.downB.swim, m = this.match, plat = this.platform, R = Math.random;
    this.vx = 0;
    if (!this.grounded || !plat) { this.swimCd = W.cooldown; this.setState('air'); return; }
    if (this.t <= W.sink) return;
    this.invincible = Math.max(this.invincible, 2);
    if (Math.abs(c.x) > 0.2) {
      this.facing = Math.sign(c.x);
      const nx = Math.max(plat.x1 + 1, Math.min(plat.x2 - 1, this.x + c.x * W.speed * this.speedMult));   // (he stays on the platform...)
      const fall = this.sludgeFalls().find((f) => f.plat === plat && f.side === Math.sign(c.x));
      if (fall && Math.abs(nx - fall.x) < 3) { this.enterFall(fall, plat.y + 8); return; }   // (...unless an ink fall takes him over the edge)
      if (this.stainAt(nx, plat)) this.x = nx;             // (never out past the sludge's edge)
      else for (let k = 1; k <= 6; k++) { const px = this.x + Math.sign(c.x) * k; if (this.stainAt(px, plat)) this.x = px; else break; }
      if (this.t % 3 === 0) m.particles.push({ x: this.x - this.facing * 8, y: this.y - 1, vx: -this.facing * (0.5 + R()), vy: -0.6 - R() * 1.2, life: 14, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.15 });
    }
    const leap = this.buffer.jump;
    if (leap || this.buffer.attack || this.buffer.special || this.t > W.max) this.swimPop(leap ? W.leap : W.hop);
  }

  /**
   * Into an ink fall (state sludgeclimb): he hangs in the column of sludge pouring off a platform's edge.
   * @param {object} fall - from sludgeFalls()
   * @param {number} y - how far down it he goes in
   */
  enterFall(fall, y) {
    this.setState('sludgeclimb'); this.climbFall = fall; this.climbRush = false;
    this.vx = this.vy = this.lx = this.ly = 0; this.grounded = false; this.platform = null; this.fastFalling = false;
    this.x = fall.x + fall.side * this.body.w / 2; this.y = Math.max(fall.top + 8, Math.min(fall.bot, y)); this.facing = -fall.side;
    sfx('geyser', 0.3, 1.6);
  }

  /**
   * Every frame in an ink fall: up / down swims along it (climbing back up the stage's side); at the top, holding
   * up pulls him out onto the platform; at the bottom, holding down lets go. Jump shoots him up it and out onto the platform,
   * attack / special bursts out away from it. Can't be hit; he comes out by himself when he's been in the sludge too long, or if the fall dries up.
   * @param {object} c - his controller
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
   * @param {number} vy - his jump out
   * @param {number} vx - sideways push
   */
  swimPop(vy, vx = 0) {
    const m = this.match, R = Math.random, W = this.def.moves.downB.swim;
    this.buffer.jump = this.buffer.attack = this.buffer.special = 0;
    this.swimCd = W.cooldown;
    this.startAttack('swimPop');
    this.vy = vy; this.vx = vx; if (vx) this.facing = Math.sign(vx);
    this.grounded = false; this.platform = null; this.y -= 1;
    sfx('geyser', 0.45, 1.1); m.shake(2, 6);
    for (let i = 0; i < 16; i++) m.particles.push({ x: this.x + (R() - 0.5) * 16, y: this.y - 2, vx: (R() - 0.5) * 4, vy: -2 - R() * 4, life: 22, color: SLUDGE[i % 3], size: 3, grav: 0.25 });
  }

  /**
   * Draws him under the sludge: sinking into it, then only a black bulge in the puddle with his white eyes and
   * smile peeking out, rippling as he moves.
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
   * His OBLATION meter on the HUD: a column of living sludge standing on his player plate. Its sides wobble and bulge,
   * the purple sludge inside rises from the bottom as he lands hits (bubbling, with a wavy surface), it drips off its
   * sides, and OBLATION is written down it. On top sits a sludge-soaked skull with glowing eyes; when the meter is
   * full (and always at DROWNED) the skull LAUGHS - jaw clacking, rattling, eyes squeezed shut, "HA" popping out.
   * @param {Phaser.GameObjects.Graphics} g - the HUD's graphics
   * @param {number} cx - the column's middle
   * @param {number} by - its foot (the top of his plate)
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
    // the purple sludge inside, rising with his devotion: a wavy surface, a lit edge, bubbles
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
   * CROSS CUTS (side special), every frame of a cut: draws its slash, holds him up in the air, and when special is
   * tapped in the cut's window, carries on into the next cut (the last one he has at his stage is the finisher).
   * @param {object} m - the cut's move
   * @returns {boolean} true when it started the next cut
   */
  cutStep(m) {
    const D = this.def.devoted, max = D.cuts[this.sludge || 0];
    if (!this.grounded) { this.vy = Math.min(this.vy, 0.5); if (this.t === 1) this.vx = this.facing * 2; }   // (cuts in the air keep him up)
    const h = m.hits[0];
    if (this.t === h.from) {
      const x = this.x + this.facing * (h.box[0] + h.box[2] / 2), y = this.y + h.box[1] + h.box[3] / 2;
      this.cutFx = this.cutFx || [];
      if (m.cut === 9) { this.cutFx.push({ x, y, a: 0.8, len: 70, age: 0 }, { x, y, a: -0.8, len: 70, age: 0 }); sfx('shing', 0.6, 0.7); }
      else this.cutFx.push({ x, y, a: [-0.6, 0.6, -0.15, 1.2][(m.cut - 1) % 4] * this.facing, len: 52, age: 0 });
      sfx('slash', 0.5, 0.9 + m.cut * 0.07);
    }
    if (!m.next || !this.buffer.special || this.t < m.next[0] || this.t > m.next[1]) return false;
    this.buffer.special = 0;
    const n = m.cut + 1;
    this.startAttack(n >= max ? 'sideBF' : 'sideB' + n);
    return true;
  }

  /**
   * THE SYMBOL: a small dying tree growing where he first landed - crooked bare trunk, drooping broken branches with
   * a few dead leaves left on them, black sludge weeping from a knot in the trunk. When his prayer would be answered
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
    // the knot: black sludge weeps out of it; a pale smile in it when he's ready
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
   * FEED THE DARK (his Limit): throws the karambit at the nearest opponent in reach. If it sticks, a cutscene
   * (`drawRite`): a giant shadow demon of sludge rises behind them, grabs them, lifts them and tears them in half -
   * back in the arena they're KO'd on the spot. With nobody in reach (or if they vanish) the knife just flies off.
   */
  riteLimit(L) {
    const m = this.match;
    this.vx = 0; this.lx = 0; this.vy = this.grounded ? 0 : Math.min(this.vy, 0.5);
    if (this.t === 1) {
      let best = null, bd = L.reach;
      for (const o of m.fighters) {
        if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || o.eliminated) continue;
        const d = Math.hypot(o.x - this.x, o.y - this.y); if (d < bd) { bd = d; best = o; }
      }
      if (best) this.facing = Math.sign(best.x - this.x) || this.facing;
      this.ult = { rite: true, target: best, victims: best ? [best] : [], phase: 'aim', ct: 0 };
      sfx('curse', 0.6, 0.6);
    }
    const U = this.ult, T = U.target;
    if (U.phase === 'aim' && this.t === L.throwAt) {      // the knife leaves his hand
      U.phase = 'throw'; U.kx = this.x + this.facing * 14; U.ky = this.y - 38; U.kvx = this.facing * L.knifeSpeed; U.kvy = 0; U.spin = 0;
      sfx('swing', 0.8, 0.8); sfx('whoosh', 0.5, 1.2);
    }
    if (U.phase === 'throw') {
      U.spin += 0.6;
      const live = T && T.alive && T.state !== 'respawn' && !T.isIntangible();
      if (live) {                                           // homing in on them
        const dx = T.x - U.kx, dy = T.y - 30 - U.ky, d = Math.hypot(dx, dy);
        if (d < 16) {                                       // it sticks: the cutscene
          sfx('hit', 0.9, 0.7); sfx('bighit', 0.6, 0.5); m.shake(6, 8);
          U.phase = 'cutscene'; U.ct = 0; m.frozen = 9999; m.cutscene = this; U.origin = { x: this.x, y: this.y };
          T.vx = T.vy = T.lx = T.ly = 0; T.setState('hitstun'); T.hitstun = 999; U.tx = T.x; U.ty = T.y;
          return;
        }
        U.kvx = dx / d * L.knifeSpeed; U.kvy = dy / d * L.knifeSpeed;
      }
      U.kx += U.kvx; U.ky += U.kvy;
      if (!live || this.t > L.throwAt + L.flyFor) { U.phase = 'miss'; U.missEnd = this.t + L.whiff; m.popText(this, '...', '#8a8494'); }
      return;
    }
    if (U.phase === 'miss') { U.kx += U.kvx; U.ky += U.kvy + (this.t - L.throwAt) * 0.02; U.spin += 0.6; if (this.t >= U.missEnd) this.endRite(); return; }
    if (U.phase === 'cutscene') {
      const C = L.scene, ct = ++U.ct;
      if (!T.alive) return this.endRite();
      T.vx = T.vy = T.lx = T.ly = 0; T.x = U.tx; T.y = U.ty;
      if (ct === C.rise) { sfx('rumble', 0.8, 0.6); sfx('roar', 0.6, 0.45); }
      if (ct === C.grab) { sfx('bighit', 0.8, 0.5); sfx('laugh', 0.6, 0.5); }
      if (ct === C.lift) sfx('rumble', 0.5, 0.8);
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
   * Draws FEED THE DARK: the spinning karambit in the arena, then the cutscene on screen - the dark, the victim with
   * the knife in them, the giant sludge demon rising, its hands closing round them, lifting them, and the tear.
   * @param {object|null} U - the Limit's state (null clears it all away)
   */
  drawRite(U) {
    const m = this.match;
    if (!this.riteG) {
      this.riteG = this.scene.add.graphics().setDepth(30); m.addWorld(this.riteG);
      this.riteUI = this.scene.add.graphics().setDepth(40); m.addUI(this.riteUI);
      this.riteFront = this.scene.add.graphics().setDepth(42); m.addUI(this.riteFront);
      this.riteTop = this.scene.add.sprite(0, 0, this.sheets.idle, 0).setDepth(41).setVisible(false); m.addUI(this.riteTop);
      this.riteBot = this.scene.add.sprite(0, 0, this.sheets.idle, 0).setDepth(41).setVisible(false); m.addUI(this.riteBot);
      this.riteText = this.scene.add.text(VIEW_W / 2, 17, '', { fontFamily: FONT, fontSize: '10px', color: '#c890ff' }).setOrigin(0.5).setDepth(43).setVisible(false); m.addUI(this.riteText);
    }
    const g = this.riteG, ui = this.riteUI, fr = this.riteFront;
    g.clear(); ui.clear(); fr.clear(); this.riteTop.setVisible(false); this.riteBot.setVisible(false); this.riteText.setVisible(false);
    if (!U) return;
    if (U.phase === 'throw' || U.phase === 'miss') {        // the knife, spinning through the air
      for (let i = 1; i <= 3; i++) { g.fillStyle(0x7a2ad8, 0.25 / i); g.fillCircle(U.kx - U.kvx * i * 0.6, U.ky - U.kvy * i * 0.6, 4); }
      this.drawKarambit(g, U.kx, U.ky, U.spin, 1);
      return;
    }
    if (U.phase !== 'cutscene') return;
    const L = this.def.limit, C = L.scene, ct = U.ct, T = U.target, W = VIEW_W, H = VIEW_H, floor = H - 64, R = Math.random;
    // ---- the dark: a black void, a lake of sludge for a floor, purple mist
    for (let y = 0; y < floor; y += 8) { const k = y / floor; ui.fillStyle(Phaser.Display.Color.GetColor(14 + k * 22, 8 + k * 10, 22 + k * 30), 1); ui.fillRect(0, y, W, 8); }   // a sick purple glow low down
    for (let i = 0; i < 6; i++) { ui.fillStyle(0x3a2450, 0.18); ui.fillEllipse(W / 2 + Math.sin(ct * 0.01 + i) * 120, floor - 20 - i * 16, 560 - i * 50, 36); }
    ui.fillStyle(0x0b0810, 1); ui.fillRect(0, floor, W, H - floor);
    for (let x = 0; x < W; x += 6) { ui.fillStyle(0x2e2a38, 0.5); ui.fillRect(x, floor + Math.round(Math.sin(x * 0.07 + ct * 0.1) * 1.5), 4, 1); }
    // ---- the demon
    const rise = Math.max(0, Math.min(1, (ct - C.rise) / 40)), dx = W * 0.68, headY = floor - 20 - rise * 196;
    const lift = Math.max(0, Math.min(1, (ct - C.lift) / (C.tear - C.lift - 6)));
    const vx = W * 0.4, vy = floor - lift * 110 - (ct >= C.grab ? 4 : 0), torn = ct >= C.tear, since = ct - C.tear;
    if (rise > 0) this.drawDemon(ui, dx, headY, floor, rise, ct, C);
    // ---- them, with the knife in them; torn in two after the tear
    const vTex = T.sheets.idle;
    for (const [spr, top] of [[this.riteTop, true], [this.riteBot, false]]) {
      if (T.def.menuSheets) showFighter(spr, T.def, 0, T.skin);
      else spr.setTexture(vTex, 0).setOrigin(T.def.originX ?? 0.5, T.def.originY ?? 1);
      spr.setScale(2).setFlipX(!!T.def.facesLeft).setVisible(true).setTintMode(Phaser.TintModes.MULTIPLY).setTint(torn ? 0x9a8aa8 : 0xd8d0e0);
      const fh = spr.frame.realHeight, fw = spr.frame.realWidth, waist = Math.max(4, Math.round((T.def.originY ?? 1) * fh - T.body.h * 0.55));
      if (top) spr.setCrop(0, 0, fw, waist); else spr.setCrop(0, waist, fw, fh - waist);
      const k = torn ? Math.min(1, since / 18) : 0, shake = ct >= C.grab && !torn ? Math.sin(ct * 2) * 1.5 : 0;
      spr.setPosition(vx + shake + (top ? -1 : 1) * k * 70, vy + (top ? -1 : 1) * k * 40 + (torn ? since * since * 0.03 : 0)).setRotation(torn ? (top ? -1 : 1) * k * 0.9 : 0);
    }
    if (!torn) this.drawKarambit(fr, vx + 8, vy - T.body.h * 1.1, 2.4, 2);
    // ---- its hands: closing round them from the grab, the second one at their legs for the tear
    if (ct >= C.grab - 10 && !torn) {
      const k = Math.min(1, (ct - (C.grab - 10)) / 10);
      this.drawClaw(fr, vx + 26 - (1 - k) * 60, vy - T.body.h * 1.3, 1, k);
      if (ct >= C.tear - 18) this.drawClaw(fr, vx + 24 + (1 - Math.min(1, (ct - (C.tear - 18)) / 10)) * 60, vy - 10, 1, 1);
    }
    if (torn && since < 30) {                                // the tear: sludge bursting out of them
      if (!U.spray) U.spray = Array.from({ length: 50 }, () => ({ x: vx, y: vy - T.body.h * 1.1, vx: (R() - 0.5) * 9, vy: -2 - R() * 6, r: 1 + R() * 3 }));
      for (const p of U.spray) { p.x += p.vx; p.y += p.vy; p.vy += 0.35; fr.fillStyle(p.r > 2.5 ? 0x4a3248 : 0x060508, 1); fr.fillCircle(p.x, p.y, p.r); }
      this.drawClaw(fr, vx - 50 - since * 2, vy - T.body.h * 1.4 - since, 1, 1); this.drawClaw(fr, vx + 70 + since * 2, vy + 20 + since, 1, 1);
    }
    // impact frames at the tear
    if (torn && since < 4) { fr.fillStyle(since < 2 ? 0xffffff : 0x000000, 1); fr.fillRect(0, 0, W, H); if (since >= 2) { this.riteTop.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff); this.riteBot.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff); } else { this.riteTop.setVisible(false); this.riteBot.setVisible(false); } }
    // ---- letterbox, a line of text, fades
    fr.fillStyle(0x000000, 1); fr.fillRect(0, 0, W, 34); fr.fillRect(0, H - 34, W, 34);
    const line = ct < C.rise ? '' : ct < C.grab ? 'IT HUNGERS.' : torn && since > 10 ? 'FED.' : '';
    if (line) this.riteText.setText(line).setVisible(true);
    if (ct < 8 || ct > C.end - 8) { fr.fillStyle(0x000000, ct < 8 ? 1 - ct / 8 : (ct - (C.end - 8)) / 8); fr.fillRect(0, 0, W, H); }
  }

  /**
   * The shadow demon of the Limit: a towering body of black sludge rising out of the floor, curved horns, white
   * slit eyes, an enormous grin full of teeth, purple sheen and drips, and long arms.
   * @param {number} cx - its middle; headY - where its head is; floor - the sludge lake; rise - how far it's up (0-1)
   */
  drawDemon(ui, cx, headY, floor, rise, ct, C) {
    const sway = Math.sin(ct * 0.04) * 6, hx = cx + sway, R = Math.random;
    ui.fillStyle(0x4a2a68, 0.9);                                                                                // a faint purple rim round its silhouette
    ui.fillEllipse(hx, (headY + floor) / 2 + 30, 228, floor - headY + 48); ui.fillEllipse(hx, headY, 128, 108);
    ui.fillTriangle(hx - 48, headY - 20, hx - 28, headY - 44, hx - 100, headY - 116); ui.fillTriangle(hx + 48, headY - 20, hx + 28, headY - 44, hx + 100, headY - 116);
    ui.fillStyle(0x020203, 1);
    ui.fillTriangle(hx - 150, floor + 4, hx + 150, floor + 4, hx, headY + 30);                                  // its body, a mound of sludge
    ui.fillEllipse(hx, (headY + floor) / 2 + 30, 220, floor - headY + 40);
    ui.fillEllipse(hx, headY, 120, 100);                                                                        // the head
    ui.fillTriangle(hx - 44, headY - 22, hx - 30, headY - 40, hx - 96, headY - 110);                             // horns
    ui.fillTriangle(hx + 44, headY - 22, hx + 30, headY - 40, hx + 96, headY - 110);
    ui.fillStyle(0x2e1a3e, 0.8);                                                                                 // a purple sheen
    ui.fillEllipse(hx - 30, headY - 20, 30, 12); ui.fillRect(hx - 90, headY + 60, 4, floor - headY - 70);
    // arms, reaching toward the victim
    const reach = Math.min(1, Math.max(0, (ct - (C.grab - 24)) / 20));
    ui.lineStyle(26, 0x020203, 1); ui.lineBetween(hx - 60, headY + 70, hx - 60 - reach * 90, headY + 120 + reach * 20);
    ui.lineBetween(hx + 60, headY + 70, hx + 70, floor - 20);
    // the eyes: white slits, and the grin
    const blink = (ct % 90) < 4;
    ui.fillStyle(0xffffff, 1);
    if (!blink) { ui.fillTriangle(hx - 40, headY - 6, hx - 10, headY + 2, hx - 36, headY + 6); ui.fillTriangle(hx + 40, headY - 6, hx + 10, headY + 2, hx + 36, headY + 6); }
    ui.fillStyle(0xd8b0ff, 0.25); ui.fillCircle(hx - 26, headY, 16); ui.fillCircle(hx + 26, headY, 16);
    const open = ct >= C.grab ? 10 + Math.sin(ct * 0.6) * 4 : 4;                                                  // (laughing once it has them)
    ui.fillStyle(0x0b0810, 1); ui.fillEllipse(hx, headY + 28, 90, 12 + open);
    ui.fillStyle(0xf4eefc, 1);
    for (let i = -5; i <= 5; i++) { const x = hx + i * 8, d = Math.abs(i); ui.fillTriangle(x - 3, headY + 23 - d * 0.4, x + 3, headY + 23 - d * 0.4, x, headY + 30); ui.fillTriangle(x - 3, headY + 33 + open * 0.5, x + 3, headY + 33 + open * 0.5, x, headY + 27 + open * 0.3); }
    for (let i = 0; i < 7; i++) {                                                                                 // drips running off it
      const x = hx - 70 + i * 23, l = 10 + ((ct + i * 13) % 30);
      ui.fillStyle(0x020203, 1); ui.fillRect(x, headY + 40, 3, l); ui.fillCircle(x + 1.5, headY + 40 + l, 2.5);
    }
    if (rise < 1 && R() < 0.8) { ui.fillStyle(0x0b0810, 1); ui.fillCircle(hx + (R() - 0.5) * 260, floor - R() * 10, 3 + R() * 5); }      // the lake churning as it rises
  }

  /**
   * One of the demon's hands: four long black claws curled round a point.
   * @param {number} side - which way it faces; k - how closed it is (0-1)
   */
  drawClaw(g, x, y, side, k) {
    g.fillStyle(0x020203, 1); g.fillEllipse(x + side * 10, y, 34, 26);
    for (let i = 0; i < 4; i++) {
      const fy = y - 12 + i * 8, curl = 18 + 10 * k;
      g.lineStyle(6, 0x020203, 1); g.lineBetween(x, fy, x - side * curl, fy + 2 + 4 * k);
      g.lineStyle(2, 0x2e1a3e, 1); g.lineBetween(x - side * (curl - 6), fy + 1, x - side * curl, fy + 2 + 4 * k);
    }
  }

  /** His karambit, drawn on its own (thrown, or stuck in someone): a curved hooked blade with a ring at the grip. */
  drawKarambit(g, x, y, ang, s) {
    const c = Math.cos(ang), sn = Math.sin(ang), P = (u, v) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
    g.lineStyle(2 * s, 0x1a1418, 1); g.strokeCircle(...P(-6, 0), 2.5 * s);
    g.lineStyle(2 * s, 0x2e2a38, 1); g.lineBetween(...P(-4, 0), ...P(1, 0));
    g.lineStyle(2 * s, 0xd8dce4, 1);
    let prev = P(1, 0); for (let i = 1; i <= 6; i++) { const t = i / 6, pt = P(1 + t * 8, -Math.sin(t * 2.6) * 5); g.lineBetween(...prev, ...pt); prev = pt; }
  }

  /**
   * BLACK TIDE (his Limit): sludge bursts out of him on `hitAt`, hitting everyone in `radius` (harder for each
   * stage he's reached), staining the floor all round him and filling his devotion.
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
