# Operation REBIRTH — notes for agents (Claude, Codex, …)

Read this first. It replaces exploring the repo. Only open the files a task actually touches.
Game rules and numbers: `DESIGN.md`. Recipes: `.claude/skills/` (add-fighter, add-stage, add-item).
Folders with more detail have their own `AGENTS.md` - `src/fighters/`, `src/stage/`, `src/scenes/`, `src/ui/`, `src/items/`, `src/audio/`, `tools/sprites/` - read the one for the folder you're working in (Claude Code loads it by itself: each folder's `CLAUDE.md` imports it).

## What it is
2D pixel-art platform fighter (Smash-style) for the browser. Up to 4 fighters, CPUs fill empty slots.
Keyboard + gamepad + touch. Stages float in the sky with hazards; items drop mid-match. Stock and Stamina modes.
Owner: Mason (artist; does the sprites and design). Live build: https://kobrabro12.github.io/Operation-REBIRTH/

## Stack
- **Phaser 4.2.1** from npm, bundled into its own chunk; `src/phaser-global.js` (main.js's first import) sets the global `Phaser` the game's files use, so don't import it elsewhere. Vite 6 for dev/build. The pixel font is self-hosted (`src/fonts/`). No CDN or Google Fonts requests: the game is fully same-origin.
- Plain ES modules, no TypeScript, no framework.
- `npm run dev` → http://localhost:5173. `npm run build` → `dist/`, then rewrites dist's PNGs as exact palette PNGs (same pixels, ~60% smaller; `tools/build/optimize-png.mjs`, ~1 min). `SKIP_PNG_OPTIMIZE=1 npm run build` skips it. Sources in `public/` are never changed.
- **Audio rule:** add sounds as `.ogg` in `public/assets/audio/` (`ffmpeg -i x.wav -c:a libvorbis -q:a 4 x.ogg`); never commit an `.mp3` - the build makes it (ffmpeg comes with `npm install`, via ffmpeg-static; `SKIP_MP3=1` skips the step).
- **Images rule:** add art as PNG in `public/assets/` and reference it by its `.png` path; the build picks the format. 256 colours or fewer → exact palette PNG. More (painted art like `assets/souls/`) → the build also writes a lossless `.webp`, same pixels (`tools/build/webp.mjs`), and `src/webp.js` makes Phaser load it instead. Not lossy: the soul art's half-transparent pixels become solid in-game and lossy WebP visibly changes them. Supply art near the size it's shown at (the soul art is ~13x bigger than its 96 px portraits). Never commit hand-converted `.webp`/`.jpg` copies or point code at them. `npm run images` lists what each rich image becomes; `SKIP_WEBP=1` skips the step.
- Every push to `main` auto-deploys to GitHub Pages (`.github/workflows/deploy-pages.yml`). Treat `main` as live.
- **Preview builds (Vercel):** `vercel.json` makes Vercel build the game exactly like `npm run build` (same PNG/WebP/MP3/offline steps). With the repo linked in Vercel, every branch and PR gets its own playable URL (the Vercel bot comments it on the PR), so a change can be played before it's merged. Previews never touch the live GitHub Pages game.
- **Offline play / updates:** `npm run build` ends with `tools/build/sw.mjs`, which writes `dist/sw.js` (from `tools/build/sw-template.js`: every dist file + a hash of its contents). Players' browsers keep every file the game has loaded and play offline; a new deploy downloads in the background and the title shows UPDATE READY - RESTART (U) (`src/pwa.js`, `TitleScene`). Off in `npm run dev`, the sim and tests; `?sw=1` forces it on, `?sw=0` removes it from a browser. Never cache-bust asset URLs by hand - the hashes do it. Test: `tools/tests/offline.mjs`.
- The claude.ai playable copy (artifact https://claude.ai/artifact/NHrURDJbV2b8DbjmBdbJ1T) is the whole game: `SKIP_MP3=1 npm run build && python3 tools/claude-copy/build.py OUT_DIR` packs every file under `dist/assets/<folder>/` into ~2.5 MB bundles (`packs/pNN.wasm` - .wasm only because the artifact server accepts that extension) and adds `pack-shim.js`, which serves the game's image/audio/video/XHR/fetch requests from them as blob: URLs (bundles download when first needed). About 75 files against claude.ai's 511 limit; publish with mode replace for the first ~60 MB, then patch the rest (64 MB per publish).

## Rules for every change (run them yourself while working - don't wait for CI)
- **`npm run check` before every commit**: lint (0 errors; `eslint.config.js` - real bugs only, plus no `Date.now()` / `performance.now()` / `new Date()` in match logic), the docs rule and the asset rules for what you changed. Fix what it reports; don't skip it. After gameplay changes also `npm run sim -- --smoke`; before a PR `npm run check:full` (adds build, download budget and every test in `tools/tests/`). CI (`.github/workflows/checks.yml`) runs all of it on each pull request and weekly on the whole game.
- **Docs rule (progressive)**: every NEW function, method or class (3+ lines, or exported) gets a `/** ... */` doc block above it: what it does in game terms, non-obvious parameters, what it returns or changes. Old code isn't checked; when you change an old function, add its doc block while you're there. `npm run check:docs` enforces it for new code. Tunables keep their short `//` line.
- **Assets rules** (`npm run check:assets` checks new/changed files; `-- --all` reports the whole game): images are PNG (the build makes palette PNGs / lossless WebP - see the images rule above), no side over 4096 px (split big sheets), a PNG over 2 MB needs to be smaller or split; audio is **OGG only** (code still asks for `['x.ogg', 'x.mp3']`: the build makes each MP3 copy for Safari from the .ogg - `tools/build/mp3.mjs`, cached in `node_modules/.cache/rebirth-mp3`, and the dev server makes one on request; git ignores `.mp3` in `public/`, so a script that writes one is harmless, but an MP3 with no .ogg would never ship), never WAV, at most 160 kbps and 48 kHz (tools/audio/*.py output is fine); a new music file must be added to `TRACKS` in `src/audio/music.js`. Generators in `tools/` must write files that pass.
- **Soul portraits are baked**: the soul pictures in `public/assets/souls/` (1254-2172 px) are only ever shown as 96 px portraits, so the game loads pre-made sheets from `public/assets/souls/baked/` instead (`SOUL_ATLASES` in `src/souls/portraits.js`). After changing a soul picture or that list, run `npm run bake:souls`; `check:assets` fails if you forget, and `tools/tests/soul-portraits-baked.mjs` checks the sheets match. New soul art that becomes 96 px portraits goes in `SOUL_ATLASES`, not as a new full-size load in BootScene.
- **Download budget**: `npm run build && npm run check:budget` compares what players download (by kind) with `tools/check/budget.json`. Over a limit = shrink what you added, or raise that limit in the same commit and say why.

## Core rules (from `src/config.js`)
- 640×360 view, fixed 60 fps step. **All speeds are pixels per frame**, all timings are frames.
- `PHYS`: gravity 0.42, maxFall 6.5, fastFall 9.5, hitstun = 4 frames per unit of knockback, tumble above kb 6.
- Blast zones: x ±600, top −380, bottom 320. Coordinates centred on the stage, +y is down.
- Knockback = `base + growth * (target % after hit) / 100`. Angle 0 = forward, 90 = up, >90 = backward, <0 = down.
- Limit gauge fills to 100 from damage taken, then O fires the fighter's Limit super.
- CPU difficulty table: `DIFFICULTY` in config.js.

## Map — where things live
| Area | File(s) | Notes |
|---|---|---|
| Fighter **data** | `src/fighters/soulSummoner.js`, `mrWake.js`, `heroKnight.js` | Stats, hitboxes, specials, limit. Balance changes go here. |
| Move anim frame tables | `ssMoves.js`, `mwMoves.js`, `hkMoves.js` | **Generated** by `tools/sprites/*_moves.py` — don't hand-edit. |
| Fighter **core** | `src/fighters/Fighter.js` (~450 lines) | Constructor, `step()`, ground/air states, `tryCommon()` (which input starts which move), attacks, `activeHitboxes()`, `physics()`, collision, KO/respawn. Mixes in the files below. |
| Fighter topics | `src/fighters/fighter*.js`, `limit*.js` | Each is a class whose methods get attached to `Fighter.prototype`. A method name may only exist once across them (it throws on load if not). Which file holds what: `src/fighters/AGENTS.md`. |
| Projectiles/souls/minions | `src/fighters/entities.js` | |
| Roster / select grid | `src/fighters/roster.js` | Add fighter = import def + entry in `ROSTER`. |
| Costumes / palettes | `src/fighters/skins.js`, `common.js` | |
| Sprite loading | `src/scenes/BootScene.js` | Every sheet key + frame size is registered here. Sheets listed in `src/mobileAtlasManifest.js` load as packed, trimmed atlases (`assets/mobile/`) on **every** device (`installMobileTextures` in `src/mobileTextures.js`; `?atlases=0` loads the full grids to compare): about a third of the memory. A new big moves sheet should get an atlas entry too. **Costume strips load per match**: every key in a def's `costumeSheets` (and its forms', e.g. FULL AERO / SEEN / the tank) except `idle` is only registered at boot and loads in `MatchScene.preload` / `WinScene.preload` / the shop PREVIEW, then the next match drops the ones nobody wears (`src/fighters/lazySheets.js`; `?lazySheets=0` loads all at boot). So: menus may only use a costume's `idle`; anything else that shows a costume's other strips must call `queueSheets` (in preload) or `await ensureSheets(...)` first. Tests that start a match wait for `scene.isActive('Match') && fighters`, not a fixed sleep. |
| Match loop, hits, KOs | `src/scenes/MatchScene.js` | |
| Stages | `src/stage/<name>Stage.js`, list in `stages.js` | Hazards use `HazardCycle` (`hazardCycle.js`): stage defines `start_<kind>` / `step_<kind>`. Every stage, its hazards, tunables, music and unlock: `src/stage/AGENTS.md`. |
| Items | `src/items/items.js` | Soul Heart, Limit Orb, Cursed Skull, Swift Feather, Star Candy, Mystery Box. Details: `src/items/AGENTS.md`. |
| CPU AI | `src/ai/cpu.js` | Presses buttons on a `Controller` like a human. |
| Input | `src/input/controllers.js`, `touch.js` | |
| HUD | `src/ui/hud.js` | Slanted player plates (name tab, big %, slanted stock pips, a slanted Limit bar with quarter ticks). |
| Menu look ("bold arcade") | `src/ui/arcade.js` (the kit), `src/ui/listScreen.js`, `src/ui/button.js` | Every menu is built from one kit so the game reads as one thing. Details: `src/ui/AGENTS.md`. |
| Audio | `src/audio/` (sfx, music, announcer); files in `public/assets/audio/` | Music/voice generated by `tools/audio/*.py`. Music (`bgm_<name>`) streams from an `<audio>` element when played, never loaded at boot: a new track = its name in `TRACKS` in `music.js`. |
| Menus + SHOP | `src/scenes/*Scene.js`, `menuInput.js`; training mode in `training.js` | Shop items in `src/data/shop.js`; the shopkeeper, his secret codes and takeovers, coins, gacha: `src/scenes/AGENTS.md`. |
| Arrival intros | `src/scenes/fighterIntros.js` | `src/scenes/AGENTS.md`. |
| Win cutscenes | `src/scenes/WinScene.js` | `src/scenes/AGENTS.md`. |
| Costume outros | `src/scenes/winSkins.js` | `src/scenes/AGENTS.md`. |
| Shop costumes | `tools/sprites/shop_costumes.py` (+ helpers `costume_kit.py`) | `tools/sprites/AGENTS.md`. |
| Voice lines | `src/data/voiceLines.js`, `src/audio/voiceLines.js`, files `public/assets/audio/voice/custom/` | Mason's own lines from the VOICE STUDIO; how to add them: `src/audio/AGENTS.md`. |
| Trophy Hall | `src/scenes/TrophyHallScene.js`, slots `src/data/trophyHall.js` | Trinkets > TROPHY HALL: a 3D marble gallery you walk - 24 pixel paintings, 4 animated masterpieces, 15 trophies (14 earned, `TROPHY_GOALS` in achievements.js; 9 for beating each boss on NIGHTMARE), and the ACHIEVEMENTS (its ledger / Q); `src/scenes/AGENTS.md`. |
| Boss fights | `src/data/bosses.js` (bosses, `TIERS`, rewards, saves `rebirth.bosses`), arenas `src/stage/bossBase.js` + `steamBossStage.js` / `polyBossStage.js` / `demonBossStage.js` / `knightBossStage.js` / `machineBossStage.js` / `humBossStage.js` / `smudgeBossStage.js` / `jackpotBossStage.js` / `maestroBossStage.js`, scenes `BossFightsScene.js` / `BossRewardScene.js` | Trinkets > BOSS FIGHTS: 9 bosses (all open from the start, each with a camera-shot entrance + freeze-frame name card, and a taunt when you lose; THORNWARD can only be hurt through his soul) on NORMAL / HARD / NIGHTMARE; a boss fight is a MatchScene match with `data.boss`. Sim: `npm run sim -- --boss all:0`. `src/stage/AGENTS.md`, `src/scenes/AGENTS.md`. |
| Achievements | `src/achievements.js` (`ACHIEVEMENTS` list - each `{ goal, have(stats), coins }`, lifetime `stats` saved as `rebirth.stats`, unlocked as `rebirth.ach`; `recordMatch` from MatchScene.toResults, `stat()` for taunts/limits/shop actions; `checkAchievements()` pays coins and returns new ones), banners `src/ui/toast.js`, page `AchievementsScene.js` (opened from the TROPHY HALL's ledger or Q: cards + PROGRESS page with stats, completion %, each fighter's record and next milestone) | Test: `?ach=reset`. Checked on Results, in the shop, and when the page opens. |
| Save/progress/unlocks | `src/progress.js`, `src/settings.js` | |
| Lore text | `src/data/lore.js` | |

## Fighters (current)
- Soul Summoner (`soul-summoner`, keys `ss_*`), Mr Wake (`mr-wake`, `wake_*`), Lacy / Hero Knight (`hero-knight`, `hk_*`), NU (`nu`, `nu_*`) and AERO (`aero`, `aero_*`) - NU and AERO graduated from TEST FIGHTERS with the beach costumes SURF ROCK / TIDE POOL and a one-time HERE COME NEW CHALLENGERS banner on the select screen (`SelectScene.newChallengers`); test fighters (`TEST_ROSTER` in `roster.js`, Trinkets > TEST FIGHTERS, never on the select grid): WHAT ONCE WAS, ROSEMARY (`last-seen`), FISTS, YOUNG LINK, THE DEVOTED (`devoted`, WIP), THE GREAT PRESTO (`presto`, a stage magician) and CHEF ROUX (`chef`). Sheets, frame sizes, mechanics and costumes of each: `src/fighters/AGENTS.md`.
- Every fighter has a taunt (`def.taunt`, 1 key / stick click); training hotkeys are 2–7, plus 8 / 9 for debug recording.

## How to add things
**A move / rebalance:** edit the `moves` object in the fighter's def. Hit format:
`{ from, to, box: [x, y, w, h], dmg, angle, base, growth, stun? }` — box relative to feet, facing right.
**A fighter / stage / item:** follow the skill in `.claude/skills/` (full wire-up checklist).
**Art/sound:** generator scripts in `tools/` (Python) write into `public/assets/`; rerun the script rather than editing PNGs.

## Testing: `npm run sim`
Headless all-CPU matches, ~0.3 s per minute of game time (`tools/sim/sim.mjs`). Needs Chrome or Edge installed.
- `npm run sim -- --smoke` → every stage, fighter and costume. Run after any gameplay change. Exit code 1 on errors.
- `npm run sim -- --fighters soul-summoner,mr-wake --stage sky-sanctum --matches 10` → balance comparisons
- **Refactor check**: same seed = identical match. Save `npm run sim -- --smoke --json` before the change and
  compare it after (ignore `simMs`). Any difference means behaviour changed.
- Locked shop things (costumes, STALINGRAD...) are left out of the smoke unless the save owns them (`rebirth.shop`).
- Keep game logic on `Math.random()` (the sim seeds it) and frame counts, never `Date.now()` or real time.
- The sim can't judge looks or feel: ask Mason to playtest anything visual.

## Debug recordings (bug reports with a replay)
- TRAINING → **8 RECORD FOR DEBUGGING** restarts the training match recording (or `?debug=1` records every match). While recording: **8** marks a bug (screenshot + an optional note), **9** saves `rebirth-recording-<date>.zip` (`recording.json` + `shots/`, a screenshot every 2 s for the last 3 minutes and one per mark; the README inside lists the marks). Code: `src/debug/recorder.js`.
- **When someone hands you a recording zip**: read `README.txt` and `recording.json` (`marks`, `errors`, `fighters`, `setup`), look at the mark's screenshot, then `npm run replay -- file.zip` (add `--at f1,f2` to picture other frames, `--until N` to stop at mark N). It replays frame for frame and prints each fighter's state + a picture at every mark, so you can reproduce the bug, add logging, and re-run. If it says DIVERGED, check `game.commit` against `git log` (the game changed since) or look for real-time / timer use in match logic.
- It replays because match logic uses only frame counts and `Math.random`, and during recording `Math.random` gives logic (create, every tick, training buttons) a seeded stream while drawing and Phaser's own effects get a separate one. Keep it that way: no `Date.now()` / timers in match logic (lint enforces it), and anything a recording must repeat that happens outside `tick()` has to be recorded as an event (see `TRAINING_ACTIONS`). `tools/tests/debug-recorder.mjs` records + replays a match and fails if this breaks.

## Working conventions
- Keep fighter files data-only; behaviour goes in Fighter.js / entities.js.
- Comment style: short plain-English line above each tunable explaining what it does in game terms.
- Commit messages: short, describe the player-visible change.
- Don't touch generated files (`*Moves.js` marked "do not edit by hand").
- **Where notes go:** details about one area go in that folder's `AGENTS.md` (a new stage in `src/stage/AGENTS.md`, a shop secret in `src/scenes/AGENTS.md`, ...); this root file keeps only rules, the stack and the map, so it stays short (it's read on every task). A new folder that needs notes gets an `AGENTS.md` plus a `CLAUDE.md` containing just `@AGENTS.md`.

## Current priorities / known issues
_(Mason: keep this list updated — it's the cheapest way to point Claude at the right work.)_
-
