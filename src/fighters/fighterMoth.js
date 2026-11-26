// Fighter methods: MADAME MOTH (def moth.js) - FORTUNE. DRAW (down special) turns over a tarot card, CAST (neutral)
// plays it; CARD FAN, MOTH FLIGHT (wings drawn by the game, then a slow glide) and her Limit THE WHEEL. Reached through
// the `def.show` hooks (fighterShow.js): mothSpecial / mothStep / mothTick / mothBonus / mothLanded / drawMoth /
// drawMothHud / wheelLimit. Mixed into the Fighter class (Fighter.js) - `this` is she.
import { sfx } from '../audio/sfx.js';
import { spawnShot, nearestFoe, burstHit, skyLayer, pixStar, foesOf } from './showShot.js';

const DECK = ['tower', 'sun', 'moon', 'star', 'death', 'fool'];
const WHEEL = ['jackpot', 'storm', 'fortune', 'misfortune', 'jackpot', 'storm', 'fortune', 'misfortune'];   // the wheel's eight wedges
const WEDGE = { jackpot: [0xf0c060, 'JACKPOT!'], storm: [0x6a9ae8, 'STORM!'], fortune: [0x8ae0a0, 'FORTUNE!'], misfortune: [0x8a3aa0, 'MISFORTUNE!'] };
const dim = (c) => (((c >> 16 & 255) * 0.72) << 16) | (((c >> 8 & 255) * 0.72) << 8) | ((c & 255) * 0.72);
const css = (c) => '#' + c.toString(16).padStart(6, '0');

/** MADAME MOTH's own methods (attached to Fighter.prototype). */
export class FighterMoth {
  /** Her specials: all her own moves (`show: true`). */
  mothSpecial(c) {
    if (c.up) { if (this.usedUpB) return false; this.usedUpB = true; this.startAttack('upb'); return true; }
    if (c.down) { this.startAttack('downB'); return true; }
    if (Math.abs(c.x) > 0.5) { this.facing = Math.sign(c.x); this.startAttack('sideB'); return true; }
    this.startAttack('neutralB'); return true;
  }

  /** Every frame of her own moves (from st_attack). True = it changed her state. */
  mothStep(m) {
    const n = this.moveName, t = this.t, M = this.match;
    if (n === 'downB') {                                                // DRAW
      if (!this.grounded) this.vy = Math.min(this.vy, 1.4);
      if (t === m.drawAt) {
        const deck = DECK.filter((k) => k !== this.card);
        this.card = deck[Math.floor(Math.random() * deck.length)]; this.cardFlip = 0;
        const C = this.def.show.cards[this.card];
        M.popText(this, C.name, css(C.color)); sfx('petal', 0.5, 1.2); sfx('ding', 0.3, 1.5);
      }
    } else if (n === 'neutralB') {                                     // CAST
      if (!this.grounded) this.vy = Math.min(this.vy, 1.2);
      if (t === m.castAt) this.castCard(m);
    } else if (n === 'sideB') {                                        // CARD FAN
      if (!this.grounded) this.vy = Math.min(this.vy, 1.0);
      if (t === m.spawnAt) this.throwFan(m.fan);
    } else if (n === 'upb') {                                          // MOTH FLIGHT
      if (t >= m.riseFrom && t <= m.riseTo) {
        const k = (t - m.riseFrom) / (m.riseTo - m.riseFrom);
        this.vy = m.riseV * (1 - 0.55 * k); this.grounded = false; this.platform = null;
        if ((t - m.riseFrom) % 6 === 0) { sfx('whoosh', 0.3, 1.3 + k * 0.4); M.puff(this.x, this.y - 10, this.pal.mid, 3); }
      }
      if (t >= m.frames - 1) { this.mothGlide = m.glide; this.setState(this.grounded ? 'idle' : 'helpless'); return true; }
    }
    return false;
  }

