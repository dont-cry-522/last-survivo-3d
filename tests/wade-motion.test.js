import{test}from'node:test';import assert from'node:assert/strict';
import{wadeStep}from'../wade-motion.js';
test('mud stride keeps a long planted stance then lifts the boot; cycle is continuous',()=>{
 for(const phase of [0,.2,.4,.61])assert.equal(wadeStep(phase).y,-.94);
 assert(wadeStep(.81).y>-.71);assert(wadeStep(0).z>0);assert(wadeStep(.62).z<0);
 let previous=wadeStep(0);for(let i=1;i<=1000;i++){const next=wadeStep(i/1000);assert(Math.hypot(next.y-previous.y,next.z-previous.z)<.01);previous=next;}
 assert.deepEqual(wadeStep(0),wadeStep(1));
});
