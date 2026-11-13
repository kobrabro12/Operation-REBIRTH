# src/ui/ — menu look and HUD

The "bold arcade" kit every menu is built from.
The root `AGENTS.md` (rules, stack, map) applies too. Keep this file up to date when you change what it describes.

## Menu look ("bold arcade")
Files: `src/ui/arcade.js` (the kit), `src/ui/listScreen.js`, `src/ui/button.js`

Every menu is built from one kit so the game reads as one thing: `ArcadeBg` (moving backdrop in the screen's colour - call `.update(t)` every frame), `titleBanner` (slanted title plate top-left, slides in, breadcrumb beside it), `panel` / `tab` (slanted panels, hard shadows, colour along the bottom), `rowBar` (the picked row: slanted colour bar + chevron, grows in), `hintBar` (the bottom strip: turns the old plain hint string into key chips - entries split on 3+ spaces, leading key-like words become chips), `slant` (the basic parallelogram), `pixIcon` (chunky icons: files, flask, shop, trophy, dummy, pad, bulb, star, back, speaker, crt, touch, screen). Section colours in `ARC.sections` (fight red, options blue, other green, trinkets purple, shop gold, files pink, test lime, achievements gold, stage orange, title cyan). `ListScreen` = the list-left / details-right layout (TRINKETS, OTHER: big icon per entry). `deathCard.js` = the boss DEATH CARD, the whole of BossReward's defeat screen (painted portrait, quote, tip, costume line, progress line) (see src/scenes/AGENTS.md BOSS FIGHTS). `makeButton` draws a slanted plate behind the Text (`t.plate`, follows it every frame; MatchScene.addUI registers the plate too). Layering: static panels at depth -10, cursors -5, text 0, backdrop -20.
