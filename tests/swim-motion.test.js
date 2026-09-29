import{test}from'node:test';import assert from'node:assert/strict';
import{swimStroke,heroSwimPose}from'../swim-motion.js';
test('paddling traces a continuous reach, pull and recovery instead of a pendulum',()=>{
 const reach=swimStroke(.2),pull=swimStroke(.62);assert(reach.z>.7);assert(pull.z<0&&pull.y<reach.y&&pull.x>reach.x);
 const a=swimStroke(.99999),b=swimStroke(.00001);assert(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);
 let last=swimStroke(0);for(let i=1;i<=1000;i++){const p=swimStroke(i/1000);assert(Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z)<.015);assert(Math.hypot(p.x,p.y,p.z)<1);last=p;}
});
test('three swimming styles loop smoothly, stay within limb reach and tread while attacking',()=>{
 for(const kind of ['guardian','tide','lingya'])for(const moving of [0,.5,1])for(const attack of [0,1]){
  const values=pose=>[pose.left,pose.right,...pose.legs].flatMap(p=>[p.x,p.y,p.z]);
  let last=values(heroSwimPose(kind,0,moving,attack));
  for(let i=1;i<=500;i++){
   const pose=heroSwimPose(kind,i/500,moving,attack),v=values(pose);
   for(const p of [pose.left,pose.right,...pose.legs])assert(Math.hypot(p.x,p.y,p.z)<.97,'unreachable target');
   v.forEach((x,j)=>{assert(Number.isFinite(x));assert(Math.abs(x-last[j])<.025,'discontinuous cycle');});last=v;
  }
  assert.deepEqual(last,values(heroSwimPose(kind,0,moving,attack)));
 }
 for(const kind of ['guardian','tide','lingya']){
  const swim=heroSwimPose(kind,.4,1),attack=heroSwimPose(kind,.4,1,1);
  assert(attack.legs[0].y<swim.legs[0].y&&attack.legs[0].z>swim.legs[0].z,'attack should lower the legs to tread');
 }
 assert.notDeepEqual(heroSwimPose('guardian',.3,1),heroSwimPose('tide',.3,1));
 assert.notDeepEqual(heroSwimPose('lingya',.3,1),heroSwimPose('tide',.3,1));
});
