import * as T from './vendor/three.module.js';

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
  const v=j/rings,a=i/slices*Math.PI*2,front=Math.cos(a),side=Math.sin(a),radius=.103+v*.285;
  const edge=.53-.09*Math.max(0,front)**4+.035*Math.abs(side),y=.73+(edge-.73)*v+.008*Math.cos(a*5)*v;
  vertices.push(side*radius,y,front*radius*.68-.012);
  if(i<slices&&j<rings){const n=j*(slices+1)+i;indices.push(n,n+1,n+slices+1,n+1,n+slices+2,n+slices+1);}
 }
 return surface(vertices,indices);
});}

function clothGeometry(width,length,front=false){return cached(`cloth:${width}:${length}:${front}`,()=>{
 const positions=[],trail=[],twist=[],indices=[],cols=12,rows=14;
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){
  const u=x/cols,v=y/rows,px=(u-.5)*width*(.58+.42*v),py=-length*v+(front?Math.abs(u-.5)*.13*v*v:Math.cos(u*Math.PI*3)*.065*v*v),pz=-Math.sin(v*Math.PI/2)*(front?.015:.17)+Math.cos(u*Math.PI*6)*.026*v;
  positions.push(px,py,pz);trail.push(px*(1+.08*v),py+v*v*.15,pz-v*v*.3);twist.push(px+v*v*.18,py,pz+px*v*.65);
  if(x<cols&&y<rows){const n=y*(cols+1)+x;indices.push(n,n+cols+1,n+1,n+1,n+cols+1,n+cols+2);}
 }
 const g=surface(positions,indices);g.morphAttributes.position=[new T.Float32BufferAttribute(trail,3),new T.Float32BufferAttribute(twist,3)];g.computeBoundingSphere();return g;
});}
function cloth(p,d,color,width,length,pos,front=false){const m=mesh(p,clothGeometry(width,length,front),color,pos);d.panels.push(m);return m;}

function hand(parent,d,side){
 const wrist=joint(parent,0,-.27,0);d[side+'Hand']=wrist;
 ell(wrist,C.lining,[0,-.045,.015],[.047,.07,.038]);
 for(let i=0;i<4;i++){const f=ell(wrist,C.armor,[(i-1.5)*.021,-.103,.027],[.010,.033-(i===3?.009:0),.014]);f.rotation.x=-.25;}
 ell(wrist,C.armor,[-.047,-.046,.036],[.017,.034,.019]).rotation.z=-.5;return wrist;
}

