import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';

const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});await server.listen();
const url=server.resolvedUrls.local[0],browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--mute-audio']});
mkdirSync('recordings/test-output/recovery-castle',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:960,height:540},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
  await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
  await page.evaluate(async()=>{
    const {MatchScene}=await import('/src/scenes/MatchScene.js'),{settings}=await import('/src/settings.js');
    MatchScene.prototype.update=function(){};
    window.game.scene.stop('Title');Object.assign(settings,{mode:'stock',stocks:3,cpuCount:1,p1Pad:null,extraPads:[],picks:['what-once-was','last-seen'],skins:[0,0],stage:'castle-64',training:true,items:false,hazards:false,track:'auto'});window.game.scene.start('Match');
  });
  await page.waitForFunction(()=>window.game.scene.isActive('Match')&&window.game.scene.getScene('Match').fighters?.length===2,null,{timeout:120000});
  const rupture=await page.evaluate(async()=>{
    const m=window.game.scene.getScene('Match'),f=m.fighters[0],v=m.fighters[1],{StaticRupture}=await import('/src/fighters/staticRupture.js');
    m.countdown=0;m.intros=null;m.frozen=0;m.hits.clear();m.training=null;
    const reset=(shield=false)=>{
      for(const p of m.projectiles)p.kill();m.projectiles=[];m.hits.clear();
      f.placeAt(-110,0);v.placeAt(-10,0);f.setState('idle');v.setState(shield?'shield':'idle');
      f.grounded=v.grounded=true;f.platform=v.platform=m.stage.platforms[0];f.facing=1;
      f.hitstop=v.hitstop=f.invincible=v.invincible=0;v.percent=0;v.missingMark=0;f.signal=0;
    };
    reset();const spec=f.def.moves.neutralB;if(spec.poster||!spec.rupture)throw Error('Old poster neutral remains');
    f.startAttack('neutralB');f.t=14;f.st_attack(f.ctrl);f.st_attack(f.ctrl);
    if(m.projectiles.length!==1||!(m.projectiles[0]instanceof StaticRupture))throw Error('Orb limit/spawn failed');
    const orb=m.projectiles[0];let warning=false;
    for(let i=0;i<60&&orb.alive;i++){orb.step();if(orb.burst===0){warning=true;if(orb.hitbox())throw Error('Warning already damaging');}m.resolveHits([]);orb.render();}
    if(!warning||v.percent!==8||!(v.missingMark>0)||f.signal<=0||f.signalOrb)throw Error('Burst/mark/meter/cleanup failed '+JSON.stringify({p:v.percent,missing:v.missingMark,signal:f.signal}));
    const damage=v.percent,mark=v.missingMark;
    reset(true);const blocked=new StaticRupture(m,f,spec.rupture);m.projectiles=[blocked];for(let i=0;i<60&&blocked.alive;i++){blocked.step();m.resolveHits([]);}if(v.percent||v.missingMark||blocked.alive)throw Error('Shield did not block/remove orb');
    reset();v.x=400;const timed=new StaticRupture(m,f,spec.rupture);for(let i=0;i<spec.rupture.fuse;i++)timed.step();if(timed.burst!==0)throw Error('Maximum-range burst missing');timed.kill();
    f.facing=-1;const left=new StaticRupture(m,f,spec.rupture);if(left.x>=f.x)throw Error('Mirrored launch hand wrong');const x=left.x;left.step();if(left.x>=x)throw Error('Facing ignored');left.kill();
    return {damage,mark,warning,shield:true,maxRange:true,oneOrb:true};
  });
  const loader=existsSync('src/fighters/lazySheets.js')?'/src/fighters/lazySheets.js':'/src/fighters/kombatSheets.js';
  const costumes=await page.evaluate(async loader=>{
    const m=window.game.scene.getScene('Match'),{skinsFor,skinSheets}=await import('/src/fighters/skins.js'),{LAST_SEEN,SEEN}=await import('/src/fighters/lastSeen.js'),{ensureSheets}=await import(loader),{rosemaryRecoveryPose}=await import('/src/fighters/rosemaryRecovery.js');
    const skins=skinsFor('last-seen'),picks=skins.map((_,skin)=>({id:'last-seen',skin}));await ensureSheets(m,picks);
    const f=m.fighters[1],out=[];
    for(const def of [LAST_SEEN,SEEN])for(let i=0;i<skins.length;i++){
      if(skins[i].form==='tank')continue;f.def=def;f.skin=i;f.sheets=skinSheets(m,def,i);f.setState('upb');
      for(const t of [0,10,18,28,38,46,54,100]){f.t=t;const pose=rosemaryRecoveryPose(f);if(!pose||!m.textures.exists(pose.sheet)||!m.textures.get(pose.sheet).has(pose.frame))throw Error('Missing costume recovery '+def.name+':'+skins[i].name+':'+t);f.render(0);if(f.sprite.texture.key!==pose.sheet)throw Error('Recovery overwritten');if(f.sprite.rotation||f.sprite.scaleX!==1)throw Error('Deformed recovery');}
      out.push(def.name+':'+skins[i].name);
    }
    for(const name of ['ROSEMARY','MICHAEL AFTON']){
      const idx=name==='ROSEMARY'?0:skins.findIndex(s=>s.name===name);if(idx<0)throw Error('Missing costume '+name);
      f.def=SEEN;f.skin=idx;f.sheets=skinSheets(m,SEEN,idx);f.armedSheets=null;f.axeLost=0;
      const K=f.unarmedKeys(),needs=!m.textures.exists(K.pre+'recovery');
      const loaded=needs?new Promise(resolve=>m.load.once('complete',resolve)):Promise.resolve();f.loseAxe(300);await loaded;
      f.setState('upb');f.t=50;const pose=rosemaryRecoveryPose(f);if(!pose?.sheet.includes('noaxe')||!m.textures.get(pose.sheet).has(pose.frame))throw Error('Missing weaponless recovery');f.render(0);f.regainAxe?.();f.axeLost=0;f.armedSheets=null;
    }
    f.def=LAST_SEEN;f.skin=0;f.sheets=skinSheets(m,LAST_SEEN,0);return out.length;
  },loader);
  const recovery=await page.evaluate(async()=>{
    const m=window.game.scene.getScene('Match'),f=m.fighters[1],v=m.fighters[0],{LAST_SEEN}=await import('/src/fighters/lastSeen.js');
    for(const p of m.projectiles)p.kill();m.projectiles=[];m.hits.clear();m.frozen=0;m.cutscene=null;
    f.def=LAST_SEEN;f.placeAt(0,0);v.placeAt(250,0);f.grounded=v.grounded=true;f.platform=v.platform=m.stage.platforms[0];
    f.sightings=0;f.wantTurn=false;f.invincible=v.invincible=f.hitstop=v.hitstop=0;f.facing=1;
    f.ctrl.x=0;f.ctrl.y=0;f.isCpu=v.isCpu=false;f.startUpB(f.ctrl);
    let top=0,plunged=false,landed=false;
    for(let i=0;i<150;i++){
      m.tick();top=Math.min(top,f.y);if(f.state==='upb'&&f.t>=46&&f.vy>8)plunged=true;
      if(f.move?.recoveryLanding&&f.state==='attack'){landed=true;if(!f.grounded)throw Error('Shockwave before landing');break;}
    }
    if(top>-100||!plunged||!landed)throw Error('Toss/chase/plunge/land failed '+JSON.stringify({top,plunged,landed,state:f.state,t:f.t}));
    v.placeAt(f.x+25,0);v.setState('idle');v.invincible=v.hitstop=0;v.percent=0;f.t=1;m.resolveHits([]);if(v.percent!==6)throw Error('Landing attack missing '+v.percent);
    f.render(0);v.render(0);m.draw();window.landingSnapshot=true;
    const C=LAST_SEEN.moves.sideB.cling;if(C.fill!==2)throw Error('Meter cost not reduced');
    // A real successful cling still damages15 and now grants32 total SIGHTINGS.
    f.sightings=0;f.wantTurn=false;v.percent=0;v.invincible=v.hitstop=0;v.setState('hitstun');f.clingTo=v;f.setState('cling');
    m.applyHit(v,{owner:f,facing:1,id:'cling-start-test',h:LAST_SEEN.moves.sideB.hits[0]},f.x);
    for(const t of [12,24,36,48,54]){f.t=t;f.st_cling();}
    if(Math.abs(f.sightings-32)>.01||v.percent!==15)throw Error('Cling meter/damage '+f.sightings+'/'+v.percent);
    f.startUpB(f.ctrl);f.t=46;f.st_upb(f.ctrl);const spike=f.activeHitboxes()[0];if(!spike||spike.h.angle>=0)throw Error('No downward spike');
    f.t=112;f.st_upb(f.ctrl);if(f.state!=='helpless')throw Error('Missed ground recovery never ends');
    return {top,plunge:plunged,landingDamage:6,clingMeter:f.sightings,clingDamage:v.percent,spike:true,offstageEnd:true};
  });
  await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[1];f.setState('upb');f.t=50;f.y=-90;f.render(0);m.fighters[0].render(0);m.draw();});
  await page.screenshot({path:'recordings/test-output/recovery-castle/plunge.png'});
  await page.evaluate(()=>{const m=window.game.scene.getScene('Match'),f=m.fighters[1];f.placeAt(80,0);f.setState('idle');m.fighters[0].placeAt(-100,0);m.fighters[0].setState('idle');f.render(0);m.fighters[0].render(0);m.draw();});
  await page.screenshot({path:'recordings/test-output/recovery-castle/courtyard.png'});
  assert.deepEqual(errors,[]);console.log('PASS',JSON.stringify({rupture,costumes,recovery,castle:true}));
}finally{await browser.close();await server.close();}
