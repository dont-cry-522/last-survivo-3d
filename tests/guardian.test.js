import test from 'node:test';
import assert from 'node:assert/strict';
import {GUARDIAN_ATTACKS,GUARDIAN_DASH,guardianDashTravel,guardianPose,nextGuardianAttack} from '../guardian-motion.js';
import {canParry} from '../melee.js';
import {weaponSample} from '../weapon-audio.js';
test('shield, sweep and overhead share continuous endpoints but different strike poses',()=>{
 const poses=GUARDIAN_ATTACKS.map((v,i)=>guardianPose(i,v.impact));assert.equal(new Set(poses.map(JSON.stringify)).size,3);
 for(let i=0;i<3;i++){assert(guardianPose(i,0).every((v,j)=>Math.abs(v-guardianPose(i,1)[j])<1e-12));let prev=guardianPose(i,0);for(let n=1;n<1001;n++){const next=guardianPose(i,n/1000);assert(Math.max(...next.map((v,k)=>Math.abs(v-prev[k])))<.025);prev=next;}}
});
test('retired guardian cannot start a dodge or grant a parry window',()=>{
 assert.equal(GUARDIAN_DASH.duration,undefined);
 for(const left of[1.2,1,.6,0])assert.equal(guardianDashTravel(left),0);
 assert.equal(canParry({heroId:'guardian',x:0,z:0,dashAngle:0,dashTime:1.2},0,2),false);
});
test('combo order resets after a pause in attacks',()=>{
 const p={};for(const expected of [0,1,2,0]){const i=nextGuardianAttack(p,1);assert.equal(i,expected);p.meleeCombo=i;p.lastMeleeAt=1;}assert.equal(nextGuardianAttack(p,3),0);
});
test('shield thud is distinct from hammer metal impact without clipping',()=>{
 const shield=weaponSample('shield','impact',22050),hammer=weaponSample('hammer','impact',22050);assert.notEqual(shield.length,hammer.length);let energy=0;for(const n of shield){assert(Number.isFinite(n)&&Math.abs(n)<.61);energy+=n*n;}assert(energy/shield.length>.0001);assert(Math.abs(shield.at(-1))<.001);
});
