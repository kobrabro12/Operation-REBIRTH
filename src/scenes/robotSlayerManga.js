// Original English-language manga: panel order is right-to-left, then top-to-bottom.
export const MANGA_PAGES=[
 {title:'THE SLAYER',panels:[
  {frame:'rooftop',narration:'Sector Nine had forgotten the sun.'},
  {frame:'eyes',speech:'One last bounty. Then I leave this city.'},
  {frame:'hunter',narration:'Kira. Licensed machine hunter.'},
  {frame:'alley',speech:'The signal is close.'},
  {frame:'blade',speech:'Just another core...'},
  {frame:'factory',narration:'But the smallest signals are not always the weakest.'}]},
 {title:'THE LAST TARGET',panels:[
  {frame:'factory',narration:'The old factory still obeyed its masters.'},
  {frame:'scan',speech:'No weapon. No armor. What are you?'},
  {frame:'battery',narration:'One damaged repair unit. One dying cell.'},
  {frame:'little',speech:'Please... my light is fading.'},
  {frame:'choice',speech:'You are afraid of me.'},
  {frame:'eyes',speech:'Machines are not supposed to be afraid.'}]},
 {title:'A DIFFERENT CHOICE',panels:[
  {frame:'blade',narration:'A slayer was paid to destroy cores.'},
  {frame:'hand',speech:'This is my last spare cell.'},
  {frame:'gift',speech:'Keep your light.'},
  {frame:'little',speech:'You... repaired me?'},
  {frame:'smile',speech:'Do not make me regret it.'},
  {frame:'warning',narration:'UNAUTHORIZED COMPASSION DETECTED.'}]},
 {title:'THE WARDEN',panels:[
  {frame:'warden',speech:'HUNTER. SURRENDER THE UNIT.'},
  {frame:'warning',narration:'In Sector Nine, mercy was a crime.'},
  {frame:'shield',speech:'You will have to go through me.'},
  {frame:'clash',sfx:'KLANG'},
  {frame:'little',speech:'Kira!'},
  {frame:'draw',speech:'Stay behind me.'}]},
 {title:'ONE CLEAN CUT',panels:[
  {frame:'draw',narration:'For once, the blade would protect a core.'},
  {frame:'eyes',speech:'I choose my own targets.'},
  {frame:'slash',sfx:'SHING'},
  {frame:'broken',sfx:'KRASH'},
  {frame:'silence',narration:'The city almost remembered silence.'},
  {frame:'gift',speech:'You did not destroy me.'}]},
 {title:'DAWN',panels:[
  {frame:'dawn',narration:'Morning found two travelers at the city gates.'},
  {frame:'hunter',speech:'They will still call me Robot Slayer.'},
  {frame:'smile',speech:'But I decide what that means.'},
  {frame:'garden',narration:'The little robot planted a seed.'},
  {frame:'hand',speech:'Will it grow?'},
  {frame:'dawn',narration:'For the first time, they waited for tomorrow.  END'}]},
];
const PAPER='#fffefa',INK='#151419';
/** Draws traditional ink linework, expressive faces, screentones and balloon lettering into a panel. */
function inkPanel(ctx,x,y,w,h,panel){
 ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.scale(w/360,h/220);
 ctx.fillStyle=PAPER;ctx.fillRect(0,0,360,220);ctx.lineJoin='round';ctx.lineCap='round';
 const path=(d,fill=null,width=1.2)=>{ctx.beginPath();for(const cmd of d){const [op,...a]=cmd;if(op==='M')ctx.moveTo(...a);else if(op==='L')ctx.lineTo(...a);else if(op==='Q')ctx.quadraticCurveTo(...a);else if(op==='C')ctx.bezierCurveTo(...a);else if(op==='Z')ctx.closePath();}if(fill){ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=INK;ctx.lineWidth=width;ctx.stroke();};
 const line=(a,b,c,d,color=INK,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();};
 const ellipse=(a,b,rx,ry,fill=PAPER,width=1.2)=>{ctx.beginPath();ctx.ellipse(a,b,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=INK;ctx.lineWidth=width;ctx.stroke();};
 const rect=(a,b,ww,hh,fill=PAPER,width=1)=>{ctx.fillStyle=fill;ctx.fillRect(a,b,ww,hh);ctx.strokeStyle=INK;ctx.lineWidth=width;ctx.strokeRect(a,b,ww,hh);};
 const tone=(a,b,ww,hh,density=7)=>{ctx.save();ctx.beginPath();ctx.rect(a,b,ww,hh);ctx.clip();ctx.fillStyle=INK;for(let yy=b;yy<b+hh;yy+=density)for(let xx=a;xx<a+ww;xx+=density){ctx.beginPath();ctx.arc(xx+(Math.floor(yy/density)%2)*density/2,yy,.7,0,7);ctx.fill();}ctx.restore();};
 const city=(dawn=false)=>{
  if(!dawn)tone(0,0,360,115,9);
  for(let i=0;i<12;i++){const xx=i*34-17,top=55+i*37%65;rect(xx,top,29,152-top,dawn?'#e1e0de':'#333139');for(let yy=top+8;yy<145;yy+=12)for(let j=0;j<2;j++)rect(xx+5+j*12,yy,5,7,dawn?PAPER:'#ece9e1',.4);line(xx-3,top,xx+32,top,INK,2);}
  for(let i=0;i<8;i++)line(i*70-90,220,180,147,INK,.6);
  path([['M',0,135],['Q',130,159,360,117]],null,1);path([['M',10,120],['Q',170,147,352,105]],null,.6);
  if(dawn){ellipse(288,43,26,26,PAPER,.6);for(let i=0;i<14;i++)line(288,43,i*32-35,158,'#aaa9a7',.5);}
 };
 const face=(x,y,s=1,soft=false)=>{
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  path([['M',-15,-15],['Q',-20,0,-13,17],['L',-5,26],['Q',1,31,8,24],['Q',20,16,18,-3],['L',15,-20],['Q',0,-30,-15,-15]],PAPER,1.3);
  path([['M',-17,8],['Q',-29,-10,-16,-28],['L',-6,-35],['L',-4,-28],['L',11,-39],['L',15,-26],['Q',27,-27,30,-12],['L',21,-17],['L',22,9],['L',15,1],['L',11,-20],['Q',5,-10,-4,-8],['L',1,-22],['Q',-10,-14,-17,8]],INK,1.2);
  path([['M',-13,-1],['Q',-7,soft?-5:-8,-1,-1]],null,1.6);path([['M',4,-2],['Q',10,soft?-6:-10,15,-3]],null,1.6);
  path([['M',-13,-1],['Q',-7,7,-1,-1]],null,.7);path([['M',4,-2],['Q',10,5,15,-3]],null,.7);
  ellipse(-6,0,2.5,4.3,INK,.5);ellipse(10,-1,2.3,4.1,INK,.5);ellipse(-5,-2,.8,1,PAPER,.1);ellipse(11,-3,.7,.8,PAPER,.1);
  line(-14,-7,-3,soft?-9:-11,INK,1.1);line(5,-10,15,soft?-9:-13,INK,1.1);
  path([['M',2,3],['L',0,11],['L',4,12]],null,.6);path([['M',-3,18],['Q',3,soft?23:16,9,17]],null,.8);
  for(let i=0;i<4;i++){line(-12+i*2,10,-14+i*2,14,'#666',.45);line(9+i*2,8,8+i*2,11,'#666',.45);}
  path([['M',-20,-16],['Q',-27,7,-18,30],['L',-21,52],['L',-13,38],['Q',-18,12,-14,3]],INK,.8);
  ctx.restore();
 };
 const hero=(x,y,s=1,pose='stand')=>{
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  path([['M',-18,-74],['Q',-27,-63,-21,-39],['L',-28,-7],['L',-8,-15],['L',0,-8],['L',19,-12],['L',13,-48],['Q',23,-66,11,-75],['L',-18,-74]],INK,1.8);
  path([['M',-7,-70],['L',5,-70],['L',11,-23],['L',-9,-20],['L',-7,-70]],PAPER,1);
  path([['M',-20,-74],['Q',-39,-97,-72,-81],['Q',-45,-72,-34,-61],['L',-16,-68]],PAPER,1.4);
  for(let i=0;i<6;i++)line(-31-i*5,-78,-34-i*5,-83,INK,.6);
  path([['M',-18,-11],['L',-14,16],['L',-7,18],['L',-3,-14]],'#aaa8a5',1.4);path([['M',3,-14],['L',11,16],['L',19,15],['L',13,-15]],PAPER,1.5);
  path([['M',-14,12],['L',-22,22],['L',-6,23],['L',-5,14]],INK,1);path([['M',10,12],['L',12,23],['L',29,23],['Q',25,15,18,13]],INK,1);
  line(-17,-28,15,-26,PAPER,2);rect(-1,-31,8,7,PAPER,.8);line(-11,-68,9,-39,INK,1);for(let i=0;i<4;i++)ellipse(4,-58+i*7,1,1,INK,.2);
  if(pose==='slash'||pose==='draw'){
   path([['M',-17,-68],['L',-3,-84],['L',24,-99],['L',29,-93],['L',9,-72],['L',-11,-54]],PAPER,1.3);
   ellipse(28,-97,5,7,PAPER,1);line(30,-96,76,-158,INK,4);line(31,-98,77,-160,PAPER,2);line(20,-103,36,-91,INK,2);
  }else{
   path([['M',12,-68],['Q',27,-61,20,-39],['L',32,-23],['L',27,-18],['L',12,-35],['L',9,-58]],PAPER,1.3);
   ellipse(30,-22,5,7,PAPER,1);line(33,-21,69,-79,INK,4);line(34,-23,70,-81,PAPER,2);line(23,-26,38,-16,INK,2);
  }
  for(let i=0;i<8;i++)line(-24,-39+i*3,-14,-45+i*3,PAPER,.45);
  face(0,-98,1,pose==='smile');ctx.restore();
 };
 const robot=(x,y,s=1,boss=false)=>{
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  if(boss){
   for(const side of [-1,1]){
    ellipse(side*35,-61,16,16,INK,1);rect(side<0?-58:40,-62,18,45,'#a5a4a2',1.5);for(let i=0;i<5;i++)line(side<0?-57:41,-57+i*7,side<0?-42:56,-57+i*7,INK,1);
    ellipse(side*48,-13,13,13,INK,1);path([['M',side*55,-10],['L',side*62,9],['L',side*45,20],['L',side*37,3]],'#d1d0cc',1.2);
    rect(side<0?-28:10,-1,19,31,'#aaa9a5',1.3);path([['M',side*11,26],['L',side*34,27],['L',side*42,39],['L',side*9,39]],INK,1.2);
   }
   path([['M',-29,-72],['L',28,-72],['L',34,-20],['Q',0,-1,-35,-20],['Z']],PAPER,2);
   path([['M',-22,-110],['L',20,-116],['L',28,-83],['L',12,-72],['L',-26,-79],['Z']],INK,1.6);
   path([['M',-18,-98],['L',19,-100],['L',17,-91],['L',-15,-89],['Z']],PAPER,.7);line(0,-99,0,-90,INK,3);
   ellipse(0,-45,13,16,INK,1);ellipse(0,-45,8,10,PAPER,1);for(let i=-20;i<25;i+=9){ellipse(i,-65,1.5,1.5,INK,.1);line(i,-24,i+3,-15,INK,.6);}
  }else{
   ctx.beginPath();ctx.roundRect(-20,-40,40,30,9);ctx.fillStyle=PAPER;ctx.fill();ctx.lineWidth=1.7;ctx.strokeStyle=INK;ctx.stroke();
   rect(-14,-31,28,13,'#cccac5',.6);ellipse(-7,-25,3.5,4.5,INK,.4);ellipse(8,-25,3.5,4.5,INK,.4);
   line(0,-41,2,-51,INK,1);ellipse(2,-54,3,3,PAPER,1);rect(-16,-5,32,29,PAPER,1.5);ellipse(0,8,8,9,INK,1);ellipse(0,8,4,4,PAPER,.7);
   for(const side of [-1,1]){ellipse(side*21,0,4,5,INK,1);line(side*23,1,side*28,17,INK,3);ellipse(side*28,18,4,5,PAPER,1);line(side*9,24,side*10,35,INK,4);ellipse(side*12,37,9,4,INK,.5);}
   for(let i=0;i<3;i++)line(-10+i*4,17,-12+i*4,21,INK,.4);
  }
  ctx.restore();
 };
 const frame=panel.frame;
 if(['rooftop','alley','factory','dawn','silence'].includes(frame))city(frame==='dawn');
 if(frame==='rooftop'){rect(0,190,360,30,INK,0);hero(220,188,.84);for(let i=0;i<40;i++)line(i*11,0,i*11-30,184,'#777',.5);}
 else if(frame==='alley'){path([['M',0,30],['L',110,80],['L',110,220],['L',0,220]],'#bbb',1);path([['M',360,10],['L',250,75],['L',250,220],['L',360,220]],'#999',1);hero(185,190,.7);for(let i=0;i<6;i++)line(0,65+i*25,110,90+i*19,INK,.6);}
 else if(frame==='eyes'||frame==='smile'){tone(0,65,360,155,5);hero(217,273,1.65,frame==='smile'?'smile':'stand');for(let i=0;i<9;i++)line(0,100+i*10,97,78+i*11,'#aaa',.5);}
 else if(frame==='hunter'){tone(0,0,360,220,6);hero(196,191,1,'stand');for(let i=0;i<15;i++)line(-10,30+i*14,360,i*14-44,'#aaa',.55);}
 else if(frame==='factory'){robot(258,168,1.12,true);hero(97,191,.54);line(5,200,356,200);}
 else if(frame==='scan'){rect(14,69,332,136,'#d2d1ce',1);robot(183,154,1.1);for(const a of [30,300]){line(a,83,a+30,83,INK,2);line(a,83,a,105,INK,2);}line(30,187,60,187,INK,2);line(300,187,330,187,INK,2);}
 else if(frame==='little'){tone(0,70,360,150,8);robot(195,149,1.55);line(0,211,360,211);}
 else if(frame==='blade'){tone(0,40,360,180,7);path([['M',11,202],['Q',58,125,114,143],['L',180,170],['Q',197,184,173,193],['L',112,179],['L',145,207],['Q',139,219,119,208],['L',74,181],['L',38,220]],PAPER,1.5);path([['M',146,162],['L',319,38],['L',309,60],['L',158,174],['Z']],PAPER,1.5);line(154,164,314,44,INK,.6);line(134,156,164,181,INK,4);for(let i=0;i<7;i++)line(92+i*7,171,101+i*7,180,INK,.8);}
 else if(frame==='battery'||frame==='hand'){tone(0,60,360,160,8);path([['M',35,184],['Q',96,107,139,122],['L',244,149],['Q',265,171,233,179],['L',165,173],['L',202,196],['Q',200,211,178,202],['L',118,177],['L',75,215]],PAPER,1.6);rect(157,94,48,65,INK,1);rect(164,101,33,42,PAPER,1);rect(172,86,16,8,INK,1);for(let i=0;i<5;i++)line(80+i*11,168,93+i*11,181,INK,.6);}
 else if(frame==='choice'||frame==='gift'){hero(104,194,.89);robot(267,171,1);if(frame==='gift'){rect(172,118,24,38,INK,1);rect(178,123,12,23,PAPER,1);for(let i=0;i<8;i++){const a=i*Math.PI/4;line(185+Math.cos(a)*27,137+Math.sin(a)*27,185+Math.cos(a)*40,137+Math.sin(a)*40,INK,.7);}}}
 else if(frame==='warden'||frame==='warning'){tone(0,0,360,220,5);robot(219,172,1.2,true);if(frame==='warning')for(let i=0;i<9;i++)line(223,45,i*50-40,220,'#aaa',.7);}
 else if(frame==='shield'||frame==='clash'){robot(277,139,.95,true);hero(148,199,.9,'draw');robot(56,177,.65);for(let i=0;i<12;i++)line(218,103,i*37-30,223,'#999',.5);}
 else if(frame==='draw'){tone(0,50,360,170,6);hero(183,213,1.1,'draw');for(let i=0;i<15;i++)line(5,105+i*7,110,80+i*6,'#888',.6);}
 else if(frame==='slash'){tone(0,0,360,220,5);path([['M',-20,220],['Q',148,40,361,33],['Q',196,85,53,229],['Z']],PAPER,1);hero(179,199,.9,'slash');for(let i=0;i<16;i++)line(-20,70+i*13,360,i*10-20,'#aaa',.4);}
 else if(frame==='broken'){robot(230,172,1.1,true);path([['M',130,59],['L',346,164],['L',337,184],['L',121,74],['Z']],PAPER,.4);for(let i=0;i<20;i++){const a=22+i*53%330,b=80+i*37%135;path([['M',a,b],['L',a+7,b-5],['L',a+4,b+8],['Z']],INK,.5);}}
 else if(frame==='silence'){tone(0,130,360,90,8);robot(265,203,.4,true);hero(102,198,.7);}
 else if(frame==='dawn'){hero(118,192,.84);robot(250,176,.82);}
 else if(frame==='garden'){hero(284,193,.84,'smile');robot(102,169,1);path([['M',156,176],['L',203,176],['L',196,215],['L',163,215],['Z']],INK,1);line(180,177,180,143,INK,1.6);path([['M',180,160],['Q',152,144,162,136],['Q',180,135,180,160]],PAPER,1);path([['M',180,150],['Q',194,123,206,136],['Q',202,150,180,150]],PAPER,1);}
 // Lettering belongs to the paper, rather than to the game's pixel-font HUD.
 const wrap=(text,maxWidth,font)=>{ctx.font=font;const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;};
 if(panel.speech){const lines=wrap(panel.speech.toUpperCase(),140,'11px Arial, sans-serif'),hh=Math.max(45,lines.length*13+15),cx=267,cy=hh/2+8;ellipse(cx,cy,83,hh/2,PAPER,1.2);path([['M',238,hh+3],['Q',245,hh+12,227,hh+25],['L',253,hh+4]],PAPER,.8);ctx.fillStyle=INK;ctx.font='11px Arial, sans-serif';ctx.textAlign='center';lines.forEach((t,i)=>ctx.fillText(t,cx,cy-(lines.length-1)*6.5+i*13+4));}
 if(panel.narration){const lines=wrap(panel.narration,145,'italic 10px Georgia, serif');rect(10,9,156,lines.length*12+12,PAPER,.8);ctx.fillStyle=INK;ctx.font='italic 10px Georgia, serif';ctx.textAlign='left';lines.forEach((t,i)=>ctx.fillText(t,16,24+i*12));}
 if(panel.sfx){ctx.save();ctx.translate(25,108);ctx.rotate(-.19);ctx.font='italic bold 30px Georgia, serif';ctx.lineWidth=3;ctx.strokeStyle=PAPER;ctx.strokeText(panel.sfx,0,0);ctx.fillStyle=INK;ctx.fillText(panel.sfx,0,0);ctx.restore();}
 ctx.restore();ctx.strokeStyle=INK;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
}
/** Gets a reusable canvas texture; only one page and one enlarged panel stay in memory. */
function canvasTexture(scene,key,w,h){const t=scene.textures.exists(key)?scene.textures.get(key):scene.textures.createCanvas(key,w,h);const c=t.getContext();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);return[t,c];}
/** Creates the shelf paperback's illustrated cover in the same ink style as its pages. */
export function ensureMangaCover(scene){
 if(scene.textures.exists('iron_rain_cover'))return;
 const [t,c]=canvasTexture(scene,'iron_rain_cover',180,250);c.scale(.5,.5);c.fillStyle=PAPER;c.fillRect(0,0,360,500);inkPanel(c,10,100,340,350,{frame:'hunter'});c.fillStyle=INK;c.font='bold 39px Georgia, serif';c.textAlign='center';c.fillText('IRON RAIN',180,54);c.font='16px Georgia, serif';c.fillText('ROBOT SLAYER',180,79);c.fillText('VOLUME 01',180,475);t.refresh();
}
/** Draws a portrait page in authentic right-to-left panel order with a tap target per panel. */
export function drawMangaPage(scene,x,y,w,h,page,focus,onPanel){
 const spread=MANGA_PAGES[page],[t,c]=canvasTexture(scene,'iron_rain_page',720,1000);c.fillStyle=PAPER;c.fillRect(0,0,720,1000);c.fillStyle=INK;c.textAlign='left';c.font='bold 27px Georgia, serif';c.fillText('IRON RAIN',28,38);c.font='14px Georgia, serif';c.fillText(spread.title+'   /   '+(page+1),28,64);
 const parts=[];for(let i=0;i<6;i++){const xx=i%2===0?375:30,yy=85+Math.floor(i/2)*296;inkPanel(c,xx,yy,315,272,spread.panels[i]);if(i===focus){c.strokeStyle='#bb8b42';c.lineWidth=7;c.strokeRect(xx-4,yy-4,323,280);}c.fillStyle=INK;c.font='13px Georgia, serif';c.fillText(String(i+1),xx+3,yy+289);parts.push(scene.add.zone(x+xx/720*w,y+yy/1000*h,315/720*w,272/1000*h).setOrigin(0).setDepth(23).setInteractive({useHandCursor:true}).on('pointerdown',()=>onPanel(i)));}
 t.refresh();parts.unshift(scene.add.image(x,y,'iron_rain_page').setOrigin(0).setDisplaySize(w,h).setDepth(21));return parts;
}
/** Enlarges the selected panel so balloon text and ink details remain readable on a phone. */
export function drawMangaPanel(scene,x,y,w,h,panel){const[t,c]=canvasTexture(scene,'iron_rain_panel',720,440);inkPanel(c,0,0,720,440,panel);t.refresh();return[scene.add.image(x,y,'iron_rain_panel').setOrigin(0).setDisplaySize(w,h).setDepth(21)];}
