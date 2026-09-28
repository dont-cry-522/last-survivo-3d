import{HERO_DODGES,heroDodgePose}from'./hero-dodge.js?v=60';
export const LINGYA_HOP_DURATION=HERO_DODGES.lingya.duration;
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
 return{t,air,push,land,reach,weight,height:heroDodgePose('lingya',remaining).height,pitch:push*.18+air*.12+land*.16,bank:air*.24+push*.08,twist:air*.24};
}
