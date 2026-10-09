import * as T from './vendor/three.module.js';
import {shadowCrescentGeometry,shadowCrescentEdge} from './shadow-weapons.js?v=111';

const geometry=new Map(),materials=new Map();
function part(parent,key,create,color,position=[0,0,0],scale=[1,1,1],glow=false){
 if(!geometry.has(key))geometry.set(key,create());
 const mk=color+':'+glow;if(!materials.has(mk))materials.set(mk,glow?new T.MeshBasicMaterial({color,toneMapped:false,side:T.DoubleSide}):new T.MeshStandardMaterial({color,roughness:.86,metalness:.08}));
 const m=new T.Mesh(geometry.get(key),materials.get(mk));m.position.set(...position);m.scale.set(...scale);m.castShadow=!glow;m.receiveShadow=true;parent.add(m);return m;
}
function line(parent,color,points,radius=.006,glow=false){
 return part(parent,'line:'+radius+JSON.stringify(points),()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,radius,6,false),color,undefined,undefined,glow);
}
function brokenEdge(){
 const positions=[],indices=[];
 for(const [start,end]of [[1,6],[9,14],[18,23]])for(let i=start;i<end;i++){
  const a=shadowCrescentEdge[i],b=shadowCrescentEdge[i+1],dx=b.x-a.x,dz=b.y-a.y,length=Math.hypot(dx,dz),x=-dz/length*.0025,z=dx/length*.0025,n=positions.length/3;
  positions.push(a.x-x,.010,.11+a.y-z,a.x+x,.010,.11+a.y+z,b.x-x,.010,.11+b.y-z,b.x+x,.010,.11+b.y+z);
  indices.push(n,n+1,n+2,n+2,n+1,n+3);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function riftShards(){
 const outlines=[[-.11,1.4,-.76,.57,-.52,-.45,-.17,-1.2,-.03,-.35,-.22,.18,.02,.70],[.20,1.18,.62,.51,.74,-.38,.23,-1.45,.11,-.40,.25,.20,.12,.63]];
 const shapes=outlines.map(points=>{const s=new T.Shape();s.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)s.lineTo(points[i],points[i+1]);s.closePath();return s;});
 const g=new T.ExtrudeGeometry(shapes,{depth:.25,bevelEnabled:true,bevelThickness:.05,bevelSize:.035,bevelSegments:1,steps:1,curveSegments:1});g.translate(0,0,-.125);return g;
}
export function shadowFocus(id){
 const g=new T.Group();g.name='shadow-focus-'+id;
 if(id==='shadowblade'){
  line(g,0x232c34,[[-.10,-.035,.02],[.09,-.035,.02],[.14,-.015,.02]],.018);
  part(g,'crescent',()=>shadowCrescentGeometry,0x111c25,[0,-.01,.11]).rotation.x=Math.PI/2;
  part(g,'broken-crescent-edge',brokenEdge,0xb9c4cb,undefined,undefined,true);
 }else if(id==='grimoire'){
  for(const sign of [-1,1]){
   const leaf=new T.Group();leaf.rotation.z=sign*.18;leaf.position.set(0,.075,.06);g.add(leaf);
   part(leaf,'box',()=>new T.BoxGeometry(1,1,1),0x17232d,[sign*.115,0,0],[.23,.028,.29]);
   part(leaf,'box',()=>new T.BoxGeometry(1,1,1),0x39434c,[sign*.11,.022,0],[.21,.018,.26]);
   for(const z of [-.07,0,.07])line(leaf,0xbac5cc,[[sign*.040,.036,z],[sign*.090,.038,z],[sign*.105,.038,z+.010],[sign*.148,.036,z+.010]],.0014,true);
  }
  g.userData.page=part(g,'box',()=>new T.BoxGeometry(1,1,1),0x48535b,[.095,.12,.06],[.18,.004,.25]);
 }else{
  const focus=part(g,'rift-shards',riftShards,0x101a23,[0,.09,.12],[.052,.052,.052]);g.userData.focus=focus;focus.name='Shadow_compressed_rift';
  // The existing focus scale animation compresses the dark fragments and their narrow split together.
  line(focus,0xc5ced4,[[-.005,.68,.205],[-.18,.19,.205],[-.075,-.08,.205]],.018,true);
  line(focus,0xb4c0c8,[[.105,-.43,.205],[.20,-1.18,.205]],.018,true);
 }
 return g;
}
