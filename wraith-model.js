import * as T from './vendor/three.module.js';
import{shadowCrescentGeometry,shadowCrescentEdge}from'./shadow-weapons.js?v=18';

// Continuous cloth surfaces share geometry; each actor owns its pose and morph weights.
const geometry=new Map(),materials=new Map();
const C={robe:0x303851,hood:0x3c4265,fold:0x20293d,lining:0x141c2c,armor:0x4a586b,trim:0x778795,void:0x050b15,light:0x61cfee};
function cached(key,create){if(!geometry.has(key))geometry.set(key,create());return geometry.get(key);}
function material(color,glow=false){const key=color+':'+glow;if(!materials.has(key))materials.set(key,glow?new T.MeshBasicMaterial({color,toneMapped:false}):new T.MeshStandardMaterial({color,roughness:.8,metalness:.12,side:T.DoubleSide}));return materials.get(key);}
function mesh(parent,geo,color,pos=[0,0,0],scale=[1,1,1],glow=false){const m=new T.Mesh(geo,material(color,glow));m.position.set(...pos);m.scale.set(...scale);m.castShadow=!glow;m.receiveShadow=true;parent.add(m);return m;}
const joint=(parent,x,y,z)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;};
const ell=(p,c,pos,scale,glow=false)=>mesh(p,cached('sphere',()=>new T.SphereGeometry(1,16,12)),c,pos,scale,glow);
function shape(p,c,profile,pos=[0,0,0],depth=.72){const geo=cached('profile:'+JSON.stringify(profile),()=>new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),24));return mesh(p,geo,c,pos,[1,1,depth]);}
function curve(p,c,points,radius=.008,glow=false){const key='curve:'+radius+JSON.stringify(points);const geo=cached(key,()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),Math.max(8,points.length*3),radius,5,false));return mesh(p,geo,c,[0,0,0],[1,1,1],glow);}
function surface(vertices,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;}

function hoodGeometry(){return cached('hollow-hood',()=>{
 const vertices=[],indices=[],slices=32,rings=12;
 for(let j=0;j<=rings;j++){const v=j/rings,bulge=1+.3*Math.sin(v*Math.PI),shrink=Math.sqrt(1-v*v)*bulge;
  for(let i=0;i<=slices;i++){const a=i/slices*Math.PI*2,sy=Math.sin(a),x=Math.cos(a)*.224*shrink*(sy<0?.85:1),y=(sy*.24+(sy>0?Math.pow(sy,6)*.036:0))*shrink+v*.025,z=.18-v*.44+sy*.045*(1-v);
   vertices.push(x*(sy<0?1+sy*.18:1),y,z);if(i<slices&&j<rings){const n=j*(slices+1)+i;indices.push(n,n+1,n+slices+1,n+1,n+slices+2,n+slices+1);}
  }
 }
 return surface(vertices,indices);
});}

function mantleGeometry(){return cached('draped-mantle',()=>{
 const vertices=[],indices=[],rings=7,slices=32;
 for(let j=0;j<=rings;j++)for(let i=0;i<=slices;i++){
  const v=j/rings,a=i/slices*Math.PI*2,front=Math.cos(a),side=Math.sin(a),radius=.13+v*.295;
  const edge=.44-.075*Math.max(0,front)**4+.035*Math.abs(side),y=.61+(edge-.61)*v+.008*Math.cos(a*5)*v;
  vertices.push(side*radius,y,front*radius*.68-.012);
  if(i<slices&&j<rings){const n=j*(slices+1)+i;indices.push(n,n+1,n+slices+1,n+1,n+slices+2,n+slices+1);}
 }
 return surface(vertices,indices);
});}

function clothGeometry(width,length,front=false){return cached(`cloth:${width}:${length}:${front}`,()=>{
 const positions=[],trail=[],twist=[],waveA=[],waveB=[],indices=[],cols=12,rows=14;
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
  const u=x/cols,v=y/rows,px=(u-.5)*width*(.58+.42*v),py=-length*v+(front?Math.abs(u-.5)*.13*v*v:Math.cos(u*Math.PI*3)*.065*v*v),pz=-Math.sin(v*Math.PI/2)*(front?.015:.17)+Math.cos(u*Math.PI*6)*.026*v;
  const free=v*v,phase=v*7-u*2.3,amplitude=front?.042:.105;
  positions.push(px,py,pz);trail.push(px*(1+.1*v),py+free*(front?.045:.20),pz-free*(front?.06:.42));twist.push(px+free*(front?.06:.22),py,pz+px*v*.65);
  waveA.push(px,py+Math.sin(phase)*free*.018,pz+Math.sin(phase)*free*amplitude);
  waveB.push(px,py+Math.cos(phase)*free*.018,pz+Math.cos(phase)*free*amplitude);
  if(x<cols&&y<rows){const n=y*(cols+1)+x;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
 }
 const g=surface(positions,indices);g.morphAttributes.position=[trail,twist,waveA,waveB].map(p=>new T.Float32BufferAttribute(p,3));
 g.morphAttributes.normal=g.morphAttributes.position.map(position=>{const target=new T.BufferGeometry();target.setAttribute('position',position);target.setIndex(g.index);target.computeVertexNormals();return target.getAttribute('normal');});g.computeBoundingSphere();return g;
});}
function cloth(p,d,color,width,length,pos,front=false){const m=mesh(p,clothGeometry(width,length,front),color,pos);m.userData.front=front;d.panels.push(m);return m;}

