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










 const result=await page.evaluate(async()=>{const {MatchScene}=await import('/src/scenes/MatchScene.js'),{ownsSoul}=await import('/src/souls/collection.js'),{soulEncounter}=await import('/src/souls/encounters.js');MatchScene.prototype.update=function(){};const created=(key,act)=>new Promise(resolve=>{window.game.scene.getScene(key).events.once('create',()=>resolve(window.game.scene.getScene(key)));act();});for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);const output=[];
 for(const id of ['sub-zero','scorpion','noob-saibot','carnage']){if(ownsSoul(id))throw Error('Soul given free');const e=soulEncounter(id),setup=await created('SoulBattle',()=>window.game.scene.start('SoulBattle',{soulId:id}));const fr=setup.portrait.frame,tex=setup.portrait.texture; if(fr.realWidth!==96||!tex.has(e.soul.portrait))throw Error('Missing native pixel portrait');const m=await created('Match',()=>setup.fight());if(m.fighters[1].def.id!==e.puppet||m.stageId!==e.stage||m.fighters[1].stocks!==2)throw Error('Wrong puppet or stage');m.countdown=0;m.intros=null;for(let n=0;n<90;n++)m.tick();if(m.fighters.some(f=>!Number.isFinite(f.x+f.y)))throw Error('Puppet simulation failed');m.fighters[1].eliminated=true;await created('SoulReward',()=>m.toResults());if(!ownsSoul(id))throw Error('Not earned after victory');output.push(id);}
 return output;});
 await page.waitForTimeout(200);await page.screenshot({path:'recordings/test-output/carnage-soul-reward.png'});
 await page.evaluate(async()=>{const {setMainSoul}=await import('/src/souls/team.js');setMainSoul('sub-zero');const created=(key,act)=>new Promise(resolve=>{window.game.scene.getScene(key).events.once('create',()=>resolve(window.game.scene.getScene(key)));act();});for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);const s=await created('SoulUpgrade',()=>window.game.scene.start('SoulUpgrade',{id:'sub-zero',returnTo:{soulId:'carnage',fighter:'fists',skin:1}}));s.cards[2].zone.emit('pointerdown');s.adjust(1);const {soulPower}=await import('/src/souls/progression.js'),{potionInventory}=await import('/src/souls/potions.js');if(soulPower('sub-zero').level!==1||potionInventory().large!==200||s.quantity!==2||!s.preview.text.includes('31'))throw Error('Bulk preview incorrect');});
 await page.screenshot({path:'recordings/test-output/soul-upgrade-preview.png'});
 await page.evaluate(async()=>{const s=window.game.scene.getScene('SoulUpgrade');s.use();const {soulPower}=await import('/src/souls/progression.js'),{potionInventory}=await import('/src/souls/potions.js');if(soulPower('sub-zero').level!==31||potionInventory().large!==198)throw Error('Bulk spend failed');await new Promise(resolve=>{window.game.scene.getScene('SoulEvolution').events.once('create',resolve);s.evolve();});const ev=window.game.scene.getScene('SoulEvolution');if(ev.result.afterSoul.name!=='Full Frost'||ev.result.afterSoul.stars!==4||ev.result.beforeSoul.portrait===ev.result.afterSoul.portrait)throw Error('Evolution preview wrong');ev.confirm();});
 await page.waitForTimeout(950);await page.screenshot({path:'recordings/test-output/full-frost-evolved.png'});
 await page.evaluate(async()=>{const e=window.game.scene.getScene('SoulEvolution');await new Promise(resolve=>{window.game.scene.getScene('SoulUpgrade').events.once('create',resolve);e.back();});const s=window.game.scene.getScene('SoulUpgrade');if(s.soul().name!=='Full Frost'||s.returnTo.soulId!=='carnage')throw Error('Lost evolution or fight return');s.back();});await page.waitForFunction(()=>window.game.scene.isActive('SoulTeam'));assert.deepEqual(errors,[]);console.log('PASS earned victories for all four puppets, native pixel art, bulk preview/use, Full Frost evolution and preserved battle/team return',result);
}finally{await browser.close();await server.close();}
