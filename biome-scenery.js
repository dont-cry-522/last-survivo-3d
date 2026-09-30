import * as T from './vendor/three.module.js';
import{MAP_HALF}from'./map-layout.js?v=85';
// Shared geometry and instanced details: decoration stays low, leaving combat and collision legible.
const geometries={stone:new T.DodecahedronGeometry(1,1),snow:new T.SphereGeometry(1,12,6),chip:new T.DodecahedronGeometry(1,0),wood:new T.CylinderGeometry(.10,.15,1,7),leaf:null,ice:new T.ConeGeometry(1,1,5),frond:null},materials=new Map();
function leafGeometry(){const pos=[],idx=[];for(let i=0;i<=5;i++){const t=i/5,w=Math.sin(Math.PI*t)*.14;pos.push(-w,t*.48,t*t*.7,w,t*.48,t*t*.7);if(i<5){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}geometries.leaf=leafGeometry();
function frondGeometry(){const p=[],ix=[];for(let i=0;i<7;i++){const t=.10+i*.12,y=t*.48,z=t*t*.7,w=Math.sin(Math.PI*t)*.23;for(const side of[-1,1]){const n=p.length/3;p.push(0,y-.025,z-.015,side*w,y+.025,z+.045,side*w*.35,y+.065,z+.10);ix.push(n,n+1,n+2);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;}geometries.frond=frondGeometry();
function material(kind){if(!materials.has(kind)){
 const m=new T.MeshStandardMaterial({color:0xffffff,roughness:1,side:['leaf','frond'].includes(kind)?T.DoubleSide:T.FrontSide});
 if(['leaf','frond','ice'].includes(kind)){
  const clock={value:0},gust={value:1},focus={value:new T.Vector2()};m.userData.motion={clock,gust,focus};
  m.onBeforeCompile=s=>{Object.assign(s.uniforms,{sceneryTime:clock,sceneryGust:gust,sceneryFocus:focus});
   s.vertexShader='uniform float sceneryTime; uniform float sceneryGust; uniform vec2 sceneryFocus; varying vec3 sceneryWorld;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 sceneryPoint=vec4(position,1.0);
    #ifdef USE_INSTANCING
     sceneryPoint=instanceMatrix*sceneryPoint;
    #endif
    sceneryWorld=(modelMatrix*sceneryPoint).xyz;
    ${kind==='ice'?'':`float rooted=pow(clamp(position.y/.5,0.0,1.0),2.0);float wind=sin(sceneryTime*1.6+sceneryWorld.x*.63+sceneryWorld.z*.44)*.055*sceneryGust;vec2 away=sceneryWorld.xz-sceneryFocus;float brush=1.0-smoothstep(.25,1.25,length(away));vec3 bend=vec3(normalize(away+vec2(.001)).x,0.0,normalize(away+vec2(.001)).y);
    #ifdef USE_INSTANCING
     mat3 plant=mat3(modelMatrix*instanceMatrix);bend=vec3(dot(bend,normalize(plant[0])),dot(bend,normalize(plant[1])),dot(bend,normalize(plant[2])));
    #endif
    transformed.xz+=(vec2(wind,wind*.4)+bend.xz*.11*brush)*rooted;`}
   `);
   if(kind==='ice'){s.fragmentShader='uniform float sceneryTime; varying vec3 sceneryWorld;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat glint=pow(max(0.0,sin(sceneryTime*.65+sceneryWorld.x*.7+sceneryWorld.z*.3)),18.0);diffuseColor.rgb+=vec3(.045,.065,.075)*glint;');}
  };m.customProgramCacheKey=()=> 'scenery-motion-'+kind;
 }
 materials.set(kind,m);
}return materials.get(kind);}
export function animateScenery(w,t,x,z){for(const m of w.scenery?.batches||[]){const p=m.material.userData.motion;if(!p)continue;p.clock.value=t;p.gust.value=1+(!w.regions||w.activeBiome==='sand'?(w.sandstorm?.strength||0)*1.8:0)+((!w.regions||w.activeBiome==='coast')&&w.tide?.high?.3:0);p.focus.value.set(x,z);}}
export function groveCenters(spawn,rnd){return Array.from({length:22},(_,i)=>i<4?{x:spawn.x+Math.sin(i*1.9+.4)*16,z:spawn.z+Math.cos(i*1.9+.4)*16}:{x:(rnd()-.5)*144,z:(rnd()-.5)*144});}
export function sceneryAllowed(w,x,z){return (!w.contains||w.contains(x,z))&&Math.abs(x)<(w.half||MAP_HALF)-2&&Math.abs(z)<(w.half||MAP_HALF)-2&&Math.hypot(x-w.spawn.x,z-w.spawn.z)>3.5&&!w.sites.some(s=>Math.hypot(x-s.x,z-s.z)<4.8)&&!w.bridges?.some(b=>Math.abs(x-b.x)<b.width/2+.6&&Math.abs(z-b.z)<b.length/2+.8)&&!w.patches.some(p=>p.kind==='vent'&&Math.hypot(x-p.x,z-p.z)<p.r+1)&&!w.ponds.some(p=>{const a=p.angle||0,dx=x-p.x,dz=z-p.z;return Math.hypot((Math.cos(a)*dx-Math.sin(a)*dz)/p.rx,(Math.sin(a)*dx+Math.cos(a)*dz)/p.rz)<1.11;});}
function groundColors(w,id){
 const ground=w.ground,g=new T.PlaneGeometry((MAP_HALF+8)*2,(MAP_HALF+8)*2,72,72),p=g.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i),n=Math.sin(x*.087+Math.sin(z*.05)*2)*Math.cos(z*.065-x*.025),fine=Math.sin(x*.31+z*.13)*.025;let r=1+n*.08+fine,b=r,c=r;
  if(id==='forest'){let under=0;for(const g of w.groves)under=Math.max(under,Math.max(0,1-Math.hypot(x-g.x,z-g.z)/9));r*=1-under*.13;c*=1-under*.08;b*=1-under*.17;const moss=(1+n)*.5;r*=.83+moss*.12;c*=.91+moss*.08;b*=.81+moss*.13;}
  if(id==='snow'){r*=.93+n*.035;c*=.98;b*=1.04;}
  if(id==='ash'){r*=.82;c*=.84;b*=.88;}
  if(id==='sand'){const ridge=Math.sin(z*.85+Math.sin(x*.055)*3+x*.22)*.035;r+=ridge;c+=ridge;b+=ridge*.7;}
  for(const pond of w.ponds){const a=pond.angle||0,dx=x-pond.x,dz=z-pond.z,d=Math.hypot((Math.cos(a)*dx-Math.sin(a)*dz)/pond.rx,(Math.sin(a)*dx+Math.cos(a)*dz)/pond.rz),shore=Math.max(0,1-Math.abs(d-1.08)/.32);if(shore){r*=1-shore*(id==='coast'?.27:.12);c*=1-shore*.13;b*=1-shore*.08;}}
  colors.push(r,c,b);
 }g.setAttribute('color',new T.Float32BufferAttribute(colors,3));ground.geometry=g;ground.userData.ownedGeometry=true;ground.material.vertexColors=true;ground.material.needsUpdate=true;
}
export function installScenery(w,id,rnd){
 if(!w.regional)groundColors(w,id);const batches=new Map(),dummy=new T.Object3D(),records=[];
 const add=(kind,color,x,y,z,sx,sy,sz,angle=0,tilt=0)=>{dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,angle,0);dummy.rotateX(tilt);dummy.updateMatrix();const key=w.regional?kind+':'+Math.floor(x/32)+','+Math.floor(z/32):kind;if(!batches.has(key))batches.set(key,[]);batches.get(key).push({matrix:dummy.matrix.clone(),color:new T.Color(color)});};
 const palette={forest:[0x48754a,0x6b914f,0x315c3d],snow:[0xd8e6e5,0xa6c3cb,0x7d9ea9],ash:[0x3e393a,0x584948,0x71584a],sand:[0x9b895d,0xb6a275,0x857654],coast:[0x647e64,0x8eab7e,0x49685c]}[id];
 // Most plants grow around existing trees/rocks or along the banks; open areas stay sparse.
 for(let i=0;i<235;i++){
  const o=w.obstacles.length?w.obstacles[Math.floor(rnd()*w.obstacles.length)]:w.spawn,a=rnd()*Math.PI*2,r=1.1+rnd()*3;let x=o.x+Math.sin(a)*r,z=o.z+Math.cos(a)*r;
  if(id==='coast'&&i%2===0&&w.ponds.length){const p=w.ponds[Math.floor(rnd()*w.ponds.length)],angle=rnd()*Math.PI*2;x=p.x+Math.sin(angle)*p.rx*1.2;z=p.z+Math.cos(angle)*p.rz*1.2;}
  if(i%5===0){x=w.regional?w.spawn.x+(rnd()-.5)*110:(rnd()-.5)*156;z=w.regional?w.spawn.z+(rnd()-.5)*110:(rnd()-.5)*156;}if(!sceneryAllowed(w,x,z))continue;
  const scale=.7+rnd()*.7;records.push({x,z,kind:id});
  if(id==='forest'||id==='coast'||id==='sand'){
   for(let j=0;j<(id==='sand'?4:7);j++){const turn=a+j*2.4,h=scale*(.65+rnd()*.55),color=palette[j%3];add(id==='forest'?'frond':'leaf',color,x+(rnd()-.5)*.3,.015,z+(rnd()-.5)*.3,id==='sand'?.22:h,id==='coast'?h*1.3:h,id==='sand'?h*.75:h,turn);}
   if(id==='forest'&&i%2===0){add('wood',0x60553b,x,.10,z,1,.8+rnd(),1,a,Math.PI/2);for(let j=0;j<9;j++)add('chip',j%2?0x927348:0x76613e,x+(rnd()-.5)*2.5,.027,z+(rnd()-.5)*2.5,.16,.025,.09,rnd()*6);}
   if(id==='coast'&&i%3===0){add('wood',0x9b957a,x,.09,z,.75,1.4,.75,a,Math.PI/2);for(let j=0;j<3;j++)add('snow',0xc4bda1,x+(rnd()-.5),.03,z+(rnd()-.5),.10,.035,.08);}
  }else if(id==='snow'){
   add('snow',0xc7dce0,x,.015,z,scale*1.3,.18,scale*.7,a);if(i%4===0)for(let j=0;j<3;j++)add('ice',0x7fabbf,x+j*.16,.12+j*.035,z,.10,.24+j*.07,.12,a+j*.3,.15);for(let j=0;j<3;j++)add('stone',palette[2],x+(rnd()-.5)*1.4,.065,z+(rnd()-.5),.22,.10,.35,a);
  }else{
   for(let j=0;j<5;j++)add('chip',palette[j%3],x+(rnd()-.5)*1.9,.05,z+(rnd()-.5)*1.2,.12+rnd()*.25,.09,.14+rnd()*.25,a);
   if(i%4===0)add('wood',0x302d2e,x,.08,z,.7,1.3,.7,a,Math.PI/2);
  }
 }
 // Tie the foot of each obstacle to the terrain instead of leaving a bare cylinder on a flat plane.
 for(const o of w.obstacles){if(!sceneryAllowed(w,o.x,o.z))continue;const a=rnd()*6;
  if(id==='snow')add('snow',0xd5e5e7,o.x,.04,o.z,1.15,.24,.85,a);
  else if(id==='forest'){for(let j=0;j<3;j++)add('wood',0x686047,o.x+Math.sin(a+j*2)*.43,.10,o.z+Math.cos(a+j*2)*.43,.7,.85,.7,a+j*2,Math.PI/2);}
  else for(let j=0;j<3;j++)add('stone',id==='ash'?0x463e40:id==='sand'?0xa89773:0x7d918a,o.x+Math.sin(a+j*2)*.65,.06,o.z+Math.cos(a+j*2)*.65,.3,.12,.4,a+j);
 }
 w.scenery={records,batches:[]};for(const[key,parts]of batches){const kind=key.split(':')[0],m=new T.InstancedMesh(geometries[kind],material(kind),parts.length);parts.forEach((p,i)=>{m.setMatrixAt(i,p.matrix);m.setColorAt(i,p.color);});m.receiveShadow=true;m.castShadow=false;m.userData.biomeDetail=kind;w.group.add(m);w.scenery.batches.push(m);}
}
