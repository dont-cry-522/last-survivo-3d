import {smoothSeams} from './hero-finish.js?v=100';
import{weaponGesture,shotStarted}from'./weapon-performance.js?v=100';
import * as T from './vendor/three.module.js';
import{shadowCrescentGeometry,shadowCrescentEdge}from'./shadow-weapons.js?v=100';

// Continuous cloth surfaces share geometry; each actor owns its pose and morph weights.
const geometry=new Map(),materials=new Map();
const C={robe:0x364257,hood:0x414d62,fold:0x293549,lining:0x1e2939,armor:0x536172,trim:0x94a5ae,void:0x070e18,mask:0x1a2736,light:0x79cbdc};
const HIP_HEIGHT=.865,THIGH=.37,SHIN=.365,RIG_SCALE=.92;
function cached(key,create){if(!geometry.has(key))geometry.set(key,create());return geometry.get(key);}
function material(color,glow=false){const key=color+':'+glow;if(!materials.has(key)){const metal=color===C.trim||color===C.armor||color===C.mask;materials.set(key,glow?new T.MeshBasicMaterial({color,toneMapped:false}):new T.MeshStandardMaterial({color,roughness:metal?.63:.94,metalness:metal?.27:.015,side:T.DoubleSide}));}return materials.get(key);}
function mesh(parent,geo,color,pos=[0,0,0],scale=[1,1,1],glow=false){const m=new T.Mesh(geo,material(color,glow));m.position.set(...pos);m.scale.set(...scale);m.castShadow=!glow;m.receiveShadow=true;parent.add(m);return m;}
const joint=(parent,x,y,z)=>{const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;};
const ell=(p,c,pos,scale,glow=false)=>{const small=Math.max(...scale)<=.06;return mesh(p,cached(small?'small-sphere':'sphere',()=>new T.SphereGeometry(1,small?14:20,small?10:14)),c,pos,scale,glow);};
function shape(p,c,profile,pos=[0,0,0],depth=.72,fold=0){const geo=cached('profile:'+fold+JSON.stringify(profile),()=>{
 const path=new T.CatmullRomCurve3(profile.map(([r,y])=>new T.Vector3(r,y,0))),points=path.getPoints(profile.length*3),g=new T.LatheGeometry(points.map(v=>new T.Vector2(v.x,v.y)),32),a=g.attributes.position;
 if(fold){for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),angle=Math.atan2(x,z),radius=Math.hypot(x,z),crease=1+fold*(Math.cos(angle*7+y*4)+.35*Math.cos(angle*11-y*8))/Math.max(.04,radius);a.setXYZ(i,x*crease,y,z*crease);}g.computeVertexNormals();smoothSeams(g);}return g;
 });return mesh(p,geo,c,pos,[1,1,depth]);}
function curve(p,c,points,radius=.008,glow=false){const key='curve:'+radius+JSON.stringify(points);const geo=cached(key,()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),Math.max(16,points.length*4),radius,8,false));return mesh(p,geo,c,[0,0,0],[1,1,1],glow);}
function surface(vertices,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();smoothSeams(g);return g;}

function hoodGeometry(){return cached('hollow-hood',()=>{
 const vertices=[],indices=[],slices=48,rings=18;
 for(let j=0;j<=rings;j++){const v=j/rings,bulge=1+.12*Math.sin(v*Math.PI),shrink=Math.sqrt(1-v*v)*bulge;
  for(let i=0;i<=slices;i++){const a=i/slices*Math.PI*2,sy=Math.sin(a),fold=Math.sin(v*Math.PI)*(.006*Math.cos(a*7+v*3)+.003*Math.cos(a*11-v*5)),x=Math.cos(a)*(.207*shrink+fold)*(1-.29*Math.max(0,-sy)),y=(sy*.24+Math.pow(Math.max(0,sy),8)*.049)*shrink+v*.018+sy*fold,z=.175-v*.405+sy*.045*(1-v);
   vertices.push(x,y,z);if(i<slices&&j<rings){const n=j*(slices+1)+i;indices.push(n,n+slices+1,n+1,n+1,n+slices+1,n+slices+2);}
  }
 }
 return surface(vertices,indices);
});}

