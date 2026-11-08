"""Original articulated Meta Knight pixel art; no Lacy raster pixels are loaded.

python3 tools/sprites/meta_knight_costume.py --preview /tmp/meta-knight-custom.png
Only this costume's PNGs and generated hkMetaMoves.js are written. Native cells
150x90 at foot66,86; move cells180x140 at81,111. All joints round to whole pixels.
"""
import argparse
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/fighters/hero-knight/metaknight'
LINE='#111627'
NAVY=['#10172d','#1c2948','#2d4168','#4d6690','#819ab9']
SILVER=['#27364f','#526a89','#91abc9','#c9d9eb','#f0f6ff']
PURPLE=['#1a1234','#392052','#653579','#9453ac','#c38bd6']
GOLD=['#684117','#a76d23','#dcaa3c','#ffda73','#fff4b9']
BASE={'dx':0,'dy':0,'lean':0,'hipx':0,'hipy':-20,'handx':18,'handy':-34,
      'freex':-12,'freey':-29,'frontx':13,'fronty':0,'backx':-13,'backy':0,
      'sword':-58,'gaze':1,'wing':0,'wind':0,'weapon':1,'head':0}


def point(p):
    """Round a joint before drawing; finished pixels are never transformed."""
    return tuple(int(round(n)) for n in p)


def vector(angle):
    """A local unit vector in downward-positive sprite coordinates."""
    a=math.radians(angle)
    return np.array([math.cos(a),math.sin(a)])


def pose(**fields):
    """Describe one key pose in pixels relative to the fixed foot pivot."""
    return {**BASE,**fields}


def sample(keys,t):
    """Ease authored joints without blending completed sprite rasters."""
    t=max(0,min(t,keys[-1][0]));at=max(i for i,k in enumerate(keys) if k[0]<=t)
    if at==len(keys)-1:return dict(keys[at][1])
    a,p=keys[at];b,q=keys[at+1];u=(t-a)/max(1,b-a);k=u*u*u*(u*(u*6-15)+10)
    return {name:p[name]+(q[name]-p[name])*k for name in BASE}


def ik(a,b,length,bend):
    """A single connected elbow/knee solved from its two endpoints."""
    delta=b-a;distance=float(np.linalg.norm(delta));mid=(a+b)/2
    if distance<.01:return mid+np.array([bend*3,0])
    normal=np.array([-delta[1],delta[0]])/distance
    return mid+normal*math.sqrt(max(0,length*length-distance*distance/4))*bend


class Pixel:
    """Small opaque cel-shaded polygons on a whole-pixel grid."""
    def __init__(self,size,origin):
        self.image=Image.new('RGBA',size);self.draw=ImageDraw.Draw(self.image);self.origin=np.array(origin,dtype=float)
    def pts(self,points):return [point(self.origin+np.array(p)) for p in points]
    def poly(self,points,fill,outline=LINE):self.draw.polygon(self.pts(points),fill=fill,outline=outline)
    def line(self,a,b,color,width=1):self.draw.line(self.pts([a,b]),fill=color,width=width)
    def dot(self,p,color):self.draw.point(self.pts([p])[0],fill=color)
    def limb(self,a,b,width,palette):
        """One solid armor segment with an attached bright leading edge."""
        delta=b-a;n=np.array([-delta[1],delta[0]])/max(.1,np.linalg.norm(delta))
        self.poly([a+n*(width/2+1),b+n*(width/2+1),b-n*(width/2+1),a-n*(width/2+1)],palette[1])
        self.poly([a+n*(width/2-1),b+n*(width/2-1),b-n*(width/2-1),a-n*(width/2-1)],palette[2],palette[1])
        self.line(a-n*(width/2-1),b-n*(width/2-1),palette[3])
    def glove(self,p):
        """An angular silver gauntlet centered on the hand joint."""
        self.poly([p+q for q in [(-3,-2),(0,-4),(3,-2),(4,1),(1,3),(-3,2)]],SILVER[2])
        self.line(p+(-2,-2),p+(1,-3),SILVER[4]);self.dot(p+(-1,0),SILVER[3])


