// Fighter methods: VITRAIL (def vitrail.js) - THE FOUR PANES. His four specials are the four elements of the rose
// window behind his head: CINDER STEP (side, FIRE), RIME BLOOM (down, ICE), FULGURITE (up, LIGHTNING) and UMBRA
// (neutral, THE VOID). THE CHAIN: any move of his that lands can be cancelled into an element not yet in the chain
// (`vrChain`, open `show.window` frames after each element lands); each element already in it makes the next hit
// harder (`vitrailBonus`), and the fourth is a PRISM BREAK. Burns he leaves tick here too. Every effect is one of
// Sprite Fusion's (src/fx/sfMagic.js). Limit THE ROSE OF SEVEN HOURS.
// Reached through the `def.show` hooks (fighterShow.js): vitrailSpecial / vitrailStep / vitrailTick / vitrailBonus /
// vitrailLanded / vitrailHurt / drawVitrail / drawVitrailHud / roseLimit. Mixed into the Fighter class (Fighter.js) -
// `this` is he.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';
import { skyLayer, foesOf, segDist } from './showShot.js';
import { magic, magicActor, magicGround } from '../fx/sfMagic.js';

// the elements in the order they sit round his halo (and his HUD): fire, ice, lightning, the void
const ELS = 'FILV';
// which special each element is
const MOVE_OF = { F: 'sideB', I: 'downB', L: 'upb', V: 'neutralB' };
/** '#rrggbb' from 0xrrggbb. */
const css = (c) => '#' + c.toString(16).padStart(6, '0');

/** VITRAIL's own methods (attached to Fighter.prototype). */
export class FighterVitrail {
  /** His chain: the elements that have landed in it (in order) and the frame it closes on. */
  vrChainNow() {
    const C = this.vrChain;
    return C && C.until >= this.age ? C : (this.vrChain = { els: [], until: -1 });
  }
  /** The element the stick asks for with a special press: up = LIGHTNING, down = ICE, side = FIRE, else THE VOID. */
  vrElOf(c) { return c.up ? 'L' : c.down ? 'I' : Math.abs(c.x) > 0.5 ? 'F' : 'V'; }

