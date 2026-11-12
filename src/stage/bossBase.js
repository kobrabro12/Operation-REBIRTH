// BOSS ARENAS: the shared machinery of a boss fight (Trinkets > BOSS FIGHTS; the bosses and their rewards are in
// src/data/bosses.js). A boss arena is an ordinary stage (platforms, art, a HazardCycle) whose class extends
// BossArena; in a boss fight MatchScene calls startBoss() and the arena runs its boss as well as its hazards.
// Out of a boss fight (the arena opened for VS by a HARD win) there's no boss: just the stage and its hazards.
//
// The boss isn't a Fighter. It's drawn and moved by its arena, has health instead of a %, and:
//   - is hit by the players' attacks through strikeTargets (MatchScene hands it every attack hitbox): each region
//     in hurt() takes the hit's damage x its `mult` (weak points more, armour less), once per hit;
//   - attacks with hazard hitboxes (unblockable - dodge them) that its arena pushes from atk_<name>(match, a, out),
//     each strike with its own id; how hard they hit scales with the difficulty (TIERS in bosses.js);
//   - picks its next attack from pattern() after a pause (shorter on higher difficulties), and turns ENRAGED at half
//     health (onRage; pattern sees phase 2);
//   - shows a health bar with its name at the top of the screen, and when its health runs out plays its death
//     (onDeath / the explosions here) and the match ends in a win (MatchScene.bossDefeated).
// For the CPU (the sim) it offers match.bossProxy: something to walk to and swing at.
import { FONT, VIEW_W } from '../config.js';
import { sfx } from '../audio/sfx.js';

// the boss health bar: where, how big, and how quickly the white "chip" catches up with the real health
const BAR = { x: VIEW_W / 2 - 170, y: 30, w: 340, h: 9, chip: 0.6 };
// frames the boss shows its hurt flash after a hit; frames between its attacks on NORMAL (divided by the tier's speed)
const FLASH = 6, GAP = [70, 130];
// a hit on the boss: the attacker freezes this many frames (the crunch of landing a blow)
const HITSTOP = 4;
// the death: how long it lasts (frames) - the match's own end screen runs alongside
const DEATH = 150;
// the arenas write knockback growth small (1 = a heavy hit); this turns it into the fighters' scale (a smash is ~6)
const GROWTH = 5.5;

