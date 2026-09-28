export const LINGYA_HOP_DURATION=.48;
export const LINGYA_HOP_DISTANCE=6.2;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const pulse=(t,a,b,c)=>smooth(a,b,t)*(1-smooth(b,c,t));
// Integrate a short acceleration, cruise and longer braking phase. Exact distance at any frame rate.
export function sideHopTravel(remaining){const t=clamp(1-remaining/LINGYA_HOP_DURATION),a=.12,b=.76,c=1-b;let area;
 if(t<a){const q=t/a;area=a*(q**3-.5*q**4);}else if(t<b)area=a*.5+t-a;else{const q=(t-b)/c;area=a*.5+b-a+c*(q-q**3+.5*q**4);}
 return LINGYA_HOP_DISTANCE*area/(1-(a+c)/2);
}
export function lingyaHopScale(slow,depth=0){return depth>.42?slow:Math.max(.9,slow);}
export function lingyaHopPose(remaining){
 const t=clamp(1-remaining/LINGYA_HOP_DURATION),air=pulse(t,.06,.38,.80),push=pulse(t,0,.08,.23),land=pulse(t,.68,.82,1),reach=pulse(t,.4,.68,.92);
 return{air,push,land,reach,height:air*.30-push*.055-land*.075,tuck:air*.9,pitch:push*.13-air*.12+land*.16,bank:air*.16,twist:air*.16};
}