// Integrate in small steps so a slow phone and a desktop produce the same cloth inertia.
function spring(state,target,dt,frequency=8,damping=5){
 for(let left=dt;left>0;){const h=Math.min(left,1/120);state.v+=(frequency*frequency*(target-state.x)-2*damping*state.v)*h;state.x+=state.v*h;left-=h;}return state.x;
}

function hand(parent,d,side){
 const wrist=joint(parent,0,-.21,0);d[side+'Hand']=wrist;
 ell(wrist,C.lining,[0,-.045,.015],[.057,.063,.045]);
 for(let i=0;i<4;i++){const f=ell(wrist,C.armor,[(i-1.5)*.021,-.103,.027],[.010,.033-(i===3?.009:0),.014]);f.rotation.x=-.25;}
 ell(wrist,C.armor,[-.047,-.046,.036],[.017,.034,.019]).rotation.z=-.5;return wrist;
}

export function makeWraith(weapon='shade'){
 const g=new T.Group(),rig=joint(g,0,0,0),hips=joint(rig,0,.73,0),torso=joint(hips,0,0,0),d=g.userData;rig.scale.setScalar(.88);
 Object.assign(d,{wraith:true,kind:'wraith',weaponId:weapon,rig,hips,torso,panels:[]});
 // Chibi proportions: a broad rounded body and short articulated limbs below the large hood.
 shape(torso,C.robe,[[.27,-.04],[.295,.05],[.325,.19],[.33,.34],[.315,.48],[.265,.56]],[0,0,0],.80);
 shape(torso,C.lining,[[.13,.51],[.11,.74]],[0,0,0],.85);
 mesh(torso,mantleGeometry(),C.robe);
 shape(torso,C.armor,[[.282,0],[.304,.025],[.301,.072],[.293,.08]],[0,.015,0],.83);
 for(const s of [-1,1]){
  curve(torso,C.trim,[[s*.22,.42,.239],[s*.20,.31,.260],[s*.18,.16,.252]],.006);
 }
 const chest=cached('chest-panel',()=>{const v=[],ix=[],n=8;for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const h=y/n,px=(x/n-.5)*(.44+h*.12);v.push(px,.15+h*.29,.29-px*px*.95);if(x<n&&y<n){const a=y*(n+1)+x;ix.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}}return surface(v,ix);});mesh(torso,chest,C.armor);
 for(const y of [.22,.29,.36])curve(torso,C.fold,[[-.21,y,.255],[0,y-.008,.298],[.21,y,.255]],.007);
 curve(torso,C.lining,[[-.28,.47,.205],[-.16,.34,.280],[.015,.20,.308],[.215,.05,.238]],.032);
 ell(torso,C.trim,[.025,.025,.260],[.045,.038,.012]);ell(torso,C.light,[.025,.025,.276],[.017,.020,.004],true);
 const cape=joint(torso,0,.48,-.16);d.cape=cape;
 for(const s of [-1,1]){const panel=cloth(cape,d,s<0?C.robe:C.hood,.49,s<0?.80:.85,[s*.215,0,-.05]);panel.rotation.y=s*-.19;panel.rotation.z=s*.045;}
 for(const s of [-1,1]){const coat=cloth(torso,d,C.robe,.33,.34,[s*.17,-.01,.235],true);coat.rotation.y=s*.3;coat.rotation.z=s*-.1;}
 // Recessed face, hollow hood and three cold light slits are visible from the game camera.
 const head=joint(torso,0,.76,0);head.scale.set(1.08,.98,1.0);d.head=head;mesh(head,hoodGeometry(),C.hood);
 ell(head,C.void,[0,-.015,.045],[.172,.208,.105]);
 const rim=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,sy=Math.sin(a);rim.push([Math.cos(a)*.224*(sy<0?.85*(1+sy*.18):1),sy*.24+(sy>0?Math.pow(sy,6)*.036:0),.18+sy*.045]);}curve(head,C.fold,rim,.012);
 for(const x of [-.071,0,.071])curve(head,C.light,[[x,.105,.170],[x*.88,.021,.18],[x*.81,-.075,.166],[x*.55,-.135,.135]],x===0?.0085:.0075,true);
 for(const s of [-1,1]){
  const side=s<0?'left':'right',leg=joint(hips,s*.16,-.04,0);d[side+'Leg']=leg;ell(leg,C.lining,[0,-.145,0],[.11,.17,.115]);
  const knee=joint(leg,0,-.29,0);d[side+'Knee']=knee;ell(knee,C.armor,[0,-.005,.087],[.09,.075,.03]);
  shape(knee,C.fold,[[.093,-.31],[.100,-.23],[.086,-.08],[.092,-.025]],[0,0,0],1);curve(knee,C.trim,[[0,-.065,.101],[0,-.17,.11],[0,-.26,.108]],.005);
  const foot=joint(knee,0,-.31,.02);d[side+'Foot']=foot;ell(foot,C.lining,[0,-.033,.066],[.107,.067,.164]);
  const arm=joint(torso,s*.34,.47,0);d[side+'Arm']=arm;ell(arm,C.robe,[s*.01,-.11,0],[.108,.14,.112]);
  const shoulder=ell(arm,C.armor,[s*.015,-.015,-.01],[.117,.05,.11]);shoulder.rotation.z=s*.16;
  const elbow=joint(arm,0,-.235,0);d[side+'Elbow']=elbow;ell(elbow,C.lining,[0,-.10,0],[.069,.12,.077]);
  shape(elbow,C.armor,[[.065,-.20],[.080,-.15],[.075,-.07],[.062,-.03]],[0,0,0],1.08);
  for(const y of [-.15,-.07])curve(elbow,C.trim,[[-.058,y,.065],[0,y,.098],[.058,y,.065]],.005);hand(elbow,d,side);
 }
 const w=joint(weapon==='grimoire'?d.leftHand:d.rightHand,0,-.035,.06);d.weapon=w;
 if(weapon==='shadowblade'){
  mesh(w,shadowCrescentGeometry,0x667297,[0,-.01,.11]).rotation.x=Math.PI/2;
  curve(w,C.light,shadowCrescentEdge.map(p=>[p.x,.008,.11+p.y]),.007,true);
 }else if(weapon==='grimoire'){
  d.book=w;d.bookParentQ=new T.Quaternion();d.bookLevelQ=new T.Quaternion();d.bookEuler=new T.Euler();const box=cached('book-unit',()=>new T.BoxGeometry(1,1,1));
  for(const s of [-1,1]){const leaf=joint(w,0,.04,.11);leaf.rotation.z=s*.18;mesh(leaf,box,C.fold,[s*.10,0,0],[.20,.035,.26]);mesh(leaf,box,0xa1a8b5,[s*.095,.025,0],[.18,.019,.235]);for(const z of [-.065,0,.065])curve(leaf,C.light,[[s*.035,.038,z],[s*.085,.042,z+.02],[s*.155,.038,z]],.004,true);}
  d.page=mesh(w,box,0xc0c7d3,[0,.075,.11],[.165,.006,.23]);d.page.position.x=.08;
  curve(w,C.light,[[-.18,.035,-.035],[0,.06,-.048],[.18,.035,-.035]],.008,true);
 }else{
  d.focus=ell(w,0x181f3b,[0,.045,.17],[.048,.048,.048]);
  for(const s of [-1,0,1])curve(w,C.light,[[s*.075,.045,.11],[s*.1,.095,.19],[s*.06,.055,.285]],.006,true);
  for(let i=0;i<3;i++){const mote=ell(w,C.light,[Math.cos(i*2.1)*.15,.045+Math.sin(i*2.1)*.11,.17],[.012,.012,.012],true);(d.motes??=[]).push(mote);}
 }
 // Preserve each focus's authored size when breathing or casting.
 if(d.focus)d.focus.userData.baseScale=d.focus.scale.clone();
 d.leftArm.rotation.set(weapon==='grimoire'?-.55:0,0,.1);d.rightArm.rotation.set(-.1,0,-.1);
 d.leftElbow.rotation.x=weapon==='grimoire'?-.85:-.20;d.rightElbow.rotation.x=weapon==='shadowblade'?-.25:-.36;
 d.leftHand.rotation.x=weapon==='grimoire'?-.1:0;d.rightHand.rotation.x=-.18;
 animateWraith(g,0,0,0,0);return g;
}

