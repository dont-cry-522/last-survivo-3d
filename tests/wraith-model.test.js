import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {makeWraith,animateWraith} from '../wraith-model.js';

test('shadow hero is shorter than a human and has articulated body parts',()=>{
 const hero=makeWraith('shade'),box=new T.Box3().setFromObject(hero);
 assert(hero.userData.wraith);
 assert(box.max.y-box.min.y<2);
 assert(box.max.y-box.min.y>1.3);
 for(const name of ['head','leftArm','rightArm','leftLeg','rightLeg','cape','weapon'])assert(hero.userData[name],name);
 for(const t of [0,.1,.2,.5,1])animateWraith(hero,t,5,.3,.1);
 hero.traverse(o=>{assert(Number.isFinite(o.position.x));assert(Number.isFinite(o.rotation.x));});
});

test('book stays level through running casts and cloth settles at mobile and desktop frame rates',()=>{
 for(const fps of [20,30,60,120]){
  const actor=makeWraith('grimoire'),d=actor.userData,up=new T.Vector3(),q=new T.Quaternion();
  for(let f=1;f<=fps*4;f++){
   const t=f/fps,moving=t<2;actor.rotation.y=moving?Math.sin(t*2):Math.sin(4);d.turnRate=moving?2*Math.cos(t*2):0;d.travelAngle=actor.rotation.y;
   animateWraith(actor,t,moving?6.5:0,moving?Math.max(0,.32-t%1.25):0,0);
   d.book.getWorldQuaternion(q);up.set(0,1,0).applyQuaternion(q);assert(up.y>.985,'floating book tipped while the body turned');
   assert(d.panels.every(p=>p.morphTargetInfluences.every(Number.isFinite)));
  }
  assert(Math.abs(d.clothTrail.x-.08)<.02,'cape failed to settle after stopping');
  assert(Math.abs(d.clothSide.x)<.02,'cape turn inertia failed to settle');
 }
});

test('cloth and articulated casts animate independently without changing shared geometry',()=>{
 for(const weapon of ['shade','shadowblade','grimoire']){
  const actor=makeWraith(weapon),idle=makeWraith(weapon),d=actor.userData;
  const rest=Array.from(d.panels[0].geometry.attributes.position.array),idleWeights=[...idle.userData.panels[0].morphTargetInfluences];
  d.turnRate=6;d.travelAngle=.4;
  for(let f=1;f<=120;f++)animateWraith(actor,f/60,6.5,.15,0);
  assert(d.rightHand.getWorldPosition(new T.Vector3()).distanceTo(idle.userData.rightHand.getWorldPosition(new T.Vector3()))>.1,'casting hand must leave its resting pose');
  assert.notDeepEqual(d.panels[0].morphTargetInfluences,idleWeights);
  assert.deepEqual(idle.userData.panels[0].morphTargetInfluences,idleWeights);
  assert.deepEqual(Array.from(d.panels[0].geometry.attributes.position.array),rest);
  for(let f=121;f<=240;f++)animateWraith(actor,f/60,0,0,0);
  assert(Math.abs(d.rightElbow.rotation.x-idle.userData.rightElbow.rotation.x)<.001);
  actor.updateMatrixWorld(true);actor.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  if(d.focus)assert(d.focus.scale.length()<.22,'focus must retain its authored size');
 }
});
