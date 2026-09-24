const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const pulse=(t,a,b,c)=>smooth(a,b,t)*(1-smooth(b,c,t));
export const WEAPON_RECOVERY={rifle:.22,shotgun:.48,crossbow:.26,shuriken:.46,fire:.62,dark:.68,shade:.36,shadowblade:.56,grimoire:.72};
// Cycle fractions also drive the audible mechanism cues, so haste preserves sync.
export const WEAPON_CUES={rifle:[],shotgun:[.25,.6],crossbow:[.22,.68],shuriken:[.68],fire:[.68],dark:[.68],shade:[],shadowblade:[],grimoire:[.58]};
export function weaponGesture(id,age,cycle=1,period=1){
  const duration=WEAPON_RECOVERY[id]||.3;
  const t=age/Math.min(duration,Math.max(.12,period*.9));
  const peak={rifle:.10,shotgun:.14,crossbow:.12,shuriken:.24,fire:.3,dark:.4,shade:.18,shadowblade:.32,grimoire:.46}[id]||.2;
  return {kick:pulse(t,0,peak,1),sweep:pulse(t,.04,peak+.12,1),
    draw:age<period&&cycle<1?pulse(cycle,.12,id==='crossbow'?.53:.42,id==='crossbow'?.82:.78):0,
    gather:pulse(t,.38,.68,1)};
}
export function shotStarted(d,attack,previous){
  const fired=d.shotSerial===undefined?attack>previous+.025:d.shotSerial!==(d.lastShotSerial||0);
  d.lastShotSerial=d.shotSerial;return fired;
}

export function weaponCuePhases(id,period){const scale=['crossbow','shotgun','rifle'].includes(id)?1:Math.min(WEAPON_RECOVERY[id],Math.max(.12,period*.9))/period;return (WEAPON_CUES[id]||[]).map(t=>t*scale);}
