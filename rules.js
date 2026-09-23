export const MAPS={forest:{name:'翡翠幽林',subtitle:'穿过古木与遗迹，追寻林心的回声',ground:0x284b3b,fog:0x173d39,leaf:0x287456,accent:0xecc988,slow:'泥地'},snow:{name:'霜月峡谷',subtitle:'冰晶照亮雪路，寒风掩藏猎手',ground:0x96b7bd,fog:0x769daa,leaf:0x456e7d,accent:0x9ae9ff,slow:'深雪'},ash:{name:'赤烬荒原',subtitle:'越过熔岩裂隙，唤醒沉睡的守卫',ground:0x5c4544,fog:0x382e3c,leaf:0x69545d,accent:0xffa25d,slow:'灰烬'}};
export const WEAPONS={rifle:{id:'rifle',name:'游侠连发枪',rate:3,damage:12,count:1,speed:27,range:24,color:0xffdc91},shotgun:{id:'shotgun',name:'碎岩霰弹枪',rate:1,damage:10,count:5,speed:25,range:13,color:0xffbe69},fire:{id:'fire',name:'烬火法杖',rate:.9,damage:30,count:1,speed:14,range:22,color:0xff743b},crossbow:{id:'crossbow',name:'夜翎短弩',rate:2.05,damage:20,count:1,speed:35,range:25,color:0xd8edff},shuriken:{id:'shuriken',name:'月刃飞镖',rate:1.4,damage:13,count:3,speed:22,range:19,color:0x95fff0},dark:{id:'dark',name:'夜幕法杖',rate:1,damage:26,count:1,speed:12,range:23,color:0xc5a2ff}};
export function weaponFor(hero,index){return WEAPONS[(hero==='silver'?['crossbow','shuriken','dark']:['rifle','shotgun','fire'])[index]];}
export function registerCrossbowHit(player,targetId,now){const mark=player.crossbowMark;if(!mark||mark.target!==targetId||now-mark.time>2.5)player.crossbowMark={target:targetId,time:now,hits:1};else{mark.time=now;mark.hits++;if(mark.hits===3){mark.hits=0;return true;}}return false;}
export function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function experienceNeeded(level){return Math.floor(15+level*5+level*level*.5);}
export function grantExperience(p,n){p.xp+=n;while(p.xp>=experienceNeeded(p.level)){p.xp-=experienceNeeded(p.level);p.level++;p.pending++;p.maxHp+=4;p.hp=Math.min(p.maxHp,p.hp+4);}}
export const UPGRADES=[{id:'power',name:'磨砺锋芒',text:'武器伤害 +18%',icon:'✦',max:5},{id:'haste',name:'疾风节拍',text:'射速 +15%',icon:'»',max:4},{id:'fire',name:'陨火降临',text:'周期召唤陨火，轰击附近怪群',icon:'☄',max:3},{id:'ice',name:'霜华绽放',text:'周期释放冰晶环，伤害并减速',icon:'❄',max:3},{id:'storm',name:'雷霆回响',text:'周期落雷，连锁附近敌人',icon:'ϟ',max:3},{id:'vitality',name:'坚韧之心',text:'生命上限 +24，并恢复 24',icon:'♡',max:4},{id:'stride',name:'轻盈步伐',text:'移动速度 +8%，闪避冷却缩短',icon:'➶',max:3},{id:'magnet',name:'灵光牵引',text:'经验吸取范围增加',icon:'◎',max:3}];
const route=(weapon,name,icon,steps)=>({weapon,name,icon,steps});
export const WEAPON_PATHS={
 rifle_pierce:route('rifle','贯穿弹道','➤',['贯穿 2 个目标，伤害 +8%，射速 -10%','贯穿 3 个目标，伤害 +16%','贯穿 4 个目标，伤害 +24%']),
 rifle_rapid:route('rifle','疾速机括','»',['射速 +20%，单发伤害 -8%','射速 +40%，弹速 +10%','射速 +60%，弹速 +15%']),
 shotgun_fan:route('shotgun','散射风暴','⋔',['每次 7 弹丸，扇面变宽，单丸伤害 -20%，射程 -15%','每次 8 弹丸','每次 9 弹丸']),
 shotgun_slug:route('shotgun','独头重弹','◆',['合为 1 发重弹：55 伤害，贯穿 2 个目标，射程 +45%，射速 -15%','重弹 62 伤害，贯穿 3 个目标','重弹 69 伤害，贯穿 4 个目标']),
 fire_burn:route('fire','余烬灼烧','♨',['命中点燃 3 秒，每秒 7 伤害，直接伤害 -10%','灼烧每秒 10 伤害','灼烧每秒 13 伤害；重复命中刷新，不叠层']),
 fire_blast:route('fire','熔核爆破','✹',['爆炸半径 3，伤害 +12%，射速 -10%','爆炸半径 3.5，伤害 +24%','爆炸半径 4，伤害 +36%']),
 crossbow_pierce:route('crossbow','破甲重矢','➤',['伤害 +22%，贯穿 2 个目标，射速 -12%','伤害 +36%，贯穿 3 个目标','伤害 +50%，贯穿 4 个目标']),
 crossbow_hunt:route('crossbow','追猎机括','»',['射速 +18%，箭速 +10%，单箭伤害 -8%','射速 +32%，箭速 +18%','射速 +46%，箭速 +25%']),
 shuriken_fan:route('shuriken','月刃齐发','✧',['每次 5 枚飞镖，单枚伤害 -20%','每次 6 枚飞镖','每次 7 枚飞镖']),
 shuriken_return:route('shuriken','回旋月刃','↶',['飞镖折返，可再次命中；单次伤害 -20%，贯穿 3 个目标','贯穿 4 个目标，弹速 +10%','贯穿 5 个目标，弹速 +15%']),
 dark_gravity:route('dark','引力漩涡','✺',['命中留下 1.4 秒牵引区，半径 2.6；直接伤害 -10%','牵引半径 2.9，持续 1.6 秒','牵引半径 3.2，持续 1.8 秒；最多 3 处，首领牵引减弱']),
 dark_seek:route('dark','追魂魔矢','♦',['追踪弹速 +35%，射速 +15%，伤害 -10%','双追踪魔矢，每枚伤害 -30%，射速恢复基础值','双魔矢射速 +15%，每枚伤害 -30%'])
};
const PATH_LEVELS=[3,5,8];
function routeChoices(p){const rank=p.weaponPath?.rank||0;if(rank>=3||(p.level||1)<PATH_LEVELS[rank])return[];return Object.entries(WEAPON_PATHS).filter(([id,v])=>v.weapon===p.weaponId&&(!p.weaponPath||p.weaponPath.id===id)).map(([id,v])=>({id:'path:'+id,pathId:id,name:v.name,icon:v.icon,text:v.steps[rank],max:3,rank,category:'weapon'}));}
export function chooseUpgrades(p,random=Math.random){const pool=UPGRADES.filter(u=>(p.upgrades[u.id]||0)<u.max).map(u=>{
 const rank=(p.upgrades[u.id]||0)+1;let text=u.text;
 if(u.id==='fire')text=`每 5.5 秒落下陨火，造成 ${35*rank} 伤害，爆炸半径 3.5`;
 if(u.id==='ice')text=`每 7 秒冰晶扩散，造成 ${20*rank} 伤害，减速 ${(2+rank*.35).toFixed(2)} 秒`;
 if(u.id==='storm')text=`每 5.5 秒落雷并连锁 ${2+rank} 个目标，每个造成 ${27*rank} 伤害`;
 return{...u,text};
 }),result=routeChoices(p);while(pool.length&&result.length<3)result.push(pool.splice(Math.floor(random()*pool.length),1)[0]);return result;}
