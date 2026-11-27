// Fighter methods: VITRAIL (def vitrail.js) - THE ROSE. His side / down / up specials each set a PANE in the rose of
// his head (KINDLE = FIRE, RIME = ICE, FULGURITE = LIGHTNING; three slots, the oldest falls out), and INVOKE (neutral)
// casts the spell those three make - `def.show.spells`, keyed by the panes in F, I, L order (ten spells). A spell cast
// within `resonance.window` frames of landing a hit is RESONANT: harder, and it heals him. Burns and poison he leaves
// on people tick here too. Every effect is one of Sprite Fusion's (src/fx/sfMagic.js). Limit THE ROSE OF SEVEN HOURS.
// Reached through the `def.show` hooks (fighterShow.js): vitrailSpecial / vitrailStep / vitrailTick / vitrailLanded /
// vitrailKO / drawVitrail / drawVitrailHud / roseLimit. Mixed into the Fighter class (Fighter.js) - `this` is he.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';
import { spawnShot, burstHit, skyLayer, foesOf, nearestFoe, segDist } from './showShot.js';
import { magic, magicActor, magicGround } from '../fx/sfMagic.js';

const ORDER = 'FIL';
// the rose window's eight petals for the HUD and the Limit's sky window
const PETALS = [0xe0283e, 0xf2b42a, 0x2a66e0, 0x26b45a, 0xe0283e, 0x9a48e8, 0x2a66e0, 0xf2b42a];

/** Spell numbers scaled for a RESONANT cast. */
function scaled(h, k) { return k === 1 ? h : { ...h, dmg: Math.round(h.dmg * k), base: h.base * k, growth: h.growth * k }; }
/** '#rrggbb' from 0xrrggbb. */
const css = (c) => '#' + c.toString(16).padStart(6, '0');

/** VITRAIL's own methods (attached to Fighter.prototype). */
export class FighterVitrail {
  /** His rose: the panes set, oldest first. */
  vrPanes() { return (this.vrRose = this.vrRose || []); }
  /** The spell key his three panes make (F, I, L order), or null. */
  vrKey() { const p = this.vrPanes(); return p.length < this.def.show.panes ? null : [...p].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join(''); }
  /** Sets pane p (F / I / L) in his rose; the oldest falls out past three. */
  addPane(p) {
    const R = this.vrPanes(); R.push(p); if (R.length > this.def.show.panes) R.shift();
    const M = this.match, c = this.def.show.colors[p], key = this.vrKey();
    sfx('glass', 0.35, 1.2 + ORDER.indexOf(p) * 0.2);
    if (!M.demo) for (let i = 0; i < 6; i++) M.particles.push({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - 60, vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random(), life: 16, color: i % 2 ? c : 0xffffff, size: 2, grav: 0.05 });
    if (key && !M.demo) M.popText(this, this.def.show.spells[key].name + ' READY', css(0xe8c8ff));
  }

  /** His specials: RIME / FULGURITE / KINDLE set panes; neutral INVOKEs with three, REFRACTs with fewer. */
  vitrailSpecial(c) {
    if (c.up) {
      if (this.usedUpB) return false;
      this.usedUpB = true; this.startAttack('upb'); this.aimBolt(c); return true;
    }
    if (c.down) { this.startAttack('downB'); return true; }
    if (Math.abs(c.x) > 0.5) {
      if (this.usedKindle && !this.grounded) return false;
      this.facing = Math.sign(c.x); this.usedKindle = !this.grounded; this.startAttack('sideB'); return true;
    }
    this.startAttack(this.vrKey() ? 'neutralB' : 'refract'); return true;
  }
  /** FULGURITE's direction: where the stick points (up by default; the CPU aims for the stage). */
  aimBolt(c) {
    let dx = c.x, dy = c.y;
    if (this.isCpu) { const P = this.match.stage.platforms[0], lx = this.x < 0 ? P.x1 + 20 : P.x2 - 20; dx = lx - this.x; dy = P.y - 10 - this.y; }
    const L = Math.hypot(dx, dy);
    if (L < 0.3) { dx = 0; dy = -1; } else { dx /= L; dy /= L; }
    if (Math.abs(dx) > 0.2) this.facing = Math.sign(dx);
    this.vrBolt = { dx, dy };
  }

