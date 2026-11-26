// The `def.show` hooks: a fighter with its own mechanics in its own mixin file names it with `show: { kind }`, and each
// hook calls that fighter's method by name if it has one (kind 'gnash' -> gnashTick, gnashBonus, gnashLanded,
// drawGnash, gnashSpecial, gnashStep, gnashHurt, drawGnashHud). From Fighter.step (showTick), Fighter.tryCommon
// (showSpecial), Fighter.st_attack (showStep, for moves with `show: true` or GNASH's `gnash`), MatchScene.applyHit
// (showBonus / showLanded / showHurt), fighterRender (drawShow) and hud.js (drawShowHud). Users: GNASH
// (fighterGnash.js), LUMEN (fighterLumen.js), VANTA (fighterVanta.js), KAMI (fighterKami.js). Mixed into the
// Fighter class (Fighter.js) - `this` is the fighter.

/** The `def.show` hooks, forwarding to the fighter's own code (methods attached to Fighter). */
export class FighterShow {
  /** That fighter's method `kind + Name` (or `prefix + Kind + suffix`), if it has one. */
  showFn(name, draw) { const k = this.def.show.kind; return this[draw ? 'draw' + k[0].toUpperCase() + k.slice(1) + name : k + name]; }
  /** Every frame (from Fighter.step). */
  showTick() { const f = this.showFn('Tick'); if (f) f.call(this); }
  /** How much harder this hit lands (null: as normal) - from MatchScene.applyHit. */
  showBonus(t, hb) { const f = this.showFn('Bonus'); return f ? f.call(this, t, hb) : null; }
  /** A hit landed (from MatchScene.applyHit). */
  showLanded(t, hb) { const f = this.showFn('Landed'); if (f) f.call(this, t, hb); }
  /** This fighter was hurt for dmg (from MatchScene.applyHit). */
  showHurt(dmg, hb) { const f = this.showFn('Hurt'); if (f) f.call(this, dmg, hb); }
  /** A special pressed: the fighter's own routing (undefined = the usual specials). */
  showSpecial(c) { const f = this.showFn('Special'); return f ? f.call(this, c) : undefined; }
  /** Every frame of one of its own moves (true = it handled the frame). */
  showStep(m, c) { const f = this.showFn('Step'); return f ? f.call(this, m, c) : false; }
  /** Everything drawn round the fighter (from fighterRender). */
  drawShow(g, spr) { const f = this.showFn('', true); if (f) f.call(this, g, spr); }
  /** Its meter on the player plate (from hud.js). */
  drawShowHud(g, x, y, frame) { const f = this.showFn('Hud', true); if (f) f.call(this, g, x, y, frame); }
}
