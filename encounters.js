// One three-minute expedition: learn, mixed encounters, telegraphed hunts,
// recovery. The schedule and rewards are identical for manual and auto aim.
export function encounterPhase(time,boss=false){
 if(boss)return{key:'boss',mode:'boss',label:'首领决战',remaining:0,interval:3.4,cap:14,mood:1,cycle:-1};
 if(time<20)return{key:'opening',mode:'opening',label:'荒野探路',remaining:20-time,interval:1.9,cap:12,mood:.12,cycle:-1};
 const cycle=Math.floor((time-20)/54),t=(time-20)%54,growth=Math.min(6,Math.floor(time/30));
 if(t<22)return{key:cycle+':build',mode:'build',label:'遭遇战',remaining:22-t,interval:Math.max(1.4,1.9-time*.0018),cap:18+growth,mood:.3,cycle};
 if(t<27)return{key:cycle+':warning',mode:'warning',label:'精锐围猎将至',remaining:27-t,interval:Infinity,cap:24+growth,mood:.65,cycle};
 if(t<42)return{key:cycle+':assault',mode:'assault',label:'精锐围猎',remaining:42-t,interval:2.4,cap:24+growth,mood:.85,cycle};
 return{key:cycle+':rest',mode:'rest',label:'收集与喘息',remaining:54-t,interval:Infinity,cap:0,mood:.06,cycle};
}
export function enemyGrowth(time,baseXp){
 const t=Math.max(0,Math.min(time,240));
 return{health:1+t*.0018,xp:Math.round(baseXp*(1+t*.003))};
}
export function encounterRole(time,random=Math.random,boss=false){
 const r=random();
 if(time<14)return'mushroom';
 if(time<35||boss)return r<.6?'mushroom':'wolf';
 if(time<44)return r<.4?'mushroom':r<.75?'wolf':'spitter';
 return r<.32?'mushroom':r<.60?'wolf':r<.74?'golem':r<.92?'spitter':'shaman';
}
export const HUNT_SQUAD=[
 {role:'golem',offset:0,elite:true},
 {role:'wolf',offset:-1.05,flank:-1},
 {role:'wolf',offset:1.05,flank:1},
 {role:'spitter',offset:-.35},
 {role:'shaman',offset:.35},
 {role:'mushroom',offset:.7}
];
export function enemyApproach(e,player,enemies,visible){
 const dx=player.x-e.x,dz=player.z-e.z,d=Math.hypot(dx,dz),a=Math.atan2(dx,dz);
 if(e.role==='wolf'&&d>4.2&&d<14){
  const angle=(e.packAngle??Math.atan2(e.x-player.x,e.z-player.z))+(e.flank||((e.id%2)?1:-1))*.95;
  return{x:player.x+Math.sin(angle)*3.3,z:player.z+Math.cos(angle)*3.3};
 }
 if(['spitter','shaman'].includes(e.role)&&visible){
  if(d<5)return{x:e.x-dx,z:e.z-dz};
  const tank=enemies.find(q=>q!==e&&q.alive&&q.role==='golem'&&Math.hypot(q.x-e.x,q.z-e.z)<8);
  if(tank){const ta=Math.atan2(tank.x-player.x,tank.z-player.z),side=(e.id%2?1:-1)*1.4;return{x:tank.x+Math.sin(ta)*2.7+Math.cos(ta)*side,z:tank.z+Math.cos(ta)*2.7-Math.sin(ta)*side};}
  if(d<11){const side=e.id%2?1:-1;return{x:e.x+Math.cos(a)*side,z:e.z-Math.sin(a)*side};}
 }
 return{x:player.x,z:player.z};
}
export function separation(e,enemies){
 let x=0,z=0;
 for(const q of enemies){if(q===e||!q.alive)continue;const dx=e.x-q.x,dz=e.z-q.z,d=Math.hypot(dx,dz),gap=(e.size+q.size)*.7;
  if(d>0.001&&d<gap){const push=(gap-d)/gap;x+=dx/d*push;z+=dz/d*push;}
 }
 const length=Math.max(1,Math.hypot(x,z));return{x:x/length*.65,z:z/length*.65};
}
export function attackSlotAvailable(e,enemies){
 const ranged=['spitter','shaman'].includes(e.role);
 return enemies.filter(q=>q!==e&&q.alive&&(q.wind>0||q.pounce>0)&&['spitter','shaman'].includes(q.role)===ranged).length<(ranged?2:3);
}
