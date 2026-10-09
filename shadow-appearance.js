import * as T from './vendor/three.module.js';
import {smoothSeams} from './hero-finish.js?v=108';

// Reuse the Ranger's authored cloth, UVs and skinning; each template owns its tints.
export function shadowOutfit(root){
 root.traverse(o=>{
  if(/Pauldron|Head_Hood/.test(o.name))o.visible=false;
  if(!o.isMesh)return;
  const tintMaterial=source=>{
   const m=source.clone();
   if(!source.name.includes('Ranger'))return m;
   const leather=/Belt|Bracer|Feet/.test(o.name),color=/Feet/.test(o.name)?0x2d313b:/Belt|Bracer/.test(o.name)?0x413e49:/Legs/.test(o.name)?0x343f52:/Arms/.test(o.name)?0x535c76:0x465167;
   const tint=new T.Color(color).toArray().join(',');
   m.color.set(0xffffff);m.roughness=leather?.86:.94;m.metalness=.015;
   m.roughnessMap=null;m.metalnessMap=null;m.normalScale?.setScalar(leather?.24:.18);
   m.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     float shadowWeave=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
     diffuseColor.rgb=vec3(${tint})*(.72+shadowWeave*.68);`);
   };
   m.customProgramCacheKey=()=> 'shadow-ranger-cloth-'+tint;
   return m;
  };
  o.material=Array.isArray(o.material)?o.material.map(tintMaterial):tintMaterial(o.material);
 });
}

const scarfMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.96,metalness:0,side:T.DoubleSide});
const claspMaterial=new T.MeshStandardMaterial({color:0xa4afba,roughness:.58,metalness:.42});
let scarfGeometry,claspGeometry;

function shortScarf(){
 if(scarfGeometry)return scarfGeometry;
 const positions=[],colors=[],indices=[],slices=40,rows=10;
 const cloth=new T.Color(0x515b79),edge=new T.Color(0x8796ae);
 for(let j=0;j<=rows;j++)for(let i=0;i<=slices;i++){
  const v=j/rows,a=.56+i/slices*(Math.PI*2-.94),s=Math.sin(a),c=Math.cos(a),left=Math.max(0,-s),front=Math.max(0,c),spread=Math.sin(v*Math.PI/2);
  // Open at the front, with a longer left fold; avoid a solid breastplate silhouette.
  const fold=Math.sin(v*Math.PI)*Math.cos(a*7-v*2)*.011;
  const x=s*(.085+(.122+.018*left)*spread+fold);
  const y=1.548-v*(.105+.135*left+.020*front)+Math.sin(a*5+v*4)*.008*v;
  const z=-.035+c*(.090+.090*spread+fold)+front*(.012+.016*spread);
  positions.push(x,y,z);
  const hem=T.MathUtils.smoothstep(v,.88,1)*.32+(1-T.MathUtils.smoothstep(v,0,.10))*.12;
  const color=cloth.clone().lerp(edge,hem).multiplyScalar(.94+.06*Math.cos(a*5-v*3));
  colors.push(color.r,color.g,color.b);
  if(j<rows&&i<slices){const n=j*(slices+1)+i;indices.push(n,n+slices+1,n+1,n+1,n+slices+1,n+slices+2);}
 }
 scarfGeometry=new T.BufferGeometry();
 scarfGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 scarfGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 scarfGeometry.setIndex(indices);scarfGeometry.computeVertexNormals();smoothSeams(scarfGeometry);
 return scarfGeometry;
}

export function shadowAccessories(){
 const chest=new T.Group();chest.name='Shadow_traveller_scarf';
 const scarf=new T.Mesh(shortScarf(),scarfMaterial);scarf.name='Shadow_short_scarf';chest.add(scarf);
 if(!claspGeometry){
  const moon=new T.Shape();moon.moveTo(.011,.022);
  moon.bezierCurveTo(-.031,.028,-.031,-.028,.011,-.022);
  moon.quadraticCurveTo(-.012,0,.011,.022);
  claspGeometry=new T.ExtrudeGeometry(moon,{depth:.004,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:2,curveSegments:16});
 }
 const clasp=new T.Mesh(claspGeometry,claspMaterial);clasp.name='Shadow_moon_clasp';
 clasp.position.set(-.112,1.438,.137);clasp.rotation.set(0,-.5,-.17);chest.add(clasp);
 chest.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 // Coordinates are the source model's rest space; attachAtRest handles the chest bone.
 return{chest};
}
