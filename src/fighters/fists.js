import {DEFAULT_GRAB,PAL_CYAN} from './common.js';
const hit=(from,to,box,dmg,angle=40,growth=5,extra={})=>({from,to,box,dmg,angle,base:3,growth,...extra});
const strike=(frames,from,to,box,dmg,angle=40,growth=5)=>({frames,hits:[hit(from,to,box,dmg,angle,growth)]});
export const FISTS={
 id:'fists',name:'FISTS',sheets:Object.fromEntries(['idle','walk','run','jump','fall','moves'].map(k=>[k,'fists_'+k])),
 originX:.5,originY:88/96,movesOrigin:[.5,136/192],frameCounts:{idle:4},runCycle:[1,10],portrait:[24,12,48,48],
 handOffset:{x:14,y:-28},fxColor:0x56e6ff,pal:PAL_CYAN,swingSfx:'swing',body:{w:24,h:56},headTop:56,tagY:66,
 weight:1,walkSpeed:4.5,runAccel:.85,groundFriction:.56,airSpeed:3.5,airAccel:.3,airFriction:.04,jumpV:-10.4,shortHopV:-6.8,doubleJumpV:-9.4,
 taunt:{name:'BRING IT ON',frames:80,lines:['BRING IT ON!'],sounds:[[10,'swing',.4,1.1]]},
 moves:{...DEFAULT_GRAB,
 jab:{frames:27,multi:true,hits:[hit(4,6,[7,-47,39,32],2,30,0,{stun:10}),hit(11,13,[7,-48,43,33],2,30,0,{stun:10}),hit(19,22,[6,-50,48,36],4,45,4)]},
 ftilt:strike(24,6,11,[8,-49,50,30],8),utilt:strike(32,8,15,[-14,-91,48,63],8,88),dtilt:strike(26,8,12,[7,-17,62,20],6,25,4),
 dashAttack:{...strike(28,5,15,[6,-47,49,40],9,55),slide:{from:3,to:15,vx:6.4}},
 fsmash:strike(38,10,17,[6,-49,69,36],16,36,7),usmash:strike(42,9,18,[-17,-98,51,83],15,86,7),
 dsmash:{frames:48,multi:true,hits:[hit(9,13,[3,-25,63,27],5,25,2),hit(21,25,[-65,-26,65,28],5,155,2),hit(33,38,[-64,-29,128,32],8,35,6)]},
 nair:{...strike(34,7,24,[-38,-52,76,54],8,50),landLag:8},fair:{...strike(30,8,17,[5,-49,64,42],11,40),landLag:10},
 bair:{...strike(30,8,17,[-69,-49,64,42],12,140),landLag:11},uair:{...strike(28,7,15,[-23,-91,51,53],9,84),landLag:9},
 // The heel and its downward trail are the contact area; only the clean early kick meteors.
 dair:{frames:34,landLag:15,hits:[hit(9,13,[4,-12,44,36],14,-90,6,{base:4}),hit(14,18,[4,-10,40,28],9,40,5)]},
 neutralB:{frames:40,multi:true,hits:[hit(6,8,[5,-51,43,38],2,15,0,{stun:12}),hit(12,14,[5,-51,47,38],2,15,0,{stun:12}),hit(18,20,[5,-51,50,38],2,15,0,{stun:12}),hit(27,31,[4,-65,57,52],7,55,6)]},
 sideB:{...strike(34,7,19,[8,-48,62,40],12,35,6),slide:{from:5,to:18,vx:8.3}},
 upb:{frames:36,riseAt:8,riseV:-13.5,drift:3.2,pushX:1,hits:[hit(8,12,[-14,-67,49,69],3,88,0,{base:1.2,stun:12,pull:true}),hit(17,23,[-17,-89,55,85],8,75,6)]},
 downB:{frames:30,multi:true,slide:{from:4,to:18,vx:5.7},hits:[hit(6,10,[7,-25,53,29],4,20,1),hit(15,20,[6,-24,61,29],7,35,5)]}
 },
 limit:{name:'COMET COMBO',type:'fistsRush',frames:210,reach:190},
};

// Match contact boxes to the sprite normalization while retaining damage and timing.
for(const move of Object.values(FISTS.moves))if(move.hits&&!move.grab)move.hits=move.hits.map(h=>({...h,box:h.box.map(v=>Math.round(v*.75))}));
