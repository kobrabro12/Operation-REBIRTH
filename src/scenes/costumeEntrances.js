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
// GNASH's three map costumes (each after a stage):
//   insert-coin  HIGH SCORE: a neon coin spins down into the spot, a CRT-pink grid flashes across the floor and he's
//                built up out of chunky neon pixel blocks from the feet up
//   gargoyle     GRAVEMOON: moonlit mist rolls in, a stone gargoyle settles on the spot with red eyes lit; it cracks,
//                crumbles to rubble and bats burst out - he's standing where it was
//   virus-popup  INFECTED.EXE: a grey Windows window pops up on the spot, a progress bar fills, it glitches and tears
//                apart in pink and cyan slices, and he steps out of the noise
//   chalk-mural  POP LINES: a black subway ad panel stands on the spot, a white chalk figure draws itself onto it line by
//                line, energy dashes pop out round it, then flat colour floods the panel and he steps out of the picture
const clamp = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
const KINDS = ['stormcall', 'sun-rise', 're-entry', 'insert-coin', 'gargoyle', 'virus-popup', 'chalk-mural'];

/** One frame of a miracle costume's arrival (see the top of the file). */
export function drawCostumeEntrance(g, e, p, t) {
  const { x, y, I } = e;
  if (!KINDS.includes(I.kind)) return null;
  if (p <= 0) return { vis: 0, dy: 0, sc: 1 };
  if (p > 1.06) return { vis: 1, dy: 0, sc: 1 };
  if (I.kind === 'stormcall') return stormcall(g, x, y, p, t, e);
  if (I.kind === 'sun-rise') return sunRise(g, x, y, p, t);
  if (I.kind === 'insert-coin') return insertCoin(g, x, y, p, t);
  if (I.kind === 'gargoyle') return gargoyle(g, x, y, p, t);
  if (I.kind === 'virus-popup') return virusPopup(g, x, y, p, t);
  if (I.kind === 'chalk-mural') return chalkMural(g, x, y, p, t);
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

/** HIGH SCORE: the coin, the grid flash, the pixel build-up. */
function insertCoin(g, x, y, p, t) {
  const drop = ease(p / 0.35), build = ease((p - 0.35) / 0.4), fade = 1 - ease((p - 0.8) / 0.25);
  if (p < 0.4) {                                                                   // the coin spins down
    const cy = y - 160 + 140 * drop, w = 9 * Math.abs(Math.cos(t * 0.3));
    g.fillStyle(0xffc85a, 1); g.fillEllipse(x, cy, w * 2 + 2, 18); g.fillStyle(0xfff0a0, 1); g.fillEllipse(x - w * 0.3, cy - 2, w, 10);
    g.fillStyle(0xffffff, 0.6); g.fillRect(x - 1, cy - 160 * (1 - drop) * 0.2, 2, 30);
  }
  if (p > 0.32 && fade > 0) {                                                     // the grid flashing out across the floor
    const k = ease((p - 0.32) / 0.2);
    g.lineStyle(1.5, 0xff3fd0, 0.7 * fade);
    for (let i = -6; i <= 6; i++) g.lineBetween(x + i * 12 * k, y, x + i * 22 * k, y + 8);
    g.lineBetween(x - 140 * k, y, x + 140 * k, y); g.lineBetween(x - 150 * k, y + 4, x + 150 * k, y + 4); g.lineStyle(0);
    g.fillStyle(0x3af0ff, 0.12 * fade); g.fillEllipse(x, y, 160 * k, 14);
  }
  if (build > 0 && fade > 0) {                                                     // the pixel blocks stacking up into him
    const H = 76, top = y - H * build, B = 6;
    for (let by = y - B; by >= top; by -= B) for (let bx = -18; bx < 18; bx += B) {
      const r = ((bx * 7 + by * 13 + 99) % 11) / 11;
      if (r < 0.65) { g.fillStyle([0xff3fd0, 0x3af0ff, 0xffc85a][(bx + by + 300) % 3 === 0 ? 2 : (bx / B + by / B) & 1], 0.55 * fade); g.fillRect(x + bx, by, B - 1, B - 1); }
    }
    g.fillStyle(0xffffff, 0.8 * fade); g.fillRect(x - 20, top - 2, 40, 2);
  }
  return { vis: clamp((p - 0.62) / 0.2), dy: 0, sc: 1 };
}

/** GRAVEMOON: the mist, the stone gargoyle, the crumble and the bats. */
function gargoyle(g, x, y, p, t) {
  const mist = ease(p / 0.3), crack = clamp((p - 0.45) / 0.15), fall = ease((p - 0.6) / 0.35), fade = 1 - ease((p - 0.75) / 0.3);
  if (fade > 0) for (let i = 0; i < 9; i++) {                                      // moonlit mist rolling in
    const mx = x + Math.sin(i * 1.7 + t * 0.03) * 50 * mist, my = y - 6 - (i % 3) * 8;
    g.fillStyle(i % 2 ? 0x8aa8ff : 0xc8d0ff, 0.12 * fade * mist); g.fillEllipse(mx, my, 70, 18);
  }
  g.fillStyle(0xe6eaff, 0.25 * mist * fade); g.fillRect(x - 24, y - 200, 48, 200);   // a shaft of moonlight
  if (p < 0.62) {                                                                  // the gargoyle, crouched on the spot
    const sy = y - 70 * (1 - ease(p / 0.25)) * 0.3, shake = crack > 0 ? (t % 2 ? 1 : -1) * crack * 2 : 0, X = x + shake;
    g.fillStyle(0x38384f, 1);
    g.fillTriangle(X - 30, sy - 50, X - 8, sy - 34, X - 14, sy - 14); g.fillTriangle(X + 30, sy - 50, X + 8, sy - 34, X + 14, sy - 14);   // wings
    g.fillStyle(0x53566c, 1); g.fillEllipse(X, sy - 22, 30, 40); g.fillRect(X - 14, sy - 8, 28, 8);
    g.fillCircle(X, sy - 48, 11); g.fillTriangle(X - 9, sy - 54, X - 6, sy - 70, X - 3, sy - 56); g.fillTriangle(X + 9, sy - 54, X + 6, sy - 70, X + 3, sy - 56);   // head, horns
    g.fillStyle(0xb3becd, 0.5); g.fillEllipse(X - 5, sy - 28, 8, 20);
    g.fillStyle(0xff3a3a, 0.6 + 0.4 * Math.sin(t * 0.4)); g.fillRect(X - 5, sy - 50, 3, 2); g.fillRect(X + 2, sy - 50, 3, 2);   // its red eyes
    if (crack > 0) { g.lineStyle(1, 0x0a0818, 1); g.lineBetween(X - 2, sy - 58, X + 4, sy - 40); g.lineBetween(X + 4, sy - 40, X - 3, sy - 22); g.lineBetween(X - 3, sy - 22, X + 6, sy - 6); g.lineBetween(X + 4, sy - 40, X + 12, sy - 34); g.lineStyle(0); }
  }
  if (fall > 0 && fall < 1) {                                                      // rubble falling, bats bursting out
    for (let i = 0; i < 14; i++) { const rx = x + ((i * 37) % 40) - 20 + (i % 2 ? 1 : -1) * fall * 18, ry = y - 60 + (i * 5) % 50 + fall * fall * 70; if (ry < y) { g.fillStyle(i % 3 ? 0x53566c : 0x38384f, 1 - fall); g.fillRect(rx, ry, 4 + (i % 3), 3 + (i % 2)); } }
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.35, d = 20 + fall * 120, bx = x + Math.cos(a) * d, by = y - 40 + Math.sin(a) * d * 0.8, w = (t + i) % 6 < 3 ? 5 : 2;
      g.fillStyle(0x0b0922, 1 - fall); g.fillTriangle(bx - w - 2, by - 2, bx, by, bx - 1, by + 2); g.fillTriangle(bx + w + 2, by - 2, bx, by, bx + 1, by + 2);
    }
  }
  return { vis: clamp((p - 0.58) / 0.12), dy: 0, sc: 1 };
}

