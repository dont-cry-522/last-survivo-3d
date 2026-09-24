// Attack timings are shared with the pose driver so the strike matches its hit.
export const ENEMY_MOTION={
 mushroom:{wind:.42,recover:.18,cadence:8.5,range:1.95},wolf:{wind:.48,recover:.18,cadence:12,range:3},golem:{wind:.95,recover:.48,cadence:4.7,range:2.4},spitter:{wind:.72,recover:.32,cadence:6,range:15},shaman:{wind:.85,recover:.35,cadence:4.8,range:12},
 snowhare:{wind:.40,recover:.22,cadence:10,range:2.1},frostwolf:{wind:.60,recover:.26,cadence:10.6,range:3.1},yeti:{wind:1.08,recover:.55,cadence:4.1,range:2.5},icewitch:{wind:.82,recover:.32,cadence:3.9,range:14},snowtotem:{wind:.95,recover:.40,cadence:3.2,range:12},
 emberling:{wind:.46,recover:.21,cadence:13,range:2},ashstalker:{wind:.66,recover:.33,cadence:9,range:3.5},lavabrute:{wind:1.15,recover:.65,cadence:3.6,range:3.3},cinderwisp:{wind:.68,recover:.28,cadence:6.7,range:14},ashseer:{wind:.92,recover:.42,cadence:5.4,range:12},
 boss:{wind:1.2,recover:.5,cadence:4.2},frostking:{wind:1.2,recover:.6,cadence:3.4},cinderlord:{wind:1.2,recover:.65,cadence:3.0}
};
export function gaitPace(kind,phase){
 if(kind==='snowhare')return .28+1.35*Math.max(0,Math.sin(phase));
 if(kind==='mushroom')return .55+.65*Math.max(0,Math.sin(phase));
 if(kind==='emberling')return .8+.28*Math.abs(Math.sin(phase));
 if(kind==='lavabrute')return .72+.36*Math.abs(Math.sin(phase));
 return 1;
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function animateEnemyIdentity(d,t,stride,phase,wind,release,impact){
 const id=d.species||d.kind,rig=d.rig,pounce=d.pounce||0,active=d.previousAttack>0;
 const drive=active?smooth((wind-.66)/.34):release,gather=active?smooth(wind/.6)*(1-.85*drive):release*.15;
 const hand=(i,x,z=0)=>{if(d.arms[i])d.arms[i].rotation.set(x,0,z);};
 const legs=(amp,spread=0)=>d.legs.forEach(({joint,phase:offset})=>{joint.rotation.x=Math.sin(phase+offset)*amp*stride;joint.rotation.z=Math.sign(joint.position.x)*spread;});
 // All poses use absolute offsets: repeated casts cannot accumulate transforms.
 if(id==='mushroom'){rig.scale.set(1+gather*.08,1-gather*.16+drive*.06,1+gather*.08);d.cap.rotation.z=Math.sin(phase)*.10*stride;d.cap.rotation.x=gather*.22-drive*.28;}
 else if(id==='snowhare'){
  const hop=Math.max(0,Math.sin(phase));rig.position.y=hop*.25*stride-gather*.12+Math.sin(pounce*Math.PI)*.5;rig.scale.set(1+gather*.05,1-gather*.10,1);rig.rotation.z=Math.sin(phase*.5)*.035*stride;
  d.cap.rotation.set(-hop*.1*stride+gather*.15-drive*.22,0,0);
  d.ears?.forEach((ear,i)=>{ear.rotation.x=-.18-Math.sin(phase-.5)*.22*stride-gather*.28+drive*.2;ear.rotation.z=(i?1:-1)*-.16;});
  d.feet?.forEach(foot=>{foot.rotation.x=-hop*.65*stride+gather*.38-drive*.55;foot.position.z=.2-hop*.10*stride;});
 }else if(id==='emberling'){
  rig.position.y=Math.abs(Math.sin(phase))*.035*stride-gather*.10+Math.sin(pounce*Math.PI)*.28;rig.rotation.z=Math.sin(phase)*.12*stride;rig.scale.set(1,1-gather*.12,1);d.cap.rotation.x=gather*.25-drive*.38;
  d.feet?.forEach((foot,i)=>{foot.rotation.x=Math.sin(phase+i*Math.PI)*.45*stride;foot.position.z=.2+Math.sin(phase+i*Math.PI)*.09*stride;});if(d.smallTail)d.smallTail.rotation.y=Math.sin(phase)*.4*stride+Math.sin(t*2)*.07;
 }else if(id==='wolf'){
  d.head.rotation.y=Math.sin(phase*.5)*.06*stride;d.head.rotation.x=gather*.23-drive*.28;d.tail.rotation.y=Math.sin(phase*.7)*(.16+.3*stride);
 }else if(id==='frostwolf'){
  rig.position.y-=.08*stride;rig.rotation.x+=.06*stride;d.head.rotation.x=.16*stride+gather*.2-drive*.34;d.head.rotation.y=Math.sin(t*1.2)*.045;d.tail.rotation.y=Math.sin(phase*.55)*.18;
  for(const {joint,phase:offset}of d.legs){joint.rotation.x=Math.sin(phase+offset)*.43*stride-gather*.25+pounce*.6*(joint.position.z>0?1:-1);}
 }else if(id==='ashstalker'){
  rig.position.y-=.13*stride;rig.rotation.y=Math.sin(phase*.65)*.10*stride;rig.rotation.z=Math.sin(phase)*.045*stride;d.head.rotation.y=-rig.rotation.y;d.head.rotation.x=gather*.16-drive*.18;d.tail.rotation.y=Math.sin(phase*.65-1)*.5*stride;
  for(const {joint,phase:offset}of d.legs){joint.rotation.z=Math.sign(joint.position.x)*.35;joint.rotation.x=Math.sin(phase+offset)*.42*stride-gather*.18;}
 }else if(id==='golem'){
  legs(.25);hand(0,Math.sin(phase)*.18*stride-gather*.9+drive*.40);hand(1,-Math.sin(phase)*.18*stride-gather*.9+drive*.40);rig.position.y-=drive*.06;
 }else if(id==='yeti'||id==='frostking'){
  legs(id==='yeti'?.40:.32);rig.rotation.x=.13*stride-gather*.12+drive*.2-impact*.12;rig.rotation.z=Math.sin(phase)*.075*stride;rig.position.y-=.08*stride+drive*.07;
  hand(0,Math.sin(phase)*.46*stride-gather*(id==='frostking'?2.25:2.1)+drive*.60,-(id==='frostking'?.40:.15)*gather);hand(1,-Math.sin(phase)*.46*stride-gather*(id==='frostking'?2.25:2.1)+drive*.60,(id==='frostking'?.40:.15)*gather);
 }else if(id==='lavabrute'||id==='cinderlord'){
  legs(.22);rig.rotation.y=-gather*(id==='cinderlord'?.42:.26)+drive*.34;rig.rotation.z=Math.sin(phase)*.065*stride-gather*.07;rig.rotation.x=-gather*.08+drive*.23;
  hand(0,Math.sin(phase)*.12*stride-gather*(id==='cinderlord'?.85:.35)+drive*.3,-.12*gather);hand(1,-Math.sin(phase)*.2*stride-gather*2.05+drive*.65,.15*gather);
 }else if(id==='boss'){
  legs(.29);hand(0,Math.sin(phase)*.24*stride-gather*1.12+drive*.48);hand(1,-Math.sin(phase)*.24*stride-gather*1.12+drive*.48);rig.rotation.x+=drive*.12;
 }else if(id==='snowtotem'){
  rig.rotation.set(-impact*.15,Math.sin(t*.5)*.18,Math.sin(t*1.2)*.035);rig.position.y=.12+Math.sin(t*1.6)*.075+gather*.18-drive*.12;
  d.satellites.rotation.y=t*.65+gather*.8;d.satellites.scale.setScalar(1+gather*.45-drive*.25);
  d.cores?.forEach((core,i)=>{core.rotation.y=t*(i%2?-.5:.5)+gather*(i-1)*.45;core.position.y=.6+i*.34+gather*(i-1)*.10;});
 }else if(id==='cinderwisp'){
  rig.position.y=.15+Math.sin(t*3)*.09+Math.sin(t*5)*.035-gather*.08+drive*.1;rig.rotation.z=Math.sin(t*2.1)*.09+drive*.14;rig.scale.setScalar(1-gather*.15+drive*.12);
  d.satellites.rotation.y=t*1.7;d.satellites.scale.setScalar(1-gather*.28+drive*.7);d.cores?.forEach((core,i)=>core.rotation.y=t*(i+1)*.35);
 }else if(d.staff){
  d.staff.position.y=.76+gather*.23;d.focus.scale.setScalar(1+gather*.35+drive*.1);
  if(id==='spitter'){rig.rotation.z=Math.sin(phase+.6)*.16*stride;rig.rotation.x=.16*stride+gather*.24-drive*.34;d.staff.rotation.x=-gather*.75+drive*.8;d.staff.rotation.z=-.16+Math.sin(phase)*.10*stride;}
  if(id==='shaman'){rig.position.y=.04+Math.abs(Math.sin(phase))*.035*stride;rig.rotation.x=-gather*.13+drive*.08;d.staff.rotation.x=-gather*.45+drive*.32;d.staff.position.y=.76+gather*.32-drive*.15;}
  if(id==='icewitch'){rig.position.y=.18+Math.sin(t*1.8)*.05+gather*.12;rig.rotation.z=Math.sin(phase*.5)*.06*stride;d.staff.rotation.x=-gather*.95+drive*.9;d.staff.rotation.z=.16+gather*.22-drive*.3;}
  if(id==='ashseer'){rig.position.y=.03+Math.abs(Math.sin(phase))*.045*stride;rig.rotation.z=Math.sin(phase)*.07*stride;d.staff.rotation.x=-.15*stride-gather*.25+drive*.8;d.staff.position.y=.76+gather*.4-drive*.4;}
 }
 if(d.kind==='boss'&&d.attackMode==='charge'){
  rig.rotation.x=.08+gather*.26+(d.charging?.14:0);for(const [i,arm]of d.arms.entries())arm.rotation.x=-gather*.3+(d.charging?Math.sin(phase+i*Math.PI)*.48*stride:0);
 }
}
