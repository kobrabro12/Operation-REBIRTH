// THE DRAWN ROOM: when $@L snaps his fingers (LostScene's `snap` animation) fire sparks fly off them, the room flashes
// to bare paper, and everything but him is redrawn by hand - ink and watercolour (tools/sprites/hanz_drawn.py): a dusk
// over a checkerboard plain, his counter and every thing on it traced in ink, and one by one the surreal things pop in
// (an eye for a moon, a fish with a house on its back, stairs into a cloud, a teacup pouring upward, a window with night
// behind it, a tree with hands). He stays a 3D PS1 man in the middle of it. The ink "boils" (three redraws, flipped
// through). Snap again and it all goes back.
import { VIEW_W, VIEW_H } from '../config.js';
import { LOST_FRAMES } from './lostFrames.js';
import { LOST_DRAWN } from './lostDrawn.js';
import { sfx } from '../audio/sfx.js';

const DIR = 'assets/shop/lost/';
// how many game frames each boil drawing stays up (the ink's wobble speed)
const BOIL_EVERY = 8;
// the snap: how many sparks fly, their colours, gravity, and the paper flash (ms to fade) / when the room switches (ms)
const SPARKS = { n: 26, colors: [0xfff4d0, 0xffe08a, 0xffb04a, 0xff6a2a, 0xe8341c], gravity: 0.13, flash: 520, swap: 110 };
// after the switch, the drawn things pop in one by one: first delay and the gap between them (ms)
const POP = { first: 260, gap: 170 };
// the fish swims across the sky (px a frame) and the eye blinks every so often (frames between, blink length)
const DRIFT = { fish: 0.18, blink: [160, 420], shut: 7 };

/** Queues the drawn room's pictures on a scene's loader (texture keys lost_<name>). `desk` = his counter too (only
 *  LOST needs it; THE DRAWN ROOM theme and THE EYE in matches don't). */
export function queueDrawn(scene, desk = true) {
  const want = ['drawn_wash', 'drawn_things'];
  for (let i = 0; i < LOST_DRAWN.boil; i++) want.push('drawn_ink_' + i);
  if (desk) { want.push('drawn_desk'); for (let i = 0; i < LOST_DRAWN.boil; i++) want.push('drawn_desk_ink_' + i); }
  for (const n of want) if (!scene.textures.exists('lost_' + n)) scene.load.image('lost_' + n, DIR + n + '.png');
}

/** Cuts drawn_things.png into its frames (`<thing>_<i>`), once. */
export function addThingFrames(textures) {
  const tex = textures.get('lost_drawn_things');
  for (const [n, t] of Object.entries(LOST_DRAWN.things)) for (let i = 0; i < t.n; i++) if (!tex.has(`${n}_${i}`)) tex.add(`${n}_${i}`, 0, i * t.w, t.sy, t.w, t.h);
}

/** Which boil drawing is up at frame t. */
export function boilAt(t) { return Math.floor(t / BOIL_EVERY) % LOST_DRAWN.boil; }

/** Moves the drawn things for frame t (each `{ n, t: its table entry, s: its image }`): the ink boils, the fish swims
 *  across, the teacup and the eye bob; `shut` > 0 shows the eye's blink. */
export function stepThings(things, t, shut = 0) {
  const b = boilAt(t);
  for (const th of things) {
    const { n, t: d } = th;
    th.s.setFrame(`${n}_${n === 'eye' && shut > 0 && d.n > LOST_DRAWN.boil ? LOST_DRAWN.boil : b}`);
    if (n === 'fish') th.s.x = -d.w / 2 + ((d.x + d.w + t * DRIFT.fish) % (VIEW_W + d.w));
    if (n === 'teacup') th.s.y = d.y + d.h / 2 + Math.sin(t * 0.03) * 3;
    if (n === 'eye') th.s.y = d.y + d.h / 2 + Math.sin(t * 0.017) * 2;
  }
}

/** The hand-drawn version of the LOST room, kept by LostScene (`this.drawn`). */
export class DrawnRoom {
  /** Queues the drawn room's pictures (called from LostScene.loadLazy, so they come in after the room is up). */
  static queue(scene) { queueDrawn(scene, true); }

  /** True once every picture it needs has loaded. */
  static loaded(scene) { return scene.textures.exists('lost_drawn_things') && scene.textures.exists('lost_drawn_desk_ink_' + (LOST_DRAWN.boil - 1)); }

