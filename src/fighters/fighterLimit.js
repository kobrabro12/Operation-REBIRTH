import {stepFistsLimit} from './fistsAnimation.js';
import { SpiritualSkeleton } from './spiritualSkeleton.js';
import { GladiatorSkeleton } from './gladiatorSkeleton.js';
// Fighter methods: Limit supers (O): starting one and the beam Limit. Fighter-specific cutscenes are in limit*.js.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { voiceLine } from '../audio/voiceLines.js';
import { stat } from '../achievements.js';

export class FighterLimit {

  // ---- Limit
  startLimit() {
    if (this.def.limit.groundOnly && !this.grounded) {
      if (this.match.frame - (this.groundLimitNotice ?? -100) >= 90) {
        this.match.popText(this, 'GROUND ONLY', '#ffd34f'); this.groundLimitNotice = this.match.frame;
      }
      return false;
    }
    if (this.def.limit.type === 'spirits') this.spiritGround = this.platform || this.match.stage.platforms[0];
    this.match.challengeEvent(this, 'limit');
    this.limit = 0; this.limitReadyShown = false; this.quip('limit'); voiceLine(this.match, this.def.id, 'limit'); if (!this.isCpu && !this.match.isTraining && !this.match.demo) stat('limits');
    // AERO with two computers out: FULL AERO instead of his usual Limit
    this.altLimit = !!(this.def.altLimit && !(this.fullAero > 0) && this.match.pcsOf(this).length >= 2);
    this.limitName = this.altLimit ? this.def.altLimit.name : null;
    this.setState('limit'); this.vx = this.vy = 0; this.lx = this.ly = 0;
    this.match.startLimit(this);
    return true;
  }
  st_limit() {
    if(this.def.limit.type==='fistsRush')return stepFistsLimit(this);
    if (this.def.limit.type === 'spirits') {
      const L = this.def.limit, elapsed = this.t - L.summonAt;
      if (elapsed >= 0 && elapsed % L.spawnEvery === 0 && elapsed / L.spawnEvery < L.count) {
        const index = elapsed / L.spawnEvery;
        this.match.projectiles.push(index === L.count - 1 ? new GladiatorSkeleton(this.match, this, index) : new SpiritualSkeleton(this.match, this, index));
      }
      if (this.t < L.summonAt + L.count * L.spawnEvery && this.t % 5 === 0) this.match.puff(this.x, this.y - 54, this.pal.light, 3);
      if (this.t >= L.frames) { this.invincible = 20; this.setState(this.grounded ? 'idle' : 'air'); }
      return;
    }
    if (this.altLimit) return this.fullAeroLimit(this.def.altLimit || this.baseDef.altLimit);
    const L = this.def.limit;
    if(L.triangle)return this.triangleLimit(L);
    if (L.type === 'blade') return this.bladeLimit(L);
    if (L.type === 'undertow') return this.undertowLimit(L);
    if (L.type === 'wall') return this.wallLimit(L);
    if (L.type === 'turn') return this.turnLimit(L);
    if (L.type === 'tide') return this.tideLimit(L);             // THE DEVOTED: BLACK TIDE
    if (L.type === 'approach') return this.approachLimit(L);
    if (L.type === 'birthday') return this.birthdayLimit(L);
    if (L.type === 'barrage') return this.barrageLimit(L);
    if (L.type === 'screensaver') return this.screensaverLimit(L);
    if (L.type === 'level0') return this.level0Limit(L);
    this.vy = this.grounded ? 0 : Math.max(-1.2, this.vy - 0.2);
    L.hits.forEach((h, i) => { if (h.at === this.t) this.match.limitHit(this, i); });
    if (this.t >= L.beamStart && this.t <= L.beamEnd && this.t % 2 === 0) {
      this.match.puff(this.x + this.facing * this.def.handOffset.x, this.y + this.def.handOffset.y, this.t % 4 ? this.fxColor : 0xf0f2f3, 2);
    }
    if (this.t >= L.frames) { this.invincible = 30; this.setState(this.grounded ? 'idle' : 'air'); }
  }
}
