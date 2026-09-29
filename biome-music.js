// Original 16-bar adventure themes. Chords retain their major/minor quality.
const bar=(chord,lead)=>({chord,lead});
const I=[0,4,7],ii=[2,5,9],iii=[4,7,11],IV=[5,9,12],V=[7,11,14],vi=[9,12,16];
export const BIOME_THEMES={
 sand:{arrangement:'sand',bpm:110,root:50,meter:8,bars:[
  bar(I,  [12,null,16,19,16,null,14,null]),
  bar(vi, [16,null,12,null,9,null,12,14]),
  bar(IV, [17,null,16,14,17,null,21,null]),
  bar(V,  [19,null,14,null,11,null,null,null]),
  bar(I,  [12,null,16,19,24,null,23,21]),
  bar(iii,[19,null,16,null,14,16,19,null]),
  bar(IV, [17,null,21,19,17,null,16,14]),
  bar(V,  [14,null,19,null,14,null,null,null]),
  bar(vi, [21,null,19,16,21,null,24,null]),
  bar(IV, [21,null,17,null,16,null,14,null]),
  bar(I,  [19,null,16,14,12,null,16,null]),
  bar(V,  [14,null,19,null,23,null,null,null]),
  bar(IV, [21,null,17,16,17,null,21,null]),
  bar(V,  [19,null,14,null,11,null,14,null]),
  bar(I,  [16,null,19,16,12,null,null,null]),
  bar(I,  [12,null,null,null,null,null,null,null])
 ]},
 coast:{arrangement:'coast',bpm:102,root:55,meter:6,bars:[
  bar(I,  [19,null,16,12,null,null]),
  bar(IV, [17,null,16,17,null,21]),
  bar(vi, [21,null,19,16,null,null]),
  bar(V,  [19,null,16,14,null,null]),
  bar(I,  [16,null,19,24,null,23]),
  bar(IV, [21,null,17,17,null,16]),
  bar(ii, [14,null,17,21,null,19]),
  bar(V,  [19,null,null,14,null,null]),
  bar(vi, [21,null,24,21,null,19]),
  bar(IV, [17,null,21,24,null,null]),
  bar(I,  [19,null,16,12,null,14]),
  bar(V,  [14,null,19,23,null,null]),
  bar(IV, [21,null,17,17,null,16]),
  bar(V,  [19,null,14,11,null,14]),
  bar(I,  [16,null,19,12,null,null]),
  bar(I,  [12,null,null,null,null,null])
 ]}
};

export function instrumentSample(kind,note,rate){
 const duration=1.8,out=new Float32Array(Math.ceil(rate*duration)),f=440*2**((note-69)/12);
 const wind=kind==='reed'||kind==='flute';let seed=173+note*37,breath=0,phase=0;
 for(let i=0;i<out.length;i++){
  const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const n=seed/2147483648-1;breath+=(n-breath)*(1-Math.exp(-2*Math.PI*1400/rate));
  // Subtle delayed vibrato in cents, independent of note frequency.
  const vibrato=wind?4*Math.min(1,Math.max(0,t-.18)/.3)*Math.sin(t*2*Math.PI*4.8):0;
  phase+=2*Math.PI*f*2**(vibrato/1200)/rate;
  const p=phase,edge=Math.max(0,Math.min(1,t/.012,(duration-t)/.055));let v;
  if(kind==='lute')v=(Math.sin(p)*Math.exp(-t*3.3)+.32*Math.sin(p*2)*Math.exp(-t*6)+.16*Math.sin(p*3)*Math.exp(-t*9)+.065*Math.sin(p*4)*Math.exp(-t*13)+breath*.09*Math.exp(-t*65))*.68;
  else if(kind==='reed')v=(Math.sin(p)+.13*Math.sin(p*2)+.10*Math.sin(p*3)+breath*.028)*Math.min(1,t/.045)*Math.exp(-t*.65)*.63;
  else if(kind==='flute')v=(Math.sin(p)+.15*Math.sin(p*2)+.035*Math.sin(p*3)+breath*.012)*Math.min(1,t/.055)*Math.exp(-t*.5)*.65;
  else if(kind==='wood')v=(Math.sin(p)*Math.exp(-t*4.5)+.18*Math.sin(p*4)*Math.exp(-t*12)+.045*Math.sin(p*8)*Math.exp(-t*19)+breath*.08*Math.exp(-t*70))*.68;
  else v=(Math.sin(p)+.19*Math.sin(p*2)+.085*Math.sin(p*3))*Math.min(1,t/.12)*Math.exp(-t*.75)*.52;
  out[i]=Math.tanh(v)*edge;
 }
 return out;
}

export function scoreBiome(a,th,b,t,step,pressure){
 const sand=th.arrangement==='sand',meter=th.meter,barIndex=Math.floor(b/meter)%th.bars.length;
 const beat=b%meter,{chord,lead}=th.bars[barIndex],root=th.root,n=lead[beat];
 const note=(kind,pitch,d,v,pan=0)=>a.musicNote(kind,pitch,d,v,t,pan);
 const combat=Math.max(0,Math.min(1,(pressure-.18)/.82));
 if(n!==null){
  let length=1;while(beat+length<meter&&lead[beat+length]===null)length++;
  note(sand?'reed':'flute',root+n,Math.min(3.4,length)*step-.035,sand?.235:.22,.10);
 }
 // Four-square caravan strum versus a lilting 6/8 harbour accompaniment.
 if(sand?beat%2===0:beat===0||beat===2||beat===3||beat===5){
  const i=sand?Math.floor(beat/2):[0,0,1,2,0,1][beat];
  note(sand?'lute':'wood',root+chord[[0,1,2,1][i]],step*1.75,sand?.15:.115,-.28);
 }
 if(beat===0||beat===(sand?4:3)){
  note('lute',root-12+chord[beat===0?0:2],step*1.65,.17+combat*.055,-.08);
  if(beat===0){note('bow',root+chord[1],step*3,.045,.3);note('bow',root+chord[2],step*3,.035,-.3);}
  a.voice(sand?125:115,.16,.035+combat*.08,'sine',sand?66:62,t,'music');
  a.noise(.055,.009+combat*.012,950,380,t,'music');
 }
 if(beat===(sand?6:4)||sand&&beat===3){
  a.noise(.07,.017+combat*.035,sand?2200:1700,800,t,'music');
  a.voice(sand?185:210,.085,.02+combat*.035,'sine',sand?140:170,t,'music');
 }
 if(combat>0){
  // Rhythmic urgency without dissonant drones or replacing the melody.
  if(beat%2===1)note('lute',root+chord[beat%3],step*.72,.115*combat,.3);
  a.noise(.035,.026*combat,5800,3800,t,'music','highpass');
  if(beat===meter-1&&barIndex%4===3)a.voice(155,.12,.08*combat,'sine',72,t,'music');
 }
}

export function biomeThreat(a,theme,beat,t,boss){
 const {chord}=theme.bars[Math.floor(Math.max(0,beat-1)/theme.meter)%theme.bars.length];
 // In-key drum/strum pickup instead of a chromatic horror sting.
 for(const [i,n]of chord.entries())a.musicNote('lute',theme.root+n,.34,boss?.15:.11,t+i*.065,(i-1)*.2);
 a.voice(145,.22,boss?.17:.12,'sine',58,t,'music');
 a.noise(.13,boss?.10:.055,2300,650,t,'music');
}
