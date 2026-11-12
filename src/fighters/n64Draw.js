// N64 LOOK for code-drawn things. CARTRIDGE (THE DEVOTED's 64-bit costume) is a real 3D model, so everything the
// game draws for her - her demons, her tree, the spellbook and demon wheel, her sludge, the OBLATION meter, the
// Limit's demon, the karambit - has to look like it came off the same cartridge. Instead of drawing all of it twice,
// `n64(g)` wraps a Graphics so the SAME drawing code comes out N64-style:
//   - circles and ellipses become low-poly polygons (8-10 sides) with smooth Gouraud shading (a lit highlight up
//     and to the left, darker toward the rim), like a vertex-shaded ball;
//   - rectangles, triangles and polygons get per-corner shading (lit at the top, darker below);
//   - thick lines become shaded quads (one side lit, the other in shadow), like a polygon tube;
//   - the colours go through a palette (`CART`): her black-and-violet sludge becomes corrupted data - deep indigo
//     with cyan and magenta - so it matches the sludge on her model.
// Tiny shapes (eyes, teeth, pixel details) and see-through glows are left flat so they stay crisp.
// The gradient fill needs WebGL; the canvas renderer falls back to flat colours.
// Also here: n64Gem (a Gouraud-shaded spinning octahedron) and n64Star (a chunky 3D star) for her effects.

import { skinInfo } from './skins.js';

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

/** A colour times a brightness (k > 1 also lifts it a little toward white, like a specular hot spot). */
export function shadeCol(c, k) {
  let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  r *= k; g *= k; b *= k;
  if (k > 1) { const w = (k - 1) * 60; r += w; g += w; b += w; }
  return (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b);
}

