// BOSS ARENAS: the shared machinery of a boss fight (Trinkets > BOSS FIGHTS; the bosses and their rewards are in
// src/data/bosses.js). A boss arena is an ordinary stage (platforms, art, a HazardCycle) whose class extends
// BossArena; in a boss fight MatchScene calls startBoss() and the arena runs its boss as well as its hazards.
// Out of a boss fight (the arena opened for VS by a HARD win) there's no boss: just the stage and its hazards.
//
// The boss isn't a Fighter. It's drawn and moved by its arena, has health instead of a %, and:
//   - is hit by the players' attacks through strikeTargets (MatchScene hands it every attack hitbox): each region
//     in hurt() takes the hit's damage x its `mult` (weak points more, armour less; 0 = can't be hurt: a clang), once per hit;
//   - attacks with hazard hitboxes (unblockable - dodge them) that its arena pushes from atk_<name>(match, a, out),
//     each strike with its own id; how hard they hit scales with the difficulty (TIERS in bosses.js);
//   - picks its next attack from pattern() after a pause (shorter on higher difficulties), and turns ENRAGED at half
//     health (onRage; pattern sees phase 2);
//   - shows a health bar with its name at the top of the screen, and when its health runs out plays its death
//     (onDeath / the explosions here) and the match ends in a win (MatchScene.bossDefeated).
// For the CPU (the sim) it offers match.bossProxy: something to walk to and swing at.
// THE INTRO (startIntro / introStep, run by MatchScene before the 3-2-1), in letterbox: a WIDE establishing shot of
// the arena, the boss's ENTRANCE (the arena's introPose(match, k, t, n) with its own camera shots, introShot(k)), then
// a FREEZE FRAME on its pose - a flash, the camera punching in (introAt) and pushing slowly, its name wiping on over a
// line with its title (BOSSES `title`) under it. A fresh J / Enter / A / click skips it.
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
// the intro: frames of entrance, then of the freeze frame; how far the camera pushes in on the pose
const INTRO = { wide: 90, enter: 220, freeze: 170, zoom: 1.2 };
/** A point along the way from a to b (k = 0..1). */
const lerp = (a, b, k) => a + (b - a) * k;
/** A boss's number in the roman order of BOSS FIGHTS (I, II, III, IV). */
const BOSS_ORDER = (id) => ['I', 'II', 'III', 'IV', 'V', 'VI'][Math.max(0, ['colossus', 'polygon', 'demon', 'knight', 'machine', 'hum'].indexOf(id))];

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

  /** Starts the intro (MatchScene, a real player's boss fight): the letterbox, the name card's pieces (hidden), the camera. */
  startIntro(match) {
    const s = match, B = this.boss.cfg.boss, hex = '#' + B.color.toString(16).padStart(6, '0');
    this.intro = { t: 0 };
    this.introG = s.add.graphics().setDepth(40);
    const T = (str, size, color, o = {}) => s.add.text(0, 0, str, { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#07060e', strokeThickness: Math.round(size / 4), ...o }).setOrigin(0.5).setDepth(41).setVisible(false);
    const card = (this.introCard && this.introCard()) || { name: B.short || B.name, title: B.title || '' };   // (an arena can retitle its boss)
    this.introGlow = T(card.name, 30, hex, { strokeThickness: 12 }).setAlpha(0.35);
    this.introName = T(card.name, 30, '#ffffff');
    this.introSub = T(card.title, 8, hex).setLetterSpacing(3);
    const n = BOSS_ORDER(B.id);
    this.introTag = T('-  BOSS ' + n + '  -', 7, '#ffffff').setLetterSpacing(4);
    this.introTier = T(this.boss.cfg.T.name, 6, '#' + this.boss.cfg.T.color.toString(16).padStart(6, '0')).setLetterSpacing(3);
    this.introParts = [this.introG, this.introGlow, this.introName, this.introSub, this.introTag, this.introTier];
    s.addUI(...this.introParts);
    this.barG.setVisible(false); this.barName.setVisible(false); this.barTier.setVisible(false);
    this.icam = null;
  }
  /** How many frames the entrance lasts (an arena can make it longer with `introEnter`, e.g. for a cutscene). */
  enterLen() { return this.introEnter || INTRO.enter; }
  /** Which phase of the intro, and how far into it: { ph: 'wide' | 'enter' | 'freeze', f (frames into it), k (0..1) }. */
  introPhase() {
    const t = this.intro.t, E = this.enterLen();
    if (t <= INTRO.wide) return { ph: 'wide', f: t, k: t / INTRO.wide };
    if (t <= INTRO.wide + E) return { ph: 'enter', f: t - INTRO.wide, k: (t - INTRO.wide) / E };
    return { ph: 'freeze', f: t - INTRO.wide - E, k: (t - INTRO.wide - E) / INTRO.freeze };
  }
  /**
   * One frame of the intro. WIDE: an establishing shot drifting across the empty arena (the boss not there yet).
   * ENTER: the arena's introPose(match, k, t, n) (k = 0..1, t = frame, n = INTRO.enter frames) with its camera shots
   * (introShot(k)). FREEZE: everything stops on the pose and the name card comes in. Returns true when it's over.
   */
  introStep(match) {
    const I = this.intro; if (!I) return true;
    I.t++;
    const P = this.introPhase();
    if (P.ph === 'wide') { if (P.f === 1) this.introPose(match, 0, 0, this.enterLen()); }
    else if (P.ph === 'enter') this.introPose(match, P.k, P.f, this.enterLen());
    else if (P.f === 1) { sfx('bighit', 0.9, 0.55); sfx('shing', 0.8, 0.6); }
    this.drawIntro(P);
    if (P.ph === 'freeze' && P.f >= INTRO.freeze) { this.endIntro(); return true; }
    return false;
  }
  /** Skips the rest of the intro (a fresh J / Enter / A / click): straight to its pose and the countdown. */
  skipIntro(match) { if (!this.intro) return; if (this.intro.t < INTRO.wide + this.enterLen()) this.introPose(match, 1, this.enterLen(), this.enterLen()); this.endIntro(); }
  /** The intro is over: the letterbox and the card fade away, the health bar comes in, the camera eases back into play. */
  endIntro() {
    this.intro = null; this.icam = null;
    this.match.tweens.add({ targets: this.introParts.filter((o) => o.visible), alpha: 0, duration: 420, onComplete: () => this.introParts.forEach((o) => o.setVisible(false)) });
    for (const o of [this.barG, this.barName, this.barTier]) { o.setVisible(true).setAlpha(0); this.match.tweens.add({ targets: o, alpha: 1, duration: 500, delay: 200 }); }
  }
  /**
   * The intro's camera (null once it's over), moved exactly (MatchScene doesn't smooth it): WIDE drifts across the
   * arena; ENTER follows the arena's introShot(k) (default: framing the boss), eased toward it so cuts glide; FREEZE
   * punches in on the pose (the arena's introAt) and then pushes in slowly.
   */
  introCam() {
    if (!this.intro) return null;
    const P = this.introPhase(), c = this.core(), ease = (q) => 1 - Math.pow(1 - q, 3);
    let want;
    if (P.ph === 'wide') { const k = ease(P.k); want = { x: -170 + 150 * k, y: -120 + 20 * k, zoom: 0.92 - 0.06 * k }; }
    else if (P.ph === 'enter') want = this.introShot ? this.introShot(P.k) : { x: c.x, y: c.y + 20, zoom: 1.0 };
    else {
      const at = this.introAt ? this.introAt() : { x: c.x, y: c.y + 10, zoom: INTRO.zoom }, punch = ease(Math.min(1, P.f / 14)), push = P.f / INTRO.freeze;
      const from = this.icamFreeze || (this.icamFreeze = { ...(this.icam || at) });
      this.icam = { x: lerp(from.x, at.x, punch) + push * 8, y: lerp(from.y, at.y, punch), zoom: lerp(from.zoom, at.zoom, punch) + push * 0.07 };
      return { ...this.icam, exact: true };
    }
    this.icamFreeze = null;
    if (!this.icam) this.icam = { ...want };
    const k = P.ph === 'wide' ? 1 : 0.07;                                               // (shots glide into each other)
    this.icam = { x: lerp(this.icam.x, want.x, k), y: lerp(this.icam.y, want.y, k), zoom: lerp(this.icam.zoom, want.zoom, k) };
    return { ...this.icam, exact: true };
  }
  /**
   * The intro's overlay. Always: letterbox bars (thin, thicker on the freeze) and a soft vignette. FREEZE: a quick
   * flash, the screen tinted toward the boss's colour, a dark band under the title, a thin line drawing out from the
   * middle, the name wiping on (with a glow behind it and a shine sweeping across), the title fading up under it,
   * "BOSS N" and the difficulty in the bars.
   */
  drawIntro(P) {
    const g = this.introG, B = this.boss.cfg.boss, W = VIEW_W, H = 360, ease = (q) => 1 - Math.pow(1 - Math.min(1, Math.max(0, q)), 3);
    const fz = P.ph === 'freeze', f = fz ? P.f : 0;
    g.clear();
    const bar = 22 * ease(this.intro.t / 24) + (fz ? 22 * ease(f / 16) : 0);
    for (let i = 0; i < 6; i++) { g.fillStyle(0x000000, 0.08); g.fillRect(0, 0, W, bar + 30 - i * 5); g.fillRect(0, H - bar - 30 + i * 5, W, bar + 30 - i * 5); }   // soft edges
    g.fillStyle(0x000000, 1); g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
    if (!fz) { for (const o of this.introParts.slice(1)) o.setVisible(false); return; }
    g.fillStyle(B.color, 0.1 * ease(f / 10)); g.fillRect(0, bar, W, H - bar * 2);
    if (f < 9) { g.fillStyle(0xffffff, 0.55 * (1 - f / 9)); g.fillRect(0, 0, W, H); }
    const cy = 252, band = ease((f - 4) / 14);
    for (let i = 0; i < 10; i++) { g.fillStyle(0x000000, 0.07 * band); g.fillRect(0, cy - 34 + i * 3, W, 76 - i * 6); }
    const lw = (W / 2 - 40) * ease((f - 6) / 16);
    g.fillStyle(B.color, 1); g.fillRect(W / 2 - lw, cy + 18, lw * 2, 2); g.fillStyle(0xffffff, 0.8); g.fillRect(W / 2 - lw * 0.4, cy + 18, lw * 0.8, 1);
    const wipe = ease((f - 8) / 18), N = this.introName, Gl = this.introGlow;
    for (const t of [N, Gl]) { t.setVisible(f > 8).setPosition(W / 2, cy - 4 + (1 - wipe) * 4).setAlpha(t === Gl ? 0.35 : 1); t.setCrop(0, 0, t.width * wipe, t.height); }
    Gl.setScale(1 + 0.04 * Math.sin(f * 0.2));
    const sh = (f - 28) / 16;                                                            // a shine sweeping across the name
    if (sh > 0 && sh < 1) { const x = W / 2 - N.width / 2 - 20 + (N.width + 40) * sh; g.fillStyle(0xffffff, 0.5); g.fillPoints([{ x: x - 4, y: cy - 22 }, { x: x + 6, y: cy - 22 }, { x: x - 2, y: cy + 14 }, { x: x - 12, y: cy + 14 }], true); }
    const sub = ease((f - 22) / 14);
    this.introSub.setVisible(f > 22).setPosition(W / 2, cy + 32 - (1 - sub) * 6).setAlpha(sub);
    const tag = ease((f - 14) / 12);
    this.introTag.setVisible(f > 14).setPosition(W / 2, bar / 2).setAlpha(tag);
    this.introTier.setVisible(f > 20).setPosition(W / 2, H - bar / 2).setAlpha(ease((f - 20) / 12));
  }

  /** Frames scaled by the difficulty's speed (wind-ups and pauses get shorter on HARD / NIGHTMARE). */
  sp(n) { return Math.max(1, Math.round(n / (this.boss ? this.boss.cfg.T.speed : 1))); }
  /** Damage scaled by the difficulty. */
  dmg(n) { return Math.round(n * (this.boss ? this.boss.cfg.T.dmg : 1)); }
  /** A fresh id for one strike (each target is hit once per id). */
  sid(tag) { this.sidN = (this.sidN || 0) + 1; return 'boss-' + tag + '-' + this.sidN; }
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
    if (match.over) { if (B.gloat) { B.gloat++; this.rageText.setVisible(true); if (this.onGloat) this.onGloat(match, B.gloat); } return out; }
    if (B.phase === 1 && B.hp <= B.max * (this.rageAt || 0.5)) {           // half health (or the arena's rageAt): ENRAGED
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
      if (!r.mult) {                                                         // armour that can't be hurt: a clang and sparks, nothing more
        const o = hb.owner, x = (Math.max(hb.x1, r.x1) + Math.min(hb.x2, r.x2)) / 2, y = (Math.max(hb.y1, r.y1) + Math.min(hb.y2, r.y2)) / 2;
        if (!hb.projectile && o.hitstop < 2) o.hitstop = 2;
        match.puff(x, y, 0xd8e0e8, 4); sfx('clang', 0.5, 1.5 + Math.random() * 0.3);
        if (this.onArmor) this.onArmor(match, x, y, o);
        continue;
      }
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

  /**
   * You lost: the boss gloats - one of its `taunts` (BOSSES in bosses.js) in big letters over the arena, a laugh, and
   * the arena's own gloat (onGloat, called every frame after). Returns the line (BossReward shows it too).
   */
  bossTaunt(match) {
    const B = this.boss; if (!B || B.dying) return null;
    const list = this.taunts || B.cfg.boss.taunts || ['...'], line = list[Math.floor(Math.random() * list.length)];
    B.taunt = line; B.gloat = 1; B.atk = null;
    this.rageText.setText(line).setColor('#' + (this.tauntColor || B.cfg.boss.color).toString(16).padStart(6, '0')).setFontSize(11).setVisible(true).setWordWrapWidth(560).setAlign('center');
    B.rage = 0; sfx('laugh', 0.8, 0.8);
    return line;
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
    if (this.barStyle) this.barStyle(g, x, y, w, h, k);                   // (an arena can dress its bar up)
    g.fillStyle(0xffffff, 0.35); g.fillRect(x, y, Math.round(w * k), 2);
    g.fillStyle(0x07060e, 1); g.fillRect(x + w / 2 - 1, y, 2, h);
    if (B.flash) { g.fillStyle(0xffffff, 0.5 * B.flash / FLASH); g.fillRect(x, y, Math.round(w * k), h); }
  }
}
