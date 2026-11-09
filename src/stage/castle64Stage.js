// Original early-console courtyard: actual 3D vertices, a fixed perspective camera,
// flat-shaded polygons and coarse stone texels. No scenery is a stage hazard.
const PAL={sky:0x72a9d9,haze:0xb8d6dc,stone:0xd4c9ab,stoneShade:0x9d9f98,roof:0xa64844,
  grass:0x648c49,earth:0x95735b,dark:0x343c4b,trim:0xe4d7af,teal:0x3d7b84};
const CAMERA={distance:900,height:315};

// The front lip of each projected slab coincides exactly with its collider.
export const CASTLE64_PLATFORMS=[
  {x1:-300,x2:300,y:0,bottom:68,solid:true},
  {x1:-228,x2:-102,y:-102,solid:false},
  {x1:94,x2:220,y:-136,solid:false},
];

/** Project a true [x,height,depth] vertex into the game's side-view world. */
export function projectCastle64Vertex(v){
  const scale=CAMERA.distance/(CAMERA.distance+v[2]);
  return {x:v[0]*scale,y:(CAMERA.height-v[1])*scale-CAMERA.height};
}

/** Blend limited-palette material colors with sunlight or distant blue fog. */
function colorMix(a,b,amount){
  const k=Math.max(0,Math.min(1,amount));let value=0;
  for(const shift of [16,8,0])value|=Math.round(((a>>shift)&255)*(1-k)+((b>>shift)&255)*k)<<shift;
  return value;
}

/** A repeatable material variation; art never consumes the match's random stream. */
function noise(x,y,seed=0){
  const n=Math.sin(x*37.17+y*91.53+seed*17.73)*43758.5453;
  return n-Math.floor(n);
}

/** Append an opaque 3D polygon with a small directional face-light adjustment. */
function face(mesh,points,color){
  const a=points[0],b=points[1],c=points[2],u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
  const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  const length=Math.hypot(...normal)||1,n=normal.map(q=>q/length);
  const light=.66+.27*Math.abs(n[1])+.17*Math.abs(n[2])+.06*Math.max(0,-n[0]);
  const shaded=light>1?colorMix(color,0xffffff,(light-1)*.5):colorMix(color,0x182939,1-light);
  const depth=points.reduce((sum,p)=>sum+p[2],0)/points.length;
  mesh.push({points,color:colorMix(shaded,PAL.haze,Math.min(.59,Math.max(0,depth-320)/2700)),depth});
}

/** Build a closed rectangular solid; front is the side nearest the camera. */
function box(mesh,x1,x2,bottom,top,z1,z2,color,cap=true){
  face(mesh,[[x1,bottom,z2],[x2,bottom,z2],[x2,top,z2],[x1,top,z2]],color);
  face(mesh,[[x1,bottom,z1],[x1,bottom,z2],[x1,top,z2],[x1,top,z1]],color);
  face(mesh,[[x2,bottom,z2],[x2,bottom,z1],[x2,top,z1],[x2,top,z2]],color);
  if(cap)face(mesh,[[x1,top,z1],[x1,top,z2],[x2,top,z2],[x2,top,z1]],color);
  face(mesh,[[x2,bottom,z1],[x1,bottom,z1],[x1,top,z1],[x2,top,z1]],color);
}

/** Coarse individual masonry blocks replace flat vector-wall decoration. */
function stoneWall(mesh,x1,x2,bottom,top,z,seed=0,size=40){
  for(let y=bottom,row=0;y<top;y+=size*.48,row++){
    const offset=row%2?size*.5:0;
    for(let x=x1-offset,col=0;x<x2;x+=size,col++){
      const left=Math.max(x1,x)+.8,right=Math.min(x2,x+size)-.8;
      if(right<=left)continue;
      const color=colorMix(PAL.stone,PAL.stoneShade,.12+noise(col,row,seed)*.27);
      face(mesh,[[left,y+.7,z],[right,y+.7,z],[right,Math.min(top,y+size*.48)-.7,z],[left,Math.min(top,y+size*.48)-.7,z]],color);
      if(noise(col,row,seed+4)>.67){
        const yy=y+size*.23,xx=left+(right-left)*.25;
        face(mesh,[[xx,yy,z-.2],[xx+6,yy,z-.2],[xx+6,yy+2.5,z-.2],[xx,yy+2.5,z-.2]],PAL.stoneShade);
      }
    }
  }
}

