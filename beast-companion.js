// Pets never block enemies or absorb their damage. Leash and recovery cap autonomous attacks.
export const PET_TIMING={wind:.28,pounce:.30,recover:.34};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class BeastCompanion{
 constructor(api){this.api=api;const p=api.player();Object.assign(this,{x:p.x-.9,z:p.z-.7,angle:0,state:'sniff',elapsed:0,cool:.6,now:0,command:null,target:null,throwCount:0,traps:[],recallUntil:0,decisionAt:.9,seed:1937,vx:0,vz:0,stuck:0});}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 change(state){if(this.state!==state){this.state=state;this.elapsed=0;}}
 order(angle,thrown=true){const p=this.api.player();let best=null,score=Infinity;
  for(const e of this.api.foes()){if(!e.alive||!this.api.visible(e)||dist(e,p)>=10||!this.api.clear(p.x,p.z,e.x,e.z))continue;
   const diff=Math.abs(angleDiff(Math.atan2(e.x-p.x,e.z-p.z),angle));if(diff>.46)continue;const s=diff*15+dist(e,p)*.05;if(s<score){score=s;best=e;}}
  this.command=best;this.commandUntil=this.now+1.5;
  // An explicit aim can redirect an approach, but cannot swivel an airborne pounce.
  if(best&&this.state==='approach')this.target=best;
  if(!thrown)return;
  const w=this.api.stats();this.throwCount++;if(w.trapRank&&this.throwCount%3===0){if(this.traps.length>=3)this.traps.shift();this.traps.push({x:p.x,z:p.z,life:8,arm:.45,rank:w.trapRank,pulse:0});this.api.fx('trapSet',p.x,p.z);}
 }
 recall(){this.change('return');this.target=this.command=null;this.roamGoal=null;this.recallUntil=this.now+1.1;this.cool=Math.max(this.cool,1.1);}
 marked(e){e.lingyaMark=this.now+2.5;}
 updateTraps(dt){for(const trap of this.traps){trap.life-=dt;trap.arm-=dt;trap.pulse-=dt;if(trap.life<=0)continue;
  if(trap.pulse<=0){trap.pulse=.28;this.api.fx('trap',trap.x,trap.z);}
  if(trap.arm<=0){const enemies=this.api.foes().filter(e=>e.alive&&dist(e,trap)<1.5+.15*trap.rank&&this.api.clear(trap.x,trap.z,e.x,e.z));
   if(enemies.length){trap.life=0;this.api.fx('trapSnap',trap.x,trap.z);for(const e of enemies){if(!this.api.active())break;this.api.damage(e,10+8*trap.rank);e.slow=Math.max(e.slow||0,1+.3*trap.rank);if(!e.boss)e.stagger=Math.max(e.stagger||0,.3+.1*trap.rank);}}}}
  this.traps=this.traps.filter(q=>q.life>0);
 }
 nearbyTarget(p){let best=null,score=Infinity;for(const e of this.api.foes()){
  const d=dist(e,this);if(!e.alive||!this.api.visible(e)||dist(e,p)>5.5||d>3.6||!this.api.clear(this.x,this.z,e.x,e.z))continue;
  const priority=d-(e.lingyaMark>this.now?1.8:0);if(priority<score){score=priority;best=e;}}
  return best;
 }
 chooseRoam(p){this.roamGoal=null;for(let i=0;i<6;i++){const a=this.random()*Math.PI*2,r=1.5+this.random()*2,x=p.x+Math.sin(a)*r,z=p.z+Math.cos(a)*r;
  if(this.api.clear(this.x,this.z,x,z)){this.roamGoal={x,z};this.change('roam');return;}}
  this.change('look');this.decisionAt=this.now+.8;
 }
 update(dt){if(dt<=0||!this.api.active())return;this.now+=dt;this.cool=Math.max(0,this.cool-dt);this.elapsed+=dt;
  const p=this.api.player(),w=this.api.stats(),oldX=this.x,oldZ=this.z,oldAngle=this.angle;this.updateTraps(dt);if(!this.api.active())return;
  const attacking=['approach','wind','pounce'].includes(this.state);
  if(dist(this,p)>(attacking?9:6.5)||this.target&&(!this.target.alive||!this.api.visible(this.target))){this.change('return');this.target=null;}
  if(['sniff','look','roam','follow'].includes(this.state)&&this.cool<=0&&this.now>=this.recallUntil){
   const commanded=this.commandUntil>=this.now,choice=commanded?this.command:this.nearbyTarget(p);
   if(choice?.alive&&dist(choice,p)<10&&this.api.clear(this.x,this.z,choice.x,choice.z)){this.target=choice;this.change('approach');}
  }
  let goal,moveSpeed=0;
  if(this.state==='approach'){
   const e=this.target;if(!e){this.recall();return;}const a=Math.atan2(e.x-p.x,e.z-p.z),offset=w.pincerRank?1.35:0;goal={x:e.x+Math.cos(a)*offset,z:e.z-Math.sin(a)*offset};moveSpeed=6.4;
   if(dist(e,this)<2.35){this.change('wind');this.attackAngle=Math.atan2(e.x-this.x,e.z-this.z);goal=null;}
   else if(this.elapsed>2){this.change('return');this.target=null;}
  }else if(this.state==='wind'){
   if(this.elapsed>=PET_TIMING.wind){this.change('pounce');this.struck=false;this.vx=this.vz=0;this.api.fx('pounce',this.x,this.z);}
  }else if(this.state==='pounce'){
   const travel=Math.min(dt,Math.max(0,PET_TIMING.pounce-(this.elapsed-dt)))*8.7;
   this.api.move(this,Math.sin(this.attackAngle)*travel,Math.cos(this.attackAngle)*travel);const e=this.target;
   if(!this.struck&&e?.alive&&dist(e,this)<(e.size||.5)+.55&&this.api.clear(this.x,this.z,e.x,e.z)){
    this.struck=true;this.api.damage(e,w.petDamage*(e.lingyaMark>this.now?1+.22*(w.pincerRank||0):1));if(e.alive&&!e.boss)e.stagger=Math.max(e.stagger||0,.22);this.api.fx('bite',e.x,e.z);}
   if(this.elapsed>=PET_TIMING.pounce){this.change('recover');this.target=null;this.cool=w.petCooldown;this.api.fx('land',this.x,this.z);}
  }else if(this.state==='recover'){
   if(this.elapsed>=PET_TIMING.recover){this.change(dist(this,p)>4?'return':'look');this.decisionAt=this.now+.5;}
  }else if(this.state==='return'){
   // Hysteresis: catch up only outside the leash; stop well inside it instead of orbiting a fixed slot.
   if(dist(this,p)<2.1){this.change('look');this.decisionAt=this.now+.65;this.roamGoal=null;}
   else{const a=p.angle||0;goal={x:p.x-Math.sin(a)*.9,z:p.z-Math.cos(a)*.9};moveSpeed=Math.min(this.now<this.recallUntil?12:10,4+dist(this,p)*.8);}
  }else if(this.state==='roam'){
   goal=this.roamGoal;moveSpeed=1.65;if(!goal||dist(this,goal)<.35||this.elapsed>3.5){goal=null;this.change(this.random()<.65?'sniff':'look');this.decisionAt=this.now+1+this.random()*1.8;}
  }else if(this.now>=this.decisionAt)this.chooseRoam(p);
  // Smooth steering, acceleration and braking, while keeping the leap's committed path.
  if(!['pounce','recover'].includes(this.state)){
   const distance=goal?dist(goal,this):0,a=goal?Math.atan2(goal.x-this.x,goal.z-this.z):this.angle;
   const desiredSpeed=goal?Math.min(moveSpeed,distance*4):0,k=1-Math.exp(-dt*(goal?7:14));
   this.vx+=(Math.sin(a)*desiredSpeed-this.vx)*k;this.vz+=(Math.cos(a)*desiredSpeed-this.vz)*k;
   this.api.move(this,this.vx*dt,this.vz*dt);
  }else this.vx=this.vz=0;
  const travel= Math.hypot(this.x-oldX,this.z-oldZ);this.stuck=goal&&travel<dt*.08?this.stuck+dt:0;
  if(this.state==='roam'&&this.stuck>.6){this.change('look');this.decisionAt=this.now+.5;this.roamGoal=null;this.stuck=0;}
  // Only a far-away, truly blocked pet may recover at a verified free point.
  if(dist(this,p)>14&&this.stuck>.8){const safe=this.api.home();if(safe){this.x=safe.x;this.z=safe.z;this.recall();this.stuck=0;}}
  this.speed=travel/dt;const desired=['wind','pounce','recover'].includes(this.state)?this.attackAngle:this.speed>.12?Math.atan2(this.x-oldX,this.z-oldZ):this.angle;
  this.angle+=angleDiff(desired,this.angle)*(1-Math.exp(-dt*(['wind','pounce'].includes(this.state)?16:7)));this.turnRate=angleDiff(this.angle,oldAngle)/dt;
 }
}
export {sideHopTravel} from './lingya-motion.js?v=48';
