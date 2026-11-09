/** Shared toss/leap/plunge recovery; transformed Rosemary has heavier axe hits. */
export function rosemaryUpSpecial(wrong=false){
  return {
    name:'LAST ASCENT',frames:112,riseAt:18,riseV:-13.8,drift:1.55,
    aether:{throwAt:10,catchAt:38,fallAt:46,fallSpeed:9.5,landFrames:24,
      landing:{from:1,to:3,box:[-46,-22,92,26],dmg:wrong?9:6,angle:65,base:3.7,growth:4.8}},
    hits:[
      {from:12,to:16,box:[-8,-116,42,60],dmg:wrong?2:1,angle:90,base:1.2,growth:0,stun:20},
      {from:22,to:25,box:[-16,-78,48,58],dmg:wrong?3:2,angle:88,base:1.1,growth:0,stun:18},
      {from:30,to:33,box:[-16,-78,48,58],dmg:wrong?3:2,angle:88,base:1.2,growth:0,stun:18},
      {from:46,to:111,box:[-18,-28,42,44],dmg:wrong?7:5,angle:-78,base:3.1,growth:4.5},
    ],
  };
}
