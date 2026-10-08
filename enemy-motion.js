import{updateEnemyGrip}from'./enemy-appearance.js?v=91';
// Attack timings are shared with the pose driver so the strike matches its hit.
export const ENEMY_MOTION={
 foamling:{wind:.55,recover:.25,cadence:9,range:2.1},tidecrab:{wind:.7,recover:.35,cadence:10,range:3.1},reefturtle:{wind:1.1,recover:.6,cadence:4,range:4},jellyseer:{wind:.85,recover:.4,cadence:4,range:12},tidestar:{wind:.9,recover:.45,cadence:4,range:11},wreckwarden:{wind:1.25,recover:1.7,cadence:4},
 sandworm:{wind:.7,recover:.28,cadence:8,range:2.2},clawbeetle:{wind:.65,recover:.3,cadence:11,range:3.4},sandguard:{wind:1.05,recover:.6,cadence:4,range:2.5},sandspitter:{wind:.8,recover:.4,cadence:4,range:12},duneoracle:{wind:.85,recover:.4,cadence:4,range:12},dunescorpion:{wind:1.1,recover:1.55,cadence:6},
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
// The paw stays low during the longer support phase, then folds for the return.
// This is a visual two-bone solve; it never changes the actor's world position.
function plantPaw(leg,phase,stride,crouch,pounce){
 const u=((phase/(Math.PI*2))%1+1)%1,support=u<.62;
 const swing=support?0:(u-.62)/.38,travel=support?1-2*u/.62:-1+2*smooth(swing);
 const lift=Math.sin(swing*Math.PI)*.085*stride;
 const upper=leg.upperLength,lower=leg.lowerLength,z=travel*.16*stride-crouch*.035+pounce*(leg.joint.position.z>0?.12:-.12);
 const y=upper+lower-.025-lift-crouch*.075-pounce*.045;
 const distance=Math.min(upper+lower-.002,Math.max(.08,Math.hypot(y,z)));
 const clamp=x=>Math.max(-1,Math.min(1,x));
 const knee=Math.PI-Math.acos(clamp((upper*upper+lower*lower-distance*distance)/(2*upper*lower)));
 const hip=-Math.atan2(z,y)-Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance)));
 leg.joint.rotation.set(hip,0,0);leg.knee.rotation.set(knee,0,0);leg.paw.rotation.set(-hip-knee,0,0);
}
function animateForestEnemy(d,t,stride,phase,gather,drive,impact){
 const rig=d.rig,sway=Math.sin(phase),lag=Math.sin(phase-.55),pounce=d.pounce||0;
 const airborne=pounce>0?Math.sin(pounce*Math.PI):0,breath=Math.sin(t*2.1),settle=d.previousAttack>0?0:Math.sin(Math.PI*drive);
 const landing=Math.sin(Math.PI*(1-(d.landing||0)/.18));
 if(d.kind==='mushroom'){
  const hop=Math.max(0,sway)*stride,squash=sway*.075*stride-gather*.14+drive*.04-impact*.1;
  rig.position.y=hop*.15-gather*.07+airborne*.34-landing*.06;
  rig.scale.set(1-squash*.45,1+squash,1-squash*.45);rig.rotation.set(gather*.08-drive*.12,0,Math.sin(phase*.5)*.055*stride);
  d.cap.rotation.set(lag*.085*stride+gather*.19-drive*.26-settle*.035,0,Math.sin(phase-.8)*.085*stride);
  d.feet?.forEach((foot,i)=>{const step=Math.sin(phase+i*Math.PI);foot.position.y=.12+Math.max(0,-step)*.045*stride;foot.position.z=.1+step*.08*stride;foot.rotation.x=step*.18*stride+gather*.12-drive*.14;});
 }else if(d.kind==='wolf'){
  rig.position.set(sway*.012*stride,Math.abs(sway)*.025*stride-gather*.09+airborne*.26-landing*.07,-impact*.13-gather*.035+drive*.04);
  rig.rotation.set(.045*stride+Math.sin(phase*2)*.018*stride-gather*.04+drive*.09+landing*.08,0,sway*.025*stride);
  d.head.rotation.set(.07*stride+lag*.025*stride+gather*.17-drive*.25+landing*.10,Math.sin(t*1.35)*.025*(1-stride),-sway*.018*stride);
  d.jaw.position.y=-.21-gather*.04-drive*.065-pounce*.035;
  d.tail.rotation.set(-.05-gather*.2+airborne*.18,Math.sin(phase*.65-.5)*(.07+.18*stride),0);
  if(d.tailTip)d.tailTip.rotation.set(Math.sin(phase*.65-.9)*.055*stride,Math.sin(phase*.65-1.25)*(.055+.11*stride),0);
  d.ears?.forEach((ear,i)=>ear.rotation.set(-.06-Math.sin(phase-.8+i*.35)*.075*stride-gather*.19+drive*.11,0,(i?1:-1)*.07+breath*.025));
  for(const leg of d.legs)if(leg.knee&&leg.paw)plantPaw(leg,phase+leg.phase,stride,gather,pounce);
 }else if(d.kind==='golem'){
  const weight=Math.sin(phase)*stride;
  rig.position.set(weight*.035,Math.abs(sway)*.025*stride-gather*.13-drive*.045,-impact*.13-gather*.045+drive*.04);
  rig.rotation.set(.035*stride-gather*.075+drive*.14-impact*.12,Math.sin(phase-.4)*.025*stride,weight*.045);
  d.legs.forEach(({joint,phase:offset})=>{const step=Math.sin(phase+offset);joint.rotation.set(step*.23*stride,0,0);});
  d.arms.forEach((arm,i)=>arm.rotation.set(Math.sin(phase+i*Math.PI-.3)*.15*stride-gather*(i?1.02:.9)+drive*(i?.48:.4),0,(i?1:-1)*(.04*stride+.12*gather)));
  if(d.head)d.head.rotation.set(-gather*.045+drive*.06,-rig.rotation.y*.65,-weight*.025);
 }else if(d.staff){
  const spitter=d.kind==='spitter',walk=Math.sin(phase)*stride;
  rig.position.set(walk*(spitter?.025:.012),Math.abs(sway)*.035*stride+breath*.008-gather*.055+drive*.025,-impact*.13-gather*.025+drive*.045);
  rig.rotation.set((spitter?.10:.025)*stride+gather*(spitter?.20:-.10)-drive*(spitter?.21:-.07),Math.sin(phase-.3)*.025*stride,walk*(spitter?.11:.055));
  d.staff.rotation.set(Math.sin(phase-.7)*.055*stride-gather*(spitter?.7:.43)+drive*(spitter?.70:.34),0,(spitter?-.13:.06)+lag*.055*stride);
  d.staff.position.y=.76+Math.max(0,Math.sin(phase-.5))*.025*stride+gather*(spitter?.20:.30)-drive*(spitter?.03:.13);
  d.focus.scale.setScalar(1+gather*.28+drive*.07);
  if(d.head)d.head.rotation.set(-rig.rotation.x*.45+lag*.025*stride+gather*.035-drive*.055,-rig.rotation.y*.5,-rig.rotation.z*.6);
  if(d.hatTip)d.hatTip.rotation.set(Math.sin(phase-.9)*.045*stride-gather*.07+drive*.1,0,Math.sin(phase-.8)*.09*stride+breath*.018);
  if(d.hem)d.hem.rotation.set(Math.sin(phase-.6)*.025*stride,0,-Math.sin(phase-.7)*.035*stride);
  d.arms.forEach(arm=>arm.rotation.set(-lag*.18*stride-gather*.27+drive*.18,0,-.055-gather*.07));
  d.feet?.forEach((foot,i)=>{const step=Math.sin(phase+i*Math.PI);foot.position.set((i?1:-1)*.15,.08+Math.max(0,-step)*.05*stride,.07+step*.085*stride);foot.rotation.x=step*.15*stride;});
 }
}
export function animateEnemyIdentity(d,t,stride,phase,wind,release,impact){
 const id=d.species||d.kind,rig=d.rig,pounce=d.pounce||0,active=d.previousAttack>0;
 const drive=active?smooth((wind-.66)/.34):release,gather=active?smooth(wind/.6)*(1-.85*drive):release*.15;
 if(d.appearance){animateForestEnemy(d,t,stride,phase,gather,drive,impact);updateEnemyGrip(d);return;}
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
