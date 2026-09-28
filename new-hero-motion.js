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
