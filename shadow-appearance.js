import * as T from './vendor/three.module.js';
import {smoothSeams} from './hero-finish.js?v=111';

// Reuse the Ranger's authored cloth, UVs and skinning; each template owns its tints.
export function shadowOutfit(root){
 root.traverse(o=>{
  if(/Pauldron/.test(o.name))o.visible=false;
  if(/Head_Hood/.test(o.name))o.visible=true;
  if(!o.isMesh)return;
  const tintMaterial=source=>{
   const m=source.clone();
   if(!source.name.includes('Ranger'))return m;
   const leather=/Belt|Bracer|Feet/.test(o.name),color=/Feet/.test(o.name)?0x29343e:/Belt|Bracer/.test(o.name)?0x35424e:/Legs/.test(o.name)?0x3b4e63:/Arms/.test(o.name)?0x496179:/Head_Hood/.test(o.name)?0x52687d:0x516b82;
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
const claspMaterial=new T.MeshStandardMaterial({color:0x9da8b0,roughness:.70,metalness:.32});
let scarfGeometry,claspGeometry;

function shortScarf(){
 if(scarfGeometry)return scarfGeometry;
 const positions=[],colors=[],indices=[],slices=40,rows=10;
 const cloth=new T.Color(0x6b8295),edge=new T.Color(0x9aafbd);
 for(let j=0;j<=rows;j++)for(let i=0;i<=slices;i++){
  const v=j/rows,start=.50-v*.90,a=start+i/slices*(Math.PI*2-.85-start),s=Math.sin(a),c=Math.cos(a),left=Math.max(0,s),right=Math.max(0,-s),front=Math.max(0,c),spread=Math.sin(v*Math.PI/2);
  // +X is the wearer's left: wrap that shoulder, then let the open front fall diagonally.
  const wave=Math.cos(a*5+v*7),fold=Math.sin(v*Math.PI)*wave*.009;
  const x=s*(.085+(.070+.145*left)*spread+fold);
  const worn=(.006+.005*Math.sin(a*9))*Math.pow(v,9);
  const drop=Math.pow(v,1+left*(1-front));
  const y=1.557-drop*(.075+.115*left-.035*right+.185*front)+Math.sin(a*5+v*4)*.005*v+worn;
  const z=-.035+c*(.090+.094*spread+fold)+front*(.012+.016*spread+.022*Math.sin(v*Math.PI));
  positions.push(x,y,z);
  const hem=j===rows&&((i>=2&&i<=3)||(i>=12&&i<=13))?.18:0;
  const color=cloth.clone().lerp(edge,hem).multiplyScalar(.90+.10*wave);
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
  const upper=new T.Shape();upper.moveTo(-.013,.017);upper.lineTo(-.007,.020);upper.lineTo(.009,.004);upper.lineTo(.003,-.001);upper.closePath();
  const lower=new T.Shape();lower.moveTo(.007,-.006);lower.lineTo(.013,-.003);lower.lineTo(.016,-.012);lower.lineTo(.002,-.021);lower.lineTo(-.002,-.016);lower.lineTo(.009,-.011);lower.closePath();
  claspGeometry=new T.ExtrudeGeometry([upper,lower],{depth:.004,bevelEnabled:true,bevelThickness:.001,bevelSize:.001,bevelSegments:1,curveSegments:1});
 }
 const clasp=new T.Mesh(claspGeometry,claspMaterial);clasp.name='Shadow_broken_clasp';
 clasp.position.set(.085,1.478,.114);clasp.rotation.set(-.68,.17,.30);chest.add(clasp);
 chest.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 // Coordinates are the source model's rest space; attachAtRest handles the chest bone.
 return{chest};
}
