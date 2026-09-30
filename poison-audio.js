// Short, locally synthesized pod cracks, leaf rustles and low pressure bursts.
const lengths={shot:.33,impact:.43,mechanism:.19,mature:.34,move:.32,shield:.4,burst:.46,expire:.22};
export function poisonSound(sound,kind){const event={poisonLand:'impact',poisonPickup:'move',poisonMove:'move',poisonSpread:'burst',poisonGuard:'shield'}[kind];if(!event||!sound.allow('poison-'+event,event==='impact'?.16:.3))return false;return sound.weapon('sporelantern',event,0,event==='impact'?.65:.7);}
export function poisonSample(event,rate,variant=0){const duration=lengths[event];if(!duration)return null;const data=new Float32Array(Math.ceil(duration*rate));let seed=907+variant*31+Object.keys(lengths).indexOf(event)*181,low=0,body=0;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1,t=i/rate,u=t/duration;low+=(n-low)*(1-Math.exp(-2*Math.PI*(450+800*(1-u))/rate));body+=(n-body)*(1-Math.exp(-2*Math.PI*95/rate));const high=n-low,swish=Math.sin(Math.PI*u)**1.6,crack=Math.exp(-t*90)+.6*Math.exp(-Math.abs(t-.045)*120),bubble=(.5+.5*Math.sin(t*83+Math.sin(t*29)))**5;let v;
 if(event==='shot')v=low*.65*swish+high*.16*swish*(.4+bubble)+body*1.3*Math.exp(-t*18);
 else if(event==='mechanism')v=(high*.24+low*.18)*swish*(.25+bubble);
 else if(event==='impact'||event==='burst')v=(body*3.2+low*.6)*Math.exp(-t*13)+high*.27*crack+low*.24*bubble*(1-u);
 else if(event==='mature')v=(body*2.5+low*.25)*swish+high*.10*bubble*swish;
 else if(event==='shield')v=(body*2.9+low*.45)*swish+high*.20*crack;
 else v=(low*.62+body*1.5)*swish*(event==='move'?1:.6)+high*.11*bubble*swish;
 const edge=Math.min(1,t/.004)*Math.min(1,(duration-t)/.024);data[i]=Math.tanh(v)*edge*(event==='mechanism'?.36:.64);}return data;}
