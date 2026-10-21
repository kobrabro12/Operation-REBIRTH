// Fighter methods: Limit supers (O): starting one and the beam Limit. Fighter-specific cutscenes are in limit*.js.
// Mixed into the Fighter class (Fighter.js) - `this` is the fighter.

export class FighterLimit {

  // ---- Limit
  startLimit() {
    this.limit = 0; this.limitReadyShown = false; this.quip('limit');
    // AERO with two computers out: FULL AERO instead of his usual Limit
    this.altLimit = !!(this.def.altLimit && !(this.fullAero > 0) && this.match.pcsOf(this).length >= 2);
    this.limitName = this.altLimit ? this.def.altLimit.name : null;
    this.setState('limit'); this.vx = this.vy = 0; this.lx = this.ly = 0;
    this.match.startLimit(this);
  }
  st_limit() {
    if (this.altLimit) return this.fullAeroLimit(this.def.altLimit || this.baseDef.altLimit);
    const L = this.def.limit;
    if (L.type === 'blade') return this.bladeLimit(L);
    if (L.type === 'undertow') return this.undertowLimit(L);
    if (L.type === 'mosh') return this.moshLimit(L);
    if (L.type === 'screensaver') return this.screensaverLimit(L);
    this.vy = this.grounded ? 0 : Math.max(-1.2, this.vy - 0.2);
    L.hits.forEach((h, i) => { if (h.at === this.t) this.match.limitHit(this, i); });
    if (this.t >= L.beamStart && this.t <= L.beamEnd && this.t % 2 === 0) {
      this.match.puff(this.x + this.facing * this.def.handOffset.x, this.y + this.def.handOffset.y, this.t % 4 ? this.fxColor : 0xf0f2f3, 2);
    }
    if (this.t >= L.frames) { this.invincible = 30; this.setState(this.grounded ? 'idle' : 'air'); }
  }
}
