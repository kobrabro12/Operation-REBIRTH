// NEON BLADE effects - our own pixel VFX built in the same style and on the same machinery as the Sprite Fusion
// "Dash & Blink" port (sfMovement.js: its pixel buffers, dithered dots, additive light, plasma / star particles). Made
// for VANTA (fighterVanta.js), usable by anyone: each returns an effect { update(dt), draw(frame, layer?), done() }
// for sfRunner.sfSpawn. Every one takes `colors` = an 8-colour ramp (light to dark, sfMovement's `hex()` colours, like
// SF_PALETTES) and `seed` (its own random stream - it never touches the match's Math.random).
//   neonSlash  - a sword arc: swept in a blink, a white-hot core, the blade's colour, light, plasma off the tip, the arc
//                shattering into twinkles as it fades
//   neonCut    - a straight cut: a hairline flash along the line that splits open, throws sparks both ways and crumbles
//   neonImpact - a hit flash: a ring, four star spikes, plasma, a glow
//   glitchGhost- a fighter's afterimage in RGB-split neon with scanlines and tearing rows (an echo, a save point)
import { Px, Rng, Particles, K, dot, ringE, mix, outCubic, outExpo, hash, clamp, lerp, SF_WHITE as WHITE, TAU } from './sfMovement.js';

const NO_GROUND = () => 1e9;

/** A sword arc round (x, y): radius r, from angle a0 to a1 (radians, screen: 0 = right, + = down), swept in `sweep` s,
 *  gone by `dur` s; `thick` = its widest. */
export function neonSlash(o) {
  const R = new Rng(o.seed ?? 1), C = o.colors, ps = new Particles(R, NO_GROUND);
  const { x, y, r } = o, a0 = o.a0, a1 = o.a1, SW = o.sweep ?? 0.06, DUR = o.dur ?? 0.3, TH = o.thick ?? 5;
  const span = a1 - a0, len = Math.abs(span) * r, n = Math.max(8, Math.ceil(len * 1.6));
  let t = 0, last = 0, shattered = false;
  return {
    update(dt) {
      t += dt; ps.update(dt);
      const head = outExpo(clamp(t / SW));
      if (t < SW + 0.02) for (let q = last; q < head; q += 0.08) {                    // plasma off the blade's tip as it sweeps
        const a = a0 + span * q, tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r, s = Math.sign(span) || 1;
        const vx = -Math.sin(a) * s * R.range(80, 220) + Math.cos(a) * R.range(-40, 90), vy = Math.cos(a) * s * R.range(80, 220) + Math.sin(a) * R.range(-40, 90);
        ps.spawn(K.PLASMA, tx, ty, vx, vy, R.range(0.12, 0.26), C[2]);
      }
      last = head;
      if (!shattered && t > SW + (DUR - SW) * 0.45) {                                    // it shatters into twinkles
        shattered = true;
        for (let i = 0; i < Math.min(14, n / 4); i++) { const a = a0 + span * R.next(), rr = r + R.range(-TH / 2, TH / 2); ps.spawn(K.STAR, x + Math.cos(a) * rr, y + Math.sin(a) * rr, Math.cos(a) * R.range(10, 60), Math.sin(a) * R.range(10, 60) - 20, R.range(0.2, 0.45), R.pick([C[1], C[2], C[3]]), R.next() < 0.3 ? 1.2 : 0.6); }
      }
    },
    draw(f, layer) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== 'back') {
        const head = outExpo(clamp(t / SW)), fade = t < SW ? 1 : 1 - clamp((t - SW) / (DUR - SW));
        if (fade > 0) for (let i = 0; i <= n; i++) {
          const u = i / n; if (u > head) break;
          const tail = clamp((u - (head - 0.85)) / 0.85);                                   // the tail end is thinner and dimmer
          const a = a0 + span * u, w = TH * Math.pow(Math.sin(Math.PI * clamp(u / Math.max(0.01, head))), 0.55) * (0.35 + 0.65 * tail) * (0.4 + 0.6 * fade);
          const ca = Math.cos(a), sa = Math.sin(a), hot = 1 - clamp((head - u) / 0.25);
          for (let d = -w / 2; d <= w / 2; d += 0.5) {
            const e = Math.abs(d) / (w / 2 + 0.01), px = x + ca * (r + d), py = y + sa * (r + d);
            const c = e < 0.3 ? (hot > 0.3 || fade > 0.6 ? WHITE : C[1]) : e < 0.65 ? C[2] : e < 0.9 ? C[3] : C[5];
            dot(buf, px, py, c, fade * (e > 0.9 ? 0.5 : 1));
          }
          if (i % 2 === 0) dot(buf, x + ca * (r + w / 2 + 2), y + sa * (r + w / 2 + 2), C[4], 0.45 * fade * tail);   // a faint rim outside the arc
          if (i % 6 === 0) light.glow(x + ca * r, y + sa * r, 7 + w, C[2], 0.35 * fade * (0.4 + 0.6 * tail));
        }
      }
      ps.draw(buf, light, layer === 'back' ? 'back' : 'front');
    },
    done: () => t > DUR && ps.list.length === 0,
  };
}

