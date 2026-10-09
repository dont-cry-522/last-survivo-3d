import * as T from './vendor/three.module.js';
import {shadowCrescentGeometry,shadowCrescentEdge} from './shadow-weapons.js?v=109';

const geometry=new Map(),materials=new Map();
function part(parent,key,create,color,position=[0,0,0],scale=[1,1,1],glow=false){
 if(!geometry.has(key))geometry.set(key,create());
 const mk=color+':'+glow;if(!materials.has(mk))materials.set(mk,glow?new T.MeshBasicMaterial({color,toneMapped:false}):new T.MeshStandardMaterial({color,roughness:.76,metalness:.12}));
 const m=new T.Mesh(geometry.get(key),materials.get(mk));m.position.set(...position);m.scale.set(...scale);m.castShadow=!glow;m.receiveShadow=true;parent.add(m);return m;
}
function line(parent,color,points,radius=.006,glow=false){
 return part(parent,'line:'+radius+JSON.stringify(points),()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,radius,6,false),color,undefined,undefined,glow);
}
export function shadowFocus(id){
 const g=new T.Group();g.name='shadow-focus-'+id;
 if(id==='shadowblade'){
  line(g,0x303343,[[-.10,-.035,.02],[.09,-.035,.02],[.14,-.015,.02]],.018);
  part(g,'crescent',()=>shadowCrescentGeometry,0x3b4054,[0,-.01,.11]).rotation.x=Math.PI/2;
  line(g,0x829dac,shadowCrescentEdge.map(p=>[p.x,.008,.11+p.y]),.005,true);
 }else if(id==='grimoire'){
  for(const sign of [-1,1]){
   const leaf=new T.Group();leaf.rotation.z=sign*.18;leaf.position.set(0,.075,.06);g.add(leaf);
   part(leaf,'box',()=>new T.BoxGeometry(1,1,1),0x221e30,[sign*.115,0,0],[.23,.028,.29]);
   part(leaf,'box',()=>new T.BoxGeometry(1,1,1),0x858797,[sign*.11,.022,0],[.21,.018,.26]);
   for(const z of [-.07,0,.07])line(leaf,0x769cab,[[sign*.035,.036,z],[sign*.10,.039,z+.012],[sign*.185,.036,z]],.003,true);
  }
  g.userData.page=part(g,'box',()=>new T.BoxGeometry(1,1,1),0x9594a5,[.095,.12,.06],[.18,.004,.25]);
 }else{
  g.userData.focus=part(g,'sphere',()=>new T.SphereGeometry(1,16,12),0x181727,[0,.09,.12],[.052,.052,.052]);
  for(const side of [-1,0,1])line(g,0x8195b0,[[side*.07,.06,.065],[side*.09,.12,.14],[side*.04,.08,.23]],.004,true);
 }
 return g;
}
