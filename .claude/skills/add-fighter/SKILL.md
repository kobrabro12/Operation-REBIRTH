---
name: add-fighter
description: Add a new playable fighter to Operation REBIRTH (def file, sprites, loading, roster, costumes, lore, voice) or wire up a new special move. Use when Mason asks for a new character or a new kind of special.
---

# Add a fighter

Read `DESIGN.md` §2–§9 for the rules a fighter plugs into. Don't read `Fighter.js` whole: grep for the
`st_<state>` you need. Use `soulSummoner.js` as the template; it's the cleanest def.

## 0. Ask Mason first (one message, only what's missing)
- id (kebab-case, e.g. `ember-witch`), display name (CAPS), short concept and archetype (zoner, rushdown...)
- the four specials (neutral / side / up / down) and the Limit: one line each
- sprites: does he have sheets ready? Frame size, and where the feet sit in the frame?
- weight and mobility feel compared with the existing three (Soul Summoner 1.0, Mr Wake 0.95, Lacy 1.0)

Then build with **placeholder** numbers copied from the closest existing fighter, and say which are placeholders.

## 1. Def file: `src/fighters/<camelName>.js`
Export `const <UPPER_NAME> = { ... }` with:
- `id`, `name`, `sheets: { idle, run, jump, fall, moves, ... }` (texture keys, prefix 2–4 letters, e.g. `ew_idle`)
- `originY` (feet row / frame height), `originX` if not centred, `movesOrigin`, `handOffset`, `portrait` crop,
  `body: { w, h }`, `headTop`, `fxColor`, `pal`
- stats: `weight, walkSpeed, runAccel, groundFriction, airSpeed, airAccel, airFriction, jumpV, shortHopV, doubleJumpV`
- `moves`: `jab ftilt utilt dtilt nair fair bair uair dair grab throws{forward,back,up,down}` plus specials
- `limit: { name, type, ... }`. `type` picks the code: no type = beam (`fighterLimit.js`), `undertow`, `blade`.

Hit format: `{ from, to, box: [x, y, w, h], dmg, angle, base, growth, stun? }`. Boxes are relative to the
feet, facing right, with negative y = up. Keep the file data-only, with a one-line plain-English comment
above each move saying what it does in game terms.

## 2. Specials
Existing special states you can reuse by giving the def the same keys (check the other defs for the shape):
| Mechanic | Def key | Code |
|---|---|---|
| charged projectile | `fireball` | `fighterSpecials.js` st_charge / releaseFireball, `entities.js` Fireball |
| projectile spawned on a frame | `neutralB.orb`, Mr Wake `sideB` | `entities.js` VoidOrb / EnergyBolt |
| summon | `summon` | st_summon, `entities.js` Soul |
| counter | `counter` | st_counter / counterHit |
| thrown weapon | `sideB` (Lacy) | st_swordthrow, ThrownSword |
| chargeable swing | `neutralB` (Lacy) | st_swingcharge |
| up-special jet / spin / rocket | `upb` with `jet`, `spin` or `riseV` | st_upb, jetUpB, spinUpB |
| ground puddle | `downB.pool` | spawnPool |
| curse / possession | hit `possess: ticks` | Fighter.possess |

A genuinely new mechanic means a new `st_<name>` method in `src/fighters/fighterSpecials.js` (or a
new `fighter<Topic>.js` mixin added to the list at the bottom of `Fighter.js`), plus routing from
`tryCommon()` in `Fighter.js`. Add a new projectile class to `entities.js` and a `spawnX` method to `MatchScene.js`.
For a new Limit type, add a `<type>Limit()` method in a new `limit<Name>.js` and route it in `st_limit`
(`fighterLimit.js`).

## 3. Art
- Sheets go in `public/assets/fighters/<id>/` (`idle_sheet.png`, `run_sheet.png`, `moves_sheet.png`, ..., `icon.png`).
- If the art is generated, add `tools/sprites/<name>_moves.py` that also writes `src/fighters/<xx>Moves.js`
  (`move: [firstFrame, count, ticksPerFrame, loops?]`). That file is generated: never hand-edit it.
- Hook it up with `moveAnims: XX_MOVES` and `frameCounts` in the def.

## 4. Wire-up checklist (every one is needed)
- [ ] `src/scenes/BootScene.js`: `load.spritesheet` for each sheet (key, path, frameWidth/Height)
- [ ] `BootScene.js`: add the id to the `icon_` list **and** the `voice_` list
- [ ] `src/fighters/roster.js`: import the def, add `{ id, name, def, available: true }` to `ROSTER`
- [ ] `src/fighters/skins.js`: `SKINS['<id>']` costume list (at least a DEFAULT) and colour groups if recolourable
- [ ] `src/data/lore.js`: `FILES['<id>']` dossier (no, alias, cls, weapon, origin, moves, limit, lore)
- [ ] `src/progress.js`: add the id to the `?kos=` test list
- [ ] voice line `public/assets/audio/voice/<id>.ogg/.mp3`: `python3 tools/audio/announcer.py <model> <voices> <id>` (Mason may record his own with `my_voice.py`)
- [ ] `src/ai/cpu.js`: check that the CPU uses the new specials sensibly (it reads `def.moves`)
- [ ] `DESIGN.md` §9: add the fighter; `CLAUDE.md` fighters list

## 5. Verify
```
npm run sim -- --fighters <id>,soul-summoner --matches 5
npm run sim -- --smoke
```
No errors, matches finish, and damage dealt is in the same range as the others'. Then ask Mason to
playtest feel (`npm run dev`): the sim can't judge how it looks.
