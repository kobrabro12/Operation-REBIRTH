// A tiny low-poly 3D renderer for the N64-style stages (Castle Court, Jungle Falls, Breeze Hill): flat-shaded
// boxes, prisms and quads, drawn in perspective into one world-space Graphics every frame. The gameplay plane is
// Z = 0 (a point there is drawn exactly where it is in the game), +Z goes away from the camera, so the front of
// every platform lines up with where you stand and the rest of the world sits behind in real perspective - it
// shifts with the camera like a real 3D scene. The eye sits `lift` px above the camera's centre, so you look a
// little down onto the tops of things. Far faces fade into the stage's fog colour (N64 distance fog).
//   const R = new Poly3D(scene, world, { fog: 0x9cc8f0 });
//   R.box(x1, y1, z1, x2, y2, z2, colour)  -> static scenery (added once)
//   R.render(dynamicFaces)                  -> every frame (the camera moved, things animate)

const clamp = (v) => Math.max(0, Math.min(1, v));
/** A repeatable 0-1 number from a few integers (so the facets look the same every match and every frame). */
const hash = (a, b = 0, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** One triangle with its normal pointing away from `away` (a point inside the solid) - or up, if away is null. */
function tri(p, q, r, col, away) {
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  let n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(...n) || 1; n = n.map((v) => v / l);
  const cx = (p[0] + q[0] + r[0]) / 3, cy = (p[1] + q[1] + r[1]) / 3, cz = (p[2] + q[2] + r[2]) / 3;
  const out = away ? n[0] * (cx - away[0]) + n[1] * (cy - away[1]) + n[2] * (cz - away[2]) : -n[1];
  if (out < 0) n = n.map((v) => -v);
  return { p: [p, q, r], n, c: col };
}

/**
 * Faceted ground: a grid of triangles whose corners are nudged up and down, each one flat-shaded on its own - the
 * classic low-poly landscape. o: x1, x2, z1, z2 (its extent), y (its height), nx, nz (cells), amp (how bumpy),
 * hill(x, z) (extra height, negative = up), col(i, j, x, z) or cols (colours picked at random per cell), seed.
 */
export function terrainFaces(o) {
  const { x1, x2, z1, z2, y, nx, nz, amp = 10, seed = 1 } = o, H = [];
  for (let i = 0; i <= nx; i++) {
    H.push([]);
    for (let j = 0; j <= nz; j++) {
      const x = x1 + (x2 - x1) * i / nx, z = z1 + (z2 - z1) * j / nz;
      H[i].push([x, y + (o.hill ? o.hill(x, z) : 0) - (hash(i, j, seed) - 0.5) * 2 * amp, z]);
    }
  }
  const out = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = H[i][j], b = H[i + 1][j], c = H[i + 1][j + 1], d = H[i][j + 1];
    const pick = (k) => o.col ? o.col(i, j, a[0], a[2], k) : o.cols[Math.floor(hash(i, j, seed + 7 + k) * o.cols.length)];
    if ((i + j) % 2) out.push(tri(a, b, c, pick(0), null), tri(a, c, d, pick(1), null));
    else out.push(tri(a, b, d, pick(0), null), tri(b, c, d, pick(1), null));
  }
  return out;
}

/**
 * A lumpy low-poly blob (a bush, a cloud, a boulder, a hill, a tree's crown): an octahedron split once into 32
 * triangles, its corners pushed in and out. cols = colours per facet; top = colour for facets facing up (grass on a rock).
 */
export function blobFaces(cx, cy, cz, rx, ry, rz, cols, seed = 1, top = null, lump = 0.22) {
  const O = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const F = [[0, 3, 4], [4, 3, 1], [1, 3, 5], [5, 3, 0], [0, 4, 2], [4, 1, 2], [1, 5, 2], [5, 0, 2]];
  const cols2 = Array.isArray(cols) ? cols : [cols];
  const vert = (v) => {
    const l = Math.hypot(...v), u = v.map((t) => t / l), k = 1 + (hash(Math.round(u[0] * 50), Math.round(u[1] * 50), Math.round(u[2] * 50) + seed * 131) - 0.5) * 2 * lump;
    return [cx + u[0] * rx * k, cy + u[1] * ry * k, cz + u[2] * rz * k];
  };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const out = [];
  F.forEach(([ia, ib, ic], fi) => {
    const a = O[ia], b = O[ib], c = O[ic], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]].forEach((t, ti) => {
      const f = tri(vert(t[0]), vert(t[1]), vert(t[2]), cols2[Math.floor(hash(fi, ti, seed) * cols2.length)], [cx, cy, cz]);
      if (top != null && f.n[1] < -0.55) f.c = top;
      out.push(f);
    });
  });
  return out;
}

/**
 * The craggy rock under a floating island: an inverted, jagged cone hanging from y (top ring rx x rz, n sides) down to
 * a point h below, with a ragged middle ring - all flat-shaded facets.
 */