function mantleGeometry(){return cached('draped-mantle',()=>{
 const vertices=[],indices=[],rings=10,slices=40;
 for(let j=0;j<=rings;j++)for(let i=0;i<=slices;i++){
  const v=j/rings,a=i/slices*Math.PI*2,front=Math.cos(a),side=Math.sin(a),radius=.108+Math.sin(v*Math.PI*.5)*.252;
  const edge=.36-.075*Math.max(0,front)**4+.024*side,y=.635+(edge-.635)*v+.014*Math.cos(a*5+.4)*v*v;
  vertices.push(side*radius,y,front*radius*.64-.025+.008*Math.cos(a*7)*v);
  if(i<slices&&j<rings){const n=j*(slices+1)+i;indices.push(n,n+slices+1,n+1,n+1,n+slices+1,n+slices+2);}
 }
 return surface(vertices,indices);
});}

function maskGeometry(){return cached('recessed-mask',()=>{
 const vertices=[],indices=[],cols=16,rows=16;
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u=x/cols*2-1,v=y/rows,width=.171*(1-.54*v*v),z=.127+.046*(1-Math.abs(u))-.055*Math.pow(v,3);vertices.push(u*width,.151-v*.331,z);if(x<cols&&y<rows){const n=y*(cols+1)+x;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}}
 return surface(vertices,indices);
});}

function kneeGeometry(){return cached('fitted-knee-guard',()=>{
 const vertices=[],indices=[],cols=8,rows=8;
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u=x/cols*2-1,v=y/rows,width=.062*(.65+.35*Math.sin(v*Math.PI));vertices.push(u*width,.029-v*.176,.083+.018*(1-u*u)+.004*Math.sin(v*Math.PI));if(x<cols&&y<rows){const n=y*(cols+1)+x;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}}
 return surface(vertices,indices);
});}

function bootGeometry(){return cached('leather-boot',()=>{
 const vertices=[],indices=[],slices=24,profile=[[-.096,.101,.210,-.090],[-.077,.105,.221,-.094],[-.039,.104,.217,-.090],[.009,.092,.179,-.081],[.046,.075,.104,-.071],[.076,.071,.068,-.072]];
 for(let j=0;j<profile.length;j++)for(let i=0;i<=slices;i++){const [y,width,front,back]=profile[j],a=i/slices*Math.PI*2,side=Math.sin(a),along=Math.cos(a);vertices.push(Math.sign(side)*Math.abs(side)**.68*width,y,(front+back)/2+Math.sign(along)*Math.abs(along)**.72*(front-back)/2);if(j<profile.length-1&&i<slices){const n=j*(slices+1)+i;indices.push(n,n+1,n+slices+1,n+1,n+slices+2,n+slices+1);}}
 // The sole is flat; the upper rounds into the toe and narrows into the ankle.
 const bottom=vertices.length/3;vertices.push(0,profile[0][0],.06);const top=vertices.length/3;vertices.push(0,profile.at(-1)[0],0);
 for(let i=0;i<slices;i++){indices.push(bottom,i+1,i);const n=(profile.length-1)*(slices+1)+i;indices.push(top,n,n+1);}
 return surface(vertices,indices);
});}

