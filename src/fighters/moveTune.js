// Shared normals: LUMEN, MADAME MOTH and KAMI are built on NU's puppet rig (tools/sprites/trio_moves.py), so their
// ground attacks and aerials are NU's animations - and NU's hitboxes fit them. Each def takes NU's normals through
// tuned() with its own feel (softer / harder hits, more or less knockback) and then adds its own specials.

const NORMALS = ['jab', 'ftilt', 'utilt', 'dtilt', 'dashAttack', 'fsmash', 'usmash', 'dsmash', 'nair', 'fair', 'bair', 'uair', 'dair'];

/**
 * A copy of the normals in `moves` (NU's) with every hit's damage x`dmg` (rounded, at least 1), its knockback
 * (base and growth) x`kb`, and boxes `reach` px longer forward. `fx` = a per-move effect name to swap in.
 * Returns { jab, ftilt, ... } - only the normals, never the specials.
 */
export function tuned(moves, { dmg = 1, kb = 1, reach = 0, fx = {} } = {}) {
  const out = {};
  for (const name of NORMALS) {
    const m = moves[name]; if (!m) continue;
    out[name] = { ...m, fx: fx[name] || m.fx, hits: (m.hits || []).map((h) => ({ ...h,
      box: [h.box[0], h.box[1], h.box[2] + (h.box[0] >= 0 ? reach : 0), h.box[3]],
      dmg: Math.max(1, Math.round(h.dmg * dmg)), base: +(h.base * kb).toFixed(2), growth: +(h.growth * kb).toFixed(2) })) };
  }
  return out;
}