export function makeWraith(weapon='shade'){
 const g=new T.Group(),rig=joint(g,0,0,0),hips=joint(rig,0,1,0),torso=joint(hips,0,0,0),d=g.userData;rig.scale.setScalar(.88);
 Object.assign(d,{wraith:true,kind:'wraith',weaponId:weapon,rig,hips,torso,panels:[]});
 // Fitted torso, mantle and coat tails form one silhouette rather than stacked blocks.
 shape(torso,C.robe,[[.23,-.04],[.24,.05],[.22,.20],[.265,.41],[.285,.58],[.245,.64]],[0,0,0],.76);
 shape(torso,C.lining,[[.095,.61],[.08,.85]],[0,0,0],.8);
 mesh(torso,mantleGeometry(),C.robe);
 shape(torso,C.armor,[[.228,0],[.244,.025],[.23,.072],[.226,.08]],[0,.015,0],.82);
 for(const s of [-1,1]){
  curve(torso,C.trim,[[s*.19,.51,.211],[s*.165,.38,.219],[s*.14,.20,.220]],.006);
 }
 const chest=cached('chest-panel',()=>{const v=[],ix=[],n=8;for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const h=y/n,px=(x/n-.5)*(.36+h*.15);v.push(px,.18+h*.34,.224-px*px*.9);if(x<n&&y<n){const a=y*(n+1)+x;ix.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}}return surface(v,ix);});mesh(torso,chest,C.armor);
 for(const y of [.27,.35,.43])curve(torso,C.fold,[[-.185,y,.201],[0,y-.008,.233],[.185,y,.201]],.007);
 curve(torso,C.lining,[[-.25,.57,.18],[-.14,.40,.245],[.015,.22,.23],[.185,.05,.2]],.028);
 ell(torso,C.trim,[.025,.02,.205],[.038,.034,.012]);ell(torso,C.light,[.025,.02,.221],[.014,.018,.004],true);
 const cape=joint(torso,0,.58,-.13);d.cape=cape;
 for(const s of [-1,1]){const panel=cloth(cape,d,s<0?C.robe:C.hood,.45,s<0?1.07:1.14,[s*.19,0,-.05]);panel.rotation.y=s*-.19;panel.rotation.z=s*.045;}
 for(const s of [-1,1]){const coat=cloth(torso,d,C.robe,.28,.54,[s*.14,-.01,.19],true);coat.rotation.y=s*.3;coat.rotation.z=s*-.1;}
 // Recessed face, hollow hood and three cold light slits are visible from the game camera.
 const head=joint(torso,0,.87,0);head.scale.setScalar(.70);d.head=head;mesh(head,hoodGeometry(),C.hood);
 ell(head,C.void,[0,-.015,.045],[.172,.208,.105]);
 const rim=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,sy=Math.sin(a);rim.push([Math.cos(a)*.224*(sy<0?.85*(1+sy*.18):1),sy*.24+(sy>0?Math.pow(sy,6)*.036:0),.18+sy*.045]);}curve(head,C.fold,rim,.012);
 for(const x of [-.071,0,.071])curve(head,C.light,[[x,.105,.170],[x*.88,.021,.18],[x*.81,-.075,.166],[x*.55,-.135,.135]],x===0?.0085:.0075,true);
 for(const s of [-1,1]){
  const side=s<0?'left':'right',leg=joint(hips,s*.133,-.05,0);d[side+'Leg']=leg;ell(leg,C.lining,[0,-.21,0],[.09,.235,.095]);
  const knee=joint(leg,0,-.43,0);d[side+'Knee']=knee;ell(knee,C.armor,[0,-.005,.073],[.078,.085,.03]);
  shape(knee,C.fold,[[.075,-.43],[.079,-.31],[.066,-.11],[.075,-.025]],[0,0,0],1);curve(knee,C.trim,[[0,-.08,.081],[0,-.26,.088],[0,-.37,.085]],.005);
  const foot=joint(knee,0,-.43,.02);d[side+'Foot']=foot;ell(foot,C.lining,[0,-.033,.058],[.083,.057,.145]);
  const arm=joint(torso,s*.308,.56,0);d[side+'Arm']=arm;ell(arm,C.robe,[s*.01,-.14,0],[.085,.17,.094]);
  const shoulder=ell(arm,C.armor,[s*.015,-.015,-.01],[.104,.045,.10]);shoulder.rotation.z=s*.16;
  const elbow=joint(arm,0,-.30,0);d[side+'Elbow']=elbow;ell(elbow,C.lining,[0,-.13,0],[.058,.15,.065]);
  shape(elbow,C.armor,[[.054,-.25],[.069,-.20],[.063,-.09],[.054,-.055]],[0,0,0],1.08);
  for(const y of [-.20,-.105])curve(elbow,C.trim,[[-.051,y,.056],[0,y,.084],[.051,y,.056]],.005);hand(elbow,d,side);
 }
 const w=joint(d.rightHand,0,-.045,.04);d.weapon=w;
 if(weapon==='shadowblade'){
  const ring=mesh(w,cached('blade-ring',()=>new T.TorusGeometry(.105,.012,6,24)),C.trim,[0,0,.13]);ring.rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,blade=mesh(w,cached('blade',()=>new T.ConeGeometry(.045,.22,3)),C.light,[Math.sin(a)*.15,0,.13+Math.cos(a)*.15],[1,1,.28],true);blade.rotation.set(Math.PI/2,a,0);}
 }else if(weapon==='dark'){
  shape(w,C.fold,[[.025,-.28],[.032,.19],[.024,.6]],[0,0,.065],1);
  for(const s of [-1,1])curve(w,C.trim,[[s*.02,.45,.065],[s*.12,.63,.065],[s*.085,.78,.065]],.021);
  d.focus=ell(w,C.light,[0,.66,.065],[.064,.105,.064],true);
 }else{
  d.focus=ell(w,0x181f3b,[0,.045,.17],[.085,.085,.085]);
  curve(w,C.light,[[-.07,.10,.17],[-.04,.115,.21],[.015,.08,.252],[.06,.022,.22]],.006,true);
  for(let i=0;i<3;i++){const mote=ell(w,C.light,[Math.cos(i*2.1)*.15,.045+Math.sin(i*2.1)*.11,.17],[.012,.012,.012],true);(d.motes??=[]).push(mote);}
 }
 // Preserve each focus's authored size when breathing or casting.
 if(d.focus)d.focus.userData.baseScale=d.focus.scale.clone();
 animateWraith(g,0,0,0,0);return g;
}

