import test from'node:test';
import assert from'node:assert/strict';
import * as T from'../vendor/three.module.js';
import{EnvironmentLighting,CLIMATE_LIGHT,installDistantLandscape}from'../environment-lighting.js';
import{polishEnvironmentModels}from'../environment-props.js';
import{buildWorld,clearAt}from'../world.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){}})})};

test('climate transitions reuse lights and interpolate physical colors without flashes',()=>{
 const scene=new T.Scene(),renderer={toneMappingExposure:1},hemi=new T.HemisphereLight(),sun=new T.DirectionalLight(),rim=new T.DirectionalLight();
 scene.fog=new T.FogExp2();scene.background=new T.Color();scene.add(hemi,sun,rim);const lighting=new EnvironmentLighting(scene,renderer,hemi,sun,rim);
 for(const id of Object.keys(CLIMATE_LIGHT)){lighting.update(id);assert.equal(scene.fog.color.getHex(),CLIMATE_LIGHT[id].fog);assert.equal(renderer.toneMappingExposure,CLIMATE_LIGHT[id].exposure);}
 lighting.update('forest');const before=scene.fog.color.clone();lighting.update('snow',null,1/60);assert(!before.equals(scene.fog.color));assert.notEqual(scene.fog.color.getHex(),CLIMATE_LIGHT.snow.fog);
 lighting.update('confluence',{forest:.5,snow:.5});assert(Math.abs(scene.fog.density-(CLIMATE_LIGHT.forest.density+CLIMATE_LIGHT.snow.density)/2)<1e-9);assert.equal(scene.children.length,3);
});
test('distant scenery stays beyond map bounds and scenery finish preserves playable layouts',()=>{
 for(const id of ['forest','snow','ash','sand','coast','confluence']){
  const w=buildWorld(id,7),snapshot=JSON.stringify(w.obstacles.map(o=>[o.x,o.z,o.r])),draws=[];
  w.group.traverse(o=>{if(o.isMesh)draws.push(o);});polishEnvironmentModels(w);
  const after=[];w.group.traverse(o=>{if(o.isMesh)after.push(o);});assert.equal(after.length,draws.length);assert.equal(JSON.stringify(w.obstacles.map(o=>[o.x,o.z,o.r])),snapshot);assert(clearAt(w,w.spawn.x,w.spawn.z,1));
  const ridge=installDistantLandscape(w,id,()=> 'forest'),position=ridge.geometry.attributes.position;
  assert.equal(ridge.geometry.index.count/3,1152);assert(!ridge.material.transparent&&!ridge.castShadow&&ridge.userData.ownedGeometry);
  for(let i=0;i<position.count;i++){assert(Math.max(Math.abs(position.getX(i)),Math.abs(position.getZ(i)))>w.half+4);assert(Number.isFinite(position.getY(i)));}
  const scales=after.map(o=>o.scale.toArray());polishEnvironmentModels(w);assert.deepEqual(after.map(o=>o.scale.toArray()),scales,'second finish changed scale');
  w.group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();});
 }
});
