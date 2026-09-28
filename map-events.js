export const MAP_EVENTS={
 lighthouse:{name:'灯塔复燃',short:'灯塔',color:0x90dddf,tip:'清除守卫，在灯塔 3 米内累计修复 8 秒；涨潮预告或涨潮时暂停修复，退潮后继续。完成后领取技能。'},
 mechanism:{name:'遗城机关',short:'机关',color:0xe3c68b,tip:'清除第一批守卫后选择：开启捷径并恢复 25% 生命，或挑战第二批守卫获得技能。只能选一个。'},
 purify:{name:'林心净化',short:'净化',color:0x9de7ac,tip:'站在林心 3 米内净化 10 秒；附近 4.5 米内有怪物时暂停。可以先击退、引开或清除它们。'},
 beacons:{name:'霜晶共鸣',short:'共鸣',color:0xa3e9ff,tip:'依次靠近任意三座小霜晶，各停留 1.2 秒。离开未点亮的霜晶会中断；已点亮的保留。'},
 forge:{name:'熔炉泄压',short:'泄压',color:0xffb675,tip:'趁熔炉冷却时靠近 3 米内泄压，累计 7 秒完成。橙红预警后会喷发，撤到 4 米外躲避；进度保留。'},
 ambush:{name:'猎群伏击',short:'伏击',color:0xe9b68c,tip:'击退两批从不同方向包抄的猎群。第二批在第一批清除后出现；可离开再回来，奖励只领取一次。'}
};
export const biomeEvent=id=>({forest:'purify',snow:'beacons',ash:'forge',sand:'mechanism',coast:'lighthouse'})[id];
export function eventNodes(x,z,angle){return Array.from({length:3},(_,i)=>({x:x+Math.sin(angle+i*Math.PI*2/3)*4.8,z:z+Math.cos(angle+i*Math.PI*2/3)*4.8,charge:0}));}
export function createMapEvent(id){return{id,elapsed:0,progress:0,wave:0,lastWarning:-1,done:false};}
// Only simulation time advances events. Pauses and far-away sites cannot earn progress.
export function advanceMapEvent(e,dt,{near,atCenter,contested,guards,nodes=[],player,tide}){
 const result={wave:0,warning:false,lit:[],complete:false};if(e.done||!near||dt<=0)return result;
 e.elapsed+=dt;
 if(e.wave===0){e.wave=1;result.wave=1;return result;}
 if(e.id==='lighthouse'){e.flooded=!!(tide?.high||tide?.warning);if(atCenter&&!guards&&!e.flooded)e.progress=Math.min(8,e.progress+dt);e.done=e.progress>=8;}else if(e.id==='mechanism'){if(!guards){if(e.wave===1&&!e.choice&&!e.awaiting){e.awaiting=true;result.choice=true;}else if(e.choice==='treasure'&&e.wave===1){e.wave=2;result.wave=2;}else if(e.wave===2)e.done=true;}}else if(e.id==='ambush'){
  if(!guards){if(e.wave===1){e.wave=2;result.wave=2;}else e.done=true;}
 }else if(e.id==='purify'){
  if(atCenter&&!contested)e.progress=Math.min(10,e.progress+dt);
  e.done=e.progress>=10;
 }else if(e.id==='beacons'){
  for(const [i,n]of nodes.entries()){if(n.charge>=1.2)continue;const close=Math.hypot(player.x-n.x,player.z-n.z)<1.4;n.charge=close?Math.min(1.2,n.charge+dt):0;if(n.charge===1.2)result.lit.push(i);}
  e.progress=nodes.filter(n=>n.charge>=1.2).length;e.done=e.progress===3;
 }else if(e.id==='forge'){
  const phase=e.elapsed%6,cycle=Math.floor(e.elapsed/6);
  if(phase>=3&&e.lastWarning!==cycle){e.lastWarning=cycle;result.warning=true;}
  if(phase<3&&atCenter)e.progress=Math.min(7,e.progress+dt);
  e.done=e.progress>=7;
 }
 result.complete=e.done;return result;
}
export function eventProgress(e,contested=false){
 if(e.done)return '完成 · 靠近领取';
 if(e.id==='mechanism')return e.awaiting&&!e.choice?'机关已解封 · 选择探索路线':'守卫 '+Math.max(1,e.wave)+'/2 · 清除后作出选择';
 if(e.id==='lighthouse')return '修复 '+Math.floor(e.progress/8*100)+'% · '+(e.flooded?'潮水上涨，等待退潮':'清除守卫后靠近灯塔');
 if(e.id==='ambush')return '猎群 '+Math.max(1,e.wave)+'/2 批';
 if(e.id==='beacons')return '霜晶 '+e.progress+'/3 · 靠近未亮霜晶';
 if(e.id==='purify')return '净化 '+Math.floor(e.progress*10)+'% · '+(contested?'先击退附近怪物':'靠近林心');
 return '泄压 '+Math.floor(e.progress/7*100)+'% · '+(e.elapsed%6<3?'冷却中，可以靠近':e.elapsed%6<4?'即将喷发，退到 4 米外':'熔炉灼热，保持距离');
}
