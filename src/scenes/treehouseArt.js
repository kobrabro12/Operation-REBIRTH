import {ARC} from '../ui/arcade.js';
// Native scene art: explicit pixel shapes and the same ink, panels and accents as the arcade UI.
// No background images or generated-image assets are used.
/** Draws the native pixel room and frames the supplied movie poster without stretching it. */
export function drawTreehouse(scene){
 const g=scene.add.graphics();const rect=(x,y,w,h,c)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};const poly=(points,c)=>{g.fillStyle(c);g.fillPoints(points.map(([x,y])=>({x,y})),true);};
 const disk=(cx,cy,r,c)=>{for(let y=-r;y<=r;y+=2){const w=Math.floor(Math.sqrt(Math.max(0,r*r-y*y))/2)*2;rect(cx-w,cy+y,w*2,2,c);}};
 rect(0,34,640,290,ARC.ink);rect(8,37,624,219,0x322332);
 for(let x=8;x<632;x+=26){rect(x,38,24,219,x%52?0x48303b:0x3c2937);rect(x+2,39,2,214,0x66414b);rect(x+22,38,2,217,0x201b2c);for(let y=58;y<250;y+=47){rect(x+7,y,6,1,0x302132);rect(x+14,y+11,5,1,0x302132);}}
 rect(8,250,624,10,0x171321);rect(8,250,624,3,0x93604c);
 for(let y=261;y<324;y+=15){rect(8,y,624,14,y%2?0x624348:0x563943);rect(8,y,624,2,0x79504e);for(let x=(y%30?15:40);x<635;x+=70){rect(x,y+2,2,12,0x382937);rect(x+6,y+4,12,1,0x49303c);}}
 // Tree trunk and overhead beams.
 poly([[171,255],[171,126],[157,101],[159,34],[192,34],[192,93],[211,67],[229,34],[241,34],[223,80],[196,116],[195,256]],0x1b1724);
 poly([[177,255],[177,123],[164,99],[166,34],[183,34],[184,107],[193,108],[187,255]],0x785044);for(let y=48;y<246;y+=22){rect(171+(y%3)*3,y,3,15,0xa16c50);rect(181,y+7,3,9,0x4a3034);}
 rect(8,36,624,8,0x231c29);rect(8,36,624,2,0x90604d);
 // Wooden bookcase: room for cartridges and the Iron Rain manga.
 rect(19,63,143,241,ARC.ink);rect(23,67,135,232,0x855743);rect(30,74,121,218,0x211c2b);
 for(let y=76;y<292;y+=43){rect(33,y,115,35,0x362631);rect(33,y,115,3,0x171422);rect(26,y+36,129,6,0xa77350);rect(26,y+42,129,2,0x4c3135);rect(30,y+37,121,1,0xd2a069);}
 rect(23,67,6,232,0xb07a53);rect(153,67,5,232,0x604035);rect(19,62,143,8,0x9d6a4c);for(let y of [70,287])for(let x of [25,154])rect(x,y,2,2,0x1d1925);
 // Pixel-window, night forest and moon.
 rect(525,54,89,87,ARC.ink);rect(529,58,81,79,0x141d33);disk(588,76,12,0x8b9ec0);disk(592,73,10,0x141d33);
 for(let x=532;x<607;x+=15){const h=24+x%17;poly([[x,127-h],[x-9,127],[x+9,127]],0x25334a);rect(x-1,116,3,20,0x1b2338);}
 for(const [x,y]of[[539,69],[558,81],[573,63],[600,98]])rect(x,y,2,2,0xd6cbce);
 rect(568,58,4,79,0x8c624e);rect(529,99,81,4,0x8c624e);rect(521,136,97,6,0xb17a50);
 // Record-player shelf and dust cover. The room adds a spinning disc during playback.
 rect(365,131,144,7,ARC.ink);rect(365,129,144,3,0xc28b59);rect(378,138,6,9,0x76513f);rect(490,138,6,9,0x76513f);
 poly([[378,99],[384,66],[481,66],[486,99]],ARC.ink);poly([[382,96],[388,70],[477,70],[481,96]],0x53616b);poly([[389,91],[392,74],[473,74],[476,91]],0x354252);rect(390,75,2,15,0x7d8990);
 rect(379,102,107,27,ARC.ink);rect(382,105,101,19,0x875641);rect(382,106,101,2,0xc88c5c);rect(386,109,93,9,0x212131);rect(403,110,38,6,0x667077);rect(407,108,30,2,0x667077);rect(407,110,30,4,0x3c454f);rect(422,108,2,5,0xa9b4b9);rect(452,109,17,2,0xc5bbc6);rect(450,109,2,9,0xc5bbc6);rect(469,119,5,3,ARC.gold);rect(459,119,4,3,0xc6b4a4);
 // User-supplied pixel poster, framed without changing its aspect ratio.
 rect(231,43,121,162,ARC.ink);rect(234,46,115,156,0x91654b);
 const poster=scene.add.image(291.5,124,'treehouse_poster');poster.setScale(Math.min(109/poster.width,150/poster.height));
 // Rug and bean bag, in the shop's gold and arcade-purple accents.
 rect(162,279,218,38,0x221a2b);rect(166,282,210,31,0x805049);rect(171,286,200,23,0x32253b);for(let x=175;x<370;x+=12){rect(x,284,6,2,0xd2a66b);rect(x,310,6,2,0xd2a66b);}for(let x=178;x<365;x+=20)rect(x,293,8,7,0x624050);
 poly([[185,290],[181,274],[188,254],[201,230],[221,218],[245,224],[259,244],[278,251],[294,270],[294,291],[277,301],[207,302]],ARC.ink);
 poly([[190,286],[187,273],[195,253],[205,233],[221,223],[241,229],[254,250],[276,258],[288,273],[287,288],[273,296],[209,297]],0xa45743);
 poly([[196,274],[208,239],[220,230],[233,236],[243,258],[230,277]],0xc87b50);poly([[232,280],[247,255],[272,261],[283,276],[270,288]],0x814035);poly([[196,281],[215,290],[273,291],[270,296],[210,297]],0x613340);rect(215,243,2,26,0xe0a16b);
 // TV stand, connected old console, and chunky CRT.
 rect(445,263,183,57,ARC.ink);rect(450,268,173,44,0x704b40);rect(456,275,161,29,0x211d2d);rect(449,266,175,3,0xb07b52);rect(449,308,175,5,0x926044);rect(451,312,7,10,0x352331);rect(615,312,7,10,0x352331);
 rect(466,162,151,101,ARC.ink);rect(470,166,143,92,0x76707b);rect(473,168,138,3,0xa69aa1);rect(477,173,116,75,0x222031);rect(481,177,108,67,0x101827);rect(485,181,100,59,0x1d3044);rect(490,184,90,51,0x273d50);for(let y=186;y<235;y+=4)rect(490,y,90,1,0x233649);rect(493,186,38,2,0x3c5667);rect(596,178,12,48,0x4d4759);for(let y=181;y<223;y+=5)rect(598,y,8,2,0x242335);rect(485,252,17,3,0x373141);rect(509,252,8,3,0x373141);rect(602,251,3,3,0xffaa5c);
 rect(496,279,65,23,ARC.ink);rect(499,281,59,16,0x96909a);rect(505,282,34,3,0x393344);rect(502,289,8,4,0x5b5568);rect(550,290,3,2,0xff644c);rect(503,297,53,3,0x5b5366);
 // Stepped black cables, including the video lead into the TV.
 for(const [x,y,w,h]of[[605,255,3,25],[559,278,48,3],[471,294,3,15],[471,307,32,3],[501,299,3,9],[548,299,3,9],[550,306,42,3],[590,296,3,11]])rect(x,y,w,h,ARC.ink);
 for(const x of [461,580]){rect(x,290,29,14,ARC.ink);rect(x+2,292,25,9,0x9d919b);rect(x+6,294,3,5,0x252131);rect(x+4,296,7,2,0x252131);rect(x+20,294,3,3,0xb45cff);rect(x+24,297,2,2,0x5ad0ff);}
 // Square string lights finish the room without a separate texture or per-frame redraw.
 for(let x=45;x<625;x+=55){rect(x,43,55,1,ARC.ink);rect(x+23,43,2,5,ARC.ink);rect(x+19,48,10,9,0x664733);rect(x+21,49,6,6,ARC.sections.shop);rect(x+22,50,3,3,0xffe7ab);}
 return g;
}
