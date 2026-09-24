import * as T from './vendor/three.module.js';

// A small angular spirit, built entirely from shared procedural geometry and materials.
const geometry=new Map(),materials=new Map();
function part(parent,type,args,color,x,y,z,sx=1,sy=1,sz=1,glow=false){
 const key=type+args.join(',');if(!geometry.has(key))geometry.set(key,new T[type](...args));
 const mk=color+':'+glow;if(!materials.has(mk))materials.set(mk,new T.MeshStandardMaterial({color,roughness:glow?.32:.85,metalness:glow?.28:.05,emissive:glow?color:0,emissiveIntensity:glow?.72:0,flatShading:true,side:T.DoubleSide}));
 const m=new T.Mesh(geometry.get(key),materials.get(mk));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function joint(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function shard(parent,color,x,y,z,w,h,depth){const m=part(parent,'ConeGeometry',[1,1,4],color,x,y,z,w,h,depth);m.rotation.y=Math.PI/4;return m;}
export function makeWraith(weapon='shade'){
 const g=new T.Group(),rig=joint(g,0,0,0),d=g.userData;Object.assign(d,{wraith:true,kind:'wraith',weaponId:weapon,rig});
 const charcoal=0x1a2034,cloth=0x32364f,edge=0x585b85,voidColor=0x090e1d,glow=0xb395ff;
 // Broad hood and floating coat echo the angular enemies, not the two human heroes.
 part(rig,'DodecahedronGeometry',[1,0],cloth,0,.92,0,.35,.43,.28);
 shard(rig,charcoal,0,.68,0,.34,.75,.34);
 part(rig,'BoxGeometry',[1,1,1],edge,0,.83,.277,.25,.052,.035);
 const cape=joint(rig,0,1.1,-.13);d.cape=cape;
 for(const s of [-1,0,1]){const flap=shard(cape,s===0?charcoal:cloth,s*.21,-.36,-.07,.19,.86,.21);flap.rotation.z=s*.16;part(cape,'BoxGeometry',[1,1,1],edge,s*.23,-.26,.03,.018,.41,.015);}
 for(const s of [-1,1]){
  const leg=joint(rig,s*.18,.65,0);d[s<0?'leftLeg':'rightLeg']=leg;
  part(leg,'DodecahedronGeometry',[1,0],charcoal,0,-.15,0,.11,.22,.11);
  shard(leg,cloth,0,-.36,.015,.12,.31,.13);
  part(leg,'BoxGeometry',[1,1,1],edge,0,-.47,.09,.16,.085,.24);
  const arm=joint(rig,s*.35,1.12,.005);d[s<0?'leftArm':'rightArm']=arm;
  part(arm,'DodecahedronGeometry',[1,0],cloth,s*.035,-.15,0,.14,.21,.15);
  shard(arm,charcoal,s*.045,-.34,0,.115,.3,.12);
  part(arm,'DodecahedronGeometry',[1,0],edge,s*.05,-.47,.015,.075,.075,.08);
  part(rig,'OctahedronGeometry',[1,0],glow,s*.33,1.16,.01,.04,.07,.045,true);
 }
 const head=joint(rig,0,1.38,.045);d.head=head;
 part(head,'DodecahedronGeometry',[1,0],charcoal,0,.08,-.02,.33,.29,.32);
 part(head,'DodecahedronGeometry',[1,0],cloth,0,.19,-.085,.35,.25,.30);
 part(head,'DodecahedronGeometry',[1,0],voidColor,0,.055,.247,.245,.17,.032);
 for(const s of [-1,1]){
  const eye=part(head,'BoxGeometry',[1,1,1],glow,s*.105,.085,.285,.075,.027,.018,true);eye.rotation.z=s*.16;
  shard(head,edge,s*.25,.03,-.07,.095,.28,.14).rotation.z=s*.34;
 }
 // One vertical rune makes its face readable at the play camera distance.
 part(head,'BoxGeometry',[1,1,1],glow,0,-.005,.285,.019,.085,.016,true);
 shard(head,glow,0,-.078,.285,.045,.08,.022);
 const hand=d.rightArm,weaponGroup=joint(hand,.05,-.49,.06);d.weapon=weaponGroup;
 if(weapon==='shadowblade'){
  part(weaponGroup,'TorusGeometry',[.14,.025,4,8],glow,0,0,.17,.9,.9,.9,true).rotation.x=Math.PI/2;
  for(let i=0;i<4;i++){const a=i*Math.PI/2,m=shard(weaponGroup,edge,Math.sin(a)*.17,0,.17+Math.cos(a)*.17,.08,.25,.09);m.rotation.x=Math.PI/2;m.rotation.y=a;}
 }else if(weapon==='dark'){
  part(weaponGroup,'CylinderGeometry',[.035,.045,.8,5],edge,0,.25,.12);
  part(weaponGroup,'OctahedronGeometry',[.15,0],glow,0,.72,.12,1,1.3,1,true);
 }else{
  part(weaponGroup,'DodecahedronGeometry',[1,0],glow,0,.06,.18,.16,.16,.16,true);
  part(weaponGroup,'TorusGeometry',[.23,.015,4,8],edge,0,.06,.18,1,1,1,true).rotation.x=.5;
 }
 return g;
}
export function animateWraith(g,t,speed=0,attack=0,hurt=0){
 const d=g.userData,dt=d.lastTime===undefined?1/60:Math.max(0,Math.min(.05,t-d.lastTime));d.lastTime=t;
 d.move=(d.move||0)+(Math.min(1,speed/6)-(d.move||0))*(1-Math.exp(-dt*10));
 d.cast=(d.cast||0)+((attack>0?1:0)-(d.cast||0))*(1-Math.exp(-dt*16));
 d.phase=(d.phase||0)+dt*(4+speed*.9);const stride=Math.sin(d.phase)*d.move,cast=d.cast;
 d.rig.position.y=.045+Math.sin(t*3)*.038+Math.abs(stride)*.042;
 d.rig.rotation.z=Math.sin(d.phase)*.045*d.move+Math.sin(t*2)*.018;
 d.rig.rotation.x=-Math.min(1,hurt/.2)*.13+Math.sin(d.phase)*.03*d.move;
 d.leftLeg.rotation.x=stride*.48;d.rightLeg.rotation.x=-stride*.48;
 d.leftArm.rotation.x=-stride*.3-cast*.55;d.rightArm.rotation.x=stride*.3-cast*.9;
 d.leftArm.rotation.z=.2+cast*.3;d.rightArm.rotation.z=-.2-cast*.28;
 d.head.rotation.y=Math.sin(t*1.5)*.06;d.head.rotation.x=-cast*.06;
 d.cape.rotation.x=-.09-stride*.12-cast*.08;d.cape.rotation.z=Math.sin(t*2+d.phase*.2)*.05;
 d.weapon.rotation.y=Math.sin(t*4)*.1+cast*.24;
}