  /** Every frame of his own moves (from st_attack). True = it handled the frame. */
  vitrailStep(m) {
    const n = this.moveName, t = this.t, M = this.match, F = this.facing;
    if (n === 'sideB') {                                               // KINDLE: a palm of fire
      if (!this.grounded) this.vy = Math.min(this.vy, 1.4);
      if (t === m.at) {
        this.vx = F * m.lunge;
        const [bx, by, bw, bh] = m.box, x1 = F > 0 ? this.x + bx : this.x - bx - bw;
        M.limitHits.push({ t: 0, hb: { x1, x2: x1 + bw, y1: this.y + by, y2: this.y + by + bh, h: m.hit, owner: this, facing: F, id: 'vrkin' + this.attackId, pillar: true, label: 'KINDLE (FIRE)', vrBurn: m.burn } });
        const fx = this.x + F * 30;
        magic(M, 'fire', { box: [fx - 10, this.y - 30, 20, 26], duration: 0.35, size: 0.9, seed: this.age | 0, maxLife: 2.5 }, { x: fx - 40, y: this.y - 90, w: 80, h: 96 }, 7);
        sfx('flame', 0.6, 1.1); this.addPane('F');
      }
    } else if (n === 'downB') {                                        // RIME: ice bursts up round him
      if (!this.grounded) this.vy = Math.min(this.vy, 1.0);
      if (t === m.at) {
        burstHit(this, this.x, this.y - 18, m.r, m.hit, 'vrrime' + this.attackId, 'RIME (ICE)');
        magic(M, 'ice', { kind: 'nova', x: this.x, ground: magicGround(M, this.y - 2), size: 0.7, reach: m.r * 1.4, world: ['reach'], charge: 0.05, hold: 0.25, seed: this.age | 0, maxLife: 3 },
          { x: this.x - 90, y: this.y - 90, w: 180, h: 100 }, 7);
        sfx('glass', 0.6, 0.8); sfx('shing', 0.4, 1.6); this.addPane('I');
      }
    } else if (n === 'upb') {                                          // FULGURITE: he's a bolt of lightning
      const B = this.vrBolt || { dx: 0, dy: -1 };
      if (t === m.at) {
        B.x0 = this.x; B.y0 = this.y; B.x1 = this.x + B.dx * m.dist; B.y1 = this.y + B.dy * m.dist;
        const lx = Math.min(B.x0, B.x1) - 60, ly = Math.min(B.y0, B.y1) - 90;
        magic(M, 'lightning', { kind: 'arc', from: [B.x0, B.y0 - 28], to: [[(B.x0 + B.x1) / 2 + B.dy * 10, (B.y0 + B.y1) / 2 - 28], [B.x1, B.y1 - 28]], duration: 0.35, seed: this.age | 0, maxLife: 2 },
          { x: lx, y: ly, w: Math.abs(B.x1 - B.x0) + 120, h: Math.abs(B.y1 - B.y0) + 130 }, 7);
        sfx('thunder', 0.55, 1.4); this.addPane('L');
      }
      if (t >= m.at && t < m.at + m.travel) {
        const k = (t - m.at + 1) / m.travel; this.x = B.x0 + (B.x1 - B.x0) * k; this.y = B.y0 + (B.y1 - B.y0) * k;
        this.vx = 0; this.vy = 0; this.grounded = false; this.platform = null; this.invincible = Math.max(this.invincible, 2); this.vrHidden = 2;
        for (const o of foesOf(this)) {
          const c = o.center();
          if (segDist(c.x, c.y, B.x0, B.y0 - 28, this.x, this.y - 28) < 24 && !o.isIntangible()) {
            const key = 'vrbolt' + this.attackId + ':' + o.slot; if (M.hits.has(key)) continue; M.hits.add(key);
            M.applyHit(o, { h: m.hit, owner: this, facing: Math.sign(B.dx) || this.facing, id: 'vrbolt' + this.attackId, pillar: true, label: 'FULGURITE (LIGHTNING)' }, this.x);
          }
        }
      }
      if (t === m.at + m.travel) { this.vx = B.dx * 2; this.vy = Math.min(-1, B.dy * 3); }
      if (t >= m.frames - 1) { this.setState(this.grounded ? 'idle' : 'helpless'); return true; }
    } else if (n === 'refract') {                                      // REFRACT: a glass shard
      if (!this.grounded) this.vy = Math.min(this.vy, 1.2);
      if (t === m.at) this.throwShard(m.shard);
    } else if (n === 'neutralB') {                                     // INVOKE
      if (!this.grounded) this.vy = Math.min(this.vy, 0.8);
      if (t === m.castAt) this.invoke();
    }
    return false;
  }

