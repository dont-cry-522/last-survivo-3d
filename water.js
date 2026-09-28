import * as T from './vendor/three.module.js';
const clamp=T.MathUtils.clamp;
const shore=a=>1+.07*Math.sin(a*3)+.045*Math.cos(a*5);
export function waterDepth(p,x,z){
 const dx=x-p.x,dz=z-p.z;if(Math.abs(dx)>(p.r||Math.max(p.rx,p.rz)*1.12)||Math.abs(dz)>(p.r||Math.max(p.rx,p.rz)*1.12))return 0;const c=Math.cos(p.angle||0),s=Math.sin(p.angle||0),u=(c*dx-s*dz)/p.rx,v=(s*dx+c*dz)/p.rz;
 return clamp((1-Math.hypot(u,v)/shore(Math.atan2(v,u)))/.48,0,1);
}
export function terrainAt(world,x,z,kind='hero'){
 let depth=0;for(const p of world.patches)if(p.kind==='water')depth=Math.max(depth,waterDepth(p,x,z));
 const floating=['snowtotem','cinderwisp'].includes(kind),heavy=['golem','yeti','lavabrute','boss','frostking','cinderlord'].includes(kind);
 if(depth>0)return{kind:'water',depth,floating,speed:floating?1:1-depth*(heavy?.24:.52)};
 const slow=world.patches.some(p=>p.kind==='slow'&&Math.hypot(p.x-x,p.z-z)<p.r);return{kind:slow?'slow':'land',depth:0,floating,speed:slow?kind==='hero'?.72:.75:1};
}
let surfaceGeometry;const reedGeometry=new T.ConeGeometry(1,1,3),stoneGeometry=new T.DodecahedronGeometry(1,0),surfaces=new Map();
function waterSurface(id){
 if(!surfaceGeometry){
  const points=[],colors=[],indices=[],n=48,rings=[0,.52,.82,1];
  for(const r of rings)for(let i=0;i<n;i++){const a=i/n*Math.PI*2,k=shore(a)*r;points.push(Math.cos(a)*k,0,Math.sin(a)*k);const tint=new T.Color().setRGB(.36+r*.36,.65+r*.24,.68+r*.23);colors.push(tint.r,tint.g,tint.b);}
  for(let ring=0;ring<rings.length-1;ring++)for(let i=0;i<n;i++){const a=ring*n+i,b=ring*n+(i+1)%n,c=a+n,d=b+n;indices.push(a,b,c,b,d,c);}
  surfaceGeometry=new T.BufferGeometry();surfaceGeometry.setAttribute('position',new T.Float32BufferAttribute(points,3));surfaceGeometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));surfaceGeometry.setIndex(indices);surfaceGeometry.computeVertexNormals();
 }
 if(!surfaces.has(id)){
  const clock={value:0},material=new T.MeshStandardMaterial({color:id==='snow'?0x71bdcf:0x398f91,vertexColors:true,roughness:.85,metalness:0,side:T.DoubleSide,transparent:true,depthWrite:false});
  material.onBeforeCompile=shader=>{shader.uniforms.waterTime=clock;shader.vertexShader='varying vec3 waterWorld; varying vec2 waterLocal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nwaterWorld=(modelMatrix*vec4(position,1.0)).xyz;waterLocal=position.xz;');shader.fragmentShader='uniform float waterTime; varying vec3 waterWorld; varying vec2 waterLocal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float angle=atan(waterLocal.y,waterLocal.x);
    float radial=length(waterLocal)/(1.0+.07*sin(angle*3.0)+.045*cos(angle*5.0));
    float edge=smoothstep(.48,.98,radial);
    float wave=sin(waterWorld.x*1.4+waterWorld.z*4.8+sin(waterWorld.x*1.9-waterTime*.6)*.8-waterTime*.8);
    float light=pow(max(0.0,wave),22.0)*.012*smoothstep(.15,.85,sin(waterWorld.x*.8+waterWorld.z*.3+waterTime*.2))*(1.0-edge*.8);
    diffuseColor.rgb=mix(vec3(${id==='snow'?'.010,.035,.055':'.006,.030,.033'}),vec3(${id==='snow'?'.065,.105,.115':'.022,.060,.039'}),edge)+vec3(.45,.7,.64)*light;
    diffuseColor.a*=1.0-smoothstep(.84,1.0,radial);
`);};
  material.customProgramCacheKey=()=> 'pond-'+id;
  const bank=new T.MeshBasicMaterial({color:id==='snow'?0x677d80:0x263c2f,transparent:true,opacity:.4,depthWrite:false});
  bank.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 bankLocal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbankLocal=position.xz;');shader.fragmentShader='varying vec2 bankLocal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float a=atan(bankLocal.y,bankLocal.x);float r=length(bankLocal)/(1.0+.07*sin(a*3.0)+.045*cos(a*5.0));diffuseColor.a*=1.0-smoothstep(.78,1.0,r);`);};
  const reeds=new T.MeshStandardMaterial({color:id==='snow'?0x849d97:0x637950,roughness:1}),stones=new T.MeshStandardMaterial({color:id==='snow'?0x9aaeb0:0x6c7a68,roughness:1});
  surfaces.set(id,{material,bank,reeds,stones,clock});
 }
 return surfaces.get(id);
}
export function buildPonds(group,id,rnd,spawn,sites){
 if(id==='ash')return[];const ponds=[],surface=waterSurface(id);
 for(let i=0;i<180&&ponds.length<4;i++){
  const a=rnd()*Math.PI*2,d=18+rnd()*8,rx=4.7+rnd()*2.2,rz=3.7+rnd()*1.6;
  const x=ponds.length? (rnd()-.5)*96:spawn.x+Math.sin(a)*d,z=ponds.length?(rnd()-.5)*96:spawn.z+Math.cos(a)*d,r=Math.max(rx,rz)*1.12;
  if(Math.hypot(x-spawn.x,z-spawn.z)<r+6||Math.hypot(x,z)<r+9||sites.some(s=>Math.hypot(x-s.x,z-s.z)<r+8)||ponds.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.r+4))continue;
  const p={kind:'water',x,z,rx,rz,r,angle:rnd()*Math.PI*2},bank=new T.Mesh(surfaceGeometry,surface.bank);bank.position.set(x,.045,z);bank.rotation.y=p.angle;bank.scale.set(rx*1.12,1,rz*1.12);bank.receiveShadow=true;group.add(bank);const m=new T.Mesh(surfaceGeometry,surface.material);m.position.set(x,.075,z);m.rotation.y=p.angle;m.scale.set(rx,1,rz);m.receiveShadow=true;group.add(m);p.mesh=m;ponds.push(p);
 }
 const reeds=new T.InstancedMesh(reedGeometry,surface.reeds,ponds.length*24),stones=new T.InstancedMesh(stoneGeometry,surface.stones,ponds.length*6),dummy=new T.Object3D();let ri=0,si=0;
 for(const pond of ponds){const c=Math.cos(pond.angle),s=Math.sin(pond.angle),at=(a,r)=>{const k=shore(a)*r,lx=Math.cos(a)*pond.rx*k,lz=Math.sin(a)*pond.rz*k;return{x:pond.x+c*lx+s*lz,z:pond.z-s*lx+c*lz};};
  for(let i=0;i<8;i++){const a=rnd()*Math.PI*2,point=at(a,1.015+rnd()*.05);for(let j=0;j<3;j++){const h=.3+rnd()*.6;dummy.position.set(point.x+(rnd()-.5)*.3,h*.5,point.z+(rnd()-.5)*.3);dummy.rotation.set((rnd()-.5)*.4,rnd()*6,(rnd()-.5)*.4);dummy.scale.set(.035+rnd()*.025,h,.035);dummy.updateMatrix();reeds.setMatrixAt(ri++,dummy.matrix);}}
  for(let i=0;i<6;i++){const point=at(rnd()*Math.PI*2,1.06),r=.16+rnd()*.3;dummy.position.set(point.x,r*.25,point.z);dummy.rotation.set(rnd()*.3,rnd()*6,rnd()*.3);dummy.scale.set(r,.15+rnd()*.12,r*.8);dummy.updateMatrix();stones.setMatrixAt(si++,dummy.matrix);}
 }
 reeds.instanceMatrix.needsUpdate=true;stones.instanceMatrix.needsUpdate=true;reeds.receiveShadow=stones.receiveShadow=true;group.add(reeds,stones);
 return ponds;
}
export function animateWater(id,t){if(surfaces.has(id))surfaces.get(id).clock.value=t;}