export function rockFaces(cx, y, cz, rx, rz, h, n, cols, seed = 1) {
  const ring = (k, yy, sc) => Array.from({ length: n }, (_, i) => {
    const a = (i + 0.5 * k) / n * Math.PI * 2, j = 1 + (hash(i, k, seed) - 0.5) * 0.3;
    return [cx + Math.cos(a) * rx * sc * j, yy + (hash(i, k + 5, seed) - 0.5) * h * 0.12, cz + Math.sin(a) * rz * sc * j];
  });
  const r0 = ring(0, y, 1), r1 = ring(1, y + h * 0.45, 0.62), r2 = ring(2, y + h * 0.75, 0.3), tip = [cx + (hash(seed) - 0.5) * rx * 0.2, y + h, cz], C = [cx, y + h * 0.3, cz];
  const col = (i, k) => cols[Math.floor(hash(i, k, seed + 3) * cols.length)];
  const out = [];
  for (let i = 0; i < n; i++) {
    const i2 = (i + 1) % n;
    out.push(tri(r0[i], r0[i2], r1[i], col(i, 0), C), tri(r0[i2], r1[i2], r1[i], col(i, 1), C));
    out.push(tri(r1[i], r1[i2], r2[i], col(i, 2), C), tri(r1[i2], r2[i2], r2[i], col(i, 3), C));
    out.push(tri(r2[i], r2[i2], tip, col(i, 4), C));
  }
  return out;
}

/** A colour times a brightness, then mixed toward the fog colour by k (0-1). */
function shade(col, b, fog, k) {
  const r = (col >> 16 & 255) * b, g = (col >> 8 & 255) * b, bl = (col & 255) * b;
  const fr = fog >> 16 & 255, fg = fog >> 8 & 255, fb = fog & 255;
  return (Math.min(255, r + (fr - r) * k) << 16) | (Math.min(255, g + (fg - g) * k) << 8) | Math.min(255, bl + (fb - bl) * k);
}

/** Builds the faces of a box (corners x1,y1,z1 - x2,y2,z2): six quads with outward normals. */
export function boxFaces(x1, y1, z1, x2, y2, z2, col, top = col) {
  return [
    { p: [[x1, y1, z1], [x2, y1, z1], [x2, y2, z1], [x1, y2, z1]], n: [0, 0, -1], c: col },    // front
    { p: [[x1, y1, z2], [x2, y1, z2], [x2, y1, z1], [x1, y1, z1]], n: [0, -1, 0], c: top },    // top
    { p: [[x1, y2, z1], [x2, y2, z1], [x2, y2, z2], [x1, y2, z2]], n: [0, 1, 0], c: col },     // bottom
    { p: [[x1, y1, z2], [x1, y1, z1], [x1, y2, z1], [x1, y2, z2]], n: [-1, 0, 0], c: col },    // left
    { p: [[x2, y1, z1], [x2, y1, z2], [x2, y2, z2], [x2, y2, z1]], n: [1, 0, 0], c: col },     // right
    { p: [[x2, y1, z2], [x1, y1, z2], [x1, y2, z2], [x2, y2, z2]], n: [0, 0, 1], c: col },     // back
  ];
}

/** A pyramid (a tower's roof, a hill, a low-poly tree): square base centred on cx,cz at height y, tip h above it. */
export function pyramidFaces(cx, y, cz, w, d, h, col) {
  const a = [cx - w / 2, y, cz - d / 2], b = [cx + w / 2, y, cz - d / 2], c = [cx + w / 2, y, cz + d / 2], e = [cx - w / 2, y, cz + d / 2], t = [cx, y - h, cz];
  const nrm = (p, q) => { const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = t[0] - p[0], vy = t[1] - p[1], vz = t[2] - p[2]; const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], l = Math.hypot(...n) || 1; return n.map((v) => -v / l); };
  return [[a, b], [b, c], [c, e], [e, a]].map(([p, q]) => ({ p: [p, q, t], n: nrm(p, q), c: col }));
}

/** An upright prism with n sides (a tower, a pillar, a bumper, a barrel): centre cx,cz, from y1 (top) to y2 (bottom). */
export function prismFaces(cx, y1, y2, cz, r, n, col, top = col) {
  const out = [], ring = [];
  for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI * 2; ring.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, a]); }
  for (let i = 0; i < n; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % n], m = (ring[i][2] + Math.PI / n);
    out.push({ p: [[bx, y1, bz], [ax, y1, az], [ax, y2, az], [bx, y2, bz]], n: [Math.cos(m), 0, Math.sin(m)], c: col });
  }
  out.push({ p: ring.map(([x, z]) => [x, y1, z]).reverse(), n: [0, -1, 0], c: top });
  return out;
}

