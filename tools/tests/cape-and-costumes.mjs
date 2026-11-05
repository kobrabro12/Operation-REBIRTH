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
 const setup=await page.evaluate(async()=>{
 const {settings}=await import('/src/settings.js'),{skinsFor}=await import('/src/fighters/skins.js'),{SHOP}=await import('/src/data/shop.js');
 const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};
 window.startCostume=async(id,name)=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,difficulty:0,extraPads:[],p1Pad:null,picks:[id,'mr-wake'],skins:[skinsFor(id).findIndex(s=>s.name===name),0],stage:'gravemoon-bridge',items:false,hazards:false,crt:false});window.game.scene.start('Match');await new Promise(r=>setTimeout(r,180));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const m=window.game.scene.getScene('Match');m.countdown=0;m.intros=null;m.bigText.setText('');m.fighters[0].placeAt(-60,0);m.fighters[1].placeAt(200,0);return m;};
 return SHOP.flatMap(t=>t.items).find(i=>i.id==='cos-orrery');
 });
 assert.equal(setup.price,2000);assert.equal(setup.skin,'ORRERY');
 const azure=await page.evaluate(async()=>{
 const m=await window.startCostume('hero-knight','AZURE'),f=m.fighters[0];
 const {AZURE_CAPE_ANCHORS}=await import('/src/fighters/azureCapeAnchors.js');const {syncAzureCape,azureShoulder}=await import('/src/fighters/azureCape.js');
 let count=0,angles=new Set();
 for(const [key,poses] of Object.entries(AZURE_CAPE_ANCHORS)){
  if(!m.textures.exists(key)||key.includes('hands')||key.includes('weapon'))continue;
  for(let i=0;i<poses.length;i++)for(const flip of [false,true]){
   const a=f.sprite;a.setTexture(key,i).setOrigin(key==='hk_moves'?81/180:66/150,key==='hk_moves'?111/140:86/90).setFlipX(flip).setScale(1.17,.9).setRotation(.37).setAlpha(.45).setVisible(true);
   syncAzureCape(f.azureCape,a,i,true);const p=azureShoulder(a),c=f.azureCape;
   if(Math.abs(c.x-p.x)>.51||Math.abs(c.y-p.y)>.51||Math.abs(Math.atan2(Math.sin(c.rotation-p.angle),Math.cos(c.rotation-p.angle)))>1e-5||c.flipX!==p.flip||Math.abs(c.alpha-.414)>1e-5)throw Error('cape drift '+key+':'+i);
   if(!c.visible)throw Error('hidden cape');count++;angles.add(Math.round(p.angle*10));
  }
 }
 f.startAttack('nair');f.t=18;m.draw();return {cels:count,angles:angles.size};
 });
 assert.ok(azure.cels>600&&azure.angles>10);await page.screenshot({path:'recordings/test-output/azure-cape-spin.png'});
 const select=await page.evaluate(async()=>{
 const {SelectScene}=await import('/src/scenes/SelectScene.js');window.renderSelect=SelectScene.prototype.update;SelectScene.prototype.update=function(){};
 window.game.scene.stop('Match');window.game.scene.start('Select');await new Promise(r=>setTimeout(r,180));const s=window.game.scene.getScene('Select');s.players[0].pick='hero-knight';window.renderSelect.call(s);const c=s.cards[0];return {visible:c.azureCape.visible,behind:s.children.getIndex(c.azureCape)<s.children.getIndex(c.sprite),scale:c.azureCape.scaleX===c.sprite.scaleX};
 });assert.ok(select.visible&&select.behind&&select.scale);await page.screenshot({path:'recordings/test-output/azure-cape-select.png'});
 const bunny=await page.evaluate(async()=>{const m=await window.startCostume('last-seen','BROKEN BUNNY'),f=m.fighters[0];m.draw();return {key:f.sprite.texture.key,sheets:Object.values(f.sheets).every(k=>m.textures.exists(k))};});assert.ok(bunny.sheets&&bunny.key.startsWith('ls_bunny_'));await page.screenshot({path:'recordings/test-output/bunny-calm.png'});
 const wrong=await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0];f.becomeSeen();f.setState('idle');m.draw();return {key:f.sprite.texture.key,dir:f.unarmedKeys().dir,sheets:Object.values(f.sheets).every(k=>m.textures.exists(k))};});assert.ok(wrong.sheets&&wrong.key.startsWith('ls_wrong_bunny_'));assert.equal(wrong.dir,'bunny/wrong/noaxe/');await page.screenshot({path:'recordings/test-output/bunny-seen.png'});
 const unarmed=await page.evaluate(async()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0];f.loseAxe(180);await new Promise(r=>setTimeout(r,400));m.draw();return {key:f.sheets.idle,loaded:m.textures.exists(f.sheets.idle)};});assert.ok(unarmed.loaded&&unarmed.key.startsWith('ls_wrong_bunny_noaxe_'));
 const premium=await page.evaluate(async()=>{const {skinUnlocked,skinsFor}=await import('/src/fighters/skins.js'),P=await import('/src/progress.js');const i=skinsFor('soul-summoner').findIndex(s=>s.name==='ORRERY');if(skinUnlocked('soul-summoner',i))throw Error('should start locked');P.addCoins(2000);const before=P.getCoins();if(!P.buyItem('cos-orrery',2000))throw Error('purchase failed');if(P.getCoins()!==before-2000||!skinUnlocked('soul-summoner',i))throw Error('purchase not applied');const m=await window.startCostume('soul-summoner','ORRERY'),f=m.fighters[0];m.draw();return {key:f.sprite.texture.key,sheets:Object.values(f.sheets).every(k=>m.textures.exists(k)),orbits:f.fxBack.commandBuffer.length>0};});assert.ok(premium.sheets&&premium.orbits&&premium.key.startsWith('ss_orrery_'));await page.screenshot({path:'recordings/test-output/orrery-match.png'});
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({azure,select,bunny,wrong,premium,price:setup.price}));
}finally{await browser.close();await server.close();}