/** INFECTED.EXE: the pop-up window, the progress bar, the glitch and the tear. */
function virusPopup(g, x, y, p, t) {
  const open = ease(p / 0.15), load = clamp((p - 0.15) / 0.35), tear = ease((p - 0.55) / 0.25);
  const W = 96 * open, H = 64 * open, X = x - W / 2, Y = y - 92;
  if (tear < 1 && open > 0) {
    for (let r = 0; r < 8; r++) {                                                  // the window, in horizontal slices that slide apart as it tears
      const sy = Y + r * H / 8, off = tear * ((r % 2 ? 1 : -1) * (10 + r * 9)) + (load > 0.8 && (t + r) % 7 === 0 ? 4 : 0), al = 1 - tear;
      g.fillStyle(0x0a0a12, al); g.fillRect(X - 1 + off, sy, W + 2, H / 8 + 1);
      g.fillStyle(0xc0c0c0, al); g.fillRect(X + off, sy, W, H / 8 + 1);
      if (r === 0) { g.fillStyle(0x0a2484, al); g.fillRect(X + 2 + off, sy + 2, W - 4, 6); g.fillStyle(0xc0c0c0, al); g.fillRect(X + W - 9 + off, sy + 3, 5, 4); g.fillStyle(0xff7ab0, al); g.fillRect(X + 4 + off, sy + 3, 4, 4); }
      if (r === 4 || r === 5) {                                                    // the progress bar
        g.fillStyle(0xffffff, al); g.fillRect(X + 8 + off, Y + H * 0.55, W - 16, 7);
        if (r === 4) for (let b = 0; b < Math.floor(load * 12); b++) { g.fillStyle(0x0a2484, al); g.fillRect(X + 10 + off + b * (W - 20) / 12, Y + H * 0.55 + 1, (W - 20) / 12 - 1, 5); }
      }
      if (r === 2) { g.fillStyle(0xff2a2a, al); g.fillCircle(X + 12 + off, Y + H * 0.33, 5); g.fillStyle(0x2a2a2a, al); g.fillRect(X + 22 + off, Y + H * 0.3, W * 0.5, 2); }
    }
    if (tear > 0) for (let i = 0; i < 10; i++) { g.fillStyle(i % 2 ? 0xff2a8a : 0x3af0ff, 0.7 * (1 - tear)); g.fillRect(x - 60 + ((i * 47 + t * 5) % 120), Y + ((i * 31) % 90), 10 + (i % 4) * 8, 2); }
  }
  if (p > 0.55 && p < 0.9 && t % 3 === 0) { g.fillStyle(0xffffff, 0.3); g.fillRect(x - 30, y - 80 + (t * 7) % 80, 60, 1); }
  return { vis: clamp((p - 0.6) / 0.12) * (p < 0.85 && t % 5 === 0 ? 0.4 : 1), dy: 0, sc: 1 };
}