/** RGB (0-255) -> [hue 0-360, saturation 0-1, lightness 0-1]. */
function hsl(c) {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
/** [hue, saturation, lightness] -> RGB integer. */
function rgb(h, s, l) {
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - C / 2;
  const [r, g, b] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return (clamp255((r + m) * 255) << 16) | (clamp255((g + m) * 255) << 8) | clamp255((b + m) * 255);
}

const plainCache = new Map();
/** The plain N64 palette (for costumes that aren't THE DEVOTED): colours kept, just a touch more saturated. */
export function PLAIN(c) {
  let o = plainCache.get(c);
  if (o === undefined) { const [h, s, l] = hsl(c); o = rgb(h, Math.min(1, s * 1.15), l); plainCache.set(c, o); }
  return o;
}

/**
 * A Graphics drawn N64-style if `fighter` wears an N64 costume (skin `n64: true`, e.g. AERO64), else the Graphics
 * itself. For a fighter's projectiles, minions and props (entities.js).
 */
export function n64For(fighter, g) {
  if (!fighter || !fighter.def) return g;
  if (fighter._n64key !== fighter.skin) { fighter._n64key = fighter.skin; fighter._n64 = !!skinInfo(fighter.def.id, fighter.skin || 0).n64; }
  return fighter._n64 ? n64(g, PLAIN) : g;
}

const cartCache = new Map();
/**
 * CARTRIDGE's palette: her sludge colours as corrupted data. Near-black -> deep indigo (so the shading shows),
 * violets -> electric cyan, dusky purple-greys -> magenta; everything else a touch more saturated (cartridge colours).
 */
export function CART(c) {
  let o = cartCache.get(c);
  if (o !== undefined) return o;
  const [h, s, l] = hsl(c);
  if (l < 0.09) o = rgb(262, 0.7, 0.15 + l);
  else if (h >= 240 && h <= 325 && s > 0.3) o = rgb(186, Math.max(0.85, s), Math.min(0.72, l * 1.05));
  else if (h >= 230 && h <= 345 && s <= 0.3) o = rgb(312, 0.7, Math.max(0.3, Math.min(0.6, l * 1.2)));
  else o = rgb(h, Math.min(1, s * 1.15), l);
  cartCache.set(c, o);
  return o;
}

// where the light comes from (up and to the left, toward the viewer) - the same corner as the 3D stages
const LX = -0.55, LY = -0.83;

const wraps = new WeakMap();
/**
 * The N64-style version of a Graphics: draw on what this returns exactly as on the Graphics itself.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {(c: number) => number} [pal] - colour mapping (CARTRIDGE's by default)
 * @returns {Phaser.GameObjects.Graphics} a stand-in for g
 */
export function n64(g, pal = CART) {
  let w = wraps.get(g);
  if (w && w.pal === pal) return w.proxy;
  const S = { fc: 0xffffff, fa: 1, lw: 1, lc: 0xffffff, la: 1, grad: false, pal };
  const plainFill = () => { if (S.grad) { g.fillStyle(pal(S.fc), S.fa); S.grad = false; } };
  /** One triangle with its own colour at each corner (the GPU blends them). */
  const tri = (x1, y1, c1, x2, y2, c2, x3, y3, c3) => { g.fillGradientStyle(c1, c2, c3, c3, S.fa); S.grad = true; g.fillTriangle(x1, y1, x2, y2, x3, y3); };
  /** A fan of shaded triangles round a lit centre point: a low-poly, Gouraud-shaded blob. */
  const ball = (x, y, rx, ry) => {
    const base = pal(S.fc), n = Math.max(rx, ry) > 14 ? 10 : 8, hx = x + LX * rx * 0.35, hy = y + LY * ry * 0.35, hc = shadeCol(base, 1.32);
    const P = [];
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); P.push([x + dx * rx, y + dy * ry, shadeCol(base, 0.5 + 0.6 * Math.max(0, dx * LX + dy * LY))]); }
    for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; tri(hx, hy, hc, p[0], p[1], p[2], q[0], q[1], q[2]); }
  };
  /** A polygon fanned from its middle, each corner shaded by how high up it is. */
  const poly = (pts) => {
    const base = pal(S.fc);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, cx = 0, cy = 0;
    for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); cx += p.x; cy += p.y; }
    cx /= pts.length; cy /= pts.length;
    const k = (p) => shadeCol(base, 1.22 - 0.5 * (p.y - y0) / Math.max(1, y1 - y0) - 0.12 * (p.x - x0) / Math.max(1, x1 - x0));
    if (pts.length === 3) { tri(pts[0].x, pts[0].y, k(pts[0]), pts[1].x, pts[1].y, k(pts[1]), pts[2].x, pts[2].y, k(pts[2])); return; }
    const cc = shadeCol(base, 1.05);
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; tri(cx, cy, cc, p.x, p.y, k(p), q.x, q.y, k(q)); }
  };
  const small = (w2, h2) => w2 < 4 || h2 < 4 || S.fa < 0.5;
  const H = {
    fillStyle(c, a = 1) { S.fc = c; S.fa = a; S.grad = false; g.fillStyle(pal(c), a); return proxy; },
    lineStyle(w2, c, a = 1) { S.lw = w2; S.lc = c; S.la = a; g.lineStyle(w2, pal(c), a); return proxy; },
    fillGradientStyle(a, b, c, d, al = 1) { S.grad = true; g.fillGradientStyle(pal(a), pal(b), pal(c), pal(d), al); return proxy; },
    fillCircle(x, y, r) { return H.fillEllipse(x, y, r * 2, r * 2); },
    fillEllipse(x, y, w2, h2) {
      if (small(w2, h2)) {                                                    // tiny or see-through: a flat low-poly ring of points
        plainFill(); const n = Math.max(w2, h2) > 6 ? 8 : 6, P = [];
        for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; P.push({ x: x + Math.cos(a) * w2 / 2, y: y + Math.sin(a) * h2 / 2 }); }
        g.fillPoints(P, true); return proxy;
      }
      ball(x, y, w2 / 2, h2 / 2); return proxy;
    },
    fillRect(x, y, w2, h2) {
      if (small(Math.abs(w2), Math.abs(h2))) { plainFill(); g.fillRect(x, y, w2, h2); return proxy; }
      const b = pal(S.fc), tl = shadeCol(b, 1.22), tr = shadeCol(b, 1.06), bl = shadeCol(b, 0.78), br = shadeCol(b, 0.64);
      tri(x, y, tl, x + w2, y, tr, x, y + h2, bl); tri(x + w2, y, tr, x + w2, y + h2, br, x, y + h2, bl); return proxy;
    },
    fillRoundedRect(x, y, w2, h2) { return H.fillRect(x, y, w2, h2); },
    fillTriangle(x1, y1, x2, y2, x3, y3) {
      const bw = Math.max(x1, x2, x3) - Math.min(x1, x2, x3), bh = Math.max(y1, y2, y3) - Math.min(y1, y2, y3);
      if (small(bw, bh)) { plainFill(); g.fillTriangle(x1, y1, x2, y2, x3, y3); return proxy; }
      poly([{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }]); return proxy;
    },
    fillPoints(pts, close) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      if (small(x1 - x0, y1 - y0) || pts.length < 3) { plainFill(); g.fillPoints(pts, close); return proxy; }
      poly(pts); return proxy;
    },
    lineBetween(x1, y1, x2, y2) {
      if (S.lw < 3 || S.la < 0.5) { g.lineBetween(x1, y1, x2, y2); return proxy; }
      const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L * S.lw / 2, ny = (x2 - x1) / L * S.lw / 2, b = pal(S.lc), fa = S.fa;
      const lit = nx * LX + ny * LY < 0, A = shadeCol(b, lit ? 0.62 : 1.25), B = shadeCol(b, lit ? 1.25 : 0.62);
      S.fa = S.la;
      tri(x1 + nx, y1 + ny, A, x2 + nx, y2 + ny, A, x1 - nx, y1 - ny, B); tri(x2 + nx, y2 + ny, A, x2 - nx, y2 - ny, B, x1 - nx, y1 - ny, B);
      S.fa = fa; return proxy;
    },
    strokeCircle(x, y, r) { return H.strokeEllipse(x, y, r * 2, r * 2); },
    strokeEllipse(x, y, w2, h2) {                                             // a low-poly ring
      const n = Math.max(w2, h2) > 30 ? 12 : 8, P = [];
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; P.push({ x: x + Math.cos(a) * w2 / 2, y: y + Math.sin(a) * h2 / 2 }); }
      g.strokePoints(P, true); return proxy;
    },
  };
  const proxy = new Proxy(g, {
    get(target, key) {
      if (key in H) return H[key];
      const v = target[key];
      if (typeof v !== 'function') return v;
      return (...args) => { const r = v.apply(target, args); return r === target ? proxy : r; };
    },
  });
  wraps.set(g, { proxy, pal });
  return proxy;
}

