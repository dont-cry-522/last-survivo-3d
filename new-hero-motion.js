// Attack anticipation and recovery share the projectile/melee release clock.
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
export function newHeroAttack(kind,age,period=1){
 const duration=Math.min(kind==='tide'?.48:.55,Math.max(.12,period*.9)),u=clamp(age/duration),impact=kind==='tide'?.34:.24;
 const wind=smooth(0,impact*.48,u)*(1-smooth(impact*.48,impact,u));
 const drive=smooth(impact*.48,impact,u)*(1-smooth(impact,1,u));
 const follow=smooth(impact,impact+.20,u)*(1-smooth(impact+.20,1,u));
 return{u,wind,drive,follow,weight:smooth(0,.10,u)*(1-smooth(.72,1,u)),clipPhase:u<impact?u/impact*.42:.42+(u-impact)/(1-impact)*.58};
}
const carryProfiles={guardian:[1.8,.009,.022,.040],tide:[2.1,.014,.030,.065],lingya:[2.6,.012,.042,.080]};
// Quiet secondary motion; amplitudes are radians/metres, not gameplay movement.
export function heroCarryPose(kind,time,phase,moving,ready){
 const p=carryProfiles[kind];
 if(!p)return{breath:0,shoulder:0,hand:0};
 const free=1-clamp(ready)*.75,step=Math.sin(phase*Math.PI*2)*clamp(moving);
 return{breath:Math.sin(time*p[0])*p[1]*free,shoulder:step*p[2]*free,hand:step*p[3]*free};
}
export function committedWeaponYaw(facing,aim,attackAngle,weight){
 const desired=Number.isFinite(aim)?aim:facing;if(!Number.isFinite(attackAngle))return desired;
 return desired+Math.atan2(Math.sin(attackAngle-desired),Math.cos(attackAngle-desired))*clamp(weight*3);
}
