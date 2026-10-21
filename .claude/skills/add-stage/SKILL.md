---
name: add-stage
description: Add a new stage (layout, code-drawn art, hazards, music, select-screen entry) to Operation REBIRTH, or a new hazard to an existing stage. Use when Mason asks for a new stage or hazard.
---

# Add a stage

Read `DESIGN.md` §8. `src/stage/skyStage.js` is the smallest example; `arcadeStage.js` and `forestStage.js`
show `HazardCycle` with several hazards (`moonStage.js` and `spireStage.js` use it too; Sky Sanctum and Neon Arcade predate it and time their own hazards). Read one example, not all five.

## 0. Ask Mason first (one message, only what's missing)
- id (kebab-case) and NAME, theme, and the two-line blurb for the select screen
- layout: main platform width and any pass-through platforms, with rough positions
- hazards: what each does, roughly how it hurts or helps, and how players see it coming
- music: existing track, new generated track, or silence for now

## 1. Stage class: `src/stage/<name>Stage.js`
```js
import { HazardCycle } from './hazardCycle.js';

export class XStage {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [
      { x1: -280, x2: 280, y: 0, solid: true, bottom: 64 },   // main stage: solid, ledges at x1/x2
      { x1: -205, x2: -85, y: -92, solid: false },            // pass-through
    ];
    this.spawns = [{ x: -150, y: 0 }, { x: 150, y: 0 }, { x: -50, y: 0 }, { x: 50, y: 0 }];   // always 4
    this.hazardsOn = true;
    this.music = 'bgm_<key>';
    this.cycle = new HazardCycle(this, ['kindA', 'kindB'], { color: '#b4ee6a', stroke: '#16200c' });   // banner colours
  }
  draw(worldLayer, bgLayer) { /* build Graphics once, push to the layers (setScrollFactor < 1 = parallax) */ this.cycle.makeBanner(this.scene); }
  step(match) { /* animate */ return this.cycle.run(match, []); }   // returns hazard hitboxes; run() respects hazardsOn
  start_kindA(match, h) { h.title = 'KIND A!'; }
  step_kindA(match, h, out) { /* push {x1,x2,y1,y2,dmg,angle,base,growth,id:'kindA'+h.id,hazard:true}; return true when finished */ }
}
```
Rules:
- Coordinates: 0,0 is the centre of the main stage top, +y down. Blast zones are x ±600, y −380 / 320.
  Keep the main stage within about ±300.
- Hazard hitboxes need `hazard: true` (so shields and counters don't block them) and an `id`. Each target is
  hit once per id, so reuse the same id for one strike and change it for the next. Use `dirX` for moving
  hazards and `radial: true` for explosions.
- Draw all art in code from a stage `PAL` palette: hard colour bands, no smooth gradients (16-bit look).
- Use `Math.random()` only in logic, never `Date.now()`, so `npm run sim` stays reproducible.
- Optional: `strikeTargets(match, hitboxes)` for breakable stage objects (see `moonStage.js` lantern).

## 2. Wire-up checklist
- [ ] `src/stage/stages.js`: import, then add `{ id, name, available: true, make, blurb: [2 lines], hazard: 'TEXT\nTEXT', preview }`
- [ ] preview function `drawXPreview(g, x, y, w, h)` exported from the stage file (select-screen miniature)
- [ ] music: `tools/audio/<name>_music.py` → `public/assets/audio/music/<key>.ogg/.mp3`, then
      `this.load.audio('bgm_<key>', ...)` in `src/scenes/BootScene.js`
- [ ] announcer: add the id to the `voice_` list in BootScene and generate the line with `tools/audio/announcer.py ... <id>`
- [ ] `DESIGN.md` §8 table; `CLAUDE.md` if anything new about the structure

## 3. Verify
```
npm run sim -- --stage <id> --matches 5
npm run sim -- --stage <id> --no-hazards --matches 2
npm run sim -- --smoke
```
Look for errors, fighters falling through the floor (lots of falls with little damage), or matches that
never end. Ask Mason to look at the art in `npm run dev`.
