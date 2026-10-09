import test from 'node:test';
import assert from 'node:assert/strict';
import {createShadowAura,updateShadowAura,disposeShadowAura} from '../shadow-aura.js';

test('shadow aura is one shared low-poly back surface below the face with no lights or assets',()=>{
 const a=createShadowAura(),b=createShadowAura();
 try{
  assert.equal(a.children.length,1);const mesh=a.children[0],g=mesh.geometry;
  assert(mesh.isMesh);assert.equal(g,b.children[0].geometry);assert(g.index.count/3<=160);assert.equal(mesh.material.forceSinglePass,true);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   assert(Math.hypot(p.getX(i),p.getZ(i))+.034<.7,'trace extends beyond its bounded aura');
   assert(p.getY(i)>.5&&p.getY(i)+.014<=1.55,'trace enters the face or ground warnings');
   assert(p.getZ(i)<0,'aura wraps across the face');
  }
  assert.equal(mesh.castShadow,false);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.depthTest,true);
  assert.equal(mesh.material.clipping,true);assert.equal(mesh.material.fog,true);assert(mesh.material.uniforms.fogColor);
  assert.equal(Object.values(mesh.material.uniforms).filter(u=>u.value?.isTexture).length,0);
  assert.deepEqual(new Set(g.attributes.aTrail.array),new Set([0,1]));assert.equal(g.attributes.aPhase.count,p.count);
 }finally{disposeShadowAura(a);disposeShadowAura(b);}
});

test('idle breathing and movement tails use independent bounded game-time uniforms and settle after stopping',()=>{
 for(const fps of[20,60,120]){
  const a=createShadowAura(),b=createShadowAura(),u=a.children[0].material.uniforms,other=b.children[0].material.uniforms;
  try{
   assert.notEqual(a.children[0].material,b.children[0].material);assert.notEqual(u.clock,other.clock);
   for(let frame=1;frame<=fps;frame++)updateShadowAura(a,frame/fps,6.5,.25,.2);
   assert(u.motion.value>.98&&u.attack.value>.7&&u.dash.value>.98);assert.equal(other.clock.value,0);assert.equal(other.motion.value,0);
   const frozen=['clock','motion','attack','dash'].map(key=>u[key].value);for(let i=0;i<50;i++)updateShadowAura(a,1,0,0,0);assert.deepEqual(['clock','motion','attack','dash'].map(key=>u[key].value),frozen,'a frozen clock advanced the effect');
   for(let frame=fps+1;frame<=fps*3;frame++)updateShadowAura(a,frame/fps,0,0,0);
   assert(u.motion.value<.001&&u.attack.value<.001&&u.dash.value<.001);
   updateShadowAura(a,4,Infinity,NaN,-10);assert(['clock','motion','attack','dash'].every(key=>Number.isFinite(u[key].value)));
   for(const key of['motion','attack','dash'])assert(u[key].value>=0&&u[key].value<=1);
  }finally{disposeShadowAura(a);disposeShadowAura(b);}
 }
});

test('disposing one aura only releases its own material once and keeps shared geometry usable',()=>{
 const a=createShadowAura(),b=createShadowAura(),geometry=a.children[0].geometry;let released=0,otherReleased=0,geometryReleased=0;
 a.children[0].material.addEventListener('dispose',()=>released++);b.children[0].material.addEventListener('dispose',()=>otherReleased++);
 const onDispose=()=>geometryReleased++;geometry.addEventListener('dispose',onDispose);
 try{
  disposeShadowAura(a);disposeShadowAura(a);assert.equal(released,1);assert.equal(otherReleased,0);assert.equal(geometryReleased,0);assert.equal(a.visible,false);
  updateShadowAura(a,10,6,.3,.2);assert.equal(a.children[0].material.uniforms.clock.value,0);
  updateShadowAura(b,1,6,.3,.2);assert.equal(b.children[0].material.uniforms.clock.value,1);assert.equal(b.visible,true);
 }finally{geometry.removeEventListener('dispose',onDispose);disposeShadowAura(b);}
});
