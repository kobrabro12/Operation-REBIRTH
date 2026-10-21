// Fighter methods: Grabs, holding and throws.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';
import { newAttackId } from './attackIds.js';
import { LIMIT_MAX } from '../config.js';

export class FighterGrab {

  // ---- grab and throw
  onGrab(target) {
    this.grabbed = target; target.grabbedBy = this;
    target.setState('grabbed'); target.vx = target.vy = target.lx = target.ly = 0;
    this.setState('holding'); sfx('shield', 0.6, 0.7); this.quip('grab');
  }
  st_holding(c) {
    const t = this.grabbed;
    if (!t || !t.alive) { this.grabbed = null; this.setState('idle'); return; }
    t.x = this.x + this.facing * 26; t.y = this.y;
    if (this.pummelCd > 0) this.pummelCd--;
    let dir = null;
    if (this.t > 6) {
      if (c.up) dir = 'up'; else if (c.down) dir = 'down';
      else if (Math.abs(c.x) > 0.5) dir = Math.sign(c.x) === this.facing ? 'forward' : 'back';
      else if (this.buffer.grab) dir = 'forward';
      else if (this.buffer.attack && !(this.pummelCd > 0)) { this.buffer.attack = 0; this.pummel(t); }   // attack with no direction: a quick knee / jab
    }
    if (this.t > 50) dir = 'forward';
    if (dir) {
      const th = this.def.moves.throws[dir];
      t.grabbedBy = null; this.grabbed = null;
      this.match.applyHit(t, { h: th, owner: this, facing: this.facing, id: newAttackId() }, this.x);
      this.setState('attack'); this.move = { frames: 18 }; this.moveName = 'throw'; this.throwDir = dir; this.attackId = newAttackId();
      this.quip('throw');
    }
  }
  st_grabbed(c) {
    // mash any button (or wiggle) to break free sooner; the higher your damage, the longer it takes
    let mash = 0;
    for (const b of ['jump', 'attack', 'special', 'shield', 'grab']) if (c.pressed(b)) mash++;
    if (c.tappedSide() || c.tappedDown()) mash++;
    if (mash) { this.t += mash * Math.max(2, 5 - Math.floor(this.percent / 60)); if (this.grabbedBy) this.match.puff(this.x, this.y - 30, 0xffffff, 1); }
    if (!this.grabbedBy || this.t > 60) {
      const h = this.grabbedBy;
      if (h && h.grabbed === this) {                    // broke free: both pushed apart
        h.grabbed = null; h.setState('idle'); h.lx = -h.facing * 2.2;
        this.lx = h.facing * 2.6; sfx('dodge', 0.5, 1.2); this.match.popText(this, 'ESCAPED!', '#9ad8f0');
      }
      this.grabbedBy = null; this.setState('idle');
    }
  }
  // a pummel while holding someone: 2%, no knockback, at most one every 12 frames
  pummel(t) {
    const m = this.match, dmg = 2;
    if (m.mode === 'stamina') t.hp -= dmg; else t.percent = Math.min(999, t.percent + dmg);
    if (t.state !== 'limit') t.limit = Math.min(LIMIT_MAX, t.limit + dmg);
    t.stats.damageTaken += dmg; this.stats.damageDealt += dmg;
    t.flash = 3; t.hitstop = this.hitstop = 4; this.pummelCd = 12;
    m.puff(t.x - this.facing * 6, t.y - t.body.h * 0.6, 0xffffff, 3);
    m.skinHitFx(this, t.x, t.y - t.body.h * 0.6, 1, this.facing, dmg);
    sfx('hit', 0.45, 1.35 + Math.random() * 0.15);
    if (m.mode === 'stamina' && t.hp <= 0) { t.hp = 0; this.grabbed = null; t.grabbedBy = null; if (t.def.sheets.death) t.startDying(); else m.onKO(t); this.setState('idle'); }
  }
}
