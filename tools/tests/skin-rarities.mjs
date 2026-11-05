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
 await page.evaluate(async()=>{const {ShopScene}=await import('/src/scenes/ShopScene.js');window.renderShop=ShopScene.prototype.update;ShopScene.prototype.update=function(){};window.game.scene.stop('Title');window.game.scene.start('Shop');});
 await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 const report=await page.evaluate(async()=>{
 const {SHOP,shelfItems}=await import('/src/data/shop.js'),{SKIN_RARITIES,rarityFor}=await import('/src/data/skinRarities.js');const s=window.game.scene.getScene('Shop'),shelf=shelfItems(SHOP[0]),items=SHOP.flatMap(t=>t.items).filter(i=>i.kind==='costume');const counts={};
 for(const it of items){if(!SKIN_RARITIES[it.rarity])throw Error('missing rarity '+it.id);counts[it.rarity]=(counts[it.rarity]||0)+1;const n=shelf.indexOf(it);if(n<0)continue;s.tab=0;s.page=Math.floor(n/8);s.sel=n%8;window.renderShop.call(s);if(s.cardRarity[s.sel].text!==rarityFor(it).label||s.rarityT.text!==rarityFor(it).label)throw Error('missing shop label '+it.id);if(s.nameT.getBounds().right>s.rarityT.getBounds().left-3)throw Error('detail overlap '+it.id);if(s.cardRarity[s.sel].getBounds().bottom>s.cardPrice[s.sel].getBounds().top)throw Error('card overlap '+it.id);await s.openPreview(it);s.drawPreview();if(!s.ovSub.text.includes(rarityFor(it).label))throw Error('preview label');s.closeOverlay();}
 return {counts,total:items.length};});
 assert.deepEqual(Object.keys(report.counts).sort(),['common','epic','legendary','miracle','rare']);assert.equal(report.total,24);
 await page.screenshot({path:'recordings/test-output/skin-rarity-shop.png'});assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify(report));
}finally{await browser.close();await server.close();}
