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
   assert.equal(o.material.vertexColors,!!o.geometry.attributes.color,id+' surface requires a missing color attribute');
   if(run)assert(known.has(o.material),'rebuild introduced new persistent material');else known.add(o.material);
  }
  assert(kinds.has('stone')&&kinds.has('wood-y'),id+' did not retain stone and wood identities');
  w.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();});
 }
});

test('colored blocks and bare cylinders sharing a source keep separate cached surface variants',()=>{
 const source=new T.MeshStandardMaterial({color:0x76614c,roughness:.8,emissiveIntensity:0}),group=new T.Group();
 const add=geometry=>{const mesh=new T.Mesh(geometry,source);group.add(mesh);return mesh;};
 const bare=add(new T.CylinderGeometry(.2,.3,2,8)),repeat=add(new T.CylinderGeometry(.3,.4,3,8)),block=add(new T.BoxGeometry(.4,2,.4));
 const colored=add(new T.CylinderGeometry(.2,.3,2,8));colored.geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(colored.geometry.attributes.position.count*3).fill(.9),3));
 polishEnvironmentModels({group,obstacles:[]});
 assert.equal(bare.material.vertexColors,false);assert.equal(block.material.vertexColors,true);assert.equal(colored.material.vertexColors,true);
 assert.strictEqual(bare.material,repeat.material);assert.strictEqual(block.material,colored.material);assert.notStrictEqual(bare.material,block.material);
 assert.notEqual(bare.material.customProgramCacheKey(),block.material.customProgramCacheKey());
 for(const mesh of[bare,repeat,block,colored])assert(mesh.material.color.equals(source.color));
 assert.equal(source.vertexColors,false);assert.equal(source.roughness,.8);
 const assigned=group.children.map(o=>o.material);polishEnvironmentModels({group,obstacles:[]});assert.deepEqual(group.children.map(o=>o.material),assigned);
});

test('eroded stone silhouettes stay inside their authored bounds and reuse geometry without altering source meshes',()=>{
 const group=new T.Group(),material=new T.MeshStandardMaterial({color:0xa49173,emissiveIntensity:0}),box=new T.BoxGeometry(1,1,1),column=new T.CylinderGeometry(.4,.6,2,10);
 const add=geometry=>{const mesh=new T.Mesh(geometry,material);group.add(mesh);return mesh;};
 const blocks=[add(box),add(box)],columns=[add(column),add(column)],source=Array.from(column.attributes.position.array);
 polishEnvironmentModels({group,obstacles:[]});
 assert.strictEqual(blocks[0].geometry,blocks[1].geometry);assert.strictEqual(columns[0].geometry,columns[1].geometry);
 assert.notStrictEqual(columns[0].geometry,column);assert.deepEqual(Array.from(column.attributes.position.array),source);
 for(const mesh of[blocks[0],columns[0]]){
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,isBlock=mesh===blocks[0],top=[];
  for(let i=0;i<p.count;i++){
   assert(Math.abs(p.getX(i))<=(isBlock?.5:.600001));assert(Math.abs(p.getZ(i))<=(isBlock?.5:.600001));assert(Math.abs(p.getY(i))<=(isBlock?.5:1));
   assert(Number.isFinite(n.getX(i))&&Number.isFinite(n.getY(i))&&Number.isFinite(n.getZ(i)));
   if(p.getY(i)>(isBlock?.3:.9))top.push(p.getY(i));
  }
  assert(Math.max(...top)-Math.min(...top)>.025,'stone crown remained perfectly level');
 }
 const geometries=group.children.map(o=>o.geometry);polishEnvironmentModels({group,obstacles:[]});assert.deepEqual(group.children.map(o=>o.geometry),geometries);
});
