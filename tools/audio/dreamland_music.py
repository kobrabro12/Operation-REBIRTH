"""Original cheerful chiptune for Dreamland, with a seamless 32-bar loop.

Run python3 tools/audio/dreamland_music.py /tmp/dreamland.wav then encode to OGG.
The melody is original; the warm pulse/triangle instrumentation fits the stage.
"""
import os
import sys
sys.path.insert(0,os.path.dirname(__file__))
from chiptune import Track

t=Track(144,128)
progression=[(53,[69,72,77]),(50,[65,69,74]),(58,[65,70,74]),(48,[64,67,72])]
phrases=[[(77,.5),(81,.5),(79,.5),(77,.5),(72,1),(74,.5),(76,.5)],
         [(77,.5),(74,.5),(72,1),(69,.5),(72,.5),(74,1)],
         [(79,.5),(82,.5),(81,1),(77,.5),(79,.5),(81,1)],
         [(79,.5),(76,.5),(74,.5),(72,.5),(76,1),(72,1)]]
for bar in range(32):
    beat=bar*4;root,chord=progression[bar%4]
    notes=phrases[(bar//4+bar)%4]
    if bar>=16:notes=[(n+12 if bar%4==2 else n,d) for n,d in notes]
    t.melody(notes,beat,.16,duty=.25,vib=.0015,release=.04)
    for k in range(8):t.pulse(chord[k%3]-12,.38,beat+k*.5,.045,duty=.125,decay=3)
    for k in range(4):t.tri(root-12 if k%2==0 else root-5,.8,beat+k,.17)
    t.kick(beat,.13);t.kick(beat+2,.1);t.snare(beat+1,.07);t.snare(beat+3,.07)
    for k in range(8):t.hat(beat+k*.5,.025,length=.025)
out=sys.argv[1] if len(sys.argv)>1 else '/tmp/dreamland.wav'
print('Dreamland loop:',t.save(out),'seconds ->',out)