// Restore the unmodified pose before the next mixer update, so paddling never accumulates.
export function restoreWaterPose(g){for(const p of g.userData.waterPose||[]){p.node.quaternion.copy(p.q);p.node.position.copy(p.p);}g.userData.waterPose=[];}
export function animateWaterPose(g,t,speed){
 const d=g.userData,dt=d.waterTime===undefined?1/60:clamp(t-d.waterTime,0,.05);d.waterTime=t;
 d.waterBlend=(d.waterBlend||0)+((d.waterDepth||0)-(d.waterBlend||0))*(1-Math.exp(-dt*10));
 const depth=d.waterBlend;if(depth<.001||d.waterFloating||!d.rig)return;
 const save=node=>{if(node&&!d.waterPose.some(p=>p.node===node))d.waterPose.push({node,q:node.quaternion.clone(),p:node.position.clone()});};
 const hero=d.skinned||d.wraith||d.leftKnee,heavy=d.kind==='golem'||d.kind==='boss',swim=T.MathUtils.smoothstep(depth,.42,.85),moving=clamp(speed/2.6,0,1),phase=t*(d.waterDash?7:3.7),stroke=Math.sin(phase),aim=d.aimActive||d.shoot>0?1:0;
 save(d.rig);d.rig.position.y-=depth*(hero?.38:heavy?.22:.24);d.rig.position.y+=Math.sin(phase*2)*.026*depth;
 if(hero){
  d.rig.rotation.x+=swim*(.55*moving+.08)*(1-aim*.8);d.rig.rotation.z+=stroke*.045*swim*(1-aim);
  const limbs=d.skinned?[[d.offArm,1],[d.aimArm,-1]]:[[d.leftArm,1],[d.rightArm,-1]];
  for(const [arm,side]of limbs)if(arm){save(arm);arm.rotateX((-.65+stroke*side*.55)*swim*(1-aim));arm.rotateZ(side*(.40+.16*Math.cos(phase))*swim*(1-aim));}
  for(const [leg,side]of (d.skinned?[[d.swimLeftLeg,1],[d.swimRightLeg,-1]]:[[d.leftLeg,1],[d.rightLeg,-1]]))if(leg){save(leg);leg.rotateX(stroke*side*.22*swim);}
  if(d.cape){save(d.cape);d.cape.rotateX(-.18*swim+stroke*.025*depth);}
 }else if(!heavy){d.rig.rotation.x+=swim*.10*moving;for(const l of d.legs||[]){save(l.joint);l.joint.rotateX(Math.sin(phase+l.phase)*.25*swim);}}
}