def geometry(p):
    """Locate joints once so image, body bounds and cosmetic anchors agree."""
    hip=np.array([p['hipx']+p['dx'],p['hipy']+p['dy']]);down=vector(90+p['lean']);side=np.array([down[1],-down[0]])
    chest=hip-down*13;head=chest-down*11+side*p['head'];direction=1 if p['gaze']>=0 else -1
    hand=np.array([p['handx'],p['handy']]);free=np.array([p['freex'],p['freey']]);tip=hand+vector(p['sword'])*p.get('_reach',36)
    return dict(hip=hip,chest=chest,head=head,down=down,side=side,shoulder=chest+side*7*direction+down,
                rear=chest-side*7*direction+down,hand=hand,free=free,tip=tip,
                front=np.array([p['frontx'],p['fronty']-3]),back=np.array([p['backx'],p['backy']-3]))


def draw_cape(layer,p,g):
    """One mantle that opens into jointed bat wings during flight."""
    root=g['chest']+g['down']
    def at(x,y):return root+g['side']*x+g['down']*y
    spread=p['wing'];wind=p['wind']
    if spread>.15:
        for sign in [-1,1]:
            reach=16+20*spread;lift=-4-9*spread+wind*.12
            coords=[(sign*3,0),(sign*11,-5),(sign*reach,lift),(sign*(reach-3),2),(sign*(reach-6),12),
                    (sign*20,7),(sign*14,20),(sign*9,13),(sign*4,21)]
            pts=[at(x,y) for x,y in coords];layer.poly(pts,PURPLE[1])
            for j in [2,4,6,8]:layer.line(pts[0],pts[j],PURPLE[3])
            layer.line(pts[0],pts[1],PURPLE[4]);layer.line(pts[1],pts[2],PURPLE[4])
            layer.poly([at(sign*11,-4),at(sign*reach,lift),at(sign*(reach-5),lift+5)],PURPLE[2],PURPLE[3])
    else:
        coords=[(-4,0),(-11,2),(-19-wind*.2,12),(-22-wind*.3,29),(-14,24),(-10,29),(-4,20),(2,8)]
        pts=[at(x,y) for x,y in coords];layer.poly(pts,PURPLE[1]);layer.line(pts[0],pts[4],PURPLE[3]);layer.line(pts[1],pts[3],PURPLE[2]);layer.line(pts[2],pts[3],PURPLE[4])


def draw_sword(layer,p,g):
    """One golden Galaxia-like blade held by the glove, never a ghost copy."""
    hand=g['hand'];along=vector(p['sword']);normal=np.array([-along[1],along[0]])
    def at(distance,side):
        reach=p.get('_reach',36)
        distance=3+(distance-3)*(reach-3)/33 if distance>=3 else distance
        return hand+along*distance+normal*side
    layer.line(at(-4,0),at(5,0),GOLD[0],3)
    profile=[(3,-2),(8,-2),(11,-4),(14,-2),(18,-3),(21,-1),(29,-2),(36,0),(29,2),(21,1),(18,3),(14,2),(11,4),(8,2),(3,2)]
    layer.poly([at(a,b) for a,b in profile],GOLD[2]);layer.line(at(6,-1),at(33,0),GOLD[4]);layer.line(at(6,1),at(29,1),GOLD[1])
    layer.poly([at(2,-7),at(6,-5),at(7,-2),at(7,2),at(6,5),at(2,7),at(3,2),at(1,0),at(3,-2)],GOLD[3])
    layer.dot(at(3,0),PURPLE[4]);layer.dot(at(3,-1),SILVER[4])


