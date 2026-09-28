import{test}from'node:test';import assert from'node:assert/strict';
import{swimStroke}from'../swim-motion.js';
test('paddling traces a continuous reach, pull and recovery instead of a pendulum',()=>{
 const reach=swimStroke(.2),pull=swimStroke(.62);assert(reach.z>.7);assert(pull.z<0&&pull.y<reach.y&&pull.x>reach.x);
 const a=swimStroke(.99999),b=swimStroke(.00001);assert(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);
 let last=swimStroke(0);for(let i=1;i<=1000;i++){const p=swimStroke(i/1000);assert(Math.hypot(p.x-last.x,p.y-last.y,p.z-last.z)<.015);assert(Math.hypot(p.x,p.y,p.z)<1);last=p;}
});
