// Short original material textures synthesized locally; no remote asset load.
const DURATIONS={rifle:[.17,.13,.1],shotgun:[.42,.27,.23],crossbow:[.25,.18,.2],shuriken:[.3,.16,.14],fire:[.55,.65,.3],dark:[.58,.52,.35],shade:[.24,.32,.15],shadowblade:[.4,.28,.33],grimoire:[.4,.68,.3]};
export function weaponSample(id,event,rate,variant=0){
  const durations=DURATIONS[id],index={shot:0,impact:1,mechanism:2}[event];if(!durations||index===undefined)return null;
  const duration=durations[index],data=new Float32Array(Math.ceil(rate*duration));
  let seed=151+Object.keys(DURATIONS).indexOf(id)*173,low=0,body=0,phase=0;
  const hit=event==='impact',mechanism=event==='mechanism';
  const string=new Float32Array(Math.round(rate/185));let stringIndex=0;
  for(let i=0;i<data.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1,t=i/rate,u=i/data.length;
    const cutoff=id==='dark'?400+1900*(1-u):id==='fire'?1400-1100*u:2300;
    low+=(n-low)*(1-Math.exp(-2*Math.PI*cutoff/rate));body+=(n-body)*(1-Math.exp(-2*Math.PI*130/rate));
    const high=n-low,tail=Math.exp(-u*(hit?5:7)),snap=Math.exp(-t*100),flutter=(.5+.5*Math.sin(t*2*Math.PI*(id==='shadowblade'?19:37)))**3;
    phase+=2*Math.PI*(id==='shotgun'?94-58*u:id==='fire'?75-39*u:id==='dark'?52+36*u:id==='grimoire'?41+24*u:140-85*u)/rate;
    let v=0;
    if(mechanism){
      const click=Math.exp(-t*120)+Math.exp(-Math.abs(t-.075)*180)*.65;
      if(id==='crossbow')v=low*.6*Math.sin(Math.PI*u)**2+high*click*(variant?.65:.3);
      else if(id==='shotgun')v=(low*.7+high*.4)*(.35+flutter)*Math.sin(Math.PI*u)+high*click*(variant?1:.5);
      else if(id==='grimoire')v=high*(.2+flutter)*Math.sin(Math.PI*u)**2;
      else if(id==='fire')v=low*(.4+flutter)*Math.sin(Math.PI*u);
      else if(id==='dark')v=(body*2+low*.5)*Math.sin(Math.PI*u)**2;
      else if(id==='shadowblade')v=low*Math.sin(Math.PI*u)*(1-u)*(.4+flutter);
      else v=high*.5*click;
    }else if(id==='rifle')v=(high*.85*snap+low*.9*tail+Math.sin(phase)*.32*tail)*(hit?.65:1.15);
    else if(id==='shotgun')v=(body*4+low*1.2)*tail+high*.75*snap+Math.sin(phase)*.7*tail;
    else if(id==='crossbow'){
      // Damped string delay creates a short bow twang, followed by a wooden knock.
      const next=(stringIndex+1)%string.length;
      const pluck=i<string.length?n:(string[stringIndex]+string[next])*.485;string[stringIndex]=pluck;stringIndex=next;
      v=hit?low*.9*tail+body*2*tail:pluck*.8+high*.6*snap+low*.35*tail;
    }else if(id==='shuriken')v=hit?(high*.65+low*.45)*tail:(high*.48+low*.65)*Math.sin(Math.PI*u)**2*(.3+flutter)+Math.sin(t*2*Math.PI*(1700-450*u))*.045*tail;
    else if(id==='fire')v=(body*4+low*(.9+flutter))*Math.exp(-u*3)+(hit?high*.45*snap:0)+Math.sin(phase)*.4*tail;
    else if(id==='dark')v=(body*3+low*.8)*Math.sin(Math.PI*u)**.7+Math.sin(phase)*.3*Math.sin(Math.PI*u)**2;
    else if(id==='shade')v=(body*2+low*.8)*tail*(.5+flutter)+Math.sin(phase)*.4*tail;
    else if(id==='shadowblade')v=(high*.45+low*.9)*Math.sin(Math.PI*u)**.8*(.2+flutter)+(hit?body*2*tail:0);
    else if(id==='grimoire')v=hit?(body*5+low*.8)*Math.exp(-u*3)+Math.sin(phase)*.4*tail:high*.38*flutter*Math.sin(Math.PI*u)+body*1.5*u*(1-u);
    const edge=Math.min(1,t/.003)*Math.min(1,(duration-t)/.02);
    data[i]=Math.tanh(v)*edge*(mechanism?.32:hit?.6:.72);
  }
  return data;
}
