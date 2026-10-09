import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {installWorldLightShafts,updateWorldLightShafts} from '../world-light-shafts.js';
import {buildWorld} from '../world.js';

globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};

test('all maps keep deterministic clear light shafts without changing world rules',()=>{
 for(const map of ['forest','snow','coast','sand','ash','confluence']){
  const world=buildWorld(map,7),before=JSON.stringify({obstacles:world.obstacles.map(o=>[o.x,o.z,o.r]),patches:world.patches.map(p=>[p.x,p.z,p.kind]),sites:world.sites.map(s=>[s.x,s.z,s.type]),spawn:world.spawn});
  const again={...world,group:new T.Group()},random=Math.random;let mesh,second;
  // Three uses Math.random for UUIDs; changing it must not change the actual placement.
  try{Math.random=()=>.13;mesh=installWorldLightShafts(world,map);Math.random=()=>.87;second=installWorldLightShafts(again,map);}finally{Math.random=random;}
  assert(mesh&&mesh.count>0&&mesh.count<=6,map+' has no valid shafts or exceeds the budget');
  assert.deepEqual(second.userData.anchors,mesh.userData.anchors);assert.deepEqual(Array.from(second.instanceMatrix.array),Array.from(mesh.instanceMatrix.array));second.dispose();
  assert.equal(installWorldLightShafts(world,map),mesh,'install duplicated the draw');assert.equal(mesh.parent,world.group);
  assert.equal(mesh.geometry.index.count/3,4);assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.forceSinglePass,true);assert(!mesh.castShadow&&!mesh.receiveShadow);
  const matrix=new T.Matrix4(),up=new T.Vector3(),expected=new T.Vector3(-18,30,14).normalize();
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));up.setFromMatrixColumn(matrix,1).normalize();assert(up.distanceTo(expected)<1e-7,'shaft points away from the sun');
   const p=mesh.userData.anchors[i];assert(world.obstacles.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>=(o.r||0)+1.1));assert(world.sites.every(s=>Math.hypot(p.x-s.x,p.z-s.z)>=3.2));
  }
  const transforms=Array.from(mesh.instanceMatrix.array);updateWorldLightShafts(world,12);updateWorldLightShafts(world,12);assert.equal(mesh.material.uniforms.shaftTime.value,12,'paused time advanced');updateWorldLightShafts(world,NaN);assert.equal(mesh.material.uniforms.shaftTime.value,12);
  world.spawn.x+=30;updateWorldLightShafts(world,14);assert.deepEqual(Array.from(mesh.instanceMatrix.array),transforms,'light follows a mutable player/spawn point');world.spawn.x-=30;
  assert.equal(JSON.stringify({obstacles:world.obstacles.map(o=>[o.x,o.z,o.r]),patches:world.patches.map(p=>[p.x,p.z,p.kind]),sites:world.sites.map(s=>[s.x,s.z,s.type]),spawn:world.spawn}),before);
  world.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();});
 }
});

test('world cleanup releases its clock material while shared geometry and another world survive',()=>{
 const make=()=>({half:96,group:new T.Group(),spawn:{x:0,z:0},sites:[{x:25,z:10}],obstacles:[],patches:[],ponds:[]});
 const a=make(),b=make(),one=installWorldLightShafts(a,'forest'),two=installWorldLightShafts(b,'snow');
 assert.equal(one.geometry,two.geometry);assert.notEqual(one.material,two.material);
 let released=0,sharedReleased=0;one.material.addEventListener('dispose',()=>released++);const onGeometry=()=>sharedReleased++;one.geometry.addEventListener('dispose',onGeometry);
 try{
  updateWorldLightShafts(a,4);updateWorldLightShafts(b,9);assert.equal(one.material.uniforms.shaftTime.value,4);assert.equal(two.material.uniforms.shaftTime.value,9);
  one.dispose();one.dispose();assert.equal(released,1);assert.equal(sharedReleased,0);updateWorldLightShafts(a,20);assert.equal(one.material.uniforms.shaftTime.value,4);updateWorldLightShafts(b,11);assert.equal(two.material.uniforms.shaftTime.value,11);
 }finally{one.geometry.removeEventListener('dispose',onGeometry);two.dispose();}
});

test('fully blocked and unsupported maps stay empty',()=>{
 const world={half:96,group:new T.Group(),spawn:{x:0,z:0},sites:[],obstacles:[{x:0,z:0,r:20}],patches:[],ponds:[]};
 assert.equal(installWorldLightShafts(world,'forest'),null);assert.equal(installWorldLightShafts(world,'unknown'),null);assert.equal(world.group.children.length,0);updateWorldLightShafts(world,1);
});
