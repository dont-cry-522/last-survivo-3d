import * as T from './vendor/three.module.js';
import{mergeGeometries}from'./vendor/BufferGeometryUtils.js';

// Six shared templates keep each tree independently removable without per-tree GPU assets.
const templates=new Map(),material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
const up=new T.Vector3(0,1,0);
function tint(geometry,color){
 const p=geometry.attributes.position,c=new T.Color(color),colors=[];
 for(let i=0;i<p.count;i++){const shade=.94+.06*Math.sin(p.getX(i)*2.3+p.getY(i)*1.7);colors.push(c.r*shade,c.g*shade,c.b*shade);}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));return geometry;
}
function merge(parts){const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;}
function treeTemplate(id,variant){
 const key=id+variant;if(templates.has(key))return templates.get(key);const snow=id==='snow',wood=snow?0x687675:0x665b43;
 const trunkHeight=snow?1:5,stem=tint(snow?new T.CylinderGeometry(.12,.34,1,8,1).translate(0,.5,0):new T.LatheGeometry([[.46,0],[.35,.22],[.28,1.4],[.18,3],[.08,5]].map(([x,y])=>new T.Vector2(x,y)),9),wood),p=stem.attributes.position;
 for(let i=0;i<p.count;i++){const h=p.getY(i)/trunkHeight;p.setX(i,p.getX(i)+Math.sin(h*1.8)*(.035+variant*.015));}stem.computeVertexNormals();
 const branches=[stem];for(let i=0;i<3;i++){
  const a=i*2.1+variant*.7,reach=snow?.63:1.05,from=new T.Vector3(0,snow?.58+i*.07:2.0+i*.4,0),to=new T.Vector3(Math.cos(a)*reach,snow?.83+i*.045:3.8+i*.3,Math.sin(a)*reach),direction=to.clone().sub(from);
  const branch=new T.CylinderGeometry(snow?.035:.055,snow?.105:.18,direction.length(),snow?5:6);branch.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,direction.clone().normalize()));branch.translate(...from.add(to).multiplyScalar(.5).toArray());branches.push(tint(branch,wood));
 }
 const crowns=[],palette=snow?[0x5f8384,0x92aca8,0xcfdbd5]:[0x315b42,0x3e694a,0x3d6445,0x4a7250,0x557b53];
 for(let i=0;i<(snow?3:5);i++){
  let crown;
  if(snow){
   const radius=1.34-i*.19,height=1.9-i*.2;
   crown=new T.LatheGeometry([[0,0],[radius,.13],[radius*.64,height*.48],[0,height]].map(([x,y])=>new T.Vector2(x,y)),10);
   crown.rotateY(variant*.37+i*.23);crown.translate(Math.sin(variant+i)*.055,i*.65,Math.cos(variant+i)*.04);
  }else{
   crown=new T.SphereGeometry(1,10,6);const vertices=crown.attributes.position,phase=i*1.7+variant*.8;
   for(let j=0;j<vertices.count;j++){const x=vertices.getX(j),y=vertices.getY(j),z=vertices.getZ(j),r=1+.095*Math.sin(x*6+phase)*Math.cos(z*5-phase)+.035*Math.sin(y*8+z*3);vertices.setXYZ(j,x*r,y*r,z*r);}
   const [x,y,z,sx,sy,sz]=[[-.65,.92,.10,1.10,.67,1.04],[.65,1.08,.15,1.16,.73,1.04],[-.1,1.23,-.68,1.12,.78,1.07],[-.12,1.32,.73,1.10,.80,1.01],[.08,1.80,-.12,1.15,.75,1.10]][i];
   crown.scale(sx,sy,sz);crown.rotateY(variant*.47+i*.31);crown.translate(x+(variant-1)*.05,y,z);crown.computeVertexNormals();
  }
  crowns.push(tint(crown,palette[i]));
 }
 const canopy=merge(crowns),bottom=canopy.boundingBox.min.y;canopy.translate(0,-bottom,0);canopy.computeBoundingBox();
 const template={trunk:merge(branches),trunkHeight,canopy,canopyHeight:canopy.boundingBox.max.y};templates.set(key,template);return template;
}
export function addTree(parent,id,tall,{angle=0,variation=1,bend=0}={}){
 const variant=Math.abs(Math.floor(angle*1.7))%3,template=treeTemplate(id,variant),height=id==='snow'?5.2+tall*.52:5.6+tall*.26,canopyHeight=height*(id==='snow'?.46:.43),width=(.88+variation*.12)*(id==='snow'?1:1.18);
 parent.userData.treeBiome=id;parent.rotation.y=angle;
 const trunk=new T.Mesh(template.trunk,material);trunk.name='tree-trunk';trunk.scale.set(.94+variation*.06,(height-canopyHeight*.32)/template.trunkHeight,.94+variation*.06);trunk.rotation.z=bend*.10;
 const canopy=new T.Mesh(template.canopy,material);canopy.name='tree-canopy';canopy.userData.treeCanopy=true;canopy.position.set(bend*.5,height-canopyHeight,0);canopy.scale.set(width,canopyHeight/template.canopyHeight,width*(.94+variant*.035));
 for(const mesh of[trunk,canopy]){mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);}return canopy;
}