def draw_body(layer,p,g):
    """A single silhouette of armored legs, torso, arms and full silver mask."""
    hip=g['hip'];down=g['down'];side=g['side']
    for foot,offset in [(g['back'],-4),(g['front'],4)]:
        start=hip+side*offset;knee=ik(start,foot,12,1 if offset>0 else -1)
        layer.limb(start,knee,6,NAVY);layer.limb(knee,foot,5,NAVY);toe=1 if p['gaze']>=0 else -1
        layer.poly([foot+q for q in [(-4,-1),(3,-1),(5*toe,1),(5*toe,2),(-5,2),(-5,0)]],SILVER[2])
        layer.line(foot+(-3,-1),foot+(2,-1),SILVER[4]);layer.line(foot+(-4,1),foot+(3,1),SILVER[1])
    elbow=ik(g['rear'],g['free'],10,-1)
    layer.limb(g['rear'],elbow,5,NAVY);layer.limb(elbow,g['free'],4,SILVER);layer.glove(g['free'])
    def at(x,y):return hip+side*x+down*y
    layer.poly([at(-7,-16),at(6,-16),at(9,-10),at(7,-1),at(3,3),at(-6,2),at(-9,-8)],NAVY[2])
    layer.poly([at(-6,-14),at(4,-14),at(6,-9),at(2,-4),at(-5,-5)],NAVY[3],NAVY[1]);layer.line(at(-6,-13),at(1,-14),NAVY[4]);layer.line(at(6,-10),at(5,-4),NAVY[1])
    layer.poly([at(-7,-1),at(7,-1),at(6,3),at(-6,3)],PURPLE[2]);layer.poly([at(-1,0),at(2,0),at(2,2),at(-1,2)],GOLD[2])
    for shoulder in [g['rear'],g['shoulder']]:
        layer.poly([shoulder+q for q in [(-5,-2),(-2,-5),(3,-4),(5,0),(2,3),(-3,2)]],SILVER[1]);layer.line(shoulder+(-2,-4),shoulder+(2,-3),SILVER[3])
    elbow=ik(g['shoulder'],g['hand'],12,-1 if p['handx']>=0 else 1)
    layer.limb(g['shoulder'],elbow,5,NAVY);layer.limb(elbow,g['hand'],5,SILVER);layer.glove(g['hand'])
    center=g['head'];angle=p['lean']*.6;co,si=math.cos(math.radians(angle)),math.sin(math.radians(angle))
    def hp(x,y):return center+np.array([x*co-y*si,x*si+y*co])
    layer.poly([hp(x,y) for x,y in [(-4,-9),(4,-9),(8,-5),(9,1),(6,7),(1,9),(-6,7),(-9,2),(-8,-5)]],NAVY[0])
    layer.poly([hp(x,y) for x,y in [(-4,-8),(3,-8),(7,-4),(7,2),(4,6),(0,8),(-5,6),(-7,1),(-6,-5)]],SILVER[2],SILVER[0])
    layer.line(hp(-4,-7),hp(2,-7),SILVER[4]);layer.line(hp(2,-7),hp(5,-5),SILVER[3])
    layer.poly([hp(x,y) for x,y in [(-6,-2),(-2,-3),(0,-1),(2,-3),(6,-2),(4,1),(0,2),(-4,1)]],NAVY[0],NAVY[0])
    glance=int(round(p['gaze']*.5));layer.line(hp(-5+glance,-1),hp(-2+glance,-1),'#ffe96a');layer.line(hp(2+glance,-1),hp(5+glance,-1),'#ffe96a')
    layer.line(hp(0,1),hp(0,6),SILVER[4]);layer.line(hp(-4,4),hp(-2,5),SILVER[1]);layer.line(hp(3,4),hp(5,2),SILVER[1])


