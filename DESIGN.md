# Operation REBIRTH — Design

How the game works **right now**, written from the code. When code and this doc disagree, the code wins:
fix the doc. Sections marked **(decide)** are open design questions, not settled rules.

Units: everything runs at a fixed 60 ticks per second. Speeds are pixels per tick, times are ticks
(60 = 1 second), damage is %.

---

## 1. The match

| | |
|---|---|
| Players | 2–4. Player 1 is keyboard/touch (plus a pad); extra pads join on the setup screen; CPUs fill the rest. |
| View | 640×360, pixel art, camera zooms to keep every fighter on screen. |
| Modes | **Stock** (default 3 lives), **Timed Battle** (default 3 min, score = KOs − falls), **Stamina** (150 HP, KO at 0), **Training** (dummy, no KOs counted). |
| KO | Crossing a blast line: x < −600 or > 600, y < −380 (top) or > 320 (bottom). |
| Win | Stock/Stamina: last fighter standing ("GAME!"). Timed: best KOs − falls, ties go to lower %. |
| Start | "3, 2, 1, GO!" countdown (200 ticks). |

## 2. Damage and knockback

Every hit has `dmg`, `angle`, `base` and `growth`.

- **Damage** is added to the target's %, capped at 999. Cursed attackers deal ×0.7 (rounded, min 1).
- **Knockback** = `(base + growth × % / 100) / weight`, using the target's % *after* the hit.
  Stamina mode uses `40 + 50 × (HP lost / max HP)` in place of %, so low HP launches harder.
- **Angle**: 0 = straight forward, 90 = up, >90 = backwards, <0 = down (spikes).
  Spiking a grounded target pops them up at half strength.
- **Hitstun** = 4 ticks per unit of knockback (min 8), or the move's own `stun` value.
  Knockback above 6 makes the target tumble.
- **Hitstop** (freeze on impact) = 3 + dmg/2.5 ticks, max 14, applied to both fighters for melee hits.
- Launch speed decays by 0.075 per tick, and gravity is reduced to 35% while flying from a hit.
- Each swing gets a fresh attack id, so a hitbox hits each target at most once per swing.
  Multi-hit moves start a new id for each hit window.
- Getting hit refunds your double jump, up-special and air dodge.

## 3. Movement

