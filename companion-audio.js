// Original woodland foley: padded paws, breathy animal calls, cloth and dry twigs.
export const COMPANION_SOUNDS={step:.14,sniff:.48,pounce:.32,bite:.19,hurt:.30,down:.68,revive:.72,dodge:.30,dodgeLand:.17,trapSet:.26,trapSnap:.28};
export function companionSample(event,rate){
 const duration=COMPANION_SOUNDS[event];if(!duration)return null;
 const data=new Float32Array(Math.ceil(rate*duration));let seed=731+Object.keys(COMPANION_SOUNDS).indexOf(event)*211,low=0,body=0,phase=0;
 for(let i=0;i<data.length;i++){
  const t=i/rate,u=i/(data.length-1);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
  low+=(noise-low)*(1-Math.exp(-2*Math.PI*1700/rate));body+=(noise-body)*(1-Math.exp(-2*Math.PI*180/rate));
  const breath=low-body,tail=Math.exp(-u*6),bell=Math.sin(Math.PI*u)**2;
  const f=event==='hurt'?330-140*u:event==='down'?185-100*u:event==='revive'?180+105*u:155-55*u;
  phase+=2*Math.PI*f*(1+.035*Math.sin(t*57))/rate;
  const throat=(Math.sin(phase)+.45*Math.sin(phase*2)+.22*Math.sin(phase*3))*(.7+.3*Math.sin(t*93));let v;
  if(event==='step')v=(body*2.2+breath*.18)*tail;
  else if(event==='sniff')v=breath*(Math.exp(-(((u-.22)/.13)**2))+.7*Math.exp(-(((u-.67)/.12)**2)))*.5;
  else if(event==='pounce')v=(throat*.20+body*.9)*bell+breath*.32*Math.sin(Math.PI*u);
  else if(event==='bite')v=(body*2.5+breath*.55)*tail+breath*.32*Math.exp(-Math.abs(t-.052)*140);
  else if(event==='hurt')v=(throat*.33+breath*.13)*Math.sin(Math.PI*u)**.8;
  else if(event==='down')v=(throat*.26+body*.6)*Math.sin(Math.PI*u)*Math.exp(-u*1.4)+breath*.12*Math.exp(-Math.abs(u-.72)*16);
  else if(event==='revive')v=breath*.22*bell+throat*.16*Math.exp(-(((u-.7)/.18)**2))+Math.sin(t*Math.PI*2*(520+120*u))*.045*bell;
  else if(event==='dodge')v=(breath*.65+body*.6)*bell*(.6+.4*Math.sin(u*Math.PI*3)**2);
  else if(event==='dodgeLand')v=(body*2.5+breath*.25)*tail;
  else if(event==='trapSet')v=breath*.6*bell+body*.8*Math.exp(-Math.abs(t-.17)*65);
  else v=(breath*.8+body*1.7)*tail+breath*.45*Math.exp(-Math.abs(t-.07)*100);
  data[i]=Math.tanh(v)*Math.min(1,t/.005,(duration-t)/.018)*.62;
 }
 return data;
}
