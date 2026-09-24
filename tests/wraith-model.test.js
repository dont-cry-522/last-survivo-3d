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

test('cloth and articulated casts animate independently without changing shared geometry',()=>{
 for(const weapon of ['shade','shadowblade','grimoire']){
  const actor=makeWraith(weapon),idle=makeWraith(weapon),d=actor.userData;
  const rest=Array.from(d.panels[0].geometry.attributes.position.array),idleWeights=[...idle.userData.panels[0].morphTargetInfluences];
  d.turnRate=6;d.travelAngle=.4;
  for(let f=1;f<=120;f++)animateWraith(actor,f/60,6.5,.15,0);
  assert(d.rightElbow.rotation.x<idle.userData.rightElbow.rotation.x-.1);
  assert.notDeepEqual(d.panels[0].morphTargetInfluences,idleWeights);
  assert.deepEqual(idle.userData.panels[0].morphTargetInfluences,idleWeights);
  assert.deepEqual(Array.from(d.panels[0].geometry.attributes.position.array),rest);
  for(let f=121;f<=240;f++)animateWraith(actor,f/60,0,0,0);
  assert(Math.abs(d.rightElbow.rotation.x-idle.userData.rightElbow.rotation.x)<.001);
  actor.updateMatrixWorld(true);actor.traverse(o=>assert(o.matrixWorld.elements.every(Number.isFinite)));
  if(d.focus)assert(d.focus.scale.length()<.22,'focus must retain its authored size');
 }
});
