// Moves every fighter shares unless their own data replaces them.
export const DEFAULT_GRAB = {
  grab: { frames: 26, fx: 'grab', grab: true, hits: [{ from: 5, to: 7, box: [4, -40, 28, 26] }] },
  throws: {
    forward: { dmg: 8, angle: 40, base: 4.0, growth: 4.6 },
    back: { dmg: 10, angle: 140, base: 4.2, growth: 5.0 },
    up: { dmg: 9, angle: 90, base: 4.0, growth: 4.8 },
    down: { dmg: 6, angle: 75, base: 3.2, growth: 2.6 },
  },
};

// Colours for a Limit beam (outline, deep, mid, light, core, sparks).
export const BEAM_BLUE = { outline: 0x0b1a33, deep: 0x076cc2, mid: 0x3f86d0, light: 0x78a0c6, core: 0xf0f2f3 };
export const BEAM_PURPLE = { outline: 0x1a0a2e, deep: 0x560c83, mid: 0x6d26bd, light: 0x9b5de5, core: 0xdab8fe };
