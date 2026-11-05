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




 const result=await page.evaluate(async()=>{
  const {setMainSoul,setAidSoul,getSoulTeam}=await import('/src/souls/team.js');const {ownsSoul}=await import('/src/souls/collection.js');const {soulPower}=await import('/src/souls/progression.js');const {soulEncounter}=await import('/src/souls/encounters.js');const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};
  const pause=()=>new Promise(r=>setTimeout(r,400));const stop=()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);};
  const created=(key,action)=>new Promise((resolve,reject)=>{const scene=window.game.scene.getScene(key),onCreate=()=>{clearTimeout(timer);resolve(scene);},timer=setTimeout(()=>{scene.events.off('create',onCreate);reject(Error('Scene did not finish creating: '+key));},10000);scene.events.once('create',onCreate);action();});
  if(setMainSoul('bill-cipher').main)throw Error('Unearned soul equipped');
  const start=async(id)=>{stop();const s=await created('SoulBattle',()=>window.game.scene.start('SoulBattle',{soulId:id}));return created('Match',()=>s.fight());};
  for(const id of ['steve','cloud','bill-cipher','healing-orb','shadow-young-link','ember-ronin','moon-moth','gearling','leon','cinder-finch','reef-warden','static-imp','moss-tortoise','brass-marshal','boiler-beetle','chrono-owl','oathbound-rowan','rune-archivist','byte-knight','pixel-slime','storm-harrier','abyss-oracle','jade-warden','sugar-sprite','neon-koi','neon-kitsune','bendy','mythic-grimoire']){
   let m=await start(id),e=soulEncounter(id);
   if(m.stageId!==e.stage||m.fighters[1].def.id!==e.puppet||m.fighters[1].stocks!==e.stocks)throw Error('Encounter mismatch '+id);if(m.fighters[1].ctrl.soulStyle!==e.style||m.fighters[1].ctrl.lv.react!==e.react)throw Error('Puppet behavior mismatch');
   if(id==='ember-ronin'&&m.fighters[1].skin!==7)throw Error('Samurai puppet skin missing');
   if(id==='shadow-young-link'&&(m.fighters[1].skin!==2||!m.fighters[1].sheets.idle.includes('SHADOW LINK')))throw Error('Shadow puppet skin missing');
   if(id==='healing-orb'){const f=m.fighters[1],owner=m.fighters[0];f.render(0);if(f.sprite.tintTopLeft!==e.tint)throw Error('Soul palette did not survive render');f.percent=99;m.applyHit(f,{owner,h:{dmg:1},facing:1,id:'aid-heal'},owner.x);if(f.percent<90||f.percent>=100||!f.soulAidUsed)throw Error('Aid did not heal at 100%');f.respawn();if(f.soulAidUsed)throw Error('Aid did not reset on respawn');}
   m.fighters[0].eliminated=true;await created('Results',()=>m.toResults());if(ownsSoul(id))throw Error('Loss granted soul');
   const res=window.game.scene.getScene('Results');res.t=80;m=await created('Match',()=>res.choose(0));if(!m.soulBattle||m.stageId!==e.stage)throw Error('Rematch lost encounter');
   m.fighters[1].eliminated=true;await created('SoulReward',()=>m.toResults());if(!ownsSoul(id)||!window.game.scene.isActive('SoulReward'))throw Error('Win did not award soul with reward screen: '+id+' / '+window.game.scene.getScenes(true).map(s=>s.scene.key)+' / owns '+ownsSoul(id)+' / P1 '+m.fighters[0].eliminated+' / CPU '+m.fighters[1].eliminated);
   const reward=window.game.scene.getScene('SoulReward');if(reward.soul.id!==id)throw Error('Wrong reward');if(e.soul.kind==='main'&&setMainSoul(id).main!==id)throw Error('Earned soul cannot equip');
   stop();await created('SoulBattle',()=>window.game.scene.start('SoulBattle',{soulId:id}));if(!window.game.scene.isActive('SoulBattle'))throw Error('Earned soul replay blocked');
  }
  setMainSoul('cloud');setAidSoul(0,'healing-orb');if(getSoulTeam().aids[0]!=='healing-orb')throw Error('Aid not equipped');
  if(soulPower('steve').level<2)throw Error('Completed battles did not level main');
  stop();await created('SoulTeam',()=>window.game.scene.start('SoulTeam'));if(window.game.scene.getScene('SoulTeam').choices.length!==17)throw Error('Earned collection missing');return {earned:['steve','cloud','bill-cipher','healing-orb','shadow-young-link','ember-ronin','moon-moth','gearling','leon','cinder-finch','reef-warden','static-imp','moss-tortoise','brass-marshal','boiler-beetle','chrono-owl','oathbound-rowan','rune-archivist','byte-knight','pixel-slime','storm-harrier','abyss-oracle','jade-warden','sugar-sprite','neon-koi','neon-kitsune','bendy','mythic-grimoire'],lossAwards:false,earnedReplay:true,reward:true,mainXP:true,aidHeal:true};
 });
 await page.evaluate(()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulReward',{soulBattle:{soulId:'cloud'},soulWon:true});});await page.waitForTimeout(150);await page.screenshot({path:'recordings/test-output/soul-reward-v2.png'});
 await page.reload();await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const saved=await page.evaluate(async()=>{const {ownsSoul}=await import('/src/souls/collection.js');const {soulPower}=await import('/src/souls/progression.js');const {getSoulTeam}=await import('/src/souls/team.js');return {owns:ownsSoul('healing-orb'),level:soulPower('steve').level,team:getSoulTeam()};});assert.ok(saved.owns&&saved.level>=2&&saved.team.aids[0]==='healing-orb');
 assert.deepEqual(errors,[]);console.log('PASS soul battles',result,saved);
}finally{await browser.close();await server.close();}
