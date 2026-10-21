# Operation REBIRTH

A 2D pixel-art platform fighter for the browser, built with Phaser 4 and modern JavaScript by an awesome artist.

## Run it locally

1. Install [Node.js](https://nodejs.org) (LTS).
2. In this folder run `npm install`, then `npm run dev`.
3. Open the address Vite prints (usually http://localhost:5173), click the game, press Enter.

## Test it

`npm run sim -- --smoke` plays short all-CPU matches on every stage with every fighter and costume, headless
and much faster than real time, and reports any errors. Needs Chrome or Edge installed. See `tools/sim/sim.mjs` for options.

## Controls

| Action | Keyboard | Controller |
| --- | --- | --- |
| Move | W A S D (W also jumps) | Left stick / D-pad |
| Jump | Space | X or Y |
| Attack | J | A |
| Special | K (hold to charge the fireball) | B |
| Shield / dodge | L (+ direction) | LT / RT |
| Grab | I | LB or RB |
| Limit | O | LB + RB together |
| Pause | Esc | Start |

**Soul Summoner specials:** K = fireball (hold to charge), A/D + K = Soul Hex (short-range curse: the target walks
toward the nearest edge for up to 2.5 s; mash any button to break free sooner), S + K = summon a soul, W + K = Soulfire Jet (flames under his feet blast him upward; hold A/D to steer).

**Ledges:** fall or recover next to the edge of the main stage to grab it (you're briefly invincible on the
first grab). Then: toward the stage or up = climb, jump = jump up, attack = climb with an attack,
shield = roll onto the stage, away or down = let go. Hold down while falling to not grab.

On the setup screen, press A on a controller to join as a new player, Y to control player 1, B to leave.

## Folders

- `src/` game code: `scenes/`, `fighters/`, `input/`, `ai/`, `items/`, `stage/`, `ui/`, `audio/`
- `public/assets/` sprite sheets and sound files the game loads
- `tools/` scripts that generate art and sound (`sprites/`, `audio/`)

## Play online

The game is published to GitHub Pages at **https://kobrabro12.github.io/Operation-REBIRTH/**.
Every push to `main` rebuilds and republishes it (see `.github/workflows/deploy-pages.yml`).
