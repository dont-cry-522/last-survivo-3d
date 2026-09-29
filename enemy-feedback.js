import * as T from './vendor/three.module.js';
// Visual recoil only: gameplay positions, attack clocks and collision never move.
export function recordEnemyHit(mesh,{kind='magic',angle=0,damage=0,maxHp=1,heavy=false,boss=false}={}){
 if(!(damage>0)||!mesh.userData.rig)return;
 const strong=['hammer','shield','shotgun'].includes(kind),weight=(strong?.19:kind==='rifle'?.065:.115)*(heavy?.6:1)*(boss?.35:1),ratio=Math.min(1,damage/Math.max(1,maxHp));
 const d=mesh.userData,old=d.hitReaction;
 // A shotgun pellet group strengthens one reaction, rather than resetting the pose repeatedly.
 if(old&&old.age<.04){old.strength=Math.min(.24,Math.max(old.strength,weight*(1+ratio*.6)));return;}
 d.hitReaction={age:0,duration:strong?.30:.20,strength:Math.min(.24,weight*(1+ratio*.6)),angle,start:old?.amount||0};
}
export function restoreEnemyHit(mesh){const d=mesh.userData,b=d.hitBase;if(b){d.rig.position.copy(b.position);d.rig.quaternion.copy(b.rotation);d.rig.scale.copy(b.scale);d.hitBase=null;}}
export function animateEnemyHit(mesh,dt){
 const d=mesh.userData,h=d.hitReaction;if(!h)return;h.age+=dt;if(h.age>=h.duration){d.hitReaction=null;return;}
 const rig=d.rig,u=h.age/h.duration,v=Math.max(0,(u-.18)/.82),push=1-v*v*(3-2*v),a=h.angle-mesh.rotation.y;
 d.hitBase={position:rig.position.clone(),rotation:rig.quaternion.clone(),scale:rig.scale.clone()};
 const amount=u<.18?T.MathUtils.lerp(h.start,h.strength,Math.sin(u/.18*Math.PI/2)):h.strength*push;h.amount=amount;rig.position.x+=Math.sin(a)*amount;rig.position.z+=Math.cos(a)*amount;rig.rotation.x+=Math.cos(a)*amount*.75;rig.rotation.z-=Math.sin(a)*amount*.75;
}
export class EnemyDeaths{
 constructor(scene,limit=12){this.scene=scene;this.limit=limit;this.items=[];}
 add(e){
  if(!e.mesh.userData.rig){this.scene.remove(e.mesh);return;}
  while(this.items.length>=this.limit)this.scene.remove(this.items.shift().mesh);
  const mesh=e.mesh,rig=mesh.userData.rig;
  if(e.elite)for(const child of mesh.children)if(child!==rig)child.visible=false;
  this.items.push({mesh,rig,role:e.role||e.kind,age:0,position:rig.position.clone(),rotation:rig.quaternion.clone(),scale:rig.scale.clone()});
 }
 update(dt){let n=0;for(const p of this.items){p.age+=dt;if(p.age>=.48){this.scene.remove(p.mesh);continue;}
  const u=Math.min(1,p.age/.32),ease=u*u*(3-2*u),sink=Math.max(0,(p.age-.25)/.23);p.rig.position.copy(p.position);p.rig.quaternion.copy(p.rotation);p.rig.scale.copy(p.scale);p.rig.position.y-=sink*.55;
  if(p.role==='mushroom'){p.rig.scale.y*=1-ease*.64;p.rig.scale.x*=1+ease*.12;p.rig.scale.z*=1+ease*.12;}
  else if(p.role==='wolf'){p.rig.rotation.z+=ease*.85;p.rig.rotation.x+=ease*.20;p.rig.position.y-=ease*.12;}
  else if(p.role==='golem'){p.rig.rotation.x+=ease*.28;p.rig.scale.y*=1-ease*.35;}
  else{p.rig.scale.multiplyScalar(1-ease*.68);p.rig.position.y+=Math.sin(ease*Math.PI)*.15;}
  p.rig.scale.multiplyScalar(Math.max(.05,1-sink*.9));this.items[n++]=p;
 }this.items.length=n;}
 clear(){for(const p of this.items)this.scene.remove(p.mesh);this.items.length=0;}
}
