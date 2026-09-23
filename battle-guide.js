export const ENEMY_GUIDE={
 mushroom:{name:'蹦跳蘑菇',attack:'蓄力后向锁定位置弹跳扑击',tip:'看到脚下的橙圈就侧移，别沿直线后退。'},
 wolf:{name:'林地狼',attack:'绕侧接近，再向锁定方向猛扑',tip:'等它压低身体后闪到侧面。'},
 golem:{name:'岩甲石怪',attack:'缓慢举臂后震地，近身范围较大',tip:'观察石色震地圈，离开范围再回身攻击。'},
 spitter:{name:'吐毒巫兽',attack:'抬杖吐出毒雾，在紫色圈内持续伤人',tip:'毒圈落地后会停留一阵，不要站回去。'},
 shaman:{name:'林地祭司',attack:'治疗受伤怪物；无人受伤时施放减速咒',tip:'优先处理祭司，并离开青绿色咒圈。'},
 boss:{name:'林心守卫',attack:'冲撞与地面裂击交替，半血后裂击增加',tip:'顺着冲撞标记侧闪，等攻击结束抓破绽。'}
};
export const CIRCLE_GUIDE=[
 {color:'橙',name:'敌人蓄力',meaning:'短暂预警；蘑菇和狼锁定落点，石怪提示震地范围。'},
 {color:'紫',name:'毒雾圈',meaning:'吐毒怪投出的持续伤害区域，亮起后离开。'},
 {color:'青绿',name:'祭司咒圈',meaning:'短暂伤害并减速；祭司的治疗波也会发出绿色闪光。'},
 {color:'红',name:'首领裂地',meaning:'红色大圈是即将落下的裂击；一串橙圈标出冲撞方向。'},
 {color:'橙红',name:'赤烬地脉',meaning:'荒原上固定的大圈会先亮起，再喷发灼伤圈内的人与怪物。'},
 {color:'金',name:'我方陨火',meaning:'金色落点属于自己升级的陨火，会伤害怪物。'},
 {color:'常驻',name:'补给与祭坛',meaning:'固定不消失的光环是探索目标；先清理守卫，再靠近领取。'}
];
