import {sfx} from '../audio/sfx.js';
import {newAttackId} from './attackIds.js';

/** A slow broadcast orb telegraphs a short static explosion near an enemy or wall. */
export class StaticRupture {
  /** Launch from the casting hand; one orb per owner prevents overlapping traps. */
  constructor(match,owner,spec){
    this.match=match;this.owner=owner;this.spec=spec;this.dir=owner.facing;
    this.x=owner.x+this.dir*30;this.y=owner.y-38;this.vx=this.dir*spec.speed;
    this.t=0;this.burst=-1;this.alive=true;this.id='static:'+newAttackId();
    this.g=match.add.graphics();match.addWorld(this.g);sfx('glitch',.5,1.3);
  }
  /** Only the bright middle of the burst deals damage; its warning ring is harmless. */
  hitbox(){
    if(!this.alive||this.burst<2||this.burst>5)return null;
    const r=this.spec.radius;
    return {x1:this.x-r,x2:this.x+r,y1:this.y-r,y2:this.y+r,h:this.spec.hit,owner:this.owner,id:this.id,facing:this.dir,projectile:this,persist:true};
  }
  /** Advance using match ticks, bursting near enemies and solid walls or at maximum range. */
  step(){
    if(!this.alive)return;
    if(!this.owner.alive||['dying','respawn'].includes(this.owner.state)){this.kill();return;}
    this.t++;
    if(this.burst>=0){if(++this.burst>=10)this.kill();return;}
    this.x+=this.vx;
    const wall=this.match.stage.platforms.some(p=>p.solid&&this.x>=p.x1&&this.x<=p.x2&&this.y>p.y&&this.y<p.bottom);
    const near=this.match.fighters.some(f=>f!==this.owner&&f.alive&&f.team!==this.owner.team&&!['dying','respawn'].includes(f.state)&&Math.abs(f.x-this.x)<20&&this.y>f.y-f.body.h-10&&this.y<f.y+10);
    if(near||wall||this.t>=this.spec.fuse){
      this.burst=0;this.vx=0;sfx('glitch',.65,.7);this.match.puff(this.x,this.y,this.owner.fxColor,6);
    }
  }
  /** Remove graphics and release the owner's one-orb slot, including shield/counter cancellation. */
  kill(){
    if(!this.alive)return;this.alive=false;this.g.destroy();
    if(this.owner.signalOrb===this)this.owner.signalOrb=null;
  }
  /** Draw a hollow CRT orb and expanding scanlines without mutating its simulation. */
  render(){
    if(!this.alive)return;
    const g=this.g,x=Math.round(this.x),y=Math.round(this.y),hot=this.owner.fxs().beam[0];g.clear();
    const r=this.burst<0?9:Math.min(this.spec.radius,12+this.burst*10),a=this.burst<0?1:Math.max(0,1-this.burst/11);
    g.fillStyle(0x10151c,.88*a);g.fillEllipse(x,y,r*2,r*1.7);
    g.lineStyle(this.burst<0?2:3,hot,a);g.strokeEllipse(x,y,r*2,r*1.7);
    for(let i=-3;i<=3;i++){
      const w=Math.round(Math.sqrt(1-(i/4)**2)*r*1.45),j=(this.t*7+i*11)%5-2;
      g.fillStyle(i%2?0xffffff:hot,.8*a);g.fillRect(x-w/2+j,y+i*r/5,w,1);
    }
    if(this.burst<0){g.fillStyle(hot,.35);for(let i=1;i<4;i++)g.fillRect(x-this.dir*(10+i*6),y+(this.t+i*3)%7-3,4,2);}
  }
}
