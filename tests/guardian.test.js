import test from 'node:test';
import assert from 'node:assert/strict';
import {GUARDIAN_ATTACKS,GUARDIAN_DASH,guardianDashTravel,guardianPose,nextGuardianAttack} from '../guardian-motion.js';
import {canParry} from '../melee.js';
import {weaponSample} from '../weapon-audio.js';
test('shield, sweep and overhead share continuous endpoints but different strike poses',()=>{
 const poses=GUARDIAN_ATTACKS.map((v,i)=>guardianPose(i,v.impact));assert.equal(new Set(poses.map(JSON.stringify)).size,3);
 for(let i=0;i<3;i++){assert(guardianPose(i,0).every((v,j)=>Math.abs(v-guardianPose(i,1)[j])<1e-12));let prev=guardianPose(i,0);for(let n=1;n<1001;n++){const next=guardianPose(i,n/1000);assert(Math.max(...next.map((v,k)=>Math.abs(v-prev[k])))<.025);prev=next;}}
});
test('shield charge covers 4.25m with acceleration, braking and the original 180ms parry',()=>{
 for(const fps of [30,60,120]){let remaining=GUARDIAN_DASH.duration,distance=0;while(remaining>0){const next=Math.max(0,remaining-1/fps);distance+=guardianDashTravel(next)-guardianDashTravel(remaining);remaining=next;}assert(Math.abs(distance-4.25)<1e-9);}
 const dt=.01,start=guardianDashTravel(.38-dt),middle=guardianDashTravel(.19-dt)-guardianDashTravel(.19),end=4.25-guardianDashTravel(dt);assert(middle>start*10&&middle>end*10);
 const p={heroId:'guardian',x:0,z:0,dashAngle:0,dashTime:.38};assert(canParry(p,0,2));assert(!canParry({...p,dashTime:.19},0,2));assert(!canParry(p,0,-2));
});
test('combo order resets after a pause in attacks',()=>{
 const p={};for(const expected of [0,1,2,0]){const i=nextGuardianAttack(p,1);assert.equal(i,expected);p.meleeCombo=i;p.lastMeleeAt=1;}assert.equal(nextGuardianAttack(p,3),0);
});
test('shield thud is distinct from hammer metal impact without clipping',()=>{
 const shield=weaponSample('shield','impact',22050),hammer=weaponSample('hammer','impact',22050);assert.notEqual(shield.length,hammer.length);let energy=0;for(const n of shield){assert(Number.isFinite(n)&&Math.abs(n)<.61);energy+=n*n;}assert(energy/shield.length>.0001);assert(Math.abs(shield.at(-1))<.001);
});
