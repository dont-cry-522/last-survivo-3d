import * as T from './vendor/three.module.js';
import{finishRock,installGroundSurface}from'./biome-scenery.js?v=98';

// Shared rounded edges catch side light without adding meshes or changing collision footprints.
const block=new T.BoxGeometry(1,1,1,3,3,3),p=block.attributes.position,colors=[],v=new T.Vector3(),core=new T.Vector3();
for(let i=0;i<p.count;i++){
 v.fromBufferAttribute(p,i);core.copy(v).clampScalar(-.455,.455);v.sub(core).normalize().multiplyScalar(.045).add(core);p.setXYZ(i,v.x,v.y,v.z);
 const wear=.95+.035*Math.sin(v.x*12+v.y*7-v.z*9);colors.push(wear,wear,wear);
}
block.setAttribute('color',new T.Float32BufferAttribute(colors,3));block.computeVertexNormals();
const materials=new Map();
export function polishEnvironmentModels(world){
 if(world.regions)installGroundSurface(world.ground,'confluence');
 world.group.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||!o.material?.isMeshStandardMaterial||o.material.emissiveIntensity>0||o.userData.environmentFinish)return;
  if(o.geometry.type==='BoxGeometry'){
   const size=o.geometry.parameters,source=o.material;
   if(!materials.has(source)){const m=source.clone();m.flatShading=false;m.vertexColors=true;m.roughness=.91;materials.set(source,m);}
   o.geometry=block;o.scale.multiply(new T.Vector3(size.width,size.height,size.depth));o.material=materials.get(source);o.userData.environmentFinish=true;
  }
 });
 // Only obstacle stones, never relic crystals or enemy models, receive the worn rock silhouette.
 for(const obstacle of world.obstacles)obstacle.mesh.traverse(o=>{
  if(o.isMesh&&o.geometry.type==='DodecahedronGeometry'&&o.material?.emissiveIntensity===0)finishRock(o);
 });
}
