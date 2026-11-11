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
  /** Adds one flat polygon (pts = [[x,y,z], ...], drawn from both sides) to the static scenery. */
  quad(pts, col) { this.faces.push({ p: pts, n: null, c: col }); }

  /**
   * Draws the whole scene from where the world camera is now: projects every face, drops the ones facing away,
   * sorts back to front, shades each by the light and fades it with distance.
   * @param {object[]} dyn - this frame's moving faces (boxFaces / prismFaces ... output)
   */
  render(dyn = []) {
    const cam = this.scene.worldCam || this.scene.cameras.main, ex = cam.midPoint.x, ey = cam.midPoint.y - this.lift, f = this.f, g = this.g;
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
      const b = F.n ? 0.62 + 0.38 * Math.max(0, F.n[0] * this.light[0] + F.n[1] * this.light[1] + F.n[2] * this.light[2]) : 0.85;
      list.push({ z: z + (F.bias || 0), pts, col: shade(F.c, b, this.fog, clamp((z - this.zNear) / (this.zFar - this.zNear)) * 0.85), a: F.a ?? 1 });
    }
    list.sort((a, b) => b.z - a.z);
    for (const q of list) { g.fillStyle(q.col, q.a); g.fillPoints(q.pts, true); }
  }
}
