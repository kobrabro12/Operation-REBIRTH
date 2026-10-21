---
name: add-item
description: Add a new item (pickup that helps or hurts) to Operation REBIRTH, or change how items spawn. Use when Mason asks for a new item or item rules.
---

# Add an item

Everything is in `src/items/items.js` (~90 lines; read it whole). Rules are in `DESIGN.md` §7.

## 0. Ask Mason first (only what's missing)
- name (CAPS), helpful or harmful, the exact effect and how long it lasts
- picked up on touch (like the current items) or held/thrown? Held items are a bigger job: say so.
- an 8×8 pixel look, or a sprite he'll draw

## 1. Touch-pickup item (the current kind)
1. **Look**: add an 8×8 char map to `MAPS` (one string per row) and any new colours to `COLORS`.
   `makeItemTextures` builds `item_<key>` automatically and it's drawn at 2×.
2. **Register**: add the key to `TYPES` (all types are equally likely) and the display name to `NAMES`.
3. **Effect**: add a branch in `Item.apply(f)`. Turn the current `else` (the skull) into an explicit `else if`, so a new
   type doesn't silently become a curse. Give it a sound (`sfx('item' | 'curse', vol, pitch)`), a puff in
   its colour, and a popText colour.
4. **Timed effects** need a timer on the fighter:
   - add a field in the `Fighter` constructor (`src/fighters/Fighter.js`), e.g. `this.haste = 0`
   - count it down in `step()` next to `curse` / `slow`
   - apply it where it matters: the `speedMult` / `cursedMult` getters, or `applyHit` in `MatchScene.js` for damage and knockback
   - an aura is optional: drawing is in `src/fighters/fighterRender.js`
5. Stamina mode: decide what the effect means in HP (see how the Soul Heart branches on `m.mode`).

## 2. Spawn rules
`ItemSpawner`: the first drop comes after 420 ticks, then one every 600–960, with at most 2 on screen.
Each item lasts 900 ticks and blinks for the last 150. If item odds should differ, replace the uniform `TYPES`
pick with weights and note it in DESIGN.md.

## 3. Wire-up
- [ ] `DESIGN.md` §7 table
- [ ] CPU: `src/ai/cpu.js` doesn't go for items on purpose today. Mention this to Mason if the item would be pointless for CPUs.

## 4. Verify
```
npm run sim -- --matches 5            # items are on by default
npm run sim -- --smoke
```
No errors. To force your item while testing, temporarily set `TYPES = ['<key>']`, run the sim, then revert it.