function clothGeometry(width,length,front=false){return cached(`cloth:${width}:${length}:${front}`,()=>{
 const positions=[],trail=[],twist=[],waveA=[],waveB=[],indices=[],cols=12,rows=14;
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
  const u=x/cols,v=y/rows,px=(u-.5)*width*(.72+.28*v),py=-length*v+(front?Math.abs(u-.5)*.13*v*v:Math.cos(u*Math.PI*3)*.038*v*v),pz=-Math.sin(v*Math.PI/2)*(front?.015:.17)+Math.cos(u*Math.PI*6+v*.5)*.018*v;
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
 ell(wrist,C.lining,[0,-.045,.015],[.052,.060,.038]);
 const fingers=[];
 for(let i=0;i<4;i++){
  const length=i===3?.025:.032,base=joint(wrist,(i-1.5)*.023,-.082,.021);
  ell(base,C.armor,[0,-length*.5,0],[.0105,length*.60,.012]);
  const tip=joint(base,0,-length,0);ell(tip,C.armor,[0,-.010,0],[.0095,.015,.011]);fingers.push({base,tip});
 }
 const sign=side==='left'?1:-1,thumb=joint(wrist,sign*.043,-.042,.025);thumb.rotation.z=sign*.65;
 ell(thumb,C.armor,[0,-.014,0],[.015,.025,.015]);const thumbTip=joint(thumb,0,-.031,0);ell(thumbTip,C.armor,[0,-.01,0],[.013,.019,.013]);
 d[side+'Fingers']={fingers,thumb,thumbTip,sign};return wrist;
}
function poseHand(d,side,curl,spread,thumbClose){
 const h=d[side+'Fingers'];h.fingers.forEach(({base,tip},i)=>{base.rotation.x=-curl*(i===0?.90:1);base.rotation.z=(i-1.5)*spread;tip.rotation.x=-curl*.82;});
 h.thumb.rotation.x=-.28-thumbClose*.48;h.thumb.rotation.z=h.sign*(.65-thumbClose*.35);h.thumbTip.rotation.x=-.3-thumbClose*.65;
}

export function makeWraith(weapon='shade'){
 const g=new T.Group(),rig=joint(g,0,0,0),hips=joint(rig,0,HIP_HEIGHT,0),torso=joint(hips,0,0,0),d=g.userData;rig.scale.setScalar(RIG_SCALE);
 Object.assign(d,{wraith:true,kind:'wraith',weaponId:weapon,rig,hips,torso,panels:[]});
 // Keep a substantial silhouette, with a fitted waist and visible articulated legs.
 const tunic=shape(torso,C.robe,[[.25,-.035],[.234,.055],[.235,.18],[.277,.35],[.291,.46],[.228,.56]],[0,0,0],.76,.006);tunic.name='wraith-tailored-tunic';
 shape(torso,C.lining,[[.123,.50],[.118,.58],[.108,.70]],[0,0,0],.86,.003);
 const mantle=mesh(torso,mantleGeometry(),C.hood);mantle.name='wraith-draped-mantle';
 shape(torso,C.lining,[[.238,.008],[.247,.018],[.245,.059],[.239,.067]],[0,0,0],.81);
 // A single overlapping front panel follows the chest instead of stacked armor bars.
 const chest=cached('overlap-panel',()=>{const v=[],ix=[],n=12;for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const h=y/n,u=x/n,px=(u-.5)*(.26+h*.06)+.055*(1-h),depth=.185+Math.sin(h*Math.PI*.8)*.032;v.push(px,.083+h*.38,depth-px*px*.85+.004*Math.sin(u*Math.PI*4)*Math.sin(h*Math.PI));if(x<n&&y<n){const a=y*(n+1)+x;ix.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}}return surface(v,ix);});mesh(torso,chest,C.fold);
 curve(torso,C.armor,[[-.08,.095,.192],[-.125,.24,.208],[-.16,.43,.193]],.005);
 const clasp=ell(torso,C.trim,[-.142,.415,.211],[.026,.036,.011]);clasp.rotation.z=-.25;
 ell(torso,C.trim,[.025,.038,.207],[.037,.024,.009]);
 const cape=joint(torso,0,.48,-.15);d.cape=cape;
 for(const s of [-1,1]){const panel=cloth(cape,d,s<0?C.robe:C.hood,.405,s<0?.73:.79,[s*.18,0,-.045]);panel.rotation.y=s*-.15;panel.rotation.z=s*.035;}
 for(const s of [-1,1]){const coat=cloth(torso,d,C.robe,.275,s<0?.28:.32,[s*.148,-.005,.18],true);coat.rotation.y=s*.28;coat.rotation.z=s*-.09;}
 // Recessed face, hollow hood and three cold light slits are visible from the game camera.
 const head=joint(torso,0,.755,-.012);head.scale.set(.97,.98,.98);d.head=head;mesh(head,hoodGeometry(),C.hood);
 ell(head,C.void,[0,-.015,.02],[.175,.213,.091]);
 const mask=mesh(head,maskGeometry(),C.mask);mask.name='wraith-recessed-mask';d.mask=mask;
 const rim=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,sy=Math.sin(a);rim.push([Math.cos(a)*.207*(1-.29*Math.max(0,-sy)),sy*.24+Math.pow(Math.max(0,sy),8)*.049,.175+sy*.045]);}curve(head,C.fold,rim,.009);
 for(const x of [-.063,0,.063]){const slit=curve(head,C.light,[[x,.102,.181],[x*.90,.020,.183],[x*.78,-.074,.168],[x*.56,-.133,.145]],x===0?.0065:.0055,true);slit.name='wraith-face-slit';}
 for(const s of [-1,1]){
  const side=s<0?'left':'right',leg=joint(hips,s*.145,-.04,0);d[side+'Leg']=leg;
  shape(leg,C.fold,[[.083,-THIGH-.018],[.095,-.28],[.119,-.13],[.113,-.035],[.098,.012]],[0,0,0],1,.004);
  const knee=joint(leg,0,-THIGH,0);d[side+'Knee']=knee;mesh(knee,kneeGeometry(),C.armor);
  shape(knee,C.lining,[[.084,-SHIN],[.093,-.27],[.085,-.12],[.091,-.025]],[0,0,0],1.04,.002);
  curve(knee,C.armor,[[0,-.085,.098],[0,-.19,.10],[0,-.31,.092]],.005);
  const foot=joint(knee,0,-SHIN,.02);d[side+'Foot']=foot;const boot=mesh(foot,bootGeometry(),C.lining);boot.name='wraith-leather-boot';
  const arm=joint(torso,s*.295,.465,-.015);d[side+'Arm']=arm;
  shape(arm,C.robe,[[.070,-.265],[.087,-.21],[.102,-.10],[.104,-.025],[.069,.042]],[0,0,0],1,.004);
  const elbow=joint(arm,0,-.265,0);d[side+'Elbow']=elbow;ell(elbow,C.lining,[0,-.10,0],[.065,.12,.073]);
  shape(elbow,C.armor,[[.062,-.20],[.071,-.16],[.073,-.085],[.060,-.038]],[0,0,0],1.06);
  curve(elbow,C.trim,[[-.052,-.175,.047],[0,-.19,.081],[.052,-.175,.047]],.004);hand(elbow,d,side);
 }
 const w=joint(weapon==='grimoire'?d.leftHand:d.rightHand,0,-.035,.06);d.weapon=w;
 if(weapon==='shadowblade'){
  // The unsharpened inner bridge sits inside the curled glove, clear of the edge.
  curve(w,C.fold,[[-.075,-.035,.02],[.075,-.035,.02],[.14,-.015,.02]],.016);
  for(const x of[-.04,-.01,.02,.05])curve(w,C.trim,[[x,-.046,.015],[x,-.046,.025]],.004);
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
 }
 // Preserve each focus's authored size when breathing or casting.
 if(d.focus)d.focus.userData.baseScale=d.focus.scale.clone();
 d.leftArm.rotation.set(weapon==='grimoire'?-.55:-.12,0,.1);d.rightArm.rotation.set(-.16,0,-.1);
 d.leftElbow.rotation.x=weapon==='grimoire'?-.85:-.28;d.rightElbow.rotation.x=weapon==='shadowblade'?-.34:-.40;
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
 const fired=shotStarted(d,attack,d.lastAttack||0);
 if(fired){d.strokeTime=0;d.recoil.v=Math.min(d.recoil.v+(blade?3.8:book?1.6:3.2),5);}else d.strokeTime=(d.strokeTime??2)+dt;d.lastAttack=attack;
 const recoil=spring(d.recoil,0,dt,18,9),motion=weaponGesture(d.weaponId,d.strokeTime,d.reloadPhase??1,d.reloadDuration||1);
 const stroke=T.MathUtils.smoothstep(d.strokeTime,0,strokeDuration),recovery=book?.28:blade?.30:.22;
 const gesture=Math.max(d.aimActive?.24:0,attack>0?1:1-T.MathUtils.smoothstep(d.strokeTime,strokeDuration,strokeDuration+recovery));d.cast=smooth(d.cast||0,gesture,22);const cast=d.cast;
 const acceleration=dt?T.MathUtils.clamp((speed-(d.previousSpeed??speed))/dt,-12,12):0;d.previousSpeed=speed;
 d.clothTrail??={x:.08,v:0};d.clothSide??={x:0,v:0};
 const drag=spring(d.clothTrail,T.MathUtils.clamp(.08+run*.8+acceleration*.025,.02,1.15),dt,8,4.5),sway=spring(d.clothSide,-d.turn*.8-d.side*run*.2,dt,7,3.5);
 d.rig.position.y=.012+(1-Math.cos(d.phase*2))*.009*run+Math.sin(t*2.2)*.004;d.hips.position.y=HIP_HEIGHT-run*.065;d.rig.rotation.x=-run*.06*d.forward-cast*(book?.015:.035)+recoil*.22-Math.min(1,hurt/.18)*.14;d.rig.rotation.z=-d.turn*.035-step*.023*run;d.rig.position.x=step*.013*run;
 d.hips.rotation.y=d.side*.10+step*.035*run;d.hips.rotation.z=.012*(1-run);d.torso.rotation.y=smooth(d.torso.rotation.y,-d.hips.rotation.y+(blade?cast*(.48-.86*stroke)+recoil*.7:-cast*.045-recoil*.18));d.head.rotation.y=-d.torso.rotation.y*.45-d.turn*.07;d.head.rotation.x=.035+Math.sin(t*1.8)*.008-cast*.03-recoil*.10;
 d.torso.rotation.x=Math.sin(t*2.2)*.006*(1-run);d.head.rotation.z=(.012+Math.sin(t*1.45)*.01)*(1-run)*(1-cast);
 // A support phase and a lifted return replace rigid pendulum legs. Solve the
 // two leg links toward the ankle, then counter-rotate the boot to stay level.
 let leftReach=0,rightReach=0;
 for(const [side,sign]of [['left',1],['right',-1]]){
  const phase=((d.phase/(Math.PI*2)+(sign<0?.5:0))%1+1)%1,stance=phase<.58,u=stance?phase/.58:(phase-.58)/.42;
  const reach=(stance?Math.cos(u*Math.PI):-Math.cos(u*Math.PI))*.23*run;
  if(side==='left')leftReach=reach;else rightReach=reach;
  const lift=stance?0:Math.pow(Math.sin(u*Math.PI),1.6)*.15*run;
  const z=reach*d.forward,down=d.hips.position.y-.04-.112+d.rig.position.y/RIG_SCALE-lift-z*Math.sin(d.rig.rotation.x);
  const knee=Math.acos(T.MathUtils.clamp((down*down+z*z-THIGH*THIGH-SHIN*SHIN)/(2*THIGH*SHIN),-.98,.998));
  const hip=Math.atan2(-z,down)-Math.atan2(SHIN*Math.sin(knee),THIGH+SHIN*Math.cos(knee));
  const leg=d[side+'Leg'];leg.rotation.x=hip;leg.rotation.z=sign*.025-reach*d.side/.58;
  d[side+'Knee'].rotation.x=knee;
  const toe=stance?T.MathUtils.smoothstep(u,.72,1)*.12*run:-Math.sin(u*Math.PI)*.12*run;
  d[side+'Foot'].rotation.x=-hip-knee-d.rig.rotation.x+toe;
  d[side+'Foot'].rotation.z=-leg.rotation.z;
 }
 const leftBase=leftReach*1.3,rightBase=rightReach*1.3;
 d.leftArm.rotation.x=smooth(d.leftArm.rotation.x,book?-.55+leftBase*.10:-.12+leftBase*(1-cast)-cast*(blade?.25:.42));
 d.rightArm.rotation.x=smooth(d.rightArm.rotation.x,rightBase*(1-cast)-.16+recoil*(book?.4:.8)-cast*(blade?.40+.26*stroke:book?.52+.13*stroke:.92+.10*stroke));
 d.leftArm.rotation.z=.10+cast*.12;d.leftArm.rotation.y=smooth(d.leftArm.rotation.y,blade?-cast*.18:0);d.rightArm.rotation.z=smooth(d.rightArm.rotation.z,-.10-cast*(blade?.35+.25*stroke:.1));d.rightArm.rotation.y=smooth(d.rightArm.rotation.y,blade?cast*(1.02-1.48*stroke)+recoil*.8:book?-cast*.22+motion.sweep*.35:-recoil*.4);
 d.leftElbow.rotation.x=smooth(d.leftElbow.rotation.x,book?-.85:-.28-cast*.32);d.rightElbow.rotation.x=smooth(d.rightElbow.rotation.x,blade?-.34-cast*(.45-.38*stroke):book?-.40-cast*(.45-.18*stroke):-.40-cast*(.48-.60*stroke),20);
 d.leftHand.rotation.x=smooth(d.leftHand.rotation.x,book?-.1:-cast*.28);d.rightHand.rotation.x=smooth(d.rightHand.rotation.x,-.18+cast*(blade?.24:-.10)+recoil*(blade?1.4:.65));d.rightHand.rotation.y=smooth(d.rightHand.rotation.y,blade?cast*(.9-1.25*stroke):cast*.1);d.weapon.position.z=.06-cast*.025*(1-stroke)-recoil*.24;
 // Give each focus a different release silhouette, blended on top of the running pose.
 d.rightHand.rotation.z=blade?-motion.sweep*.7:book?motion.gather*.28:-motion.kick*.3;
 d.leftHand.rotation.z=book?0:-motion.gather*.35;
 d.weapon.scale.setScalar(blade?1-motion.kick*.55:1);
 d.weapon.rotation.x=book?d.weapon.rotation.x:blade?0:recoil*.35;d.weapon.rotation.z=book?d.weapon.rotation.z:blade?0:recoil*.18;
 if(blade){d.weapon.position.set(0,-.105+.035*d.weapon.scale.y,.056-.02*d.weapon.scale.z);}
 const release=motion.kick;
 poseHand(d,'right',blade?1.12-release*.92:book?.34+motion.gather*.30:.60+motion.gather*.30-release*.40,.035+release*.11,blade?1-release:book?.32:.60);
 poseHand(d,'left',book?.24:.38,book?.075:.045,book?.20:.35);
 if(d.book){
  d.leftHand.getWorldQuaternion(d.bookParentQ);d.bookEuler.set(-.10+Math.sin(t*2.5)*.015,g.rotation.y+.12,.025*Math.sin(t*2));d.bookLevelQ.setFromEuler(d.bookEuler);d.book.quaternion.copy(d.bookParentQ).invert().multiply(d.bookLevelQ);
  d.book.position.y=-.025+Math.sin(t*2.5)*.018+cast*.035;d.page.rotation.z=Math.sin(t*2.4)*.10-motion.sweep*1.8+recoil*.6;d.page.position.y=.075+Math.sin(stroke*Math.PI)*cast*.025;
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
}
