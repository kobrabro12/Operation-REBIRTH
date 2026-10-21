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
    this.shieldFor = 0; this.seenAttack = 0; this.holdSpecial = false; this.smash = false; this.hopAttack = 0;
  }
  tap(b) { this.cur[b] = !this.prev[b]; }   // press on one frame, release the next
  poll() {
    for (const b in this.cur) if (b !== 'special' || !this.holdSpecial) this.cur[b] = false;
    this.x = 0; this.y = 0; this.smash = false;
    const me = this.fighter;
    if (!me || !me.alive || this.match.frozen) return;
    if (me.state === 'grabbed') { if (Math.random() < this.lv.mash * 1.5) this.tap(['attack', 'jump', 'shield'][Math.floor(Math.random() * 3)]); return; }
    if (me.state === 'holding') return this.throwPlan(me);
    if (me.state === 'respawn') { if (Math.random() < 0.03) this.x = Math.random() < 0.5 ? -1 : 1; return; }
    if (me.state === 'charge' || me.state === 'swingcharge') { this.cur.special = true; return; }
    if (me.state === 'channel') { if (me.t >= 8 + Math.floor(Math.random() * 10)) { const c = me.cpuChannel || 'up'; if (c === 'up') this.y = -1; else if (c === 'down') this.y = 1; else this.x = me.facing; } return; }   // WHAT ONCE WAS picks a channel
    this.holdSpecial = false;
    if (me.possessed > 0) { if (Math.random() < this.lv.mash) this.tap(['attack', 'jump', 'special', 'shield'][Math.floor(Math.random() * 4)]); return; }
    if (this.dodgeLimit(me)) return;

    if (me.state === 'ledge') return this.ledgeAction(me);
    const P = this.match.stage.platforms[0];
    const offstage = !me.grounded && (me.x < P.x1 - 4 || me.x > P.x2 + 4 || me.y > P.y + 4);
    if (offstage) return this.recover(me, P);

    if (this.shieldFor > 0) { this.shieldFor--; this.cur.shield = true; return; }

    const tgt = this.pickTarget(me);
    const canTaunt = me.grounded && me.state === 'idle' && me.def.taunt;
    if (!tgt) { if (canTaunt && Math.random() < 0.02) this.tap('taunt'); return; }   // nobody left to fight: show off
    if (canTaunt && tgt.state === 'respawn' && Math.abs(tgt.x - me.x) > 120 && Math.random() < 0.006) { this.tap('taunt'); return; }
    const dx = tgt.x - me.x, dy = tgt.y - me.y, adx = Math.abs(dx);
    const L = this.lv;

    // Void Orb out: set it off when an opponent drifts close to it
    const orb = me.voidOrb;
    if (orb && orb.alive && orb.phase === 'fly' && this.match.fighters.some((f) => f.alive && f.team !== me.team && Math.hypot(f.x - orb.x, f.y - 26 - orb.y) < 48) && Math.random() < 0.5 + L.accuracy * 0.5) {
      this.tap('special'); return;
    }
    // react to an incoming attack by shielding (after a human-like delay)
    if (tgt.state === 'attack' && tgt.attackId !== this.seenAttack && adx < 70 && Math.abs(dy) < 60 && me.grounded) {
      this.seenAttack = tgt.attackId;
      if (me.def.moves.counter && Math.random() < L.shieldChance * 0.8) { this.y = 1; this.tap('special'); return; }
      if (Math.random() < L.shieldChance) { this.shieldFor = 14 + Math.floor(Math.random() * 10); this.wait = Math.max(this.wait, 4); return; }
    }
    if (this.hopAttack > 0 && !me.grounded) {          // mid short hop: drift in and swing
      this.x = Math.sign(dx);
      if (--this.hopAttack === 0 || adx < 40) {         // forward air if they're ahead, back air if behind, neutral air on top of them
        this.hopAttack = 0; this.x = adx > 8 ? Math.sign(dx) : 0;
        if (dy > 26) { this.x = 0; this.y = 1; }
        this.tap('attack');
      }
      return;
    }
    if (this.wait > 0) { this.wait--; this.continuePlan(me, tgt, dx, dy); return; }
    this.wait = L.react + Math.floor(Math.random() * L.react);

    // AERO: with two computers out, his Limit is FULL AERO - go for it, ideally with someone close enough for the blast
    if (me.limit >= LIMIT_MAX && me.def.altLimit && !(me.fullAero > 0) && this.match.pcsOf(me).length >= 2) { if (adx < 150 || Math.random() < 0.05) this.tap('limit'); return; }
    if (me.limit >= LIMIT_MAX && me.def.altLimit && me.def.moves.downB.pc && this.match.pcsOf(me).length < 2 && me.grounded && Math.random() < 0.5) { this.y = 1; this.tap('special'); return; }   // set up for it first
    // Limit when an opponent is level with the beam
    if (me.limit >= LIMIT_MAX && adx < (me.def.limit.reach || 360) && Math.abs(dy) < (me.def.limit.reach ? 70 : 40)) { this.tap('limit'); return; }

    const M = me.def.moves;
    // Soul Summoner: summon souls from a distance
    me.souls = me.souls.filter((s) => s.alive);
    if (M.summon && me.souls.length < 2 && me.summonCooldown <= 0 && adx > 90 && me.grounded && Math.random() < 0.18 * L.aggression) {
      this.y = 1; this.tap('special'); return;
    }
    // Soul Hex: close range, and only on someone who isn't already hexed or immune
    if (M.sideB && (M.sideB.hits || []).some((h) => h.possess) && adx < 56 && Math.abs(dy) < 36 && !(tgt.possessImmune > 0) && !(tgt.possessed > 0) && Math.random() < 0.3 * L.aggression) {
      this.x = Math.sign(dx); this.tap('special'); return;
    }
    // Mr Wake: drop a Shadow Pool when someone is close
    if (M.downB && (M.downB.pool || M.downB.tag) && adx < 60 && Math.abs(dy) < 30 && me.grounded && Math.random() < 0.12 * L.aggression) {
      this.y = 1; this.tap('special'); return;
    }
    // Lacy's Grand Slam: a charged home-run swing up close
    if (M.neutralB && M.neutralB.charge && adx < 64 && Math.abs(dy) < 40 && me.grounded && Math.random() < 0.06 * L.aggression) {
      if (me.facing !== Math.sign(dx)) { this.x = Math.sign(dx); return; }
      this.tap('special'); this.holdSpecial = true;
      me.cpuChargeTarget = 8 + Math.floor(Math.random() * (Math.random() < 0.2 ? 170 : 50));   // usually quick, sometimes a big wind-up
      return;
    }
    // AERO: set computers down (two powers up FULL AERO); in FULL AERO, keep a CD storm going
    if (M.downB && M.downB.pc && me.grounded && this.match.pcsOf(me).length < 2 && adx > 80 && Math.random() < 0.1 * L.aggression) { this.y = 1; this.tap('special'); return; }
    if (M.downB && M.downB.cdcloud && !me.cdCloud && adx < 280 && Math.random() < 0.3) { this.y = 1; this.tap('special'); return; }
    // WHAT ONCE WAS: a full SIGNAL meter - open the CHANNEL menu and pick what fits the moment
    if (me.def.signal && me.signalFull() && (me.grounded || me.vy > -1) && Math.random() < 0.25) {
      me.cpuChannel = me.percent > 90 ? 'down' : tgt.percent > 70 && adx > 120 ? 'side' : 'up';
      this.tap('taunt'); return;
    }
    // WHAT ONCE WAS: put a door down away from the action; step back out of it when things get hot
    if (M.downB && M.downB.door && !me.wrongDoor() && me.grounded && adx > 100 && Math.random() < 0.08 * L.aggression) { this.y = 1; this.tap('special'); return; }
    if (M.downB && M.downB.door && me.wrongDoor() && adx < 50 && me.percent > 70 && Math.abs(me.wrongDoor().x - tgt.x) > 120 && Math.random() < 0.15) { this.y = 1; this.tap('special'); return; }
    // ranged zoning
    if (adx > 130 && Math.abs(dy) < 50 && Math.random() < 0.35) {
      if (M.sideB && M.sideB.fish) {                                   // AERO: Goldfish Fling, or a Bubble Trap
        if (me.facing !== Math.sign(dx)) { this.x = Math.sign(dx); return; }
        if (!me.fishOut && adx < 240 && Math.random() < 0.55) this.x = Math.sign(dx);
        this.tap('special'); return;
      }
      if (M.fireball) {
        if (me.facing !== Math.sign(dx)) { this.x = Math.sign(dx); return; }   // turn first: side+special is the Soul Hex
        this.tap('special'); this.holdSpecial = true;
        me.cpuChargeTarget = 10 + Math.floor(Math.random() * (adx > 260 ? 74 : 30));
      } else if (M.sideB && !(M.sideB.hits || []).some((h) => h.possess) && (Math.random() < 0.35 || me.facing !== Math.sign(dx))) {
        this.x = Math.sign(dx); this.tap('special');               // Drifting Soul
      } else if (!(M.neutralB && M.neutralB.charge)) {
        this.tap('special');                                       // Wake: Void Orb
      }
      return;
    }
    // close the gap with a short hop and an aerial now and then (harder CPUs more often)
    if (me.grounded && adx > 50 && adx < 110 && Math.abs(dy) < 40 && Math.random() < 0.18 * L.aggression) {
      if (me.facing !== Math.sign(dx)) this.x = Math.sign(dx);
      this.tap('jump'); this.hopAttack = 10 + Math.floor(Math.random() * 6); return;
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
        const r = Math.random(), M = me.def.moves;
        // finish them: a smash attack once they're damaged enough to fly (more often the higher they are)
        const killPct = tgt.percent > 85 && Math.random() < Math.min(0.75, (tgt.percent - 70) / 100 + L.aggression * 0.3);
        if (killPct && (M.fsmash || M.usmash || M.dsmash)) {
          this.smash = true;
          if (dy < -30 && M.usmash) { this.y = -1; this.tap('attack'); return; }
          if (M.fsmash && Math.random() < 0.6) { this.x = Math.sign(dx); this.tap('attack'); return; }
          if (M.dsmash) { this.y = 1; this.tap('attack'); return; }
        }
        if (r < 0.4) { this.x = Math.sign(dx); this.tap('attack'); }
        else if (r < 0.62) this.tap('attack');
        else if (r < 0.78) { this.y = 1; this.tap('attack'); }
        else if (r < 0.88 && tgt.percent > 40) { this.y = -1; this.tap('attack'); }
        else this.tap('grab');
      } else {
        if (dy > 20) this.y = 1; else if (Math.sign(dx) !== me.facing) this.x = Math.sign(dx);
        this.tap('attack');
      }
    }
  }

  // holding someone: a pummel or two, then a throw - toward the nearest edge, or up once they're high
  throwPlan(me) {
    const t = me.grabbed; if (!t) return;
    if (me.t < 8) return;
    if (me.t < 30 && Math.random() < 0.12 + this.lv.aggression * 0.1) { this.tap('attack'); return; }
    if (me.t < 22) return;
    const P = this.match.stage.platforms[0], edge = me.x > (P.x1 + P.x2) / 2 ? 1 : -1;
    if (t.percent > 110 && Math.random() < 0.5) { this.y = -1; return; }
    if (Math.abs(me.x - (edge > 0 ? P.x2 : P.x1)) < 160) { this.x = edge; return; }   // throw them out toward the edge
    this.x = Math.random() < 0.5 ? 1 : -1;
  }

  // a Limit is coming: jump clear of a flood or a beam, dodge the giant blade as it falls
  dodgeLimit(me) {
    const L = this.lv;
    for (const o of this.match.fighters) {
      if (o === me || !o.alive || o.team === me.team || o.state !== 'limit') continue;
      const lim = o.def.limit, adx = Math.abs(o.x - me.x);
      const key = o.slot + ':' + (o.age - o.t);            // one decision per Limit: do they see it coming?
      if (this.limitSeen !== key) { this.limitSeen = key; this.limitReact = Math.random() < 0.25 + L.shieldChance * 1.6; }
      if (!this.limitReact) return false;
      if (lim.type === 'undertow') {                    // stay off the floor until the flood drains
        const U = o.ult; if (!U || U.phase === 'cutscene') return false;
        if (me.grounded) { this.tap('jump'); this.x = Math.sign(me.x - o.x) || 1; return true; }
        if (me.vy > 0 && me.jumpsLeft > 0 && U.phase === 'flood') { this.tap('jump'); return true; }
        this.x = Math.sign(me.x - o.x) || 1; return true;
      }
      if (lim.type === 'screensaver') {                  // slow bubbles: jump over them and drift away
        if (o.t > lim.releaseAt - 6 && o.t < lim.releaseAt + 50) { if (me.grounded || (me.vy > 0 && me.jumpsLeft > 0)) this.tap('jump'); this.x = Math.sign(me.x - o.x) || 1; return true; }
        return false;
      }
      if (lim.type === 'level0') {                       // get out of reach before the lights go out
        if (o.t > lim.grabAt || adx > lim.reach + 30) return false;
        this.x = Math.sign(me.x - o.x) || 1;
        if (me.grounded && o.t > lim.grabAt - 20 && Math.random() < 0.3) this.tap('jump');
        return true;
      }
      if (lim.type === 'mosh') {                         // jump the mic-drop shockwave as it comes
        const until = o.t - lim.dropAt;
        if (until > -10 && until < 30 && me.grounded && Math.abs(me.y - o.y) < 6) { this.tap('jump'); return true; }
        return false;
      }
      if (lim.type === 'blade') {                       // the giant sword hangs raised, then falls: roll away or dodge as it drops
        if (adx > (lim.reach || 170) + 40) return false;
        const fall = lim.slashFrom - o.t;
        const away = Math.sign(me.x - o.x) || 1;
        if (!me.grounded) { if (fall <= 4 && fall >= -2) this.tap('shield'); else this.x = away; return true; }   // air dodge as it falls
        if (fall > 9) { this.x = away; return true; }                                                       // run
        if (fall > 5) { this.cur.shield = true; return true; }                                              // brace...
        if (fall >= -2) { this.cur.shield = true; this.x = me.state === 'shield' ? away : 0; return true; }  // ...and roll out under it
        return false;
      }
      // a beam at hand height: jump over it
      if (Math.abs(o.y - me.y) < 60 && o.t > lim.beamStart - 16 && o.t < (lim.beamEnd || 100)) { if (me.grounded || (me.vy > 0 && me.jumpsLeft > 0)) this.tap('jump'); this.x = Math.sign(me.x - o.x) || 1; return true; }
    }
    return false;
  }

  // hanging on a ledge: wait a moment, then pick a way back up (mixing it up so it isn't predictable)
  ledgeAction(me) {
    if (me.t === 1) { this.ledgeWait = 10 + Math.floor(Math.random() * 30); this.ledgePick = Math.random(); }
    if (me.t < this.ledgeWait) return;
    const toward = -me.ledge.side, r = this.ledgePick;
    if (r < 0.4) this.x = toward;                      // climb
    else if (r < 0.6) this.tap('jump');
    else if (r < 0.8) this.tap('shield');              // roll in
    else this.tap('attack');                           // climb with an attack
  }

  recover(me, P) {
    const toward = me.x < 0 ? 1 : -1;
    this.x = toward;
    const below = me.y > P.y - 10;
    if (me.state === 'helpless' || me.state === 'hitstun') return;
    const M = me.def.moves;
    if (M.downB && M.downB.door && me.wrongDoor() && me.state === 'air' && (below || Math.abs(me.x) > P.x2 + 60)) { this.x = 0; this.y = 1; this.tap('special'); return; }   // WHAT ONCE WAS: back out of its door
    if (M.sideB && M.sideB.noclip && !me.usedDive && me.state === 'air' && Math.abs(me.y - P.y) < 60 && Math.min(Math.abs(me.x - P.x1), Math.abs(me.x - P.x2)) > 70) { this.tap('special'); return; }   // ... or noclip back to the stage
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
