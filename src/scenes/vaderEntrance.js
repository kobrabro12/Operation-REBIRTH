import {vaderIntroPose} from '../fighters/vaderAnimation.js';
import {sfx} from '../audio/sfx.js';

/** Open a red-lit blast door, reveal Vader, and sample his saber-ignition cels. */
export function drawVaderEntrance(g,e,p,t){
  if(e.I.kind!=='vader-door')return null;
  const x=e.x,y=e.y,open=Math.max(0,Math.min(1,(p-.15)/.45)),fade=p>.85?Math.max(0,1-(p-.85)/.25):1;
  if(p<0)return {vis:0,dy:0,sc:1};
  if(p<1.1){
    g.lineStyle(3,0x30333f,fade);g.strokeRect(x-37,y-85,74,87);
    g.fillStyle(0x11121a,fade);g.fillRect(x-38,y-85,5,88);g.fillRect(x+33,y-85,5,88);
    g.fillStyle(0x282b36,fade);g.fillRect(x-33,y-82,33*(1-open),83);g.fillRect(x+33*open,y-82,33*(1-open),83);
    g.fillStyle(0x505361,.6*fade);g.fillRect(x-31,y-80,2,79);g.fillRect(x+29,y-80,2,79);
    g.fillStyle(0xc62943,fade);g.fillRect(x-42,y-62,3,5);g.fillRect(x+39,y-62,3,5);
    g.fillStyle(0xff6575,fade);g.fillRect(x-41,y-61,1,2);g.fillRect(x+40,y-61,1,2);
    for(let i=0;i<5;i++){const at=(t+i*13)%48;g.fillStyle(0x626674,fade*.22*(1-at/48));g.fillRect(Math.round(x-27+i*12-at*.13),Math.round(y-4-at*.18),8,3);}
  }
  if(open>0&&!e.vaderDoorSound){e.vaderDoorSound=true;sfx('whoosh',.3,.45);}
  const vis=p>.37?1:0,pose=vaderIntroPose(e.f,Math.max(0,Math.min(1,(p-.35)/.65)));
  if(vis&&pose){const spr=e.f.sprite;const flip=e.f.facing<0;spr.setTexture(pose.sheet,pose.frame).setOrigin(flip?1-81/180:81/180,111/140).setRotation(0).setScale(1,1).setFlipX(flip);}
  return {vis,dy:0,sc:1};
}
