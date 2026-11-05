"""Extract Gregarlink10's supplied Young Link sheet without resampling its pixels."""
from pathlib import Path
from PIL import Image,ImageDraw
import json
ROOT=Path(__file__).resolve().parents[2]
src=Image.open(ROOT/'tools/sprites/source/young-link/reference.png').convert('RGBA')
for y in range(src.height):
 for x in range(src.width):
  if src.getpixel((x,y))[:3]==(0,64,128):src.putpixel((x,y),(0,0,0,0))
rows={
'basic':(29,80,[(17,41),(45,69),(73,97),(101,125),(154,190),(194,232),(236,272),(276,310),(335,363),(367,396),(401,429),(435,462)]),
'battle':(106,151,[(15+i*34,45+i*34) for i in range(6)]+[(261+i*34,293+i*34) for i in range(6)]+[(509+i*41,540+i*41) for i in range(6)]),
'walk':(181,230,[(18,36),(40,63),(67,85),(89,107),(111,134),(138,156)]),
'run':(254,295,[(15,52),(56,102),(106,144),(148,179),(183,219),(223,268),(272,310),(314,345)]),
'jump':(320,379,[(16,51),(56,94),(102,140),(151,187),(194,230),(236,271),(280,317),(324,359)]),
'hurt':(401,447,[(20,50),(54,88),(93,132),(136,174),(190,235),(244,279),(290,335),(351,388),(404,435),(450,477),(490,518),(539,588),(602,651),(671,718),(732,781)]),
'sword':(463,519,[(17,51),(55,109),(113,182),(186,245),(249,301),(332,367),(371,415),(419,488),(492,554),(558,607)]),
}
rows.update({
 'thrust':(530,574,[(19,50),(54,85),(89,146),(150,207),(211,260),(264,295)]),
 'rapid':(603,645,[(18,49),(53,110),(114,171)]),
 'up':(658,740,[(11,44),(45,94),(98,165),(169,225),(229,283),(287,322),(326,370),(374,443),(447,509),(513,562),(566,613),(617,684),(688,744),(748,802)]),
 'crouch':(765,811,[(13,43),(47,78),(82,113)]),
 'low':(832,874,[(15,49),(53,107),(111,180),(184,243),(247,299)]),
 'air':(892,943,[(15,49),(57,107),(111,180),(184,243),(247,299)]),
 'downair':(963,1019,[(19,48),(52,85),(89,113),(117,146),(150,188),(192,217)]),
 'spin':(1040,1088,[(22,53),(56,104),(108,153),(157,206),(210,260),(264,315),(319,374),(378,425)]),
 'shield':(1108,1153,[(22,54),(73,105),(127,157)]),
 'upair':(1167,1245,[(23,52),(60,103),(107,174),(178,234),(238,292)]),
 'tools':(1268,1313,[(22,51),(55,82),(86,116),(120,164),(168,216)]),
 'idle':(1349,1396,[(c-19,c+19) for c in [35,75,114,153,192,231,270,309,348,387,426,465,504,543,582,621,660,697]]),
 'win':(1440,1509,[(20,45),(49,72),(76,99),(103,126),(130,153),(157,180),(184,217),(221,246)])})
