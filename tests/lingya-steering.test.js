import test from 'node:test';
import assert from 'node:assert/strict';
import {planLingyaHop,steerLingyaHop,LINGYA_HOP_DURATION,sideHopTravel} from '../lingya-motion.js';
const owner={x:0,z:0},pet={alive:true,x:5,z:0},free=()=>true;
test('held direction wins over a nearby companion, stationary dodge can swap',()=>{
 const directed=planLingyaHop(owner,pet,Math.PI,0,free);assert.equal(directed.angle,Math.PI);assert.equal(directed.cooperative,false);assert.equal(directed.distance,6.2);
 const swap=planLingyaHop(owner,pet,null,0,free);assert.equal(swap.angle,Math.PI/2);assert.equal(swap.distance,5);assert(swap.cooperative);
 const aligned=planLingyaHop(owner,pet,Math.PI/2+.1,0,free);assert.equal(aligned.angle,Math.PI/2+.1);assert(aligned.cooperative);
});
test('planning checks the whole actor path, not only the landing point',()=>{
 const wall=(x,z)=>Math.hypot(x-2,z)>.95,hop=planLingyaHop(owner,pet,null,0,wall);assert(!hop.cooperative);assert(hop.distance<1.1&&hop.distance>0);
 assert.equal(planLingyaHop(owner,pet,null,0,()=>false).distance,0);
 assert(!planLingyaHop(owner,{...pet,alive:false},null,0,free).cooperative);
});
test('air steering is bounded, frame-rate stable, and releasing input preserves momentum',()=>{
 for(const fps of [30,60,120]){let angle=0;for(let i=0;i<Math.floor(LINGYA_HOP_DURATION*fps);i++){const next=steerLingyaHop(angle,0,Math.PI,LINGYA_HOP_DURATION-i/fps,1/fps);assert(Math.abs(next-angle)<=2.8/fps+1e-9);angle=next;}assert(angle>.65&&angle<=Math.PI/4+1e-9);assert.equal(steerLingyaHop(angle,0,null,.3,1/fps),angle);}
 assert.equal(steerLingyaHop(.2,0,1,.03,.02),.2);
});
test('landing brakes smoothly while the unchanged total hop distance stays frame independent',()=>{
 const sample=u=>sideHopTravel(LINGYA_HOP_DURATION*(1-u));assert(sample(.9)-sample(.8)<sample(.7)-sample(.6));assert(sample(1)-sample(.9)<.15);assert(Math.abs(sample(1)-6.2)<1e-9);
});
