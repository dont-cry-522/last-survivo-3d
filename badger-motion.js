const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// Four separate footfalls at a walk; a short low bound replaces paddling during a strike.
export function badgerAttack(state,progress){const p=clamp(progress);
 if(state==='wind')return{crouch:smooth(p)*.055,air:0,reach:0,jaw:smooth(p)*.18,impact:0};
 if(state==='pounce')return{crouch:0,air:Math.sin(Math.PI*p)*.17,reach:Math.sin(Math.PI*p),jaw:(1-smooth((p-.48)/.18))*.32,impact:Math.sin(Math.PI*clamp((p-.52)/.3))};
 if(state==='recover')return{crouch:Math.sin(Math.PI*p)*.045,air:0,reach:0,jaw:0,impact:0};
 return{crouch:0,air:0,reach:0,jaw:0,impact:0};
}
export function badgerCadence(speed){return Math.min(3.2,Math.max(0,speed)/(.68+Math.min(1,speed/6)*1.55));}

const pulse=(t,start,peak,end)=>smooth((t-start)/(peak-start))*(1-smooth((t-peak)/(end-peak)));
// Small gestures with held poses and quiet gaps, rather than continuous sine-wave scanning.
export function badgerIdle(time){
 const t=time%8.6,look=(smooth((t-2.4)/.6)-smooth((t-4.0)/.7))*.24-(smooth((t-6.1)/.5)-smooth((t-7.3)/.7))*.16;
 return{look,sniff:pulse(t,.5,.78,1.06)+pulse(t,1.23,1.43,1.69),shift:pulse(t,2.9,3.5,4.7)*.010-pulse(t,6.3,6.8,7.7)*.008,leftEar:pulse(t,2.0,2.09,2.3)*.09,rightEar:pulse(t,5.3,5.4,5.65)*.075,tail:pulse(t,4.8,5.2,5.8)*.08,blink:1-.93*(pulse(t,2.15,2.22,2.32)+pulse(t,6.5,6.57,6.68))};
}
