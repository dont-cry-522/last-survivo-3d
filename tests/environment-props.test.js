import test from'node:test';
import assert from'node:assert/strict';
import * as T from'../vendor/three.module.js';
import{polishEnvironmentModels}from'../environment-props.js';
import{buildWorld}from'../world.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};

test('surface finishes follow wooden beam direction, cache variants and preserve authored material behavior',()=>{
 const wood=new T.MeshStandardMaterial({color:0x76614c,roughness:.75,emissiveIntensity:0}),bronze=new T.MeshStandardMaterial({color:0xb19761,metalness:.4,emissiveIntensity:0}),group=new T.Group();
 wood.onBeforeCompile=shader=>{shader.vertexShader='// authored-surface\n'+shader.vertexShader;};wood.customProgramCacheKey=()=> 'authored-wood';
 const add=(x,y,z,source=wood)=>{const mesh=new T.Mesh(new T.BoxGeometry(x,y,z),source);group.add(mesh);return mesh;};
 const horizontal=add(3,.3,.3),upright=add(.3,3,.3),repeat=add(2,.2,.2),metal=add(1,.2,.1,bronze);polishEnvironmentModels({group,obstacles:[]});
 assert.equal(horizontal.material.userData.propSurface,'wood-x');assert.equal(upright.material.userData.propSurface,'wood-y');assert.strictEqual(horizontal.material,repeat.material);assert.notStrictEqual(horizontal.material,upright.material);
 assert(!metal.material.userData.propSurface);assert.equal(metal.material.metalness,.4);assert.equal(wood.roughness,.75);assert(!wood.vertexColors);
 for(const mesh of[horizontal,upright]){
  assert(mesh.material.color.equals(wood.color));assert(mesh.material.customProgramCacheKey().startsWith('authored-wood|'));
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);
  assert(shader.vertexShader.includes('// authored-surface'));assert.equal(shader.vertexShader.match(/varying vec3 propPoint/g).length,1);
  assert(shader.fragmentShader.indexOf('float propPatch')<shader.fragmentShader.indexOf('roughnessFactor=clamp'));
  assert(!shader.fragmentShader.includes('undefined'));assert.deepEqual(shader.uniforms,{},'surface adds texture/uniform allocations');
 }
 assert.notEqual(horizontal.material.customProgramCacheKey(),upright.material.customProgramCacheKey());
 const assigned=group.children.map(o=>o.material);polishEnvironmentModels({group,obstacles:[]});assert.deepEqual(group.children.map(o=>o.material),assigned);
});

test('all six maps retain draw counts, layout and base colors while sharing finishes across rebuilds',()=>{
 const known=new Set();
 for(const id of['forest','snow','ash','sand','coast','confluence'])for(let run=0;run<2;run++){
  const w=buildWorld(id,43837033),meshes=[];w.group.traverse(o=>{if(o.isMesh)meshes.push(o);});
  const colors=meshes.map(o=>o.material?.color?.getHex()),collisions=JSON.stringify(w.obstacles.map(o=>[o.x,o.z,o.r]));polishEnvironmentModels(w);
  const after=[];w.group.traverse(o=>{if(o.isMesh)after.push(o);});assert.equal(after.length,meshes.length);assert.equal(JSON.stringify(w.obstacles.map(o=>[o.x,o.z,o.r])),collisions);
  const kinds=new Set();for(const [i,o]of after.entries()){
   assert.equal(o.material?.color?.getHex(),colors[i]);const kind=o.material?.userData.propSurface;if(!kind)continue;
   kinds.add(kind);assert(!o.material.transparent);assert(!o.material.map&&!o.material.normalMap);assert(o.material.roughness>=.85);
   if(run)assert(known.has(o.material),'rebuild introduced new persistent material');else known.add(o.material);
  }
  assert(kinds.has('stone')&&kinds.has('wood-y'),id+' did not retain stone and wood identities');
  w.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();});
 }
});
