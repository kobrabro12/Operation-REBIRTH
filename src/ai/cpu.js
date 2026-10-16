// CPU player. It "presses buttons" on a Controller exactly like a human would, so the fighter
// code is shared. Difficulty changes reaction time, aggression, shielding and accuracy.
import { Controller } from '../input/controllers.js';
import { DIFFICULTY, LIMIT_MAX } from '../config.js';

export class CpuController extends Controller {
  constructor(match, level) {
    super();
    this.match = match; this.lv = DIFFICULTY[level];
    this.fighter = null;
    this.wait = 0;            // frames until the next decision
    this.plan = null;         // current intention
    this.shieldFor = 0; this.seenAttack = 0; this.holdSpecial = false;
  }
  tap(b) { this.cur[b] = !this.prev[b]; }   // press on one frame, release the next
  poll() {
    for (const b in this.cur) if (b !== 'special' || !this.holdSpecial) this.cur[b] = false;
    this.x = 0; this.y = 0;
    const me = this.fighter;
    if (!me || !me.alive || this.match.frozen) return;
    if (me.state === 'respawn') { if (Math.random() < 0.03) this.x = Math.random() < 0.5 ? -1 : 1; return; }
    if (me.state === 'charge') { this.cur.special = true; return; }
    this.holdSpecial = false;

    const P = this.match.stage.platforms[0];
    const offstage = !me.grounded && (me.x < P.x1 - 4 || me.x > P.x2 + 4 || me.y > P.y + 4);
    if (offstage) return this.recover(me, P);

    if (this.shieldFor > 0) { this.shieldFor--; this.cur.shield = true; return; }

    const tgt = this.pickTarget(me);
    if (!tgt) return;
    const dx = tgt.x - me.x, dy = tgt.y - me.y, adx = Math.abs(dx);
    const L = this.lv;

    // react to an incoming attack by shielding (after a human-like delay)
    if (tgt.state === 'attack' && tgt.attackId !== this.seenAttack && adx < 70 && Math.abs(dy) < 60 && me.grounded) {
      this.seenAttack = tgt.attackId;
      if (Math.random() < L.shieldChance) { this.shieldFor = 14 + Math.floor(Math.random() * 10); this.wait = Math.max(this.wait, 4); return; }
    }
    if (this.wait > 0) { this.wait--; this.continuePlan(me, tgt, dx, dy); return; }
    this.wait = L.react + Math.floor(Math.random() * L.react);

    // Limit when an opponent is level with the beam
    if (me.limit >= LIMIT_MAX && adx < 360 && Math.abs(dy) < 40) { this.tap('limit'); return; }

    const M = me.def.moves;
    // Soul Summoner: summon souls from a distance
    me.souls = me.souls.filter((s) => s.alive);
    if (M.summon && me.souls.length < 2 && me.summonCooldown <= 0 && adx > 90 && me.grounded && Math.random() < 0.18 * L.aggression) {
      this.y = 1; this.tap('special'); return;
    }
    // Mr Wake: drop a Shadow Pool when someone is close
    if (M.downB && adx < 60 && Math.abs(dy) < 30 && me.grounded && Math.random() < 0.12 * L.aggression) {
      this.y = 1; this.tap('special'); return;
    }
    // ranged zoning
    if (adx > 130 && Math.abs(dy) < 50 && Math.random() < 0.35) {
      if (M.fireball) {
        this.x = Math.sign(dx) * 0.6; this.tap('special'); this.holdSpecial = true;
        me.cpuChargeTarget = 10 + Math.floor(Math.random() * (adx > 260 ? 74 : 30));
      } else if (M.sideB && (Math.random() < 0.35 || me.facing !== Math.sign(dx))) {
        this.x = Math.sign(dx); this.tap('special');               // Drifting Soul
      } else {
        this.tap('special');                                       // Wake Bolt
      }
      return;
    }
    this.plan = adx < 52 && Math.abs(dy) < 56 ? 'attack' : 'approach';
    this.continuePlan(me, tgt, dx, dy, true);
  }

  continuePlan(me, tgt, dx, dy, fresh) {
    const adx = Math.abs(dx), L = this.lv;
    const P = this.match.stage.platforms[0];
    if (this.plan === 'approach' || !fresh) {
      if (adx > 34) this.x = Math.sign(dx);
      // don't walk off the island on purpose
      if (me.grounded && ((me.x < P.x1 + 16 && this.x < 0) || (me.x > P.x2 - 16 && this.x > 0))) this.x = 0;
      if (dy < -50 && me.grounded && Math.random() < 0.06) this.tap('jump');
      if (dy > 40 && me.grounded && me.platform && !me.platform.solid && Math.random() < 0.08) { this.y = 1; this.py = 0; }
      if (!me.grounded && dy > 30 && me.vy > 0) this.y = me.vy > 1 ? 1 : 0;
    }
    if (fresh && this.plan === 'attack' && Math.random() < 0.4 + 0.6 * L.aggression) {
      if (Math.random() > L.accuracy) { this.tap('attack'); return; }          // whiff sometimes
      if (Math.sign(dx) !== me.facing && me.grounded) { this.x = Math.sign(dx); return; }
      if (tgt.state === 'shield' && me.grounded) { this.tap('grab'); return; }
      if (dy < -34) { this.y = -1; this.tap('attack'); return; }
      if (me.grounded) {
        const r = Math.random();
        if (r < 0.45) { this.x = Math.sign(dx); this.tap('attack'); }
        else if (r < 0.7) this.tap('attack');
        else if (r < 0.85) { this.y = 1; this.tap('attack'); }
        else this.tap('grab');
      } else {
        if (dy > 20) this.y = 1; else if (Math.sign(dx) !== me.facing) this.x = Math.sign(dx);
        this.tap('attack');
      }
    }
  }

  recover(me, P) {
    const toward = me.x < 0 ? 1 : -1;
    this.x = toward;
    const below = me.y > P.y - 10;
    if (me.state === 'helpless' || me.state === 'hitstun') return;
    if (below || me.vy > 1) {
      if (me.jumpsLeft > 0 && me.vy > -1) { this.tap('jump'); return; }
      if (!me.usedUpB && me.y > -20 && me.vy > 0) { this.y = -1; this.tap('special'); }
    }
  }

  pickTarget(me) {
    let best = null, bd = 1e9;
    for (const f of this.match.fighters) {
      if (f === me || !f.alive || f.team === me.team || f.state === 'respawn') continue;
      const d = Math.abs(f.x - me.x) + Math.abs(f.y - me.y) * 1.5;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
}
