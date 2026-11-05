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









 const result=await page.evaluate(async()=>{const {awardSoul}=await import('/src/souls/collection.js'),{setMainSoul}=await import('/src/souls/team.js'),{soulPower,addSoulXP}=await import('/src/souls/progression.js'),{potionInventory}=await import('/src/souls/potions.js');awardSoul('steve');setMainSoul('steve');for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);const scene=await new Promise(resolve=>{window.game.scene.getScene('SoulTeam').events.once('create',()=>resolve(window.game.scene.getScene('SoulTeam')));window.game.scene.start('SoulTeam');});const up=await new Promise(resolve=>{window.game.scene.getScene('SoulUpgrade').events.once('create',()=>resolve(window.game.scene.getScene('SoulUpgrade')));scene.openPotions();});if(up.cards.length!==3)throw Error('Upgrade screen unavailable');for(let i=0;i<3;i++){up.cards[i].zone.emit('pointerdown');if(soulPower('steve').level!==[1,2,7][i])throw Error('Preview consumed a potion');up.use();}if(soulPower('steve').level!==22)throw Error('Potion UI did not apply XP');if(Object.values(potionInventory()).some(n=>n!==199))throw Error('Wrong inventory spend');return {level:soulPower('steve').level,counts:potionInventory()};});
 await page.waitForTimeout(200);await page.screenshot({path:'recordings/test-output/soul-potions-phone.png'});
 await page.reload();await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});const persisted=await page.evaluate(async()=>{const {potionInventory}=await import('/src/souls/potions.js');return potionInventory();});assert.deepEqual(persisted,{small:199,medium:199,large:199});assert.deepEqual(errors,[]);console.log('PASS phone potion menu, all three tappable choices, XP and inventory persistence, no repeated gift',result);
}finally{await browser.close();await server.close();}