/**
 * A spinning gem (an octahedron) with smooth Gouraud shading - CARTRIDGE's shards and intro crystal.
 * @param {number} r - its radius; ang - its spin; cols - colours per facet; tilt - how far it leans toward us
 */
export function n64Gem(g, cx, cy, r, ang, cols, a = 1, tilt = 0.35) {
  const V = [[0, -1.35, 0], [0, 1.35, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]].map(([x, y, z]) => {
    const c = Math.cos(ang), s = Math.sin(ang), x1 = x * c + z * s, z1 = -x * s + z * c;
    const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
    return [cx + x1 * r, cy + y2 * r, z2, x1, y2, z2];
  });
  meshDraw(g, V, [[0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 2], [1, 3, 2], [1, 4, 3], [1, 5, 4], [1, 2, 5]], cols, a);
}

/**
 * A chunky 3D five-pointed star (a power-up star from a 64-bit game): its points in a ring, the middle pushed out
 * front and back, spinning about its upright axis, smooth-shaded.
 */
export function n64Star(g, cx, cy, r, ang, col, a = 1) {
  const pts = [[0, 0, 0.42], [0, 0, -0.42]];
  for (let i = 0; i < 10; i++) { const q = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.45 : 1; pts.push([Math.cos(q) * rr, Math.sin(q) * rr, 0]); }
  const c = Math.cos(ang), s = Math.sin(ang);
  const V = pts.map(([x, y, z]) => { const x1 = x * c + z * s, z1 = -x * s + z * c; return [cx + x1 * r, cy + y * r, z1, x1, y, z1]; });
  const F = [];
  for (let i = 0; i < 10; i++) { const p = 2 + i, q = 2 + (i + 1) % 10; F.push([0, p, q], [1, q, p]); }
  meshDraw(g, V, F, [col], a);
}

/** Draws a small mesh: V = [screenX, screenY, depth, nx, ny, nz] per vertex; back faces dropped, sorted, Gouraud shaded. */
function meshDraw(g, V, F, cols, a) {
  const faces = F.map((f, i) => {
    const [p, q, w] = f.map((j) => V[j]);
    return { f, i, nz: (q[0] - p[0]) * (w[1] - p[1]) - (q[1] - p[1]) * (w[0] - p[0]), z: (p[2] + q[2] + w[2]) / 3 };
  }).filter((o) => o.nz < 0).sort((p, q) => q.z - p.z);
  for (const o of faces) {
    const col = cols[o.i % cols.length];
    const vc = o.f.map((j) => { const v = V[j], l = Math.hypot(v[3], v[4], v[5]) || 1; return shadeCol(col, 0.55 + 0.75 * Math.max(0, (v[3] * LX + v[4] * LY - v[5] * 0.6) / l)); });
    const [p, q, w] = o.f.map((j) => V[j]);
    g.fillGradientStyle(vc[0], vc[1], vc[2], vc[2], a); g.fillTriangle(p[0], p[1], q[0], q[1], w[0], w[1]);
  }
}
