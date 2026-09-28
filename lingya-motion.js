export const LINGYA_HOP_DURATION=.42;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const pulse=(t,a,b,c)=>smooth(a,b,t)*(1-smooth(b,c,t));
export function sideHopTravel(remaining){const t=clamp(1-remaining/LINGYA_HOP_DURATION);return 3.8*(t-Math.sin(2*Math.PI*t)/(2*Math.PI));}
export function lingyaHopPose(remaining){
 const t=clamp(1-remaining/LINGYA_HOP_DURATION),air=pulse(t,.10,.46,.88),push=pulse(t,0,.10,.30),land=pulse(t,.76,.9,1);
 return{air,push,land,height:air*.34-(push+land)*.055,tuck:air*.9,pitch:push*.12-air*.08+land*.13,bank:air*.24,twist:air*.25};
}