/** A straight cut from (x0, y0) to (x1, y1): after `delay` s a hairline flashes along it, splits open and crumbles. */
export function neonCut(o) {
  const R = new Rng(o.seed ?? 1), C = o.colors, ps = new Particles(R, NO_GROUND);
  const { x0, y0, x1, y1 } = o, D = o.delay ?? 0, DUR = o.dur ?? 0.45, L = Math.hypot(x1 - x0, y1 - y0) || 1;
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux, n = Math.ceil(L * 1.5);
  let t = 0, split = false;
  return {
    update(dt) {
      t += dt; ps.update(dt);
      if (!split && t > D + 0.05) {                                                      // it splits: sparks fly both ways off the line
        split = true;
        for (let i = 0; i < Math.min(40, L / 4); i++) { const q = R.next(), s = R.sign(), sp = R.range(60, 240); ps.spawn(K.PLASMA, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, nx * s * sp + ux * R.range(-60, 60), ny * s * sp + uy * R.range(-60, 60), R.range(0.12, 0.3), C[2]); }
        for (let i = 0; i < Math.min(16, L / 10); i++) { const q = R.next(); ps.spawn(K.STAR, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, nx * R.range(-30, 30), ny * R.range(-30, 30) - 15, R.range(0.25, 0.5), R.pick([C[1], C[2]]), 0.6); }
      }
    },
    draw(f, layer) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== 'back' && t > D) {
        const q = (t - D) / DUR, draw = outExpo(clamp((t - D) / 0.05)), gap = q < 0.12 ? 0 : 1 + 3 * outCubic((q - 0.12) / 0.5), fade = 1 - clamp((q - 0.25) / 0.75);
        for (let i = 0; i <= n; i++) {
          const u = i / n; if (u > draw) break;
          const px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u, crumble = hash(i, Math.floor(q * 20)) < q * 1.1;   // pixels drop out as it crumbles
          if (gap === 0) { dot(buf, px, py, WHITE); dot(buf, px + nx, py + ny, C[1], 0.8); dot(buf, px - nx, py - ny, C[1], 0.8); }
          else if (!crumble) for (const s of [-1, 1]) { dot(buf, px + nx * gap * s, py + ny * gap * s, q < 0.3 ? WHITE : C[1], fade); dot(buf, px + nx * (gap + 1) * s, py + ny * (gap + 1) * s, C[3], fade * 0.8); }
          if (i % 8 === 0) light.glow(px, py, 10 * (gap === 0 ? 1.4 : 1), C[2], (gap === 0 ? 0.8 : 0.4) * fade);
        }
      }
      ps.draw(buf, light, layer === 'back' ? 'back' : 'front');
    },
    done: () => t > D + DUR && ps.list.length === 0,
  };
}