def render(p,size=(180,140),origin=(81,111),part=None):
    """Composite opaque layers; return image, body-only hurtbox and anchors."""
    p=dict(p);g=geometry(p);cape=Pixel(size,origin);body=Pixel(size,origin);blade=Pixel(size,origin)
    if part!='weapon':draw_cape(cape,p,g);draw_body(body,p,g)
    if p['weapon']>.5:
        # Native90px strips get a foreshortened blade where an overhead or
        # downward pose would otherwise leave their smaller canvas. The full
        # 140px move cells always retain the complete authored sword reach.
        for reach in (range(36,11,-1) if size==(150,90) else [36]):
            p['_reach']=reach;g=geometry(p);blade=Pixel(size,origin);draw_sword(blade,p,g)
            a=np.array(blade.image)[...,3]
            if not(a[0].any() or a[-1].any() or a[:,0].any() or a[:,-1].any()):break
    result=cape.image
    if p['handx']<0:result.alpha_composite(blade.image)
    result.alpha_composite(body.image)
    if p['handx']>=0:result.alpha_composite(blade.image)
    if part!='weapon':
        glove=Pixel(size,origin);glove.glove(g['hand']);result.alpha_composite(glove.image)
    if part=='hands':
        glove=Pixel(size,origin);glove.glove(g['hand']);glove.glove(g['free']);result=glove.image
    if part=='weapon':result=blade.image
    box=body.image.getbbox();hurt=[box[0]-origin[0],box[1]-origin[1],box[2]-origin[0],box[3]-origin[1]] if box else None
    anchors={'hand':list(point(g['hand'])),'tip':list(point(g['tip'])),'head':list(point(g['head'])),'angle':round(math.radians(p['sword']),5),'armed':p['weapon']>.5}
    return result,hurt,anchors


