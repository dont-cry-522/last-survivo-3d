export const EXTRA_SKILLS=[
 {id:'surge',hero:'tide',name:'破浪锋',icon:'≈',max:3,describe:r=>`回钩第三击向前推出三段浪锋，每段 ${10+7*r} 伤害并减速；最远 6 米，遇障碍停止。`},
 {id:'brine',hero:'tide',name:'盐蚀印记',icon:'✧',max:3,describe:r=>`同一目标 3 秒内连续被长叉命中三次，爆开盐晶，造成 ${16+10*r} 伤害；触发间隔 1 秒，首领也可生效。`},
 {id:'wake',hero:'tide',name:'潜潮余流',icon:'↝',max:3,describe:r=>`浮出后留下 3 秒水流，触碰的敌人受到 ${9+7*r} 伤害并减速；每只敌人只受伤一次，6 秒触发间隔。`},
 {id:'bond',hero:'lingya',name:'同猎追击',icon:'✦',max:3,describe:r=>`獾兽扑中刚被骨镖标记的敌人时，追加 ${12+8*r} 伤害；1.5 秒触发间隔。伙伴倒地时不会触发。`},
 {id:'briar',hero:'lingya',name:'燕返藤绊',icon:'♧',max:3,describe:r=>`燕步起点留下藤绊，0.45 秒后就绪，靠近触发 ${12+8*r} 伤害并减速 2 秒；最多 2 处，8 秒失效，首领不会被定身。`},
 {id:'care',hero:'lingya',name:'归镖抚慰',icon:'♡',max:3,describe:r=>`每接回四次骨镖，为 10 米内存活的伙伴恢复 ${6+4*r} 点生命；不会提前复活倒地伙伴。`},
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

// Tide and Lingya add bounded interactions; the others explain existing tactical combinations.
export const SKILL_PAIRS={
 tide:{name:'盐潮共鸣',ids:['wake','brine'],bonus:true,text:'每片潜潮余流首次伤害一名敌人时，额外叠一层盐蚀；同一敌人不会被该片余流反复叠层。',support:'回潮牵引便于把怪物拉进余流；疾风节拍加快长叉叠层。'},
 lingya:{name:'藤缚合猎',ids:['briar','bond'],bonus:true,text:'藤绊命中会标记敌人 2 秒；伙伴扑中该目标可触发同猎追击，追加伤害再提高 25%。伙伴须存活。',support:'林间设伏增加控场机会；归镖抚慰照顾伙伴生命。'},
 scout:{name:'诱敌反击',ids:['mine','counter'],bonus:false,text:'在陷阱附近引怪，翻滚离开，再用强化反击把追兵挡在爆炸区域。战术配合，无额外数值加成。',support:'轻盈步伐缩短闪避冷却，霰弹枪适合近身反击。'},
 silver:{name:'霜痕追猎',ids:['trail','rain'],bonus:false,text:'利用冰痕减速，让敌人更难离开箭雨落点。战术配合，无额外数值加成。',support:'破绽追击进一步限制目标；短弩适合集中攻击。'},
 wraith:{name:'影缚复诵',ids:['spikes','echo'],bonus:false,text:'地刺减速限制敌人，给残影的两次追击创造机会。战术配合，无额外数值加成。',support:'噬魂余烬补充续航；裂隙的牵引便于集中目标。'}
};
export function skillPairState(p){const pair=Object.hasOwn(SKILL_PAIRS,p.heroId)?SKILL_PAIRS[p.heroId]:null;if(!pair)return null;const missing=pair.ids.filter(id=>!(p.upgrades[id]>0));return{...pair,missing,active:missing.length===0};}
export function skillPairHint(p,id){const q=skillPairState(p);if(!q||!q.ids.includes(id))return'';const other=q.ids.find(v=>v!==id);return(q.active?'搭配已成型':p.upgrades[other]>0?'选取后组成搭配':'搭配 '+EXTRA_BY_ID[other].name)+' · '+q.name;}
