// Shared timing for stage hazards: one hazard at a time, every `gap` frames or so, each announced
// first by a flashing CAUTION banner at the top of the screen (the way Neon Arcade does it).
// A stage keeps a HazardCycle and calls run(match, out) from step(); for each kind it lists, the stage
// provides start_<kind>(match, h) - which sets h.title - and step_<kind>(match, h, out), which pushes
// hitboxes into `out` and returns true when that hazard is over.
import { sfx } from '../audio/sfx.js';
import { FONT } from '../config.js';

export class HazardCycle {
  constructor(stage, kinds, { gap = 600, jitter = 240, first = 420, color = '#ffd23f', stroke = '#0a0418', warnFrames = 90 } = {}) {
    this.stage = stage; this.kinds = kinds; this.gap = gap; this.jitter = jitter; this.warnFrames = warnFrames;
    this.next = first + Math.floor(Math.random() * jitter); this.hz = null; this.last = null; this.uid = 0;
    this.style = { color, stroke };
  }
  // the banner lives on the HUD camera; call from the stage's draw()
  makeBanner(scene) {
    this.banner = scene.add.text(320, 76, '', { fontFamily: FONT, fontSize: '12px', color: this.style.color, stroke: this.style.stroke, strokeThickness: 5, align: 'center', lineSpacing: 4 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(40).setVisible(false);
    scene.addUI(this.banner);
  }
  run(match, out) {
    if (this.banner) this.banner.setVisible(false);
    if (!this.stage.hazardsOn) { this.hz = null; return out; }
    if (!this.hz) {
      if (--this.next > 0) return out;
      const kinds = this.kinds.filter((k) => k !== this.last || this.kinds.length === 1);
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      this.last = kind; this.hz = { kind, t: 0, id: ++this.uid };
      this.stage['start_' + kind](match, this.hz);
      sfx('warn', 0.7);
    }
    const h = this.hz; h.t++;
    if (h.t < this.warnFrames && this.banner) {
      this.banner.setText('CAUTION!\n' + h.title).setVisible(h.t % 16 < 11);
      if (h.t % 30 === 0) sfx('warn', 0.5);
    }
    if (this.stage['step_' + h.kind](match, h, out)) { this.hz = null; this.next = this.gap + Math.floor(Math.random() * this.jitter); }
    return out;
  }
}