Shared physics: gravity 0.42, max fall 6.5, fast fall 9.5. Per-fighter values (in the fighter's def):
`walkSpeed`, `runAccel`, `groundFriction`, `airSpeed`, `airAccel`, `airFriction`, `jumpV`, `shortHopV`,
`doubleJumpV`, `weight`.

- Jumpsquat 4 ticks; tap = short hop, hold = full jump; one double jump.
- Platforms: the main stage is solid; clouds/ledges are pass-through (hold down to drop).
- Inputs are buffered for 7 ticks, so an early press fires as soon as the fighter can act.
- A direction tapped within 6 ticks before attack = a smash attack (where the fighter has one).

## 4. Defence

- **Shield** (L): 60 HP, drains by 1.3 × the blocked damage, regenerates 0.12 per tick when not shielding.
  It breaks at 0 and leaves you dizzy for about 2.5 s. Blocking pushes you back and gives brief shield stun.
- **Roll / spot dodge** (L + direction on the ground) and **air dodge** (L in the air): intangible frames.
- **Ledges**: falling or recovering next to the main stage's edge grabs it. The first grab gives brief invincibility.
  From the ledge: toward the stage or up = climb, jump = jump up, attack = climb with an attack (7%),
  shield = roll onto the stage, away or down = let go.

## 5. Grabs and throws

Grab (I) only catches grounded targets. Throw by direction: forward, back, up, down; each fighter defines
throw damage and launch in `moves.throws`. Grabs ignore shields.

## 6. Limit (super)

- Every fighter has a Limit gauge (max 100) that fills by the damage **taken**. It doesn't fill while you're
  using your Limit. "LIMIT READY!" pops up when it's full; press O.
- The game freezes for 34 ticks (cinematic) and only the user moves. Other fighters' projectiles vanish.
- Limit types: `beam` (Soul Summoner, 50% total), `undertow` (Mr Wake, 45%), `blade` (Lacy).

## 7. Items

They drop every 10–16 s (first at 7 s), max 2 on screen, and disappear after 15 s (blinking for the last 2.5 s).
Walk over one to use it.

| Item | Effect |
|---|---|
| Soul Heart | −25% (or +25 HP in Stamina) |
| Limit Orb | +50 Limit |
| Cursed Skull | 8 s curse: ×0.6 speed, ×0.7 damage dealt |

## 8. Stages

Each stage has solid ground, pass-through platforms, spawn points, music, an announcer line, and **hazards**.
Most stages run their hazards through one shared rhythm (`HazardCycle`): one at a time, 10–14 s after the previous one ends
(the first comes 7–11 s in), each announced by a flashing CAUTION banner for 1.5 s. Sky Sanctum's lightning and Neon
Arcade's hazards use their own timers in the same spirit. Hazards can be turned off on the setup screen.

| Stage | Layout | Hazards |
|---|---|---|
| Sky Sanctum | flat island, 3 cloud ledges | lightning (warning flash, then strike) |
| Verdant Spires | jungle rock spires, shelf, temple roof, crag | geysers; rolling boulders |
| Gravemoon Bridge | stone bridge over a chasm, gargoyles | gargoyle gaze; bat swarms; breakable lantern sets the bridge on fire |
| Neon Arcade | giant arcade control panel | pixel wave, spin dash, block drop, invader raid |
| Elderwood Hollow | mossy root at a world tree; day turns to night | bramble snare; spirit stag charge |
| The Backrooms | a floor adrift in the Backrooms; every minute everyone NOCLIPs to the next of 4 levels (new background + floating platforms) | one per level: lights out (a Smiler lunges in the dark); falling crates; steam vents; the surge (a wave across the floor) |
| INFECTED.EXE | the taskbar of a giant old CRT, 3 window title bars above (the top one a red error dialog) | YOU ARE AN IDIOT (about 14 s; 20 big laughing pop-ups bounce around to its song, `sfx_idiot`; attacks don't close them); ILOVEYOU ("You've got mail!" - love letters rain and burst into hearts, then a second wave drops on each fighter); THE RED ROOM (the screen goes red under flashing Japanese - "welcome to the red room", "she's still alive", "it's your fault for doing this" - a crosshair follows one fighter, locks, and a red window slams down for 15%) |
| Aero Meadow | a grassy island on a block of aquarium glass; a mossy keyboard, a vine-wrapped CD player, a CRT monitor top (Frutiger Aero, old gadgets overgrown by nature) | CD SHOWER (glints in the sky, then two volleys of spinning CDs streak down at an angle, 6% each) |
| Baseplate 2012 | a studded green baseplate (an original homage to 2010-2016 block-building games) between a red and a blue sword-fight tower (their tops are ledges); a grey brick slides back and forth above (carries you); two jump pads fling you up; guests (Mason's drawing; 1 in 50 is his glitched one) spawn in and chat in the background; a blimp drifts by; music rotates Mason's three tracks | ROCKET BARRAGE (crosshairs, then rockets from the tower tops blow up on them, 13%); LOOSE BRICKS (shadows grow, bricks fall and tumble away, 9%); LAG SPIKE (the connection bars flicker, everything freezes, then everyone snaps back to where they were a second ago); THE BOULDER (a warning arrow, then a huge grey ball rolls the length of the plate, 14%) |

The stage grid has 10 slots, 2 across and 5 down (last = Random); 8 stages fill it, with one placeholder slot left.

## 9. Fighters

The select grid has 12 slots; 3 fighters are playable. Fighter files are **data only**; behaviour lives in `src/fighters/fighter*.js`.

### Soul Summoner — summoner / all-rounder (weight 1.0)
- **Neutral special**: fireball, hold to charge (full at 84 ticks), 4–16%.
- **Side special**: Soul Hex, a short-range curse. The target walks toward the nearest edge for up to 2.5 s; mashing breaks free sooner. 4 s immunity afterwards.
- **Down special**: summon a soul from the grave (max 2, 1 s cooldown). Souls bite enemies and can be destroyed.
- **Up special**: Soulfire Jet, steerable flame thrust. Burns those below, ends in a burst. Helpless after.
- **Limit**: Soulfire Beam, 5 holding hits + a launcher = 50%.

### Mr Wake — zoner, fights from the staff's gem end (weight 0.95)
Move numbers come from the designer's file `tools/sprites/mr-wake-reference.js`, converted by `convert()`.
- **Neutral special**: Void Orb, a slow swelling orb. Press again to detonate (pulls in 2×2%, explodes 9%); it also pops on contact or at the end of its flight (about 1.7 s).
- **Side special**: Drifting Soul, a slow projectile that curves toward a foe.
- **Down special**: Shadow Pool, a 4% splash. The puddle lasts 4 s and slows anyone in it for 2 s.
- **Up special**: Gem Rocket, blasts down and launches up. Helpless after.
- **Limit**: The Undertow. A flood across the main platform; anyone caught is chomped 5×6% and spat out for 15% (45%). Jumping avoids it.

### Lacy (`hero-knight`) — swordfighter (weight 1.0)
Only the jab and specials are fully designed; tilts and aerials have their own art but placeholder tuning.
- **Neutral special**: Grand Slam, a chargeable home-run swing (full charge 3 s). Always 20%; knockback grows with charge.
- **Side special**: Blade Toss. The sword spins in place (hits every 12 ticks), then returns. No attacks until it's back; special recalls it early.
- **Down special**: Riposte, a counter (guard up ticks 5–28). Strikes back for 1.2× the blocked damage (min 8%).
- **Up special**: Cyclone Slash. In the air she rises spinning, with four dragging hits then a launcher (helpless after). On the ground, hold to charge (up to 1 s) and release for one big spin all around her (9–16%).
- **Limit**: Thousand Cuts (`blade` cutscene).

## 10. Costumes and unlocks

- Each fighter has several colour variations, built by shifting hue/saturation/value of colour groups
  (`skins.js`), so shading survives.
- Some costumes swap whole sprite sets (Lacy: Samurai, Akatsuki, Battle-Worn).
- Some reshape effects and voice (`style`): `onebit` (terminal speech, glitch FX), `hero` (anime shouts, crystal blade),
  `rose` (petals), `samurai` (sakura, kanji, spin dragon).
- **Milestones**: every 25 KOs by a human with a fighter (25/50/75/100) unlocks one of four milestone costumes,
  saved in the browser. CPU, training and self-destruct KOs don't count. `?kos=N` in the URL sets the count for testing.
- Copies of the same fighter are told apart by costume, not tint.

## 11. CPU

CPUs press buttons on a virtual controller like a human. The difficulty settings (`DIFFICULTY` in config.js) are:

| | React (ticks) | Aggression | Shield chance | Accuracy | Mash |
|---|---|---|---|---|---|
| Easy | 26 | 0.35 | 0.08 | 0.6 | 0.08 |
| Medium | 14 | 0.6 | 0.22 | 0.8 | 0.18 |
| Hard | 6 | 0.85 | 0.4 | 0.95 | 0.32 |

## 12. Presentation

Pixel font "Press Start 2P", optional CRT filter, chiptune music per stage (generated by `tools/audio`),
an announcer voice for each fighter and stage, and a title screen with a live all-CPU demo match behind the logo.

---

## Design pillars (decided)
- **Every fighter plays completely differently.** No clones, no shared kits: each has their own mechanics
  (summons, possession, detonated orbs, a thrown sword, counters...). A new fighter should introduce at
  least one mechanic nobody else has.
- **Technical depth.** Characters reward practice: charge timing, setups (orb detonation, sword recall,
  souls), resource management (Limit, shield). Easy to start, with a lot to master.
- **Unique play styles.** Archetypes stay distinct (summoner, zoner, swordfighter...) and the roster keeps
  covering new ones rather than doubling up.

## Balance targets (decided)
- A typical **3-stock match lasts about 3 minutes** (4 players, CPUs on Hard).
- Fighters are usually **KO'd at around 120%**: a strong finisher (smash, back air, throw) at the ledge should
  kill around there, so the median damage at a KO should land near 120%.
- Measure with `npm run sim -- --matches 20 --stocks 3 --frames 72000`, which prints median KO % and match length.
- **Where it stands (Oct 2026, all-CPU sim):** KO % median about 117 (on target: Soul Summoner 119, Lacy 118,
  Mr Wake 112). Matches run about 90–115 s, Hard or Medium, 1v1 or 4 players: well short of 3 minutes. Damage piles up
  about 1.7× too fast for the target. (CPU-only matches likely run faster than human ones.)

## Notes
- Lacy is "she".
- Mr Wake's "Wake Bolt" was cut.

## Open design questions (decide)
- Lacy's tilt and aerial numbers (currently placeholders).
- Fighters 4+ and stages 6–7: planned names and concepts.
