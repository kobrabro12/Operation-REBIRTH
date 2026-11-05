import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});










 const openShop=()=>page.evaluate(async()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);await new Promise(resolve=>{window.game.scene.getScene('Shop').events.once('create',resolve);window.game.scene.start('Shop');});window.game.scene.getScene('Shop').openCode();});
 await openShop();await page.keyboard.type('physical media');await page.keyboard.press('Enter');await page.waitForFunction(()=>window.game.scene.isActive('Treehouse')&&window.game.scene.getScene('Treehouse').roomArt?.active);await page.waitForTimeout(150);
 const room=await page.evaluate(()=>{const s=window.game.scene.getScene('Treehouse');if(window.game.textures.exists('physical_media_room'))throw Error('Generated background still loaded');if(s.corners.length!==8||!s.input.keyboard.enabled)throw Error('Room or keyboard not initialized');return s.corners.map(c=>c.name);});await page.screenshot({path:'/workspace/work/treehouse-phone.png'});
 await page.waitForFunction(()=>window.game.scene.getScene('Treehouse').menu?.started);await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.game.scene.getScene('Treehouse').selected),0);await page.keyboard.down('Escape');await page.waitForTimeout(150);await page.keyboard.up('Escape');await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 // Repeat using only the shop's touch/gamepad keypad API, including SPACE.
 await page.evaluate(()=>{const s=window.game.scene.getScene('Shop');s.openCode();for(const letter of 'PHYSICAL')s.typeKey(letter);s.typeKey('SPACE');for(const letter of 'MEDIA')s.typeKey(letter);if(s.secret.typed!=='PHYSICAL MEDIA')throw Error('Phone phrase truncated');s.typeKey('OK');});await page.waitForFunction(()=>window.game.scene.isActive('Treehouse'));await page.evaluate(()=>window.game.scene.getScene('Treehouse').back());await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 await page.evaluate(()=>{const s=window.game.scene.getScene('Shop');s.openCode();for(const k of 'WRONGPHRASE')s.typeKey(k);s.typeKey('OK');if(!s.scene.isActive('Shop')||s.secret.typed!=='')throw Error('Unknown code behavior changed');s.closeSecret(true);s.openCode();for(const k of 'physicalmedia')s.typeKey(k);s.typeKey('OK');});await page.waitForFunction(()=>window.game.scene.isActive('Treehouse'));assert.deepEqual(errors,[]);console.log('PASS physical-media keyboard and mobile phrase routing, spaces/case handling, layout, inspect navigation, back/re-entry and unknown-code behavior',room);
}finally{await browser.close();await server.close();}