  /** REFRACT: a spinning shard of coloured glass, straight ahead. */
  throwShard(S) {
    const H = this.def.handOffset, x = this.x + this.facing * H.x, y = this.y + H.y, cols = Object.values(this.def.show.colors), me = this;
    const c = cols[(this.age >> 2) % cols.length];
    spawnShot(this.match, this, { name: 'GLASS SHARD', x, y, vx: this.facing * S.speed, vy: 0, life: S.life, w: 10, h: 8, hit: S.hit, solid: true,
      draw: (g, s) => { const a = s.t * 0.5; g.fillStyle(0x0c0a12, 1); me.vrTri(g, s.x, s.y, 7, a); g.fillStyle(c, 1); me.vrTri(g, s.x, s.y, 5, a); g.fillStyle(0xffffff, 0.9); g.fillRect(s.x - 1, s.y - 1, 2, 1); } });
    sfx('glass', 0.4, 1.6);
  }
  /** A filled triangle of radius r turned by a. */
  vrTri(g, x, y, r, a) { g.fillTriangle(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + 2.1) * r, y + Math.sin(a + 2.1) * r, x + Math.cos(a + 4.2) * r, y + Math.sin(a + 4.2) * r); }

  /** INVOKE: casts the spell his three panes make (RESONANT right after a hit) and empties the rose. */
  invoke() {
    const key = this.vrKey(); if (!key) return;
    const S = this.def.show.spells[key], Rz = this.def.show.resonance, M = this.match;
    const res = this.age - (this.vrLastHit ?? -999) <= Rz.window, k = res ? Rz.mult : 1;
    this.vrRose = [];
    M.popText(this, (res ? 'RESONANT ' : '') + S.name + '!', res ? '#ffe45a' : css(0xe8c8ff));
    sfx('summon', 0.5, 1.3); sfx('glass', 0.5, 0.9);
    if (res) {                                                         // RESONANCE: the light heals him and flares through him
      if (M.mode === 'stamina') this.hp = Math.min(this.maxHp, this.hp + Rz.heal); else this.percent = Math.max(0, this.percent - Rz.heal);
      magic(M, 'heal', { actor: magicActor(this), count: 10, seed: this.age | 0, maxLife: 3 }, { x: this.x - 60, y: this.y - 110, w: 120, h: 120 }, 7);
      magic(M, 'power', { actor: magicActor(this), size: 0.7, seed: (this.age * 3) | 0, maxLife: 3 }, { x: this.x - 70, y: this.y - 120, w: 140, h: 130 }, 5);
      sfx('limitready', 0.4, 1.4);
    }
    const sp = { key, S, k, t: 0, x: this.x, y: this.y, F: this.facing, n: 0 };
    (this.vrSpells = this.vrSpells || []).push(sp);
    this['vrStart' + key](sp);
  }

  /** A box hit from this spell (every target once per `id`). */
  vrBox(sp, x1, y1, x2, y2, h, id, extra) {
    this.match.limitHits.push({ t: 0, hb: { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y1: Math.min(y1, y2), y2: Math.max(y1, y2), h: scaled(h, sp.k), owner: this, facing: sp.F, id: 'vr' + sp.key + id + ':' + this.slot + ':' + sp.x, pillar: true, label: sp.S.name, ...extra } });
  }
  /** The floor under x near height y (game px). */
  vrFloor(x, y) { return magicGround(this.match, y - 2)(x * 2) / 2; }

  // ---------------------------------------------------------------- the ten spells: vrStart<KEY>(sp) and vrStep<KEY>(sp) (true = over)
  /** INFERNO: a column of fire in front of him. */
  vrStartFFF(sp) {
    const S = sp.S; sp.cx = sp.x + sp.F * S.at; sp.gy = this.vrFloor(sp.cx, sp.y);
    sp.fx = magic(this.match, 'fire', { box: [sp.cx - S.w / 2, sp.gy - S.h * 0.75, S.w, S.h * 0.75], duration: S.len / 60, size: 2.2, seed: this.age | 0, maxLife: 6 },
      { x: sp.cx - S.w, y: sp.gy - S.h - 40, w: S.w * 2, h: S.h + 46 }, 7);
    sfx('flame', 0.8, 0.8); this.match.shake(3, 8);
  }
  /** INFERNO's burning. */
  vrStepFFF(sp) {
    const S = sp.S, x1 = sp.cx - S.w / 2, x2 = sp.cx + S.w / 2;
    if (sp.t % S.every === 0 && sp.t < S.len) { this.vrBox(sp, x1, sp.gy - S.h, x2, sp.gy, S.tick, 't' + sp.t); sfx('flame', 0.3, 1 + Math.random() * 0.3); }
    if (sp.t === S.len) { this.vrBox(sp, x1 - 6, sp.gy - S.h - 10, x2 + 6, sp.gy, S.last, 'L'); sfx('bighit', 0.6, 0.9); this.match.shake(5, 10); }
    return sp.t > S.len;
  }
  /** GLACIER: a line of ice spikes marching ahead. */
  vrStartIII(sp) {
    const S = sp.S, x0 = sp.x + sp.F * 26, gy = this.vrFloor(x0, sp.y), reach = S.spacing * S.count;
    magic(this.match, 'ice', { kind: 'spikes', x: x0, ground: magicGround(this.match, sp.y - 2), dir: sp.F, count: S.count, spacing: S.spacing, world: ['spacing'], size: 0.9, seed: this.age | 0, maxLife: 5 },
      { x: Math.min(x0, x0 + sp.F * reach) - 30, y: gy - 90, w: reach + 60, h: 100 }, 7);
    sfx('glass', 0.6, 0.7);
  }
  /** GLACIER's spikes, one by one. */
  vrStepIII(sp) {
    const S = sp.S, i = sp.t / S.every;
    if (Number.isInteger(i) && i < S.count) {
      const x = sp.x + sp.F * (26 + i * S.spacing), gy = this.vrFloor(x, sp.y), last = i === S.count - 1;
      this.vrBox(sp, x - 13, gy - 44, x + 13, gy + 2, last ? S.last : S.spike, 's' + i); sfx('shing', 0.3, 1.2 + i * 0.08);
    }
    return sp.t > S.every * S.count;
  }
  /** TEMPEST: marks the floor under every foe. */
  vrStartLLL(sp) {
    sp.marks = foesOf(this).map((o) => ({ x: o.x, y: this.vrFloor(o.x, o.y) }));
    for (const [i, mk] of sp.marks.entries()) {
      magic(this.match, 'lightning', { kind: 'crackle', x: mk.x, y: mk.y - 4, ground: mk.y, duration: sp.S.warn / 60, radius: 30, world: ['radius'], seed: (mk.x * 7) | 0, maxLife: 2 },
        { x: mk.x - 50, y: mk.y - 50, w: 100, h: 60 }, 5);
      // (the bolt itself: Sprite Fusion's strike lands its first stroke 0.62 s in - `warn` - so it starts now)
      magic(this.match, 'lightning', { kind: 'strike', x: mk.x, ground: mk.y, top: mk.y - 330, world: ['top'], clouds: false, strokes: 2, seed: (mk.x * 13 + i) | 0, maxLife: 3 }, { x: mk.x - 90, y: mk.y - 340, w: 180, h: 350 }, 7);
    }
    sfx('thunder', 0.4, 2.0);
  }
  /** TEMPEST: a beat later, lightning strikes the marks. */
  vrStepLLL(sp) {
    const S = sp.S;
    if (sp.t === S.warn) for (const [i, mk] of sp.marks.entries()) {
      this.vrBox(sp, mk.x - S.w / 2, mk.y - 220, mk.x + S.w / 2, mk.y + 2, S.hit, 'k' + i);
      sfx('thunder', 0.8, 0.9); this.match.shake(6, 10);
    }
    return sp.t > S.warn;
  }
  /** STEAM: a cloud of bubbles ahead of him. */
  vrStartFFI(sp) {
    const S = sp.S; sp.cx = sp.x + sp.F * S.at; sp.cy = sp.y - 44;
    sp.fx = magic(this.match, 'bubbles', { area: { x: sp.cx - S.w / 2, y: sp.cy - S.h / 2, w: S.w, h: S.h }, ground: magicGround(this.match, sp.y - 2), density: 1.6, seed: this.age | 0, maxLife: S.len / 60 + 3 },
      { x: sp.cx - S.w / 2 - 20, y: sp.cy - S.h / 2 - 40, w: S.w + 40, h: S.h + 80 }, 7);
    sfx('geyser', 0.5, 1.4);
  }
  /** STEAM: whoever is in it floats up, nicked again and again. */
  vrStepFFI(sp) {
    const S = sp.S;
    for (const o of foesOf(this)) {
      const c = o.center();
      if (Math.abs(c.x - sp.cx) < S.w / 2 && Math.abs(c.y - sp.cy) < S.h / 2 + 10) { o.vy = Math.min(o.vy, S.lift); o.grounded = false; }
    }
    if (sp.t % S.every === 0 && sp.t < S.len) this.vrBox(sp, sp.cx - S.w / 2, sp.cy - S.h / 2, sp.cx + S.w / 2, sp.cy + S.h / 2, S.tick, 't' + sp.t);
    if (sp.t === S.len && sp.fx && sp.fx.fx.stop) sp.fx.fx.stop();
    return sp.t > S.len;
  }
  /** PLASMA LANCE: a beam of white fire out of the prism. */
  vrStartFFL(sp) {
    const S = sp.S, H = this.def.handOffset; sp.hx = sp.x + sp.F * H.x; sp.hy = sp.y + H.y; sp.ex = sp.hx + sp.F * S.reach;
    magic(this.match, 'energy', { kind: 'beam', x: sp.hx, y: sp.hy, to: [sp.ex, sp.hy], charge: S.charge / 60, hold: S.len / 60, colors: 'gold', seed: this.age | 0, maxLife: 4 },
      { x: Math.min(sp.hx, sp.ex) - 30, y: sp.hy - 50, w: S.reach + 60, h: 100 }, 7);
    sfx('laser', 0.6, 0.9);
  }
  /** PLASMA LANCE's burning line. */
  vrStepFFL(sp) {
    const S = sp.S, on = sp.t - S.charge;
    if (on >= 0 && on < S.len && on % S.every === 0) this.vrBox(sp, sp.hx, sp.hy - 9, sp.ex, sp.hy + 9, S.tick, 't' + on);
    if (on === S.len) { this.vrBox(sp, sp.hx, sp.hy - 12, sp.ex, sp.hy + 12, S.last, 'L'); sfx('bighit', 0.5, 1.2); }
    return on > S.len;
  }
  /** MIASMA: a poison cloud on the floor ahead. */
  vrStartFII(sp) {
    const S = sp.S; sp.cx = sp.x + sp.F * S.at; sp.gy = this.vrFloor(sp.cx, sp.y);
    sp.fx = magic(this.match, 'poison', { kind: 'cloud', x: sp.cx, ground: magicGround(this.match, sp.y - 2), size: 1.2, seed: this.age | 0, maxLife: S.len / 60 + 3 },
      { x: sp.cx - S.w, y: sp.gy - S.h * 2.4, w: S.w * 2, h: S.h * 2.4 + 10 }, 7);
    sfx('curse', 0.5, 0.7);
  }
  /** MIASMA: whoever is in it is poisoned. */
  vrStepFII(sp) {
    const S = sp.S;
    for (const o of foesOf(this)) if (Math.abs(o.x - sp.cx) < S.w / 2 && o.y > sp.gy - S.h - 20 && o.y < sp.gy + 10) {
      o.vrPoison = { left: S.poison.left, every: S.poison.every, dmg: S.poison.dmg, owner: this }; o.demonSlowUntil = o.age + 2;
    }
    if (sp.t === S.len && sp.fx && sp.fx.fx.stop) sp.fx.fx.stop(sp.t / 60);
    return sp.t > S.len;
  }
  /** SHATTERGLASS: three cuts of broken glass. */
  vrStartIIL() { sfx('glass', 0.6, 1.0); }
  /** SHATTERGLASS's cuts. */
  vrStepIIL(sp) {
    const S = sp.S, i = S.at.indexOf(sp.t);
    if (i >= 0) {
      const [bx, by, bw, bh] = S.box, x1 = sp.F > 0 ? this.x + bx : this.x - bx - bw, last = i === S.at.length - 1, cx = this.x + sp.F * (bx + bw / 2);
      this.vrBox(sp, x1, this.y + by, x1 + bw, this.y + by + bh, last ? S.last : S.cut, 'c' + i);
      magic(this.match, 'slash', { x: cx, y: this.y - 30, facing: sp.F, size: last ? 1.3 : 1, tilt: (i - 1) * 0.5, seed: (this.age + i) | 0, maxLife: 2 }, { x: cx - 70, y: this.y - 90, w: 140, h: 110 }, 7);
      sfx('slash', 0.6, 1.3 - i * 0.15); sfx('glass', 0.4, 1.4 + i * 0.2); if (last) this.match.shake(4, 8);
    }
    return sp.t > S.at[S.at.length - 1];
  }
  /** STARFIRE: a star flares where the nearest foe stands. */
  vrStartFLL(sp) {
    const o = nearestFoe(this), c = o ? o.center() : { x: sp.x + sp.F * 100, y: sp.y - 30 };
    sp.tx = c.x; sp.ty = c.y;
    magic(this.match, 'sparkle', { x: sp.tx, y: sp.ty, size: 22, seed: this.age | 0, maxLife: 3 }, { x: sp.tx - 70, y: sp.ty - 70, w: 140, h: 140 }, 7);
    sfx('ding', 0.5, 1.6);
  }
  /** STARFIRE: it bursts. */
  vrStepFLL(sp) {
    const S = sp.S;
    if (sp.t === S.delay) { burstHit(this, sp.tx, sp.ty, S.r, scaled(S.hit, sp.k), 'vrstar' + this.slot + ':' + this.age, S.name); sfx('bighit', 0.6, 1.5); sfx('ding', 0.6, 2.0); this.match.shake(4, 8); }
    return sp.t > S.delay;
  }
  /** AEGIS: a shell of hexagonal light round him. */
  vrStartILL(sp) {
    sp.fx = magic(this.match, 'shield', { actor: magicActor(this), radius: sp.S.r, hold: sp.S.len / 60, hits: [], seed: this.age | 0, maxLife: 4 }, { x: this.x - 200, y: this.y - 200, w: 400, h: 260 }, 7);
    sfx('shield', 0.6, 1.2);
  }
  /** AEGIS: nothing touches him; whoever tries is shocked away. */
  vrStepILL(sp) {
    const S = sp.S, M = this.match;
    if (sp.fx) { const e = sp.fx; e.img.setPosition(this.x - 200, this.y - 200); e.imgL.setPosition(this.x - 200, this.y - 200); e.frame.ox = Math.floor(this.x - 200); e.frame.oy = Math.floor(this.y - 200); }
    this.invincible = Math.max(this.invincible, 2);
    if (sp.t % S.every === 0) for (const o of foesOf(this)) {
      const c = o.center(); if (Math.hypot(c.x - this.x, c.y - (this.y - 26)) > S.r + 14) continue;
      M.applyHit(o, { h: scaled(S.zap, sp.k), owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'vraeg' + this.slot + ':' + this.age, pillar: true, label: S.name }, this.x);
      if (sp.fx && sp.fx.fx.hit) sp.fx.fx.hit(c.x * 2, c.y * 2);
      sfx('thunder', 0.35, 2.2);
    }
    return sp.t > S.len;
  }
  /** ECLIPSE: a black hole ahead of him. */
  vrStartFIL(sp) {
    const S = sp.S; sp.cx = sp.x + sp.F * S.at; sp.cy = sp.y + S.y;
    magic(this.match, 'hole', { x: sp.cx, y: sp.cy, radius: 30, life: S.len / 60 + 0.6, seed: this.age | 0, maxLife: S.len / 60 + 4 }, { x: sp.cx - 130, y: sp.cy - 110, w: 260, h: 220 }, 4);
    sfx('rumble', 0.7, 0.7); sfx('curse', 0.5, 0.5);
  }
  /** ECLIPSE: it drags everyone in, then collapses. */
  vrStepFIL(sp) {
    const S = sp.S;
    if (sp.t < S.len) for (const o of foesOf(this)) {
      const c = o.center(), dx = sp.cx - c.x, dy = sp.cy - c.y, d = Math.hypot(dx, dy);
      if (d < S.reach && d > 4) { const k = S.pull * (1 - d / S.reach) + 0.15; o.x += (dx / d) * k * 2; o.y += (dy / d) * k * 1.4; if (dy < 0) { o.grounded = false; o.vy = Math.min(o.vy, 0); } }
    }
    if (sp.t % S.every === 0 && sp.t < S.len) this.vrBox(sp, sp.cx - 26, sp.cy - 26, sp.cx + 26, sp.cy + 26, S.tick, 't' + sp.t);
    if (sp.t === S.len) { burstHit(this, sp.cx, sp.cy, S.r, scaled(S.last, sp.k), 'vrecl' + this.slot + ':' + this.age, S.name); sfx('bighit', 0.9, 0.6); this.match.shake(9, 14); }
    return sp.t > S.len;
  }

  /** Every frame: his running spells, the burns and poison he left, his air specials back when he lands. */
  vitrailTick() {
    const M = this.match;
    if (this.grounded) this.usedKindle = false;
    if (this.vrHidden > 0) this.vrHidden--;
    if (this.vrSpells && this.vrSpells.length) {
      for (const sp of this.vrSpells) { sp.t++; try { if (this['vrStep' + sp.key](sp)) sp.done = true; } catch (err) { sp.done = true; } }
      this.vrSpells = this.vrSpells.filter((sp) => !sp.done);
    }
    for (const o of M.fighters) {                                       // the BURN (KINDLE) and the POISON (MIASMA) he left
      for (const k of ['vrBurn', 'vrPoison']) {
        const b = o[k]; if (!b || b.owner !== this) continue;
        if (!o.alive || o.state === 'respawn' || --b.left <= 0) { o[k] = null; continue; }
        if (b.left % b.every === 0) {
          if (M.mode === 'stamina') o.hp -= b.dmg; else o.percent = Math.min(999, o.percent + b.dmg);
          o.lastHitBy = this; o.lastHitTimer = Math.max(o.lastHitTimer || 0, 60);
        }
        if (b.left % 6 === 0 && !M.demo) M.particles.push({ x: o.x + (Math.random() - 0.5) * 14, y: o.y - 10 - Math.random() * 30, vx: 0, vy: -0.8, life: 18, color: k === 'vrBurn' ? (b.left % 12 ? 0xff7a2a : 0xffd04a) : (b.left % 12 ? 0x8aff5a : 0x3a9a2a), size: 2, grav: -0.02 });
      }
    }
  }
  /** A hit landed: RESONANCE opens; KINDLE's palm leaves them burning. */
  vitrailLanded(t, hb) {
    this.vrLastHit = this.age;
    if (hb.vrBurn) t.vrBurn = { ...hb.vrBurn, owner: this };
  }

  // ---------------------------------------------------------------- drawing
  /** His rose's panes floating over his head (and the spell they make), hidden while he's a bolt. */
  drawVitrail(g, spr) {
    spr.setAlpha(this.vrHidden > 0 ? 0 : spr.alpha);
    const s = this.state, L = this.def.limit;
    if (s === 'limit' && this.vrRoseUlt) this.drawRoseLimit(L);
    else if (this.showSky) this.showSky.clear();
    if (this.vrHidden > 0 || s === 'respawn' || !this.alive) { if (this.vrLabel) this.vrLabel.setVisible(false); return; }
    const P = this.vrPanes(), C = this.def.show.colors, n = this.def.show.panes, cx = this.x, cy = this.y - this.def.headTop - 10, a0 = this.anim * 0.04;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2, px = cx + Math.cos(a) * 14, py = cy + Math.sin(a) * 4, p = P[i];
      g.fillStyle(0x0c0a12, p ? 0.95 : 0.45); g.fillTriangle(px, py - 5, px + 4, py, px, py + 5); g.fillTriangle(px, py - 5, px - 4, py, px, py + 5);
      if (p) { g.fillStyle(C[p], 1); g.fillTriangle(px, py - 3, px + 2, py, px, py + 3); g.fillTriangle(px, py - 3, px - 2, py, px, py + 3); g.fillStyle(0xffffff, 0.9); g.fillRect(px - 1, py - 2, 1, 1); }
    }
    const key = this.vrKey(), M = this.match;
    if (!this.vrLabel || !this.vrLabel.scene) { this.vrLabel = M.add.text(0, 0, '', { fontFamily: FONT, fontSize: '5px', color: '#e8c8ff', stroke: '#0c0a12', strokeThickness: 2 }).setOrigin(0.5, 1).setDepth(8); M.addWorld(this.vrLabel); }
    this.vrLabel.setVisible(!!key && !M.demo).setText(key ? this.def.show.spells[key].name : '').setPosition(cx, cy - 7);
  }
  /** His rose on the player plate: three panes round a violet eye. */
  drawVitrailHud(g, x, y) {
    const P = this.vrPanes(), C = this.def.show.colors, cx = x + 70, cy = y + 6, n = this.def.show.panes;
    g.fillStyle(0x0c0a12, 0.85); g.fillCircle(cx, cy, 8);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2, b = a + (Math.PI * 2) / n - 0.35;
      g.fillStyle(P[i] ? C[P[i]] : 0x2c2838, 1); g.slice(cx, cy, 7, a, b, false); g.fillPath();
    }
    g.fillStyle(0xe8c8ff, 1); g.fillCircle(cx, cy, 2); g.fillStyle(0xffffff, 1); g.fillRect(cx, cy - 1, 1, 1);
  }

  // ---------------------------------------------------------------- Limit
  /** THE ROSE OF SEVEN HOURS (Limit, `type: 'rose'`): the sky darkens, the whole window hangs over the stage, its
   *  panes light one by one; each hour a shaft of light comes down on a foe (it holds them), then the eighth on everyone. */
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
  /** The Limit's sky: dark, and the great rose window over the stage, its petals lighting hour by hour. */
  drawRoseLimit(L) {
    const t = this.t, U = this.vrRoseUlt, sky = skyLayer(this), k = Math.min(1, t / L.darkTo) * (t > L.frames - 12 ? (L.frames - t) / 12 : 1);
    sky.clear(); sky.fillStyle(0x07060e, 0.85 * k); sky.fillRect(0, 0, 640, 360);
    const cx = 320, cy = 120, R = 92 * Math.min(1, t / 24);
    sky.fillStyle(0x14121c, k); sky.fillCircle(cx, cy, R + 6);
    for (let p = 0; p < 8; p++) {                                       // the petals: dark glass until their hour
      const a = (p / 8) * Math.PI * 2 - Math.PI / 2 + t * 0.003, b = a + Math.PI / 4 - 0.08, lit = p < U.lit || t >= L.lastAt;
      sky.fillStyle(lit ? PETALS[p] : 0x2c2838, k * (lit ? 0.95 : 0.8)); sky.slice(cx, cy, R, a + 0.04, b, false); sky.fillPath();
      if (lit) { sky.fillStyle(0xffffff, 0.25 * k); sky.slice(cx, cy, R * 0.55, a + 0.1, b - 0.06, false); sky.fillPath(); }
    }
    sky.fillStyle(0x14121c, k); sky.fillCircle(cx, cy, R * 0.3);
    sky.fillStyle(t >= L.lastAt ? 0xffffff : 0xb87aff, k); sky.fillCircle(cx, cy, R * 0.18);
    sky.lineStyle(3, 0x14121c, k); sky.strokeCircle(cx, cy, R); sky.lineStyle(1, 0xf2c84a, k * 0.8); sky.strokeCircle(cx, cy, R + 3); sky.lineStyle(0);
    if (t >= L.lastAt && t < L.lastAt + 8) { sky.fillStyle(0xffffff, (1 - (t - L.lastAt) / 8) * 0.7); sky.fillRect(0, 0, 640, 360); }
  }
}