  /** Builds the drawn layers (hidden) over the 3D room's: depth 3.5+ covers the room, 5.6+ covers his counter (his
   *  frames are already cut out where the desk is in front of him, so the drawn desk shows there). */
  constructor(scene) {
    this.scene = scene; this.on = false; this.blinkAt = 200; this.shut = 0;
    addThingFrames(scene.textures);
    this.wash = scene.add.image(0, 0, 'lost_drawn_wash').setOrigin(0).setDepth(3.5);
    this.ink = scene.add.image(0, 0, 'lost_drawn_ink_0').setOrigin(0).setDepth(3.6);
    this.things = Object.entries(LOST_DRAWN.things).map(([n, t], i) => ({
      n, t, i, s: scene.add.image(t.x + t.w / 2, t.y + t.h / 2, 'lost_drawn_things', `${n}_0`).setDepth(3.7 + i * 0.01) }));
    this.desk = scene.add.image(0, 0, 'lost_drawn_desk').setOrigin(0).setDepth(5.6);
    this.deskInk = scene.add.image(0, 0, 'lost_drawn_desk_ink_0').setOrigin(0).setDepth(5.7);
    this.flash = scene.add.rectangle(0, 0, VIEW_W, VIEW_H, 0xf1e8d4).setOrigin(0).setDepth(18).setAlpha(0);
    this.fx = scene.add.graphics().setDepth(8); this.sparks = [];
    this.setVisible(false);
  }

  /** Shows or hides every drawn layer (the things only once they've popped in). */
  setVisible(v) {
    for (const o of [this.wash, this.ink, this.desk, this.deskInk]) o.setVisible(v);
    for (const th of this.things) th.s.setVisible(v);
  }

  /** Turns it off at once with no snap (THE CLAP is turning the room into polygons instead). */
  forceOff() { this.on = false; this.setVisible(false); }

  /** THE SNAP: sparks of fire off his fingertips (at x, y), a flash of bare paper, and the room switches - into the
   *  drawn one (the things popping in one by one) or back to 3D. Returns whether it's now drawn. */
  snap(x, y) {
    const sc = this.scene;
    sfx('clocktick', 0.9, 2.2); sfx('flame', 0.45, 1.6);
    for (let i = 0; i < SPARKS.n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 1.5 + Math.random() * 3.2;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 22 + Math.floor(Math.random() * 26), c: SPARKS.colors[Math.floor(Math.random() * SPARKS.colors.length)], r: 1 + Math.random() * 1.6 });
    }
    this.puff = { x, y, t: 0 };
    this.on = !this.on;
    sc.tweens.killTweensOf(this.flash);
    this.flash.setAlpha(0);
    sc.tweens.add({ targets: this.flash, alpha: 1, duration: SPARKS.swap, ease: 'Quad.easeIn',
      onComplete: () => {
        this.apply();
        sc.tweens.add({ targets: this.flash, alpha: 0, duration: SPARKS.flash, ease: 'Quad.easeOut' });
      } });
    return this.on;
  }

  /** Switches the layers over (under the flash): drawn on = the 3D room, counter and desk things hidden. */
  apply() {
    const sc = this.scene, on = this.on;
    this.setVisible(on);
    sc.set3DRoom(!on);
    if (!on) return;
    for (const th of this.things) {
      th.s.setScale(0).setAlpha(0);
      sc.tweens.add({ targets: th.s, scale: 1, alpha: 1, duration: 420, ease: 'Back.easeOut', delay: POP.first + th.i * POP.gap,
        onStart: () => sfx('petal', 0.35, 0.8 + th.i * 0.08) });
    }
  }

  /** Each frame: the ink boils, the fish swims, the eye blinks, the teacup bobs; and the snap's sparks fly. */
  step(t) {
    this.drawSparks();
    if (!this.on) return;
    const b = boilAt(t);
    this.ink.setTexture('lost_drawn_ink_' + b); this.deskInk.setTexture('lost_drawn_desk_ink_' + b);
    if (--this.blinkAt <= 0) { this.shut = DRIFT.shut; this.blinkAt = DRIFT.blink[0] + Math.floor(Math.random() * (DRIFT.blink[1] - DRIFT.blink[0])); }
    if (this.shut > 0) this.shut--;
    stepThings(this.things, t, this.shut);
  }

  /** The snap's fire: sparks that arc up and fall, shrinking, and a quick puff of flame at his fingertips. */
  drawSparks() {
    const g = this.fx; g.clear();
    if (this.puff) {
      const p = this.puff, k = p.t / 14;
      g.fillStyle(0xffb04a, 0.7 * (1 - k)); g.fillCircle(p.x, p.y, 4 + k * 10);
      g.fillStyle(0xfff4d0, 0.9 * (1 - k)); g.fillCircle(p.x, p.y, 2 + k * 4);
      if (++p.t > 14) this.puff = null;
    }
    this.sparks = this.sparks.filter((s) => s.life < s.max);
    for (const s of this.sparks) {
      s.life++; s.x += s.vx; s.y += s.vy; s.vy += SPARKS.gravity; s.vx *= 0.97;
      const k = 1 - s.life / s.max;
      g.fillStyle(s.c, k); g.fillRect(Math.round(s.x), Math.round(s.y), Math.max(1, s.r * 2 * k), Math.max(1, s.r * 2 * k));
    }
  }

  /** Where the snap's sparks come from on screen (exported with the snap animation). */
  static sparkAt() { const s = LOST_FRAMES.anims.snap && LOST_FRAMES.anims.snap.spark; return s ? s : null; }
}
