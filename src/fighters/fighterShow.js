// Fighter methods for the two showmen in the lab (test fighters, `def.show`): THE GREAT PRESTO (a stage
// magician: CARD TRICK marks, VANISHING ACT, DOVE LIFT, THE CABINET, THE GRAND ILLUSION) and CHEF ROUX (a master
// chef: ORDER UP tickets and WELL DONE, CLEAVER TOSS, FLAMBE, HOT OIL, FULL COURSE). Mixed into the Fighter class
// (Fighter.js) - `this` is the fighter. Tuning lives in presto.js / chef.js; the things they throw in showEntities.js.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';
import { PlayingCard, Cleaver, HotOil, drawCard, drawSuit } from './showEntities.js';

// the short names on Roux's order tickets
const DISH = { jab: 'JAB', ftilt: 'F-TILT', utilt: 'U-TILT', dtilt: 'D-TILT', dashAttack: 'DASH', fsmash: 'F-SMASH', usmash: 'U-SMASH', dsmash: 'D-SMASH',
  nair: 'N-AIR', fair: 'F-AIR', bair: 'B-AIR', uair: 'U-AIR', dair: 'D-AIR', neutralB: 'PAN', sideB: 'CLEAVER', downB: 'OIL', upb: 'FLAMBE' };
/** A colour as a '#rrggbb' string. */
const css = (c) => '#' + c.toString(16).padStart(6, '0');

/** The showmen's mixin: their passives, specials, Limits and everything they draw (methods attached to Fighter). */
export class FighterShow {
  // ------------------------------------------------------------------ every frame
  /** Every frame (from Fighter.step): Presto's card marks fade; Roux's order ticket, and WELL DONE burning down. */
  showTick() {
    const S = this.def.show;
    if (S.kind === 'presto') {
      for (const o of this.match.fighters) if (o.cardMarks && o.cardMarks.by === this && ++o.cardMarks.t > S.cards.keep) o.cardMarks = null;
    } else if (S.kind === 'chef') {
      if (!this.order) this.newOrder();
      if (this.wellDone > 0) {
        this.wellDone--;
        if (this.anim % 3 === 0) this.match.particles.push({ x: this.x + (Math.random() - 0.5) * 20, y: this.y - Math.random() * 50, vx: 0, vy: -1.2 - Math.random(), life: 16, color: Math.random() < 0.5 ? 0xffa030 : 0xff5a2a, size: 2, grav: 0 });
      }
    }
  }
  /** Roux writes up a new order: `len` different dishes (moves) to land, in order. */
  newOrder() {
    const O = this.def.show.orders, pool = O.pool.slice(), list = [];
    while (list.length < O.len && pool.length) list.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    this.order = { list, i: 0, flash: 0 };
  }