/** A hit flash at (x, y): a ring, four star spikes, plasma and a glow; `size` scales it. */
export function neonImpact(o) {
  const R = new Rng(o.seed ?? 1), C = o.colors, ps = new Particles(R, NO_GROUND), S = o.size ?? 1, DUR = 0.28;
  for (let i = 0; i < 10 * S; i++) { const a = R.range(0, TAU), sp = R.range(80, 260) * S; ps.spawn(K.PLASMA, o.x, o.y, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.1, 0.25), C[2]); }
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); },
    draw(f, layer) {
      const buf = new Px(f, f.color), light = new Px(f, f.light);
      if (layer !== 'back' && t < DUR) {
        const q = t / DUR, e = outCubic(q);
        ringE(buf, o.x, o.y, (4 + 18 * e) * S, (4 + 18 * e) * S, 2 * (1 - q) + 0.5, q < 0.3 ? WHITE : C[2], 1 - q);
        const arm = (16 * S) * (1 - e);                                                    // four star spikes, shrinking
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let d = 0; d < arm; d++) dot(buf, o.x + dx * d, o.y + dy * d, d < arm * 0.4 ? WHITE : C[1], 1 - d / arm);
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (let d = 0; d < arm * 0.45; d++) dot(buf, o.x + dx * d, o.y + dy * d, C[2], 0.8 - d / arm);
        light.glow(o.x, o.y, 22 * S, C[2], 0.9 * (1 - q));
      }
      ps.draw(buf, light, layer === 'back' ? 'back' : 'front');
    },
    done: () => t > DUR && ps.list.length === 0,
  };
}

/** A fighter's afterimage (the `actor`'s current frame, captured once) drawn in RGB-split neon - two colour ghosts a
 *  pixel apart, scanlines, rows that tear sideways - for `life` s (or until `.end()`), flickering out at the end. */
export function glitchGhost(o) {
  const R = new Rng(o.seed ?? 1), C = o.colors, s = o.actor && o.actor.silhouette ? o.actor.silhouette() : null;
  const LIFE = o.life ?? 0.6, A = o.colorA ?? C[2], B = o.colorB ?? C[5];
  let t = 0, endAt = LIFE, tear = [];
  const mask = s ? new Uint8Array(s.w * s.h) : null;
  if (s) for (let i = 0; i < mask.length; i++) mask[i] = (s.data[i] >>> 24) > 128 ? 1 : 0;
  const on = (x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h && mask[y * s.w + x];
  return {
    end() { endAt = Math.min(endAt, t + 0.25); },
    update(dt) {
      t += dt;
      if (s && Math.floor(t * 12) !== Math.floor((t - dt) * 12)) tear = Array.from({ length: s.h }, () => (R.next() < 0.12 ? Math.round(R.range(-3, 3)) : 0));
    },
    draw(f, layer) {
      if (!s || layer === 'back') return;
      const buf = new Px(f, f.color), light = new Px(f, f.light), k = 1 - clamp((t - (endAt - 0.25)) / 0.25), fl = 0.65 + 0.35 * Math.sin(t * 40);
      if (k <= 0) return;
      for (let y = 0; y < s.h; y++) {
        const dx = tear[y] || 0;
        for (let x = 0; x < s.w; x++) {
          if (!on(x, y)) continue;
          const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1), px = s.x + x + dx, py = s.y + y;
          if (edge) { dot(buf, px - 1, py, A, k * fl); dot(buf, px + 1, py, B, k * fl * 0.8); }
          else if (y % 2 === 0) dot(buf, px, py, mix(A, WHITE, 0.2), 0.32 * k * fl);
        }
      }
      light.glow(s.x + s.w / 2, s.y + s.h * 0.55, s.h * 0.6, A, 0.25 * k);
    },
    done: () => t > endAt,
  };
}

/** A neon ramp (8 colours, light to dark) from one 0xrrggbb colour - for colouring these effects to a costume. */
export function neonRamp(c, hexFn) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, at = (k) => hexFn(((lerp(r, 255, k) | 0) << 16) | ((lerp(g, 255, k) | 0) << 8) | (lerp(b, 255, k) | 0));
  const dk = (k) => hexFn((((r * k) | 0) << 16) | (((g * k) | 0) << 8) | ((b * k) | 0));
  return [hexFn(0xffffff), at(0.6), at(0.2), hexFn(c), dk(0.75), dk(0.5), dk(0.3), dk(0.15)];
}
