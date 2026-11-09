import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
mkdirSync('/tmp/rebirth-afton',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:540},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'}),errors=[];
 page.on('pageerror',e=>{errors.push(String(e));console.error(String(e));});
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const locked=await page.evaluate(async()=>{
  const {skinsFor,skinUnlocked}=await import('/src/fighters/skins.js'),{SHOP,shelfItems,gachaPool}=await import('/src/data/shop.js');
  const si=skinsFor('last-seen').findIndex(s=>s.name==='MICHAEL AFTON');
  if(si<0||skinUnlocked('last-seen',si)||shelfItems(SHOP[0]).some(i=>i.id==='cos-afton')||gachaPool({pool:'ANY'}).some(i=>i.id==='cos-afton'))throw Error('secret skin exposed before code');
  const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};
  window.game.scene.stop('Title');window.game.scene.start('Shop');return si;
 });
 await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 const coins=await page.evaluate(async()=>{const P=await import('/src/progress.js');P.addCoins(321);const s=window.game.scene.getScene('Shop');s.ringBell();s.ringBell();s.ringBell();return P.getCoins();});
 await page.keyboard.type('ialwayscomebacx');await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(async()=>{const P=await import('/src/progress.js');return P.owns('cos-afton');}),false);
 await page.keyboard.type('ialwayscomeback');await page.keyboard.press('Enter');
 const unlocked=await page.evaluate(async()=>{const P=await import('/src/progress.js'),{skinUnlocked}=await import('/src/fighters/skins.js'),{SHOP,shelfItems}=await import('/src/data/shop.js');return {own:P.owns('cos-afton'),coins:P.getCoins(),shown:shelfItems(SHOP[0]).some(i=>i.id==='cos-afton'),keyboard:window.game.scene.getScene('Shop').input.keyboard.enabled};});
 assert.ok(unlocked.own&&unlocked.shown&&unlocked.keyboard);assert.ok(unlocked.coins>=coins);
 await page.screenshot({path:'/tmp/rebirth-afton/unlock.png'});
 await page.evaluate(async si=>{const {settings}=await import('/src/settings.js');window.game.scene.stop('Shop');Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:['last-seen','soul-summoner'],skins:[si,0],stage:'sky-sanctum',training:true});window.game.scene.start('Match',{skipIntro:true});},locked);
 await page.waitForFunction(()=>window.game.scene.isActive('Match')&&window.game.scene.getScene('Match').fighters?.[0]?.sheets.idle==='ls_afton_idle',null,{timeout:90000});
 const calm=await page.evaluate(()=>{
  const m=window.game.scene.getScene('Match'),f=m.fighters[0];m.countdown=0;f.state='run';f.vx=3;f.grounded=true;m.frame=200;m.draw();f.flash=8;f.hurtAnim=8;m.frame++;m.draw();
  const before={flash:f.flash,hurt:f.hurtAnim,anim:f.anim,frame:f.sprite.frame.name,gait:f.skinClock.gait,particles:m.particles.length};for(let i=0;i<6;i++)m.draw();
  if(f.anim!==before.anim||f.sprite.frame.name!==before.frame||f.skinClock.gait!==before.gait||m.particles.length!==before.particles||f.flash!==before.flash||f.hurtAnim!==before.hurt)throw Error('redraw changed pose');
  if(m.textures.get(f.sheets.run).frameTotal-1!==24)throw Error('old run strip loaded');
  f.state='idle';f.flash=0;f.hurtAnim=0;m.frame++;m.draw();return {key:f.sprite.texture.key,packed:!!m.textures.get(f.sheets.moves).customData?.mobileAtlas};
 });assert.equal(calm.key,'ls_afton_idle');assert.ok(calm.packed);await page.screenshot({path:'/tmp/rebirth-afton/michael.png'});
 const springtrap=await page.evaluate(()=>{
  const m=window.game.scene.getScene('Match'),f=m.fighters[0];f.sightings=f.def.sightings.max;f.startTurn();
  for(let t=1;t<=70;t++){f.t=t;f.st_turning();m.frame++;m.draw();}
  if(!f.def.wrong||f.sheets.idle!=='ls_wrong_afton_idle')throw Error('wrong transformation');
  f.setState('idle');m.draw();return {key:f.sprite.texture.key,run:m.textures.get(f.sheets.run).frameTotal-1};
 });assert.equal(springtrap.key,'ls_wrong_afton_idle');assert.equal(springtrap.run,24);await page.screenshot({path:'/tmp/rebirth-afton/springtrap.png'});
 await page.evaluate(()=>window.game.scene.getScene('Match').fighters[0].loseAxe(120));
 await page.waitForFunction(()=>window.game.scene.getScene('Match').fighters[0].sheets.idle==='ls_wrong_afton_noaxe_idle',null,{timeout:30000});
 const bare=await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0];m.draw();for(const key of Object.values(f.sheets))if(!m.textures.exists(key))throw Error('missing '+key);const tex=m.textures.get(f.sheets.moves);for(const a of Object.values(f.def.moveAnims))if(!tex.has(a[0]+a[1]-1))throw Error('missing move');return f.sprite.texture.key;});assert.equal(bare,'ls_wrong_afton_noaxe_idle');
 // Reload verifies the code reward survives a fresh game instance.
 await page.reload();await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 assert.equal(await page.evaluate(async()=>{const P=await import('/src/progress.js');return P.owns('cos-afton');}),true);
 const catalog=await page.evaluate(async()=>{
  const {ROSTER,TEST_ROSTER,showFighter}=await import('/src/fighters/roster.js'),{skinsFor}=await import('/src/fighters/skins.js');
  const scene=window.game.scene.getScene('Title'),sprite=scene.add.sprite(0,0,'ss_idle');let count=0;
  for(const entry of [...ROSTER,...TEST_ROSTER].filter(r=>r.def))for(let i=0;i<skinsFor(entry.id).length;i++){
   for(const frame of [0,3,7,15]){showFighter(sprite,entry.def,frame,i);if(sprite.texture.key==='__MISSING'||!sprite.texture.has(sprite.frame.name))throw Error('missing skin idle '+entry.id+':'+i);}
   count++;
  }
  sprite.destroy();return count;
 });
 assert.ok(catalog>80);assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({locked,unlocked,calm,springtrap,bare,persistent:true,catalog}));
}finally{await browser.close();await server.close();}
