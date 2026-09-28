import * as T from './vendor/three.module.js';
import {guardianPose} from './guardian-motion.js?v=43';
const geo=new Map(),mats=new Map();
function material(color,metal=0){const key=color+':'+metal;if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,metalness:metal,roughness:metal?.46:.82,side:T.DoubleSide}));return mats.get(key);}
function geometry(key,create){if(!geo.has(key))geo.set(key,create());return geo.get(key);}
function mesh(parent,shape,color,pos,scale=[1,1,1],metal=0){const m=new T.Mesh(shape,material(color,metal));m.position.set(...pos);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const sphere=()=>geometry('sphere',()=>new T.SphereGeometry(1,16,12));
const ell=(p,c,pos,scale,metal=0)=>mesh(p,sphere(),c,pos,scale,metal);
const tube=(p,c,pos,scale,metal=0)=>mesh(p,geometry('tube',()=>new T.CylinderGeometry(1,1,1,12)),c,pos,scale,metal);
const joint=(p,pos)=>{const g=new T.Group();g.position.set(...pos);p.add(g);return g;};
function plate(p,c,outline,pos,depth=.055,bevel=.025,metal=.5){
 const key='plate:'+outline+':'+depth+':'+bevel,g=geometry(key,()=>{const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:8});g.translate(0,0,-depth*.5);return g;});return mesh(p,g,c,pos,[1,1,1],metal);
}
// Only equipment is procedural; the body uses the same textured skeletal asset as the ranger.
export function equipGuardian(g,grips){
 const d=g.userData;
 const shield=joint(d.support.hand,[0,0,0]);d.shield=shield;const outline=[[-.32,.4],[0,.49],[.32,.4],[.36,.10],[.28,-.31],[0,-.55],[-.28,-.31],[-.36,.10]];
 plate(shield,0xc3a877,outline,[0,0,0],.08,.035);plate(shield,0x632a36,outline.map(([x,y])=>[x*.86,y*.86]),[0,0,.065],.045,.022);d.shieldContact=joint(shield,[0,0,.16]);
 plate(shield,0xd1b779,[[-.25,-.15],[-.11,.06],[0,-.045],[.12,.24],[.26,-.15]],[0,0,.118],.026,.009);
 plate(shield,0x3b4950,[[-.035,-.15],[.12,.16],[.16,.035],[.11,.075],[.02,-.15]],[0,0,.142],.008,.004);
 plate(shield,0xd1b779,[[-.18,-.21],[.18,-.21],[.15,-.245],[-.15,-.245]],[0,0,.118],.016,.007);
 for(const s of [-1,1])for(const y of [-.17,.28])ell(shield,0xdec696,[s*.25,y,.115],[.025,.025,.021],.6);
 const hammer=joint(d.support.rightHand,[0,0,0]);d.hammer=hammer;d.weapon=hammer;
 tube(hammer,0x705139,[0,.24,0],[.050,.94,.050]);for(let i=0;i<5;i++)tube(hammer,0xb2986a,[0,-.11+i*.055,0],[.056,.018,.056],.25);
 ell(hammer,0xb69c6d,[0,-.25,0],[.085,.068,.085],.5);
 const hammerShape=geometry('hammer-head',()=>new T.CylinderGeometry(1,1,2,8).rotateZ(Math.PI/2));
 mesh(hammer,hammerShape,0x91a5a5,[0,.66,0],[.36,.185,.19],.65);mesh(hammer,hammerShape,0x632a36,[0,.66,0],[.08,.205,.215],.5);
 for(const s of [-1,1]){mesh(hammer,hammerShape,0xbba273,[s*.35,.66,0],[.035,.195,.2],.7);ell(hammer,0x46606b,[s*.395,.66,0],[.017,.10,.115],.6);}
 d.hammerContact=joint(hammer,[0,.66,0]);

 for(const [weapon,grip]of [[shield,grips[0]],[hammer,grips[1]]]){weapon.scale.setScalar(.72);weapon.quaternion.copy(grip).invert();}
 shield.position.set(0,0,.12).applyQuaternion(shield.quaternion);
 d.gun=hammer;d.gunRest=hammer.quaternion.clone();d.grips=grips;
 d.guardianPrevious=[];
}
// Solve the actual skeleton's limb directions, rather than assuming an axis for its bones.
function arm(upper,lower,hand,target,pole,grip,desired,previous,dt){
 const origin=upper.getWorldPosition(new T.Vector3()),elbow=lower.getWorldPosition(new T.Vector3()),end=hand.getWorldPosition(new T.Vector3());
 const a=origin.distanceTo(elbow),b=elbow.distanceTo(end),axis=target.clone().sub(origin).normalize(),distance=T.MathUtils.clamp(origin.distanceTo(target),Math.abs(a-b)+.005,a+b-.008);
 const goal=origin.clone().addScaledVector(axis,distance),bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize(),along=(a*a-b*b+distance*distance)/(2*distance);
 const elbowGoal=origin.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,a*a-along*along)));
 const rotate=(bone,from,to)=>{const delta=new T.Quaternion().setFromUnitVectors(from.normalize(),to.normalize()),world=bone.getWorldQuaternion(new T.Quaternion()).premultiply(delta);bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world)).normalize();bone.updateWorldMatrix(false,true);};
 rotate(upper,elbow.clone().sub(origin),elbowGoal.sub(origin));
 lower.getWorldPosition(elbow);hand.getWorldPosition(end);rotate(lower,end.sub(elbow),goal.sub(elbow));
 const world=desired.clone().multiply(grip);hand.quaternion.copy(hand.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world)).normalize();
 // Bound twist speed through nearly straight elbows and rapid attack cancellation.
 for(const [i,bone]of [upper,lower,hand].entries()){if(previous[i])bone.quaternion.copy(previous[i].rotateTowards(bone.quaternion,Math.max(.001,dt)*18));else previous[i]=bone.quaternion.clone();previous[i].copy(bone.quaternion);bone.updateWorldMatrix(false,true);}
}
export function animateGuardian(g,t,speed,dt){
 const d=g.userData,u=d.shotSerial?T.MathUtils.clamp(d.reloadPhase??1,0,1):1;let pose=guardianPose(d.meleeCombo||0,u);
 if(d.cancelAttack){d.cancelAttack=false;d.cancelPose=d.lastPose?.slice();d.cancelTime=0;}
 if(d.cancelPose){d.cancelTime+=dt;const k=Math.min(1,d.cancelTime/.16),blend=k*k*(3-2*k);pose=pose.map((v,i)=>d.cancelPose[i]+(v-d.cancelPose[i])*blend);if(k===1)d.cancelPose=null;}d.lastPose=pose.slice();
 d.brace=(d.brace||0)+((d.dashTime>0?1:0)-(d.brace||0))*(1-Math.exp(-dt*22));
 d.rig.position.z=pose[14]*.65;d.rig.position.y=pose[15]*.45;
 // Mix weight transfer into the authored pelvis/spine while keeping the walking footfall.
 d.spine.rotateY(pose[12]*.7);d.spine.rotateX(pose[13]*.55+d.brace*.1);
 g.updateMatrixWorld(true);const yaw=g.getWorldQuaternion(new T.Quaternion()),chest=d.aimArm.getWorldPosition(new T.Vector3()).add(d.offArm.getWorldPosition(new T.Vector3())).multiplyScalar(.5);
 for(let i=0;i<2;i++){
  const offset=i*6,hand=i?d.support.rightHand:d.support.hand,upper=i?d.aimArm:d.offArm,lower=i?d.firingForearm:d.offForearm;
  const v=new T.Vector3(-pose[offset]*.7,(pose[offset+1]-.6)*.7,pose[offset+2]*.75);
  if(i===0){v.z+=d.brace*.16;v.y+=d.brace*.05;}else if(u===1)v.z+=Math.sin(d.gaitPhase*Math.PI*2)*.025*d.blend;
  const desired=yaw.clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(pose[offset+3],-pose[offset+4],-pose[offset+5])));
  const previous=d.guardianPrevious[i]||(d.guardianPrevious[i]=[]);
  arm(upper,lower,hand,chest.clone().add(v.applyQuaternion(yaw)),new T.Vector3(i?-.6:.6,-1,-.2).applyQuaternion(yaw),d.grips[i],desired,previous,dt);
 }
}
