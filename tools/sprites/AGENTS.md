# tools/sprites/ — sprite generators

How fighter and costume art is generated from Mason's drawings.
The root `AGENTS.md` (rules, stack, map) applies too. Keep this file up to date when you change what it describes.

## Shop costumes
Files: `tools/sprites/shop_costumes.py` (+ helpers `costume_kit.py`)

The 13 shop costumes are their own drawings (skin `sheetSet`, sheets in `<fighter>/<costume>/`): Soul Summoner ECLIPSE (sun corona, sunburst crown, torn gold-trimmed cape) / AURORA (ice crown, aurora cape); Mr Wake VAMPIRE (flared collar, bat-winged staff, scalloped cloak) / SAKURA (blossom branch on the hat, blooming staff); Lacy OBSIDIAN (lava-cracked glass armour, horns, obsidian blade) / CYBERBLADE (chrome + circuits, visor, neon blade) - then `hero_knight_moves.py` (its COSTUMES list) builds their moves; NU VAPORWAVE (gradient shades, sunset print); AERO SUNSET (sunset dome, goldfish in shades). Second wave: Soul Summoner CELESTIAL (`celestial`: starfield cape, silver star crown, crescent moon behind his head), Mr Wake PLAGUE DOCTOR (`plague`: leather beaked mask, green goggles, caged lantern on the staff), Lacy WILDWOOD (`verdant`: bark-and-moss armour, leaf crown, green wooden blade), NU GLAM (`glam`: platinum/pink hair, lightning bolt, glitter gold jacket), AERO MIDNIGHT (`midnight`: night-sky dome with a moon, goldfish in a nightcap). Hidden (RIPHOOD code): Soul Summoner OLIVE DRAB (`olive`: steel helmet with netting as an extra part over the head, crown removed, chest webbing). Each has a SKIN_INTROS arrival. Puppet fighters: parts recoloured + drawn on, moves re-rendered; Mason's hand-made idle/run get the changes grafted on (`costume_kit.graft`).

- `kombat_costumes.py` builds ERMAC, RAIDEN, KITANA, SCORPION and SUB-ZERO on five different fighter rigs. Masks, hat, fan and armor are drawn into every strip; Sub-Zero also has `aero/subzero/king/` for FULL AERO. Rerun this script without regenerating move indexes.