def authored_clips():
    """Author anticipation/contact/recovery around existing Lacy hit windows."""
    clips={}
    def add(name,ticks,keys,step=2,loop=False):clips[name]=(ticks,keys,step,loop)
    rest=pose();windows={'jab':(12,18),'neutralB':(12,16),'ftilt':(12,16),'utilt':(12,18),'dtilt':(10,14),'fsmash':(18,22),'usmash':(14,20),'dsmash':(12,22),'nair':(10,18),'fair':(12,16),'bair':(10,14),'uair':(10,16),'dair':(14,18),'dashAttack':(8,18)}
    anticip=pose(lean=-8,handx=10,handy=-48,sword=-145,freex=-16,freey=-34,wind=-7)
    thrust=pose(dx=4,lean=10,handx=25,handy=-31,sword=4,freex=-14,freey=-37,wind=10)
    durations={'jab':28,'ftilt':28,'fair':28,'dashAttack':30}
    for name,n in durations.items():
        a,b=windows[name];wind=anticip if name!='jab' else pose(lean=-3,handx=11,handy=-34,sword=-70)
        contact=thrust
        if name=='fair':contact=pose(lean=11,handx=23,handy=-34,sword=4,wing=.8,frontx=17,fronty=-10,backx=-14,backy=-7)
        if name=='dashAttack':contact=pose(dx=7,lean=17,handx=26,handy=-30,sword=-3,wind=14,frontx=17,backx=-15)
        add(name,n,[(0,rest),(max(2,a-4),wind),(a,contact),(b,pose(**{**contact,'sword':16,'wind':12})),(n,rest)])
    for name,n in [('neutralB',34),('fsmash',48)]:
        a,b=windows[name];wind=pose(dx=-3,lean=-13,handx=7,handy=-51,sword=-112,wind=-10)
        hit=pose(dx=7,lean=18,handx=25,handy=-30,sword=58,freex=-15,freey=-36,frontx=19,backx=-16,wind=15)
        add(name,n,[(0,rest),(a-5,wind),(a-1,wind),(a+1,hit),(b+2,pose(**{**hit,'sword':78})),(n,rest)])
    for name,n in [('utilt',30),('usmash',44),('uair',26)]:
        a,b=windows[name];wind=pose(hipy=-16,handx=18,handy=-24,sword=65,wind=-6)
        top=pose(dy=-5 if name!='utilt' else -1,lean=-8,handx=14,handy=-49,sword=-100,wing=.8 if name=='uair' else .25,frontx=14,fronty=-7 if name=='uair' else 0,backx=-13,backy=-7 if name=='uair' else 0,wind=9)
        add(name,n,[(0,rest),(a-4,wind),(a,top),(b,pose(**{**top,'sword':-125,'wind':-3})),(n,rest)])
    add('dtilt',24,[(0,rest),(7,pose(hipy=-11,handx=11,handy=-15,sword=-155,lean=16)),(10,pose(hipy=-10,lean=24,handx=25,handy=-9,sword=0,frontx=20,backx=-16,wind=9)),(14,pose(hipy=-10,lean=20,handx=26,handy=-8,sword=14,frontx=20,backx=-16)),(24,rest)])
    add('dsmash',42,[(0,rest),(8,pose(hipy=-14,handx=12,handy=-17,sword=-155,wind=-8)),(12,pose(hipy=-13,lean=15,handx=24,handy=-11,sword=5,wind=10)),(15,pose(hipy=-13,handx=22,handy=-11,sword=35)),(19,pose(hipy=-13,lean=-12,handx=-23,handy=-12,sword=175,gaze=-1,wind=-12)),(22,pose(hipy=-13,handx=-22,handy=-14,sword=205,gaze=-1)),(42,rest)])
    add('bair',26,[(0,rest),(6,pose(wing=.8,handx=10,handy=-41,sword=-75,fronty=-8,backy=-8)),(10,pose(wing=.9,lean=-12,handx=-23,handy=-33,sword=-178,gaze=-1,fronty=-8,backy=-6,wind=-10)),(14,pose(wing=.8,handx=-25,handy=-32,sword=-195,gaze=-1,fronty=-8,backy=-6)),(26,rest)])
    add('dair',32,[(0,pose(wing=.8,fronty=-8,backy=-8)),(10,pose(wing=1,handx=10,handy=-42,sword=-65,frontx=17,fronty=-11,backx=-16,backy=-10)),(14,pose(wing=.5,lean=7,handx=5,handy=-28,sword=90,frontx=18,fronty=-6,backx=-17,backy=-7,wind=-4)),(18,pose(wing=.45,handx=5,handy=-26,sword=90,frontx=18,fronty=-5,backx=-17,backy=-6)),(32,pose(wing=.8,fronty=-5,backy=-5))])
    def spin_keys(duration,first,last,lift=0):
        """One articulated weapon orbit with clean tucked or planted legs."""
        keys=[(0,rest),(max(2,first-2),pose(hipy=-17,handx=11,handy=-33,sword=-110,wing=.4))]
        for t in range(first,last+1,2):
            angle=(t-first)/max(1,last-first)*(360 if duration==28 else 720);a=math.radians(angle)
            keys.append((t,pose(dy=-lift,handx=math.cos(a)*19,handy=-32+math.sin(a)*4,sword=angle,gaze=math.cos(a),wing=.6,wind=math.sin(a)*14,frontx=12,fronty=-3 if lift else 0,backx=-12,backy=-3 if lift else 0)))
        keys.append((duration,pose(wing=.6 if lift else 0)));return keys
    add('nair',28,spin_keys(28,10,18,3),step=1);add('upb',40,spin_keys(40,6,26,7),step=1);add('groundspin',30,spin_keys(30,4,16),step=1)
    add('spincharge',24,[(0,pose(hipy=-16,handx=12,handy=-37,sword=-110,wind=-4)),(12,pose(hipy=-15,handx=12,handy=-38,sword=-113,wind=-6)),(24,pose(hipy=-16,handx=12,handy=-37,sword=-110,wind=-4))],loop=True)
    add('swingcharge',24,[(0,anticip),(12,pose(**{**anticip,'handy':-49,'wind':-5})),(24,anticip)],loop=True)
    add('counter',52,[(0,rest),(4,pose(handx=15,handy=-38,sword=-88,freex=-9,freey=-34,lean=-2)),(28,pose(handx=15,handy=-38,sword=-88,freex=-9,freey=-34,lean=-2)),(52,rest)])
    add('counterstrike',30,[(0,pose(handx=15,handy=-38,sword=-88)),(4,pose(dx=6,lean=16,handx=26,handy=-30,sword=12,wind=12)),(8,pose(dx=6,lean=16,handx=25,handy=-28,sword=40,wind=12)),(30,rest)])
    add('swordthrow',24,[(0,rest),(6,anticip),(7,pose(handx=18,handy=-37,sword=-30)),(8,pose(handx=18,handy=-34,weapon=0,wind=7)),(16,pose(handx=23,handy=-32,weapon=0)),(24,pose(weapon=0))])
    add('grab',26,[(0,pose(weapon=0)),(5,pose(weapon=0,lean=10,handx=26,handy=-32,freex=12,freey=-25)),(10,pose(weapon=0,handx=23,handy=-31,freex=12,freey=-25)),(26,pose(weapon=0))])
    hold=pose(weapon=0,handx=22,handy=-30,freex=14,freey=-28)
    punch=pose(weapon=0,lean=6,handx=29,handy=-32,freex=12,freey=-27)
    add('pummel',12,[(0,hold),(3,punch),(5,punch),(12,hold)])
    add('holding',24,[(0,hold),(12,pose(**{**hold,'handy':-31})),(24,hold)],loop=True)
    targets=[('forward',pose(weapon=0,lean=15,handx=32,handy=-29,freex=20,freey=-26)),('back',pose(weapon=0,lean=-12,handx=-30,handy=-29,freex=-20,freey=-25,gaze=-1)),('up',pose(weapon=0,lean=-5,handx=9,handy=-58,freex=-5,freey=-53)),('down',pose(weapon=0,lean=25,hipy=-12,handx=20,handy=-8,freex=12,freey=-8))]
    for name,target in targets:add('throw_'+name,24,[(0,hold),(5,target),(10,target),(24,pose(weapon=0))])
    add('taunt',66,[(0,rest),(10,pose(lean=-4,handx=15,handy=-46,sword=-90,freex=-16,freey=-29,wing=.3)),(24,pose(handx=10,handy=-51,sword=-90,freex=-18,freey=-30,wing=.6)),(42,pose(handx=10,handy=-51,sword=-90,freex=-18,freey=-30,wing=.6)),(54,pose(handx=18,handy=-39,sword=-45,wind=5)),(66,rest)])
    charge=pose(weapon=0,dx=-6,lean=-13,handx=-27,handy=-41,freex=-18,freey=-30,sword=-150,wind=-7)
    slash=pose(weapon=0,dx=7,lean=15,handx=37,handy=-26,freex=-13,freey=-34,sword=25,wind=13)
    add('limit_charge',36,[(0,pose(weapon=0)),(12,charge),(36,charge)])
    add('limit_slash',10,[(0,charge),(5,slash),(10,slash)])
    add('limit_cut',6,[(0,anticip),(2,pose(lean=12,handx=27,handy=-31,sword=10,wing=.45,wind=13)),(4,pose(lean=7,handx=25,handy=-28,sword=65,wing=.5,wind=8)),(6,anticip)],loop=True)
    add('limit_final',24,[(0,pose(**{**slash,'weapon':1,'sword':-10})),(5,pose(**{**slash,'weapon':1,'sword':45})),(12,pose(**{**slash,'weapon':1,'sword':70})),(24,rest)])
    add('limit_recover',20,[(0,slash),(20,pose(weapon=0,handx=37,handy=-26))])
    crouch=pose(hipy=-12,lean=13,handx=17,handy=-22,sword=-30,freex=-12,freey=-17,wind=1)
    add('crouch',12,[(0,rest),(6,crouch),(12,crouch)]);add('land',8,[(0,crouch),(8,rest)]);add('jumpsquat',6,[(0,rest),(6,crouch)])
    hanging=pose(weapon=0,dy=15,handx=8,handy=-50,freex=-5,freey=-49,frontx=8,fronty=-9,backx=-7,backy=-6)
    add('ledge',16,[(0,hanging),(16,hanging)],loop=True)
    add('climb',24,[(0,pose(weapon=0,dy=10,handx=7,handy=-49,freex=-5,freey=-47,fronty=-8,backy=-4)),(12,pose(weapon=0,hipy=-12,lean=20,handx=16,handy=-15,freex=-4,freey=-12)),(24,rest)])
    add('dodge',24,[(0,rest),(8,pose(weapon=0,hipy=-10,lean=30,handx=8,handy=-22,freex=-7,freey=-21,wing=.8,wind=-8)),(16,pose(weapon=0,hipy=-11,lean=-20,handx=12,handy=-21,wing=.7)),(24,rest)])
    add('hitstun',18,[(0,pose(lean=-13,handx=15,handy=-28,sword=-30,freex=-15,freey=-34,wind=6)),(8,pose(lean=-7,handx=14,handy=-29,sword=-40)),(18,rest)])
    seized=pose(weapon=0,handx=10,handy=-24,freex=-9,freey=-24,hipy=-18,lean=4)
    add('grabbed',16,[(0,seized),(16,seized)],loop=True)
    # Angle keys continue through the nearest equivalent orientation, avoiding
    # accidental reverse revolutions while a spinning blade recovers to idle.
    for name,(duration,keys,step,loop) in list(clips.items()):
        cleaned=[];previous=None
        for tick,p in keys:
            p=dict(p)
            if previous is not None:
                while p['sword']-previous>180:p['sword']-=360
                while p['sword']-previous<-180:p['sword']+=360
            previous=p['sword'];cleaned.append((tick,p))
        clips[name]=(duration,cleaned,step,loop)
    return clips,windows


