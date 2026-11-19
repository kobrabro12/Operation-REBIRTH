// The `def.show` hooks (Fighter.step -> showTick, MatchScene.applyHit -> showBonus / showLanded, fighterRender ->
// drawShow). They were built for the two showmen test fighters (THE GREAT PRESTO and CHEF ROUX, since removed); now
// only GNASH (`show.kind: 'gnash'`) rides them - each hook just forwards to his code in fighterGnash.js. Mixed into the
// Fighter class (Fighter.js) - `this` is the fighter.

/** The `def.show` hooks, forwarding to the fighter's own code (methods attached to Fighter). */
export class FighterShow {
  /** Every frame (from Fighter.step). */
  showTick() { if (this.def.show.kind === 'gnash') this.gnashTick(); }
  /** How much harder this hit lands (null: as normal) - from MatchScene.applyHit. */
  showBonus(t, hb) { return this.def.show.kind === 'gnash' ? this.gnashBonus(t, hb) : null; }
  /** A hit landed (from MatchScene.applyHit). */
  showLanded(t, hb) { if (this.def.show.kind === 'gnash') this.gnashLanded(t, hb); }
  /** Everything drawn round the fighter (from fighterRender). */
  drawShow(g, spr) { if (this.def.show.kind === 'gnash') this.drawGnash(g, spr); }
}
