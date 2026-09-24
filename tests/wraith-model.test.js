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
