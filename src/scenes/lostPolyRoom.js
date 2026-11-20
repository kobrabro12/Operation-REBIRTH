// THE POLYGON ROOM: when he CLAPS (LostScene's `clap` animation) a burst of polygon shards and a shockwave fly off his
// hands, the room flashes lilac, and everything but him becomes a low-poly world of flat-shaded facets
// (tools/sprites/hanz_poly.py): a faceted dusk, a striped vapour sun, a checkerboard plain, pyramids (one with an eye),
// broken columns, a floating upside-down island, stairs of cubes to a door in the sky, a giant stone head sinking into
// the floor - and moving things: a moon in a ring of orbiting cubes, a polygon whale swimming across the sky, a spinning
// torus, and a gem with an eye hovering over his desk. His counter is rebuilt in facets (same place: THE DESK still
// works) with new things on it. He stays a PS1 man in the middle of it. Clap again and it all goes back.
import { VIEW_W, VIEW_H } from '../config.js';
import { LOST_POLY } from './lostPoly.js';
import { sfx } from '../audio/sfx.js';

const DIR = 'assets/shop/lost/';
// the clap: how many shards fly, their colours, gravity; the flash colour, how long it takes to switch (ms) and fade (ms)
const BURST = { n: 30, colors: [0xff7ab8, 0x2fd6c6, 0xffd447, 0x7adcff, 0xa04ae6, 0xfff3dc], gravity: 0.06, flash: 0xe8d8ff, swap: 90, fade: 480 };
// after the switch the things pop in: first delay and the gap between them (ms)
const POP = { first: 200, gap: 160 };
// frames each thing frame stays up; the whale's swim speed (px a frame); the gem's bob
const MOVE = { every: 6, whale: 0.25, bob: 2.5 };

/** The low-poly version of the LOST room, kept by LostScene (`this.poly`). */
export class PolyRoom {
  /** Queues the polygon room's pictures (LostScene.loadLazy). */
  static queue(scene) { for (const n of ['poly_room', 'poly_desk', 'poly_things']) if (!scene.textures.exists('lost_' + n)) scene.load.image('lost_' + n, DIR + n + '.png'); }

  /** True once its pictures have loaded. */
  static loaded(scene) { return ['poly_room', 'poly_desk', 'poly_things'].every((n) => scene.textures.exists('lost_' + n)); }

  /** Builds the layers (hidden): the world over the 3D room (depth 3.5+), the faceted desk over his counter (5.6). */
  constructor(scene) {
    this.scene = scene; this.on = false;
    const tex = scene.textures.get('lost_poly_things');
    for (const [n, t] of Object.entries(LOST_POLY.things)) for (let i = 0; i < t.n; i++) if (!tex.has(`${n}_${i}`)) tex.add(`${n}_${i}`, 0, i * t.w, t.sy, t.w, t.h);
    this.room = scene.add.image(0, 0, 'lost_poly_room').setOrigin(0).setDepth(3.5);
    this.things = Object.entries(LOST_POLY.things).map(([n, t], i) => ({
      n, t, i, s: scene.add.image(t.x + t.w / 2, t.y + t.h / 2, 'lost_poly_things', `${n}_0`).setDepth(n === 'gem' ? 5.8 : 3.7 + i * 0.01) }));
    this.desk = scene.add.image(0, 0, 'lost_poly_desk').setOrigin(0).setDepth(5.6);
    this.flash = scene.add.rectangle(0, 0, VIEW_W, VIEW_H, BURST.flash).setOrigin(0).setDepth(18).setAlpha(0);
    this.fx = scene.add.graphics().setDepth(8); this.shards = []; this.wave = null;
    this.setVisible(false);
  }

  /** Shows or hides every layer. */
  setVisible(v) { for (const o of [this.room, this.desk, ...this.things.map((t) => t.s)]) o.setVisible(v); }

  /** Turns it off at once with no clap (THE SNAP is turning the room hand-drawn instead). */
  forceOff() { this.on = false; this.setVisible(false); }

  /** THE CLAP at (x, y): shards of colour and a shockwave off his hands, a lilac flash, and the room switches - into the
   *  polygon world (its things popping in) or back. Returns whether it's now on. */
  clap(x, y) {
    const sc = this.scene;
    sfx('bighit', 0.7, 1.7); sfx('glass', 0.45, 1.3);
    for (let i = 0; i < BURST.n; i++) {
      const a = Math.random() * Math.PI * 2, v = 1.2 + Math.random() * 3.4;
      this.shards.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, r: 2 + Math.random() * 4, life: 0, max: 26 + Math.floor(Math.random() * 24), c: BURST.colors[i % BURST.colors.length] });
    }
    this.wave = { x, y, t: 0 };
    this.on = !this.on;
    sc.tweens.killTweensOf(this.flash); this.flash.setAlpha(0);
    sc.tweens.add({ targets: this.flash, alpha: 0.9, duration: BURST.swap, ease: 'Quad.easeIn',
      onComplete: () => { this.apply(); sc.tweens.add({ targets: this.flash, alpha: 0, duration: BURST.fade, ease: 'Quad.easeOut' }); } });
    return this.on;
  }

  /** Switches the layers over (under the flash). */
  apply() {
    const sc = this.scene, on = this.on;
    this.setVisible(on);
    sc.set3DRoom(!on);
    if (!on) return;
    for (const th of this.things) {
      th.s.setScale(0).setAlpha(0);
      sc.tweens.add({ targets: th.s, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut', delay: POP.first + th.i * POP.gap, onStart: () => sfx('ding', 0.2, 0.7 + th.i * 0.15) });
    }
  }

  /** Each frame: the things turn, the whale swims, the gem bobs; the clap's shards and shockwave fly. */
  step(t) {
    this.drawBurst();
    if (!this.on) return;
    const f = Math.floor(t / MOVE.every);
    for (const th of this.things) {
      const { n, t: d } = th;
      th.s.setFrame(`${n}_${f % d.n}`);
      if (n === 'whale') th.s.x = -d.w / 2 + ((d.x + d.w + t * MOVE.whale) % (VIEW_W + d.w));
      if (n === 'gem') th.s.y = d.y + d.h / 2 + Math.sin(t * 0.05) * MOVE.bob;
      if (n === 'torus') th.s.y = d.y + d.h / 2 + Math.sin(t * 0.02) * 4;
    }
  }

  /** The clap's burst: spinning triangles flung out and falling, and a ring of light spreading from his hands. */
  drawBurst() {
    const g = this.fx; g.clear();
    if (this.wave) {
      const w = this.wave, k = w.t / 22;
      g.lineStyle(3 * (1 - k) + 1, 0xffffff, 0.8 * (1 - k)); g.strokeCircle(w.x, w.y, 6 + k * 90);
      g.lineStyle(2, 0x2fd6c6, 0.6 * (1 - k)); g.strokeCircle(w.x, w.y, 4 + k * 60);
      if (++w.t > 22) this.wave = null;
    }
    this.shards = this.shards.filter((s) => s.life < s.max);
    for (const s of this.shards) {
      s.life++; s.x += s.vx; s.y += s.vy; s.vy += BURST.gravity; s.vx *= 0.98; s.rot += s.vr;
      const k = 1 - s.life / s.max, r = s.r * (0.4 + 0.6 * k);
      const p = [0, 2.1, 4.2].map((a) => ({ x: s.x + Math.cos(s.rot + a) * r, y: s.y + Math.sin(s.rot + a) * r }));
      g.fillStyle(s.c, Math.min(1, k * 1.5)); g.fillTriangle(p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y);
    }
  }
}
