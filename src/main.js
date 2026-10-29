// Operation REBIRTH - entry point.
import { VIEW_W, VIEW_H } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { OptionsScene } from './scenes/OptionsScene.js';
import { OtherScene } from './scenes/OtherScene.js';
import { TrinketsScene } from './scenes/TrinketsScene.js';
import { AchievementsScene } from './scenes/AchievementsScene.js';
import { FilesScene } from './scenes/FilesScene.js';
import { TestFightersScene } from './scenes/TestFightersScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { SetupScene } from './scenes/SetupScene.js';
import { StageSelectScene } from './scenes/StageSelectScene.js';
import { SelectScene } from './scenes/SelectScene.js';
import { MatchScene } from './scenes/MatchScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';
import { WinScene } from './scenes/WinScene.js';

const config = {
  type: Phaser.WEBGL,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0b0a14',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, MenuScene, OptionsScene, OtherScene, TrinketsScene, AchievementsScene, FilesScene, TestFightersScene, ShopScene, SetupScene, StageSelectScene, SelectScene, MatchScene, WinScene, ResultsScene],
};

// Wait (briefly) for the pixel font so text doesn't flash in a fallback font.
const fontReady = document.fonts ? document.fonts.load('10px "Press Start 2P"') : Promise.resolve();
Promise.race([fontReady, new Promise((r) => setTimeout(r, 2500))]).finally(() => {
  window.game = new Phaser.Game(config);
});
