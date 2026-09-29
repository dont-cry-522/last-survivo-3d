import * as T from './vendor/three.module.js';
// Reach, catch, pull, recovery. Positions are fractions of each character's arm length.
const strokeKeys=[[0,.16,-.28,.55],[.2,.30,-.30,.76],[.62,.52,-.65,-.24],[.83,.13,-.48,-.28],[1,.16,-.28,.55]];
export function swimStroke(phase){
 const u=((phase%1)+1)%1;let i=0;while(u>strokeKeys[i+1][0])i++;
 const a=strokeKeys[i],b=strokeKeys[i+1],t=(u-a[0])/(b[0]-a[0]),blend=t*t*(3-2*t);
 return{x:a[1]+(b[1]-a[1])*blend,y:a[2]+(b[2]-a[2])*blend,z:a[3]+(b[3]-a[3])*blend};
}
// Normalized limb targets: the heavy swimmer sculls, the hunter glides,
// and the keeper makes compact strokes with a delayed frog kick.
export const HERO_SWIM={guardian:{pace:.57,lean:.62,sink:.45},tide:{pace:.65,lean:.90,sink:.35},lingya:{pace:.72,lean:.74,sink:.24}};
export function heroSwimPose(kind,phase,moving,attacking=0){
 const profile=HERO_SWIM[kind];if(!profile)return null;
 const u=((phase%1)+1)%1,a=u*Math.PI*2,m=T.MathUtils.clamp(moving,0,1),stroke=swimStroke(u),lift=(1-Math.cos(a-.65))*.5;
 const left=kind==='guardian'?{x:.24+Math.sin(a)*.06,y:-.32,z:.43+Math.cos(a)*.09}:{x:stroke.x*(kind==='tide'?.90:.78),y:stroke.y*(kind==='tide'?1:.85),z:stroke.z*(kind==='tide'?1:.78)};
 left.x=T.MathUtils.lerp(.30+Math.sin(a)*.055,left.x,m);left.y=T.MathUtils.lerp(-.48,left.y,m);left.z=T.MathUtils.lerp(.24+Math.cos(a)*.065,left.z,m);
 const right=kind==='guardian'?{x:-.18,y:-.35,z:.24}:kind==='tide'?{x:-.20,y:-.28,z:.43}:{x:-.22,y:-.27,z:.36};
 const legMove=m*(1-T.MathUtils.clamp(attacking,0,1)*.75),legs=[1,-1].map(side=>{
  if(kind==='tide'){const kick=Math.sin(a*2+side*Math.PI/2);return{x:side*.085,y:T.MathUtils.lerp(-.84,-.28,legMove)+kick*.055,z:-.76*legMove+kick*(.06+.05*legMove)};}
  const tuck=kind==='lingya'?lift:(1-Math.cos(a+side*.38))*.5;
  return{x:side*(.08+tuck*(.10+.10*legMove)),y:T.MathUtils.lerp(-.84,-.29,legMove)+tuck*.13,z:-.76*legMove+tuck*(.08+.22*legMove)};
 });
 return{left,right,legs,lean:profile.lean*m+.07,bank:Math.sin(a)*(kind==='tide'?.07:.025)*m,bob:Math.sin(a-.5)*(kind==='guardian'?.014:.022),foot:.12+lift*.14};
}
const v=()=>new T.Vector3(),origin=v(),elbow=v(),tip=v(),axis=v(),pole=v(),goal=v(),from=v(),to=v(),offset=v();
const world=new T.Quaternion(),parent=new T.Quaternion(),delta=new T.Quaternion(),startUpper=new T.Quaternion(),startLower=new T.Quaternion();
// Two-bone solve works with both authored skeleton axes and the small procedural hero.
export function swimLimb(g,upper,lower,end,point,bend,weight,save){
 if(!upper||!lower||!end||weight<.001)return;
 save(upper);save(lower);startUpper.copy(upper.quaternion);startLower.copy(lower.quaternion);
 upper.getWorldPosition(origin);lower.getWorldPosition(elbow);end.getWorldPosition(tip);
 const a=origin.distanceTo(elbow),b=elbow.distanceTo(tip);if(a<.001||b<.001)return;
 g.getWorldQuaternion(world);offset.set(point.x,point.y,point.z).multiplyScalar(a+b).applyQuaternion(world);
 const distance=T.MathUtils.clamp(offset.length(),Math.abs(a-b)+.005,(a+b)*.96);axis.copy(offset).normalize();goal.copy(origin).addScaledVector(axis,distance);
 pole.set(...bend).applyQuaternion(world);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
 const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
 from.copy(elbow).sub(origin).normalize();elbow.copy(origin).addScaledVector(axis,along).addScaledVector(pole,height);to.copy(elbow).sub(origin).normalize();delta.setFromUnitVectors(from,to);
 upper.getWorldQuaternion(world);world.premultiply(delta);upper.parent.getWorldQuaternion(parent).invert();upper.quaternion.copy(parent.multiply(world)).normalize();upper.updateWorldMatrix(false,true);
 lower.getWorldPosition(origin);end.getWorldPosition(tip);from.copy(tip).sub(origin).normalize();to.copy(goal).sub(origin).normalize();delta.setFromUnitVectors(from,to);
 lower.getWorldQuaternion(world);world.premultiply(delta);lower.parent.getWorldQuaternion(parent).invert();lower.quaternion.copy(parent.multiply(world)).normalize();
 upper.quaternion.slerp(startUpper,1-weight);lower.quaternion.slerp(startLower,1-weight);upper.updateWorldMatrix(false,true);
}