/** POP LINES: the black panel, the chalk figure drawing itself, the dashes, the flood of colour. */
function chalkMural(g, x, y, p, t) {
  const up = ease(p / 0.12), draw = clamp((p - 0.12) / 0.38), fill = ease((p - 0.5) / 0.15), gone = ease((p - 0.68) / 0.25);
  const W = 70, H = 96 * up, X = x - W / 2, Y = y - H - 4, al = 1 - gone;
  if (al <= 0) return { vis: 1, dy: 0, sc: 1 };
  g.fillStyle(0x6a6a6a, al); g.fillRect(X - 4, Y - 4, W + 8, H + 8);
  const cols = [0xe8281e, 0xffd21e, 0x1e64d8, 0x2ec850];
  if (fill > 0) for (let i = 0; i < 4; i++) { g.fillStyle(cols[i], al); g.fillRect(X, Y + H * (1 - fill) + i * H / 4 * fill, W, H / 4 * fill + 1); }
  g.fillStyle(0x0a0a0a, al * (1 - fill)); g.fillRect(X, Y, W, H);
  if (up >= 1) {                                                                   // the chalk figure, a stroke at a time
    const cx = x, top = Y + 14, lines = [[0, 22, 0, 52], [0, 30, -16, 22], [0, 30, 16, 20], [0, 52, -12, 76], [0, 52, 14, 76], [-10, 4, -16, -6], [10, 4, 16, -6]];
    const col = fill > 0.5 ? 0x000000 : 0xf4f4f0, n = draw * lines.length;
    g.lineStyle(3, col, al);
    if (draw > 0) g.strokeCircle(cx, top + 12, 9 * Math.min(1, draw * 6));
    for (let i = 0; i < lines.length; i++) {
      const f = clamp(n - i - 0.8); if (f <= 0) break;
      const [a, b, c, d] = lines[i]; g.lineBetween(cx + a, top + b, cx + a + (c - a) * f, top + b + (d - b) * f);
    }
    if (draw >= 1) for (let i = 0; i < 10; i++) {                                    // energy dashes popping out
      const q = i / 10 * Math.PI * 2, r0 = 34 + (t % 12), r1 = r0 + 8;
      g.lineBetween(cx + Math.cos(q) * r0 * 0.7, top + 40 + Math.sin(q) * r0, cx + Math.cos(q) * r1 * 0.7, top + 40 + Math.sin(q) * r1);
    }
    g.lineStyle(0);
  }
  return { vis: clamp((p - 0.62) / 0.12), dy: 0, sc: 1 };
}
