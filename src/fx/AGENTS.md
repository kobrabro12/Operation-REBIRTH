# src/fx/ — Sprite Fusion pixel VFX

Effects ported from Sprite Fusion's pixel-art VFX (https://www.spritefusion.com/pixel-art-vfx, MIT - keep the licence
line at the top of each ported file). The root `AGENTS.md` (rules, stack, map) applies too. Keep this file up to date.

- An effect is `{ update(dt), draw(frame, layer?), done() }`. It draws into two Uint32 pixel buffers (ABGR, little
  endian): `frame.color` and `frame.light` (added on top), through a frame `{ w, h, ox, oy, color, light }` = a box of the
  world (ox, oy = its top-left in world pixels). Ports use PX = 1: one effect pixel = one game pixel.
- `sfMovement.js`: "Dash & Blink". `movement({ kind: 'dash' | 'blink', actor, ... })`. DASH: `facing`, `distance`,
  `delay` / `time` (seconds), `grounded()` (dust / skid only on the floor). BLINK: `to` / `toY` (feet, world), `out` /
  `in` (seconds: when the fighter bursts into pixels / starts reassembling; it lands `in + 0.35` s), `colors` / `colors2`
  (8-colour ramps, `SF_PALETTES` DASH / ICE / ARCANE, `hex()` to make your own). `seed` keeps its own random stream (so
  it never touches the match's `Math.random`).
- `sfRunner.js`: `sfSpawn(match, fx, { x, y, w, h }, depth)` puts an effect in the world (two canvas textures, the light
  one ADD-blended); MatchScene steps every effect in `stepEffects` (`sfStep`) and clears them in `cleanup` (`sfClear`).
  `sfActor(fighter)` = `{ feet(), silhouette() }`: the effect reads the fighter's real current frame (flip and trim
  handled) to burst it into pixels or leave afterimages. An effect that throws is dropped - it can never break a match.
- `sfSlash.js` (our own, in the same style and on the port's machinery - sfMovement.js exports its `Px`, `Particles`, `dot`, `ringE`, colour helpers; plasma particles take a colour through `col`): `neonSlash` (a swept sword arc: white core, blade colour, a rim, light, plasma off the tip, shattering into twinkles), `neonCut` (a straight cut: hairline flash, splits open, sparks both ways, crumbles; `delay`), `neonImpact` (ring, star spikes, plasma), `glitchGhost` (an RGB-split afterimage of a fighter with scanlines and tearing rows; `.end()`), `neonRise` (a pillar of light shooting up off the floor: chevrons rushing up it, side sparks, twinkles off the top, a flat ring at its foot - VANTA's RISING MOON), `neonRamp(colour, hex)` (an 8-colour ramp from one colour).
- Users: VANTA (every swing, IAI, GHOST DASH = the dash, SAVE STATE = the blink, BLACKOUT - fighterVanta.js), LUMEN's STARBLINK (fighterLumen.js `aimBlink`), KAMI's PAPER CUT (fighterKami.js `startPaperCut`). The game's
  own logic (where the fighter is, when hits land) stays in the fighter's code and frame counts; the effect only draws.
- Sprite Fusion's site and MCP are blocked from Claude's sandbox: new effects come as the ZIPs Mason downloads into his
  Operation REBIRTH folder; port them the same way (plain JS, PX = 1, the licence line).
