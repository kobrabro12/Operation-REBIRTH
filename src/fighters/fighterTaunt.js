// Fighter methods: the TAUNT (1 key / a stick click): a little dance or a show of power, with its own line,
// sounds and particles (def.taunt). Mixed into the Fighter class (Fighter.js) - `this` is the fighter.
import { sfx } from '../audio/sfx.js';
import { voiceLine } from '../audio/voiceLines.js';
import { stat } from '../achievements.js';

export class FighterTaunt {
  // TAUNT (the 1 key): a little dance or a show of power. It can't be cancelled - taunting is a risk.
  st_taunt(c) {
    const T = this.def.taunt;
    if (!this.grounded) { this.setState('air'); return; }
    const lines = (this.vfx && this.vfx.wow && this.vfx.wow.taunt) || T.lines;   // a costume can have its own taunt lines
    if (this.t === 1 && lines) this.say(lines[Math.floor(Math.random() * lines.length)], 70, this.vfx && this.vfx.wow ? null : 'taunt');
    if (this.t === 1) { voiceLine(this.match, this.def.id, 'taunt'); if (!this.isCpu && !this.match.isTraining && !this.match.demo) stat('taunts'); }   // Mason's voice line for it, if he made one
    for (const [at, name, vol, rate] of T.sounds || []) if (this.t === at) sfx(name, vol, rate);
    for (const f of T.fx || []) if (this.t >= f.from && this.t <= f.to && (this.t - f.from) % f.every === 0) this.tauntFx(f);
    if (this.t >= T.frames) this.setState('idle');
  }
  tauntFx(f) {
    const R = Math.random, P = this.match.particles, cols = f.colors || [this.fxColor, 0xffffff];
    const x = this.x + this.facing * (f.x || 0), y = this.y + (f.y || -40);
    for (let i = 0; i < (f.n || 2); i++) {
      const color = cols[i % cols.length];
      if (f.kind === 'wisp') P.push({ shape: 'wisp', x: x + (R() - 0.5) * 16, y, vx: (R() - 0.5) * 1.2, vy: -0.8 - R() * 1.4, life: 30 + R() * 20, color, grav: -0.01, sway: R() * 6, size: 2 });
      else if (f.kind === 'note') { const a = -Math.PI / 2 + (R() - 0.5) * 2.2, sp = 1 + R() * 1.6; P.push({ shape: 'note', x: x + (R() - 0.5) * 12, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 34 + R() * 14, color, grav: -0.01, drag: 0.95, sway: R() * 6, size: 2 }); }
      else if (f.kind === 'bubble') P.push({ shape: 'bubble', x: x + (R() - 0.5) * 30, y: y + (R() - 0.5) * 20, vx: (R() - 0.5) * 0.8, vy: -0.5 - R(), life: 36 + R() * 20, color, grav: -0.015, r: 1 + Math.floor(R() * 3), sway: R() * 6, size: 2 });
      else if (f.kind === 'star') { const a = R() * Math.PI * 2, sp = 0.6 + R() * 1.8; P.push({ shape: 'star', x: x + (R() - 0.5) * 8, y: y + (R() - 0.5) * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, life: 22 + R() * 14, color, grav: 0.02, drag: 0.94, size: 2 }); }
    }
  }
}
