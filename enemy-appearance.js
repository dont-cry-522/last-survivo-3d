import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Five finite, shared sets of geometry. Articulation moves groups, never vertices.
const templates=new Map();
const skin=new T.MeshStandardMaterial({vertexColors:true,roughness:.91,metalness:0});
const light=new T.MeshStandardMaterial({vertexColors:true,roughness:.6,emissive:0xffffff,emissiveIntensity:.35});
function colored(g,color){
 const c=new T.Color(color),p=g.attributes.position,a=[];
 for(let i=0;i<p.count;i++)a.push(c.r,c.g,c.b);
 g.setAttribute('color',new T.Float32BufferAttribute(a,3));g.deleteAttribute('uv');return g;
}
function piece(g,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
 g.scale(sx,sy,sz);g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);return colored(g,color);
}
const oval=(c,x,y,z,sx,sy,sz)=>piece(new T.SphereGeometry(1,10,6),c,x,y,z,sx,sy,sz);
const rock=(c,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>piece(new T.IcosahedronGeometry(1,0),c,x,y,z,sx,sy,sz,rx,ry,rz);
function profile(points,color,{x=0,y=0,z=0,depth=1,bend=0,flute=0}={}){
 const g=new T.LatheGeometry(points.map(([r,h])=>new T.Vector2(r,h)),16),p=g.attributes.position;
 const height=Math.max(...points.map(v=>v[1]))||1;
 for(let i=0;i<p.count;i++){
  const py=p.getY(i),angle=Math.atan2(p.getZ(i),p.getX(i)),wave=1+flute*Math.cos(angle*7)*(1-py/height);
  p.setXYZ(i,p.getX(i)*wave+bend*(py/height)**2,py,p.getZ(i)*wave*depth);
 }
 g.computeVertexNormals();return piece(g,color,x,y,z);
}
function branch(c,points,radius=.035,segments=10){
 return colored(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,radius,5,false),c);
}
function joined(parts){
 // Mixed primitives use different index formats. One non-indexed batch per moving part.
 const flat=parts.map(p=>p.index?p.toNonIndexed():p),g=mergeGeometries(flat,false);
 for(const p of new Set([...parts,...flat]))p.dispose();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function template(kind){
 if(templates.has(kind))return templates.get(kind);const p={};
 if(kind==='mushroom'){
  p.body=joined([
   profile([[0,.14],[.22,.17],[.29,.33],[.22,.58],[.18,.88],[0,.94]],0xcbbb92,{depth:.87,bend:-.025}),
   oval(0xe2d2a9,0,.60,.18,.21,.27,.10),
   ...[-1,1].flatMap(s=>[oval(0x423b32,s*.12,.70,.254,.073,.096,.025),oval(0xf5dfa0,s*.115,.714,.275,.026,.044,.013),oval(0xc3906b,s*.19,.60,.24,.045,.025,.015)]),
   oval(0x695342,0,.54,.269,.065,.018,.011),
   ...[-1,1].map(s=>oval(0xb3a37b,s*.265,.34,.02,.08,.18,.10))
  ]);
  const cap=[profile([[0,-.10],[.29,-.12],[.56,-.055],[.64,.03],[.60,.14],[.44,.27],[.19,.34],[0,.35]],0xa24d35,{depth:.95,bend:-.045}),
   profile([[0,-.116],[.27,-.12],[.53,-.059],[.63,.018]],0xe0bb81,{depth:.95})];
  for(let i=0;i<9;i++){const a=i*2.399,r=.20+(i%3)*.115,h=.337-r*r*.65;cap.push(oval(i%2?0xedce91:0xd6ad6b,Math.cos(a)*r,h,Math.sin(a)*r*.95,.055+i%2*.028,.012,.04+i%3*.009));}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;cap.push(branch(0xb98c59,[[Math.cos(a)*.24,-.118,Math.sin(a)*.24],[Math.cos(a)*.43,-.085,Math.sin(a)*.43],[Math.cos(a)*.60,-.012,Math.sin(a)*.57]],.009,5));}
  p.cap=joined(cap);p.foot=joined([oval(0xa88e65,0,0,.035,.13,.105,.20)]);
 }else if(kind==='wolf'){
  p.body=joined([
   oval(0x536574,0,.68,-.04,.255,.28,.53),oval(0x708492,0,.74,.27,.29,.34,.26),oval(0x647381,0,.66,-.35,.27,.27,.23),
   oval(0xa5b0a5,0,.65,.37,.20,.25,.12),
   rock(0x82929b,0,.89,.29,.22,.19,.20,.2),rock(0x687e88,0,.99,.18,.15,.115,.20,-.2),
   ...[-1,1].map(s=>rock(0x90a0a3,s*.23,.75,.22,.08,.22,.21,.1,0,s*.28))
  ]);
  p.head=joined([
   oval(0x81949c,0,.03,.015,.245,.25,.265),oval(0xa8b6b1,0,-.055,.25,.15,.125,.23),
   oval(0x293b43,0,-.027,.415,.12,.07,.065),
   ...[-1,1].flatMap(s=>[oval(0x354851,s*.167,.083,.181,.063,.060,.054),oval(0xf7ce6b,s*.173,.086,.219,.032,.028,.017),rock(0x647b86,s*.18,.135,.19,.10,.041,.077,0,0,-s*.20),rock(0x98a8a9,s*.205,-.10,-.06,.105,.135,.14,0,0,s*.2)])
  ]);
  p.ear=joined([profile([[0,0],[.105,.02],[.075,.14],[.019,.29],[0,.30]],0x7f959d,{depth:.48,bend:-.018}),oval(0x425561,0,.12,.040,.048,.10,.008)]);
  p.jaw=joined([oval(0x71858b,0,0,.29,.13,.06,.185),oval(0xcad1b7,0,.032,.36,.093,.021,.095)]);
  p.tail=joined([branch(0x647c87,[[0,0,0],[0,-.015,-.10],[0,-.055,-.21],[0,-.09,-.29]],.09)]);
  p.tailTip=joined([oval(0xa8b4af,0,-.025,-.065,.08,.075,.14)]);
  p.upper=joined([oval(0x6c818b,0,-.095,0,.096,.155,.105)]);
  p.lower=joined([oval(0x526a74,0,-.103,0,.056,.13,.061),oval(0x81948f,0,-.228,.065,.078,.060,.12)]);
 }else if(kind==='golem'){
  p.body=joined([
   rock(0x536354,0,.93,-.015,.67,.69,.70,.12,.2,-.07),rock(0x829077,-.16,1.39,.07,.40,.33,.39,.2,-.2,-.1),
   rock(0x66775b,.25,1.22,.14,.39,.38,.37,-.1,.2,.2),rock(0x93a086,-.34,.81,.20,.25,.34,.30,.2,.2,-.3),
   rock(0x374b3e,.03,1.08,.48,.20,.25,.047),rock(0xa7d2a0,.01,1.11,.529,.075,.14,.023),
   ...[-1,1].flatMap(s=>[rock(0x779077,s*.46,1.44,-.03,.25,.17,.27,.1,0,s*.4),rock(0x627e50,s*.39,1.48,.11,.25,.04,.19)]),
   branch(0x334737,[[-.30,1.51,.28],[-.21,1.24,.421],[-.11,1.15,.474]],.018),branch(0x334737,[[.30,1.34,.385],[.21,1.12,.476],[.28,.88,.411]],.018)
  ]);
  p.head=joined([
   rock(0x8a987d,0,0,0,.38,.35,.32,.04,.2,.08),rock(0xa8b298,-.075,.19,-.04,.28,.12,.28,.1,0,-.1),
   ...[-1,1].flatMap(s=>[rock(0x344539,s*.14,.04,.29,.123,.075,.034),oval(0xe6d49b,s*.14,.045,.321,.068,.025,.014),rock(0x677c5b,s*.155,.117,.273,.15,.045,.07,0,0,s*.07)]),
   rock(0x596d51,0,-.16,.27,.18,.025,.025),rock(0x5f8147,-.15,.29,-.08,.22,.035,.20)
  ]);
  p.arm=joined([rock(0x64755e,0,-.21,0,.34,.36,.31,.12,.2,.18),rock(0x819176,.025,-.63,.075,.28,.31,.29,.2,.2,-.2),rock(0x577543,-.01,.02,.035,.28,.055,.24),rock(0x9da68e,.1,-.65,.31,.14,.14,.06)]);
  p.leg=joined([rock(0x62735d,0,-.10,0,.20,.25,.23,-.1,0,.15),rock(0x87947b,0,-.38,.07,.23,.19,.31,0,.15,0)]);
 }else{
  const spitter=kind==='spitter',cloth=spitter?0x695075:0x356c5d,trim=spitter?0xa18b81:0x9aaf7e,shade=spitter?0x48394e:0x214c43;
  p.body=joined([
   profile([[0,.27],[.31,.30],[.29,.62],[.24,.98],[.15,1.20],[0,1.24]],cloth,{depth:.77,bend:spitter?.05:-.015,flute:.045}),
   oval(trim,0,1.04,.025,.29,.105,.23),oval(shade,0,.99,.04,.245,.072,.24),
   branch(trim,[[-.14,.97,.175],[-.12,.78,.235],[-.04,.59,.25],[.15,.56,.24]],.024),
   oval(spitter?0x9b7561:0x86764a,-.245,.59,.11,.11,.15,.105)
  ]);
  p.hem=joined([profile([[0,.08],[.28,.10],[.40,.16],[.35,.32],[.30,.54]],shade,{depth:.99,bend:.035,flute:.11}),profile([[.398,.14],[.382,.19]],trim,{depth:.99,flute:.085})]);
  p.head=joined([
   oval(0xc5c6a0,0,0,.018,.22,.22,.19),oval(shade,0,.075,-.045,.251,.214,.182),
   oval(0xc5c6a0,0,-.025,.158,.156,.142,.075),
   ...[-1,1].flatMap(s=>[oval(0x354238,s*.082,.022,.213,.050,.038,.021),oval(0xf6d895,s*.082,.021,.233,.022,.016,.008)]),
   oval(0xabae84,0,-.055,.228,.037,.046,.041),
   profile(spitter?[[0,.11],[.25,.09],[.36,.12],[.39,.18],[.29,.22],[.23,.31],[.18,.45],[0,.50]]:[[0,.11],[.25,.09],[.34,.12],[.36,.18],[.27,.22],[.21,.31],[.16,.45],[0,.50]],cloth,{depth:.85,bend:spitter?-.04:.025}),
   profile([[.32,.137],[.387,.168],[.354,.20]],trim,{depth:.85})
  ]);
  p.hatTip=joined([profile([[spitter?.18:.16,0],[.125,.10],[.05,.22],[0,.23]],cloth,{depth:.85,bend:spitter?-.15:.12})]);
  p.staff=joined([branch(0x755e42,[[0,-.73,0],[-.028,-.20,.016],[.02,.23,0],[.015,.66,.02],[-.045,.88,.02]],.032),
   branch(0xa3a582,[[-.045,.65,.025],[-.13,.77,.025],[-.09,.88,.022]],.023),
   oval(0xc5c6a0,-.015,.20,.02,.069,.074,.085)]);
  p.focus=joined(spitter?[oval(0xd99eca,0,0,0,.12,.155,.12)]:[oval(0xb4d2a0,0,0,0,.065,.13,.075),rock(0xd1dfb2,-.07,.025,0,.068,.12,.038,0,0,-.30),rock(0x97bb8b,.07,.025,0,.068,.12,.038,0,0,.30)]);
  p.arm=joined([oval(cloth,0,-.13,0,.115,.19,.12),oval(0xc5c6a0,0,-.32,.04,.065,.065,.08)]);
  p.castingUpper=joined([oval(cloth,0,-.105,0,.10,.15,.105)]);
  p.castingForearm=joined([oval(cloth,0,-.115,0,.078,.135,.081),oval(trim,0,-.209,0,.083,.032,.086)]);
  p.foot=joined([oval(0x493f34,0,0,.045,.091,.075,.14)]);
 }
 templates.set(kind,p);return p;
}
function group(parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function add(parent,geometry,name,glow=false){const m=new T.Mesh(geometry,glow?light:skin);m.name=name;m.castShadow=!glow;m.receiveShadow=!glow;parent.add(m);return m;}
export function polishEnemyAppearance(g){
 const d=g.userData,kind=d.kind;if(d.appearance||!['mushroom','wolf','golem','spitter','shaman'].includes(kind)||d.species)return g;
 const p=template(kind),rig=d.rig;rig.clear();d.appearance=true;d.legs=[];d.arms=[];add(rig,p.body,'creature-body');
 if(kind==='mushroom'){
  d.cap=group(rig,0,1.01,0);add(d.cap,p.cap,'mushroom-cap');d.feet=[-1,1].map(s=>{const f=group(rig,s*.18,.12,.10);add(f,p.foot,'mushroom-foot');return f;});
 }else if(kind==='wolf'){
  d.head=group(rig,0,.80,.47);add(d.head,p.head,'wolf-head');d.jaw=group(d.head,0,-.21,0);add(d.jaw,p.jaw,'wolf-jaw');
  d.ears=[-1,1].map(s=>{const ear=group(d.head,s*.17,.25,-.06);add(ear,p.ear,'wolf-ear');return ear;});
  d.tail=group(rig,0,.75,-.46);add(d.tail,p.tail,'wolf-tail');d.tailTip=group(d.tail,0,-.09,-.26);add(d.tailTip,p.tailTip,'wolf-tail-tip');
  for(const x of[-.22,.22])for(const z of[-.28,.28]){const joint=group(rig,x,.49,z),knee=group(joint,0,-.24,0),paw=group(knee,0,-.24,.03);add(joint,p.upper,'wolf-upper-leg');add(knee,p.lower,'wolf-lower-leg');d.legs.push({joint,knee,paw,phase:x*z>0?0:Math.PI,upperLength:.24,lowerLength:.24,restY:.49});}
 }else if(kind==='golem'){
  d.head=group(rig,0,1.80,.03);add(d.head,p.head,'golem-head');
  for(const s of[-1,1]){const arm=group(rig,s*.73,1.34,0);add(arm,p.arm,'golem-arm');d.arms.push(arm);const joint=group(rig,s*.30,.57,0);add(joint,p.leg,'golem-leg');d.legs.push({joint,phase:s<0?0:Math.PI});}
 }else{
  d.head=group(rig,0,1.26,0);add(d.head,p.head,'caster-head');d.hatTip=group(d.head,-.035,.40,-.035);add(d.hatTip,p.hatTip,'caster-hat-tip');d.hem=group(rig);add(d.hem,p.hem,'caster-hem');
  d.staff=group(rig,.48,.76,.1);add(d.staff,p.staff,'caster-staff');d.focus=add(group(d.staff,0,.82,0),p.focus,'caster-focus',true);
  const arm=group(rig,-.26,1.03,0);add(arm,p.arm,'caster-free-arm');d.arms=[arm];
  const upper=group(rig,.245,1.035,.005),forearm=group(rig);add(upper,p.castingUpper,'caster-upper-arm');add(forearm,p.castingForearm,'caster-forearm');
  d.castingArm={upper,forearm,upperLength:.23,lowerLength:.25};updateEnemyGrip(d);
  d.feet=[-1,1].map(s=>{const foot=group(rig,s*.15,.08,.07);add(foot,p.foot,'caster-foot');return foot;});
 }
 return g;
}

const down=new T.Vector3(0,-1,0),grip=new T.Vector3(),direction=new T.Vector3(),bend=new T.Vector3(),elbow=new T.Vector3(),segment=new T.Vector3();
// The palm remains part of the staff. Solve two fixed sleeve bones to that live grip.
export function updateEnemyGrip(d){
 const arm=d.castingArm;if(!arm||!d.staff)return;
 d.staff.updateMatrix();grip.set(-.015,.20,.02).applyMatrix4(d.staff.matrix);
 direction.copy(grip).sub(arm.upper.position);const raw=direction.length();if(raw<.0001)return;
 direction.divideScalar(raw);const a=arm.upperLength,b=arm.lowerLength,reach=T.MathUtils.clamp(raw,Math.abs(a-b)+.0001,a+b-.0001);
 const along=(a*a-b*b+reach*reach)/(2*reach),lift=Math.sqrt(Math.max(0,a*a-along*along));
 // Elbow hangs below the hand; a small forward bias keeps it outside the tunic.
 bend.set(.22,-1,.32).addScaledVector(direction,-bend.dot(direction));
 if(bend.lengthSq()<.0001)bend.set(0,0,1).addScaledVector(direction,-direction.z);
 bend.normalize();elbow.copy(arm.upper.position).addScaledVector(direction,along).addScaledVector(bend,lift);
 arm.upper.quaternion.setFromUnitVectors(down,segment.copy(elbow).sub(arm.upper.position).normalize());
 arm.forearm.position.copy(elbow);arm.forearm.quaternion.setFromUnitVectors(down,segment.copy(grip).sub(elbow).normalize());
}
