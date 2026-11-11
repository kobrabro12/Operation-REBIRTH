// THE DEVOTED's mechanics (def.devoted, devoted.js): his SYMBOL, the DEVOTION meter, PRAY (down special) and
// the four SLUDGE STAGES he climbs, the sludge stains he leaves on the stage (match.sludgeStains), and his Limit
// BLACK TIDE. Mixed into Fighter like the other fighter*.js files.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';
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
    if (every && this.grounded && this.platform && this.age % every === 0) this.stain(this.x + (Math.random() - 0.5) * 10, this.platform, 3 + this.sludge * 2);
    const drip = D.dripEvery[this.sludge];
    if (drip && this.age % drip === 0 && !m.demo) {
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
    }
    const ready = this.sludge < 3 && this.devotion >= D.need[this.sludge];
    if (this.sigil) this.drawTree(g, this.sigil.x, this.sigil.y, Math.min(1, (this.age - this.sigil.born) / 30), ready);
  }

  /** The stain under x on platform plat (any DEVOTED's), within `pad` px of its edge, or null. */
  stainAt(x, plat, pad = 0) {
    const S = this.match.sludgeStains;
    if (!S || !plat) return null;
    return S.find((s) => s.plat === plat && Math.abs(x - (plat.x1 + s.dx)) <= s.w + pad) || null;
  }

  /** SLUDGE SWIM: can down special sink him into the sludge here? (on the floor, by a stain, and not able to go up a stage) */
  canSwim() {
    const W = this.def.moves.downB.swim;
    return this.grounded && this.platform && !(this.swimCd > 0) && !this.canAscend() && !!this.stainAt(this.x, this.platform, W.near);
  }

  /** Sinks him into the sludge (state sludgeswim). */
  startSwim() {
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
      const nx = this.x + c.x * W.speed * this.speedMult;
      if (this.stainAt(nx, plat, 4)) this.x = nx;             // (never out past the sludge's edge)
      else for (let k = 1; k <= 6; k++) { const px = this.x + Math.sign(c.x) * k; if (this.stainAt(px, plat, 4)) this.x = px; else break; }
      if (this.t % 3 === 0) m.particles.push({ x: this.x - this.facing * 8, y: this.y - 1, vx: -this.facing * (0.5 + R()), vy: -0.6 - R() * 1.2, life: 14, color: SLUDGE[Math.floor(R() * 3)], size: 2, grav: 0.15 });
    }
    const leap = this.buffer.jump, out = leap || this.buffer.attack || this.buffer.special || this.t > W.max;
    if (!out) return;
    this.buffer.jump = this.buffer.attack = this.buffer.special = 0;
    this.swimCd = W.cooldown;
    this.startAttack('swimPop');
    this.vy = leap ? W.leap : W.hop; this.grounded = false; this.platform = null; this.y -= 1;
    sfx('geyser', 0.45, 1.1); m.shake(2, 6);
    for (let i = 0; i < 16; i++) m.particles.push({ x: this.x + (R() - 0.5) * 16, y: this.y - 2, vx: (R() - 0.5) * 4, vy: -2 - R() * 4, life: 22, color: SLUDGE[i % 3], size: 3, grav: 0.25 });
  }

  /**
   * Draws him under the sludge: sinking into it, then only a black bulge in the puddle with his white eyes and
   * smile peeking out, rippling as he moves.
   */
  drawSwim(spr, g) {
    const W = this.def.moves.downB.swim, k = Math.min(1, this.t / W.sink);
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
   * His OBLATION meter on the HUD (after Mason's drawing): a totem standing on his player plate - a skull with glowing
   * eyes on top, a bar that fills with purple from the bottom as he lands hits (OBLATION written down it), black thorns
   * wound round it, white spikes jutting out and purple dripping off. It pulses when he can pray; the skull's eyes
   * and crown show his stage; DROWNED keeps it full and overflowing.
   * @param {Phaser.GameObjects.Graphics} g - the HUD's graphics
   * @param {number} cx - the totem's middle
   * @param {number} by - its foot (the top of his plate)
   * @param {number} frame - for the animation
   */
  drawDevotionHud(g, cx, by, frame) {
    const D = this.def.devoted, need = this.sludge < 3 ? D.need[this.sludge] : 0;
    const frac = need ? Math.min(1, this.devotion / need) : 1, ready = !need || this.devotion >= need;
    const W = 12, Hh = 72, top = by - Hh, pulse = ready ? 0.5 + 0.5 * Math.sin(frame * 0.2) : 0;
    if (!this.oblText) {                                    // the lettering, once
      this.oblText = this.scene.add.text(0, 0, 'O\nB\nL\nA\nT\nI\nO\nN', { fontFamily: FONT, fontSize: '5px', color: '#f4eefc', align: 'center', lineSpacing: 1, stroke: '#1a0a2a', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(11);
      this.match.addUI(this.oblText);
    }
    this.oblText.setPosition(cx + 0.5, top + 5).setVisible(!this.eliminated);
    // white spikes jutting out, up near the skull
    for (const [sx, sy, ex, ey] of [[-6, 6, -15, -4], [-6, 14, -16, 8], [-6, 22, -14, 18], [6, 6, 15, -4], [6, 14, 16, 8], [6, 22, 14, 18]]) {
      g.lineStyle(3, 0x0b0a14, 1); g.lineBetween(cx + sx, top + sy, cx + ex, top + ey);
      g.lineStyle(1, 0xf4eefc, 1); g.lineBetween(cx + sx, top + sy, cx + ex, top + ey);
    }
    // the bar: black frame, dark when empty, purple filling up from the bottom
    g.fillStyle(0x000000, 0.5); g.fillRect(cx - W / 2 + 2, top + 2, W, Hh);
    g.fillStyle(0x0b0a14, 1); g.fillRect(cx - W / 2 - 1, top - 1, W + 2, Hh + 2);
    g.fillStyle(0x24123a, 1); g.fillRect(cx - W / 2, top, W, Hh);
    const fh = Math.round(Hh * frac);
    if (fh > 0) {
      g.fillStyle(ready ? (frame % 20 < 10 ? 0x9a4aff : 0x7a2ad8) : 0x6a22c0, 1); g.fillRect(cx - W / 2, by - fh, W, fh);
      g.fillStyle(0xb47aff, 0.8); g.fillRect(cx - W / 2, by - fh, 2, fh);                     // a lit left edge
      g.fillStyle(0x3a0e70, 0.8); g.fillRect(cx + W / 2 - 2, by - fh, 2, fh);                 // a shaded right edge
      g.fillStyle(0xd8b0ff, 1); g.fillRect(cx - W / 2, by - fh, W, 1);                        // the surface
    }
    if (pulse) { g.fillStyle(0xb47aff, 0.15 * pulse); g.fillRect(cx - W / 2 - 4, top - 4, W + 8, Hh + 8); }
    // purple dripping off its sides
    for (const [dx, ph] of [[-W / 2 - 1, 0], [W / 2, 7], [-W / 2 - 1, 13], [W / 2, 21]]) {
      const len = 3 + ((frame >> 3) + ph) % 6, dy = 18 + ph * 2.4;
      g.fillStyle(0x7a2ad8, 0.9); g.fillRect(cx + dx, top + dy, 1, len); g.fillRect(cx + dx, top + dy + len + 1, 1, 1);
    }
    // black thorns winding round it
    g.lineStyle(1, 0x0b0a14, 1);
    for (let y = top + 10; y < by - 4; y += 15) {
      g.lineBetween(cx - W / 2 - 3, y + 8, cx + W / 2 + 3, y);
      for (const t of [0.25, 0.6]) { const px = cx - W / 2 - 3 + (W + 6) * t, py = y + 8 - 8 * t; g.lineBetween(px, py, px + 2, py - 3); }
    }
    // the skull on top: purple bone, black outline, eyes that glow (brighter with his stage, and when he can pray)
    const sy = top - 7;
    g.fillStyle(0x0b0a14, 1); g.fillCircle(cx, sy, 9); g.fillRect(cx - 6, sy + 3, 12, 8);
    g.fillStyle(0x5a2a8a, 1); g.fillCircle(cx, sy, 8); g.fillRect(cx - 5, sy + 3, 10, 7);
    g.fillStyle(0x7a3ab0, 1); g.fillCircle(cx - 2, sy - 3, 4);
    const eye = [0xf4eefc, 0xe0c8ff, 0xc890ff, 0xff7aff][this.sludge || 0];
    g.fillStyle(0x0b0a14, 1); g.fillRect(cx - 6, sy - 1, 5, 5); g.fillRect(cx + 1, sy - 1, 5, 5);
    g.fillStyle(eye, 0.7 + 0.3 * pulse); g.fillRect(cx - 5, sy, 3, 3); g.fillRect(cx + 2, sy, 3, 3);
    if (pulse || this.sludge >= 3) { g.fillStyle(eye, 0.25); g.fillCircle(cx - 3.5, sy + 1.5, 4); g.fillCircle(cx + 3.5, sy + 1.5, 4); }
    g.fillStyle(0x0b0a14, 1); g.fillRect(cx - 1, sy + 4, 2, 2);                               // nose
    for (let i = 0; i < 4; i++) { g.fillStyle(0xf4eefc, 1); g.fillRect(cx - 4 + i * 2.5, sy + 7, 1.5, 2); }   // teeth
    // its crown of thorns: one spike for each stage he's reached
    for (let i = 0; i <= (this.sludge || 0); i++) {
      const a = -Math.PI / 2 + (i - 1.5) * 0.45;
      g.lineStyle(3, 0x0b0a14, 1); g.lineBetween(cx + Math.cos(a) * 8, sy + Math.sin(a) * 8, cx + Math.cos(a) * 14, sy + Math.sin(a) * 14);
      g.lineStyle(1, i === 3 ? 0xff7aff : 0xf4eefc, 1); g.lineBetween(cx + Math.cos(a) * 8, sy + Math.sin(a) * 8, cx + Math.cos(a) * 14, sy + Math.sin(a) * 14);
    }
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
