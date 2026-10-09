import * as T from './vendor/three.module.js';
import{finishRock,installGroundSurface}from'./biome-scenery.js?v=102';

// Shared rounded edges catch side light without adding meshes or changing collision footprints.
const block=new T.BoxGeometry(1,1,1,3,3,3),p=block.attributes.position,colors=[],v=new T.Vector3(),core=new T.Vector3();
for(let i=0;i<p.count;i++){
 v.fromBufferAttribute(p,i);core.copy(v).clampScalar(-.455,.455);v.sub(core).normalize().multiplyScalar(.045).add(core);p.setXYZ(i,v.x,v.y,v.z);
 const wear=.95+.035*Math.sin(v.x*12+v.y*7-v.z*9);colors.push(wear,wear,wear);
}
block.setAttribute('color',new T.Float32BufferAttribute(colors,3));block.computeVertexNormals();
const materials=new Map();
// Explicit scene palettes keep bronze, cloth, crystals and gameplay cues out of
// the wood/stone finish. Original biome colors remain the base of every surface.
const woodTones=new Set([0x624c3d,0x68503c,0x76614c,0x99724c,0xd6b571,0x806e54,0x998267,0x887454,0x766c55,0x76624e,0x9e8b70,0x746b57,0x8a7a60]);
const stoneTones=new Set([0x68796b,0x8d9b88,0xabb398,0x9fada3,0x708c97,0x718c89,0xa2b0a1,0xa49173,0xd2bc94,0xb5a183,0xc6b798,0xa6977c,0xc2b89b,0xbcb092,0x847f6b,0x9d8a6b,0xa2987b,0x796253]);
function surfaceMaterial(source,kind,axis='y',vertexColors=true){
 const key=kind==='wood'?'wood-'+axis:kind,variant=key+(vertexColors?':colored':':plain');
 if(source.userData.propSurface===key&&source.vertexColors===vertexColors)return source;
 if(!materials.has(source))materials.set(source,new Map());const cached=materials.get(source);
 if(cached.has(variant))return cached.get(variant);
 const m=source.clone();m.flatShading=false;m.vertexColors=vertexColors;m.roughness=kind==='wood'?.89:kind==='plain'?.91:.95;
 if(kind!=='plain'){
  m.metalness=0;m.userData.propSurface=key;
  const before=source.onBeforeCompile,baseKey=source.customProgramCacheKey();
  m.onBeforeCompile=(shader,renderer)=>{
   before.call(m,shader,renderer);
   shader.vertexShader='varying vec3 propPoint;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npropPoint=position;');
   shader.fragmentShader='varying vec3 propPoint;\n'+shader.fragmentShader;
   const along=axis==='x'?'x':axis==='z'?'z':'y',across=axis==='x'?'yz':axis==='z'?'xy':'xz';
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float propPixel=max(length(dFdx(propPoint)),length(dFdy(propPoint)));
    float propDetail=1.0-smoothstep(.025,.12,propPixel);
    float propPatch=.5+.25*sin(dot(propPoint,vec3(4.2,2.6,3.1)))+.25*sin(dot(propPoint,vec3(-2.5,3.4,4.8)));
    ${kind==='wood'?`vec2 propAcross=propPoint.${across};
     float propGrain=.5+.5*sin(propAcross.x*39.0+propAcross.y*17.0+sin(propPoint.${along}*3.0+propAcross.y*9.0)*.7);
     diffuseColor.rgb*=.94+propPatch*.07-(1.0-propGrain)*(1.0-propGrain)*.12*propDetail;`
    :`float propDamp=1.0-smoothstep(-.5,.3,propPoint.y);
     diffuseColor.rgb*=.92+propPatch*.14-propDamp*.035;`}
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(propPatch-.5)*.06,.76,1.0);`);
  };
  m.customProgramCacheKey=()=>baseKey+'|prop-surface-'+variant;
 }
 cached.set(variant,m);return m;
}
export function polishEnvironmentModels(world){
 if(world.regions)installGroundSurface(world.ground,'confluence');
 world.group.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||!o.material?.isMeshStandardMaterial||o.material.emissiveIntensity>0||o.userData.environmentFinish)return;
  const kind=woodTones.has(o.material.color.getHex())?'wood':stoneTones.has(o.material.color.getHex())?'stone':'plain';
  if(o.geometry.type==='BoxGeometry'){
   const size=o.geometry.parameters,source=o.material;
   o.geometry=block;o.scale.multiply(new T.Vector3(size.width,size.height,size.depth));
   const dims=o.scale,axis=dims.x>dims.y&&dims.x>dims.z?'x':dims.z>dims.y?'z':'y';
   o.material=surfaceMaterial(source,kind,axis);o.userData.environmentFinish=true;
  }else if(o.geometry.type==='CylinderGeometry'&&kind!=='plain'){
   // Bare cylinders have no color attribute; enabling it reads black in the shader.
   o.material=surfaceMaterial(o.material,kind,'y',!!o.geometry.attributes.color);o.userData.environmentFinish=true;
  }
 });
 // Only obstacle stones, never relic crystals or enemy models, receive the worn rock silhouette.
 for(const obstacle of world.obstacles)obstacle.mesh.traverse(o=>{
  if(o.isMesh&&o.geometry.type==='DodecahedronGeometry'&&o.material?.emissiveIntensity===0){finishRock(o);o.material=surfaceMaterial(o.material,'stone');}
 });
}