export function takeUpgrade(p,id){
 if(id.startsWith('path:')){const choice=routeChoices(p).find(c=>c.id===id);if(!choice)return false;p.weaponPath={id:choice.pathId,rank:choice.rank+1};return true;}
 const u=UPGRADES.find(u=>u.id===id);if(!u||(p.upgrades[id]||0)>=u.max)return false;p.upgrades[id]=(p.upgrades[id]||0)+1;if(id==='vitality'){p.maxHp+=24;p.hp=Math.min(p.maxHp,p.hp+24);}return true;
}
export function weaponStats(p){
 const base=WEAPONS[p.weaponId]||WEAPONS.crossbow,w={...base,pierce:base.id==='shuriken'?2:1,spread:.14,radius:base.id==='fire'?2.5:base.id==='dark'?2:0,bounces:0,burn:0,returning:false,gravity:0};
 const id=p.weaponPath?.id,path=WEAPON_PATHS[id],r=path?.weapon===base.id?Math.min(3,Math.max(0,p.weaponPath.rank)):0;
 if(r)switch(id){
 case'rifle_pierce':w.pierce=1+r;w.damage*=1+.08*r;w.rate*=.9;break;
 case'rifle_rapid':w.rate*=1+.2*r;w.damage*=.92;w.speed*=1+.05*r;break;
 case'shotgun_fan':w.count=6+r;w.damage*=.8;w.range*=.85;w.spread=.19;break;
 case'shotgun_slug':w.count=1;w.damage=48+7*r;w.range*=1.45;w.rate*=.85;w.pierce=1+r;break;
 case'fire_burn':w.burn=4+3*r;w.damage*=.9;break;
 case'fire_blast':w.radius=2.5+.5*r;w.damage*=1+.12*r;w.rate*=.9;break;
 case'crossbow_pierce':w.damage*=1+.08+.14*r;w.rate*=.88;w.pierce=1+r;break;
 case'crossbow_hunt':w.rate*=[1,1.18,1.32,1.46][r];w.speed*=[1,1.10,1.18,1.25][r];w.damage*=.92;break;
 case'shuriken_fan':w.count=4+r;w.damage*=.8;w.spread=.18;break;
 case'shuriken_return':w.returning=true;w.pierce=2+r;w.damage*=.8;w.speed*=1+(r===1?0:.05*r);break;
 case'dark_gravity':w.gravity=r;w.damage*=.9;break;
 case'dark_seek':w.speed*=1.35;w.count=r>=2?2:1;w.damage*=r>=2?.7:.9;w.rate*=r===2?1:1.15;break;
 }
 w.damage*=1+.18*(p.upgrades?.power||0);w.rate*=1+.15*(p.upgrades?.haste||0);return w;
}
export const ENEMIES={mushroom:{hp:28,speed:2.7,damage:10,xp:6,size:.55},wolf:{hp:24,speed:4.4,damage:12,xp:8,size:.6},golem:{hp:130,speed:1.7,damage:22,xp:23,size:1},spitter:{hp:52,speed:2.3,damage:13,xp:12,size:.6},shaman:{hp:75,speed:2,damage:8,xp:18,size:.65}};
export function segmentDistance(px,pz,ax,az,bx,bz){const x=bx-ax,z=bz-az,l=x*x+z*z,t=l?Math.max(0,Math.min(1,((px-ax)*x+(pz-az)*z)/l)):0;return Math.hypot(px-ax-x*t,pz-az-z*t);}