def native_pose(kind,index,count,unarmed=False):
    """Restrained breathing, planted strides and nonlooping ascent/descent."""
    u=index/max(1,count);phase=u*math.pi*2;p=pose(weapon=0 if unarmed else 1)
    if kind=='idle':p.update(dy=math.sin(phase)*.4,handy=-34+math.sin(phase)*.4,wind=math.sin(phase)*2,sword=-58+math.sin(phase))
    elif kind=='run':
        stride=math.sin(phase);p.update(lean=10,dy=-abs(math.sin(phase*2))*.8,frontx=stride*15,fronty=-max(0,math.cos(phase))*6,backx=-stride*15,backy=-max(0,-math.cos(phase))*6,handx=15,handy=-31+stride*2,sword=-50+stride*9,freex=-12-stride*4,freey=-28+stride*3,wind=-8+stride*2)
    elif kind in ['jump','fall']:
        q=index/max(1,count-1);tuck=math.sin(q*math.pi/2) if kind=='jump' else 1-q
        p.update(lean=-3 if kind=='jump' else 3,frontx=12+tuck*4,fronty=-2-tuck*10,backx=-12-tuck*3,backy=-1-tuck*8,handx=17,handy=-33,sword=-50,freex=-15,freey=-31,wing=.6+.4*math.sin(q*math.pi),wind=math.sin(q*math.pi)*5)
    elif kind=='death':
        q=index/max(1,count-1);p.update(lean=q*84,hipy=-20+q*8,handx=16-q*18,handy=-34+q*26,freex=-12-q*5,freey=-29+q*23,frontx=13+q*19,fronty=-q,backx=-13+q*37,backy=-q,sword=-58+q*65,wind=-q*2)
    return p


