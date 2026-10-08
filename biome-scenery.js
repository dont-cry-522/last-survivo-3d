import * as T from './vendor/three.module.js';
import{MAP_HALF}from'./map-layout.js?v=91';
import{bridgeContains}from'./coast.js?v=91';
// Shared geometry and instanced details: decoration stays low, leaving combat and collision legible.
const geometries={stone:new T.DodecahedronGeometry(1,1),snow:new T.SphereGeometry(1,12,6),chip:new T.OctahedronGeometry(1,0),wood:new T.CylinderGeometry(.10,.15,1,7),leaf:null,ice:new T.ConeGeometry(1,1,5),frond:null},materials=new Map();
const windAngle=-.7,windX=Math.sin(windAngle),windZ=Math.cos(windAngle);
function leafGeometry(){const pos=[],idx=[];for(let i=0;i<=5;i++){const t=i/5,w=Math.sin(Math.PI*t)*.14;pos.push(-w,t*.48,t*t*.7,w,t*.48,t*t*.7);if(i<5){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}geometries.leaf=leafGeometry();
function frondGeometry(){
 const p=[],ix=[],height=t=>Math.sin(t*Math.PI*.82)*.34;
 for(let i=0;i<=5;i++){const t=i/5;p.push(-.008,height(t),t*.92,.008,height(t),t*.92);if(i<5){const n=i*2;ix.push(n,n+1,n+2,n+1,n+3,n+2);}}
 for(let i=0;i<5;i++){
  const t=.13+i*.16,y=height(t),z=t*.92,w=Math.sin(Math.PI*t)*.28;
  for(const side of[-1,1]){const n=p.length/3;p.push(0,y,z,side*w*.48,y+.025,z+.025,side*w,y-.015,z+.12,side*w*.34,y-.025,z+.09);ix.push(n,n+1,n+2,n,n+2,n+3);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
}geometries.frond=frondGeometry();
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
export function groveCenters(spawn,rnd,half=MAP_HALF){return Array.from({length:22},(_,i)=>i<4?{x:spawn.x+Math.sin(i*1.9+.4)*16,z:spawn.z+Math.cos(i*1.9+.4)*16}:{x:(rnd()-.5)*(half-10)*2,z:(rnd()-.5)*(half-10)*2});}
export function sceneryAllowed(w,x,z){return (!w.contains||w.contains(x,z))&&Math.abs(x)<(w.half||MAP_HALF)-2&&Math.abs(z)<(w.half||MAP_HALF)-2&&Math.hypot(x-w.spawn.x,z-w.spawn.z)>3.5&&!w.sites.some(s=>Math.hypot(x-s.x,z-s.z)<4.8)&&!w.bridges?.some(b=>bridgeContains(b,x,z,.9))&&!w.patches.some(p=>p.kind==='vent'&&Math.hypot(x-p.x,z-p.z)<p.r+1)&&!w.ponds.some(p=>{const a=p.angle||0,dx=x-p.x,dz=z-p.z,rx=p.baseRx===undefined?p.rx*1.11:p.baseRx*1.19+.85,rz=p.baseRz===undefined?p.rz*1.11:p.baseRz*1.19+.85;return Math.hypot((Math.cos(a)*dx-Math.sin(a)*dz)/rx,(Math.sin(a)*dx+Math.cos(a)*dz)/rz)<1;});}
function groundColors(w,id){
 const ground=w.ground,half=w.half||MAP_HALF,g=new T.PlaneGeometry((half+8)*2,(half+8)*2,72,72),p=g.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i),n=Math.sin(x*.087+Math.sin(z*.05)*2)*Math.cos(z*.065-x*.025),fine=Math.sin(x*.31+z*.13)*.025;let r=1+n*.08+fine,b=r,c=r;
  if(id==='forest'){let under=0;for(const g of w.groves)under=Math.max(under,Math.max(0,1-Math.hypot(x-g.x,z-g.z)/9));const moss=(1+n)*.5;r*=(.86+moss*.16)*(1-under*.24);c*=(.92+moss*.10)*(1-under*.12);b*=(.79+moss*.10)*(1-under*.05);}
  if(id==='snow'){const drift=Math.sin(x*.20+z*.14+Math.sin(z*.045)*2)*.025;r*=.93+n*.035+drift;c*=.98+drift;b*=1.04+drift*.3;}
  if(id==='ash'){const cooled=(1+Math.sin(x*.16-z*.11))*.5;r*=.80+cooled*.06;c*=.81+cooled*.025;b*=.86+cooled*.04;}
  if(id==='sand'){const ridge=Math.sin(z*.85+Math.sin(x*.055)*3+x*.22)*.035;r+=ridge;c+=ridge;b+=ridge*.7;}
  for(const pond of w.ponds){const a=pond.angle||0,dx=x-pond.x,dz=z-pond.z,d=Math.hypot((Math.cos(a)*dx-Math.sin(a)*dz)/pond.rx,(Math.sin(a)*dx+Math.cos(a)*dz)/pond.rz),shore=Math.max(0,1-Math.abs(d-1.08)/.32);if(shore){r*=1-shore*(id==='coast'?.27:.12);c*=1-shore*.13;b*=1-shore*.08;}}
  colors.push(r,c,b);
 }g.setAttribute('color',new T.Float32BufferAttribute(colors,3));ground.geometry=g;ground.userData.ownedGeometry=true;ground.material.vertexColors=true;ground.material.needsUpdate=true;
}
export function installScenery(w,id,rnd){
 if(!w.regional)groundColors(w,id);const batches=new Map(),dummy=new T.Object3D(),records=[];
 const add=(kind,color,x,y,z,sx,sy,sz,angle=0,tilt=0)=>{if(!sceneryAllowed(w,x,z))return;dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,angle,0);dummy.rotateX(tilt);dummy.updateMatrix();const key=w.regional?kind+':'+Math.floor(x/32)+','+Math.floor(z/32):kind;if(!batches.has(key))batches.set(key,[]);batches.get(key).push({matrix:dummy.matrix.clone(),color:new T.Color(color)});};
 const palette={forest:[0x40664c,0x71904e,0x2f5d50],snow:[0xd8e6e5,0xa6c3cb,0x7d9ea9],ash:[0x383b40,0x69574f,0x89715b],sand:[0x9b895d,0xb6a275,0x857654],coast:[0x627b60,0x899c6c,0x49685c]}[id];
 // Most plants grow around existing trees/rocks or along the banks; open areas stay sparse.
 for(let i=0;i<235;i++){
  const o=w.obstacles.length?w.obstacles[Math.floor(rnd()*w.obstacles.length)]:w.spawn,a=rnd()*Math.PI*2,r=1.1+rnd()*3;let x=o.x+Math.sin(a)*r,z=o.z+Math.cos(a)*r,drift=a;
  if(id==='coast'&&i%2===0&&w.ponds.length){const p=w.ponds[Math.floor(rnd()*w.ponds.length)],t=rnd()*Math.PI*2,pa=p.angle||0,rx=(p.baseRx||p.rx)*1.19+1.8,rz=(p.baseRz||p.rz)*1.19+1.8,dx=Math.sin(t)*rx,dz=Math.cos(t)*rz;x=p.x+Math.cos(pa)*dx+Math.sin(pa)*dz;z=p.z-Math.sin(pa)*dx+Math.cos(pa)*dz;drift=Math.atan2(Math.cos(pa)*Math.cos(t)*rx-Math.sin(pa)*Math.sin(t)*rz,-Math.sin(pa)*Math.cos(t)*rx-Math.cos(pa)*Math.sin(t)*rz);}
  if(i%5===0){const span=((w.half||MAP_HALF)-4)*2;x=w.regional?w.spawn.x+(rnd()-.5)*110:(rnd()-.5)*span;z=w.regional?w.spawn.z+(rnd()-.5)*110:(rnd()-.5)*span;}if(!sceneryAllowed(w,x,z))continue;
  const scale=.7+rnd()*.7;records.push({x,z,kind:id});
  if(id==='forest'||id==='coast'||id==='sand'){
   const patch=Math.sin(x*.13+Math.cos(z*.11))*Math.cos(z*.09),shade=Math.hypot(x-o.x,z-o.z)<2.6;
   for(let j=0;j<(id==='sand'?4:7);j++){
    const turn=a+j*2.4,h=scale*(.65+rnd()*.55),px=x+(rnd()-.5)*.3,pz=z+(rnd()-.5)*.3;
    // Consume the same random stream: richer fronds replace fine blades without moving the map.
    if(id==='forest'){if(j<4)add('frond',palette[shade?2:patch>.15?1:0],px,.015,pz,h*1.18,h*(j===0?.85:1),h*1.15,turn);}
    else add('leaf',palette[j%3],px,.015,pz,id==='sand'?.22:h*.52,id==='coast'?h*1.2:h,id==='sand'?h*.75:h,turn);
   }
   if(id==='forest'&&i%2===0){add('wood',0x5a5542,x,.075,z,1.05,.8+rnd(),.65,a,Math.PI/2);for(let j=0;j<9;j++)add('chip',j%3===0?0x927448:j%3===1?0x637248:0x6d5941,x+(rnd()-.5)*2.5,.023,z+(rnd()-.5)*2.5,.12,.018,.22,rnd()*6);}
   if(id==='sand'&&i%3===0)for(let j=0;j<3;j++)add('chip',j===0?0xc5ae80:0xa89169,x+Math.sin(a+j*2)*.55,.026,z+Math.cos(a+j*2)*.55,.18,.035,.32,windAngle+j*.3);
   if(id==='coast'&&i%3===0){add('wood',0x9b957a,x,.075,z,.9,1.6,.5,drift,Math.PI/2);for(let j=0;j<3;j++)add('stone',j===0?0xd1c6a5:0xadb2a0,x+(rnd()-.5),.03,z+(rnd()-.5),.13,.04,.09,drift);}
  }else if(id==='snow'){
   add('snow',i%3?0xd5e2e1:0xbacfd4,x+windX*.25,.035,z+windZ*.25,scale*.7,.15,scale*1.5,windAngle);if(i%4===0)for(let j=0;j<3;j++)add('ice',0x7fabbf,x-windX*.32+j*.16,.12+j*.035,z-windZ*.32,.10,.24+j*.07,.12,windAngle+j*.3,.15);for(let j=0;j<3;j++)add('stone',palette[2],x+(rnd()-.5)*1.4-windX*.4,.065,z+(rnd()-.5)-windZ*.4,.22,.10,.35,windAngle);
  }else{
   for(let j=0;j<5;j++)add('chip',palette[j%3],x+(rnd()-.5)*1.9,.04,z+(rnd()-.5)*1.2,.12+rnd()*.25,j%2?.055:.10,.14+rnd()*.25,a+j*.35);
   if(i%4===0)add('wood',0x302d2e,x,.06,z,.9,1.3,.45,a,Math.PI/2);
  }
 }
 // Tie the foot of each obstacle to the terrain instead of leaving a bare cylinder on a flat plane.
 for(const o of w.obstacles){if(!sceneryAllowed(w,o.x,o.z))continue;const a=rnd()*6;
  if(id==='snow')add('snow',0xd5e5e7,o.x+windX*.3,.04,o.z+windZ*.3,.78,.23,1.45,windAngle);
  else if(id==='forest'){for(let j=0;j<3;j++){const turn=a+j*2;add('wood',0x595c43,o.x+Math.sin(turn)*.48,.055,o.z+Math.cos(turn)*.48,1.7,1.15,.33,turn,Math.PI/2);add('wood',0x4c5942,o.x+Math.sin(turn)*1.04,.032,o.z+Math.cos(turn)*1.04,.8,.75,.20,turn+.24,Math.PI/2);}}
  else for(let j=0;j<3;j++)add('stone',id==='ash'?0x463e40:id==='sand'?0xa89773:0x7d918a,o.x+Math.sin(a+j*2)*.65,.06,o.z+Math.cos(a+j*2)*.65,.3,.12,.4,a+j);
 }
 w.scenery={records,batches:[]};for(const[key,parts]of batches){const kind=key.split(':')[0],m=new T.InstancedMesh(geometries[kind],material(kind),parts.length);parts.forEach((p,i)=>{m.setMatrixAt(i,p.matrix);m.setColorAt(i,p.color);});m.receiveShadow=true;m.castShadow=false;m.userData.biomeDetail=kind;w.group.add(m);w.scenery.batches.push(m);}
}
