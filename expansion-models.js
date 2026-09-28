import * as T from './vendor/three.module.js';
const materials=new Map(),geometries=new Map();
function part(parent,color,x,y,z,sx,sy,sz,shape='sphere',lit=false){
 const key=color+':'+lit;if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.78,metalness:.12,emissive:lit?color:0,emissiveIntensity:lit?.8:0}));
 if(!geometries.has(shape))geometries.set(shape,shape==='hammer'?new T.CylinderGeometry(1,1,2,8).rotateZ(Math.PI/2):shape==='cone'?new T.ConeGeometry(1,2,9):shape==='stone'?new T.DodecahedronGeometry(1,1):new T.SphereGeometry(1,14,10));
 const m=new T.Mesh(geometries.get(shape),materials.get(key));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function joint(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function model(kind){const g=new T.Group(),rig=joint(g,0,0,0);g.userData={kind,rig,legs:[],arms:[],phase:0};return g;}
function eyes(p,color,y,z,spread=.3){for(const s of [-1,1])part(p,color,s*spread,y,z,.10,.055,.07,'sphere',true);}
function limb(p,c,x,y,z,length,width){const g=joint(p,x,y,z);part(g,c,0,-length/2,0,width,length/2,width);return g;}
export function makeBoss(kind){
 const g=model(kind),d=g.userData,r=d.rig;d.bossModel=true;d.appendages=[];
 if(kind==='boss'){
  part(r,0x65543d,0,2,0,1.25,2,.88,'stone');part(r,0x79965a,0,3.2,-.1,1.4,.8,1,'stone');
  eyes(r,0xece7a5,2.55,.88,.4);part(r,0xaccd7b,0,1.7,.85,.22,.5,.1,'sphere',true);
  for(const s of [-1,1]){const leg=limb(r,0x524933,s*.65,1.1,0,1.1,.4);part(leg,0x65543d,s*.18,-.95,.35,.5,.2,.8);d.legs.push(leg);
   const arm=limb(r,0x65543d,s*1.25,2.8,0,1.7,.33);for(let j=0;j<3;j++){const finger=limb(arm,0x8a7950,(j-1)*.23,-1.5,.1,.65,.09);finger.rotation.x=-.3-j*.1;}d.arms.push(arm);
   const branch=limb(r,0x66543b,s*.65,3.3,0,1.45,.14);branch.rotation.z=s*2.35;part(branch,0x719552,0,-1.3,0,.7,.28,.55,'stone');d.appendages.push(branch);
  }
 }else if(kind==='frostking'){
  part(r,0xc9dfdf,0,1.8,-.2,1.35,1.35,.95);part(r,0xe3ebe5,0,2.7,.35,.86,.85,.72);part(r,0x526d7b,0,2.65,.94,.55,.46,.20);eyes(r,0xb8f5ff,2.83,1.1,.25);
  for(const s of [-1,1]){const leg=limb(r,0x9cbdc8,s*.64,1.15,-.15,1.05,.39);part(leg,0xb9d4dc,0,-.95,.3,.4,.21,.58);d.legs.push(leg);const arm=limb(r,0xd6e4e2,s*1.17,2.65,.1,2.3,.44);part(arm,0x98b8c7,0,-2.3,.22,.48,.4,.5);d.arms.push(arm);for(let i=0;i<3;i++)part(r,0x92d7ee,s*(.25+i*.28),3.55-i*.13,.22,.16,.45-i*.06,.15,'cone',true);}
 }else if(kind==='cinderlord'){
  part(r,0xff9b4e,0,2,0,.66,.93,.65,'stone',true);part(r,0x342f38,0,3.2,.1,.56,.46,.43,'stone');eyes(r,0xffdc8c,3.22,.49,.25);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,p=joint(r,Math.sin(a)*1.05,2,Math.cos(a)*.9);part(p,0x51434a,0,0,0,.46,.82,.28,'stone');d.appendages.push(p);}
  for(const s of [-1,1]){const arm=limb(r,0x62515a,s*1.38,2.8,0,1.35,.31);part(arm,0xffbd6d,0,-1.35,.1,.22,.24,.22,'stone',true);d.arms.push(arm);part(r,0x4a3c43,s*.48,3.68,0,.18,.65,.2,'cone');}
  for(let i=0;i<4;i++){const a=i*1.57;part(r,0x4c4149,Math.sin(a)*.55,.75,Math.cos(a)*.5,.27,.5,.3,'stone');}
 }else{
  part(r,0xbda168,0,.85,0,1.16,.62,1.6);part(r,0x746240,0,1.1,.9,.85,.36,.67);eyes(r,0xffdc83,1.26,1.42,.4);
  for(const s of [-1,1])for(let i=0;i<3;i++){const leg=joint(r,s*.85,.75,.75-i*.75),seg=part(leg,0x91774c,s*.52,-.1,0,.66,.13,.14);seg.rotation.z=-s*.25;const lower=part(leg,0x68533b,s*1.05,-.45,.08,.14,.55,.14);lower.rotation.z=-s*.4;d.legs.push(leg);}
  for(const s of [-1,1]){const arm=joint(r,s*.9,.9,1),base=part(arm,0xa48953,s*.35,0,.65,.4,.28,.85);base.rotation.y=s*.3;const claw=joint(arm,s*.55,0,1.3);part(claw,0xcead69,s*.22,0,.3,.25,.26,.7);const finger=part(claw,0x70553b,-s*.19,0,.45,.18,.2,.62);finger.rotation.y=-s*.4;d.arms.push(arm);d.appendages.push(finger);}
  d.tail=joint(r,0,1,-1.25);let parent=d.tail;d.tailSegments=[];
  for(let i=0;i<5;i++){const seg=joint(parent,0,i? .43:0,i?-.15:0);part(seg,0x9c8050,0,.23,0,.28-i*.025,.35,.27-i*.025);seg.rotation.x=-.28;d.tailSegments.push(seg);parent=seg;}
  part(parent,0x3d3640,0,.25,.35,.17,.16,.65,'cone');
 }
 return g;
}
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function animateBoss(g,t,speed,dt){
 const d=g.userData,r=d.rig,stride=Math.min(1,speed/2.5);d.phase+=dt*(speed>0.05?speed*2.1:0);const p=d.phase;
 const wind=d.bossStage==='strike'?1-ease((d.strikeProgress||0)/.45):ease(d.windProgress||0),strike=d.bossStage==='strike',release=d.bossStage==='recover'?1-ease(d.recoverProgress):0,hit=strike?Math.sin(Math.PI*Math.min(1,(d.strikeProgress||0)*1.7)):0;
 r.position.set(0,(d.lift||0)+Math.abs(Math.sin(p))*.055*stride,0);r.rotation.set(-wind*.10+hit*.16,0,Math.sin(p)*.045*stride);r.scale.set(1,1,1);
 d.legs.forEach((leg,i)=>{leg.rotation.set(Math.sin(p+(i%2)*Math.PI)*.35*stride,0,0);});
 d.arms.forEach((arm,i)=>arm.rotation.set(Math.sin(p+i*Math.PI)*.3*stride-wind*1.3+hit*.65-release*.2,0,0));
 if(d.kind==='boss'){r.rotation.y=-wind*.3+hit*.35;d.arms.forEach((a,i)=>{a.rotation.z=(i?1:-1)*(-wind*.65-hit*.3);});d.appendages.forEach((a,i)=>a.rotation.z=(i?1:-1)*2.35+Math.sin(t*1.6+i)*.04);}
 if(d.kind==='frostking'){r.position.y-=wind*.5;r.rotation.x+=stride*.22;d.arms.forEach((a,i)=>{a.rotation.x=Math.sin(p+i*Math.PI)*.55*stride-wind*2.1+hit*.8-release*.4;});}
 if(d.kind==='cinderlord'){r.position.y=.25+Math.sin(t*1.8)*.18;r.rotation.z=Math.sin(t*.8)*.045;d.appendages.forEach((a,i)=>{const angle=i*Math.PI/3+t*.24,spread=1+wind*.25-hit*.08;a.position.set(Math.sin(angle)*1.05*spread,2+Math.sin(t*1.5+i)*.12,Math.cos(angle)*.9*spread);a.rotation.y=angle;});}
 if(d.kind==='dunescorpion'){
  r.rotation.x=wind*.07-hit*.08;r.rotation.z=Math.sin(p)*.025*stride;
  d.legs.forEach((leg,i)=>{const side=i<3?-1:1,f=p+(i%3)*2.1+(side>0?Math.PI:0);leg.rotation.set(0,Math.sin(f)*.32*stride,side*Math.max(0,Math.cos(f))*.20*stride);});
  d.arms.forEach((a,i)=>{const side=i?1:-1;a.rotation.set(-wind*.2,side*(wind*.48-hit*.65),0);});
  d.tail.rotation.set(-.15+Math.sin(t*1.6)*.08+(d.bossMove==='tail'?wind*.7-hit*1.2:0),Math.sin(p*.55)*.12*stride,0);
  d.tailSegments.forEach((s,i)=>s.rotation.x=-.28+Math.sin(t*1.7-i*.4)*.035);
  d.appendages.forEach((f,i)=>f.rotation.y=(i?1:-1)*(-.4-wind*.3+hit*.45));
 }
}
export function makeSandEnemy(kind){
 const g=model(kind),d=g.userData,r=d.rig;d.sandModel=true;
 if(kind==='sandworm'){
  d.segments=[];for(let i=0;i<5;i++){const s=part(r,0xb99a69,0,.25,-i*.23,.30-i*.03,.28-i*.025,.30);d.segments.push(s);}eyes(r,0x372e30,.34,.25,.11);part(r,0x685440,0,.18,.28,.18,.13,.07);
 }else if(kind==='clawbeetle'){
  part(r,0x85744b,0,.48,0,.5,.35,.72);part(r,0xc2a56c,0,.65,-.12,.46,.21,.5);eyes(r,0xeed183,.46,.6,.17);
  for(const s of [-1,1])for(let i=0;i<3;i++){const leg=joint(r,s*.35,.35,.4-i*.36);const m=part(leg,0x554833,s*.3,-.08,0,.39,.075,.08);m.rotation.z=-s*.3;d.legs.push(leg);}for(const s of [-1,1]){const p=part(r,0x514938,s*.22,.25,.8,.11,.1,.3,'cone');p.rotation.x=1.1;p.rotation.z=s*.4;}
 }else{
  const guard=kind==='sandguard',c=guard?0x817255:kind==='duneoracle'?0x826c8b:0x738e89;
  part(r,c,0,.82,0,guard?.47:.3,.64,.29);part(r,0xb8a077,0,1.48,0,.25,.28,.25);part(r,c,0,1.66,-.03,.3,.19,.27);eyes(r,0xf2d38b,1.47,.24,.10);
  for(const s of [-1,1]){d.legs.push(limb(r,0x544b40,s*.2,.5,0,.47,.12));const a=limb(r,c,s*.35,1.2,0,.54,.14);d.arms.push(a);}
  if(guard){part(d.arms[0],0x917a4e,0,-.2,.18,.38,.54,.12);part(d.arms[0],0xd5bd7f,0,-.2,.3,.065,.42,.03);part(d.arms[1],0xbbb6a0,0,-.3,.4,.075,.065,.6);}else{part(d.arms[1],0x685943,0,-.2,.12,.045,.8,.045);d.focus=part(d.arms[1],kind==='duneoracle'?0xe0b8ff:0xa6cfb8,0,.61,.12,.17,.19,.17,'stone',true);}
 }
 return g;
}
export function animateSandEnemy(g,t,speed,attack,dt){
 const d=g.userData,r=d.rig,stride=Math.min(1,speed/3);d.phase+=speed*dt*3.2;const p=d.phase;
 const desiredWind=attack>0?1-Math.min(1,attack/(d.kind==='sandguard'?1.05:.7)):0;d.gather=(d.gather||0)+(desiredWind-(d.gather||0))*(1-Math.exp(-dt*8));const wind=d.gather;if(d.kind==='duneoracle')r.rotation.y=Math.sin(t*1.7)*.055;else r.rotation.y=0;
 if(d.previousAttack>0&&attack<=0)d.release=.3;d.previousAttack=attack;d.release=Math.max(0,(d.release||0)-dt);const rawStrike=Math.sin(Math.PI*d.release/.3);d.strike=(d.strike||0)+(rawStrike-(d.strike||0))*(1-Math.exp(-dt*9));const strike=d.strike;
 r.rotation.set(wind*.1-strike*.16,d.kind==='duneoracle'?Math.sin(t*1.7)*.055:0,Math.sin(p)*(d.kind==='sandspitter'?.085:.04)*stride);r.position.y=-wind*.12+Math.abs(Math.sin(p))*.04*stride;
 if(d.segments)d.segments.forEach((s,i)=>{s.position.x=Math.sin(p-i*.8)*.13*stride;s.position.y=.25+Math.sin(p-i*.8)*.07*stride+strike*.28;});
 d.legs.forEach((l,i)=>{l.rotation.x=Math.sin(p+i*Math.PI)*.4*stride;if(d.kind==='clawbeetle')l.rotation.y=Math.sin(p+i*2.1)*.3*stride;});
 d.arms.forEach((a,i)=>a.rotation.x=Math.sin(p+i*Math.PI)*(d.kind==='sandguard'?.14:.25)*stride-wind*(d.kind==='duneoracle'?1.1:1.4)+strike*.65);
}