/** A closed eight-sided keep with visible facets, cornice and pointed tile roof. */
function tower(mesh,x,z,radius,height,seed){
  const ring=[];for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;ring.push([x+Math.cos(a)*radius,0,z+Math.sin(a)*radius]);}
  for(let i=0;i<8;i++){
    const a=ring[i],b=ring[(i+1)%8];
    for(let row=0;row<10;row++){
      const low=row*height/10,high=(row+1)*height/10;
      face(mesh,[[a[0],low,a[2]],[b[0],low,b[2]],[b[0],high,b[2]],[a[0],high,a[2]]],colorMix(PAL.stone,PAL.stoneShade,noise(i,row,seed)*.28));
    }
    face(mesh,[[a[0]+(a[0]-x)*.1,height-5,a[2]+(a[2]-z)*.1],[b[0]+(b[0]-x)*.1,height-5,b[2]+(b[2]-z)*.1],[b[0]+(b[0]-x)*.1,height+9,b[2]+(b[2]-z)*.1],[a[0]+(a[0]-x)*.1,height+9,a[2]+(a[2]-z)*.1]],PAL.trim);
    face(mesh,[[a[0]+(a[0]-x)*.15,height+10,a[2]+(a[2]-z)*.15],[b[0]+(b[0]-x)*.15,height+10,b[2]+(b[2]-z)*.15],[x,height+105,z]],colorMix(PAL.roof,0x5d3445,i%3*.15));
  }
  // A dark slit is embedded on the near facet, rather than floating in screen space.
  box(mesh,x-8,x+8,height*.55,height*.55+35,z-radius-1,z-radius+1,PAL.dark);
  box(mesh,x-11,x+11,height*.55-4,height*.55,z-radius-2,z-radius+1,PAL.trim);
}

/** A triangular mountain has distinct lit facets rather than a painted silhouette. */
function hill(mesh,x,z,radius,height,color){
  const peak=[x-radius*.13,height,z+radius*.2],ring=[];
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ring.push([x+Math.cos(a)*radius,-65,z+Math.sin(a)*radius*.55]);}
  for(let i=0;i<7;i++)face(mesh,[ring[i],ring[(i+1)%7],peak],colorMix(color,0x4d7569,(i%3)*.1));
}

/** A low-poly tree uses solid trunk and stacked triangular foliage cones. */
function tree(mesh,x,z,size){
  box(mesh,x-size*.08,x+size*.08,0,size*.45,z-size*.08,z+size*.08,0x80644b);
  for(let layer=0;layer<3;layer++){
    const y=size*(.25+layer*.23),r=size*(.4-layer*.075),peak=[x,y+size*.53,z];
    for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;face(mesh,[[x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],peak],layer%2?0x527d4c:0x648c4c);}
  }
}

