import{test}from'node:test';
import assert from'node:assert/strict';
import{createHash}from'node:crypto';
import * as T from'../vendor/three.module.js';
import{buildWorld,animateWorld}from'../world.js';
import{damageTerrain,updateTactics}from'../map-tactics.js?v=91';

globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};
const dispose=w=>w.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();});
const trees=w=>w.obstacles.filter(o=>o.mesh.getObjectByName('tree-canopy'));

test('tree art preserves the established obstacle, reward, terrain and ground-detail layouts',()=>{
 const before={forest:['1c485468e05a8657eff1b670350553cb666c403693a607332926b653f1f536d2','ebf829a3b04a874d0704b2694466aebf4e9347246448562584bd2dbe5cd4535b'],snow:['b0abb255379b8280117d8ecbc5d3131483118603a25c01633fb71609556183d4','a40ac01130c5da5389c6840dc3d16bea0b45e302ac606e498ac337feadb48b7e'],confluence:['61a3e28ac98ef4704f18e8c4722c18a8d0e03d8f4079eb8337860cac335d5ed2','2949ce831ae43f87aeb8d274d0253388c2793e746ef1499a06ca967eeb4f2f2b']};
 for(const id of Object.keys(before))for(const[i,seed]of[1,7].entries()){
  const w=buildWorld(id,seed),layout={obstacles:w.obstacles.map(o=>[o.x,o.z,o.r,o.tactic]),sites:w.sites.map(s=>[s.x,s.z,s.type,s.event,s.availableAt]),patches:w.patches.map(p=>[p.x,p.z,p.r,p.kind]),details:w.regions?w.regions.map(r=>r.scenery.records):w.scenery.records};
  assert.equal(createHash('sha256').update(JSON.stringify(layout)).digest('hex'),before[id][i],id+' gameplay layout changed');dispose(w);
 }
});

test('tree canopies clear human height and every tree renders as two shared opaque meshes',()=>{
 const geometries=new Set(),materials=new Set();
 for(const id of['forest','snow','confluence'])for(const seed of[1,7,19]){
  const w=buildWorld(id,seed);w.group.updateMatrixWorld(true);
  for(const o of trees(w)){
   assert.equal(o.mesh.children.length,2);const canopy=o.mesh.getObjectByName('tree-canopy'),bounds=new T.Box3().setFromObject(o.mesh,true),crown=new T.Box3().setFromObject(canopy,true),snow=o.mesh.userData.treeBiome==='snow';
   assert(bounds.max.y>6.2&&bounds.max.y<8.5,'tree height lost its human scale');assert(crown.min.y>3.4,'canopy intrudes into the fighting plane');
   assert(crown.max.x-crown.min.x<(snow?3.9:4.5),'crown became excessively broad');assert(canopy.geometry.attributes.normal&&canopy.geometry.attributes.color);
   assert([...canopy.geometry.attributes.color.array].every(v=>Number.isFinite(v)&&v>=0&&v<=1),'canopy tint contains invalid colors');
   if(!snow){assert(bounds.max.y<7.2,'forest trunk stretched into a pole');assert(crown.max.x-crown.min.x>3.4,'forest crown collapsed into narrow balls');}
   if(o.mesh.userData.treeBiome==='snow')assert(o.mesh.children.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)<=272,'snow tree exceeds its geometry budget');
   for(const mesh of o.mesh.children){geometries.add(mesh.geometry);materials.add(mesh.material);assert(!mesh.material.transparent);assert(!mesh.userData.ownedGeometry,'shared tree geometry disposed with a single world');assert.equal(mesh.geometry.groups.length,0,'material groups multiply tree draw calls');}
  }
  const f=(w.regions?w.regions.find(r=>r.id==='forest'):w).foliage[0],before=f.leaf.position.x;animateWorld(w,2,w.spawn.x,w.spawn.z);assert.notEqual(f.leaf.position.x,before,'combined canopy stopped swaying');dispose(w);
 }
 assert.equal(materials.size,1,'world rebuilds allocate new tree materials');assert(geometries.size<=12,'world rebuilds allocate per-tree geometries');
});

test('replacing a tree with breakable timber keeps the existing fall and collision lifecycle',()=>{
 const w=buildWorld('forest',1),timber=w.breakables[0],other=trees(w)[0].mesh,geometry=other.children[0].geometry;
 assert(timber&&!timber.mesh.getObjectByName('tree-canopy'));assert(!w.foliage.some(f=>f.leaf.parent===timber.mesh));
 assert(damageTerrain(timber,100,{x:timber.x-2,z:timber.z}));
 const context={player:{x:100,z:100},foes:[],clear:()=>true,fx:()=>{}};updateTactics(w,.8,context);assert.equal(timber.state,'fallen');assert(w.obstacles.some(o=>o.owner===timber));
 updateTactics(w,8,context);assert.equal(timber.state,'spent');assert(!w.obstacles.some(o=>o.owner===timber));assert.strictEqual(other.children[0].geometry,geometry);assert(geometry.attributes.position.count>0);dispose(w);
});
