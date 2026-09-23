import * as T from './vendor/three.module.js';
import{MAPS,seeded}from'./rules.js';
const geo=new Map(),materials=new Map(),terrainMaterials=new Map();
function geometry(kind,args){const key=kind+args.join(',');if(!geo.has(key))geo.set(key,new T[kind](...args));return geo.get(key);}
export function mat(color,glow=false){const key=color+':'+glow;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:glow?.35:.86,metalness:glow?.25:.08,emissive:glow?color:0,emissiveIntensity:glow?.9:0,flatShading:true}));return materials.get(key);}
export function mesh(kind,args,color,x=0,y=0,z=0,parent=null,glow=false){const dims=args.slice();let radial=1,vertical=1;if(kind==='CylinderGeometry'){vertical=dims[2];dims[2]=1;}if(['CircleGeometry','DodecahedronGeometry'].includes(kind)){radial=dims[0];dims[0]=1;}const m=new T.Mesh(geometry(kind,dims),mat(color,glow));m.scale.set(radial,kind==='CylinderGeometry'?vertical:radial,radial);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent?.add(m);return m;}
const box=(p,c,x,y,z,w,h,d)=>mesh('BoxGeometry',[w,h,d],c,x,y,z,p);
const orb=(p,c,x,y,z,r,glow=false)=>mesh('SphereGeometry',[r,10,7],c,x,y,z,p,glow);
const cone=(p,c,x,y,z,r,h)=>mesh('ConeGeometry',[r,h,7],c,x,y,z,p);
export function actor(kind='silver',weapon='pistol'){
 const g=new T.Group(),rig=new T.Group();g.add(rig);g.userData.rig=rig;
 if(['silver','scout'].includes(kind)){
  const silver=kind==='silver',coat=silver?0x24333d:0x4c6650,hair=silver?0xebeee4:0x714b31;
  const torso=new T.Group();torso.position.y=1.05;rig.add(torso);g.userData.torso=torso;
  mesh('CylinderGeometry',[.24,.31,.65,8],coat,0,.3,0,torso);box(torso,0x94754e,0,.05,.02,.53,.1,.35);
  orb(torso,0xddb392,0,.92,0,.25);orb(torso,hair,0,1.05,-.05,.27);
  for(let i=0;i<5;i++){const h=cone(torso,hair,(i-2)*.085,1.01,.18,.075,.3);h.rotation.z=(i-2)*.2;}
  if(silver){box(torso,0x1b2930,0,.86,.22,.39,.15,.09);const pony=mesh('CapsuleGeometry',[.11,.44,3,6],hair,0,.73,-.3,torso);pony.rotation.x=-.25;g.userData.pony=pony;}
  for(const side of [-1,1]){orb(torso,0xb4e6d3,side*.09,.99,.237,.023,true);const leg=new T.Group();leg.position.set(side*.15,1,0);rig.add(leg);mesh('CylinderGeometry',[.105,.085,.63,6],0x273332,0,-.31,0,leg);box(leg,0x182c2c,0,-.68,.06,.22,.2,.35);g.userData[side<0?'leftLeg':'rightLeg']=leg;const arm=new T.Group();arm.position.set(side*.31,.55,0);torso.add(arm);mesh('CapsuleGeometry',[.095,.35,3,6],coat,0,-.22,.03,arm);orb(arm,0xd5ac8b,0,-.48,.05,.09);g.userData[side<0?'leftArm':'rightArm']=arm;}
  const cape=mesh('ConeGeometry',[.43,.82,4,1,true],silver?0x364f5b:0x73865c,0,.2,-.22,torso);cape.rotation.y=Math.PI/4;g.userData.cape=cape;
  const gun=new T.Group();g.userData.rightArm.add(gun);gun.position.set(0,-.43,.1);g.userData.weapon=gun;
  if(['fire','dark'].includes(weapon)){mesh('CylinderGeometry',[.035,.045,1.3,6],0x9a7958,0,.2,.04,gun);const crown=mesh('TorusGeometry',[.19,.04,5,10],weapon==='fire'?0xdca952:0x8274a8,0,.91,.04,gun);orb(gun,weapon==='fire'?0xffa04c:0xb59aff,0,.91,.04,.125,true);}
  else if(weapon==='shuriken'){for(let i=0;i<4;i++){const blade=box(gun,0xb9ddd6,0,0,.1,.09,.04,.65);blade.rotation.y=i*Math.PI/4;}orb(gun,0x80d5cd,0,0,.1,.1,true);}
  else{box(gun,0x263d40,0,.06,.26,.12,.17,weapon==='pistol'?.36:.65);const barrel=mesh('CylinderGeometry',[.045,.045,weapon==='pistol'?.25:.5,8],0xb2b59c,0,.07,.56,gun);barrel.rotation.x=Math.PI/2;box(gun,0x96754b,0,-.08,.18,.09,.23,.12);if(weapon==='shotgun')box(gun,0x859590,.075,.07,.48,.06,.07,.45);}
 }else if(kind==='mushroom'){
  mesh('CylinderGeometry',[.23,.35,.72,7],0xb7a483,0,.45,0,rig);const cap=orb(rig,0xb95e43,0,1.05,0,.66);cap.scale.y=.6;for(let i=0;i<5;i++)orb(rig,0xf2dcad,Math.cos(i*2.4)*.37,1.25,Math.sin(i*2.4)*.35,.09);for(const s of [-1,1])orb(rig,0xffdc88,s*.13,.7,.27,.04,true);
 }else if(kind==='wolf'){
  const body=mesh('CapsuleGeometry',[.29,.62,3,7],0x68758c,0,.65,0,rig);body.rotation.x=Math.PI/2;orb(rig,0x8897ab,0,.82,.5,.31);cone(rig,0x718293,-.17,1.14,.43,.13,.35);cone(rig,0x718293,.17,1.14,.43,.13,.35);box(rig,0x42556b,0,.72,.77,.23,.19,.28);for(const s of [-1,1])orb(rig,0xffd775,s*.15,.88,.71,.04,true);for(const x of [-.22,.22])for(const z of [-.28,.28])mesh('CylinderGeometry',[.08,.065,.5,5],0x536076,x,.25,z,rig);
 }else if(kind==='golem'||kind==='boss'){
  const c=kind==='boss'?0x536575:0x68735e;mesh('DodecahedronGeometry',[.72,0],c,0,1,0,rig);mesh('DodecahedronGeometry',[.4,0],0x8c9779,0,1.82,0,rig);for(const s of [-1,1]){mesh('DodecahedronGeometry',[.4,0],c,s*.75,1,0,rig);box(rig,c,s*.3,.28,0,.4,.6,.5);cone(rig,0xc6b58c,s*.58,1.8,0,.18,.65);}orb(rig,kind==='boss'?0xffa66b:0x94e4bd,0,1.15,.64,.16,true);for(const s of [-1,1])box(rig,0xffd591,s*.14,1.85,.32,.14,.055,.06);if(kind==='boss'){g.scale.setScalar(2.3);const halo=mesh('TorusGeometry',[.64,.06,5,10],0xe2ad72,0,2.18,0,rig,true);halo.rotation.x=Math.PI/2;}
 }else{
  const c=kind==='spitter'?0x83618e:0x417b71;cone(rig,c,0,.65,0,.48,1.2);orb(rig,0xb3bb9e,0,1.26,0,.25);cone(rig,kind==='spitter'?0xa98aae:0x4a9680,0,1.61,0,.4,.65);for(const s of [-1,1])orb(rig,0xffda9b,s*.11,1.28,.22,.034,true);mesh('CylinderGeometry',[.035,.04,1.5,5],0x897256,.48,.76,.1,rig);orb(rig,kind==='spitter'?0xe19be9:0x8be7b1,.48,1.58,.1,.16,true);
 }
 return g;
}
export function animateActor(g,t,speed=0,attack=0,hurt=0){const d=g.userData,step=Math.sin(t*11),run=Math.min(1,speed/5);d.rig.position.y=Math.abs(step)*.08*run;d.rig.rotation.z=Math.sin(t*5.5)*.04*run;if(d.leftLeg){d.leftLeg.rotation.x=step*.65*run;d.rightLeg.rotation.x=-step*.65*run;d.leftArm.rotation.x=-step*.45*run;d.rightArm.rotation.x=attack>0?-1.1:-.28+step*.2*run;d.cape.rotation.x=.15+run*.4+Math.sin(t*6)*.06;d.torso.rotation.x=run*.09;if(d.pony)d.pony.rotation.x=-.25+step*.12*run;}g.visible=!(hurt>0&&Math.floor(hurt*28)%2===0);}
export function buildWorld(id,seed=1){const theme=MAPS[id],rnd=seeded(seed),group=new T.Group(),obstacles=[],patches=[],sites=[{x:28,z:-27,type:'altar',claimed:false},{x:-29,z:24,type:'supply',claimed:false}],spawn={x:-12,z:9};
 const ground=mesh('PlaneGeometry',[140,140],theme.ground,0,-.03,0,group);ground.rotation.x=-Math.PI/2;
 if(!terrainMaterials.has(id)){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#'+theme.ground.toString(16).padStart(6,'0');c.fillRect(0,0,256,256);const noise=seeded(582);for(let i=0;i<2200;i++){c.globalAlpha=.06+noise()*.12;c.fillStyle=i%2?'#c9d8ad':'#0c2924';c.fillRect(noise()*256,noise()*256,1+noise()*5,1+noise()*3);}const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(18,18);texture.colorSpace=T.SRGBColorSpace;terrainMaterials.set(id,new T.MeshStandardMaterial({map:texture,roughness:1}));}ground.material=terrainMaterials.get(id);

 // Soft irregular paths and terrain islands give the forest a readable floor.
 for(let i=0;i<34;i++){const f=(i%17)/16,site=sites[Math.floor(i/17)],x=spawn.x+(site.x-spawn.x)*f+Math.sin(f*Math.PI)*4,z=spawn.z+(site.z-spawn.z)*f;const p=mesh('CircleGeometry',[3.2+rnd()*1.2,9],id==='snow'?0xc5d8d8:id==='ash'?0x9a7054:0x607451,x,.012,z,group);p.rotation.x=-Math.PI/2;}
 for(let i=0;i<15;i++){const x=(rnd()-.5)*106,z=(rnd()-.5)*106,r=2+rnd()*3;if(Math.hypot(x-spawn.x,z-spawn.z)<9)continue;patches.push({x,z,r});const p=mesh('CircleGeometry',[r,10],id==='snow'?0xd3e4e8:id==='ash'?0xb45134:0x355253,x,.02,z,group);p.rotation.x=-Math.PI/2;if(id==='ash'){const seam=mesh('TorusGeometry',[1,.04,3,12],0xff8644,x,.045,z,group,true);seam.rotation.x=Math.PI/2;seam.scale.setScalar(r*.6);}}
 for(let i=0;i<170;i++){const x=(rnd()-.5)*118,z=(rnd()-.5)*118;if(Math.hypot(x-spawn.x,z-spawn.z)<7||Math.hypot(x,z)<7||sites.some(s=>Math.hypot(x-s.x,z-s.z)<7)||Math.abs(x-z)<3||Math.abs(x+z)<3)continue;const tall=2.5+rnd()*3.5,tree=new T.Group();tree.position.set(x,0,z);group.add(tree);obstacles.push({x,z,r:.65,mesh:tree});
  if(id==='ash'){const stone=mesh('DodecahedronGeometry',[1.2,0],0x66565c,0,tall*.38,0,tree);stone.scale.multiply(new T.Vector3(.7,tall*.55,.8));cone(tree,0xeaa169,0,tall*.8,0,.24,.85);}
  else{mesh('CylinderGeometry',[.18,.45,tall,6],id==='snow'?0x68767a:0x695c40,0,tall/2,0,tree);for(let j=0;j<3;j++){const leaf=mesh(id==='snow'?'ConeGeometry':'DodecahedronGeometry',id==='snow'?[1.5-j*.28,2.2,7]:[1.65-j*.16,0],id==='snow'?(j===2?0xd9e9e6:0x739b9c):[theme.leaf,0x367d5c,0x599063][j],id==='snow'?0:Math.sin(j*2.4)*.7,tall-1+j*.75,id==='snow'?0:Math.cos(j*2.4)*.6,tree);leaf.rotation.y=rnd();if(id!=='snow')leaf.scale.y*=.65;}for(let j=0;j<3;j++){const branch=mesh('CylinderGeometry',[.07,.13,1.4,4],0x71694b,Math.cos(j*2.1)*.5,tall*.55,Math.sin(j*2.1)*.5,tree);branch.rotation.z=.9;}}
 }
 const grassGeo=geometry('ConeGeometry',[.1,.45,3]),grass=new T.InstancedMesh(grassGeo,mat(id==='snow'?0xe0e9db:id==='ash'?0x977566:0x85a06a),700),dummy=new T.Object3D();for(let i=0;i<700;i++){dummy.position.set((rnd()-.5)*125,.15,(rnd()-.5)*125);dummy.scale.setScalar(.6+rnd());dummy.rotation.y=rnd()*6;dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}group.add(grass);
 for(let i=0;i<65;i++){const x=(rnd()-.5)*124,z=(rnd()-.5)*124;const rock=mesh('DodecahedronGeometry',[.3+rnd()*.5,0],id==='snow'?0xbad0ce:0x8b9376,x,.2,z,group);rock.scale.y*=.6;}
 for(const site of sites){const g=new T.Group();g.position.set(site.x,0,site.z);group.add(g);site.mesh=g;const base=mesh('CylinderGeometry',[2,2.3,.25,8],0x68796b,0,.12,0,g);if(site.type==='altar'){for(const side of [-1,1])box(g,0x8d9b88,side*1.3,1.1,0,.42,2.2,.5);box(g,0xabb398,0,2.35,0,3.2,.4,.7);const crystal=mesh('OctahedronGeometry',[.65],theme.accent,0,1.1,0,g,true);site.crystal=crystal;}else{box(g,0x99724c,0,.62,0,1.4,.8,.9);box(g,0xd6b571,0,1.04,0,1.5,.18,1);box(g,0xebd595,0,.72,.48,.18,.45,.07);}const ring=mesh('TorusGeometry',[2.6,.055,4,36],theme.accent,0,.2,0,g,true);ring.rotation.x=Math.PI/2;site.ring=ring;}
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const stone=mesh('BoxGeometry',[1.1,2.8,.85],0x819586,Math.cos(a)*6.5,1.4,Math.sin(a)*6.5,group);stone.rotation.y=-a;}
 const fire=orb(group,0xffcc77,spawn.x,.9,spawn.z,.17,true);const light=new T.PointLight(0xffc386,9,9,2);light.position.set(spawn.x,1.8,spawn.z);group.add(light);for(let i=0;i<6;i++){const a=i*Math.PI/3;const log=mesh('CylinderGeometry',[.11,.15,1.1,5],0x70553d,spawn.x+Math.cos(a)*.3,.15,spawn.z+Math.sin(a)*.3,group);log.rotation.z=Math.PI/2;log.rotation.y=a;}
 const motes=[];for(let i=0;i<18;i++){const m=orb(group,theme.accent,spawn.x+(rnd()-.5)*20,1+rnd()*3,spawn.z+(rnd()-.5)*20,.035,true);motes.push(m);}
 return{group,obstacles,patches,sites,spawn,theme,fire,light,motes};
}
export function clearAt(world,x,z,r=.45){return Math.abs(x)<62-r&&Math.abs(z)<62-r&&!world.obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<r+o.r);}
export function moveActor(world,p,dx,dz,r=.45){let x=p.x+dx,z=p.z+dz;if(clearAt(world,x,z,r)){p.x=x;p.z=z;return;}if(clearAt(world,x,p.z,r))p.x=x;if(clearAt(world,p.x,z,r))p.z=z;}
