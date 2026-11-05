import {FONT} from '../config.js';

export const MANGA_PAGES = [
 {title:'THE SLAYER',panels:['rooftop','hunter'],captions:['Sector Nine had forgotten the sun.','Kira hunted machine cores. One more bounty, then freedom.']},
 {title:'THE LAST TARGET',panels:['factory','little'],captions:['The machines knew one law: OBEY.','A repair unit raised no weapon. "Please... my light is fading."']},
 {title:'A DIFFERENT CHOICE',panels:['choice','gift'],captions:['A slayer was paid to destroy cores. Kira lowered her blade.','She gave the little robot her spare cell. "Keep your light."']},
 {title:'THE WARDEN',panels:['warden','shield'],captions:['In Sector Nine, mercy was a crime. The Warden came to collect.','Kira stepped between its iron fist and the smallest light.']},
 {title:'ONE CLEAN CUT',panels:['slash','broken'],captions:['Steel met steel. For once, her blade protected a core.','The city heard a sound it had almost forgotten: silence.']},
 {title:'DAWN',panels:['dawn','garden'],captions:['Kira kept the name Robot Slayer. But she chose what it meant.','The little robot planted a seed. For the first time, they waited for tomorrow.']},
];

/** Draws one original manga panel with consistent ink silhouettes, hatching and pixel lettering. */
export function drawMangaPanel(scene,x,y,w,h,frame){
 const g=scene.add.graphics().setPosition(x,y).setScale(w/240,h/150).setDepth(21);
 const ink=0x17151b,paper=0xf2ead7,grey=0x8e8a85;
 const clamp=(n,max)=>Math.max(0,Math.min(max,n));
 const box=(a,b,c,d,col=ink)=>{const right=clamp(a+c,240),bottom=clamp(b+d,150);a=clamp(a,240);b=clamp(b,150);g.fillStyle(col);if(right>a&&bottom>b)g.fillRect(a,b,right-a,bottom-b);};
 const poly=(pts,col=ink)=>{g.fillStyle(col);g.fillPoints(pts.map(([a,b])=>({x:clamp(a,240),y:clamp(b,150)})),true);};
 const line=(a,b,c,d,col=ink,width=1)=>{g.lineStyle(width,col);g.lineBetween(clamp(a,240),clamp(b,150),clamp(c,240),clamp(d,150));};
 const city=(light=false)=>{for(let i=0;i<10;i++){const a=i*26-4,top=46+(i*31)%48;box(a,top,22,104-top,light?grey:ink);for(let b=top+6;b<99;b+=9)for(let c=a+4;c<a+19;c+=8)box(c,b,3,3,paper);}box(0,104,240,46,light?paper:grey);for(let i=0;i<12;i++)line(i*23,104,i*30-45,150,ink);};
 const hero=(a,b,k=1,pose='stand')=>{
  const p=pts=>{const points=pts.map(([u,v])=>[a+u*k,b+v*k]);poly(points);if(['hunter','slash','rooftop'].includes(frame)){g.lineStyle(1,paper);g.strokePoints(points.map(([x,y])=>({x,y})),true);}};
  const r=(u,v,ww,hh,c=ink)=>box(a+u*k,b+v*k,ww*k,hh*k,c);
  p([[-13,-52],[-8,-65],[0,-62],[7,-69],[14,-53],[12,-40],[-10,-40]]);
  r(-8,-53,18,13,paper);r(1,-49,6,2);p([[-11,-41],[10,-41],[14,-5],[-18,-5],[-12,-28]]);
  p([[-12,-40],[-25,-48],[-39,-43],[-27,-38],[-16,-34]]);r(-10,-35,20,3,grey);
  p([[-11,-7],[-3,-7],[-5,19],[-13,19]]);p([[1,-7],[9,-7],[17,19],[8,19]]);r(-15,18,12,4);r(8,18,14,4);
  if(pose==='slash'){p([[8,-34],[32,-48],[35,-43],[14,-22]]);line(a+31*k,b-46*k,a+66*k,b-93*k,paper,4*k);line(a+31*k,b-46*k,a+66*k,b-93*k,ink,k);}
  else{p([[9,-34],[16,-30],[21,-9],[16,-6],[10,-22]]);line(a+20*k,b-9*k,a+47*k,b-44*k,paper,4*k);line(a+20*k,b-9*k,a+47*k,b-44*k,ink,k);line(a+14*k,b-12*k,a+25*k,b-5*k,ink,3*k);}
 };
 const robot=(a,b,k=1,big=false)=>{
  const r=(u,v,ww,hh,c=ink)=>box(a+u*k,b+v*k,ww*k,hh*k,c);
  if(big){r(-25,-67,50,24);r(-20,-61,40,5,paper);r(-5,-61,10,5);r(-31,-40,62,34);r(-8,-32,16,16,paper);r(-3,-27,6,6);r(-47,-36,14,39);r(33,-36,14,39);r(-28,-3,17,25);r(11,-3,17,25);r(-34,19,24,7);r(10,19,24,7);for(let i=-20;i<=20;i+=10)r(i,-17,4,9,grey);}
  else{r(-12,-24,24,17);r(-9,-21,18,11,paper);r(-6,-17,3,3);r(3,-17,3,3);r(-3,-30,2,6);r(-6,-32,8,3);r(-10,-5,20,19);r(-5,0,10,8,paper);r(-14,14,11,6);r(3,14,11,6);r(-16,-3,4,13);r(12,-3,4,13);}
 };
 box(0,0,240,150,paper);
 // Sparse halftone and diagonal ink strokes keep the panels crisp at phone size.
 for(let a=4;a<240;a+=8)for(let b=4;b<150;b+=8)if((a+b)%24===0)box(a,b,1,1,grey);
 if(frame==='rooftop'){city();box(0,117,240,33);hero(157,103,.9);for(let i=0;i<22;i++)line(i*12,0,i*12-30,89,grey);}
 if(frame==='hunter'){box(0,0,240,150,ink);for(let i=0;i<14;i++)line(0,i*12,240,i*12-36,grey);hero(113,111,1.55);box(143,90,45,2,paper);}
 if(frame==='factory'){city();robot(145,90,1.1,true);for(let i=0;i<6;i++)line(130,32,12+i*13,140,paper);}
 if(frame==='little'){box(0,106,240,44,grey);robot(125,92,1.6);box(116,92,16,12,paper);line(15,119,225,119);for(let i=0;i<8;i++)line(i*35,119,i*35-25,150);}
 if(frame==='choice'){hero(76,105,1.2);robot(173,113,.8);line(111,75,166,103,ink,2);for(let i=0;i<10;i++)line(172+i*6,12,153+i*6,62,grey);}
 if(frame==='gift'){hero(74,114,1.1);robot(169,101,1.2);box(124,77,15,21);box(128,80,7,12,paper);for(const [a,b]of[[119,69],[145,72],[144,99],[114,98]])line(a,b,a+5,b-5);}
 if(frame==='warden'){box(0,0,240,150,ink);for(let i=0;i<17;i++)line(i*16,0,120+(i-8)*4,150,grey);robot(119,104,1.4,true);robot(205,132,.5);}
 if(frame==='shield'){robot(194,65,1.1,true);hero(105,113,1.2);robot(50,122,.65);poly([[136,72],[143,57],[151,74],[166,68],[157,83],[171,94],[151,94],[146,113],[138,94],[120,99],[129,84]],grey);}
 if(frame==='slash'){box(0,0,240,150,ink);for(let i=0;i<20;i++)line(0,i*10,240,i*10-70,grey);poly([[11,147],[150,24],[235,4],[113,125]],paper);hero(110,123,1.1,'slash');}
 if(frame==='broken'){robot(167,100,1.2,true);poly([[121,22],[229,83],[222,96],[114,35]],paper);box(153,55,14,14,paper);for(let i=0;i<14;i++){const a=20+(i*43)%210,b=12+(i*29)%120;box(a,b,5,4,ink);line(a-4,b-5,a-12,b-15,grey);}}
 if(frame==='dawn'){city(true);box(0,111,240,39,paper);hero(87,108,.85);robot(154,117,.8);for(let i=0;i<11;i++)line(195,20,i*24,95,grey);box(0,138,240,12);}
 if(frame==='garden'){robot(70,105,1.1);hero(174,108,.95);box(108,110,28,20);box(110,107,24,5,grey);line(122,108,122,80,ink,2);poly([[122,93],[109,84],[110,79],[121,84]]);poly([[122,87],[134,76],[140,79],[130,88]]);line(19,134,224,134);}
 g.lineStyle(3,ink);g.strokeRect(0,0,240,150);
 const parts=[g];
 if(frame==='warden'||frame==='slash'||frame==='broken')parts.push(scene.add.text(x+12,y+12,frame==='warden'?'KRRRANG':frame==='slash'?'SHIIING':'...', {fontFamily:FONT,fontSize:'10px',color:frame==='broken'?'#17151b':'#f2ead7',stroke:frame==='broken'?'#f2ead7':'#17151b',strokeThickness:2}).setDepth(22));
 return parts;
}
