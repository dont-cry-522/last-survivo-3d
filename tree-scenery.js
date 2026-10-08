import * as T from './vendor/three.module.js';
import{mergeGeometries}from'./vendor/BufferGeometryUtils.js';

// Six shared templates keep each tree independently removable without per-tree GPU assets.
const templates=new Map(),material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
function tint(geometry,color,canopy=false){
 const p=geometry.attributes.position,n=geometry.attributes.normal,c=new T.Color(color),colors=[];
 for(let i=0;i<p.count;i++){const light=canopy?Math.max(0,n.getY(i)) : 0,shade=(canopy?.77+light*.25:.92)+.04*Math.sin(p.getX(i)*2.3+p.getY(i)*1.7+p.getZ(i)*1.3);colors.push(c.r*shade*(1+light*.045),c.g*shade,c.b*shade*(1-light*.06));}
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.deleteAttribute('uv');return geometry;
}
function merge(parts){const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;}
function surface(vertices,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;}
function limb(points,radii,sides=7){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),up=new T.Vector3(0,1,0),q=new T.Quaternion(),v=new T.Vector3(),vertices=[],indices=[];
 for(let i=0;i<radii.length;i++){
  const t=i/(radii.length-1),center=curve.getPoint(t);q.setFromUnitVectors(up,curve.getTangent(t));
  for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,r=radii[i]*(1+.045*Math.cos(a*3+i*.4));v.set(Math.cos(a)*r,0,Math.sin(a)*r).applyQuaternion(q).add(center);vertices.push(v.x,v.y,v.z);}
 }
 for(let i=0;i<radii.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;indices.push(a,a+sides,b,b,a+sides,b+sides);}
 for(const end of[0,radii.length-1]){const p=curve.getPoint(end/(radii.length-1)),center=vertices.length/3;vertices.push(p.x,p.y,p.z);for(let j=0;j<sides;j++){const a=end*sides+j,b=end*sides+(j+1)%sides;indices.push(...(end?[center,b,a]:[center,a,b]));}}
 return surface(vertices,indices);
}
function broadCrown(variant){
 // One connected crown, with unequal lobes and visible recesses between branch fans.
 const rings=[[0,0],[.15,.82],[.39,1.34],[.70,1.54],[1.05,1.57],[1.40,1.37],[1.77,.92],[2.03,.43],[2.13,0]],sides=24,vertices=[],indices=[];
 for(let k=0;k<rings.length;k++)for(let j=0;j<sides;j++){
  const [y,r]=rings[k],a=j/sides*Math.PI*2,phase=variant*.67,edge=Math.sin(a*3+phase),notch=Math.max(0,Math.cos(a*5-phase)),fold=.065*edge+.10*Math.sin(a*5+phase+y*3.2)+.045*Math.sin(a*9-y*2.6);
  const radius=r*(1+fold-(1-y/2.13)*notch*.12),dx=(variant-1)*.095*y+Math.sin(y*1.9+phase)*.06,dz=Math.sin(y*1.2+phase)*.075;
  const crest=(.16*Math.sin(a*4+phase)+.11*Math.sin(a*7-y*2.6))*Math.sin(y/2.13*Math.PI);
  vertices.push((Math.cos(a)*radius+dx)*1.06,y+(r?crest:0),(Math.sin(a)*radius*(.95+variant*.012)+dz)*1.06);
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<sides;j++){const a=k*sides+j,b=k*sides+(j+1)%sides;indices.push(a,a+sides,b,b,a+sides,b+sides);}
 const g=surface(vertices,indices),p=g.attributes.position,n=g.attributes.normal,colors=[],shade=new T.Color(),low=new T.Color(0x34553d),middle=new T.Color(0x486b44),top=new T.Color(0x617e50);
 for(let i=0;i<p.count;i++){
  const height=p.getY(i)/2.13,azimuth=Math.atan2(p.getZ(i),p.getX(i)),fan=.5+.5*Math.sin(azimuth*5+variant*.67+p.getY(i)*3.2),sun=Math.max(0,n.getY(i));
  const valley=(1-fan)**2,leaf=.5+.5*Math.sin(p.getX(i)*4.5+p.getY(i)*3.1)*Math.cos(p.getZ(i)*4-p.getY(i)*1.7+variant);
  shade.copy(low).lerp(middle,T.MathUtils.smoothstep(height,0,.55)).lerp(top,T.MathUtils.smoothstep(height,.55,1)).multiplyScalar(.82+sun*.14+leaf*.09-valley*.17);
  colors.push(shade.r,shade.g,shade.b);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
}
function firFan(angle,height,reach,width,variant){
 const points=[[0,0,0],[.25,.015,-.78],[.64,-.035,-1],[1,-.18,-.06],[.66,-.075,.76],[.28,-.015,1],[0,.005,.12],[.44,.15,.01],[.40,-.12,0]],vertices=[];
 for(const [r,h,side]of points){const x=r*reach,z=side*width;vertices.push(Math.cos(angle)*x-Math.sin(angle)*z,height+h*reach,Math.sin(angle)*x+Math.cos(angle)*z);}
 const indices=[];for(let i=0;i<7;i++){indices.push(7,(i+1)%7,i,8,i,(i+1)%7);}
 const g=surface(vertices,indices),colors=[],c=new T.Color();
 for(let i=0;i<points.length;i++){
  // Snow collects on the upper ridge; blue needles remain visible on the low edges.
  c.setHex(i===7?0xd5e0d8:i===8?0x395e60:i===0||i===6?0x5b8381:i===3?0x789b95:((i+variant)%3?0xbacdc4:0x6f9890));colors.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;
}
function treeTemplate(id,variant){
 const key=id+variant;if(templates.has(key))return templates.get(key);const snow=id==='snow',wood=snow?0x687675:0x665b43;
 const trunkHeight=5,lean=(variant-1)*.10,branches=[tint(limb([[0,0,0],[.04,.40,0],[lean,1.65,.035],[lean*.6,3.35,-.045],[lean+.06,5,.025]],snow?[.35,.25,.18,.10,.035]:[.45,.29,.23,.15,.04],8),wood)];
 for(let i=0;i<3;i++){
  const a=i*2.15+variant*.71,cos=Math.cos(a),sin=Math.sin(a),start=snow?2.8+i*.42:2.0+i*.43,reach=snow?.62:1.12,tip=snow?start+.65:3.65+i*.28;
  branches.push(tint(limb([[lean*.7,start,0],[cos*reach*.32,start+.36,sin*reach*.28],[cos*reach*.74,tip-.19,sin*reach*.72],[cos*reach,tip,sin*reach]],snow?[.09,.06,.025]:[.17,.13,.075,.018],snow?5:6),wood));
 }
 const crowns=[];
 if(snow){
  for(let layer=0;layer<4;layer++)for(let j=0;j<4;j++){
   const a=j*Math.PI*.5+layer*.75+variant*.57,reach=(1.42-layer*.23)*(1+Math.sin(j*2.2+variant)*.09);
   crowns.push(firFan(a,.33+layer*.57,reach,.39-layer*.057,(j+variant)%3));
  }
  const leader=new T.LatheGeometry([[0,0],[.31,.08],[.22,.34],[.05,.65],[0,.74]].map(([r,h])=>new T.Vector2(r,h)),7);leader.translate(lean*.25,2.02,.025);crowns.push(tint(leader,0xb7cdc1,true));
 }else crowns.push(broadCrown(variant));
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