  /** CAST: plays the card in her hand (THE TOWER, THE SUN, ...) and spends it; no card = a palm flash. */
  castCard(m) {
    const M = this.match, key = this.card, C = key && this.def.show.cards[key];
    const hx = this.x + this.facing * this.def.handOffset.x, hy = this.y + this.def.handOffset.y;
    if (!C) { burstHit(this, hx + this.facing * 6, hy, m.palmR, m.palm, 'mtpalm' + this.attackId); this.addMothFx({ kind: 'flash', x: hx + this.facing * 6, y: hy, life: 10, color: this.pal.light }); sfx('shing', 0.35, 1.5); return; }
    this.card = null; this.castName = C.name;
    this.addMothFx({ kind: 'cast', x: hx, y: hy - 14, life: 22, color: C.color, card: key });
    if (key === 'tower') {
      const o = nearestFoe(this);
      this.addMothFx({ kind: 'tower', x: o ? o.x : this.x + this.facing * 90, y: o ? o.y : this.y, follow: o, hitAt: C.warn, life: C.warn + 12, hit: C.bolt, w: 16, color: C.color });
      sfx('warn', 0.3, 1.6);
    } else if (key === 'sun') {
      this.mothHeal(C.heal); burstHit(this, this.x, this.y - 26, C.r, C.burst, 'mtsun' + this.attackId);
      this.addMothFx({ kind: 'sun', x: this.x, y: this.y - 26, life: 26, color: C.color, r: C.r }); sfx('item', 0.5, 1.1); M.shake(3, 6);
    } else if (key === 'moon') {
      this.moonUntil = this.age + C.time; this.moonHit = true; sfx('summon', 0.4, 0.8);
      this.addMothFx({ kind: 'sun', x: this.x, y: this.y - 26, life: 20, color: C.color, r: 30 });
    } else if (key === 'star') {
      const o = nearestFoe(this), tx = o ? o.x : this.x + this.facing * 80, ty = o ? o.y : this.y, me = this;
      spawnShot(M, this, { name: 'THE STAR', x: tx - 60, y: ty - C.from, vx: 60 / (C.from / C.speed), vy: C.speed, life: 80, w: 18, h: 18, hit: C.star, solid: true,
        step: (s) => { if (s.t % 2 === 0) M.particles.push({ shape: 'star', x: s.x, y: s.y, vx: (Math.random() - 0.5), vy: -0.5, life: 14, color: Math.random() < 0.5 ? C.color : 0xffffff, grav: 0, size: 2 }); },
        draw: (g, s) => { g.fillStyle(C.color, 0.25); g.fillCircle(s.x, s.y, 12); pixStar(g, s.x, s.y, 6, 0x5a3a10, C.color, 0xffffff); },
        onKill: (s) => { burstHit(me, s.x, s.y, C.r, C.star, 'mtstar' + s.id); me.addMothFx({ kind: 'sun', x: s.x, y: s.y, life: 16, color: C.color, r: C.r }); sfx('bighit', 0.4, 1.4); M.shake(4, 6); } });
      sfx('ding', 0.4, 2);
    } else if (key === 'death') {
      this.deathUntil = this.age + C.time; sfx('bats', 0.4, 0.8); sfx('curse', 0.3, 0.7);
      this.addMothFx({ kind: 'sun', x: this.x, y: this.y - 26, life: 20, color: 0x2a1a30, r: 34 });
    } else if (key === 'fool') {
      if (Math.random() < 0.5) { burstHit(this, this.x, this.y - 26, C.r, C.burst, 'mtfool' + this.attackId); this.addMothFx({ kind: 'sun', x: this.x, y: this.y - 26, life: 26, color: C.color, r: C.r }); M.popText(this, 'LUCKY FOOL!', css(C.color)); sfx('bighit', 0.6, 1.1); M.shake(6, 10); }
      else {                                                                    // it blows up in her face
        if (M.mode === 'stamina') this.hp -= C.backfire; else this.percent = Math.min(999, this.percent + C.backfire);
        this.ly = -3; this.lx = -this.facing * 2; this.grounded = false; this.platform = null;
        this.addMothFx({ kind: 'flash', x: this.x, y: this.y - 26, life: 14, color: 0x9a9a9a }); M.puff(this.x, this.y - 26, 0x6a6a6a, 10);
        M.popText(this, 'FOOLISH...', '#9a9a9a'); sfx('smoke', 0.5, 1); sfx('laugh', 0.3, 1.4);
      }
    }
    if (key !== 'fool') sfx('shing', 0.35, 1.2);
  }

  /** Heals her n% (or n HP in stamina). */
  mothHeal(n) {
    if (this.match.mode === 'stamina') this.hp = Math.min(this.maxHp, this.hp + n); else this.percent = Math.max(0, this.percent - n);
    this.match.popText(this, 'HEAL -' + n + '%', '#7dffc4');
  }

