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
 const t=clamp(1-remaining/LINGYA_HOP_DURATION),air=pulse(t,.08,.36,.78),push=pulse(t,0,.12,.32),land=pulse(t,.64,.82,1),reach=smooth(.32,.76,t),weight=smooth(0,.10,t)*(1-smooth(.85,1,t));
 return{t,air,push,land,reach,weight,height:air*.12-push*.12-land*.11,tuck:air*.55,pitch:push*.18+air*.12+land*.16,bank:air*.24+push*.08,twist:air*.24};
}
// A leading foot reaches the landing first; the trailing foot pushes off, folds, then catches up.
export function lingyaHopFoot(pose,lead,lateral,forward){
 const {air,push,land,reach}=pose,extension=lead?-.12*(1-reach)+.42*reach:-.32*(1-reach)+.08*reach;
 return{x:lateral*extension,y:-.96+push*.15+land*.13+air*(lead?.16*(1-reach):.34*(1-reach)),z:forward*extension-(lead?0:.12*air*(1-reach))};
}