export function animateWraith(g,t,speed=0,attack=0,hurt=0){
 const d=g.userData,dt=d.lastTime===undefined?1/60:Math.max(0,Math.min(.05,t-d.lastTime));d.lastTime=t;
 const smooth=(a,b,k=12)=>a+(b-a)*(1-Math.exp(-dt*k));
 d.move=smooth(d.move||0,Math.min(1,speed/6));d.turn=smooth(d.turn||0,T.MathUtils.clamp((d.turnRate||0)/9,-1,1),6);
 d.phase=(d.phase||0)+dt*(5+speed*1.05)*d.move;const step=Math.sin(d.phase),run=d.move;
 const travel=Number.isFinite(d.travelAngle)?d.travelAngle-g.rotation.y:0;d.forward=smooth(d.forward??1,Math.cos(travel));d.side=smooth(d.side||0,Math.sin(travel));
 const blade=d.weaponId==='shadowblade',book=d.weaponId==='grimoire';
 const strokeDuration=book?.32:blade?.16:.20;
 d.recoil??={x:0,v:0};
 const fired=attack>(d.lastAttack||0)+.03;
 if(fired){d.strokeTime=0;d.recoil.v=Math.min(d.recoil.v+(blade?3.8:book?1.6:3.2),5);}else d.strokeTime=(d.strokeTime??2)+dt;d.lastAttack=attack;
 const recoil=spring(d.recoil,0,dt,18,9);
 const stroke=T.MathUtils.smoothstep(d.strokeTime,0,strokeDuration),recovery=book?.28:blade?.30:.22;
 const gesture=Math.max(d.aimActive?.24:0,attack>0?1:1-T.MathUtils.smoothstep(d.strokeTime,strokeDuration,strokeDuration+recovery));d.cast=smooth(d.cast||0,gesture,22);const cast=d.cast;
 const acceleration=dt?T.MathUtils.clamp((speed-(d.previousSpeed??speed))/dt,-12,12):0;d.previousSpeed=speed;
 d.clothTrail??={x:.08,v:0};d.clothSide??={x:0,v:0};
 const drag=spring(d.clothTrail,T.MathUtils.clamp(.08+run*.8+acceleration*.025,.02,1.15),dt,8,4.5),sway=spring(d.clothSide,-d.turn*.8-d.side*run*.2,dt,7,3.5);
 d.rig.position.y=.012+(1-Math.cos(d.phase*2))*.009*run+Math.sin(t*2.2)*.004;d.hips.position.y=.73-run*.065;d.rig.rotation.x=-run*.06*d.forward-cast*(book?.015:.035)+recoil*.22-Math.min(1,hurt/.18)*.14;d.rig.rotation.z=-d.turn*.035-step*.023*run;d.rig.position.x=step*.013*run;
 d.hips.rotation.y=d.side*.10+step*.035*run;d.hips.rotation.z=.012*(1-run);d.torso.rotation.y=smooth(d.torso.rotation.y,-d.hips.rotation.y+(blade?cast*(.32-.55*stroke)+recoil*.55:-cast*.045-recoil*.18));d.head.rotation.y=-d.torso.rotation.y*.45-d.turn*.07;d.head.rotation.x=.035+Math.sin(t*1.8)*.008-cast*.03-recoil*.10;
 // A support phase and a lifted return replace rigid pendulum legs. Solve the
 // two leg links toward the ankle, then counter-rotate the boot to stay level.
 let leftReach=0,rightReach=0;
 for(const [side,sign]of [['left',1],['right',-1]]){
  const phase=((d.phase/(Math.PI*2)+(sign<0?.5:0))%1+1)%1,stance=phase<.58,u=stance?phase/.58:(phase-.58)/.42;
  const reach=(stance?Math.cos(u*Math.PI):-Math.cos(u*Math.PI))*.23*run;
  if(side==='left')leftReach=reach;else rightReach=reach;
  const lift=stance?0:Math.pow(Math.sin(u*Math.PI),1.6)*.15*run;
  const z=reach*d.forward,down=d.hips.position.y-.04-.112+d.rig.position.y/.88-lift-z*Math.sin(d.rig.rotation.x);
  const knee=Math.acos(T.MathUtils.clamp((down*down+z*z-.29*.29-.31*.31)/(2*.29*.31),-.98,.998));
  const hip=Math.atan2(-z,down)-Math.atan2(.31*Math.sin(knee),.29+.31*Math.cos(knee));
  const leg=d[side+'Leg'];leg.rotation.x=hip;leg.rotation.z=sign*.025-reach*d.side/.58;
  d[side+'Knee'].rotation.x=knee;
  const toe=stance?T.MathUtils.smoothstep(u,.72,1)*.12*run:-Math.sin(u*Math.PI)*.12*run;
  d[side+'Foot'].rotation.x=-hip-knee-d.rig.rotation.x+toe;
  d[side+'Foot'].rotation.z=-leg.rotation.z;
 }
 const leftBase=leftReach*1.3,rightBase=rightReach*1.3;
 d.leftArm.rotation.x=smooth(d.leftArm.rotation.x,book?-.55+leftBase*.10:leftBase*(1-cast)-cast*(blade?.25:.42));
 d.rightArm.rotation.x=smooth(d.rightArm.rotation.x,rightBase*(1-cast)-.10+recoil*(book?.4:.8)-cast*(blade?.40+.26*stroke:book?.52+.13*stroke:.92+.10*stroke));
 d.leftArm.rotation.z=.10+cast*.12;d.leftArm.rotation.y=smooth(d.leftArm.rotation.y,blade?-cast*.18:0);d.rightArm.rotation.z=smooth(d.rightArm.rotation.z,-.10-cast*(blade?.35+.25*stroke:.1));d.rightArm.rotation.y=smooth(d.rightArm.rotation.y,blade?cast*(.8-stroke)+recoil*.8:book?-cast*.22:-recoil*.25);
 d.leftElbow.rotation.x=smooth(d.leftElbow.rotation.x,book?-.85:-.20-cast*.32);d.rightElbow.rotation.x=smooth(d.rightElbow.rotation.x,blade?-.25-cast*(.45-.38*stroke):book?-.36-cast*(.45-.18*stroke):-.36-cast*(.48-.60*stroke),20);
 d.leftHand.rotation.x=smooth(d.leftHand.rotation.x,book?-.1:-cast*.28);d.rightHand.rotation.x=smooth(d.rightHand.rotation.x,-.18+cast*(blade?.24:-.10)+recoil*(blade?1.4:.65));d.rightHand.rotation.y=smooth(d.rightHand.rotation.y,blade?cast*(.9-1.25*stroke):cast*.1);d.weapon.position.z=.06-cast*.025*(1-stroke)-recoil*.24;
 d.weapon.rotation.x=book?d.weapon.rotation.x:recoil*(blade?-.65:.35);d.weapon.rotation.z=book?d.weapon.rotation.z:recoil*(blade?1.3:.18);
 if(d.book){
  d.leftHand.getWorldQuaternion(d.bookParentQ);d.bookEuler.set(-.10+Math.sin(t*2.5)*.015,g.rotation.y+.12,.025*Math.sin(t*2));d.bookLevelQ.setFromEuler(d.bookEuler);d.book.quaternion.copy(d.bookParentQ).invert().multiply(d.bookLevelQ);
  d.book.position.y=-.025+Math.sin(t*2.5)*.018+cast*.035;d.page.rotation.z=Math.sin(t*2.4)*.10-Math.sin(stroke*Math.PI)*cast*.95+recoil*.6;d.page.position.y=.075+Math.sin(stroke*Math.PI)*cast*.025;
 }
 d.cape.rotation.x=.025+drag*.09+recoil*.12;d.cape.rotation.z=sway*.10+recoil*(blade?.18:.04);d.cape.rotation.y=-d.turn*.035;
 d.clothPhase=(d.clothPhase||0)+dt*(4+run*5);
 d.panels.forEach((panel,i)=>{
  const front=panel.userData.front,flutter=(front?.08:.16)+run*(front?.20:.52),phase=d.clothPhase-i*.8;
  panel.morphTargetInfluences[0]=T.MathUtils.clamp(front?run*.16+Math.max(0,step*(i===2?1:-1))*.28:drag,-.15,1.25);
  panel.morphTargetInfluences[1]=T.MathUtils.clamp(sway*(front?.35:1),-.9,.9);
  panel.morphTargetInfluences[2]=Math.sin(phase)*flutter;panel.morphTargetInfluences[3]=Math.cos(phase)*flutter;
 });
 if(d.focus){d.focus.scale.copy(d.focus.userData.baseScale).multiplyScalar(1+Math.sin(t*4)*.045+cast*.12);d.focus.rotation.y=t*.55;}
 d.motes?.forEach((m,i)=>{const a=t*2+i*Math.PI*2/3;m.position.set(Math.cos(a)*.14,.045+Math.sin(a)*.1,.17+Math.sin(a)*.06);});
}
