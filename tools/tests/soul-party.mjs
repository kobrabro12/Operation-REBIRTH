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
  const {awardSoul}=await import('/src/souls/collection.js'),{setMainSoul,setAidSoul,getSoulTeam}=await import('/src/souls/team.js'),{soulPower}=await import('/src/souls/progression.js');
  ['cloud','bill-cipher','shadow-young-link','healing-orb'].forEach(awardSoul);setMainSoul('cloud');setAidSoul(0,'healing-orb');
  for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('SoulTeam',{returnTo:{soulId:'steve',fighter:'young-link',skin:1}});await new Promise(r=>setTimeout(r,400));const s=window.game.scene.getScene('SoulTeam');
  if(s.slots[0].image.displayHeight<140||s.slots[1].x<320||!s.slots[3].labels.text.includes('LOCKED'))throw Error('Party layout or capacity failed');
  if(s.power.text!==soulPower('cloud').power.toLocaleString())throw Error('Wrong team power');
  s.openPresets('save');s.sel=0;s.confirmPicker();setMainSoul('bill-cipher');s.openPresets('load');s.sel=0;s.confirmPicker();if(getSoulTeam().main!=='cloud'||getSoulTeam().aids[0]!=='healing-orb')throw Error('Preset did not restore team');
  s.autopick();if(getSoulTeam().main!=='bill-cipher'||getSoulTeam().aids[0]!=='healing-orb')throw Error('Autopick ignored earned power/Aids');s.openPresets('load');s.sel=0;s.confirmPicker();
  s.openPicker(1);if(s.choices.length!==1)throw Error('Aid picker must use earned souls');s.equip();if(s.picker)throw Error('Picker did not close');
  const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};return {layout:true,presets:true,power:s.power.text};
 });
 await page.waitForTimeout(120);await page.screenshot({path:'recordings/test-output/soul-party.png'});
 const button=await page.evaluate(()=>{const s=window.game.scene.getScene('SoulTeam'),b=s.fightButton.getBounds(),r=window.game.canvas.getBoundingClientRect();return {x:r.x+b.centerX/640*r.width,y:r.y+b.centerY/360*r.height};});await page.touchscreen.tap(button.x,button.y);await page.waitForFunction(()=>window.game.scene.isActive('Match'));
 const combat=await page.evaluate(async()=>{
  const m=window.game.scene.getScene('Match'),f=m.fighters[0],enemy=m.fighters[1];if(f.def.id!=='young-link'||f.skin!==1||m.soulBattle.soulId!=='steve')throw Error('Party Fight lost encounter/fighter');
  if(f.soulTeam.main!=='cloud'||f.soulTeam.aids[0]!=='healing-orb'||f.soulPowerDamage<=1)throw Error('Team not applied in soul battle');
  m.countdown=0;m.intros=null;f.startAttack('jab');m.applyHit(enemy,{owner:f,h:{dmg:20,damageType:'sword'},facing:1,id:'party-sword'},f.x);if(enemy.percent<=20)throw Error('Sword/Power bonus inactive');
  f.percent=99;m.applyHit(f,{owner:enemy,h:{dmg:1},facing:-1,id:'party-heal'},enemy.x);if(!f.soulAidUsed||f.percent>=100)throw Error('Aid effect inactive');
  const soulBattleDamage=enemy.percent;
  const {settings}=await import('/src/settings.js');for(const active of window.game.scene.getScenes(true))window.game.scene.stop(active.scene.key);Object.assign(settings,{mode:'stock',stocks:2,cpuCount:1,extraPads:[],p1Pad:null,picks:['hero-knight','soul-summoner'],skins:[0,0],stage:'sky-sanctum',items:false,hazards:false});window.game.scene.start('Match');await new Promise(r=>setTimeout(r,400));while(!window.game.scene.isActive('Match')||!window.game.scene.getScene('Match').fighters?.length)await new Promise(r=>setTimeout(r,30));const normal=window.game.scene.getScene('Match'),p=normal.fighters[0],target=normal.fighters[1];if(normal.soulBattle||p.soulTeam.main!=='cloud'||p.soulTeam.aids[0]!=='healing-orb'||target.soulTeam)throw Error('Normal fight team missing or leaked to CPU');p.startAttack('jab');normal.applyHit(target,{owner:p,h:{dmg:20,damageType:'sword'},facing:1,id:'normal-party'},p.x);if(target.percent!==24)throw Error('Normal fight bonus failed '+target.percent);return {soulBattleDamage,normalSwordDamage:target.percent,aid:true};
 });
 await page.reload();await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});const persisted=await page.evaluate(async()=>{const {savedSoulTeams,getSoulTeam}=await import('/src/souls/team.js');return {saved:savedSoulTeams()[0],active:getSoulTeam()};});assert.equal(persisted.saved.main,'cloud');assert.equal(persisted.active.aids[0],'healing-orb');
 assert.deepEqual(errors,[]);console.log('PASS soul party',result,combat);
}finally{await browser.close();await server.close();}
