// THE MIRACLE COSTUMES' ARRIVALS (STORMCALLER / SUN PHARAOH / SPACEWALK): drawn by FighterIntros (fighterIntros.js)
// like the other custom kinds - SKIN_INTROS names the kind, drawCostumeEntrance(g, e, p, t) draws one frame of it
// (p = 0..1 through the arrival, t = the countdown's frame) and returns { vis, dy, sc } for the fighter's sprite, or
// null when the kind isn't one of these.
//   stormcall  storm clouds roll in over the spot, rain sweeps down, then a huge bolt of lightning strikes it - a white
//              flash, and he's standing in the scorched ring with sparks crackling off him
//   sun-rise   the ground glows gold, sand spirals in from all round; a great sun disk rises out of the floor behind
//              the spot, its rays wheeling, and he steps out of its light as the sand settles
//   re-entry   a burning capsule streaks down out of the sky on a trail of fire, slams into the floor (dust, a shock
//              ring), its hatch pops open in a puff of steam and he's out - the capsule's shell falling away
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
const KINDS = ['stormcall', 'sun-rise', 're-entry'];

/** One frame of a miracle costume's arrival (see the top of the file). */
export function drawCostumeEntrance(g, e, p, t) {
  const { x, y, I } = e;
  if (!KINDS.includes(I.kind)) return null;
  if (p <= 0) return { vis: 0, dy: 0, sc: 1 };
  if (p > 1.06) return { vis: 1, dy: 0, sc: 1 };
  if (I.kind === 'stormcall') return stormcall(g, x, y, p, t, e);
  if (I.kind === 'sun-rise') return sunRise(g, x, y, p, t);
  return reEntry(g, x, y, p, t, e);
}

/** A jagged bolt of lightning from (x, y0) down to (x, y1): a wide glow, then a white core, forking once. */
function bolt(g, x, y0, y1, seed, a) {
  const pts = [[x, y0]]; let px = x;
  for (let y = y0; y < y1; y += 14) { px = x + (((y * 13 + seed * 7) % 23) - 11); pts.push([px, Math.min(y1, y + 14)]); }
  pts[pts.length - 1][0] = x;
  for (const [w, c, al] of [[9, 0x6ae0ff, 0.3], [5, 0xffe040, 0.8], [2, 0xffffff, 1]]) {
    g.lineStyle(w, c, al * a);
    for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    const k = Math.floor(pts.length / 2); g.lineBetween(pts[k][0], pts[k][1], pts[k][0] + 30, pts[k][1] + 40);
  }
  g.lineStyle(0);
}

/** STORMCALLER: the clouds roll in, rain, the strike, the scorch and the sparks. */
function stormcall(g, x, y, p, t, e) {
  const gather = ease(p / 0.45), STRIKE = 0.5, after = clamp((p - STRIKE) / 0.5);
  const cy = y - 150;
  for (let i = 0; i < 9; i++) {                                                    // the clouds, rolling in from both sides
    const side = i % 2 ? 1 : -1, cx = x + side * (140 - 120 * gather) + (i - 4) * 14, r = 18 + (i % 3) * 6;
    g.fillStyle(0x1e2638, 0.85 * Math.min(1, gather * 1.5) * (1 - after * 0.8)); g.fillCircle(cx, cy + (i % 3) * 5, r);
    g.fillStyle(0x485676, 0.7 * Math.min(1, gather * 1.5) * (1 - after * 0.8)); g.fillCircle(cx - 3, cy - 4 + (i % 3) * 5, r - 6);
  }
  if (gather > 0.3) for (let i = 0; i < 18; i++) {                                 // rain
    const k = (t * 9 + i * 37) % 150, rx = x - 90 + i * 10 + Math.sin(i) * 4;
    g.lineStyle(1, 0x8ab8e8, 0.5 * gather * (1 - after)); g.lineBetween(rx, cy + 10 + k, rx - 3, cy + 22 + k);
  }
  g.lineStyle(0);
  if (p > STRIKE - 0.04 && p < STRIKE + 0.1) {                                     // THE STRIKE
    const a = 1 - clamp((p - STRIKE) / 0.1);
    bolt(g, x, cy, y, Math.floor(t / 2), a);
    g.fillStyle(0xffffff, 0.7 * a); g.fillCircle(x, y - 30, 70 * (1 + (1 - a)));
    if (!e.struck) { e.struck = true; e.f.match.shake(10, 12); }
  }
  if (after > 0) {
    g.lineStyle(3, 0x2a1a10, 0.7 * (1 - after)); g.strokeEllipse(x, y + 1, 70 * (0.6 + after * 0.4), 12);   // the scorched ring
    g.lineStyle(1, 0xffe040, 0.8 * (1 - after)); g.strokeEllipse(x, y + 1, 56 * (0.6 + after * 0.6), 9);
    g.lineStyle(0);
    for (let i = 0; i < 6; i++) {                                                  // sparks crackling off him
      if ((t + i * 5) % 12 > 5) continue;
      const q = i * 1.1 + t * 0.3, sx = x + Math.cos(q) * 18, sy = y - 30 + Math.sin(q) * 26;
      g.lineStyle(1, i % 2 ? 0xffe040 : 0x8ae8ff, 1 - after); g.lineBetween(sx, sy, sx + Math.cos(q + 1) * 7, sy + Math.sin(q + 1) * 7); g.lineStyle(0);
    }
  }
  return { vis: p >= STRIKE ? 1 : 0, dy: 0, sc: 1 };
}