/** Raised stone slabs retain exact straight fighting lips while exposing depth behind. */
function arenaSlab(mesh,p,depth=76){
  const top=-p.y,bottom=p.solid?-p.bottom:top-13,x1=p.x1,x2=p.x2;
  box(mesh,x1,x2,bottom,top,0,depth,PAL.stoneShade,false);
  // Perspective tiles read as a coarse, low-resolution console stone texture.
  const width=x2-x1,columns=p.solid?20:6,rows=p.solid?6:2;
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const left=x1+i*width/columns,right=x1+(i+1)*width/columns,z1=j*depth/rows,z2=(j+1)*depth/rows;
    const color=(i+j)%2?0xc2b996:0xdfd1a7;
    face(mesh,[[left,top+.2,z1],[left,top+.2,z2],[right,top+.2,z2],[right,top+.2,z1]],colorMix(color,0xa99278,noise(i,j)*.11));
  }
  // Insets on the facade make the platform thickness readable at phone size.
  if(p.solid){
    stoneWall(mesh,x1,x2,bottom+6,top-7,-.5,6,38);
    face(mesh,[[x1,top-7,-.7],[x2,top-7,-.7],[x2,top,-.7],[x1,top,-.7]],PAL.trim);
    for(let x=x1+26;x<x2-15;x+=70)box(mesh,x-3,x+3,bottom+9,top-15,-1,0,0x707b79);
    const ring=[[x1,bottom,0],[x1*.46,bottom,0],[x2*.46,bottom,0],[x2,bottom,0],[x2,bottom,depth],[x1,bottom,depth]];
    const tip=[15,bottom-130,depth*.7];
    for(let i=0;i<ring.length;i++)face(mesh,[ring[i],ring[(i+1)%ring.length],tip],colorMix(PAL.earth,0x4e5663,(i%4)*.1));
  }else{
    face(mesh,[[x1,top-5,-.7],[x2,top-5,-.7],[x2,top,-.7],[x1,top,-.7]],PAL.trim);
    box(mesh,x1+8,x2-8,top-13,top-8,-.5,0,PAL.teal);
  }
}

/** Author the original castle and island as true 3D surfaces, independent of Phaser. */
export function buildCastle64Mesh(){
  const back=[],arena=[];
  for(const [x,z,r,h,c]of [[-900,2200,690,420,0x749a83],[700,2300,900,520,0x819d7d],[-430,1550,430,265,0x7b9a70],[800,1600,530,340,0x6c8b6b]])hill(back,x,z,r,h,c);
  // Castle rock shelf and a narrowing stone causeway recede into atmospheric fog.
  box(back,-580,580,-85,0,650,1500,0x7f8b72);
  for(let i=0;i<10;i++)box(back,-55,55,-17,0,200+i*44,244+i*44,i%2?0xb7b5a0:0xaaa996);
  box(back,-270,270,0,260,940,1170,PAL.stoneShade);stoneWall(back,-270,270,0,260,939,3,43);
  box(back,-302,302,256,273,926,1180,PAL.trim);
  // Four joined roof faces expose a hip roof with a ridge, not a flat triangle.
  face(back,[[-307,275,925],[307,275,925],[216,355,1050],[-216,355,1050]],PAL.roof);
  face(back,[[307,275,925],[307,275,1180],[216,355,1050]],0x814047);
  face(back,[[-307,275,1180],[-307,275,925],[-216,355,1050]],0xa9514a);
  face(back,[[307,275,1180],[-307,275,1180],[-216,355,1050],[216,355,1050]],0x6e3a47);
  // Distinctive central lantern keep and two offset spires make an original silhouette.
  tower(back,-285,963,65,305,1);tower(back,285,1050,78,335,4);
  tower(back,65,1180,70,430,7);
  // Dark, stepped archway and eight shallow door boards all sit on the near wall plane.
  const doorZ=937;
  for(const [left,right,low,high]of [[-44,44,0,85],[-36,36,85,105],[-23,23,105,117],[-10,10,117,121]])face(back,[[left,low,doorZ],[right,low,doorZ],[right,high,doorZ],[left,high,doorZ]],PAL.dark);
  for(let i=0;i<8;i++)box(back,-32+i*8,-26+i*8,0,77,doorZ-.4,doorZ,0x665342);
  box(back,-39,39,19,24,doorZ-.8,doorZ,0x3b4147);box(back,-39,39,58,63,doorZ-.8,doorZ,0x3b4147);
  for(const x of [-188,-114,115,188]){box(back,x-13,x+13,143,195,937,939,PAL.dark);box(back,x-17,x+17,139,144,935,940,PAL.trim);}
  // Teal swallowtail standards and an original diamond crest, without named-game emblems.
  for(const x of [-101,101]){
    face(back,[[x-18,216,936],[x+18,216,936],[x+18,154,936],[x,166,936],[x-18,154,936]],PAL.teal);
    face(back,[[x,205,935],[x+8,193,935],[x,181,935],[x-8,193,935]],PAL.trim);
  }
  for(const [x,z,size]of [[-430,770,126],[424,710,115],[-370,1170,108],[465,1280,143],[-660,1430,160],[645,1370,140]])tree(back,x,z,size);
  // Short garden walls give the courtyard several unmistakable layers of depth.
  for(const [x1,x2,z]of [[-520,-105,710],[105,520,710]]){
    box(back,x1,x2,0,46,z,z+38,PAL.stoneShade);stoneWall(back,x1,x2,0,45,z-.5,9,36);box(back,x1-5,x2+5,45,52,z-4,z+42,PAL.trim);
    for(let x=x1+12;x<x2;x+=63)box(back,x,x+28,51,68,z,z+38,PAL.trim);
  }
  CASTLE64_PLATFORMS.forEach((p,i)=>arenaSlab(arena,p,i===0?180:62));
  return {back,arena};
}

