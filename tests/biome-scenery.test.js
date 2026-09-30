import{test}from'node:test';import assert from'node:assert/strict';import * as T from'../vendor/three.module.js';
import{buildWorld,clearAt}from'../world.js';import{sceneryAllowed}from'../biome-scenery.js';
import{bridgeContains,updateTide}from'../coast.js';import{waterDepth}from'../water.js';
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>({fillRect(){}})})};
function dispose(w){w.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();});}
test('biome details are bounded, finite, grounded and clear of rewards, bridges and hazard warnings',()=>{
 for(const id of ['forest','snow','ash','sand','coast'])for(let seed=1;seed<=5;seed++){
  const w=buildWorld(id,seed);assert(w.scenery.records.length>35,id);assert(w.scenery.batches.length<=5);const matrix=new T.Matrix4();let instances=0;
  for(const m of w.scenery.batches){instances+=m.count;assert(m.isInstancedMesh&&!m.castShadow);for(let i=0;i<m.count;i++){m.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));assert(matrix.elements[13]>=0&&matrix.elements[13]<.4);}}assert(instances<3700);
  for(const p of w.scenery.records)assert(sceneryAllowed(w,p.x,p.z),id+' invalid decoration placement');
  assert(w.ground.userData.ownedGeometry&&w.ground.material.vertexColors);const colors=w.ground.geometry.attributes.color;assert.equal(colors.count,w.ground.geometry.attributes.position.count);assert([...colors.array].every(v=>Number.isFinite(v)&&v>.3&&v<1.4));dispose(w);
 }
});
test('biomes use distinct detail silhouettes and reuse GPU materials on restart',()=>{
 const expected={forest:'frond',snow:'ice',ash:'chip',sand:'leaf',coast:'wood'};
 for(const [id,kind]of Object.entries(expected)){const a=buildWorld(id,19),b=buildWorld(id,19);assert(a.scenery.batches.some(m=>m.userData.biomeDetail===kind));assert.deepEqual(a.scenery.records,b.scenery.records);assert.deepEqual(a.obstacles.map(o=>[o.x,o.z]),b.obstacles.map(o=>[o.x,o.z]));for(const m of a.scenery.batches){const other=b.scenery.batches.find(n=>n.userData.biomeDetail===m.userData.biomeDetail);assert.strictEqual(m.geometry,other.geometry);assert.strictEqual(m.material,other.material);}dispose(a);dispose(b);}
});
test('groves leave spawn, all rewards and broad cross-map routes connected',()=>{
 for(const id of ['forest','snow'])for(let seed=1;seed<=6;seed++){
  const w=buildWorld(id,seed),bound=w.half-1,size=bound*2+1,seen=new Set(),cell=(x,z)=>[Math.round(x+bound),Math.round(z+bound)],start=cell(w.spawn.x,w.spawn.z),queue=[start];seen.add(start.join(','));
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,key=nx+','+nz;if(nx<0||nz<0||nx>=size||nz>=size||seen.has(key)||!clearAt(w,nx-bound,nz-bound,.45))continue;seen.add(key);queue.push([nx,nz]);}}
  for(const s of w.sites)assert(seen.has(cell(s.x,s.z).join(',')),id+' blocked reward');assert(seen.size>size*size*.85);dispose(w);
 }
});

test('expanded scenery reaches new map edges without adding detail batches or flooding rotated banks',()=>{
 for(const id of['forest','snow','ash','sand','coast'])for(let seed=1;seed<=5;seed++){
  const w=buildWorld(id,seed);assert(w.scenery.records.some(p=>Math.max(Math.abs(p.x),Math.abs(p.z))>82),id+' empty outer area');
  if(id==='coast')updateTide(w,21);const matrix=new T.Matrix4();
  for(const batch of w.scenery.batches)for(let i=0;i<batch.count;i++){batch.getMatrixAt(i,matrix);const x=matrix.elements[12],z=matrix.elements[14];assert(sceneryAllowed(w,x,z),id+' detail clipped safe area');assert(!w.bridges?.some(b=>bridgeContains(b,x,z)),id+' decoration on bridge');}
  dispose(w);
 }
});

test('all four harbor landmarks are built on dry ground with rotated collision and clear approaches',()=>{
 for(let seed=1;seed<=12;seed++){
  const w=buildWorld('coast',seed);assert.deepEqual(w.districts.map(d=>d.kind).sort(),['beacon','dock','warehouse','wreck']);updateTide(w,21);
  for(const district of w.districts){const parts=w.obstacles.filter(o=>o.mesh.userData.district===district.kind);assert(parts.length>=3,'missing '+district.kind);for(const o of parts){assert(w.ponds.every(p=>waterDepth(p,o.x,o.z)===0));assert(!w.bridges.some(b=>bridgeContains(b,o.x,o.z,o.r+.9)));assert(Math.abs(o.mesh.rotation.y-district.angle)<.0001);}}
  const details=w.group.children.filter(m=>m.userData.districtDetail);assert(details.length<=2);assert(details.reduce((n,m)=>n+m.count,0)<350);dispose(w);
 }
});