export function animateWraith(g,t,speed=0,attack=0,hurt=0){
 const d=g.userData,dt=d.lastTime===undefined?1/60:Math.max(0,Math.min(.05,t-d.lastTime));d.lastTime=t;
 const smooth=(a,b,k=12)=>a+(b-a)*(1-Math.exp(-dt*k));
 d.move=smooth(d.move||0,Math.min(1,speed/6));d.cast=smooth(d.cast||0,attack>0?1:0,18);d.turn=smooth(d.turn||0,T.MathUtils.clamp((d.turnRate||0)/9,-1,1),6);
 d.phase=(d.phase||0)+dt*(2+speed*1.6);const step=Math.sin(d.phase),run=d.move,cast=d.cast;
 const travel=Number.isFinite(d.travelAngle)?Math.atan2(Math.sin(d.travelAngle-g.rotation.y),Math.cos(d.travelAngle-g.rotation.y)):0;d.travel=smooth(d.travel||0,T.MathUtils.clamp(travel,-.65,.65));
 d.rig.position.y=.012+Math.abs(step)*.022*run+Math.sin(t*2.2)*.006;d.rig.rotation.x=-run*.045-Math.min(1,hurt/.18)*.14;d.rig.rotation.z=-d.turn*.035;
 d.hips.rotation.y=d.travel+step*.035*run;d.hips.rotation.z=.012*(1-run);d.torso.rotation.y=-d.travel*.65-step*.025*run;d.head.rotation.y=-d.torso.rotation.y*.3-d.turn*.07;d.head.rotation.x=.035+Math.sin(t*1.8)*.008-cast*.03;
 for(const [side,sign]of [['left',1],['right',-1]]){const stride=step*sign,knee=Math.max(0,-stride)*.63*run;d[side+'Leg'].rotation.x=stride*.55*run;d[side+'Leg'].rotation.z=sign*.025*(1-run);d[side+'Knee'].rotation.x=knee;d[side+'Foot'].rotation.x=-knee*.4-Math.max(0,stride)*.14*run;}
 const blade=d.weaponId==='shadowblade',staff=d.weaponId==='dark';
 d.leftArm.rotation.x=smooth(d.leftArm.rotation.x,-step*.34*run-cast*.22);d.rightArm.rotation.x=smooth(d.rightArm.rotation.x,step*.25*run-(staff?.12:.10)-cast*(blade?.45:staff?.65:.50));
 d.leftArm.rotation.z=.06+cast*.13;d.rightArm.rotation.z=-.07-cast*(blade?.52:.1);d.leftElbow.rotation.x=-.16-Math.max(0,step)*.2*run-cast*.18;d.rightElbow.rotation.x=-(staff?.18:.52)-cast*(blade?.36:staff?.28:.42);
 d.rightHand.rotation.x=staff?0:-.17;d.rightHand.rotation.y=blade?cast*.8:cast*.12;d.cape.rotation.x=-.055-run*.07;d.cape.rotation.z=-d.turn*.06;
 d.panels.forEach((panel,i)=>{panel.morphTargetInfluences[0]=run*.65+Math.sin(t*2.4+i*.8)*.06+.07;panel.morphTargetInfluences[1]=d.turn*.65+Math.sin(t*1.7+i)*.09;});
 if(d.focus){d.focus.scale.copy(d.focus.userData.baseScale).multiplyScalar(1+Math.sin(t*4)*.045+cast*.12);d.focus.rotation.y=t*.55;}
 d.motes?.forEach((m,i)=>{const a=t*2+i*Math.PI*2/3;m.position.set(Math.cos(a)*.14,.045+Math.sin(a)*.1,.17+Math.sin(a)*.06);});
}