out=ROOT/'public/assets/fighters/young-link';out.mkdir(parents=True,exist_ok=True)
frames={};manifest={};atlas=[]
for name,(top,bottom,ranges) in rows.items():
 frames[name]=[];manifest[name]=[]
 row_feet=[]
 for left,right in ranges:
  for y in range((top+bottom)//2,bottom):
   for x in range(left,right+1):
    c=src.getpixel((x,y))
    if c[3] and 55<c[0]<200 and c[0]>c[1]*1.25 and c[1]>c[2]*1.1:row_feet.append(y)
 row_floor=max(row_feet) if row_feet else bottom-2
 for frame_index,(left,right) in enumerate(ranges):
  crop_top = 1450 if name=='win' and left<221 else 695 if name=='up' and left<98 else 450 if name=='sword' and left>=332 else top
  cel=src.crop((left,crop_top,right+1,bottom))
  # Boots determine the actor's ground anchor, independently of extended sword arcs.
  boots=[(x,y) for y in range(cel.height//2,cel.height) for x in range(cel.width) if (lambda c:c[3] and 55<c[0]<200 and c[0]>c[1]*1.25 and c[1]>c[2]*1.1)(cel.getpixel((x,y)))]
  if boots:
   foot=max(y for x,y in boots);xs=sorted(x for x,y in boots if y>=foot-3);anchor=(min(xs)+max(xs))//2
  else:
   b=cel.getbbox();anchor=(b[0]+b[2])//2;foot=b[3]-1
  if name=='run':anchor=[36,84,130,166,202,250,296,332][frame_index]-left
  foot=row_floor-crop_top
  canvas=Image.new('RGBA',(160,128));pos=(80-anchor,111-foot)
  b=cel.getbbox()
  assert pos[0]+b[0]>=0 and pos[1]+b[1]>=0 and pos[0]+b[2]<=160 and pos[1]+b[3]<=128,(name,left,pos,b)
  canvas.alpha_composite(cel,pos);frames[name].append(canvas)
  manifest[name].append({'rect':[left,crop_top,right+1,bottom],'anchor':[left+anchor,crop_top+foot],'frame':len(atlas)})
  atlas.append(canvas)
def sheet(cels,path):
 im=Image.new('RGBA',(160*16,128*((len(cels)+15)//16)))
 for i,cel in enumerate(cels):im.paste(cel,((i%16)*160,(i//16)*128))
 im.save(path)
# Explicit timelines: one coherent action, with anticipation and recovery, rather than a whole labeled row.
def pose(group,i):return frames[group][i]
ready=pose('basic',4)
def beats(*items):
 result=[]
 for group,index,ticks in items:result.extend([pose(group,index)]*ticks)
 return result
def action(group,indices,durations,total):
 seq=[ready]*2
 for i,n in zip(indices,durations):seq.extend([pose(group,i)]*n)
 seq.extend([ready]*max(0,total-len(seq)))
 assert len(seq)==total,(group,len(seq),total)
 return seq
clips={
 'jab':action('sword',range(10),[1,2,3,3,3,3,2,3,3,3],30),
 'ftilt':action('thrust',range(6),[4,3,3,4,4,4],28),
 'utilt':action('up',range(6),[3,3,4,4,4,5],32),
 'dtilt':action('low',range(5),[3,3,4,4,4],24),
 'dashAttack':action('thrust',range(6),[2,2,3,4,4,4],26),
 'fsmash':action('sword',range(5,10),[9,5,4,4,7],42),
 'usmash':action('up',range(6),[5,4,5,5,5,8],44),
 'dsmash':action('spin',range(8),[4,4,3,3,3,3,4,5],38),
 'nair':action('spin',range(8),[2,2,3,3,3,3,3,3],32),
 'fair':action('air',range(5),[4,4,5,5,5],30),
 'bair':action('air',range(5),[4,4,5,5,5],30),
 'uair':action('upair',range(5),[5,4,5,5,6],32),
 'dair':action('downair',range(6),[4,4,5,5,5,5],36),
 'neutralB':beats(('basic',4,3),('tools',2,3),('tools',3,2),('tools',4,22),('tools',3,5),('tools',2,3),('basic',4,4)),
 'sideB':action('thrust',range(6),[3,4,5,5,4,4],32),
 'upb':action('spin',[0,1,2,3,4,5,6,7,2,3,4,5,6,7],[3,2,2,2,2,2,2,2,2,2,2,2,3,4],40),
 'downB':beats(('basic',4,3),('crouch',0,3),('crouch',1,3),('tools',0,10),('thrust',0,3),('thrust',1,4),('thrust',5,6),('basic',4,10)),
 'holding':beats(('battle',0,24)),
 'pummel':action('rapid',[0,1,2,1,0],[2,2,2,2,2],12),
 'hitstun':beats(('hurt',0,3),('hurt',1,3),('hurt',2,18)),
 'grabbed':beats(('hurt',0,24)),
 'ledge':beats(('jump',3,24)),
 'ledgeclimb':beats(('jump',3,4),('jump',4,4),('jump',5,4),('crouch',0,4),('basic',4,8)),
 'ledgeattack':action('sword',range(5),[5,5,3,3,3],24),
 'roll':beats(*[('jump',i,n) for i,n in [(0,2),(1,2),(2,3),(3,3),(4,3),(5,3),(6,2),(7,2)]],('basic',4,4)),
 'spotdodge':beats(('crouch',0,4),('crouch',1,4),('crouch',2,8),('crouch',1,4),('crouch',0,4)),
 'airdodge':beats(('shield',0,24)),
 'jumpsquat':beats(('crouch',0,1),('crouch',1,1),('crouch',2,2)),
 'land':beats(('crouch',2,2),('crouch',1,2),('crouch',0,2),('basic',4,12)),
 'taunt':beats(*[('idle',i,6) for i in range(18)]),
 'limit':beats(('basic',4,12),('up',0,8),('up',1,8),('up',2,12),('up',3,8),('up',4,8),('up',5,12),('basic',4,22)),
 'victory':beats(*[('win',i,n) for i,n in enumerate([10,6,6,6,8,8,10,26])]),
 'shield':beats(('shield',0,24)),
}
clips['grab']=clips['neutralB'];clips['ledgeroll']=clips['roll']
for direction,group,indices in [('forward','thrust',[0,1,2,3,4,5]),('back','spin',[0,1,2,3,4,5]),('up','up',[0,1,2,3,4,5]),('down','low',[0,1,2,3,4,0])]:
 clips['throw_'+direction]=action(group,indices,[2,2,3,3,2,2],18)
anims={};timelines={};source_ids={id(c):i for i,c in enumerate(atlas)}
for name,seq in clips.items():
 timelines[name]=[source_ids[id(c)] for c in seq]
 anims[name]=[timelines[name][0],len(seq),1,int(name in ['holding','shield','grabbed','ledge'])]
sheet(atlas,out/'moves_sheet.png')
# The sword-ready stance is the resting loop. The long fidget strip is a one-shot taunt.
sheet([pose('basic',4+i//8) for i in range(32)],out/'idle_sheet.png')
for name,seq in {'run':frames['run'],'walk':frames['walk'],'jump':frames['jump'][:4],'fall':frames['jump'][4:]}.items():sheet(seq,out/(name+'_sheet.png'))
(ROOT/'src/fighters/youngLinkAnims.js').write_text('// Generated timed clips; native sprite art by Gregarlink10.\nexport const YOUNG_LINK_ANIMS = '+json.dumps(anims,indent=2)+';\nexport const YOUNG_LINK_TIMELINES = '+json.dumps(timelines,separators=(',',':'))+';\n')
mapnames={k:'timed-'+k for k in clips}
manifest={'artist':'Gregarlink10','source':'young_link_oot_melee_sprite_sheet_by_gregarlink10_d9fek9y.png','background':[0,64,128],'frameSize':[160,128],'origin':[80,112],'groups':manifest,'animationSources':mapnames,'timelines':timelines}
(out/'extraction.json').write_text(json.dumps(manifest,indent=2))
contact=Image.new('RGBA',(160*8,128*((len(atlas)+7)//8)),(25,22,38,255));draw=ImageDraw.Draw(contact)
for i,cel in enumerate(atlas):
 x=i%8*160;y=i//8*128;contact.alpha_composite(cel,(x,y));draw.text((x+2,y+2),str(i),fill='white')
preview=Path('recordings/test-output/young-link-extracted.png');preview.parent.mkdir(parents=True,exist_ok=True);contact.save(preview)   # a contact sheet to look over (git-ignored)
print('Extracted 166 native frames; authored',len(clips),'timed animation clips')
