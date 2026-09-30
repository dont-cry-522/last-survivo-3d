// Damp breath, layered gas spray and a soft poison sac with tiny wet bubbles.
// All voices use the existing bounded audio pool; damage ticks remain silent.
const EVENTS={mirageCharge:'charge',mirageShot:'shot',mirageBurst:'hit',mirageHit:'hit',mirageHide:'hide',mirageDecoy:'decoy',mirageDecoyHit:'decoyHit',mirageBreak:'break',mirageBloom:'bloom',mirageReveal:'reveal',mirageShield:'shield'};
const charging=Symbol('mirage-charge');
const SAMPLES={charge:{duration:.18,air:.8,mucus:.32,bubbles:2,bubbleGain:.025},shot:{duration:.38,air:1.32,mucus:.75,bubbles:3,bubbleGain:.065},impact:{duration:.56,air:.92,mucus:.70,bubbles:5,bubbleGain:.09}};
// Shared by GameAudio's weapon registry and the actual shot/hit event dispatch.
// A flower lantern has no mechanical reload click.
export function mirageSample(event,rate,variant=0){
 const profile=SAMPLES[event];if(!profile)return null;
 const hit=event==='impact',charge=event==='charge',{duration}=profile,data=new Float32Array(Math.ceil(duration*rate));let seed=1811+variant*37+(hit?109:charge?263:0);
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},coefficient=f=>1-Math.exp(-2*Math.PI*f/rate);
 // Only these tiny, isolated bubbles have a pitch; the breath itself is noise.
 const bubbles=Array.from({length:profile.bubbles},(_,i)=>({start:(charge?.035:.018)+i*(charge?.055:hit?.043:.075)+random()*.018,duration:.009+random()*.014,frequency:430+random()*350,gain:.55+random()*.45}));
 const airFloor=coefficient(420),wetCeiling=coefficient(950),wetFloor=coefficient(240),flutterRate=coefficient(28),rateGain=Math.sqrt(rate/22050);
 let air=0,airLow=0,wet=0,wetLow=0,flutter=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate,u=t/duration,n=random()*2-1,damp=random()*2-1;
  flutter+=(damp-flutter)*flutterRate;
  const irregular=Math.max(.45,Math.min(1.35,.9+flutter*9)),cutoff=charge?900+1800*u:hit?2400-1400*u:1900-850*u;
  air+=(n-air)*coefficient(cutoff);airLow+=(n-airLow)*airFloor;wet+=(damp-wet)*wetCeiling;wetLow+=(damp-wetLow)*wetFloor;
  const vapor=(air-airLow)*rateGain,slime=(wet-wetLow)*rateGain;
  let droplets=0;for(const b of bubbles){const age=t-b.start;if(age<=0||age>=b.duration)continue;const q=age/b.duration,envelope=Math.sin(Math.PI*q)**2*Math.exp(-q*2);droplets+=Math.sin(2*Math.PI*b.frequency*(age-.36*age*age/b.duration))*envelope*b.gain;}
  let texture;
  if(charge){
   const inhale=u**1.15*Math.sin(Math.PI*u)**.55;
   texture=(vapor*profile.air+slime*profile.mucus)*inhale*irregular+droplets*profile.bubbleGain;
  }else if(hit){
   // Rounded wet rupture, then a spreading hiss; no dry crack or sub-bass hit.
   const rupture=(1-Math.exp(-t/.007))*Math.exp(-t/.048),sizzle=(1-Math.exp(-t/.027))*Math.exp(-t/.18);
   texture=vapor*profile.air*(rupture*.8+sizzle*.72*irregular)+slime*profile.mucus*rupture+droplets*profile.bubbleGain;
  }else{
   const spray=(1-Math.exp(-t/.018))*Math.exp(-t/.22),stir=Math.sin(Math.PI*u)**1.2;
   texture=vapor*profile.air*spray*irregular+slime*profile.mucus*stir*(.35+Math.abs(flutter)*5)+droplets*profile.bubbleGain;
  }
  const edge=Math.min(1,t/.006)*Math.min(1,(duration-t)/(charge?.024:.032));data[i]=Math.tanh(texture*1.9)*edge*.68;
 }
 return data;
}
function stopCharge(sound){for(const source of sound.weaponSources||[]){if(!source[charging])continue;source[charging]=false;source.stop();}}
export function mirageSound(sound,kind){
 const event=EVENTS[kind];if(!event)return false;
 // Release/cancellation must stop the pending inhale even if its new sound is gated.
 if(event==='shot'||event==='hide')stopCharge(sound);
 if(!sound.allow('mirage-'+event,event==='shot'?.065:event==='hit'?.10:event==='decoyHit'?.13:.22))return false;
 if(event==='charge'){
  stopCharge(sound);const before=new Set(sound.weaponSources),played=sound.weapon('miasmalantern','charge',0,.58);
  for(const source of sound.weaponSources||[])if(!before.has(source))source[charging]=true;
  return played;
 }
 if(event==='shot'||event==='hit')return sound.weapon('miasmalantern',event==='shot'?'shot':'impact',0,event==='shot'?.68:.69);
 const before=sound.proceduralSources?new Set(sound.proceduralSources):null;
 if(event==='hide'){sound.noise(.30,.058,1450,350);sound.voice(220,.31,.021,'sine',95);}
 else if(event==='decoy'){sound.noise(.17,.021,2700,1800);sound.voice(420,.20,.010,'sine',610);}
 else if(event==='decoyHit'){sound.noise(.16,.025,1900,510);sound.voice(300,.16,.013,'sine',170);}
 else if(event==='break')sound.noise(.22,.027,950,210);
 else if(event==='bloom'){sound.weapon('miasmalantern','impact',1,.44);sound.noise(.40,.028,1700,720);}
 else if(event==='reveal'){sound.noise(.19,.032,850,2300);sound.voice(190,.19,.011,'sine',325);}
 else if(event==='shield'){sound.noise(.23,.027,2000,850);sound.voice(420,.27,.020,'sine',620);}
 // Existing pause/end cleanup stops weaponSources. Register only these new
 // procedural voices; preserve GameAudio's own disconnect/node accounting.
 if(before&&sound.weaponSources)for(const source of sound.proceduralSources){if(before.has(source))continue;const ended=source.onended;sound.weaponSources.add(source);source.onended=function(...args){sound.weaponSources.delete(source);ended?.apply(this,args);};}
 return true;
}
