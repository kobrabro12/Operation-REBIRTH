import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
mkdirSync('recordings/test-output/metaknight-animation',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:540},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 const skin=await page.evaluate(async()=>{
  const {skinsFor}=await import('/src/fighters/skins.js'),{showFighter}=await import('/src/fighters/roster.js'),{HERO_KNIGHT}=await import('/src/fighters/heroKnight.js'),P=await import('/src/progress.js');
  const skin=skinsFor('hero-knight').findIndex(s=>s.name==='META KNIGHT'),s=window.game.scene.getScene('Title'),sprite=s.add.sprite(0,0,'hk_idle');
  showFighter(sprite,HERO_KNIGHT,23,skin);if(sprite.frame.name!==23)throw Error('menu truncates custom idle');sprite.destroy();
  P.grantItem('cos-metaknight');
  const {MatchScene}=await import('/src/scenes/MatchScene.js');MatchScene.prototype.update=function(){};
  window.game.scene.stop('Title');window.game.scene.start('Shop');return skin;
 });
 await page.waitForFunction(()=>window.game.scene.isActive('Shop'));
 const preview=await page.evaluate(async()=>{
  const {SHOP}=await import('/src/data/shop.js'),{HK_META_MOVES}=await import('/src/fighters/hkMetaMoves.js');
  const s=window.game.scene.getScene('Shop'),item=SHOP[0].items.find(i=>i.id==='cos-metaknight');await s.openPreview(item);
  const seq=s.pv.seq,idle=seq.find(c=>c.label==='IDLE'),run=seq.find(c=>c.label==='RUN'),jab=seq.find(c=>c.label==='JAB');
  if(idle.n!==24||run.n!==24||jab.from!==HK_META_MOVES.jab[0]||jab.n!==HK_META_MOVES.jab[1])throw Error('preview uses old Lacy indexes');
  s.closeOverlay();return {idle:idle.n,run:run.n,jab:jab.n};
 });
 await page.evaluate(async skin=>{const {settings}=await import('/src/settings.js');window.game.scene.stop('Shop');Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:['hero-knight','young-link'],skins:[skin,0],stage:'dreamland',training:true,items:false,hazards:false,track:'auto'});window.game.scene.start('Match',{skipIntro:true});},skin);
 await page.waitForFunction(()=>window.game.scene.isActive('Match')&&window.game.scene.getScene('Match').fighters?.[0]?.sheets.idle==='hk_meta_idle',null,{timeout:90000});
 const report=await page.evaluate(async()=>{
  const {HK_META_MOVES:A,HK_META_ANCHORS}=await import('/src/fighters/hkMetaMoves.js'),{metaKnightPose,metaKnightClip,metaKnightAnchor,metaKnightLimitGeom}=await import('/src/fighters/metaKnightAnimation.js');
  const m=window.game.scene.getScene('Match'),f=m.fighters[0],S=f.sheets,tex=m.textures.get(S.moves);m.countdown=0;m.intros=null;m.bigText.setText('');
  if(f.ghosts.length||f.vfx.trail)throw Error('overlapping character afterimages');
  if(!tex.customData.mobileAtlas)throw Error('custom atlas not packed');
  let cels=0,draws=0;for(const [key,a]of Object.entries(A))for(let t=0;t<a[1]*a[2];t++){
   const frame=metaKnightClip(key,t);if(!tex.has(frame))throw Error('missing '+key+':'+frame);if(t%a[2]===0)cels++;
  }
  for(const name of ['jab','ftilt','utilt','dtilt','dashAttack','fsmash','usmash','dsmash','nair','fair','bair','uair','dair','neutralB'])for(const facing of [-1,1]){
   if(!f.def.moves[name])continue;f.setState('attack');f.moveName=name;f.move=f.def.moves[name];f.facing=facing;
   const seen=new Set();for(let t=0;t<f.move.frames;t++){
    f.t=t;m.frame++;m.draw();const p=metaKnightPose(f);seen.add(p.frame);
    if(f.sprite.texture.key!==S.moves||String(f.sprite.frame.name)!==String(p.frame)||f.sprite.rotation||f.sprite.scaleX!==1||f.swooshFx)throw Error('old/overlapping pose '+name);
    const expected=facing<0?1-81/180:81/180;if(Math.abs(f.sprite.originX-expected)>1e-8||f.sprite.originY!==111/140)throw Error('foot pivot drift');
    const before=f.sprite.frame.name;for(let k=0;k<3;k++)m.draw();if(f.sprite.frame.name!==before)throw Error('redraw accelerated animation');draws++;
   }
   if(seen.size<5)throw Error('static attack '+name);
  }
  for(const state of ['taunt','counter','counterstrike','swingcharge','swordthrow','land','jumpsquat','ledge','ledgeclimb','ledgeattack','roll','shield','holding','hitstun','dying']){
   f.setState(state);f.move=null;f.hurtAnim=0;f.pummelCd=0;f.swingCharge=60;
   for(let t=0;t<36;t++){f.t=t;m.frame++;m.draw();if(f.sprite.texture.key==='__MISSING'||!f.sprite.texture.has(f.sprite.frame.name))throw Error('missing state '+state);}
  }
  f.setState('swingcharge');f.t=20;f.facing=-1;
  const p=metaKnightPose(f),a=HK_META_ANCHORS[p.frame],tip=metaKnightAnchor(f),hand=metaKnightAnchor(f,'hand');
  if(!a||!tip||tip.x!==Math.round(f.x-a.tip[0])||hand.y!==Math.round(f.y+a.hand[1]))throw Error('detached charge anchor');
  f.setState('limit');f.ult={phase:'grow',slashes:[],victims:[]};const geom=metaKnightLimitGeom(f,f.bladeGeom(f.def.limit,f.ult,20)),limHand=metaKnightAnchor(f,'hand');
  if(geom.hx!==limHand.x||geom.hy!==limHand.y)throw Error('detached giant sword');
  for(const phase of ['grow','slash','whiff','cutscene']){f.ult={phase,ct:17,charge:0,slashes:[],victims:[]};f.t=phase==='slash'?56:phase==='whiff'?68:20;m.frame++;m.draw();if(f.sprite.texture.key!==S.moves)throw Error('base Lacy limit pose');}
  f.ult=null;f.swordOut={alive:true};f.setState('idle');m.frame++;m.draw();if(f.sprite.texture.key!==S.idle_u)throw Error('extra held sword');f.swordOut=null;
  f.setState('run');f.vx=3.3;f.grounded=true;const run=new Set();for(let i=0;i<100;i++){m.frame++;f.age++;f.t++;m.draw();run.add(f.sprite.frame.name);}if(run.size!==24)throw Error('truncated run cycle');
  f.vx=0;f.facing=1;f.placeAt(-70,0);f.setState('idle');f.grounded=true;f.platform=m.stage.platforms[0];m.fighters[1].placeAt(130,0);m.fighters[1].grounded=true;m.fighters[1].setState('idle');m.frame++;m.draw();
  return {clips:Object.keys(A).length,cels,draws,run:run.size,packed:true,afterimages:f.ghosts.length};
 });
 await page.screenshot({path:'recordings/test-output/metaknight-animation/idle.png'});
 for(const [name,t]of [['ftilt',14],['fsmash',18],['dair',16]]){
  await page.evaluate(({name,t})=>{const m=window.game.scene.getScene('Match'),f=m.fighters[0];f.setState('attack');f.moveName=name;f.move=f.def.moves[name];f.t=t;m.frame++;m.draw();},{name,t});
  await page.screenshot({path:'recordings/test-output/metaknight-animation/'+name+'.png'});
 }
 assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({preview,...report}));
}finally{await browser.close();await server.close();}
