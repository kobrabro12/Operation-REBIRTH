import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({server:{host:'127.0.0.1',port:0},logLevel:'silent'});
await server.listen();const url=server.resolvedUrls.local[0];
const browser=await chromium.launch({executablePath:process.env.SIM_CHROME||'/usr/bin/chromium',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--mute-audio','--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(u.includes('/npm/phaser@'))return r.fulfill({body:readFileSync('node_modules/phaser/dist/phaser.min.js'),contentType:'application/javascript'});return u.startsWith(url)?r.continue():r.abort();});
 await page.goto(url);await page.waitForFunction(()=>window.game?.scene?.isActive('Title'),null,{timeout:120000});
 await page.evaluate(()=>{for(const s of window.game.scene.getScenes(true))window.game.scene.stop(s.scene.key);window.game.scene.start('CartridgeGame',{id:'star-patrol'});});
 await page.waitForFunction(()=>window.game.scene.isActive('CartridgeGame'));
 const fleets=[];
 for(let wave=1;wave<=3;wave++){
  const result=await page.evaluate(wave=>{
   const s=window.game.scene.getScene('CartridgeGame'),quiet={x:0,action:false,jump:false};
   s.paused=true;while(s.levelIntro){s.paused=false;s.step(quiet);s.paused=true;}
   if(s.wave!==wave)throw Error('Wave did not advance');
   s.paused=false;s.draw();
   const fleet={name:s.level.name,color:s.level.color,formation:s.level.formation,count:s.enemies.length,layout:s.enemies.map(e=>[e.baseX,e.baseY])};
   s.invincible=10000;s.player.x=570;s.levelFrame=s.level.fireEvery-1;s.step(quiet);
   if(s.level.pattern==='straight'&&(s.shots.length!==1||s.shots[0].vx!==0))throw Error('Scout fire pattern');
   if(s.level.pattern==='spread'&&(s.shots.length!==2||s.shots[0].vx>=0||s.shots[1].vx<=0))throw Error('Raider spread pattern');
   if(s.level.pattern==='aimed'&&(s.shots.length!==1||s.shots[0].vx<=0))throw Error('Commander aiming');
   s.shots=[];return fleet;
  },wave);
  fleets.push(result);await page.screenshot({path:`recordings/test-output/patrol-wave-${wave}.png`});
  await page.evaluate(wave=>{
   const s=window.game.scene.getScene('CartridgeGame'),quiet={x:0,action:false,jump:false};s.paused=false;
   const boss=s.enemies.find(e=>e.maxHP>1);
   if(boss){s.bullets=[{x:boss.x,y:boss.y+5,w:3,h:8}];s.step(quiet);if(boss.hp!==boss.maxHP-1||!s.enemies.includes(boss))throw Error('Commander armour missing');}
   for(let tick=0;tick<30&&s.wave===wave&&!s.ended;tick++){
    s.bullets=s.enemies.map(e=>({x:e.x,y:e.y+5,w:3,h:8}));s.step(quiet);
   }
   if(wave<3){if(s.wave!==wave+1||s.levelIntro!==75||s.bullets.length||s.shots.length||s.levelFrame!==0)throw Error('Encounter not replaced cleanly');}
   else if(!s.won)throw Error('Commander defeat did not win');
   s.paused=true;
  },wave);
 }
 assert.equal(new Set(fleets.map(f=>f.formation)).size,3);assert.equal(new Set(fleets.map(f=>f.color)).size,3);
 await page.evaluate(()=>{window.game.scene.stop('CartridgeGame');window.game.scene.start('CartridgeGame',{id:'crypt-runner'});});
 await page.waitForFunction(()=>window.game.scene.isActive('CartridgeGame')&&window.game.scene.getScene('CartridgeGame').gameDef.id==='crypt-runner');
 const rooms=[];
 for(let room=1;room<=8;room++){
  const result=await page.evaluate(room=>{
   const s=window.game.scene.getScene('CartridgeGame'),quiet={x:0,action:false,jump:false};s.paused=false;
   while(s.levelIntro)s.step(quiet);
   if(s.room!==room)throw Error('Wrong crypt room');
   const info={name:s.level.name,theme:s.level.theme,layout:s.platforms.map(p=>[p.x1,p.x2,p.y])};
   s.draw();return info;
  },room);
  rooms.push(result);await page.screenshot({path:`recordings/test-output/crypt-room-${room}.png`});
  await page.evaluate(room=>{
   const s=window.game.scene.getScene('CartridgeGame'),quiet={x:0,action:false,jump:false},platforms=s.platforms;
   const score=s.score,lives=s.lives,level=s.level,edges=platforms.map(()=>[]);
   // Discover jumps using the actual game physics, then replay them as ordinary movement and jump input.
   // Keep the exit away and remove pickups/patrols only during route discovery.
   s.level={...level,exit:[10000,286]};s.gems=[];s.monsters=[];s.invincible=10000;
   const platformAt=()=>platforms.findIndex(p=>Math.abs(s.player.y+s.player.h/2-p.y)<.01&&s.player.x>=p.x1&&s.player.x<=p.x2);
   for(let from=0;from<platforms.length;from++)for(let to=0;to<platforms.length;to++){
    if(from===to)continue;
    const a=platforms[from],b=platforms[to];
    for(const target of [(b.x1+b.x2)/2,b.x1+12,b.x2-12]){
    const launch=Math.max(a.x1+10,Math.min(a.x2-10,target));
    s.player={x:launch,y:a.y-8.5,w:12,h:17,vx:0,vy:0,grounded:true};
    for(let t=0;t<70;t++){
     s.stepCrypt({x:Math.abs(target-s.player.x)<1.5?0:Math.sign(target-s.player.x),jump:t===0});
     if(s.player.y>306)break;
     if(s.player.grounded){if(platformAt()===to)edges[from].push({to,launch,target});break;}
    }
    if(edges[from].some(e=>e.to===to))break;
    }
   }
   s.level=level;s.setupLevel();s.score=score;s.lives=lives;s.invincible=10000;s.paused=false;
   let node=0;
   const complete=()=>s.room!==room||s.ended;
   const walk=target=>{
    for(let t=0;t<220&&Math.abs(target-s.player.x)>1.5&&!complete();t++)s.stepCrypt({x:Math.sign(target-s.player.x),jump:false});
    if(!complete()&&Math.abs(target-s.player.x)>1.5)throw Error('Cannot walk to launch point in '+level.name);
   };
   const reach=target=>{
    const queue=[{node,path:[]}],seen=new Set([node]);let path;
    while(queue.length){const next=queue.shift();if(next.node===target){path=next.path;break;}for(const edge of edges[next.node])if(!seen.has(edge.to)){seen.add(edge.to);queue.push({node:edge.to,path:[...next.path,edge]});}}
    if(!path)throw Error('Unreachable platform '+target+' in '+level.name);
    for(const edge of path){
     walk(edge.launch);if(complete())return;
     for(let t=0;t<70;t++){
      s.stepCrypt({x:Math.abs(edge.target-s.player.x)<1.5?0:Math.sign(edge.target-s.player.x),jump:t===0});
      if(complete())return;
      if(s.player.y>306)throw Error('Route fell into a gap in '+level.name);
      if(s.player.grounded)break;
     }
     if(platformAt()!==edge.to)throw Error('Jump cannot land in '+level.name);node=edge.to;
    }
   };
   for(const [x,y]of level.gems){
    if(complete())break;
    const target=platforms.findIndex(p=>x>=p.x1&&x<=p.x2&&p.y===y+20);
    reach(target);if(!complete())walk(x);
   }
   if(!complete()){
    if(!s.gems.every(g=>g.taken))throw Error('A gem cannot be collected in '+level.name);
    const [x,y]=level.exit;reach(platforms.findIndex(p=>x>=p.x1&&x<=p.x2&&p.y===y));if(!complete())walk(x);
   }
   if(room<8&&(s.room!==room+1||s.levelIntro!==75||s.lives!==lives||s.score<=score))throw Error('Room exit did not advance cleanly');
   if(room===8&&!s.won)throw Error('Last crypt did not win');
   s.paused=true;
  },room);
 }
 assert.equal(new Set(rooms.map(r=>r.name)).size,8);assert.equal(new Set(rooms.map(r=>JSON.stringify(r.layout))).size,8);
 assert.deepEqual(errors,[]);console.log('PASS three distinct wave formations/fire patterns, armoured commander, clean transitions, and eight unique crypt rooms completed using real walking/jumping physics');
}finally{await browser.close();await server.close();}