/** SUN PHARAOH: the glow, the spiralling sand, the rising sun disk and its wheeling rays. */
function sunRise(g, x, y, p, t) {
  const rise = ease(p / 0.55), reveal = ease((p - 0.45) / 0.25), fade = 1 - ease((p - 0.72) / 0.32);
  g.fillStyle(0xffd860, 0.25 * rise * fade); g.fillEllipse(x, y, 110, 16);
  for (let i = 0; i < 28; i++) {                                                   // sand spiralling in
    const q = i * 0.9 + t * 0.12, r = 90 * (1 - rise) + 16 + (i % 5) * 4, sx = x + Math.cos(q) * r, sy = y - 26 + Math.sin(q) * r * 0.45;
    g.fillStyle(i % 3 ? 0xe0c070 : 0xfff0b0, 0.8 * fade); g.fillRect(sx, sy, 2, 2);
  }
  const sy = y - 10 - 46 * rise, R = 30;                                          // the sun disk
  if (fade > 0) {
    g.fillStyle(0xffd860, 0.18 * fade); g.fillCircle(x, sy, R + 22);
    for (let i = 0; i < 16; i++) {
      const q = t * 0.02 + i / 16 * Math.PI * 2, L = i % 2 ? 14 : 24;
      g.fillStyle(0xffe490, 0.75 * fade); g.fillTriangle(x + Math.cos(q - 0.08) * R, sy + Math.sin(q - 0.08) * R, x + Math.cos(q + 0.08) * R, sy + Math.sin(q + 0.08) * R, x + Math.cos(q) * (R + L), sy + Math.sin(q) * (R + L));
    }
    g.fillStyle(0xe0aa30, 0.9 * fade); g.fillCircle(x, sy, R); g.fillStyle(0xffd860, 0.95 * fade); g.fillCircle(x, sy, R - 5);
    g.fillStyle(0xd8301a, 0.8 * fade * (1 - reveal)); g.fillCircle(x, sy, R - 14);
    g.fillStyle(0xfff8d8, 0.5 * reveal * fade); g.fillRect(x - 16, sy, 32, y - sy);   // its light, down onto the spot
  }
  return { vis: reveal, dy: 8 * (1 - reveal), sc: 1 };
}

/** SPACEWALK: the burning capsule's fall, the landing, the hatch and the shell falling away. */
function reEntry(g, x, y, p, t, e) {
  const LAND = 0.45, fall = clamp(p / LAND), open = clamp((p - 0.55) / 0.15), gone = clamp((p - 0.7) / 0.3);
  const cx = x + 140 * (1 - fall), cy = y - 18 - 420 * (1 - fall) * (1 - fall);
  if (p < LAND) {                                                                  // the fall: fire streaming behind
    for (let i = 6; i >= 0; i--) { const k = i * 9; g.fillStyle([0xff4a1a, 0xff8a20, 0xffd040][i % 3], 0.35 + 0.08 * (6 - i)); g.fillCircle(cx + k * 0.33 + Math.sin(t + i) * 2, cy - k, 14 - i * 1.2); }
  } else if (!e.landed) { e.landed = true; e.f.match.shake(8, 10); }
  if (gone < 1) {                                                                 // the capsule: a white cone, a heat-blackened shield, a hatch
    const a = 1 - gone, dx = gone * -30, dy = gone * 20, glow = 1 - clamp((p - LAND) / 0.3);
    g.fillStyle(0x1a1a24, a); g.fillTriangle(cx - 17 + dx, cy + 14 + dy, cx + 17 + dx, cy + 14 + dy, cx + dx, cy - 22 + dy);
    g.fillStyle(0xe8eef8, a); g.fillTriangle(cx - 14 + dx, cy + 12 + dy, cx + 14 + dx, cy + 12 + dy, cx + dx, cy - 18 + dy);
    g.fillStyle(0x3a2a20, a); g.fillRect(cx - 17 + dx, cy + 10 + dy, 34, 6);
    g.fillStyle(0xff7a20, 0.8 * a * glow); g.fillRect(cx - 17 + dx, cy + 10 + dy, 34, 6);
    g.fillStyle(open > 0 ? 0x1a1a24 : 0x8a9ab8, a); g.fillCircle(cx + dx, cy - 2 + dy, 5);
    if (open > 0 && open < 1) for (let i = 0; i < 5; i++) { g.fillStyle(0xffffff, 0.4 * (1 - open)); g.fillCircle(cx + (i - 2) * 7, cy - 10 - open * 30 - i * 3, 6 + open * 6); }   // steam
  }
  if (p >= LAND && p < LAND + 0.15) {                                             // the landing: dust and a shock ring
    const k = (p - LAND) / 0.15;
    g.lineStyle(2, 0xffffff, 0.8 * (1 - k)); g.strokeEllipse(x, y, 40 + 120 * k, 8 + 14 * k); g.lineStyle(0);
    for (let i = 0; i < 10; i++) { g.fillStyle(0xd8d0c0, 0.6 * (1 - k)); g.fillCircle(x + (i - 4.5) * 12 * (1 + k), y - 4 - k * 10 * (i % 3), 6 + k * 8); }
  }
  return { vis: ease((p - 0.58) / 0.12), dy: 0, sc: 1 };
}