  /** CARD FAN: n cards in a fan, spinning. */
  throwFan(F) {
    const hx = this.x + this.facing * this.def.handOffset.x, hy = this.y + this.def.handOffset.y, me = this;
    for (let i = 0; i < F.n; i++) {
      const a = ((i - (F.n - 1) / 2) * F.spread * Math.PI) / 180;
      spawnShot(this.match, this, { name: 'CARD FAN', x: hx, y: hy, vx: Math.cos(a) * F.speed * this.facing, vy: Math.sin(a) * F.speed, life: F.life, w: 10, h: 10, hit: F.hit, solid: true,
        draw: (g, s) => me.drawCard(g, s.x, s.y, Math.abs(Math.cos(s.t * 0.5)), null, 0.85) });
    }
    sfx('shuriken', 0.4, 1.3); sfx('petal', 0.3, 1.6);
  }

  /** One of her effects, drawn and ticked by her (lightning, flares, the cast card). */
  addMothFx(e) { e.t = 0; (this.mothFx = this.mothFx || []).push(e); return e; }

  /** Every frame: her effects (and the strikes they make), THE MOON fading, the glide after MOTH FLIGHT. */
  mothTick() {
    const M = this.match;
    if (this.grounded || !['helpless', 'attack', 'air'].includes(this.state)) this.mothGlide = 0;
    if (this.state === 'helpless' && this.mothGlide && !this.fastFalling && this.vy > this.mothGlide) this.vy = this.mothGlide - 0.42;
    if (this.moonUntil && this.age > this.moonUntil) { this.moonUntil = 0; this.moonHit = false; }
    for (const e of this.mothFx || []) {
      e.t++;
      if (e.follow && e.follow.alive && e.t < e.hitAt) { e.x = e.follow.x; e.y = e.follow.y; }
      if (e.hit && e.t === e.hitAt) {
        M.limitHits.push({ t: 0, hb: { x1: e.x - e.w, x2: e.x + e.w, y1: e.y - 320, y2: e.y + 6, h: e.hit, owner: this, facing: Math.sign(e.x - this.x) || this.facing, id: 'mtbolt' + this.slot + ':' + M.frame + ':' + Math.round(e.x), pillar: true } });
        sfx('thunder', 0.6, 1.2); M.shake(5, 8); e.struck = true;
      }
    }
    if (this.mothFx) this.mothFx = this.mothFx.filter((e) => e.t <= e.life);
  }

