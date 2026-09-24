export const ENEMY_GUIDE={
 mushroom:{image:"assets/bestiary/mushroom.png",traits:"红褐色斑点菌盖、小短腿；靠近后蓄力跳扑。",name:'蹦跳蘑菇',attack:'蓄力后向锁定位置弹跳扑击',tip:'看到脚下的橙色爪痕就侧移，别沿直线后退。'},
 wolf:{image:"assets/bestiary/wolf.png",traits:"蓝灰色四足、尖耳长尾；移动快，喜欢绕到侧面。",name:'林地狼',attack:'绕侧接近，再向锁定方向猛扑',tip:'等它压低身体后闪到侧面。'},
 golem:{image:"assets/bestiary/golem.png",traits:"灰绿色岩甲、双肩尖角、绿色胸核；血厚、行动慢。",name:'岩甲石怪',attack:'缓慢举臂后震地，近身范围较大',tip:'观察震地前的橙色标记，离开范围再回身攻击。'},
 spitter:{image:"assets/bestiary/spitter.png",traits:"紫袍尖帽、粉紫色杖头；远程封路，留下持续毒雾。",name:'吐毒巫兽',attack:'抬杖吐出毒雾，在紫色毒雾内持续伤人',tip:'毒雾落地后会停留一阵，不要站回去。'},
 shaman:{image:"assets/bestiary/shaman.png",traits:"青绿长袍、绿色杖头；支援同伴，兼用减速咒。",name:'林地祭司',attack:'治疗受伤怪物；无人受伤时施放减速咒',tip:'优先处理祭司，并离开青绿色咒印。'},
 boss:{image:"assets/bestiary/boss.png",traits:"巨型蓝灰岩躯、金色头环、橙色胸核；半血进入狂暴。",name:'林心守卫',attack:'冲撞与地面裂击交替，半血后裂击增加',tip:'顺着冲撞标记侧闪，等攻击结束抓破绽。'}
};
export const CIRCLE_GUIDE=[
 {color:'橙',name:'敌人蓄力',meaning:'短暂预警；蘑菇和狼用爪痕标出落点，石怪用柔和色块提示震地范围。'},
 {color:'紫',name:'毒雾区域',meaning:'吐毒怪投出的持续伤害区域，亮起后离开。'},
 {color:'青绿',name:'祭司咒印',meaning:'短暂伤害并减速；祭司的治疗波也会发出绿色闪光。'},
 {color:'红',name:'首领裂地',meaning:'红色地面预警是即将落下的裂击；橙色箭头标出冲撞方向。'},
 {color:'橙红',name:'赤烬地脉',meaning:'荒原上固定地面的橙红色预警会先亮起，再喷发灼伤范围内的人与怪物。'},
 {color:'金',name:'我方陨火',meaning:'金色落点属于自己升级的陨火，会伤害怪物。'},
 {color:'金绿',name:'补给与祭坛',meaning:'石门祭坛和补给箱是探索目标，靠近时会有柔和微光；先清理守卫，再靠近领取。'}
];
