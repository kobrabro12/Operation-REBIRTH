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
| Mystery Box | a gift box: opens into a random item, or TA-DA! - a burst of cards that hits every foe within 90 px (10%, `MYSTERY` in items.js) |

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
| Baseplate 2012 | a studded green baseplate (an original homage to 2010-2016 block-building games) between a red and a blue sword-fight tower (their tops are ledges); a grey brick slides back and forth above (carries you); two jump pads fling you up; guests (Mason's drawing; 1 in 50 is his glitched one) spawn in and chat in the background; a blimp drifts by; music rotates Mason's three tracks | ROCKET BARRAGE (crosshairs, then rockets from the tower tops blow up on them, 13%); LOOSE BRICKS (shadows grow, bricks fall and tumble away, 9%); LAG SPIKE (the connection bars flicker, everything freezes, then everyone snaps back to where they were a second ago); THE GRIEFER (a blocky troublemaker joins on a tower top and throws 6 pieces of classic gear at the players - a spinning sword 8%, a bouncing superball 5% a bounce, a timebomb that ticks then blows 14%, a soda can that bursts into fizz, a rocket 12% - then logs off); THE HACKER (a hooded exploiter in green code joins mid-air: flies across the plate twice in a spinning blur flinging anyone it touches 9%, then teleports two fighters into each other's places with green beams, then gets a red BANNED stamp and vanishes) |
| Fractured | a giant galaxy-crystal fragment adrift in deep space (Mason's GALAXY FRAGMENT gem, grown huge): a flat cut top, a cracked indigo underside with a galaxy glowing inside, 3 floating shard ledges, chips and far fragments bobbing, a nebula sky; music "Shattered Starlight" (123 BPM interstellar house). Locked until the GALAXY FRAGMENT is bought in the shop (EXTRAS, 1500 coins) | SHARD RAIN (four-point glints in the sky, then two volleys of crystal shards drop straight down, 7%); CRYSTAL SURGE (three cracks in the floor glow, then crystal spikes burst up out of them, 10%) |
| Masked Throne | a dark ruin in a purple void (from Mason's picture): a studded slate yard, two broken zigzag pillars as ledges, the king's floating stone palm up top; behind it a giant faceless stone king on a pedestal, sword raised, wearing the CROWN OF MASKS; pink crystal growths, a brazier, purple light leaking from cracks. **The whole stage is dark**: a darkness layer covers the screen and only the fighters' own glow, the brazier and the seams light it. Locked until the CROWN OF MASKS is bought (hidden in EXTRAS until the shopkeeper's code NOLI). Music: Mason's pixelated_audio 14 | THE KING'S SWORD (the statue's eyes light, a purple line marks a spot over a fighter, the sword falls out of the sky: 17%, then a floor shockwave both ways: 6%); COMEDY & TRAGEDY (two giant masks over each half for 10 s: under COMEDY you heal 1% every 22 ticks, under TRAGEDY purple tears fall, 4% each; they swap sides halfway); LIGHTS OUT (8 s: the dark closes in to a sliver of light round each fighter, eyes open in the dark) |
| The Underground | one floating stage deck over the mosh pit; a giant speaker stack in the middle and a big one either side (scenery, not platforms) with tonight's act on them - the rapper BLACKTOP or the band COFFIN NAILS, taking turns every fight; a giant ring of crowd round it all cheering, jumping and waving banners; its own opening (a room at street level, someone walks in, the camera sinks down into the cavern, the announcer calls the fighters, a flash to the act) | none |
| His Desk (secret boss arena) | his counter in his polygon world, the old till and a floating slab as ledges; HANZ & $@L floats on the desk with you, legs dangling, about three times your height, turned toward you like a fighter, and fights by mood - smug, furious, gloomy or laughing; in the last act THE STARFALL breaks his mask and he fights WHOLE under the night sky with five moves of his own; in every act he can also REWIND time (you're thrown back to where you were and your own past chases you), work you on strings like a MARIONETTE, or FOLD the room over like paper; one of the dimensions he shifts the room into is THE ESCAPE, a dreamcore pool room where he hides behind one of five doors - NO EXIT (idle in VS) | none |
| Brass Foundry (boss arena) | riveted iron deck in a steam foundry, two catwalks; THE CLOCKWORK COLOSSUS stands behind it (switched off in VS) | PIPE BURST (steam across the catwalks); CRANE DROP (a crate on a marked spot) |
| Polygon Peak (boss arena) | real low-poly 3D checkerboard arena in a 64-bit sky, two ledges, crystal pylons; KING POLYGON (his empty crown in VS). Faced by THE DEVOTED in CARTRIDGE he becomes LEGENDARY KING POLYGON after a cutscene (OUR FIGHT WILL BE LEGENDARY): obsidian and gold, more health, his own theme (Mason's pixelated_audio 22), new attacks (warp strike, shard storm, bad sector, twin cannons, cartridge crush, pixel vomit - corrupted floor that burns and slows; enraged: a bear-trap hand that squishes you for a lost life). At half health a mini cutscene (LET ME SETTLE THIS - fist slams, a snap) removes the ledges; beating him plays a finale (an anime-style exchange, her karambit in his eye, IN ANOTHER GAME..., he explodes into white), and the whole cartridge corrupts into a glitching void. Below 30% he plays BATTER UP: bats his own head at you (HOME RUN / POP FLY) while GLITCH TILES burn in the floor and two POLY BUMPERS float in | PYLON ZAP (arcs along both ledges); QUAKE RING (a floor shockwave - jump it) |
| The Burning Keep (boss arena) | castle battlement walk at night, two towers with braziers; KARNAX the horned demon fights on the walk (his sword planted in it in VS) | CATAPULT STONE (a boulder on a marked spot, then rolling); BRAZIER FLARE (the tower fires erupt) |
| The Elder Grove (boss arena) | a misty forest clearing between two giant trees whose roots hold up the ledges, a ruined archway, glowing mushrooms; THORNWARD the rootbound knight (his empty armour kneeling in VS). His armour is immune: hit his soul when it comes out to taunt you; below 25% it's bared for good and he goes BERSERK | THORN ROOTS (a line of thorns erupts across the floor); SPORE BURST (the mushrooms puff stinging spores) |
| The Desktop (boss arena) | a bedroom at dusk: the desk (on legs) is the floor, two wall shelves are the ledges; BEIGE.EXE (a snobby beige CRT with a monocle, a face and a giant cursor) sits on the desk and attacks with programs, paint sludge (slows you) and, when low, CDs from its tray. Fallen error windows become ledges; near the end it DIALS UP and goes ONLINE: junk-mail spam that homes in, ad banners scrolling across at three heights, and the snake game slithering out after you | POP-UP (a window falls on the mark and lies there as a ledge); DIAL-UP (a screeching modem beam sweeps a marked band) |
| The Blank Canvas (boss arena) | a stretched canvas over an endless 3D pattern that changes art style (sketch, pop art, cubism, impressionism, action painting), a palette and a sketchbook as ledges; SMUDGE, a kid with a paint bucket on his head (his MASTERPIECE: a charged dash - if it catches you, a brush-flurry cutscene and an exploding canvas for 50%) | DRIP (a drop of paint falls on a mark); SPILL (paint floods part of the floor and slows you) |
| The Grand Opera (boss arena) | an opera stage in a 3D horseshoe of gilded balconies; THE PHANTOM MAESTRO (a caped, half-masked opera ghost in a haunted house of floating candles and mist) splits into illusions (only the real one wears a rose), sings ghost notes at you, calls spectral hands up through the stage, dives from the rafters, throws roses that stun, vanishes into his cape to appear behind you, and throws a long punch sequence; the chandelier falls; at half health his mask shatters and the roof tears away; hazards sandbags and trapdoor smoke |
| Happy Hills (Lost Build) (boss arena) | the first level of an unreleased 16-bit platformer, played off a worn VHS tape (scanlines, a tracking band, PLAY > and a timecode, the game's own HUD in the corner): a checkered dirt island, striped hills, a smiling sun and clouds with faces, two rows of ? blocks as ledges. HOPPLE, its rabbit mascot (pixel art, twice your height, eyes that aren't always cartoon eyes) does a BIG HOP onto your shadow, drops an RPG text box on you and fires its letters, skips frames to appear behind you, sends his HUD life icons after you, cuts to a PLEASE STAND BY test card while spikes come up under the red X's, and rains bleeding coins, and sends his little cartoon FRIENDS after you. At half health THE LOST BUILD: a cutscene goes black - a MISSING poster of a little girl strobes out of the dark while YOU DID THIS TO HER fills the screen, then his gored face lunges at you - and the level comes back drowned in blood rain, the girl standing on the hills in the lightning, the ? blocks bobbing and bleeding; he's gored and adds RUN. (an all-fours charge), CREDITS ROLL (rising bars with one gap), HIDE AND SEEK (his eyes creep under the floor while he counts, then he bursts up), and an EMERGENCY BROADCAST (crawling text bars at floor / ledge height), DEBUG MODE (SOLID blocks that drop and lie as ledges) and IT SEES YOU (lights out, his face rises behind the hills - get on a ? block before the jumpscare bite). Death: GAME OVER, he falls to pixels, THANK YOU FOR PLAYING, the tape stops | STATIC (a column of static, then a shock); TRACKING ROLL (a band of bad tape rolls along the floor - jump it) |

The boss arenas (`bossArena` in stages.js) are where Trinkets > BOSS FIGHTS are fought (src/data/bosses.js); each opens for VS once its boss is beaten on HARD or NIGHTMARE.

The stage grid has 12 slots, 2 across and 6 down (last = Random); 11 stages fill it. A stage with `shop:` in stages.js is locked (padlock, can't be picked, never RANDOM) until that shop item is owned.

## 9. Fighters

The select grid has 12 slots; 6 fighters are playable (Soul Summoner, Mr Wake, Lacy, NU, AERO, GNASH). Fighter files are **data only**; behaviour lives in `src/fighters/fighter*.js`.

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

### GNASH (`gnash`, on the select grid) — heavy hitter (weight 1.2)
Mason's street punk kid: all-black clothes outlined in neon, a mask with neon X eyes, neon horns, and a giant black axe (longer than he is tall, a neon diamond in the blade) held in both hands and dragged along the floor behind him (and from his sketch, the zig-zag grin). Normals share NU's poses and timings, 5% more damage, 2% more knockback and hitboxes 10 px wider / 8 px taller (the axe's reach). Slow on the ground and in the air.
- **Passive — PSYCHO**: a meter on his player plate, beside his damage %, fills slowly from damage taken (x0.25) and dealt (x0.15), or by SEETHING (10 s from empty); it also shows over his head. Full = PSYCHO READY: the next special he uses becomes its PSYCHO version - a cinematic cut-in (about 1.2 s, everyone frozen, drawn like an old arcade game: a synthwave sunset and grid, his mask as a chunky pixel sprite, 1UP / HI-SCORE, PSYCHO! blinking, the move's name), then the special buffed (x1.45 damage, x1.25 knockback, nothing makes him flinch).
- **Neutral special**: SEETHE. Hold to roar and fill PSYCHO (empty to full in 10 s, up to 11 s a hold); a 4% shove as it starts. PSYCHO SCREAM: one neon shockwave round him (150 px, 18%).
- **Side special**: AXE THROW. The axe flies straight ahead (14%), drops and sticks in the floor; he is UNARMED until he walks over it (fists x0.6 damage, no side or down special; off the stage it comes back after 3 s). PSYCHO THROW: twice the size and speed, cuts through everyone (18%), blows up where it lands (14%) and flies back to his hand.
- **Up special**: SKYSPLITTER, a rising axe uppercut (8% then a 14% launcher). Helpless after. PSYCHO RISE: higher, inside a neon pillar that hits five times and launches.
- **Down special**: GROUND SPLITTER. Chops the floor (14%) and is thrown high into the air, hangs there for a second, then plunges axe first (12%) and slams: a shockwave hits everyone on that floor within 90 px (9%), and he bounces back up - higher the further he fell. PSYCHO METEOR: thrown higher, a longer charge, a 260 px shockwave (18%) with neon pillars.
- **Map costumes**: HIGH SCORE (NEON ARCADE), GRAVEMOON (GRAVEMOON BRIDGE) and INFECTED.EXE - each drawn after its stage, with its own idle, SEETHE animation, hit effects, arrival and win cutscene. And POP LINES (drawn like a Keith Haring figure: one flat colour, no face, heavy black lines) and EXECUTIONER (a hooded headsman with a broad iron axe), the same treatment.
- **Limit**: EXECUTIONER. Leaps, hangs over the nearest foe (a neon X), then drops: 32% and a huge launch where he lands, plus a 150 px shockwave (10%). Brings the axe back if it was thrown.

## 10. Costumes and unlocks

- Each fighter has several colour variations, built by shifting hue/saturation/value of colour groups
  (`skins.js`), so shading survives.
- Some costumes swap whole sprite sets (Lacy: Samurai, Akatsuki, Battle-Worn).
- Some reshape effects and voice (`style`): `onebit` (terminal speech, glitch FX), `hero` (anime shouts, crystal blade),
  `rose` (petals), `samurai` (sakura, kanji, spin dragon).
- **Milestones**: every 25 KOs by a human with a fighter (25/50/75/100) unlocks one of four milestone costumes,
  saved in the browser. CPU, training and self-destruct KOs don't count. `?kos=N` in the URL sets the count for testing.
- Copies of the same fighter are told apart by costume, not tint.
- **LOST** (the shop's last tab): the TRUE SHOPKEEPER, HANZ / $@L - one man split down the middle: $@L the left half
  (blood red, one devil horn: sneaky, quick to anger, foolish) and HANZ the right (pale grey: tired, sad, smart). A 3D
  low-poly figure (rendered in Blender in a PS1 look: low resolution, wobbly vertices, baked light, dithered colour)
  leaning over a counter in a dark, dreamlike surrealist room, in a noir spy trench with a ring collar. Left alone he
  fidgets: twitches, kicks his feet up on the desk, or takes his mask off (a black void with two pinprick eyes); stand
  there 30 s doing nothing and he holds out his dripping clock-heart and stares at it. Now and then $@L snaps his
  fingers: fire sparks off them and the whole room turns hand-drawn (ink and watercolour, an eye for a moon, a fish
  with a house on its back, stairs into a cloud) while he stays 3D - snap again and it's back. Or he CLAPS: polygon shards burst off his
  hands and the room becomes a low-poly world (a faceted vapour-sun dusk, a candy checkerboard plain, pyramids with an
  eye, a polygon whale swimming through the sky, a gem with an eye on his desk) - clap again and it's back. Poke him too often and he settles it: a SECRET BOSS FIGHT on his own
  desk on HARD - three acts in three worlds (polygons, ink, the void once he takes his face off), each with its own
  cutscene, and a death where he shatters. He lets slip the deep
  lore now and then (what MEMORIES are, the star that split him, the dream, the crown's two faces, the Star-Eater).
  Sometimes his whole body glitches apart and pulls itself back together, and he sighs. He never stands perfectly still.
  His shelf: 4 drawn costumes, 2 recolours (THIRTEEN, NOIR), THE WAITING DREAM and THE DRAWN ROOM themes, the
  THIRTEEN O'CLOCK track, and the extras SECOND OPINION, DOOR TO NOWHERE and THE EYE. After a sale he may cackle into his palm.
  Everything on his desk can be clicked: each thing has its own lines, several hint at the TV shopkeeper's secret
  codes, the till pays out once, the candle can be blown out. The room is dark
  until you type HANZ or $@L (the name decides who greets you first); after that he's unlocked for good. He sells, in
  MEMORIES (the same coins): SLEEPWALKER (Soul Summoner), MELTED HOUR (Lacy), ROOM IN A BOWL (AERO), TWO-FACED (GNASH),
  2500 each; the stage theme THE WAITING DREAM (1200); the extras SECOND OPINION (his head pops up after KOs with a
  comment) and DOOR TO NOWHERE (two doors on the stage that teleport you), 800 each. His things are never on the other
  shelves or in the gacha machines.

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
Six menu styles to pick from in OPTIONS (BOLD ARCADE, RETRO REWIND, BUBBLE BLAST, GRAFFITI, SLICK!, CORRUPTED CODE);
they change only the menus - a match looks the same in every one.

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
