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








 await page.evaluate(async()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);await new Promise(resolve=>{window.game.scene.getScene('SoulBattle').events.once('create',resolve);window.game.scene.start('SoulBattle',{soulId:'mythic-grimoire'});});});
 const sample=()=>page.evaluate(()=>{const c=window.game.textures.get('soul_grimoire').getSourceImage(),d=c.getContext('2d').getImageData(0,0,96,96).data;let eye=2166136261,out=2166136261;for(let y=0;y<96;y++)for(let x=0;x<96;x++)for(let k=0;k<4;k++){const n=d[(y*96+x)*4+k];if(x>=32&&x<=64&&y>=32&&y<=64)eye=Math.imul(eye^n,16777619);else out=Math.imul(out^n,16777619);}return {eye,out};});
 const samples=[];for(let i=0;i<4;i++){samples.push(await sample());await page.waitForTimeout(230);}if(new Set(samples.map(s=>s.eye)).size<2)throw Error('Lock eye does not move');if(new Set(samples.map(s=>s.out)).size!==1)throw Error('Book body shifts with eye');await page.screenshot({path:'recordings/test-output/mythic-grimoire-battle.png'});
 const result=await page.evaluate(async()=>{const {MatchScene}=await import('/src/scenes/MatchScene.js'),{ownsSoul,awardSoul}=await import('/src/souls/collection.js'),{setMainSoul,setAidSoul,getSoulTeam}=await import('/src/souls/team.js'),{addSoulXP,evolveSoul}=await import('/src/souls/progression.js');MatchScene.prototype.update=function(){};if(ownsSoul('mythic-grimoire'))throw Error('Free Aid');const m=await new Promise(resolve=>{window.game.scene.getScene('Match').events.once('create',()=>resolve(window.game.scene.getScene('Match')));window.game.scene.getScene('SoulBattle').fight();});if(m.fighters[1].def.id!=='soul-summoner'||m.stageId!=='endless-castle'||m.fighters[1].stocks!==2)throw Error('Wrong Grimoire encounter');m.fighters[1].eliminated=true;await new Promise(resolve=>{window.game.scene.getScene('SoulReward').events.once('create',resolve);m.toResults();});if(!ownsSoul('mythic-grimoire')||addSoulXP('mythic-grimoire',100)||evolveSoul('mythic-grimoire'))throw Error('Aid reward/level rules broken');awardSoul('steve');setMainSoul('steve');setAidSoul(0,'mythic-grimoire');if(getSoulTeam().aids[0]!=='mythic-grimoire')throw Error('Aid not equippable');return getSoulTeam();});await page.waitForTimeout(200);await page.screenshot({path:'recordings/test-output/mythic-grimoire-reward.png'});
 const damage=await page.evaluate(async()=>{const {settings}=await import('/src/settings.js');for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);Object.assign(settings,{mode:'stock',stocks:2,picks:['soul-summoner','hero-knight'],skins:[0,0],cpuCount:1,extraPads:[],p1Pad:null,stage:'sky-sanctum',items:false,hazards:false});const m=await new Promise(resolve=>{window.game.scene.getScene('Match').events.once('create',()=>resolve(window.game.scene.getScene('Match')));window.game.scene.start('Match');});const f=m.fighters[0],v=m.fighters[1];const hit=type=>{v.percent=0;v.invincible=0;m.applyHit(v,{owner:f,h:{dmg:20,damageType:type},id:type,facing:1},f.x);return v.percent;};return {psychic:hit('psychic'),fire:hit('fire')};});assert.deepEqual(damage,{psychic:22,fire:21});const paused=await sample();await page.waitForTimeout(400);assert.deepEqual(await sample(),paused);assert.deepEqual(errors,[]);console.log('PASS living lock eye animation with stationary book, idle animation pause, earned-only one-slot Aid, no Aid levels/evolution and real psychic bonus',result,damage);
}finally{await browser.close();await server.close();}
