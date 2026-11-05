import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { readFileSync,mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene.isActive('Title'),null,{timeout:120000});
 const before=await page.evaluate(async()=>{
 const {settings}=await import('/src/settings.js'),P=await import('/src/progress.js'),{SHOP}=await import('/src/data/shop.js');
 for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('Shop');await new Promise(r=>setTimeout(r,200));const shop=window.game.scene.getScene('Shop');
 const it=SHOP.flatMap(t=>t.items).find(i=>i.id==='cos-orrery');await shop.openPreview(it);window.shopRef=shop;
 return {coins:P.getCoins(),owns:P.owns(it.id),settings:JSON.stringify(settings)};
 });
 assert.equal(before.owns,false);
 await page.keyboard.press('i',{delay:100});await page.waitForFunction(()=>window.game.scene.isActive('Match')&&window.game.scene.isSleeping('Shop'));
 const intro=await page.evaluate(async()=>{const m=window.game.scene.getScene('Match');const {skinInfo}=await import('/src/fighters/skins.js');return {preview:!!m.shopPreview,skin:skinInfo(m.fighters[0].def.id,m.fighters[0].skin).name,fighters:m.fighters.length};});assert.deepEqual(intro,{preview:true,skin:'ORRERY',fighters:1});
 await page.waitForTimeout(900);await page.screenshot({path:'recordings/test-output/shop-intro-preview.png'});
 await page.waitForFunction(()=>window.game.scene.isActive('Shop'),null,{timeout:30000});
 const restored=await page.evaluate(()=>{const s=window.game.scene.getScene('Shop');return s===window.shopRef&&s.pv.it.id==='cos-orrery';});assert.ok(restored);
 await page.keyboard.press('o',{delay:80});await page.waitForFunction(()=>window.game.scene.isActive('Win')&&window.game.scene.isSleeping('Shop'));
 const outro=await page.evaluate(()=>{const w=window.game.scene.getScene('Win');return {preview:w.data0.shopPreview,fighter:w.win.fighter,skin:w.win.skin};});assert.ok(outro.preview);assert.equal(outro.fighter,'soul-summoner');
 await page.waitForTimeout(700);await page.screenshot({path:'recordings/test-output/shop-outro-preview.png'});
 await page.keyboard.press('Escape',{delay:100});await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 // Touch/mouse buttons use the same route; returning leaves the move preview open.
 await page.mouse.click(258*2,95*2);await page.waitForFunction(()=>window.game.scene.isActive('Match'));
 await page.waitForTimeout(400);await page.keyboard.press('Escape',{delay:100});await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 await page.screenshot({path:'recordings/test-output/shop-preview-controls.png'});
 const after=await page.evaluate(async()=>{const {settings}=await import('/src/settings.js'),P=await import('/src/progress.js');return {coins:P.getCoins(),owns:P.owns('cos-orrery'),settings:JSON.stringify(settings),item:window.shopRef.pv.it.id};});assert.deepEqual({coins:after.coins,owns:after.owns,settings:after.settings},before);assert.equal(after.item,'cos-orrery');
 // Costume-specific endings use the actual winning costume's cut, not a generic substitute.
 await page.evaluate(async()=>{const {SHOP}=await import('/src/data/shop.js');window.shopRef.openPreview({...SHOP.flatMap(t=>t.items).find(i=>i.id==='cos-orrery'),skin:'FROST',name:'FROST'});window.shopRef.previewCinema('outro');});
 await page.waitForFunction(()=>window.game.scene.isActive('Win'));
 assert.ok(await page.evaluate(async()=>{const {SKIN_CUTS}=await import('/src/scenes/winSkins.js');const w=window.game.scene.getScene('Win');return w.cut===SKIN_CUTS['soul-summoner:FROST'];}));
 await page.evaluate(()=>window.game.scene.getScene('Win').done());await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 // Phaser retains old scene data unless consumed: ordinary matches must not reopen an intro preview.
 await page.evaluate(()=>{window.game.scene.stop('Shop');window.game.scene.start('Match');});await page.waitForFunction(()=>window.game.scene.isActive('Match'));
 assert.ok(await page.evaluate(()=>{const m=window.game.scene.getScene('Match');return !m.shopPreview&&m.fighters.length===4;}));
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({intro,outro,shopRestored:true,noPurchase:true,settingsUnchanged:true,mouseAndKeyboard:true}));
}finally{await browser.close();await server.close();}
