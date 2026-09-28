// Original material layers for the three new heroes. Variants follow resolved combo strokes.
export const NEW_WEAPON_SOUNDS={shield:[.23,.34,.16],hammer:[.34,.52,.18],harpoon:[.32,.38,.2],boomerang:[.38,.24,.25]};
export function newWeaponSample(id,event,rate,variant=0){
 const cfg=NEW_WEAPON_SOUNDS[id],ix={shot:0,impact:1,mechanism:2}[event];if(!cfg||ix===undefined)return null;
 variant=Math.max(0,Math.min(2,Math.trunc(variant)));const duration=cfg[ix],out=new Float32Array(Math.ceil(rate*duration));let seed=913+Object.keys(NEW_WEAPON_SOUNDS).indexOf(id)*701+variant*113,low=0,mid=0,phase=0;
 for(let i=0;i<out.length;i++){const t=i/rate,u=i/(out.length-1);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;
  low+=(n-low)*(1-Math.exp(-2*Math.PI*160/rate));mid+=(n-mid)*(1-Math.exp(-2*Math.PI*(id==='harpoon'?2900:1700)/rate));const air=mid-low,high=n-mid,body=low*3;
  const tail=Math.exp(-t*(id==='hammer'?10:18)),swing=Math.sin(Math.PI*u)**2,snap=Math.exp(-t*95);phase+=2*Math.PI*(id==='hammer'?85-42*u:id==='shield'?130-50*u:210-100*u)/rate;let v=0;
  if(event==='shot'){
   if(id==='hammer')v=(body*.65+air*.8)*swing*(variant?1.3:1)+high*.07*Math.exp(-Math.abs(u-.3)*18);
   else if(id==='shield')v=(air*.8+body*.45)*swing+high*.14*Math.exp(-Math.abs(t-.06)*90);
   else if(id==='harpoon'){const pulse=variant===2?Math.exp(-(((u-.3)/.18)**2))+.65*Math.exp(-(((u-.73)/.13)**2)):swing;v=(air*(variant===1?.95:.55)+high*.12)*pulse+Math.sin(phase)*.06*swing;}
   else v=(air*.95+high*.13)*swing*(.28+.72*Math.sin(t*Math.PI*2*(26-12*u))**2);
  }else if(event==='impact'){
   if(id==='hammer')v=(body*1.5+Math.sin(phase)*.65)*tail*(variant?1.2:1)+air*.7*Math.exp(-t*35)+high*.27*(snap+.45*Math.exp(-Math.abs(t-.075)*140));
   else if(id==='shield')v=(body*1.1+air*.5)*tail+(Math.sin(t*2*Math.PI*173)+.4*Math.sin(t*2*Math.PI*391))*.24*Math.exp(-t*22)+high*.16*snap;
   else if(id==='harpoon')v=(body*.7+air*.8)*tail+Math.sin(t*2*Math.PI*(variant===2?340:560))*.15*Math.exp(-t*32)+air*.4*Math.exp(-Math.abs(t-(variant===2?.13:.065))*45);
   else v=(body*.85+air*.8)*Math.exp(-t*25)+(Math.sin(t*2*Math.PI*760)+Math.sin(t*2*Math.PI*1130)*.32)*.18*Math.exp(-t*55)+high*.16*snap;
  }else if(id==='boomerang')v=variant?(body+air*.35)*Math.exp(-t*35)+air*.2*Math.exp(-Math.abs(t-.055)*100):air*.65*swing*(.3+.7*Math.sin(t*105)**2);
  else v=air*.4*swing+high*.15*Math.exp(-Math.abs(t-.06)*80);
  out[i]=Math.tanh(v)*Math.min(1,t/.004,(duration-t)/.022)*.68;
 }
 return out;
}