  // ------------------------------------------------------------------ specials (from st_attack)
  /** CARD TRICK: a fan of cards flicked off the wand (spec.n of them, spread by spec.spread radians). */
  throwCards(spec) {
    for (let i = 0; i < spec.n; i++) this.match.projectiles.push(new PlayingCard(this.match, this, spec, (i - (spec.n - 1) / 2) * spec.spread));
    sfx('shuriken', 0.6, 1.3); sfx('petal', 0.3, 1.6);
  }
  /**
   * VANISHING ACT: in a puff of smoke he's gone (invisible, can't be touched) from `from` to `to`; then he reappears -
   * behind the nearest foe with cards stuck on them if one's in range, otherwise `dist` ahead - for the TA-DA stab.
   */
  vanishStep(m) {
    const V = m.vanish, fx = (n) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.6; this.match.particles.push({ shape: 'smoke', x: this.x, y: this.y - 26, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 0.3, life: 30 + Math.random() * 16, maxLife: 46, color: i % 3 ? 0xd8d0e8 : this.pal.light, grav: -0.01, drag: 0.94, r: 4 + Math.random() * 5 }); } };
    if (this.t >= V.from && this.t <= V.to) { this.invincible = Math.max(this.invincible, 2); this.vanished = true; this.vx *= 0.8; if (!this.grounded) this.vy = Math.min(this.vy, 0.5); }
    if (this.t === V.from) { fx(16); sfx('smoke', 0.8, 1.1); if (!this.grounded) this.usedDive = true; }
    if (this.t === V.to) {
      this.vanished = false;
      let tg = null, bd = V.range;
      for (const o of this.match.fighters) { if (o === this || !o.alive || o.team === this.team || o.state === 'respawn' || !o.cardMarks || o.cardMarks.by !== this) continue; const d = Math.hypot(o.x - this.x, o.y - this.y); if (d < bd) { bd = d; tg = o; } }
      if (tg) { const side = Math.sign(tg.x - this.x) || this.facing; this.x = tg.x + side * 30; this.y = tg.y; this.facing = -side; this.grounded = tg.grounded; this.platform = tg.platform; this.vy = 0; }
      else this.x += this.facing * V.dist;
      fx(12); sfx('smoke', 0.6, 1.4); sfx('ding', 0.5, 1.8);
      this.match.popText(this, 'TA-DA!', css(this.pal.light));
    }
  }
  /** CLEAVER TOSS: the cleaver spun out (one at a time - his hand's empty until it comes back). */
  tossCleaver(spec) { if (this.cleaverOut) return; this.cleaverOut = new Cleaver(this.match, this, spec); this.match.projectiles.push(this.cleaverOut); }
  /** HOT OIL: poured onto the floor in front of him (one puddle at a time). */
  pourOil(spec) { const p = new HotOil(this.match, this, spec); if (p.alive) this.match.projectiles.push(p); }

  // ------------------------------------------------------------------ hits (from MatchScene.applyHit)
  /**
   * How much harder this hit lands (null: as normal). Presto's TA-DA (side-B) cashes in the cards stuck on them:
   * x(1 + perCard) damage and more knockback per card. Roux while WELL DONE: everything hits harder.
   */
  showBonus(t, hb) {
    const S = this.def.show;
    if (S.kind === 'presto' && !hb.projectile && this.state === 'attack' && this.moveName === 'sideB' && t.cardMarks && t.cardMarks.by === this) {
      const n = t.cardMarks.n; t.cardMarks = null;
      if (n >= S.cards.max && !this.isCpu && !this.match.isTraining) this.match.stat('cards3');   // IS THIS YOUR CARD? (achievements.js)
      this.match.popText(t, n >= S.cards.max ? 'IS THIS YOUR CARD?!' : 'IS THIS YOUR CARD?', css(this.pal.light)); sfx('bighit', 0.7, 1.3); sfx('shing', 0.6, 1.4);
      for (let i = 0; i < 6 + n * 4; i++) { const a = Math.random() * Math.PI * 2; this.match.particles.push({ x: t.x, y: t.y - 26, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1, life: 26, color: [0xffffff, 0xe02a3a, this.pal.light][i % 3], size: 3, grav: 0.08 }); }
      return { dmg: 1 + S.cards.perCard * n, kb: 1 + S.cards.perKb * n };
    }
    if (S.kind === 'chef' && this.wellDone > 0) return { dmg: S.orders.bonus.dmg, kb: S.orders.bonus.kb };
    return null;
  }
  /** A hit landed: a Presto card sticks a card on them; a Roux hit with the next dish on the ticket ticks it off (the whole ticket: ORDER UP!). */
  showLanded(t, hb) {
    const S = this.def.show;
    if (S.kind === 'presto' && hb.projectile && hb.projectile.card) {
      const M = t.cardMarks && t.cardMarks.by === this ? t.cardMarks : (t.cardMarks = { by: this, n: 0, t: 0, suits: [] });
      if (M.n < S.cards.max) { M.n++; M.suits.push(hb.projectile.suit); } M.t = 0;
      return;
    }
    if (S.kind !== 'chef' || !this.order) return;
    const P = hb.projectile, dish = P ? (P instanceof Cleaver ? 'sideB' : P instanceof HotOil ? 'downB' : null) : this.state === 'upb' ? 'upb' : this.moveName;
    const O = this.order;
    if (dish !== O.list[O.i] || this.lastDish === (P ? P.id : this.attackId)) return;
    this.lastDish = P ? P.id : this.attackId;
    O.i++; O.flash = 12; sfx('ding', 0.5, 1.2 + O.i * 0.2);
    if (O.i >= O.list.length) {
      const B = S.orders.bonus;
      this.wellDone = B.time; this.limit = Math.min(100, this.limit + B.limit);
      if (!this.isCpu && !this.match.isTraining) this.match.stat('orders');                         // ORDER UP! (achievements.js)
      this.match.popText(this, 'ORDER UP!', '#ffd060'); sfx('ding', 0.9, 1); sfx('flame', 0.6, 1);
      for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2; this.match.particles.push({ x: this.x, y: this.y - 40, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1.5, life: 24, color: i % 2 ? 0xffd060 : 0xff5a2a, size: 3, grav: 0.06 }); }
      this.newOrder();
    }
  }

  // ------------------------------------------------------------------ Limits
  /**
   * The showmen's Limits (type 'saw' / 'feast'): whoever is in reach in front of him at `catchAt` is caught (Presto:
   * shut in a magic cabinet; Roux: scooped into a giant pot) and held there; on each of `hits` frames they take a
   * thump (the saw / the boil), and at `finalAt` the big finish launches them. Nobody caught: it ends early.
   */
  showLimit(L) {
    const m = this.match;
    if (this.t === 1) { this.ult = { caught: [], at: { x: this.x + this.facing * L.ahead, y: this.y } }; sfx('limit', 0.6, 1.2); m.shake(6, 10); this.fx.setDepth(4); }   // (the box / the pot in front of whoever's caught)
    const U = this.ult; this.vx = 0; this.lx = 0;
    if (!this.grounded) this.vy = Math.max(this.vy, 3);
    const foe = (o) => o !== this && o.alive && o.team !== this.team && o.state !== 'respawn' && !o.isIntangible();
    if (this.t === L.catchAt) {
      U.at = { x: this.x + this.facing * L.ahead, y: this.y };
      for (const o of m.fighters) if (foe(o) && Math.abs(o.x - U.at.x) < L.reach && o.y > this.y - 140 && o.y < this.y + 60) U.caught.push(o);
      sfx(L.type === 'saw' ? 'clang' : 'bighit', 0.9, 0.8); m.shake(8, 10);
      if (L.type === 'feast') for (let i = 0; i < 20; i++) m.particles.push({ x: U.at.x + (Math.random() - 0.5) * 60, y: U.at.y - 40, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 4, life: 30, color: i % 2 ? 0xffd060 : 0xe8a020, size: 3, grav: 0.2 });
      if (!U.caught.length) { U.whiff = this.t; m.popText(this, L.type === 'saw' ? 'NOTHING UP MY SLEEVE...' : 'NO TAKERS?!', '#ffffff'); }
    }
    U.caught.forEach((o, i) => {                                                       // held in the box / the pot
      if (!o.alive) return;
      const tx = U.at.x + (i - (U.caught.length - 1) / 2) * 18, ty = U.at.y - (L.type === 'feast' ? 34 + Math.sin(this.t * 0.2 + i) * 4 : 6);
      o.x += (tx - o.x) * 0.25; o.y += (ty - o.y) * 0.25; o.vx = o.vy = o.lx = o.ly = 0; o.grounded = false; o.platform = null;
      if (o.state === 'hitstun') o.hitstun = Math.max(o.hitstun, 6);
    });
    if (L.hits.includes(this.t)) {
      for (const o of U.caught) if (o.alive) this.match.applyHit(o, { h: L.thump, owner: this, facing: this.facing, id: 'show' + this.slot + ':' + o.slot + ':' + this.t + ':' + this.age }, this.x);
      if (U.caught.length) { sfx(L.type === 'saw' ? 'slash' : 'geyser', 0.8, L.type === 'saw' ? 1.6 : 1.2); m.shake(5, 6); }
    }
    if (this.t === L.finalAt && U.caught.length) {
      U.final = this.t; sfx('ko', 0.8, 0.8); sfx('bighit', 1, 0.6); m.shake(18, 16);
      for (const o of U.caught) if (o.alive) this.match.applyHit(o, { h: L.final, owner: this, facing: this.facing, pillar: true, id: 'showF' + this.slot + ':' + o.slot + ':' + this.age }, this.x);
      for (let i = 0; i < 30; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2; m.particles.push({ x: U.at.x, y: U.at.y - 30, vx: Math.cos(a) * (2 + Math.random() * 4), vy: Math.sin(a) * (3 + Math.random() * 5), life: 40, color: L.type === 'saw' ? [0xffffff, 0xe02a3a, this.pal.light][i % 3] : [0xffd060, 0xe8a020, 0xff5a2a][i % 3], size: 3, grav: 0.15 }); }
      this.match.popText(this, L.type === 'saw' ? 'TA-DAAA!' : 'BON APPETIT!', L.type === 'saw' ? css(this.pal.light) : '#ffd060');
    }
    if (this.t >= L.frames || (U.whiff && this.t > U.whiff + 40)) { this.invincible = 30; this.ult = null; this.fx.setDepth(0); this.setState(this.grounded ? 'idle' : 'air'); }
  }

  // ------------------------------------------------------------------ drawing (from fighterRender)
  /** Everything the showmen draw around themselves: marks, tickets, the vanish, the cabinet, doves, flames, the Limits. */
  drawShow(g, spr) {
    const S = this.def.show, s = this.state, t = this.anim;
    if (S.kind === 'presto') {
      if (this.vanished) spr.setAlpha(0);
      for (const o of this.match.fighters) {                                            // the cards stuck on them, fanned over their head
        const M = o.cardMarks; if (!M || M.by !== this || !o.alive) continue;
        M.suits.forEach((su, i) => drawCard(g, o.x + 22 + i * 7, o.y - (o.body ? o.body.h : 50) * 0.75 + i * 2, 8, 11, 0.2 + i * 0.25 + Math.sin(t * 0.08) * 0.05, su, false));   // (fanned beside their head)
      }
      if (s === 'counter') this.drawCabinet(g, this.x, this.y, 1, this.counterReady());
      if (s === 'upb' && this.t >= this.def.moves.upb.riseAt - 2) this.drawDoves(g);
      if (s === 'limit' && this.ult) this.drawSaw(g, this.def.limit, this.ult);
    } else if (S.kind === 'chef') {
      if (this.order && this.alive && s !== 'respawn') this.drawTicket(g);
      if (s === 'upb' && this.t >= this.def.moves.upb.riseAt && this.t < this.def.moves.upb.riseAt + 18) this.drawFlambe(g);
      if (s === 'limit' && this.ult) this.drawPot(g, this.def.limit, this.ult);
    }
    if (this.ticketText && !(S.kind === 'chef' && this.order && this.alive && s !== 'respawn')) this.ticketText.setVisible(false);
  }
  /** THE CABINET: an upright magic cabinet, violet with gold stars, round him (its door shut while the counter's up). */
  drawCabinet(g, x, y, k, shut) {
    const w = 34, h = 70 * k, P = this.pal;
    g.fillStyle(0x14101c, 1); g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 2);
    g.fillStyle(P.deep, 1); g.fillRect(x - w / 2, y - h, w, h); g.fillStyle(P.mid, 1); g.fillRect(x - w / 2 + 3, y - h + 3, w - 6, h - 6);
    for (let i = 0; i < 5; i++) drawSuit(g, ['spade', 'heart', 'club', 'diamond', 'spade'][i], x + (i % 2 ? 6 : -6), y - h + 12 + i * 12, 3, i % 2 ? 0xffd860 : 0xffffff);
    g.fillStyle(0xffd860, 1); g.fillRect(x - w / 2 - 3, y - h - 5, w + 6, 4);
    if (!shut) { g.fillStyle(0x07060c, 0.6); g.fillRect(x - w / 2 + 3, y - h + 3, w - 6, h - 6); }
    if (shut && this.anim % 20 < 10) { g.fillStyle(0xffffff, 0.3); g.fillRect(x - w / 2 + 3, y - h + 3, 3, h - 6); }
  }
  /** DOVE LIFT: a flock of white doves flapping round his raised hands, carrying him up. */
  drawDoves(g) {
    for (let i = 0; i < 6; i++) {
      const a = this.anim * 0.15 + i * 1.05, x = this.x + Math.cos(a) * 16, y = this.y - 70 + Math.sin(a * 1.3) * 8 - (i % 2) * 6, flap = Math.sin(this.anim * 0.8 + i) * 5;
      g.fillStyle(0x14101c, 1); g.fillEllipse(x, y, 11, 6);
      g.fillStyle(0xffffff, 1); g.fillEllipse(x, y, 9, 4); g.fillTriangle(x - 2, y, x - 9, y - 3 - flap, x + 2, y - 1); g.fillTriangle(x + 2, y, x + 9, y - 3 + flap, x - 2, y - 1);
      g.fillStyle(0xffb040, 1); g.fillRect(x + (i % 2 ? 4 : -5), y - 1, 2, 1);
    }
  }
  /** THE GRAND ILLUSION: the cabinet drops round whoever's caught, a giant saw cuts through it on every beat, then it bursts open. */
  drawSaw(g, L, U) {
    const x = U.at.x, y = U.at.y, t = this.t;
    for (let i = 0; i < 3; i++) { g.fillStyle(this.pal.light, 0.06); g.fillTriangle(x - 10 + i * 10, y - 260, x - 60, y, x + 60, y); }   // a spotlight on it
    if (t < L.catchAt || !U.caught.length || (U.final && t > U.final + 6)) return;
    const drop = Math.min(1, (t - L.catchAt) / 6);
    g.fillStyle(0x14101c, 1); g.fillRect(x - 32, y - 66 * drop - 2, 64, 66 * drop + 2);
    g.fillStyle(this.pal.deep, 1); g.fillRect(x - 30, y - 64 * drop, 60, 64 * drop); g.fillStyle(this.pal.mid, 1); g.fillRect(x - 27, y - 61 * drop, 54, 58 * drop);
    for (let i = 0; i < 6; i++) drawSuit(g, ['spade', 'heart', 'club', 'diamond'][i % 4], x - 18 + (i % 3) * 18, y - 48 + Math.floor(i / 3) * 26, 4, 0xffd860);
    g.fillStyle(0xffd860, 1); g.fillRect(x - 34, y - 66 * drop - 6, 68, 5); g.fillRect(x - 3, y - 64 * drop, 6, 64 * drop);
    const last = L.hits.reduce((b, h) => (t >= h ? h : b), -99), since = t - last, sx = x + Math.sin(t * 0.5) * 40;
    if (t > L.hits[0] - 10) {                                                            // the saw: a long blade through the middle, teeth glinting
      g.fillStyle(0x14101c, 1); g.fillRect(sx - 70, y - 36, 140, 10); g.fillStyle(0xd8dce8, 1); g.fillRect(sx - 68, y - 35, 136, 8);
      for (let i = 0; i < 17; i++) { g.fillStyle(0xffffff, 1); g.fillTriangle(sx - 68 + i * 8, y - 27, sx - 64 + i * 8, y - 22, sx - 60 + i * 8, y - 27); }
      g.fillStyle(0x7a4a24, 1); g.fillRect(sx + 66, y - 40, 14, 16);
      if (since < 8) for (let i = 0; i < 3; i++) this.match.particles.push({ x: x + (Math.random() - 0.5) * 20, y: y - 32, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, life: 14, color: 0xfff0a0, size: 2, grav: 0.2 });
    }
  }
  /** ORDER UP: his ticket floating over his toque - the three dishes, the done ones struck through. */
  drawTicket(g) {
    const O = this.order, x = this.x, y = this.y - (this.def.tagY || 60) - 26, w = 64;
    if (!this.ticketText) { this.ticketText = this.match.add.text(0, 0, '', { fontFamily: FONT, fontSize: '5px', color: '#2a1a10', align: 'center', lineSpacing: 1 }).setOrigin(0.5); this.match.addWorld(this.ticketText); }
    const lines = O.list.map((d, i) => (i < O.i ? '- ' + DISH[d] + ' -' : i === O.i ? '> ' + DISH[d] : DISH[d]));
    this.ticketText.setText(lines.join('\n')).setPosition(x, y + 3).setVisible(true).setDepth((this.sprite && this.sprite.depth || 0) + 2);
    if (O.flash > 0) O.flash--;
    const h = 26, glow = this.wellDone > 0;
    g.fillStyle(0x14101c, 0.6); g.fillRect(x - w / 2 + 2, y - h / 2 + 2, w, h);
    g.fillStyle(O.flash ? 0xfff0a0 : glow ? 0xffe0b0 : 0xfffaf0, 1); g.fillRect(x - w / 2, y - h / 2, w, h);
    for (let i = 0; i < 8; i++) g.fillTriangle(x - w / 2 + i * 8, y + h / 2, x - w / 2 + i * 8 + 8, y + h / 2, x - w / 2 + i * 8 + 4, y + h / 2 + 3);   // torn edge
    g.fillStyle(0xe03a2a, 1); g.fillRect(x - w / 2, y - h / 2, w, 2);
    g.fillStyle(0x8a8a9a, 1); g.fillCircle(x, y - h / 2, 2);                           // the pin
  }
  /** FLAMBE: a whoosh of fire under his clogs as he blasts off. */
  drawFlambe(g) {
    const k = 1 - (this.t - this.def.moves.upb.riseAt) / 18;
    for (const [c, w] of [[0xff3a1a, 26], [0xffa030, 18], [0xfff0a0, 8]]) { g.fillStyle(c, 0.9 * k); g.fillTriangle(this.x - w / 2, this.y - 4, this.x + w / 2, this.y - 4, this.x + Math.sin(this.anim) * 4, this.y + 40 * k); }
  }
  /** FULL COURSE: a giant iron pot crashes down in front of him, fire under it, whoever's caught bobbing in the boiling soup; then it erupts. */
  drawPot(g, L, U) {
    const t = this.t; if (t < L.catchAt - 6) return;
    const drop = Math.min(1, (t - L.catchAt + 6) / 6), x = U.at.x, y = U.at.y - (1 - drop) * 200;
    for (let i = 0; i < 5; i++) { const fh = 10 + ((t * 3 + i * 7) % 10); g.fillStyle(i % 2 ? 0xffa030 : 0xff3a1a, 1); g.fillTriangle(x - 40 + i * 20, y, x - 30 + i * 20, y, x - 35 + i * 20, y - fh); }
    g.fillStyle(0x14101c, 1); g.fillEllipse(x, y - 30, 104, 64);
    g.fillStyle(0x3a3a46, 1); g.fillEllipse(x, y - 30, 98, 58); g.fillStyle(0x5a5a6a, 1); g.fillEllipse(x - 18, y - 38, 30, 16);
    const soup = U.caught.length ? 0xe8a020 : 0xc88a3a;
    g.fillStyle(0x14101c, 1); g.fillEllipse(x, y - 54, 98, 18); g.fillStyle(soup, 1); g.fillEllipse(x, y - 54, 90, 13);
    for (let i = 0; i < 6; i++) { const bx = x - 36 + ((i * 17 + t * 2) % 72), r = 2 + ((t + i * 5) % 10) / 3; g.lineStyle(1.5, 0xfff0a0, 1); g.strokeCircle(bx, y - 55, r); } g.lineStyle(0);
    for (const sx of [-1, 1]) { g.fillStyle(0x14101c, 1); g.fillRect(x + sx * 50 - 4, y - 50, 8, 8); }
    for (let i = 0; i < 3; i++) { g.fillStyle(0xffffff, 0.15); g.fillCircle(x - 20 + i * 20 + Math.sin(t * 0.05 + i) * 8, y - 80 - ((t * 0.8 + i * 20) % 50), 10 + i * 2); }   // steam
    if (U.final && t < U.final + 30) { const k = 1 - (t - U.final) / 30; g.fillStyle(0xe8a020, 0.9 * k); g.fillRect(x - 30 * k, y - 260, 60 * k, 206); g.fillStyle(0xfff0a0, k); g.fillRect(x - 12 * k, y - 260, 24 * k, 206); }
  }
}
