import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {actor,animateActor} from '../world.js';
import {polishEnemyAppearance} from '../enemy-appearance.js';

const kinds=['mushroom','wolf','golem','spitter','shaman'];
const surfaces=g=>{const parts=[];g.traverse(o=>{if(o.isMesh)parts.push(o);});return parts;};
test('forest models preserve their encounter footprint, share finite assets and batch small details',()=>{
 let oldCalls=0,newCalls=0;
 for(const kind of kinds){
  const base=actor(kind,undefined,false),size=new T.Box3().setFromObject(base).getSize(new T.Vector3());
  oldCalls+=surfaces(base).length;
  const g=polishEnemyAppearance(base),other=polishEnemyAppearance(actor(kind,undefined,false)),parts=surfaces(g),copy=surfaces(other);
  const next=new T.Box3().setFromObject(g).getSize(new T.Vector3());
  for(const axis of['x','y','z'])assert.ok(next[axis]<=size[axis]*1.15,`${kind} ${axis} exceeds existing silhouette`);
  assert.ok(next.y>=size.y*.85,`${kind} became too small`);
  assert.equal(parts.length,copy.length);newCalls+=parts.length;
  parts.forEach((part,i)=>{
   assert.equal(part.geometry,copy[i].geometry,`${kind} duplicate geometry`);
   assert.equal(part.material,copy[i].material,`${kind} duplicate material`);
   assert.ok(part.geometry.boundingSphere.radius>0);
   assert.equal(part.geometry.attributes.color.count,part.geometry.attributes.position.count);
   assert.ok(Array.from(part.geometry.attributes.position.array).every(Number.isFinite));
  });
  const nodes=[...g.userData.rig.children];polishEnemyAppearance(g);assert.deepEqual(g.userData.rig.children,nodes,'polish is idempotent');
 }
 assert.ok(newCalls<=oldCalls,`forest set ${newCalls} mesh batches exceeds old ${oldCalls}`);
});

test('new moving parts belong to the live rig and remain finite through attack and water poses',()=>{
 for(const kind of kinds){
  const g=polishEnemyAppearance(actor(kind)),d=g.userData,live=new Set();g.traverse(o=>live.add(o));
  for(const p of[d.head,d.cap,d.jaw,d.tail,d.tailTip,d.hatTip,d.hem,d.staff,d.focus,...d.arms,...(d.feet||[]),...(d.ears||[])])if(p)assert.ok(live.has(p),`${kind} detached pose target`);
  if(kind==='wolf')for(const leg of d.legs){assert.equal(leg.knee.parent,leg.joint);assert.equal(leg.paw.parent,leg.knee);assert.equal(leg.upperLength,.24);assert.equal(leg.lowerLength,.24);}
  for(let i=0;i<240;i++){d.waterDepth=i>120?.6:0;animateActor(g,i/60,i<120?2.5:0,i%60<25?.5-i%60*.02:0);}
  g.updateMatrixWorld(true);g.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),`${kind}: invalid transform`));
 }
});

test('snow and ash species retain their existing role rebuild and materials',()=>{
 for(const kind of['snowhare','frostwolf','yeti','icewitch','snowtotem','emberling','ashstalker','lavabrute','cinderwisp','ashseer']){
  const g=actor(kind),parts=surfaces(g),geometry=parts.map(p=>p.geometry),materials=parts.map(p=>p.material);
  polishEnemyAppearance(g);assert.equal(g.userData.appearance,undefined,kind);
  assert.deepEqual(surfaces(g),parts);assert.deepEqual(parts.map(p=>p.geometry),geometry);assert.deepEqual(parts.map(p=>p.material),materials);
  animateActor(g,.1,2,.4);assert.ok(new T.Box3().setFromObject(g).getSize(new T.Vector3()).y>0);
 }
});

test('caster two-bone sleeves follow the grip through walking, windup and release without stretching',()=>{
 for(const kind of['spitter','shaman']){
  const g=polishEnemyAppearance(actor(kind)),d=g.userData,{upper,forearm,upperLength,lowerLength}=d.castingArm;
  let elbowTravel=0,last=forearm.position.clone();
  for(let i=0;i<360;i++){
   animateActor(g,i/60,i<240?2.5:0,i%90<48?.8-i%90/60:0);
   const elbow=new T.Vector3(0,-upperLength,0).applyQuaternion(upper.quaternion).add(upper.position);
   const wrist=new T.Vector3(0,-lowerLength,0).applyQuaternion(forearm.quaternion).add(forearm.position);
   const grip=new T.Vector3(-.015,.20,.02).applyMatrix4(d.staff.matrix);
   assert.ok(elbow.distanceTo(forearm.position)<1e-7,`${kind}: elbow disconnected`);
   assert.ok(wrist.distanceTo(grip)<1e-7,`${kind}: wrist missed staff`);
   assert.deepEqual(upper.scale.toArray(),[1,1,1]);assert.deepEqual(forearm.scale.toArray(),[1,1,1]);
   elbowTravel+=forearm.position.distanceTo(last);last.copy(forearm.position);
  }
  assert.ok(elbowTravel>.1,`${kind}: arm pose never followed staff`);
 }
});