/** The 3D scene of one stage: static faces added once, drawn with this frame's moving faces by render(). */
export class Poly3D {
  /**
   * @param {Phaser.Scene} scene - the match
   * @param {object[]} layer - the stage's world layer list (the Graphics is pushed onto it)
   * @param {object} o - fog: colour far things fade into; zFar: where the fog is total; f: focal length (lower =
   *   stronger perspective); lift: how far above the camera's centre the eye is; light: direction the light shines
   */
  constructor(scene, layer, o = {}) {
    this.scene = scene; this.fog = o.fog ?? 0x9cc8f0; this.zFar = o.zFar ?? 2600; this.zNear = o.zNear ?? 300;
    this.f = o.f ?? 560; this.lift = o.lift ?? 70;
    this.edge = o.edge ?? 0.28;                                // how strongly each facet's edges are drawn (0 = none)
    const L = o.light || [-0.45, -1, -0.55], l = Math.hypot(...L); this.light = L.map((v) => -v / l);
    this.faces = [];
    this.g = scene.add.graphics().setDepth(-5); layer.push(this.g);
  }
  /** Adds a box to the static scenery. */
  box(x1, y1, z1, x2, y2, z2, col, top) { this.faces.push(...boxFaces(x1, y1, z1, x2, y2, z2, col, top)); }
  /** Adds a pyramid to the static scenery. */
  pyramid(cx, y, cz, w, d, h, col) { this.faces.push(...pyramidFaces(cx, y, cz, w, d, h, col)); }
  /** Adds an upright prism to the static scenery. */
  prism(cx, y1, y2, cz, r, n, col, top) { this.faces.push(...prismFaces(cx, y1, y2, cz, r, n, col, top)); }
  /** Adds faceted ground (see terrainFaces). */
  terrain(o) { this.faces.push(...terrainFaces(o)); }
  /** Adds a lumpy low-poly blob (see blobFaces). */
  blob(...a) { this.faces.push(...blobFaces(...a)); }
  /** Adds the jagged rock under a floating island (see rockFaces). */
  rock(...a) { this.faces.push(...rockFaces(...a)); }
  /** Adds one flat polygon (pts = [[x,y,z], ...], drawn from both sides) to the static scenery. */
  quad(pts, col) { this.faces.push({ p: pts, n: null, c: col }); }

  /**
   * Draws the whole scene from where the world camera is now: projects every face, drops the ones facing away,
   * sorts back to front, shades each by the light and fades it with distance.
   * @param {object[]} dyn - this frame's moving faces (boxFaces / prismFaces ... output)
   */
  render(dyn = []) {
    const cam = this.scene.worldCam || this.scene.cameras.main, ex = cam.midPoint.x, ey = cam.midPoint.y - this.lift, f = this.f, g = this.g;
    const V = cam.worldView, vx1 = V.x - 40, vx2 = V.x + V.width + 40, vy1 = V.y - 40, vy2 = V.y + V.height + 40;
    g.clear();
    const list = [];
    
    for (const F of this.faces.length ? this.faces.concat(dyn) : dyn) {
      const P = F.p;
      let zs = 0, cx = 0, cy = 0;
      for (const v of P) { zs += v[2]; cx += v[0]; cy += v[1]; }
      const n = P.length, z = zs / n;
      if (z < -f + 40) continue;
      if (F.n) {                                            // facing away from the eye: skip it
        const dx = cx / n - ex, dy = cy / n - ey, dz = z + f;
        if (F.n[0] * dx + F.n[1] * dy + F.n[2] * dz > 0) continue;
      }
      const pts = P.map(([x, y, zz]) => { const s = f / (f + Math.max(-f + 20, zz)); return { x: ex + (x - ex) * s, y: ey + (y - ey) * s }; });
      let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity;
      for (const q of pts) { if (q.x < ax) ax = q.x; if (q.x > bx) bx = q.x; if (q.y < ay) ay = q.y; if (q.y > by) by = q.y; }
      if (bx < vx1 || ax > vx2 || by < vy1 || ay > vy2) continue;              // off screen
      // light, plus a small fixed per-facet wobble so neighbouring facets never blend into one flat colour
      const wob = 1 + (hash(Math.round(cx), Math.round(cy), Math.round(zs)) - 0.5) * 0.12;
      const b = (F.n ? 0.58 + 0.42 * Math.max(0, F.n[0] * this.light[0] + F.n[1] * this.light[1] + F.n[2] * this.light[2]) : 0.85) * wob;
      const fog = clamp((z - this.zNear) / (this.zFar - this.zNear)) * 0.85;
      list.push({ z: z + (F.bias || 0), pts, col: shade(F.c, Math.min(1.15, b), this.fog, fog), edge: shade(F.c, b * 0.62, this.fog, fog), a: F.a ?? 1 });
    }
    list.sort((a, b) => b.z - a.z);
    for (const q of list) {
      g.fillStyle(q.col, q.a); g.fillPoints(q.pts, true);
      if (this.edge) { g.lineStyle(1, q.edge, this.edge * q.a); g.strokePoints(q.pts, true); }   // the facet's edges
    }
  }
}
