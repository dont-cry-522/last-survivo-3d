// Original creature foley: textured samples, cached per species/event by GameAudio.
// Texture, articulation and timing distinguish creatures, not just oscillator pitch.
export const ENEMY_VOICES = {
  mushroom:  {texture:'wet',   pitch:175, grain:23,  length:.82, color:0xc9d589, shape:'smoke'},
  wolf:      {texture:'growl', pitch:105, grain:31,  length:1,   color:0x9caa9b, shape:'smoke'},
  golem:     {texture:'stone', pitch:58,  grain:17,  length:1.1, color:0xb5a68a, shape:'crystal'},
  spitter:   {texture:'wet',   pitch:89,  grain:42,  length:1.2, color:0xc791d4, shape:'smoke'},
  shaman:    {texture:'wood',  pitch:145, grain:11,  length:1.1, color:0x90dba5, shape:'ember'},
  boss:      {texture:'wood',  pitch:47,  grain:19,  length:1.6, color:0xb9b387, shape:'crystal'},
  snowhare:  {texture:'chirp', pitch:620, grain:15,  length:.65, color:0xe0f2f8, shape:'smoke'},
  frostwolf: {texture:'growl', pitch:152, grain:47,  length:1.15,color:0xb4e9f7, shape:'crystal'},
  yeti:      {texture:'growl', pitch:65,  grain:14,  length:1.3, color:0xcfe5ec, shape:'smoke'},
  icewitch:  {texture:'ice',   pitch:910, grain:7,   length:1.2, color:0x8cd3f5, shape:'crystal'},
  snowtotem: {texture:'ice',   pitch:470, grain:27,  length:1.5, color:0xc1efff, shape:'crystal'},
  frostking: {texture:'growl', pitch:39,  grain:9,   length:1.7, color:0xa6d8f3, shape:'crystal'},
  emberling:{texture:'crackle',pitch:255, grain:63,  length:.8,  color:0xffbd60, shape:'ember'},
  ashstalker:{texture:'hiss',  pitch:120, grain:38,  length:1,   color:0xcd8768, shape:'smoke'},
  lavabrute: {texture:'stone', pitch:43,  grain:29,  length:1.3, color:0xff9250, shape:'ember'},
  cinderwisp:{texture:'fire',  pitch:220, grain:73,  length:1.1, color:0xffcf74, shape:'flame'},
  ashseer:   {texture:'hiss',  pitch:72,  grain:13,  length:1.4, color:0xeaac74, shape:'ember'},
  cinderlord:{texture:'fire',  pitch:32,  grain:23,  length:1.7, color:0xff8950, shape:'flame'}
};
const EVENTS={step:[.12,.24],wind:[.37,.7],attack:[.24,.9],impact:[.27,.85],hurt:[.14,.42],death:[.48,.65]};
export function creatureSample(kind,event,sampleRate){
  const p=ENEMY_VOICES[kind],setting=EVENTS[event];
  if(!p||!setting)return null;
  const duration=setting[0]*p.length,data=new Float32Array(Math.ceil(sampleRate*duration));
  let seed=p.pitch*7919+p.grain*107,low=0,body=0,phase=0;
  const smooth=1-Math.exp(-2*Math.PI*(p.texture==='hiss'?2900:1100)/sampleRate);
  const bodySmooth=1-Math.exp(-2*Math.PI*170/sampleRate);
  const foot=event==='step',fall=event==='death',charge=event==='wind';
  for(let i=0;i<data.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1,t=i/sampleRate,u=i/data.length;
    low+=(noise-low)*smooth;body+=(noise-body)*bodySmooth;
    const sweep=charge?.72+u*.7:fall?1.15-u*.85:1.45-u*.7;
    phase+=2*Math.PI*p.pitch*sweep/sampleRate;
    const pulse=.5+.5*Math.sin(2*Math.PI*p.grain*t),rough=Math.tanh(Math.sin(phase)*3);
    let v;
    switch(p.texture){
      case 'wet': v=Math.sin(phase+2.8*Math.sin(phase*.47))*(.3+.5*pulse**5)+low*.6;break;
      case 'growl': v=rough*(.35+.2*Math.sin(2*Math.PI*27*t))*.6+low*(.35+.4*pulse)+body;break;
      case 'stone': v=low*(.4+1.7*pulse**12)+body*2+Math.sin(phase)*Math.exp(-u*9)*.35;break;
      case 'wood': v=(Math.sin(phase)+.4*Math.sin(phase*2.71))*(.15+.7*pulse**8)+low*.7;break;
      case 'chirp': v=Math.sin(phase+1.5*Math.sin(2*Math.PI*22*t))*(.3+.4*pulse**2)+low*.25;break;
      case 'ice': v=(Math.sin(phase)+.35*Math.sin(phase*2.76)+.2*Math.sin(phase*4.13))*(.18+.55*pulse**7)+ (noise-low)*.6;break;
      case 'crackle': v=low*.65+(noise-low)*pulse**18*1.4+rough*.22;break;
      case 'hiss': v=(noise-low*.4)*(.3+.5*pulse)+rough*.12+body*.7;break;
      case 'fire': v=body*2.5+low*(.7+.6*pulse**3)+Math.sin(phase)*.3;break;
    }
    // Footfalls remain brief material sounds; flying creatures get soft air movement.
    if(foot)v=low*(.8+2*pulse**8)+body*(p.texture==='stone'?5:2.4);
    if(event==='impact')v=v*.55+body*1.5+Math.sin(phase*.55)*Math.exp(-u*10)*.5;
    const envelope=Math.min(1,t/(charge?.065:.008))*Math.pow(1-u,charge?.8:fall?1.3:2.2);
    data[i]=Math.tanh(v)*envelope*setting[1]*.55;
  }
  return data;
}

export function creatureSpatial(event,dx,dz){
  const range=event==='step'?7:event==='hurt'?10:event==='death'?14:22,d=Math.hypot(dx,dz);
  return {gain:d>=range?0:(1-d/range)**1.5,pan:Math.max(-.85,Math.min(.85,(dx-dz)*.7071/Math.max(d,2)))};
}