def save_cells(frames,path,columns):
    """Pack numbered cels row-major within phone texture limits."""
    w,h=frames[0].size;columns=min(columns,len(frames));rows=math.ceil(len(frames)/columns);image=Image.new('RGBA',(columns*w,rows*h))
    for i,frame in enumerate(frames):
        a=np.array(frame)[...,3]
        assert not(a[0].any() or a[-1].any() or a[:,0].any() or a[:,-1].any()),(path,i,'cel perimeter')
        image.paste(frame,((i%columns)*w,(i//columns)*h))
    assert max(image.size)<=4096,(path,image.size)
    image.save(path,optimize=True);assert path.stat().st_size<2*1024*1024,path


def main():
    """Export fresh art, timing maps, exact hand tracks and body-only bounds."""
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview');args=parser.parse_args();OUT.mkdir(parents=True,exist_ok=True)
    clips,windows=authored_clips();all_frames=[];anchors=[];hurts={'moves':[]};mapping={};durations={};previews=[]
    for name,(duration,keys,step,loop) in clips.items():
        start=len(all_frames);frames=[]
        for tick in range(0,duration,step):
            p=sample(keys,tick)
            if name=='swordthrow' and tick>=8:p['weapon']=0
            image,box,attach=render(p);frames.append(image);all_frames.append(image);hurts['moves'].append(box);anchors.append(attach)
        mapping[name]=[start,len(frames),step]+([1] if loop else []);durations[name]=duration;previews.append((name,frames))
    aliases={'sideB':'swordthrow','downB':'counter','shield':'counter','holding_u':'holding','ledgeclimb':'climb','ledgeattack':'ftilt','roll':'dodge','ledgeroll':'dodge','spotdodge':'dodge','airdodge':'dodge','dizzy':'hitstun','seized':'grabbed','limit':'limit_charge'}
    for alias,name in aliases.items():mapping[alias]=mapping[name];durations[alias]=durations[name]
    save_cells(all_frames,OUT/'moves_sheet.png',22)
    for kind,count in {'idle':24,'run':24,'jump':8,'fall':8,'death':16}.items():
        for unarmed in ([False,True] if kind in ['idle','run','jump','fall'] else [False]):
            name=kind+('_u' if unarmed else '');frames=[];hurts[name]=[]
            for i in range(count):
                image,box,_=render(native_pose(kind,i,count,unarmed),(150,90),(66,86));frames.append(image);hurts[name].append(box)
            save_cells(frames,OUT/(name+'_sheet.png'),count);previews.insert(0,(name,frames))
    strips={'attack1':'utilt','attack2':'neutralB','guard':'counter','counter':'counter','grab':'grab','hit':'hitstun','hit_u':'hitstun','shrine':'taunt','shrine_turn':'taunt','shrine_release_u':'holding','shrine_hands_u':'holding','shrine_weapon':'holding'}
    for strip,clip in strips.items():
        duration,keys,step,_=clips[clip];frames=[];hurts[strip]=[]
        for tick in range(0,duration,step):
            p=sample(keys,tick)
            if strip.endswith('_u'):p['weapon']=0
            part='hands' if strip=='shrine_hands_u' else 'weapon' if strip=='shrine_weapon' else None
            if part=='weapon':p=pose(handx=10,handy=-39,sword=90)
            image,box,_=render(p,(150,90),(66,86),part);frames.append(image);hurts[strip].append(box)
        save_cells(frames,OUT/(strip+'_sheet.png'),min(24,len(frames)))
    save_cells(previews[next(i for i,p in enumerate(previews) if p[0]=='taunt')][1],OUT/'taunt_sheet.png',11)
    data='// Generated by tools/sprites/meta_knight_costume.py - do not edit by hand.\n// Original whole-pixel poses; move cells180x140, feet81,111; simulation ticks.\n'
    for name,value in [('HK_META_MOVES',mapping),('HK_META_DURATIONS',durations),('HK_META_CONTACTS',windows),('HK_META_ANCHORS',anchors),('HK_META_HURT',hurts)]:data+='export const '+name+'='+json.dumps(value,separators=(',',':'))+';\n'
    (ROOT/'src/fighters/hkMetaMoves.js').write_text(data)
    if args.preview:
        contact=Image.new('RGB',(1440,len(previews)*165),'#252536');draw=ImageDraw.Draw(contact)
        for row,(name,frames) in enumerate(previews):
            draw.text((3,row*165+2),name.upper(),fill='white')
            for j in range(8):
                image=frames[min(len(frames)-1,round(j*(len(frames)-1)/7))]
                if image.size==(150,90):cell=Image.new('RGBA',(180,140));cell.paste(image,(15,25));image=cell
                contact.paste(image,(j*180,row*165+18),image)
        contact.save(args.preview)
    print('META KNIGHT:',len(clips),'original clips /',len(all_frames),'move cels;',len(mapping),'mapped states.',flush=True)
    print('Atlas',Image.open(OUT/'moves_sheet.png').size,'native idle/run24; jump/fall8; feet66,86 /81,111.',flush=True)
    print('Anchors: charge[-27,-41], slash/recover[37,-26]; swordthrow[18,-34] unarmed at tick8.',flush=True)


if __name__=='__main__':main()