  /** His specials (a fresh press, not a cancel): each element's move. */
  vitrailSpecial(c) {
    const el = this.vrElOf(c);
    if (el === 'L' && this.usedUpB) return false;
    if (el === 'F' && this.usedKindle && !this.grounded) return false;
    this.vrStartEl(el, c, false); return true;
  }
  /** Starts element el's special; `cancel` = it was a chain cancel (no once-per-air limits, no helpless after it). */
  vrStartEl(el, c, cancel) {
    if (el === 'F') { if (Math.abs(c.x) > 0.5) this.facing = Math.sign(c.x); if (!cancel) this.usedKindle = !this.grounded; }
    if (el === 'L') this.usedUpB = true;
    this.vrFree = cancel;
    this.startAttack(MOVE_OF[el]);
    if (el === 'L') this.aimBolt(c);
    if (cancel) {                                                       // a flash of the element's colour as he cuts into it
      const col = this.def.show.colors[el], M = this.match;
      if (!M.demo) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; M.particles.push({ x: this.x + Math.cos(a) * 6, y: this.y - 30 + Math.sin(a) * 6, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, life: 12, color: i % 2 ? col : 0xffffff, size: 2, grav: 0 }); }
      sfx('glass', 0.35, 1.3 + ELS.indexOf(el) * 0.15);
    }
  }
  /** FULGURITE's direction: where the stick points (up by default; the CPU aims for the stage when it's off it). */
  aimBolt(c) {
    let dx = c.x, dy = c.y;
    if (this.isCpu && !this.vrFree) { const P = this.match.stage.platforms[0], lx = this.x < 0 ? P.x1 + 20 : P.x2 - 20; dx = lx - this.x; dy = P.y - 10 - this.y; }
    const L = Math.hypot(dx, dy);
    if (L < 0.3) { dx = 0; dy = -1; } else { dx /= L; dy /= L; }
    if (Math.abs(dx) > 0.2) this.facing = Math.sign(dx);
    this.vrBolt = { dx, dy };
  }

  /** A hit from one of his elements: a box live for a few frames (every target once per id), carrying its element. */
  vrHit(x1, y1, x2, y2, h, id, label, el, extra) {
    this.match.limitHits.push({ t: 0, hb: { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: Math.min(y1, y2), y2: Math.max(y1, y2), h, owner: this, facing: this.facing, id, pillar: true, label, vrEl: el, ...extra } });
  }
  /** A round hit at x, y of radius r (every target once per id), carrying its element. */
  vrBurst(x, y, r, h, id, label, el) {
    const M = this.match;
    for (const o of foesOf(this)) {
      if (o.isIntangible()) continue;
      const c = o.center(); if (Math.hypot(c.x - x, c.y - y) > r) continue;
      const key = id + ':' + o.slot; if (M.hits.has(key)) continue; M.hits.add(key);
      M.applyHit(o, { h, owner: this, facing: Math.sign(o.x - x) || this.facing, id, pillar: true, label, vrEl: el }, x);
    }
  }
  /** The floor under x near height y (game px). */
  vrFloor(x, y) { return magicGround(this.match, y - 2)(x * 2) / 2; }

  /** Every frame of his own moves (from st_attack). True = it handled the frame. */
  vitrailStep(m) {
    const n = this.moveName, t = this.t, M = this.match, F = this.facing;
    if (n === 'sideB') {                                               // CINDER STEP: a burst forward in flame
      if (!this.grounded) this.vy = Math.min(this.vy, t < m.at + 8 ? 0.3 : 1.4);
      if (t === m.at) {
        this.vx = F * m.lunge;
        const [bx, by, bw, bh] = m.box, x1 = F > 0 ? this.x + bx : this.x - bx - bw;
        this.vrHit(x1, this.y + by, x1 + bw, this.y + by + bh, m.hit, 'vrcin' + this.attackId, 'CINDER STEP (FIRE)', 'F', { vrBurn: m.burn });
        magic(M, 'fire', { box: [this.x + F * 10 - 10, this.y - 34, 20, 30], duration: 0.3, size: 0.9, seed: this.age | 0, maxLife: 2.5 }, { x: this.x - 60, y: this.y - 94, w: 120, h: 100 }, 7);
        sfx('flame', 0.6, 1.2);
      }
      if (t > m.at && t < m.at + 8) {                                  // the flame follows the burst, still hitting
        const [bx, by, bw, bh] = m.box, x1 = F > 0 ? this.x + bx : this.x - bx - bw;
        this.vrHit(x1, this.y + by, x1 + bw, this.y + by + bh, m.hit, 'vrcin' + this.attackId, 'CINDER STEP (FIRE)', 'F', { vrBurn: m.burn });
        if (t % 3 === 0 && !M.demo) for (let i = 0; i < 3; i++) M.particles.push({ x: this.x - F * 6, y: this.y - 10 - Math.random() * 34, vx: -F * (1 + Math.random()), vy: -0.6, life: 16, color: i ? 0xff6a2a : 0xffd04a, size: 2, grav: -0.03 });
      }
    } else if (n === 'downB') {                                        // RIME BLOOM: ice blooms up round him
      if (!this.grounded) this.vy = Math.min(this.vy, 1.0);
      if (t === m.at) {
        this.vrBurst(this.x, this.y - 18, m.r, m.hit, 'vrrime' + this.attackId, 'RIME BLOOM (ICE)', 'I');
        magic(M, 'ice', { kind: 'nova', x: this.x, ground: magicGround(M, this.y - 2), size: 0.7, reach: m.r * 1.4, world: ['reach'], charge: 0.05, hold: 0.25, seed: this.age | 0, maxLife: 3 },
          { x: this.x - 90, y: this.y - 90, w: 180, h: 100 }, 7);
        sfx('glass', 0.6, 0.8); sfx('shing', 0.4, 1.6);
      }
    } else if (n === 'upb') {                                          // FULGURITE: he's a bolt of lightning
      const B = this.vrBolt || { dx: 0, dy: -1 };
      if (t === m.at) {
        B.x0 = this.x; B.y0 = this.y; B.x1 = this.x + B.dx * m.dist; B.y1 = this.y + B.dy * m.dist;
        const lx = Math.min(B.x0, B.x1) - 60, ly = Math.min(B.y0, B.y1) - 90;
        magic(M, 'lightning', { kind: 'arc', from: [B.x0, B.y0 - 28], to: [[(B.x0 + B.x1) / 2 + B.dy * 10, (B.y0 + B.y1) / 2 - 28], [B.x1, B.y1 - 28]], duration: 0.35, seed: this.age | 0, maxLife: 2 },
          { x: lx, y: ly, w: Math.abs(B.x1 - B.x0) + 120, h: Math.abs(B.y1 - B.y0) + 130 }, 7);
        this.vrBurst(this.x + F * 8, this.y - 30, m.spark, m.hit, 'vrbolt' + this.attackId, 'FULGURITE (LIGHTNING)', 'L');   // the crack as he goes up
        sfx('thunder', 0.55, 1.4);
      }
      if (t >= m.at && t < m.at + m.travel) {
        const k = (t - m.at + 1) / m.travel; this.x = B.x0 + (B.x1 - B.x0) * k; this.y = B.y0 + (B.y1 - B.y0) * k;
        this.vx = 0; this.vy = 0; this.grounded = false; this.platform = null; this.invincible = Math.max(this.invincible, 2); this.vrHidden = 2;
        for (const o of foesOf(this)) {
          const c = o.center();
          if (segDist(c.x, c.y, B.x0, B.y0 - 28, this.x, this.y - 28) < 28 && !o.isIntangible()) {
            const key = 'vrbolt' + this.attackId + ':' + o.slot; if (M.hits.has(key)) continue; M.hits.add(key);
            M.applyHit(o, { h: m.hit, owner: this, facing: Math.sign(B.dx) || this.facing, id: 'vrbolt' + this.attackId, pillar: true, label: 'FULGURITE (LIGHTNING)', vrEl: 'L' }, this.x);
          }
        }
      }
      if (t === m.at + m.travel) { this.vx = B.dx * 2; this.vy = Math.min(-1, B.dy * 3); }
      if (t >= m.frames - 1) { this.setState(this.grounded ? 'idle' : this.vrFree ? 'air' : 'helpless'); return true; }
    } else if (n === 'neutralB') {                                     // UMBRA: a small black hole ahead
      if (!this.grounded) this.vy = Math.min(this.vy, 0.6);
      if (t === m.at) {
        const S = { m, x: this.x + F * m.ahead, y: this.y + m.y, t: 0, id: 'vrumb' + this.attackId, aid: this.attackId };
        (this.vrHoles = this.vrHoles || []).push(S);
        magic(M, 'hole', { x: S.x, y: S.y, radius: 18, life: m.life / 60 + 0.3, seed: this.age | 0, maxLife: m.life / 60 + 3 }, { x: S.x - 90, y: S.y - 80, w: 180, h: 160 }, 4);
        sfx('rumble', 0.5, 1.1); sfx('curse', 0.4, 0.8);
      }
    }
    return false;
  }
  /** UMBRA's holes: each drags foes in, nicks them, then pops. True = this one is over. */
  vrHoleStep(S) {
    const m = S.m, M = this.match;
    if (S.t < m.life) for (const o of foesOf(this)) {
      const c = o.center(), dx = S.x - c.x, dy = S.y - c.y, d = Math.hypot(dx, dy);
      if (d < m.reach && d > 4) { const k = m.pull * (1 - d / m.reach) + 0.12; o.x += (dx / d) * k * 2; o.y += (dy / d) * k * 1.4; if (dy < 0) { o.grounded = false; o.vy = Math.min(o.vy, 0); } }
    }
    if (S.t % m.every === 0 && S.t < m.life) this.vrHit(S.x - 28, S.y - 28, S.x + 28, S.y + 28, m.tick, S.id + 't' + S.t, 'UMBRA (VOID)', 'V', { vrAid: S.aid });
    if (S.t === m.life) {
      this.vrBurst(S.x, S.y, m.r, m.pop, S.id + 'pop', 'UMBRA (VOID)', 'V');
      magic(M, 'sparkle', { x: S.x, y: S.y, size: 10, seed: (this.age * 5) | 0, maxLife: 2 }, { x: S.x - 50, y: S.y - 50, w: 100, h: 100 }, 7);
      sfx('bighit', 0.5, 1.3); M.shake(3, 6);
    }
    return S.t >= m.life;
  }

  /** Every frame: THE CHAIN's cancels, UMBRA's holes, the burns he left, his air specials back when he lands. */
  vitrailTick() {
    const M = this.match, c = this.ctrl;
    if (this.grounded) this.usedKindle = false;
    if (this.vrHidden > 0) this.vrHidden--;
    // a cancel: his move has landed, special pressed, and the stick asks for an element not yet in the chain
    if (this.state === 'attack' && this.vrHitAt === this.attackId && c && (this.buffer.special || c.pressed('special'))) {
      const el = this.vrElOf(c), C = this.vrChainNow();
      if (!C.els.includes(el) && MOVE_OF[el] !== this.moveName) { this.buffer.special = 0; this.vrStartEl(el, c, true); }
    }
    if (this.vrHoles && this.vrHoles.length) {
      for (const S of this.vrHoles) { S.t++; try { if (this.vrHoleStep(S)) S.done = true; } catch (err) { S.done = true; } }
      this.vrHoles = this.vrHoles.filter((S) => !S.done);
    }
    if (this.vrLater && this.vrLater.length) {                         // PRISM BREAK's hit, a beat after its light
      const P = this.def.show.prism;
      for (const p of this.vrLater) if (this.age >= p.at && !p.done) { p.done = true; this.vrBurst(p.x, p.y, P.r, P.hit, 'vrprism' + this.slot + ':' + p.at, 'PRISM BREAK', null); }
      this.vrLater = this.vrLater.filter((p) => !p.done);
    }
    for (const o of M.fighters) {                                       // the BURN (CINDER STEP) he left
      const b = o.vrBurn; if (!b || b.owner !== this) continue;
      if (!o.alive || o.state === 'respawn' || --b.left <= 0) { o.vrBurn = null; continue; }
      if (b.left % b.every === 0) {
        if (M.mode === 'stamina') o.hp -= b.dmg; else o.percent = Math.min(999, o.percent + b.dmg);
        o.lastHitBy = this; o.lastHitTimer = Math.max(o.lastHitTimer || 0, 60);
      }
      if (b.left % 6 === 0 && !M.demo) M.particles.push({ x: o.x + (Math.random() - 0.5) * 14, y: o.y - 10 - Math.random() * 30, vx: 0, vy: -0.8, life: 18, color: b.left % 12 ? 0xff7a2a : 0xffd04a, size: 2, grav: -0.02 });
    }
  }
  /** How much harder an element hits: `step` more for every OTHER element already in the open chain. */
  vitrailBonus(t, hb) {
    if (!hb.vrEl) return null;
    const C = this.vrChainNow(), n = C.els.filter((e) => e !== hb.vrEl).length;
    return n ? { dmg: 1 + this.def.show.step * n, kb: 1 + this.def.show.step * n * 0.5 } : null;
  }
  /** A hit landed: the move can now be cancelled; an element joins the chain (the fourth = PRISM BREAK); burns. */
  vitrailLanded(t, hb) {
    const S = this.def.show;
    if (this.state === 'attack' && (!hb.vrAid || hb.vrAid === this.attackId)) this.vrHitAt = this.attackId;
    if (hb.vrBurn) t.vrBurn = { ...hb.vrBurn, owner: this };
    if (!hb.vrEl) { const C = this.vrChainNow(); if (C.els.length) C.until = Math.max(C.until, this.age + 30); return; }
    const C = this.vrChainNow();
    C.until = this.age + S.window;
    if (C.els.includes(hb.vrEl)) return;
    C.els.push(hb.vrEl);
    if (C.els.length === 4) this.prismBreak(t);
  }
  /** PRISM BREAK: a burst of white light where the fourth element landed; the chain closes, his up special comes back. */
  prismBreak(t) {
    const M = this.match, P = this.def.show.prism, c = t.center();
    this.vrChain = { els: [], until: -1 };
    this.usedUpB = false; this.usedKindle = false;
    if (!M.demo) M.popText(this, 'PRISM BREAK!', '#ffffff');
    const g = this.vrFloor(c.x, t.y);
    magic(M, 'holy', { x: c.x, ground: g, hold: 0.2, width: 9, seed: this.age | 0, maxLife: 2.5 }, { x: c.x - 70, y: g - 380, w: 140, h: 390 }, 7);
    magic(M, 'sparkle', { x: c.x, y: c.y, size: 20, seed: (this.age * 7) | 0, maxLife: 2.5 }, { x: c.x - 70, y: c.y - 70, w: 140, h: 140 }, 7);
    // the hit lands a beat later, after the light (`vrLater`)
    (this.vrLater = this.vrLater || []).push({ at: this.age + 6, x: c.x, y: c.y });
    sfx('limitready', 0.5, 1.5); sfx('glass', 0.7, 0.7); M.shake(6, 10);
  }
  /** A hit on him breaks his chain. */
  vitrailHurt() { this.vrChain = { els: [], until: -1 }; this.vrFree = false; }

  // ---------------------------------------------------------------- drawing
  /** The four element shards orbiting him (bright when that element is in his chain), the PRISM BREAK's late hit,
   *  hidden while he's a bolt. */
  drawVitrail(g, spr) {
    spr.setAlpha(this.vrHidden > 0 ? 0 : spr.alpha);
    const s = this.state, L = this.def.limit, M = this.match, S = this.def.show;
    if (s === 'limit' && this.vrRoseUlt) this.drawRoseLimit(L);
    else if (this.showSky) this.showSky.clear();
    if (this.vrHidden > 0 || s === 'respawn' || !this.alive) { if (this.vrLabel) this.vrLabel.setVisible(false); return; }
    const C = this.vrChainNow(), cx = this.x, cy = this.y - 30, a0 = this.anim * 0.05;
    for (let i = 0; i < 4; i++) {
      const el = ELS[i], on = C.els.includes(el), a = a0 + (i / 4) * Math.PI * 2, px = cx + Math.cos(a) * 20, py = cy + Math.sin(a) * 7, r = on ? 4 : 3;
      if (Math.sin(a) < 0 && !on) continue;                             // the back half of the ring is behind him (only lit ones show through)
      g.fillStyle(0x0c0a12, on ? 0.95 : 0.6); g.fillTriangle(px, py - r - 1, px + r, py, px, py + r + 1); g.fillTriangle(px, py - r - 1, px - r, py, px, py + r + 1);
      g.fillStyle(S.colors[el], on ? 1 : 0.55); g.fillTriangle(px, py - r + 1, px + r - 2, py, px, py + r - 1); g.fillTriangle(px, py - r + 1, px - r + 2, py, px, py + r - 1);
      if (on) { g.fillStyle(0xffffff, 0.9); g.fillRect(px - 1, py - 2, 1, 1); g.fillStyle(S.colors[el], 0.2); g.fillCircle(px, py, 7); }
    }
    if (!this.vrLabel || !this.vrLabel.scene) { this.vrLabel = M.add.text(0, 0, '', { fontFamily: FONT, fontSize: '5px', color: '#ffffff', stroke: '#0c0a12', strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(8); M.addWorld(this.vrLabel); }
    const n = C.els.length;
    this.vrLabel.setVisible(n > 0 && !M.demo).setText(n ? S.names[C.els[n - 1]] + ' ' + n + '/4' : '').setColor(n ? css(S.colors[C.els[n - 1]]) : '#ffffff').setPosition(cx, this.y - this.def.headTop - 8);
  }
  /** His HUD: the rose's four panes round a violet eye, lit by his chain, and how long the chain stays open. */
  drawVitrailHud(g, x, y) {
    const C = this.vrChainNow(), S = this.def.show, cx = x + 70, cy = y + 6;
    g.fillStyle(0x0c0a12, 0.85); g.fillCircle(cx, cy, 9);
    for (let i = 0; i < 4; i++) {
      const el = ELS[i], a = Math.PI + (i / 4) * Math.PI * 2, b = a + Math.PI / 2 - 0.3;
      g.fillStyle(C.els.includes(el) ? S.colors[el] : 0x2c2838, 1); g.slice(cx, cy, 8, a + 0.15, b + 0.15, false); g.fillPath();
    }
    g.fillStyle(0xf2c84a, 1); g.fillCircle(cx, cy, 2); g.fillStyle(0xffffff, 1); g.fillRect(cx, cy - 1, 1, 1);
    if (C.els.length) { const k = Math.max(0, (C.until - this.age) / S.window); g.fillStyle(0xffffff, 0.8); g.fillRect(cx - 9, cy + 11, 18 * k, 1); }
  }

  // ---------------------------------------------------------------- Limit
  /** THE ROSE OF SEVEN HOURS (Limit, `type: 'rose'`): the sky darkens, the whole window hangs over the stage, its
   *  panes light one by one in the four colours; each hour a shaft of light comes down on a foe (it holds them), then
   *  the eighth on everyone. */
  roseLimit(L) {
    const t = this.t, M = this.match;
    if (t === 1 || !this.vrRoseUlt) this.vrRoseUlt = { foes: foesOf(this), lit: 0 };
    const U = this.vrRoseUlt; this.invincible = Math.max(this.invincible, 2); this.vx = 0; this.vy = Math.min(this.vy, 0.3);
    const i = (t - L.firstAt) / L.every;
    if (t >= L.firstAt && Number.isInteger(i) && i < L.hours) {
      U.lit = i + 1;
      const alive = U.foes.filter((o) => o.alive && o.state !== 'respawn');
      const o = alive.length ? alive[i % alive.length] : null, x = o ? o.x : this.x + this.facing * (40 + i * 20), gy = o ? this.vrFloor(o.x, o.y) : this.y;
      magic(M, 'holy', { x, ground: gy, hold: 0.25, width: 7, seed: (this.age + i) | 0, maxLife: 2.5 }, { x: x - 60, y: gy - 380, w: 120, h: 390 }, 7);
      if (o) M.applyHit(o, { h: L.hour, owner: this, facing: this.facing, id: 'vrhour' + this.slot + ':' + t + ':' + o.slot, pillar: true }, this.x);
      sfx('ding', 0.6, 0.8 + i * 0.12); M.shake(3, 6);
    }
    if (t === L.lastAt) {                                              // the eighth hour: all at once
      for (const o of U.foes) if (o.alive && o.state !== 'respawn') {
        const gy = this.vrFloor(o.x, o.y);
        magic(M, 'holy', { x: o.x, ground: gy, hold: 0.6, width: 16, seed: (o.slot * 31 + t) | 0, maxLife: 3 }, { x: o.x - 90, y: gy - 390, w: 180, h: 400 }, 7);
        M.applyHit(o, { h: L.final, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'vrfinal' + this.slot + ':' + o.slot, pillar: true }, this.x);
      }
      sfx('bighit', 0.9, 0.7); sfx('glass', 0.8, 0.6); M.shake(12, 20);
    }
    if (t >= L.frames) { this.vrRoseUlt = null; if (this.showSky) this.showSky.clear(); this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
  }
  /** The Limit's sky: dark, and the great rose window over the stage - four panes, each split in two - lighting hour by hour. */
  drawRoseLimit(L) {
    const t = this.t, U = this.vrRoseUlt, sky = skyLayer(this), k = Math.min(1, t / L.darkTo) * (t > L.frames - 12 ? (L.frames - t) / 12 : 1);
    const C = this.def.show.colors;
    sky.clear(); sky.fillStyle(0x07060e, 0.85 * k); sky.fillRect(0, 0, 640, 360);
    const cx = 320, cy = 120, R = 92 * Math.min(1, t / 24);
    sky.fillStyle(0x14121c, k); sky.fillCircle(cx, cy, R + 6);
    for (let p = 0; p < 8; p++) {                                       // the petals: dark glass until their hour
      const a = (p / 8) * Math.PI * 2 + Math.PI + t * 0.003, b = a + Math.PI / 4 - 0.08, lit = p < U.lit || t >= L.lastAt;
      sky.fillStyle(lit ? C[ELS[p >> 1]] : 0x2c2838, k * (lit ? 0.95 : 0.8)); sky.slice(cx, cy, R, a + 0.04, b, false); sky.fillPath();
      if (lit) { sky.fillStyle(0xffffff, 0.25 * k); sky.slice(cx, cy, R * 0.55, a + 0.1, b - 0.06, false); sky.fillPath(); }
    }
    sky.fillStyle(0x14121c, k); sky.fillCircle(cx, cy, R * 0.3);
    sky.fillStyle(t >= L.lastAt ? 0xffffff : 0xb87aff, k); sky.fillCircle(cx, cy, R * 0.18);
    sky.lineStyle(3, 0x14121c, k); sky.strokeCircle(cx, cy, R); sky.lineStyle(1, 0xf2c84a, k * 0.8); sky.strokeCircle(cx, cy, R + 3); sky.lineStyle(0);
    if (t >= L.lastAt && t < L.lastAt + 8) { sky.fillStyle(0xffffff, (1 - (t - L.lastAt) / 8) * 0.7); sky.fillRect(0, 0, 640, 360); }
  }
}