/** The base of every boss arena: health, being hit, picking attacks, the health bar and the death. */
export class BossArena {
  /**
   * Starts the boss (MatchScene, after the fighters are made). cfg: { boss (BOSSES entry), tier (index), T (TIERS
   * entry) }. Makes the health bar and the CPU's target, and calls the arena's makeBoss() for its own state.
   */
  startBoss(match, cfg) {
    const max = Math.round(cfg.boss.hp * cfg.T.hp);
    this.boss = { cfg, hp: max, max, shown: max, chip: max, phase: 1, t: 0, time: 0, wait: 150, atk: null, last: null, flash: 0, dying: 0, uid: 0, seen: new Set(), rage: 0 };
    this.match = match;
    const s = match;
    this.barG = s.add.graphics().setDepth(30);
    this.barName = s.add.text(BAR.x + 2, BAR.y - 12, cfg.boss.name, { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#0b0a14', strokeThickness: 4 }).setDepth(31);
    this.barTier = s.add.text(BAR.x + BAR.w - 2, BAR.y - 11, cfg.T.name, { fontFamily: FONT, fontSize: '6px', color: '#' + cfg.T.color.toString(16).padStart(6, '0'), stroke: '#0b0a14', strokeThickness: 3 }).setOrigin(1, 0).setDepth(31);
    this.rageText = s.add.text(VIEW_W / 2, 64, '', { fontFamily: FONT, fontSize: '14px', color: '#ff5a3a', stroke: '#0b0a14', strokeThickness: 5 }).setOrigin(0.5).setDepth(31);
    s.addUI(this.barG, this.barName, this.barTier, this.rageText);
    match.bossProxy = { x: 0, y: -100, alive: true, state: 'idle', percent: 50, attackId: 0, possessImmune: true, possessed: false, team: 99 };
    this.makeBoss(match);
  }

  /** Frames scaled by the difficulty's speed (wind-ups and pauses get shorter on HARD / NIGHTMARE). */
  sp(n) { return Math.max(1, Math.round(n / (this.boss ? this.boss.cfg.T.speed : 1))); }
  /** Damage scaled by the difficulty. */
  dmg(n) { return Math.round(n * (this.boss ? this.boss.cfg.T.dmg : 1)); }
  /** A fresh id for one strike (each target is hit once per id). */
  sid(tag) { return 'boss-' + tag + '-' + (++this.boss.uid); }
  /**
   * One of the boss's hitboxes: a box (x1, y1, x2, y2) that hits like a stage hazard (can't be shielded; dodges
   * pass through it). dmg is scaled by the difficulty; kb = [angle, base, growth]; more = extra fields (dirX,
   * radial...). Returns the hitbox to push into `out`.
   */
  bhit(id, x1, y1, x2, y2, dmg, [angle, base, growth], more = {}) {
    return { x1, y1, x2, y2, dmg: this.dmg(dmg), angle, base, growth: growth * GROWTH, id, hazard: true, boss: true, ...more };
  }
  /** Extra points the match camera keeps in view: the boss (and the whole deck). */
  camPoints() { if (!this.boss || this.boss.dying > 100) return []; const c = this.core(); return [{ x: c.x, y: c.y - (this.bodyH || 140) * 0.7 }, { x: -200, y: 0 }, { x: 200, y: 0 }]; }
  /** The nearest living player to a point (or null). */
  nearest(match, x = 0) {
    let best = null, bd = 1e9;
    for (const f of match.fighters) { if (!f.alive || f.state === 'respawn') continue; const d = Math.abs(f.x - x); if (d < bd) { bd = d; best = f; } }
    return best;
  }

  /**
   * Runs the boss for one frame (called from the arena's step): its pauses and attacks, the rage at half health,
   * the death, the CPU's target. Pushes its hitboxes into `out`.
   */
  bossStep(match, out) {
    const B = this.boss; if (!B) return out;
    B.t++; if (B.flash > 0) B.flash--;
    B.chip = B.chip > B.hp ? Math.max(B.hp, B.chip - B.max * 0.004) : B.hp;
    if (B.dying) { B.dying++; this.stepDeath(match); return out; }
    if (!match.over) B.time++;
    const P = match.bossProxy, c = this.core();
    P.x = c.x; P.y = c.y + 26; P.state = B.atk ? 'attack' : 'idle'; P.attackId = B.atk ? B.atk.id : 0;
    if (match.over) return out;
    if (B.phase === 1 && B.hp <= B.max / 2) {                               // half health: ENRAGED
      B.phase = 2; B.rage = 90; B.atk = null; B.wait = 80;
      this.rageText.setText(this.rageLine ? this.rageLine() : 'ENRAGED!');
      sfx('roar', 0.9, 0.8); match.shake(10, 40);
      if (this.onRage) this.onRage(match);
    }
    if (B.rage > 0) { B.rage--; this.rageText.setVisible(B.rage % 16 < 11 && B.rage > 0); if (!B.rage) this.rageText.setText(''); }
    if (!B.atk) {
      if (this.idle) this.idle(match);
      if (--B.wait <= 0 && match.fighters.some((f) => f.alive)) {
        const list = this.pattern(B.phase).filter((n) => n !== B.last || this.pattern(B.phase).length < 2);
        const name = list[Math.floor(Math.random() * list.length)];
        B.atk = { name, t: 0, id: ++B.uid }; B.last = name;
        if (this['start_' + name]) this['start_' + name](match, B.atk);
      }
    }
    if (B.atk) {
      B.atk.t++;
      if (this['atk_' + B.atk.name](match, B.atk, out)) {
        B.atk = null;
        B.wait = this.sp(GAP[0] + Math.random() * (GAP[1] - GAP[0])) * (B.phase === 2 ? 0.7 : 1);
      }
    }
    return out;
  }

  /** Players' attacks against the boss's hurt regions (MatchScene calls this with every attack hitbox). */
  strikeTargets(match, hbs) {
    const B = this.boss; if (!B || B.dying || match.over) return;
    const regions = this.hurt();
    for (const hb of hbs) {
      if (!hb.owner || B.seen.has(hb.id)) continue;
      const r = regions.find((q) => hb.x1 < q.x2 && hb.x2 > q.x1 && hb.y1 < q.y2 && hb.y2 > q.y1);
      if (!r) continue;
      B.seen.add(hb.id);
      const o = hb.owner, d = Math.max(1, (hb.h.dmg || 3) * (o.dmgMult || 1) * r.mult);
      B.hp = Math.max(0, B.hp - d); B.flash = FLASH;
      o.stats.damageDealt += d;
      if (!hb.projectile && !hb.soul && o.hitstop < HITSTOP) o.hitstop = HITSTOP;
      const x = (Math.max(hb.x1, r.x1) + Math.min(hb.x2, r.x2)) / 2, y = (Math.max(hb.y1, r.y1) + Math.min(hb.y2, r.y2)) / 2;
      match.puff(x, y, 0xffffff, 6); match.puff(x, y, r.mult > 1 ? 0xffd040 : this.sparkColor || 0xffa040, 4 + Math.round(d / 3));
      if (r.mult > 1) match.particles.push({ shape: 'ring', x, y, vx: 0, vy: 0, life: 12, maxLife: 12, color: 0xffd040, grav: 0, r: 4, dr: 3 });
      sfx(r.mult >= 1 ? 'hit' : 'clang', 0.6, (r.mult >= 1 ? 0.8 : 1.2) + Math.random() * 0.2);
      if (this.onHurt) this.onHurt(match, r, d);
      if (B.hp <= 0) { this.startDeath(match); break; }
    }
    if (B.seen.size > 3000) B.seen.clear();
  }

  /** Health gone: the death begins, the boss stops attacking and its hazards stop, and the match ends in a win. */
  startDeath(match) {
    const B = this.boss; B.dying = 1; B.atk = null; this.hazardsOn = false;
    match.bossDefeated();
    sfx('ko', 1, 0.6); sfx('roar', 1, 0.6); match.shake(16, 60);
    if (this.onDeath) this.onDeath(match);
  }
  /** The death: explosions all over the boss, a white flash at the end. */
  stepDeath(match) {
    const B = this.boss, c = this.core();
    if (B.dying < DEATH && B.dying % 7 === 0) {
      const x = c.x + (Math.random() - 0.5) * (this.bodyW || 160), y = c.y + (Math.random() - 0.5) * (this.bodyH || 140);
      for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4; match.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 20 + Math.random() * 20, color: [0xffffff, 0xffd040, 0xff7a20, this.sparkColor || 0xff4020][i % 4], size: 3, drag: 0.92, grav: 0.05 }); }
      match.particles.push({ shape: 'ring', x, y, vx: 0, vy: 0, life: 16, maxLife: 16, color: 0xffe080, grav: 0, r: 6, dr: 4 });
      sfx('bighit', 0.6, 0.7 + Math.random() * 0.4); match.shake(6, 6);
    }
  }
  /** How far into the death (0..1), for the arena's drawing (sinking, fading...). */
  deathK() { return this.boss && this.boss.dying ? Math.min(1, this.boss.dying / DEATH) : 0; }

  /** The health bar (UI layer): a slanted frame, the chip, the health (red when enraged), and a tick at half. */
  drawBar() {
    const B = this.boss, g = this.barG; if (!B) return;
    g.clear();
    const { x, y, w, h } = BAR, k = B.hp / B.max, kc = B.chip / B.max;
    g.fillStyle(0x07060e, 0.85); g.fillRect(x - 4, y - 3, w + 8, h + 6);
    g.fillStyle(0x2a2436, 1); g.fillRect(x, y, w, h);
    g.fillStyle(0xffffff, 0.85); g.fillRect(x, y, Math.round(w * kc), h);
    const col = B.phase === 2 ? 0xff3a3a : this.boss.cfg.boss.color;
    g.fillStyle(col, 1); g.fillRect(x, y, Math.round(w * k), h);
    g.fillStyle(0xffffff, 0.35); g.fillRect(x, y, Math.round(w * k), 2);
    g.fillStyle(0x07060e, 1); g.fillRect(x + w / 2 - 1, y, 2, h);
    if (B.flash) { g.fillStyle(0xffffff, 0.5 * B.flash / FLASH); g.fillRect(x, y, Math.round(w * k), h); }
  }
}
