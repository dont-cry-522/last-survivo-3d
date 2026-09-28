import * as T from './vendor/three.module.js';
// Longer planted stance, then a raised-knee recovery to pull the boot out of mud.
export function wadeStep(phase){
 const u=((phase%1)+1)%1,stance=u<.62,t=stance?u/.62:(u-.62)/.38;
 const blend=t*t*(3-2*t);
 return{y:-.94+(stance?0:.24*Math.sin(Math.PI*t)**2),z:stance?.24-.48*blend:-.24+.48*blend};
}
const v=()=>new T.Vector3(),origin=v(),elbow=v(),tip=v(),axis=v(),pole=v(),goal=v(),from=v(),to=v(),offset=v();
const world=new T.Quaternion(),parent=new T.Quaternion(),delta=new T.Quaternion(),startUpper=new T.Quaternion(),startLower=new T.Quaternion();
// Two-bone solve works with both authored skeleton axes and the small procedural hero.
export function poseLimb(g,upper,lower,end,point,bend,weight,save){
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
