import * as T from './vendor/three.module.js';
const slabGeometry=new T.BoxGeometry(1,1,1),slabMaterials={sand:new T.MeshStandardMaterial({color:0xb3a184,roughness:1}),coast:new T.MeshStandardMaterial({color:0x697f76,roughness:1})};
// Districts leave a broad open center; solid pieces have matching collision footprints.
export function districtLayout(id,spawn){return id==='sand'?[{x:spawn.x+12,z:spawn.z+1,kind:'gate'},{x:-34,z:-31,kind:'court'},{x:34,z:29,kind:'court'},{x:42,z:-33,kind:'court'},{x:-35,z:36,kind:'court'},{x:12,z:57,kind:'court'}]:id==='coast'?[{x:-16,z:-9,kind:'warehouse'},{x:24,z:29,kind:'warehouse'},{x:-16,z:42,kind:'wreck'}]:[];}
export function buildDistricts(world,id,layouts,mesh,rnd){
 const {group,obstacles,sites}=world;world.districts=[];
 const stone=id==='sand'?0xa49173:0x718c89,edge=id==='sand'?0xd2bc94:0xa2b0a1,wood=0x76614c;
 const tileMatrices=[];const dummy=new T.Object3D();
 for(const l of layouts){if(sites.some(s=>Math.hypot(s.x-l.x,s.z-l.z)<13))continue;world.districts.push(l);
  const place=(x,z,build,r=.7)=>{x+=l.x;z+=l.z;if(Math.hypot(x-world.spawn.x,z-world.spawn.z)<5||sites.some(s=>Math.hypot(x-s.x,z-s.z)<8)||world.bridges?.some(b=>Math.abs(x-b.x)<b.width/2+r+1&&Math.abs(z-b.z)<b.length/2+r+1))return;
   const g=new T.Group();g.position.set(x,0,z);group.add(g);build(g);obstacles.push({x,z,r,mesh:g});};
  const box=(g,c,x,y,z,w,h,d)=>{const m=mesh('BoxGeometry',[1,1,1],c,x,y,z,g);m.scale.set(w,h,d);return m;};
  const pier=(g,h=2.5)=>{mesh('CylinderGeometry',[.45,.6,h,10],stone,0,h/2,0,g);box(g,edge,0,.18,0,1.35,.35,1.35);box(g,edge,0,h+.1,0,1.16,.22,1.16);};
  if(id==='sand'){
   // Asymmetric ruined gateway, a broken lintel and two open courtyard wings.
   for(const side of[-1,1])place(side*3.6,0,g=>{pier(g,side<0?3.4:2.8);if(side<0){const top=box(g,edge,.7,3.55,0,2.4,.42,1.15);top.rotation.z=-.08;}},.82);
   for(const side of[-1,1])for(let i=0;i<4;i++)place(side*(4.7+i*1.05),i>1?-2:0,g=>{const h=.65+rnd()*1.25;box(g,stone,0,h/2,0,.94,h,.85);box(g,edge,0,h+.07,0,1.04,.15,.95);},.62);
   for(let i=0;i<7;i++)place(-5+rnd()*10,4+rnd()*2,g=>{const rock=mesh('DodecahedronGeometry',[.45,0],stone,0,.25,0,g);rock.scale.set(1.5,.7,1);},.42);
  }else if(l.kind==='warehouse'){
   // Open-front storehouse: weathered uprights, pitched roof strips, cargo below.
   for(const side of[-1,1])place(side*2.5,0,g=>{box(g,wood,0,1.65,0,.28,3.3,.28);box(g,stone,0,.25,0,.7,.5,.7);const roof=box(g,0x566f70,side*-1.1,3.12,0,2.65,.16,3.9);roof.rotation.z=side*.22;},.42);
   for(const side of[-1,1])place(side*2.5,1.4,g=>{for(let row=0;row<4;row++)box(g,row%2?0x806e54:wood,0,.25+row*.31,0,.13,.26,1.65);},.55);
   for(let i=0;i<3;i++)place(-2+i*2,2.1,g=>{box(g,wood,0,.48,0,1.25,.96,1.1);for(const y of[.18,.72])box(g,0xb0a17d,0,y,.565,1.3,.1,.055);},.82);
   for(const side of[-1,1])place(side*3.6,-2,g=>{pier(g,.75);mesh('TorusGeometry',[.26,.04,5,12],0x9f987f,0,.96,0,g).rotation.x=Math.PI/2;},.55);
  }else{
   for(let i=0;i<6;i++)place((i-2.5)*1.1,Math.sin(i*.65)*.8,g=>{const rib=box(g,wood,0,.65,0,.22,1.4,1.7);rib.rotation.z=(i-2.5)*.12;box(g,0x998267,0,.15,0,.9,.18,1.8);},.65);
   place(0,1.7,g=>{const mast=mesh('CylinderGeometry',[.09,.16,3.7,8],wood,0,1.3,0,g);mast.rotation.z=.5;},.4);
  }
  // Worn slabs form a readable apron, not another visual circle.
  for(let x=-4;x<=4;x+=1.4)for(let z=-4;z<=3;z+=1.4){if(rnd()<.22)continue;dummy.position.set(l.x+x,.015,l.z+z);dummy.rotation.set(0,(rnd()-.5)*.12,0);dummy.scale.set(1.2,.06,1.2);dummy.updateMatrix();tileMatrices.push(dummy.matrix.clone());}
 }
 if(id==='coast')for(const p of world.ponds)for(const side of[-1,1])for(let i=-4;i<=4;i++){
  const z=p.z+i*2.2,x=p.x+side*(p.rx*.97+Math.sin(i*.5)*.6);
  if(world.bridges.some(b=>Math.abs(z-b.z)<2.7)||Math.abs(z)>76||rnd()<.28)continue;
  dummy.position.set(x+(rnd()-.5)*.45,.04+rnd()*.04,z+(rnd()-.5)*.5);dummy.rotation.set((rnd()-.5)*.05,side*.07+(rnd()-.5)*.28,0);dummy.scale.set(1.1+rnd()*.45,.12,1.1+rnd()*.65);dummy.updateMatrix();tileMatrices.push(dummy.matrix.clone());
 }
 const tiles=new T.InstancedMesh(slabGeometry,slabMaterials[id],tileMatrices.length);tileMatrices.forEach((m,i)=>tiles.setMatrixAt(i,m));tiles.receiveShadow=true;group.add(tiles);
}
