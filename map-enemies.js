// Reuse locomotion roles while giving each biome its own species and attacks.
export const MAP_ROSTERS={forest:{mushroom:'mushroom',wolf:'wolf',golem:'golem',spitter:'spitter',shaman:'shaman',boss:'boss'},snow:{mushroom:'snowhare',wolf:'frostwolf',golem:'yeti',spitter:'icewitch',shaman:'snowtotem',boss:'frostking'},ash:{mushroom:'emberling',wolf:'ashstalker',golem:'lavabrute',spitter:'cinderwisp',shaman:'ashseer',boss:'cinderlord'}};
export const REGIONAL_ENEMIES={
 snowhare:{map:'snow',role:'mushroom',hp:26,speed:3,damage:9,xp:6,size:.5,name:'雪原跳兔',traits:'白毛长耳、圆短身躯；轻快跳跃，蓄力后扑向旧位置。',attack:'低身蓄力后短距离跳扑',tip:'看到它蹲下就侧移，让它扑空后反击。'},
 frostwolf:{map:'snow',role:'wolf',hp:30,speed:4.2,damage:11,xp:9,size:.6,hitSlow:.65,name:'霜牙狼',traits:'白蓝毛皮、背部冰棘；绕侧追猎，扑中会短暂减速。',attack:'锁定方向突扑，命中附带 0.65 秒寒霜减速',tip:'横向闪开扑击，不要被减速后继续沿直线逃跑。'},
 yeti:{map:'snow',role:'golem',hp:140,speed:1.6,damage:17,xp:24,size:1,name:'雪岭巨猿',traits:'厚白毛、深色面庞、长臂；移动慢，近身震出寒霜。',attack:'举臂后拍地，留下短暂伤害与减速的冰面',tip:'离开脚下预告区域，等冰面消退再靠近。'},
 icewitch:{map:'snow',role:'spitter',hp:48,speed:2.2,damage:10,xp:12,size:.6,zone:'frost',name:'冰冠巫灵',traits:'冰蓝长袍、晶簇冠与冰杖；远程制造寒霜落点。',attack:'锁定你的位置，延迟形成持续 1.5 秒的寒霜区',tip:'保持移动；冰面亮起后绕开，别被减速困在原地。'},
 snowtotem:{map:'snow',role:'shaman',hp:65,speed:1.8,damage:8,xp:18,size:.65,name:'浮霜晶核',traits:'悬浮的三层冰晶与两颗卫星；不治疗，连续封住两侧走位。',attack:'在锁定位置两侧制造两块延迟寒霜区',tip:'从两块冰区中间穿出，别顺着横向封锁移动。'},
 frostking:{map:'snow',role:'boss',name:'霜冠巨猿',traits:'巨型白毛身躯、冰晶王冠；半血后扩大寒霜封锁。',attack:'直线冲撞与三段寒霜落点交替；狂暴时封路更多',tip:'侧闪冲撞，沿冰区间隙移动；攻击后有短暂破绽。'},
 emberling:{map:'ash',role:'mushroom',hp:30,speed:2.8,damage:10,xp:7,size:.55,name:'熔角幼魔',traits:'暗红圆躯、弯角与亮眼；跳扑落地留下小片余火。',attack:'蓄力跳扑，落地后脚下余火短暂灼伤',tip:'侧闪后继续走一步，别站回它的落点。'},
 ashstalker:{map:'ash',role:'wolf',hp:32,speed:4.1,damage:13,xp:10,size:.65,name:'烬脊猎蜥',traits:'黑红长躯、橙色背鳍和长尾；冲刺距离比林地狼更长。',attack:'压低身体后沿锁定方向长距离猛冲',tip:'横向闪避，利用树石拦住它，不要向后直退。'},
 lavabrute:{map:'ash',role:'golem',hp:145,speed:1.5,damage:19,xp:25,size:1,name:'裂炉重甲',traits:'炭黑重甲、熔亮胸核；重击向前传出地火。',attack:'重锤前方，沿锁定方向依次爆出三段地火',tip:'离开正前方攻击线，绕侧输出。'},
 cinderwisp:{map:'ash',role:'spitter',hp:44,speed:2.5,damage:12,xp:12,size:.55,zone:'ember',name:'飞烬火灵',traits:'悬浮火核与黑色碎甲；远程投火，留下持续灼烧区。',attack:'锁定位置后延迟爆燃，地面余火持续 1.5 秒',tip:'预告亮起先离开，再绕过余火接近。'},
 ashseer:{map:'ash',role:'shaman',hp:70,speed:2,damage:10,xp:19,size:.65,name:'燃烬祭司',traits:'红黑长袍、双角与橙红杖头；鼓舞附近同伴加速。',attack:'附近有同伴时使其加速 3 秒；独处时制造地火',tip:'优先击倒祭司，留意同伴脚边的橙色火星。'},
 cinderlord:{map:'ash',role:'boss',name:'熔炉暴君',traits:'巨型黑岩甲、熔核与角冠；狂暴后制造更多持续火区。',attack:'冲撞与延迟地火交替，火区持续限制走位',tip:'避开冲撞线并保留退路；别在余火中贪输出。'}
};
export function regionalEnemy(map,role){return MAP_ROSTERS[map]?.[role]||role;}
