# src/items/ — items

The items that drop mid-match.
The root `AGENTS.md` (rules, stack, map) applies too. Keep this file up to date when you change what it describes.

## Items
Files: `src/items/items.js`

Soul Heart, Limit Orb, Cursed Skull, Swift Feather, Star Candy. Textures drawn from char maps, except the SOUL HEART: Mason's 16-frame animated drawing (`tools/sprites/art/soul_heart.png`, a 4x4 grid on black -> `tools/sprites/soul_heart.py` -> `src/items/soul_heart_sheet.png`, 56x56 frames: each frame is snapped back to the drawing's own pixel grid (found per frame from where the colour changes), cut to one 14-colour palette, stray pixels cleaned, frames lined up on the heart, black made see-through, glow in stepped see-through levels), imported with `?inline` so it lives inside the JS bundle (no extra file for the 511-file artifact); `SOUL_HEART` = its size / speed / scale, anim `item_heart_anim` (BootScene loads it).
