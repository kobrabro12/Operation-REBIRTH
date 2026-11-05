// Phaser comes from the npm package and is bundled with the game (its own chunk, see vite.config.js),
// instead of a <script> from a CDN. The game's files use the global `Phaser`, so it's set here.
// main.js imports this file FIRST: imports run in order, so `Phaser` exists before any scene class
// is defined (`class X extends Phaser.Scene`).
import * as Phaser from 'phaser';

globalThis.Phaser = Phaser;
