// Fighter methods: Grabs, holding and throws.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';
import { newAttackId } from './attackIds.js';

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
    let dir = null;
    if (this.t > 6) {
      if (c.up) dir = 'up'; else if (c.down) dir = 'down';
      else if (Math.abs(c.x) > 0.5) dir = Math.sign(c.x) === this.facing ? 'forward' : 'back';
      else if (this.buffer.attack || this.buffer.grab) dir = 'forward';
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
  st_grabbed() {
    if (!this.grabbedBy || this.t > 60) { this.grabbedBy = null; this.setState('idle'); }
  }
}