/** Cache projected painter-sorted triangles once; no mesh math runs during a match. */
function compileMesh(mesh){
  return mesh.slice().sort((a,b)=>b.depth-a.depth).map(item=>({...item,points:item.points.map(projectCastle64Vertex)}));
}

/** Paint projected faces as triangle fans using Phaser's batched native graphics. */
function paintMesh(g,commands,x=0,y=0,scale=1){
  for(const item of commands){
    g.fillStyle(item.color,1);const a=item.points[0];
    for(let i=1;i<item.points.length-1;i++){
      const b=item.points[i],c=item.points[i+1];
      g.fillTriangle(x+a.x*scale,y+a.y*scale,x+b.x*scale,y+b.y*scale,x+c.x*scale,y+c.y*scale);
    }
  }
}

// A single immutable set is shared by previews and repeated matches.
let cached;

/** Return cached fixed-camera meshes without allocating a second scene-sized model. */
function model(){
  if(!cached){const mesh=buildCastle64Mesh();cached={back:compileMesh(mesh.back),arena:compileMesh(mesh.arena)};}
  return cached;
}

/** A fixed-camera 3D courtyard with one solid island and two stone jump-through balconies. */
export class Castle64Stage{
  constructor(scene){
    this.scene=scene;this.t=0;this.hazardsOn=false;this.music='bgm_dreamland';
    this.platforms=CASTLE64_PLATFORMS.map(p=>({...p}));
    this.spawns=[{x:-168,y:0},{x:168,y:0},{x:-58,y:0},{x:58,y:0}];
  }

  /** Draw the perspective model once; the fighting lips stay in exact world coordinates. */
  draw(world,bg){
    const sky=this.scene.add.graphics().setScrollFactor(0);
    const colors=[0x72a9d9,0x80b2dd,0x91bfdf,0xa1c9de,0xb4d4dc,0xc9e1da];
    colors.forEach((color,i)=>{sky.fillStyle(color);sky.fillRect(-600,-500+i*145,1900,146);});
    // Intentionally chunky cloud tiles echo low-resolution early-console backgrounds.
    for(const [x,y,w]of [[-50,39,110],[250,12,145],[560,74,126]]){
      sky.fillStyle(0xe8eadd,.78);sky.fillRect(x,y,w,14);sky.fillRect(x+16,y-12,w*.57,13);
      sky.fillStyle(0xd3dedb,.75);sky.fillRect(x+8,y+14,w-5,7);
    }
    bg.push(sky);
    const data=model(),castle=this.scene.add.graphics();paintMesh(castle,data.back);world.push(castle);
    const floor=this.scene.add.graphics();paintMesh(floor,data.arena);world.push(floor);
  }

  /** Static architecture and no hazards keep both frame cost and combat predictable. */
  step(){
    this.t++;return [];
  }
}

/** A miniature of the same projected mesh, including the asymmetric playable balconies. */
export function drawCastle64Preview(g,x,y,w,h){
  g.fillStyle(PAL.sky);g.fillRect(x,y,w,h);g.fillStyle(PAL.haze);g.fillRect(x,y+h*.52,w,h*.48);
  const data=model(),scale=Math.min(w/780,h/590),cx=x+w*.5,cy=y+h*.72;
  paintMesh(g,data.back,cx,cy,scale);paintMesh(g,data.arena,cx,cy,scale);
}
