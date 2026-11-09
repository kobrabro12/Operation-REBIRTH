import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
mkdirSync('recordings/test-output/vader-animation',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:540},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{localStorage.setItem('rebirth.shop',JSON.stringify({coins:123,owned:['cos-metaknight'],music:null,stageFx:null,extras:[]}));localStorage.setItem('rebirth.gifts',JSON.stringify(['mason-2000']));});
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const migration=await page.evaluate(async()=>{const P=await import('/src/progress.js'),{skinsFor}=await import('/src/fighters/skins.js'),{SHOP}=await import('/src/data/shop.js');const list=skinsFor('hero-knight'),skin=list.findIndex(s=>s.name==='DARTH VADER');if(skin<0||list.some(s=>s.name==='META KNIGHT')||SHOP[0].items.some(i=>i.id==='cos-metaknight')||!P.owns('cos-vader')||P.owns('cos-metaknight')||P.getCoins()!==123)throw Error('replacement/migration failed');const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};const {settings}=await import('/src/settings.js');window.game.scene.stop('Title');Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:['hero-knight','young-link'],skins:[skin,0],stage:'dreamland',training:true,items:false,hazards:false,track:'auto'});window.game.scene.start('Match');return {skin,coins:P.getCoins()};});
 await page.waitForFunction(()=>window.game.scene.isActive('Match')&&window.game.scene.getScene('Match').fighters?.[0]?.sheets.idle==='hk_vader_idle',null,{timeout:90000});
 const intro=await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),i=m.intros,e=i.list[0];if(e.I.kind!=='vader-door')throw Error('default intro');i.t=e.start+e.I.dur*.7;m.draw();if(m.fighters[0].sprite.texture.key!=='hk_vader_specials')throw Error('no ignition poses');return {kind:e.I.kind,frame:m.fighters[0].sprite.frame.name};});
 await page.screenshot({path:'recordings/test-output/vader-animation/intro.png'});
 await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0],v=m.fighters[1];m.intros.finish();m.intros=null;m.countdown=0;m.frozen=0;m.bigText.setText('');f.placeAt(-70,0);f.setState('idle');f.grounded=true;f.platform=m.stage.platforms[0];f.facing=1;v.placeAt(50,0);v.setState('idle');v.grounded=true;v.platform=m.stage.platforms[0];v.ctrl=f.ctrl;v.isCpu=false;v.invincible=f.invincible=0;v.percent=0;f.limit=100;f.startLimit();window.advanceVader=ct=>{let n=0;while(f.state==='limit'&&(!f.ult||f.ult.phase==='cast'||f.ult.phase==='cutscene'&&f.ult.ct<ct)&&n++<350){m.tick();m.draw();}return {ct:f.ult?.ct,phase:f.ult?.phase,percent:v.percent,y:v.y,state:f.state};};});
 const phases=[];for(const [name,t]of [['choke',25],['saber',90],['slam',153]]){phases.push(await page.evaluate(t=>window.advanceVader(t),t));await page.screenshot({path:'recordings/test-output/vader-animation/'+name+'.png'});}
 const hit=await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0],v=m.fighters[1];let n=0;while(f.state==='limit'&&n++<250){m.tick();m.draw();}if(v.percent!==60||m.frozen||m.cutscene||f.ult||f.limit!==0)throw Error('damage/release failed '+JSON.stringify({percent:v.percent,frozen:m.frozen,cut:!!m.cutscene,ult:!!f.ult,limit:f.limit}));return {damage:v.percent,free:!m.cutscene&&!m.frozen};});
 assert.ok(phases[0].y<-50);assert.ok(phases[1].percent>=14);
 const cases=await page.evaluate(async()=>{
  const {endVaderLimit}=await import('/src/fighters/limitVader.js'),m=window.game.scene.getScene('Match'),f=m.fighters[0],v=m.fighters[1],out={};
  const prepare=(x,state='idle')=>{endVaderLimit(f);f.placeAt(-70,0);f.setState('idle');f.grounded=true;f.platform=m.stage.platforms[0];f.facing=1;f.invincible=f.hitstop=f.hitstun=0;f.swordOut=null;v.placeAt(x,0);v.setState(state);v.grounded=true;v.platform=m.stage.platforms[0];v.percent=0;v.invincible=v.hitstop=v.hitstun=0;v.team=1;f.team=0;f.limit=100;f.startLimit();};
  for(const [name,x,state,invincible,ally]of [['miss',330,'idle',0,false],['behind',-140,'idle',0,false],['shield',40,'shield',0,false],['invulnerable',40,'idle',90,false],['ally',40,'idle',0,true]]){
   prepare(x,state);if(name==='behind')f.facing=1;v.invincible=invincible;if(ally)v.team=f.team;
   for(let i=0;i<100&&f.state==='limit';i++){f.t++;f.age++;m.frame++;if(m.frozen)m.frozen--;f.st_limit();m.draw();}
   if(v.percent||m.cutscene||m.frozen||f.ult||f.state==='limit')throw Error('unclean '+name);out[name]=true;
  }
  prepare(40);f.swordOut={alive:true};f.limit=100;f.setState('idle');if(f.startLimit()!==false||f.limit!==100)throw Error('duplicate sword super');f.swordOut=null;out.swordOutRejected=true;
  prepare(40);for(let i=0;i<60&&!m.cutscene;i++){f.t++;f.age++;m.frame++;if(m.frozen)m.frozen--;f.st_limit();}if(!m.cutscene)throw Error('capture setup');v.alive=false;f.t++;f.st_limit();if(m.cutscene||m.frozen||f.ult)throw Error('lost target stranded cinematic');v.alive=true;out.lostTargetClean=true;
  const {HERO_KNIGHT}=await import('/src/fighters/heroKnight.js');if(HERO_KNIGHT.limit.name!=='THOUSAND CUTS'||HERO_KNIGHT.limit.type!=='blade')throw Error('base Lacy super changed');out.baseLacyUnchanged=true;return out;
 });
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({migration,intro,phases,hit,cases}));
}finally{await browser.close();await server.close();}
