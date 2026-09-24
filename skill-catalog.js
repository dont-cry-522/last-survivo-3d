export const EXTRA_SKILLS=[
 {id:'mine',hero:'scout',name:'爆破陷阱',icon:'✹',max:3,describe:r=>`附近有敌人时每 6 秒在脚下布置陷阱，0.45 秒后就绪；敌人靠近引爆，造成 ${18+14*r} 范围伤害。最多保留 2 个，10 秒后失效。`},
 {id:'volley',hero:'scout',name:'破阵齐射',icon:'⋔',max:3,describe:r=>`每攻击 5 次，沿瞄准方向追加 3 发贯穿弹，单发造成 ${8+4*r} 伤害，射程 10 米。按攻击次数计数，不按弹丸数量。`},
 {id:'counter',hero:'scout',name:'翻滚反击',icon:'↶',max:3,describe:r=>`翻滚结束后 2 秒内的第一次攻击追加近身扇面冲击，造成 ${14+12*r} 伤害并击退普通敌人。首领不会被推走。`},
 {id:'rain',hero:'silver',name:'追猎箭雨',icon:'⇣',max:3,describe:r=>`每 8 秒锁定附近敌人的当前位置，0.55 秒后连续落下 3 阵箭雨，每阵造成 ${12+6*r} 范围伤害；移动出落点可躲避。`},
 {id:'trail',hero:'silver',name:'霜行足迹',icon:'❄',max:3,describe:r=>`每移动 3 米留下一段持续 2.5 秒的冰痕；敌人踏入时受到 ${6+3*r} 伤害并持续减速。每段对同一敌人只伤害一次，最多 4 段。`},
 {id:'pursuit',hero:'silver',name:'破绽追击',icon:'✧',max:3,describe:r=>`连续命中同一敌人 4 次（相邻命中间隔不超过 2.5 秒），追加 ${9+9*r} 伤害并定身 ${(0.35+.15*r).toFixed(2)} 秒。触发间隔 1.2 秒；首领只减速。`},
 {id:'echo',hero:'wraith',name:'残影复诵',icon:'◑',max:3,describe:r=>`每攻击 4 次召出残影，连续追击附近敌人 2 次，每次造成 ${14+7*r} 伤害。触发间隔至少 3 秒；残影攻击不会再次触发连击技能。`},
 {id:'soul',hero:'wraith',name:'噬魂余烬',icon:'◆',max:3,describe:r=>`击败 8 米内的敌人时吸取余烬，恢复 ${1+r} 点生命，每秒最多触发一次，不能超过生命上限。`},
 {id:'spikes',hero:'wraith',name:'影缚地刺',icon:'⋀',max:3,describe:r=>`每 7 秒沿瞄准方向依次升起 3 段影刺，每段造成 ${18+9*r} 伤害并减速 1.2 秒。地刺会被树木阻挡。`}
];
export const EXTRA_BY_ID=Object.fromEntries(EXTRA_SKILLS.map(s=>[s.id,s]));
