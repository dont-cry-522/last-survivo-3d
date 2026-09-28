// The companion is not a collision blocker or an enemy aggro target. Control is brief and capped.
export class BeastCompanion{
 constructor(api){this.api=api;const p=api.player();Object.assign(this,{x:p.x-.9,z:p.z-.7,angle:0,state:'follow',elapsed:0,cool:.6,now:0,command:null,target:null,throwCount:0,traps:[],recallUntil:0});}
 order(angle){const p=this.api.player();const candidates=this.api.foes().filter(e=>e.alive&&this.api.visible(e)&&Math.hypot(e.x-p.x,e.z-p.z)<10&&this.api.clear(p.x,p.z,e.x,e.z));let best=null,score=Infinity;
 for(const e of candidates){const diff=Math.abs(Math.atan2(Math.sin(Math.atan2(e.x-p.x,e.z-p.z)-angle),Math.cos(Math.atan2(e.x-p.x,e.z-p.z)-angle)));if(diff>.46)continue;const s=diff*15+Math.hypot(e.x-p.x,e.z-p.z)*.05;if(s<score){score=s;best=e;}}this.command=best;this.commandUntil=this.now+1.5;
 const w=this.api.stats();this.throwCount++;if(w.trapRank&&this.throwCount%3===0){if(this.traps.length>=3)this.traps.shift();this.traps.push({x:p.x,z:p.z,life:8,arm:.45,rank:w.trapRank,pulse:0});this.api.fx('trapSet',p.x,p.z);}
 }
 recall(){this.state='return';this.elapsed=0;this.target=this.command=null;this.recallUntil=this.now+1.1;this.cool=Math.max(this.cool,1.1);}
 marked(e){e.lingyaMark=this.now+2.5;}
 update(dt){if(dt<=0||!this.api.active())return;this.now+=dt;this.cool=Math.max(0,this.cool-dt);this.elapsed+=dt;const p=this.api.player(),w=this.api.stats(),oldX=this.x,oldZ=this.z;
 for(const trap of this.traps){trap.life-=dt;trap.arm-=dt;trap.pulse-=dt;if(trap.life<=0)continue;if(trap.pulse<=0){trap.pulse=.28;this.api.fx('trap',trap.x,trap.z);}
 if(trap.arm<=0){const enemies=this.api.foes().filter(e=>e.alive&&Math.hypot(e.x-trap.x,e.z-trap.z)<1.5+.15*trap.rank&&this.api.clear(trap.x,trap.z,e.x,e.z));if(enemies.length){trap.life=0;this.api.fx('trapSnap',trap.x,trap.z);for(const e of enemies){if(!this.api.active())break;this.api.damage(e,10+8*trap.rank);e.slow=Math.max(e.slow||0,1+.3*trap.rank);if(!e.boss)e.stagger=Math.max(e.stagger||0,.3+.1*trap.rank);}}}}this.traps=this.traps.filter(q=>q.life>0);
 if(!this.api.active())return;
 if(Math.hypot(this.x-p.x,this.z-p.z)>11||this.target&&(!this.target.alive||!this.api.visible(this.target))){this.state='return';this.target=null;this.elapsed=0;}
 if(this.state==='follow'&&this.cool<=0&&this.now>=this.recallUntil&&this.command?.alive&&this.commandUntil>=this.now&&this.api.clear(this.x,this.z,this.command.x,this.command.z)){this.target=this.command;this.state='approach';this.elapsed=0;}
 let goal;
 if(this.state==='approach'){
  const e=this.target;if(!e){this.recall();return;}const a=Math.atan2(e.x-p.x,e.z-p.z),offset=w.pincerRank?1.35:0;goal={x:e.x+Math.cos(a)*offset,z:e.z-Math.sin(a)*offset};
  if(Math.hypot(e.x-this.x,e.z-this.z)<2.6){this.state='wind';this.elapsed=0;this.attackAngle=Math.atan2(e.x-this.x,e.z-this.z);}
  if(this.elapsed>1.6){this.state='return';this.elapsed=0;}
 }else if(this.state==='wind'){
  if(this.elapsed>=.24){this.state='pounce';this.elapsed=0;this.struck=false;this.api.fx('pounce',this.x,this.z);}
 }else if(this.state==='pounce'){
  const travel=Math.min(dt,Math.max(0,.28-(this.elapsed-dt)))*10;
  this.api.move(this,Math.sin(this.attackAngle)*travel,Math.cos(this.attackAngle)*travel);const e=this.target;
  if(!this.struck&&e?.alive&&Math.hypot(e.x-this.x,e.z-this.z)<(e.size||.5)+.55&&this.api.clear(this.x,this.z,e.x,e.z)){
   this.struck=true;const marked=e.lingyaMark>this.now;this.api.damage(e,w.petDamage*(marked?1+.22*(w.pincerRank||0):1));if(e.alive&&!e.boss)e.stagger=Math.max(e.stagger||0,.22);this.api.fx('bite',e.x,e.z);
  }
  if(this.elapsed>=.28){this.state='return';this.elapsed=0;this.target=null;this.cool=w.petCooldown;}
 }else if(this.state==='return'||this.state==='follow'){
  const a=p.aimAngle??p.angle??0;goal={x:p.x-Math.cos(a)*1.05-Math.sin(a)*.65,z:p.z+Math.sin(a)*1.05-Math.cos(a)*.65};
  if(Math.hypot(this.x-goal.x,this.z-goal.z)<.35){this.state='follow';goal=null;}
 }
 if(goal){const distance=Math.hypot(goal.x-this.x,goal.z-this.z),a=Math.atan2(goal.x-this.x,goal.z-this.z),step=Math.min(distance,dt*(this.state==='return'?10:7.3));this.api.move(this,Math.sin(a)*step,Math.cos(a)*step);}
 // Stuck recovery happens at a nearby verified empty point, only after the partner is far away.
 if(Math.hypot(this.x-p.x,this.z-p.z)>14&&Math.hypot(this.x-oldX,this.z-oldZ)<dt*.1){const safe=this.api.home();if(safe){this.x=safe.x;this.z=safe.z;this.recall();}}
 this.speed=Math.hypot(this.x-oldX,this.z-oldZ)/dt;const desired=this.state==='wind'||this.state==='pounce'?this.attackAngle:this.speed>.1?Math.atan2(this.x-oldX,this.z-oldZ):this.angle;this.angle+=Math.atan2(Math.sin(desired-this.angle),Math.cos(desired-this.angle))*(1-Math.exp(-dt*14));
 }
}
export function sideHopTravel(remaining){const t=Math.max(0,Math.min(1,1-remaining/.3));return 3.8*(t-Math.sin(2*Math.PI*t)/(2*Math.PI));}