  /** How much harder her hit lands: THE MOON's ambush (+20% damage) and DEATH's mark (+60% knockback), spent on it. */
  mothBonus() {
    let dmg = 1, kb = 1, any = false; const C = this.def.show.cards;
    if (this.moonHit && this.moonUntil > this.age) { dmg *= C.moon.dmg; this.moonHit = false; this.moonUntil = 0; any = true; }
    if (this.deathUntil > this.age) { kb *= C.death.kb; this.deathUntil = 0; any = true; this.match.popText(this, 'DEATH', '#e0e0e0'); sfx('bighit', 0.4, 0.7); }
    return any ? { dmg, kb } : null;
  }
  /** A hit landed: a flutter of dust off her wings. */
  mothLanded(t) {
    const c = t.center();
    for (let i = 0; i < 3; i++) this.match.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2, life: 16, color: i ? this.pal.light : 0xffffff, grav: 0.05, size: 2 });
  }

  /** A tarot card at (x, y): `w` = how much of its face shows (1 = flat on, for spinning), its symbol for `key`. */
  drawCard(g, x, y, w = 1, key = null, a = 1) {
    const cw = Math.max(1, Math.round(10 * w)), C = key && this.def.show.cards[key];
    g.fillStyle(0x1a0a1e, a); g.fillRect(x - cw / 2 - 1, y - 9, cw + 2, 18);
    g.fillStyle(0xfff4d0, a); g.fillRect(x - cw / 2, y - 8, cw, 16);
    if (cw < 6) return;
    g.fillStyle(C ? C.color : this.pal.deep, a); g.fillRect(x - cw / 2 + 1, y - 7, cw - 2, 14);
    g.fillStyle(0xf0c060, a); g.fillRect(x - cw / 2 + 1, y - 7, cw - 2, 1); g.fillRect(x - cw / 2 + 1, y + 6, cw - 2, 1);
    if (!C) { pixStar(g, x, y, 2, 0x1a0a1e, 0xf0c060, 0xffffff, a); return; }   // the back of the deck: a gold star
    const ink = 0x1a0a1e;
    g.fillStyle(ink, a);
    if (key === 'tower') { g.fillRect(x - 2, y - 3, 4, 8); g.fillRect(x - 3, y - 4, 6, 1); g.fillStyle(0xffffff, a); g.fillRect(x + 1, y - 7, 1, 3); g.fillRect(x, y - 4, 1, 2); }
    else if (key === 'sun') { g.fillStyle(0xfff4d0, a); g.fillCircle(x, y, 3); g.fillStyle(0xff9a3a, a); g.fillRect(x - 4, y, 1, 1); g.fillRect(x + 4, y, 1, 1); g.fillRect(x, y - 5, 1, 1); g.fillRect(x, y + 4, 1, 1); }
    else if (key === 'moon') { g.fillStyle(0xffffff, a); g.fillCircle(x, y, 3); g.fillStyle(C.color, a); g.fillCircle(x + 2, y - 1, 3); }
    else if (key === 'star') pixStar(g, x, y, 3, ink, 0xffffff, 0xffffff, a);
    else if (key === 'death') { g.fillStyle(0xffffff, a); g.fillRect(x - 2, y - 3, 5, 4); g.fillRect(x - 1, y + 1, 3, 2); g.fillStyle(ink, a); g.fillRect(x - 1, y - 2, 1, 1); g.fillRect(x + 1, y - 2, 1, 1); }
    else if (key === 'fool') { g.fillStyle(0xff5a7a, a); g.fillTriangle(x - 3, y + 2, x, y - 4, x + 3, y + 2); g.fillStyle(0xffd060, a); g.fillRect(x, y - 5, 1, 1); }
  }

  /** What's drawn round her: her wings in flight, the card she holds, THE MOON's fade, her effects, THE WHEEL. */
  drawMoth(g, spr) {
    const s = this.state, P = this.pal, b = this.fxBack;
    const flying = (s === 'attack' && this.moveName === 'upb') || (s === 'helpless' && this.mothGlide);
    if (flying) {                                                       // MOTH FLIGHT: two great wings behind her
      const beat = s === 'attack' ? Math.sin(this.t * 0.7) : 0.3 + 0.15 * Math.sin(this.anim * 0.15), f = this.facing;
      const ox = this.x - f * 2, oy = this.y - 34, up = 26 + 10 * beat, lo = 16 + 4 * beat;
      for (const side of [-1, 1]) {
        const sx = side * (side === f ? 1 : 0.8), P2 = (pts, dx = 0, dy = 0, k = 1) => pts.map(([px, py]) => ({ x: ox + px * sx * k + dx, y: oy + py * k + dy }));
        const upper = [[0, 0], [10, -up * 0.8], [22, -up], [32, -up * 0.85], [36, -up * 0.45], [30, -up * 0.15], [18, -2]];
        const lower = [[0, 3], [16, lo * 0.3], [26, lo * 0.8], [22, lo + 4], [12, lo + 6], [4, lo * 0.6]];
        for (const W of [upper, lower]) { b.fillStyle(0x1a0a1e, 1); b.fillPoints(P2(W, 0, 1, 1.06), true); b.fillStyle(P.deep, 1); b.fillPoints(P2(W), true); b.fillStyle(P.mid, 1); b.fillPoints(P2(W, side * 2, W === upper ? -2 : 1, 0.72), true); }
        for (let q = 0; q < 5; q++) { b.fillStyle(q % 2 ? P.light : 0xfff4d0, 1); b.fillRect(ox + sx * (14 + q * 4.5), oy - up * (0.75 + 0.05 * (q % 2)), 2, 2); }   // the scalloped edge
        const ex = ox + sx * 21, ey = oy - up * 0.5;
        b.fillStyle(0x1a0a1e, 1); b.fillCircle(ex, ey, 5); b.fillStyle(P.light, 1); b.fillCircle(ex, ey, 4); b.fillStyle(0x1a0a1e, 1); b.fillCircle(ex, ey, 2);   // the eye-spot
        b.fillStyle(0xfff4d0, 1); b.fillRect(ex, ey - 1, 1, 1);
      }
      if (this.anim % 5 === 0 && !this.match.demo) this.match.particles.push({ x: this.x + (Math.random() - 0.5) * 50, y: this.y - 30, vx: 0, vy: 0.4, life: 22, color: P.light, grav: 0.01, size: 1 });
    }
    if (this.moonUntil > this.age) { spr.setAlpha(this.isCpu || this.anim % 40 < 36 ? 0.14 : 0.3); this.tag.setAlpha(0.4); this.moonTag = true; } else if (this.moonTag) { this.moonTag = false; this.tag.setAlpha(1); }
    if (this.card && s !== 'limit') {                                   // the card she holds, over her head
      this.cardFlip = Math.min(1, (this.cardFlip || 0) + 0.12);
      const y = this.y - (this.def.tagY || 66) - 14 + Math.sin(this.anim * 0.08) * 2, C = this.def.show.cards[this.card];
      g.fillStyle(C.color, 0.18); g.fillCircle(this.x, y, 12);
      this.drawCard(g, this.x, y, Math.abs(Math.cos((1 - this.cardFlip) * Math.PI / 2)), this.cardFlip > 0.5 ? this.card : null);
    }
    if (this.deathUntil > this.age && this.anim % 6 < 3) { g.fillStyle(0x1a0a1e, 0.5); g.fillCircle(this.x + this.facing * 12, this.y - 36, 5); }   // DEATH's mark: a shadow on her hand
    for (const e of this.mothFx || []) this.drawMothFx(g, e);
    if (s === 'limit' && this.wheel) this.drawWheel(b, this.def.limit, this.wheel);   // (behind her)
    else if (this.showSky) this.showSky.clear();
  }

  /** One of her effects (see addMothFx). */
  drawMothFx(g, e) {
    const k = e.t / e.life;
    if (e.kind === 'flash') { g.fillStyle(e.color, 0.6 * (1 - k)); g.fillCircle(e.x, e.y, 6 + 16 * k); g.fillStyle(0xffffff, 1 - k); g.fillCircle(e.x, e.y, 4 * (1 - k) + 1); }
    else if (e.kind === 'sun') { g.lineStyle(3 * (1 - k) + 1, e.color, 1 - k); g.strokeCircle(e.x, e.y, 6 + e.r * k); g.lineStyle(0); g.fillStyle(e.color, 0.3 * (1 - k)); g.fillCircle(e.x, e.y, e.r * k); }
    else if (e.kind === 'cast') { const y = e.y - 10 * k; g.fillStyle(e.color, 0.3 * (1 - k)); g.fillCircle(e.x, y, 10 + 8 * k); this.drawCard(g, e.x, y, 1, e.card, 1 - k * k); }
    else if (e.kind === 'tower') {
      if (!e.struck) { if (e.t % 4 < 2) { g.fillStyle(e.color, 0.25); g.fillRect(e.x - 10, e.y - 300, 20, 300); } g.fillStyle(0xffffff, 0.8); g.fillRect(e.x - 10, e.y - 1, 20, 2); return; }
      const q = (e.t - e.hitAt) / 12; let x = e.x, y = e.y - 320;
      for (let i = 0; i < 12; i++) { const nx = e.x + ((i * 37 + e.hitAt) % 13 - 6) * (1 - i / 12), ny = y + 27; g.lineStyle(5, e.color, 0.5 * (1 - q)); g.lineBetween(x, y, nx, ny); g.lineStyle(2, 0xffffff, 1 - q); g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
      g.lineStyle(0); g.fillStyle(0xffffff, 0.7 * (1 - q)); g.fillCircle(e.x, e.y - 4, 14 * (1 - q) + 3);
    }
  }

  /** On her player plate: the card she holds (or the deck's back), with its name. */
  drawMothHud(g, x, y) {
    if (this.card) { const C = this.def.show.cards[this.card]; g.fillStyle(C.color, 0.3); g.fillCircle(x + 70, y + 6, 9); }
    this.drawCard(g, x + 70, y + 6, 1, this.card, this.card ? 1 : 0.5);
  }

  /** THE WHEEL (Limit, `type: 'wheel'`): it rises behind her, spins, slows and stops on what everyone gets. */
  wheelLimit(L) {
    const t = this.t, M = this.match;
    if (t === 1 || !this.wheel) {
      const pick = Math.floor(Math.random() * WHEEL.length);
      this.wheel = { pick, kind: WHEEL[pick], end: (Math.PI * 2) * 5 - ((pick + 0.5) / WHEEL.length) * Math.PI * 2, x: this.x, y: this.y - 64 };
    }
    const W = this.wheel; this.invincible = Math.max(this.invincible, 2); this.vx = this.vy = 0;
    const k = Math.min(1, Math.max(0, (t - L.riseTo) / (L.spinTo - L.riseTo)));
    W.angle = W.end * (1 - Math.pow(1 - k, 3));
    const prev = Math.floor(((W.lastA || 0) / (Math.PI * 2)) * WHEEL.length), now = Math.floor((W.angle / (Math.PI * 2)) * WHEEL.length);
    if (now !== prev) sfx('clocktick', 0.5, 1.4); W.lastA = W.angle;
    if (t === L.resultAt) { const [col, name] = WEDGE[W.kind]; M.popText(this, name, css(col)); sfx(W.kind === 'misfortune' ? 'curse' : 'item', 0.8, 0.9); M.shake(6, 10); }
    const foes = foesOf(this), hitAll = (h, tag) => { for (const o of foes) M.limitHits.push({ t: 0, hb: { x1: o.x - 20, x2: o.x + 20, y1: o.y - 70, y2: o.y + 6, h, owner: this, facing: Math.sign(o.x - this.x) || this.facing, id: 'mtw' + tag + this.slot + ':' + M.frame + o.slot, pillar: true } }); };
    if (W.kind === 'jackpot' && t === L.resultAt + 6) { hitAll(L.jackpot, 'j'); for (const o of foes) for (let i = 0; i < 12; i++) M.particles.push({ x: o.x, y: o.y - 30, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 3, life: 30, color: i % 3 ? 0xf0c060 : 0xfff4d0, grav: 0.2, size: 3 }); sfx('bighit', 0.8, 1); M.shake(8, 12); }
    if (W.kind === 'storm') L.storm.at.forEach((at, i) => { if (t === at - 10) for (const o of foes) this.addMothFx({ kind: 'tower', x: o.x, y: o.y, follow: o, hitAt: 10, life: 22, hit: i === L.storm.at.length - 1 ? L.storm.last : L.storm.hit, w: 18, color: 0x9ad8ff }); });
    if (W.kind === 'fortune' && t === L.resultAt + 6) {
      this.mothHeal(L.fortune.heal); this.addMothFx({ kind: 'sun', x: this.x, y: this.y - 26, life: 26, color: 0x8ae0a0, r: 50 }); const me = this;
      for (const o of foes) spawnShot(M, this, { name: 'FORTUNE', x: o.x - 40, y: o.y - 220, vx: 40 / 28, vy: 8, life: 60, w: 18, h: 18, hit: L.fortune.star, solid: true,
        draw: (g, s) => { g.fillStyle(0xfff0a0, 0.25); g.fillCircle(s.x, s.y, 12); pixStar(g, s.x, s.y, 6, 0x5a3a10, 0xfff0a0, 0xffffff); },
        onKill: (s) => { me.addMothFx({ kind: 'sun', x: s.x, y: s.y, life: 16, color: 0xfff0a0, r: 24 }); sfx('bighit', 0.4, 1.4); } });
    }
    if (W.kind === 'misfortune' && t === L.resultAt + 6) { hitAll(L.misfortune.hit, 'm'); for (const o of foes) { o.curse = Math.max(o.curse || 0, L.misfortune.curse); M.puff(o.x, o.y - 30, 0x8a3aa0, 12); } sfx('bats', 0.6, 0.9); }
    if (t >= L.frames) { this.wheel = null; if (this.showSky) this.showSky.clear(); this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
  }

  /** THE WHEEL's look: a velvet dusk, then the great wheel of fortune - eight wedges with their signs, gold spokes,
   *  a moth-wing pointer on top. */
  drawWheel(g, L, W) {
    const t = this.t, sky = skyLayer(this), fade = Math.min(1, t / 16) * (t > L.frames - 14 ? (L.frames - t) / 14 : 1);
    sky.clear(); sky.fillStyle(0x1a0616, 0.65 * fade); sky.fillRect(0, 0, 640, 360);
    for (let i = 0; i < 9; i++) { sky.fillStyle(i % 2 ? 0x5a1a40 : 0x3a0a2a, 0.5 * fade); sky.fillRect(i * 72, 0, 36, 360); }   // velvet curtains
    const rise = Math.min(1, t / L.riseTo), x = W.x, y = W.y + (1 - rise) * 60, R = 52 * rise, a0 = W.angle || 0;
    if (R < 2) return;
    g.fillStyle(0x000000, 0.35 * fade); g.fillCircle(x + 3, y + 4, R + 6);
    g.fillStyle(0x5a3a10, fade); g.fillCircle(x, y, R + 5); g.fillStyle(0xf0c060, fade); g.fillCircle(x, y, R + 3);
    const n = WHEEL.length;
    for (let i = 0; i < n; i++) {
      const a1 = a0 + (i / n) * Math.PI * 2 - Math.PI / 2, a2 = a0 + ((i + 1) / n) * Math.PI * 2 - Math.PI / 2, [col] = WEDGE[WHEEL[i]];
      const steps = 4; for (let q = 0; q < steps; q++) { const b1 = a1 + ((a2 - a1) * q) / steps, b2 = a1 + ((a2 - a1) * (q + 1)) / steps; g.fillStyle(i % 2 ? col : dim(col), fade); g.fillTriangle(x, y, x + Math.cos(b1) * R, y + Math.sin(b1) * R, x + Math.cos(b2) * R, y + Math.sin(b2) * R); }
      const am = (a1 + a2) / 2, sx = x + Math.cos(am) * R * 0.66, sy = y + Math.sin(am) * R * 0.66, kind = WHEEL[i];
      if (kind === 'jackpot') { g.fillStyle(0xfff4d0, fade); g.fillCircle(sx, sy, 4); g.fillStyle(0x5a3a10, fade); g.fillRect(sx - 1, sy - 2, 2, 4); }
      else if (kind === 'storm') { g.lineStyle(2, 0xffffff, fade); g.lineBetween(sx + 2, sy - 5, sx - 1, sy); g.lineBetween(sx - 1, sy, sx + 1, sy); g.lineBetween(sx + 1, sy, sx - 2, sy + 5); g.lineStyle(0); }
      else if (kind === 'fortune') pixStar(g, sx, sy, 4, 0x1a3a20, 0xffffff, 0xffffff, fade);
      else { g.fillStyle(0xffffff, fade); g.fillRect(sx - 3, sy - 3, 6, 5); g.fillRect(sx - 2, sy + 2, 4, 2); g.fillStyle(0x1a0a1e, fade); g.fillRect(sx - 2, sy - 2, 1, 2); g.fillRect(sx + 1, sy - 2, 1, 2); }
      g.lineStyle(1, 0x5a3a10, fade); g.lineBetween(x, y, x + Math.cos(a1) * R, y + Math.sin(a1) * R); g.lineStyle(0);
    }
    g.fillStyle(0x5a3a10, fade); g.fillCircle(x, y, 8); g.fillStyle(0xf0c060, fade); g.fillCircle(x, y, 6); g.fillStyle(0xfff4d0, fade); g.fillCircle(x - 1, y - 1, 2);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + a0, on = (Math.floor(t / 4) + i) % 2; g.fillStyle(on ? 0xfff4d0 : 0x8a6a20, fade); g.fillCircle(x + Math.cos(a) * (R + 3), y + Math.sin(a) * (R + 3), 1.5); }   // bulbs
    const py = y - R - 8;                                                 // the pointer: a little moth
    g.fillStyle(0x1a0a1e, fade); g.fillTriangle(x - 9, py - 4, x, py + 8, x + 9, py - 4);
    g.fillStyle(this.pal.mid, fade); g.fillTriangle(x - 7, py - 3, x, py + 5, x - 1, py - 3); g.fillTriangle(x + 7, py - 3, x, py + 5, x + 1, py - 3);
    g.fillStyle(0xf0c060, fade); g.fillCircle(x - 4, py - 1, 1.5); g.fillCircle(x + 4, py - 1, 1.5);
    if (t >= L.resultAt && t < L.resultAt + 30 && t % 6 < 3) { const am = a0 + ((W.pick + 0.5) / n) * Math.PI * 2 - Math.PI / 2; g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(x + Math.cos(am) * R * 0.66, y + Math.sin(am) * R * 0.66, 9); g.lineStyle(0); }
  }
}
