// Two original arrangements, with cached material instruments rather than a shared beep melody.
export function instrumentSample(kind,note,rate){
 const duration=1.8,out=new Float32Array(Math.ceil(rate*duration)),f=440*2**((note-69)/12);let seed=173+note*37,breath=0;
 for(let i=0;i<out.length;i++){const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;breath+=(n-breath)*(1-Math.exp(-2*Math.PI*1400/rate));const p=2*Math.PI*f*(t+.0006*Math.sin(t*2*Math.PI*4.8)),edge=Math.min(1,t/.009,(duration-t)/.04);let v;
  if(kind==='lute')v=(Math.sin(p)*Math.exp(-t*3.8)+.38*Math.sin(p*2)*Math.exp(-t*7)+.22*Math.sin(p*3)*Math.exp(-t*11)+.1*Math.sin(p*4)*Math.exp(-t*15)+breath*.2*Math.exp(-t*70))*.65;
  else if(kind==='reed')v=(Math.sin(p)+.20*Math.sin(p*3)+.075*Math.sin(p*5)+breath*.09)*Math.min(1,t/.07)*Math.exp(-t*.8)*.6;
  else if(kind==='wood')v=(Math.sin(p)*Math.exp(-t*5)+.4*Math.sin(p*2.76)*Math.exp(-t*12)+.12*Math.sin(p*5.4)*Math.exp(-t*18)+breath*.24*Math.exp(-t*60))*.65;
  else v=(Math.sin(p)+.24*Math.sin(p*2)+.1*Math.sin(p*3))*Math.min(1,t/.16)*Math.exp(-t*.65)*.5;
  out[i]=Math.tanh(v)*edge;
 }return out;
}
export function scoreBiome(a,th,b,t,step,pressure){
 const sand=th.arrangement==='sand',bar=Math.floor(b/8),root=th.root,chord=th.chords[Math.floor(bar/2)%4],n=th.lead[b%th.lead.length];
 const note=(kind,n,d,v,pan=0)=>a.musicNote(kind,n,d,v,t,pan);
 // The melody keeps breathing space while danger brings a bass pulse and offbeat percussion.
 if(n)note(sand?'reed':'bow',root+n,step*(sand?2.2:2.8),sand?.16:.18,.16);
 if(b%2===0){const arp=[0,7,12,3][(b/2)%4];note(sand?'lute':'wood',root+chord+arp,step*2,.22,-.25);}
 if(b%8===0){note('bow',root-12+chord,step*7,.12,-.2);note('reed',root+chord+7,step*5,.055,.4);}
 if(b%4===0||pressure>.6&&b%4===3){a.voice(sand?110:72,.26,.065+pressure*.12,'sine',sand?49:32,t,'music');a.noise(.08,.018+pressure*.025,sand?900:450,120,t,'music');}
 if(sand&&(b%8===3||b%8===6)||!sand&&b%8===5){a.noise(.07,.028+pressure*.045,sand?2600:1250,500,t,'music');note('wood',root+24,.11,.07,.35);}
 if(pressure>.3&&b%2===1){note(sand?'lute':'wood',root+chord+7,step*.8,.16*pressure,.3);a.noise(.045,.025*pressure,4800,2600,t,'music');}
 if(pressure>.65&&b%2===0)note('bow',root-12+chord,step*.7,.16*pressure);
 if(b%16===12)a.noise(step*3,.018+pressure*.02,sand?750:1100,sand?250:350,t,'music');
}
