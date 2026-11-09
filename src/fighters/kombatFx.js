import {pixel, line, crystal} from './themePixels.js';

/** Draw a repeatable, stepped lightning arc without allocating particles. */
export function kombatBolt(g,x,y,tx,ty,t,color=0xb3f5ff,width=2) {
  let px=x,py=y;
  for(let i=1;i<=8;i++){
    const k=i/8,offset=i===8?0:Math.sin(i*9+Math.floor(t/4)*2)*7;
    const xx=x+(tx-x)*k+offset,yy=y+(ty-y)*k;
    line(g,px,py,xx,yy,color,width);px=xx;py=yy;
  }
}

/** Unfold a blue steel fan around its hand-held pivot. */
export function kombatFan(g,x,y,r,angle,alpha=1) {
  const points=[{x,y}];
  for(let i=0;i<=6;i++){const a=angle-1.2+i*.4;points.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r});}
  g.fillStyle(0x245ca2,alpha);g.fillPoints(points,true);
  for(let i=1;i<points.length;i++){const p=points[i];line(g,x,y,p.x,p.y,0xd4efff,1,alpha);if(i>1)line(g,points[i-1].x,points[i-1].y,p.x,p.y,0xeaffff,2,alpha);}
  pixel(g,x-1,y-1,3,3,0x8bc7ec,alpha);
}

/** Draw individual chain links and the sharp kunai at its end. */
export function kombatChain(g,x,y,tx,ty,t,alpha=1) {
  const n=Math.min(35,Math.max(1,Math.ceil(Math.hypot(tx-x,ty-y)/8)));
  for(let i=0;i<n;i++){const k=i/n,xx=x+(tx-x)*k,yy=y+(ty-y)*k+Math.sin(k*Math.PI)*Math.sin(t*.05)*5;g.lineStyle(1,i%2?0xd9c396:0x8e7760,alpha);g.strokeRect(Math.round(xx)-2,Math.round(yy)-1,5,i%2?2:4);}
  const a=Math.atan2(ty-y,tx-x),dx=Math.cos(a),dy=Math.sin(a);
  g.fillStyle(0xe2e4d4,alpha);g.fillTriangle(tx+dx*10,ty+dy*10,tx-dy*4,ty+dx*4,tx+dy*4,ty-dx*4);
}

/** Render a pixel soul with a wavering tail and a tiny readable face. */
export function kombatSoul(g,x,y,t,scale=1,alpha=1) {
  x=Math.round(x);y=Math.round(y);
  pixel(g,x-3*scale,y-4*scale,6*scale,6*scale,0x64e887,alpha);
  pixel(g,x-2*scale,y-5*scale,4*scale,scale,0xd3ffc3,alpha);
  for(let i=0;i<4;i++)pixel(g,x+Math.sin(t*.1+i)*2*scale,y+(2+i)*scale,(4-i)*scale,scale,0x64e887,alpha*(1-i*.2));
  pixel(g,x-2*scale,y-2*scale,scale,2*scale,0x17422b,alpha);pixel(g,x+scale,y-2*scale,scale,2*scale,0x17422b,alpha);
}

/** Keep each shop homage's cosmetic effects attached through movement and attacks. */
export function drawKombatAura(f,g) {
  const kind=f.vfx?.aura?.kombat;if(!kind)return;
  const x=Math.round(f.sprite.x),y=Math.round(f.sprite.y),t=f.anim,d=f.facing,back=f.fxBack;
  const active=['attack','charge','swingcharge','upb','sideb','downb','limit','summon','counterstrike'].includes(f.state);
  if(kind==='ermac'){
    for(let i=0;i<3;i++){const a=t*.035+i*2.094;kombatSoul(Math.sin(a)<0?back:g,x+Math.cos(a)*24,y-28+Math.sin(a)*17,t+i*13,.7,active?.85:.5);}
    if(active){g.lineStyle(1,0x9aff98,.55);g.strokeEllipse(x,y-24,36+Math.sin(t*.15)*5,49);}
  }else if(kind==='raiden'){
    for(let i=0;i<2;i++){const a=t*.05+i*Math.PI,xx=x+Math.cos(a)*19,yy=y-31+Math.sin(a)*18;if(active||t%48<12)kombatBolt(g,x+d*10,y-27,xx,yy,t+i*6,0xb5efff,1);}
    if(active)kombatBolt(back,x-16,y-6,x+16,y-49,t,0x57b6fb,1);
  }else if(kind==='kitana'){
    if(active){for(let i=0;i<2;i++){const a=t*.12+i*Math.PI;kombatFan(Math.sin(a)<0?back:g,x+Math.cos(a)*26,y-24+Math.sin(a)*15,10,a,.85);}}
    else for(let i=0;i<3;i++)pixel(back,x-12+i*11,y-4-(t+i*13)%48*.5,1,2,0x9dcfff,.45);
  }else if(kind==='scorpion'){
    for(let i=0;i<5;i++){const p=(t*1.4+i*11)%48/48;pixel(back,x-14+i*7+d*Math.sin(p*7)*2,y-2-p*(active?40:15),2,p<.5?3:2,i%2?0xffcc69:0xf07734,(1-p)*.7);}
    if(active)kombatChain(back,x+d*10,y-26,x-d*23,y-17,t,.65);
  }else if(kind==='subzero'){
    for(let i=0;i<5;i++){const p=(t+i*17)%83/83;crystal(back,x-22+i*11+Math.sin(p*6)*2,y-52+p*47,1,0x9edfff,0xecffff,(1-p)*.7);}
    if(active||Math.abs(f.vx)>1)for(let i=0;i<3;i++)crystal(back,x-d*(8+i*9),y-2,2,0x69abdf,0xd9ffff,(3-i)/5);
  }
}
